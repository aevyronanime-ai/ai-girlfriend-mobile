# 💖 AI Girlfriend Mobile App (JARVIS Neural OS)

An Android-first, high-performance personal AI companion and developer assistant application with bilingual voice interaction (Hindi & English), real-time conversational intelligence, animated holographic AI orb, multimodal vision understanding, image generation, creative tools, and an In-App Developer Studio.

---

## 📱 Features Overview

### 1. 💬 AI Chat & Real-Time Streaming
- **Bilingual & Polyglot Intelligence**: Fluent in Hindi (हिंदी), English, Hinglish, Assamese, Bengali, Urdu, and world languages.
- **Streaming Responses**: Real-time token streaming via Server-Sent Events (SSE).
- **Multimodal Vision**: Attach photos or documents for deep visual analysis.
- **Quota Protection (HTTP 429) & Live Discovery**: Dynamic model discovery via Google ListModels API with automatic fallback across active models (`gemini-3.8-flash` ➔ `gemini-3.8-pro`) and in-memory cooldown tracking.

### 2. 🎙️ Voice Assistant & Animated Holographic Orb
- **Animated Arc Reactor Orb**: Dynamic 60fps HTML5 Canvas particle orb shifting through `IDLE`, `LISTENING`, `THINKING`, and `SPEAKING` states.
- **Speech Recognition (STT)**: Recognizes voice commands in Hindi and English.
- **Voice Synthesis (TTS)**: Natural spoken audio with adjustable speech rate and pitch.
- **Auto-Speak**: Automatically speaks responses aloud in the detected language.

### 3. 🛠️ In-App Developer Studio
- **File Explorer**: Browse and inspect project files directly inside the mobile app.
- **Code Editor**: Real-time syntax highlighting with line numbers, find & replace, and instant validation.
- **Live Preview**: Split-screen live preview frame before saving changes.
- **Backup & Rollback**: Automatic timestamped backup snapshots with 1-click restore.
- **Automated Tests**: Run test suites directly from the mobile UI.

### 4. 🎨 AI Image Generator & Writer Studio
- **Pollinations FLUX**: 100% free high-resolution image synthesis with prompt enhancement.
- **Writer Studio**: Story writer, YouTube scripts with B-roll cues, code generator, social captions, and executive summaries.
- **AI Translator**: Accurate bilingual translation with pronunciation guide.
- **Document Intelligence**: Instant document breakdown, Q&A, and takeaways.

---

## 📲 How to Install & Test on Your Android Phone

### Method 1: Instant Chrome PWA Installation (Recommended — 0 Second Setup)
You can install and use the app on your Android phone right now without needing a PC or compiler:
1. Ensure the app server is running on Termux:
   ```bash
   cd /data/user/0/com.termux/files/home/.gemini/antigravity-cli/scratch/jarvis-ai
   node server.js
   ```
2. Open Google Chrome on your phone and go to:
   `http://localhost:3000` (or your phone's Wi-Fi IP `http://<phone-ip>:3000`)
3. Tap the Chrome menu (3 dots in top right) ➔ tap **"Install app"** or **"Add to Home Screen"**.
4. The **AI Girlfriend Mobile** app icon will appear directly on your phone's Home Screen and launch in true full-screen native mode!

---

### Method 2: Build Native Android APK via Android Studio (PC / Laptop)
1. Download the complete Android project archive:
   `ai-girlfriend-mobile-android.zip`
2. Extract the zip on your computer.
3. Open **Android Studio** ➔ Click **Open** ➔ Select the `android` folder.
4. Android Studio will automatically sync the Gradle project (`compileSdk 35`, `targetSdk 35`).
5. In the top menu, go to **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)**.
6. The debug APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`
7. Transfer `app-debug.apk` to your phone via USB or Google Drive, tap to install, and grant permissions.

---

### Method 3: Cloud Build via GitHub Actions (Zero Local Setup)
This repository includes a pre-configured GitHub Actions CI/CD workflow at `.github/workflows/build-apk.yml`:
1. Push this project to your GitHub repository.
2. Go to the **Actions** tab on your GitHub repository.
3. Select **"Build AI Girlfriend Mobile Android APK"** and click **Run workflow**.
4. GitHub Actions will spin up a fresh Ubuntu Linux runner with OpenJDK 17 and Android SDK 35, compile the native code, and output:
   - `AI-Girlfriend-Mobile-Debug-APK` (`app-debug.apk`)
   - `AI-Girlfriend-Mobile-Release-APK` (`app-release.apk`)
5. Download the APK artifact directly to your phone and install!

---

## 🔒 Security & API Calibration
- **API Keys**: Stored exclusively on your local device server inside SQLite (`jarvis.db`). Never committed to source code or bundled into APK assets.
- **Free Tier Respect**: Designed to work 100% on free tier models. If quota is exhausted, Maya explains the status warmly without crashing.
