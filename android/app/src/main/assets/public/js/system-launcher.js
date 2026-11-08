// System Launcher: Integrates with Native Android 15 & Chrome/YouTube
class SystemLauncher {
  constructor() {
    this.isNative = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  // Open Google Chrome
  async openChrome(url = 'https://www.google.com') {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openChrome({ url });
      } catch (e) {
        console.warn('Native openChrome failed, using web fallback:', e);
      }
    }
    // Web / PWA fallback
    window.open(url, '_blank');
    return { success: true, message: 'Opened Chrome in web window' };
  }

  // Search Google for Query
  async searchGoogle(query) {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();

    if (this.isNative && window.Capacitor.Plugins.SystemLauncher) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.searchGoogle({ query: cleanQuery });
      } catch (e) {
        console.warn('Native searchGoogle failed, using web fallback:', e);
      }
    }

    // Web / PWA fallback
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
    window.open(searchUrl, '_blank');
    return { success: true, query: cleanQuery, message: `Searching Google for: ${cleanQuery}` };
  }

  // Open YouTube (or YouTube search)
  async openYouTube(query = '') {
    const cleanQuery = query.trim();

    if (this.isNative && window.Capacitor.Plugins.SystemLauncher) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openYouTube({ query: cleanQuery });
      } catch (e) {
        console.warn('Native openYouTube failed, using web fallback:', e);
      }
    }

    // Web / PWA fallback
    const targetUrl = cleanQuery
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`
      : 'https://www.youtube.com';

    window.open(targetUrl, '_blank');
    return { success: true, query: cleanQuery, message: cleanQuery ? `Searching YouTube for: ${cleanQuery}` : 'Opened YouTube' };
  }

  // Open Website in Browser
  async openWebsite(url = '') {
    if (!url || !url.trim()) return { success: false, message: 'URL missing' };
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openWebsite) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openWebsite({ url: cleanUrl });
      } catch (e) {
        console.warn('Native openWebsite failed, falling back:', e);
      }
    }
    window.open(cleanUrl, '_blank');
    return { success: true, url: cleanUrl, message: `Opened website: ${cleanUrl}` };
  }

  // Open WhatsApp
  async openWhatsApp({ text = '', phone = '' } = {}) {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openWhatsApp) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openWhatsApp({ text, phone });
      } catch (e) {
        console.warn('Native openWhatsApp failed, falling back:', e);
      }
    }
    const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';
    const waUrl = (cleanPhone || text)
      ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(text)}`
      : 'https://web.whatsapp.com';
    window.open(waUrl, '_blank');
    return { success: true, message: 'Opened WhatsApp' };
  }

  // Open Camera
  async openCamera() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openCamera) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openCamera();
      } catch (e) {
        console.warn('Native openCamera failed:', e);
      }
    }
    if (window.app) window.app.showToast('📷 Camera intent triggered');
    return { success: true, message: 'Opened Camera' };
  }

  // Toggle Torch / Flashlight
  async toggleTorch(enabled = true) {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.toggleTorch) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.toggleTorch({ enabled });
      } catch (e) {
        console.warn('Native toggleTorch failed:', e);
      }
    }
    const msg = enabled ? '🔦 Torch turned ON' : '🔦 Torch turned OFF';
    if (window.app) window.app.showToast(msg);
    return { success: true, enabled, message: msg };
  }

  // Open App by name or package
  async openApp({ name = '', package: pkg = '' } = {}) {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openApp) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openApp({ name, package: pkg });
      } catch (e) {
        console.warn('Native openApp failed:', e);
      }
    }
    const msg = `Launched application: ${name || pkg}`;
    if (window.app) window.app.showToast(msg);
    return { success: true, message: msg };
  }

  // Make phone call or open dialer
  async makeCall(phone = '') {
    const cleanPhone = String(phone || '').trim();
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.makeCall) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.makeCall({ phone: cleanPhone });
      } catch (e) {
        console.warn('Native makeCall failed:', e);
      }
    }
    if (typeof window !== 'undefined' && cleanPhone) {
      try {
        window.open('tel:' + encodeURIComponent(cleanPhone), '_system');
      } catch (e) {}
    }
    const msg = cleanPhone ? `Calling: ${cleanPhone}` : 'Opened phone dialer';
    if (window.app) window.app.showToast(msg);
    return { success: true, message: msg };
  }

  // Unified Structured Command Executor (Intents + Accessibility + Confirmation)
  async executeStructuredCommand(rawCommand) {
    let cmd = rawCommand;
    if (typeof cmd === 'string') {
      try {
        cmd = JSON.parse(cmd);
      } catch (e) {
        return { success: false, message: 'Invalid JSON command string: ' + e.message };
      }
    }
    if (!cmd || typeof cmd !== 'object') {
      return { success: false, message: 'Invalid command object' };
    }

    const action = String(cmd.action || '').trim().toLowerCase();
    const target = String(cmd.target || cmd.query || cmd.url || cmd.phone || '').trim();
    const text = String(cmd.text || cmd.message || '').trim();
    const spokenText = cmd.spokenText || cmd.spoken || '';

    if (!action) {
      return { success: false, message: 'No action specified in command' };
    }

    // Master Switch Check for accessibility/automation actions
    const isMasterOn = (typeof localStorage !== 'undefined') ? (localStorage.getItem('jarvis_phone_control') === 'true') : true;
    const isAccessibilityAction = [
      'back', 'home', 'recents', 'scroll_down', 'scroll_up', 'scroll_forward', 'scroll_backward',
      'click_text', 'type_text', 'read_screen', 'youtube_control', 'youtube_first', 'youtube_next', 'youtube_toggle'
    ].includes(action);

    if (isAccessibilityAction && !isMasterOn) {
      const msg = '⚠️ फ़ोन कंट्रोल बंद है। कृपया सेटिंग्स में जाकर "Enable Phone Control" चालू करें।';
      if (window.app) window.app.showToast(msg);
      return { success: false, blocked: true, message: msg };
    }

    // 1. High-Risk Action Guard: Require explicit user confirmation for sensitive tasks
    // (money/payments, passwords, OTP, banking, deleting files, calling, sending messages)
    const highRiskActions = [
      'call', 'call_phone', 'make_call',
      'send_message', 'send_sms',
      'delete', 'delete_file', 'remove_file',
      'pay', 'payment', 'make_payment', 'transfer_money', 'send_money', 'banking',
      'otp', 'enter_otp', 'password', 'enter_password'
    ];
    const sensitiveWords = [
      'pay', 'payment', 'money', 'रुपये', 'पैसे', 'bank', 'banking', 'बैंक',
      'otp', 'ओटीपी', 'password', 'पासवर्ड', 'pin', 'पिन', 'cvv',
      'delete', 'हटाओ', 'डिलीट', 'send_message', 'मैसेज', 'call', 'कॉल'
    ];
    const combinedStr = `${action} ${target} ${text}`.toLowerCase();
    const hasSensitiveWord = sensitiveWords.some(w => combinedStr.includes(w));
    const isHighRisk = highRiskActions.includes(action) || hasSensitiveWord || Boolean(cmd.confirmationRequired);

    if (isHighRisk) {
      const promptText = cmd.prompt || cmd.confirmationPrompt || `सुरक्षा पुष्टि:\nकार्रवाई: ${action} ${target ? '("' + target + '")' : ''}\n\nक्या आप यह क्रिया जारी रखना चाहते हैं?`;
      const confirmed = (typeof window.confirmPhoneControlAction === 'function')
        ? await window.confirmPhoneControlAction(promptText)
        : (window.confirm ? window.confirm(promptText) : true);

      if (!confirmed) {
        const cancelledNotice = 'कार्रवाई रद्द कर दी गई (User cancelled).';
        if (window.app) window.app.showToast('🛑 ' + cancelledNotice);
        if (window.voiceAssistant && window.voiceAssistant.speak) window.voiceAssistant.speak('कार्रवाई रोक दी गई है।');
        this.addAuditLog({
          action,
          target,
          text,
          status: 'CANCELLED',
          message: 'User rejected confirmation prompt',
          app: 'SecurityGuard'
        });
        return { success: false, cancelled: true, message: cancelledNotice };
      }
    }

    // 2. Announce action on screen and via Voice before/during execution
    const announceMsg = spokenText || this._getActionAnnouncement(action, target, text);
    if (announceMsg) {
      if (window.app) window.app.showToast(announceMsg);
      if (window.voiceAssistant && window.voiceAssistant.speak) {
        window.voiceAssistant.speak(announceMsg);
      }
    }

    let result = null;

    // 3. Dispatch: Android Intents vs Accessibility Service actions
    switch (action) {
      case 'open_app':
      case 'launch_app': {
        const tLower = target.toLowerCase();
        if (tLower.includes('youtube') || tLower.includes('यूट्यूब')) result = await this.openYouTube(text);
        else if (tLower.includes('chrome') || tLower.includes('क्रोम')) result = await this.openChrome(text);
        else if (tLower.includes('whatsapp') || tLower.includes('व्हाट्सएप')) result = await this.openWhatsApp({ text });
        else if (tLower.includes('camera') || tLower.includes('कैमरा')) result = await this.openCamera();
        else result = await this.openApp({ name: target });
        break;
      }
      case 'search_google':
      case 'google_search': {
        result = await this.searchGoogle(target || text);
        break;
      }
      case 'search_youtube':
      case 'youtube_search': {
        result = await this.openYouTube(target || text);
        break;
      }
      case 'open_website':
      case 'open_url': {
        result = await this.openWebsite(target || text);
        break;
      }
      case 'open_whatsapp':
      case 'whatsapp': {
        result = await this.openWhatsApp({ phone: target, text });
        break;
      }
      case 'open_camera':
      case 'camera': {
        result = await this.openCamera();
        break;
      }
      case 'call':
      case 'call_phone':
      case 'make_call':
      case 'dial': {
        result = await this.makeCall(target || text);
        break;
      }
      case 'toggle_torch':
      case 'torch':
      case 'flashlight': {
        const turnOn = target.toLowerCase() !== 'off' && target.toLowerCase() !== 'band';
        result = await this.toggleTorch(turnOn);
        break;
      }
      case 'read_screen': {
        result = await this.readScreenContent(true);
        break;
      }
      case 'stop_all':
      case 'emergency_stop': {
        result = await this.stopAllAccessibilityActions();
        break;
      }
      default: {
        // Route to Accessibility Service (back, home, recents, scroll_down, scroll_up, click_text, type_text, youtube_first, youtube_next, youtube_toggle)
        result = await this.executeAccessibilityCommand({ action, target, text });
        break;
      }
    }

    // Record audit log for Intent actions (Accessibility commands log inside executeAccessibilityCommand)
    const isIntentAction = ['open_app', 'launch_app', 'search_google', 'google_search', 'search_youtube', 'youtube_search', 'open_website', 'open_url', 'open_whatsapp', 'whatsapp', 'open_camera', 'camera', 'call', 'call_phone', 'make_call', 'dial', 'toggle_torch', 'torch', 'flashlight'].includes(action);
    if (isIntentAction) {
      this.addAuditLog({
        action,
        target,
        text,
        status: (result && result.success !== false) ? 'SUCCESS' : 'FAILED',
        message: result ? (result.message || '') : '',
        app: 'SystemLauncher'
      });
    }

    // Refresh audit logs UI if settings is active
    if (window.settingsManager && typeof window.settingsManager.renderPhoneControlLogs === 'function') {
      window.settingsManager.renderPhoneControlLogs();
    }

    return result;
  }

  _getActionAnnouncement(action, target, text) {
    switch (action) {
      case 'open_app': return target ? `${target} खोला जा रहा है...` : 'ऐप खोला जा रहा है...';
      case 'search_google': return `गूगल पर "${target || text}" खोजा जा रहा है...`;
      case 'search_youtube': return `यूट्यूब पर "${target || text}" खोजा जा रहा है...`;
      case 'open_website': return `वेबसाइट खोली जा रही है: ${target}`;
      case 'open_whatsapp': return 'व्हाट्सएप खोला जा रहा है...';
      case 'open_camera': return 'कैमरा खोला जा रहा है...';
      case 'toggle_torch': return (target === 'off' || target === 'band') ? 'टॉर्च बंद की जा रही है...' : 'टॉर्च चालू की जा रही है...';
      case 'back': return 'पीछे जा रहे हैं...';
      case 'home': return 'होम स्क्रीन पर जा रहे हैं...';
      case 'recents': return 'हालिया ऐप्स खोले जा रहे हैं...';
      case 'scroll_down': return 'नीचे स्क्रॉल किया जा रहा है...';
      case 'scroll_up': return 'ऊपर स्क्रॉल किया जा रहा है...';
      case 'click_text': return `"${target}" पर क्लिक किया जा रहा है...`;
      case 'type_text': return `"${text || target}" टाइप किया जा रहा है...`;
      case 'read_screen': return 'स्क्रीन पढ़ी जा रही है...';
      case 'stop_all': return 'सभी क्रियाएं रोकी जा रही हैं...';
      default: return `कार्रवाई की जा रही है: ${action}`;
    }
  }

  // Speak using native Android TTS if available
  async speakText({ text, lang = 'hi', pitch = 1.25, rate = 0.98 }) {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.speakText) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.speakText({ text, lang, pitch, rate });
      } catch (e) {
        console.warn('Native speakText failed:', e);
      }
    }
    return null;
  }

  // Stop native Android TTS playback
  async stopSpeech() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.stopSpeech) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.stopSpeech();
      } catch (e) {}
    }
    return null;
  }

  // Check if Accessibility Service is enabled & active
  async isAccessibilityEnabled() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.isAccessibilityServiceEnabled) {
      try {
        const res = await window.Capacitor.Plugins.SystemLauncher.isAccessibilityServiceEnabled();
        return Boolean(res && (res.running || res.isRunning || res.enabled));
      } catch (e) {
        console.warn('isAccessibilityServiceEnabled error:', e);
      }
    }
    // Web fallback simulator flag
    return Boolean(window._mockAccessibilityServiceEnabled);
  }

  // Query detailed Accessibility Service status (returns { running, isRunning, enabled, isConfigured })
  async checkAccessibilityStatus() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher) {
      try {
        const fn = window.Capacitor.Plugins.SystemLauncher.checkAccessibilityStatus ||
                   window.Capacitor.Plugins.SystemLauncher.isAccessibilityServiceEnabled;
        if (fn) {
          const res = await fn.call(window.Capacitor.Plugins.SystemLauncher);
          return {
            running: Boolean(res && (res.running || res.isRunning)),
            isRunning: Boolean(res && (res.running || res.isRunning)),
            enabled: Boolean(res && (res.enabled || res.running || res.isRunning)),
            isConfigured: Boolean(res && res.isConfigured)
          };
        }
      } catch (e) {
        console.warn('checkAccessibilityStatus error:', e);
      }
    }
    const mock = Boolean(window._mockAccessibilityServiceEnabled);
    return { running: mock, isRunning: mock, enabled: mock, isConfigured: mock };
  }

  // Query in-app Accessibility diagnostics, last disconnect time, reason & error logs
  async getAccessibilityDiagnostics() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.getAccessibilityDiagnostics) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.getAccessibilityDiagnostics();
      } catch (e) {
        console.warn('getAccessibilityDiagnostics error:', e);
      }
    }
    const mockRunning = Boolean(window._mockAccessibilityServiceEnabled);
    let mockLogs = [];
    try {
      mockLogs = JSON.parse(localStorage.getItem('jarvis_mock_error_logs') || '[]');
    } catch (e) {}
    return {
      isRunning: mockRunning,
      running: mockRunning,
      status: mockRunning ? 'RUNNING' : 'STOPPED',
      lastConnectedTime: localStorage.getItem('jarvis_mock_last_connected') || 'कदापि नहीं (Never)',
      lastDisconnectedTime: localStorage.getItem('jarvis_mock_last_disconnected') || 'कोई रिकॉर्ड नहीं',
      disconnectReason: mockRunning ? 'सक्रिय व सामान्य' : (localStorage.getItem('jarvis_mock_disconnect_reason') || 'सर्विस अभी बंद है।'),
      errorLogs: mockLogs
    };
  }

  // Clear in-app error logs
  async clearAccessibilityLogs() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.clearAccessibilityLogs) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.clearAccessibilityLogs();
      } catch (e) {
        console.warn('clearAccessibilityLogs error:', e);
      }
    }
    try {
      localStorage.setItem('jarvis_mock_error_logs', '[]');
      localStorage.setItem('jarvis_mock_disconnect_reason', 'लॉग्स साफ़ कर दिए गए');
    } catch (e) {}
    return { success: true };
  }

  // Open Android Battery Optimization Settings
  async openBatteryOptimizationSettings() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openBatteryOptimizationSettings) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openBatteryOptimizationSettings();
      } catch (e) {
        console.warn('openBatteryOptimizationSettings error:', e);
      }
    }
    if (window.app) window.app.showToast('🔋 Android Settings → Apps → Battery → "No Restrictions" चुनें');
    return { success: false, message: 'Platform not native or intent failed' };
  }

  // Open OEM Autostart Settings (Xiaomi/Redmi/Realme/Oppo/Vivo)
  async openAutostartSettings() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openAutostartSettings) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openAutostartSettings();
      } catch (e) {
        console.warn('openAutostartSettings error:', e);
      }
    }
    if (window.app) window.app.showToast('🚀 Security ऐप ➔ Permissions ➔ Autostart चालू करें');
    return { success: false, message: 'Platform not native or intent failed' };
  }

  // Open Android App Info Settings (to allow restricted settings on Android 13/14/15)
  async openAppInfoSettings() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openAppInfoSettings) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openAppInfoSettings();
      } catch (e) {
        console.warn('openAppInfoSettings error:', e);
      }
    }
    if (window.app) window.app.showToast('ℹ️ Android Settings → Apps → AI Girlfriend Mobile खोलें');
    return { success: false, message: 'Platform not native or intent failed' };
  }

  // Open Android Accessibility Settings
  async openAccessibilitySettings() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.openAccessibilitySettings) {
      try {
        return await window.Capacitor.Plugins.SystemLauncher.openAccessibilitySettings();
      } catch (e) {
        console.warn('openAccessibilitySettings error:', e);
      }
    }
    if (window.app) window.app.showToast('Please open Android Settings → Accessibility → J.A.R.V.I.S.');
    return { success: false, message: 'Platform not native or intent failed' };
  }

  // Execute Accessibility automation action (back, home, scroll, click, type, youtube, etc.)
  async executeAccessibilityCommand({ action, target = '', text = '' }) {
    if (!action) return { success: false, message: 'Action required' };

    // Master Switch Check
    if (typeof localStorage !== 'undefined' && localStorage.getItem('jarvis_phone_control') !== 'true') {
      return { success: false, blocked: true, message: 'फ़ोन कंट्रोल बंद है। पहले Settings में Enable Phone Control चालू करें।' };
    }

    let res = null;
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.executeAccessibilityCommand) {
      try {
        res = await window.Capacitor.Plugins.SystemLauncher.executeAccessibilityCommand({ action, target, text });
      } catch (e) {
        res = { success: false, message: 'Native command failed: ' + e.message };
      }
    } else {
      // Browser / Mock environment fallback
      res = {
        success: true,
        message: `[Simulated] Performed action: ${action} ${target ? 'on "' + target + '"' : ''} ${text ? 'typed "' + text + '"' : ''}`.trim(),
        app: 'com.jarvis.ai'
      };
    }

    this.addAuditLog({
      action,
      target,
      text,
      status: res && res.success ? 'SUCCESS' : 'FAILED',
      message: res ? (res.message || res.reason || '') : '',
      app: res ? (res.app || 'Unknown') : 'Unknown'
    });

    return res;
  }

  // Read screen text (user explicit only, non-sensitive)
  async readScreenContent(userExplicit = true) {
    if (!userExplicit) {
      return { success: false, message: 'Screen reading requires explicit user command' };
    }

    // Master Switch Check
    if (typeof localStorage !== 'undefined' && localStorage.getItem('jarvis_phone_control') !== 'true') {
      return { success: false, blocked: true, message: 'फ़ोन कंट्रोल बंद है। स्क्रीन पढ़ने के लिए Settings में Enable Phone Control चालू करें।' };
    }

    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.readScreenContent) {
      try {
        const res = await window.Capacitor.Plugins.SystemLauncher.readScreenContent({ userExplicit: true });
        this.addAuditLog({
          action: 'read_screen',
          target: 'active_window',
          status: res && res.success ? 'SUCCESS' : 'BLOCKED/FAILED',
          message: res ? (res.text || res.reason || '') : '',
          app: res ? (res.app || 'Unknown') : 'Unknown'
        });
        return res;
      } catch (e) {
        return { success: false, message: 'Failed to read screen: ' + e.message };
      }
    }

    // Web mock response
    return {
      success: true,
      text: 'यह स्क्रीन का पूर्वावलोकन है। J.A.R.V.I.S. ऐप चालू है और सभी सिस्टम सामान्य हैं।',
      app: 'com.jarvis.ai'
    };
  }

  // Emergency stop all ongoing actions
  async stopAllAccessibilityActions() {
    if (this.isNative && window.Capacitor.Plugins.SystemLauncher && window.Capacitor.Plugins.SystemLauncher.stopAllAccessibilityActions) {
      try {
        await window.Capacitor.Plugins.SystemLauncher.stopAllAccessibilityActions();
      } catch (e) {}
    }
    this.addAuditLog({
      action: 'stop_all',
      target: 'emergency',
      status: 'STOPPED',
      message: 'User triggered Emergency Stop All',
      app: 'com.jarvis.ai'
    });
    if (window.app) window.app.showToast('🛑 Emergency Stop: All actions halted!');
    return { success: true };
  }

  // --- AUDIT LOGS PERSISTENCE ---
  getAuditLogs() {
    try {
      const raw = localStorage.getItem('phone_control_audit_logs');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  addAuditLog(entry) {
    try {
      const logs = this.getAuditLogs();
      const newEntry = {
        id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: entry.action || '',
        target: entry.target || '',
        text: entry.text || '',
        status: entry.status || 'SUCCESS',
        message: entry.message || '',
        app: entry.app || 'System'
      };
      logs.unshift(newEntry);
      // Keep up to 50 latest logs
      if (logs.length > 50) logs.length = 50;
      localStorage.setItem('phone_control_audit_logs', JSON.stringify(logs));
      return newEntry;
    } catch (e) {
      return null;
    }
  }

  clearAuditLogs() {
    try {
      localStorage.removeItem('phone_control_audit_logs');
    } catch (e) {}
  }
}

window.systemLauncher = new SystemLauncher();

