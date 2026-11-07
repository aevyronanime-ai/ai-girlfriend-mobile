// J.A.R.V.I.S. Developer Studio - Frontend Controller
class DeveloperStudioController {
  constructor() {
    this.currentFile = null;
    this.currentContent = '';
    this.filesList = [];
    this.logs = [];

    this.initDOM();
    this.bindEvents();
    this.captureConsoleLogs();
  }

  initDOM() {
    this.treeContainer = document.getElementById('devFileTree');
    this.editorTextarea = document.getElementById('devCodeEditor');
    this.editorLineNumbers = document.getElementById('devLineNumbers');
    this.currentFileBadge = document.getElementById('devCurrentFile');
    this.syntaxStatusBadge = document.getElementById('devSyntaxStatus');
    this.btnSaveFile = document.getElementById('btnDevSaveFile');
    this.btnValidateSyntax = document.getElementById('btnDevValidateSyntax');
    this.btnRunTests = document.getElementById('btnDevRunTests');
    this.btnSyncAndroid = document.getElementById('btnDevSyncAndroid');
    this.testResultsBox = document.getElementById('devTestResults');
    this.backupsListContainer = document.getElementById('devBackupsList');
    this.debugLogsContainer = document.getElementById('devDebugLogs');
    this.searchInput = document.getElementById('devSearchInput');
    this.replaceInput = document.getElementById('devReplaceInput');
    this.btnFindReplace = document.getElementById('btnDevFindReplace');
    this.aiPromptInput = document.getElementById('devAiPromptInput');
    this.btnAskAiDev = document.getElementById('btnDevAskAi');
    this.aiDevResponseBox = document.getElementById('devAiResponseBox');
    this.btnTogglePreview = document.getElementById('btnDevTogglePreview');
    this.previewFrame = document.getElementById('devPreviewFrame');

    // Level 1 Studio Controls
    this.switchStudioMaster = document.getElementById('switchStudioMaster');
    this.btnDevRollback = document.getElementById('btnDevRollback');
    this.btnDevAiVoice = document.getElementById('btnDevAiVoice');
    this.devLiveApprovalCard = document.getElementById('devLiveApprovalCard');
    this.devApprovalSummary = document.getElementById('devApprovalSummary');
    this.btnDevApplyChanges = document.getElementById('btnDevApplyChanges');
    this.btnDevRejectChanges = document.getElementById('btnDevRejectChanges');
    this.devAuditLogsContainer = document.getElementById('devAuditLogsContainer');
    this.devStudioPinModal = document.getElementById('devStudioPinModal');
    this.devStudioPinInput = document.getElementById('devStudioPinInput');
    this.btnDevVerifyPin = document.getElementById('btnDevVerifyPin');
  }

