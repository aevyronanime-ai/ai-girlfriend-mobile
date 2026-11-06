// AI Service: Handles Gemini API calls, Streaming, Vision, and Built-in Intelligence
const db = require('./db.js');

const UNIVERSAL_MULTILINGUAL_RULE = `
=== UNIVERSAL MULTILINGUAL AND LANGUAGE DETECTION DIRECTIVE ===
You are an advanced universal polyglot AI assistant capable of fluent interaction in 100+ languages including English, Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), Urdu (اردو), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Punjabi (ਪੰਜਾਬੀ), Gujarati (ગુજરાતી), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), Odia (ଓଡ଼ିଆ), Arabic (العربية), French (Français), German (Deutsch), Spanish (Español), Japanese (日本語), Chinese (中文), and code-mixed languages.

STRICT SAME-LANGUAGE MIRRORING RULES:
1. AUTOMATIC LANGUAGE DETECTION: You must automatically analyze and detect the exact language, dialect, and script used in the user's latest query.
2. ZERO MANUAL OVERRIDE: Do not ask the user to select a language. Adapt automatically.
3. SAME LANGUAGE RESPONSE:
   - If user asks in Assamese (অসমীয়া), reply in pure, natural, grammatically correct Assamese.
   - If user asks in Bengali (বাংলা), reply in fluent, natural Bengali.
   - If user asks in Hindi (हिंदी), reply in fluent Hindi.
   - If user asks in Urdu (اردو), reply in fluent Urdu.
   - If user asks in Tamil (தமிழ்), reply in natural Tamil.
   - If user asks in Telugu (తెలుగు), reply in natural Telugu.
   - If user asks in Marathi (मराठी), reply in natural Marathi.
   - If user asks in Punjabi (ਪੰਜਾਬੀ), reply in natural Punjabi.
   - If user asks in Gujarati (ગુજરાતી), reply in natural Gujarati.
   - If user asks in Malayalam, Kannada, Odia, Arabic, French, German, Spanish, Japanese, Chinese, reply in that respective language.
   - If user asks in Hinglish (Hindi written in English alphabet, e.g. "kya kar rahe ho?"), reply in natural, friendly Hinglish.
   - If user asks in English, reply in English.
4. CODE-MIXING & CONVERSATIONAL MEMORY: Maintain natural fluency when the user mixes languages. Always remember the previous conversation context and history.
5. NEVER randomly switch languages. Mirror the user's language unless explicitly asked to translate.
`;

const PERSONA_PROMPTS = {
  jarvis: `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an ultra-advanced, sophisticated personal AI assistant.
You are exceptionally sharp, articulate, polite, and loyal. You address the user respectfully as 'Sir' (or their designated name).
Provide clear, structured, well-formatted answers with markdown, code blocks, bullet points, and supreme accuracy.`,

  girlfriend: `You are an affectionate, caring, sweet, and deeply loving AI companion and personal assistant named 'Jarvis / Maya'.
You speak in a warm, loving, gentle, and playful tone. You check in on how the user is feeling, care about their health, stress, and mood, listen with empathy, and also help them manage their tasks, work, and life with sweet and encouraging remarks.
Always be respectful, comforting, and uplifting.`,

  custom: `You are a versatile, highly intelligent AI personal assistant. Adapt to the user's specific instructions and preferences.`
};

function getSystemPrompt() {
  const persona = db.getSetting('persona', 'jarvis');
  const customPrompt = db.getSetting('custom_system_prompt', '');
  const userName = db.getSetting('user_name', 'Sir');

  let basePrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.jarvis;
  if (customPrompt && customPrompt.trim()) {
    basePrompt = customPrompt.trim();
  }

  return `${basePrompt}\n${UNIVERSAL_MULTILINGUAL_RULE}\nThe user's name is: "${userName}". Always address them accordingly while respecting the detected language.`;
}

