// Chat me seedha image generate (tab switch nahi)
(function () {
  let busy = false, lastInput = null;
  const toast = t => { try { window.app && window.app.showToast && window.app.showToast(t); } catch (e) {} };
  const say = t => { try { window.voiceAssistant && window.voiceAssistant.speak && window.voiceAssistant.speak(t); } catch (e) {} };

  const V = '(?:generate|जनरेट|banao|bana do|banado|बनाओ|बना दो)';
  const N = '(?:image|photo|picture|pic|इमेज|फोटो|फ़ोटो|तस्वीर)';
  const RX = [
    new RegExp('^(?:please\\s+|plz\\s+)?(?:generate|create|make|draw)\\s+(?:an?\\s+)?' + N + '\\s*(?:of|for|:|-)?\\s*(.+)$', 'i'),
    new RegExp('^' + N + '\\s*' + V + '\\s*(?:karo|करो)?\\s*[:\\-]?\\s*(.+)$', 'i'),
    new RegExp('^(.+?)\\s+(?:की|का|ki|ka|ke)\\s+' + N + '\\s+' + V + '(?:\\s+(?:karo|करो))?$', 'i')
  ];

  function clean(p) {
    return String(p || '').replace(/^(?:karo|करो|kar do|of|ki|ka|की|का)\s+/i, '')
      .replace(/\s+(?:karo|करो|kar do|please|plz)$/i, '').trim();
  }
  function match(text) {
    const t = String(text || '').trim();
    if (!t || t.length > 300) return null;
    for (const r of RX) {
      const m = t.match(r);
      if (m) { const p = clean(m[1]); if (p.length >= 2) return p; }
    }
    return null;
  }

  async function generate(prompt) {
    const bases = ['', 'http://127.0.0.1:3000']; // APK me Termux server (same phone)
    let lastErr = 'unknown';
    for (const b of bases) {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 70000);
      try {
        const r = await fetch(b + '/api/generate-image', {
          method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aspectRatio: '1:1', quantity: 1 })
        });
        let d = {}; try { d = await r.json(); } catch (e) {}
        if (r.ok && d.success && d.imageUrl) return d.imageUrl;
        lastErr = d.error || ('HTTP ' + r.status);
      } catch (e) { lastErr = e.message; }
      finally { clearTimeout(to); }
    }
    throw new Error(lastErr);
  }

  async function run(prompt, orig, fromVoice) {
    if (busy) { toast('फोटो बन रही है, रुकिए…'); return; }
    busy = true;
    const chat = window.chat;
    try {
      if (chat && chat.appendMessage) chat.appendMessage('user', orig || prompt, 'u_img_' + Date.now(), Date.now());
      toast('🎨 फोटो बन रही है…');
      if (fromVoice) say('ठीक है सर, फोटो बना रहा हूँ।');
      const url = await generate(prompt);
      if (chat && chat.appendMessage) chat.appendMessage('assistant', '🎨 "' + prompt + '"', 'a_img_' + Date.now(), Date.now(), url);
      if (fromVoice) say('फोटो तैयार है सर, चैट में देखिए।');
    } catch (e) {
      const msg = '⚠️ फोटो नहीं बनी: ' + e.message + '\n(Termux server चालू है? rj चलाइए।)';
      if (chat && chat.appendMessage) chat.appendMessage('assistant', msg, 'a_err_' + Date.now(), Date.now());
      if (fromVoice) say('फोटो नहीं बन पाई।');
    } finally { busy = false; }
  }

  function isTextInput(t) { return t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && (!t.type || t.type === 'text'))); }
  function take(inp) {
    const v = ((inp && inp.value) || '').trim();
    const p = match(v);
    if (!p) return false;
    inp.value = '';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    run(p, v, false);
    return true;
  }

  document.addEventListener('focusin', e => { if (isTextInput(e.target)) lastInput = e.target; }, true);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !isTextInput(e.target)) return;
    if (take(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', e => {
    const sb = window.chat && window.chat.sendBtn;
    const hit = (sb && (e.target === sb || sb.contains(e.target))) || (e.target.closest && e.target.closest('#sendBtn,#sendButton,#btnSend,.send-btn'));
    if (!hit) return;
    if (lastInput && lastInput.offsetParent !== null && take(lastInput)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  window.chatImage = { match, run: (p, voice) => run(p, p, !!voice) };
})();
