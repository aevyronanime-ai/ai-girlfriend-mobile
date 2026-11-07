// AI Girlfriend Mobile / JARVIS AI Database Module
// Re-exports the unified SQLite database manager from db.js to preserve compatibility
// and prevent missing-file errors across external tools and agents.

const db = require('./db.js');

module.exports = db;
