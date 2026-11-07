// test-voice-tts-and-copy.js
// Unit tests for Voice Assistant (TTS, STT, State Machine, Sentence Chunker) & ChatGPT-like Copy Button
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('🧪 TESTING VOICE ASSISTANT (TTS, STATE MACHINE) & COPY BUTTON');
console.log('================================================================\n');

// 1. Load client-side JS files in a simulated DOM environment
const voiceCode = fs.readFileSync(path.join(__dirname, 'public/js/voice.js'), 'utf-8');
const chatCode = fs.readFileSync(path.join(__dirname, 'public/js/chat.js'), 'utf-8');

// Mock browser globals
class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.lang = 'en-US';
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

class MockSpeechSynthesis {
  constructor() {
    this.speaking = false;
    this.paused = false;
    this.voices = [
      { name: 'Google हिन्दी', lang: 'hi-IN', voiceURI: 'Google hi-IN' },
      { name: 'Google female (en-IN)', lang: 'en-IN', voiceURI: 'Google en-IN female' },
      { name: 'Microsoft Zira - English (United States)', lang: 'en-US', voiceURI: 'Microsoft Zira' }
    ];
    this.spokenUtterances = [];
  }
  getVoices() { return this.voices; }
  speak(u) {
    this.speaking = true;
    this.spokenUtterances.push(u);
    if (u.onstart) u.onstart();
    setTimeout(() => {
      this.speaking = false;
      if (u.onend) u.onend();
    }, 10);
  }
  cancel() {
    this.speaking = false;
    this.spokenUtterances = [];
  }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
}

const lastToast = { message: '' };
global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
global.window = {
  speechSynthesis: new MockSpeechSynthesis(),
  SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
  app: {
    showToast: (msg) => { lastToast.message = msg; },
    switchTab: () => {}
  },
  soundFX: {
    activate: () => {},
    click: () => {},
    success: () => {}
  },
  orb: {
    setState: (s) => { global.window.orb.currentState = s; },
    currentState: 'IDLE'
  },
  autoVoiceReplyEnabled: true,
  autoSpeakEnabled: true
};

global.document = {
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  createElement: (tag) => {
    return {
      tagName: tag.toUpperCase(),
      value: '',
      textContent: '',
      innerHTML: '',
      style: {},
      setAttribute: () => {},
      focus: () => {},
      select: () => {},
      appendChild: () => {}
    };
  },
  addEventListener: () => {},
  getElementById: (id) => {
    return {
      id,
      style: {},
      textContent: '',
      innerHTML: '',
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {}
    };
  },
  querySelectorAll: () => []
};

