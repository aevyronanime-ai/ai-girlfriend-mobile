// Unit & Integration Tests for Video Studio & 2D Animation Studio
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('====================================================');
console.log('🧪 TESTING VIDEO & 2D ANIMATION STUDIO FUNCTIONALITY');
console.log('====================================================\n');

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

const PUBLIC_DIR = path.join(__dirname, 'public');
const videoStudioCode = fs.readFileSync(path.join(PUBLIC_DIR, 'js', 'video-studio.js'), 'utf-8');
const storyParserCode = fs.readFileSync(path.join(PUBLIC_DIR, 'story', 'js', 'parser.js'), 'utf-8');

(async () => {
  // =========================================================================
  // 1. STORY MAKER PARSER TESTS
  // =========================================================================
  const parserSandbox = { console };
  vm.createContext(parserSandbox);
  vm.runInContext(storyParserCode, parserSandbox);

  const parseFn = parserSandbox.parse;
  assert(typeof parseFn === 'function', 'Story Maker parser.js exports parse function');

  const sampleScript = `TITLE: कुएँ वाली रात
CHAR: Ravi | boy
CHAR: Meena | girl
CHAR: Dadi | elder
[village night]
Narrator: बहुत पुरानी बात है, गाँव में रात उतर रही थी।
Ravi: (scared) मीना, तुमने वो आवाज़ सुनी?
Meena: (happy) डरो मत रवि!
[well night fog]
Narrator: दोनों बच्चे कुएँ के पास पहुँचे।`;

  const parsedLines = parseFn(sampleScript);
  assert(Array.isArray(parsedLines) && parsedLines.length === 5, 'Story Maker parser parsed all 5 output story lines');
  assert(parsedLines[0].scene === 'title' && parsedLines[0].title === 'कुएँ वाली रात', 'Story Maker parsed TITLE line correctly');
  assert(parsedLines[1].scene === 'village night' && parsedLines[1].who === 'Narrator', 'Story Maker parsed scene block and narrator');
  assert(parsedLines[2].who === 'Ravi' && parsedLines[2].emo === 'scared', 'Story Maker parsed character dialogue and emotion (scared)');
  assert(parsedLines[3].who === 'Meena' && parsedLines[3].emo === 'happy', 'Story Maker parsed character dialogue and emotion (happy)');
  assert(parsedLines[2].cast && parsedLines[2].cast.some(c => c.name === 'Ravi' && c.kind === 'boy'), 'Story Maker mapped character cast palette');
  assert(parsedLines[4].scene === 'well night fog', 'Story Maker parsed secondary scene tag [well night fog]');

  // =========================================================================
  // 2. VIDEO STUDIO CONTROLLER & DOM ENVIRONMENT
  // =========================================================================
  const mockLocalStorage = {};
  const mockListeners = {};

  const createMockElement = (tag, extra = {}) => {
    return {
      tagName: tag.toUpperCase(),
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: function(cls, force) {
          if (force !== undefined) {
            this[cls] = force;
          } else {
            this[cls] = !this[cls];
          }
        }
      },
      addEventListener: (evt, fn) => {
        if (!mockListeners[extra.id || tag]) mockListeners[extra.id || tag] = {};
        mockListeners[extra.id || tag][evt] = fn;
      },
      ...extra
    };
  };

  const mockElements = {
    // Navigation Sub-tabs
    subtabBtnImage: createMockElement('button', { id: 'subtabBtnImage' }),
    subtabBtnVideo: createMockElement('button', { id: 'subtabBtnVideo' }),
    mediaPaneImage: createMockElement('div', { id: 'mediaPaneImage' }),
    mediaPaneVideo: createMockElement('div', { id: 'mediaPaneVideo' }),

    // Engine Mode & Description
    engine: createMockElement('select', { id: 'engine', value: 'story' }),
    engineDescription: createMockElement('div', { id: 'engineDescription', textContent: '' }),

    // Sub-panels
    panelStoryMaker: createMockElement('div', { id: 'panelStoryMaker' }),
    storyMakerFrame: createMockElement('iframe', {
      id: 'storyMakerFrame',
      contentWindow: {
        localStorage: {
          setItem: (k, v) => { mockLocalStorage[k] = v; }
        }
      },
      contentDocument: {
        getElementById: () => ({ value: '' })
      }
    }),
    panelQuickAnimator: createMockElement('div', { id: 'panelQuickAnimator' }),
    panelPhotoToVideo: createMockElement('div', { id: 'panelPhotoToVideo' }),
    aiOpts: createMockElement('div', { id: 'aiOpts' }),

    // Quick 2D Animator Elements
    prompt: createMockElement('textarea', { id: 'prompt', value: 'साकुरा के पेड़ों के नीचे लंबे बालों वाली लड़की' }),
    localOpts: createMockElement('div', { id: 'localOpts' }),
    dur: createMockElement('select', { id: 'dur', value: '6' }),
    ratio: createMockElement('select', { id: 'ratio', value: 'p' }),
    caption: createMockElement('input', { id: 'caption', value: 'नमस्ते भारत' }),
    go: createMockElement('button', { id: 'go', disabled: false }),
    log: createMockElement('div', { id: 'log', textContent: '' }),
    stage: createMockElement('div', { id: 'stage' }),
    cv: createMockElement('canvas', {
      id: 'cv',
      width: 540,
      height: 960,
      getContext: () => ({
        createLinearGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        bezierCurveTo: () => {},
        closePath: () => {},
        fill: () => {},
        stroke: () => {},
        arc: () => {},
        ellipse: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        fillText: () => {}
      })
    }),
    out: createMockElement('video', {
      id: 'out',
      pause: () => {},
      play: async () => {},
      playbackRate: 1.0
    }),
    dl: createMockElement('a', { id: 'dl', href: '', download: '' }),
    videoEditorControls: createMockElement('div', { id: 'videoEditorControls' }),
    videoSpeedSelect: createMockElement('select', { id: 'videoSpeedSelect', value: '1.5' }),
    videoFilterSelect: createMockElement('select', { id: 'videoFilterSelect', value: 'sakura' }),

    // Photo to Video Elements
    p2vFileInput: createMockElement('input', { id: 'p2vFileInput', type: 'file' }),
    btnP2VPickPhotos: createMockElement('button', { id: 'btnP2VPickPhotos' }),
    p2vPhotoCountText: createMockElement('div', { id: 'p2vPhotoCountText', textContent: '0 photos selected' }),
    p2vThumbnailsContainer: createMockElement('div', { id: 'p2vThumbnailsContainer', innerHTML: '' }),
    p2vDurationSelect: createMockElement('select', { id: 'p2vDurationSelect', value: '3' }),
    p2vMotionSelect: createMockElement('select', { id: 'p2vMotionSelect', value: 'kenburns' }),
    p2vCaptionInput: createMockElement('input', { id: 'p2vCaptionInput', value: 'Memories' }),
    btnP2VGenerate: createMockElement('button', { id: 'btnP2VGenerate', disabled: false }),
    p2vLog: createMockElement('div', { id: 'p2vLog', textContent: '' }),
    p2vStage: createMockElement('div', { id: 'p2vStage' }),
    p2vCanvas: createMockElement('canvas', { id: 'p2vCanvas' }),
    p2vVideo: createMockElement('video', { id: 'p2vVideo', play: async () => {} }),
    p2vDownload: createMockElement('a', { id: 'p2vDownload', href: '', download: '' }),

    // AI Video Elements
    aiPrompt: createMockElement('textarea', { id: 'aiPrompt', value: 'A futuristic anime city' }),
    token: createMockElement('input', { id: 'token', value: 'hf_test_123' }),
    mid: createMockElement('select', { id: 'mid', value: '' }),
    fb: createMockElement('input', { id: 'fb', checked: true }),
    btnAIVideo: createMockElement('button', { id: 'btnAIVideo', disabled: false }),
    aiLog: createMockElement('div', { id: 'aiLog', textContent: '' })
  };

  const sandbox = {
    console,
    document: {
      getElementById: id => mockElements[id] || null
    },
    localStorage: {
      getItem: k => mockLocalStorage[k] || null,
      setItem: (k, v) => { mockLocalStorage[k] = v; }
    },
    performance: {
      now: () => 1000
    },
    requestAnimationFrame: cb => setTimeout(cb, 10),
    URL: {
      createObjectURL: () => 'blob:http://localhost/video-123',
      revokeObjectURL: () => {}
    },
    window: {}
  };

  vm.createContext(sandbox);
  vm.runInContext(videoStudioCode, sandbox);

  const ControllerClass = sandbox.window.VideoStudioController || sandbox.VideoStudioController;
  assert(typeof ControllerClass === 'function', 'VideoStudioController class is defined and exported');

  const instance = new ControllerClass();

  // 1. Test Theme Selection
  assert(instance.pickTheme('सुंदर साकुरा के फूल और गुलाबी पंखुड़ियाँ') === 'sakura', 'Theme selection: Sakura matched correctly');
  assert(instance.pickTheme('अंतरिक्ष में तारे और galaxy view') === 'space', 'Theme selection: Space/Galaxy matched correctly');
  assert(instance.pickTheme('तेज बारिश और storm बादल') === 'rain', 'Theme selection: Rain matched correctly');
  assert(instance.pickTheme('सर्दियों की बर्फ और शीतकाल snow') === 'snow', 'Theme selection: Snow matched correctly');
  assert(instance.pickTheme('धधकती आग और sunset सूर्य') === 'fire', 'Theme selection: Fire matched correctly');
  assert(instance.pickTheme('गहरा समुद्र ocean waves लहरें') === 'ocean', 'Theme selection: Ocean matched correctly');
  assert(instance.pickTheme('कुछ भी साधारण') === 'sakura', 'Theme selection fallback: Defaults to sakura');

  // 2. Test Scene Builder
  instance.promptEl.value = 'लड़की किमोनो पहने साकुरा वाटिका';
  instance.captionEl.value = 'मेरी प्यारी साथी';
  instance.build();
  assert(instance.scene !== null, 'build() creates a valid scene object');
  assert(instance.scene.key === 'sakura', 'build() sets theme to sakura');
  assert(instance.scene.girl === true, 'build() detects girl/character presence');
  assert(instance.scene.cap === 'मेरी प्यारी साथी', 'build() sets caption text');
  assert(instance.scene.parts.length === instance.themes.sakura.n, `build() generates ${instance.themes.sakura.n} particles`);

  // 3. Test Aspect Ratio & Canvas Resizing
  instance.ratioEl.value = 'l'; // Landscape
  instance.setSize();
  assert(instance.W === 960 && instance.H === 540, 'setSize() landscape sets 960x540');

  instance.ratioEl.value = 'p'; // Portrait
  instance.setSize();
  assert(instance.W === 540 && instance.H === 960, 'setSize() portrait sets 540x960');

  // 4. Test Token Storage
  instance.ls('hf_token', 'hf_my_secret_token');
  assert(instance.ls('hf_token') === 'hf_my_secret_token', 'Hugging Face token persisted in localStorage');

  // 5. Test Supported AI Models List
  assert(Array.isArray(instance.models) && instance.models.length >= 3, 'Supported AI models list contains models');
  assert(instance.models.includes('Wan-AI/Wan2.1-T2V-1.3B'), 'Contains Wan 2.1 1.3B model');
  assert(instance.models.includes('Lightricks/LTX-Video'), 'Contains LTX-Video model');
  assert(instance.models.includes('THUDM/CogVideoX-2b'), 'Contains CogVideoX-2b model');

  // 6. Test Show Preview & Download Setup
  const fakeBlob = { type: 'video/webm' };
  instance.show(fakeBlob);
  assert(instance.dlEl.download === 'jarvis-video.webm', 'show() sets download filename with webm extension');
  assert(instance.dlEl.href.startsWith('blob:'), 'show() configures blob download link');

  const fakeMp4Blob = { type: 'video/mp4' };
  instance.show(fakeMp4Blob);
  assert(instance.dlEl.download === 'jarvis-video.mp4', 'show() sets download filename with mp4 extension');

  // =========================================================================
  // 7. TEST 4 ENGINE MODES & DESCRIPTIONS SWITCHING
  // =========================================================================
  // Mode A: Cartoon Story Maker
  mockElements.engine.value = 'story';
  instance.syncEngineMode();
  assert(mockElements.panelStoryMaker.style.display === 'block', 'Engine switch: Cartoon Story Maker panel displayed');
  assert(mockElements.panelQuickAnimator.style.display === 'none', 'Engine switch: Quick Animator panel hidden in story mode');
  assert(mockElements.engineDescription.textContent.includes('Offline multi-scene cartoon creator'), 'Engine switch: Description updated for Cartoon Story Maker');

  // Mode B: Quick 2D Animator
  mockElements.engine.value = 'animator';
  instance.syncEngineMode();
  assert(mockElements.panelQuickAnimator.style.display === 'block', 'Engine switch: Quick 2D Animator panel displayed');
  assert(mockElements.panelStoryMaker.style.display === 'none', 'Engine switch: Story Maker panel hidden in animator mode');
  assert(mockElements.engineDescription.textContent.includes('Offline 2D anime character animation'), 'Engine switch: Description updated for Quick 2D Animator');

  // Mode C: Photo to Video
  mockElements.engine.value = 'photo2video';
  instance.syncEngineMode();
  assert(mockElements.panelPhotoToVideo.style.display === 'block', 'Engine switch: Photo to Video panel displayed');
  assert(mockElements.panelQuickAnimator.style.display === 'none', 'Engine switch: Quick Animator hidden in photo2video mode');
  assert(mockElements.engineDescription.textContent.includes('Offline photo slideshow generator'), 'Engine switch: Description updated for Photo to Video');

  // Mode D: AI Video (Online)
  mockElements.engine.value = 'ai';
  instance.syncEngineMode();
  assert(mockElements.aiOpts.style.display === 'block', 'Engine switch: AI Video panel displayed');
  assert(mockElements.panelPhotoToVideo.style.display === 'none', 'Engine switch: Photo to Video hidden in AI mode');
  assert(mockElements.engineDescription.textContent.includes('Online AI text-to-video synthesis'), 'Engine switch: Description updated for AI Video');

  // =========================================================================
  // 8. TEST PHOTO TO VIDEO VALIDATION (0 PHOTOS SELECTED)
  // =========================================================================
  instance.p2vImages = [];
  const p2vGenerateHandler = mockListeners['btnP2VGenerate'] && mockListeners['btnP2VGenerate']['click'];
  assert(typeof p2vGenerateHandler === 'function', 'Photo to Video generate button has click listener registered');

  p2vGenerateHandler();
  assert(
    mockElements.p2vLog.textContent.includes('Please select at least 1 photo (1 to 10 photos) to create a video.'),
    'Photo to Video 0 photos validation: displays clear error message'
  );

  // =========================================================================
  // 9. TEST AI VIDEO ERROR FALLBACK MESSAGE
  // =========================================================================
  const aiVideoHandler = mockListeners['btnAIVideo'] && mockListeners['btnAIVideo']['click'];
  assert(typeof aiVideoHandler === 'function', 'AI Video generate button has click listener registered');

  // Simulate AI video failure across all fallback models
  instance.aiVideo = async () => {
    throw new Error('Hugging Face inference router unreachable');
  };

  mockElements.token.value = 'hf_mock_token_for_test';
  mockElements.aiPrompt.value = 'A cybernetic anime girl in a rainy neo-tokyo street';
  await aiVideoHandler();

  const expectedFailMsg = 'Free AI video is unavailable right now. Use Cartoon Story Maker instead.';
  assert(
    mockElements.aiLog.textContent.includes(expectedFailMsg),
    'AI Video failure fallback: displays clear Hindi/English fallback guidance to Cartoon Story Maker'
  );

  console.log('\n====================================================');
  console.log(`📊 VIDEO STUDIO TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
})();
