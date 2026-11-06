package com.jarvis.ai;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

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
}
