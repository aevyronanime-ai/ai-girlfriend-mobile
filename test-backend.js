// Comprehensive Automated Backend & Logic Test Suite for JARVIS AI
const http = require('node:http');
const path = require('node:path');

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 STARTING COMPREHENSIVE JARVIS AI TEST SUITE');
  console.log('====================================================\n');

  let serverProcess = null;
  try {
    const ping = await fetch(`${BASE_URL}/api/status`);
    if (ping.status === 200) {
      console.log('📡 Connected to active J.A.R.V.I.S. server on port 3000\n');
    }
  } catch (e) {
    console.log('🚀 Launching backend server for integration tests...');
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

  // --- TEST 1: Server Status & Version ---
  try {
    const res = await request('/api/status');
    assert(res.status === 200, 'Server status HTTP 200');
    assert(res.data.status === 'online', 'Server reports online');
    assert(res.data.name === 'J.A.R.V.I.S. AI', 'App name is J.A.R.V.I.S. AI');
  } catch (err) {
    assert(false, 'Server status request', err.message);
  }

  // --- TEST 2: Calibration & Name Personalization ---
  try {
    // Set user_name to 'Commander'
    const setRes = await request('/api/settings', {
      method: 'POST',
      body: { user_name: 'Commander', persona: 'jarvis' }
    });
    assert(setRes.status === 200 && setRes.data.success, 'Settings update user_name');

    // Verify settings persisted
    const getRes = await request('/api/settings');
    assert(getRes.data.user_name === 'Commander', 'Settings verify user_name === Commander');

    // Verify status endpoint reflects updated user_name
    const statusRes = await request('/api/status');
    assert(statusRes.data.userName === 'Commander', 'Status reflects personalized user_name');

    // Test Chat query receives personalized response
    const chatRes = await request('/api/chat', {
      method: 'POST',
      body: { message: 'who are you', stream: false }
    });
    assert(chatRes.data.content && chatRes.data.content.includes('Commander'), 'AI addresses user by calibrated name (Commander)');
  } catch (err) {
    assert(false, 'Calibration & personalization test', err.message);
  }

  // --- TEST 3: Hindi & English Offline & Conversational Intelligence ---
  try {
    // English time query
    const timeRes = await request('/api/chat', {
      method: 'POST',
      body: { message: 'What is the current time?', stream: false }
    });
    assert(timeRes.data.content.toLowerCase().includes('time'), 'English time query handled correctly');

    // Hindi greeting query
    const hiRes = await request('/api/chat', {
      method: 'POST',
      body: { message: 'नमस्ते जार्विस, आप कैसे हो?', stream: false }
    });
    assert(hiRes.data.content && hiRes.data.content.length > 20, 'Hindi conversational query returned response');

    // Math calculation query
    const mathRes = await request('/api/chat', {
      method: 'POST',
      body: { message: 'Calculate 125 * 4', stream: false }
    });
    assert(mathRes.data.content.includes('500'), 'Built-in math intelligence: 125 * 4 = 500');
  } catch (err) {
    assert(false, 'Hindi and English conversation test', err.message);
  }

  // --- TEST 4: Personas: JARVIS vs AI Girlfriend vs Custom ---
  try {
    // Switch to Girlfriend persona
    await request('/api/settings', {
      method: 'POST',
      body: { persona: 'girlfriend', user_name: 'Rahul' }
    });

    const gfChat = await request('/api/chat', {
      method: 'POST',
      body: { message: 'tum kaun ho', stream: false }
    });
    assert(gfChat.data.content.includes('girlfriend') || gfChat.data.content.includes('Rahul'), 'AI Girlfriend persona responds in caring Hindi tone');

    // Switch to Custom persona
    await request('/api/settings', {
      method: 'POST',
      body: { persona: 'custom', custom_system_prompt: 'You are an astronaut aboard ISS.' }
    });
    const customSettings = await request('/api/settings');
    assert(customSettings.data.persona === 'custom', 'Custom persona mode configured');

    // Reset back to JARVIS default
    await request('/api/settings', {
      method: 'POST',
      body: { persona: 'jarvis', user_name: 'Sir' }
    });
  } catch (err) {
    assert(false, 'Persona switching test', err.message);
  }

  // --- TEST 5: API Key Verification & Security ---
  try {
    // Test that settings endpoint masks API keys
    await request('/api/settings', {
      method: 'POST',
      body: { gemini_api_key: 'AIzaSyFakeKeyForTesting123456789' }
    });
    const maskedRes = await request('/api/settings');
    assert(maskedRes.data.gemini_api_key_masked && maskedRes.data.gemini_api_key_masked.includes('...'), 'API key is masked in GET /api/settings');

    // Clear test fake key
    await request('/api/settings', {
      method: 'POST',
      body: { gemini_api_key: '' }
    });
  } catch (err) {
    assert(false, 'API key security test', err.message);
  }

  // --- TEST 6: AI Image Generation ---
  try {
    const imgRes = await request('/api/generate-image', {
      method: 'POST',
      body: { prompt: 'holographic robot in cyberspace', style: 'cyberpunk', aspectRatio: '16:9' }
    });
    assert(imgRes.status === 200 && imgRes.data.success, 'Image generation returned success');
    assert(imgRes.data.imageUrl && imgRes.data.imageUrl.startsWith('https://image.pollinations.ai/'), 'Image URL points to Pollinations AI');
    assert(imgRes.data.width === 1280 && imgRes.data.height === 720, '16:9 Aspect ratio correctly set to 1280x720');

    // Verify image URL is reachable
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const fetchImg = await fetch(imgRes.data.imageUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      if (fetchImg.status === 200 || fetchImg.status === 302) {
        assert(true, 'Generated image URL is accessible (HTTP 200/302)');
      } else {
        console.log(`ℹ️ Pollinations AI server returned HTTP ${fetchImg.status} (server busy). URL structure is valid.`);
        assert(imgRes.data.imageUrl.includes('image.pollinations.ai'), 'Generated image URL is valid Pollinations structure');
      }
    } catch (e) {
      console.log('ℹ️ Pollinations AI remote network response deferred (slow network):', e.message);
      assert(imgRes.data.imageUrl.includes('image.pollinations.ai'), 'Generated image URL is valid Pollinations structure');
    }
  } catch (err) {
    assert(false, 'Image generation test', err.message);
  }

  // --- TEST 7: AI Writer Studio (Stories, YouTube, Coding, Social, Summary) ---
  try {
    // Story
    const storyRes = await request('/api/writer', {
      method: 'POST',
      body: { toolType: 'story', topic: 'Mysterious ancient temple', tone: 'Suspense' }
    });
    assert(storyRes.data.success && storyRes.data.result.length > 50, 'AI Writer: Story generated');

    // YouTube Script
    const ytRes = await request('/api/writer', {
      method: 'POST',
      body: { toolType: 'youtube', topic: 'Future of Quantum AI' }
    });
    assert(ytRes.data.success && ytRes.data.result.length > 50, 'AI Writer: YouTube script generated');

    // Coding Assistant
    const codeRes = await request('/api/writer', {
      method: 'POST',
      body: { toolType: 'coding', topic: 'Binary Search in Python' }
    });
    assert(codeRes.data.success && codeRes.data.result.length > 50, 'AI Writer: Coding assistant output generated');
  } catch (err) {
    assert(false, 'AI Writer Studio test', err.message);
  }

  // --- TEST 8: AI Translator ---
  try {
    const transRes = await request('/api/translate', {
      method: 'POST',
      body: { text: 'How are you doing today?', from: 'English', to: 'Hindi' }
    });
    assert(transRes.data.success && transRes.data.translated, 'AI Translator response generated');
  } catch (err) {
    assert(false, 'AI Translator test', err.message);
  }

  // --- TEST 9: Document Intelligence ---
  try {
    const docRes = await request('/api/analyze-doc', {
      method: 'POST',
      body: { docText: 'Project X was initiated in 2026. Target completion is Q4 2026 with a budget of 1M.', question: 'Summarize' }
    });
    assert(docRes.data.success && docRes.data.analysis, 'Document analysis report generated');
  } catch (err) {
    assert(false, 'Document analysis test', err.message);
  }

  // --- TEST 10: Chat Sessions & Persistent History (CRUD) ---
  try {
    // Create new session
    const createRes = await request('/api/sessions', {
      method: 'POST',
      body: { title: 'Test Session Alpha' }
    });
    assert(createRes.status === 201 && createRes.data.id, 'Session created successfully');
    const sessionId = createRes.data.id;

    // Add a message into this session
    await request('/api/chat', {
      method: 'POST',
      body: { sessionId, message: 'Message in Test Session Alpha', stream: false }
    });

    // Retrieve session and verify message is stored in SQLite
    const getSessionRes = await request(`/api/sessions/${sessionId}`);
    assert(getSessionRes.data.messages && getSessionRes.data.messages.length >= 2, 'Session retrieved with user & assistant messages');

    // Rename session
    const renameRes = await request(`/api/sessions/${sessionId}/rename`, {
      method: 'POST',
      body: { title: 'Renamed Session Alpha' }
    });
    assert(renameRes.data.success && renameRes.data.title === 'Renamed Session Alpha', 'Session renamed');

    // Delete session
    const delRes = await request(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    assert(delRes.data.success, 'Session deleted');

    // Verify session is no longer in sessions list
    const sessionsList = await request('/api/sessions');
    const found = sessionsList.data.some(s => s.id === sessionId);
    assert(!found, 'Deleted session no longer appears in sessions list');
  } catch (err) {
    assert(false, 'Chat sessions CRUD test', err.message);
  }

  // --- TEST 11: Static Assets Delivery (PWA Manifest, CSS, JS, Icon) ---
  try {
    const manifestRes = await fetch(`${BASE_URL}/manifest.json`);
    assert(manifestRes.status === 200, 'manifest.json returns HTTP 200');

    const swRes = await fetch(`${BASE_URL}/sw.js`);
    assert(swRes.status === 200, 'Service Worker sw.js returns HTTP 200');

    const cssRes = await fetch(`${BASE_URL}/css/style.css`);
    assert(cssRes.status === 200, 'style.css returns HTTP 200');

    const iconRes = await fetch(`${BASE_URL}/icons/icon.svg`);
    assert(iconRes.status === 200, 'icon.svg returns HTTP 200');

    const jsFiles = [
      'audio-fx.js',
      'orb.js',
      'voice.js',
      'chat.js',
      'tools.js',
      'history.js',
      'settings.js',
      'developer.js',
      'sakura-petals.js',
      'media-studio.js',
      'client-ai.js',
      'system-launcher.js',
      'app.js'
    ];
    for (const f of jsFiles) {
      const jsRes = await fetch(`${BASE_URL}/js/${f}`);
      assert(jsRes.status === 200, `JavaScript module /js/${f} returns HTTP 200`);
    }
  } catch (err) {
    assert(false, 'Static assets delivery test', err.message);
  }

  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
