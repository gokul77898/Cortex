#!/usr/bin/env node
// End-to-end smoke test for the shared-session server.
// Verifies session-bound URLs, wrong-session page, QR endpoints, and SSE.

const loadServer = async () => {
  try { return await import('../src/services/shareServer/server.ts') }
  catch (err) { console.error('failed to load share server', err); process.exit(1) }
}

const run = async () => {
  const mod = await loadServer()
  const srv = await mod.startShareServer({ port: 19977, driverName: 'smoke' })

  const fail = (msg) => {
    console.error('✗', msg)
    srv.stop().finally(() => process.exit(1))
  }

  console.log('✓ listening on', srv.url, '| lan:', srv.lanUrl, '| sid:', srv.sessionId, '| token:', srv.token)

  const base = `http://127.0.0.1:${srv.port}`
  const sessionBase = `${base}/s/${srv.sessionId}`

  // 1. Root returns wrong-session page (410)
  const rootRes = await fetch(base + '/')
  const rootHtml = await rootRes.text()
  if (rootRes.status !== 410) return fail(`root should be 410 (wrong session), got ${rootRes.status}`)
  if (!rootHtml.includes('no longer valid')) return fail('root missing wrong-session copy')
  console.log('✓ GET / → 410 wrong-session page')

  // 2. Wrong session id returns 410
  const wrong = await fetch(base + '/s/AAAABBBB/')
  if (wrong.status !== 410) return fail(`wrong session should be 410, got ${wrong.status}`)
  console.log('✓ GET /s/<wrong>/ → 410 wrong-session page')

  // 3. Correct session serves UI
  const ui = await fetch(sessionBase + '/')
  const uiHtml = await ui.text()
  if (ui.status !== 200) return fail(`UI should be 200, got ${ui.status}`)
  if (!uiHtml.includes('Cortex · Shared Session')) return fail('UI missing title')
  if (!uiHtml.includes('<canvas id="bg"')) return fail('UI missing animated canvas')
  if (!uiHtml.includes('qr.svg?download=1')) return fail('UI missing QR download link')
  if (!uiHtml.includes(srv.sessionId.slice(0, 8))) return fail('UI missing session id display')
  console.log('✓ GET /s/<sid>/ serves UI (' + uiHtml.length + ' bytes)')

  // 4. Token auth on events/send
  const badTok = await fetch(sessionBase + '/events?token=wrong')
  if (badTok.status !== 401) return fail(`bad token should 401, got ${badTok.status}`)
  const badSend = await fetch(sessionBase + '/send?token=wrong', { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
  if (badSend.status !== 401) return fail(`bad token on /send should 401, got ${badSend.status}`)
  console.log('✓ bad tokens rejected with 401 on events + send')

  // 5. SSE + broadcast end-to-end
  const received = []
  const sseDone = new Promise((resolve, reject) => {
    const ctl = new AbortController()
    fetch(sessionBase + '/events?token=' + srv.token, { signal: ctl.signal })
      .then(async res => {
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const parts = buf.split('\n\n'); buf = parts.pop() ?? ''
          for (const p of parts) {
            const line = p.split('\n').find(l => l.startsWith('data: '))
            if (!line) continue
            try {
              const msg = JSON.parse(line.slice(6))
              received.push(msg)
              if (received.find(m => m.user === 'alice' && m.kind === 'task')) {
                ctl.abort(); resolve(); return
              }
            } catch {}
          }
        }
      })
      .catch(e => { if (e.name !== 'AbortError') reject(e) })
    setTimeout(() => { ctl.abort(); reject(new Error('sse timeout')) }, 4000)
  })
  await new Promise(r => setTimeout(r, 200))

  const send = await fetch(sessionBase + '/send?token=' + srv.token, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ user:'alice', text:'build the backend', kind:'task' }),
  })
  if (send.status !== 200) return fail(`POST /send returned ${send.status}`)
  await sseDone
  const task = received.find(m => m.user === 'alice' && m.kind === 'task')
  if (!task || task.text !== 'build the backend') return fail('task not broadcast via SSE')
  console.log('✓ POST /send → SSE broadcast delivered in real time')

  // 6. QR endpoints use session-scoped URL and encode the shareable URL
  const qrSvg = await fetch(sessionBase + '/qr.svg')
  const qrSvgText = await qrSvg.text()
  if (qrSvg.status !== 200 || !qrSvgText.includes('<svg')) return fail('qr.svg failed')
  if (qrSvg.headers.get('content-type') !== 'image/svg+xml') return fail('qr.svg wrong content-type')
  console.log(`✓ GET /s/<sid>/qr.svg returns SVG (${qrSvgText.length} bytes)`)

  const qrPng = await fetch(sessionBase + '/qr.png?download=1')
  const qrPngBuf = new Uint8Array(await qrPng.arrayBuffer())
  if (qrPng.status !== 200) return fail(`/qr.png returned ${qrPng.status}`)
  if (qrPngBuf[0] !== 0x89 || qrPngBuf[1] !== 0x50 || qrPngBuf[2] !== 0x4E || qrPngBuf[3] !== 0x47) return fail('qr.png not valid PNG')
  const cd = qrPng.headers.get('content-disposition') || ''
  if (!cd.includes('attachment')) return fail('qr.png missing attachment disposition')
  console.log(`✓ GET /s/<sid>/qr.png?download=1 returns downloadable PNG (${qrPngBuf.length} bytes)`)

  // 7. shareUrl getter reflects current state (LAN before tunnel)
  if (!srv.shareUrl.includes(`/s/${srv.sessionId}/`)) return fail('shareUrl does not include session path')
  if (!srv.shareUrl.startsWith('http://') ) return fail('shareUrl not http')
  console.log('✓ shareUrl = ' + srv.shareUrl)

  // 8. Old session rejected after new server starts (simulates CLI restart)
  const oldSid = srv.sessionId
  await srv.stop()
  const srv2 = await mod.startShareServer({ port: 19977, driverName: 'smoke2' })
  if (srv2.sessionId === oldSid) return fail('new server produced same session id')
  const oldLink = await fetch(`http://127.0.0.1:${srv2.port}/s/${oldSid}/`)
  if (oldLink.status !== 410) return fail(`old session id should 410 on restart, got ${oldLink.status}`)
  const oldLinkHtml = await oldLink.text()
  if (!oldLinkHtml.includes('no longer valid')) return fail('old link missing wrong-session page copy')
  console.log(`✓ after restart, old session id ${oldSid} → 410 wrong-session`)
  console.log(`✓ new session id is ${srv2.sessionId}`)
  await srv2.stop()

  console.log('\nALL CHECKS PASSED ✓')
  process.exit(0)
}

run().catch(err => { console.error('smoke failed:', err); process.exit(1) })
