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
}

window.systemLauncher = new SystemLauncher();