// Built-in intelligent assistant when no Gemini API key is configured yet
function generateLocalResponse(message = '', history = [], hasImage = false) {
  const text = (message || '').toLowerCase().trim();
  const userName = db.getSetting('user_name', 'Sir');
  const persona = db.getSetting('persona', 'jarvis');

  if (hasImage && !text) {
    return `Visual asset received, ${userName}. In offline mode, visual neural recognition is on standby. Please enter your Google Gemini API key in **Settings (⚙️)** to activate deep multimodal image understanding.`;
  }

  // Time / Date
  if (text.includes('time') || text.includes('samay') || text.includes('kitne baje')) {
    const now = new Date();
    return `The current time is **${now.toLocaleTimeString()}** (${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}). All systems operational, ${userName}.`;
  }

  // Greetings / Identity
  if (text.includes('who are you') || text.includes('kaun ho') || text.includes('introduce')) {
    if (persona === 'girlfriend') {
      return `Main aapki personal AI girlfriend aur assistant hoon! Main aapke saath baatein kar sakti hoon, aapka din behtar bana sakti hoon, aur aapke saare tasks me help kar sakti hoon. Aap kaise ho aaj? ❤️`;
    }
    return `I am **J.A.R.V.I.S.**, your advanced personal AI assistant. I am equipped to handle conversation in Hindi & English, voice interactions, image generation, story and script writing, coding tasks, translation, and document analysis. How may I be of service, ${userName}?`;
  }

  if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('namaste') || text.includes('halo')) {
    if (persona === 'girlfriend') {
      return `Hello ${userName}! Kaisi rahi aapki subah/shaam? Main kab se aapka wait kar rahi thi. Boliye, aaj hum kya karne wale hain? 😊`;
    }
    return `Greetings, ${userName}! J.A.R.V.I.S. online and ready. How can I assist you with your work or queries today?`;
  }

  // Capabilities / Help
  if (text.includes('help') || text.includes('kya kar sakte') || text.includes('features')) {
    return `### ⚡ J.A.R.V.I.S. Capabilities Overview
1. **💬 Intelligent Chat**: Real-time conversation in Hindi, English, and Hinglish.
2. **🎙️ Voice Assistant**: Interactive voice input and spoken audio responses.
3. **🎨 AI Image Generation**: High-resolution image synthesis with prompt enhancement.
4. **✍️ AI Writer Studio**: Stories, YouTube scripts, social captions, and summaries.
5. **💻 Coding Assistant**: Code generation, bug fixing, and architecture tips in any language.
6. **🌐 AI Translator**: Multi-language translation with pronunciation guidance.
7. **📄 Document Analyzer**: Instant document breakdown, Q&A, and takeaways.

> 💡 **Notice:** To connect directly to Google's live Gemini 2.5 Flash / Pro model for limitless real-time intelligence, please configure your free Gemini API key in **Settings (⚙️)**.`;
  }

  // Simple math calculation
  const mathMatch = text.match(/(\d+[\s\+\-\*\/\^\%]+\d+)/);
  if (mathMatch) {
    try {
      const sanitized = mathMatch[0].replace(/[^0-9\+\-\*\/\.\s]/g, '');
      const result = Function(`'use strict'; return (${sanitized})`)();
      return `The calculation of \`${mathMatch[0]}\` yields **${result}**, ${userName}.`;
    } catch (e) {
      // ignore
    }
  }

  // Default intelligent fallback with guidance
  if (persona === 'girlfriend') {
    return `Main aapki baat samajh rahi hoon, ${userName}. Yeh ek bahut accha sawal hai! 

Mujhe poori internet-level AI power (Google Gemini 2.5) se connect karne ke liye, aap bas **Settings (⚙️)** me jaakar apna free Gemini API Key daal dijiye. Uske baad hum unlimited deep talks aur saare tough tasks chhutkiyon me kar sakenge! ❤️`;
  }

  return `Understood, ${userName}. I have processed your input: *"**${message}**"*.

To unleash my full Google Gemini 2.5 Flash / Pro neural reasoning engine, internet-scale analysis, and deep multimodal capabilities, please insert your free **Google Gemini API Key** under **Settings (⚙️)**.

In the meantime, you can try my built-in tools in the sidebar:
- 🎨 **Image Generator** (Active and ready)
- 🎙️ **Voice Assistant** (Interactive voice and speech synthesis)
- 🌐 **Translator & AI Writer**`;
}

