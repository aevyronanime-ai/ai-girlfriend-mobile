// Comprehensive Automated Test Suite for Google Flow AI Media Studio
// Tests Image Studio, Video Studio (2D/3D), Character Consistency, Hindi Voice/Dialogue & Playable Synthesis
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');

const PUBLIC_DIR = path.join(__dirname, 'public');
const htmlContent = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} - ${detail}`);
    failed++;
  }
}

async function request(p, options = {}) {
  const url = `${BASE_URL}${p}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : null;

  const res = await fetch(url, { method, headers, body });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function runStudioTests() {
  console.log('================================================================');
  console.log('🎨 TESTING GOOGLE FLOW-STYLE AI MEDIA STUDIO & VIDEO ENGINE');
  console.log('================================================================\n');

  // ---------------------------------------------------------
  // SECTION 1: Syntax & Code Integrity
  // ---------------------------------------------------------
  console.log('--- 1. Syntax & File Integrity ---');
  const mediaStudioJsPath = path.join(PUBLIC_DIR, 'js', 'media-studio.js');
  assert(fs.existsSync(mediaStudioJsPath), 'media-studio.js exists');

  const mediaStudioCode = fs.readFileSync(mediaStudioJsPath, 'utf-8');
  try {
    new vm.Script(mediaStudioCode);
    assert(true, 'media-studio.js compiles cleanly with no syntax errors');
  } catch (err) {
    assert(false, 'media-studio.js syntax compilation', err.message);
  }

  // ---------------------------------------------------------
  // SECTION 2: HTML UI Structure (Google Flow Design)
  // ---------------------------------------------------------
  console.log('\n--- 2. Google Flow UI Architecture & Element Checks ---');

  // Verify Tab & Mode Switches
  assert(htmlContent.includes('id="tab-image"'), '#tab-image exists in HTML');
  assert(htmlContent.includes('id="subtabBtnImage"'), '#subtabBtnImage mode button exists');
  assert(htmlContent.includes('id="subtabBtnVideo"'), '#subtabBtnVideo mode button exists');
  assert(htmlContent.includes('id="mediaPaneImage"'), '#mediaPaneImage container exists');
  assert(htmlContent.includes('id="mediaPaneVideo"'), '#mediaPaneVideo container exists');

  // Verify Image Studio Elements
  const imageElements = [
    'imagePromptInput',
    'btnEnhancePrompt',
    'btnClearImagePrompt',
    'btnToggleImageNegativePrompt',
    'imageNegativePromptContainer',
    'imageNegativePromptInput',
    'imageStyleSelect',
    'imageRatioSelect',
    'imageQuantitySelect',
    'imageQualitySelect',
    'imageModelSelect',
    'btnGenerateImage',
    'imageGenerationProgress',
    'imageProgressBar',
    'imageProgressText',
    'imageProgressPercent',
    'imageResultBox',
    'imageLightboxModal',
    'lightboxImage',
    'btnCloseLightbox',
    'btnLightboxDownload',
    'btnLightboxCopy'
  ];
  for (const id of imageElements) {
    assert(htmlContent.includes(`id="${id}"`), `Image Studio element #${id} present in HTML`);
  }

  // Verify Image 9 Artistic Styles
  const requiredImageStyles = [
    '2d-anime',
    'hand-drawn-anime',
    'ghibli',
    '2d-cartoon',
    '3d-pixar',
    '3d-cartoon',
    'realistic-3d',
    'cinematic',
    'watercolor'
  ];
  for (const style of requiredImageStyles) {
    assert(
      htmlContent.includes(`value="${style}"`),
      `Artistic Style option [value="${style}"] present in HTML`
    );
  }

  // Verify Video Studio Elements
  const videoElements = [
    'btnStyle2D',
    'btnStyle3D',
    'videoPromptInput',
    'btnEnhanceVideoPrompt',
    'btnToggleNegativePrompt',
    'videoNegativePromptContainer',
    'videoNegativePromptInput',
    'btnOpenCreateCharacterModal',
    'flowCharacterCarousel',
    'flowActiveCharName',
    'btnToggleConsistencyLock',
    'flowLockIcon',
    'flowLockText',
    'videoCharRefUpload',
    'tileCharRef',
    'imgCharRefPreview',
    'btnRemoveCharRef',
    'videoSceneRefUpload',
    'tileSceneRef',
    'imgSceneRefPreview',
    'btnRemoveSceneRef',
    'btnDuration10',
    'btnDuration15',
    'btnDuration30',
    'btnRatio169',
    'btnRatio43',
    'btnRatio11',
    'btnRatio34',
    'btnRatio916',
    'flowMotionTagsGrid',
    'videoQualitySelect',
    'videoMotionStrengthSelect',
    'videoCameraMovementSelect',
    'videoFpsSelect',
    'videoResolutionSelect',
    'videoModelSelect',
    'btnOpenColabInfo',
    'colabInfoModal',
    'btnCloseColabModal',
    'btnCloseColabBtn',
    'chkAudioGeneration',
    'cardDialogueVoice',
    'chkNoDialogue',
    'dialogueInputArea',
    'videoDialogueInput',
    'videoLanguageSelect',
    'videoVoiceRoleSelect',
    'videoVoiceGenderSelect',
    'videoEmotionSelect',
    'videoBgmSelect',
    'videoSfxSelect',
    'videoVoiceSpeed',
    'videoVoicePitch',
    'lblVoiceSpeed',
    'lblVoicePitch',
    'btnGenerateVideo',
    'videoGenerationProgress',
    'videoProgressBar',
    'videoProgressText',
    'videoProgressPercent',
    'btnCancelVideoGeneration',
    'videoResultsSection',
    'videoResultMetaBadge',
    'flowRenderCanvas',
    'videoPreviewPlayer',
    'btnDownloadVideo',
    'btnRegenerateVideo',
    'btnNewClip',
    'btnSaveToGallery'
  ];
  for (const id of videoElements) {
    assert(htmlContent.includes(`id="${id}"`), `Video Studio element #${id} present in HTML`);
  }

  // Verify Short Video Durations (10s, 15s, 30s only)
  assert(htmlContent.includes('data-duration="10"'), 'Duration button 10s exists');
  assert(htmlContent.includes('data-duration="15"'), 'Duration button 15s exists');
  assert(htmlContent.includes('data-duration="30"'), 'Duration button 30s exists');
  assert(!htmlContent.includes('data-duration="60"') && !htmlContent.includes('data-duration="120"'), 'No long video options present (strictly <= 30s)');

  // Verify Aspect Ratios for Image and Video
  const aspectRatios = ['16:9', '4:3', '1:1', '3:4', '9:16'];
  for (const ar of aspectRatios) {
    assert(htmlContent.includes(`data-ratio="${ar}"`), `Aspect ratio ${ar} available in UI`);
  }

  // Verify Character Consistency Modal Elements
  const charModalElements = [
    'characterCreationModal',
    'charInputName',
    'charInputFace',
    'charInputHair',
    'charInputClothing',
    'charInputBody',
    'charSelectVoice',
    'charInputDesc',
    'charModalPhotoUpload',
    'btnCharModalUploadPhoto',
    'charModalPhotoName',
    'btnCancelCharModal',
    'btnSaveCharacter',
    'btnCloseCharModal'
  ];
  for (const id of charModalElements) {
    assert(htmlContent.includes(`id="${id}"`), `Character modal element #${id} present in HTML`);
  }

  // ---------------------------------------------------------
  // SECTION 3: Archive Verification
  // ---------------------------------------------------------
  console.log('\n--- 3. Archive Verification (Old Studio Files Safely Preserved) ---');
  const archiveDir = path.join(__dirname, 'archive', 'old-video-studio');
  assert(fs.existsSync(archiveDir), 'Archive directory archive/old-video-studio exists');
  assert(fs.existsSync(path.join(archiveDir, 'video-studio.js')), 'Archived video-studio.js safely preserved');
  assert(fs.existsSync(path.join(archiveDir, 'studio-engine.js')), 'Archived studio-engine.js safely preserved');
  assert(fs.existsSync(path.join(archiveDir, 'test-video-studio.js')), 'Archived test-video-studio.js safely preserved');
  assert(fs.existsSync(path.join(archiveDir, 'README.md')), 'Archived README.md documentation exists');

  // Ensure old files are not present in active public/js/
  assert(!fs.existsSync(path.join(PUBLIC_DIR, 'js', 'video-studio.js')), 'Obsolete video-studio.js removed from public/js/');
  assert(!fs.existsSync(path.join(PUBLIC_DIR, 'js', 'studio-engine.js')), 'Obsolete studio-engine.js removed from public/js/');

  // ---------------------------------------------------------
  // SECTION 4: Backend API Endpoints (Image, Video, Characters)
  // ---------------------------------------------------------
  console.log('\n--- 4. Backend API Endpoints & Synthesis Testing ---');

  let serverProcess = null;
  try {
    const ping = await fetch(`${BASE_URL}/api/status`);
    if (ping.status === 200) {
      console.log('📡 Connected to active J.A.R.V.I.S. test server\n');
    }
  } catch (e) {
    console.log('🚀 Spawning backend server on port 3000 for integration tests...');
    const { fork } = require('node:child_process');
    serverProcess = fork(path.join(__dirname, 'server.js'), [], { silent: true });
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const ping = await fetch(`${BASE_URL}/api/status`);
        if (ping.status === 200) {
          console.log('✓ Backend test server ready!\n');
          break;
        }
      } catch (err) {}
    }
  }

  try {
    // 4.1 Test Media Characters CRUD
    const charPayload = {
      name: 'Aarya Sharma',
      appearance: 'Slender anime girl with glowing hazel eyes',
      hairstyle: 'Long twin-tails with sakura ribbons',
      clothing: 'Traditional pastel pink and white kimono',
      body_proportions: 'Athletic, 5ft 4in',
      voice: 'female-soft',
      description: 'Recurring AI companion character'
    };

    const saveCharRes = await request('/api/media-characters', {
      method: 'POST',
      body: charPayload
    });
    assert(saveCharRes.status === 200 && saveCharRes.data.success, 'POST /api/media-characters creates character');
    const createdCharId = saveCharRes.data.id;
    assert(Boolean(createdCharId), `Character ID returned: ${createdCharId}`);

    const getCharsRes = await request('/api/media-characters');
    assert(getCharsRes.status === 200 && Array.isArray(getCharsRes.data.characters), 'GET /api/media-characters returns character array');
    const foundChar = getCharsRes.data.characters.find(c => c.id === createdCharId);
    assert(foundChar && foundChar.name === 'Aarya Sharma', 'Retrieved character matches saved data');

    // 4.2 Test Image Generation API with multiple quantities and styles
    const imgGenRes = await request('/api/generate-image', {
      method: 'POST',
      body: {
        prompt: 'Beautiful futuristic city garden under starlight',
        style: '3d-pixar',
        aspectRatio: '16:9',
        quantity: 2,
        model: 'flux-schnell'
      }
    });
    assert(imgGenRes.status === 200 && imgGenRes.data.success, 'POST /api/generate-image returns success');
    assert(Array.isArray(imgGenRes.data.images) && imgGenRes.data.images.length === 2, 'Returns requested quantity of images (2)');
    assert(imgGenRes.data.images[0].url && imgGenRes.data.images[0].url.startsWith('http'), 'Generated image URL is valid');

    // 4.3 Test Video Generation API
    const videoJobRes = await request('/api/generate-video', {
      method: 'POST',
      body: {
        prompt: 'Anime girl smiling gracefully near a blooming cherry blossom tree',
        creationStyle: '2d',
        duration: 10,
        aspectRatio: '16:9',
        fps: 30,
        resolution: '720p',
        dialogue: 'नमस्ते! आज का दिन बहुत सुंदर है।',
        language: 'hi',
        voiceGender: 'female'
      }
    });
    assert(videoJobRes.status === 200 && videoJobRes.data.success, 'POST /api/generate-video initializes video job');
    assert(Boolean(videoJobRes.data.jobId) && Boolean(videoJobRes.data.videoSpec), 'Job ID and video metadata generated');

    // 4.4 Cleanup created character
    const delCharRes = await request(`/api/media-characters?id=${createdCharId}`, {
      method: 'DELETE'
    });
    assert(delCharRes.status === 200 && delCharRes.data.success, 'DELETE /api/media-characters deletes character');
  } catch (err) {
    assert(false, 'Backend API integration test', err.message);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  // ---------------------------------------------------------
  // SECTION 5: FlowMotion Canvas & Real Synthesis Logic
  // ---------------------------------------------------------
  console.log('\n--- 5. FlowMotion Real Video Synthesis Logic Verification ---');
  assert(mediaStudioCode.includes('class MediaStudioController'), 'MediaStudioController class declared');
  assert(mediaStudioCode.includes('_renderFlowMotionClip'), '_renderFlowMotionClip method present for playable rendering');
  assert(mediaStudioCode.includes('MediaRecorder'), 'MediaRecorder utilized for standard video encoding');
  assert(mediaStudioCode.includes('AudioContext') || mediaStudioCode.includes('webkitAudioContext'), 'WebAudio API used for sound synthesis');
  assert(mediaStudioCode.includes('_drawProceduralCharacter'), '_drawProceduralCharacter 2D/3D renderer implemented');
  assert(mediaStudioCode.includes('mouthOpen'), 'Dynamic lip-sync mouth opening animation present');

  console.log('\n================================================================');
  console.log(`📊 AI MEDIA STUDIO TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runStudioTests();
