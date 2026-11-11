// Chat Controller: Real-time Messages, SSE Streaming, Markdown & Copy/Share
// Reusable copy with visual feedback ("Copied ✓") and execCommand fallback
window.fallbackCopyText = function(text, onSuccess) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      if (onSuccess) onSuccess();
      return true;
    }
  } catch (err) {
    console.error('Fallback copy error:', err);
  }
  return false;
};

window.copyTextWithFeedback = function(text, btnEl) {
  if (!text) return Promise.resolve(false);
  const originalHtml = btnEl ? btnEl.innerHTML : '';
  const setSuccess = () => {
    if (btnEl) {
      btnEl.innerHTML = 'Copied ✓';
      btnEl.classList.add('copied');
      setTimeout(() => {
        btnEl.innerHTML = originalHtml || '📋 Copy';
        btnEl.classList.remove('copied');
      }, 2500);
    }
    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast('Copied to clipboard');
    }
  };

  if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text).then(() => {
      setSuccess();
      return true;
    }).catch(() => {
      const ok = window.fallbackCopyText(text, setSuccess);
      return ok;
    });
  } else {
    const ok = window.fallbackCopyText(text, setSuccess);
    return Promise.resolve(ok);
  }
};

class ChatController {
  constructor() {
    this.activeSessionId = null;
    this.messagesContainer = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('chatSendBtn');
    this.attachedImageBase64 = null;
    this.attachedImageMime = 'image/jpeg';
    this.isStreaming = false;

    this.bindEvents();
  }

  bindEvents() {
    // Send button click
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    // Enter key (Shift+Enter for newline)
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      // Auto resize textarea
      this.chatInput.addEventListener('input', () => {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
      });
    }

    // Image Upload
    const imgUpload = document.getElementById('chatImageUpload');
    if (imgUpload) {
      imgUpload.addEventListener('change', (e) => this.handleImageSelect(e));
    }

