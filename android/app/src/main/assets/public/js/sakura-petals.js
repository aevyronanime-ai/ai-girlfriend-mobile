// Falling Sakura Petals Animation (Ultra-lightweight, 60fps, low battery impact)
(function() {
  class SakuraPetals {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.petals = [];
      this.animId = null;
      this.enabled = true;
      this.maxPetals = 28; // Optimal count for smooth animation without lag
      this.init();
    }

    init() {
      // Check stored preference (default: true)
      try {
        const stored = localStorage.getItem('jarvis_sakura_petals');
        this.enabled = stored !== 'false';
      } catch (e) {
        this.enabled = true;
      }

      this.canvas = document.getElementById('sakuraPetalsCanvas');
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'sakuraPetalsCanvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        this.canvas.style.opacity = '0.9';
        const app = document.getElementById('app') || document.body;
        app.insertBefore(this.canvas, app.firstChild);
      }

      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());

      this.initPetals();

      if (this.enabled) {
        this.start();
      } else {
        this.canvas.style.display = 'none';
      }
    }

    resize() {
      if (!this.canvas) return;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    initPetals() {
      this.petals = [];
      for (let i = 0; i < this.maxPetals; i++) {
        this.petals.push(this.createPetal(true));
      }
    }

    createPetal(randomY = false) {
      return {
        x: Math.random() * (this.width || window.innerWidth),
        y: randomY ? Math.random() * (this.height || window.innerHeight) : -20,
        size: 7 + Math.random() * 8, // 7px - 15px
        speedY: 0.8 + Math.random() * 1.4,
        speedX: -0.5 + Math.random() * 1.0,
        swaySpeed: 0.02 + Math.random() * 0.03,
        swayOffset: Math.random() * Math.PI * 2,
        swayRange: 15 + Math.random() * 25,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: 0.01 + Math.random() * 0.03,
        opacity: 0.45 + Math.random() * 0.45,
        // Colors: delicate sakura pink to soft lavender
        color: Math.random() > 0.4 ? 'rgba(244, 194, 215,' : 'rgba(235, 180, 210,'
      };
    }

    start() {
      this.enabled = true;
      if (this.canvas) this.canvas.style.display = 'block';
      if (!this.animId) {
        this.loop = this.loop.bind(this);
        this.animId = requestAnimationFrame(this.loop);
      }
    }

    stop() {
      this.enabled = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      if (this.canvas) {
        this.canvas.style.display = 'none';
        if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
      }
    }

    toggle(enabled) {
      if (typeof enabled === 'boolean') {
        this.enabled = enabled;
      } else {
        this.enabled = !this.enabled;
      }
      try {
        localStorage.setItem('jarvis_sakura_petals', this.enabled ? 'true' : 'false');
      } catch (e) {}

      if (this.enabled) {
        this.start();
      } else {
        this.stop();
      }
      return this.enabled;
    }

    drawPetal(p) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      this.ctx.beginPath();
      // Draw sakura petal shape (curved organic ellipse)
      this.ctx.moveTo(0, 0);
      this.ctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size, -p.size / 4, p.size, 0);
      this.ctx.bezierCurveTo(p.size, p.size / 4, p.size / 2, p.size / 2, 0, 0);
      
      this.ctx.fillStyle = `${p.color} ${p.opacity})`;
      this.ctx.shadowColor = 'rgba(244, 194, 215, 0.4)';
      this.ctx.shadowBlur = 4;
      this.ctx.fill();

      this.ctx.restore();
    }

    loop() {
      if (!this.enabled || !this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.petals.length; i++) {
        const p = this.petals[i];
        p.y += p.speedY;
        p.swayOffset += p.swaySpeed;
        p.x += Math.sin(p.swayOffset) * 0.8 + p.speedX;
        p.rotation += p.rotSpeed;

        // Reset if offscreen
        if (p.y > this.height + 20 || p.x < -30 || p.x > this.width + 30) {
          this.petals[i] = this.createPetal(false);
        } else {
          this.drawPetal(p);
        }
      }

      this.animId = requestAnimationFrame(this.loop);
    }
  }

  window.SakuraPetals = SakuraPetals;
  window.sakuraPetals = null;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.sakuraPetals = new SakuraPetals();
    });
  } else {
    window.sakuraPetals = new SakuraPetals();
  }
})();