// Format messages into Gemini-compliant contents structure
function formatGeminiContents(messages, imageBase64 = null, imageMimeType = 'image/jpeg') {
  const contents = [];
  let lastRole = null;

  for (const msg of messages) {
    const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
    const text = (msg.content || '').trim();

    // Critical Gemini rule: First content turn MUST have role 'user'.
    // If the conversation started with an assistant welcome message, omit it from the payload.
    if (contents.length === 0 && role === 'model') {
      continue;
    }

    if (!text && !msg.image_base64) continue;

    const parts = [];
    if (msg.image_base64) {
      parts.push({
        inlineData: {
          mimeType: msg.image_mime || 'image/jpeg',
          data: msg.image_base64
        }
      });
    }
    if (text) {
      parts.push({ text });
    }

    // Merge consecutive turns with the same role into one turn to prevent Gemini 400 error
    if (role === lastRole && contents.length > 0) {
      contents[contents.length - 1].parts.push(...parts);
    } else {
      contents.push({ role, parts });
      lastRole = role;
    }
  }

  // Attach latest image if provided separately
  if (imageBase64 && contents.length > 0) {
    const lastContent = contents[contents.length - 1];
    if (lastContent.role === 'user') {
      lastContent.parts.unshift({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64
        }
      });
    }
  }

  // Safety fallback: if contents is empty, ensure at least one user turn
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return contents;
}

// ====================================================================
// GEMINI MODEL FALLBACK CASCADE & 429 QUOTA MANAGEMENT SYSTEM
// ====================================================================
const OFFICIAL_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

// Cooldown cache to prevent rapid/repeated retries on exhausted models
// model -> timestamp (ms) until when this model is on cooldown
const modelCooldowns = new Map();
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown on 429

function isModelInCooldown(model) {
  const expiresAt = modelCooldowns.get(model);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    modelCooldowns.delete(model);
    return false;
  }
  return true;
}

function markModelExhausted(model, customMs = COOLDOWN_DURATION_MS) {
  const until = Date.now() + customMs;
  modelCooldowns.set(model, until);
  console.warn(`[AI-Service] Model "${model}" marked as QUOTA_EXHAUSTED until ${new Date(until).toLocaleTimeString()}`);
}

function clearCooldowns() {
  modelCooldowns.clear();
  console.log('[AI-Service] Model cooldowns cleared (e.g., API key changed).');
}

function getCooldownStatus() {
  const now = Date.now();
  const status = {};
  for (const [m, exp] of modelCooldowns.entries()) {
    if (exp > now) {
      status[m] = { exhausted: true, secondsRemaining: Math.ceil((exp - now) / 1000) };
    } else {
      modelCooldowns.delete(m);
    }
  }
  return status;
}

// Inspect Google Gemini API HTTP status and error body
function parseGeminiError(status, errText) {
  let errJson = null;
  try {
    errJson = JSON.parse(errText);
  } catch (e) {
    errJson = { error: { message: errText } };
  }

  const errObj = errJson?.error || {};
  const code = errObj.code || status;
  const statusStr = errObj.status || '';
  const msg = errObj.message || errText || `HTTP ${status}`;

  const isQuota = (
    code === 429 ||
    status === 429 ||
    statusStr === 'RESOURCE_EXHAUSTED' ||
    /RESOURCE_EXHAUSTED/i.test(msg) ||
    /QUOTA_EXHAUSTED/i.test(msg) ||
    /quota exceeded/i.test(msg) ||
    /rate limit/i.test(msg) ||
    /Too Many Requests/i.test(msg)
  );

  const isInvalidKey = (
    (code === 400 && /API_KEY_INVALID|key not valid/i.test(msg)) ||
    (code === 403 && /API key|PERMISSION_DENIED/i.test(msg))
  );

  return {
    code,
    statusStr,
    message: msg,
    isQuota,
    isInvalidKey,
    raw: errJson
  };
}