vm.runInThisContext(voiceCode);
vm.runInThisContext(chatCode);

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runTests() {
  await test('Text Cleaning for Speech: Strips emojis, markdown, URLs, and code blocks', () => {
    const va = new VoiceAssistant();
    const input = `नमस्ते! 😊 **मैं आपकी AI दोस्त हूँ**। 
यहाँ कोड देखें:
\`\`\`javascript
console.log("hello");
\`\`\`
विजिट करें: https://google.com और *मज़े* करें! #हेडिंग`;

    const cleaned = va.cleanTextForSpeech(input);
    assert(!cleaned.includes('😊'), 'Should not contain emojis');
    assert(!cleaned.includes('console.log'), 'Should not contain code blocks');
    assert(!cleaned.includes('https://google.com'), 'Should not contain URLs');
    assert(!cleaned.includes('**'), 'Should not contain markdown bold');
    assert(!cleaned.includes('*'), 'Should not contain markdown italic');
    assert(!cleaned.includes('#'), 'Should not contain markdown hash');
    assert(cleaned.includes('नमस्ते'), 'Should keep words');
    assert(cleaned.includes('मैं आपकी AI दोस्त हूँ'), 'Should keep Hindi content');
  });

  await test('Sentence Splitting: Chunks text into <= 130 char pieces to avoid Chrome stall', () => {
    const va = new VoiceAssistant();
    const longText = 'नमस्ते जी। आज का मौसम बहुत ही सुहावना है और मुझे आपसे बात करके बहुत खुशी हो रही है। हम दोनों मिलकर आज कई नई चीज़ें सीख सकते हैं और कोई भी सवाल हो तो आप बेझिझक मुझसे पूछ सकते हैं।';
    const chunks = va.splitIntoSentences(longText);

    assert(chunks.length >= 2, `Should split into multiple chunks, got ${chunks.length}`);
    chunks.forEach((c, idx) => {
      assert(c.length <= 130, `Chunk ${idx} length ${c.length} exceeds 130 chars: "${c}"`);
    });
  });

  await test('Voice Assistant Voice Selection: Sweet female voice parameters (pitch: 1.25, rate: 0.98)', () => {
    const va = new VoiceAssistant();
    assert.strictEqual(va.pitch, 1.25, 'Pitch should be 1.25 for sweet female tone');
    assert.strictEqual(va.rate, 0.98, 'Rate should be 0.98 for natural conversational pace');

    const hiVoice = va.getVoiceForLanguage({ bcp47: 'hi-IN', family: 'hi' });
    assert(hiVoice, 'Should find Hindi voice');
    assert(hiVoice.name.includes('Google हिन्दी') || hiVoice.lang.startsWith('hi'), 'Should select Hindi voice');

    const enVoice = va.getVoiceForLanguage({ bcp47: 'en-US', family: 'en' });
    assert(enVoice, 'Should find female English voice');
    assert(enVoice.name.toLowerCase().includes('zira') || enVoice.name.toLowerCase().includes('female'), 'Should prefer female voice');
  });

  await test('Language Auto-Detection: Hindi, Hinglish, Bengali, English', () => {
    const va = new VoiceAssistant();
    assert.strictEqual(va.detectLanguage('नमस्ते आप कैसे हैं?').family, 'hi');
    assert.strictEqual(va.detectLanguage('kya haal hai aapka?').family, 'hinglish');
    assert.strictEqual(va.detectLanguage('How are you today?').family, 'en');
    assert.strictEqual(va.detectLanguage('কেমন আছেন আপনি?').family, 'bn');
  });

  await test('Voice State Machine: LISTENING -> THINKING -> SPEAKING -> IDLE', () => {
    const va = new VoiceAssistant();
    assert.strictEqual(va.state, 'IDLE');

    va.setState('LISTENING');
    assert.strictEqual(va.state, 'LISTENING');
    assert.strictEqual(va.isListening, true);
    assert.strictEqual(va.isSpeaking, false);

    va.setState('THINKING');
    assert.strictEqual(va.state, 'THINKING');
    assert.strictEqual(va.isListening, false);
    assert.strictEqual(va.isSpeaking, false);

    va.setState('SPEAKING');
    assert.strictEqual(va.state, 'SPEAKING');
    assert.strictEqual(va.isListening, false);
    assert.strictEqual(va.isSpeaking, true);

    va.stopSpeaking(false);
    assert.strictEqual(va.state, 'IDLE');
    assert.strictEqual(va.isListening, false);
    assert.strictEqual(va.isSpeaking, false);
  });

  await test('Missing Hindi Voice Toast: Warns user to download Hindi voice if missing', () => {
    const va = new VoiceAssistant();
    // Simulate device with no Hindi voices
    va.voices = [{ name: 'English Only', lang: 'en-US' }];
    lastToast.message = '';
    va._hindiVoiceNotified = false;

    va.speak('नमस्ते दुनिया');
    assert(lastToast.message.includes('Hindi (India) आवाज़ डाउनलोड करें'), `Expected Hindi voice missing warning toast, got: "${lastToast.message}"`);
  });

  await test('Empty or Error Response does NOT trigger TTS speak', () => {
    const synth = global.window.speechSynthesis;
    synth.spokenUtterances = [];

    const va = new VoiceAssistant();
    va.speak('');
    assert.strictEqual(synth.spokenUtterances.length, 0, 'Empty string should not speak');

    va.speak('   ');
    assert.strictEqual(synth.spokenUtterances.length, 0, 'Whitespace string should not speak');

    va.speak(null);
    assert.strictEqual(synth.spokenUtterances.length, 0, 'Null should not speak');
  });

  await test('Copy Button: Copies ONLY clean response text without UI elements or timestamps', async () => {
    let copiedText = '';
    const mockClipboard = {
      writeText: async (text) => {
        copiedText = text;
        return true;
      }
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: mockClipboard },
      configurable: true,
      writable: true
    });

    const pureResponse = 'नमस्ते! यह AI का शुद्ध जवाब है। कोई UI शब्द इसमें नहीं होंगे।';
    const mockBtn = {
      innerHTML: '📋 Copy',
      classList: {
        add: (cls) => { mockBtn._lastClass = cls; },
        remove: (cls) => { if (mockBtn._lastClass === cls) mockBtn._lastClass = ''; }
      }
    };

    const success = await window.copyTextWithFeedback(pureResponse, mockBtn);
    assert.strictEqual(success, true, 'copyTextWithFeedback should succeed');
    assert.strictEqual(copiedText, pureResponse, 'Should copy exactly the pure response text');
    assert(!copiedText.includes('📋'), 'Should not include copy icon');
    assert(!copiedText.includes('Copy'), 'Should not include Copy label');
    assert(!copiedText.includes('⚡'), 'Should not include avatar');
    assert.strictEqual(mockBtn.innerHTML, 'Copied ✓', 'Button should display "Copied ✓"');
    assert.strictEqual(mockBtn._lastClass, 'copied', 'Button should have "copied" CSS class');
  });

  await test('Copy Button Fallback: Uses execCommand("copy") when navigator.clipboard is unavailable', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true
    });

    let execCommandCalled = false;
    let copiedValue = '';
    global.document.createElement = (tag) => {
      return {
        tagName: tag.toUpperCase(),
        style: {},
        value: '',
        setAttribute: () => {},
        focus: () => {},
        select: function() { copiedValue = this.value; }
      };
    };
    global.document.body = {
      appendChild: () => {},
      removeChild: () => {}
    };
    global.document.execCommand = (cmd) => {
      if (cmd === 'copy') {
        execCommandCalled = true;
        return true;
      }
      return false;
    };

    const mockBtn = { innerHTML: '📋 Copy', classList: { add: () => {}, remove: () => {} } };
    const sample = 'Fallback copy text in Android WebView';
    const success = window.fallbackCopyText(sample, () => {
      mockBtn.innerHTML = 'Copied ✓';
    });

    assert.strictEqual(success, true, 'Fallback copy should succeed via execCommand');
    assert.strictEqual(execCommandCalled, true, 'execCommand("copy") must be invoked');
    assert.strictEqual(copiedValue, sample, 'Copied value must match pure response');
    assert.strictEqual(mockBtn.innerHTML, 'Copied ✓', 'Button label should be "Copied ✓"');
  });

  console.log(`\n================================================================`);
  console.log(`📊 ALL VOICE & COPY TESTS PASSED (${passed} / ${passed})`);
  console.log(`================================================================\n`);
}

runTests();
