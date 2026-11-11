// Chat me seedha image generate (tab switch nahi)
(function () {
  let busy = false, lastInput = null;
  const toast = t => { try { window.app && window.app.showToast && window.app.showToast(t); } catch (e) {} };
  const say = t => { try { window.voiceAssistant && window.voiceAssistant.speak && window.voiceAssistant.speak(t); } catch (e) {} };

  const V = '(?:generate|जनरेट|banao|bana do|banado|बनाओ|बना दो)';
  const N = '(?:image|photo|picture|pic|इमेज|फोटो|फ़ोटो|तस्वीर)';
  const V2 = '(?:generate|generator|generation|banao|bana do|banado|bana|बनाओ|बना दो|बनाना|जनरेट|जनरेटर)';
  const RX = [
    new RegExp('^(?:please\\s+|plz\\s+)?(?:generate|create|make|draw)\\s+(?:an?\\s+)?' + N + '\\s*(?:of|for|:|-)?\\s*(.+)$', 'i'),
    new RegExp('^' + N + '\\s*' + V2 + '\\s*(?:karo|करो)?\\s*[:\\-]?\\s*(.+)$', 'i'),
    new RegExp('^(.+?)\\s+(?:की|का|के|ki|ka|ke)\\s+' + N + '(?:\\s+' + V2 + ')?(?:\\s+(?:karo|करो|kar do|chahiye|चाहिए))?$', 'i'),
    new RegExp('^((?:\\S+\\s+){0,3}\\S+)\\s+' + N + '\\s+' + V2 + '(?:\\s+(?:karo|करो))?$', 'i')
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


  async function toBlob(url) {
    const r = await fetch(url);
    return await r.blob();
  }
  async function saveImage(url, name) {
    try {
      const blob = await toBlob(url);
      const ext = (blob.type && blob.type.split('/')[1]) || 'jpg';
      const fname = name + '.' + ext.replace('jpeg', 'jpg');
      const file = new File([blob], fname, { type: blob.type || 'image/jpeg' });
      // APK/mobile: share sheet (Save to Gallery / Drive / WhatsApp)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'J.A.R.V.I.S. Image' }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('⬇️ डाउनलोड शुरू');
    } catch (e) {
      window.open(url, '_blank');
      toast('फोटो को देर तक दबाकर Save करें');
    }
  }
  function addButtons(msgId, url, prompt) {
    setTimeout(() => {
      const el = document.getElementById(msgId) || document.querySelector('[data-id="' + msgId + '"]');
      let host = el;
      if (!host) {
        const imgs = document.querySelectorAll('#chatMessages img, .message img, .chat-messages img');
        const last = imgs[imgs.length - 1];
        host = last && (last.closest('.message') || last.parentElement);
      }
      if (!host || host.querySelector('.ci-actions')) return;
      const bar = document.createElement('div');
      bar.className = 'ci-actions';
      bar.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap';
      const mk = (label, fn) => {
        const b = document.createElement('button');
        b.textContent = label; b.className = 'chip-btn';
        b.style.cssText = 'padding:8px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:inherit;font-size:14px';
        b.onclick = fn; return b;
      };
      const base = 'jarvis-' + String(prompt).replace(/[^\w\u0900-\u097F]+/g, '-').slice(0, 24) + '-' + Date.now();
      bar.appendChild(mk('⬇️ Download', () => saveImage(url, base)));
      bar.appendChild(mk('🔁 फिर बनाओ', () => run(prompt, prompt, false)));
      bar.style.cssText = 'display:flex;flex:0 0 100%;width:100%;max-width:100%;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center';
      Array.from(bar.children).forEach(b => { b.style.flex = '0 0 auto'; b.style.width = 'auto'; b.style.height = 'auto'; b.style.minHeight = '0'; b.style.padding = '6px 12px'; b.style.fontSize = '13px'; b.style.whiteSpace = 'nowrap'; });
      const img = host.querySelector('img');
      const anchor = img ? (img.closest('.message-content,.msg-content,.bubble,.message-bubble') || img.parentElement) : host;
      (anchor || host).appendChild(bar);
    }, 150);
  }

  async function run(prompt, orig, fromVoice) {
    if (busy) { toast('फोटो बन रही है, रुकिए…'); return; }
    busy = true;
    const chat = window.chat;
    try {
      if (chat && chat.appendMessage) chat.appendMessage('user', orig || prompt, 'u_img_' + Date.now(), Date.now());
      toast('🎨 फोटो बन रही है…');
      if (fromVoice) say('ठीक है सर, फोटो बना रहा हूँ।');
      const url = await generate(prompt + ', high quality, detailed, natural lighting');
      const aid = 'a_img_' + Date.now();
      if (chat && chat.appendMessage) chat.appendMessage('assistant', '🎨 "' + prompt + '"', aid, Date.now(), url);
      addButtons(aid, url, prompt);
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