  bindEvents() {
    if (this.btnSaveFile) {
      this.btnSaveFile.addEventListener('click', () => this.handleSaveFile());
    }

    if (this.btnValidateSyntax) {
      this.btnValidateSyntax.addEventListener('click', () => this.handleValidateSyntax());
    }

    if (this.btnRunTests) {
      this.btnRunTests.addEventListener('click', () => this.handleRunTests());
    }

    if (this.btnSyncAndroid) {
      this.btnSyncAndroid.addEventListener('click', () => this.handleSyncAndroid());
    }

    if (this.btnFindReplace) {
      this.btnFindReplace.addEventListener('click', () => this.handleFindReplace());
    }

    if (this.btnAskAiDev) {
      this.btnAskAiDev.addEventListener('click', () => this.handleAskAiDev());
    }

    // Studio Master Toggle
    if (this.switchStudioMaster && window.StudioEngine) {
      this.switchStudioMaster.checked = window.StudioEngine.isEnabled();
      this.switchStudioMaster.addEventListener('change', () => {
        window.StudioEngine.setEnabled(this.switchStudioMaster.checked);
        if (window.app) {
          window.app.showToast(this.switchStudioMaster.checked ? 'Studio Master Enabled' : 'Studio Master Disabled (Safety Mode)');
        }
      });
    }

    // Rollback Button (पिछला वर्ज़न वापस लाओ)
    if (this.btnDevRollback && window.StudioEngine) {
      this.btnDevRollback.addEventListener('click', () => {
        if (!confirm('क्या आप सचमुच ऐप का पिछला सुरक्षित वर्ज़न वापस लाना चाहते हैं?')) return;
        const res = window.StudioEngine.rollbackToSnapshot();
        if (window.app) window.app.showToast(res.message);
        this.renderAuditLogs();
        this.renderStudioBackups();
      });
    }

    // Voice Dictation for Studio Prompt
    if (this.btnDevAiVoice && this.aiPromptInput) {
      this.btnDevAiVoice.addEventListener('click', () => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
          if (window.app) window.app.showToast('Voice input not supported in this browser');
          return;
        }
        const rec = new SpeechRec();
        rec.lang = 'hi-IN';
        rec.start();
        this.btnDevAiVoice.textContent = '🔴';
        rec.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          this.aiPromptInput.value = transcript;
          this.btnDevAiVoice.textContent = '🎙️';
        };
        rec.onerror = () => { this.btnDevAiVoice.textContent = '🎙️'; };
        rec.onend = () => { this.btnDevAiVoice.textContent = '🎙️'; };
      });
    }

    // Approval Card Buttons (लागू करें & रद्द करें)
    if (this.btnDevApplyChanges && window.StudioEngine) {
      this.btnDevApplyChanges.addEventListener('click', () => {
        try {
          const applied = window.StudioEngine.applyPendingChange();
          if (this.devLiveApprovalCard) this.devLiveApprovalCard.style.display = 'none';
          if (window.app) window.app.showToast('✅ बदलाव सफलतापूर्वक फोन में लागू और सेव हो गए!');
          if (window.soundFX) window.soundFX.success();
          this.renderAuditLogs();
          this.renderStudioBackups();
        } catch (e) {
          alert(e.message);
        }
      });
    }

    if (this.btnDevRejectChanges && window.StudioEngine) {
      this.btnDevRejectChanges.addEventListener('click', () => {
        window.StudioEngine.rejectPendingChange();
        if (this.devLiveApprovalCard) this.devLiveApprovalCard.style.display = 'none';
        if (window.app) window.app.showToast('बदलाव रद्द कर दिया गया');
      });
    }

    // PIN Unlock
    if (this.btnDevVerifyPin && this.devStudioPinInput && window.StudioEngine) {
      this.btnDevVerifyPin.addEventListener('click', () => {
        const pin = this.devStudioPinInput.value.trim();
        if (window.StudioEngine.verifyPin(pin)) {
          if (this.devStudioPinModal) this.devStudioPinModal.style.display = 'none';
          if (window.app) window.app.showToast('🔓 Studio Unlocked');
          this.devStudioPinInput.value = '';
        } else {
          alert('❌ गलत PIN! कृपया सही PIN डालें। (डिफ़ॉल्ट PIN: 1234)');
          this.devStudioPinInput.value = '';
        }
      });
    }

    this.renderAuditLogs();
    this.renderStudioBackups();

    if (this.btnTogglePreview && this.previewFrame) {
      this.btnTogglePreview.addEventListener('click', () => {
        const isHidden = this.previewFrame.style.display === 'none' || !this.previewFrame.style.display;
        this.previewFrame.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          this.previewFrame.src = '/';
        }
      });
    }

    if (this.editorTextarea) {
      this.editorTextarea.addEventListener('input', () => {
        this.updateLineNumbers();
        if (this.syntaxStatusBadge) {
          this.syntaxStatusBadge.textContent = 'Unsaved Changes';
          this.syntaxStatusBadge.className = 'status-tag tag-warning';
        }
      });

      this.editorTextarea.addEventListener('scroll', () => {
        if (this.editorLineNumbers) {
          this.editorLineNumbers.scrollTop = this.editorTextarea.scrollTop;
        }
      });
    }
  }

  // Intercept client-side console logs and errors for Debug Console view
  captureConsoleLogs() {
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;

    console.log = (...args) => {
      origLog(...args);
      this.addLogEntry('LOG', args.join(' '));
    };

    console.error = (...args) => {
      origError(...args);
      this.addLogEntry('ERROR', args.join(' '));
    };

    console.warn = (...args) => {
      origWarn(...args);
      this.addLogEntry('WARN', args.join(' '));
    };

    window.addEventListener('error', (e) => {
      this.addLogEntry('CRITICAL', `${e.message} at ${e.filename}:${e.lineno}`);
    });
  }

  addLogEntry(type, msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift({ type, msg, time });
    if (this.logs.length > 50) this.logs.pop();
    this.renderDebugLogs();
  }

  renderDebugLogs() {
    if (!this.debugLogsContainer) return;
    this.debugLogsContainer.innerHTML = this.logs.map(log => {
      const color = log.type === 'ERROR' || log.type === 'CRITICAL' ? '#ff0055' : (log.type === 'WARN' ? '#ffaa00' : '#00f0ff');
      return `<div style="font-family:monospace; font-size:0.75rem; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:2px;">
        <span style="color:#6b7280;">[${log.time}]</span> <span style="color:${color}; font-weight:700;">[${log.type}]</span> <span style="color:var(--text-primary);">${log.msg}</span>
      </div>`;
    }).join('');
  }

  // Load and render file tree
  async loadProjectTree() {
    if (!this.treeContainer) return;
    this.treeContainer.innerHTML = '<div style="color:var(--text-muted); padding:10px;">Scanning project tree...</div>';

    try {
      const res = await fetch('/api/developer/tree');
      if (!res.ok) throw new Error('Failed to load file tree');
      this.filesList = await res.json();

      let html = '';
      const categories = { frontend: '🌐 Web Frontend', backend: '⚙️ Backend Core', android: '🤖 Android Native' };

      for (const [catKey, catLabel] of Object.entries(categories)) {
        const catFiles = this.filesList.filter(f => f.category === catKey);
        if (catFiles.length === 0) continue;

        html += `<div style="font-weight:700; font-size:0.78rem; color:var(--neon-cyan); margin:10px 0 4px 6px; text-transform:uppercase;">${catLabel}</div>`;
        catFiles.forEach(f => {
          const isSelected = this.currentFile === f.path;
          html += `
            <div class="dev-tree-item ${isSelected ? 'selected' : ''}" onclick="window.developerStudio.openFile('${f.path}')" style="cursor:pointer; padding:6px 10px; border-radius:6px; font-size:0.8rem; margin-bottom:2px; display:flex; justify-content:space-between; align-items:center; background:${isSelected ? 'rgba(0,240,255,0.1)' : 'transparent'};">
              <span>📄 ${f.name}</span>
              <span style="font-size:0.68rem; color:var(--text-muted);">${f.size ? Math.round(f.size/1024) + 'KB' : ''}</span>
            </div>
          `;
        });
      }

      this.treeContainer.innerHTML = html;
    } catch (err) {
      this.treeContainer.innerHTML = `<div style="color:#ff0055; padding:10px;">Error: ${err.message}</div>`;
    }
  }

  // Open a file into Code Editor
  async openFile(filePath) {
    if (!this.editorTextarea) return;
    try {
      const res = await fetch(`/api/developer/read?file=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error('Failed to read file');
      const data = await res.json();

      this.currentFile = data.path;
      this.currentContent = data.content;
      this.editorTextarea.value = data.content;

      if (this.currentFileBadge) this.currentFileBadge.textContent = data.path;
      if (this.syntaxStatusBadge) {
        this.syntaxStatusBadge.textContent = 'Clean';
        this.syntaxStatusBadge.className = 'status-tag tag-success';
      }

      this.updateLineNumbers();
      this.loadBackupsForFile(data.path);
      this.loadProjectTree(); // update active highlight
      if (window.soundFX) window.soundFX.click();
    } catch (err) {
      if (window.app) window.app.showToast('Error opening file: ' + err.message);
    }
  }

  updateLineNumbers() {
    if (!this.editorLineNumbers || !this.editorTextarea) return;
    const lines = this.editorTextarea.value.split('\n').length;
    let nums = '';
    for (let i = 1; i <= lines; i++) {
      nums += i + '\n';
    }
    this.editorLineNumbers.textContent = nums;
  }

  // Validate Syntax
  async handleValidateSyntax() {
    if (!this.currentFile || !this.editorTextarea) return;
    try {
      const res = await fetch('/api/developer/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: this.currentFile, content: this.editorTextarea.value })
      });
      const data = await res.json();
      if (data.valid) {
        if (this.syntaxStatusBadge) {
          this.syntaxStatusBadge.textContent = 'Syntax Valid ✅';
          this.syntaxStatusBadge.className = 'status-tag tag-success';
        }
        if (window.app) window.app.showToast('✅ Syntax is completely valid');
        if (window.soundFX) window.soundFX.success();
      } else {
        if (this.syntaxStatusBadge) {
          this.syntaxStatusBadge.textContent = 'Syntax Error ❌';
          this.syntaxStatusBadge.className = 'status-tag tag-error';
        }
        alert(data.error);
      }
    } catch (e) {
      alert('Validation error: ' + e.message);
    }
  }

  // Save File with Auto-Backup
  async handleSaveFile() {
    if (!this.currentFile || !this.editorTextarea) {
      if (window.app) window.app.showToast('Select a file to edit first');
      return;
    }

    if (!confirm(`Save changes to "${this.currentFile}"? An automatic backup will be created.`)) {
      return;
    }

    try {
      const res = await fetch('/api/developer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: this.currentFile,
          content: this.editorTextarea.value,
          reason: 'Saved via In-App Developer Studio'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Save failed');

      if (this.syntaxStatusBadge) {
        this.syntaxStatusBadge.textContent = 'Saved & Backed Up ✅';
        this.syntaxStatusBadge.className = 'status-tag tag-success';
      }

      if (window.app) window.app.showToast(`Saved! Backup ID: ${data.backupId}`);
      if (window.soundFX) window.soundFX.success();
      this.loadBackupsForFile(this.currentFile);
    } catch (err) {
      alert('Failed to save file: ' + err.message);
    }
  }

  // Load Backups & Rollbacks
  async loadBackupsForFile(file) {
    if (!this.backupsListContainer) return;
    try {
      const res = await fetch(`/api/developer/backups${file ? '?file=' + encodeURIComponent(file) : ''}`);
      const backups = await res.json();

      if (!backups || backups.length === 0) {
        this.backupsListContainer.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem;">No previous backups for this file.</div>';
        return;
      }

      this.backupsListContainer.innerHTML = backups.slice(0, 10).map(b => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); padding:6px 8px; border-radius:6px; margin-bottom:6px; font-size:0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700;">${b.dateString}</div>
            <div style="color:var(--text-muted); font-size:0.68rem;">${b.reason}</div>
          </div>
          <button class="chip-btn" onclick="window.developerStudio.restoreBackup('${b.id}')" style="padding:2px 8px; font-size:0.7rem; background:#ffaa00; color:#000;">🔄 Rollback</button>
        </div>
      `).join('');
    } catch (e) {}
  }

  // Restore Backup Rollback
  async restoreBackup(backupId) {
    if (!confirm('Rollback to this previous version? Current file will be snapshotted first.')) return;
    try {
      const res = await fetch('/api/developer/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (window.app) window.app.showToast(data.message);
      if (this.currentFile) this.openFile(this.currentFile);
    } catch (e) {
      alert('Rollback failed: ' + e.message);
    }
  }

  // Find & Replace
  async handleFindReplace() {
    if (!this.currentFile || !this.searchInput || !this.replaceInput) return;
    const search = this.searchInput.value;
    const replace = this.replaceInput.value;
    if (!search) {
      alert('Enter search term');
      return;
    }

    try {
      const res = await fetch('/api/developer/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: this.currentFile, search, replace })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Replace failed');

      if (window.app) window.app.showToast(`Replaced ${data.occurrences} matches`);
      this.openFile(this.currentFile);
    } catch (e) {
      alert('Find/Replace error: ' + e.message);
    }
  }

  // Run Automated Frontend Tests
  async handleRunTests() {
    if (!this.testResultsBox) return;
    this.testResultsBox.style.display = 'block';
    this.testResultsBox.textContent = 'Running test-frontend.js (Syntax & DOM Bindings)...';

    try {
      const res = await fetch('/api/developer/test', { method: 'POST' });
      const data = await res.json();
      this.testResultsBox.textContent = data.output || 'Tests completed.';
      if (data.success && window.soundFX) window.soundFX.success();
    } catch (e) {
      this.testResultsBox.textContent = 'Test runner error: ' + e.message;
    }
  }

  // Sync to Android Native Project
  async handleSyncAndroid() {
    try {
      const res = await fetch('/api/developer/sync-android', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (window.app) window.app.showToast('✅ Android assets synced successfully!');
        if (window.soundFX) window.soundFX.success();
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      alert('Sync error: ' + e.message);
    }
  }

  // AI Studio Level 1 (स्तर 1: बोलकर या लिखकर ऐप बदलें)
  async handleAskAiDev() {
    if (!this.aiPromptInput) return;
    const query = this.aiPromptInput.value.trim();
    if (!query) return;

    if (this.btnDevAskAi) {
      this.btnDevAskAi.disabled = true;
      this.btnDevAskAi.textContent = '⏳ प्लान बन रहा है...';
    }

    if (this.aiDevResponseBox) {
      this.aiDevResponseBox.style.display = 'block';
      this.aiDevResponseBox.innerHTML = '<em>⚡ AI Studio आर्किटेक्ट कोड और प्रीव्यू तैयार कर रहा है...</em>';
    }

    try {
      if (!window.StudioEngine) throw new Error('Studio Engine not loaded.');

      const plan = await window.StudioEngine.planModification(query);

      // Display summary in AI response box
      if (this.aiDevResponseBox) {
        this.aiDevResponseBox.innerHTML = `
          <div style="font-weight:700; color:var(--neon-cyan); margin-bottom:4px;">✨ ${plan.summary}</div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">श्रेणी: <strong>${plan.category || 'UI Modification'}</strong></p>
        `;
      }

      // Show Live Approval Card (मेरी हाँ ज़रूरी हो)
      if (this.devLiveApprovalCard && this.devApprovalSummary) {
        this.devApprovalSummary.innerHTML = `
          <strong>प्रस्तावित बदलाव:</strong> ${plan.summary}<br>
          <div style="margin-top:6px; background:#000; padding:8px; border-radius:4px; font-family:monospace; font-size:0.72rem; color:#00f0ff; max-height:100px; overflow-y:auto;">
            ${plan.css ? '🎨 CSS:\n' + plan.css : ''}
            ${plan.tabs ? '\n⭐ नया टैब:\n' + JSON.stringify(plan.tabs, null, 2) : ''}
            ${plan.buttons ? '\n🔘 नया बटन:\n' + JSON.stringify(plan.buttons, null, 2) : ''}
            ${plan.theme ? '\n🌈 थीम:\n' + JSON.stringify(plan.theme, null, 2) : ''}
          </div>
        `;
        this.devLiveApprovalCard.style.display = 'block';
      }

      // Render into Live Preview Frame
      if (this.previewFrame) {
        this.previewFrame.style.display = 'block';
        const previewDoc = this.previewFrame.contentDocument || this.previewFrame.contentWindow.document;
        previewDoc.open();
        previewDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; background: #070b14; color: #f8fafc; padding: 24px; text-align: center; }
              .preview-card { background: #0f172a; border: 1px solid #00f0ff; border-radius: 12px; padding: 18px; margin: 12px auto; max-width: 400px; }
              .chip-btn-preview { padding: 8px 16px; border-radius: 20px; font-weight: 700; margin: 6px; cursor: pointer; border: 1px solid #00f0ff; background: #00f0ff; color: #000; }
              ${plan.css || ''}
            </style>
          </head>
          <body>
            <h3>👁️ बदलाव का लाइव प्रीव्यू (Live Preview)</h3>
            <p style="font-size:0.85rem; color:#94a3b8;">${plan.summary}</p>
            <div class="preview-card">
              ${plan.previewHtml || '<button class="chip-btn-preview">✨ नया कस्टम एक्शन</button>'}
            </div>
            <p style="font-size:0.75rem; color:#64748b;">अगर आपको यह सही लगे, तो नीचे दिए गए <strong>"बदलाव लागू करें"</strong> बटन पर टैप करें।</p>
          </body>
          </html>
        `);
        previewDoc.close();
      }
    } catch (err) {
      if (this.aiDevResponseBox) {
        this.aiDevResponseBox.innerHTML = `<span style="color:#ff0055;">⚠️ ${err.message}</span>`;
      }
    } finally {
      if (this.btnDevAskAi) {
        this.btnDevAskAi.disabled = false;
        this.btnDevAskAi.textContent = '⚡ कोड बनाओ';
      }
    }
  }

  renderAuditLogs() {
    if (!this.devAuditLogsContainer || !window.StudioEngine) return;
    const logs = window.StudioEngine.loadAuditLogs();
    if (logs.length === 0) {
      this.devAuditLogsContainer.innerHTML = '<div>कोई हालिया बदलाव नहीं मिला।</div>';
      return;
    }
    this.devAuditLogsContainer.innerHTML = logs.map(l => `
      <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding:4px 0; display:flex; justify-content:space-between; gap:8px;">
        <span><strong>${l.author}:</strong> ${l.action}</span>
        <span style="color:var(--text-muted); font-size:0.68rem;">${new Date(l.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join('');
  }

  renderStudioBackups() {
    if (!this.backupsListContainer || !window.StudioEngine) return;
    const backups = window.StudioEngine.loadBackups();
    if (backups.length === 0) {
      this.backupsListContainer.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem;">कोई ऑटो-स्नैपशॉट उपलब्ध नहीं है।</div>';
      return;
    }
    this.backupsListContainer.innerHTML = backups.map(b => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
        <div>
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary);">${b.description}</div>
          <div style="font-size:0.68rem; color:var(--text-muted);">${new Date(b.timestamp).toLocaleString()}</div>
        </div>
        <button class="chip-btn" onclick="window.StudioEngine.rollbackToSnapshot('${b.id}'); window.developerStudio.renderAuditLogs(); window.developerStudio.renderStudioBackups(); if(window.app) window.app.showToast('Rolled back!');" style="font-size:0.68rem; padding:2px 8px;">↩️ Restore</button>
      </div>
    `).join('');
  }
}
