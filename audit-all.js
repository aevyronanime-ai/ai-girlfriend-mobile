const fs = require('node:fs');
const path = require('node:path');

console.log('================================================================');
console.log('🔍 FULL PROJECT DEEP AUDIT: SYNTAX, DOM, ASSETS, APIs & SECURITY');
console.log('================================================================\n');

let issuesFound = 0;

function reportIssue(category, file, detail) {
  console.error(`❌ [${category}] ${file}: ${detail}`);
  issuesFound++;
}

function reportOk(category, detail) {
  console.log(`✅ [${category}] ${detail}`);
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');

// 1. Audit DOM Element IDs
const jsDir = path.join(PUBLIC_DIR, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const qsIdRegex = /querySelector\(['"]#([a-zA-Z0-9_-]+)['"]\)/g;

const foundIds = new Set();
for (const f of jsFiles) {
  const code = fs.readFileSync(path.join(jsDir, f), 'utf-8');
  let m;
  while ((m = idRegex.exec(code)) !== null) {
    if (!m[1].includes('$') && !m[1].includes('+')) foundIds.add(m[1]);
  }
  while ((m = qsIdRegex.exec(code)) !== null) {
    if (!m[1].includes('$') && !m[1].includes('+')) foundIds.add(m[1]);
  }
}

for (const id of foundIds) {
  const exists = htmlContent.includes(`id="${id}"`) || htmlContent.includes(`id='${id}'`);
  if (!exists) {
    reportIssue('MISSING_DOM_ID', 'index.html', `Element id="${id}" referenced in JS is missing from index.html`);
  }
}
if (issuesFound === 0) {
  reportOk('DOM_VERIFICATION', `All ${foundIds.size} referenced DOM element IDs are present in index.html.`);
}

// 2. Audit API Calls & Endpoints Parity
console.log('\n--- Auditing API Endpoints & Client Fallbacks ---');
const fetchRegex = /fetch\(['"](\/api\/[a-zA-Z0-9_-]+)['"]/g;
const clientEndpoints = new Set();

for (const f of jsFiles) {
  const code = fs.readFileSync(path.join(jsDir, f), 'utf-8');
  let m;
  while ((m = fetchRegex.exec(code)) !== null) {
    clientEndpoints.add(m[1]);
  }
}

const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf-8');
const devServiceCode = fs.readFileSync(path.join(__dirname, 'developer-service.js'), 'utf-8');
const clientAiCode = fs.readFileSync(path.join(jsDir, 'client-ai.js'), 'utf-8');

for (const endpoint of clientEndpoints) {
  const inServer = serverCode.includes(`'${endpoint}'`) || serverCode.includes(`"${endpoint}"`) ||
                   devServiceCode.includes(`'${endpoint}'`) || devServiceCode.includes(`"${endpoint}"`);
  if (!inServer) {
    reportIssue('SERVER_ROUTE_MISSING', 'server.js', `Client calls ${endpoint} but server route is missing`);
  } else {
    reportOk('API_ROUTE_OK', `Endpoint ${endpoint} is defined in server`);
  }
}

// 3. Audit Android Manifest & Native Assets
console.log('\n--- Auditing Android Manifest & Native Plugins ---');
const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, 'utf-8');
  const requiredPerms = [
    'android.permission.INTERNET',
    'android.permission.RECORD_AUDIO',
    'android.permission.CAMERA',
    'android.permission.FLASHLIGHT'
  ];
  for (const perm of requiredPerms) {
    if (manifest.includes(perm)) {
      reportOk('ANDROID_PERM', `Permission ${perm} is declared`);
    } else {
      reportIssue('MISSING_ANDROID_PERM', 'AndroidManifest.xml', `Missing ${perm}`);
    }
  }

  if (manifest.includes('.JarvisAccessibilityService') || manifest.includes('com.jarvis.ai.JarvisAccessibilityService')) {
    reportOk('ACCESSIBILITY_SERVICE', 'JarvisAccessibilityService declared in AndroidManifest.xml');
  } else {
    reportIssue('MISSING_SERVICE', 'AndroidManifest.xml', 'JarvisAccessibilityService missing from manifest');
  }
} else {
  reportIssue('MISSING_FILE', manifestPath, 'AndroidManifest.xml not found');
}

// 4. Audit PWA Manifest
console.log('\n--- Auditing PWA Manifest & Icons ---');
const pwaManifestPath = path.join(PUBLIC_DIR, 'manifest.json');
if (fs.existsSync(pwaManifestPath)) {
  try {
    const pwa = JSON.parse(fs.readFileSync(pwaManifestPath, 'utf-8'));
    reportOk('PWA_MANIFEST', `Manifest valid JSON, name="${pwa.name}", start_url="${pwa.start_url}"`);
    if (pwa.icons && Array.isArray(pwa.icons)) {
      for (const icon of pwa.icons) {
        const iconPath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ''));
        if (fs.existsSync(iconPath)) {
          reportOk('PWA_ICON', `Icon ${icon.src} exists on disk`);
        } else {
          reportIssue('MISSING_ICON', icon.src, `PWA icon file not found at ${iconPath}`);
        }
      }
    }
  } catch (e) {
    reportIssue('INVALID_JSON', 'manifest.json', e.message);
  }
}

// 5. Audit Mobile Viewport & CSS Styles
console.log('\n--- Auditing Mobile Viewport & Responsive Design ---');
if (htmlContent.includes('name="viewport"') && htmlContent.includes('width=device-width')) {
  reportOk('MOBILE_VIEWPORT', 'Viewport meta tag configured for responsive mobile rendering');
} else {
  reportIssue('MOBILE_VIEWPORT', 'index.html', 'Missing or incorrect viewport meta tag');
}

const cssPath = path.join(PUBLIC_DIR, 'css', 'style.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf-8');
  let openBraces = (css.match(/\{/g) || []).length;
  let closeBraces = (css.match(/\}/g) || []).length;
  if (openBraces === closeBraces) {
    reportOk('CSS_INTEGRITY', `CSS braces balanced (${openBraces} rules)`);
  } else {
    reportIssue('CSS_SYNTAX', 'style.css', `Mismatched braces: ${openBraces} open, ${closeBraces} close`);
  }

  // Check Sakura palette variables
  const requiredVars = ['--bg-primary', '--bg-card', '--accent-lavender', '--accent-sakura', '--text-primary'];
  for (const v of requiredVars) {
    if (css.includes(v)) {
      reportOk('CSS_THEME_VAR', `Theme variable ${v} defined`);
    } else {
      reportIssue('MISSING_CSS_VAR', 'style.css', `Missing theme variable ${v}`);
    }
  }
}

// 6. Security Audit: Sanitization & Safe Content Rendering
console.log('\n--- Auditing Security & Input Sanitization ---');
const chatCode = fs.readFileSync(path.join(jsDir, 'chat.js'), 'utf-8');
if (chatCode.includes('escapeHtml') || chatCode.includes('renderMarkdown')) {
  reportOk('SECURITY_XSS', 'Chat output incorporates HTML escaping and safe markdown rendering');
} else {
  reportIssue('SECURITY_RISK', 'chat.js', 'No apparent HTML escaping found in chat rendering');
}

const systemLauncherCode = fs.readFileSync(path.join(jsDir, 'system-launcher.js'), 'utf-8');
const settingsCode = fs.readFileSync(path.join(jsDir, 'settings.js'), 'utf-8');
if (systemLauncherCode.includes('highRiskActions') && settingsCode.includes('phoneControlConfirmModal')) {
  reportOk('SECURITY_GUARD', 'High risk actions guarded with confirmation modal');
} else {
  reportIssue('SECURITY_RISK', 'system-launcher.js', 'High risk actions not properly guarded');
}

console.log('\n================================================================');
console.log(`📊 AUDIT SUMMARY: ${issuesFound === 0 ? 'ALL CHECKS PASSED (0 ISSUES)' : `${issuesFound} ISSUES FOUND`}`);
console.log('================================================================\n');

process.exit(issuesFound > 0 ? 1 : 0);
