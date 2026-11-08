function isDiscontinuedModel(name) {
  if (!name) return true;
  const m = String(name).toLowerCase().trim();
  const discontinued = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-pro-exp',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-1.0-pro',
    'gemini-pro',
    'gemini-pro-vision'
  ];
  if (discontinued.some(d => m === d || m.startsWith(d))) return true;
  if (m.includes('2.5') || m.includes('2.0') || m.includes('1.5') || m.includes('1.0')) return true;
  return false;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const tErr = new Error('TIMEOUT');
      tErr.isTimeout = true;
      throw tErr;
    }
    throw err;
  }
}

function formatGeminiErrorHindi(err, status = 0, rawMessage = '') {
  const code = Number(status) || Number(err?.status) || Number(err?.statusCode) || 0;
  const msg = (rawMessage || err?.message || '').toLowerCase();

  if (err?.isTimeout || msg.includes('timeout') || err?.name === 'AbortError') {
    return '⏳ समय समाप्त (Timeout - 15 Seconds)\n\n15 सेकंड में Google सर्वर से कोई जवाब नहीं मिला। कृपया अपना इंटरनेट कनेक्शन या वाई-फाई चेक करें।';
  }

  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('offline') || code === 0) {
    return '📶 इंटरनेट कनेक्शन एरर (Network Error)\n\nGoogle AI सर्वर से संपर्क नहीं हो सका। कृपया जांचें कि फोन में इंटरनेट चालू है या नहीं।';
  }

  if (code === 400 || msg.includes('400') || msg.includes('api_key_invalid') || msg.includes('key not valid')) {
    return '🔑 अमान्य अनुरोध या कुंजी (HTTP 400 - Bad Request)\n\nआपने जो API Key डाली है वह गलत या अमान्य है। कृपया Google AI Studio (aistudio.google.com) से सही कुंजी कॉपी करके पेस्ट करें।';
  }

  if (code === 403 || msg.includes('403') || msg.includes('permission_denied') || msg.includes('forbidden')) {
    return '🚫 कुंजी को अनुमति नहीं है (HTTP 403 - Permission Denied)\n\nइस API Key को Gemini API इस्तेमाल करने की अनुमति नहीं है। कृपया Google AI Studio से नई फ्री API कुंजी बनाएं।';
  }

  if (code === 404 || msg.includes('404') || msg.includes('no longer available') || msg.includes('not found') || msg.includes('deprecated')) {
    return '🔍 मॉडल नहीं मिला या बंद हो चुका है (HTTP 404 - Not Found)\n\nचुना गया AI मॉडल Google द्वारा बंद कर दिया गया है। ऐप अपने आप नए चालू मॉडल पर स्विच करने का प्रयास कर रहा है।';
  }

  if (code === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
    return '⚠️ कोटा खत्म है (HTTP 429 - Quota Exhausted)\n\nआपकी API Key का आज का फ्री कोटा पूरा हो चुका है। Google AI Studio का कोटा 24 घंटे में अपने आप फ्री में रीसेट होता है, या आप नई फ्री API कुंजी जोड़ सकते हैं।';
  }

  if (code >= 500 && code < 600) {
    return `⚙️ Google सर्वर एरर (HTTP ${code} - Server Error)\n\nGoogle AI सर्वर पर अस्थायी तकनीकी समस्या है। कृपया कुछ सेकंड बाद पुनः प्रयास करें।`;
  }

  return `⚠️ त्रुटि (HTTP ${code || 'Error'}):\n\n${rawMessage || err?.message || 'अज्ञात समस्या आई।'}`;
}