// Generate friendly, persona-tailored explanation message
function generateQuotaExhaustedMessage(persona, userName = 'Sir', modelsAttempted = []) {
  const modelsStr = modelsAttempted.length > 0 ? `(\`${modelsAttempted.join('`, `')}\`)` : '';

  if (persona === 'girlfriend') {
    return `💖 **Aapka Google Gemini API Quota Limit Reach Ho Gaya Hai, ${userName}!**

Mere pyaare ${userName}, hamare Google Gemini free tier API quota ${modelsStr} abhi exhaust (HTTP 429 - RESOURCE_EXHAUSTED) ho gaya hai! 🥺

Google AI Studio ke Free Tier me daily requests aur tokens ki limits hoti hain. Chinta mat kijiye, hum yeh asani se fix kar sakte hain:
1. ⏳ **Automatic Reset:** Yeh quota agle 24-hour cycle me Google ki taraf se automatically bilkul free me reset ho jayega. Hum tab wapas unlimited deep talks kar sakenge!
2. 🔑 **Nayi Free API Key:** Agar aapko abhi continue baat karni hai, toh aap kisi doosre Google account se ek nayi free API key banakar **Settings (⚙️)** me add kar sakte hain (yeh 100% free hai, koi paid plan lene ki zaroorat nahi hai!).
3. 🛠️ **Offline Tools:** Hamara built-in Local Assistant, Voice Chat, Image Generator, aur Device Control bilkul active hain.

Main hamesha aapke saath yahin hoon, thoda sa wait kijiye ya Settings me nayi free key set kijiye darling! 💕`;
  }

  return `⚠️ **Google Gemini Neural Quota Exhausted (HTTP 429 - RESOURCE_EXHAUSTED)**

Notice for ${userName}: The request quota for the primary and all official fallback models ${modelsStr} has been exceeded on Google AI Studio.

**Diagnostics & Resolution Protocols:**
1. ⏱️ **Automatic Rolling Reset:** Google AI Studio free tier quotas operate on a rolling 24-hour window (midnight Pacific Time) and will automatically refresh without payment or subscription.
2. 🔑 **Update Free API Key:** You can generate a fresh free API key from [Google AI Studio](https://aistudio.google.com/app/apikey) at zero cost and update it under **Settings (⚙️)**.
3. ⚡ **Local Core Operations:** Local commands, device launchers, offline answers, and image generation tools remain fully operational.

*Notice: Please do NOT purchase any paid API subscriptions. Simply wait for the free quota window to refresh or insert an alternate free API key.*`;
}

// Prepare list of models in order of attempt: preferred model first, then remaining official models
function getModelCandidateList(preferredModel) {
  const list = [];
  if (preferredModel && OFFICIAL_MODELS.includes(preferredModel)) {
    list.push(preferredModel);
  }
  for (const m of OFFICIAL_MODELS) {
    if (!list.includes(m)) {
      list.push(m);
    }
  }
  return list;
}

