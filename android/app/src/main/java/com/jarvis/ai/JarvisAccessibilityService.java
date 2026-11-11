package com.jarvis.ai;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Path;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import android.content.SharedPreferences;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

public class JarvisAccessibilityService extends AccessibilityService {

    private static final String TAG = "JarvisAccessibility";
    private static JarvisAccessibilityService sInstance;

    public static final String ACTION_STOP_SERVICE = "com.jarvis.ai.ACTION_STOP_SERVICE";
    private static final int NOTIFICATION_ID = 9001;
    private static final String CHANNEL_ID = "jarvis_phone_control_channel";

    private static final String PREF_NAME = "jarvis_accessibility_state";
    private static final String KEY_STATUS = "service_status";
    private static final String KEY_LAST_CONNECTED = "last_connected_time";
    private static final String KEY_LAST_DISCONNECTED = "last_disconnected_time";
    private static final String KEY_DISCONNECT_REASON = "disconnect_reason";
    private static final String KEY_ERROR_LOGS = "error_logs";

    private String currentPackageName = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean isProcessing = new AtomicBoolean(false);

    // Security: High-risk Banking, UPI, and Payment App Packages
    private static final Set<String> SENSITIVE_PACKAGES = new HashSet<>(Arrays.asList(
        "net.one97.paytm",
        "com.google.android.apps.nbu.paisa.user", // Google Pay
        "com.phonepe.app",                       // PhonePe
        "in.org.npci.upiapp",                    // BHIM
        "com.sbi.lotusintouch",                  // YONO SBI
        "com.csam.icici.bank.imobile",           // iMobile
        "com.hdfc.mbank",                        // HDFC MobileBanking
        "com.axis.mobile",                       // Axis Mobile
        "com.msf.koko",                          // Kotak 811
        "com.zerodha.kite3",                     // Zerodha Kite
        "com.nextbillion.groww",                 // Groww
        "com.dreamplug.androidapp",              // CRED
        "com.binance.dev",
        "com.coinbase.android"
    ));

    public static JarvisAccessibilityService getInstance() {
        return sInstance;
    }

    public static boolean isRunning() {
        return sInstance != null;
    }

