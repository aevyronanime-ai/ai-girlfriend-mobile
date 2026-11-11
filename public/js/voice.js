// Advanced Universal Multilingual Voice Assistant (STT + Real-Time Language Detection + Multilingual Female TTS + Native Bridge)
class VoiceAssistant {
  constructor() {
    this.recognition = null;
    this.state = 'IDLE'; // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'
    this.isListening = false;
    this.isSpeaking = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.selectedVoice = null;
    this.rate = 0.98; // Natural conversational rate (0.95 - 1.0)
    this.pitch = 1.25; // Sweet, soft female voice pitch (1.2 - 1.3)
    this.sttLang = 'hi-IN'; // Default speech recognition (accepts Hindi, English, Hinglish)
    this.lastDetectedLang = null;
    this.speechQueue = [];
    this.currentLanguageInfo = null;
    this.keepAliveTimer = null;
    this._audioUnlocked = false;
    this._hindiVoiceNotified = false;

    this.initRecognition();
    this.loadVoices();
    this.setupAudioUnlock();
  }

  setState(s) {
    this.state = s;
    this.isListening = (s === 'LISTENING');
    this.isSpeaking = (s === 'SPEAKING');
    if (window.orb) window.orb.setState(s);
    const orbOverlay = document.getElementById('orbStateText');
    if (orbOverlay) orbOverlay.textContent = s;
  }

  setupAudioUnlock() {
    const unlock = () => this.unlockAudio();
    if (typeof document !== 'undefined') {
      document.addEventListener('click', unlock, { once: true, passive: true });
      document.addEventListener('touchstart', unlock, { once: true, passive: true });
    }
  }

  unlockAudio() {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    try {
      if (this.synth) {
        this.synth.resume();
        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0.01;
        dummy.rate = 2.0;
        this.synth.speak(dummy);
      }
    } catch (e) {}
  }

