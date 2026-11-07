// J.A.R.V.I.S. AI - Master Application Controller
class App {
  constructor() {
    this.activeTab = 'chat';
    this.theme = localStorage.getItem('jarvis_theme') || 'sakura';

    this.initTheme();
    this.initNavigation();
    this.initSidebar();
    this.initPWA();
    this.updateStatusIndicator();
    this.switchTab('chat');
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) {
      themeBtn.innerHTML = (this.theme === 'classic' || this.theme === 'dark') ? '🌸' : '⚡';
      themeBtn.title = (this.theme === 'classic' || this.theme === 'dark') ? 'Switch to Sakura Theme' : 'Switch to Classic Theme';
      themeBtn.addEventListener('click', () => {
        this.setTheme((this.theme === 'classic' || this.theme === 'dark') ? 'sakura' : 'classic');
      });
    }
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('jarvis_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) {
      themeBtn.innerHTML = (theme === 'classic' || theme === 'dark') ? '🌸' : '⚡';
      themeBtn.title = (theme === 'classic' || theme === 'dark') ? 'Switch to Sakura Theme' : 'Switch to Classic Theme';
    }
    const themeSelect = document.getElementById('settingAppTheme');
    if (themeSelect) {
      themeSelect.value = (theme === 'classic' || theme === 'dark') ? 'classic' : 'sakura';
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
    if (tabName === 'developer') {
      const isUnlocked = window.DevAssistant ? window.DevAssistant.isUnlocked : (window.StudioEngine && window.StudioEngine.isUnlocked);
      if (!isUnlocked) {
        const pinModal = document.getElementById('devStudioPinModal');
        if (pinModal) {
          pinModal.style.display = 'flex';
          const input = document.getElementById('devStudioPinInput');
          if (input) input.focus();
          return;
        }
      }
    }
    if (window.soundFX) window.soundFX.click();
    this.activeTab = tabName;

    // Toggle Tab Panes
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      if (pane.id === `tab-${tabName}`) {
        pane.classList.add('active');
        pane.style.setProperty('display', 'flex', 'important');
      } else {
        pane.classList.remove('active');
        pane.style.setProperty('display', 'none', 'important');
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
      let newSession;
      if (window.ClientAI && window.ClientAI.serverAvailable === false) {
        newSession = window.ClientAI.createSession('New Conversation');
      } else {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Conversation' })
        });
        newSession = await res.json();
      }
      this.switchTab('chat');
      if (window.chat) {
        await window.chat.loadSessionMessages(newSession.id);
      }
      this.showToast('Created new conversation');
      this.closeSidebar();
    } catch (err) {
      if (window.ClientAI) {
        const newSession = window.ClientAI.createSession('New Conversation');
        this.switchTab('chat');
        if (window.chat) await window.chat.loadSessionMessages(newSession.id);
        this.showToast('Created new conversation');
        this.closeSidebar();
        return;
      }
      alert('Failed to create new chat: ' + err.message);
    }
  }

  async updateStatusIndicator() {
    const dot = document.getElementById('systemStatusDot');
    const text = document.getElementById('systemStatusText');
    const userNameEl = document.getElementById('sidebarUserName');

    if (window.ClientAI) {
      const s = window.ClientAI.getSettings();
      if (userNameEl) userNameEl.textContent = s.user_name || 'Commander';
      const hasKey = Boolean(window.ClientAI.getApiKey());
      if (dot && text) {
        if (window.ClientAI.serverAvailable === false) {
          dot.className = hasKey ? 'status-dot' : 'status-dot warning';
          text.textContent = hasKey ? 'Standalone Phone Core' : 'Phone Core (Add Key)';
        } else {
          dot.className = hasKey ? 'status-dot' : 'status-dot warning';
          text.textContent = hasKey ? 'Neural Core Online' : 'Offline Engine (Add Key)';
        }
      }
    }

    try {
      if (!window.ClientAI || window.ClientAI.serverAvailable !== false) {
        const res = await fetch('/api/status');
        if (!res.ok) return;
        const data = await res.json();
        if (userNameEl) userNameEl.textContent = data.userName || 'Commander';
        if (dot && text) {
          dot.className = data.hasApiKey ? 'status-dot' : 'status-dot warning';
          text.textContent = data.hasApiKey ? 'Neural Core Online' : 'Offline Engine (Add Key)';
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
          .then(reg => {
            console.log('PWA ServiceWorker registered:', reg.scope);
            try { reg.update(); } catch(e) {}
          })
          .catch(err => console.log('ServiceWorker registration note:', err));
      });
    }

    const installBtn = document.getElementById('btnPWAInstall');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
      if (installBtn) installBtn.style.display = 'none';
    } else if (installBtn) {
      // Show install button so Android Chrome users can trigger A2HS
      installBtn.style.display = 'inline-flex';
      installBtn.onclick = async () => {
        if (window.deferredPwaPrompt) {
          window.deferredPwaPrompt.prompt();
          const choice = await window.deferredPwaPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            installBtn.style.display = 'none';
            if (window.app) window.app.showToast('💖 Installing AI Girlfriend to your Home Screen...');
          }
          window.deferredPwaPrompt = null;
        } else {
          this.showInstallHelpModal();
        }
      };
    }

    // Capture Chrome PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
      if (installBtn && !isStandalone) {
        installBtn.style.display = 'inline-flex';
      }
    });

    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.style.display = 'none';
      if (window.app) window.app.showToast('💖 AI Girlfriend installed successfully on your device!');
    });
  }

  showInstallHelpModal() {
    const existing = document.getElementById('pwaInstallModal');
    if (existing && existing.style.display !== 'none') {
      existing.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'pwaInstallModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(6px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;';
    modal.innerHTML = `
      <div style="background:#080d1a; border:1px solid #ff2a85; border-radius:16px; max-width:400px; width:100%; padding:20px; box-shadow:0 0 25px rgba(255,42,133,0.35); color:#fff; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:1.15rem; color:#ff2a85; display:flex; align-items:center; gap:8px;">
            <span>💖</span> Install AI Girlfriend Mobile
          </h3>
          <button onclick="document.getElementById('pwaInstallModal').remove()" style="background:transparent; border:none; color:#8b9bb4; font-size:1.3rem; cursor:pointer;">✕</button>
        </div>
        <p style="font-size:0.88rem; color:#cbd5e1; margin-bottom:14px; line-height:1.45;">
          You can install this app directly onto your Android phone via <strong>Google Chrome</strong> with full-screen experience and zero PC needed!
        </p>
        <div style="background:rgba(255,42,133,0.08); border-radius:10px; padding:14px; margin-bottom:16px; font-size:0.85rem; line-height:1.55;">
          <div style="margin-bottom:8px;"><strong>1.</strong> In Chrome, tap the <strong>3 vertical dots (⋮)</strong> at top-right.</div>
          <div style="margin-bottom:8px;"><strong>2.</strong> Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</div>
          <div><strong>3.</strong> Tap <strong>"Install"</strong> — AI Girlfriend icon will appear on your Android home screen!</div>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button onclick="document.getElementById('pwaInstallModal').remove()" class="chip-btn" style="background:#ff2a85; color:#fff; font-weight:700; border:none; padding:8px 18px; border-radius:8px;">Understood</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Bootstrap after DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  window.app = new App();

  // Initialize sub-controllers
  window.orb = new JarvisOrb('orbCanvas');
  window.chat = new ChatController();
  window.tools = new ToolsController();
  if (typeof VideoStudioController !== 'undefined') {
    window.videoStudio = new VideoStudioController();
  }
  window.historyManager = new HistoryController();
  window.settingsManager = new SettingsController();
  window.developerStudio = new DeveloperStudioController();

  // Auto-voice reply (TTS) default ON
  const savedAutoVoice = (typeof localStorage !== 'undefined') ? localStorage.getItem('jarvis_setting_auto_voice_reply') : null;
  window.autoVoiceReplyEnabled = (savedAutoVoice !== 'false');
  window.autoSpeakEnabled = window.autoVoiceReplyEnabled;

  const autoSpeakBtn = document.getElementById('btnToggleAutoSpeak');
  if (autoSpeakBtn) {
    autoSpeakBtn.textContent = window.autoSpeakEnabled ? '🔊' : '🔇';
    autoSpeakBtn.style.color = window.autoSpeakEnabled ? 'var(--neon-cyan)' : 'var(--text-muted)';
    autoSpeakBtn.addEventListener('click', () => {
      window.autoSpeakEnabled = !window.autoSpeakEnabled;
      window.autoVoiceReplyEnabled = window.autoSpeakEnabled;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('jarvis_setting_auto_voice_reply', String(window.autoSpeakEnabled));
      }
      const settingToggle = document.getElementById('settingAutoVoiceReply');
      if (settingToggle) settingToggle.checked = window.autoSpeakEnabled;
      autoSpeakBtn.textContent = window.autoSpeakEnabled ? '🔊' : '🔇';
      autoSpeakBtn.style.color = window.autoSpeakEnabled ? 'var(--neon-cyan)' : 'var(--text-muted)';
      if (window.soundFX) window.soundFX.click();
      if (window.app) {
        window.app.showToast(window.autoSpeakEnabled ? 'Auto-Voice Reply Enabled (TTS ON)' : 'Auto-Voice Reply Muted (TTS OFF)');
      }
    });
  }

  // Initialize on-device engine
  if (window.ClientAI) {
    await window.ClientAI.init();
    if (window.app) window.app.updateStatusIndicator();
  }

  // Boot on-device Studio customizations (Level 1)
  if (window.StudioEngine) {
    window.StudioEngine.bootCustomizations();
  }

  // Load first active session into Chat view
  try {
    let sessions = [];
    if (window.ClientAI && window.ClientAI.serverAvailable === false) {
      sessions = window.ClientAI.getSessions();
    } else {
      const res = await fetch('/api/sessions');
      sessions = await res.json();
    }
    if (sessions && sessions.length > 0) {
      if (window.chat) window.chat.loadSessionMessages(sessions[0].id);
    } else if (window.ClientAI) {
      const initial = window.ClientAI.ensureInitialSession();
      if (window.chat) window.chat.loadSessionMessages(initial.id);
    }
  } catch (e) {
    if (window.ClientAI) {
      const initial = window.ClientAI.ensureInitialSession();
      if (window.chat) window.chat.loadSessionMessages(initial.id);
    }
  }

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
      if (window.voiceAssistant) {
        window.voiceAssistant.unlockAudio();
      }
      // If on chat pane, switch to voice or toggle voice input
      window.app.switchTab('voice');
      if (window.voiceAssistant) window.voiceAssistant.toggleListening();
    });
  }

  const stopVoiceBtn = document.getElementById('btnStopVoice');
  if (stopVoiceBtn) {
    stopVoiceBtn.addEventListener('click', () => {
      if (window.voiceAssistant) window.voiceAssistant.stopSpeaking(true);
    });
  }
});
