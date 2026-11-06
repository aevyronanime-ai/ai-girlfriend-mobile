// Frontend DOM Verification & JavaScript Syntax Checker for JARVIS AI
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PUBLIC_DIR = path.join(__dirname, 'public');
const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');

console.log('====================================================');
console.log('🧪 TESTING FRONTEND DOM BINDINGS & JAVASCRIPT SYNTAX');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} - ${detail}`);
    failed++;
  }
}

// 1. Verify all JS files compile cleanly with no syntax errors
const jsFiles = [
  'audio-fx.js',
  'system-launcher.js',
  'orb.js',
  'voice.js',
  'chat.js',
  'tools.js',
  'history.js',
  'settings.js',
  'app.js'
];

for (const jsFile of jsFiles) {
  const code = fs.readFileSync(path.join(PUBLIC_DIR, 'js', jsFile), 'utf-8');
  try {
    // Check syntax with Node VM
    new vm.Script(code);
    assert(true, `Syntax valid: ${jsFile}`);
  } catch (err) {
    assert(false, `Syntax check for ${jsFile}`, err.message);
  }
}

// 2. Extract all document.getElementById calls from all JS files
const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const requiredIds = new Set();

for (const jsFile of jsFiles) {
  const code = fs.readFileSync(path.join(PUBLIC_DIR, 'js', jsFile), 'utf-8');
  let match;
  while ((match = idRegex.exec(code)) !== null) {
    if (!match[1].includes('$')) {
      requiredIds.add(match[1]);
    }
  }
}

console.log(`\nFound ${requiredIds.size} unique DOM element IDs referenced in JS files.\n`);

// 3. Verify every referenced ID exists in index.html
for (const id of Array.from(requiredIds).sort()) {
  const exists = htmlContent.includes(`id="${id}"`) || htmlContent.includes(`id='${id}'`);
  assert(exists, `HTML has element id="${id}"`);
}

// 4. Verify all navigation tabs exist
const expectedTabs = ['chat', 'voice', 'image', 'writer', 'translator', 'doc', 'history', 'settings'];
for (const tab of expectedTabs) {
  const paneExists = htmlContent.includes(`id="tab-${tab}"`);
  const navLinkExists = htmlContent.includes(`data-tab="${tab}"`);
  assert(paneExists, `Tab pane section #tab-${tab} exists`);
  assert(navLinkExists, `Navigation link for data-tab="${tab}" exists`);
}

// 5. Verify PWA Manifest & Service Worker references in index.html
assert(htmlContent.includes('rel="manifest" href="/manifest.json"'), 'index.html links to manifest.json');
assert(htmlContent.includes('/icons/icon.svg'), 'index.html links to icon.svg');

console.log('\n====================================================');
console.log(`📊 FRONTEND TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log('====================================================\n');

process.exit(failed > 0 ? 1 : 0);
