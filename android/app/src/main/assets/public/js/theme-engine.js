/* theme-engine.js: 5 anime themes, daily rotation, local mood themes (no API calls) */
(function () {
  'use strict';

  // PUT YOUR FOLDER PATH HERE (relative to index.html). Images: soft.jpg, cat.jpg, pink.jpg, silver.jpg, blue.jpg
  // Optional mood images: soft_sad.jpg, soft_happy.jpg ... (falls back to the base image if missing)
  const THEME_IMAGE_FOLDER = 'themes/';
  const IMAGE_EXT = '.jpg';
  const KEY = 'themeEngineV1';

  const THEMES = [
    { id: 'soft', name: 'Soft Anime Girl', accent: '#ff8fb8', accent2: '#7a5cff', bg: '#0e1226', card: '#1a2040' },
    { id: 'cat', name: 'Cute Cat Girl', accent: '#ff5a4d', accent2: '#3ecf8e', bg: '#0c1a12', card: '#16301f' },
    { id: 'pink', name: 'Pink Dark Girl', accent: '#ff3d9a', accent2: '#b14dff', bg: '#1a0a14', card: '#2d1224' },
    { id: 'silver', name: 'Silver Hair Girl', accent: '#e8ecff', accent2: '#ff4d6d', bg: '#0f1118', card: '#1c2030' },
    { id: 'blue', name: 'Blue Fantasy Girl', accent: '#4db8ff', accent2: '#8a7bff', bg: '#071626', card: '#0f2a45' }
  ];

  const MOODS = {
    SAD: { accent: '#8fa6d6', accent2: '#5b6b8f', bg: '#0a0f1c', card: '#141b2e' },
    HAPPY: { accent: '#ffc94d', accent2: '#ff7a9c', bg: '#1d1424', card: '#2e1f3a' },
    ANGRY: { accent: '#ff5a4d', accent2: '#b3202a', bg: '#1a0a0c', card: '#2d1216' },
    AFFECTIONATE: { accent: '#ff7ab8', accent2: '#ffa0c8', bg: '#1d0f1a', card: '#341a2c' }
  };

  const LEX = {
    SAD: ['udaas', 'udas', 'dukhi', 'dukh', 'sad', 'mann kharab', 'man kharab', 'heartbroken', 'rona', 'ro raha', 'ro rahi', 'उदास', 'दुखी', 'रोना'],
    LONELY: ['akela', 'akeli', 'lonely', 'tanha', 'अकेला', 'अकेली'],
    HAPPY: ['khush', 'khushi', 'happy', 'maza', 'mast', 'badiya', 'awesome', 'great', 'खुश', 'मजा', 'मज़ा'],
    ANGRY: ['gussa', 'angry', 'naraz', 'irritate', 'गुस्सा', 'नाराज'],
    AFFECTIONATE: ['love you', 'pyaar', 'pyar', 'miss you', 'jaan', 'प्यार', 'मिस यू']
  };
  const NEG = /(nahi|nahin|\bnot\b|\bmat\b|\bno\b|नहीं)/;
  const BOOST = /(bahut|bohot|bahot|ekdum|\bvery\b|\bso\b|बहुत|बेहद)/;
  const SELF = /(\bmera\b|\bmujhe\b|\bmain\b|\bmai\b|\bi am\b|\bi feel\b|\bi m\b|मेरा|मेरी|मुझे|मैं)/;
  const CRISIS = /(suicide|khudkushi|khud kushi|marna chahta|marna chahti|jeena nahi|jina nahi|end my life|kill myself|आत्महत्या|खुदकुशी|मरना चाहता|मरना चाहती)/i;
  const THRESHOLD = 1.5;

  const state = load();
  let sessionMood = null; // never saved to storage (privacy)
  let moodTimer = null;
  let recent = [];

  function load() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { s = {}; }
    return Object.assign({ themeId: 'soft', lastChangeDate: '', autoRotate: true, autoMood: true, animations: true, manualUntil: 0 }, s);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dailyRotate() {
    const t = today();
    if (!state.lastChangeDate) { state.lastChangeDate = t; save(); return; }
    if (!state.autoRotate || state.lastChangeDate === t) return;
    const i = Math.max(0, THEMES.findIndex(function (x) { return x.id === state.themeId; }));
    state.themeId = THEMES[(i + 1) % THEMES.length].id;
    state.lastChangeDate = t;
    save();
  }

  function setBackground(id, mood) {
    const base = THEME_IMAGE_FOLDER + id + IMAGE_EXT;
    const tries = mood ? [THEME_IMAGE_FOLDER + id + '_' + mood.toLowerCase() + IMAGE_EXT, base] : [base];
    (function next(i) {
      const root = document.documentElement;
      if (i >= tries.length) { root.style.setProperty('--te-bg-image', 'none'); return; }
      const img = new Image();
      img.onload = function () { root.style.setProperty('--te-bg-image', 'url("' + tries[i] + '")'); };
      img.onerror = function () { next(i + 1); };
      img.src = tries[i];
    })(0);
  }

  function apply() {
    const t = THEMES.find(function (x) { return x.id === state.themeId; }) || THEMES[0];
    const m = sessionMood && MOODS[sessionMood] ? MOODS[sessionMood] : {};
    const c = Object.assign({}, t, m);
    const r = document.documentElement;
    r.style.setProperty('--te-accent', c.accent);
    r.style.setProperty('--te-accent2', c.accent2);
    r.style.setProperty('--te-bg', c.bg);
    r.style.setProperty('--te-card', c.card);
    r.setAttribute('data-anime', t.id);
    r.setAttribute('data-mood', sessionMood || '');
    setBackground(t.id, sessionMood);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t.id, mood: sessionMood, colors: c } }));
  }

  function setMood(m) {
    if (sessionMood === m) return;
    sessionMood = m;
    clearTimeout(moodTimer);
    if (m) moodTimer = setTimeout(function () { setMood(null); }, 20 * 60 * 1000);
    apply();
  }

  function analyze(text) {
    const s = ' ' + String(text).toLowerCase().replace(/[^a-z\u0900-\u097f ]+/g, ' ') + ' ';
    const scores = {};
    Object.keys(LEX).forEach(function (mood) {
      LEX[mood].forEach(function (w) {
        const pat = ' ' + w + (w.length <= 4 ? ' ' : '');
        let idx = s.indexOf(pat);
        while (idx !== -1) {
          const before = s.slice(Math.max(0, idx - 14), idx);
          const after = s.slice(idx + pat.length, idx + pat.length + 14);
          if (!NEG.test(before) && !NEG.test(after)) scores[mood] = (scores[mood] || 0) + 1;
          idx = s.indexOf(pat, idx + pat.length);
        }
      });
      if (scores[mood]) {
        if (BOOST.test(s)) scores[mood] += 0.7;
        if (SELF.test(s)) scores[mood] += 0.5;
      }
    });
    return scores;
  }

  function toast(msg, ms) {
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);max-width:90vw;z-index:100000;padding:12px 16px;border-radius:14px;background:var(--te-card);border:1px solid var(--te-accent);color:#fff;font:14px sans-serif;text-align:center';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, ms || 6000);
  }

  function onUserMessage(text) {
    if (!text || typeof text !== 'string' || text.length < 3) return;
    if (CRISIS.test(text)) {
      toast('मुझे तुम्हारी बहुत फ़िक्र है। अभी किसी भरोसेमंद इंसान से बात करो, या Tele-MANAS 14416 पर फ़ोन करो। मैं यहीं हूँ।', 12000);
      return;
    }
    if (!state.autoMood || Date.now() < state.manualUntil) return;
    recent.push(analyze(text));
    if (recent.length > 3) recent.shift();
    const w = [1, 0.6, 0.3];
    const total = {};
    recent.slice().reverse().forEach(function (sc, i) {
      Object.keys(sc).forEach(function (m) { total[m] = (total[m] || 0) + sc[m] * w[i]; });
    });
    let best = null, bestScore = 0;
    Object.keys(total).forEach(function (m) { if (total[m] > bestScore) { best = m; bestScore = total[m]; } });
    if (best && bestScore >= THRESHOLD) {
      setMood(best === 'LONELY' ? 'SAD' : best);
    } else if (sessionMood && recent.length >= 2 &&
      !Object.keys(recent[recent.length - 1]).length && !Object.keys(recent[recent.length - 2]).length) {
      setMood(null);
    }
  }

  function manualSet(id) {
    state.themeId = id;
    state.lastChangeDate = today();
    state.manualUntil = Date.now() + 2 * 3600 * 1000;
    save();
    setMood(null);
    apply();
  }

  function skipField(el) {
    const info = ((el.id || '') + ' ' + (el.name || '') + ' ' + (el.placeholder || '') + ' ' + (el.type || '')).toLowerCase();
    return /key|api|password|search/.test(info);
  }
  function chatInput() {
    const list = document.querySelectorAll('textarea, input[type="text"]');
    for (let i = 0; i < list.length; i++) { if (!skipField(list[i]) && list[i].offsetParent) return list[i]; }
    return null;
  }
  function hookChat() {
    document.addEventListener('keydown', function (e) {
      const el = e.target;
      if (e.key === 'Enter' && !e.shiftKey && el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && !skipField(el)) onUserMessage(el.value);
    }, true);
    document.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('button,[role="button"]') : null;
      if (!b || b.closest('#te-panel')) return;
      if (/send|submit/.test(((b.id || '') + ' ' + (b.className || '')).toLowerCase())) {
        const el = chatInput();
        if (el) onUserMessage(el.value);
      }
    }, true);
  }

  function buildPanel() {
    const btn = document.createElement('button');
    btn.textContent = '\uD83C\uDF80';
    btn.setAttribute('aria-label', 'Themes');
    btn.style.cssText = 'position:fixed;left:12px;bottom:84px;z-index:99999;width:44px;height:44px;border-radius:50%;border:2px solid var(--te-accent);background:var(--te-card);color:#fff;font-size:20px';
    const panel = document.createElement('div');
    panel.id = 'te-panel';
    panel.style.cssText = 'position:fixed;left:12px;bottom:136px;z-index:99999;display:none;width:min(88vw,320px);padding:12px;border-radius:16px;background:var(--te-card);border:1px solid var(--te-accent);color:#fff;font:14px sans-serif';
    panel.innerHTML = '<b>Anime Themes</b><div id="te-list" style="margin:8px 0"></div>' +
      '<label style="display:block;margin:4px 0"><input type="checkbox" id="te-rot"> Daily theme rotation</label>' +
      '<label style="display:block;margin:4px 0"><input type="checkbox" id="te-mood"> Emotion detection</label>' +
      '<label style="display:block;margin:4px 0"><input type="checkbox" id="te-anim"> Animations</label>' +
      '<button id="te-reset" style="margin-top:6px;padding:6px 10px;border-radius:10px;border:1px solid var(--te-accent);background:transparent;color:#fff">Reset Theme</button>';
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    const list = panel.querySelector('#te-list');
    THEMES.forEach(function (t) {
      const b = document.createElement('button');
      b.textContent = t.name;
      b.setAttribute('data-id', t.id);
      b.style.cssText = 'display:block;width:100%;margin:4px 0;padding:8px;border-radius:10px;border:1px solid ' + t.accent + ';background:' + t.card + ';color:#fff;text-align:left';
      list.appendChild(b);
    });
    function sync() {
      panel.querySelector('#te-rot').checked = state.autoRotate;
      panel.querySelector('#te-mood').checked = state.autoMood;
      panel.querySelector('#te-anim').checked = state.animations;
    }
    sync();
    btn.addEventListener('click', function () { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });
    panel.addEventListener('click', function (e) {
      const id = e.target.getAttribute && e.target.getAttribute('data-id');
      if (id) manualSet(id);
      if (e.target.id === 'te-reset') {
        Object.assign(state, { themeId: 'soft', lastChangeDate: today(), autoRotate: true, autoMood: true, animations: true, manualUntil: 0 });
        save(); setMood(null); apply(); sync();
      }
    });
    panel.addEventListener('change', function (e) {
      if (e.target.id === 'te-rot') state.autoRotate = e.target.checked;
      if (e.target.id === 'te-mood') state.autoMood = e.target.checked;
      if (e.target.id === 'te-anim') state.animations = e.target.checked;
      save(); apply();
    });
  }

  window.ThemeEngine = { set: manualSet, setMood: setMood, onUserMessage: onUserMessage, analyze: analyze, state: state, themes: THEMES };

  dailyRotate();
  function start() { apply(); buildPanel(); hookChat(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
