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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      permissions TEXT DEFAULT '{}',
      two_factor_secret TEXT DEFAULT '',
      two_factor_enabled INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      username TEXT NOT NULL,
      success INTEGER NOT NULL,
      attempt_time INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_tools_type ON tools_history(tool_type);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON admin_audit_logs(created_at);
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

// ============================================================================
// RBAC USER, AUTH SESSION & SECURITY AUDIT HELPERS
// ============================================================================

// User Management
function createUser({ id, username, displayName, passwordHash, salt, role = 'user', permissions = {} }) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, salt, role, permissions, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, username.toLowerCase().trim(), displayName, passwordHash, salt, role, JSON.stringify(permissions), now, now);
  return getUserById(id);
}

function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return null;
  return { ...user, permissions: JSON.parse(user.permissions || '{}') };
}

function getUserByUsername(username) {
  if (!username) return null;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
  if (!user) return null;
  return { ...user, permissions: JSON.parse(user.permissions || '{}') };
}

function getAllUsers() {
  const users = db.prepare('SELECT id, username, display_name, role, permissions, two_factor_enabled, status, created_at, updated_at FROM users ORDER BY created_at ASC').all();
  return users.map(u => ({ ...u, permissions: JSON.parse(u.permissions || '{}') }));
}

function updateUserRole(userId, newRole) {
  const target = getUserById(userId);
  if (!target) throw new Error('User not found');
  if (target.role === 'super_admin' && newRole !== 'super_admin') {
    throw new Error('Super Admin owner role cannot be demoted or changed');
  }
  const now = Date.now();
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(newRole, now, userId);
  // Invalidate existing sessions so the new role takes immediate effect
  deleteUserAuthSessions(userId);
  return getUserById(userId);
}

function updateUserPermissions(userId, permissions) {
  const target = getUserById(userId);
  if (!target) throw new Error('User not found');
  const now = Date.now();
  db.prepare('UPDATE users SET permissions = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(permissions), now, userId);
  return getUserById(userId);
}

function updateUserPassword(userId, passwordHash, salt) {
  const now = Date.now();
  db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
    .run(passwordHash, salt, now, userId);
  deleteUserAuthSessions(userId);
}

function updateUserStatus(userId, status) {
  const target = getUserById(userId);
  if (!target) throw new Error('User not found');
  if (target.role === 'super_admin') {
    throw new Error('Super Admin owner account cannot be suspended or revoked');
  }
  const now = Date.now();
  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, userId);
  if (status !== 'active') {
    deleteUserAuthSessions(userId);
  }
  return getUserById(userId);
}

function deleteUser(userId) {
  const target = getUserById(userId);
  if (!target) throw new Error('User not found');
  if (target.role === 'super_admin') {
    throw new Error('Super Admin owner account cannot be deleted');
  }
  deleteUserAuthSessions(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

// Auth Sessions
function createAuthSession(token, userId, ipAddress = '', userAgent = '', durationMs = 7 * 24 * 3600 * 1000) {
  const now = Date.now();
  const expiresAt = now + durationMs;
  db.prepare('INSERT INTO auth_sessions (token, user_id, ip_address, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(token, userId, ipAddress, userAgent, expiresAt, now);
  return { token, userId, expiresAt };
}

function getAuthSession(token) {
  if (!token) return null;
  const session = db.prepare('SELECT * FROM auth_sessions WHERE token = ?').get(token);
  if (!session) return null;
  if (Date.now() > session.expires_at) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    return null;
  }
  return session;
}

function deleteAuthSession(token) {
  db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
}

function deleteUserAuthSessions(userId) {
  db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(userId);
}

// Login Attempt Protection
function recordLoginAttempt(ipAddress, username, success) {
  const now = Date.now();
  const id = 'att_' + now + '_' + Math.random().toString(36).slice(2, 6);
  db.prepare('INSERT INTO login_attempts (id, ip_address, username, success, attempt_time) VALUES (?, ?, ?, ?, ?)')
    .run(id, ipAddress, username, success ? 1 : 0, now);
}

function getRecentFailedAttempts(ipAddress, username, windowMs = 15 * 60 * 1000) {
  const since = Date.now() - windowMs;
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM login_attempts 
    WHERE (ip_address = ? OR username = ?) AND success = 0 AND attempt_time > ?
  `).get(ipAddress, username, since);
  return row ? row.count : 0;
}

// Audit Logging
function logAuditAction(userId, username, action, details = '', ipAddress = '') {
  const now = Date.now();
  const id = 'aud_' + now + '_' + Math.random().toString(36).slice(2, 6);
  db.prepare('INSERT INTO admin_audit_logs (id, user_id, username, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, username, action, typeof details === 'object' ? JSON.stringify(details) : String(details), ipAddress, now);
}

function getAuditLogs(limit = 50) {
  return db.prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
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
  getToolHistory,
  // User Management
  createUser,
  getUserById,
  getUserByUsername,
  getAllUsers,
  updateUserRole,
  updateUserPermissions,
  updateUserPassword,
  updateUserStatus,
  deleteUser,
  // Auth Sessions
  createAuthSession,
  getAuthSession,
  deleteAuthSession,
  deleteUserAuthSessions,
  // Login Protection & Auditing
  recordLoginAttempt,
  getRecentFailedAttempts,
  logAuditAction,
  getAuditLogs
};
