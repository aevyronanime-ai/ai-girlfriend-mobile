package com.jarvis.ai;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.speech.tts.TextToSpeech;
import java.util.Locale;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import android.hardware.camera2.CameraManager;
import android.os.Build;
import android.provider.MediaStore;

@CapacitorPlugin(name = "SystemLauncher")
public class SystemLauncherPlugin extends Plugin {

    /**
     * Open Google Chrome directly to a URL (or home)
     */
    @PluginMethod
    public void openChrome(PluginCall call) {
        String url = call.getString("url", "https://www.google.com");
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.setPackage("com.android.chrome");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Opened in Google Chrome");
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            // Fallback to default browser if Chrome is not installed
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Chrome not found, opened in default browser");
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Failed to open browser: " + ex.getMessage());
            }
        }
    }

    /**
     * Search Google for a query
     */
    @PluginMethod
    public void searchGoogle(PluginCall call) {
        String query = call.getString("query", "");
        if (query.trim().isEmpty()) {
            call.reject("Search query cannot be empty");
            return;
        }

        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
            String searchUrl = "https://www.google.com/search?q=" + encodedQuery;

            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(searchUrl));
            intent.setPackage("com.android.chrome");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("query", query);
            ret.put("message", "Searching Google for: " + query);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            // Fallback
            try {
                String searchUrl = "https://www.google.com/search?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(searchUrl));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("query", query);
                ret.put("message", "Searching Google in default browser");
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Error searching Google: " + ex.getMessage());
            }
        } catch (Exception ex) {
            call.reject("Error encoding search query: " + ex.getMessage());
        }
    }

    /**
     * Open YouTube app (or YouTube search)
     */
    @PluginMethod
    public void openYouTube(PluginCall call) {
        String query = call.getString("query", "").trim();

        try {
            Intent intent;
            if (!query.isEmpty()) {
                String searchUrl = "https://www.youtube.com/results?search_query=" + URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse(searchUrl));
            } else {
                intent = getContext().getPackageManager().getLaunchIntentForPackage("com.google.android.youtube");
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com"));
                }
            }

            intent.setPackage("com.google.android.youtube");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", query.isEmpty() ? "Opened YouTube" : "Searching YouTube for: " + query);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            // Fallback to web browser YouTube
            try {
                String fallbackUrl = query.isEmpty()
                    ? "https://www.youtube.com"
                    : "https://www.youtube.com/results?search_query=" + URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "YouTube app not found, opened in browser");
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Failed to open YouTube: " + ex.getMessage());
            }
        } catch (Exception ex) {
            call.reject("Failed to open YouTube: " + ex.getMessage());
        }
    }

    /**
     * Open arbitrary website URL in default browser
     */
    @PluginMethod
    public void openWebsite(PluginCall call) {
        String url = call.getString("url", "").trim();
        if (url.isEmpty()) {
            call.reject("URL missing");
            return;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "वेबसाइट खोली जा रही है: " + url);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("वेबसाइट नहीं खुली: " + e.getMessage());
        }
    }

    /**
     * Open WhatsApp directly with optional text or recipient phone
     */
    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String text = call.getString("text", "").trim();
        String phone = call.getString("phone", "").trim();
        try {
            Intent intent;
            if (!phone.isEmpty() || !text.isEmpty()) {
                String cleanPhone = phone.replaceAll("[^0-9+]", "");
                Uri uri = Uri.parse("https://api.whatsapp.com/send?phone=" + URLEncoder.encode(cleanPhone, StandardCharsets.UTF_8.toString()) + "&text=" + URLEncoder.encode(text, StandardCharsets.UTF_8.toString()));
                intent = new Intent(Intent.ACTION_VIEW, uri);
            } else {
                intent = getContext().getPackageManager().getLaunchIntentForPackage("com.whatsapp");
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://api.whatsapp.com/"));
                }
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "WhatsApp खोला जा रहा है...");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("WhatsApp नहीं खुल सका: " + e.getMessage());
        }
    }

    /**
     * Open device camera
     */
    @PluginMethod
    public void openCamera(PluginCall call) {
        try {
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "कैमरा खोला जा रहा है...");
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent("android.media.action.STILL_IMAGE_CAMERA");
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "कैमरा खोला जा रहा है...");
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("कैमरा नहीं खुल सका: " + ex.getMessage());
            }
        }
    }

    /**
     * Toggle flashlight / torch
     */
    @PluginMethod
    public void toggleTorch(PluginCall call) {
        boolean enable = call.getBoolean("enabled", true);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                CameraManager camManager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
                if (camManager != null) {
                    String[] ids = camManager.getCameraIdList();
                    if (ids != null && ids.length > 0) {
                        camManager.setTorchMode(ids[0], enable);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("enabled", enable);
                        ret.put("message", enable ? "टॉर्च चालू कर दी गई है।" : "टॉर्च बंद कर दी गई है।");
                        call.resolve(ret);
                        return;
                    }
                }
            }
            call.reject("Torch feature not supported on this device");
        } catch (Exception e) {
            call.reject("टॉर्च एरर: " + e.getMessage());
        }
    }

    /**
     * Launch application by name or package
     */
    @PluginMethod
    public void openApp(PluginCall call) {
        String packageName = call.getString("package", "").trim();
        String appName = call.getString("name", "").trim().toLowerCase(Locale.ROOT);

        if (packageName.isEmpty() && !appName.isEmpty()) {
            if (appName.contains("youtube") || appName.contains("यूट्यूब")) packageName = "com.google.android.youtube";
            else if (appName.contains("chrome") || appName.contains("क्रोम")) packageName = "com.android.chrome";
            else if (appName.contains("whatsapp") || appName.contains("व्हाट्सएप")) packageName = "com.whatsapp";
            else if (appName.contains("camera") || appName.contains("कैमरा")) {
                openCamera(call);
                return;
            }
        }

        if (packageName.isEmpty()) {
            call.reject("Package name or supported app name required");
            return;
        }

        try {
            Intent intent = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "ऐप खोला जा रहा है: " + packageName);
                call.resolve(ret);
            } else {
                call.reject("ऐप इंस्टॉल नहीं है: " + packageName);
            }
        } catch (Exception e) {
            call.reject("ऐप खोलने में त्रुटि: " + e.getMessage());
        }
    }

    private TextToSpeech tts;
    private boolean ttsReady = false;

    private void ensureTts() {
        if (tts == null) {
            try {
                tts = new TextToSpeech(getContext(), status -> {
                    if (status == TextToSpeech.SUCCESS) {
                        ttsReady = true;
                    }
                });
            } catch (Exception e) {
                ttsReady = false;
            }
        }
    }

    /**
     * Speak text using Android Native TextToSpeech engine
     */
    @PluginMethod
    public void speakText(PluginCall call) {
        String text = call.getString("text", "").trim();
        String lang = call.getString("lang", "hi");
        float pitch = call.getFloat("pitch", 1.25f);
        float rate = call.getFloat("rate", 0.98f);

        if (text.isEmpty()) {
            call.resolve();
            return;
        }

        ensureTts();

        if (tts != null) {
            try {
                Locale locale = lang.startsWith("hi") ? new Locale("hi", "IN") : Locale.US;
                tts.setLanguage(locale);
                tts.setPitch(pitch);
                tts.setSpeechRate(rate);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "jarvis_native_" + System.currentTimeMillis());

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Speaking text natively");
                call.resolve(ret);
                return;
            } catch (Exception e) {
                call.reject("TTS Speak failed: " + e.getMessage());
                return;
            }
        }
        call.reject("Android TextToSpeech not initialized");
    }

    /**
     * Stop Android Native TextToSpeech playback
     */
    @PluginMethod
    public void stopSpeech(PluginCall call) {
        if (tts != null) {
            try {
                tts.stop();
            } catch (Exception ignored) {}
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    /**
     * Check if JarvisAccessibilityService is enabled & active
     */
    @PluginMethod
    public void isAccessibilityServiceEnabled(PluginCall call) {
        boolean isRunning = JarvisAccessibilityService.isRunning();
        boolean isConfigured = false;

        try {
            String enabledServices = android.provider.Settings.Secure.getString(
                getContext().getContentResolver(),
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            if (enabledServices != null && enabledServices.contains(getContext().getPackageName())) {
                isConfigured = true;
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("running", isRunning);
        ret.put("enabled", isRunning || isConfigured);
        call.resolve(ret);
    }

    /**
     * Open Android Accessibility Settings so user can enable Jarvis
     */
    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Opened Accessibility Settings");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open Accessibility Settings: " + e.getMessage());
        }
    }

    /**
     * Execute Accessibility automation action (back, home, scroll, click, type, youtube, etc.)
     */
    @PluginMethod
    public void executeAccessibilityCommand(PluginCall call) {
        if (!JarvisAccessibilityService.isRunning()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", "Accessibility Service चालू नहीं है। कृपया Settings में जाकर इसे ON करें।");
            call.resolve(ret);
            return;
        }

        String action = call.getString("action", "");
        String target = call.getString("target", "");
        String text = call.getString("text", "");

        JarvisAccessibilityService.getInstance().executeCommand(action, target, text, (success, message, app) -> {
            JSObject ret = new JSObject();
            ret.put("success", success);
            ret.put("message", message);
            ret.put("app", app);
            call.resolve(ret);
        });
    }

    /**
     * Read current screen content (user explicit only, non-sensitive)
     */
    @PluginMethod
    public void readScreenContent(PluginCall call) {
        if (!JarvisAccessibilityService.isRunning()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", "Accessibility Service चालू नहीं है।");
            call.resolve(ret);
            return;
        }

        boolean userExplicit = call.getBoolean("userExplicit", true);
        JarvisAccessibilityService.getInstance().readScreenText(userExplicit, (success, message, app) -> {
            JSObject ret = new JSObject();
            ret.put("success", success);
            ret.put("text", message);
            ret.put("app", app);
            call.resolve(ret);
        });
    }

    /**
     * Stop all ongoing actions immediately
     */
    @PluginMethod
    public void stopAllAccessibilityActions(PluginCall call) {
        if (JarvisAccessibilityService.isRunning()) {
            JarvisAccessibilityService.getInstance().stopAll();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "All actions stopped");
        call.resolve(ret);
    }
}
