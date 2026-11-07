// Holographic AI Assistant Orb (Canvas Arc Reactor & Energy Waves)
class JarvisOrb {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.state = 'IDLE'; // IDLE, LISTENING, THINKING, SPEAKING
    this.angle = 0;
    this.pulse = 0;
    this.pulseSpeed = 0.03;
    this.particles = [];
    this.initParticles();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 280;
    this.height = rect.height || 280;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.cx = this.width / 2;
    this.cy = this.height / 2;
  }

  isSakuraTheme() {
    if (typeof document === 'undefined' || !document.documentElement) return true;
    const theme = document.documentElement.getAttribute('data-theme') || 'sakura';
    return theme !== 'classic' && theme !== 'dark';
  }

  setState(newState) {
    this.state = newState.toUpperCase();
    const overlay = document.getElementById('orbStateText');
    if (overlay) {
      overlay.textContent = this.state;
      if (this.isSakuraTheme()) {
        if (this.state === 'LISTENING') overlay.style.color = '#ff4081';
        else if (this.state === 'THINKING') overlay.style.color = '#B9A6E8';
        else overlay.style.color = '#F4C2D7';
      } else {
        if (this.state === 'LISTENING') overlay.style.color = '#ff0055';
        else if (this.state === 'THINKING') overlay.style.color = '#9d4edd';
        else if (this.state === 'SPEAKING') overlay.style.color = '#00f0ff';
        else overlay.style.color = '#00f0ff';
      }
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 30 + Math.random() * 70,
        speed: (Math.random() - 0.5) * 0.04,
        size: 1 + Math.random() * 2.5,
        opacity: 0.2 + Math.random() * 0.8
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.angle += (this.state === 'THINKING' ? 0.08 : 0.02);
    this.pulse += (this.state === 'SPEAKING' ? 0.1 : this.pulseSpeed);

    const baseRadius = 45 + Math.sin(this.pulse) * (this.state === 'SPEAKING' ? 12 : 5);
    const cx = this.cx;
    const cy = this.cy;

    // Outer Glow Gradient
    const gradient = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, 110);
    const isSakura = this.isSakuraTheme();
    if (this.state === 'LISTENING') {
      if (isSakura) {
        gradient.addColorStop(0, 'rgba(255, 64, 129, 0.85)');
        gradient.addColorStop(0.5, 'rgba(244, 194, 215, 0.35)');
        gradient.addColorStop(1, 'transparent');
      } else {
        gradient.addColorStop(0, 'rgba(255, 0, 85, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 85, 0, 0.3)');
        gradient.addColorStop(1, 'transparent');
      }
    } else if (this.state === 'THINKING') {
      if (isSakura) {
        gradient.addColorStop(0, 'rgba(185, 166, 232, 0.85)');
        gradient.addColorStop(0.6, 'rgba(244, 194, 215, 0.3)');
        gradient.addColorStop(1, 'transparent');
      } else {
        gradient.addColorStop(0, 'rgba(157, 78, 221, 0.8)');
        gradient.addColorStop(0.6, 'rgba(0, 240, 255, 0.25)');
        gradient.addColorStop(1, 'transparent');
      }
    } else {
      if (isSakura) {
        // Lavender-Sakura Pink Orb
        gradient.addColorStop(0, 'rgba(244, 194, 215, 0.9)');
        gradient.addColorStop(0.55, 'rgba(185, 166, 232, 0.35)');
        gradient.addColorStop(1, 'transparent');
      } else {
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.85)');
        gradient.addColorStop(0.6, 'rgba(157, 78, 221, 0.2)');
        gradient.addColorStop(1, 'transparent');
      }
    }

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    this.ctx.fill();

    // Concentric Energy Rings
    this.drawArcRing(cx, cy, baseRadius + 40, this.angle * 1.5, Math.PI * 1.2, this.getPrimaryColor(0.8), 3);
    this.drawArcRing(cx, cy, baseRadius + 40, this.angle * 1.5 + Math.PI, Math.PI * 0.4, this.getSecondaryColor(0.6), 2);
    this.drawArcRing(cx, cy, baseRadius + 22, -this.angle * 2, Math.PI * 1.6, this.getSecondaryColor(0.7), 2);
    this.drawArcRing(cx, cy, baseRadius + 8, this.angle * 3, Math.PI * 0.8, '#ffffff', 2);

    // Dynamic Sound Waves (When Listening or Speaking)
    if (this.state === 'LISTENING' || this.state === 'SPEAKING') {
      for (let r = 70; r <= 115; r += 15) {
        const waveScale = Math.sin(this.pulse * 2 + r) * 6;
        this.ctx.strokeStyle = this.getPrimaryColor(0.25);
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r + waveScale, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    // Swirling Quantum Particles
    for (const p of this.particles) {
      p.angle += p.speed * (this.state === 'THINKING' ? 3 : 1);
      const px = cx + Math.cos(p.angle) * p.dist;
      const py = cy + Math.sin(p.angle) * p.dist;

      this.ctx.fillStyle = this.getPrimaryColor(p.opacity);
      this.ctx.beginPath();
      this.ctx.arc(px, py, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Core Solid Bright Center
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 14 + Math.sin(this.pulse) * 3, 0, Math.PI * 2);
    this.ctx.fill();

    requestAnimationFrame(this.animate);
  }

  drawArcRing(cx, cy, radius, startAngle, length, color, lineWidth) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, Math.max(1, radius), startAngle, startAngle + length);
    this.ctx.stroke();
    this.ctx.restore();
  }

  getPrimaryColor(alpha = 1) {
    if (this.isSakuraTheme()) {
      if (this.state === 'LISTENING') return `rgba(255, 64, 129, ${alpha})`;
      if (this.state === 'THINKING') return `rgba(185, 166, 232, ${alpha})`;
      return `rgba(244, 194, 215, ${alpha})`;
    }
    if (this.state === 'LISTENING') return `rgba(255, 0, 85, ${alpha})`;
    if (this.state === 'THINKING') return `rgba(157, 78, 221, ${alpha})`;
    return `rgba(0, 240, 255, ${alpha})`;
  }

  getSecondaryColor(alpha = 1) {
    if (this.isSakuraTheme()) {
      if (this.state === 'LISTENING') return `rgba(244, 194, 215, ${alpha})`;
      if (this.state === 'THINKING') return `rgba(244, 194, 215, ${alpha})`;
      return `rgba(185, 166, 232, ${alpha})`;
    }
    if (this.state === 'LISTENING') return `rgba(255, 120, 0, ${alpha})`;
    if (this.state === 'THINKING') return `rgba(0, 240, 255, ${alpha})`;
    return `rgba(157, 78, 221, ${alpha})`;
  }
}

window.JarvisOrb = JarvisOrb;