// Settings Controller: API Keys, Personas (Jarvis/Girlfriend/Custom), TTS Tuning, Theme
class SettingsController {
  constructor() {
    this.apiKeyInput = document.getElementById('settingApiKey');
    this.modelSelect = document.getElementById('settingModel');
    this.personaSelect = document.getElementById('settingPersona');
    this.userNameInput = document.getElementById('settingUserName');
    this.customPromptGroup = document.getElementById('customPromptGroup');
    this.customPromptInput = document.getElementById('settingCustomPrompt');
    this.soundFxToggle = document.getElementById('settingSoundFx');
    this.autoVoiceReplyToggle = document.getElementById('settingAutoVoiceReply');
    this.voiceRateInput = document.getElementById('settingVoiceRate');
    this.voiceRateVal = document.getElementById('voiceRateVal');
    this.voicePitchInput = document.getElementById('settingVoicePitch');
    this.voicePitchVal = document.getElementById('voicePitchVal');
    this.voiceSelect = document.getElementById('settingVoiceSelect');
    this.btnSave = document.getElementById('btnSaveSettings');
    this.btnTestVoice = document.getElementById('btnTestVoice');
    this.btnTestApiKey = document.getElementById('btnTestApiKey');

    // Phone Control
    this.phoneControlToggle     = document.getElementById('settingPhoneControl');
    this.phoneControlWarning    = document.getElementById('phoneControlWarning');
    this.phoneControlStatusBadge = document.getElementById('phoneControlStatusBadge');
    this.phoneControlLogsList   = document.getElementById('phoneControlLogsList');
    this._phoneControlPollTimer = null;
    this._pendingConfirmResolve = null;

    // Diagnostics & Crash Log Elements
    this.modalStatusLog         = document.getElementById('modalPhoneControlStatusLog');
    this.btnOpenStatusModal     = document.getElementById('btnOpenPhoneControlStatusModal');
    this.btnCloseStatusModal    = document.getElementById('btnClosePhoneControlStatusModal');
    this.diagStatusBadge        = document.getElementById('diagServiceStatusBadge');
    this.diagConnectedTime      = document.getElementById('diagLastConnectedTime');
    this.diagDisconnectedTime   = document.getElementById('diagLastDisconnectedTime');
    this.diagReason             = document.getElementById('diagDisconnectReason');
    this.diagLogsList           = document.getElementById('diagErrorLogsList');
    this.btnDiagAcc             = document.getElementById('btnDiagOpenAccessibility');
    this.btnDiagBattery         = document.getElementById('btnDiagOpenBattery');
    this.btnDiagAutostart       = document.getElementById('btnDiagOpenAutostart');
    this.btnDiagRefresh         = document.getElementById('btnDiagRefresh');
    this.btnDiagClearLogs       = document.getElementById('btnDiagClearLogs');
    this.startupWarning         = document.getElementById('phoneControlStartupWarning');
    this.btnStartupFix          = document.getElementById('btnStartupFixService');
    this.btnStartupDismiss      = document.getElementById('btnStartupDismissWarning');

    // Sakura Theme & Petals
    this.appThemeSelect         = document.getElementById('settingAppTheme');
    this.sakuraPetalsToggle     = document.getElementById('settingSakuraPetals');

    this.bindEvents();
    this.loadSettings();
    this.checkStartupStatus();
  }

  populateModelDropdown(models = [], selectedValue = 'gemini-3.8-flash') {
    if (!this.modelSelect) return;

    const list = [];
    const add = (m) => {
      if (m && !list.includes(m) && !isDiscontinuedModel(m)) {
        list.push(m);
      }
    };

    add('gemini-3.8-flash');
    for (const m of models) add(m);
    add('gemini-3.8-pro');

    this.modelSelect.innerHTML = '';
    for (const m of list) {
      const opt = document.createElement('option');
      opt.value = m;
      let label = m;
      if (m === 'gemini-3.8-flash') label = 'Gemini 3.8 Flash (Latest & Recommended)';
      else if (m === 'gemini-3.8-pro') label = 'Gemini 3.8 Pro (Deep Reasoning)';
      opt.textContent = label;
      this.modelSelect.appendChild(opt);
    }

    const chosen = isDiscontinuedModel(selectedValue) ? 'gemini-3.8-flash' : (list.includes(selectedValue) ? selectedValue : 'gemini-3.8-flash');
    this.modelSelect.value = chosen;
  }

