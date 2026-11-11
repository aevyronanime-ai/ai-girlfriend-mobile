(function () {
  if (window.__fabMenuLoaded) return;
  window.__fabMenuLoaded = true;
  var START = 270, GAP = 62;
  var css = document.createElement('style');
  css.textContent =
    '#fabm-main{position:fixed;right:16px;bottom:200px;width:56px;height:56px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;z-index:2147483647;box-shadow:0 4px 16px rgba(0,0,0,.45);cursor:pointer;transition:transform .25s}' +
    '#fabm-main.open{transform:rotate(45deg)}' +
    '.fabm-item{display:none!important}' +
    'body.fabm-open .fabm-item{display:flex!important;position:fixed!important;left:auto!important;top:auto!important;right:16px!important;margin:0!important;transform:none!important;z-index:2147483646!important}';
  document.head.appendChild(css);
  var wrap = document.createElement('div');
  wrap.id = 'fabm-wrap';
  var main = document.createElement('button');
  main.id = 'fabm-main';
  main.type = 'button';
  main.textContent = '\u2726';
  wrap.appendChild(main);
  document.body.appendChild(wrap);
  var items = [];
  function layout() {
    items.forEach(function (el, i) {
      el.style.setProperty('bottom', (START + i * GAP) + 'px', 'important');
    });
  }
  main.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = wrap.classList.toggle('open'); document.body.classList.toggle('fabm-open', open);
    main.classList.toggle('open', open);
    if (open) layout();
  });
  document.addEventListener('click', function (e) {
    if (wrap.classList.contains('open') && !e.target.closest('.fabm-item') && e.target !== main) {
      wrap.classList.remove('open'); document.body.classList.remove('fabm-open');
      main.classList.remove('open');
    }
  });
  function scan() {
    var W = window.innerWidth, H = window.innerHeight;
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (wrap.contains(el) || el.classList.contains('fabm-item') || el.closest('.fabm-item')) continue;
      if (getComputedStyle(el).position !== 'fixed') continue;
      var r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) continue;
      if (r.width > 260 || r.height > 100 || r.width > W * 0.5) continue;
      if (r.top < H * 0.15) continue;
      el.classList.add('fabm-item');
      items.push(el);
    }
    if (wrap.classList.contains('open')) layout();
  }
  setTimeout(scan, 800);
  setInterval(scan, 1500);
})();
