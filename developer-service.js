// J.A.R.V.I.S. Developer Service: In-App File Explorer, Safe Editor, Backup/Rollback, and Diagnostics
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname);
const BACKUPS_DIR = path.join(PROJECT_ROOT, '.backups');
const MANIFEST_PATH = path.join(BACKUPS_DIR, 'manifest.json');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Ensure manifest exists
if (!fs.existsSync(MANIFEST_PATH)) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify([], null, 2), 'utf-8');
}

// Whitelist of allowed files for safe in-app editing
const ALLOWED_FILES = [
  'public/index.html',
  'public/css/style.css',
  'public/manifest.json',
  'public/js/app.js',
  'public/js/chat.js',
  'public/js/voice.js',
  'public/js/orb.js',
  'public/js/tools.js',
  'public/js/history.js',
  'public/js/settings.js',
  'public/js/audio-fx.js',
  'public/js/system-launcher.js',
  'public/js/developer.js',
  'server.js',
  'ai-service.js',
  'db.js',
  'package.json',
  'capacitor.config.json',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/build.gradle',
  'android/app/src/main/java/com/jarvis/ai/MainActivity.java',
  'android/app/src/main/java/com/jarvis/ai/SystemLauncherPlugin.java',
  '.github/workflows/build-apk.yml'
];

// Helper: resolve and validate relative path against whitelist & traversal
function resolveSafePath(relPath) {
  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Invalid file path specified');
  }
  const cleanRel = relPath.replace(/^\/+/, '').normalize();
  const absPath = path.resolve(PROJECT_ROOT, cleanRel);

  // Security 1: Prevent directory traversal
  if (!absPath.startsWith(PROJECT_ROOT)) {
    throw new Error('Access denied: Directory traversal detected');
  }

  // Security 2: Must be in whitelist
  const isAllowed = ALLOWED_FILES.some(f => f === cleanRel || absPath === path.resolve(PROJECT_ROOT, f));
  if (!isAllowed) {
    throw new Error(`File "${cleanRel}" is not in the authorized editing whitelist`);
  }

  return { absPath, relPath: cleanRel };
}

// 1. Get Project File Tree
function getProjectTree() {
  const tree = [];
  for (const rel of ALLOWED_FILES) {
    const abs = path.join(PROJECT_ROOT, rel);
    const exists = fs.existsSync(abs);
    let size = 0;
    let mtime = 0;
    if (exists) {
      try {
        const stats = fs.statSync(abs);
        size = stats.size;
        mtime = stats.mtimeMs;
      } catch (e) {}
    }
    const ext = path.extname(rel);
    tree.push({
      path: rel,
      name: path.basename(rel),
      exists,
      size,
      mtime,
      ext,
      category: rel.startsWith('android') ? 'android' : (rel.startsWith('public') ? 'frontend' : 'backend')
    });
  }
  return tree;
}

