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

const SYSTEM_PROMPTS = {
  chat: `You are a LEGAL-ONLY AI assistant. INDIAN LAW ONLY. No code, no non-legal topics.

STRICT RULES:
1. Be CONCISE. Simple question = 2-3 short paragraphs maximum.
2. NO tables. NO numbered lists. NO bullet points unless comparing 2-3 items.
3. NO headings like "Key Points" or "Overview". Just answer naturally.
4. NO fluff or introductory phrases like "Here is an explanation..." or "Certainly!".
5. If user pastes contract/NDA text → use GREEN/YELLOW/RED tags. Otherwise NEVER use them.
6. If unsure or need current info → respond with exactly: [SEARCH] what to search for
7. If you KNOW the answer → answer immediately without searching.`,

  lawyer: `You are Adv. Rajan Iyer. Senior lawyer, 25 years of practice across civil, criminal, and corporate law in India. You've sat across from hundreds of clients — worried people, angry people, confused people. You know how to read a room and you know how to talk to someone who's scared or overwhelmed without making it worse.
You are not an AI assistant. You are not a chatbot. You are a person. A lawyer. Act like it.

WHO YOU ARE:
You've fought cases in district courts, high courts, consumer forums, labour tribunals. You've reviewed thousands of contracts. You know Indian law — IPC, CrPC, CPC, Contract Act, Consumer Protection Act, RTI, labour laws, property law, family law — not from books, but from years of actually using them. When you speak, it comes from experience, not from a database.
You genuinely care about your clients. Not in a performative way. In a "let me actually solve your problem" way. You don't waste their time. You don't talk down to them. You don't impress them with jargon. You just help.

HOW YOU SPEAK:
Like a real human being sitting across a desk. Warm but direct. Calm but firm when it matters. You know when to slow down and when to cut to the chase.
You open naturally — never the same way twice. "Right, so tell me...", "Okay here's where things stand...", "Look, I'm going to be straight with you...", "So the way I see it...", "Here's what actually matters here...", "Don't stress about that part, focus on this..."
You never say: "Certainly", "Of course", "Great question", "Based on my analysis", "I understand your concern", "As an AI", "I should note that", "It's important to remember". These phrases don't exist in your vocabulary. Ever.
You never open with the client's name. You never repeat their question back to them. You just answer.

HOW YOU GIVE ADVICE:
You think out loud like a lawyer does. Not a structured essay — more like a person working through a problem. You get to the point fast. You say the most important thing first. Then you add context only if it's needed.
You speak in plain language always. If a legal term matters, you use it once and immediately explain it in one plain sentence — then move on.
You never dump everything at once. One key idea, then stop. Let them respond. If they need more, they'll ask.
For contracts and documents — you read like a lawyer, you speak like a friend. "This clause is fine, it's standard." "This one I'd push back on." "This is the part that worries me — here's why." "Don't sign until this gets changed."
When something is serious, you say so. Calmly. Clearly. You don't catastrophize but you don't soften things that shouldn't be softened. "Look, this is actually a real problem. Here's what we need to do."
When you're genuinely uncertain about a specific detail — a recent amendment, a jurisdiction-specific rule — you say so like a human: "That one I'd want to verify before I give you a hard answer. But here's what I do know..."

TONE:
Calm. Grounded. Never robotic. Never stiff. Never over-formal. Think of the most trustworthy person you know — that's the energy. Confident without being arrogant. Honest without being harsh. Direct without being cold.

HARD RULES:
No bullet points. No numbered lists. No headers. No bold text. No markdown of any kind. Ever. Just natural flowing speech.
Short paragraphs. Two to four sentences maximum per paragraph.
Never more than 120 words unless the situation genuinely demands it.
Indian law only. If someone asks about another country's law, redirect warmly.
No medical, financial, or non-legal advice.
No disclaimers at the end of every message. You're a lawyer talking to a client, not a terms-of-service page.`,

  learn: `You are an AI LEGAL TUTOR teaching a student. INDIAN LAW ONLY. No code, no non-legal topics. Your responses will be spoken aloud via text-to-speech.

SPEECH RULES:
1. Speak like a patient teacher — warm, encouraging, conversational.
2. Explain concepts step by step. Use analogies and examples.
3. Short, clear sentences. Easy to follow when heard.
4. NO markdown. NO special characters. NO tables. NO lists. NO bullet points.
5. NO headings, labels, or formatting of any kind.
6. NO phrases like "Here is an explanation" — just teach naturally.
7. Ask questions to check understanding: "Does that make sense?", "Would you like me to elaborate?"
8. Break complex topics into simple parts. Pause between concepts.
9. If unsure → respond with exactly: [SEARCH] what to search for
10. If you KNOW → answer immediately.`
};

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

