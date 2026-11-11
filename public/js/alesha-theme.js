(function () {
  var L = localStorage;
  var THEMES = [['🌸 Sakura', 'sakura'], ['🌙 Dark', 'dark'], ['☀️ Light', 'light'], ['📜 Classic', 'classic']];
  var BGS = [['Default', ''], ['रात नीली', 'linear-gradient(160deg,#050a1f,#0b1d4a)'], ['गुलाबी', 'linear-gradient(160deg,#3a0a2a,#c2415d)'], ['जामुनी', 'linear-gradient(160deg,#1a0536,#6d28d9)'], ['हरा', 'linear-gradient(160deg,#04200f,#15803d)'], ['काला', '#000000']];
  var vid = null, sun = null, hasVideo = false;
  function toast(t) { if (window.app && window.app.showToast) window.app.showToast(t); }
  function idb(cb) {
    try {
      var r = indexedDB.open('alesha', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('f'); };
      r.onsuccess = function () { cb(r.result); };
      r.onerror = function () { cb(null); };
    } catch (e) { cb(null); }
  }
  function putV(blob) { idb(function (d) { if (d) d.transaction('f', 'readwrite').objectStore('f').put(blob, 'ice'); }); }
  function getV(cb) {
    idb(function (d) {
      if (!d) return cb(null);
      var q = d.transaction('f').objectStore('f').get('ice');
      q.onsuccess = function () { cb(q.result || null); };
      q.onerror = function () { cb(null); };
    });
  }
  function ensureVid(url) {
    if (!vid) {
      vid = document.createElement('video');
      vid.muted = true; vid.loop = true; vid.autoplay = true;
      vid.setAttribute('playsinline', '');
      vid.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:99990;pointer-events:none';
      document.body.appendChild(vid);
    }
    if (url) { vid.src = url; hasVideo = true; }
    vid.style.opacity = L.getItem('al_vop') || '0.3';
    var on = L.getItem('al_ice') === '1' && hasVideo;
    vid.style.display = on ? 'block' : 'none';
    if (on) { var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
  }
  function applySun() {
    if (!sun) {
      sun = document.createElement('div');
      sun.style.cssText = 'position:fixed;inset:0;z-index:99989;pointer-events:none;background:radial-gradient(circle at 80% 0%,rgba(255,210,90,.55),rgba(255,160,60,.15) 55%,transparent 80%)';
      document.body.appendChild(sun);
    }
    sun.style.display = L.getItem('al_sun') === '1' ? 'block' : 'none';
  }
  function voiceEl() {
    var h = document.querySelector('.voice-status-header');
    return h ? (h.closest('[id]') || h.parentElement) : null;
  }
  function applyTheme(t) {
    if (!t) return;
    document.documentElement.setAttribute('data-theme', t);
    L.setItem('al_theme', t);
  }
  function applyBg(v) {
    var e = voiceEl();
    if (e) e.style.background = v || '';
    L.setItem('al_vbg', v || '');
  }
  function refresh() { ensureVid(null); applySun(); }
  function preset(n) {
    if (n === 'ice') {
      if (!hasVideo) { toast('पहले 📁 वीडियो चुनो'); return; }
      applyTheme('dark'); L.setItem('al_ice', '1'); L.setItem('al_sun', '0');
    } else if (n === 'sun') {
      applyTheme('light'); L.setItem('al_ice', '0'); L.setItem('al_sun', '1');
    } else {
      applyTheme(n); L.setItem('al_ice', '0'); L.setItem('al_sun', '0');
    }
    refresh();
  }
  function panel() {
    var o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
    o.innerHTML = '<div style="background:#111827;padding:16px;border-radius:14px;width:100%;max-width:340px;color:#fff;max-height:92vh;overflow:auto">'
      + '<div style="font-weight:bold;margin-bottom:8px">🎨 थीम</div><div id="thB" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>'
      + '<div style="margin-bottom:6px">❄️ Ice वीडियो थीम</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"><button id="icB" style="padding:8px 12px;border:0;border-radius:8px;background:#0891b2;color:#fff">❄️ Ice चालू</button><button id="icF" style="padding:8px 12px;border:0;border-radius:8px;background:#374151;color:#fff">📁 वीडियो चुनो</button></div>'
      + '<input id="icI" type="file" accept="video/*" style="display:none">'
      + '<div style="margin-bottom:12px">वीडियो की चमक <input id="icO" type="range" min="0.1" max="0.8" step="0.05" style="width:100%"></div>'
      + '<div style="margin-bottom:6px">Voice का बैकग्राउंड</div><div id="bgB" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>'
      + '<div style="margin-bottom:12px">अपना रंग: <input id="bgC" type="color" value="#101030"></div>'
      + '<button id="thX" style="width:100%;padding:10px;border:0;border-radius:8px;background:#374151;color:#fff">बंद करो</button></div>';
    document.body.appendChild(o);
    var st = 'padding:8px 12px;border:0;border-radius:8px;background:#9333ea;color:#fff';
    THEMES.forEach(function (t) {
      var b = document.createElement('button'); b.style.cssText = st; b.textContent = t[0];
      b.onclick = function () { preset(t[1]); };
      o.querySelector('#thB').appendChild(b);
    });
    var sb = document.createElement('button'); sb.style.cssText = st.replace('#9333ea', '#f59e0b'); sb.textContent = '☀️ Sunlight';
    sb.onclick = function () { preset('sun'); };
    o.querySelector('#thB').appendChild(sb);
    BGS.forEach(function (x) {
      var b = document.createElement('button'); b.style.cssText = st.replace('#9333ea', '#db2777'); b.textContent = x[0];
      b.onclick = function () { applyBg(x[1]); };
      o.querySelector('#bgB').appendChild(b);
    });
    o.querySelector('#bgC').oninput = function (e) { applyBg(e.target.value); };
    var op = o.querySelector('#icO');
    op.value = L.getItem('al_vop') || '0.3';
    op.oninput = function () { L.setItem('al_vop', op.value); if (vid) vid.style.opacity = op.value; };
    o.querySelector('#icB').onclick = function () { preset('ice'); };
    o.querySelector('#icF').onclick = function () { o.querySelector('#icI').click(); };
    o.querySelector('#icI').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      putV(f);
      ensureVid(URL.createObjectURL(f));
      preset('ice');
      toast('Ice थीम चालू');
    };
    o.querySelector('#thX').onclick = function () { o.remove(); };
  }
  function init() {
    applyTheme(L.getItem('al_theme'));
    applyBg(L.getItem('al_vbg'));
    setTimeout(function () { applyBg(L.getItem('al_vbg')); }, 800);
    getV(function (b) { if (b) ensureVid(URL.createObjectURL(b)); else ensureVid(null); applySun(); });
    var b = document.createElement('button');
    b.textContent = '🎨';
    b.style.cssText = 'position:fixed;right:10px;bottom:365px;z-index:100000;border:0;border-radius:20px;padding:10px 14px;color:#fff;font-size:14px;font-weight:bold;background:#0891b2;box-shadow:0 2px 8px rgba(0,0,0,.5)';
    b.onclick = panel;
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
