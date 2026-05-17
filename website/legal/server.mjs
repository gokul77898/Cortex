import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = parseInt(process.env.LEGAL_PORT || '8899', 10);
const SERVER_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_KEY || '';
const SCRAPER_PY = join(__dirname, 'scraper_service.py');

// In-memory document store (persists for session)
const documents = [];
let docIdCounter = 1;
const MAX_DOCS = 3;
const MAX_PAGES = 60;
const MAX_CHARS = 150000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function callScraper(input) {
  return new Promise((resolve) => {
    const proc = spawn('python3', [SCRAPER_PY], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      if (code !== 0) return resolve({ success: false, error: `Scraper exited ${code}: ${stderr.slice(0, 500)}` });
      try { resolve(JSON.parse(stdout)); } catch { resolve({ success: false, error: 'Invalid JSON from scraper' }); }
    });
    proc.on('error', e => resolve({ success: false, error: e.message }));
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}

async function checkScraplerAvailable() {
  try { const r = await callScraper({ action: 'status' }); return !!(r && r.available); }
  catch { return false; }
}

async function scrapeUrl(url, options = {}) {
  const maxChars = options.maxChars || 4000;
  const result = await callScraper({ url, mode: options.mode || 'simple', options: { selector: options.selector || 'body', extract: 'text', max_chars: maxChars } });
  if (result.success && result.data) return result.data;
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }, signal: AbortSignal.timeout(6000) });
    return { text: (await resp.text()).slice(0, maxChars), url, status: resp.status };
  } catch (e) { throw new Error(result?.error || e.message); }
}

async function searchWeb(query) {
  try {
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' Indian law')}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(6000),
    });
    const html = await resp.text();
    const links = [];
    const blocks = html.split(/<article[^>]*class="[^"]*result[^"]*"[^>]*>/g);
    if (blocks.length < 2) {
      blocks.splice(0, 0, html);
      blocks.length = 1;
    }
    for (let bi = 1; bi < blocks.length && links.length < 5; bi++) {
      const b = blocks[bi];
      const titleMatch = b.match(/<a[^>]+>([\s\S]*?)<\/a>/i);
      if (!titleMatch) continue;
      const title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!title) continue;
      const uddg = b.match(/uddg=([^&"'\s]+)/);
      if (!uddg) continue;
      const url = decodeURIComponent(uddg[1]);
      const snipMatch = b.match(/(?:class="result__snippet[^"]*"|class="snippet[^"]*")[^>]*>([\s\S]*?)<\/[^>]+>/i);
      const snippet = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
      links.push({ url, title, snippet });
    }
    if (links.length === 0) {
      const fallbackRe = /uddg=([^&"'\s<>]+)/g;
      let fm;
      while ((fm = fallbackRe.exec(html)) !== null && links.length < 5) {
        const url = decodeURIComponent(fm[1]);
        if (url.startsWith('http') && !url.includes('duckduckgo.com')) links.push({ url, title: url, snippet: '' });
      }
    }
    return links;
  } catch { return []; }
}

async function callModel(key, messages, systemExtra) {
  // Include stored documents as system context
  let docContext = '';
  if (documents.length > 0) {
    docContext = '\n\nUploaded documents:\n' + documents.map(d =>
      `--- Document: ${d.name} ---\n${d.content.slice(0, MAX_CHARS)}`
    ).join('\n\n');
  }

  const base = `You are a LEGAL-ONLY AI assistant. INDIAN LAW ONLY. No code, no non-legal topics.${docContext}

STRICT RULES:
1. Be CONCISE. Simple question = 2-3 short paragraphs maximum.
2. NO tables. NO numbered lists. NO bullet points unless comparing 2-3 items.
3. NO headings like "Key Points" or "Overview". Just answer naturally.
4. NO fluff or introductory phrases like "Here is an explanation..." or "Certainly!".
5. If user pastes contract/NDA text → use GREEN/YELLOW/RED tags. Otherwise NEVER use them.
6. If unsure or need current info → respond with exactly: [SEARCH] what to search for
7. If you KNOW the answer → answer immediately without searching.`;

  const system = systemExtra ? `${base}\n\n${systemExtra}` : base;
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': `http://localhost:${PORT}`, 'X-Title': 'CORTEX Legal Hub' },
    body: JSON.stringify({ model: 'openai/gpt-oss-120b:free', messages: [{ role: 'system', content: system }, ...messages], temperature: 0.2, max_tokens: 8192 }),
  });
  return resp.json();
}