    public static synchronized void recordState(Context ctx, String status, String reason) {
        if (ctx == null) return;
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(KEY_STATUS, status);
            String now = new SimpleDateFormat("dd MMM yyyy, hh:mm:ss a", Locale.getDefault()).format(new Date());
            if ("RUNNING".equals(status)) {
                editor.putString(KEY_LAST_CONNECTED, now);
            } else {
                editor.putString(KEY_LAST_DISCONNECTED, now);
            }
            if (reason != null && !reason.isEmpty()) {
                editor.putString(KEY_DISCONNECT_REASON, reason);
            }
            editor.apply();
        } catch (Throwable ignored) {}
    }

    public static synchronized void recordError(Context ctx, String method, Throwable t) {
        if (ctx == null) return;
        try {
            String msg = (t != null && t.getMessage() != null) ? t.getMessage() : (t != null ? t.getClass().getSimpleName() : "Unknown error");
            Log.e(TAG, "Error in " + method + ": " + msg, t);

            SharedPreferences prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String existingLogsJson = prefs.getString(KEY_ERROR_LOGS, "[]");
            JSONArray logs = new JSONArray(existingLogsJson);

            JSONObject logEntry = new JSONObject();
            logEntry.put("timestamp", new SimpleDateFormat("dd MMM, hh:mm:ss a", Locale.getDefault()).format(new Date()));
            logEntry.put("method", method);
            logEntry.put("message", msg);

            // Maintain circular buffer of 25 latest error entries
            JSONArray newLogs = new JSONArray();
            newLogs.put(logEntry);
            for (int i = 0; i < logs.length() && i < 24; i++) {
                newLogs.put(logs.get(i));
            }

            prefs.edit().putString(KEY_ERROR_LOGS, newLogs.toString()).apply();
        } catch (Throwable ignored) {}
    }

    public static synchronized JSONObject getDiagnostics(Context ctx) {
        JSONObject obj = new JSONObject();
        try {
            boolean running = isRunning();
            obj.put("isRunning", running);
            obj.put("running", running);

            if (ctx != null) {
                SharedPreferences prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
                obj.put("status", running ? "RUNNING" : prefs.getString(KEY_STATUS, "STOPPED"));
                obj.put("lastConnectedTime", prefs.getString(KEY_LAST_CONNECTED, "कदापि नहीं (Never)"));
                obj.put("lastDisconnectedTime", prefs.getString(KEY_LAST_DISCONNECTED, "कोई रिकॉर्ड नहीं"));
                obj.put("disconnectReason", prefs.getString(KEY_DISCONNECT_REASON, running ? "सक्रिय व सामान्य" : "सर्विस बंद है"));
                obj.put("errorLogs", new JSONArray(prefs.getString(KEY_ERROR_LOGS, "[]")));

                boolean isConfigured = false;
                try {
                    String enabledServices = android.provider.Settings.Secure.getString(
                        ctx.getContentResolver(),
                        android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                    );
                    if (enabledServices != null && enabledServices.contains(ctx.getPackageName())) {
                        isConfigured = true;
                    }
                } catch (Throwable ignored) {}
                obj.put("isConfigured", isConfigured);
            }
        } catch (Throwable t) {
            try { obj.put("error", t.getMessage()); } catch (Throwable ignored) {}
        }
        return obj;
    }

    public static synchronized void clearLogs(Context ctx) {
        if (ctx == null) return;
        try {
            ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
               .edit()
               .putString(KEY_ERROR_LOGS, "[]")
               .putString(KEY_DISCONNECT_REASON, "लॉग्स साफ़ कर दिए गए")
               .apply();
        } catch (Throwable ignored) {}
    }

    @Override
    public void onCreate() {
        try {
            super.onCreate();
            sInstance = this;
            Log.i(TAG, "JarvisAccessibilityService created");
            recordState(this, "CREATED", "सर्विस शुरू हुई (Created)");
        } catch (Throwable t) {
            recordError(this, "onCreate", t);
        }
    }

    @Override
    protected void onServiceConnected() {
        try {
            super.onServiceConnected();
            sInstance = this;
            Log.i(TAG, "JarvisAccessibilityService connected");
            recordState(this, "RUNNING", "सर्विस सफलतापूर्वक चालू (Connected) हुई");
            try {
                showControlNotification();
            } catch (Throwable e) {
                recordError(this, "showControlNotification", e);
            }
            showToast("J.A.R.V.I.S. Phone Control सर्विस चालू हो गई है");
        } catch (Throwable ex) {
            recordError(this, "onServiceConnected", ex);
        }
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        try {
            CharSequence pkg = event.getPackageName();
            if (pkg != null) {
                currentPackageName = pkg.toString();
            }
        } catch (Throwable ex) {
            recordError(this, "onAccessibilityEvent", ex);
        }
    }

    @Override
    public void onInterrupt() {
        try {
            Log.w(TAG, "JarvisAccessibilityService interrupted");
            isProcessing.set(false);
            recordState(this, "INTERRUPTED", "Android सिस्टम द्वारा सर्विस में बाधा (Interrupted) उत्पन्न की गई");
        } catch (Throwable t) {
            recordError(this, "onInterrupt", t);
        }
    }

    @Override
    public boolean onUnbind(Intent intent) {
        try {
            sInstance = null;
            removeControlNotification();
            Log.i(TAG, "JarvisAccessibilityService unbound");
            recordState(this, "STOPPED", "Android OS द्वारा unbind किया गया (RAM या बैटरी सेवर द्वारा प्रोसेस बंद)");
        } catch (Throwable t) {
            recordError(this, "onUnbind", t);
        }
        try {
            return super.onUnbind(intent);
        } catch (Throwable t) {
            recordError(this, "onUnbindSuper", t);
            return false;
        }
    }

    @Override
    public void onDestroy() {
        try {
            sInstance = null;
            removeControlNotification();
            Log.i(TAG, "JarvisAccessibilityService destroyed");
            recordState(this, "STOPPED", "सर्विस नष्ट (Destroyed) हुई");
        } catch (Throwable t) {
            recordError(this, "onDestroy", t);
        }
        try {
            super.onDestroy();
        } catch (Throwable t) {
            recordError(this, "onDestroySuper", t);
        }
    }

    public String getCurrentPackageName() {
        return currentPackageName;
    }

    // --- SECURITY & PRIVACY CHECKS ---
    public boolean isCurrentAppSensitive() {
        if (currentPackageName == null || currentPackageName.isEmpty()) return false;
        String lower = currentPackageName.toLowerCase(Locale.ROOT);
        if (SENSITIVE_PACKAGES.contains(lower)) return true;
        return lower.contains("bank") || lower.contains("paytm") || lower.contains("phonepe")
            || lower.contains("gpay") || lower.contains("bhim") || lower.contains("wallet")
            || lower.contains("crypto") || lower.contains("binance") || lower.contains("upiapp");
    }

    private boolean isPasswordOrPinNode(AccessibilityNodeInfo node) {
        if (node == null) return false;
        if (node.isPassword()) return true;
        String viewId = node.getViewIdResourceName();
        if (viewId != null) {
            String lower = viewId.toLowerCase(Locale.ROOT);
            if (lower.contains("password") || lower.contains("pin") || lower.contains("cvv") || lower.contains("otp")) {
                return true;
            }
        }
        CharSequence hint = node.getHintText();
        if (hint != null) {
            String lowerHint = hint.toString().toLowerCase(Locale.ROOT);
            if (lowerHint.contains("password") || lowerHint.contains("pin") || lowerHint.contains("cvv") || lowerHint.contains("otp") || lowerHint.contains("पासवर्ड") || lowerHint.contains("पिन")) {
                return true;
            }
        }
        CharSequence desc = node.getContentDescription();
        if (desc != null) {
            String lowerDesc = desc.toString().toLowerCase(Locale.ROOT);
            if (lowerDesc.contains("password") || lowerDesc.contains("pin") || lowerDesc.contains("cvv") || lowerDesc.contains("otp") || lowerDesc.contains("पासवर्ड") || lowerDesc.contains("पिन")) {
                return true;
            }
        }
        return false;
    }

    // --- ACTION EXECUTOR ---
    public interface ActionCallback {
        void onResult(boolean success, String message, String currentApp);
    }

    public void executeCommand(String action, String target, String text, ActionCallback callback) {
        if (action == null) {
            if (callback != null) callback.onResult(false, "अमान्य कमांड (Action cannot be null)", currentPackageName);
            return;
        }

        // Security check for banking/UPI apps
        if (isCurrentAppSensitive() && !"back".equalsIgnoreCase(action) && !"home".equalsIgnoreCase(action)) {
            String warning = "⚠️ सुरक्षा प्रतिबंध: बैंकिंग/UPI/पेमेंट ऐप में स्वचालित एक्शन ब्लॉक है।";
            showToast(warning);
            if (callback != null) callback.onResult(false, warning, currentPackageName);
            return;
        }

        // Execute action with one automatic retry if needed
        executeActionInternal(action, target, text, (success, message, app) -> {
            if (success) {
                if (callback != null) callback.onResult(true, message, app);
            } else {
                // Retry once after 400ms delay
                mainHandler.postDelayed(() -> {
                    executeActionInternal(action, target, text, (retrySuccess, retryMsg, retryApp) -> {
                        if (callback != null) callback.onResult(retrySuccess, retryMsg, retryApp);
                    });
                }, 400);
            }
        });
    }

    private void executeActionInternal(String action, String target, String text, ActionCallback callback) {
        switch (action.toLowerCase(Locale.ROOT)) {
            case "back":
            case "go_back": {
                boolean ok = performGlobalAction(GLOBAL_ACTION_BACK);
                if (callback != null) callback.onResult(ok, ok ? "पीछे चले गए (Back)" : "Back एक्शन असफल रहा", currentPackageName);
                break;
            }
            case "home":
            case "go_home": {
                boolean ok = performGlobalAction(GLOBAL_ACTION_HOME);
                if (callback != null) callback.onResult(ok, ok ? "होम स्क्रीन पर चले गए (Home)" : "Home एक्शन असफल रहा", currentPackageName);
                break;
            }
            case "recents":
            case "recent_apps": {
                boolean ok = performGlobalAction(GLOBAL_ACTION_RECENTS);
                if (callback != null) callback.onResult(ok, ok ? "हालिया ऐप्स दिखाए (Recents)" : "Recents एक्शन असफल रहा", currentPackageName);
                break;
            }
            case "notifications":
            case "open_notifications": {
                boolean ok = performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS);
                if (callback != null) callback.onResult(ok, ok ? "नोटिफिकेशन शेड खोला गया" : "नोटिफिकेशन खोलना असफल रहा", currentPackageName);
                break;
            }
            case "scroll_down":
            case "scroll_forward": {
                performScroll(true, callback);
                break;
            }
            case "scroll_up":
            case "scroll_backward": {
                performScroll(false, callback);
                break;
            }
            case "click_text":
            case "tap_text": {
                clickByText(target, callback);
                break;
            }
            case "type_text":
            case "set_text": {
                typeText(text != null ? text : target, callback);
                break;
            }
            case "youtube_first":
            case "youtube_play_first": {
                controlYouTube("play_first", callback);
                break;
            }
            case "youtube_next": {
                controlYouTube("next", callback);
                break;
            }
            case "youtube_toggle":
            case "youtube_pause":
            case "youtube_play": {
                controlYouTube("toggle_play", callback);
                break;
            }
            case "read_screen":
            case "screen_summary": {
                readScreenText(true, callback);
                break;
            }
            case "stop":
            case "stop_all": {
                stopAll();
                if (callback != null) callback.onResult(true, "सभी जेस्चर व क्रियाएं रोक दी गईं", currentPackageName);
                break;
            }
            default: {
                if (callback != null) callback.onResult(false, "अज्ञात एक्शन: " + action, currentPackageName);
                break;
            }
        }
    }

    // --- SCROLL ACTION ---
    private void performScroll(boolean down, ActionCallback callback) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root != null) {
            AccessibilityNodeInfo scrollable = findScrollableNode(root);
            if (scrollable != null) {
                boolean success = scrollable.performAction(down ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
                scrollable.recycle();
                root.recycle();
                if (success) {
                    if (callback != null) callback.onResult(true, down ? "नीचे स्क्रॉल किया" : "ऊपर स्क्रॉल किया", currentPackageName);
                    return;
                }
            }
            root.recycle();
        }

        // Gesture swipe fallback
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int width = dm.widthPixels;
        int height = dm.heightPixels;

        float startX = width * 0.5f;
        float startY = down ? height * 0.75f : height * 0.25f;
        float endY = down ? height * 0.25f : height * 0.75f;

        Path path = new Path();
        path.moveTo(startX, startY);
        path.lineTo(startX, endY);

        GestureDescription.Builder builder = new GestureDescription.Builder();
        builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 350));

        dispatchGesture(builder.build(), new GestureResultCallback() {
            @Override
            public void onCompleted(GestureDescription gestureDescription) {
                if (callback != null) callback.onResult(true, down ? "स्वाइप करके नीचे स्क्रॉल किया" : "स्वाइप करके ऊपर स्क्रॉल किया", currentPackageName);
            }

            @Override
            public void onCancelled(GestureDescription gestureDescription) {
                if (callback != null) callback.onResult(false, "स्क्रॉल स्वाइप रद्द हो गया", currentPackageName);
            }
        }, null);
    }

    private AccessibilityNodeInfo findScrollableNode(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isScrollable()) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo result = findScrollableNode(child);
            if (result != null) return result;
        }
        return null;
    }

    // --- CLICK BY TEXT ---
    private void clickByText(String targetText, ActionCallback callback) {
        if (targetText == null || targetText.trim().isEmpty()) {
            if (callback != null) callback.onResult(false, "क्लिक करने के लिए टेक्स्ट का नाम आवश्यक है", currentPackageName);
            return;
        }

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) {
            if (callback != null) callback.onResult(false, "सक्रिय स्क्रीन नहीं मिल सकी", currentPackageName);
            return;
        }

        AccessibilityNodeInfo matchedNode = searchNodeByText(root, targetText.trim().toLowerCase(Locale.ROOT));
        if (matchedNode != null) {
            // Find clickable ancestor or the node itself
            AccessibilityNodeInfo clickableNode = matchedNode;
            while (clickableNode != null && !clickableNode.isClickable()) {
                clickableNode = clickableNode.getParent();
            }

            if (clickableNode != null && clickableNode.isClickable()) {
                boolean ok = clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                matchedNode.recycle();
                root.recycle();
                if (callback != null) callback.onResult(ok, ok ? "'" + targetText + "' पर क्लिक किया" : "क्लिक एक्शन निष्पादित नहीं हो सका", currentPackageName);
                return;
            }

            // Fallback: Click at coordinate bounds of node via Gesture
            Rect bounds = new Rect();
            matchedNode.getBoundsInScreen(bounds);
            matchedNode.recycle();
            root.recycle();

            if (!bounds.isEmpty()) {
                clickCoordinates(bounds.centerX(), bounds.centerY(), targetText, callback);
                return;
            }
        }

        root.recycle();
        if (callback != null) callback.onResult(false, "स्क्रीन पर '" + targetText + "' नहीं मिला", currentPackageName);
    }

    private AccessibilityNodeInfo searchNodeByText(AccessibilityNodeInfo node, String lowerTarget) {
        if (node == null) return null;
        if (isPasswordOrPinNode(node)) return null; // Never touch password nodes

        CharSequence text = node.getText();
        CharSequence desc = node.getContentDescription();

        if (text != null && text.toString().toLowerCase(Locale.ROOT).contains(lowerTarget)) {
            return node;
        }
        if (desc != null && desc.toString().toLowerCase(Locale.ROOT).contains(lowerTarget)) {
            return node;
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo found = searchNodeByText(child, lowerTarget);
            if (found != null) return found;
        }
        return null;
    }

    private void clickCoordinates(float x, float y, String label, ActionCallback callback) {
        Path path = new Path();
        path.moveTo(x, y);

        GestureDescription.Builder builder = new GestureDescription.Builder();
        builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 100));

        dispatchGesture(builder.build(), new GestureResultCallback() {
            @Override
            public void onCompleted(GestureDescription gestureDescription) {
                if (callback != null) callback.onResult(true, "'" + label + "' पर टैप किया", currentPackageName);
            }

            @Override
            public void onCancelled(GestureDescription gestureDescription) {
                if (callback != null) callback.onResult(false, "टैप रद्द हो गया", currentPackageName);
            }
        }, null);
    }

    // --- TYPE TEXT ---
    private void typeText(String textToType, ActionCallback callback) {
        if (textToType == null) textToType = "";

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) {
            if (callback != null) callback.onResult(false, "सक्रिय स्क्रीन नहीं मिल सकी", currentPackageName);
            return;
        }

        AccessibilityNodeInfo targetNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (targetNode == null) {
            targetNode = findEditableNode(root);
        }

        if (targetNode != null) {
            // Safety: never type if password field
            if (isPasswordOrPinNode(targetNode)) {
                targetNode.recycle();
                root.recycle();
                if (callback != null) callback.onResult(false, "सुरक्षा कारणों से पासवर्ड फ़ील्ड में टाइपिंग ब्लॉक है", currentPackageName);
                return;
            }

            Bundle arguments = new Bundle();
            arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, textToType);
            boolean ok = targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments);
            targetNode.recycle();
            root.recycle();
            if (callback != null) callback.onResult(ok, ok ? "टेक्स्ट लिखा गया: \"" + textToType + "\"" : "टाइप करना असफल रहा", currentPackageName);
            return;
        }

        root.recycle();
        if (callback != null) callback.onResult(false, "टाइप करने के लिए कोई टेक्स्ट बॉक्स नहीं मिला", currentPackageName);
    }

    private AccessibilityNodeInfo findEditableNode(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isEditable()) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo found = findEditableNode(child);
            if (found != null) return found;
        }
        return null;
    }

    // --- YOUTUBE CONTROL ---
    private void controlYouTube(String subAction, ActionCallback callback) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) {
            if (callback != null) callback.onResult(false, "YouTube स्क्रीन नहीं मिल सकी", currentPackageName);
            return;
        }

        if ("play_first".equals(subAction)) {
            // Look for first video title or thumbnail
            List<String> hints = Arrays.asList("video", "views", "ago", "play video");
            for (String hint : hints) {
                AccessibilityNodeInfo node = searchNodeByText(root, hint);
                if (node != null) {
                    AccessibilityNodeInfo clickable = node;
                    while (clickable != null && !clickable.isClickable()) {
                        clickable = clickable.getParent();
                    }
                    if (clickable != null && clickable.isClickable()) {
                        boolean ok = clickable.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        root.recycle();
                        if (callback != null) callback.onResult(ok, ok ? "YouTube पर पहला वीडियो चलाया" : "पहला वीडियो नहीं चल सका", currentPackageName);
                        return;
                    }
                }
            }
        } else if ("next".equals(subAction)) {
            AccessibilityNodeInfo nextBtn = searchNodeByText(root, "next video");
            if (nextBtn == null) nextBtn = searchNodeByText(root, "अगला");
            if (nextBtn != null && nextBtn.isClickable()) {
                boolean ok = nextBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                root.recycle();
                if (callback != null) callback.onResult(ok, ok ? "अगला वीडियो चलाया गया" : "अगला बटन नहीं दबा", currentPackageName);
                return;
            }
        } else if ("toggle_play".equals(subAction)) {
            AccessibilityNodeInfo playBtn = searchNodeByText(root, "pause video");
            if (playBtn == null) playBtn = searchNodeByText(root, "play video");
            if (playBtn != null && playBtn.isClickable()) {
                boolean ok = playBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                root.recycle();
                if (callback != null) callback.onResult(ok, ok ? "वीडियो पॉज़/प्ले टॉगल किया" : "प्ले बटन नहीं दबा", currentPackageName);
                return;
            }
        }

        root.recycle();
        // Fallback: tap middle of screen for YouTube player
        DisplayMetrics dm = getResources().getDisplayMetrics();
        clickCoordinates(dm.widthPixels * 0.5f, dm.heightPixels * 0.35f, "YouTube प्लेयर", callback);
    }

    // --- SCREEN TEXT SUMMARY (User Explicit Only) ---
    public void readScreenText(boolean userExplicit, ActionCallback callback) {
        if (!userExplicit) {
            if (callback != null) callback.onResult(false, "बिना यूज़र की अनुमति स्क्रीन डेटा नहीं पढ़ा जा सकता।", currentPackageName);
            return;
        }

        if (isCurrentAppSensitive()) {
            if (callback != null) callback.onResult(false, "सुरक्षा कारणों से बैंकिंग/UPI ऐप में स्क्रीन सामग्री नहीं पढ़ी जा सकती।", currentPackageName);
            return;
        }

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) {
            if (callback != null) callback.onResult(false, "सक्रिय स्क्रीन नहीं मिल सकी", currentPackageName);
            return;
        }

        StringBuilder sb = new StringBuilder();
        collectVisibleText(root, sb, new HashSet<>());
        root.recycle();

        String result = sb.toString().trim();
        if (result.isEmpty()) {
            if (callback != null) callback.onResult(true, "स्क्रीन पर कोई पठनीय टेक्स्ट नहीं मिला।", currentPackageName);
        } else {
            // Trim to safe length (~1200 chars)
            if (result.length() > 1200) {
                result = result.substring(0, 1200) + "...";
            }
            if (callback != null) callback.onResult(true, result, currentPackageName);
        }
    }

    private void collectVisibleText(AccessibilityNodeInfo node, StringBuilder sb, Set<String> seen) {
        if (node == null || !node.isVisibleToUser()) return;
        if (isPasswordOrPinNode(node)) return; // Never read password

        CharSequence text = node.getText();
        CharSequence desc = node.getContentDescription();

        String content = text != null ? text.toString().trim() : (desc != null ? desc.toString().trim() : "");
        if (!content.isEmpty() && !seen.contains(content)) {
            seen.add(content);
            if (sb.length() > 0) sb.append(". ");
            sb.append(content);
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            collectVisibleText(node.getChild(i), sb, seen);
        }
    }

    // --- SCREEN NODES for Agent mode (compact JSON) ---
    public String getScreenNodesJson() {
        if (isCurrentAppSensitive()) return null;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "[]";
        org.json.JSONArray arr = new org.json.JSONArray();
        collectNodesJson(root, arr);
        return arr.toString();
    }

    private void collectNodesJson(AccessibilityNodeInfo node, org.json.JSONArray arr) {
        if (node == null || arr.length() >= 80 || !node.isVisibleToUser()) return;
        try {
            if (!isPasswordOrPinNode(node)) {
                CharSequence t = node.getText();
                CharSequence d = node.getContentDescription();
                String ts = t != null ? t.toString().trim() : "";
                String ds = d != null ? d.toString().trim() : "";
                if (!ts.isEmpty() || !ds.isEmpty()) {
                    org.json.JSONObject o = new org.json.JSONObject();
                    if (ts.length() > 60) ts = ts.substring(0, 60);
                    if (ds.length() > 60) ds = ds.substring(0, 60);
                    o.put("t", ts);
                    o.put("d", ds);
                    String id = node.getViewIdResourceName();
                    if (id != null && id.contains("/")) id = id.substring(id.indexOf('/') + 1);
                    o.put("id", id == null ? "" : id);
                    o.put("c", node.isClickable());
                    android.graphics.Rect r = new android.graphics.Rect();
                    node.getBoundsInScreen(r);
                    o.put("b", r.left + "," + r.top + "," + r.right + "," + r.bottom);
                    arr.put(o);
                }
            }
        } catch (Exception ignored) {}
        for (int i = 0; i < node.getChildCount(); i++) {
            collectNodesJson(node.getChild(i), arr);
        }
    }

    public void stopAll() {
        isProcessing.set(false);
        showToast("J.A.R.V.I.S. Phone Control रोका गया");
    }

    // --- NOTIFICATION & FEEDBACK ---
    private void showControlNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "J.A.R.V.I.S. Phone Control",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("J.A.R.V.I.S. Phone Control सक्रियता और त्वरित सुरक्षा नियंत्रण");
            nm.createNotificationChannel(channel);
        }

        // PendingIntent for Stop Action
        Intent stopIntent = new Intent(this, MainActivity.class);
        stopIntent.setAction(ACTION_STOP_SERVICE);
        stopIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent stopPendingIntent = PendingIntent.getActivity(
            this, 1001, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("J.A.R.V.I.S. Phone Control सक्रिय है")
            .setContentText("वॉइस व स्क्रीन ऑटोमेशन चालू है। सुरक्षा के लिए कभी भी रोकें।")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "रोको (Stop)", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        nm.notify(NOTIFICATION_ID, notification);
    }

    private void removeControlNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIFICATION_ID);
        }
    }

    private void showToast(String message) {
        mainHandler.post(() -> Toast.makeText(getApplicationContext(), message, Toast.LENGTH_SHORT).show());
    }
}
