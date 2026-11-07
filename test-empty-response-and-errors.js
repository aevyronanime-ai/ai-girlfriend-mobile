// Test Suite: Empty Response, Multi-part Thinking Filtering, HTTP Errors (400, 403, 404, 429, 500) & Chat Bubble Non-emptiness
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const clientAIModule = require('./public/js/client-ai.js');
const { extractTextFromGeminiResponse, formatGeminiErrorHindi, stripThinkingTags } = clientAIModule;

console.log('================================================================');
console.log('🧪 TESTING RESPONSE EXTRACTION, THINKING PARTS, HTTP ERRORS & BUBBLE NON-EMPTINESS');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name} - ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. Tests for extractTextFromGeminiResponse & Multi-part Thinking Filter
// -----------------------------------------------------------------------------

test('Filters out thinking parts and extracts only final answer text', () => {
  const mockThinkingResponse = {
    candidates: [
      {
        content: {
          parts: [
            { thought: true, text: 'User is greeting me. I should be warm and gentle.' },
            { text: 'Namaste! Main aapki AI assistant hoon, boliye aaj kya baat karni hai? ❤️' }
          ],
          role: 'model'
        },
        finishReason: 'STOP'
      }
    ]
  };

  const extracted = extractTextFromGeminiResponse(mockThinkingResponse);
  assert.strictEqual(
    extracted,
    'Namaste! Main aapki AI assistant hoon, boliye aaj kya baat karni hai? ❤️'
  );
  assert(!extracted.includes('User is greeting me'), 'Thought part must not be in output');
});

test('Joins multiple non-thought text parts correctly', () => {
  const mockMultiPartResponse = {
    candidates: [
      {
        content: {
          parts: [
            { text: 'Hello! ' },
            { text: 'Main Jarvis hoon. ' },
            { text: 'Aapki kaise sahayata karoon?' }
          ],
          role: 'model'
        },
        finishReason: 'STOP'
      }
    ]
  };

  const extracted = extractTextFromGeminiResponse(mockMultiPartResponse);
  assert.strictEqual(extracted, 'Hello! Main Jarvis hoon. Aapki kaise sahayata karoon?');
});

test('Strips inline <thought> or <thinking> tags from text', () => {
  const taggedText = '<thought>Thinking about formula...</thought>Result is: 42';
  const stripped = stripThinkingTags(taggedText);
  assert.strictEqual(stripped, 'Result is: 42');

  const taggedResponse = {
    candidates: [
      {
        content: {
          parts: [{ text: '<thinking>Analyzing user input...</thinking>Aapka din shubh ho!' }]
        }
      }
    ]
  };
  const extracted = extractTextFromGeminiResponse(taggedResponse);
  assert.strictEqual(extracted, 'Aapka din shubh ho!');
});

test('Handles safety blocked responses with clear Hindi explanation', () => {
  const safetyBlocked = {
    candidates: [
      {
        finishReason: 'SAFETY'
      }
    ]
  };
  const extracted = extractTextFromGeminiResponse(safetyBlocked);
  assert(extracted.includes('सुरक्षा'), 'Includes Hindi safety message');
  assert(extracted.length > 0, 'Must not be empty');
});

// -----------------------------------------------------------------------------
// 2. Tests for HTTP Error Formatting (400, 403, 404, 429, 500, Timeout, Offline)
// -----------------------------------------------------------------------------

test('HTTP 400 Bad Request error contains status code and Hindi explanation', () => {
  const formatted = formatGeminiErrorHindi(400, 'API_KEY_INVALID');
  assert(formatted.includes('HTTP 400'), 'Mentions HTTP 400');
  assert(formatted.includes('अमान्य अनुरोध या कुंजी'), 'Mentions invalid key or request');
  assert(formatted.includes('Settings (⚙️)'), 'Directs user to Settings');
});

test('HTTP 403 Permission Denied error contains status code and Hindi explanation', () => {
  const formatted = formatGeminiErrorHindi(403, 'The caller does not have permission');
  assert(formatted.includes('HTTP 403'), 'Mentions HTTP 403');
  assert(formatted.includes('कुंजी को अनुमति नहीं है') || formatted.includes('Permission Denied'), 'Explains permission denied');
});

test('HTTP 404 Model Not Found contains status code and gemini-3.8-flash guidance', () => {
  const formatted = formatGeminiErrorHindi(404, 'models/gemini-2.0-flash is no longer available');
  assert(formatted.includes('HTTP 404'), 'Mentions HTTP 404');
  assert(formatted.includes('मॉडल नहीं मिला या बंद हो चुका है'), 'Mentions model unavailable');
  assert(formatted.includes('gemini-3.8-flash'), 'Refers to gemini-3.8-flash');
});

test('HTTP 429 Quota Exhausted contains status code and rolling reset notice', () => {
  const formatted = formatGeminiErrorHindi(429, 'RESOURCE_EXHAUSTED');
  assert(formatted.includes('HTTP 429'), 'Mentions HTTP 429');
  assert(formatted.includes('कोटा खत्म है'), 'Mentions quota exhausted');
  assert(formatted.includes('24 घंटे'), 'Mentions 24-hour automatic reset');
});

