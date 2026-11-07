// =============================================================================
// Free Video & 2D Animation Studio Controller
// Integrates AI Video Generation (Wan 2.1, LTX, CogVideoX),
// Offline 2D Anime Canvas Animation Studio, and Video Preview/Editing/Download
// =============================================================================

class VideoStudioController {
  constructor() {
    this.models = [
      'Wan-AI/Wan2.1-T2V-1.3B',
      'Lightricks/LTX-Video',
      'THUDM/CogVideoX-2b'
    ];

    this.themes = {
      sakura: {
        kw: /साकुरा|sakura|cherry|गुलाबी|फूल|petal/i,
        sky: ['#6a4fb3', '#e7b5d8'],
        p: '#F4C2D7',
        dir: 1,
        size: [6, 14],
        n: 70,
        drift: 30
      },
      space: {
        kw: /स्पेस|अंतरिक्ष|space|star|तारे|galaxy|रात|night/i,
        sky: ['#05051f', '#2a1f5c'],
        p: '#ffffff',
        dir: 0.2,
        size: [1, 3.5],
        n: 120,
        drift: 4
      },
      rain: {
        kw: /बारिश|rain|storm|बादल/i,
        sky: ['#1d2b4a', '#5b6d8f'],
        p: '#bcd4ff',
        dir: 6,
        size: [1, 2],
        n: 130,
        drift: -6,
        streak: 1
      },
      snow: {
        kw: /बर्फ|snow|winter|सर्दी/i,
        sky: ['#8fb1d9', '#e9f2ff'],
        p: '#ffffff',
        dir: 1.2,
        size: [2, 6],
        n: 90,
        drift: 10
      },
      fire: {
        kw: /आग|fire|flame|गर्मी|sunset|सूर्य/i,
        sky: ['#4a0d0d', '#ff9a3c'],
        p: '#ffd27a',
        dir: -2,
        size: [2, 6],
        n: 80,
        drift: 14
      },
      ocean: {
        kw: /समुद्र|ocean|sea|wave|लहर|पानी|water/i,
        sky: ['#0b3a66', '#6fd0e8'],
        p: '#e8fbff',
        dir: -0.6,
        size: [2, 5],
        n: 60,
        drift: 8
      }
    };

    this.W = 540;
    this.H = 960;
    this.scene = null;
    this.t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.raf = null;
    this.recording = false;
    this.activeBlobUrl = null;

    if (typeof document !== 'undefined') {
      this.init();
    }
  }

