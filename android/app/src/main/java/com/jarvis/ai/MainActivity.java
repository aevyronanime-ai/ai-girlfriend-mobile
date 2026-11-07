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
}
