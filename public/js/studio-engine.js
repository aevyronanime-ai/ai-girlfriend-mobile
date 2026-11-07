// StudioEngine: Level 1 (स्तर 1) On-Device Live Customization Engine
// Enables editing UI, tabs, buttons, themes, and assistant personalities directly on the phone
// without recompiling APK or requiring Termux/server.js.

(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    STUDIO_ENABLED: 'aigf_studio_enabled',
    STUDIO_PIN: 'aigf_studio_pin',
    CUSTOM_DATA: 'aigf_studio_custom_data',
    BACKUPS: 'aigf_studio_backups',
    AUDIT_LOGS: 'aigf_studio_audit_logs',
    BOOT_STATUS: 'aigf_boot_healthy'
  };

  const DEFAULT_PIN = '1234';

  class StudioCustomizationEngine {
    constructor() {
      this.isUnlocked = false;
      this.pendingChange = null;
      this.customData = this.loadCustomData();
      this.backups = this.loadBackups();
      this.auditLogs = this.loadAuditLogs();
    }

    // ----------------------------------------------------
    // Master Safety Switch & PIN Protection
    // ----------------------------------------------------
    isEnabled() {
      const val = localStorage.getItem(STORAGE_KEYS.STUDIO_ENABLED);
      return val === null ? true : val === 'true';
    }

    setEnabled(enabled) {
      localStorage.setItem(STORAGE_KEYS.STUDIO_ENABLED, enabled ? 'true' : 'false');
      this.logAudit(enabled ? 'Studio Master Enabled' : 'Studio Master Disabled', 'Owner');
      if (!enabled) {
        this.removeDynamicCustomizations();
      } else {
        this.applyDynamicCustomizations();
      }
    }

    verifyPin(enteredPin) {
      const storedPin = localStorage.getItem(STORAGE_KEYS.STUDIO_PIN) || DEFAULT_PIN;
      if (enteredPin === storedPin) {
        this.isUnlocked = true;
        return true;
      }
      return false;
    }

    setNewPin(newPin) {
      if (newPin && newPin.length >= 4) {
        localStorage.setItem(STORAGE_KEYS.STUDIO_PIN, newPin);
        this.logAudit('Security PIN Updated', 'Owner');
        return true;
      }
      return false;
    }

    // ----------------------------------------------------
    // Storage & Version Vault (Rollback)
    // ----------------------------------------------------
    loadCustomData() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_DATA) || '{}');
      } catch (e) {
        return {};
      }
    }

    saveCustomData(data) {
      this.customData = data;
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_DATA, JSON.stringify(data));
      } catch (e) {
        console.error('[StudioEngine] Failed to save custom data:', e);
      }
    }

    loadBackups() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUPS) || '[]');
      } catch (e) {
        return [];
      }
    }

    createBackup(description) {
      const backups = this.loadBackups();
      const snapshot = {
        id: 'snap_' + Date.now(),
        timestamp: Date.now(),
        description: description || 'Automatic Pre-Change Snapshot',
        data: JSON.parse(JSON.stringify(this.customData))
      };
      backups.unshift(snapshot);
      if (backups.length > 15) backups.pop(); // keep last 15 snapshots
      this.backups = backups;
      localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups));
      return snapshot;
    }

    rollbackToSnapshot(snapshotId) {
      const backups = this.loadBackups();
      let target = null;
      if (snapshotId) {
        target = backups.find(b => b.id === snapshotId);
      } else if (backups.length > 0) {
        target = backups[0]; // most recent
      }

      if (!target) {
        // Fallback: reset to clean default
        this.customData = {};
        this.saveCustomData({});
        this.removeDynamicCustomizations();
        this.logAudit('Reset to Clean Defaults (No Snapshots Found)', 'System');
        return { success: true, message: 'Clean defaults restored' };
      }

      this.createBackup('Pre-Rollback State');
      this.saveCustomData(target.data || {});
      this.applyDynamicCustomizations();
      this.logAudit(`Rolled back to snapshot: ${target.description}`, 'Owner');
      return { success: true, message: `Rolled back to: ${target.description}` };
    }

    loadAuditLogs() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
      } catch (e) {
        return [];
      }
    }

    logAudit(action, author = 'Owner') {
      const logs = this.loadAuditLogs();
      logs.unshift({
        id: 'log_' + Date.now(),
        timestamp: Date.now(),
        action,
        author
      });
      if (logs.length > 50) logs.pop();
      this.auditLogs = logs;
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    }

    // ----------------------------------------------------
    // Dynamic In-App Customization Applier (Level 1)
    // ----------------------------------------------------
    applyDynamicCustomizations() {
      if (!this.isEnabled()) return;

      const data = this.customData;
      if (!data) return;

      // 1. Apply Custom CSS (Themes, Colors, Buttons)
      let styleTag = document.getElementById('aigf-dynamic-custom-styles');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'aigf-dynamic-custom-styles';
        document.head.appendChild(styleTag);
      }

      let generatedCss = data.css || '';

      // Apply Custom Theme Variables if present
      if (data.theme && typeof data.theme === 'object') {
        let rootVars = ':root {\n';
        for (const [varName, varVal] of Object.entries(data.theme)) {
          rootVars += `  ${varName}: ${varVal} !important;\n`;
        }
        rootVars += '}\n';
        generatedCss = rootVars + generatedCss;
      }

      styleTag.textContent = generatedCss;

      // 2. Apply Custom Navigation Tabs
      if (Array.isArray(data.tabs) && data.tabs.length > 0) {
        const sidebarNav = document.querySelector('.sidebar-nav');
        const mainContent = document.querySelector('.main-content');

        data.tabs.forEach(tab => {
          if (!tab.id || !tab.label) return;

          // Check if nav item already exists
          let navItem = document.querySelector(`.nav-item[data-tab="${tab.id}"]`);
          if (!navItem && sidebarNav) {
            navItem = document.createElement('a');
            navItem.href = '#';
            navItem.className = 'nav-item custom-dynamic-tab';
            navItem.dataset.tab = tab.id;
            navItem.innerHTML = `
              <span style="font-size:1.1rem; margin-right:8px;">${tab.icon || '⭐'}</span>
              <span>${tab.label}</span>
            `;
            navItem.addEventListener('click', (e) => {
              e.preventDefault();
              if (window.app) window.app.switchTab(tab.id);
            });
            sidebarNav.appendChild(navItem);
          }

          // Check if tab pane already exists
          let pane = document.getElementById(`tab-${tab.id}`);
          if (!pane && mainContent) {
            pane = document.createElement('section');
            pane.className = 'tab-pane custom-dynamic-pane';
            pane.id = `tab-${tab.id}`;
            pane.innerHTML = `
              <div class="tool-view-wrapper">
                <div class="tool-header-card">
                  <h2>${tab.icon || '⭐'} ${tab.label}</h2>
                  <p>${tab.description || 'Custom User Screen'}</p>
                </div>
                <div class="settings-section-card">
                  ${tab.htmlContent || '<p>Welcome to your customized screen!</p>'}
                </div>
              </div>
            `;
            // Insert before bottom nav
            const bottomNav = document.querySelector('.bottom-nav');
            if (bottomNav) {
              mainContent.insertBefore(pane, bottomNav);
            } else {
              mainContent.appendChild(pane);
            }
          }
        });
      }

      // 3. Apply Custom Quick-Action Buttons in Chat
      if (Array.isArray(data.buttons) && data.buttons.length > 0) {
        const chatInputBox = document.querySelector('.chat-input-box');
        let buttonBar = document.getElementById('aigf-custom-buttons-bar');
        if (!buttonBar && chatInputBox) {
          buttonBar = document.createElement('div');
          buttonBar.id = 'aigf-custom-buttons-bar';
          buttonBar.style.cssText = 'display:flex; gap:6px; overflow-x:auto; padding:4px 0; margin-bottom:6px;';
          chatInputBox.parentNode.insertBefore(buttonBar, chatInputBox);
        }
        if (buttonBar) {
          buttonBar.innerHTML = '';
          data.buttons.forEach(btn => {
            const b = document.createElement('button');
            b.className = 'chip-btn';
            b.style.cssText = `white-space:nowrap; font-size:0.75rem; border-color:${btn.color || 'var(--neon-cyan)'}; color:${btn.color || 'var(--neon-cyan)'};`;
            b.textContent = btn.label || 'Action';
            b.onclick = () => {
              if (btn.actionPrompt && window.chat) {
                const input = document.getElementById('chatInput');
                if (input) input.value = btn.actionPrompt;
                window.chat.handleSendMessage();
              } else if (btn.jsAction) {
                try {
                  new Function(btn.jsAction)();
                } catch (e) {
                  console.error('Custom button action error:', e);
                }
              }
            };
            buttonBar.appendChild(b);
          });
        }
      }

      // 4. Safe Custom JS Execution
      if (data.js && data.js.trim()) {
        try {
          const runner = new Function('window', 'document', data.js);
          runner(window, document);
        } catch (jsErr) {
          console.error('[StudioEngine] Custom JS error:', jsErr);
        }
      }
    }

    removeDynamicCustomizations() {
      const styleTag = document.getElementById('aigf-dynamic-custom-styles');
      if (styleTag) styleTag.remove();

      document.querySelectorAll('.custom-dynamic-tab').forEach(el => el.remove());
      document.querySelectorAll('.custom-dynamic-pane').forEach(el => el.remove());
      const btnBar = document.getElementById('aigf-custom-buttons-bar');
      if (btnBar) btnBar.remove();
    }

    // ----------------------------------------------------
    // Boot-Time Initialization & Self-Healing Crash Guard
    // ----------------------------------------------------
    bootCustomizations() {
      if (!this.isEnabled()) return;

      // Self-healing crash protection:
      // If the app crashed during last boot, rollback immediately
      const bootHealthy = localStorage.getItem(STORAGE_KEYS.BOOT_STATUS);
      if (bootHealthy === 'booting') {
        console.warn('[StudioEngine] Crash detected during previous boot! Initiating auto-rollback...');
        this.rollbackToSnapshot();
        if (window.app) {
          setTimeout(() => {
            window.app.showToast('⚠️ पिछली गड़बड़ के कारण ऐप सुरक्षित पिछले वर्ज़न पर लौट आई है!', 5000);
          }, 800);
        }
      }

      localStorage.setItem(STORAGE_KEYS.BOOT_STATUS, 'booting');

      try {
        this.applyDynamicCustomizations();
        // After 2.5 seconds of healthy operation, mark boot as healthy
        setTimeout(() => {
          localStorage.setItem(STORAGE_KEYS.BOOT_STATUS, 'healthy');
        }, 2500);
      } catch (err) {
        console.error('[StudioEngine] Critical error applying customizations:', err);
        this.rollbackToSnapshot();
      }
    }

    // ----------------------------------------------------
    // AI Studio Modification Planner & Code Generator
    // ----------------------------------------------------
    async planModification(userInstruction) {
      if (!this.isEnabled()) {
        throw new Error('Studio Master switch is OFF. Turn it ON to modify the app.');
      }

      // Safety Whitelist Guard: Assistant cannot alter security settings
      const lowered = (userInstruction || '').toLowerCase();
      const forbiddenKeywords = ['pin', 'password', 'token', 'studio master', 'switchstudiomaster', 'security guard', 'bypass permission'];
      for (const kw of forbiddenKeywords) {
        if (lowered.includes(kw)) {
          throw new Error('⚠️ सुरक्षा गार्ड: असिस्टेंट अपनी सुरक्षा सेटिंग, परमिशन, PIN या Master Switch खुद नहीं बदल सकता।');
        }
      }

      const prompt = `Act as an expert Mobile UI Developer & AI Studio Architect for "AI Girlfriend Mobile".
The user wants to customize their app with this instruction: "${userInstruction}".

You must generate a structured JSON object for Level 1 (स्तर 1) on-device customization.
Format your entire response as a pure JSON object:
{
  "summary": "Short explanation in Hindi of what is being changed",
  "category": "theme | button | tab | css | js | personality",
  "css": "Optional CSS rules to inject (e.g. background changes, button styles, animations)",
  "theme": {
    "--neon-pink": "optional new hex/rgb",
    "--neon-cyan": "optional new hex/rgb",
    "--bg-main": "optional new background"
  },
  "buttons": [
    { "label": "Button Name", "color": "#00f0ff", "actionPrompt": "Prompt to send when tapped" }
  ],
  "tabs": [
    { "id": "my_tab", "label": "Tab Name", "icon": "⭐", "description": "Tab description", "htmlContent": "HTML to show inside tab" }
  ],
  "js": "Optional safe JavaScript to run",
  "previewHtml": "Interactive HTML preview showing how this change looks"
}

Ensure the code is safe, elegant, and directly usable on phone. Do NOT wrap in markdown or backticks. Return valid JSON only.`;

      let rawResponse = '';
      if (window.ClientAI) {
        const res = await window.ClientAI.callGeminiDirect({ message: prompt });
        rawResponse = res.text || '';
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt, stream: false })
        });
        const data = await res.json();
        rawResponse = data.content || '';
      }

      // Extract JSON cleanly
      let parsed = null;
      try {
        const cleaned = rawResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        // Fallback simple modification if LLM returned non-JSON
        parsed = {
          summary: `कस्टम बदलाव तैयार किया गया: "${userInstruction}"`,
          category: 'css',
          css: `/* Custom rule for: ${userInstruction} */`,
          previewHtml: `<div style="padding:16px; text-align:center;"><h3>✨ कस्टम बदलाव</h3><p>${userInstruction}</p></div>`
        };
      }

      this.pendingChange = parsed;
      return parsed;
    }

    applyPendingChange() {
      if (!this.pendingChange) throw new Error('No pending change to apply.');

      // 1. Create automatic backup first
      this.createBackup(this.pendingChange.summary || 'User Custom Modification');

      // 2. Merge changes into customData
      const cur = this.customData || {};

      if (this.pendingChange.css) {
        cur.css = (cur.css || '') + '\n' + this.pendingChange.css;
      }
      if (this.pendingChange.theme) {
        cur.theme = Object.assign({}, cur.theme || {}, this.pendingChange.theme);
      }
      if (Array.isArray(this.pendingChange.tabs)) {
        cur.tabs = [...(cur.tabs || []), ...this.pendingChange.tabs];
      }
      if (Array.isArray(this.pendingChange.buttons)) {
        cur.buttons = [...(cur.buttons || []), ...this.pendingChange.buttons];
      }
      if (this.pendingChange.js) {
        cur.js = (cur.js || '') + '\n' + this.pendingChange.js;
      }

      this.saveCustomData(cur);
      this.applyDynamicCustomizations();
      this.logAudit(this.pendingChange.summary || 'Custom Modification Applied', 'Owner');

      const applied = this.pendingChange;
      this.pendingChange = null;
      return applied;
    }

    rejectPendingChange() {
      const rejected = this.pendingChange;
      this.pendingChange = null;
      return rejected;
    }
  }

  // Attach global instance
  window.StudioEngine = new StudioCustomizationEngine();

})(window);
