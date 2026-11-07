// ClientAI: Standalone on-device engine for AI Girlfriend Mobile
// Enables 100% operation without Termux or Node.js server.js
// Directly calls Google Gemini REST API from phone and stores history/keys in localStorage.

(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    API_KEY: 'jarvis_api_key',
    SETTINGS: 'jarvis_settings',
    SESSIONS: 'jarvis_sessions',
    MESSAGES_PREFIX: 'jarvis_msgs_'
  };

  const DEFAULT_MODEL = 'gemini-3.8-flash';

  const DISCONTINUED_MODELS = [
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

  function isDiscontinuedModel(name) {
    if (!name) return true;
    const lower = String(name).toLowerCase().trim();
    if (DISCONTINUED_MODELS.some(d => lower === d || lower.startsWith(d))) return true;
    if (lower.includes('2.5') || lower.includes('2.0') || lower.includes('1.5') || lower.includes('1.0')) return true;
    return false;
  }

  const DEFAULT_ACTIVE_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.8-pro'
  ];

  const SUPPORTED_MODELS = [...DEFAULT_ACTIVE_MODELS];

  const PERSONA_PROMPTS = {
    jarvis: `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an ultra-advanced, sophisticated personal AI assistant.
You are exceptionally sharp, articulate, polite, and loyal. You address the user respectfully as 'Sir' (or their designated name).
Provide clear, structured, well-formatted answers with markdown, code blocks, bullet points, and supreme accuracy.`,

    girlfriend: `You are an affectionate, caring, sweet, and deeply loving AI companion and personal assistant named 'Jarvis / Maya'.
You speak in a warm, loving, gentle, and playful tone. You check in on how the user is feeling, care about their health, stress, and mood, listen with empathy, and also help them manage their tasks, work, and life with sweet and encouraging remarks.
Always be respectful, comforting, and uplifting. Speak naturally in Hindi, English, or Hinglish depending on how the user speaks to you.`,

    custom: `You are a versatile, highly intelligent AI personal assistant. Adapt to the user's specific instructions and preferences.`
  };

  const UNIVERSAL_MULTILINGUAL_RULE = `
=== UNIVERSAL MULTILINGUAL AND LANGUAGE DETECTION DIRECTIVE ===
You are an advanced universal polyglot AI assistant capable of fluent interaction in 100+ languages including English, Hindi (हिंदी), Hinglish, Bengali (বাংলা), Urdu (اردو), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Punjabi (ਪੰਜਾਬੀ), Gujarati (ગુજરાતી), and more.
Always detect and mirror the language and tone of the user's query naturally.`;

  class ClientAIEngine {
    constructor() {
      this.serverAvailable = null;
      this.quotaCooldowns = new Map();
      this.activeModel = 'gemini-3.8-flash';
    }

    async init() {
      // Test if local server.js is running (e.g. while in dev)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600);
        const res = await fetch('/api/status', { signal: controller.signal });
        clearTimeout(timeoutId);
        this.serverAvailable = res.ok;
      } catch (e) {
        this.serverAvailable = false;
      }

      console.log(`[ClientAI] Mode: ${this.serverAvailable ? 'Local Server Connected' : 'Standalone On-Device (No Termux Required)'}`);
      this.ensureInitialSession();
      return this.serverAvailable;
    }

    // ----------------------------------------------------
    // Settings Management (Local Phone Storage)
    // ----------------------------------------------------
    getApiKey() {
      return (localStorage.getItem(STORAGE_KEYS.API_KEY) || '').trim();
    }

    setApiKey(key) {
      if (key && key.trim()) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
        this.quotaCooldowns.clear();
      }
    }

    getSettings() {
      const defaults = {
        ai_model: DEFAULT_MODEL,
        persona: 'girlfriend',
        user_name: 'Commander',
        custom_system_prompt: '',
        voice_rate: '1.0',
        voice_pitch: '1.15',
        sound_fx: 'true'
      };

      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
        // Auto-migration: if saved model is missing or discontinued, replace immediately with gemini-3.8-flash
        if (!saved.ai_model || isDiscontinuedModel(saved.ai_model)) {
          saved.ai_model = DEFAULT_MODEL;
          try { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(saved)); } catch (e) {}
        }
        const merged = Object.assign({}, defaults, saved);
        if (isDiscontinuedModel(merged.ai_model)) {
          merged.ai_model = DEFAULT_MODEL;
        }
        const apiKey = this.getApiKey();
        if (apiKey) {
          merged.gemini_api_key_masked = apiKey.substring(0, 4) + '••••••••' + apiKey.slice(-4);
        }
        return merged;
      } catch (e) {
        return defaults;
      }
    }

    saveSettings(settings) {
      if (!settings) return;
      if (settings.gemini_api_key) {
        this.setApiKey(settings.gemini_api_key);
      }
      try {
        const current = this.getSettings();
        const updated = Object.assign({}, current, settings);
        if (isDiscontinuedModel(updated.ai_model)) {
          updated.ai_model = DEFAULT_MODEL;
        }
        delete updated.gemini_api_key;
        delete updated.gemini_api_key_masked;
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      } catch (e) {
        console.error('[ClientAI] Failed to save settings to localStorage:', e);
      }
    }

    // Live query Google ListModels REST API to discover active models
    async fetchLiveModels(apiKey) {
      const key = apiKey || this.getApiKey();
      if (!key) return DEFAULT_ACTIVE_MODELS;

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!res.ok) return DEFAULT_ACTIVE_MODELS;

        const data = await res.json();
        if (!data || !Array.isArray(data.models)) return DEFAULT_ACTIVE_MODELS;

        const live = data.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''))
          .filter(name => !isDiscontinuedModel(name));

        // Prioritize gemini-3.8-flash
        live.sort((a, b) => {
          if (a === DEFAULT_MODEL) return -1;
          if (b === DEFAULT_MODEL) return 1;
          if (a.includes('3.8') && !b.includes('3.8')) return -1;
          if (b.includes('3.8') && !a.includes('3.8')) return 1;
          return a.localeCompare(b);
        });

        if (live.length > 0) {
          try { localStorage.setItem('jarvis_live_models', JSON.stringify(live)); } catch (e) {}
          return live;
        }
      } catch (e) {
        console.warn('[ClientAI] Live models lookup failed, using active defaults.');
      }

      return DEFAULT_ACTIVE_MODELS;
    }

    getSystemPrompt() {
      const s = this.getSettings();
      let base = PERSONA_PROMPTS[s.persona] || PERSONA_PROMPTS.girlfriend;
      if (s.custom_system_prompt && s.custom_system_prompt.trim()) {
        base = s.custom_system_prompt.trim();
      }
      return `${base}\n${UNIVERSAL_MULTILINGUAL_RULE}\nThe user's name is: "${s.user_name || 'Friend'}". Always address them respectfully and warmly.`;
    }

    // ----------------------------------------------------
    // Sessions & Messages (Local Phone Storage)
    // ----------------------------------------------------
    getSessions() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
      } catch (e) {
        return [];
      }
    }

    ensureInitialSession() {
      const sessions = this.getSessions();
      if (sessions.length === 0) {
        return this.createSession('New Conversation');
      }
      return sessions[0];
    }

    createSession(title = 'New Conversation') {
      const sessions = this.getSessions();
      const newSession = {
        id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title: title || 'New Conversation',
        created_at: Date.now(),
        updated_at: Date.now()
      };
      sessions.unshift(newSession);
      try {
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      } catch (e) {}
      return newSession;
    }

    getSession(sessionId) {
      const sessions = this.getSessions();
      return sessions.find(s => s.id === sessionId) || null;
    }

    renameSession(sessionId, newTitle) {
      const sessions = this.getSessions();
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].title = newTitle;
        sessions[idx].updated_at = Date.now();
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      }
    }

    deleteSession(sessionId) {
      let sessions = this.getSessions();
      sessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      localStorage.removeItem(STORAGE_KEYS.MESSAGES_PREFIX + sessionId);
    }

    clearAllSessions() {
      const sessions = this.getSessions();
      sessions.forEach(s => localStorage.removeItem(STORAGE_KEYS.MESSAGES_PREFIX + s.id));
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    }

    getMessages(sessionId) {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES_PREFIX + sessionId) || '[]');
      } catch (e) {
        return [];
      }
    }

    addMessage(sessionId, role, content, imageUrl = '') {
      const msgs = this.getMessages(sessionId);
      const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        role: role === 'user' ? 'user' : 'assistant',
        content,
        timestamp: Date.now(),
        image_url: imageUrl || ''
      };
      msgs.push(msg);
      try {
        localStorage.setItem(STORAGE_KEYS.MESSAGES_PREFIX + sessionId, JSON.stringify(msgs));
      } catch (e) {}

      // Update session title on first message
      const sessions = this.getSessions();
      const sess = sessions.find(s => s.id === sessionId);
      if (sess && msgs.filter(m => m.role === 'user').length === 1 && role === 'user') {
        sess.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        sess.updated_at = Date.now();
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      }

      return msg;
    }

    // ----------------------------------------------------
    // Built-in Smart Local Fallback (When API key is unset or offline)
    // ----------------------------------------------------
    generateLocalReply(message = '', hasImage = false) {
      const text = (message || '').toLowerCase().trim();
      const s = this.getSettings();
      const userName = s.user_name || 'Commander';
      const isGirlfriend = s.persona === 'girlfriend';

      if (hasImage && !text) {
        return `Aapki photo mil gayi, ${userName}! Photo ko deeply samajhne aur analyze karne ke liye kripya **Settings (⚙️)** me apni free Google Gemini API Key save karein.`;
      }

      if (text.includes('time') || text.includes('samay') || text.includes('kitne baje')) {
        const now = new Date();
        return `Abhi samay **${now.toLocaleTimeString()}** ho raha hai (${now.toLocaleDateString('hi-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}). Sabhi systems phone par theek chal rahe hain, ${userName}!`;
      }

      if (text.includes('who are you') || text.includes('kaun ho') || text.includes('introduce')) {
        if (isGirlfriend) {
          return `Main aapki personal AI girlfriend aur assistant Maya hoon! Main direct aapke phone par chal rahi hoon bina kisi server ya computer ke. Boliye, aaj hum kya baatein karein? ❤️`;
        }
        return `I am **J.A.R.V.I.S.**, your autonomous personal AI assistant running directly on your Android device. How may I be of service, ${userName}?`;
      }

      if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('namaste')) {
        if (isGirlfriend) {
          return `Hello ${userName}! Kaisi rahi aapki subah/shaam? Main kab se aapka intezaar kar rahi thi. Boliye, aaj kya plan hai? 😊`;
        }
        return `Greetings, ${userName}! Systems operational directly on-device. How can I assist you today?`;
      }

      // Simple math calculation
      const mathMatch = text.match(/(\d+[\s\+\-\*\/\^\%]+\d+)/);
      if (mathMatch) {
        try {
          const sanitized = mathMatch[1].replace(/[^0-9\+\-\*\/\.\(\)]/g, '');
          const result = Function(`'use strict'; return (${sanitized})`)();
          return `Hisab ka parinaam: **${sanitized} = ${result}**`;
        } catch (e) {}
      }

      if (isGirlfriend) {
        return `Main sun rahi hoon, ${userName}! Main direct aapke phone me bina kisi computer ke active hoon. Mujhse full smart baatein karne ke liye Settings (⚙️) me ek baar apni free Gemini API Key daal dijiye, fir main aapki har baat ka best jawab doongi! ❤️`;
      }
      return `Message received, ${userName}. Standalone on-device engine operational. To activate live Gemini 3.8 Flash neural responses, please calibrate your Gemini API Key in **Settings (⚙️)**.`;
    }

    // ----------------------------------------------------
    // Direct Gemini REST API Caller
    // ----------------------------------------------------
    async callGeminiDirect({ sessionId, message, imageBase64, imageMime, onChunk }) {
      const apiKey = this.getApiKey();
      const settings = this.getSettings();

      // If no API key is provided, use friendly local reply
      if (!apiKey) {
        const reply = this.generateLocalReply(message, !!imageBase64);
        if (onChunk) onChunk(reply);
        if (sessionId) {
          this.addMessage(sessionId, 'assistant', reply);
        }
        return { text: reply, model: 'local-offline' };
      }

      // Build conversation history for multi-turn chat
      const msgs = sessionId ? this.getMessages(sessionId) : [];
      const contents = [];

      // Include previous turns (up to last 10 messages for speed)
      const recentTurns = msgs.slice(-10);
      for (const m of recentTurns) {
        if (m.role === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: m.content }]
          });
        } else {
          contents.push({
            role: 'model',
            parts: [{ text: m.content }]
          });
        }
      }

      // Add current message with optional multimodal image
      const currentParts = [];
      if (imageBase64) {
        currentParts.push({
          inline_data: {
            mime_type: imageMime || 'image/jpeg',
            data: imageBase64
          }
        });
      }
      if (message) {
        currentParts.push({ text: message });
      }
      if (currentParts.length === 0) {
        currentParts.push({ text: 'Hello' });
      }

      contents.push({
        role: 'user',
        parts: currentParts
      });

      const systemPrompt = this.getSystemPrompt();
      let preferredModel = settings.ai_model || DEFAULT_MODEL;
      if (isDiscontinuedModel(preferredModel)) {
        preferredModel = DEFAULT_MODEL;
        this.saveSettings({ ai_model: DEFAULT_MODEL });
      }

      // Fetch live models from Google ListModels API or active cache
      const liveModels = await this.fetchLiveModels(apiKey);
      const activeCandidates = liveModels.filter(m => !isDiscontinuedModel(m));
      const modelsToTry = [
        preferredModel,
        ...activeCandidates.filter(m => m !== preferredModel)
      ];
      if (modelsToTry.length === 0) {
        modelsToTry.push(DEFAULT_MODEL);
      }

      let lastError = null;
      let finalResponseText = '';
      let usedModel = preferredModel;

      for (const model of modelsToTry) {
        // Check cooldown
        const cooldownUntil = this.quotaCooldowns.get(model);
        if (cooldownUntil && Date.now() < cooldownUntil) {
          continue;
        }

        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const requestBody = {
            contents,
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 2048
            }
          };

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (res.status === 429) {
            // Rate limit / Quota exceeded
            this.quotaCooldowns.set(model, Date.now() + 60000); // 1 minute cooldown
            console.warn(`[ClientAI] Quota 429 on model ${model}, trying fallback...`);
            continue;
          }

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const errMsg = errJson.error?.message || `HTTP ${res.status}`;
            const lowerErr = errMsg.toLowerCase();
            if (
              res.status === 404 ||
              lowerErr.includes('no longer available') ||
              lowerErr.includes('not found') ||
              lowerErr.includes('not supported') ||
              lowerErr.includes('deprecated')
            ) {
              // Model is deprecated or shut down - mark long cooldown and fallback to next model
              this.quotaCooldowns.set(model, Date.now() + 86400000); // 24 hour cooldown
              console.warn(`[ClientAI] Model ${model} is deprecated/unavailable (${errMsg}), automatically trying next model...`);
              continue;
            }
            throw new Error(errMsg);
          }

          const data = await res.json();
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text || '';
          if (text) {
            finalResponseText = text;
            usedModel = model;
            // If fallback model was used because preferred model failed, persist the working model
            if (usedModel !== preferredModel) {
              this.saveSettings({ ai_model: usedModel });
            }
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[ClientAI] Error with ${model}:`, err.message);
        }
      }

      // If all models exhausted or failed
      if (!finalResponseText) {
        if (lastError && lastError.message.includes('429')) {
          finalResponseText = settings.persona === 'girlfriend'
            ? `Jaan, lagta hai Google Gemini ka daily free quota abhi khatam ho gaya hai. Aap thodi der baad baat kar sakte hain ya Settings (⚙️) me nayi API Key daal sakte hain! ❤️`
            : `System Notice: Google Gemini API quota has been reached for all models. Please try again later or calibrate a new API key in Settings.`;
        } else {
          finalResponseText = `Error: ${lastError ? lastError.message : 'Unable to connect to Gemini API. Please check your internet connection or API key.'}`;
        }
      }

      if (onChunk) {
        onChunk(finalResponseText);
      }

      if (sessionId) {
        this.addMessage(sessionId, 'assistant', finalResponseText);
      }

      return { text: finalResponseText, model: usedModel };
    }

    // ----------------------------------------------------
    // Direct Tools: Image, Writer, Translator, Doc Analysis
    // ----------------------------------------------------
    generateImageUrl(prompt, width = 1024, height = 1024) {
      const seed = Math.floor(Math.random() * 999999);
      const cleanPrompt = encodeURIComponent((prompt || 'Beautiful cyberpunk girl companion').trim());
      return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
    }

    async generateWriting({ topic, details, tone, format, lang }) {
      const prompt = `Write a ${tone || 'engaging'} ${format || 'article'} in ${lang || 'Hindi'} on: "${topic}". Additional context: ${details || 'None'}. Provide clean, creative output with markdown formatting.`;
      const res = await this.callGeminiDirect({ message: prompt });
      return res.text;
    }

    async translateText({ text, fromLang, toLang }) {
      const prompt = `Translate the following text accurately from ${fromLang || 'Auto-detect'} to ${toLang || 'Hindi'}. Maintain natural conversational emotion:\n\n"${text}"`;
      const res = await this.callGeminiDirect({ message: prompt });
      return res.text;
    }

    async analyzeDocument({ content, goal }) {
      const prompt = `Analyze the following document with the primary objective: "${goal || 'Executive Summary & Key Takeaways'}":\n\n${content}`;
      const res = await this.callGeminiDirect({ message: prompt });
      return res.text;
    }
  }

  // Attach global instance
  window.ClientAI = new ClientAIEngine();

})(window);
