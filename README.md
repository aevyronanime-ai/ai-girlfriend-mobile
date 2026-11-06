# 🤖 J.A.R.V.I.S. AI – Advanced Personal AI Assistant

An Android-first, high-performance personal AI assistant application engineered with bilingual voice capabilities (Hindi & English), real-time conversational intelligence, animated holographic AI orb, multimodal vision understanding, image generation, and creative tools.

---

## 📱 Features Overview

### 1. 💬 AI Chat & Real-Time Streaming
- **Bilingual Intelligence**: Fluent in English, Hindi (हिंदी), and Hinglish.
- **Streaming Responses**: Real-time token streaming via Server-Sent Events (SSE).
- **Multimodal Vision**: Attach photos or documents for deep visual inspection.
- **Full Markdown**: Formatted text, bullet points, headers, and code blocks with 1-click **Copy Code** buttons.
- **Message Actions**: Copy response, speak aloud (TTS), and native Android Web Share.

### 2. 🎙️ Voice Assistant & Animated Holographic Orb
- **Animated Arc Reactor Orb**: Dynamic 60fps HTML5 Canvas particle orb that shifts states (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`).
- **Speech Recognition (STT)**: Recognizes voice commands in Hindi and English.
- **Voice Synthesis (TTS)**: Natural spoken audio with adjustable speech rate and pitch.
- **Voice Commands**: Say *"Open translator"*, *"Generate image of..."*, *"Dark mode"*, or ask any question.

### 3. 🎨 AI Image Generator
- Powered by **Pollinations AI FLUX** engine (100% free, high resolution, no watermarks).
- **Prompt Enhancer**: Automatically transforms simple ideas into hyper-detailed 8K cinematic prompts.
- **Styles**: Cyberpunk Neon, Photorealistic 8K, Anime/Manga, Epic Fantasy, 3D Pixar.
- **Aspect Ratios**: Square (1:1), Landscape (16:9), Mobile Story (9:16).

### 4. ✍️ AI Writer & Coding Studio
- **📖 Story Writer**: Immersive storytelling with custom genres and tones.
- **🎬 YouTube Script**: High-retention hooks, visual cues [B-roll], CTAs, viral title ideas, and SEO tags.
- **💻 Coding Assistant**: Generates production-ready, clean, commented code in any programming language.
- **📱 Social Media**: Generates Instagram hooks, Twitter/X threads, and LinkedIn posts with viral hashtags.
- **📄 Summarizer**: Executive TL;DR and key bullet takeaways.

### 5. 🌐 AI Translator
- Dual-way translation between Hindi, English, Hinglish, Spanish, French, German, Japanese.
- Pronunciation and phonetic reading guide.
- Spoken audio pronunciation button.

### 6. 📄 Document Intelligence
- Upload files (`.txt`, `.md`, `.json`, `.csv`) or paste raw document text.
- Executive summaries, action item extraction, simple language explanations, and risk analysis.

### 7. 📜 Persistent History & Storage
- Native **SQLite Database** (`jarvis.db`) via Node.js `node:sqlite`.
- Stores sessions, message histories, and user settings locally.
- Rename, search, and delete chats with 1-tap.

### 8. 💖 Customizable Persona Engine
- **J.A.R.V.I.S. (Default)**: Sophisticated, witty, articulate, addresses user as *"Sir"*.
- **AI Girlfriend / Companion**: Loving, caring, affectionate, speaks sweet Hindi & English, asks about your day and health.
- **Custom Persona**: Set your own assistant name and system prompt.

---

## 🚀 Quick Start (Running on Termux / Android)

### 1. Launch the Server
```bash
cd /data/user/0/com.termux/files/home/.gemini/antigravity-cli/scratch/jarvis-ai
node server.js
```

The server will start on port `3000`:
- **Local Mobile Browser:** `http://localhost:3000` or `http://127.0.0.1:3000`

### 2. Install as an Android App (PWA)
1. Open Chrome on your Android phone and visit: `http://localhost:3000`
2. Tap the Chrome menu (three dots in top right) ➔ **"Add to Home screen"** or **"Install app"**.
3. J.A.R.V.I.S. AI will be installed directly on your Android phone's home screen with a futuristic icon, running fullscreen without browser bars!

### 3. Activate Google Gemini API (Optional for Web-Scale AI)
1. Open **Settings (⚙️)** inside the J.A.R.V.I.S. app.
2. Enter your free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Tap **Verify Key** and **Save Calibration**.
*(Note: If no API key is added, J.A.R.V.I.S. runs automatically on its built-in offline intelligence engine).*