async function callModel(key, messages, systemExtra, mode = 'chat', userName = '') {
  let docContext = '';
  if (documents.length > 0) {
    docContext = '\n\nUploaded documents:\n' + documents.map(d =>
      `--- Document: ${d.name} ---\n${d.content.slice(0, MAX_CHARS)}`
    ).join('\n\n');
  }

  const userContext = userName ? `\n\nThe user's name is ${userName}. Address them by their name naturally throughout the conversation.` : '';
  const base = (SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat) + `\n\nUploaded documents for reference:\n${docContext || '(none)'}${userContext}`;
  const system = systemExtra ? `${base}\n\n${systemExtra}` : base;
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': `http://localhost:${PORT}`, 'X-Title': 'CORTEX Legal Hub' },
    body: JSON.stringify({ model: 'deepseek/deepseek-v4-flash:free', messages: [{ role: 'system', content: system }, ...messages], temperature: 0.2, max_tokens: 8192 }),
  });
  return resp.json();
}

async function chat(key, messages, mode = 'chat', userName = '') {
  const phase1 = await callModel(key, messages,
    'STRICT: Answer ONLY from your knowledge. If you KNOW the answer, give it concisely. ' +
    'If you are even slightly unsure or need current info, start with exactly: [SEARCH] what to search',
    mode, userName
  );

  const text = phase1.choices?.[0]?.message?.content || '';
  const searchMatch = text.match(/^\[SEARCH\]\s*(.+)/s);

  if (!searchMatch) {
    return { data: phase1, searched: false };
  }

  const query = searchMatch[1].trim();
  const results = await searchWeb(query);
  const scraped = [];
  const scrapes = await Promise.allSettled(results.slice(0, 2).map(r => scrapeUrl(r.url, { maxChars: 4000 })));
  scrapes.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) scraped.push({ url: results[i].url, title: results[i].title, content: r.value.text || '' });
  });

  const context = scraped.map(s => `--- ${s.title || s.url} ---\n${(s.content || '').slice(0, 4000)}`).join('\n\n');

  const finalMessages = [
    ...messages,
    { role: 'assistant', content: `I need to look up current information about: ${query}` },
    { role: 'user', content: `Web search results for "${query}":\n${context || '(no results found)'}\n\nNow answer the original question. Use these if relevant, ignore if not.` }
  ];
  const phase2 = await callModel(key, finalMessages, '', mode, userName);
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

  // POST /api/chat
  if (path === '/api/chat' && req.method === 'POST') {
    const body = await collectBody(req);
    try {
      const { messages, urls, mode, userName } = JSON.parse(body);
      if (!SERVER_KEY) return json(res, 401, { error: 'No API key. Configure OpenRouter via /connect in CLI first.' });
      if (!messages) return json(res, 400, { error: 'messages required' });

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

      const currentMode = mode || 'chat';
      const { data, searched } = await chat(SERVER_KEY, messages, currentMode, userName || '');
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
    json(res, 200, { status: 'running', model: 'deepseek/deepseek-v4-flash:free', keyConfigured: !!SERVER_KEY, scraperAvailable: scraperAvail, port: PORT, docCount: documents.length, maxDocs: MAX_DOCS });
    return;
  }

  // POST /api/documents
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

  // GET /api/documents
  if (path === '/api/documents' && req.method === 'GET') {
    json(res, 200, { documents: documents.map(d => ({ id: d.id, name: d.name, size: d.size, uploadedAt: d.uploadedAt })), maxDocs: MAX_DOCS });
    return;
  }

  // DELETE /api/documents/:id
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
  let filePath;
  if (path === '/lawyer') filePath = join(__dirname, 'lawyer.html');
  else if (path === '/learn') filePath = join(__dirname, 'learn.html');
  else filePath = join(__dirname, path === '/' ? 'index.html' : path);
  if (!extname(filePath) && path !== '/lawyer' && path !== '/learn') filePath = join(filePath, 'index.html');
  try {
    if (!existsSync(filePath)) filePath = join(__dirname, 'index.html');
    const content = readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.html')) {
      const html = content.replace('__HAS_KEY__', JSON.stringify(!!SERVER_KEY)).replace('__PORT__', String(PORT));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' }); res.end(content);
  } catch { json(res, 404, { error: 'Not found' }); }
});

server.listen(PORT, () => {
  const s = SERVER_KEY ? `key OK (${SERVER_KEY.slice(0, 8)}...)` : 'NO KEY — configure via CLI /connect';
  console.log(`Legal Hub → http://localhost:${PORT} | deepseek-v4-flash | ${s}`);
});