async function chat(key, messages) {
  // Phase 1: Ask model first, see if it knows the answer
  const phase1 = await callModel(key, messages,
    'STRICT: Answer ONLY from your knowledge. If you KNOW the answer, give it concisely. ' +
    'If you are even slightly unsure or need current info, start with exactly: [SEARCH] what to search'
  );

  const text = phase1.choices?.[0]?.message?.content || '';
  const searchMatch = text.match(/^\[SEARCH\]\s*(.+)/s);

  if (!searchMatch) {
    // Model answered from knowledge — return as-is
    return { data: phase1, searched: false };
  }

  // Phase 2: Model needs web search
  const query = searchMatch[1].trim();
  const results = await searchWeb(query);
  const scraped = [];
  const scrapes = await Promise.allSettled(results.slice(0, 2).map(r => scrapeUrl(r.url, { maxChars: 4000 })));
  scrapes.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) scraped.push({ url: results[i].url, title: results[i].title, content: r.value.text || '' });
  });

  const context = scraped.map(s => `--- ${s.title || s.url} ---\n${(s.content || '').slice(0, 4000)}`).join('\n\n');

  // Re-ask with web context
  const finalMessages = [
    ...messages,
    { role: 'assistant', content: `I need to look up current information about: ${query}` },
    { role: 'user', content: `Web search results for "${query}":\n${context || '(no results found)'}\n\nNow answer the original question. Use these if relevant, ignore if not.` }
  ];
  const phase2 = await callModel(key, finalMessages, '');
  phase2.sources = scraped.map(s => ({ url: s.url, title: s.title }));
  return { data: phase2, searched: true };
}

