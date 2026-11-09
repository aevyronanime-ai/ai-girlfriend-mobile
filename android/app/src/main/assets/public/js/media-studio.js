// =============================================================================
// AI Media Studio Controller (Google Flow-Style Creation Suite)
// Unified Image Generation & Short Video Generation with Voice & Lip Sync
// =============================================================================

class MediaStudioController {
  constructor() {
    this.activeMode = 'image'; // 'image' | 'video'
    this.creationStyle = '2d'; // '2d' | '3d'
    this.videoDuration = 15;   // 10 | 15 | 30 seconds
    this.videoAspectRatio = '16:9';
    this.imageAspectRatio = '1:1';
    this.selectedMotionTags = new Set(['walking', 'gestures', 'blinking', 'expressions', 'lipsync', 'body_movement', 'camera_pan_zoom', 'background_anim']);
    this.characterReferenceData = null;
    this.sceneReferenceData = null;
    this.activeCharacter = null;
    this.isConsistencyLocked = false;
    this.savedCharacters = [];
    this.isGeneratingVideo = false;
    this.currentVideoBlob = null;
    this.currentVideoUrl = null;

    this.initDOM();
    this.initModeSwitcher();
    this.initImageStudio();
    this.initVideoStudio();
    this.initCharacterSystem();
    this.loadSavedCharacters();
  }

  // --- 1. DOM REFERENCES ---
  initDOM() {
    // Mode Switch Cards
    this.btnModeImage = document.getElementById('subtabBtnImage');
    this.btnModeVideo = document.getElementById('subtabBtnVideo');
    this.paneImage = document.getElementById('mediaPaneImage');
    this.paneVideo = document.getElementById('mediaPaneVideo');

    // Image Studio Elements
    this.imgPromptInput = document.getElementById('imagePromptInput');
    this.btnEnhanceImg = document.getElementById('btnEnhancePrompt');
    this.btnClearImg = document.getElementById('btnClearImagePrompt');
    this.btnToggleImageNegPrompt = document.getElementById('btnToggleImageNegativePrompt');
    this.imageNegPromptContainer = document.getElementById('imageNegativePromptContainer');
    this.imageNegPromptInput = document.getElementById('imageNegativePromptInput');
    this.imgStyleSelect = document.getElementById('imageStyleSelect');
    this.imgRatioSelect = document.getElementById('imageRatioSelect');
    this.imgQuantitySelect = document.getElementById('imageQuantitySelect');
    this.imageQualitySelect = document.getElementById('imageQualitySelect');
    this.imgModelSelect = document.getElementById('imageModelSelect');
    this.btnGenerateImg = document.getElementById('btnGenerateImage');
    this.imgProgressBox = document.getElementById('imageGenerationProgress');
    this.imgProgressBar = document.getElementById('imageProgressBar');
    this.imgProgressText = document.getElementById('imageProgressText');
    this.imgProgressPercent = document.getElementById('imageProgressPercent');
    this.imgResultBox = document.getElementById('imageResultBox');

    // Video Studio Elements
    this.btnStyle2D = document.getElementById('btnStyle2D');
    this.btnStyle3D = document.getElementById('btnStyle3D');
    this.videoPromptInput = document.getElementById('videoPromptInput');
    this.btnEnhanceVid = document.getElementById('btnEnhanceVideoPrompt');
    this.btnToggleNegPrompt = document.getElementById('btnToggleNegativePrompt');
    this.negPromptContainer = document.getElementById('videoNegativePromptContainer');
    this.videoNegPromptInput = document.getElementById('videoNegativePromptInput');

    // Video Duration Buttons
    this.btnDur8 = document.getElementById('btnDuration8');
    this.btnDur10 = document.getElementById('btnDuration10');
    this.btnDur15 = document.getElementById('btnDuration15');
    this.btnDur30 = document.getElementById('btnDuration30');

    // Video Aspect Ratio Buttons
    this.aspectBtns = document.querySelectorAll('.flow-aspect-btn');

    // Motion Chips
    this.motionChips = document.querySelectorAll('.flow-motion-chip');

    // Video Settings
    this.videoActorCountSelect = document.getElementById('videoActorCountSelect');
    this.videoArtisticStyleSelect = document.getElementById('videoArtisticStyleSelect');
    this.videoLightingSelect = document.getElementById('videoLightingSelect');
    this.videoQualitySelect = document.getElementById('videoQualitySelect');
    this.videoMotionStrength = document.getElementById('videoMotionStrengthSelect');
    this.videoCameraMovement = document.getElementById('videoCameraMovementSelect');
    this.videoFpsSelect = document.getElementById('videoFpsSelect');
    this.videoResolutionSelect = document.getElementById('videoResolutionSelect');
    this.videoModelSelect = document.getElementById('videoModelSelect');
    this.chkAudioGeneration = document.getElementById('chkAudioGeneration');

    // Dialogue & Lip Sync Elements
    this.chkNoDialogue = document.getElementById('chkNoDialogue');
    this.dialogueInputArea = document.getElementById('dialogueInputArea');
    this.videoDialogueInput = document.getElementById('videoDialogueInput');
    this.videoLanguageSelect = document.getElementById('videoLanguageSelect');
    this.videoVoiceGenderSelect = document.getElementById('videoVoiceGenderSelect');
    this.videoEmotionSelect = document.getElementById('videoEmotionSelect');
    this.videoBgmSelect = document.getElementById('videoBgmSelect');
    this.videoSfxSelect = document.getElementById('videoSfxSelect');
    this.videoVoiceSpeed = document.getElementById('videoVoiceSpeed');
    this.videoVoicePitch = document.getElementById('videoVoicePitch');
    this.lblVoiceSpeed = document.getElementById('lblVoiceSpeed');
    this.lblVoicePitch = document.getElementById('lblVoicePitch');

    // Character Consistency & Reference Uploads
    this.charCarousel = document.getElementById('flowCharacterCarousel');
    this.btnOpenCharModal = document.getElementById('btnOpenCreateCharacterModal');
    this.activeCharName = document.getElementById('flowActiveCharName');
    this.btnToggleConsistencyLock = document.getElementById('btnToggleConsistencyLock');
    this.lockIcon = document.getElementById('flowLockIcon');
    this.lockText = document.getElementById('flowLockText');

    this.charRefInput = document.getElementById('videoCharRefUpload');
    this.tileCharRef = document.getElementById('tileCharRef');
    this.boxCharRefEmpty = document.getElementById('boxCharRefEmpty');
    this.boxCharRefPreview = document.getElementById('boxCharRefPreview');
    this.imgCharRefPreview = document.getElementById('imgCharRefPreview');
    this.btnRemoveCharRef = document.getElementById('btnRemoveCharRef');

    this.sceneRefInput = document.getElementById('videoSceneRefUpload');
    this.tileSceneRef = document.getElementById('tileSceneRef');
    this.boxSceneRefEmpty = document.getElementById('boxSceneRefEmpty');
    this.boxSceneRefPreview = document.getElementById('boxSceneRefPreview');
    this.imgSceneRefPreview = document.getElementById('imgSceneRefPreview');
    this.btnRemoveSceneRef = document.getElementById('btnRemoveSceneRef');

    // Video Action & Progress
    this.btnGenerateVid = document.getElementById('btnGenerateVideo');
    this.vidProgressBox = document.getElementById('videoGenerationProgress');
    this.vidProgressBar = document.getElementById('videoProgressBar');
    this.vidProgressText = document.getElementById('videoProgressText');
    this.vidProgressPercent = document.getElementById('videoProgressPercent');
    this.btnCancelVid = document.getElementById('btnCancelVideoGeneration');

    // Video Results
    this.vidResultsSection = document.getElementById('videoResultsSection');
    this.vidPreviewPlayer = document.getElementById('videoPreviewPlayer');
    this.vidResultMetaBadge = document.getElementById('videoResultMetaBadge');
    this.flowRenderCanvas = document.getElementById('flowRenderCanvas');
    this.btnDownloadVid = document.getElementById('btnDownloadVideo');
    this.btnRegenerateVid = document.getElementById('btnRegenerateVideo');
    this.btnNewClip = document.getElementById('btnNewClip');
    this.btnSaveGallery = document.getElementById('btnSaveToGallery');

    // Lightbox & Modals
    this.charModal = document.getElementById('characterCreationModal');
    this.btnCloseCharModal = document.getElementById('btnCloseCharModal');
    this.btnCancelCharModal = document.getElementById('btnCancelCharModal');
    this.btnSaveChar = document.getElementById('btnSaveCharacter');
    this.charModalPhotoUpload = document.getElementById('charModalPhotoUpload');
    this.btnCharModalUploadPhoto = document.getElementById('btnCharModalUploadPhoto');
    this.charModalPhotoName = document.getElementById('charModalPhotoName');
    this.charInputAccessories = document.getElementById('charInputAccessories');

    this.lightboxModal = document.getElementById('imageLightboxModal');
    this.lightboxImg = document.getElementById('lightboxImage');
    this.btnCloseLightbox = document.getElementById('btnCloseLightbox');
    this.btnLightboxDownload = document.getElementById('btnLightboxDownload');
    this.btnLightboxCopy = document.getElementById('btnLightboxCopy');

    // Voice Role & Colab GPU Modal Elements
    this.videoVoiceRoleSelect = document.getElementById('videoVoiceRoleSelect');
    this.btnOpenColabInfo = document.getElementById('btnOpenColabInfo');
    this.colabInfoModal = document.getElementById('colabInfoModal');
    this.btnCloseColabModal = document.getElementById('btnCloseColabModal');
    this.btnCloseColabBtn = document.getElementById('btnCloseColabBtn');
  }

  // --- 2. MODE SWITCHER ---
  initModeSwitcher() {
    const setMode = (mode) => {
      this.activeMode = mode;
      if (mode === 'image') {
        if (this.btnModeImage) {
          this.btnModeImage.classList.add('active');
          const pill = this.btnModeImage.querySelector('.flow-mode-status-pill');
          if (pill) pill.style.display = 'inline-block';
        }
        if (this.btnModeVideo) {
          this.btnModeVideo.classList.remove('active');
          const pill = this.btnModeVideo.querySelector('.flow-mode-status-pill');
          if (pill) pill.style.display = 'none';
        }
        if (this.paneImage) {
          this.paneImage.style.display = 'block';
          this.paneImage.classList.add('active');
        }
        if (this.paneVideo) {
          this.paneVideo.style.display = 'none';
          this.paneVideo.classList.remove('active');
        }
      } else {
        if (this.btnModeVideo) {
          this.btnModeVideo.classList.add('active');
          const pill = this.btnModeVideo.querySelector('.flow-mode-status-pill');
          if (pill) pill.style.display = 'inline-block';
        }
        if (this.btnModeImage) {
          this.btnModeImage.classList.remove('active');
          const pill = this.btnModeImage.querySelector('.flow-mode-status-pill');
          if (pill) pill.style.display = 'none';
        }
        if (this.paneVideo) {
          this.paneVideo.style.display = 'block';
          this.paneVideo.classList.add('active');
        }
        if (this.paneImage) {
          this.paneImage.style.display = 'none';
          this.paneImage.classList.remove('active');
        }
      }
      if (window.soundFX) window.soundFX.click();
    };

    if (this.btnModeImage) this.btnModeImage.addEventListener('click', () => setMode('image'));
    if (this.btnModeVideo) this.btnModeVideo.addEventListener('click', () => setMode('video'));
  }

