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

// Mock a DOM environment for testing VideoStudioController
const mockLocalStorage = {};
const mockElements = {
  subtabBtnImage: { classList: { add: () => {}, remove: () => {} }, addEventListener: () => {} },
  subtabBtnVideo: { classList: { add: () => {}, remove: () => {} }, addEventListener: () => {} },
  mediaPaneImage: { style: {} },
  mediaPaneVideo: { style: {}, classList: { add: () => {}, remove: () => {} } },
  engine: { value: 'local', addEventListener: () => {} },
  prompt: { value: 'साकुरा के पेड़ों के नीचे लंबे बालों वाली लड़की', addEventListener: () => {} },
  localOpts: { style: {}, classList: { toggle: () => {} } },
  dur: { value: '6' },
  ratio: { value: 'p', addEventListener: () => {} },
  caption: { value: 'नमस्ते भारत', addEventListener: () => {} },
  aiOpts: { style: {}, classList: { toggle: () => {} } },
  token: { value: 'hf_test_123', addEventListener: () => {} },
  mid: { value: '' },
  fb: { checked: true },
  go: { disabled: false, addEventListener: () => {} },
  log: { textContent: '' },
  stage: {},
  cv: {
    width: 540,
    height: 960,
    style: {},
    classList: { add: () => {}, remove: () => {} },
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
  },
  out: {
    style: {},
    classList: { add: () => {}, remove: () => {} },
    pause: () => {},
    play: async () => {},
    playbackRate: 1.0
  },
  dl: { style: {}, classList: { add: () => {}, remove: () => {} }, href: '', download: '' },
  videoEditorControls: { style: {}, classList: { add: () => {}, remove: () => {} } },
  videoSpeedSelect: { value: '1.5', addEventListener: () => {} },
  videoFilterSelect: { value: 'sakura', addEventListener: () => {} }
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

console.log('\n====================================================');
console.log(`📊 VIDEO STUDIO TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log('====================================================\n');

process.exit(failed > 0 ? 1 : 0);
