# 2D Cartoon Story Maker

Script -> scenes, cartoon characters, subtitles, voice -> downloadable WebM video.
Pure HTML/CSS/JS. No build step, no dependencies.

## Structure
```
index.html          page markup, loads CSS and scripts in order
css/styles.css      theme (lavender / sakura palette)
js/core.js          DOM handles, canvas, shared state, rr() helper
js/parser.js        script text -> lines {scene, who, text, emo, cast}
js/background.js    procedural backgrounds
js/characters.js    person(): lip-sync, blink, emotions
js/renderer.js      subtitles, title card, camera zoom, frame()
js/voice.js         device TTS, Hugging Face TTS, sleep()
js/player.js        run(record): preview / record pipeline
js/main.js          UI wiring (loaded last)
docs/               prompts for the Android side
```
Scripts are classic (not ES modules) and share one global scope, so the app also
works from file:// and inside an Android WebView. Keep the load order in index.html.

## Script format
```
TITLE: Title text
CHAR: Ravi | boy            (boy, girl, man, woman, elder)
[village night]             new scene (village forest house well road river night day fog)
Narrator: narration line
Ravi: (scared) dialogue     (happy sad scared angry surprised)
```

## Run
Open index.html in Chrome. For the APK, copy the folder into app/src/main/assets/story/
and load it in the WebView (WebViewAssetLoader or file:///android_asset/story/index.html).

## Known limits
- Device voice (speechSynthesis) cannot be recorded; use "AI voice" to get sound in the video.
- AI voice needs a free Hugging Face token and network; model availability can change.
- Output is WebM. Some gallery apps cannot play it; use VLC or Chrome.