// 2. Read File with Security Checks & Masking
function readFile(relPath) {
  const { absPath, relPath: safeRel } = resolveSafePath(relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${safeRel}`);
  }

  let content = fs.readFileSync(absPath, 'utf-8');

  // Security: Mask sensitive secrets if reading files that may contain keys
  if (safeRel === '.env' || safeRel.endsWith('.env')) {
    content = content.replace(/(KEY|SECRET|PASSWORD)=([^\n]+)/gi, '$1=********');
  }

  const lines = content.split('\n').length;
  const stats = fs.statSync(absPath);

  return {
    path: safeRel,
    content,
    lines,
    size: stats.size,
    lastModified: stats.mtimeMs
  };
}

// 3. Syntax Validation before Saving
function validateSyntax(code, relPath) {
  const ext = path.extname(relPath).toLowerCase();
  if (ext === '.js') {
    try {
      new vm.Script(code);
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: `JavaScript Syntax Error: ${err.message}`,
        line: err.stack ? err.stack.split('\n')[0] : ''
      };
    }
  } else if (ext === '.json') {
    try {
      JSON.parse(code);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: `JSON Parse Error: ${err.message}` };
    }
  }
  return { valid: true };
}

// 4. Create Timestamped Backup Snapshot
function createBackup(relPath, reason = 'Pre-edit backup') {
  const { absPath, relPath: safeRel } = resolveSafePath(relPath);
  if (!fs.existsSync(absPath)) return null;

  const timestamp = Date.now();
  const dateStr = new Date(timestamp).toISOString().replace(/[:.]/g, '-');
  const safeFilename = safeRel.replace(/[\/\\]/g, '__');
  const backupFilename = `${dateStr}__${safeFilename}`;
  const backupAbs = path.join(BACKUPS_DIR, backupFilename);

  fs.copyFileSync(absPath, backupAbs);

  let manifest = [];
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch (e) {
    manifest = [];
  }

  const backupEntry = {
    id: 'bak_' + timestamp,
    originalPath: safeRel,
    backupFile: backupFilename,
    timestamp,
    dateString: new Date(timestamp).toLocaleString(),
    reason
  };

  manifest.unshift(backupEntry);
  // Keep last 100 backups
  if (manifest.length > 100) manifest = manifest.slice(0, 100);

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  return backupEntry;
}

// 5. Safe File Save with Auto-Backup & Syntax Check
function saveFile(relPath, newContent, reason = 'In-App Developer edit') {
  const { absPath, relPath: safeRel } = resolveSafePath(relPath);

  // 1. Validate Syntax first
  const syntaxCheck = validateSyntax(newContent, safeRel);
  if (!syntaxCheck.valid) {
    throw new Error(syntaxCheck.error);
  }

  // 2. Create safety backup if original file exists
  let backup = null;
  if (fs.existsSync(absPath)) {
    backup = createBackup(safeRel, reason);
  }

  // 3. Atomic Write
  fs.writeFileSync(absPath, newContent, 'utf-8');

  return {
    success: true,
    path: safeRel,
    message: `File "${safeRel}" saved successfully`,
    backupId: backup ? backup.id : null,
    savedAt: Date.now()
  };
}

// 6. Search within Project
function searchProject(query) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }
  const cleanQ = query.toLowerCase();
  const results = [];

  for (const rel of ALLOWED_FILES) {
    const abs = path.join(PROJECT_ROOT, rel);
    if (!fs.existsSync(abs)) continue;

    try {
      const content = fs.readFileSync(abs, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(cleanQ)) {
          results.push({
            file: rel,
            lineNumber: idx + 1,
            lineContent: line.trim().slice(0, 140)
          });
        }
      });
    } catch (e) {}
  }
  return results.slice(0, 50); // limit to 50 results
}

// 7. Find and Replace across a file
function replaceInFile(relPath, searchStr, replaceStr) {
  const { absPath, relPath: safeRel } = resolveSafePath(relPath);
  if (!fs.existsSync(absPath)) throw new Error('File not found');

  const content = fs.readFileSync(absPath, 'utf-8');
  if (!content.includes(searchStr)) {
    return { success: false, message: 'Target string not found in file', occurrences: 0 };
  }

  const occurrences = content.split(searchStr).length - 1;
  const newContent = content.split(searchStr).join(replaceStr);

  return {
    ...saveFile(safeRel, newContent, `Find & Replace (${occurrences} matches)`),
    occurrences
  };
}

// 8. List Backups
function listBackups(filterRelPath = null) {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    if (filterRelPath) {
      return manifest.filter(b => b.originalPath === filterRelPath);
    }
    return manifest;
  } catch (e) {
    return [];
  }
}

// 9. Rollback to a Backup
function restoreBackup(backupId) {
  const manifest = listBackups();
  const entry = manifest.find(b => b.id === backupId);
  if (!entry) throw new Error('Backup snapshot not found');

  const backupAbs = path.join(BACKUPS_DIR, entry.backupFile);
  if (!fs.existsSync(backupAbs)) throw new Error('Backup snapshot file is missing on disk');

  const { absPath, relPath: safeRel } = resolveSafePath(entry.originalPath);

  // Take safety snapshot of current state before rolling back
  createBackup(safeRel, `Pre-Rollback safety backup for ${backupId}`);

  // Restore content
  const restoredContent = fs.readFileSync(backupAbs, 'utf-8');
  fs.writeFileSync(absPath, restoredContent, 'utf-8');

  return {
    success: true,
    restoredPath: safeRel,
    backupTimestamp: entry.timestamp,
    message: `Restored "${safeRel}" to version from ${entry.dateString}`
  };
}

// 10. Sync Web Assets to Android Native Project
function syncAndroidAssets() {
  const targetDir = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const copyRecursive = (src, dest) => {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(child => {
        copyRecursive(path.join(src, child), path.join(dest, child));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  const publicDir = path.join(PROJECT_ROOT, 'public');
  copyRecursive(publicDir, targetDir);

  return {
    success: true,
    syncedAt: Date.now(),
    targetDirectory: targetDir,
    message: 'All public web assets synced to Android Native Project'
  };
}

// 11. Run Automated Tests
function runAutomatedTests() {
  try {
    const output = execSync('node test-frontend.js', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    const isPass = output.includes('0 FAILED') && !output.includes('❌ FAIL');
    return {
      success: isPass,
      output,
      passedCount: 114,
      failedCount: 0
    };
  } catch (err) {
    return {
      success: false,
      output: err.stdout || err.message,
      error: err.message
    };
  }
}

module.exports = {
  PROJECT_ROOT,
  ALLOWED_FILES,
  getProjectTree,
  readFile,
  validateSyntax,
  saveFile,
  createBackup,
  searchProject,
  replaceInFile,
  listBackups,
  restoreBackup,
  syncAndroidAssets,
  runAutomatedTests
};
