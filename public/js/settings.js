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

    if (this.btnTestVoice) {
      this.btnTestVoice.addEventListener('click', () => {
        if (window.voiceAssistant) {
          const persona = this.personaSelect ? this.personaSelect.value : 'jarvis';
          if (persona === 'girlfriend') {
            window.voiceAssistant.speak('Aap kaise ho? Maine yeh voice settings test kiye hain, kya yeh theek lag rahi hai?');
          } else {
            window.voiceAssistant.speak('Audio calibration nominal. All systems functioning at peak efficiency, Sir.');
          }
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
      alert('Please enter an API Key to test.');
      return;
    }

    const testBtn = this.btnTestApiKey;
    if (testBtn) testBtn.textContent = 'Verifying...';

    try {
      // 1. Live discover active models via ListModels API
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const listRes = await fetch(listUrl);

      if (!listRes.ok) {
        const errJson = await listRes.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${listRes.status}`;

        if (listRes.status === 429) {
          alert('⚠️ Google Gemini Quota Exhausted (HTTP 429)\n\nNote: Google AI Studio free tier quotas reset within 24 hours. You can also insert another free API key.');
          return;
        }

        throw new Error(errMsg);
      }

      const listData = await listRes.json();
      const rawModels = Array.isArray(listData.models) ? listData.models : [];

      // Extract generateContent models and filter out discontinued ones
      const liveModels = rawModels
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(name => !isDiscontinuedModel(name));

      // Prioritize gemini-3.8-flash
      liveModels.sort((a, b) => {
        if (a === 'gemini-3.8-flash') return -1;
        if (b === 'gemini-3.8-flash') return 1;
        if (a.includes('3.8') && !b.includes('3.8')) return -1;
        if (b.includes('3.8') && !a.includes('3.8')) return 1;
        return a.localeCompare(b);
      });

      const activeCandidates = liveModels.length > 0 ? liveModels : ['gemini-3.8-flash', 'gemini-3.8-pro'];

      // 2. Test ping with candidate model
      let workingModel = null;
      let lastPingError = null;

      for (const candidate of activeCandidates) {
        try {
          const pingUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${key}`;
          const pingRes = await fetch(pingUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
          });

          if (pingRes.ok) {
            workingModel = candidate;
            break;
          }

          const pingErr = await pingRes.json().catch(() => ({}));
          lastPingError = pingErr.error?.message || `HTTP ${pingRes.status}`;
        } catch (callErr) {
          lastPingError = callErr.message;
        }
      }

      if (workingModel) {
        // Save key and update dropdown with live models list
        this.populateModelDropdown(activeCandidates, workingModel);
        if (window.ClientAI) {
          window.ClientAI.setApiKey(key);
          window.ClientAI.saveSettings({ ai_model: workingModel });
        }
        try { localStorage.setItem('jarvis_live_models', JSON.stringify(activeCandidates)); } catch (e) {}
        alert(`✅ API Key is VALID!\n\nConnected to: ${workingModel}\nLive models loaded from Google:\n• ${activeCandidates.join('\n• ')}`);
      } else {
        alert(`❌ API Key verification failed: ${lastPingError || 'Unable to generate response'}`);
      }
    } catch (err) {
      alert(`❌ API Key verification failed: ${err.message}`);
    } finally {
      if (testBtn) testBtn.textContent = 'Verify Key';
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