  ls(k, v) {
    try {
      if (typeof localStorage === 'undefined') return null;
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {
      return null;
    }
  }

  init() {
    this.subtabBtnImage = document.getElementById('subtabBtnImage');
    this.subtabBtnVideo = document.getElementById('subtabBtnVideo');
    this.mediaPaneImage = document.getElementById('mediaPaneImage');
    this.mediaPaneVideo = document.getElementById('mediaPaneVideo');

    this.engineEl = document.getElementById('engine');
    this.promptEl = document.getElementById('prompt');
    this.localOptsEl = document.getElementById('localOpts');
    this.durEl = document.getElementById('dur');
    this.ratioEl = document.getElementById('ratio');
    this.captionEl = document.getElementById('caption');
    this.aiOptsEl = document.getElementById('aiOpts');
    this.tokenEl = document.getElementById('token');
    this.midEl = document.getElementById('mid');
    this.fbEl = document.getElementById('fb');
    this.goBtn = document.getElementById('go');
    this.logEl = document.getElementById('log');
    this.stageEl = document.getElementById('stage');
    this.cvEl = document.getElementById('cv');
    this.outEl = document.getElementById('out');
    this.dlEl = document.getElementById('dl');
    this.videoEditorControls = document.getElementById('videoEditorControls');
    this.videoSpeedSelect = document.getElementById('videoSpeedSelect');
    this.videoFilterSelect = document.getElementById('videoFilterSelect');

    if (!this.engineEl || !this.cvEl) return;

    this.cx = this.cvEl.getContext ? this.cvEl.getContext('2d') : null;

    this.bindSubTabs();
    this.bindEngine();
    this.bind2DControls();
    this.bindAI();
    this.bindEditorControls();

    // Initial setup
    this.setSize();
    this.build();
    this.startLoop();
  }

  bindSubTabs() {
    if (this.subtabBtnImage && this.subtabBtnVideo) {
      this.subtabBtnImage.addEventListener('click', () => {
        this.subtabBtnImage.classList.add('active');
        this.subtabBtnVideo.classList.remove('active');
        if (this.mediaPaneImage) this.mediaPaneImage.style.display = 'block';
        if (this.mediaPaneVideo) {
          this.mediaPaneVideo.style.display = 'none';
          this.mediaPaneVideo.classList.add('hide');
        }
      });

      this.subtabBtnVideo.addEventListener('click', () => {
        this.subtabBtnVideo.classList.add('active');
        this.subtabBtnImage.classList.remove('active');
        if (this.mediaPaneImage) this.mediaPaneImage.style.display = 'none';
        if (this.mediaPaneVideo) {
          this.mediaPaneVideo.style.display = 'block';
          this.mediaPaneVideo.classList.remove('hide');
        }
        this.setSize();
        this.build();
      });
    }
  }

  bindEngine() {
    if (this.tokenEl) {
      this.tokenEl.value = this.ls('hf_token') || '';
      this.tokenEl.addEventListener('change', () => {
        this.ls('hf_token', this.tokenEl.value.trim());
      });
    }

    const syncEngine = () => {
      if (!this.engineEl) return;
      const e = this.engineEl.value;
      const isLocal = e === 'local';

      if (this.localOptsEl) {
        this.localOptsEl.classList.toggle('hide', !isLocal);
        this.localOptsEl.style.display = isLocal ? 'block' : 'none';
      }
      if (this.aiOptsEl) {
        this.aiOptsEl.classList.toggle('hide', isLocal);
        this.aiOptsEl.style.display = isLocal ? 'none' : 'block';
      }
      if (this.midEl) {
        this.midEl.value = isLocal ? '' : e;
      }
    };

    if (this.engineEl) {
      this.engineEl.addEventListener('change', syncEngine);
      syncEngine();
    }
  }

  bind2DControls() {
    if (this.ratioEl) {
      this.ratioEl.addEventListener('change', () => {
        this.setSize();
        this.build();
      });
    }

    if (this.promptEl) {
      this.promptEl.addEventListener('input', () => this.build());
    }

    if (this.captionEl) {
      this.captionEl.addEventListener('input', () => this.build());
    }
  }

  bindEditorControls() {
    if (this.videoSpeedSelect && this.outEl) {
      this.videoSpeedSelect.addEventListener('change', () => {
        const speed = parseFloat(this.videoSpeedSelect.value) || 1.0;
        this.outEl.playbackRate = speed;
      });
    }

    if (this.videoFilterSelect && this.outEl) {
      this.videoFilterSelect.addEventListener('change', () => {
        const filter = this.videoFilterSelect.value;
        switch (filter) {
          case 'sakura':
            this.outEl.style.filter = 'sepia(0.3) saturate(1.4) hue-rotate(310deg)';
            break;
          case 'cyberpunk':
            this.outEl.style.filter = 'contrast(1.25) saturate(1.8) drop-shadow(0 0 10px rgba(185,166,232,0.4))';
            break;
          case 'vintage':
            this.outEl.style.filter = 'grayscale(1) contrast(1.2)';
            break;
          case 'warm':
            this.outEl.style.filter = 'sepia(0.5) contrast(1.1) brightness(1.05)';
            break;
          default:
            this.outEl.style.filter = 'none';
        }
      });
    }
  }

  bindAI() {
    if (!this.goBtn) return;

    this.goBtn.addEventListener('click', async () => {
      this.goBtn.disabled = true;
      if (this.dlEl) {
        this.dlEl.classList.add('hide');
        this.dlEl.style.display = 'none';
      }
      if (this.videoEditorControls) {
        this.videoEditorControls.classList.add('hide');
        this.videoEditorControls.style.display = 'none';
      }
      if (this.outEl) {
        this.outEl.classList.add('hide');
        this.outEl.style.display = 'none';
        this.outEl.pause();
      }
      if (this.cvEl) {
        this.cvEl.classList.remove('hide');
        this.cvEl.style.display = 'block';
      }

      if (window.soundFX) window.soundFX.click();

      try {
        const blob = this.engineEl.value === 'local' ? await this.record2D() : await this.runAI();
        this.show(blob);
        if (this.logEl) this.logEl.textContent = 'तैयार ✓ (Video Ready)';
        if (window.soundFX) window.soundFX.success();
      } catch (e) {
        if (this.logEl) this.logEl.textContent = 'एरर: ' + e.message;
        if (window.soundFX) window.soundFX.error();
      } finally {
        this.goBtn.disabled = false;
      }
    });
  }

  pickTheme(p) {
    if (!p) return 'sakura';
    for (const k in this.themes) {
      if (this.themes[k].kw.test(p)) return k;
    }
    return 'sakura';
  }

  rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  build() {
    if (!this.promptEl) return;
    const p = this.promptEl.value || '';
    const key = this.pickTheme(p);
    const T = this.themes[key];
    const girl = /लड़की|girl|woman|बाल|hair|किमोनो|kimono|character|किरदार/i.test(p) || key === 'sakura';
    const parts = [...Array(T.n)].map(() => ({
      x: this.rnd(0, this.W),
      y: this.rnd(0, this.H),
      s: this.rnd(...T.size),
      v: this.rnd(0.5, 1.5),
      ph: this.rnd(0, 6.28)
    }));
    const cap = this.captionEl ? this.captionEl.value.trim() : '';
    this.scene = { key, T, girl, parts, cap };
  }

  drawGirl(t) {
    if (!this.cx) return;
    const cx = this.cx;
    const cxn = this.W / 2;
    const base = this.H * 0.88;
    const sc = (Math.min(this.W, this.H) / 540) * 1.15;
    const sw = Math.sin(t * 1.6);

    cx.save();
    cx.translate(cxn, base);
    cx.scale(sc, sc);

    const bob = Math.sin(t * 2) * 3;
    cx.translate(0, bob);

    // Hair back
    cx.fillStyle = '#1d1a52';
    cx.beginPath();
    cx.moveTo(-58, -330);
    cx.bezierCurveTo(-110 + sw * 14, -250, -100 + sw * 26, -120, -70 + sw * 34, -10);
    cx.lineTo(70 + sw * 34, -10);
    cx.bezierCurveTo(100 + sw * 26, -120, 110 + sw * 14, -250, 58, -330);
    cx.closePath();
    cx.fill();

    // Kimono dress
    cx.fillStyle = '#f4f1fa';
    cx.beginPath();
    cx.moveTo(-62, -228);
    cx.lineTo(62, -228);
    cx.lineTo(86, -4);
    cx.lineTo(-86, -4);
    cx.closePath();
    cx.fill();

    // Kimono Obi sash
    cx.fillStyle = '#b9a6e8';
    cx.fillRect(-64, -150, 128, 34);
    cx.fillStyle = '#8f79cf';
    cx.beginPath();
    cx.ellipse(0, -133, 26, 24, 0, 0, 6.28);
    cx.fill();

    // Neck & Face
    cx.fillStyle = '#ffe3d6';
    cx.fillRect(-12, -246, 24, 26);
    cx.beginPath();
    cx.ellipse(0, -290, 48, 56, 0, 0, 6.28);
    cx.fill();

    // Hair bangs
    cx.fillStyle = '#1d1a52';
    cx.beginPath();
    cx.ellipse(0, -322, 52, 34, 0, Math.PI, 0);
    cx.fill();
    cx.fillRect(-52, -322, 104, 26);

    // Blinking Eyes
    const bl = Math.sin(t * 0.9) > 0.985 ? 0.15 : 1;
    cx.fillStyle = '#e9e4fb';
    [-18, 18].forEach(x => {
      cx.beginPath();
      cx.ellipse(x, -282, 10, 11 * bl, 0, 0, 6.28);
      cx.fill();
    });
    cx.fillStyle = '#8f79cf';
    [-18, 18].forEach(x => {
      cx.beginPath();
      cx.ellipse(x, -282, 4, 6 * bl, 0, 0, 6.28);
      cx.fill();
    });

    // Gentle Smile
    cx.strokeStyle = '#d98ba4';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.arc(0, -264, 10, 0.2, 2.94);
    cx.stroke();

    // Sakura Hair Ornament
    cx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      cx.save();
      cx.translate(-40, -326);
      cx.rotate(i * 1.2566);
      cx.beginPath();
      cx.ellipse(0, -9, 6, 10, 0, 0, 6.28);
      cx.fill();
      cx.restore();
    }
    cx.fillStyle = '#f4c2d7';
    cx.beginPath();
    cx.arc(-40, -326, 5, 0, 6.28);
    cx.fill();

    cx.restore();
  }