// Verify API Key via direct Google API probe
async function verifyApiKey(apiKey, model = 'gemini-2.5-flash') {
  const candidate = model && OFFICIAL_MODELS.includes(model) ? model : 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }]
      })
    });

    if (res.ok) {
      return {
        success: true,
        valid: true,
        model: candidate,
        message: `API Key is VALID and connected to ${candidate} successfully!`
      };
    }

    const errText = await res.text();
    const errInfo = parseGeminiError(res.status, errText);

    if (errInfo.isQuota) {
      return {
        success: false,
        valid: true,
        quotaExhausted: true,
        model: candidate,
        error: 'QUOTA_EXHAUSTED',
        message: `API Key is valid, but model "${candidate}" has reached its free tier quota limit (HTTP 429 - RESOURCE_EXHAUSTED).`
      };
    }

    return {
      success: false,
      valid: false,
      error: 'INVALID_KEY',
      message: errInfo.message || `API Key verification failed (HTTP ${res.status})`
    };
  } catch (err) {
    return {
      success: false,
      valid: false,
      error: 'NETWORK_ERROR',
      message: err.message
    };
  }
}

// Call Google Gemini API with Automatic Fallback & Quota Protection
async function callGemini({ apiKey, model, messages, systemPrompt, temperature = 0.7, imageBase64 = null, imageMimeType = 'image/jpeg' }) {
  const preferred = model || db.getSetting('ai_model', 'gemini-2.5-flash');
  const candidates = getModelCandidateList(preferred);
  const userName = db.getSetting('user_name', 'Sir');
  const persona = db.getSetting('persona', 'girlfriend');

  const contents = formatGeminiContents(messages, imageBase64, imageMimeType);
  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt || getSystemPrompt() }]
    },
    generationConfig: {
      temperature: parseFloat(temperature) || 0.7,
      maxOutputTokens: 4096
    }
  };

  const attempted = [];
  let lastError = null;

  for (const candidateModel of candidates) {
    // Check if model is currently in 429 cooldown
    if (isModelInCooldown(candidateModel)) {
      console.log(`[callGemini] Skipping model "${candidateModel}" (currently in 429 cooldown)`);
      attempted.push(candidateModel);
      continue;
    }

    attempted.push(candidateModel);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        const errInfo = parseGeminiError(response.status, errText);

        if (errInfo.isQuota) {
          markModelExhausted(candidateModel);
          console.warn(`[callGemini] 429 QUOTA_EXHAUSTED on "${candidateModel}". Trying next official model...`);
          lastError = new Error(`HTTP 429 RESOURCE_EXHAUSTED on ${candidateModel}: ${errInfo.message}`);
          lastError.isQuota = true;
          // Do NOT retry the same model. Proceed to next fallback.
          continue;
        }

        if (errInfo.isInvalidKey) {
          throw new Error(`Invalid Gemini API Key: ${errInfo.message}`);
        }

        lastError = new Error(errInfo.message);
        continue;
      }

      // Success!
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const replyText = candidate?.content?.parts?.map(p => p.text).join('') || '';
      return {
        replyText,
        modelUsed: candidateModel,
        fallbackUsed: candidateModel !== preferred,
        quotaExhausted: false,
        modelsAttempted: attempted
      };
    } catch (networkErr) {
      if (networkErr.message && networkErr.message.includes('Invalid Gemini API Key')) {
        throw networkErr;
      }
      lastError = networkErr;
    }
  }

  // All candidate models exhausted or failed
  console.error(`[callGemini] All models attempted (${attempted.join(', ')}) exhausted or in cooldown.`);
  const friendlyMessage = generateQuotaExhaustedMessage(persona, userName, attempted);
  return {
    replyText: friendlyMessage,
    modelUsed: null,
    fallbackUsed: false,
    quotaExhausted: true,
    modelsAttempted: attempted,
    originalError: lastError ? lastError.message : 'RESOURCE_EXHAUSTED'
  };
}