  bindEvents() {
    if (this.personaSelect) {
      this.personaSelect.addEventListener('change', () => {
        if (this.customPromptGroup) {
          this.customPromptGroup.style.display = this.personaSelect.value === 'custom' ? 'flex' : 'none';
        }
      });
    }

    if (this.voiceRateInput && this.voiceRateVal) {
      this.voiceRateInput.addEventListener('input', () => {
        this.voiceRateVal.textContent = this.voiceRateInput.value + 'x';
        if (window.voiceAssistant) window.voiceAssistant.rate = parseFloat(this.voiceRateInput.value);
      });
    }

    if (this.voicePitchInput && this.voicePitchVal) {
      this.voicePitchInput.addEventListener('input', () => {
        this.voicePitchVal.textContent = this.voicePitchInput.value + 'x';
        if (window.voiceAssistant) window.voiceAssistant.pitch = parseFloat(this.voicePitchInput.value);
      });
    }

    if (this.voiceSelect) {
      this.voiceSelect.addEventListener('change', () => {
        if (window.voiceAssistant && window.voiceAssistant.voices) {
          window.voiceAssistant.selectedVoice = window.voiceAssistant.voices[this.voiceSelect.value] || null;
        }
      });
    }

    if (this.soundFxToggle) {
      this.soundFxToggle.addEventListener('change', () => {
        if (window.soundFX) window.soundFX.enabled = this.soundFxToggle.checked;
      });
    }

    if (this.autoVoiceReplyToggle) {
      this.autoVoiceReplyToggle.addEventListener('change', () => {
        window.autoVoiceReplyEnabled = this.autoVoiceReplyToggle.checked;
        window.autoSpeakEnabled = this.autoVoiceReplyToggle.checked;
        if (window.ClientAI) window.ClientAI.saveSettings({ auto_voice_reply: this.autoVoiceReplyToggle.checked ? 'true' : 'false' });
        if (window.app) window.app.showToast(this.autoVoiceReplyToggle.checked ? 'Auto Voice Reply: ON' : 'Auto Voice Reply: OFF');
      });
    }

    if (this.btnTestVoice) {
      this.btnTestVoice.addEventListener('click', () => {
        if (window.voiceAssistant) {
          window.voiceAssistant.unlockAudio();
          const persona = this.personaSelect ? this.personaSelect.value : 'girlfriend';
          const sample = (persona === 'girlfriend')
            ? 'नमस्ते! मैं आपकी पर्सनल AI असिस्टेंट माया हूँ। मेरी आवाज़ एकदम मीठी और साफ़ है, बताइए आज हम क्या बातें करें? ❤️'
            : 'Greetings, Commander. Audio calibration nominal and neural core online.';
          window.voiceAssistant.speak(sample);
        }
      });
    }

    if (this.btnTestApiKey) {
      this.btnTestApiKey.addEventListener('click', () => this.testApiKey());
    }

    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => this.saveSettings());
    }

    // ── Sakura Theme & Petals ─────────────────────────────────────────────────
    if (this.appThemeSelect) {
      this.appThemeSelect.addEventListener('change', () => {
        const theme = this.appThemeSelect.value;
        if (window.app && typeof window.app.setTheme === 'function') {
          window.app.setTheme(theme);
        }
        if (window.app) window.app.showToast(`थीम: ${theme === 'sakura' ? '🌸 Sakura' : '⚡ Classic'}`);
      });
    }

    if (this.sakuraPetalsToggle) {
      this.sakuraPetalsToggle.addEventListener('change', () => {
        const on = this.sakuraPetalsToggle.checked;
        if (window.sakuraPetals && typeof window.sakuraPetals.toggle === 'function') {
          window.sakuraPetals.toggle(on);
        }
        if (window.app) window.app.showToast(on ? '🌸 Sakura Petals: ON' : 'Sakura Petals: OFF');
      });
    }

    // ── Phone Control ─────────────────────────────────────────────────────────
    if (this.phoneControlToggle) {
      this.phoneControlToggle.addEventListener('change', async () => {
        if (!this.phoneControlToggle.checked) {
          // Turning OFF — just save state
          try { localStorage.setItem('jarvis_phone_control', 'false'); } catch (e) {}
          this._stopPhoneControlPoll();
          this._updatePhoneControlBadge(false);
          return;
        }

        // Turning ON — show permission explanation modal first
        this.phoneControlToggle.checked = false; // keep OFF until user proceeds
        const permModal = document.getElementById('phoneControlPermModal');
        if (permModal) permModal.style.display = 'flex';
      });
    }

    const openGuide = () => {
      const permModal = document.getElementById('phoneControlPermModal');
      if (permModal) permModal.style.display = 'none';
      this.openSetupGuide();
    };

    const btnOpenGuide = document.getElementById('btnOpenPhoneControlGuide');
    if (btnOpenGuide) btnOpenGuide.addEventListener('click', openGuide);

    const btnWarningGuide = document.getElementById('btnWarningOpenGuide');
    if (btnWarningGuide) btnWarningGuide.addEventListener('click', openGuide);

    const btnPermGuide = document.getElementById('btnPermModalGuide');
    if (btnPermGuide) btnPermGuide.addEventListener('click', openGuide);

    const btnCloseGuide = document.getElementById('btnClosePhoneControlGuide');
    if (btnCloseGuide) btnCloseGuide.addEventListener('click', () => this.closeSetupGuide());

    const btnGuideCloseBottom = document.getElementById('btnGuideCloseBottom');
    if (btnGuideCloseBottom) btnGuideCloseBottom.addEventListener('click', () => this.closeSetupGuide());

    const btnGuideRefresh = document.getElementById('btnGuideRefreshStatus');
    if (btnGuideRefresh) {
      btnGuideRefresh.addEventListener('click', async () => {
        const isRunning = await this.checkAccessibilityStatus();
        if (window.app) window.app.showToast(isRunning ? '🟢 Accessibility Service चालू है!' : '🔴 Accessibility Service अभी बंद है।');
      });
    }

    const openAppInfoHandler = () => {
      if (window.systemLauncher && typeof window.systemLauncher.openAppInfoSettings === 'function') {
        window.systemLauncher.openAppInfoSettings();
      }
      if (window.app) window.app.showToast('App Info सेटिंग्स खुल रही है…');
    };

    const btnOpenAppInfo = document.getElementById('btnOpenAppInfoSettings');
    if (btnOpenAppInfo) btnOpenAppInfo.addEventListener('click', openAppInfoHandler);

    const btnGuideAppInfo = document.getElementById('btnGuideOpenAppInfo');
    if (btnGuideAppInfo) btnGuideAppInfo.addEventListener('click', openAppInfoHandler);

    const openAccHandler = () => {
      if (window.systemLauncher) window.systemLauncher.openAccessibilitySettings();
      if (window.app) window.app.showToast('Accessibility Settings खुल रहा है…');
    };

    const btnOpenAcc = document.getElementById('btnOpenAccessibilitySettings');
    if (btnOpenAcc) btnOpenAcc.addEventListener('click', openAccHandler);

    const btnGuideAcc = document.getElementById('btnGuideOpenAccessibility');
    if (btnGuideAcc) btnGuideAcc.addEventListener('click', openAccHandler);

    const btnExplanation = document.getElementById('btnShowPhoneControlExplanation');
    if (btnExplanation) {
      btnExplanation.addEventListener('click', () => {
        const permModal = document.getElementById('phoneControlPermModal');
        if (permModal) permModal.style.display = 'flex';
      });
    }

    const btnPermCancel = document.getElementById('btnPermModalCancel');
    if (btnPermCancel) {
      btnPermCancel.addEventListener('click', () => {
        const permModal = document.getElementById('phoneControlPermModal');
        if (permModal) permModal.style.display = 'none';
        if (this.phoneControlToggle) this.phoneControlToggle.checked = false;
      });
    }

    const btnPermProceed = document.getElementById('btnPermModalProceed');
    if (btnPermProceed) {
      btnPermProceed.addEventListener('click', async () => {
        const permModal = document.getElementById('phoneControlPermModal');
        if (permModal) permModal.style.display = 'none';
        if (window.systemLauncher) window.systemLauncher.openAccessibilitySettings();
        if (window.app) window.app.showToast('Accessibility Settings में सर्विस ON करें');

        // Poll status every 2s for 60s to detect when user enables the service
        let attempts = 0;
        const checkInterval = setInterval(async () => {
          attempts++;
          const enabled = await this._isAccessibilityRunning();
          if (enabled) {
            clearInterval(checkInterval);
            if (this.phoneControlToggle) this.phoneControlToggle.checked = true;
            try { localStorage.setItem('jarvis_phone_control', 'true'); } catch (e) {}
            this.checkAccessibilityStatus();
            this._startPhoneControlPoll();
            if (window.app) window.app.showToast('✅ Phone Control चालू हो गया!');
          } else if (attempts >= 30) {
            clearInterval(checkInterval);
          }
        }, 2000);
      });
    }

    const btnStopSettings = document.getElementById('btnSettingsEmergencyStop');
    const btnStopTopBar   = document.getElementById('btnEmergencyStopAll');
    const emergencyHandler = async () => {
      if (window.systemLauncher) {
        await window.systemLauncher.stopAllAccessibilityActions().catch(() => {});
      }
      if (window.app) window.app.showToast('🛑 सभी Phone Control actions रोक दिए गए।');
    };
    if (btnStopSettings) btnStopSettings.addEventListener('click', emergencyHandler);
    if (btnStopTopBar)   btnStopTopBar.addEventListener('click', emergencyHandler);

    const btnClearLogs = document.getElementById('btnClearPhoneControlLogs');
    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', () => {
        if (window.systemLauncher) window.systemLauncher.clearAuditLogs();
        this.renderPhoneControlLogs();
        if (window.app) window.app.showToast('Logs साफ हो गए।');
      });
    }

    // Confirm modal — Yes/No buttons
    const btnYes = document.getElementById('btnConfirmActionYes');
    const btnNo  = document.getElementById('btnConfirmActionNo');
    if (btnYes) {
      btnYes.addEventListener('click', () => {
        const confirmModal = document.getElementById('phoneControlConfirmModal');
        if (confirmModal) confirmModal.style.display = 'none';
        if (this._pendingConfirmResolve) { this._pendingConfirmResolve(true); this._pendingConfirmResolve = null; }
      });
    }
    if (btnNo) {
      btnNo.addEventListener('click', () => {
        const confirmModal = document.getElementById('phoneControlConfirmModal');
        if (confirmModal) confirmModal.style.display = 'none';
        if (this._pendingConfirmResolve) { this._pendingConfirmResolve(false); this._pendingConfirmResolve = null; }
      });
    }

    // Diagnostics & Crash Log Modal Event Listeners
    if (this.btnOpenStatusModal) {
      this.btnOpenStatusModal.addEventListener('click', () => this.openStatusLogModal());
    }
    if (this.btnCloseStatusModal) {
      this.btnCloseStatusModal.addEventListener('click', () => this.closeStatusLogModal());
    }
    if (this.btnDiagAcc) {
      this.btnDiagAcc.addEventListener('click', () => {
        if (window.systemLauncher) window.systemLauncher.openAccessibilitySettings();
        if (window.app) window.app.showToast('Accessibility Settings खुल रहा है…');
      });
    }
    if (this.btnDiagBattery) {
      this.btnDiagBattery.addEventListener('click', () => {
        if (window.systemLauncher && typeof window.systemLauncher.openBatteryOptimizationSettings === 'function') {
          window.systemLauncher.openBatteryOptimizationSettings();
        }
        if (window.app) window.app.showToast('बैटरी सेटिंग्स: No Restrictions चुनें');
      });
    }
    if (this.btnDiagAutostart) {
      this.btnDiagAutostart.addEventListener('click', () => {
        if (window.systemLauncher && typeof window.systemLauncher.openAutostartSettings === 'function') {
          window.systemLauncher.openAutostartSettings();
        }
        if (window.app) window.app.showToast('ऑटोस्टार्ट सेटिंग्स खुल रही है…');
      });
    }
    if (this.btnDiagRefresh) {
      this.btnDiagRefresh.addEventListener('click', () => {
        this.loadAccessibilityDiagnostics();
        if (window.app) window.app.showToast('स्टेटस और लॉग्स ताज़ा किए गए।');
      });
    }
    if (this.btnDiagClearLogs) {
      this.btnDiagClearLogs.addEventListener('click', async () => {
        if (window.systemLauncher && typeof window.systemLauncher.clearAccessibilityLogs === 'function') {
          await window.systemLauncher.clearAccessibilityLogs();
        }
        await this.loadAccessibilityDiagnostics();
        if (window.app) window.app.showToast('एरर लॉग्स साफ़ कर दिए गए।');
      });
    }

    // Startup Warning Fix / Dismiss
    if (this.btnStartupFix) {
      this.btnStartupFix.addEventListener('click', () => {
        this.openStatusLogModal();
      });
    }
    if (this.btnStartupDismiss) {
      this.btnStartupDismiss.addEventListener('click', () => {
        if (this.startupWarning) this.startupWarning.style.display = 'none';
      });
    }
  }

  async loadSettings() {
    let settings = {};
    if (window.ClientAI) {
      settings = window.ClientAI.getSettings();
    }

    try {
      if (!window.ClientAI || window.ClientAI.serverAvailable !== false) {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const serverSettings = await res.json();
          settings = Object.assign({}, settings, serverSettings);
        }
      }
    } catch (err) {
      console.warn('Server settings unavailable, using local on-device settings.');
    }

    if (this.apiKeyInput && settings.gemini_api_key_masked) {
      this.apiKeyInput.placeholder = `Configured: ${settings.gemini_api_key_masked}`;
    }

    // Auto-migrate if stored model is discontinued
    if (isDiscontinuedModel(settings.ai_model)) {
      settings.ai_model = 'gemini-3.8-flash';
      if (window.ClientAI) window.ClientAI.saveSettings({ ai_model: 'gemini-3.8-flash' });
    }

    const savedLiveModels = (() => {
      try { return JSON.parse(localStorage.getItem('jarvis_live_models') || '[]'); } catch (e) { return []; }
    })();
    this.populateModelDropdown(savedLiveModels, settings.ai_model);

    if (this.personaSelect && settings.persona) {
      this.personaSelect.value = settings.persona;
      if (this.customPromptGroup) {
        this.customPromptGroup.style.display = settings.persona === 'custom' ? 'flex' : 'none';
      }
    }
    if (this.userNameInput && settings.user_name) this.userNameInput.value = settings.user_name;
    if (this.customPromptInput && settings.custom_system_prompt) this.customPromptInput.value = settings.custom_system_prompt;
    if (this.voiceRateInput && settings.voice_rate) {
      this.voiceRateInput.value = settings.voice_rate;
      if (this.voiceRateVal) this.voiceRateVal.textContent = settings.voice_rate + 'x';
      if (window.voiceAssistant) window.voiceAssistant.rate = parseFloat(settings.voice_rate);
    }
    if (this.voicePitchInput && settings.voice_pitch) {
      this.voicePitchInput.value = settings.voice_pitch;
      if (this.voicePitchVal) this.voicePitchVal.textContent = settings.voice_pitch + 'x';
      if (window.voiceAssistant) window.voiceAssistant.pitch = parseFloat(settings.voice_pitch);
    }
    if (this.soundFxToggle && settings.sound_fx !== undefined) {
      this.soundFxToggle.checked = settings.sound_fx === 'true';
      if (window.soundFX) window.soundFX.enabled = this.soundFxToggle.checked;
    }
    if (this.autoVoiceReplyToggle) {
      const isAuto = settings.auto_voice_reply !== 'false';
      this.autoVoiceReplyToggle.checked = isAuto;
      window.autoVoiceReplyEnabled = isAuto;
      window.autoSpeakEnabled = isAuto;
    }

    this.updatePersonaBadge(settings.persona || 'girlfriend');

    // Restore Phone Control toggle state
    if (this.phoneControlToggle) {
      const pcEnabled = localStorage.getItem('jarvis_phone_control') === 'true';
      this.phoneControlToggle.checked = pcEnabled;
      if (pcEnabled) this._startPhoneControlPoll();
    }

    // Restore Theme & Sakura Petals
    if (this.appThemeSelect) {
      const savedTheme = localStorage.getItem('jarvis_theme') || 'sakura';
      this.appThemeSelect.value = (savedTheme === 'classic' || savedTheme === 'dark') ? 'classic' : 'sakura';
    }
    if (this.sakuraPetalsToggle) {
      const petalsOn = localStorage.getItem('jarvis_sakura_petals') !== 'false';
      this.sakuraPetalsToggle.checked = petalsOn;
    }

    // Check AccessibilityService status on page load
    this.checkAccessibilityStatus();
    this.renderPhoneControlLogs();
  }

  async saveSettings() {
    const payload = {};
    if (this.apiKeyInput && this.apiKeyInput.value.trim()) {
      payload.gemini_api_key = this.apiKeyInput.value.trim();
    }
    if (this.modelSelect) {
      payload.ai_model = isDiscontinuedModel(this.modelSelect.value) ? 'gemini-3.8-flash' : this.modelSelect.value;
    }
    if (this.personaSelect) payload.persona = this.personaSelect.value;
    if (this.userNameInput) payload.user_name = this.userNameInput.value.trim() || 'Commander';
    if (this.customPromptInput) payload.custom_system_prompt = this.customPromptInput.value.trim();
    if (this.voiceRateInput) payload.voice_rate = this.voiceRateInput.value;
    if (this.voicePitchInput) payload.voice_pitch = this.voicePitchInput.value;
    if (this.soundFxToggle) payload.sound_fx = this.soundFxToggle.checked ? 'true' : 'false';
    if (this.autoVoiceReplyToggle) {
      payload.auto_voice_reply = this.autoVoiceReplyToggle.checked ? 'true' : 'false';
      window.autoVoiceReplyEnabled = this.autoVoiceReplyToggle.checked;
      window.autoSpeakEnabled = this.autoVoiceReplyToggle.checked;
    }

    if (window.ClientAI) {
      window.ClientAI.saveSettings(payload);
    }

    try {
      if (!window.ClientAI || window.ClientAI.serverAvailable !== false) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } catch (e) {}

    if (window.app) window.app.showToast('Settings saved to phone successfully!');
    if (window.soundFX) window.soundFX.success();
    this.updatePersonaBadge(payload.persona || 'girlfriend');
    if (window.app) window.app.updateStatusIndicator();
  }

  async testApiKey() {
    const key = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
    if (!key) {
      alert('कृपया टेस्ट करने के लिए API Key दर्ज करें।');
      return;
    }

    const testBtn = this.btnTestApiKey;
    if (testBtn) {
      testBtn.textContent = 'Verifying...';
      testBtn.disabled = true;
    }

    try {
      // 1. Live discover active models via ListModels API (15s timeout)
      let activeCandidates = ['gemini-3.8-flash', 'gemini-3.8-pro'];
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

      try {
        const listRes = await fetchWithTimeout(listUrl, {}, 15000);

        if (listRes.ok) {
          const listData = await listRes.json();
          const rawModels = Array.isArray(listData.models) ? listData.models : [];

          const liveModels = rawModels
            .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace(/^models\//, ''))
            .filter(name => !isDiscontinuedModel(name));

          liveModels.sort((a, b) => {
            if (a === 'gemini-3.8-flash') return -1;
            if (b === 'gemini-3.8-flash') return 1;
            if (a.includes('3.8') && !b.includes('3.8')) return -1;
            if (b.includes('3.8') && !a.includes('3.8')) return 1;
            return a.localeCompare(b);
          });

          if (liveModels.length > 0) {
            activeCandidates = liveModels;
          }
        } else {
          const errData = await listRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${listRes.status}`;

          // Check if invalid key or quota
          if (listRes.status === 400 || listRes.status === 403 || listRes.status === 429) {
            alert(formatGeminiErrorHindi(null, listRes.status, errMsg));
            return;
          }
        }
      } catch (listErr) {
        if (listErr.isTimeout) {
          alert(formatGeminiErrorHindi(listErr));
          return;
        }
        console.warn('[Settings] ListModels failed, proceeding with active fallback models:', listErr.message);
      }

      // 2. Test ping with candidate models (STRICTLY MAXIMUM 3 ATTEMPTS, 15s timeout each)
      const candidatesToTest = activeCandidates.slice(0, 3);
      let workingModel = null;
      let lastPingError = null;
      let lastPingStatus = 0;

      for (let i = 0; i < candidatesToTest.length; i++) {
        const candidate = candidatesToTest[i];
        try {
          const pingUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${key}`;
          const pingRes = await fetchWithTimeout(pingUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Respond with OK' }] }] })
          }, 15000);

          if (pingRes.ok) {
            workingModel = candidate;
            break;
          }

          lastPingStatus = pingRes.status;
          const pingErr = await pingRes.json().catch(() => ({}));
          lastPingError = pingErr.error?.message || `HTTP ${pingRes.status}`;

          if (pingRes.status === 429 || pingRes.status === 400 || pingRes.status === 403) {
            // Definite error (quota or invalid key), no need to loop further
            break;
          }
        } catch (callErr) {
          lastPingError = callErr.message;
          if (callErr.isTimeout) {
            lastPingError = 'TIMEOUT';
            break;
          }
        }
      }

      if (workingModel) {
        this.populateModelDropdown(activeCandidates, workingModel);
        if (window.ClientAI) {
          window.ClientAI.setApiKey(key);
          window.ClientAI.saveSettings({ ai_model: workingModel });
        }
        try { localStorage.setItem('jarvis_live_models', JSON.stringify(activeCandidates)); } catch (e) {}
        alert(`✅ API Key बिल्कुल सही है!\n\nसफलतापूर्वक कनेक्टेड: ${workingModel}\nGoogle से मॉडल लोड हो चुके हैं।`);
      } else {
        alert(formatGeminiErrorHindi({ message: lastPingError }, lastPingStatus, lastPingError));
      }
    } catch (err) {
      alert(formatGeminiErrorHindi(err));
    } finally {
      if (testBtn) {
        testBtn.textContent = 'Verify Key';
        testBtn.disabled = false;
      }
    }
  }

  async _isAccessibilityRunning() {
    if (window.systemLauncher && typeof window.systemLauncher.isAccessibilityEnabled === 'function') {
      try {
        return await window.systemLauncher.isAccessibilityEnabled();
      } catch (e) {
        return false;
      }
    }
    return Boolean(window._mockAccessibilityServiceEnabled);
  }

  _startPhoneControlPoll() {
    this._stopPhoneControlPoll();
    this._phoneControlPollTimer = setInterval(() => {
      this.checkAccessibilityStatus();
    }, 10000);
  }

  _stopPhoneControlPoll() {
    if (this._phoneControlPollTimer) {
      clearInterval(this._phoneControlPollTimer);
      this._phoneControlPollTimer = null;
    }
  }

  _updatePhoneControlBadge(running) {
    if (this.phoneControlStatusBadge) {
      if (running) {
        this.phoneControlStatusBadge.textContent = 'ON (Active)';
        this.phoneControlStatusBadge.style.background = 'rgba(0, 240, 255, 0.2)';
        this.phoneControlStatusBadge.style.color = 'var(--neon-cyan)';
      } else {
        this.phoneControlStatusBadge.textContent = 'OFF';
        this.phoneControlStatusBadge.style.background = 'rgba(255,255,255,0.08)';
        this.phoneControlStatusBadge.style.color = 'var(--text-muted)';
      }
    }

    const emergencyBtn = document.getElementById('btnEmergencyStopAll');
    if (emergencyBtn) {
      const isEnabled = this.phoneControlToggle ? this.phoneControlToggle.checked : false;
      emergencyBtn.style.display = (isEnabled && running) ? 'inline-flex' : 'none';
    }

    if (this.phoneControlWarning) {
      const isToggleOn = this.phoneControlToggle ? this.phoneControlToggle.checked : false;
      // Show warning if user wants Phone Control ON, but AccessibilityService is NOT active in Android Settings
      this.phoneControlWarning.style.display = (isToggleOn && !running) ? 'block' : 'none';
    }

    const guideStatusText = document.getElementById('phoneControlGuideStatusText');
    if (guideStatusText) {
      if (running) {
        guideStatusText.innerHTML = '🟢 <span style="color:#4ade80;">सर्विस चालू है (Active)</span>';
      } else {
        guideStatusText.innerHTML = '🔴 <span style="color:#ffaa00;">सर्विस अभी बंद है (Inactive)</span>';
      }
    }
  }

  openSetupGuide() {
    const guideModal = document.getElementById('phoneControlSetupGuideModal');
    if (guideModal) guideModal.style.display = 'flex';
    this.checkAccessibilityStatus();
  }

  closeSetupGuide() {
    const guideModal = document.getElementById('phoneControlSetupGuideModal');
    if (guideModal) guideModal.style.display = 'none';
  }

  openStatusLogModal() {
    if (this.modalStatusLog) {
      this.modalStatusLog.style.display = 'flex';
      this.loadAccessibilityDiagnostics();
    }
  }

  closeStatusLogModal() {
    if (this.modalStatusLog) {
      this.modalStatusLog.style.display = 'none';
    }
  }

  async loadAccessibilityDiagnostics() {
    let diag = {
      running: false,
      lastConnectedTime: null,
      lastDisconnectedTime: null,
      lastDisconnectReason: null,
      errorLogs: []
    };

    if (window.systemLauncher && typeof window.systemLauncher.getAccessibilityDiagnostics === 'function') {
      try {
        diag = await window.systemLauncher.getAccessibilityDiagnostics();
      } catch (err) {
        console.warn('Failed to get accessibility diagnostics:', err);
      }
    } else {
      const running = await this._isAccessibilityRunning();
      diag.running = running;
      diag.lastConnectedTime = running ? new Date().toLocaleTimeString() : null;
      diag.lastDisconnectedTime = running ? null : '10 मिनट पहले';
      diag.lastDisconnectReason = running ? 'सर्विस सामान्य चल रही है' : 'Android Battery Saver या Task Killer द्वारा बंद';
    }

    if (this.diagStatusBadge) {
      if (diag.running) {
        this.diagStatusBadge.textContent = '🟢 चालू (Running)';
        this.diagStatusBadge.style.background = 'rgba(74, 222, 128, 0.2)';
        this.diagStatusBadge.style.color = '#4ade80';
      } else {
        this.diagStatusBadge.textContent = '🔴 बंद (OFF / Stopped)';
        this.diagStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        this.diagStatusBadge.style.color = '#f87171';
      }
    }

    if (this.diagConnectedTime) {
      this.diagConnectedTime.textContent = diag.lastConnectedTime || 'डेटा उपलब्ध नहीं';
    }

    if (this.diagDisconnectedTime) {
      this.diagDisconnectedTime.textContent = diag.lastDisconnectedTime || 'डेटा उपलब्ध नहीं';
    }

    if (this.diagReason) {
      this.diagReason.textContent = diag.lastDisconnectReason || (diag.running ? 'सर्विस सामान्य चल रही है' : 'Android OS या टास्क किलर द्वारा रोका गया');
    }

    if (this.diagLogsList) {
      const logs = Array.isArray(diag.errorLogs) ? diag.errorLogs : [];
      if (logs.length === 0) {
        this.diagLogsList.innerHTML = '<div style="color:var(--text-muted); font-size:11px;">कोई एरर लॉग दर्ज नहीं है (सिस्टम सुरक्षित और सामान्य है)।</div>';
      } else {
        this.diagLogsList.innerHTML = logs.map(l => {
          const time = l.time || (l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '');
          const errorMsg = l.error || l.message || JSON.stringify(l);
          const tag = l.tag ? `[${l.tag}] ` : '';
          return `
            <div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
              <span style="color:#ef4444; font-weight:700;">${tag}</span>
              <span style="color:var(--text-muted); font-size:10px;">${time}</span>
              <div style="color:#fca5a5; font-size:11px; word-break:break-all;">${escapeHtml(errorMsg)}</div>
            </div>
          `;
        }).join('');
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  async checkStartupStatus() {
    try {
      const wasEnabled = localStorage.getItem('jarvis_phone_control') === 'true';
      const isRunning = await this._isAccessibilityRunning();
      if (wasEnabled && !isRunning) {
        if (this.startupWarning) this.startupWarning.style.display = 'flex';
      } else {
        if (this.startupWarning) this.startupWarning.style.display = 'none';
      }
    } catch (e) {
      console.warn('checkStartupStatus failed:', e);
    }
  }

  async checkAccessibilityStatus() {
    const isRunning = await this._isAccessibilityRunning();
    this._updatePhoneControlBadge(isRunning);
    return isRunning;
  }

  renderPhoneControlLogs() {
    if (!this.phoneControlLogsList) return;
    const logs = (window.systemLauncher && typeof window.systemLauncher.getAuditLogs === 'function')
      ? window.systemLauncher.getAuditLogs()
      : [];

    if (!logs || logs.length === 0) {
      this.phoneControlLogsList.innerHTML = '<div style="color:var(--text-muted); font-size:11px; padding:6px 0;">कोई कमांड लॉग मौजूद नहीं है।</div>';
      return;
    }

    this.phoneControlLogsList.innerHTML = logs.map(l => {
      const isSuccess = l.status === 'SUCCESS';
      const color = isSuccess ? '#4ade80' : (l.status === 'STOPPED' ? '#fbbf24' : '#f87171');
      const time = l.timeStr || (l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '');
      const actionName = (l.action || '').toUpperCase();
      const targetStr = l.target ? ` &rarr; "${escapeHtml(l.target)}"` : '';
      const textStr = l.text ? ` (typed: "${escapeHtml(l.text)}")` : '';
      const msgStr = l.message ? `<div style="color:var(--text-secondary); font-size:10px; margin-top:2px;">${escapeHtml(l.message)}</div>` : '';

      return `
        <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:${color};">[${actionName}]</span>
            <span style="color:var(--text-muted); font-size:10px;">${time}</span>
          </div>
          <div style="color:var(--text-primary); font-size:11px;">${targetStr}${textStr}</div>
          ${msgStr}
        </div>
      `;
    }).join('');

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  updatePersonaBadge(persona) {
    const badge = document.getElementById('activePersonaBadge');
    if (!badge) return;
    badge.className = `persona-tag ${persona}`;
    if (persona === 'girlfriend') {
      badge.textContent = '💖 AI Girlfriend';
    } else if (persona === 'custom') {
      badge.textContent = '⚙️ Custom AI';
    } else {
      badge.textContent = '⚡ J.A.R.V.I.S.';
    }
  }
}

// Global High-Risk Action Confirmation Helper
window.confirmPhoneControlAction = function(actionDescription) {
  return new Promise((resolve) => {
    const modal = document.getElementById('phoneControlConfirmModal');
    const textElem = document.getElementById('phoneControlConfirmText');
    const controller = window.settingsController || window.settingsManager;

    if (!modal) {
      const ok = (typeof window !== 'undefined' && typeof window.confirm === 'function')
        ? window.confirm(`सुरक्षा चेतावनी:\n\n${actionDescription}\n\nक्या आप यह क्रिया करना चाहते हैं?`)
        : true;
      resolve(ok);
      return;
    }

    if (textElem) {
      textElem.textContent = actionDescription || 'क्या आप वाकई यह क्रिया करना चाहते हैं?';
    }
    modal.style.display = 'flex';

    if (controller) {
      controller._pendingConfirmResolve = resolve;
    } else {
      const btnYes = document.getElementById('btnConfirmActionYes');
      const btnNo = document.getElementById('btnConfirmActionNo');
      const done = (result) => {
        modal.style.display = 'none';
        if (btnYes) btnYes.onclick = null;
        if (btnNo) btnNo.onclick = null;
        resolve(result);
      };
      if (btnYes) btnYes.onclick = () => done(true);
      if (btnNo) btnNo.onclick = () => done(false);
    }
  });
};

window.SettingsController = SettingsController;

