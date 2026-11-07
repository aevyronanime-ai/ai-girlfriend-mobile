// Advanced AI Tools Controller (Image Gen, Writer Studio, Translator, Document Analyzer)
class ToolsController {
  constructor() {
    this.initImageGenerator();
    this.initWriterStudio();
    this.initTranslator();
    this.initDocumentAnalyzer();
  }

  // 1. AI Image Generator
  initImageGenerator() {
    const genBtn = document.getElementById('btnGenerateImage');
    const promptInput = document.getElementById('imagePromptInput');
    const styleSelect = document.getElementById('imageStyleSelect');
    const ratioSelect = document.getElementById('imageRatioSelect');
    const resultBox = document.getElementById('imageResultBox');
    const enhanceBtn = document.getElementById('btnEnhancePrompt');

    if (enhanceBtn && promptInput) {
      enhanceBtn.addEventListener('click', () => {
        const val = promptInput.value.trim();
        if (!val) {
          if (window.app) window.app.showToast('Enter a basic idea first');
          return;
        }
        promptInput.value = `Cinematic 8k masterpiece of ${val}, volumetric neon lighting, hyper-detailed textures, octane render, trending on artstation`;
        if (window.soundFX) window.soundFX.click();
      });
    }

    if (genBtn && promptInput && resultBox) {
      genBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
          if (window.app) window.app.showToast('Please enter an image prompt');
          return;
        }

        if (window.soundFX) window.soundFX.click();
        genBtn.disabled = true;
        genBtn.innerHTML = `<span>⏳ Synthesizing AI Visual...</span>`;

        let imageUrl = '';
        try {
          if (window.ClientAI && window.ClientAI.serverAvailable === false) {
            imageUrl = window.ClientAI.generateImageUrl(prompt);
          } else {
            const res = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt,
                style: styleSelect ? styleSelect.value : 'realistic',
                aspectRatio: ratioSelect ? ratioSelect.value : '1:1'
              })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to generate image');
            imageUrl = data.imageUrl;
          }
        } catch (fetchErr) {
          if (window.ClientAI) {
            imageUrl = window.ClientAI.generateImageUrl(prompt);
          } else {
            throw fetchErr;
          }
        }

        try {
          resultBox.style.display = 'block';
          resultBox.innerHTML = `
            <div class="image-result-grid">
              <div class="generated-image-frame">
                <img src="${imageUrl}" alt="${prompt}" id="activeGenImage" loading="lazy" />
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; width:100%;">
                <a href="${imageUrl}" target="_blank" download="jarvis-ai-image.jpg" class="chip-btn" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                  ⬇️ Download HD
                </a>
                <button class="chip-btn" onclick="navigator.clipboard.writeText('${imageUrl}'); if(window.app) window.app.showToast('Image link copied!');">
                  🔗 Copy Link
                </button>
                <button class="chip-btn" onclick="window.tools.askJarvisAboutImage('${imageUrl}', '${encodeURIComponent(prompt)}')">
                  💬 Chat About This
                </button>
              </div>
            </div>
          `;

          if (window.soundFX) window.soundFX.success();
        } catch (err) {
          resultBox.style.display = 'block';
          resultBox.innerHTML = `<p style="color:#ff0055;">⚠️ Error generating visual: ${err.message}</p>`;
        } finally {
          genBtn.disabled = false;
          genBtn.innerHTML = `<span>✨ Generate AI Image</span>`;
        }
      });
    }
  }

  askJarvisAboutImage(imgUrl, prompt) {
    if (window.app && window.chat) {
      window.app.switchTab('chat');
      window.chat.appendMessage('assistant', `Here is the visual generated for: **"${decodeURIComponent(prompt)}"**\n\n![Generated Image](${imgUrl})`, 'ast_img_' + Date.now(), Date.now());
    }
  }

  // 2. AI Writer Studio
  initWriterStudio() {
    this.activeWriterType = 'story';
    const subTabs = document.querySelectorAll('.writer-subtab');
    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        subTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeWriterType = tab.dataset.type;
        this.updateWriterPlaceholders();
      });
    });

    const writeBtn = document.getElementById('btnGenerateWriting');
    const topicInput = document.getElementById('writerTopicInput');
    const detailsInput = document.getElementById('writerDetailsInput');
    const toneSelect = document.getElementById('writerToneSelect');
    const langSelect = document.getElementById('writerLangSelect');
    const resultBox = document.getElementById('writerResultBox');

    if (writeBtn && topicInput && resultBox) {
      writeBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        if (!topic) {
          if (window.app) window.app.showToast('Please enter a topic or prompt');
          return;
        }

        if (window.soundFX) window.soundFX.click();
        writeBtn.disabled = true;
        writeBtn.innerHTML = `<span>⏳ Crafting content...</span>`;

        let content = '';
        try {
          if (window.ClientAI && window.ClientAI.serverAvailable === false) {
            content = await window.ClientAI.generateWriting({
              topic,
              details: detailsInput ? detailsInput.value.trim() : '',
              tone: toneSelect ? toneSelect.value : 'Engaging',
              format: this.activeWriterType,
              lang: langSelect ? langSelect.value : 'Hindi'
            });
          } else {
            const res = await fetch('/api/writer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                toolType: this.activeWriterType,
                topic,
                details: detailsInput ? detailsInput.value.trim() : '',
                tone: toneSelect ? toneSelect.value : 'Engaging',
                language: langSelect ? langSelect.value : 'Hindi'
              })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to craft content');
            content = data.result || '';
          }
        } catch (fetchErr) {
          if (window.ClientAI) {
            content = await window.ClientAI.generateWriting({
              topic,
              details: detailsInput ? detailsInput.value.trim() : '',
              tone: toneSelect ? toneSelect.value : 'Engaging',
              format: this.activeWriterType,
              lang: langSelect ? langSelect.value : 'Hindi'
            });
          } else {
            throw fetchErr;
          }
        }

        try {
          resultBox.style.display = 'block';
          const rendered = window.chat ? window.chat.renderMarkdown(content) : content;

          resultBox.innerHTML = `
            <div class="tool-result-header">
              <h3>✍️ ${this.activeWriterType.toUpperCase()} OUTPUT</h3>
              <div class="tool-result-actions">
                <button class="msg-action-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(content)}')); if(window.app) window.app.showToast('Copied text!');">📋 Copy</button>
                <button class="msg-action-btn" onclick="if(window.voiceAssistant) window.voiceAssistant.speak(decodeURIComponent('${encodeURIComponent(content.slice(0, 300))}'));">🔊 Speak</button>
              </div>
            </div>
            <div class="result-content-body">${rendered}</div>
          `;

          if (window.soundFX) window.soundFX.success();
        } catch (err) {
          resultBox.style.display = 'block';
          resultBox.innerHTML = `<p style="color:#ff0055;">⚠️ Writing error: ${err.message}</p>`;
        } finally {
          writeBtn.disabled = false;
          writeBtn.innerHTML = `<span>⚡ Generate Content</span>`;
        }
      });
    }
  }

  updateWriterPlaceholders() {
    const topicInput = document.getElementById('writerTopicInput');
    if (!topicInput) return;

    switch (this.activeWriterType) {
      case 'story':
        topicInput.placeholder = 'e.g., A time traveler arrives in Ancient Varanasi with an AI device...';
        break;
      case 'youtube':
        topicInput.placeholder = 'e.g., 5 AI tools that will make you rich in 2026...';
        break;
      case 'coding':
        topicInput.placeholder = 'e.g., Build a real-time chat server in Node.js with WebSockets...';
        break;
      case 'social':
        topicInput.placeholder = 'e.g., Launching my new Android AI app today...';
        break;
      case 'summary':
        topicInput.placeholder = 'e.g., Paste text or article link to summarize...';
        break;
    }
  }

  // 3. AI Translator
  initTranslator() {
    const transBtn = document.getElementById('btnTranslate');
    const input = document.getElementById('translateInput');
    const fromSelect = document.getElementById('translateFrom');
    const toSelect = document.getElementById('translateTo');
    const resultBox = document.getElementById('translateResultBox');
    const swapBtn = document.getElementById('btnSwapLang');

    if (swapBtn && fromSelect && toSelect) {
      swapBtn.addEventListener('click', () => {
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;
      });
    }

    if (transBtn && input && resultBox) {
      transBtn.addEventListener('click', async () => {
        const text = input.value.trim();
        if (!text) {
          if (window.app) window.app.showToast('Enter text to translate');
          return;
        }

        if (window.soundFX) window.soundFX.click();
        transBtn.disabled = true;
        transBtn.innerHTML = `<span>⏳ Translating...</span>`;

        let translated = '';
        try {
          if (window.ClientAI && window.ClientAI.serverAvailable === false) {
            translated = await window.ClientAI.translateText({
              text,
              fromLang: fromSelect ? fromSelect.value : 'Auto-Detect',
              toLang: toSelect ? toSelect.value : 'Hindi'
            });
          } else {
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text,
                from: fromSelect ? fromSelect.value : 'Auto-Detect',
                to: toSelect ? toSelect.value : 'Hindi'
              })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Translation failed');
            translated = data.translated;
          }
        } catch (fetchErr) {
          if (window.ClientAI) {
            translated = await window.ClientAI.translateText({
              text,
              fromLang: fromSelect ? fromSelect.value : 'Auto-Detect',
              toLang: toSelect ? toSelect.value : 'Hindi'
            });
          } else {
            throw fetchErr;
          }
        }

        try {
          resultBox.style.display = 'block';
          const rendered = window.chat ? window.chat.renderMarkdown(translated) : translated;

          resultBox.innerHTML = `
            <div class="tool-result-header">
              <h3>🌐 TRANSLATION RESULT</h3>
              <div class="tool-result-actions">
                <button class="msg-action-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(data.translated)}')); if(window.app) window.app.showToast('Copied translation!');">📋 Copy</button>
                <button class="msg-action-btn" onclick="if(window.voiceAssistant) window.voiceAssistant.speak(decodeURIComponent('${encodeURIComponent(data.translated.slice(0, 300))}'));">🔊 Speak</button>
              </div>
            </div>
            <div class="result-content-body">${rendered}</div>
          `;

          if (window.soundFX) window.soundFX.success();
        } catch (err) {
          resultBox.style.display = 'block';
          resultBox.innerHTML = `<p style="color:#ff0055;">⚠️ Error: ${err.message}</p>`;
        } finally {
          transBtn.disabled = false;
          transBtn.innerHTML = `<span>🌐 Translate Now</span>`;
        }
      });
    }
  }

  // 4. Document Analyzer
  initDocumentAnalyzer() {
    const analyzeBtn = document.getElementById('btnAnalyzeDoc');
    const docInput = document.getElementById('docTextInput');
    const fileInput = document.getElementById('docFileInput');
    const goalSelect = document.getElementById('docGoalSelect');
    const resultBox = document.getElementById('docResultBox');

    if (fileInput && docInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          docInput.value = loadEvt.target.result;
          if (window.app) window.app.showToast(`Loaded ${file.name}`);
        };
        reader.readAsText(file);
      });
    }

    if (analyzeBtn && docInput && resultBox) {
      analyzeBtn.addEventListener('click', async () => {
        const docText = docInput.value.trim();
        if (!docText) {
          if (window.app) window.app.showToast('Please paste document text or upload a file');
          return;
        }

        if (window.soundFX) window.soundFX.click();
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<span>⏳ Analyzing document structure...</span>`;

        let analysis = '';
        try {
          if (window.ClientAI && window.ClientAI.serverAvailable === false) {
            analysis = await window.ClientAI.analyzeDocument({
              content: docText,
              goal: goalSelect ? goalSelect.value : 'Summarize key points'
            });
          } else {
            const res = await fetch('/api/analyze-doc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                docText,
                question: goalSelect ? goalSelect.value : 'Summarize key points'
              })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Document analysis failed');
            analysis = data.analysis;
          }
        } catch (fetchErr) {
          if (window.ClientAI) {
            analysis = await window.ClientAI.analyzeDocument({
              content: docText,
              goal: goalSelect ? goalSelect.value : 'Summarize key points'
            });
          } else {
            throw fetchErr;
          }
        }

        try {
          resultBox.style.display = 'block';
          const rendered = window.chat ? window.chat.renderMarkdown(analysis) : analysis;

          resultBox.innerHTML = `
            <div class="tool-result-header">
              <h3>📄 INTELLIGENCE REPORT</h3>
              <div class="tool-result-actions">
                <button class="msg-action-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(analysis)}')); if(window.app) window.app.showToast('Copied report!');">📋 Copy</button>
              </div>
            </div>
            <div class="result-content-body">${rendered}</div>
          `;

          if (window.soundFX) window.soundFX.success();
        } catch (err) {
          resultBox.style.display = 'block';
          resultBox.innerHTML = `<p style="color:#ff0055;">⚠️ Analysis error: ${err.message}</p>`;
        } finally {
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = `<span>🔍 Analyze Document</span>`;
        }
      });
    }
  }
}

window.ToolsController = ToolsController;
