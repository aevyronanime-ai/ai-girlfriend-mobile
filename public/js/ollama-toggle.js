(function () {
  var L = localStorage;
  var N = { gemini: '☁️ Gemini', ollama: '🦙 Ollama', openrouter: '⚡ OpenRouter' };
  var C = { gemini: '#2563eb', ollama: '#16a34a', openrouter: '#9333ea' };
  var ORDER = ['gemini', 'ollama', 'openrouter'];
  function prov() { return L.getItem('ai_provider') || (L.getItem('use_ollama') === '1' ? 'ollama' : 'gemini'); }
  function setProv(p) { L.setItem('ai_provider', p); L.setItem('use_ollama', p === 'gemini' ? '0' : '1'); }
  function toast(t) { if (window.app && window.app.showToast) window.app.showToast(t); }
  function paint(b) { var p = prov(); b.textContent = N[p]; b.style.background = C[p]; }
  var base = 'position:fixed;right:10px;z-index:99999;border:0;border-radius:20px;padding:10px 14px;color:#fff;font-size:14px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.5)';
  function keyBox() {
    var o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
    o.innerHTML = '<div style="background:#111827;padding:18px;border-radius:14px;width:100%;max-width:340px;color:#fff"><div style="margin-bottom:10px;font-weight:bold">⚡ OpenRouter key</div><input id="orK" type="text" autocomplete="off" placeholder="sk-or-..." style="-webkit-text-security:disc;width:100%;padding:10px;border-radius:8px;border:1px solid #374151;background:#030712;color:#fff;box-sizing:border-box"><div style="display:flex;gap:8px;margin-top:12px"><button id="orS" style="flex:1;padding:10px;border:0;border-radius:8px;background:#9333ea;color:#fff;font-weight:bold">Save</button><button id="orX" style="flex:1;padding:10px;border:0;border-radius:8px;background:#374151;color:#fff">Cancel</button></div></div>';
    document.body.appendChild(o);
    o.querySelector('#orS').onclick = function () {
      var v = o.querySelector('#orK').value.trim();
      if (v) { L.setItem('or_key', v); setProv('openrouter'); if (window.__tb) paint(window.__tb); toast('OpenRouter key सेव हो गई'); }
      o.remove();
    };
    o.querySelector('#orX').onclick = function () { o.remove(); };
  }
  function init() {
    var b = document.createElement('button');
    window.__tb = b; b.style.cssText = base + ';bottom:200px';
    b.onclick = function () {
      var n = ORDER[(ORDER.indexOf(prov()) + 1) % ORDER.length];
      setProv(n); paint(b); toast('अब चल रहा है: ' + N[n]);
    };
    var k = document.createElement('button');
    k.textContent = '🔑';
    k.style.cssText = base + ';bottom:255px;background:#374151';
    k.onclick = keyBox;
    paint(b);
    document.body.appendChild(b);
    document.body.appendChild(k);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