  // --- 3. IMAGE GENERATION STUDIO ---
  initImageStudio() {
    // Enhance Image Prompt
    if (this.btnEnhanceImg && this.imgPromptInput) {
      this.btnEnhanceImg.addEventListener('click', () => {
        const val = this.imgPromptInput.value.trim();
        if (!val) {
          if (window.app) window.app.showToast('Please type a visual concept first');
          return;
        }
        const style = this.imgStyleSelect ? this.imgStyleSelect.value : '2d-anime';
        const enhanced = this._getEnhancedPrompt(val, style);
        this.imgPromptInput.value = enhanced;
        if (window.soundFX) window.soundFX.click();
        if (window.app) window.app.showToast('Prompt enhanced with artistic details ✨');
      });
    }

    // Clear Prompt
    if (this.btnClearImg && this.imgPromptInput) {
      this.btnClearImg.addEventListener('click', () => {
        this.imgPromptInput.value = '';
        this.imgPromptInput.focus();
      });
    }

    // Toggle Negative Prompt
    if (this.btnToggleImageNegPrompt && this.imageNegPromptContainer) {
      this.btnToggleImageNegPrompt.addEventListener('click', () => {
        const isHidden = this.imageNegPromptContainer.style.display === 'none';
        this.imageNegPromptContainer.style.display = isHidden ? 'block' : 'none';
        const span = this.btnToggleImageNegPrompt.querySelector('span');
        if (span) span.textContent = isHidden ? '- Hide Negative Prompt' : '+ Negative Prompt (Optional)';
      });
    }

    // Generate Images
    if (this.btnGenerateImg) {
      this.btnGenerateImg.addEventListener('click', () => this.generateImages());
    }

    // Lightbox Handlers
    if (this.btnCloseLightbox && this.lightboxModal) {
      this.btnCloseLightbox.addEventListener('click', () => {
        this.lightboxModal.style.display = 'none';
      });
      this.lightboxModal.addEventListener('click', (e) => {
        if (e.target === this.lightboxModal) this.lightboxModal.style.display = 'none';
      });
    }

    if (this.btnLightboxCopy && this.lightboxImg) {
      this.btnLightboxCopy.addEventListener('click', () => {
        if (this.lightboxImg.src) {
          navigator.clipboard.writeText(this.lightboxImg.src);
          if (window.app) window.app.showToast('Image URL copied to clipboard');
        }
      });
    }
  }

  _getEnhancedPrompt(base, style) {
    const lightingOptions = ['volumetric golden hour lighting', 'dramatic cinematic chiaroscuro', 'soft bioluminescent glow', 'vibrant studio lighting'];
    const detailOptions = ['ultra-detailed 8K resolution', 'masterpiece award-winning digital art', 'breathtaking composition', 'intricate textures'];
    const light = lightingOptions[Math.floor(Math.random() * lightingOptions.length)];
    const detail = detailOptions[Math.floor(Math.random() * detailOptions.length)];
    return `${base}, ${light}, ${detail}, trending on ArtStation`;
  }