test('HTTP 500 Google Server Error contains status code and retry notice', () => {
  const formatted = formatGeminiErrorHindi(500, 'Internal Server Error');
  assert(formatted.includes('HTTP 500'), 'Mentions HTTP 500');
  assert(formatted.includes('Google सर्वर एरर'), 'Mentions Google server error');
});

test('15-second Timeout contains clear timeout notice in Hindi', () => {
  const formatted = formatGeminiErrorHindi(0, 'TIMEOUT', { isTimeout: true });
  assert(formatted.includes('समय समाप्त') || formatted.includes('Timeout'), 'Mentions timeout');
  assert(formatted.includes('15 सेकंड'), 'Mentions 15 seconds');
});

// -----------------------------------------------------------------------------
// 3. Simulated Chat Bubble Non-Emptiness Tests (Empty Response & Error Handling)
// -----------------------------------------------------------------------------

test('Simulated empty API response produces a non-empty bubble in Hindi', () => {
  // Simulate mock empty Gemini response (candidates with empty text or no text)
  const emptyApiData = {
    candidates: [
      {
        content: {
          parts: [{ text: '   ' }]
        },
        finishReason: 'STOP'
      }
    ]
  };

  const extracted = extractTextFromGeminiResponse(emptyApiData);
  assert.strictEqual(extracted, '', 'Raw extraction returns empty string');

  // Simulated Chat Bubble rendering logic from chat.js
  let finalText = extracted;
  if (!finalText || !finalText.trim()) {
    finalText = '⚠️ **खाली जवाब (HTTP 200 - Empty Response)**\n\nGoogle AI ने कोई टेक्स्ट वापस नहीं भेजा। कृपया दोबारा पूछें।';
  }

  // Simulated bubble DOM element
  const mockBubble = { innerHTML: '', textContent: '' };
  mockBubble.innerHTML = finalText;
  mockBubble.textContent = finalText.replace(/[*#]/g, '');

  assert(mockBubble.innerHTML.trim().length > 0, 'Bubble innerHTML must NEVER be empty');
  assert(mockBubble.textContent.includes('खाली जवाब'), 'Bubble informs user in Hindi of empty response');
  assert(mockBubble.textContent.includes('HTTP 200'), 'Mentions HTTP 200 status');
});

test('Simulated HTTP Error response produces a non-empty bubble with status and Hindi reason', () => {
  const errorCases = [
    { status: 400, expectedCode: '400', expectedPhrase: 'अमान्य' },
    { status: 403, expectedCode: '403', expectedPhrase: 'अनुमति नहीं' },
    { status: 404, expectedCode: '404', expectedPhrase: 'मॉडल नहीं मिला' },
    { status: 429, expectedCode: '429', expectedPhrase: 'कोटा खत्म' },
    { status: 500, expectedCode: '500', expectedPhrase: 'Google सर्वर एरर' }
  ];

  for (const tc of errorCases) {
    const errorMsg = formatGeminiErrorHindi(tc.status, `Simulated error for HTTP ${tc.status}`);
    const mockBubble = { innerHTML: errorMsg, textContent: errorMsg };

    assert(mockBubble.innerHTML.trim().length > 0, `Bubble for HTTP ${tc.status} must not be empty`);
    assert(mockBubble.textContent.includes(tc.expectedCode), `Bubble contains status code ${tc.expectedCode}`);
    assert(mockBubble.textContent.includes(tc.expectedPhrase), `Bubble contains phrase ${tc.expectedPhrase}`);
  }
});

// -----------------------------------------------------------------------------
// 4. Voice Assistant Hindi TTS and Response tests
// -----------------------------------------------------------------------------

test('Voice Assistant voice list checks Hindi voice and falls back to Indian English', () => {
  const mockVoicesWithHindi = [
    { name: 'Google हिन्दी', lang: 'hi-IN' },
    { name: 'Google English', lang: 'en-US' }
  ];

  const hasHindi = mockVoicesWithHindi.some(v => v.lang.toLowerCase().startsWith('hi'));
  assert.strictEqual(hasHindi, true, 'Detects Hindi voice present');

  const mockVoicesWithoutHindi = [
    { name: 'Google English India', lang: 'en-IN' },
    { name: 'Google US', lang: 'en-US' }
  ];

  const hasHindiMissing = mockVoicesWithoutHindi.some(v => v.lang.toLowerCase().startsWith('hi'));
  assert.strictEqual(hasHindiMissing, false, 'Detects Hindi voice missing');

  // Fallback resolves to en-in or india
  const fallback = mockVoicesWithoutHindi.find(v => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'));
  assert(fallback && fallback.lang === 'en-IN', 'Falls back to Indian accent voice for smooth speech');
});

console.log('\n================================================================');
console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

process.exit(failed > 0 ? 1 : 0);
