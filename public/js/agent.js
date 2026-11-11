// J.A.R.V.I.S. Agent Mode: OpenRouter tool-calling + screen loop (APK only)
(function () {
  const MAX_STEPS = 12;
  let running = false, aborted = false, stopBtn = null;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const say = t => { try { window.voiceAssistant && window.voiceAssistant.speak && window.voiceAssistant.speak(t); } catch (e) {} };
  const toast = t => { try { window.app && window.app.showToast && window.app.showToast(t); } catch (e) {} };
  const SL = () => window.systemLauncher;
  const plugin = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SystemLauncher;

  function fn(name, desc, props, required) {
    const properties = {};
    Object.keys(props || {}).forEach(k => { properties[k] = { type: props[k] }; });
    return { type: 'function', function: { name, description: desc, parameters: { type: 'object', properties, required: required || Object.keys(props || {}) } } };
  }
  const TOOLS = [
    fn('open_app', 'Open an app by name', { name: 'string' }),
    fn('google_search', 'Search on Google', { q: 'string' }),
    fn('youtube_play', 'Search YouTube and play the first result', { q: 'string' }),
    fn('call', 'Call a contact or number', { contact: 'string' }),
    fn('tap', 'Tap the visible element with this exact text', { text: 'string' }),
    fn('type_text', 'Type text into the focused input', { text: 'string' }),
    fn('scroll', 'Scroll the screen', { dir: 'string' }),
    fn('back', 'Press back', {}, []),
    fn('home', 'Go to the home screen', {}, []),
    fn('finish', 'Task done or impossible. message = one short Hindi sentence', { message: 'string' })
  ];

  const SYSTEM = 'You are the JARVIS phone agent. Each turn you get the GOAL, past steps and the CURRENT SCREEN (text|desc|id, * = clickable). ' +
    'Call exactly ONE tool. You can work across 2-3 apps: use home() or open_app() to switch. Use tap() with exact visible text. ' +
    'Never enter passwords, OTP, PIN or payments. When done call finish with a short Hindi message.';

  async function getModels() {
    const manual = localStorage.getItem('agent_model');
    if (manual) return [manual];
    try {
      const c = JSON.parse(localStorage.getItem('agent_models_cache') || 'null');
      if (c && Date.now() - c.t < 6 * 3600 * 1000 && c.list && c.list.length) return c.list;
    } catch (e) {}
    const r = await fetch('https://openrouter.ai/api/v1/models?supported_parameters=tools');
    const d = await r.json();
    const list = (d.data || []).map(m => m.id).filter(id => String(id).endsWith(':free')).slice(0, 5);
    if (list.length) localStorage.setItem('agent_models_cache', JSON.stringify({ t: Date.now(), list }));
    return list;
  }

  async function callModel(model, key, userMsg) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 200, tools: TOOLS, tool_choice: 'auto',
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMsg }] })
      });
      const d = await r.json();
      const msg = d.choices && d.choices[0] && d.choices[0].message;
      if (!msg) throw new Error((d.error && d.error.message) || 'empty');
      const tc = msg.tool_calls && msg.tool_calls[0];
      if (tc) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}
        return { name: tc.function.name, args };
      }
      if (msg.content) return { name: 'finish', args: { message: String(msg.content).slice(0, 120) } };
      throw new Error('no tool call');
    } finally { clearTimeout(to); }
  }

  function fmtScreen(nodesJson) {
    let arr = [];
    try { arr = JSON.parse(nodesJson || '[]'); } catch (e) {}
    const seen = new Set(); const lines = [];
    arr.forEach(n => {
      const label = (n.t || n.d || '').trim();
      const line = (n.c ? '*' : '') + label + (n.d && n.t && n.d !== n.t ? ' | ' + n.d : '') + (n.id ? ' | ' + n.id : '');
      if (!label || seen.has(line)) return;
      seen.add(line); lines.push(line);
    });
    return lines.join('\n').slice(0, 2500) || '(खाली स्क्रीन)';
  }

  async function exec(name, a) {
    const L = SL();
    const go = (o) => L.executeStructuredCommand(o);
    switch (name) {
      case 'open_app': return go({ action: 'open_app', target: a.name || '' });
      case 'google_search': return go({ action: 'search_google', target: a.q || '' });
      case 'youtube_play': {
        const r = await go({ action: 'search_youtube', target: a.q || '' });
        if (r && (r.cancelled || r.blocked)) return r;
        await sleep(3500);
        return go({ action: 'youtube_first', spokenText: 'गाना चला रहा हूँ' });
      }
      case 'call': return go({ action: 'call', target: a.contact || '' });
      case 'tap': return go({ action: 'click_text', target: a.text || '' });
      case 'type_text': return go({ action: 'type_text', text: a.text || '' });
      case 'scroll': return go({ action: String(a.dir || '').toLowerCase() === 'up' ? 'scroll_up' : 'scroll_down' });
      case 'back': return go({ action: 'back' });
      case 'home': return go({ action: 'home' });
    }
    return { success: false, message: 'unknown tool ' + name };
  }

  function showStop() {
    if (stopBtn) return;
    stopBtn = document.createElement('button');
    stopBtn.id = 'jarvis-agent-stop';
    stopBtn.setAttribute('data-agent-stop', '1');
    stopBtn.textContent = '🛑 STOP';
    stopBtn.style.cssText = 'position:fixed;left:12px;bottom:100px;z-index:2147483647;background:#d50000;color:#fff;border:0;border-radius:24px;padding:12px 18px;font-size:16px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.5)';
    stopBtn.onclick = () => stop();
    document.body.appendChild(stopBtn);
  }
  function hideStop() { if (stopBtn) { stopBtn.remove(); stopBtn = null; } }

  function stop() {
    aborted = true;
    try { SL().executeStructuredCommand({ action: 'stop_all' }); } catch (e) {}
    say('रोक दिया।');
  }

  async function run(goal) {
    if (running) { toast('Agent पहले से चल रहा है'); return; }
    const key = localStorage.getItem('or_key') || '';
    if (!key) { say('OpenRouter key नहीं है। Settings में डालिए।'); return; }
    const P = plugin();
    if (!P || !P.readScreenNodes || !SL()) { say('एजेंट मोड सिर्फ़ APK में चलता है।'); toast('Agent: APK में चलाइए'); return; }
    running = true; aborted = false; showStop();
    say('ठीक है सर, शुरू करता हूँ।');
    const hist = []; let lastSig = '', repeat = 0;
    try {
      let models = await getModels();
      if (!models.length) { say('कोई tool वाला model नहीं मिला।'); return; }
      for (let step = 1; step <= MAX_STEPS && !aborted; step++) {
        const scr = await P.readScreenNodes();
        if (!scr || scr.success === false) { say(scr && scr.reason ? scr.reason : 'स्क्रीन नहीं पढ़ पाया।'); break; }
        const userMsg = 'GOAL: ' + goal + '\nSTEP ' + step + '/' + MAX_STEPS + '\nPAST:\n' + (hist.slice(-6).join('\n') || '-') +
          '\nCURRENT APP: ' + (scr.app || '?') + '\nCURRENT SCREEN:\n' + fmtScreen(scr.nodes);
        let act = null, lastErr = '';
        for (let i = 0; i < models.length && !act; i++) {
          try { act = await callModel(models[0], key, userMsg); }
          catch (e) { lastErr = e.message; models.push(models.shift()); }
        }
        if (!act) { say('Model से जवाब नहीं मिला।'); toast('Agent error: ' + lastErr); break; }
        if (aborted) break;
        if (act.name === 'finish') { say(act.args.message || 'काम हो गया सर।'); toast('✅ ' + (act.args.message || 'Done')); break; }
        const sig = act.name + JSON.stringify(act.args);
        repeat = sig === lastSig ? repeat + 1 : 0; lastSig = sig;
        if (repeat >= 2) { say('एक ही काम बार बार हो रहा है, रोक रहा हूँ।'); break; }
        const res = await exec(act.name, act.args);
        hist.push(step + '. ' + sig + ' -> ' + ((res && res.success !== false) ? 'ok' : 'FAILED ' + ((res && res.message) || '')));
        if (res && (res.cancelled || res.blocked)) break;
        await sleep(act.name === 'open_app' ? 2200 : 1300);
      }
    } catch (e) {
      console.error('[Agent]', e); say('Agent में दिक्कत आई।');
    } finally { running = false; hideStop(); }
  }

  function match(lower) {
    const m = String(lower || '').trim().match(/^(?:agent|एजेंट|एजेन्ट)\b[\s:,\-]*(.+)$/i);
    return m ? m[1].trim() : null;
  }

  window.jarvisAgent = { run, stop, match };
})();