  async generateImages() {
    if (!this.imgPromptInput) return;
    const prompt = this.imgPromptInput.value.trim();
    if (!prompt) {
      if (window.app) window.app.showToast('Please enter an image prompt description');
      return;
    }

    const style = this.imgStyleSelect ? this.imgStyleSelect.value : '2d-anime';
    const aspectRatio = this.imgRatioSelect ? this.imgRatioSelect.value : '1:1';
    const quantity = this.imgQuantitySelect ? parseInt(this.imgQuantitySelect.value, 10) : 1;
    const model = this.imgModelSelect ? this.imgModelSelect.value : 'flux';
    const negativePrompt = this.imageNegPromptInput ? this.imageNegPromptInput.value.trim() : '';
    const quality = this.imageQualitySelect ? this.imageQualitySelect.value : 'standard';

    if (window.soundFX) window.soundFX.click();

    // UI Progress State
    this.btnGenerateImg.disabled = true;
    this.btnGenerateImg.innerHTML = `<span class="btn-icon">⏳</span><span class="btn-text">Synthesizing ${quantity} Image${quantity > 1 ? 's' : ''}...</span>`;
    if (this.imgProgressBox) {
      this.imgProgressBox.style.display = 'block';
      this.imgProgressBar.style.width = '20%';
      this.imgProgressText.textContent = 'Contacting AI neural pipeline...';
      this.imgProgressPercent.textContent = '20%';
    }

    let progressTimer = setInterval(() => {
      const cur = parseInt(this.imgProgressBar.style.width, 10) || 20;
      if (cur < 90) {
        const next = cur + 15;
        this.imgProgressBar.style.width = `${next}%`;
        this.imgProgressPercent.textContent = `${next}%`;
        if (next === 50) this.imgProgressText.textContent = 'Denoising latent visuals...';
        if (next === 80) this.imgProgressText.textContent = 'Upscaling & refining artistic details...';
      }
    }, 400);

    try {
      let resultData = null;
      if (window.ClientAI && window.ClientAI.serverAvailable === false) {
        // Direct Client Generator
        const images = [];
        for (let i = 0; i < quantity; i++) {
          const url = window.ClientAI.generateImageUrl(prompt + `, ${style}`, 1024, 1024, model);
          images.push({ url, imageUrl: url, seed: Math.floor(Math.random() * 999999), width: 1024, height: 1024 });
        }
        resultData = { success: true, images, prompt, style, aspectRatio };
      } else {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, negativePrompt, style, aspectRatio, quantity, model, quality })
        });
        resultData = await res.json();
        if (!resultData.success) throw new Error(resultData.error || 'Failed to synthesize images');
      }

      clearInterval(progressTimer);
      if (this.imgProgressBar) {
        this.imgProgressBar.style.width = '100%';
        this.imgProgressPercent.textContent = '100%';
        this.imgProgressText.textContent = 'Rendering complete!';
      }

      this.renderImageResults(resultData);
      if (window.soundFX) window.soundFX.success();
    } catch (err) {
      clearInterval(progressTimer);
      if (this.imgResultBox) {
        this.imgResultBox.style.display = 'block';
        this.imgResultBox.innerHTML = `
          <div style="color:#ff4d6d; font-size:0.85rem; padding:10px; background:rgba(255,77,109,0.1); border-radius:8px;">
            ⚠️ <strong>Generation Error:</strong> ${this.escapeHtml(err.message)}
          </div>
        `;
      }
      if (window.app) window.app.showToast('Image generation failed: ' + err.message);
    } finally {
      setTimeout(() => {
        if (this.imgProgressBox) this.imgProgressBox.style.display = 'none';
        if (this.btnGenerateImg) {
          this.btnGenerateImg.disabled = false;
          this.btnGenerateImg.innerHTML = `<span class="btn-icon">✨</span><span class="btn-text">Generate Image</span>`;
        }
      }, 500);
    }
  }

  renderImageResults(data) {
    if (!this.imgResultBox) return;
    const images = Array.isArray(data.images) && data.images.length > 0 ? data.images : [{ url: data.imageUrl }];
    this.imgResultBox.style.display = 'block';

    let galleryHtml = `
      <div class="flow-card-header">
        <label class="flow-label">🖼️ Generated Art (${images.length} Image${images.length > 1 ? 's' : ''})</label>
        <button type="button" class="flow-btn-accent-sm" onclick="window.mediaStudio.regenerateImages()">🔄 Re-roll All</button>
      </div>
      <div class="flow-image-gallery-grid">
    `;

    images.forEach((img, idx) => {
      const url = img.url || img.imageUrl;
      galleryHtml += `
        <div class="flow-gallery-item" onclick="window.mediaStudio.openLightbox('${url}')">
          <img src="${url}" alt="${this.escapeHtml(data.prompt || 'Generated art')}" loading="lazy">
        </div>
      `;
    });

    galleryHtml += `</div>`;

    // Action tools for primary image
    const primaryUrl = images[0].url || images[0].imageUrl;
    galleryHtml += `
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <a href="${primaryUrl}" target="_blank" download="ai-generated-image.jpg" class="chip-btn" style="text-decoration:none; background:var(--neon-cyan); color:#000; font-weight:700;">
          ⬇️ Download HD
        </a>
        <button type="button" class="chip-btn" onclick="navigator.clipboard.writeText('${primaryUrl}'); if(window.app) window.app.showToast('Image link copied');">
          🔗 Copy URL
        </button>
        <button type="button" class="chip-btn" onclick="window.mediaStudio.askJarvisAboutImage('${primaryUrl}', '${encodeURIComponent(data.prompt || '')}')">
          💬 Chat with Companion
        </button>
        <button type="button" class="chip-btn" onclick="window.mediaStudio.useAsVideoReference('${primaryUrl}')">
          🎬 Animate This Image
        </button>
      </div>
    `;

    this.imgResultBox.innerHTML = galleryHtml;
  }

  openLightbox(url) {
    if (this.lightboxModal && this.lightboxImg) {
      this.lightboxImg.src = url;
      if (this.btnLightboxDownload) this.btnLightboxDownload.href = url;
      this.lightboxModal.style.display = 'flex';
    }
  }

  regenerateImages() {
    this.generateImages();
  }

  askJarvisAboutImage(url, encodedPrompt) {
    if (window.app && window.chat) {
      window.app.switchTab('chat');
      window.chat.appendMessage(
        'assistant',
        `Here is the visual generated for: **"${decodeURIComponent(encodedPrompt)}"**\n\n![Generated Image](${url})`,
        'ast_img_' + Date.now(),
        Date.now()
      );
    }
  }

  useAsVideoReference(url) {
    this.characterReferenceData = url;
    if (this.imgCharRefPreview && this.boxCharRefPreview && this.boxCharRefEmpty) {
      this.imgCharRefPreview.src = url;
      this.boxCharRefEmpty.style.display = 'none';
      this.boxCharRefPreview.style.display = 'block';
    }
    // Switch to video pane
    if (this.btnModeVideo) this.btnModeVideo.click();
    if (window.app) window.app.showToast('Image applied as Character Reference for Video ✨');
  }

  // --- 4. VIDEO GENERATION STUDIO ---
  initVideoStudio() {
    // 2D vs 3D Style Toggle
    if (this.btnStyle2D) {
      this.btnStyle2D.addEventListener('click', () => {
        this.creationStyle = '2d';
        this.btnStyle2D.classList.add('active');
        if (this.btnStyle3D) this.btnStyle3D.classList.remove('active');
        if (window.soundFX) window.soundFX.click();
      });
    }

    if (this.btnStyle3D) {
      this.btnStyle3D.addEventListener('click', () => {
        this.creationStyle = '3d';
        this.btnStyle3D.classList.add('active');
        if (this.btnStyle2D) this.btnStyle2D.classList.remove('active');
        if (window.soundFX) window.soundFX.click();
      });
    }

    // Enhance Video Prompt
    if (this.btnEnhanceVid && this.videoPromptInput) {
      this.btnEnhanceVid.addEventListener('click', () => {
        const val = this.videoPromptInput.value.trim();
        if (!val) {
          if (window.app) window.app.showToast('Please type a scene concept first');
          return;
        }
        const stylePrefix = this.creationStyle === '3d' ? '3D Pixar-style animated scene' : 'Vibrant 2D anime animation';
        this.videoPromptInput.value = `${stylePrefix}: ${val}, cinematic camera motion, smooth fluid character movement, dynamic ambient lighting, high frame rate animation`;
        if (window.soundFX) window.soundFX.click();
        if (window.app) window.app.showToast('Video prompt enhanced with motion cues 🎬');
      });
    }

    // Negative Prompt Toggle
    if (this.btnToggleNegPrompt && this.negPromptContainer) {
      this.btnToggleNegPrompt.addEventListener('click', () => {
        const isHidden = this.negPromptContainer.style.display === 'none';
        this.negPromptContainer.style.display = isHidden ? 'block' : 'none';
        this.btnToggleNegPrompt.textContent = isHidden ? '- Hide Negative Prompt' : '+ Negative Prompt (Optional)';
      });
    }

    // Live Detection of "नाम: संवाद" or "Name: Dialogue" format in Prompt
    if (this.videoPromptInput) {
      this.videoPromptInput.addEventListener('input', () => {
        const val = this.videoPromptInput.value;
        const { cues, fullDialogue } = this._parsePromptDialogue(val, '');
        if (cues.length > 0 && this.videoDialogueInput) {
          // If dialogue box is empty or was previously auto-filled, sync detected dialogue
          if (!this.videoDialogueInput.value.trim() || this.videoDialogueInput.dataset.autoFilled === 'true') {
            this.videoDialogueInput.value = fullDialogue;
            this.videoDialogueInput.dataset.autoFilled = 'true';
            this.videoDialogueInput.style.borderColor = 'var(--neon-cyan)';
            setTimeout(() => {
              if (this.videoDialogueInput) this.videoDialogueInput.style.borderColor = '';
            }, 1200);
          }
        }
      });
    }

    if (this.videoDialogueInput) {
      this.videoDialogueInput.addEventListener('input', () => {
        this.videoDialogueInput.dataset.autoFilled = 'false';
      });
    }

    // Duration Selector (8s Test Clip, 10s, 15s, 30s)
    const setDuration = (dur) => {
      this.videoDuration = dur;
      [this.btnDur8, this.btnDur10, this.btnDur15, this.btnDur30].forEach(btn => {
        if (btn) {
          const match = parseInt(btn.dataset.duration, 10) === dur;
          btn.classList.toggle('active', match);
        }
      });
      if (window.soundFX) window.soundFX.click();
    };

    if (this.btnDur8) this.btnDur8.addEventListener('click', () => setDuration(8));
    if (this.btnDur10) this.btnDur10.addEventListener('click', () => setDuration(10));
    if (this.btnDur15) this.btnDur15.addEventListener('click', () => setDuration(15));
    if (this.btnDur30) this.btnDur30.addEventListener('click', () => setDuration(30));

    // Aspect Ratio Buttons
    this.aspectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.aspectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.videoAspectRatio = btn.dataset.ratio || '16:9';
        if (window.soundFX) window.soundFX.click();
      });
    });

    // Motion Chips Toggle
    this.motionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const motion = chip.dataset.motion;
        if (this.selectedMotionTags.has(motion)) {
          this.selectedMotionTags.delete(motion);
          chip.classList.remove('active');
        } else {
          this.selectedMotionTags.add(motion);
          chip.classList.add('active');
        }
        if (window.soundFX) window.soundFX.click();
      });
    });

    // Dialogue Voice Speed & Pitch Sliders
    if (this.videoVoiceSpeed && this.lblVoiceSpeed) {
      this.videoVoiceSpeed.addEventListener('input', () => {
        this.lblVoiceSpeed.textContent = `${parseFloat(this.videoVoiceSpeed.value).toFixed(2)}x`;
      });
    }

    if (this.videoVoicePitch && this.lblVoicePitch) {
      this.videoVoicePitch.addEventListener('input', () => {
        this.lblVoicePitch.textContent = `${parseFloat(this.videoVoicePitch.value).toFixed(2)}x`;
      });
    }

    // No Dialogue / ASMR Toggle
    if (this.chkNoDialogue && this.dialogueInputArea) {
      this.chkNoDialogue.addEventListener('change', () => {
        const isMuted = this.chkNoDialogue.checked;
        this.dialogueInputArea.style.opacity = isMuted ? '0.45' : '1';
        this.dialogueInputArea.style.pointerEvents = isMuted ? 'none' : 'auto';
        if (window.app) {
          window.app.showToast(isMuted ? 'Dialogue muted (ASMR / Ambient mode enabled)' : 'Dialogue voice enabled');
        }
      });
    }

    // Dialogue Sample Quick Chips
    document.querySelectorAll('.flow-sample-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.videoDialogueInput) {
          this.videoDialogueInput.value = btn.dataset.text || '';
          if (window.soundFX) window.soundFX.click();
        }
      });
    });

    // Google Colab GPU Backend Modal
    if (this.btnOpenColabInfo && this.colabInfoModal) {
      this.btnOpenColabInfo.addEventListener('click', () => {
        this.colabInfoModal.style.display = 'flex';
      });
    }
    if (this.btnCloseColabModal && this.colabInfoModal) {
      this.btnCloseColabModal.addEventListener('click', () => {
        this.colabInfoModal.style.display = 'none';
      });
    }
    if (this.btnCloseColabBtn && this.colabInfoModal) {
      this.btnCloseColabBtn.addEventListener('click', () => {
        this.colabInfoModal.style.display = 'none';
      });
    }
    if (this.colabInfoModal) {
      this.colabInfoModal.addEventListener('click', (e) => {
        if (e.target === this.colabInfoModal) this.colabInfoModal.style.display = 'none';
      });
    }

    // Reference Upload Handlers
    this._initUploadHandlers();

    // Generate Video Button
    if (this.btnGenerateVid) {
      this.btnGenerateVid.addEventListener('click', () => this.generateVideo());
    }

    // Results Player Buttons
    if (this.btnRegenerateVid) {
      this.btnRegenerateVid.addEventListener('click', () => this.generateVideo());
    }

    if (this.btnNewClip) {
      this.btnNewClip.addEventListener('click', () => {
        if (this.videoPromptInput) this.videoPromptInput.focus();
        if (this.vidResultsSection) this.vidResultsSection.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (this.btnSaveGallery) {
      this.btnSaveGallery.addEventListener('click', () => this.saveVideoToGallery());
    }

    if (this.btnCancelVid) {
      this.btnCancelVid.addEventListener('click', () => {
        this.isGeneratingVideo = false;
        if (this.vidProgressBox) this.vidProgressBox.style.display = 'none';
        if (this.btnGenerateVid) this.btnGenerateVid.disabled = false;
        if (window.app) window.app.showToast('Video render cancelled');
      });
    }
  }

  _initUploadHandlers() {
    // Character Reference Upload
    if (this.tileCharRef && this.charRefInput) {
      this.tileCharRef.addEventListener('click', (e) => {
        if (e.target !== this.btnRemoveCharRef) this.charRefInput.click();
      });

      this.charRefInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.characterReferenceData = evt.target.result;
            if (this.imgCharRefPreview && this.boxCharRefPreview && this.boxCharRefEmpty) {
              this.imgCharRefPreview.src = evt.target.result;
              this.boxCharRefEmpty.style.display = 'none';
              this.boxCharRefPreview.style.display = 'block';
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (this.btnRemoveCharRef) {
      this.btnRemoveCharRef.addEventListener('click', (e) => {
        e.stopPropagation();
        this.characterReferenceData = null;
        if (this.charRefInput) this.charRefInput.value = '';
        if (this.boxCharRefEmpty && this.boxCharRefPreview) {
          this.boxCharRefPreview.style.display = 'none';
          this.boxCharRefEmpty.style.display = 'flex';
        }
      });
    }

    // Scene Reference Upload
    if (this.tileSceneRef && this.sceneRefInput) {
      this.tileSceneRef.addEventListener('click', (e) => {
        if (e.target !== this.btnRemoveSceneRef) this.sceneRefInput.click();
      });

      this.sceneRefInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.sceneReferenceData = evt.target.result;
            if (this.imgSceneRefPreview && this.boxSceneRefPreview && this.boxSceneRefEmpty) {
              this.imgSceneRefPreview.src = evt.target.result;
              this.boxSceneRefEmpty.style.display = 'none';
              this.boxSceneRefPreview.style.display = 'block';
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (this.btnRemoveSceneRef) {
      this.btnRemoveSceneRef.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sceneReferenceData = null;
        if (this.sceneRefInput) this.sceneRefInput.value = '';
        if (this.boxSceneRefEmpty && this.boxSceneRefPreview) {
          this.boxSceneRefPreview.style.display = 'none';
          this.boxSceneRefEmpty.style.display = 'flex';
        }
      });
    }
  }

  // --- 5. ADVANCED CHARACTER CONSISTENCY SYSTEM ---
  initCharacterSystem() {
    if (this.btnOpenCharModal && this.charModal) {
      this.btnOpenCharModal.addEventListener('click', () => {
        this.charModal.style.display = 'flex';
      });
    }

    if (this.btnCloseCharModal && this.charModal) {
      this.btnCloseCharModal.addEventListener('click', () => {
        this.charModal.style.display = 'none';
      });
    }

    if (this.btnCancelCharModal && this.charModal) {
      this.btnCancelCharModal.addEventListener('click', () => {
        this.charModal.style.display = 'none';
      });
    }

    // Modal Photo Upload
    if (this.btnCharModalUploadPhoto && this.charModalPhotoUpload) {
      this.btnCharModalUploadPhoto.addEventListener('click', () => this.charModalPhotoUpload.click());
      this.charModalPhotoUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file && this.charModalPhotoName) {
          this.charModalPhotoName.textContent = file.name;
        }
      });
    }

    // Save Character
    if (this.btnSaveChar) {
      this.btnSaveChar.addEventListener('click', () => this.saveNewCharacter());
    }

    // Consistency Lock Button
    if (this.btnToggleConsistencyLock) {
      this.btnToggleConsistencyLock.addEventListener('click', () => {
        this.isConsistencyLocked = !this.isConsistencyLocked;
        this.updateLockUI();
        if (window.soundFX) window.soundFX.click();
        if (window.app) {
          window.app.showToast(this.isConsistencyLocked ? '🔒 Character Consistency Locked' : '🔓 Character Consistency Unlocked');
        }
      });
    }
  }

  updateLockUI() {
    if (this.btnToggleConsistencyLock) {
      this.btnToggleConsistencyLock.classList.toggle('locked', this.isConsistencyLocked);
    }
    if (this.lockIcon) {
      this.lockIcon.textContent = this.isConsistencyLocked ? '🔒' : '🔓';
    }
    if (this.lockText) {
      this.lockText.textContent = this.isConsistencyLocked ? 'Consistency Locked' : 'Lock Consistency';
    }
  }

  loadSavedCharacters() {
    try {
      const raw = localStorage.getItem('flow_media_characters');
      this.savedCharacters = raw ? JSON.parse(raw) : [];
      if (!this.savedCharacters || this.savedCharacters.length === 0) {
        // Seed default recurring companion character
        this.savedCharacters = [
          {
            id: 'char_default_maya',
            name: 'Maya (AI Companion)',
            appearance: 'Gentle anime eyes, sweet warm smile, fair glowing complexion',
            hairstyle: 'Long violet-black hair with dual sakura pink ribbons',
            clothing: 'Traditional white and lavender floral kimono',
            body_proportions: 'Petite anime proportions, graceful posture',
            voice: 'female',
            description: 'Affectionate, devoted and intelligent companion',
            image_data: ''
          }
        ];
        this._persistCharacters();
      }
      this.renderCharacterCarousel();
    } catch (e) {
      this.savedCharacters = [];
    }
  }

  _persistCharacters() {
    try {
      localStorage.setItem('flow_media_characters', JSON.stringify(this.savedCharacters));
      fetch('/api/media-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.savedCharacters[0] || {})
      }).catch(() => {});
    } catch (e) {}
  }

  renderCharacterCarousel() {
    if (!this.charCarousel) return;
    let html = `
      <div class="flow-character-chip ${!this.activeCharacter ? 'active' : ''}" onclick="window.mediaStudio.selectCharacter(null)">
        <span>✨ Unique Actor</span>
      </div>
    `;

    this.savedCharacters.forEach(c => {
      const isSelected = this.activeCharacter && this.activeCharacter.id === c.id;
      html += `
        <div class="flow-character-chip ${isSelected ? 'active' : ''}" onclick="window.mediaStudio.selectCharacter('${c.id}')">
          <span>👤 ${this.escapeHtml(c.name)}</span>
        </div>
      `;
    });

    this.charCarousel.innerHTML = html;
  }

  selectCharacter(charId) {
    if (!charId) {
      this.activeCharacter = null;
      if (this.activeCharName) this.activeCharName.textContent = 'No character selected (Generates unique actor)';
    } else {
      this.activeCharacter = this.savedCharacters.find(c => c.id === charId) || null;
      if (this.activeCharacter && this.activeCharName) {
        this.activeCharName.textContent = `Active: ${this.activeCharacter.name}`;
        // Auto-lock consistency when recurring character picked
        this.isConsistencyLocked = true;
        this.updateLockUI();
        if (this.activeCharacter.image_data) {
          this.characterReferenceData = this.activeCharacter.image_data;
          if (this.imgCharRefPreview && this.boxCharRefPreview && this.boxCharRefEmpty) {
            this.imgCharRefPreview.src = this.activeCharacter.image_data;
            this.boxCharRefEmpty.style.display = 'none';
            this.boxCharRefPreview.style.display = 'block';
          }
        }
      }
    }
    this.renderCharacterCarousel();
    if (window.soundFX) window.soundFX.click();
  }

  async saveNewCharacter() {
    const nameInput = document.getElementById('charInputName');
    const faceInput = document.getElementById('charInputFace');
    const hairInput = document.getElementById('charInputHair');
    const clothInput = document.getElementById('charInputClothing');
    const bodyInput = document.getElementById('charInputBody');
    const accInput = document.getElementById('charInputAccessories');
    const voiceSelect = document.getElementById('charSelectVoice');
    const descInput = document.getElementById('charInputDesc');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      if (window.app) window.app.showToast('Please enter a character name');
      return;
    }

    let photoData = '';
    const file = this.charModalPhotoUpload && this.charModalPhotoUpload.files && this.charModalPhotoUpload.files[0];
    if (file) {
      try {
        photoData = await new Promise((res) => {
          const r = new FileReader();
          r.onload = (e) => res(e.target.result);
          r.onerror = () => res('');
          r.readAsDataURL(file);
        });
      } catch (e) {}
    }

    const newChar = {
      id: 'char_' + Date.now(),
      name,
      appearance: faceInput ? faceInput.value.trim() : '',
      hairstyle: hairInput ? hairInput.value.trim() : '',
      clothing: clothInput ? clothInput.value.trim() : '',
      body_proportions: bodyInput ? bodyInput.value.trim() : '',
      accessories: accInput ? accInput.value.trim() : '',
      voice: voiceSelect ? voiceSelect.value : 'female',
      description: descInput ? descInput.value.trim() : '',
      image_data: photoData
    };

    this.savedCharacters.unshift(newChar);
    this._persistCharacters();
    this.selectCharacter(newChar.id);

    if (this.charModal) this.charModal.style.display = 'none';
    if (window.app) window.app.showToast(`Character "${name}" saved to library ✨`);
  }

  // Parse "नाम: संवाद" or "Name: Dialogue" format from prompt and dialogue box
  _parsePromptDialogue(promptText = '', defaultDialogue = '') {
    const rawP = String(promptText || '').trim();
    const rawD = String(defaultDialogue || '').trim();

    const cues = [];
    const promptLines = [];
    const lines = rawP ? rawP.split(/\r?\n/) : [];

    // Regex matches formats like: "रोहन: अरे वाह!", "प्रिया - बहुत अच्छा", "Rohan: Hello"
    const dialogueLineRegex = /^([^:\-–—\n]{1,30})\s*[:\-–—]\s*(.+)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const match = line.match(dialogueLineRegex);
      if (match) {
        const speaker = match[1].trim();
        const text = match[2].trim();
        if (text) {
          cues.push({ speaker, text });
        }
      } else {
        promptLines.push(line);
      }
    }

    // Also parse defaultDialogue if no cues in prompt or if defaultDialogue has explicit cues
    if (cues.length === 0 && rawD) {
      const dLines = rawD.split(/\r?\n/);
      for (const rawDLine of dLines) {
        const dl = rawDLine.trim();
        if (!dl) continue;
        const dMatch = dl.match(dialogueLineRegex);
        if (dMatch) {
          cues.push({ speaker: dMatch[1].trim(), text: dMatch[2].trim() });
        } else {
          cues.push({ speaker: '', text: dl });
        }
      }
    }

    // Build unified full dialogue string
    let fullDialogue = '';
    if (cues.length > 0) {
      fullDialogue = cues.map(c => c.speaker ? `${c.speaker}: ${c.text}` : c.text).join('\n');
    } else if (rawD) {
      fullDialogue = rawD;
    }

    const cleanPrompt = promptLines.join(' ').trim() || (cues.length > 0 ? cues.map(c => c.text).join('. ') : '');

    return { cleanPrompt, cues, fullDialogue };
  }

  // --- 6. REAL PLAYABLE VIDEO SYNTHESIS & RENDERER ---
  async generateVideo() {
    const rawPrompt = this.videoPromptInput ? this.videoPromptInput.value.trim() : '';
    const rawDialogue = this.videoDialogueInput ? this.videoDialogueInput.value.trim() : '';

    // Step 0: Parse "नाम: संवाद" format from prompt and dialogue box
    const { cleanPrompt, cues, fullDialogue } = this._parsePromptDialogue(rawPrompt, rawDialogue);

    // If both prompt and dialogue are completely empty, show clean Hindi message
    if (!cleanPrompt && cues.length === 0 && !fullDialogue) {
      if (window.app) {
        window.app.showToast('कृपया वीडियो के लिए कोई दृश्य (Scene Prompt) या संवाद (Dialogue) दर्ज करें।');
      }
      if (this.videoPromptInput) {
        this.videoPromptInput.focus();
        this.videoPromptInput.style.borderColor = '#ef4444';
        setTimeout(() => {
          if (this.videoPromptInput) this.videoPromptInput.style.borderColor = '';
        }, 2200);
      }
      return;
    }

    // If dialogue lines were found in prompt, auto-sync to dialogue box so user sees them
    if (cues.length > 0 && this.videoDialogueInput && !this.videoDialogueInput.value.trim()) {
      this.videoDialogueInput.value = fullDialogue;
    }

    this.isGeneratingVideo = true;
    if (this.btnGenerateVid) {
      this.btnGenerateVid.disabled = true;
      this.btnGenerateVid.innerHTML = `<span class="btn-icon">⏳</span><span class="btn-text">Rendering Video Clip...</span>`;
    }

    // Ensure preview frame is visible with a nice poster immediately (never a blank/grey box)
    if (this.vidResultsSection) {
      this.vidResultsSection.style.display = 'block';
    }
    if (this.vidPreviewPlayer && !this.vidPreviewPlayer.poster) {
      this.vidPreviewPlayer.poster = '/images/sakura-anime-bg.webp';
    }

    if (this.vidProgressBox) {
      this.vidProgressBox.style.display = 'block';
      this.vidProgressBar.style.width = '10%';
      this.vidProgressPercent.textContent = '10%';
      this.vidProgressText.textContent = 'दृश्य व कैरेक्टर मोशन तैयार किया जा रहा है...';
    }

    if (window.soundFX) window.soundFX.click();

    try {
      const isAudioEnabled = this.chkAudioGeneration ? this.chkAudioGeneration.checked : true;
      const isNoDialogue = this.chkNoDialogue ? this.chkNoDialogue.checked : false;
      const effectiveDialogue = isNoDialogue ? '' : fullDialogue;
      const effectiveCues = isNoDialogue ? [] : cues;

      if (this.vidProgressBar) {
        this.vidProgressBar.style.width = '30%';
        this.vidProgressPercent.textContent = '30%';
        this.vidProgressText.textContent = 'आवाज़, संवाद और ऑडियो मिक्सिंग...';
      }

      if (this.vidProgressBar) {
        this.vidProgressBar.style.width = '50%';
        this.vidProgressPercent.textContent = '50%';
        this.vidProgressText.textContent = '2D एनिमेशन फ्रेम्स व लिप-सिंक रेंडरिंग...';
      }

      const artisticStyle = this.videoArtisticStyleSelect ? this.videoArtisticStyleSelect.value : 'anime';
      const lighting = this.videoLightingSelect ? this.videoLightingSelect.value : 'golden_hour';
      const resolution = this.videoResolutionSelect ? this.videoResolutionSelect.value : '720p';
      let actorCount = this.videoActorCountSelect ? (parseInt(this.videoActorCountSelect.value, 10) || 1) : 1;
      // If 2 different speakers were detected in cues, automatically use 2 actors
      if (effectiveCues.length >= 2 && actorCount === 1) {
        const speakers = new Set(effectiveCues.map(c => c.speaker).filter(Boolean));
        if (speakers.size >= 2) {
          actorCount = 2;
          if (this.videoActorCountSelect) this.videoActorCountSelect.value = '2';
        }
      }
      const sfx = this.videoSfxSelect ? this.videoSfxSelect.value : 'none';

      const promptToUse = cleanPrompt || rawPrompt || (cues.length > 0 ? cues.map(c => c.text).join('. ') : 'Cinematic Animation Scene');

      const videoBlob = await this._renderFlowMotionClip({
        prompt: promptToUse,
        creationStyle: this.creationStyle,
        artisticStyle,
        lighting,
        resolution,
        duration: this.videoDuration,
        aspectRatio: this.videoAspectRatio,
        motionTags: Array.from(this.selectedMotionTags),
        actorCount,
        character: this.activeCharacter,
        characterRef: this.characterReferenceData,
        sceneRef: this.sceneReferenceData,
        dialogue: effectiveDialogue,
        dialogueCues: effectiveCues,
        bgm: this.videoBgmSelect ? this.videoBgmSelect.value : 'sakura',
        sfx,
        onProgress: (pct, msg) => {
          if (this.vidProgressBar) this.vidProgressBar.style.width = `${pct}%`;
          if (this.vidProgressPercent) this.vidProgressPercent.textContent = `${pct}%`;
          if (this.vidProgressText) this.vidProgressText.textContent = msg;
        }
      });

      this.currentVideoBlob = videoBlob;
      if (this.currentVideoUrl) URL.revokeObjectURL(this.currentVideoUrl);
      this.currentVideoUrl = URL.createObjectURL(videoBlob);

      // Step 3: Present Result in Player
      if (this.vidPreviewPlayer) {
        this.vidPreviewPlayer.src = this.currentVideoUrl;
        this.vidPreviewPlayer.load();
      }

      if (this.btnDownloadVid) {
        const ext = (videoBlob && videoBlob.type && videoBlob.type.includes('mp4')) ? 'mp4' : 'webm';
        this.btnDownloadVid.href = this.currentVideoUrl;
        this.btnDownloadVid.download = `flow-video-${this.creationStyle}-${Date.now()}.${ext}`;
        this.btnDownloadVid.innerHTML = `<span>⬇️ Download ${ext.toUpperCase()}</span>`;
      }

      if (this.vidResultMetaBadge) {
        this.vidResultMetaBadge.textContent = `${this.videoDuration}s • ${resolution} • ${this.videoAspectRatio} • ${actorCount} Actor${actorCount > 1 ? 's' : ''} • ${this.creationStyle.toUpperCase()} • ${artisticStyle.toUpperCase()}`;
      }

      if (this.vidResultsSection) {
        this.vidResultsSection.style.display = 'block';
        this.vidResultsSection.scrollIntoView({ behavior: 'smooth' });
      }

      if (window.soundFX) window.soundFX.success();
      if (window.app) window.app.showToast('✨ वीडियो सफलतापूर्वक तैयार हो गया! प्ले और डाउनलोड करें।');
    } catch (err) {
      if (window.app) window.app.showToast('Render error: ' + err.message);
    } finally {
      this.isGeneratingVideo = false;
      if (this.vidProgressBox) this.vidProgressBox.style.display = 'none';
      if (this.btnGenerateVid) {
        this.btnGenerateVid.disabled = false;
        this.btnGenerateVid.innerHTML = `<span class="btn-icon">🎬</span><span class="btn-text">Generate Video</span>`;
      }
    }
  }

  // --- Realtime Canvas & WebAudio Playable Video Synthesis Engine ---
  async _renderFlowMotionClip({ prompt, creationStyle, artisticStyle, lighting, resolution, duration, aspectRatio, motionTags = [], actorCount = 1, character, characterRef, sceneRef, dialogue, dialogueCues = [], bgm, sfx = 'none', onProgress }) {
    const canvas = this.flowRenderCanvas || document.createElement('canvas');
    let width = 1280;
    let height = 720;
    if (resolution === '480p') {
      if (aspectRatio === '4:3') { width = 640; height = 480; }
      else if (aspectRatio === '1:1') { width = 480; height = 480; }
      else if (aspectRatio === '3:4') { width = 480; height = 640; }
      else if (aspectRatio === '9:16') { width = 480; height = 854; }
      else { width = 854; height = 480; }
    } else if (resolution === '1080p') {
      if (aspectRatio === '4:3') { width = 1440; height = 1080; }
      else if (aspectRatio === '1:1') { width = 1080; height = 1080; }
      else if (aspectRatio === '3:4') { width = 1080; height = 1440; }
      else if (aspectRatio === '9:16') { width = 1080; height = 1920; }
      else { width = 1920; height = 1080; }
    } else {
      if (aspectRatio === '4:3') { width = 1024; height = 768; }
      else if (aspectRatio === '1:1') { width = 720; height = 720; }
      else if (aspectRatio === '3:4') { width = 720; height = 960; }
      else if (aspectRatio === '9:16') { width = 720; height = 1280; }
      else { width = 1280; height = 720; }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Preload reference images if present
    let charImg = null;
    let sceneImg = null;

    if (characterRef) {
      charImg = await this._loadImage(characterRef).catch(() => null);
    }
    if (sceneRef) {
      sceneImg = await this._loadImage(sceneRef).catch(() => null);
    }

    // Audio Context Setup for Speech, SFX & Ambient Sound
    let audioCtx = null;
    let audioDest = null;
    let bgmOsc = null;
    const sfxSources = [];
    const vocalNodes = [];

    if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
      try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtor();
        audioDest = audioCtx.createMediaStreamDestination();

        // 1. Ambient Background Harmony (BGM)
        if (bgm && bgm !== 'none') {
          bgmOsc = audioCtx.createOscillator();
          const bgmGain = audioCtx.createGain();
          bgmOsc.type = 'sine';
          let baseFreq = 220;
          if (bgm === 'village_folk') baseFreq = 392; // Indian folk flute tone (G4)
          else if (bgm === 'cinematic') baseFreq = 174.61; // F3
          else if (bgm === 'sakura') baseFreq = 261.63; // C4
          else if (bgm === 'fantasy') baseFreq = 329.63; // E4
          else if (bgm === 'rain' || bgm === 'thunder_rain') baseFreq = 110; // A2 low calm
          bgmOsc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
          bgmGain.gain.setValueAtTime(0.035, audioCtx.currentTime);
          bgmOsc.connect(bgmGain);
          bgmGain.connect(audioDest);
          bgmOsc.start();
        }

        // 2. Sound Effects Engine (Footsteps, Rain & Thunder, Wind, Birds, Magic Sparkle)
        if (sfx && sfx !== 'none') {
          const sampleRate = audioCtx.sampleRate || 44100;
          const sfxGain = audioCtx.createGain();
          sfxGain.connect(audioDest);

          if (sfx === 'footsteps') {
            // Rhythmic Footsteps: 2 footsteps per second loop
            const bufferLen = Math.floor(sampleRate * 1.0);
            const stepBuffer = audioCtx.createBuffer(1, bufferLen, sampleRate);
            const data = stepBuffer.getChannelData(0);
            const stepTimes = [0.05, 0.55];
            for (const st of stepTimes) {
              const startSample = Math.floor(st * sampleRate);
              const stepSamples = Math.floor(sampleRate * 0.08);
              for (let i = 0; i < stepSamples && (startSample + i) < bufferLen; i++) {
                const curT = i / sampleRate;
                const decay = Math.exp(-curT * 55);
                const oscVal = Math.sin(2 * Math.PI * 95 * curT) * 0.7 + (Math.random() * 2 - 1) * 0.3;
                data[startSample + i] += oscVal * decay * 0.45;
              }
            }
            const stepSrc = audioCtx.createBufferSource();
            stepSrc.buffer = stepBuffer;
            stepSrc.loop = true;
            sfxGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            stepSrc.connect(sfxGain);
            stepSrc.start();
            sfxSources.push(stepSrc);
          } else if (sfx === 'thunder') {
            // Rain and Thunder: rain background + periodic thunder rumble
            const rainSec = 4.0;
            const rainLen = Math.floor(sampleRate * rainSec);
            const rainBuf = audioCtx.createBuffer(1, rainLen, sampleRate);
            const rData = rainBuf.getChannelData(0);
            let lastOut = 0.0;
            for (let i = 0; i < rainLen; i++) {
              const white = Math.random() * 2 - 1;
              lastOut = (lastOut * 0.93) + (white * 0.07);
              const curSec = i / sampleRate;
              let thunder = 0;
              if (curSec > 1.2 && curSec < 2.8) {
                const tPhase = (curSec - 1.2) / 1.6;
                const tEnv = Math.sin(tPhase * Math.PI);
                thunder = (Math.sin(2 * Math.PI * 52 * curSec) * 0.6 + (Math.random() * 2 - 1) * 0.4) * tEnv * 0.5;
              }
              rData[i] = lastOut * 0.15 + thunder;
            }
            const rainSrc = audioCtx.createBufferSource();
            rainSrc.buffer = rainBuf;
            rainSrc.loop = true;
            sfxGain.gain.setValueAtTime(0.22, audioCtx.currentTime);
            rainSrc.connect(sfxGain);
            rainSrc.start();
            sfxSources.push(rainSrc);
          } else if (sfx === 'wind') {
            // Wind Chimes & Gentle Breeze
            const windSec = 3.0;
            const windLen = Math.floor(sampleRate * windSec);
            const windBuf = audioCtx.createBuffer(1, windLen, sampleRate);
            const wData = windBuf.getChannelData(0);
            for (let i = 0; i < windLen; i++) {
              const curSec = i / sampleRate;
              const breeze = Math.sin(2 * Math.PI * 0.33 * curSec) * 0.08 * (Math.random() * 2 - 1);
              let chime = 0;
              for (const chTime of [0.6, 1.8]) {
                if (curSec >= chTime && curSec < chTime + 0.9) {
                  const cT = curSec - chTime;
                  chime += (Math.sin(2 * Math.PI * 2637 * cT) * 0.5 + Math.sin(2 * Math.PI * 3136 * cT) * 0.5) * Math.exp(-cT * 4.5) * 0.25;
                }
              }
              wData[i] = breeze + chime;
            }
            const windSrc = audioCtx.createBufferSource();
            windSrc.buffer = windBuf;
            windSrc.loop = true;
            sfxGain.gain.setValueAtTime(0.20, audioCtx.currentTime);
            windSrc.connect(sfxGain);
            windSrc.start();
            sfxSources.push(windSrc);
          } else if (sfx === 'birds') {
            // Birds Chirping: procedural FM chirps
            const birdSec = 2.5;
            const birdLen = Math.floor(sampleRate * birdSec);
            const birdBuf = audioCtx.createBuffer(1, birdLen, sampleRate);
            const bData = birdBuf.getChannelData(0);
            const chirpStarts = [0.3, 0.5, 1.4, 1.6];
            for (const cStart of chirpStarts) {
              const chirpSamples = Math.floor(sampleRate * 0.12);
              const startSample = Math.floor(cStart * sampleRate);
              for (let i = 0; i < chirpSamples && (startSample + i) < birdLen; i++) {
                const cT = i / sampleRate;
                const freq = 2400 + (cT / 0.12) * 1100;
                const env = Math.sin((cT / 0.12) * Math.PI);
                bData[startSample + i] += Math.sin(2 * Math.PI * freq * cT) * env * 0.35;
              }
            }
            const birdSrc = audioCtx.createBufferSource();
            birdSrc.buffer = birdBuf;
            birdSrc.loop = true;
            sfxGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            birdSrc.connect(sfxGain);
            birdSrc.start();
            sfxSources.push(birdSrc);
          } else if (sfx === 'sparkle') {
            // Magic Sparkle: cascading high crystalline arpeggio
            const spkSec = 2.0;
            const spkLen = Math.floor(sampleRate * spkSec);
            const spkBuf = audioCtx.createBuffer(1, spkLen, sampleRate);
            const sData = spkBuf.getChannelData(0);
            const tones = [1046, 1318, 1568, 2093, 2637, 3136];
            for (let idx = 0; idx < tones.length; idx++) {
              const tStart = idx * 0.12;
              const startSample = Math.floor(tStart * sampleRate);
              const toneSamples = Math.floor(sampleRate * 0.4);
              for (let i = 0; i < toneSamples && (startSample + i) < spkLen; i++) {
                const cT = i / sampleRate;
                const toneFreq = tones[idx];
                const env = Math.exp(-cT * 8.0);
                sData[startSample + i] += Math.sin(2 * Math.PI * toneFreq * cT) * env * 0.22;
              }
            }
            const spkSrc = audioCtx.createBufferSource();
            spkSrc.buffer = spkBuf;
            spkSrc.loop = true;
            sfxGain.gain.setValueAtTime(0.20, audioCtx.currentTime);
            spkSrc.connect(sfxGain);
            spkSrc.start();
            sfxSources.push(spkSrc);
          }
        }

        // Calculate structured dialogue cue timings
        const processedCues = [];
        if (dialogueCues && dialogueCues.length > 0) {
          const cueCount = dialogueCues.length;
          const usableStart = Math.min(0.8, duration * 0.08);
          const usableEnd = Math.max(usableStart + 1.0, duration - Math.min(0.8, duration * 0.08));
          const totalUsable = usableEnd - usableStart;
          const slotDuration = totalUsable / cueCount;

          dialogueCues.forEach((cue, idx) => {
            const start = usableStart + (idx * slotDuration);
            const end = Math.min(usableEnd, start + slotDuration - 0.15);
            processedCues.push({
              speaker: cue.speaker || (cueCount > 1 ? (idx === 0 ? 'Character 1' : 'Character 2') : ''),
              text: cue.text,
              startTime: start,
              endTime: end,
              actorIndex: idx % (actorCount >= 2 ? 2 : 1)
            });
          });
        } else if (dialogue && dialogue.trim()) {
          processedCues.push({
            speaker: '',
            text: dialogue.trim(),
            startTime: Math.min(0.8, duration * 0.08),
            endTime: duration - Math.min(0.8, duration * 0.08),
            actorIndex: 0
          });
        }

        // 3. Embedded TTS Spoken Dialogue Formant Vocal Track in WebAudio
        if ((dialogue && dialogue.trim().length > 0) || processedCues.length > 0) {
          let f0 = 220; // default sweet female voice (~A3/A4)
          const voiceGender = this.videoVoiceGenderSelect ? this.videoVoiceGenderSelect.value : 'female';
          const voiceRole = this.videoVoiceRoleSelect ? this.videoVoiceRoleSelect.value : 'character';
          if (voiceGender === 'male') f0 = 130;
          else if (voiceGender === 'child') f0 = 310;
          else if (voiceGender === 'narrator' || voiceRole === 'narrator') f0 = 110;

          const pitchMult = this.videoVoicePitch ? parseFloat(this.videoVoicePitch.value) || 1.2 : 1.2;
          const speedMult = this.videoVoiceSpeed ? parseFloat(this.videoVoiceSpeed.value) || 1.0 : 1.0;
          f0 = Math.max(80, Math.min(500, f0 * (pitchMult / 1.2)));

          const vocalOsc = audioCtx.createOscillator();
          vocalOsc.type = 'sawtooth';
          vocalOsc.frequency.setValueAtTime(f0, audioCtx.currentTime);

          // Dual Formant Bandpass Filters (F1 ~750Hz open vowel, F2 ~1650Hz front vowel)
          const f1Filter = audioCtx.createBiquadFilter();
          f1Filter.type = 'bandpass';
          f1Filter.frequency.setValueAtTime(750, audioCtx.currentTime);
          f1Filter.Q.setValueAtTime(4.0, audioCtx.currentTime);

          const f2Filter = audioCtx.createBiquadFilter();
          f2Filter.type = 'bandpass';
          f2Filter.frequency.setValueAtTime(1650, audioCtx.currentTime);
          f2Filter.Q.setValueAtTime(4.5, audioCtx.currentTime);

          const vocalGain = audioCtx.createGain();
          vocalGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);

          vocalOsc.connect(f1Filter);
          vocalOsc.connect(f2Filter);
          f1Filter.connect(vocalGain);
          f2Filter.connect(vocalGain);
          vocalGain.connect(audioDest);

          // Program rhythmic speech cadence envelope into audio track based on cues
          const syllableDur = Math.max(0.18, 0.24 / speedMult);
          const now = audioCtx.currentTime;

          if (processedCues.length > 0) {
            for (const cue of processedCues) {
              const cueDur = Math.max(0.5, cue.endTime - cue.startTime);
              const cueSyllables = Math.floor(cueDur / syllableDur);
              for (let sIdx = 0; sIdx < cueSyllables; sIdx++) {
                const sTime = now + cue.startTime + (sIdx * syllableDur);
                if (sIdx % 5 === 4) {
                  vocalGain.gain.setValueAtTime(0.0001, sTime);
                } else {
                  const peakGain = 0.16;
                  vocalGain.gain.setValueAtTime(0.0001, sTime);
                  vocalGain.gain.linearRampToValueAtTime(peakGain, sTime + syllableDur * 0.25);
                  vocalGain.gain.linearRampToValueAtTime(peakGain * 0.7, sTime + syllableDur * 0.75);
                  vocalGain.gain.linearRampToValueAtTime(0.0001, sTime + syllableDur * 0.95);
                }
              }
            }
          } else {
            const totalSyllables = Math.floor(duration / syllableDur);
            for (let sIdx = 0; sIdx < totalSyllables; sIdx++) {
              const sTime = now + (sIdx * syllableDur);
              if (sIdx % 5 === 4) {
                vocalGain.gain.setValueAtTime(0.0001, sTime);
              } else {
                const peakGain = 0.16;
                vocalGain.gain.setValueAtTime(0.0001, sTime);
                vocalGain.gain.linearRampToValueAtTime(peakGain, sTime + syllableDur * 0.25);
                vocalGain.gain.linearRampToValueAtTime(peakGain * 0.7, sTime + syllableDur * 0.75);
                vocalGain.gain.linearRampToValueAtTime(0.0001, sTime + syllableDur * 0.95);
              }
            }
          }

          vocalOsc.start();
          vocalNodes.push(vocalOsc, vocalGain);
        }
      } catch (e) {}
    }

    // Capture Canvas Stream
    const fps = 30;
    const canvasStream = canvas.captureStream ? canvas.captureStream(fps) : null;
    let combinedStream = canvasStream;

    if (canvasStream && audioDest && audioDest.stream) {
      const audioTrack = audioDest.stream.getAudioTracks()[0];
      if (audioTrack) {
        combinedStream = new MediaStream([...canvasStream.getVideoTracks(), audioTrack]);
      }
    }

    // Trigger Speech synthesis in background for live speaker preview
    if (dialogue && typeof window.speechSynthesis !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(dialogue);
        utter.lang = (this.videoLanguageSelect && this.videoLanguageSelect.value === 'en') ? 'en-US' : 'hi-IN';
        let rate = this.videoVoiceSpeed ? parseFloat(this.videoVoiceSpeed.value) || 1.0 : 1.0;
        let pitch = this.videoVoicePitch ? parseFloat(this.videoVoicePitch.value) || 1.2 : 1.2;
        if (this.videoVoiceRoleSelect && this.videoVoiceRoleSelect.value === 'narrator') {
          pitch = Math.max(0.85, pitch * 0.85);
          rate = Math.min(1.0, rate * 0.95);
        }
        utter.rate = rate;
        utter.pitch = pitch;
        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }

    // Render loop setup
    const totalFrames = Math.max(30, Math.round(duration * fps));
    const is3D = creationStyle === '3d';
    const isSakura = prompt.toLowerCase().includes('sakura') || bgm === 'sakura';
    const isHeadless = (typeof window === 'undefined') || (typeof MediaRecorder === 'undefined') || Boolean(window._mockTestingEnvironment);
    const targetDurationMs = duration * 1000;
    const frameIntervalMs = targetDurationMs / totalFrames;
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // Particle field
    const particles = [];
    const pCount = isSakura ? 45 : 30;
    for (let i = 0; i < pCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 8 + 4,
        speedX: Math.random() * 2 + 0.5,
        speedY: Math.random() * 2 + 1,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05
      });
    }

    // MediaRecorder setup
    const mimeTypes = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    let selectedMime = 'video/webm';
    for (const m of mimeTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    const recordedChunks = [];
    let recorder = null;
    if (typeof MediaRecorder !== 'undefined' && combinedStream) {
      recorder = new MediaRecorder(combinedStream, { mimeType: selectedMime });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };
      recorder.start();
    }

    // Frame-by-frame synthesis animation
    for (let f = 0; f < totalFrames; f++) {
      if (!this.isGeneratingVideo) break;

      const progress = f / totalFrames;
      const t = progress * duration;

      // Report progress periodically
      if (f % 15 === 0 && onProgress) {
        const pct = Math.floor(50 + progress * 45);
        onProgress(pct, `Synthesizing frames: ${f}/${totalFrames} (${Math.floor(progress * 100)}%)...`);
      }

      // Dynamic Camera Movement & Parallax System
      const cam = this.videoCameraMovement ? this.videoCameraMovement.value : 'zoom_in';
      let zoom = 1.0;
      let panX = 0;
      let panY = 0;
      let rot = 0;

      if (cam === 'ken_burns') {
        zoom = 1.0 + progress * 0.16;
        panX = (progress - 0.5) * 60;
        panY = (progress - 0.5) * 28;
      } else if (cam === 'parallax') {
        panX = (progress - 0.5) * 55;
      } else if (cam === 'zoom_in') {
        zoom = 1.0 + progress * 0.12;
      } else if (cam === 'zoom_out') {
        zoom = 1.14 - progress * 0.12;
      } else if (cam === 'pan_left') {
        panX = progress * 60;
      } else if (cam === 'pan_right') {
        panX = -progress * 60;
      } else if (cam === 'orbit') {
        panX = Math.sin(t * 1.2) * 24;
        rot = Math.sin(t * 1.2) * 0.015;
      }

      // Draw Background
      if (sceneImg) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(zoom, zoom);
        if (rot) ctx.rotate(rot);
        ctx.drawImage(sceneImg, -width / 2 + panX, -height / 2 + panY, width, height);
        ctx.restore();
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        if (lighting === 'golden_hour') {
          grad.addColorStop(0, '#2d1200');
          grad.addColorStop(0.4, '#a44200');
          grad.addColorStop(0.75, '#ffb347');
          grad.addColorStop(1, '#ffd194');
        } else if (lighting === 'cinematic') {
          grad.addColorStop(0, '#050811');
          grad.addColorStop(0.6, '#0f172a');
          grad.addColorStop(1, '#1e293b');
        } else if (lighting === 'soft_daylight') {
          grad.addColorStop(0, '#1e3a8a');
          grad.addColorStop(0.4, '#38bdf8');
          grad.addColorStop(1, '#e0f2fe');
        } else if (lighting === 'neon') {
          grad.addColorStop(0, '#0d0221');
          grad.addColorStop(0.5, '#541388');
          grad.addColorStop(0.85, '#ff007f');
          grad.addColorStop(1, '#00f0ff');
        } else if (lighting === 'twilight' || isSakura) {
          grad.addColorStop(0, is3D ? '#1a103c' : '#2d1b4e');
          grad.addColorStop(0.6, '#5b3266');
          grad.addColorStop(1, '#e8a5c8');
        } else if (is3D) {
          grad.addColorStop(0, '#0c102b');
          grad.addColorStop(0.7, '#1b2254');
          grad.addColorStop(1, '#00f0ff');
        } else {
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(0.7, '#1e293b');
          grad.addColorStop(1, '#475569');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Update & Render Ambient Particles (Sakura petals or sparkles)
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rot += p.rotSpeed;
        if (p.x > width + 20) p.x = -20;
        if (p.y > height + 20) p.y = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = isSakura ? 'rgba(255, 183, 213, 0.75)' : 'rgba(0, 240, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Animated Character(s) Placement & Kinematics with Parallax
      const charPanRatio = (cam === 'parallax') ? 0.35 : 0.0;

      if (charImg) {
        // Single uploaded character reference image
        const scale = (height * 0.72) / charImg.height;
        const cW = charImg.width * scale;
        const cH = charImg.height * scale;
        const charCenterX = width * 0.5 + Math.sin(t * 1.5) * 8 + (panX * charPanRatio);
        const charCenterY = height * 0.52 + Math.cos(t * 2.0) * 4 + (panY * charPanRatio);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 18;
        ctx.drawImage(charImg, charCenterX - cW / 2, charCenterY - cH / 2, cW, cH);
        ctx.restore();
      } else if (actorCount === 2) {
        // 2 Actors in Scene (Left and Right facing each other with dialogue interaction)
        const charScale = height * 0.88;
        const activeCue = (typeof processedCues !== 'undefined') ? processedCues.find(c => t >= c.startTime && t <= c.endTime) : null;
        const isAnyoneSpeaking = Boolean(activeCue);
        const currentSpeakerIndex = activeCue ? activeCue.actorIndex : -1;
        const currentSpeakerText = activeCue ? activeCue.text : '';

        const isActor1Speaking = isAnyoneSpeaking ? (currentSpeakerIndex === 0) : false;
        const isActor2Speaking = isAnyoneSpeaking ? (currentSpeakerIndex === 1) : false;

        // Actor 1 (Left Actor - Royal Violet Kimono, Dark Indigo Hair, facing Right)
        const cx1 = width * 0.30 + Math.sin(t * 1.4) * 6 + (panX * charPanRatio);
        const cy1 = height * 0.52 + Math.cos(t * 1.8) * 4 + (panY * charPanRatio);
        this._drawProceduralCharacter(
          ctx, cx1, cy1, charScale, is3D, t,
          isActor1Speaking ? currentSpeakerText : '',
          character, motionTags,
          1, // facing right
          isActor1Speaking,
          0 // Actor index 0
        );

        // Actor 2 (Right Actor - Emerald Teal Kimono, Warm Auburn Hair, facing Left)
        const cx2 = width * 0.70 - Math.sin(t * 1.4) * 6 + (panX * charPanRatio);
        const cy2 = height * 0.52 + Math.cos(t * 1.8 + 1.0) * 4 + (panY * charPanRatio);
        this._drawProceduralCharacter(
          ctx, cx2, cy2, charScale, is3D, t,
          isActor2Speaking ? currentSpeakerText : '',
          character, motionTags,
          -1, // facing left
          isActor2Speaking,
          1 // Actor index 1
        );
      } else {
        // 1 Actor (Solo Performance - Centered)
        const activeCue = (typeof processedCues !== 'undefined') ? processedCues.find(c => t >= c.startTime && t <= c.endTime) : null;
        const isSpeaking = Boolean(activeCue) || Boolean(dialogue);
        const speakerText = activeCue ? activeCue.text : dialogue;
        const charCenterX = width * 0.5 + Math.sin(t * 1.5) * 8 + (panX * charPanRatio);
        const charCenterY = height * 0.52 + Math.cos(t * 2.0) * 4 + (panY * charPanRatio);
        this._drawProceduralCharacter(
          ctx, charCenterX, charCenterY, height, is3D, t,
          isSpeaking ? speakerText : '',
          character, motionTags,
          1, // facing forward/right
          isSpeaking,
          0
        );
      }

      // Cinematic Opening Fade-in & Closing Fade-out Transitions
      const fadeInFrames = Math.max(1, Math.floor(totalFrames * 0.06));
      if (f < fadeInFrames) {
        const fadeAlpha = 1.0 - (f / fadeInFrames);
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      const fadeOutFrames = Math.max(1, Math.floor(totalFrames * 0.06));
      const fadeOutStart = totalFrames - fadeOutFrames;
      if (f >= fadeOutStart) {
        const fadeAlpha = (f - fadeOutStart) / fadeOutFrames;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // Dialogue Subtitle Overlay with Speaker Name Badging
      const activeCue = (typeof processedCues !== 'undefined') ? processedCues.find(c => t >= c.startTime && t <= c.endTime) : null;
      const subtitleText = activeCue ? activeCue.text : dialogue;
      const speakerName = activeCue ? activeCue.speaker : '';

      if (subtitleText && subtitleText.trim()) {
        ctx.save();
        ctx.fillStyle = 'rgba(10, 6, 20, 0.78)';
        const boxH = speakerName ? 52 : 44;
        const boxY = height - boxH - 24;
        const boxX = width * 0.06;
        const boxW = width * 0.88;
        const radius = 10;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.strokeStyle = (activeCue && activeCue.actorIndex === 1) ? 'rgba(13, 148, 136, 0.75)' : 'rgba(0, 240, 255, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (speakerName) {
          ctx.font = `700 ${Math.max(13, Math.floor(width * 0.018))}px "Noto Sans Devanagari", system-ui, sans-serif`;
          ctx.fillStyle = (activeCue && activeCue.actorIndex === 1) ? '#2dd4bf' : '#38bdf8';
          ctx.fillText(`【${speakerName}】`, width / 2, boxY + 16);

          ctx.font = `600 ${Math.max(15, Math.floor(width * 0.022))}px "Noto Sans Devanagari", system-ui, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(subtitleText, width / 2, boxY + 36);
        } else {
          ctx.font = `600 ${Math.max(15, Math.floor(width * 0.023))}px "Noto Sans Devanagari", system-ui, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(subtitleText, width / 2, boxY + boxH / 2);
        }
        ctx.restore();
      }

      // Realtime frame pacing so MediaRecorder captures exact duration (8s, 10s, 15s, 30s)
      if (!isHeadless) {
        const nextTargetTime = startTime + ((f + 1) * frameIntervalMs);
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const sleepMs = nextTargetTime - now;
        if (sleepMs > 0) {
          await new Promise(r => setTimeout(r, sleepMs));
        } else {
          await new Promise(r => setTimeout(r, 0));
        }
      } else {
        await new Promise(r => setTimeout(r, 1));
      }
    }

    // Ensure recorder captures full duration before stopping
    if (!isHeadless) {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = now - startTime;
      if (elapsed < targetDurationMs) {
        await new Promise(r => setTimeout(r, targetDurationMs - elapsed));
      }
    }

    if (recorder) {
      recorder.stop();
      await new Promise(r => { recorder.onstop = r; });
    }

    if (bgmOsc) {
      try { bgmOsc.stop(); } catch (e) {}
    }
    for (const src of sfxSources) {
      try { src.stop(); } catch (e) {}
    }
    for (const node of vocalNodes) {
      try { if (node.stop) node.stop(); } catch (e) {}
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
    }

    return new Blob(recordedChunks, { type: selectedMime });
  }

  // Draw procedural character with animated eyes, head tilt, gestures, breathing, accessories, and real-time lip sync
  _drawProceduralCharacter(ctx, cx, cy, canvasH, is3D, t, dialogue, character, motionTags = [], facingDir = 1, isSpeaking = true, actorIndex = 0) {
    ctx.save();
    const headRadius = canvasH * 0.12;
    const bodyWidth = headRadius * 1.8;

    // Kinematics & Physics calculation (running, jumping, walking)
    const isRunning = motionTags.includes('running');
    const isJumping = motionTags.includes('jumping');
    const isWalking = motionTags.includes('walking') || (!isRunning && !isJumping);

    let strideBob = 0;
    let forwardLean = 0;
    if (isRunning) {
      strideBob = Math.abs(Math.sin(t * 11.0)) * 14;
      forwardLean = 0.12 * facingDir;
    } else if (isWalking) {
      strideBob = Math.abs(Math.sin(t * 5.0)) * 5;
      forwardLean = 0.02 * facingDir;
    }

    let jumpY = 0;
    let armJumpAngle = 0;
    if (isJumping) {
      const jumpPeriod = 2.2;
      const jumpPhase = (t % jumpPeriod) / jumpPeriod;
      if (jumpPhase < 0.55) {
        const jumpNorm = jumpPhase / 0.55;
        jumpY = -Math.sin(jumpNorm * Math.PI) * (canvasH * 0.13);
        armJumpAngle = -48 * Math.sin(jumpNorm * Math.PI);
      }
    }

    const totalY = cy - strideBob + jumpY;

    // Apply root position and lean angle
    ctx.translate(cx, totalY);
    if (forwardLean) ctx.rotate(forwardLean);

    // Dynamic Head Tilt & Nod
    const headTilt = facingDir * (Math.sin(t * 1.6) * 0.035);
    const nodOffset = isSpeaking ? Math.cos(t * 4.0) * 3 : Math.cos(t * 2.0) * 1.5;

    // Dynamic Arm Kinematics with Running, Jumping & Speaking Gestures
    let leftArmSwing = 0;
    let rightArmSwing = 0;

    if (isRunning) {
      leftArmSwing = Math.sin(t * 11.0) * 36;
      rightArmSwing = -Math.sin(t * 11.0) * 36;
    } else if (isJumping && Math.abs(jumpY) > 8) {
      leftArmSwing = armJumpAngle;
      rightArmSwing = armJumpAngle;
    } else {
      leftArmSwing = Math.sin(t * 5.0) * 16;
      rightArmSwing = isSpeaking && dialogue ? (facingDir * (20 + Math.sin(t * 7.5) * 18)) : -Math.sin(t * 5.0) * 16;
    }

    // Sleeve and Robe Palettes based on Actor Index
    const robeBaseColor = (actorIndex === 1) ? (is3D ? '#0d9488' : '#059669') : (is3D ? '#6d28d9' : '#9333ea');
    const robeMainGrad = (actorIndex === 1) ? ['#0d9488', '#0f766e', '#134e4a'] : ['#7c3aed', '#5b21b6', '#3b0764'];
    const obiColor = (actorIndex === 1) ? (is3D ? '#f43f5e' : '#fb7185') : (is3D ? '#f59e0b' : '#fbbf24');
    const obiAccent = (actorIndex === 1) ? '#be123c' : '#b45309';
    const hairGradColors = (actorIndex === 1) ? ['#7c2d12', '#5c2c16', '#2b1006'] : ['#312e81', '#1e1b4b', '#0f0b29'];
    const hairPlainColor = (actorIndex === 1) ? '#5c2c16' : '#312e81';

    // Left Arm (Sleeve & Hand)
    ctx.save();
    ctx.translate(-bodyWidth * 0.38, headRadius * 1.1);
    ctx.rotate((leftArmSwing * Math.PI) / 180);
    ctx.fillStyle = robeBaseColor;
    ctx.beginPath();
    ctx.ellipse(0, headRadius * 0.65, headRadius * 0.22, headRadius * 0.6, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Left Hand
    ctx.fillStyle = is3D ? '#fed7aa' : '#ffedd5';
    ctx.beginPath();
    ctx.arc(headRadius * 0.05, headRadius * 1.25, headRadius * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Arm (Sleeve & Hand)
    ctx.save();
    ctx.translate(bodyWidth * 0.38, headRadius * 1.1);
    ctx.rotate((rightArmSwing * Math.PI) / 180);
    ctx.fillStyle = robeBaseColor;
    ctx.beginPath();
    ctx.ellipse(0, headRadius * 0.65, headRadius * 0.22, headRadius * 0.6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Right Hand
    ctx.fillStyle = is3D ? '#fed7aa' : '#ffedd5';
    ctx.beginPath();
    ctx.arc(-headRadius * 0.05, headRadius * 1.25, headRadius * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body / Kimono Robe
    if (is3D) {
      const robeGrad = ctx.createLinearGradient(-bodyWidth / 2, 0, bodyWidth / 2, headRadius * 3);
      robeGrad.addColorStop(0, robeMainGrad[0]);
      robeGrad.addColorStop(0.5, robeMainGrad[1]);
      robeGrad.addColorStop(1, robeMainGrad[2]);
      ctx.fillStyle = robeGrad;
    } else {
      ctx.fillStyle = (actorIndex === 1) ? '#059669' : '#a855f7';
    }
    ctx.beginPath();
    ctx.moveTo(-bodyWidth / 2, headRadius * 2.8);
    ctx.lineTo(-bodyWidth * 0.4, headRadius * 0.8);
    ctx.lineTo(bodyWidth * 0.4, headRadius * 0.8);
    ctx.lineTo(bodyWidth / 2, headRadius * 2.8);
    ctx.closePath();
    ctx.fill();

    // Waist Obi Sash Accessory
    const obiY = headRadius * 1.6;
    const obiH = headRadius * 0.42;
    ctx.fillStyle = obiColor;
    ctx.fillRect(-bodyWidth * 0.36, obiY, bodyWidth * 0.72, obiH);
    ctx.fillStyle = obiAccent;
    ctx.fillRect(-bodyWidth * 0.36, obiY + obiH * 0.4, bodyWidth * 0.72, obiH * 0.2);

    // Head & Face with Tilt & Facing Direction
    ctx.save();
    ctx.translate(0, nodOffset);
    ctx.rotate(headTilt);

    // Face Skin
    if (is3D) {
      const skinGrad = ctx.createRadialGradient(-headRadius * 0.2 * facingDir, -headRadius * 0.2, headRadius * 0.1, 0, 0, headRadius);
      skinGrad.addColorStop(0, '#fff7ed');
      skinGrad.addColorStop(0.7, '#fed7aa');
      skinGrad.addColorStop(1, '#fba779');
      ctx.fillStyle = skinGrad;
    } else {
      ctx.fillStyle = '#ffedd5';
    }
    ctx.beginPath();
    ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    if (is3D) {
      const hairGrad = ctx.createRadialGradient(0, -headRadius * 0.5, headRadius * 0.2, 0, 0, headRadius * 1.2);
      hairGrad.addColorStop(0, hairGradColors[0]);
      hairGrad.addColorStop(0.7, hairGradColors[1]);
      hairGrad.addColorStop(1, hairGradColors[2]);
      ctx.fillStyle = hairGrad;
    } else {
      ctx.fillStyle = hairPlainColor;
    }
    ctx.beginPath();
    ctx.arc(0, -headRadius * 0.15, headRadius * 1.08, Math.PI, Math.PI * 2);
    ctx.lineTo(headRadius * 1.18, headRadius * 1.85);
    ctx.lineTo(headRadius * 0.75, headRadius * 0.9);
    ctx.lineTo(-headRadius * 0.75, headRadius * 0.9);
    ctx.lineTo(-headRadius * 1.18, headRadius * 1.85);
    ctx.closePath();
    ctx.fill();

    // Hair Accessory
    if (actorIndex === 1) {
      // Golden Star Pin on Left/Right Hair
      const pinX = headRadius * 0.70 * facingDir;
      const pinY = -headRadius * 0.55;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(pinX, pinY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(pinX, pinY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sakura Flower Pin on Right Hair
      const pinX = headRadius * 0.72;
      const pinY = -headRadius * 0.55;
      ctx.fillStyle = '#f472b6';
      for (let pIdx = 0; pIdx < 5; pIdx++) {
        const pAngle = (pIdx * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.ellipse(pinX + Math.cos(pAngle) * 7, pinY + Math.sin(pAngle) * 7, 5, 3, pAngle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(pinX, pinY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes with Blinking & Shading
    const isBlinking = (Math.sin(t * 3.5 + actorIndex) > 0.92);
    const eyeSpacing = headRadius * 0.38;
    const eyeY = -headRadius * 0.05;

    ctx.fillStyle = '#0f172a';
    if (isBlinking) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-eyeSpacing - 10, eyeY);
      ctx.lineTo(-eyeSpacing + 10, eyeY);
      ctx.moveTo(eyeSpacing - 10, eyeY);
      ctx.lineTo(eyeSpacing + 10, eyeY);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing, eyeY, 8, 11, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeSpacing, eyeY, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye Iris color
      ctx.fillStyle = (actorIndex === 1) ? '#10b981' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(-eyeSpacing + (facingDir * 1), eyeY + 2, 5, 0, Math.PI * 2);
      ctx.arc(eyeSpacing + (facingDir * 1), eyeY + 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // Eye Highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing - 2, eyeY - 3, 3, 0, Math.PI * 2);
      ctx.arc(eyeSpacing - 2, eyeY - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blush Cheeks
    ctx.fillStyle = 'rgba(255, 112, 166, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing * 1.1, headRadius * 0.18, 10, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeSpacing * 1.1, headRadius * 0.18, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Natural Lip Sync Mouth Animation
    const mouthY = headRadius * 0.38;
    let mouthOpen = 2; // resting gentle smile
    if (isSpeaking && dialogue) {
      mouthOpen = 3 + Math.abs(Math.sin(t * 12)) * 7;
    }

    ctx.fillStyle = '#be123c';
    ctx.beginPath();
    ctx.ellipse(0, mouthY, 6, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Volumetric Specular Cheek & Forehead Highlight
    if (is3D) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(-headRadius * 0.25 * facingDir, -headRadius * 0.35, headRadius * 0.28, headRadius * 0.14, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // restore head tilt
    ctx.restore(); // restore character root
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  saveVideoToGallery() {
    if (!this.currentVideoBlob) {
      if (window.app) window.app.showToast('No generated video available');
      return;
    }
    const ext = (this.currentVideoBlob && this.currentVideoBlob.type && this.currentVideoBlob.type.includes('mp4')) ? 'mp4' : 'webm';
    const a = document.createElement('a');
    a.href = this.currentVideoUrl;
    a.download = `flow-video-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.app) window.app.showToast('Video saved to Gallery / Downloads 🎬');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global initialization
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.mediaStudio = new MediaStudioController();
  });
}
