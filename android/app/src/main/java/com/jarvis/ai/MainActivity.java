package com.jarvis.ai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

import android.content.Intent;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemLauncherPlugin.class);
        super.onCreate(savedInstanceState);
        handleStopAction(getIntent());
        setupDownloadListener();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleStopAction(intent);
    }

    private void handleStopAction(Intent intent) {
        if (intent != null && JarvisAccessibilityService.ACTION_STOP_SERVICE.equals(intent.getAction())) {
            if (JarvisAccessibilityService.isRunning()) {
                JarvisAccessibilityService.getInstance().stopAll();
            }
        }
    }

    private void setupDownloadListener() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
                    try {
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                        intent.setData(android.net.Uri.parse(url));
                        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        android.widget.Toast.makeText(MainActivity.this, "Download: " + e.getMessage(), android.widget.Toast.LENGTH_SHORT).show();
                    }
                });
            }
        } catch (Exception ignored) {}
    }
}