  drawFrame(t) {
    if (!this.cx || !this.scene) return;
    const cx = this.cx;
    const T = this.scene.T;
    const W = this.W;
    const H = this.H;

    // Sky gradient background
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, T.sky[0]);
    g.addColorStop(1, T.sky[1]);
    cx.fillStyle = g;
    cx.fillRect(0, 0, W, H);

    // Special background elements per theme
    if (this.scene.key === 'ocean') {
      cx.fillStyle = 'rgba(255,255,255,.18)';
      for (let r = 0; r < 4; r++) {
        cx.beginPath();
        cx.moveTo(0, H);
        for (let x = 0; x <= W; x += 12) {
          cx.lineTo(x, H * (0.72 + r * 0.07) + Math.sin(x / 38 + t * 1.4 + r) * 10);
        }
        cx.lineTo(W, H);
        cx.fill();
      }
    }

    if (this.scene.key === 'sakura') {
      cx.fillStyle = 'rgba(244,194,215,.28)';
      [[0.12, 0.34, 150], [0.85, 0.3, 170], [0.5, 0.22, 120]].forEach(([a, b, r]) => {
        cx.beginPath();
        cx.arc(W * a + Math.sin(t * 0.4 + a * 9) * 6, H * b, r * (W / 540), 0, 6.28);
        cx.fill();
      });
    }

