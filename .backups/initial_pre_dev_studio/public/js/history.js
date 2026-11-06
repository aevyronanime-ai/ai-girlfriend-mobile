// History Manager: Chat sessions list, search, delete, restore
class HistoryController {
  constructor() {
    this.container = document.getElementById('historyListContainer');
    this.searchInput = document.getElementById('historySearchInput');
    this.clearAllBtn = document.getElementById('btnClearAllHistory');
    this.sessions = [];

    this.bindEvents();
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterSessions());
    }

    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.handleClearAll());
    }
  }

  async loadSessions() {
    if (!this.container) return;
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to load history');
      this.sessions = await res.json();
      this.renderSessions(this.sessions);
    } catch (err) {
      console.error('History load error:', err);
      this.container.innerHTML = `<p style="color:#ff0055; padding:20px;">Failed to load history: ${err.message}</p>`;
    }
  }

  renderSessions(list) {
    if (!this.container) return;
    if (list.length === 0) {
      this.container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <div style="font-size:2rem; margin-bottom:10px;">📜</div>
          <p>No conversation history found.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = '';
    list.forEach(s => {
      const card = document.createElement('div');
      card.className = 'history-session-card';
      card.style.cssText = `
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 14px 16px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      card.onmouseenter = () => { card.style.borderColor = 'var(--neon-cyan)'; card.style.transform = 'translateY(-1px)'; };
      card.onmouseleave = () => { card.style.borderColor = 'var(--border-subtle)'; card.style.transform = 'none'; };

      const timeStr = new Date(s.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      card.innerHTML = `
        <div style="flex:1; overflow:hidden;" onclick="window.historyManager.openSession('${s.id}')">
          <div style="font-weight:600; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${s.title || 'Conversation'}
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
            ${timeStr} • Persona: <span style="color:var(--neon-cyan); text-transform:uppercase;">${s.persona || 'jarvis'}</span>
          </div>
        </div>
        <button style="background:transparent; border:none; color:var(--text-muted); font-size:1.1rem; cursor:pointer; padding:6px;" title="Delete chat" onclick="event.stopPropagation(); window.historyManager.deleteSession('${s.id}')">
          🗑️
        </button>
      `;

      this.container.appendChild(card);
    });
  }

  filterSessions() {
    const q = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    const filtered = this.sessions.filter(s => s.title.toLowerCase().includes(q));
    this.renderSessions(filtered);
  }

  async openSession(sessionId) {
    if (window.soundFX) window.soundFX.click();
    if (window.app) window.app.switchTab('chat');
    if (window.chat) await window.chat.loadSessionMessages(sessionId);
  }

  async deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (window.app) window.app.showToast('Session deleted');
      await this.loadSessions();

      // If active session was deleted, open first available session
      if (window.chat && window.chat.activeSessionId === sessionId) {
        if (this.sessions.length > 0) {
          window.chat.loadSessionMessages(this.sessions[0].id);
        } else {
          window.app.createNewChat();
        }
      }
    } catch (err) {
      alert('Failed to delete session: ' + err.message);
    }
  }

  async handleClearAll() {
    if (!confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) return;
    try {
      await fetch('/api/sessions/clear', { method: 'POST' });
      if (window.app) window.app.showToast('All chat history cleared');
      await this.loadSessions();
      if (window.app) window.app.createNewChat();
    } catch (err) {
      alert('Failed to clear history: ' + err.message);
    }
  }
}

window.HistoryController = HistoryController;
