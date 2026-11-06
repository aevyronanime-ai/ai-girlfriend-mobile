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

  // AI Developer Assistant Consultation
  async handleAskAiDev() {
    if (!this.aiPromptInput || !this.aiDevResponseBox) return;
    const query = this.aiPromptInput.value.trim();
    if (!query) return;

    this.aiDevResponseBox.style.display = 'block';
    this.aiDevResponseBox.innerHTML = '<em>⚡ JARVIS AI Developer Architect is analyzing...</em>';

    try {
      const contextCode = this.editorTextarea ? this.editorTextarea.value.slice(0, 1500) : '';
      const prompt = `Act as an expert Senior Full-Stack and Android Developer for JARVIS AI.
User Query: "${query}".
Active File: "${this.currentFile || 'None'}".
Snippet of active file:
\`\`\`
${contextCode}
\`\`\`
Explain the solution clearly in simple Hindi or English, and provide the exact code modification.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, stream: false })
      });
      const data = await res.json();
      this.aiDevResponseBox.innerHTML = `<div style="font-size:0.85rem; line-height:1.5;">${data.content || data.error}</div>`;
    } catch (e) {
      this.aiDevResponseBox.textContent = 'AI Architect notice: ' + e.message;
    }
  }
}