    const removeImgBtn = document.getElementById('removeImgBtn');
    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', () => this.clearAttachedImage());
    }

    // Quick Action Chips
    const chips = document.querySelectorAll('.chip-btn');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query || chip.textContent.trim();
        if (this.chatInput) {
          this.chatInput.value = query;
          this.handleSendMessage();
        }
      });
    });
  }

  handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.attachedImageMime = file.type;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const fullBase64 = loadEvent.target.result;
      this.attachedImageBase64 = fullBase64.split(',')[1];

      // Preview box
      const previewBox = document.getElementById('inputPreviewBox');
      const previewImg = document.getElementById('previewThumbnail');
      if (previewBox && previewImg) {
        previewImg.src = fullBase64;
        previewBox.style.display = 'flex';
      }
    };
    reader.readAsDataURL(file);
  }

  clearAttachedImage() {
    this.attachedImageBase64 = null;
    const previewBox = document.getElementById('inputPreviewBox');
    const imgUpload = document.getElementById('chatImageUpload');
    if (previewBox) previewBox.style.display = 'none';
    if (imgUpload) imgUpload.value = '';
  }

  async loadSessionMessages(sessionId) {
    this.activeSessionId = sessionId;
    if (!this.messagesContainer) return;

    if (window.ClientAI && window.ClientAI.serverAvailable === false) {
      const msgs = window.ClientAI.getMessages(sessionId);
      const sess = window.ClientAI.getSession(sessionId);
      this.messagesContainer.innerHTML = '';
      if (msgs && msgs.length > 0) {
        msgs.forEach(msg => {
          this.appendMessage(msg.role, msg.content, msg.id, msg.timestamp, msg.image_url);
        });
      }
      this.scrollToBottom();
      const titleEl = document.getElementById('topBarChatTitle');
      if (titleEl) titleEl.textContent = (sess && sess.title) || 'AI Girlfriend Chat';
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Session not found');
      const data = await res.json();

      this.messagesContainer.innerHTML = '';
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          this.appendMessage(msg.role, msg.content, msg.id, msg.created_at, msg.image_url);
        });
      }
      this.scrollToBottom();

      // Update top bar title
      const titleEl = document.getElementById('topBarChatTitle');
      if (titleEl) titleEl.textContent = data.title || 'AI Girlfriend Chat';
    } catch (err) {
      if (window.ClientAI) {
        const msgs = window.ClientAI.getMessages(sessionId);
        const sess = window.ClientAI.getSession(sessionId);
        this.messagesContainer.innerHTML = '';
        if (msgs && msgs.length > 0) {
          msgs.forEach(msg => {
            this.appendMessage(msg.role, msg.content, msg.id, msg.timestamp, msg.image_url);
          });
        }
        this.scrollToBottom();
        const titleEl = document.getElementById('topBarChatTitle');
        if (titleEl) titleEl.textContent = (sess && sess.title) || 'AI Girlfriend Chat';
        return;
      }
      console.error('Failed to load session:', err);
    }
  }

  async handleClientAISend(message, currentImgBase64, currentImgMime, typingId) {
    this.removeTypingIndicator(typingId);
    const assistantMsgId = 'msg_ast_' + Date.now();
    const msgBubble = this.createEmptyAssistantBubble(assistantMsgId);

    if (window.ClientAI) {
      window.ClientAI.addMessage(
        this.activeSessionId,
        'user',
        message || '(Image sent)',
        currentImgBase64 ? `data:${currentImgMime};base64,${currentImgBase64}` : ''
      );
    }

    try {
      const result = await window.ClientAI.callGeminiDirect({
        sessionId: this.activeSessionId,
        message,
        imageBase64: currentImgBase64,
        imageMime: currentImgMime,
        onChunk: (text) => {
          if (text && text.trim()) {
            msgBubble.innerHTML = this.renderMarkdown(text.trim());
            this.scrollToBottom();
          }
        }
      });

      let finalText = (result && result.text && result.text.trim()) ? result.text.trim() : '';
      if (!finalText) {
        finalText = '⚠️ **खाली जवाब (HTTP 200 - Empty Response)**\n\nGoogle AI ने कोई टेक्स्ट वापस नहीं भेजा। कृपया दोबारा पूछें।';
      }

      msgBubble.innerHTML = this.renderMarkdown(finalText);
      this.addMessageActionButtons(assistantMsgId, finalText);

      // Check for structured Phone Control command in chat response
      let textToSpeak = finalText;
      if (window.systemLauncher && typeof window.systemLauncher.executeStructuredCommand === 'function') {
        const jsonMatch = finalText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || finalText.match(/(\{[\s\S]*"action"\s*:\s*"[^"]+"[\s\S]*\})/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            if (parsed && parsed.action) {
              window.systemLauncher.executeStructuredCommand(parsed);
              if (parsed.spokenText) {
                textToSpeak = parsed.spokenText;
              }
            }
          } catch (e) {}
        }
      }

      const autoVoiceOn = (window.autoVoiceReplyEnabled !== false) && (window.autoSpeakEnabled !== false);
      if (autoVoiceOn && !(result && result.spoken) && window.voiceAssistant && textToSpeak && !textToSpeak.startsWith('⚠️')) {
        window.voiceAssistant.speak(textToSpeak);
      }
      if (window.soundFX) window.soundFX.success();
    } catch (err) {
      const errorMsg = (typeof window.formatGeminiErrorHindi === 'function')
        ? window.formatGeminiErrorHindi(err?.status || 0, err?.message, err)
        : `> ⚠️ **त्रुटि:** ${err.message}`;
      msgBubble.innerHTML = this.renderMarkdown(errorMsg);
      this.addMessageActionButtons(assistantMsgId, errorMsg);
    } finally {
      // Hard guarantee: bubble is NEVER left blank
      if (!msgBubble.innerHTML.trim() || msgBubble.textContent.trim() === '') {
        const fallbackText = '⚠️ **खाली जवाब (Empty Response)**\n\nGoogle AI ने कोई टेक्स्ट वापस नहीं भेजा। कृपया दोबारा पूछें।';
        msgBubble.innerHTML = this.renderMarkdown(fallbackText);
        this.addMessageActionButtons(assistantMsgId, fallbackText);
      }
      this.isStreaming = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      this.scrollToBottom();
    }
  }

  async handleSendMessage() {
    if (this.isStreaming) return;
    const message = this.chatInput ? this.chatInput.value.trim() : '';
    const hasImage = Boolean(this.attachedImageBase64);

    if (!message && !hasImage) return;

    // Secret Dev Assistant Unlock Password Interception
    if (message && window.DevAssistant && typeof window.DevAssistant.checkPasswordUnlock === 'function') {
      const isUnlock = await window.DevAssistant.checkPasswordUnlock(message);
      if (isUnlock) {
        if (this.chatInput) {
          this.chatInput.value = '';
          this.chatInput.style.height = 'auto';
        }
        this.clearAttachedImage();
        return; // Secret password intercepted: NOT sent to AI, NOT logged in chat history
      }
    }

    if (window.soundFX) window.soundFX.click();

    // Clear input
    if (this.chatInput) {
      this.chatInput.value = '';
      this.chatInput.style.height = 'auto';
    }

    const currentImgBase64 = this.attachedImageBase64;
    const currentImgMime = this.attachedImageMime;
    this.clearAttachedImage();

    // Render User Message
    const userMsgId = 'temp_usr_' + Date.now();
    this.appendMessage('user', message || '(Image sent)', userMsgId, Date.now(), currentImgBase64 ? `data:${currentImgMime};base64,${currentImgBase64}` : '');
    this.scrollToBottom();

    // Show Typing Indicator
    const typingId = this.showTypingIndicator();
    this.scrollToBottom();

    this.isStreaming = true;
    if (this.sendBtn) this.sendBtn.disabled = true;

    if (window.ClientAI && (!window.ClientAI.serverAvailable || localStorage.getItem('use_ollama') === '1')) {
      return this.handleClientAISend(message, currentImgBase64, currentImgMime, typingId);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.activeSessionId,
          message,
          imageBase64: currentImgBase64,
          imageMime: currentImgMime,
          stream: true
        })
      });

      this.removeTypingIndicator(typingId);

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // Handle Server-Sent Events Stream
        const assistantMsgId = 'msg_ast_' + Date.now();
        const msgBubble = this.createEmptyAssistantBubble(assistantMsgId);

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.quotaExhausted) {
                  fullText = parsed.chunk || parsed.fullContent || 'Google Gemini quota limit exhausted.';
                  msgBubble.innerHTML = this.renderMarkdown(fullText) + `
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; border-top:1px solid rgba(255,64,129,0.3); padding-top:8px;">
                      <button class="chip-btn" onclick="window.app.switchTab('settings')" style="background:var(--neon-pink); color:#fff; font-weight:700;">⚙️ Open Settings to Add Key</button>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" class="chip-btn" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:#00f0ff; border-color:rgba(0,240,255,0.4);">🔗 Get Free Key (Google AI Studio)</a>
                    </div>
                  `;
                  msgBubble.style.borderColor = '#ff4081';
                  msgBubble.style.background = 'rgba(255, 64, 129, 0.08)';
                  this.scrollToBottom();
                } else if (parsed.chunk) {
                  fullText += parsed.chunk;
                  msgBubble.innerHTML = this.renderMarkdown(fullText);
                  this.scrollToBottom();
                } else if (parsed.error) {
                  fullText += `\n> ⚠️ **Error:** ${parsed.error}`;
                  msgBubble.innerHTML = this.renderMarkdown(fullText);
                }
              } catch (e) {}
            }
          }
        }

        // Attach action buttons
        this.addMessageActionButtons(assistantMsgId, fullText);
        if (window.soundFX) window.soundFX.success();

        // Auto-speak in same language if enabled
        if (window.autoSpeakEnabled && window.voiceAssistant && fullText.trim()) {
          window.voiceAssistant.speak(fullText);
        }
      } else {
        // Normal JSON response
        const data = await res.json();
        if (data.apiKeyRequired) {
          this.appendApiKeyRequiredCard();
        } else if (data.quotaExhausted) {
          this.appendQuotaExhaustedCard(data.content, data.modelsAttempted);
          if (window.autoSpeakEnabled && window.voiceAssistant) {
            window.voiceAssistant.speak('Aapka Google Gemini API quota pura ho gaya hai.');
          }
        } else {
          const reply = data.content || data.error || 'No response received.';
          const astId = data.id || 'ast_' + Date.now();
          this.appendMessage('assistant', reply, astId, Date.now());

          if (window.autoSpeakEnabled && window.voiceAssistant && reply) {
            window.voiceAssistant.speak(reply);
          }
        }
        if (window.soundFX) window.soundFX.success();
      }
    } catch (err) {
      if (window.ClientAI) {
        return this.handleClientAISend(message, currentImgBase64, currentImgMime, typingId);
      }
      this.removeTypingIndicator(typingId);
      this.appendMessage('assistant', `> ⚠️ **Network Notice:** ${err.message}`, 'err_' + Date.now(), Date.now());
    } finally {
      this.isStreaming = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      this.scrollToBottom();
    }
  }

  appendApiKeyRequiredCard() {
    const cardId = 'api_key_card_' + Date.now();
    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.id = cardId;
    div.innerHTML = `
      <div class="msg-avatar">🔑</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble" style="border: 1px solid #ffaa00; background: rgba(255, 170, 0, 0.08);">
          <div style="font-size:1.05rem; font-weight:700; color:#ffaa00; margin-bottom:6px;">⚠️ Google Gemini API Key Required</div>
          <p style="margin-bottom:10px;">To enable real-time, live AI responses in all languages (Hindi, Assamese, Bengali, English, Urdu, Tamil, etc.), please configure your free Gemini API key.</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="chip-btn" onclick="window.app.switchTab('settings')" style="background:var(--neon-cyan); color:#000; font-weight:700;">⚙️ Open Settings to Add Key</button>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="chip-btn" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px;">🔗 Get Free Key (Google AI Studio)</a>
          </div>
        </div>
        <div class="msg-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `;
    this.messagesContainer.appendChild(div);
    this.scrollToBottom();
  }

  appendQuotaExhaustedCard(content, models = []) {
    const cardId = 'quota_card_' + Date.now();
    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.id = cardId;
    const formatted = this.renderMarkdown(content || 'Google Gemini API quota limit reached (HTTP 429 - RESOURCE_EXHAUSTED).');
    div.innerHTML = `
      <div class="msg-avatar">💖</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble" style="border: 1px solid #ff4081; background: rgba(255, 64, 129, 0.08);">
          <div style="font-size:1.05rem; font-weight:700; color:#ff4081; margin-bottom:8px;">⚠️ Google Gemini Quota Limit Exhausted (HTTP 429)</div>
          <div>${formatted}</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
            <button class="chip-btn" onclick="window.app.switchTab('settings')" style="background:var(--neon-pink); color:#fff; font-weight:700;">⚙️ Open Settings to Add Key</button>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="chip-btn" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:#00f0ff; border-color:rgba(0,240,255,0.4);">🔗 Get Free Key (Google AI Studio)</a>
          </div>
        </div>
        <div class="msg-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `;
    this.messagesContainer.appendChild(div);
    this.scrollToBottom();
  }

  createEmptyAssistantBubble(msgId) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message assistant';
    msgDiv.id = msgId;

    msgDiv.innerHTML = `
      <div class="msg-avatar">⚡</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble markdown-body"><span class="loading-dots" style="opacity:0.7;">● ● ●</span></div>
        <div class="msg-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `;

    this.messagesContainer.appendChild(msgDiv);
    return msgDiv.querySelector('.msg-bubble');
  }

  appendMessage(role, content, id = '', timestamp = Date.now(), imageUrl = '') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;
    if (id) msgDiv.id = id;

    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const avatar = role === 'user' ? '👤' : '⚡';

    let imageHtml = '';
    if (imageUrl) {
      imageHtml = `<div style="margin-bottom:8px;"><img src="${imageUrl}" style="max-width:240px; border-radius:8px; border:1px solid rgba(0,240,255,0.3);" /></div>`;
    }

    const formattedContent = this.renderMarkdown(content);

    msgDiv.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble markdown-body">
          ${imageHtml}
          ${formattedContent}
        </div>
        <div class="msg-timestamp">${timeStr}</div>
      </div>
    `;

    if (role === 'assistant') {
      const wrap = msgDiv.querySelector('.msg-bubble-wrap');
      const actions = document.createElement('div');
      actions.className = 'msg-actions';
      actions.innerHTML = `
        <button class="msg-action-btn copy-btn" title="Copy response">📋 Copy</button>
        <button class="msg-action-btn speak-btn" title="Speak response">🔊 Speak</button>
        <button class="msg-action-btn share-btn" title="Share response">↗️ Share</button>
      `;

      const copyBtn = actions.querySelector('.copy-btn');
      copyBtn.addEventListener('click', () => {
        if (typeof window.copyTextWithFeedback === 'function') {
          window.copyTextWithFeedback(content, copyBtn);
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(content).then(() => {
            if (window.app) window.app.showToast('Copied to clipboard');
          });
        }
      });

      actions.querySelector('.speak-btn').addEventListener('click', () => {
        if (window.voiceAssistant) {
          window.voiceAssistant.speak(content);
        }
      });

      actions.querySelector('.share-btn').addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({ title: 'JARVIS AI Response', text: content });
        } else if (typeof window.copyTextWithFeedback === 'function') {
          window.copyTextWithFeedback(content, copyBtn);
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(content).then(() => {
            if (window.app) window.app.showToast('Link/text copied to clipboard');
          });
        }
      });

      wrap.appendChild(actions);
    }

    this.messagesContainer.appendChild(msgDiv);
  }

  addMessageActionButtons(msgId, content) {
    const msgEl = document.getElementById(msgId);
    if (!msgEl) return;
    const wrap = msgEl.querySelector('.msg-bubble-wrap');
    if (!wrap || wrap.querySelector('.msg-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML = `
      <button class="msg-action-btn copy-btn" title="Copy response">📋 Copy</button>
      <button class="msg-action-btn speak-btn" title="Speak response">🔊 Speak</button>
      <button class="msg-action-btn share-btn" title="Share response">↗️ Share</button>
    `;

    const copyBtn = actions.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
      if (typeof window.copyTextWithFeedback === 'function') {
        window.copyTextWithFeedback(content, copyBtn);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(() => {
          if (window.app) window.app.showToast('Copied to clipboard');
        });
      }
    });

    actions.querySelector('.speak-btn').addEventListener('click', () => {
      if (window.voiceAssistant) {
        window.voiceAssistant.speak(content);
      }
    });

    actions.querySelector('.share-btn').addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: 'JARVIS AI Response', text: content });
      } else if (typeof window.copyTextWithFeedback === 'function') {
        window.copyTextWithFeedback(content, copyBtn);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(content);
      }
    });

    wrap.appendChild(actions);
  }

  showTypingIndicator() {
    const id = 'typing_' + Date.now();
    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.id = id;
    div.innerHTML = `
      <div class="msg-avatar">⚡</div>
      <div class="msg-bubble-wrap">
        <div class="msg-bubble">
          <div class="typing-indicator">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(div);
    return id;
  }

  removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  // Lightweight Markdown & Code Renderer
  renderMarkdown(text) {
    if (!text) return '';

    let html = text
      // Escape raw HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks with syntax copy button
      .replace(/```([a-zA-Z0-9_\-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'code';
        const codeId = 'code_' + Math.random().toString(36).substring(2, 9);
        return `
          <div class="code-block-wrapper">
            <div style="display:flex; justify-content:space-between; align-items:center; background:#080d1a; padding:6px 12px; border-top-left-radius:6px; border-top-right-radius:6px; font-size:0.75rem; border:1px solid rgba(0,240,255,0.2); border-bottom:none;">
              <span style="color:#00f0ff; font-weight:700; text-transform:uppercase;">${language}</span>
              <button onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText); if(window.app) window.app.showToast('Code copied!');" style="background:transparent; border:none; color:#8b9bb4; font-size:0.75rem; cursor:pointer;">📋 Copy Code</button>
            </div>
            <pre style="margin-top:0; border-top-left-radius:0; border-top-right-radius:0;"><code id="${codeId}">${code.trim()}</code></pre>
          </div>
        `;
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headers
      .replace(/^### (.*$)/gim, '<h3 style="color:#00f0ff; margin:10px 0 6px;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color:#00f0ff; margin:12px 0 8px;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color:#00f0ff; margin:14px 0 10px;">$1</h1>')
      // Bold & Italic
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Blockquotes
      .replace(/^\&gt; (.*$)/gim, '<blockquote>$1</blockquote>')
      // Bullet lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Newlines
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    return html;
  }
}

window.ChatController = ChatController;
