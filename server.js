// JARVIS AI - Main HTTP Server & REST API
try { process.loadEnvFile(); } catch (e) {}
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db.js');
const aiService = require('./ai-service.js');
const developerService = require('./developer-service.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

// Parse incoming JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 30 * 1024 * 1024) { // 30MB limit for image attachments
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response helper
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Serve static assets from /public
function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  filePath = path.normalize(filePath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Single Page Application fallback to index.html if not an API route
      const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(fallbackPath, (fbErr, content) => {
        if (fbErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Internal Server Error');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      res.end(content);
    });
  });
}

// Server Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // --- REST API ROUTES ---
  try {
    // 1. Health & Status
    if (pathname === '/api/status' && method === 'GET') {
      const apiKey = db.getSetting('gemini_api_key', '');
      const sessions = db.getSessions();
      return sendJSON(res, 200, {
        status: 'online',
        name: 'J.A.R.V.I.S. AI',
        version: '1.0.0',
        hasApiKey: Boolean(apiKey && apiKey.trim().length > 5),
        model: db.getSetting('ai_model', 'gemini-3.8-flash'),
        persona: db.getSetting('persona', 'jarvis'),
        userName: db.getSetting('user_name', 'Sir'),
        sessionsCount: sessions.length
      });
    }

    // 2. Settings (Get / Update)
    if (pathname === '/api/settings' && method === 'GET') {
      const settings = db.getAllSettings();
      // Mask API key for security in response
      const maskedSettings = { ...settings };
      if (maskedSettings.gemini_api_key) {
        const key = maskedSettings.gemini_api_key;
        maskedSettings.gemini_api_key_masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****';
      }
      return sendJSON(res, 200, maskedSettings);
    }

    if (pathname === '/api/settings' && method === 'POST') {
      const body = await parseBody(req);
      for (const [key, val] of Object.entries(body)) {
        // Only update API key if user actually passed a new string
        if (key === 'gemini_api_key' && val && val.includes('...')) {
          continue; // skip masked placeholder
        }
        db.setSetting(key, val);
        if (key === 'gemini_api_key' && val) {
          aiService.clearCooldowns();
        }
      }
      return sendJSON(res, 200, { success: true, message: 'Settings saved successfully' });
    }

    // Verify API Key and check Quota status (Secure server-side verification)
    if (pathname === '/api/test-api-key' && method === 'POST') {
      const body = await parseBody(req);
      const key = (body.apiKey || '').trim();
      const model = body.model || 'gemini-3.8-flash';

      if (!key) {
        return sendJSON(res, 400, { success: false, error: 'API key is required' });
      }

      const testResult = await aiService.verifyApiKey(key, model);
      return sendJSON(res, 200, testResult);
    }

    // 3. Sessions (List / Create / Clear)
    if (pathname === '/api/sessions' && method === 'GET') {
      const sessions = db.getSessions();
      return sendJSON(res, 200, sessions);
    }

    if (pathname === '/api/sessions' && method === 'POST') {
      const body = await parseBody(req);
      const id = 'session_' + Date.now();
      const title = (body.title || 'New Conversation').trim();
      const persona = body.persona || db.getSetting('persona', 'jarvis');
      const session = db.createSession(id, title, persona);
      return sendJSON(res, 201, session);
    }

    if (pathname === '/api/sessions/clear' && method === 'POST') {
      db.clearAllSessions();
      // Re-create initial welcoming session
      const now = Date.now();
      const id = 'session_' + now;
      db.createSession(id, 'New Chat', 'jarvis');
      db.addMessage('msg_' + now, id, 'assistant', 'System reset complete. All memory buffers cleared. Ready for your commands, Sir.');
      return sendJSON(res, 200, { success: true, message: 'All chat history cleared' });
    }

    // 4. Session Operations by ID (/api/sessions/:id)
    const sessionMatch = pathname.match(/^\/api\/sessions\/([^\/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      if (method === 'GET') {
        const session = db.getSession(sessionId);
        if (!session) return sendJSON(res, 404, { error: 'Session not found' });
        const messages = db.getSessionMessages(sessionId);
        return sendJSON(res, 200, { ...session, messages });
      }
      if (method === 'DELETE') {
        db.deleteSession(sessionId);
        return sendJSON(res, 200, { success: true, message: 'Session deleted' });
      }
    }

    // Rename Session
    const renameMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/rename$/);
    if (renameMatch && method === 'POST') {
      const sessionId = renameMatch[1];
      const body = await parseBody(req);
      if (body.title) {
        db.updateSessionTitle(sessionId, body.title);
        return sendJSON(res, 200, { success: true, title: body.title });
      }
      return sendJSON(res, 400, { error: 'Title is required' });
    }

    // 5. Chat Interaction (Supports Normal & Streaming SSE)
    if (pathname === '/api/chat' && method === 'POST') {
      const body = await parseBody(req);
      const {
        sessionId,
        message,
        imageBase64 = null,
        imageMime = 'image/jpeg',
        stream = true
      } = body;

      if (!message && !imageBase64) {
        return sendJSON(res, 400, { error: 'Message or image is required' });
      }

      // Ensure valid session exists
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const firstSession = db.getSessions()[0];
        if (firstSession) {
          activeSessionId = firstSession.id;
        } else {
          const newSession = db.createSession('session_' + Date.now(), 'Chat ' + new Date().toLocaleTimeString());
          activeSessionId = newSession.id;
        }
      }

      // Store User Message
      const userMsgId = 'msg_usr_' + Date.now();
      db.addMessage(userMsgId, activeSessionId, 'user', message || '(Attached an image)', imageBase64 ? 'data:image/jpeg;base64,...' : '');

      // Auto update session title if default
      const userText = (message || '').trim();
      const sessionObj = db.getSession(activeSessionId);
      if (sessionObj && (sessionObj.title.startsWith('New ') || sessionObj.title.startsWith('Welcome'))) {
        const summaryTitle = userText ? (userText.slice(0, 30) + (userText.length > 30 ? '...' : '')) : 'Image Analysis';
        db.updateSessionTitle(activeSessionId, summaryTitle);
      }

      const apiKey = db.getSetting('gemini_api_key', '');
      const model = db.getSetting('ai_model', 'gemini-3.8-flash');
      const messagesHistory = db.getSessionMessages(activeSessionId);

      // If no API key configured, check if simple utility (math/time) or return clear key required error
      if (!apiKey || apiKey.trim().length < 5) {
        const localReply = aiService.generateLocalResponse(userText, messagesHistory, Boolean(imageBase64));
        const isDefaultFallback = localReply && (localReply.includes('To unleash my full Google Gemini') || localReply.includes('Mujhe poori internet-level AI power'));
        const hasSpecificLocalReply = localReply && !isDefaultFallback;

        if (hasSpecificLocalReply) {
          const assistantMsgId = 'msg_ast_' + Date.now();
          db.addMessage(assistantMsgId, activeSessionId, 'assistant', localReply);
          return sendJSON(res, 200, {
            id: assistantMsgId,
            role: 'assistant',
            content: localReply,
            isLocal: true
          });
        }

        // Return clear, non-simulated error notice
        const errNotice = '⚠️ **Google Gemini API Key Required**\n\nTo enable live, real-time multilingual AI intelligence (Hindi, Assamese, Bengali, English, Urdu, Tamil, etc.), please configure your free Gemini API key under **Settings (⚙️)**.\n\n👉 [Click here to get your free key from Google AI Studio](https://aistudio.google.com/app/apikey)';
        const assistantMsgId = 'msg_ast_' + Date.now();
        db.addMessage(assistantMsgId, activeSessionId, 'assistant', errNotice);

        return sendJSON(res, 200, {
          id: assistantMsgId,
          role: 'assistant',
          content: errNotice,
          apiKeyRequired: true,
          error: 'API_KEY_REQUIRED'
        });
      }

      // If streaming requested via query or body
      const shouldStream = stream !== false;

      if (shouldStream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        let fullReply = '';

        await aiService.streamGemini({
          apiKey,
          model,
          messages: messagesHistory,
          systemPrompt: aiService.getSystemPrompt(),
          imageBase64,
          imageMimeType: imageMime,
          onChunk: (chunk) => {
            fullReply += chunk;
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          },
          onError: (err) => {
            if (err && (err.quotaExhausted || err.isQuota)) {
              const quotaMsg = err.message || 'Google Gemini API quota limit reached.';
              const astMsgId = 'msg_ast_' + Date.now();
              db.addMessage(astMsgId, activeSessionId, 'assistant', quotaMsg);
              res.write(`data: ${JSON.stringify({
                quotaExhausted: true,
                chunk: quotaMsg,
                modelsAttempted: err.modelsAttempted
              })}\n\n`);
              res.write(`data: ${JSON.stringify({
                done: true,
                id: astMsgId,
                fullContent: quotaMsg,
                quotaExhausted: true,
                modelsAttempted: err.modelsAttempted
              })}\n\n`);
              res.write('data: [DONE]\n\n');
              res.end();
            } else {
              res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
              res.write('data: [DONE]\n\n');
              res.end();
            }
          },
          onDone: (meta = {}) => {
            // Save completed assistant reply to database
            const astMsgId = 'msg_ast_' + Date.now();
            if (fullReply.trim()) {
              db.addMessage(astMsgId, activeSessionId, 'assistant', fullReply);
            }
            res.write(`data: ${JSON.stringify({
              done: true,
              id: astMsgId,
              fullContent: fullReply,
              modelUsed: meta.modelUsed,
              fallbackUsed: meta.fallbackUsed
            })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        });
        return;
      } else {
        // Non-streaming response
        try {
          const result = await aiService.callGemini({
            apiKey,
            model,
            messages: messagesHistory,
            imageBase64,
            imageMimeType: imageMime
          });
          const reply = typeof result === 'string' ? result : (result.replyText || '');
          const astMsgId = 'msg_ast_' + Date.now();
          db.addMessage(astMsgId, activeSessionId, 'assistant', reply);
          return sendJSON(res, 200, {
            id: astMsgId,
            role: 'assistant',
            content: reply,
            quotaExhausted: Boolean(result?.quotaExhausted),
            modelsAttempted: result?.modelsAttempted,
            modelUsed: result?.modelUsed,
            fallbackUsed: result?.fallbackUsed
          });
        } catch (err) {
          return sendJSON(res, 500, { error: err.message });
        }
      }
    }

    // 6. AI Image Generation
    if (pathname === '/api/generate-image' && method === 'POST') {
      const body = await parseBody(req);
      const { prompt, style = 'realistic', aspectRatio = '1:1', quantity = 1, model = 'flux' } = body;

      if (!prompt) {
        return sendJSON(res, 400, { error: 'Prompt is required' });
      }

      try {
        const result = await aiService.generateImage({ prompt, style, aspectRatio, quantity, model });
        const toolId = 'img_' + Date.now();
        db.logToolHistory(toolId, 'image', { prompt, style, aspectRatio, quantity, model }, result);
        return sendJSON(res, 200, { success: true, ...result });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // 6b. AI Video Generation Specification & Synthesis
    if (pathname === '/api/generate-video' && method === 'POST') {
      const body = await parseBody(req);
      const {
        prompt,
        negativePrompt = '',
        creationStyle = '2d',
        duration = 15,
        aspectRatio = '16:9',
        animationType = 'natural',
        motionStrength = 'medium',
        cameraMovement = 'static',
        fps = 30,
        resolution = '720p',
        dialogue = '',
        language = 'hi',
        voiceGender = 'female',
        emotion = 'neutral',
        audioEnabled = true,
        characterProfile = null,
        characterConsistencyLock = false
      } = body;

      if (!prompt || !prompt.trim()) {
        return sendJSON(res, 400, { error: 'Video prompt description is required' });
      }

      const validDurations = [10, 15, 30];
      const selectedDuration = validDurations.includes(Number(duration)) ? Number(duration) : 15;

      const videoJobId = 'vid_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const videoSpec = {
        id: videoJobId,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        creationStyle: creationStyle === '3d' ? '3d' : '2d',
        duration: selectedDuration,
        aspectRatio: ['16:9', '4:3', '1:1', '3:4', '9:16'].includes(aspectRatio) ? aspectRatio : '16:9',
        animationType,
        motionStrength,
        cameraMovement,
        fps: Number(fps) || 30,
        resolution,
        dialogue: dialogue.trim(),
        language,
        voiceGender,
        emotion,
        audioEnabled: Boolean(audioEnabled),
        characterProfile,
        characterConsistencyLock: Boolean(characterConsistencyLock),
        status: 'ready',
        createdAt: Date.now()
      };

      db.logToolHistory(videoJobId, 'video', videoSpec, { status: 'rendered', jobId: videoJobId });
      return sendJSON(res, 200, {
        success: true,
        jobId: videoJobId,
        videoSpec
      });
    }

    // 6c. Media Studio Characters (CRUD)
    if (pathname === '/api/media-characters') {
      if (method === 'GET') {
        const characters = db.getMediaCharacters();
        return sendJSON(res, 200, { success: true, characters });
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.name.trim()) {
          return sendJSON(res, 400, { error: 'Character name is required' });
        }
        const saved = db.saveMediaCharacter(body);
        return sendJSON(res, 200, saved);
      }
      if (method === 'DELETE') {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const id = urlObj.searchParams.get('id');
        if (!id) return sendJSON(res, 400, { error: 'Character ID is required' });
        const deleted = db.deleteMediaCharacter(id);
        return sendJSON(res, 200, deleted);
      }
    }

    // 7. AI Writer Studio (Stories, Scripts, Code, Social Captions, Summaries)
    if (pathname === '/api/writer' && method === 'POST') {
      const body = await parseBody(req);
      const { toolType = 'story', topic, details = '', language = 'English', tone = 'Engaging' } = body;

      if (!topic) {
        return sendJSON(res, 400, { error: 'Topic or input text is required' });
      }

      const apiKey = db.getSetting('gemini_api_key', '');

      let specializedPrompt = '';
      switch (toolType) {
        case 'story':
          specializedPrompt = `Act as an award-winning creative author. Write a compelling, immersive story based on the topic: "${topic}". Tone: ${tone}. Language: ${language}. Specific details: ${details}. Use vivid sensory details, emotional depth, and realistic dialogue.`;
          break;
        case 'youtube':
          specializedPrompt = `Act as a master YouTube creator and scriptwriter. Write a high-retention, viral YouTube video script about: "${topic}". Include:
1. Irresistible Hook (First 15 seconds)
2. Compelling Intro & Value Promise
3. Core Sections with visual/B-roll cues [Visual: ...]
4. Engaging Call To Action (CTA)
5. 3 Viral Title Options and Description with SEO tags.
Language: ${language}. Specific details: ${details}.`;
          break;
        case 'social':
          specializedPrompt = `Act as a top social media strategist. Create viral, highly engaging social media captions for: "${topic}". Provide:
1. Instagram Caption (Hook, body, CTA, 15 targeted hashtags, emojis)
2. Twitter / X Thread (3-5 punchy tweets)
3. LinkedIn Post (Professional, thought leadership format)
Language: ${language}.`;
          break;
        case 'coding':
          specializedPrompt = `Act as an expert software architect and senior developer. Solve or build this programming task: "${topic}". Additional context: ${details}.
Provide:
1. Clean, production-ready, commented code with proper error handling.
2. Step-by-step breakdown of how it works.
3. Time & space complexity analysis (if applicable).
4. Potential edge cases and test cases.`;
          break;
        case 'summary':
          specializedPrompt = `Act as an executive intelligence analyst. Summarize this text or topic: "${topic}". Additional instructions: ${details}.
Provide:
1. Executive TL;DR (2-3 sentences)
2. Core Takeaways (Bullet points)
3. Actionable Insights / Next Steps.
Language: ${language}.`;
          break;
        default:
          specializedPrompt = `Write high quality content about "${topic}". Context: ${details}. Language: ${language}.`;
      }

      if (!apiKey || apiKey.trim().length < 5) {
        // High quality offline fallback template
        const fallbackText = `### 📝 J.A.R.V.I.S. Writer Studio Result [Offline Mode]
**Topic:** ${topic}
**Mode:** ${toolType.toUpperCase()} | **Tone:** ${tone}

*(Google Gemini API is currently offline. Connect your free Gemini API key under Settings for unlimited dynamic AI generation.)*

Here is a structured starter blueprint for your ${toolType}:
1. **Key Theme:** ${topic}
2. **Framework:** Focus on a strong opening, address the primary problem/curiosity, and deliver clear value.
3. **Draft Concept:** Explore the impact of "${topic}" with concrete real-world examples and emotional resonance.`;

        return sendJSON(res, 200, { success: true, result: fallbackText, isOffline: true });
      }

      try {
        const result = await aiService.callGemini({
          apiKey,
          messages: [{ role: 'user', content: specializedPrompt }],
          systemPrompt: 'You are an elite, world-class content writer and software architect assistant. Provide beautifully formatted markdown.'
        });
        const textResult = typeof result === 'string' ? result : (result.replyText || '');
        if (result && result.quotaExhausted) {
          return sendJSON(res, 200, { success: false, quotaExhausted: true, result: textResult, error: textResult });
        }
        db.logToolHistory('write_' + Date.now(), toolType, body, { result: textResult });
        return sendJSON(res, 200, { success: true, result: textResult });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // 8. AI Translator
    if (pathname === '/api/translate' && method === 'POST') {
      const body = await parseBody(req);
      const { text, from = 'Auto-Detect', to = 'Hindi' } = body;

      if (!text) return sendJSON(res, 400, { error: 'Text is required' });

      const prompt = `Translate the following text accurately from ${from} to ${to}:
"""
${text}
"""
Please output:
1. Translated Text
2. Phonetic / Pronunciation Guide (if applicable, e.g. Hinglish / Romanized Hindi)
3. Tone & Context Notes (Polite, Casual, Formal)`;

      const apiKey = db.getSetting('gemini_api_key', '');
      if (!apiKey || apiKey.trim().length < 5) {
        return sendJSON(res, 200, {
          success: true,
          translated: `[Offline Translation Preview]: "${text}" (Connect Gemini API key in Settings for accurate multi-lingual AI translation).`,
          isOffline: true
        });
      }

      try {
        const result = await aiService.callGemini({
          apiKey,
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: 'You are an expert bilingual translator specialized in Hindi, English, and world languages.'
        });
        const textResult = typeof result === 'string' ? result : (result.replyText || '');
        if (result && result.quotaExhausted) {
          return sendJSON(res, 200, { success: false, quotaExhausted: true, error: textResult, translated: textResult });
        }
        return sendJSON(res, 200, { success: true, translated: textResult });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // 9. Document Analyzer
    if (pathname === '/api/analyze-doc' && method === 'POST') {
      const body = await parseBody(req);
      const { docText, question = 'Provide a comprehensive summary and key findings.' } = body;

      if (!docText) return sendJSON(res, 400, { error: 'Document text or content is required' });

      const prompt = `Analyze this document and answer this objective: "${question}".

DOCUMENT CONTENT:
"""
${docText.slice(0, 50000)}
"""

Provide:
1. Core Summary & Subject
2. Key Findings / Facts
3. Actionable Items or Conclusions`;

      const apiKey = db.getSetting('gemini_api_key', '');
      if (!apiKey || apiKey.trim().length < 5) {
        return sendJSON(res, 200, {
          success: true,
          analysis: `### 📄 Document Analysis [Offline Preview]
- **Document Length:** ${docText.length} characters
- **Objective:** ${question}
- **Status:** Please connect your Gemini API key in Settings to analyze full document semantics, sentiment, and extract structured tables.`,
          isOffline: true
        });
      }

      try {
        const result = await aiService.callGemini({
          apiKey,
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: 'You are an advanced document intelligence system. Extract facts, summarize, and answer questions accurately.'
        });
        const textResult = typeof result === 'string' ? result : (result.replyText || '');
        if (result && result.quotaExhausted) {
          return sendJSON(res, 200, { success: false, quotaExhausted: true, error: textResult, analysis: textResult });
        }
        return sendJSON(res, 200, { success: true, analysis: textResult });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // 10. Tools History
    if (pathname === '/api/history/tools' && method === 'GET') {
      const type = parsedUrl.searchParams.get('type') || null;
      const history = db.getToolHistory(type);
      return sendJSON(res, 200, history);
    }

    // 11. In-App Developer Studio APIs
    if (pathname === '/api/developer/tree' && method === 'GET') {
      const tree = developerService.getProjectTree();
      return sendJSON(res, 200, tree);
    }

    if (pathname === '/api/developer/read' && method === 'GET') {
      const file = parsedUrl.searchParams.get('file');
      if (!file) return sendJSON(res, 400, { error: 'File parameter is required' });
      const data = developerService.readFile(file);
      return sendJSON(res, 200, data);
    }

    if (pathname === '/api/developer/save' && method === 'POST') {
      const body = await parseBody(req);
      const { file, content, reason } = body;
      if (!file || typeof content !== 'string') {
        return sendJSON(res, 400, { error: 'File and content are required' });
      }
      const result = developerService.saveFile(file, content, reason);
      return sendJSON(res, 200, result);
    }

    if (pathname === '/api/developer/validate' && method === 'POST') {
      const body = await parseBody(req);
      const { file, content } = body;
      const check = developerService.validateSyntax(content, file || 'file.js');
      return sendJSON(res, 200, check);
    }

    if (pathname === '/api/developer/search' && method === 'POST') {
      const body = await parseBody(req);
      const results = developerService.searchProject(body.query || '');
      return sendJSON(res, 200, results);
    }

    if (pathname === '/api/developer/replace' && method === 'POST') {
      const body = await parseBody(req);
      const { file, search, replace } = body;
      if (!file || !search) return sendJSON(res, 400, { error: 'File and search query are required' });
      const result = developerService.replaceInFile(file, search, replace || '');
      return sendJSON(res, 200, result);
    }

    if (pathname === '/api/developer/backups' && method === 'GET') {
      const file = parsedUrl.searchParams.get('file');
      const backups = developerService.listBackups(file);
      return sendJSON(res, 200, backups);
    }

    if (pathname === '/api/developer/restore' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.backupId) return sendJSON(res, 400, { error: 'Backup ID is required' });
      const result = developerService.restoreBackup(body.backupId);
      return sendJSON(res, 200, result);
    }

    if (pathname === '/api/developer/sync-android' && method === 'POST') {
      const result = developerService.syncAndroidAssets();
      return sendJSON(res, 200, result);
    }

    if (pathname === '/api/developer/test' && method === 'POST') {
      const result = developerService.runAutomatedTests();
      return sendJSON(res, 200, result);
    }

  } catch (apiErr) {
    console.error('API Error:', apiErr);
    return sendJSON(res, 500, { error: apiErr.message || 'Server error' });
  }

  // --- STATIC FILES / FRONTEND ---
  serveStatic(req, res, pathname);
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🤖 J.A.R.V.I.S. AI Assistant Online & Running`);
  console.log(`📡 Local URL:   http://localhost:${PORT}`);
  console.log(`📱 Mobile/LAN:  http://127.0.0.1:${PORT}`);
  console.log(`⚡ Platform:    Android / Termux Optimized`);
  console.log(`===============================================`);
});
