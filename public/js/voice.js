// Advanced Voice Assistant (Speech Recognition STT + Speech Synthesis TTS)
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
    this.lang = 'hi-IN'; // Default to bilingual / Hindi-English
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
        voiceSelect.innerHTML = '';
        this.voices.forEach((v, i) => {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = `${v.name} (${v.lang})${v.default ? ' [Default]' : ''}`;
          voiceSelect.appendChild(opt);
        });
      }
    };
    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
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
    this.recognition.lang = 'hi-IN'; // Recognizes both Hindi and Indian English

    this.recognition.onstart = () => {
      this.isListening = true;
      if (window.soundFX) window.soundFX.activate();
      if (window.orb) window.orb.setState('LISTENING');
      this.updateMicUI(true);
      this.setTranscriptText('Listening... (Hindi / English me boliye)');
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
      this.setTranscriptText('Voice recognition paused: ' + event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateMicUI(false);
      if (!this.isSpeaking && window.orb) {
        window.orb.setState('IDLE');
      }
    };
  }

  toggleListening() {
    if (!this.recognition) {
      alert('Speech Recognition is not available in your browser. Please use Google Chrome or Android WebView with microphone permissions enabled.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        // Stop any active speech before listening
        if (this.synth && this.synth.speaking) {
          this.synth.cancel();
        }
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

  // Voice Command Intent Router
  async handleVoiceCommand(transcript) {
    const lower = transcript.toLowerCase();

    // 1. Voice App Navigation Commands
    if (lower.includes('image generator') || lower.includes('photo banao') || lower.includes('generate image')) {
      window.app.switchTab('image');
      this.speak('Opening AI Image Generator. What image would you like to create?');
      return;
    }

    if (lower.includes('translator') || lower.includes('translate')) {
      window.app.switchTab('translator');
      this.speak('Opening Translator. Please provide the text to translate.');
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

    // --- GOOGLE CHROME & YOUTUBE SYSTEM LAUNCHER VOICE COMMANDS ---

    // 1. Google Search: "search google for [query]" / "google par search karo [query]" / "search [query] on google"
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

    // 2. Open Chrome: "open chrome" / "chrome kholo" / "chrome open karo"
    if (lower.includes('open chrome') || lower.includes('chrome kholo') || lower.includes('chrome chalao') || lower.includes('chrome open karo') || lower.includes('launch chrome')) {
      const spoken = 'Opening Google Chrome, Sir.';
      this.setTranscriptText(spoken);
      this.speak(spoken);
      if (window.systemLauncher) window.systemLauncher.openChrome();
      return;
    }

    // 3. YouTube Search: "search youtube for [query]" / "youtube par search karo [query]"
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

    // 4. Open YouTube: "open youtube" / "youtube kholo" / "youtube chalao"
    if (lower.includes('open youtube') || lower.includes('youtube kholo') || lower.includes('youtube chalao') || lower.includes('youtube open karo') || lower.includes('launch youtube')) {
      const spoken = 'Launching YouTube, Sir.';
      this.setTranscriptText(spoken);
      this.speak(spoken);
      if (window.systemLauncher) window.systemLauncher.openYouTube();
      return;
    }

    // 2. Normal Chat Query via Voice
    if (window.orb) window.orb.setState('THINKING');
    this.setTranscriptText('Thinking: "' + transcript + '"...');

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
      const reply = data.content || data.error || 'I could not process that request.';
      
      // Clean markdown tags for spoken audio
      const cleanSpoken = reply
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/[#*`_>~]/g, '')
        .slice(0, 350); // Keep voice reply brief and natural

      this.setTranscriptText(cleanSpoken);
      this.speak(cleanSpoken);

      // Also append to chat history UI if active
      if (window.chat) {
        window.chat.loadSessionMessages(activeSessionId);
      }
    } catch (err) {
      this.setTranscriptText('Error: ' + err.message);
      this.speak('An error occurred while connecting to my neural network.');
      if (window.orb) window.orb.setState('IDLE');
    }
  }

  // Text-to-Speech (TTS)
  speak(text) {
    if (!this.synth) return;
    this.synth.cancel(); // Cancel ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    // Detect Hindi script or Hinglish words
    const hasHindiScript = /[\u0900-\u097F]/.test(text);
    if (hasHindiScript) {
      const hindiVoice = this.voices.find(v => v.lang.startsWith('hi'));
      if (hindiVoice) utterance.voice = hindiVoice;
    } else if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    } else {
      // Prefer Indian English or modern natural voice
      const preferred = this.voices.find(v => v.lang.includes('en-IN') || v.name.includes('Google') || v.name.includes('Natural'));
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (window.orb) window.orb.setState('SPEAKING');
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
