// Unit Tests: HTTP 429 / RESOURCE_EXHAUSTED Handling, Cooldowns & Fallbacks
const assert = require('node:assert');
const aiService = require('./ai-service.js');
const db = require('./db.js');

console.log('====================================================');
console.log('🧪 TESTING GEMINI HTTP 429 & QUOTA EXHAUSTION SYSTEM');
console.log('====================================================\n');

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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name} - ${err.message}`);
    failed++;
  }
}

(async () => {
  // Test 1: Official models list
  test('Supported Official Models list defined', () => {
    assert(Array.isArray(aiService.OFFICIAL_MODELS), 'OFFICIAL_MODELS must be an array');
    assert(aiService.OFFICIAL_MODELS.includes('gemini-2.5-flash'), 'Includes gemini-2.5-flash');
    assert(aiService.OFFICIAL_MODELS.includes('gemini-2.0-flash'), 'Includes gemini-2.0-flash');
    assert(aiService.OFFICIAL_MODELS.includes('gemini-1.5-flash'), 'Includes gemini-1.5-flash');
    assert(aiService.OFFICIAL_MODELS.includes('gemini-1.5-pro'), 'Includes gemini-1.5-pro');
  });

  // Test 2: Cooldown tracking
  test('Cooldown tracking for exhausted models', () => {
    aiService.clearCooldowns();
    const model = 'gemini-2.5-flash';
    assert.strictEqual(aiService.getCooldownStatus()[model], undefined, 'Initial status clean');

    aiService.markModelExhausted(model, 60000); // 1 minute cooldown
    const status = aiService.getCooldownStatus();
    assert(status[model] && status[model].exhausted, 'Model is recorded in cooldown');
    assert(status[model].secondsRemaining > 0, 'Seconds remaining is positive');

    aiService.clearCooldowns();
    assert.strictEqual(aiService.getCooldownStatus()[model], undefined, 'Cooldowns cleared successfully');
  });

  // Test 3: Quota Exhausted Message for Girlfriend Persona (Maya)
  test('Persona Girlfriend Quota Exhausted Message (Hindi & English)', () => {
    const msg = aiService.generateQuotaExhaustedMessage('girlfriend', 'Rahul', ['gemini-2.5-flash', 'gemini-2.0-flash']);
    assert(msg.includes('Rahul'), 'Includes personalized user name');
    assert(msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429'), 'Mentions HTTP 429 / RESOURCE_EXHAUSTED');
    assert(msg.includes('Settings (⚙️)'), 'Guides user to Settings to add key');
    assert(msg.includes('Reset') || msg.includes('reset'), 'Explains automatic rolling reset');
    assert(!msg.includes('Subscription') && !msg.includes('purchase'), 'Does not ask user to purchase paid subscriptions');
  });

  // Test 4: Quota Exhausted Message for JARVIS Persona
  test('Persona JARVIS Quota Exhausted Message', () => {
    const msg = aiService.generateQuotaExhaustedMessage('jarvis', 'Sir', ['gemini-2.5-flash']);
    assert(msg.includes('Sir'), 'Respectfully addresses as Sir');
    assert(msg.includes('HTTP 429') && msg.includes('RESOURCE_EXHAUSTED'), 'Accurately diagnoses HTTP 429 RESOURCE_EXHAUSTED');
    assert(msg.includes('Google AI Studio'), 'Provides free AI Studio reference');
  });

  // Test 5: Simulated Quota Fallback Cascade
  await testAsync('callGemini with exhausted models cascade & friendly response', async () => {
    // Clear cooldowns first
    aiService.clearCooldowns();

    // Mark all official models exhausted in cooldown
    for (const m of aiService.OFFICIAL_MODELS) {
      aiService.markModelExhausted(m, 10000);
    }

    const result = await aiService.callGemini({
      apiKey: 'AIzaFakeKey123',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Hello' }]
    });

    assert(result.quotaExhausted === true, 'Result correctly marked as quotaExhausted: true');
    assert(result.replyText && result.replyText.length > 50, 'Friendly explanation reply generated');
    assert(result.modelsAttempted.length >= 4, 'All official models attempted/skipped in cascade');

    // Clean up cooldowns
    aiService.clearCooldowns();
  });

  console.log('\n====================================================');
  console.log(`📊 QUOTA TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
})();
