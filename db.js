// Database Manager using native node:sqlite
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_FILE = path.join(__dirname, 'jarvis.db');
const db = new DatabaseSync(DB_FILE);

// Initialize database schema
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      persona TEXT DEFAULT 'jarvis',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tools_history (
      id TEXT PRIMARY KEY,
      tool_type TEXT NOT NULL,
      input_data TEXT NOT NULL,
      output_data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_tools_type ON tools_history(tool_type);
  `);

  // Seed default settings if empty
  const defaultSettings = [
    ['gemini_api_key', process.env.GEMINI_API_KEY || ''],
    ['ai_model', 'gemini-2.5-flash'],
    ['persona', 'girlfriend'],
    ['user_name', 'Darling'],
    ['assistant_name', 'Maya (AI Girlfriend)'],
    ['custom_system_prompt', ''],
    ['voice_lang', 'hi-en'],
    ['voice_rate', '1.0'],
    ['voice_pitch', '1.0'],
    ['sound_fx', 'true'],
    ['theme', 'dark']
  ];

  const checkStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  for (const [key, val] of defaultSettings) {
    const existing = checkStmt.get(key);
    if (!existing) {
      insertStmt.run(key, val);
    }
  }

  // Ensure at least one default session exists
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
  if (sessionCount.count === 0) {
    const now = Date.now();
    const defaultSessionId = 'session_' + now;
    db.prepare('INSERT INTO sessions (id, title, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(defaultSessionId, 'Welcome to JARVIS AI', 'jarvis', now, now);

    db.prepare('INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(
        'msg_' + now,
        defaultSessionId,
        'assistant',
        'Hello! I am **J.A.R.V.I.S.**, your advanced personal AI assistant. I can chat in Hindi & English, listen to your voice commands, generate images, write scripts, solve code, translate languages, and analyze documents. How may I assist you today, Sir?',
        now
      );
  }
}

// Settings helpers
function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settingsObj = {};
  for (const r of rows) {
    settingsObj[r.key] = r.value;
  }
  return settingsObj;
}

// Sessions helpers
function getSessions() {
  return db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all();
}

function getSession(id) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

function createSession(id, title, persona = 'jarvis') {
  const now = Date.now();
  db.prepare('INSERT INTO sessions (id, title, persona, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, persona, now, now);
  return { id, title, persona, created_at: now, updated_at: now };
}

function updateSessionTitle(id, title) {
  const now = Date.now();
  db.prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, now, id);
}

function deleteSession(id) {
  db.prepare('DELETE FROM messages WHERE session_id = ?').run(id);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

function clearAllSessions() {
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM sessions').run();
}

// Messages helpers
function getSessionMessages(sessionId) {
  return db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC').all(sessionId);
}

function addMessage(id, sessionId, role, content, imageUrl = '') {
  const now = Date.now();
  db.prepare('INSERT INTO messages (id, session_id, role, content, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, sessionId, role, content, imageUrl, now);
  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);
  return { id, session_id: sessionId, role, content, image_url: imageUrl, created_at: now };
}

function deleteMessage(id) {
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
}

// Tools history
function logToolHistory(id, toolType, inputData, outputData) {
  const now = Date.now();
  db.prepare('INSERT INTO tools_history (id, tool_type, input_data, output_data, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, toolType, JSON.stringify(inputData), JSON.stringify(outputData), now);
}

function getToolHistory(toolType = null, limit = 20) {
  if (toolType) {
    return db.prepare('SELECT * FROM tools_history WHERE tool_type = ? ORDER BY created_at DESC LIMIT ?')
      .all(toolType, limit);
  }
  return db.prepare('SELECT * FROM tools_history ORDER BY created_at DESC LIMIT ?').all(limit);
}

// Initialize on module load
initDatabase();

module.exports = {
  db,
  getSetting,
  setSetting,
  getAllSettings,
  getSessions,
  getSession,
  createSession,
  updateSessionTitle,
  deleteSession,
  clearAllSessions,
  getSessionMessages,
  addMessage,
  deleteMessage,
  logToolHistory,
  getToolHistory
};
