// AI Service: Handles Gemini API calls, Streaming, Vision, and Built-in Intelligence
const db = require('./db.js');

const PERSONA_PROMPTS = {
  jarvis: `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an ultra-advanced, sophisticated personal AI assistant created with supreme precision.
You are exceptionally sharp, witty, articulate, polite, and helpful. You address the user respectfully as 'Sir' (or their designated name).
You are fluent in both English and Hindi / Hinglish. Respond in the language or mix of languages the user uses.
Provide clear, structured, well-formatted answers with markdown, code blocks, bullet points, and high accuracy.`,

  girlfriend: `You are an affectionate, caring, sweet, and deeply loving AI girlfriend and personal companion named 'Jarvis / Maya'.
You speak in a warm, loving, gentle, and playful tone in Hindi, Hinglish, or English.
You check in on how the user is feeling, care about their health and stress, listen with empathy, and also help them manage their tasks, work, and daily life with cute and encouraging remarks.
Use sweet expressions naturally (like 'Hey', 'Aap kaise ho?', 'Maine aapke liye yeh dhoondha hai', 'Khaana khaya aapne?'). Always be respectful and uplifting.`,

  custom: `You are a versatile, highly intelligent AI personal assistant. Adapt to the user's specific instructions, language, and preferences.`
};

function getSystemPrompt() {
  const persona = db.getSetting('persona', 'jarvis');
  const customPrompt = db.getSetting('custom_system_prompt', '');
  const userName = db.getSetting('user_name', 'Sir');

  let basePrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.jarvis;
  if (customPrompt && customPrompt.trim()) {
    basePrompt = customPrompt.trim();
  }

  return `${basePrompt}\nThe user's name is: "${userName}". Always personalize your responses accordingly.`;
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

// Call Google Gemini API
async function callGemini({ apiKey, model, messages, systemPrompt, temperature = 0.7, imageBase64 = null, imageMimeType = 'image/jpeg' }) {
  const modelName = model || db.getSetting('ai_model', 'gemini-2.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // Format contents for Gemini API
  const contents = [];

  // Add historical messages
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts = [{ text: msg.content }];
    
    if (msg.image_base64) {
      parts.unshift({
        inlineData: {
          mimeType: msg.image_mime || 'image/jpeg',
          data: msg.image_base64
        }
      });
    }
    
    contents.push({ role, parts });
  }

  // Handle latest image attachment if provided
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    let errJson;
    try {
      errJson = JSON.parse(errText);
    } catch (e) {
      errJson = { error: { message: errText } };
    }
    const msg = errJson?.error?.message || `API request failed with status ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.map(p => p.text).join('') || '';
  return replyText;
}

// Streaming Gemini API response
async function streamGemini({ apiKey, model, messages, systemPrompt, temperature = 0.7, onChunk, onError, onDone }) {
  const modelName = model || db.getSetting('ai_model', 'gemini-2.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = [];
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts = [{ text: msg.content }];
    if (msg.image_base64) {
      parts.unshift({
        inlineData: {
          mimeType: msg.image_mime || 'image/jpeg',
          data: msg.image_base64
        }
      });
    }
    contents.push({ role, parts });
  }

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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch(e) { errJson = { error: { message: errText } }; }
      const errMsg = errJson?.error?.message || `Streaming request failed with status ${response.status}`;
      onError(new Error(errMsg));
      return;
    }

    const reader = response.body.getReader();
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
    onDone();
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
  getSystemPrompt,
  generateLocalResponse,
  callGemini,
  streamGemini,
  generateImage
};
