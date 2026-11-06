// Advanced Universal Multilingual Voice Assistant (STT + Real-Time Language Detection + Multilingual TTS)
class VoiceAssistant {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.sttLang = 'hi-IN'; // Default speech recognition (accepts Hindi, English, Hinglish)
    this.lastDetectedLang = null;

    this.initRecognition();
    this.loadVoices();
  }

  loadVoices() {
    if (!this.synth) return;
    const updateVoices = () => {
      this.voices = this.synth.getVoices();
      // Populate settings voice dropdown if available
      const voiceSelect = document.getElementById('settingVoiceSelect');
      if (voiceSelect && this.voices.length > 0) {
        voiceSelect.innerHTML = '<option value="">Auto-Detect Language (Recommended)</option>';
        this.voices.forEach((v, i) => {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = `${v.name} [${v.lang}]`;
          voiceSelect.appendChild(opt);
        });
      }
    };
    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  // --- UNIVERSAL AUTOMATIC LANGUAGE DETECTOR ---
  detectLanguage(text) {
    if (!text || typeof text !== 'string') {
      return { code: 'en-US', name: 'English', bcp47: 'en-US', family: 'en' };
    }

    // 1. Assamese distinctive characters: ৰ (\u09F0), ৱ (\u09F1)
    if (/[\u09F0\u09F1]/.test(text)) {
      return { code: 'as-IN', name: 'Assamese', bcp47: 'as-IN', family: 'as' };
    }

    // 2. Bengali script (\u0980-\u09FF)
    if (/[\u0980-\u09FF]/.test(text)) {
      return { code: 'bn-IN', name: 'Bengali', bcp47: 'bn-IN', family: 'bn' };
    }

    // 3. Marathi distinctive (ळ \u0933 or Marathi common words)
    if (/\u0933/.test(text) || /\b(आहे|आहेत|नाही|काय|कसे|करणार|झाले|मी|तुम्ही)\b/.test(text)) {
      return { code: 'mr-IN', name: 'Marathi', bcp47: 'mr-IN', family: 'mr' };
    }

    // 4. Devanagari Script (Hindi)
    if (/[\u0900-\u097F]/.test(text)) {
      return { code: 'hi-IN', name: 'Hindi', bcp47: 'hi-IN', family: 'hi' };
    }

    // 5. Urdu / Arabic script
    if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
      if (/[ٹڈڑیںہ]/.test(text) || /\b(کیا|ہے|ہیں|ہوں|اور|آپ|شکریہ)\b/.test(text)) {
        return { code: 'ur-PK', name: 'Urdu', bcp47: 'ur-PK', family: 'ur' };
      }
      return { code: 'ar-SA', name: 'Arabic', bcp47: 'ar-SA', family: 'ar' };
    }

    // 6. Tamil (\u0B80-\u0BFF)
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return { code: 'ta-IN', name: 'Tamil', bcp47: 'ta-IN', family: 'ta' };
    }

    // 7. Telugu (\u0C00-\u0C7F)
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return { code: 'te-IN', name: 'Telugu', bcp47: 'te-IN', family: 'te' };
    }

    // 8. Punjabi (Gurmukhi \u0A00-\u0A7F)
    if (/[\u0A00-\u0A7F]/.test(text)) {
      return { code: 'pa-IN', name: 'Punjabi', bcp47: 'pa-IN', family: 'pa' };
    }

    // 9. Gujarati (\u0A80-\u0AFF)
    if (/[\u0A80-\u0AFF]/.test(text)) {
      return { code: 'gu-IN', name: 'Gujarati', bcp47: 'gu-IN', family: 'gu' };
    }

    // 10. Malayalam (\u0D00-\u0D7F)
    if (/[\u0D00-\u0D7F]/.test(text)) {
      return { code: 'ml-IN', name: 'Malayalam', bcp47: 'ml-IN', family: 'ml' };
    }

    // 11. Kannada (\u0C80-\u0CFF)
    if (/[\u0C80-\u0CFF]/.test(text)) {
      return { code: 'kn-IN', name: 'Kannada', bcp47: 'kn-IN', family: 'kn' };
    }

    // 12. Odia (\u0B00-\u0B7F)
    if (/[\u0B00-\u0B7F]/.test(text)) {
      return { code: 'or-IN', name: 'Odia', bcp47: 'or-IN', family: 'or' };
    }

    // 13. Japanese (Hiragana \u3040-\u309F or Katakana \u30A0-\u30FF)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return { code: 'ja-JP', name: 'Japanese', bcp47: 'ja-JP', family: 'ja' };
    }

    // 14. Chinese (CJK \u4E00-\u9FFF) without Japanese kana
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return { code: 'zh-CN', name: 'Chinese', bcp47: 'zh-CN', family: 'zh' };
    }

    // 15. Russian (Cyrillic \u0400-\u04FF)
    if (/[\u0400-\u04FF]/.test(text)) {
      return { code: 'ru-RU', name: 'Russian', bcp47: 'ru-RU', family: 'ru' };
    }

    // 16. Latin-based language differentiation (Spanish, German, French, Hinglish, English)
    const lower = text.toLowerCase();
    if (/[¿¡ñáéíóú]/.test(lower) || /\b(hola|gracias|buenos|amigo|como|esta|por favor|adios)\b/.test(lower)) {
      return { code: 'es-ES', name: 'Spanish', bcp47: 'es-ES', family: 'es' };
    }
    if (/[äöüß]/.test(lower) || /\b(guten|morgen|danke|bitte|nicht|ist|und|der|die|das)\b/.test(lower)) {
      return { code: 'de-DE', name: 'German', bcp47: 'de-DE', family: 'de' };
    }
    if (/[éèêçàô]/.test(lower) || /\b(bonjour|merci|oui|avec|pour|dans|vous|nous|salut)\b/.test(lower)) {
      return { code: 'fr-FR', name: 'French', bcp47: 'fr-FR', family: 'fr' };
    }

    // Check for Hinglish (Romanized Hindi words)
    if (/\b(kya|hai|hain|haan|theek|kaise|kahan|mera|meri|accha|nahi|batao|karo|aap|hum|tum|bhai|yaar|kuch|chahiye)\b/.test(lower)) {
      return { code: 'hi-Latn', name: 'Hinglish', bcp47: 'en-IN', family: 'hinglish' };
    }

    // Default: English
    return { code: 'en-US', name: 'English', bcp47: 'en-US', family: 'en' };
  }

  // Find the most natural speech synthesis voice for a detected language
  getVoiceForLanguage(langInfo) {
    if (!this.voices || this.voices.length === 0) return null;
    const targetCode = langInfo.bcp47.toLowerCase();
    const family = (langInfo.family || targetCode.split('-')[0]).toLowerCase();

    // 1. Exact match (e.g., 'bn-in')
    let match = this.voices.find(v => v.lang.toLowerCase() === targetCode);
    if (match) return match;

    // 2. Language family match (e.g. startsWith 'bn' for Bengali, 'as' for Assamese, 'hi' for Hindi, 'ur' for Urdu)
    match = this.voices.find(v => v.lang.toLowerCase().startsWith(family));
    if (match) return match;

    // 3. Fallback for Assamese if no 'as' voice on device: Bengali voice or Indian voice
    if (family === 'as') {
      match = this.voices.find(v => v.lang.toLowerCase().startsWith('bn'));
      if (match) return match;
    }

    // 4. Fallback for Hinglish: Indian English voice (en-IN)
    if (family === 'hinglish') {
      match = this.voices.find(v => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'));
      if (match) return match;
    }

    // 5. User selected voice or default
    return this.selectedVoice || this.voices[0];
  }

  initRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Speech Recognition API not supported in this browser environment.');
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.sttLang;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (window.soundFX) window.soundFX.activate();
      if (window.orb) window.orb.setState('LISTENING');
      this.updateMicUI(true);
      const langName = this.getLangLabel(this.sttLang);
      this.setTranscriptText(`Listening... (Speak in ${langName} or any language)`);
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const display = final || interim;
      if (display) {
        this.setTranscriptText(display);
      }

      if (final) {
        this.handleVoiceCommand(final.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.updateMicUI(false);
      if (window.orb) window.orb.setState('IDLE');
      this.setTranscriptText('Microphone paused: ' + event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateMicUI(false);
      if (!this.isSpeaking && window.orb) {
        window.orb.setState('IDLE');
      }
    };
  }

  setSpeechInputLanguage(langCode) {
    this.sttLang = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
    if (window.app) {
      window.app.showToast(`Speech Input set to: ${this.getLangLabel(langCode)}`);
    }
  }

  getLangLabel(code) {
    const map = {
      'hi-IN': 'Hindi / Hinglish / English',
      'as-IN': 'অসমীয়া (Assamese)',
      'bn-IN': 'বাংলা (Bengali)',
      'ur-PK': 'اردو (Urdu)',
      'ta-IN': 'தமிழ் (Tamil)',
      'te-IN': 'తెలుగు (Telugu)',
      'mr-IN': 'मराठी (Marathi)',
      'pa-IN': 'ਪੰਜਾਬੀ (Punjabi)',
      'gu-IN': 'ગુજરાતી (Gujarati)',
      'ml-IN': 'മലയാളം (Malayalam)',
      'kn-IN': 'ಕನ್ನಡ (Kannada)',
      'en-US': 'English (US)',
      'en-IN': 'English (India)',
      'ar-SA': 'العربية (Arabic)',
      'fr-FR': 'Français (French)',
      'es-ES': 'Español (Spanish)',
      'de-DE': 'Deutsch (German)',
      'ja-JP': '日本語 (Japanese)',
      'zh-CN': '中文 (Chinese)',
      'ru-RU': 'Русский (Russian)'
    };
    return map[code] || code;
  }

  toggleListening() {
    if (!this.recognition) {
      alert('Speech Recognition is not available. Please use Google Chrome or Android WebView with microphone permissions enabled.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        if (this.synth && this.synth.speaking) {
          this.synth.cancel();
        }
        this.recognition.lang = this.sttLang;
        this.recognition.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    }
  }

  updateMicUI(listening) {
    const micButtons = document.querySelectorAll('.btn-mic-toggle, #chatMicBtn');
    micButtons.forEach(btn => {
      if (listening) {
        btn.classList.add('listening');
      } else {
        btn.classList.remove('listening');
      }
    });
  }

  setTranscriptText(text) {
    const display = document.getElementById('voiceTranscriptDisplay');
    if (display) {
      display.textContent = text;
    }
  }

  // Voice Command & Intent Router with Automatic Multilingual Mirroring
  async handleVoiceCommand(transcript) {
    const lower = transcript.toLowerCase();

    // 1. Navigation Commands
    if (lower.includes('image generator') || lower.includes('photo banao') || lower.includes('generate image')) {
      window.app.switchTab('image');
      this.speak('Opening AI Image Generator. What image would you like to create?');
      return;
    }

    if (lower.includes('translator') || lower.includes('translate')) {
      window.app.switchTab('translator');
      this.speak('Opening Translator.');
      return;
    }

    if (lower.includes('writer') || lower.includes('story') || lower.includes('script')) {
      window.app.switchTab('writer');
      this.speak('Opening AI Writer Studio.');
      return;
    }

    if (lower.includes('dark mode')) {
      window.app.setTheme('dark');
      this.speak('Dark mode activated.');
      return;
    }

    if (lower.includes('light mode')) {
      window.app.setTheme('light');
      this.speak('Light mode activated.');
      return;
    }

    // 2. Google Chrome & YouTube Voice Commands
    const googleSearchPatterns = [
      /(?:search google for|google search for|search on google|google search)\s+(.+)/i,
      /(?:google par|google me|google pe)\s*(?:search karo|khojo|dekho)\s+(.+)/i,
      /(.+)\s+(?:google par search karo|google me search karo)/i,
      /search\s+(.+)\s+(?:on google|in google)/i,
      /search for\s+(.+)/i
    ];

    for (const pattern of googleSearchPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const query = match[1].trim();
        const spoken = `Searching Google for "${query}", Sir.`;
        this.setTranscriptText(spoken);
        this.speak(spoken);
        if (window.systemLauncher) window.systemLauncher.searchGoogle(query);
        return;
      }
    }

    if (lower.includes('open chrome') || lower.includes('chrome kholo') || lower.includes('chrome chalao') || lower.includes('chrome open karo')) {
      const spoken = 'Opening Google Chrome, Sir.';
      this.setTranscriptText(spoken);
      this.speak(spoken);
      if (window.systemLauncher) window.systemLauncher.openChrome();
      return;
    }

    const youtubeSearchPatterns = [
      /(?:search youtube for|youtube search for|search on youtube|youtube search)\s+(.+)/i,
      /(?:youtube par|youtube me|youtube pe)\s*(?:search karo|chalao|dekho)\s+(.+)/i
    ];

    for (const pattern of youtubeSearchPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const query = match[1].trim();
        const spoken = `Searching YouTube for "${query}", Sir.`;
        this.setTranscriptText(spoken);
        this.speak(spoken);
        if (window.systemLauncher) window.systemLauncher.openYouTube(query);
        return;
      }
    }

    if (lower.includes('open youtube') || lower.includes('youtube kholo') || lower.includes('youtube chalao') || lower.includes('youtube open karo')) {
      const spoken = 'Launching YouTube, Sir.';
      this.setTranscriptText(spoken);
      this.speak(spoken);
      if (window.systemLauncher) window.systemLauncher.openYouTube();
      return;
    }

    // 3. Real AI Multilingual Chat Processing
    if (window.orb) window.orb.setState('THINKING');
    this.setTranscriptText(`Thinking in your language: "${transcript}"...`);

    try {
      const activeSessionId = window.chat ? window.chat.activeSessionId : null;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: transcript,
          stream: false
        })
      });

      const data = await res.json();

      if (data.apiKeyRequired) {
        const notice = 'Google Gemini API key required. Please configure your key in Settings.';
        this.setTranscriptText(notice);
        this.speak(notice);
        if (window.chat) window.chat.appendApiKeyRequiredCard();
        return;
      }

      if (data.quotaExhausted) {
        const spokenNotice = 'Google Gemini API quota limit exhaust ho gaya hai. Please Settings me check karein.';
        this.setTranscriptText(spokenNotice);
        this.speak(spokenNotice);
        if (window.chat) {
          window.chat.appendQuotaExhaustedCard(data.content, data.modelsAttempted);
        }
        if (window.orb) window.orb.setState('IDLE');
        return;
      }

      const reply = data.content || data.error || 'No response received.';

      // Clean markdown tags for spoken audio
      const cleanSpoken = reply
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#*`_>~]/g, '')
        .trim();

      this.setTranscriptText(cleanSpoken.slice(0, 300));
      // Speak back in the EXACT same language that was received!
      this.speak(cleanSpoken);

      // Append to chat history
      if (window.chat && activeSessionId) {
        window.chat.loadSessionMessages(activeSessionId);
      }
    } catch (err) {
      this.setTranscriptText('Error: ' + err.message);
      this.speak('Network connection error.');
      if (window.orb) window.orb.setState('IDLE');
    }
  }

  // Universal Text-to-Speech (TTS) with Auto-Language Routing
  speak(text) {
    if (!this.synth) return;
    this.synth.cancel();

    // Strip code blocks and raw markdown syntax for clean spoken speech
    const clean = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/[#*`_>~]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!clean) return;

    // 1. Detect language automatically
    const langInfo = this.detectLanguage(clean);
    this.lastDetectedLang = langInfo;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.lang = langInfo.bcp47;

    // 2. Select appropriate voice
    const matchedVoice = this.getVoiceForLanguage(langInfo);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (window.orb) window.orb.setState('SPEAKING');
      if (window.app) {
        window.app.showToast(`🗣️ Speaking in ${langInfo.name}`);
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (window.orb) window.orb.setState('IDLE');
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (window.orb) window.orb.setState('IDLE');
    };

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      if (window.orb) window.orb.setState('IDLE');
    }
  }
}

window.voiceAssistant = new VoiceAssistant();
