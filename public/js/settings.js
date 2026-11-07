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

    this.bindEvents();
    this.loadSettings();
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

window.SettingsController = SettingsController;
