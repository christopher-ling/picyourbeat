# PicYourBeat

Pick a detail. Find its beat.

PicYourBeat lets visual creators select a region of an image, inspect and edit its musical interpretation, and generate an instrumental musical sketch. Compare two selected details side by side.

## Run locally

Requires Node.js 22 or newer. There are no package dependencies.

From the downloaded or cloned repository directory:

```
cp .env.example .env
```

Edit `.env` and replace the two placeholder API keys with your own keys. Keep Google billing disabled if you want to use only its free tier, and use existing ElevenLabs credits. Never commit `.env`. You can also configure these values as server environment variables. To use a different configuration file, set `PICYOURBEAT_ENV_FILE` to its absolute path.

Start the app with `npm start` (or `node server.mjs`). No `npm install` is required. Run the provider error-handling tests with `npm test`; these tests do not contact providers or consume credits.

Open http://127.0.0.1:5173. Do not use the former Python static preview server: it cannot handle API calls.

## What works

- Upload JPG/PNG, preview, and choose a detail by dragging, presets, or accessible sliders.
- Gemini 3.5 Flash-Lite interprets the selected crop through the Interactions API (switched from 3.8 Flash after repeated HTTP 503 errors).
- Edit the musical direction before composing.
- ElevenLabs Music generates a ten-second instrumental clip using configured account credits.
- Browser playback, MP3 downloads, and comparison of two results.
- A narrow, four-step creation flow: Image → Detail → Sound → Listen, with back navigation and a separate My music screen.
- Generated clips are saved locally in IndexedDB with audio, crop, title, and direction. My music supports playback and repeat downloads after refresh. Storage is specific to this browser and site address; clearing browser data removes local copies. It does not read the user's Downloads folder. If storage fails, download the clip before refreshing.
- Animated loading bar for both API steps, elapsed seconds, completion confirmation, and a stopped error state. The bar is indeterminate while waiting because providers do not report completion percentages. Reduced-motion preferences are respected.

## Architecture and privacy

The browser draws and crops the image. Interpret sends the selected crop and optional observation to Google. Compose sends the editable musical direction to ElevenLabs. Credentials remain on the server. The server processes uploads and audio in memory without an upload archive. The browser stores generated audio and crop thumbnails locally in IndexedDB for My music. Providers have their own data handling policies. Google free-tier processing must not be described as zero-data processing.

An original example artwork is generated with browser canvas code. Google Fonts is optional and has system font fallbacks.

## Credit controls and limitations

Google's key is configured for free-tier interpretation; Lyria is not used. ElevenLabs generation consumes existing credits. The application does not purchase credits or activate billing. Gemini interpretation retries at most once for network errors, timeouts, or HTTP 500/502/503/504; quota and authentication errors are not retried. Music generation is never automatically retried, to avoid duplicate credit use.

Interpretation uploads are resized to at most 768 pixels on their longest side. Gemini uses minimal thinking effort. Each interpretation attempt times out after 45 seconds, including reading its response, with a 1.5-second pause before the optional second attempt. Errors identify the provider, and the selected image remains in the browser for a manual retry. Credentials being configured does not guarantee provider availability.

The backend allows one active AI request and at most ten music-generation attempts per server session by default. Failed attempts count toward this conservative limit. MAX_MUSIC_GENERATIONS can lower that cap. Restarting the server resets the counter; it is not an account spending cap. Disable usage-based billing or automatic top-ups in the provider account if zero cash spending is required.

This version is bound to loopback for local use. Before public deployment, add durable rate limits, validate provider credit coverage, configure HTTPS and hosting timeouts, and set server environment secrets. Do not expose the entire project directory through a static server. The Node server serves only a whitelist of frontend files.

Crop-based control is this app's creative workflow; image-to-music itself already exists. Music output is an artistic interpretation and may vary between generations.

## Files

- index.html: user flow.
- style.css: responsive styling.
- app.js: cropping, API requests, playback and comparison.
- server.mjs: private API integration and static file whitelist.
- provider.mjs: bounded provider requests and sanitized errors.
- tests/provider.test.mjs: retry, timeout, quota, and credit-protection tests.

## Hackathon disclosure

This implementation was developed with AI coding assistance through Codex. The app uses Google Gemini for image understanding and musical directions, and ElevenLabs Music for instrumental audio generation. The sample artwork is drawn by browser canvas code. Provider SDKs are not required. Check the event rules and report the final sponsor services and any prior work accurately in your submission.

## Demo

1. Upload a JPG/PNG or choose the original example artwork.
2. Select one visual detail and click **Interpret this detail**.
3. Inspect or edit the musical direction, then click **Compose 10-second music**.
4. Play/download the clip, select another detail, and generate a second interpretation to compare.

The app currently runs locally; a public GitHub repository is source code, not a hosted live demo. Public hosting and the demo video are still to be prepared.

## Next

Test contrasting crop interpretations with the user, improve sound choices, and prepare hosting, demo video and submission. Drawing and live generation remain optional extras.
