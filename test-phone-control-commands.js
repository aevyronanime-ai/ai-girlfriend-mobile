const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
  }
}

// Setup simulated Browser environment
const mockStorage = {};
const globalMock = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  JSON: JSON,
  encodeURIComponent: encodeURIComponent,
  localStorage: {
    getItem: (k) => (k in mockStorage ? mockStorage[k] : null),
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  },
  window: {
    open: (url) => { globalMock.window._lastOpenedUrl = url; },
    confirm: (msg) => true,
    _lastOpenedUrl: null,
    _mockAccessibilityServiceEnabled: true,
    app: {
      showToast: (msg) => { globalMock.window._lastToast = msg; }
    },
    voiceAssistant: {
      speak: (text) => { globalMock.window._lastSpoken = text; }
    }
  }
};
globalMock.window.localStorage = globalMock.localStorage;

const systemLauncherCode = fs.readFileSync(path.join(__dirname, 'public/js/system-launcher.js'), 'utf8');
vm.runInNewContext(systemLauncherCode, globalMock);
const launcher = globalMock.window.systemLauncher;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING PHONE CONTROL & ACCESSIBILITY AUTOMATION');
  console.log('====================================================');

  // Test 1: YouTube Search via Intent
  const ytRes = await launcher.openYouTube('Hindi romantic songs');
  assert(ytRes && ytRes.success, 'openYouTube launches successfully');
  assert(globalMock.window._lastOpenedUrl && globalMock.window._lastOpenedUrl.includes('results?search_query='), 'openYouTube formats search URL correctly');

  // Test 2: Chrome Search Intent
  const gRes = await launcher.searchGoogle('Narendra Modi latest news');
  assert(gRes && gRes.success, 'searchGoogle executes successfully');
  assert(globalMock.window._lastOpenedUrl && globalMock.window._lastOpenedUrl.includes('google.com/search?q='), 'searchGoogle formats Google URL correctly');

  // Test 3: WhatsApp Intent
  const waRes = await launcher.openWhatsApp({ phone: '+919876543210', text: 'Namaste! J.A.R.V.I.S. here' });
  assert(waRes && waRes.success, 'openWhatsApp launches successfully');
  assert(globalMock.window._lastOpenedUrl && globalMock.window._lastOpenedUrl.includes('api.whatsapp.com'), 'openWhatsApp formats API URL correctly');

  // Test 4: Camera & Torch
  const camRes = await launcher.openCamera();
  assert(camRes && camRes.success, 'openCamera succeeds');
  const torchRes = await launcher.toggleTorch(true);
  assert(torchRes && torchRes.success && torchRes.enabled === true, 'toggleTorch turns ON');

  // Test 5: executeStructuredCommand - Intent Action Announcement
  globalMock.window._lastSpoken = null;
  const cmdRes = await launcher.executeStructuredCommand({
    action: 'open_app',
    target: 'whatsapp',
    spokenText: 'व्हाट्सएप खोला जा रहा है...'
  });
  assert(cmdRes && cmdRes.success, 'executeStructuredCommand executes open_app: whatsapp');
  assert(globalMock.window._lastSpoken === 'व्हाट्सएप खोला जा रहा है...', 'executeStructuredCommand announces spokenText');

  // Test 6: executeStructuredCommand - Accessibility gesture simulation
  const backRes = await launcher.executeStructuredCommand({ action: 'back' });
  assert(backRes && backRes.success, 'executeStructuredCommand executes accessibility action: back');

  const scrollRes = await launcher.executeStructuredCommand({ action: 'scroll_down' });
  assert(scrollRes && scrollRes.success, 'executeStructuredCommand executes accessibility action: scroll_down');

  // Test 7: High-Risk Action Guard: User Confirmation Rejection
  globalMock.window.confirmPhoneControlAction = async (prompt) => false; // User clicks NO
  const deleteRes = await launcher.executeStructuredCommand({
    action: 'delete_file',
    target: 'photo.jpg',
    confirmationRequired: true
  });
  assert(deleteRes && deleteRes.cancelled === true, 'High-risk action cancelled when user rejects confirmation');

  // Test 8: High-Risk Action Guard: User Confirmation Approval
  globalMock.window.confirmPhoneControlAction = async (prompt) => true; // User clicks YES
  const callRes = await launcher.executeStructuredCommand({
    action: 'call',
    target: '100',
    confirmationRequired: true
  });
  assert(callRes && !callRes.cancelled, 'High-risk action proceeds when user confirms');

  // Test 9: Audit Logs Persistence
  const logs = launcher.getAuditLogs();
  assert(Array.isArray(logs) && logs.length >= 5, `Audit logs correctly persisted in localStorage (total: ${logs.length})`);
  const cancelledLog = logs.find(l => l.status === 'CANCELLED');
  assert(cancelledLog && cancelledLog.action === 'delete_file', 'Audit log records CANCELLED status for rejected high-risk action');

  // Test 10: Clear Audit Logs
  launcher.clearAuditLogs();
  assert(launcher.getAuditLogs().length === 0, 'clearAuditLogs removes all stored logs');

  console.log('====================================================');
  console.log(`📊 PHONE CONTROL TEST SUMMARY: ${passedTests} PASSED | ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) process.exit(1);
}

runTests();
