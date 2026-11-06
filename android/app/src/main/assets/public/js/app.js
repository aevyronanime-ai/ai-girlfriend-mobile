// J.A.R.V.I.S. AI - Master Application Controller
class App {
  constructor() {
    this.activeTab = 'chat';
    this.theme = localStorage.getItem('jarvis_theme') || 'dark';

    this.initTheme();
    this.initNavigation();
    this.initSidebar();
    this.initPWA();
    this.updateStatusIndicator();
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) {
      themeBtn.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
      themeBtn.addEventListener('click', () => {
        this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
      });
    }
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('jarvis_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
    if (window.soundFX) window.soundFX.click();
  }

  initNavigation() {
    // Desktop & Drawer Nav Links
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        if (tab) this.switchTab(tab);
        this.closeSidebar();
      });
    });

    // Mobile Bottom Nav Items
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Top Bar "New Chat" button & Sidebar New Chat Button
    const newChatBtns = document.querySelectorAll('#btnTopNewChat, #btnSidebarNewChat');
    newChatBtns.forEach(btn => {
      btn.addEventListener('click', () => this.createNewChat());
    });
  }

  initSidebar() {
    const toggleBtn = document.getElementById('btnToggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
      });

      overlay.addEventListener('click', () => {
        this.closeSidebar();
      });
    }
  }

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  switchTab(tabName) {
    if (window.soundFX) window.soundFX.click();
    this.activeTab = tabName;

    // Toggle Tab Panes
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      if (pane.id === `tab-${tabName}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Sync Desktop Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.tab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Sync Mobile Bottom Nav Active State
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      if (item.dataset.tab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Handle view-specific triggers
    if (tabName === 'history' && window.historyManager) {
      window.historyManager.loadSessions();
    } else if (tabName === 'settings' && window.settingsManager) {
      window.settingsManager.loadSettings();
    } else if (tabName === 'voice' && window.orb) {
      window.orb.resize();
    } else if (tabName === 'developer' && window.developerStudio) {
      window.developerStudio.loadProjectTree();
    }
  }

  async createNewChat() {
    if (window.soundFX) window.soundFX.click();
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      });
      const newSession = await res.json();
      this.switchTab('chat');
      if (window.chat) {
        await window.chat.loadSessionMessages(newSession.id);
      }
      this.showToast('Created new conversation');
      this.closeSidebar();
    } catch (err) {
      alert('Failed to create new chat: ' + err.message);
    }
  }

  async updateStatusIndicator() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return;
      const data = await res.json();

      const dot = document.getElementById('systemStatusDot');
      const text = document.getElementById('systemStatusText');
      const userNameEl = document.getElementById('sidebarUserName');

      if (userNameEl) userNameEl.textContent = data.userName || 'Sir';

      if (dot && text) {
        if (data.hasApiKey) {
          dot.className = 'status-dot';
          text.textContent = 'Neural Core Online';
        } else {
          dot.className = 'status-dot warning';
          text.textContent = 'Offline Engine (Add Key)';
        }
      }
    } catch (e) {}
  }

  showToast(message, duration = 2500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('PWA ServiceWorker registered:', reg.scope))
          .catch(err => console.log('ServiceWorker registration note:', err));
      });
    }
  }
}

// Bootstrap after DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  window.app = new App();

  // Initialize sub-controllers
  window.orb = new JarvisOrb('orbCanvas');
  window.chat = new ChatController();
  window.tools = new ToolsController();
  window.historyManager = new HistoryController();
  window.settingsManager = new SettingsController();
  window.developerStudio = new DeveloperStudioController();

  // Auto-speak audio toggle state & listener
  window.autoSpeakEnabled = false;
  const autoSpeakBtn = document.getElementById('btnToggleAutoSpeak');
  if (autoSpeakBtn) {
    autoSpeakBtn.addEventListener('click', () => {
      window.autoSpeakEnabled = !window.autoSpeakEnabled;
      autoSpeakBtn.textContent = window.autoSpeakEnabled ? '🔊' : '🔇';
      autoSpeakBtn.style.color = window.autoSpeakEnabled ? 'var(--neon-cyan)' : 'var(--text-muted)';
      if (window.soundFX) window.soundFX.click();
      if (window.app) {
        window.app.showToast(window.autoSpeakEnabled ? 'Auto-Speak Enabled (TTS ON)' : 'Auto-Speak Muted (TTS OFF)');
      }
    });
  }

  // Load first active session into Chat view
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    if (sessions && sessions.length > 0) {
      window.chat.loadSessionMessages(sessions[0].id);
    }
  } catch (e) {}

  // Microphone toggle button click in voice view & chat input bar
  const micToggleBtn = document.getElementById('btnVoiceMicToggle');
  if (micToggleBtn) {
    micToggleBtn.addEventListener('click', () => {
      if (window.voiceAssistant) window.voiceAssistant.toggleListening();
    });
  }

  const chatMicBtn = document.getElementById('chatMicBtn');
  if (chatMicBtn) {
    chatMicBtn.addEventListener('click', () => {
      // If on chat pane, switch to voice or toggle voice input
      window.app.switchTab('voice');
      if (window.voiceAssistant) window.voiceAssistant.toggleListening();
    });
  }

  const stopVoiceBtn = document.getElementById('btnStopVoice');
  if (stopVoiceBtn) {
    stopVoiceBtn.addEventListener('click', () => {
      if (window.voiceAssistant) window.voiceAssistant.stopSpeaking();
    });
  }
});