  loadVoices() {
    if (!this.synth) return;
    const updateVoices = () => {
      this.voices = this.synth.getVoices() || [];
      // Populate settings voice dropdown if available
      const voiceSelect = document.getElementById('settingVoiceSelect');
      if (voiceSelect && this.voices.length > 0) {
        voiceSelect.innerHTML = '<option value="">Auto-Detect Language & Sweet Female Voice (Recommended)</option>';
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
      return { code: 'hi-IN', name: 'Hindi', bcp47: 'hi-IN', family: 'hi' };
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

    // 13. Japanese
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return { code: 'ja-JP', name: 'Japanese', bcp47: 'ja-JP', family: 'ja' };
    }

    // 14. Chinese
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return { code: 'zh-CN', name: 'Chinese', bcp47: 'zh-CN', family: 'zh' };
    }

    // 15. Russian
    if (/[\u0400-\u04FF]/.test(text)) {
      return { code: 'ru-RU', name: 'Russian', bcp47: 'ru-RU', family: 'ru' };
    }

    // 16. Latin-based language differentiation
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

  hasHindiVoice() {
    if (!this.voices || this.voices.length === 0) return false;
    return this.voices.some(v => v.lang && v.lang.toLowerCase().startsWith('hi'));
  }

  // Find sweet, soft, female-preferred voice for language
  getVoiceForLanguage(langInfo) {
    if (!this.voices || this.voices.length === 0) return null;
    const targetCode = langInfo.bcp47.toLowerCase();
    const family = (langInfo.family || targetCode.split('-')[0]).toLowerCase();

    const isFemale = (v) => {
      const n = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
      return n.includes('female') || n.includes('google हिन्दी') || n.includes('woman') ||
             n.includes('girl') || n.includes('sweet') || n.includes('lekha') ||
             n.includes('kalpana') || n.includes('samantha') || n.includes('zira') ||
             n.includes('victoria') || n.includes('karen') || n.includes('natural');
    };

    // 1. Hindi: prioritize female hi-IN voice (Google हिन्दी, female, etc.)
    if (family === 'hi') {
      const hiFemale = this.voices.find(v => v.lang.toLowerCase().startsWith('hi') && isFemale(v));
      if (hiFemale) return hiFemale;

      const hiAny = this.voices.find(v => v.lang.toLowerCase().startsWith('hi'));
      if (hiAny) return hiAny;

      // Fallback: Indian English female voice
      const inFemale = this.voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india')) && isFemale(v));
      if (inFemale) return inFemale;

      const inAny = this.voices.find(v => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'));
      if (inAny) return inAny;
    }

    // 2. English & Hinglish: prioritize female voice (en-IN or en-US)
    if (family === 'en' || family === 'hinglish') {
      const enInFemale = this.voices.find(v => v.lang.toLowerCase().includes('en-in') && isFemale(v));
      if (enInFemale) return enInFemale;

      const enFemale = this.voices.find(v => v.lang.toLowerCase().startsWith('en') && isFemale(v));
      if (enFemale) return enFemale;

      const enAny = this.voices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (enAny) return enAny;
    }

    // 3. Fallback for Assamese if no 'as' voice: Bengali female voice
    if (family === 'as') {
      const bnFemale = this.voices.find(v => v.lang.toLowerCase().startsWith('bn') && isFemale(v));
      if (bnFemale) return bnFemale;
    }

    // 4. Exact match with female preference
    const exactFemale = this.voices.find(v => v.lang.toLowerCase() === targetCode && isFemale(v));
    if (exactFemale) return exactFemale;

    const exact = this.voices.find(v => v.lang.toLowerCase() === targetCode);
    if (exact) return exact;

    // 5. Family match with female preference
    const famFemale = this.voices.find(v => v.lang.toLowerCase().startsWith(family) && isFemale(v));
    if (famFemale) return famFemale;

    const fam = this.voices.find(v => v.lang.toLowerCase().startsWith(family));
    if (fam) return fam;

    return this.selectedVoice || this.voices.find(isFemale) || this.voices[0];
  }

  // Clean text of emojis, markdown, links, and code blocks before speaking
  cleanTextForSpeech(text) {
    if (!text || typeof text !== 'string') return '';
    let s = text;
    // 1. Remove code blocks
    s = s.replace(/```[\s\S]*?```/g, '');
    // 2. Remove inline code backticks
    s = s.replace(/`([^`]+)`/g, '$1');
    // 3. Remove URLs
    s = s.replace(/https?:\/\/\S+/gi, '');
    // 4. Remove Markdown links [text](url) -> text
    s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 5. Remove Markdown headings
    s = s.replace(/^#+\s+/gm, '');
    // 6. Remove bold, italic, strikethrough (*, _, ~)
    s = s.replace(/[*_~>#]/g, '');
    // 7. Remove emojis using Unicode regex
    s = s.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, '');
    // 8. Collapse whitespace and newlines
    s = s.replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();
    return s;
  }

  // Split text into natural sentence chunks (max ~130 chars) so Chrome/Android TTS never stalls
  splitIntoSentences(text) {
    if (!text) return [];
    // Split by Hindi purna viram (।), period (.), exclamation (!), question mark (?), or newline
    const rawSentences = text.split(/([।!?.\n]+)/);
    const sentences = [];
    let current = '';

    for (let i = 0; i < rawSentences.length; i++) {
      const part = rawSentences[i].trim();
      if (!part) continue;

      if (/^[।!?.\n]+$/.test(part)) {
        current += (current ? '' : '') + part;
        if (current.trim()) {
          sentences.push(current.trim());
          current = '';
        }
      } else {
        if (current) {
          sentences.push(current.trim());
        }
        current = part;
      }
    }
    if (current.trim()) {
      sentences.push(current.trim());
    }

    // Ensure chunks don't exceed ~130 characters
    const finalChunks = [];
    for (const sent of sentences) {
      if (sent.length <= 130) {
        finalChunks.push(sent);
      } else {
        const subParts = sent.split(/([,;:\s]+)/);
        let chunk = '';
        for (const sp of subParts) {
          if ((chunk + sp).length > 130 && chunk.trim()) {
            finalChunks.push(chunk.trim());
            chunk = sp;
          } else {
            chunk += sp;
          }
        }
        if (chunk.trim()) {
          finalChunks.push(chunk.trim());
        }
      }
    }

    return finalChunks.filter(c => c && c.length > 0);
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
      this.unlockAudio();
      this.setState('LISTENING');
      if (window.soundFX) window.soundFX.activate();
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
        this.setState('THINKING');
        this.handleVoiceCommand(final.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.setState('IDLE');
      this.updateMicUI(false);
      this.setTranscriptText('Microphone paused: ' + event.error);
      if (window.app && event.error !== 'no-speech') {
        window.app.showToast('Mic Notice: ' + event.error);
      }
    };

    this.recognition.onend = () => {
      this.updateMicUI(false);
      // ONLY return to IDLE if we were listening and got no speech; do NOT override THINKING or SPEAKING!
      if (this.state === 'LISTENING') {
        this.setState('IDLE');
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
    this.unlockAudio();

    if (!this.recognition) {
      if (window.app) {
        window.app.showToast('Speech Recognition is not available. Please allow microphone permissions.');
      }
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.stopSpeaking(false);
        this.recognition.lang = this.sttLang;
        this.recognition.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        if (window.app) window.app.showToast('Mic error: ' + err.message);
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
    { const _ip = window.chatImage && window.chatImage.match(lower); if (_ip) { window.chatImage.run(_ip, true); return; } }

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

    { const _ag = window.jarvisAgent && window.jarvisAgent.match(lower); if (_ag) { window.jarvisAgent.run(_ag); return; } }

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

    // 2.5 Phone Control & System Intent Voice Commands
    if (lower.includes('open whatsapp') || lower.includes('whatsapp kholo') || lower.includes('whatsapp chalao') || lower.includes('व्हाट्सएप खोलो')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'open_app', target: 'whatsapp' });
      return;
    }

    if (lower.includes('open camera') || lower.includes('camera kholo') || lower.includes('कैमरा खोलो') || lower.includes('photo khicho') || lower.includes('फ़ोटो खींचो')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'open_camera' });
      return;
    }

    if (lower.includes('torch on') || lower.includes('turn on torch') || lower.includes('torch jalao') || lower.includes('टॉर्च जलाओ') || lower.includes('flashlight on')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'toggle_torch', target: 'on' });
      return;
    }

    if (lower.includes('torch off') || lower.includes('turn off torch') || lower.includes('torch band') || lower.includes('टॉर्च बंद') || lower.includes('flashlight off')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'toggle_torch', target: 'off' });
      return;
    }

    if (lower.includes('go back') || lower.includes('peeche jao') || lower.includes('पीछे जाओ') || lower.includes('back jao')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'back' });
      return;
    }

    if (lower.includes('go home') || lower.includes('home screen') || lower.includes('होम पर जाओ') || lower.includes('होम स्क्रीन')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'home' });
      return;
    }

    if (lower.includes('recent apps') || lower.includes('recents') || lower.includes('हालिया ऐप्स')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'recents' });
      return;
    }

    if (lower.includes('scroll down') || lower.includes('niche scroll') || lower.includes('नीचे स्क्रॉल')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'scroll_down' });
      return;
    }

    if (lower.includes('scroll up') || lower.includes('upar scroll') || lower.includes('ऊपर स्क्रॉल')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'scroll_up' });
      return;
    }

    if (lower.includes('read screen') || lower.includes('screen padho') || lower.includes('स्क्रीन पढ़ो')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'read_screen' });
      return;
    }

    if (lower.includes('stop all') || lower.includes('sab roko') || lower.includes('सब रोको') || lower.includes('emergency stop')) {
      if (window.systemLauncher) window.systemLauncher.executeStructuredCommand({ action: 'stop_all' });
      return;
    }

    // 3. Real AI Multilingual Chat Processing
    this.setState('THINKING');
    this.setTranscriptText(`Thinking in your language: "${transcript}"...`);

    try {
      const activeSessionId = window.chat ? window.chat.activeSessionId : null;
      let reply = '';

      if (window.ClientAI) {
        const clientRes = await window.ClientAI.callGeminiDirect({
          sessionId: activeSessionId,
          message: transcript
        });
        reply = clientRes ? clientRes.text : '';
      } else {
        try {
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
            const spokenNotice = 'कोटा खत्म है (HTTP 429)। कृपया सेटिंग्स में नई API कुंजी जोड़ें।';
            this.setTranscriptText(spokenNotice);
            this.speak(spokenNotice);
            if (window.chat) {
              window.chat.appendQuotaExhaustedCard(data.content, data.modelsAttempted);
            }
            this.setState('IDLE');
            return;
          }

          reply = data.content || data.error || '';
        } catch (fetchErr) {
          if (window.ClientAI) {
            const clientRes = await window.ClientAI.callGeminiDirect({
              sessionId: activeSessionId,
              message: transcript
            });
            reply = clientRes ? clientRes.text : '';
          } else {
            throw fetchErr;
          }
        }
      }

      if (!reply || !reply.trim()) {
        reply = 'माफ़ कीजिए, मुझे Google AI से कोई जवाब नहीं मिला। कृपया दोबारा बोलें।';
      }

      // Display response in Voice tab with Copy button
      const respCard = document.getElementById('voiceResponseCard');
      const respText = document.getElementById('voiceResponseText');
      const copyBtn = document.getElementById('btnVoiceCopyResponse');

      if (respCard && respText) {
        respCard.style.display = 'block';
        if (window.chat && typeof window.chat.renderMarkdown === 'function') {
          respText.innerHTML = window.chat.renderMarkdown(reply);
        } else {
          respText.textContent = reply;
        }

        if (copyBtn) {
          copyBtn.onclick = () => {
            if (typeof window.copyTextWithFeedback === 'function') {
              window.copyTextWithFeedback(reply, copyBtn);
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(reply).then(() => {
                copyBtn.innerHTML = 'Copied ✓';
                setTimeout(() => { copyBtn.innerHTML = '📋 Copy'; }, 2500);
              });
            }
          };
        }
      }

      // Check for structured Phone Control command in AI reply
      let speechToSpeak = reply;
      if (window.systemLauncher && typeof window.systemLauncher.executeStructuredCommand === 'function') {
        const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || reply.match(/(\{[\s\S]*"action"\s*:\s*"[^"]+"[\s\S]*\})/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            if (parsed && parsed.action) {
              window.systemLauncher.executeStructuredCommand(parsed);
              if (parsed.spokenText) {
                speechToSpeak = parsed.spokenText;
              }
            }
          } catch (e) {}
        }
      }

      this.setTranscriptText(speechToSpeak.slice(0, 180) + (speechToSpeak.length > 180 ? '...' : ''));

      // Automatically speak the response aloud
      this.speak(speechToSpeak);

      // Append to chat history
      if (window.chat && activeSessionId) {
        window.chat.loadSessionMessages(activeSessionId);
      }
    } catch (err) {
      const errNotice = (typeof window.formatGeminiErrorHindi === 'function')
        ? window.formatGeminiErrorHindi(err?.status || 0, err?.message, err)
        : 'त्रुटि: ' + err.message;
      this.setTranscriptText(errNotice.slice(0, 300));
      this.speak('माफ़ कीजिए, कनेक्शन एरर आया है। कृपया इंटरनेट चेक करें।');
      this.setState('IDLE');
      if (window.app) window.app.showToast('Voice Error: ' + err.message);
    }
  }

  // Universal Text-to-Speech (TTS) with Auto-Language Routing & Chunking
  async speak(text) {
    this.stopSpeaking(false);

    if (!text || typeof text !== 'string' || !text.trim()) {
      this.setState('IDLE');
      return;
    }

    // 1. Clean markdown, emojis, code blocks
    const cleaned = this.cleanTextForSpeech(text);
    if (!cleaned) {
      this.setState('IDLE');
      return;
    }

    // 2. Detect language automatically
    const langInfo = this.detectLanguage(cleaned);
    this.lastDetectedLang = langInfo;

    let warnedHindi = false;
    // Check if speaking in Hindi but device lacks Hindi voice
    if (langInfo.family === 'hi' && !this.hasHindiVoice()) {
      if (window.app && !this._hindiVoiceNotified) {
        this._hindiVoiceNotified = true;
        warnedHindi = true;
        window.app.showToast('Settings → Text-to-speech में Hindi (India) आवाज़ डाउनलोड करें');
      }
    }

    // 2.5 Termux human-like girl voice (edge-tts server)
    try {
      const tr = await fetch("http://127.0.0.1:5005/tts?text=" + encodeURIComponent(cleaned));
      if (tr.ok) {
        const tb = await tr.blob();
        if (window._termuxVoice) window._termuxVoice.pause();
        window._termuxVoice = new Audio(URL.createObjectURL(tb));
        this.setState('SPEAKING');
        await window._termuxVoice.play();
        window._termuxVoice.onended = () => this.setState('IDLE');
        return;
      }
    } catch (e) { /* server बंद है, पुरानी आवाज़ पर जाओ */ }

    // 3. Try Native Android TTS bridge first if in Capacitor / APK
    if (window.systemLauncher && typeof window.systemLauncher.speakText === 'function') {
      try {
        const nativeRes = await window.systemLauncher.speakText({
          text: cleaned,
          lang: langInfo.bcp47,
          pitch: this.pitch,
          rate: this.rate
        });
        if (nativeRes && nativeRes.success) {
          this.setState('SPEAKING');
          if (window.app && !warnedHindi) window.app.showToast(`🗣️ Speaking in ${langInfo.name}`);
          // Native auto-clears after estimated duration
          const estDurationMs = Math.max(2000, Math.min(30000, (cleaned.length / 15) * 1000));
          setTimeout(() => {
            if (this.state === 'SPEAKING') this.setState('IDLE');
          }, estDurationMs);
          return;
        }
      } catch (e) {
        console.warn('Native TTS bridge fallback to web synthesis:', e);
      }
    }

    if (!this.synth) {
      this.setState('IDLE');
      return;
    }

    // 4. Split into sentence chunks to prevent Chrome utterance freeze
    const chunks = this.splitIntoSentences(cleaned);
    if (chunks.length === 0) {
      this.setState('IDLE');
      return;
    }

    this.speechQueue = [...chunks];
    this.currentLanguageInfo = langInfo;
    this.setState('SPEAKING');

    if (window.app && !warnedHindi) {
      window.app.showToast(`🗣️ Speaking in ${langInfo.name}`);
    }

    this.playNextSpeechChunk();
  }

  playNextSpeechChunk() {
    if (!this.synth || this.speechQueue.length === 0) {
      this.setState('IDLE');
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
      return;
    }

    const sentence = this.speechQueue.shift();
    if (!sentence || !sentence.trim()) {
      this.playNextSpeechChunk();
      return;
    }

    const UtteranceClass = (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    if (!UtteranceClass) return;
    const utterance = new UtteranceClass(sentence.trim());
    utterance.rate = this.rate; // 0.98
    utterance.pitch = this.pitch; // 1.25 (sweet female pitch)
    utterance.lang = this.currentLanguageInfo ? this.currentLanguageInfo.bcp47 : 'hi-IN';

    const matchedVoice = this.getVoiceForLanguage(this.currentLanguageInfo || { bcp47: 'hi-IN', family: 'hi' });
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      this.setState('SPEAKING');
    };

    utterance.onend = () => {
      this.playNextSpeechChunk();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e.error);
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        if (window.app) window.app.showToast('Voice Notice: ' + (e.error || 'Playback error'));
      }
      this.playNextSpeechChunk();
    };

    // Chrome long-speech keepalive interval
    if (!this.keepAliveTimer) {
      this.keepAliveTimer = setInterval(() => {
        if (this.synth && this.synth.speaking) {
          this.synth.pause();
          this.synth.resume();
        }
      }, 8000);
    }

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error('synth.speak error:', err);
      this.setState('IDLE');
    }
  }

  stopSpeaking(showFeedback = true) {
    this.speechQueue = [];
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    if (this.synth) {
      try { this.synth.cancel(); } catch (e) {}
    }

    if (window.systemLauncher && typeof window.systemLauncher.stopSpeech === 'function') {
      window.systemLauncher.stopSpeech().catch(() => {});
    }

    this.setState('IDLE');

    if (showFeedback && window.app) {
      window.app.showToast('Speech stopped');
    }
  }
}

// Global instance
window.voiceAssistant = new VoiceAssistant();
