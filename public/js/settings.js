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
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const settings = await res.json();

      if (this.apiKeyInput && settings.gemini_api_key_masked) {
        this.apiKeyInput.placeholder = `Configured: ${settings.gemini_api_key_masked}`;
      }
      if (this.modelSelect && settings.ai_model) this.modelSelect.value = settings.ai_model;
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

      this.updatePersonaBadge(settings.persona || 'jarvis');
    } catch (err) {
      console.error('Settings load error:', err);
    }
  }

  async saveSettings() {
    const payload = {};
    if (this.apiKeyInput && this.apiKeyInput.value.trim()) {
      payload.gemini_api_key = this.apiKeyInput.value.trim();
    }
    if (this.modelSelect) payload.ai_model = this.modelSelect.value;
    if (this.personaSelect) payload.persona = this.personaSelect.value;
    if (this.userNameInput) payload.user_name = this.userNameInput.value.trim() || 'Sir';
    if (this.customPromptInput) payload.custom_system_prompt = this.customPromptInput.value.trim();
    if (this.voiceRateInput) payload.voice_rate = this.voiceRateInput.value;
    if (this.voicePitchInput) payload.voice_pitch = this.voicePitchInput.value;
    if (this.soundFxToggle) payload.sound_fx = this.soundFxToggle.checked ? 'true' : 'false';

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (window.app) window.app.showToast('Settings saved successfully!');
        if (window.soundFX) window.soundFX.success();
        this.updatePersonaBadge(payload.persona || 'jarvis');
        if (window.app) window.app.updateStatusIndicator();
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  }

  async testApiKey() {
    const key = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
    if (!key) {
      alert('Please enter an API Key to test.');
      return;
    }

    const testBtn = this.btnTestApiKey;
    if (testBtn) testBtn.textContent = 'Testing...';

    try {
      const model = this.modelSelect ? this.modelSelect.value : 'gemini-2.5-flash';
      const res = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, model })
      });

      const data = await res.json();

      if (data.valid && !data.quotaExhausted) {
        alert(`✅ API Key is VALID and connected to ${data.model} successfully!`);
      } else if (data.quotaExhausted) {
        alert(`⚠️ Google Gemini Quota Exhausted (HTTP 429)\n\n${data.message}\n\nNote: Google AI Studio free tier quotas reset automatically within 24 hours. You can also insert another free API key.`);
      } else {
        alert(`❌ API Key verification failed: ${data.message || data.error || 'Invalid API Key'}`);
      }
    } catch (err) {
      alert('❌ API Key verification network error: ' + err.message);
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