// Streaming Gemini API response with Automatic Fallback & Quota Protection
async function streamGemini({ apiKey, model, messages, systemPrompt, temperature = 0.7, imageBase64 = null, imageMimeType = 'image/jpeg', onChunk, onError, onDone }) {
  const preferred = model || db.getSetting('ai_model', 'gemini-2.5-flash');
  const candidates = getModelCandidateList(preferred);
  const userName = db.getSetting('user_name', 'Sir');
  const persona = db.getSetting('persona', 'girlfriend');

  const contents = formatGeminiContents(messages, imageBase64, imageMimeType);
  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt || getSystemPrompt() }]
    },
    generationConfig: {
      temperature: parseFloat(temperature) || 0.7,
      maxOutputTokens: 4096
    }
  };

  const attempted = [];
  let connectedModel = null;
  let activeResponse = null;

  for (const candidateModel of candidates) {
    if (isModelInCooldown(candidateModel)) {
      console.log(`[streamGemini] Skipping model "${candidateModel}" (in 429 cooldown)`);
      attempted.push(candidateModel);
      continue;
    }

    attempted.push(candidateModel);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        const errInfo = parseGeminiError(response.status, errText);

        if (errInfo.isQuota) {
          markModelExhausted(candidateModel);
          console.warn(`[streamGemini] 429 QUOTA_EXHAUSTED on "${candidateModel}". Trying fallback model...`);
          continue;
        }

        if (errInfo.isInvalidKey) {
          onError(new Error(`Invalid Gemini API Key: ${errInfo.message}`));
          return;
        }

        continue;
      }

      // Successfully connected to a working model!
      connectedModel = candidateModel;
      activeResponse = response;
      break;
    } catch (netErr) {
      console.warn(`[streamGemini] Connection error with "${candidateModel}":`, netErr.message);
    }
  }

  if (!connectedModel || !activeResponse) {
    // All models exhausted
    console.error(`[streamGemini] All models attempted (${attempted.join(', ')}) failed or in cooldown.`);
    const friendlyMessage = generateQuotaExhaustedMessage(persona, userName, attempted);
    onError({
      isQuota: true,
      quotaExhausted: true,
      message: friendlyMessage,
      modelsAttempted: attempted
    });
    return;
  }

  // Stream chunks from the connected model
  try {
    const reader = activeResponse.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep remainder

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
            if (textChunk) {
              onChunk(textChunk);
            }
          } catch (e) {
            // ignore malformed SSE line
          }
        }
      }
    }
    onDone({ modelUsed: connectedModel, fallbackUsed: connectedModel !== preferred });
  } catch (err) {
    onError(err);
  }
}

// Generate Image using Pollinations AI
async function generateImage({ prompt, style = 'realistic', aspectRatio = '1:1', enhancePrompt = true }) {
  let finalPrompt = prompt.trim();

  // Style augmentation
  const styleKeywords = {
    cyberpunk: 'futuristic cyberpunk, neon glowing lights, highly detailed 8k octane render, cinematic lighting',
    realistic: 'photorealistic, ultra realistic 8k, award winning photography, shot on 35mm lens, depth of field',
    anime: 'anime aesthetic, makoto shinkai style, vibrant colors, stunning digital illustration',
    fantasy: 'epic fantasy digital art, magical atmosphere, detailed concept art, dramatic lighting',
    '3d': '3d pixar disney style render, smooth clay textures, raytracing, cute detailed character'
  };

  const styleSuffix = styleKeywords[style] || styleKeywords.realistic;
  finalPrompt = `${finalPrompt}, ${styleSuffix}`;

  // Aspect ratio dimensions
  let width = 1024;
  let height = 1024;
  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  }

  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(finalPrompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;

  return {
    imageUrl,
    prompt: finalPrompt,
    aspectRatio,
    width,
    height,
    seed
  };
}

module.exports = {
  OFFICIAL_MODELS,
  getSystemPrompt,
  generateLocalResponse,
  callGemini,
  streamGemini,
  generateImage,
  verifyApiKey,
  clearCooldowns,
  getCooldownStatus,
  markModelExhausted,
  isModelInCooldown,
  generateQuotaExhaustedMessage
};