function collectBody(req) {
  return new Promise(resolve => { let b = ''; req.on('data', c => b += c); req.on('end', () => resolve(b)); });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // POST /api/chat  (model first, searches web only if needed)
  if (path === '/api/chat' && req.method === 'POST') {
    const body = await collectBody(req);
    try {
      const { messages, urls } = JSON.parse(body);
      if (!SERVER_KEY) return json(res, 401, { error: 'No API key. Configure OpenRouter via /connect in CLI first.' });
      if (!messages) return json(res, 400, { error: 'messages required' });

      // If user provided specific URLs, scrape them and add to first message
      if (urls && urls.length > 0) {
        const scraped = [];
        const results = await Promise.allSettled(urls.map(u => scrapeUrl(u, { maxChars: 4000 })));
        results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) scraped.push({ url: urls[i], content: r.value.text || '' }); });
        if (scraped.length > 0) {
          const context = scraped.map(s => `--- ${s.url} ---\n${(s.content || '').slice(0, 4000)}`).join('\n\n');
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'user') lastMsg.content += `\n\nScraped URLs:\n${context}`;
        }
      }

      const { data, searched } = await chat(SERVER_KEY, messages);
      if (data.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(data));
      }
      if (!searched && data.choices?.[0]?.message?.content) {
        data._source = 'knowledge';
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) { json(res, 500, { error: e.message }); }
    return;
  }

  // POST /api/research
  if (path === '/api/research' && req.method === 'POST') {
    const body = await collectBody(req);
    try {
      const { query, urls } = JSON.parse(body);
      if (!SERVER_KEY) return json(res, 401, { error: 'No API key. Configure OpenRouter via /connect in CLI first.' });
      if (!query) return json(res, 400, { error: 'query required' });

      const scraped = [];
      const toScrape = urls || [];
      if (toScrape.length === 0) {
        const results = await searchWeb(query);
        const scrapes = await Promise.allSettled(results.slice(0, 2).map(r => scrapeUrl(r.url, { maxChars: 4000 })));
        scrapes.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) scraped.push({ url: results[i].url, title: results[i].title, content: r.value.text || '' }); });
      } else {
        const scrapes = await Promise.allSettled(toScrape.map(u => scrapeUrl(u, { maxChars: 4000 })));
        scrapes.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) scraped.push({ url: toScrape[i], content: r.value.text || '' }); });
      }

      const context = scraped.map(s => `--- ${s.title || s.url} ---\n${(s.content || '').slice(0, 4000)}`).join('\n\n');
      const msg = query + (context ? `\n\nScraped content:\n${context}` : '') + '\n\nAnalyze the above and cite sources.';
      const { data } = await chat(SERVER_KEY, [{ role: 'user', content: msg }]);
      json(res, 200, { success: !data.error, sources: scraped.map(s => ({ url: s.url, title: s.title })), data });
    } catch (e) { json(res, 200, { success: false, error: e.message }); }
    return;
  }

  // GET /api/status
  if (path === '/api/status') {
    const scraperAvail = await checkScraplerAvailable();
    json(res, 200, { status: 'running', model: 'openai/gpt-oss-120b:free', keyConfigured: !!SERVER_KEY, scraperAvailable: scraperAvail, port: PORT, docCount: documents.length, maxDocs: MAX_DOCS });
    return;
  }

  // POST /api/documents  — upload document
  if (path === '/api/documents' && req.method === 'POST') {
    const body = await collectBody(req);
    try {
      const { name, content } = JSON.parse(body);
      if (!name || !content) return json(res, 400, { error: 'name and content required' });
      if (documents.length >= MAX_DOCS) return json(res, 400, { error: `Max ${MAX_DOCS} documents allowed. Remove one first.` });
      if (content.length > MAX_CHARS) return json(res, 400, { error: `Document too large. Max ${Math.round(MAX_CHARS / 1000)}KB.` });
      const id = docIdCounter++;
      documents.push({ id, name, content, size: content.length, uploadedAt: Date.now() });
      json(res, 200, { success: true, id, name, size: content.length, docCount: documents.length });
    } catch (e) { json(res, 500, { error: e.message }); }
    return;
  }

  // GET /api/documents — list documents
  if (path === '/api/documents' && req.method === 'GET') {
    json(res, 200, { documents: documents.map(d => ({ id: d.id, name: d.name, size: d.size, uploadedAt: d.uploadedAt })), maxDocs: MAX_DOCS });
    return;
  }

  // DELETE /api/documents/:id — remove document
  const docDeleteMatch = path.match(/^\/api\/documents\/(\d+)$/);
  if (docDeleteMatch && req.method === 'DELETE') {
    const id = parseInt(docDeleteMatch[1], 10);
    const idx = documents.findIndex(d => d.id === id);
    if (idx === -1) return json(res, 404, { error: 'Document not found' });
    documents.splice(idx, 1);
    json(res, 200, { success: true, docCount: documents.length });
    return;
  }

  // Serve static
  let filePath = join(__dirname, path === '/' ? 'index.html' : path);
  if (!extname(filePath)) filePath = join(filePath, 'index.html');
  try {
    if (!existsSync(filePath)) filePath = join(__dirname, 'index.html');
    const content = readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('index.html')) {
      const html = content.replace('__HAS_KEY__', JSON.stringify(!!SERVER_KEY)).replace('__PORT__', String(PORT));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' }); res.end(content);
  } catch { json(res, 404, { error: 'Not found' }); }
});

server.listen(PORT, () => {
  const s = SERVER_KEY ? `key OK (${SERVER_KEY.slice(0, 8)}...)` : 'NO KEY — configure via CLI /connect';
  console.log(`Legal Hub → http://localhost:${PORT} | Owl Alpha | ${s}`);
});
