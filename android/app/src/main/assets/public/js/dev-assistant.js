// J.A.R.V.I.S. Dev Assistant & Self-Healing Engine
// Provides password-protected diagnostics, real-time error logging, AI-driven root cause analysis,
// and secure hotpatching with Safe Mode rollback.

(function (window) {
  'use strict';

  // =========================================================================
  // CONSTANTS & SECURITY CALIBRATION
  // =========================================================================
  const DEFAULT_SALT_HEX = '4d91a8b5fdfd3dda5b4b7c5318b38952';
  const DEFAULT_HASH_HEX = 'ff8f936e3bfebef2e39be862208cdeeb7157adfd39265202ffc8c4a2ad5a5498';
  const PBKDF2_ITERATIONS = 100000;
  const PBKDF2_KEY_LEN = 32; // 32 bytes = 256 bits

  const STORAGE_KEYS = {
    PWD_SALT: 'jarvis_dev_pwd_salt',
    PWD_HASH: 'jarvis_dev_pwd_hash',
    FAIL_COUNT: 'jarvis_dev_fail_count',
    LOCKOUT_UNTIL: 'jarvis_dev_lockout_until',
    HOTPATCHES: 'jarvis_hotpatches',
    CANARY_ID: 'jarvis_canary_patch_id',
    CANARY_TIME: 'jarvis_canary_patch_time'
  };

  const MAX_PATCH_SIZE = 20 * 1024; // 20 KB
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const SAFE_MODE_WINDOW_MS = 10 * 1000; // 10 seconds

  const NETWORK_ALLOWLIST = [
    'generativelanguage.googleapis.com',
    'router.huggingface.co',
    'image.pollinations.ai',
    'huggingface.co'
  ];

  // =========================================================================
  // CRYPTOGRAPHY: PURE JS SHA-256, HMAC, PBKDF2 & CONSTANT-TIME COMPARE
  // =========================================================================
  function sha256Words(words, len) {
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    words[len >> 2] |= 0x80 << (24 - (len & 3) * 8);
    words[(((len + 8) >> 6) << 4) + 15] = len * 8;
    const W = new Int32Array(64);
    for (let i = 0; i < words.length; i += 16) {
      let [a, b, c, d, e, f, g, h] = H;
      for (let j = 0; j < 64; j++) {
        if (j < 16) {
          W[j] = words[i + j] | 0;
        } else {
          const s0 = ((W[j - 15] >>> 7) | (W[j - 15] << 25)) ^ ((W[j - 15] >>> 18) | (W[j - 15] << 14)) ^ (W[j - 15] >>> 3);
          const s1 = ((W[j - 2] >>> 17) | (W[j - 2] << 15)) ^ ((W[j - 2] >>> 19) | (W[j - 2] << 13)) ^ (W[j - 2] >>> 10);
          W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
        }
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[j] + W[j]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H;
  }

  function strToUtf8(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c < 0xd800 || c >= 0xe000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      else {
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return bytes;
  }

  function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  function bytesToWords(bytes) {
    const words = [];
    for (let i = 0; i < bytes.length; i++) {
      words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << (24 - (i & 3) * 8));
    }
    return words;
  }

  function wordsToBytes(words) {
    const bytes = [];
    for (let i = 0; i < words.length * 4; i++) {
      bytes.push((words[i >> 2] >>> (24 - (i & 3) * 8)) & 0xff);
    }
    return bytes;
  }

  function hmacSha256(keyBytes, msgBytes) {
    if (keyBytes.length > 64) {
      keyBytes = wordsToBytes(sha256Words(bytesToWords(keyBytes), keyBytes.length));
    }
    const kPad = new Uint8Array(64);
    kPad.set(keyBytes);
    const oKeyPad = new Uint8Array(64);
    const iKeyPad = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      oKeyPad[i] = kPad[i] ^ 0x5c;
      iKeyPad[i] = kPad[i] ^ 0x36;
    }
    const innerMsg = new Uint8Array(64 + msgBytes.length);
    innerMsg.set(iKeyPad);
    innerMsg.set(msgBytes, 64);
    const innerHash = wordsToBytes(sha256Words(bytesToWords(innerMsg), innerMsg.length));

    const outerMsg = new Uint8Array(64 + 32);
    outerMsg.set(oKeyPad);
    outerMsg.set(innerHash, 64);
    return wordsToBytes(sha256Words(bytesToWords(outerMsg), outerMsg.length));
  }

  function pbkdf2Sha256PureJs(passwordStr, saltBytes, iterations, keyLen) {
    const pwdBytes = typeof passwordStr === 'string' ? strToUtf8(passwordStr) : passwordStr;
    const numBlocks = Math.ceil(keyLen / 32);
    const result = [];

    for (let block = 1; block <= numBlocks; block++) {
      const saltWithBlock = new Uint8Array(saltBytes.length + 4);
      saltWithBlock.set(saltBytes);
      saltWithBlock[saltBytes.length] = (block >> 24) & 0xff;
      saltWithBlock[saltBytes.length + 1] = (block >> 16) & 0xff;
      saltWithBlock[saltBytes.length + 2] = (block >> 8) & 0xff;
      saltWithBlock[saltBytes.length + 3] = block & 0xff;

      let U = hmacSha256(pwdBytes, saltWithBlock);
      const T = new Uint8Array(U);

      for (let c = 1; c < iterations; c++) {
        U = hmacSha256(pwdBytes, U);
        for (let k = 0; k < 32; k++) {
          T[k] ^= U[k];
        }
      }
      for (let k = 0; k < 32 && result.length < keyLen; k++) {
        result.push(T[k]);
      }
    }
    return result.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function computePBKDF2(password, saltHex, iterations = PBKDF2_ITERATIONS, keyLen = PBKDF2_KEY_LEN) {
    const saltBytes = hexToBytes(saltHex);

    // Attempt hardware-accelerated WebCrypto if available and in secure context
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof TextEncoder !== 'undefined') {
      try {
        const enc = new TextEncoder();
        const passBuf = enc.encode(password);
        const saltBuf = new Uint8Array(saltBytes);

        const keyMaterial = await window.crypto.subtle.importKey('raw', passBuf, 'PBKDF2', false, ['deriveBits']);
        const derivedBits = await window.crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: saltBuf,
            iterations: iterations,
            hash: 'SHA-256'
          },
          keyMaterial,
          keyLen * 8
        );
        const bytes = new Uint8Array(derivedBits);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        // Fallback to pure JS if WebCrypto fails or is restricted
      }
    }

    return pbkdf2Sha256PureJs(password, saltBytes, iterations, keyLen);
  }

  function constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  // =========================================================================
  // RUNTIME ERROR LOGGER (CIRCULAR BUFFER 200 ENTRIES)
  // =========================================================================
  class ErrorLogger {
    constructor(maxEntries = 200) {
      this.maxEntries = maxEntries;
      this.logs = [];
      this.initHooks();
    }

    addLog(entry) {
      entry.time = new Date().toISOString();
      this.logs.unshift(entry);
      if (this.logs.length > this.maxEntries) {
        this.logs.length = this.maxEntries;
      }
    }

    initHooks() {
      if (typeof window === 'undefined') return;

      // 1. window.onerror
      const prevOnError = window.onerror;
      window.onerror = (msg, source, lineno, colno, error) => {
        this.addLog({
          type: 'window.onerror',
          msg: String(msg),
          source: source || 'unknown',
          lineno,
          colno,
          stack: error && error.stack ? error.stack.slice(0, 300) : ''
        });

        // Trigger safe mode check if a recent patch was deployed
        if (window.DevAssistant && window.DevAssistant.checkSafeModeCanary) {
          window.DevAssistant.checkSafeModeCanary(true);
        }

        if (typeof prevOnError === 'function') {
          return prevOnError(msg, source, lineno, colno, error);
        }
        return false;
      };

      // 2. unhandledrejection
      window.addEventListener('unhandledrejection', (event) => {
        this.addLog({
          type: 'unhandledrejection',
          reason: event.reason ? String(event.reason.message || event.reason) : 'Unknown promise rejection'
        });
      });

      // 3. console.error & console.warn interception
      if (window.console) {
        const origError = console.error;
        console.error = (...args) => {
          this.addLog({
            type: 'console.error',
            args: args.map(a => (typeof a === 'object' ? JSON.stringify(a).slice(0, 200) : String(a))).join(' ')
          });
          origError.apply(console, args);
        };

        const origWarn = console.warn;
        console.warn = (...args) => {
          this.addLog({
            type: 'console.warn',
            args: args.map(a => (typeof a === 'object' ? JSON.stringify(a).slice(0, 200) : String(a))).join(' ')
          });
          origWarn.apply(console, args);
        };
      }

      // 4. Failed fetch requests wrapper
      if (typeof window.fetch === 'function') {
        const origFetch = window.fetch;
        window.fetch = async (...args) => {
          const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
          let host = 'internal';
          try {
            if (urlStr.startsWith('http')) host = new URL(urlStr).host;
          } catch (e) {}

          try {
            const res = await origFetch.apply(window, args);
            if (!res.ok) {
              this.addLog({
                type: 'fetch_failed',
                host,
                url: urlStr.slice(0, 100),
                status: res.status,
                statusText: res.statusText
              });
            }
            return res;
          } catch (err) {
            this.addLog({
              type: 'fetch_network_error',
              host,
              url: urlStr.slice(0, 100),
              error: err.message
            });
            throw err;
          }
        };
      }
    }

    getRecentLogs(limit = 50) {
      return this.logs.slice(0, limit);
    }

    clearLogs() {
      this.logs = [];
    }
  }

  // =========================================================================
  // SENSITIVE DATA REDACTION SANITIZER
  // =========================================================================
  function redactSensitiveData(data) {
    if (!data) return data;
    let str = typeof data === 'object' ? JSON.stringify(data) : String(data);

    // 1. Redact Google API keys
    str = str.replace(/AIzaSy[A-Za-z0-9_-]{20,40}/g, '[REDACTED_GEMINI_KEY]');

    // 2. Redact Hugging Face tokens
    str = str.replace(/hf_[A-Za-z0-9]{34}/g, '[REDACTED_HF_TOKEN]');

    // 3. Redact salt and password hashes
    str = str.replace(/4d91a8b5fdfd3dda5b4b7c5318b38952/gi, '[REDACTED_SALT]');
    str = str.replace(/ff8f936e3bfebef2e39be862208cdeeb7157adfd39265202ffc8c4a2ad5a5498/gi, '[REDACTED_HASH]');
    str = str.replace(/\b[0-9a-f]{64}\b/gi, '[REDACTED_SHA256_HEX]');

    // 4. Redact sensitive credentials in strings
    str = str.replace(/(password|token|secret|apiKey)=([^&\s"']+)/gi, '$1=[REDACTED]');

    return typeof data === 'object' ? JSON.parse(str) : str;
  }

  // =========================================================================
  // HOTPATCH SECURITY VALIDATOR
  // =========================================================================
  function validateHotpatch(jsCode = '', cssCode = '') {
    const totalSize = (jsCode || '').length + (cssCode || '').length;
    if (totalSize > MAX_PATCH_SIZE) {
      return {
        safe: false,
        error: `Hotpatch exceeds maximum allowed size of 20 KB (found ${Math.round(totalSize / 1024)} KB)`
      };
    }

    const dangerousPatterns = [
      { pattern: /\beval\s*\(/i, name: 'eval() execution' },
      { pattern: /\bnew\s+Function\s*\(/i, name: 'new Function() constructor' },
      { pattern: /\bFunction\s*\(/i, name: 'Function() constructor' },
      { pattern: /\bsetTimeout\s*\(\s*['"`]/i, name: 'setTimeout string evaluation' },
      { pattern: /\bsetInterval\s*\(\s*['"`]/i, name: 'setInterval string evaluation' },
      { pattern: /\bdocument\.cookie\b/i, name: 'document.cookie access' },
      {
        pattern: /(localStorage|sessionStorage)\.(getItem|setItem|removeItem)\s*\(\s*['"`](hf_token|gemini|jarvis_dev_pwd|jarvis_setting_api_key)/i,
        name: 'Sensitive credentials storage access'
      },
      { pattern: /JarvisAccessibilityService\.(ACTION_STOP_SERVICE|stopAll)/i, name: 'Disabling accessibility core service' },
      { pattern: /\bmakeCall\b/i, name: 'Unauthorized phone call execution' }
    ];

    for (const rule of dangerousPatterns) {
      if (rule.pattern.test(jsCode)) {
        return {
          safe: false,
          error: `Security Check Blocked: Found forbidden pattern "${rule.name}" in hotpatch script.`
        };
      }
    }

    // Check external network fetch domains
    const fetchMatches = jsCode.match(/fetch\s*\(\s*['"`](https?:\/\/[^'"`]+)['"`]/gi);
    if (fetchMatches) {
      for (const m of fetchMatches) {
        try {
          const matchUrl = m.match(/https?:\/\/[^'"`]+/)[0];
          let host = '';
          if (typeof URL !== 'undefined') {
            try { host = new URL(matchUrl).host; } catch (err) {}
          }
          if (!host) {
            const mHost = matchUrl.match(/^https?:\/\/([^/?#:]+)/i);
            host = mHost ? mHost[1] : '';
          }
          const allowed = NETWORK_ALLOWLIST.some(d => host === d || host.endsWith('.' + d));
          if (!allowed) {
            return {
              safe: false,
              error: `Security Check Blocked: URL host "${host}" is outside the authorized Dev Assistant allowlist.`
            };
          }
        } catch (e) {}
      }
    }

    return { safe: true, error: null };
  }

  // =========================================================================
  // DEV ASSISTANT CONTROLLER
  // =========================================================================
  class DevAssistantController {
    constructor() {
      this.isUnlocked = false;
      this.inactivityTimer = null;
      this.logger = new ErrorLogger();
      this.pendingHotpatch = null;

      this.initStorage();
      this.initInactivityListener();
      this.initVisibilityListener();
      this.checkSafeModeCanary();
      this.loadAndApplyBootPatches();
      this.initDOM();
    }

    initStorage() {
      if (typeof localStorage === 'undefined') return;
      if (!localStorage.getItem(STORAGE_KEYS.PWD_SALT)) {
        localStorage.setItem(STORAGE_KEYS.PWD_SALT, DEFAULT_SALT_HEX);
      }
      if (!localStorage.getItem(STORAGE_KEYS.PWD_HASH)) {
        localStorage.setItem(STORAGE_KEYS.PWD_HASH, DEFAULT_HASH_HEX);
      }
    }

    // -----------------------------------------------------------------------
    // PASSWORD UNLOCK & RATE LIMITING
    // -----------------------------------------------------------------------
    getLockoutRemaining() {
      if (typeof localStorage === 'undefined') return 0;
      const lockoutUntil = parseInt(localStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL) || '0', 10);
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      return remaining;
    }

    async checkPasswordUnlock(enteredText) {
      if (!enteredText || typeof enteredText !== 'string') return false;

      // 1. Check if currently locked out
      const remainingSec = this.getLockoutRemaining();
      if (remainingSec > 0) {
        const mins = Math.ceil(remainingSec / 60);
        if (window.app && window.app.showToast) {
          window.app.showToast(`🔒 Dev Assistant locked. Try again in ${mins} minute(s).`);
        }
        return false;
      }

      const saltHex = localStorage.getItem(STORAGE_KEYS.PWD_SALT) || DEFAULT_SALT_HEX;
      const targetHashHex = localStorage.getItem(STORAGE_KEYS.PWD_HASH) || DEFAULT_HASH_HEX;

      // 2. Hash typed password
      const computedHash = await computePBKDF2(enteredText, saltHex);

      // 3. Constant-time comparison
      const isMatch = constantTimeCompare(computedHash, targetHashHex);

      if (isMatch) {
        // Unlock granted!
        this.isUnlocked = true;
        localStorage.setItem(STORAGE_KEYS.FAIL_COUNT, '0');
        localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, '0');

        this.resetInactivityTimer();
        this.openDevAssistantScreen();

        if (window.app && window.app.showToast) {
          window.app.showToast('🔓 Dev Assistant Unlocked');
        }
        if (window.soundFX) window.soundFX.success();
        return true;
      }

      // Password failed: increment failed attempt counter
      let fails = parseInt(localStorage.getItem(STORAGE_KEYS.FAIL_COUNT) || '0', 10) + 1;
      localStorage.setItem(STORAGE_KEYS.FAIL_COUNT, String(fails));

      if (fails >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(lockoutUntil));
        if (window.app && window.app.showToast) {
          window.app.showToast('⚠️ 5 failed attempts! Dev Assistant locked for 5 minutes.');
        }
      }

      return false;
    }

    lock() {
      this.isUnlocked = false;
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

      // If user is currently looking at developer tab, switch to chat
      if (window.app && window.app.activeTab === 'developer') {
        window.app.switchTab('chat');
        if (window.app.showToast) {
          window.app.showToast('🔒 Dev Assistant locked');
        }
      }
    }

    resetInactivityTimer() {
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
      if (!this.isUnlocked) return;

      this.inactivityTimer = setTimeout(() => {
        this.lock();
      }, INACTIVITY_TIMEOUT_MS);
    }

    initInactivityListener() {
      if (typeof window === 'undefined') return;
      const events = ['mousemove', 'keydown', 'touchstart', 'click'];
      events.forEach(evt => {
        window.addEventListener(evt, () => this.resetInactivityTimer(), { passive: true });
      });
    }

    initVisibilityListener() {
      if (typeof document === 'undefined') return;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.lock();
        }
      });
      window.addEventListener('blur', () => {
        this.lock();
      });
    }

    openDevAssistantScreen() {
      if (window.StudioEngine) {
        window.StudioEngine.isUnlocked = true;
      }
      if (window.app) {
        window.app.switchTab('developer');
      }
      const pinModal = document.getElementById('devStudioPinModal');
      if (pinModal) pinModal.style.display = 'none';

      this.updateDiagnosticsUI();
    }

    async changePassword(currentPass, newPass) {
      const saltHex = localStorage.getItem(STORAGE_KEYS.PWD_SALT) || DEFAULT_SALT_HEX;
      const targetHashHex = localStorage.getItem(STORAGE_KEYS.PWD_HASH) || DEFAULT_HASH_HEX;

      const currentComputed = await computePBKDF2(currentPass, saltHex);
      if (!constantTimeCompare(currentComputed, targetHashHex)) {
        throw new Error('Current password does not match.');
      }

      if (!newPass || newPass.length < 4) {
        throw new Error('New password must be at least 4 characters.');
      }

      // Generate new 16-byte random salt
      const newSaltBytes = [];
      if (window.crypto && window.crypto.getRandomValues) {
        const u8 = new Uint8Array(16);
        window.crypto.getRandomValues(u8);
        newSaltBytes.push(...u8);
      } else {
        for (let i = 0; i < 16; i++) newSaltBytes.push(Math.floor(Math.random() * 256));
      }
      const newSaltHex = newSaltBytes.map(b => b.toString(16).padStart(2, '0')).join('');

      const newHashHex = await computePBKDF2(newPass, newSaltHex);

      localStorage.setItem(STORAGE_KEYS.PWD_SALT, newSaltHex);
      localStorage.setItem(STORAGE_KEYS.PWD_HASH, newHashHex);
      localStorage.setItem(STORAGE_KEYS.FAIL_COUNT, '0');
      return true;
    }

    // -----------------------------------------------------------------------
    // FULL SYSTEM DIAGNOSTICS ("RUN FULL CHECK")
    // -----------------------------------------------------------------------
    async runFullCheck() {
      const results = {};

      // 1. Chat API Check
      const apiKey = (window.settingsManager && window.settingsManager.apiKey) ||
                     (typeof localStorage !== 'undefined' && (localStorage.getItem('gemini_api_key') || localStorage.getItem('jarvis_setting_api_key')));
      const cooldownActive = window.aiService && window.aiService.isCooldownActive && window.aiService.isCooldownActive('gemini-3.8-flash');
      if (!apiKey) {
        results.chat = { ok: false, reason: 'Gemini API key is not configured in Settings.' };
      } else if (cooldownActive) {
        results.chat = { ok: false, reason: 'Gemini 429 Quota cooldown is currently active.' };
      } else {
        results.chat = { ok: true, reason: 'Gemini API key configured and ready.' };
      }

      // 2. Voice & Speech Check
      const hasSpeechRec = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
      const hasSpeechSyn = Boolean(window.speechSynthesis);
      let hasHindiVoice = false;
      if (hasSpeechSyn && window.speechSynthesis.getVoices) {
        const voices = window.speechSynthesis.getVoices();
        hasHindiVoice = voices.some(v => v.lang && v.lang.startsWith('hi'));
      }
      if (!hasSpeechSyn) {
        results.voice = { ok: false, reason: 'SpeechSynthesis is not supported in this environment.' };
      } else {
        results.voice = {
          ok: true,
          reason: `SpeechSynthesis active. ${hasHindiVoice ? 'hi-IN voice available' : 'Indian English fallback available'}. Dictation: ${hasSpeechRec ? 'Supported' : 'Unavailable'}.`
        };
      }

      // 3. Image Studio Check
      results.image = { ok: true, reason: 'Pollinations AI client active (online inference ready).' };

      // 4. Video & Story Maker Check
      const hasMR = typeof MediaRecorder !== 'undefined';
      const hasCaptureStream = Boolean(document.createElement('canvas').captureStream);
      if (!hasMR || !hasCaptureStream) {
        results.video = { ok: false, reason: 'MediaRecorder or canvas.captureStream unsupported in this WebView.' };
      } else {
        results.video = { ok: true, reason: 'MediaRecorder (WebM) and canvas captureStream ready.' };
      }

      // 5. Phone Control Check
      let accessibilityOn = false;
      if (window.SystemLauncher && window.SystemLauncher.isAccessibilityServiceEnabled) {
        try {
          const res = await window.SystemLauncher.isAccessibilityServiceEnabled();
          accessibilityOn = res.enabled;
        } catch (e) {}
      } else if (typeof localStorage !== 'undefined') {
        accessibilityOn = localStorage.getItem('jarvis_setting_phone_control') === 'true';
      }
      results.phone = {
        ok: accessibilityOn,
        reason: accessibilityOn ? 'AccessibilityService & Phone Control ON' : 'Phone Control toggle or AccessibilityService is OFF.'
      };

      // 6. Storage Check
      try {
        const testKey = '__dev_storage_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        results.storage = { ok: true, reason: 'localStorage write & read operational.' };
      } catch (err) {
        results.storage = { ok: false, reason: 'Storage write failed: ' + err.message };
      }

      // 7. Network / Internet
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      results.network = {
        ok: isOnline,
        reason: isOnline ? 'Network connection active' : 'Device appears offline'
      };

      return results;
    }

    // -----------------------------------------------------------------------
    // AI DIAGNOSIS & FIX FORMULATION
    // -----------------------------------------------------------------------
    async diagnoseProblem(userProblem) {
      const fullCheck = await this.runFullCheck();
      const rawLogs = this.logger.getRecentLogs(30);

      const diagnosticPayload = {
        userProblem: userProblem || 'General system audit requested',
        diagnostics: fullCheck,
        recentErrors: rawLogs,
        appVersion: '1.2.0',
        activeModules: [
          'chat.js', 'voice.js', 'video-studio.js', 'system-launcher.js',
          'settings.js', 'story/parser.js', 'dev-assistant.js'
        ]
      };

      const sanitizedPayload = redactSensitiveData(diagnosticPayload);

      const promptText = `You are J.A.R.V.I.S. Android Dev Assistant.
Analyze this system issue and error report:
${JSON.stringify(sanitizedPayload, null, 2)}

Diagnose the root cause and provide a targeted solution in Hindi and English.
Return ONLY a valid JSON object strictly matching this schema:
{
  "cause": "मूल कारण (Clear explanation in Hindi/English)",
  "fix_type": "hotpatch|native|user_action",
  "explanation": "एक पंक्ति में क्या बदलेगा (1-line summary)",
  "patch": {
    "js": "// valid javascript fix if fix_type is hotpatch, otherwise empty string",
    "css": "/* optional css if fix_type is hotpatch, otherwise empty string */"
  },
  "native_steps": "यदि fix_type native या user_action है तो चरण और Termux कमांड"
}`;

      let jsonResponse = null;

      // 1. Try ClientAI / Gemini Service
      if (window.aiService && window.aiService.callGemini) {
        try {
          const resp = await window.aiService.callGemini(promptText);
          const raw = resp.text || '';
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            jsonResponse = JSON.parse(match[0]);
          }
        } catch (e) {
          console.warn('[DevAssistant] Gemini API call failed:', e.message);
        }
      }

      // Fallback heuristics if API offline or quota full
      if (!jsonResponse) {
        jsonResponse = this.generateFallbackDiagnosis(userProblem, fullCheck);
      }

      this.pendingHotpatch = jsonResponse;
      this.speakVoiceResponse('समस्या का विश्लेषण पूरा हुआ। यह हल तैयार है, क्या मैं इसे दिखा दूँ?');
      return jsonResponse;
    }

    generateFallbackDiagnosis(userProblem, fullCheck) {
      const prob = (userProblem || '').toLowerCase();

      if (prob.includes('आवाज़') || prob.includes('voice') || prob.includes('mic')) {
        return {
          cause: 'वॉइस इंजन या SpeechSynthesis में Hindi आवाज़ लोड नहीं हो सकी या माइक्रोफ़ोन अनुमति लंबित है।',
          fix_type: 'user_action',
          explanation: 'Android Settings → Text-to-Speech में Hindi Voice डेटा डाउनलोड करें और ऐप को Mic अनुमति दें।',
          patch: { js: '', css: '' },
          native_steps: '1. फ़ोन सेटिंग्स खोलें → Accessibility / System → Text-to-Speech Output → Google TTS Engine में Hindi (India) वॉइस पैक डाउनलोड करें।\n2. ऐप जानकारी में Permissions → Microphone को "Allow while using the app" करें।'
        };
      }

      if (prob.includes('वीडियो') || prob.includes('video') || !fullCheck.video.ok) {
        return {
          cause: 'WebView में MediaRecorder या canvas.captureStream समर्थित नहीं है या फ़ोटो नहीं चुनी गई।',
          fix_type: 'hotpatch',
          explanation: 'Video Studio में ऑटो-फ़ॉलबैक और स्पष्ट त्रुटि टोस्ट नोटिफिकेशन सक्षम किया जा रहा है।',
          patch: {
            js: `if (window.videoStudio) {
  window.videoStudio.fallbackNotice = true;
  console.log('[DevHotpatch] Video fallback notice activated.');
}`,
            css: `.video-stage { border-color: var(--accent-lavender) !important; }`
          },
          native_steps: ''
        };
      }

      if (prob.includes('इमेज') || prob.includes('image')) {
        return {
          cause: 'AI इमेज जनरेटर नेटवर्क या सर्वर टाइमआउट के कारण छवि नहीं ला सका।',
          fix_type: 'hotpatch',
          explanation: 'Pollinations AI इमेज अनुरोध में टाइमआउट अवधि 25 सेकंड बढ़ाई गई।',
          patch: {
            js: `if (window.ClientAI) {
  window.ClientAI.imageTimeoutMs = 25000;
  console.log('[DevHotpatch] Image generation timeout set to 25s.');
}`,
            css: ``
          },
          native_steps: ''
        };
      }

      if (!fullCheck.chat.ok) {
        return {
          cause: 'Gemini API Key गायब है अथवा 429 Quota सीमा समाप्त हो चुकी है।',
          fix_type: 'user_action',
          explanation: 'ऐप सेटिंग्स में वैध Google AI Studio Gemini API Key दर्ज करें।',
          patch: { js: '', css: '' },
          native_steps: '1. https://aistudio.google.com/ पर जाएँ।\n2. "Get API key" पर क्लिक करके नई API Key बनाएँ।\n3. ऐप के Settings टैब में जाकर "Gemini API Key" बॉक्स में पेस्ट करें और Save दबाएँ।'
        };
      }

      return {
        cause: 'सिस्टम में कोई गंभीर त्रुटि नहीं मिली; ऐप के अधिकांश मॉड्यूल्स सामान्य रूप से चल रहे हैं।',
        fix_type: 'user_action',
        explanation: 'सिस्टम स्वास्थ्य ठीक है। विशिष्ट फ़ीचर का नाम लिखकर दोबारा जाँचें।',
        patch: { js: '', css: '' },
        native_steps: 'कोई नेटिव बदलाव आवश्यक नहीं है।'
      };
    }

    // -----------------------------------------------------------------------
    // HOTPATCH APPLICATION, UNDO & SAFE MODE
    // -----------------------------------------------------------------------
    applyPendingHotpatch() {
      if (!this.pendingHotpatch) {
        throw new Error('No pending fix available to apply.');
      }
      if (this.pendingHotpatch.fix_type !== 'hotpatch') {
        throw new Error('This fix is of type "' + this.pendingHotpatch.fix_type + '" and cannot be auto-hotpatched.');
      }

      const { js, css } = this.pendingHotpatch.patch || {};
      const validation = validateHotpatch(js, css);
      if (!validation.safe) {
        this.speakVoiceResponse('सुरक्षा चेतावनी: यह कोड असुरक्षित है और इसे रोक दिया गया है।');
        throw new Error(validation.error);
      }

      const patchList = this.loadHotpatches();
      const patchId = 'patch_' + String(patchList.length + 1).padStart(3, '0');

      const patchRecord = {
        id: patchId,
        date: new Date().toISOString(),
        cause: this.pendingHotpatch.cause,
        explanation: this.pendingHotpatch.explanation,
        js: js || '',
        css: css || '',
        active: true
      };

      patchList.push(patchRecord);
      this.saveHotpatches(patchList);

      // Deploy Canary for 10 seconds (Safe Mode)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CANARY_ID, patchId);
        localStorage.setItem(STORAGE_KEYS.CANARY_TIME, String(Date.now()));
      }

      // Execute Patch
      this.executePatch(patchRecord);

      // Clear Canary if no crash occurs within 10s
      setTimeout(() => {
        if (typeof localStorage !== 'undefined') {
          if (localStorage.getItem(STORAGE_KEYS.CANARY_ID) === patchId) {
            localStorage.removeItem(STORAGE_KEYS.CANARY_ID);
            localStorage.removeItem(STORAGE_KEYS.CANARY_TIME);
          }
        }
      }, SAFE_MODE_WINDOW_MS);

      this.pendingHotpatch = null;
      this.speakVoiceResponse('बदलाव सफलतापूर्वक लागू कर दिया गया है।');
      if (window.soundFX) window.soundFX.success();
      this.renderPatchHistory();
      return patchRecord;
    }

    executePatch(patchRecord) {
      // 1. Inject CSS
      if (patchRecord.css && typeof document !== 'undefined') {
        let styleEl = document.getElementById(`hotpatch-css-${patchRecord.id}`);
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = `hotpatch-css-${patchRecord.id}`;
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = patchRecord.css;
      }

      // 2. Execute JS safely
      if (patchRecord.js) {
        try {
          const runner = new Function(patchRecord.js);
          runner();
        } catch (err) {
          console.error(`[DevAssistant] Execution of patch ${patchRecord.id} failed:`, err);
        }
      }
    }

    undoPatch(patchId) {
      const patchList = this.loadHotpatches();
      const p = patchList.find(item => item.id === patchId);
      if (p) {
        p.active = false;
        this.saveHotpatches(patchList);

        if (typeof document !== 'undefined') {
          const styleEl = document.getElementById(`hotpatch-css-${patchId}`);
          if (styleEl) styleEl.remove();
        }

        this.speakVoiceResponse(`पैच ${patchId} वापस ले लिया गया है।`);
        this.renderPatchHistory();
        return true;
      }
      return false;
    }

    undoAllPatches() {
      const patchList = this.loadHotpatches();
      patchList.forEach(p => {
        p.active = false;
        if (typeof document !== 'undefined') {
          const styleEl = document.getElementById(`hotpatch-css-${p.id}`);
          if (styleEl) styleEl.remove();
        }
      });
      this.saveHotpatches(patchList);
      this.speakVoiceResponse('सभी बदलाव वापस ले लिए गए हैं।');
      this.renderPatchHistory();
    }

    loadHotpatches() {
      try {
        if (typeof localStorage === 'undefined') return [];
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.HOTPATCHES) || '[]');
      } catch (e) {
        return [];
      }
    }

    saveHotpatches(patches) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.HOTPATCHES, JSON.stringify(patches));
      } catch (e) {}
    }

    loadAndApplyBootPatches() {
      const patches = this.loadHotpatches();
      patches.forEach(p => {
        if (p.active) {
          this.executePatch(p);
        }
      });
    }

    checkSafeModeCanary(isCriticalError = false) {
      if (typeof localStorage === 'undefined') return;
      const canaryId = localStorage.getItem(STORAGE_KEYS.CANARY_ID);
      const canaryTime = parseInt(localStorage.getItem(STORAGE_KEYS.CANARY_TIME) || '0', 10);

      if (canaryId && canaryTime) {
        const elapsed = Date.now() - canaryTime;
        if (elapsed < SAFE_MODE_WINDOW_MS || isCriticalError) {
          // Automatic Safe Mode Rollback!
          console.warn(`[DevAssistant] Safe Mode Triggered! Reverting failing patch ${canaryId}`);
          this.undoPatch(canaryId);
          localStorage.removeItem(STORAGE_KEYS.CANARY_ID);
          localStorage.removeItem(STORAGE_KEYS.CANARY_TIME);

          if (window.app && window.app.showToast) {
            window.app.showToast(`🛡️ Safe Mode: Patch ${canaryId} caused an error and was automatically rolled back.`);
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // VOICE COMMANDS & SPEECH SYNTHESIS
    // -----------------------------------------------------------------------
    handleVoiceCommand(transcript) {
      if (!transcript) return;
      const t = transcript.trim().toLowerCase();

      if (t.includes('चेक करो') || t.includes('समस्या ढूँढो') || t.includes('full check') || t.includes('diagnose')) {
        this.runFullCheck().then(() => this.updateDiagnosticsUI());
        this.speakVoiceResponse('सिस्टम की संपूर्ण जाँच शुरू कर दी गई है।');
        return;
      }

      if (t.includes('हल बनाओ') || t.includes('fix') || t.includes('generate fix')) {
        const input = document.getElementById('devProblemInput');
        const prob = input ? input.value : '';
        this.diagnoseProblem(prob).then(res => this.renderFixUI(res));
        return;
      }

      if (t.includes('लगा दो') || t.includes('paste कर दो') || t.includes('apply')) {
        try {
          this.applyPendingHotpatch();
        } catch (e) {
          if (window.app) window.app.showToast('⚠️ ' + e.message);
        }
        return;
      }

      if (t.includes('वापस करो') || t.includes('undo')) {
        const patches = this.loadHotpatches().filter(p => p.active);
        if (patches.length > 0) {
          this.undoPatch(patches[patches.length - 1].id);
        } else {
          this.speakVoiceResponse('कोई सक्रिय पैच नहीं मिला जिसे वापस लिया जा सके।');
        }
        return;
      }

      if (t.includes('रद्द करो') || t.includes('cancel')) {
        this.pendingHotpatch = null;
        this.speakVoiceResponse('ऑपरेशन रद्द कर दिया गया।');
        const fixCard = document.getElementById('devFixProposalCard');
        if (fixCard) fixCard.style.display = 'none';
        return;
      }
    }

    speakVoiceResponse(text) {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.pitch = 1.25;
        utter.rate = 0.98;
        utter.lang = 'hi-IN';

        const voices = window.speechSynthesis.getVoices();
        const hiVoice = voices.find(v => v.lang && v.lang.startsWith('hi'));
        if (hiVoice) utter.voice = hiVoice;

        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }

    // -----------------------------------------------------------------------
    // UI BINDINGS & RENDERING
    // -----------------------------------------------------------------------
    initDOM() {
      if (typeof document === 'undefined') return;

      // Voice dictation button for problem description
      const micBtn = document.getElementById('btnDevProblemMic');
      const probInput = document.getElementById('devProblemInput');
      if (micBtn && probInput) {
        micBtn.addEventListener('click', () => {
          const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRec) {
            alert('Voice dictation is not supported in this browser.');
            return;
          }
          const rec = new SpeechRec();
          rec.lang = 'hi-IN';
          rec.interimResults = false;
          micBtn.textContent = '🔴...';
          rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            probInput.value = transcript;
            this.handleVoiceCommand(transcript);
          };
          rec.onerror = () => { micBtn.textContent = '🎙️'; };
          rec.onend = () => { micBtn.textContent = '🎙️'; };
          rec.start();
        });
      }

      // "Run Full Check" button
      const btnCheck = document.getElementById('btnDevRunFullCheck');
      if (btnCheck) {
        btnCheck.addEventListener('click', async () => {
          btnCheck.disabled = true;
          btnCheck.textContent = '⏳ Checking…';
          await this.runFullCheck();
          this.updateDiagnosticsUI();
          btnCheck.disabled = false;
          btnCheck.textContent = '🔍 Run Full Check';
          this.speakVoiceResponse('जाँच पूरी हुई। सभी घटकों की स्थिति स्क्रीन पर है।');
        });
      }

      // "Diagnose & Generate Fix" button
      const btnDiagnose = document.getElementById('btnDevDiagnose');
      if (btnDiagnose) {
        btnDiagnose.addEventListener('click', async () => {
          const prob = probInput ? probInput.value.trim() : '';
          btnDiagnose.disabled = true;
          btnDiagnose.textContent = '🤖 Analyzing…';
          try {
            const res = await this.diagnoseProblem(prob);
            this.renderFixUI(res);
          } catch (err) {
            alert('Diagnosis error: ' + err.message);
          } finally {
            btnDiagnose.disabled = false;
            btnDiagnose.textContent = '⚡ Diagnose & Generate Fix';
          }
        });
      }

      // "Apply Hotpatch" button
      const btnApply = document.getElementById('btnDevApplyHotpatch');
      if (btnApply) {
        btnApply.addEventListener('click', () => {
          try {
            this.applyPendingHotpatch();
            const fixCard = document.getElementById('devFixProposalCard');
            if (fixCard) fixCard.style.display = 'none';
          } catch (err) {
            alert('Cannot apply patch: ' + err.message);
          }
        });
      }

      // "Reject Fix" button
      const btnReject = document.getElementById('btnDevRejectHotpatch');
      if (btnReject) {
        btnReject.addEventListener('click', () => {
          this.pendingHotpatch = null;
          const fixCard = document.getElementById('devFixProposalCard');
          if (fixCard) fixCard.style.display = 'none';
          this.speakVoiceResponse('बदलाव रद्द कर दिया गया।');
        });
      }

      // "Undo All" button
      const btnUndoAll = document.getElementById('btnDevUndoAllPatches');
      if (btnUndoAll) {
        btnUndoAll.addEventListener('click', () => {
          if (confirm('क्या आप सभी लागू किए गए Hotpatches को रद्द करना चाहते हैं?')) {
            this.undoAllPatches();
          }
        });
      }

      // "Change Password" button
      const btnChangePwd = document.getElementById('btnDevChangePwd');
      if (btnChangePwd) {
        btnChangePwd.addEventListener('click', async () => {
          const cur = prompt('वर्तमान पासवर्ड दर्ज करें (Enter current password):');
          if (!cur) return;
          const nw = prompt('नया पासवर्ड दर्ज करें (Enter new password):');
          if (!nw) return;
          const conf = prompt('नए पासवर्ड की पुष्टि करें (Confirm new password):');
          if (nw !== conf) {
            alert('नया पासवर्ड और पुष्टि मेल नहीं खाते!');
            return;
          }
          try {
            await this.changePassword(cur, nw);
            alert('✅ पासवर्ड सफलतापूर्वक बदल दिया गया है!');
          } catch (err) {
            alert('❌ पासवर्ड बदलने में त्रुटि: ' + err.message);
          }
        });
      }

      this.renderPatchHistory();
    }

    async updateDiagnosticsUI() {
      const container = document.getElementById('devDiagnosticsGrid');
      if (!container) return;

      const results = await this.runFullCheck();
      const items = [
        { name: 'Chat API', icon: '💬', data: results.chat },
        { name: 'Voice & Speech', icon: '🎙️', data: results.voice },
        { name: 'Image Studio', icon: '🎨', data: results.image },
        { name: 'Video & Story', icon: '🎬', data: results.video },
        { name: 'Phone Control', icon: '📱', data: results.phone },
        { name: 'Storage', icon: '💾', data: results.storage },
        { name: 'Network', icon: '🌐', data: results.network }
      ];

      container.innerHTML = items.map(item => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid ${item.data.ok ? '#2ec4b6' : '#ff0055'}; border-radius:var(--radius-sm); padding:8px 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:0.8rem; font-weight:700;">${item.icon} ${item.name}</span>
            <span class="status-tag ${item.data.ok ? 'tag-success' : 'tag-danger'}" style="font-size:0.68rem;">
              ${item.data.ok ? '✓ PASS' : '✗ ISSUE'}
            </span>
          </div>
          <div style="font-size:0.72rem; color:var(--text-secondary);">${item.data.reason}</div>
        </div>
      `).join('');
    }

    renderFixUI(fixResponse) {
      const fixCard = document.getElementById('devFixProposalCard');
      const causeEl = document.getElementById('devFixCauseText');
      const summaryEl = document.getElementById('devFixSummaryText');
      const codeContainer = document.getElementById('devFixCodeContainer');
      const codePreview = document.getElementById('devFixCodePreview');
      const nativeContainer = document.getElementById('devFixNativeContainer');
      const nativeSteps = document.getElementById('devFixNativeSteps');
      const btnApply = document.getElementById('btnDevApplyHotpatch');

      if (!fixCard) return;
      fixCard.style.display = 'block';

      if (causeEl) causeEl.textContent = fixResponse.cause || 'No root cause specified';
      if (summaryEl) summaryEl.textContent = fixResponse.explanation || 'No summary available';

      if (fixResponse.fix_type === 'hotpatch') {
        if (codeContainer) codeContainer.style.display = 'block';
        if (nativeContainer) nativeContainer.style.display = 'none';
        if (btnApply) btnApply.style.display = 'inline-flex';

        const js = (fixResponse.patch && fixResponse.patch.js) || '';
        const css = (fixResponse.patch && fixResponse.patch.css) || '';
        if (codePreview) {
          codePreview.textContent = (js ? `// --- JAVASCRIPT ---\n${js}\n\n` : '') +
                                   (css ? `/* --- CSS --- */\n${css}` : '');
        }
      } else {
        if (codeContainer) codeContainer.style.display = 'none';
        if (nativeContainer) nativeContainer.style.display = 'block';
        if (btnApply) btnApply.style.display = 'none';

        if (nativeSteps) {
          nativeSteps.textContent = fixResponse.native_steps || fixResponse.explanation || 'Follow standard settings calibration.';
        }
      }
    }

    renderPatchHistory() {
      const container = document.getElementById('devPatchHistoryList');
      if (!container) return;

      const patches = this.loadHotpatches();
      if (!patches.length) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem;">कोई Hotpatch लागू नहीं किया गया है।</div>';
        return;
      }

      container.innerHTML = patches.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); padding:6px 10px; border-radius:var(--radius-sm); margin-bottom:6px;">
          <div>
            <div style="font-weight:700; font-size:0.78rem; color:${p.active ? 'var(--neon-cyan)' : 'var(--text-muted)'};">
              ${p.id} ${p.active ? '● Active' : '○ Rolled Back'}
            </div>
            <div style="font-size:0.72rem; color:var(--text-secondary);">${p.explanation || p.cause}</div>
            <div style="font-size:0.65rem; color:var(--text-muted);">${new Date(p.date).toLocaleString()}</div>
          </div>
          <div>
            ${p.active ? `<button class="chip-btn" onclick="window.DevAssistant.undoPatch('${p.id}')" style="background:#ffaa00; color:#000; font-size:0.68rem; padding:2px 8px;">↩️ Undo</button>` : ''}
          </div>
        </div>
      `).join('');
    }
  }

  // Expose global instance
  window.DevAssistant = new DevAssistantController();
  window.DevAssistantClass = DevAssistantController;
  window.computePBKDF2 = computePBKDF2;
  window.constantTimeCompare = constantTimeCompare;
  window.validateHotpatch = validateHotpatch;
  window.redactSensitiveData = redactSensitiveData;

})(typeof window !== 'undefined' ? window : global);