    // Dynamic particles
    cx.fillStyle = T.p;
    cx.strokeStyle = T.p;
    for (const p of this.scene.parts) {
      p.y += T.dir * p.v * (H / 960) * 1.2;
      p.x += Math.sin(t * 1.2 + p.ph) * T.drift * 0.02 + (T.drift < 0 && T.streak ? T.drift * 0.05 : 0);

      if (p.y > H + 20) p.y = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.x < -20) p.x = W + 20;

      if (this.scene.key === 'space') {
        cx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + p.ph);
      } else {
        cx.globalAlpha = 0.85;
      }

      if (T.streak) {
        cx.lineWidth = p.s;
        cx.beginPath();
        cx.moveTo(p.x, p.y);
        cx.lineTo(p.x - 3, p.y + 18);
        cx.stroke();
      } else if (this.scene.key === 'sakura') {
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(t * p.v + p.ph);
        cx.beginPath();
        cx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, 6.28);
        cx.fill();
        cx.restore();
      } else {
        cx.beginPath();
        cx.arc(p.x, p.y, p.s, 0, 6.28);
        cx.fill();
      }
    }
    cx.globalAlpha = 1;

    // Anime character
    if (this.scene.girl) this.drawGirl(t);

    // Dynamic Subtitle / Caption text
    if (this.scene.cap) {
      const a = Math.min(1, t / 1.2);
      cx.globalAlpha = a;
      cx.fillStyle = '#ffffff';
      cx.textAlign = 'center';
      cx.font = '600 ' + Math.round(W / 13) + 'px "Noto Sans Devanagari", Poppins, sans-serif';
      cx.shadowColor = 'rgba(0,0,0,0.6)';
      cx.shadowBlur = 10;
      cx.fillText(this.scene.cap, W / 2, H * 0.12 + (1 - a) * 20);
      cx.shadowBlur = 0;
      cx.globalAlpha = 1;
    }
  }

  setSize() {
    if (!this.ratioEl || !this.cvEl) return;
    const isLandscape = this.ratioEl.value === 'l';
    this.W = isLandscape ? 960 : 540;
    this.H = isLandscape ? 540 : 960;
    this.cvEl.width = this.W;
    this.cvEl.height = this.H;
  }

  startLoop() {
    const loop = () => {
      if (!this.recording && this.scene) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.drawFrame(((now - this.t0) / 1000) % 60);
      }
      if (typeof requestAnimationFrame !== 'undefined') {
        this.raf = requestAnimationFrame(loop);
      }
    };
    loop();
  }

  record2D() {
    return new Promise((resolve, reject) => {
      if (!this.cvEl || !this.cvEl.captureStream || typeof MediaRecorder === 'undefined') {
        return reject(new Error('इस ब्राउज़र/WebView में MediaRecorder उपलब्ध नहीं है। कृपया आधुनिक Chrome में खोलें।'));
      }

      this.setSize();
      this.build();

      const candidateMimes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      const mime = candidateMimes.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
      const mr = new MediaRecorder(
        this.cvEl.captureStream(30),
        mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : {}
      );
      const chunks = [];

      mr.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = () => {
        this.recording = false;
        resolve(new Blob(chunks, { type: mr.mimeType || 'video/webm' }));
      };

      mr.onerror = e => {
        this.recording = false;
        reject(e.error || new Error('2D वीडियो रिकॉर्डिंग विफल हुई।'));
      };

      const dur = this.durEl ? parseFloat(this.durEl.value) || 6 : 6;
      this.recording = true;
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      mr.start(250);

      const step = () => {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const t = (now - startTime) / 1000;
        this.drawFrame(t);
        if (this.logEl) {
          this.logEl.textContent = '2D एनिमेशन बन रहा है… ' + Math.min(100, Math.round((t / dur) * 100)) + '%';
        }
        if (t < dur) {
          requestAnimationFrame(step);
        } else {
          mr.stop();
        }
      };

      requestAnimationFrame(step);
    });
  }

  async aiVideo(model, prompt, token) {
    const res = await fetch('https://router.huggingface.co/hf-inference/models/' + model, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!res.ok) {
      const errMsg = (await res.text()).slice(0, 160);
      throw new Error(model + ' → HTTP ' + res.status + ' ' + errMsg);
    }

    const blob = await res.blob();
    if (!/video/.test(blob.type)) {
      throw new Error(model + ' ने वीडियो नहीं लौटाया (' + (blob.type || 'खाली') + ')');
    }
    return blob;
  }

  async runAI() {
    const token = this.tokenEl ? this.tokenEl.value.trim() : '';
    const prompt = this.promptEl ? this.promptEl.value.trim() : '';

    if (!token) {
      throw new Error('कृपया पहले Hugging Face token दर्ज करें (Settings या फील्ड में)।');
    }
    this.ls('hf_token', token);

    const firstModel = (this.midEl ? this.midEl.value.trim() : '') || this.models[0];
    const isAutoFailover = this.fbEl ? this.fbEl.checked : true;
    const modelList = isAutoFailover
      ? [firstModel, ...this.models.filter(m => m !== firstModel)]
      : [firstModel];

    const errors = [];
    for (const m of modelList) {
      try {
        if (this.logEl) {
          this.logEl.textContent = 'AI वीडियो बन रहा है (' + m + ')… 1 से 3 मिनट लग सकते हैं';
        }
        return await this.aiVideo(m, prompt, token);
      } catch (err) {
        errors.push(err.message);
      }
    }

    throw new Error(errors.join('\n') + '\n\nसभी AI मॉडल व्यस्त हैं। 2D Animator चुनकर तुरंत वीडियो बनाएं।');
  }

  show(blob) {
    if (this.activeBlobUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(this.activeBlobUrl);
    }
    this.activeBlobUrl = URL.createObjectURL(blob);

    if (this.cvEl) {
      this.cvEl.classList.add('hide');
      this.cvEl.style.display = 'none';
    }

    if (this.outEl) {
      this.outEl.classList.remove('hide');
      this.outEl.style.display = 'block';
      this.outEl.src = this.activeBlobUrl;
      this.outEl.play().catch(() => {});
    }

    if (this.videoEditorControls) {
      this.videoEditorControls.classList.remove('hide');
      this.videoEditorControls.style.display = 'block';
    }

    if (this.dlEl) {
      this.dlEl.href = this.activeBlobUrl;
      this.dlEl.classList.remove('hide');
      this.dlEl.style.display = 'inline-flex';
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      this.dlEl.download = 'jarvis-video.' + ext;
    }
  }
}

if (typeof window !== 'undefined') {
  window.VideoStudioController = VideoStudioController;
}
