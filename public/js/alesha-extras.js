(function () {
  var L = localStorage;
  function g(k, d) { var v = L.getItem(k); return v === null ? d : v; }
  var S = { mode: g('al_mode', 'girlfriend'), name: g('al_name', 'Alesha'), user: g('al_user', ''), blink: g('al_blink', '1') === '1' };
  function sayName(n) { var t = 'नमस्ते, मैं ' + n + ' हूँ'; try { if (typeof speak === 'function') speak(t); else { var u = new SpeechSynthesisUtterance(t); u.lang = 'hi-IN'; speechSynthesis.speak(u); } } catch (e) {} }
  function save() { L.setItem('al_mode', S.mode); L.setItem('al_name', S.name); L.setItem('al_user', S.user); L.setItem('al_blink', S.blink ? '1' : '0'); }
  function toast(t) { if (window.app && window.app.showToast) window.app.showToast(t); }
  function persona() {
    var u = S.user ? ('यूज़र का नाम ' + S.user + ' है, उसे इसी नाम से बुलाओ। ') : '';
    if (S.mode === 'agent') {
      return 'नए निर्देश (सबसे ऊपर, पुराने नाम और स्वभाव को भूल जाओ): तुम ' + S.name + ' हो, एक समझदार एजेंट सहायक। ' + u + 'सीधे, साफ़ और छोटे जवाब दो, काम के स्टेप बताओ। हिंदी या यूज़र की भाषा में बोलो।';
    }
    return 'नए निर्देश (सबसे ऊपर, पुराने नाम और स्वभाव को भूल जाओ): तुम ' + S.name + ' हो, यूज़र की प्यारी और समझदार गर्लफ्रेंड। ' + u + 'यूज़र के मूड को समझो: दुखी हो तो नरम, धीमी और हमदर्द बनो; मज़ाक करे तो तुम भी मज़ाकिया और हँसमुख रहो। हिंदी में 1-3 छोटे वाक्यों में जवाब दो।';
  }
  function patch() {
    var C = window.ClientAI;
    if (!C || C.__alp) return;
    var o = C.getSystemPrompt;
    C.getSystemPrompt = function () {
      var base = '';
      try { base = o.apply(this, arguments) || ''; } catch (e) {}
      return base + '\n\n' + persona();
    };
    C.__alp = 1;
  }
  var css = document.createElement('style');
  css.textContent = '#alAv{position:fixed;left:8px;bottom:175px;width:58px;height:58px;z-index:9998;pointer-events:none;opacity:.95}'
    + '.alE{transform-box:fill-box;transform-origin:center;animation:alb 4s infinite}'
    + '@keyframes alb{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}';
  document.head.appendChild(css);
  function avatar() {
    var a = document.getElementById('alAv');
    if (!a) {
      a = document.createElement('div');
      a.id = 'alAv';
      a.innerHTML = '<svg viewBox="0 0 100 100" width="58" height="58"><circle cx="50" cy="50" r="46" fill="#fde2e4"/><ellipse class="alE" cx="35" cy="45" rx="7" ry="9" fill="#222"/><ellipse class="alE" cx="65" cy="45" rx="7" ry="9" fill="#222"/><circle cx="26" cy="62" r="6" fill="#f9a8b8" opacity=".6"/><circle cx="74" cy="62" r="6" fill="#f9a8b8" opacity=".6"/><path d="M38 70 Q50 82 62 70" stroke="#c2415d" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
      document.body.appendChild(a);
    }
    a.style.display = S.blink ? 'block' : 'none';
  }
  var base = 'position:fixed;right:10px;z-index:99999;border:0;border-radius:20px;padding:10px 14px;color:#fff;font-size:14px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.5)';
  function panel() {
    var o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
    var inp = 'width:100%;padding:10px;border-radius:8px;border:1px solid #374151;background:#030712;color:#fff;box-sizing:border-box;margin:4px 0 10px';
    o.innerHTML = '<div style="background:#111827;padding:18px;border-radius:14px;width:100%;max-width:340px;color:#fff">'
      + '<div style="font-weight:bold;margin-bottom:10px">✨ Alesha सेटिंग्स</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:10px"><button id="alM1" style="flex:1;padding:10px;border:0;border-radius:8px;color:#fff">💖 Girlfriend</button><button id="alM2" style="flex:1;padding:10px;border:0;border-radius:8px;color:#fff">🤖 Agent</button></div>'
      + '<label>असिस्टेंट का नाम</label><input id="alN" style="' + inp + '">'
      + '<button id="alSp" style="padding:8px 12px;border:0;border-radius:8px;background:#0891b2;color:#fff;margin-bottom:10px">🔊 नाम बोलो</button>'
      + '<label>आपका नाम</label><input id="alU" style="' + inp + '">'
      + '<label style="display:block;margin-bottom:12px"><input id="alB" type="checkbox"> 👀 पलक झपकाने वाला चेहरा</label>'
      + '<div style="display:flex;gap:8px"><button id="alS" style="flex:1;padding:10px;border:0;border-radius:8px;background:#9333ea;color:#fff;font-weight:bold">Save</button><button id="alX" style="flex:1;padding:10px;border:0;border-radius:8px;background:#374151;color:#fff">Cancel</button></div></div>';
    document.body.appendChild(o);
    var m = S.mode;
    function paintM() {
      o.querySelector('#alM1').style.background = m === 'girlfriend' ? '#db2777' : '#374151';
      o.querySelector('#alM2').style.background = m === 'agent' ? '#2563eb' : '#374151';
    }
    o.querySelector('#alN').value = S.name;
    o.querySelector('#alU').value = S.user;
    o.querySelector('#alB').checked = S.blink;
    paintM();
    o.querySelector('#alM1').onclick = function () { m = 'girlfriend'; paintM(); };
    o.querySelector('#alM2').onclick = function () { m = 'agent'; paintM(); };
    o.querySelector('#alX').onclick = function () { o.remove(); };
    o.querySelector('#alSp').onclick = function () { sayName(o.querySelector('#alN').value.trim() || 'Alesha'); };
    o.querySelector('#alS').onclick = function () {
      S.mode = m;
      S.name = o.querySelector('#alN').value.trim() || 'Alesha';
      S.user = o.querySelector('#alU').value.trim();
      S.blink = o.querySelector('#alB').checked;
      save(); avatar(); patch();
      sayName(S.name); toast('सेव हो गया: ' + S.name + (S.mode === 'agent' ? ' (Agent)' : ' (Girlfriend)'));
      o.remove();
    };
  }
  function init() {
    patch(); avatar();
    var b = document.createElement('button');
    b.textContent = '✨';
    b.style.cssText = base + ';bottom:310px;background:#db2777';
    b.onclick = panel;
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
