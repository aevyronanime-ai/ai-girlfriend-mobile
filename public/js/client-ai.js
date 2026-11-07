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

  function stripThinkingTags(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .trim();
  }

  function extractTextFromGeminiResponse(data) {
    if (!data) return '';

    if (typeof data === 'string') {
      return stripThinkingTags(data.trim());
    }

    if (data.promptFeedback && data.promptFeedback.blockReason) {
      return `⚠️ सुरक्षा कारणों से सवाल ब्लॉक किया गया (Block Reason: ${data.promptFeedback.blockReason})`;
    }

    const candidates = data.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      if (typeof data.text === 'string' && data.text.trim()) {
        return stripThinkingTags(data.text.trim());
      }
      return '';
    }

    const candidate = candidates[0];
    const parts = candidate?.content?.parts;

    if (Array.isArray(parts) && parts.length > 0) {
      // 1. Priority: Collect all non-thought parts with valid text
      const cleanParts = parts.filter(p => {
        if (!p) return false;
        if (p.thought === true) return false;
        if (typeof p.thought === 'string' && p.thought.trim().length > 0) return false;
        return typeof p.text === 'string' && p.text.trim().length > 0;
      });

      if (cleanParts.length > 0) {
        const combined = cleanParts.map(p => p.text).join('');
        const stripped = stripThinkingTags(combined);
        if (stripped.trim().length > 0) return stripped.trim();
      }

      // 2. Fallback: If all parts had thoughts or untagged, take any text parts
      const allTextParts = parts.filter(p => p && typeof p.text === 'string' && p.text.trim().length > 0);
      if (allTextParts.length > 0) {
        const combined = allTextParts.map(p => p.text).join('');
        const stripped = stripThinkingTags(combined);
        if (stripped.trim().length > 0) return stripped.trim();
      }
    }

    if (typeof candidate?.text === 'string' && candidate.text.trim()) {
      return stripThinkingTags(candidate.text.trim());
    }

    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      if (candidate.finishReason === 'SAFETY') {
        return `⚠️ सुरक्षा फ़िल्टर (Safety Filter): Google AI ने इस सवाल का जवाब देने से रोक दिया।`;
      }
      if (candidate.finishReason === 'RECITATION') {
        return `⚠️ कॉपीराइट / सुरक्षा कारणों से जवाब रोक दिया गया।`;
      }
      if (candidate.finishReason === 'MAX_TOKENS') {
        return `⚠️ अधिकतम टोकन सीमा (Max Tokens) पूरी हो गई।`;
      }
      return `⚠️ जवाब पूरा नहीं हो सका (कारण: ${candidate.finishReason})।`;
    }

    return '';
  }

  function formatGeminiErrorHindi(status, rawMessage = '', err = null) {
    const code = Number(status) || Number(err?.status) || Number(err?.statusCode) || 0;
    const msg = (rawMessage || err?.message || '').toLowerCase();

    if (err?.isTimeout || err?.message === 'TIMEOUT' || msg.includes('timeout')) {
      return `⏳ **समय समाप्त (Timeout - 15 Seconds)**\n\n15 सेकंड में Google सर्वर से कोई जवाब नहीं मिला। कृपया अपना इंटरनेट कनेक्शन या वाई-फाई चेक करें।`;
    }

    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('offline') || code === 0) {
      return `📶 **इंटरनेट कनेक्शन एरर (Network Error)**\n\nGoogle AI सर्वर से संपर्क नहीं हो सका। कृपया जांचें कि फोन में इंटरनेट चालू है या नहीं।`;
    }

    if (code === 400 || msg.includes('400') || msg.includes('api_key_invalid') || msg.includes('key not valid')) {
      return `🔑 **अमान्य अनुरोध या कुंजी (HTTP 400 - Bad Request)**\n\nआपकी API Key गलत है या अनुरोध का फॉर्मेट अमान्य है।\nकृपया **Settings (⚙️)** में जाकर Google AI Studio से अपनी सही Gemini API Key सेट करें।`;
    }

    if (code === 403 || msg.includes('403') || msg.includes('permission_denied') || msg.includes('forbidden')) {
      return `🚫 **कुंजी को अनुमति नहीं है (HTTP 403 - Permission Denied)**\n\nइस API Key को Gemini API इस्तेमाल करने की अनुमति नहीं है।\nकृपया [Google AI Studio](https://aistudio.google.com/app/apikey) से नई फ्री API Key बनाएं और Settings में डालें।`;
    }

    if (code === 404 || msg.includes('404') || msg.includes('no longer available') || msg.includes('not found') || msg.includes('deprecated')) {
      return `🔍 **मॉडल नहीं मिला या बंद हो चुका है (HTTP 404 - Not Found)**\n\nचुना गया AI मॉडल Google द्वारा बंद कर दिया गया है। ऐप अपने आप नए \`gemini-3.8-flash\` मॉडल पर स्विच कर रहा है।`;
    }

    if (code === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
      return `⚠️ **कोटा खत्म है (HTTP 429 - Quota Exhausted)**\n\nआपकी API Key का आज का फ्री कोटा पूरा हो चुका है।\n• यह कोटा 24 घंटे में Google द्वारा अपने आप फ्री में रीसेट हो जाएगा।\n• या आप Settings (⚙️) में किसी अन्य Google खाते की नई फ्री Key जोड़ सकते हैं।`;
    }

    if (code >= 500 && code < 600) {
      return `⚙️ **Google सर्वर एरर (HTTP ${code} - Server Error)**\n\nGoogle AI सर्वर पर अस्थायी समस्या है। कृपया कुछ सेकंड बाद पुनः प्रयास करें।`;
    }

    return `⚠️ **त्रुटि (HTTP ${code || 'Error'}):**\n\n${rawMessage || err?.message || 'अनपेक्षित समस्या आई। कृपया पुनः प्रयास करें।'}`;
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
        const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {}, 15000);
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

    // Helper to format conversation history according to Gemini API requirements:
    // 1. First turn must be 'user'
    // 2. Consecutive turns of same role must be merged
    // 3. Ensure at least one user turn
    formatContentsForGemini(messages = [], currentMessage = '', imageBase64 = null, imageMime = 'image/jpeg') {
      const contents = [];
      let lastRole = null;

      // Include previous turns (up to last 10 messages for speed)
      const recentTurns = messages.slice(-10);
      for (const m of recentTurns) {
        const role = (m.role === 'user') ? 'user' : 'model';
        const text = (m.content || '').trim();

        // Gemini rule: First content turn MUST have role 'user'
        if (contents.length === 0 && role === 'model') {
          continue;
        }

        if (!text && !m.image_url) continue;

        const parts = [];
        if (m.image_url && m.image_url.startsWith('data:')) {
          const match = m.image_url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inline_data: {
                mime_type: match[1],
                data: match[2]
              }
            });
          }
        }
        if (text) {
          parts.push({ text });
        }

        if (parts.length === 0) continue;

        // Merge consecutive turns with the same role to prevent HTTP 400
        if (role === lastRole && contents.length > 0) {
          contents[contents.length - 1].parts.push(...parts);
        } else {
          contents.push({ role, parts });
          lastRole = role;
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
      if (currentMessage && currentMessage.trim()) {
        currentParts.push({ text: currentMessage.trim() });
      }

      if (currentParts.length > 0) {
        if (lastRole === 'user' && contents.length > 0) {
          contents[contents.length - 1].parts.push(...currentParts);
        } else {
          contents.push({ role: 'user', parts: currentParts });
        }
      }

      // Safety fallback: ensure at least one user turn
      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
      }

      return contents;
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

      // Build conversation history adhering to Gemini REST API rules
      const msgs = sessionId ? this.getMessages(sessionId) : [];
      const contents = this.formatContentsForGemini(msgs, message, imageBase64, imageMime);

      const systemPrompt = this.getSystemPrompt();
      let preferredModel = settings.ai_model || DEFAULT_MODEL;
      if (isDiscontinuedModel(preferredModel)) {
        preferredModel = DEFAULT_MODEL;
        this.saveSettings({ ai_model: DEFAULT_MODEL });
      }

      // Fetch live models from Google ListModels API or active cache
      const liveModels = await this.fetchLiveModels(apiKey);
      const activeCandidates = liveModels.filter(m => !isDiscontinuedModel(m));
      const candidates = [
        preferredModel,
        ...activeCandidates.filter(m => m !== preferredModel)
      ];
      // Strictly maximum 3 attempts as instructed
      const modelsToTry = candidates.slice(0, 3);
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

        const cleanModel = String(model).replace(/^models\//, '').trim() || DEFAULT_MODEL;

        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
          const requestBody = {
            contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          };

          const res = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          }, 15000);

          if (res.status === 429) {
            // Rate limit / Quota exceeded
            this.quotaCooldowns.set(model, Date.now() + 60000); // 1 minute cooldown
            console.warn(`[ClientAI] Quota 429 on model ${cleanModel}, trying fallback...`);
            lastError = { status: 429, message: 'RESOURCE_EXHAUSTED', model: cleanModel };
            continue;
          }

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const errMsg = errJson.error?.message || `HTTP ${res.status}`;
            lastError = { status: res.status, message: errMsg, model: cleanModel };

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
              console.warn(`[ClientAI] Model ${cleanModel} is deprecated/unavailable (${errMsg}), automatically trying next model...`);
              continue;
            }
            // For fatal errors like 400 or 403, break and report clearly
            break;
          }

          const data = await res.json();
          const extractedText = extractTextFromGeminiResponse(data);

          if (extractedText && extractedText.trim().length > 0) {
            finalResponseText = extractedText.trim();
            usedModel = cleanModel;
            // If fallback model was used because preferred model failed, persist the working model
            if (usedModel !== preferredModel) {
              this.saveSettings({ ai_model: usedModel });
            }
            break;
          } else {
            console.warn(`[ClientAI] Model ${cleanModel} returned 200 OK but text was empty. Trying next model...`);
            lastError = { status: 200, isEmpty: true, message: 'Google AI ने खाली जवाब दिया (Empty Response)', model: cleanModel };
          }
        } catch (err) {
          lastError = err;
          console.warn(`[ClientAI] Error with ${cleanModel}:`, err.message);
          if (err.isTimeout) break; // If timed out, break immediately
        }
      }

      // If all models exhausted or failed, guarantee a non-empty, clear Hindi explanation with status code
      if (!finalResponseText || finalResponseText.trim().length === 0) {
        if (lastError && lastError.isEmpty) {
          finalResponseText = `⚠️ **खाली जवाब (HTTP 200 - Empty Response)**\n\nGoogle AI (\`${usedModel || preferredModel}\`) ने कोई टेक्स्ट वापस नहीं भेजा। कृपया सवाल दोबारा पूछें या थोड़ा विस्तार से लिखें।`;
        } else if (lastError && (lastError.status === 429 || (lastError.message && lastError.message.includes('429')))) {
          finalResponseText = settings.persona === 'girlfriend'
            ? `💖 **कोटा खत्म है (HTTP 429 - Quota Exhausted)**\n\nJaan, lagta hai Google Gemini ka daily free quota abhi pura ho gaya hai! 🥺\n• Yeh quota 24 ghante me Google ki taraf se automatically bilkul free me reset ho jayega.\n• Turant baat jari rakhne ke liye aap Settings (⚙️) me kisi doosre account ki nayi free API key daal sakte hain!`
            : `⚠️ **कोटा खत्म है (HTTP 429 - Quota Exhausted)**\n\nGoogle Gemini API free tier request quota limit reached. Please wait for the 24-hour reset or calibrate a new free API key in Settings (⚙️).`;
        } else if (lastError) {
          finalResponseText = formatGeminiErrorHindi(lastError.status || 0, lastError.message || '', lastError);
        } else {
          finalResponseText = `⚠️ **त्रुटि:** Google AI से कोई जवाब नहीं मिला। कृपया इंटरनेट कनेक्शन और API Key जांचें।`;
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

  // Attach global instance and expose utility helpers
  const clientAI = new ClientAIEngine();
  clientAI.extractText = extractTextFromGeminiResponse;
  clientAI.formatErrorHindi = formatGeminiErrorHindi;
  clientAI.stripThinkingTags = stripThinkingTags;

  if (typeof window !== 'undefined') {
    window.ClientAI = clientAI;
    window.extractTextFromGeminiResponse = extractTextFromGeminiResponse;
    window.formatGeminiErrorHindi = formatGeminiErrorHindi;
    window.stripThinkingTags = stripThinkingTags;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ClientAIEngine,
      extractTextFromGeminiResponse,
      formatGeminiErrorHindi,
      stripThinkingTags,
      isDiscontinuedModel
    };
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

