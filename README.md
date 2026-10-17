# Atlas Blocks

An installable, offline web app (PWA) for Atlas, age 4. Plain static files, no build step.
All characters, artwork, and music are original: stacked-cube number characters, letter-block characters, and Web Audio melodies. It isn't affiliated with any TV show.

## Sections
- **Talk**: an AAC-style picture board that speaks out loud. It has a sentence strip, colour-coded word types, and a first-letter block on each button. Grown-ups can add buttons with their own photos (stored on the device in IndexedDB).
- **Hum & Say**: hear a sound, then tap the mic. Any hum or sound at all gets rewarded, measured by volume and length only. Nothing is recorded. Levels go Hum → Vowels → Letter sounds → Words → Numbers.
- **Potty Mission**: a 7-step picture schedule with a count-while-you-sit number block, an original wash-hands jingle with a 20-count, "I went" / "I tried" buttons, a 10-block reward tower with a party at the end, and an "I need to go potty" request button.
- **ABC & 123**: tracing (ABC, abc, 0–20), counting, putting blocks in order, and a letter/number parade. Each one runs A→Z or Z→A.
- **Grown-ups** (hold 🔒 for 3 seconds): sound, volume, clapping/cheering, voice, speed, captions, section toggles, calm mode, custom buttons, mic sensitivity, sit count, tower size, progress counts, tips, and install help.

Every praise moment plays a chime, synthesized applause, and a crowd cheer, shows confetti, a 👏 hand, and dancing block characters, and speaks the praise.
If the device has no text-to-speech voices (some Kindle Fire setups), the words show up big on screen and a friendly tone plays instead.

## Run / host
Serve the folder over **https** so the mic and install work, e.g. GitHub Pages. To test locally: `python3 -m http.server`.
Install it on a Kindle Fire (Silk): ⋮ menu → Add to Home Screen. On iPhone/iPad (Safari): Share → Add to Home Screen.

## Voice clips
All built-in speech is pre-recorded (Piper neural TTS, en_US "amy" voice) in `audio/*.mp3`, mapped in `audio/manifest.js`, so the app talks on devices with no text-to-speech (e.g. Kindle Amazon Kids profiles). Order: bundled clip → device speechSynthesis → big on-screen words + tones. Parent-added picture buttons can have a voice recording (Grown-ups → Add a picture button → Record voice). Regenerate clips with `tools/gen.js` + `tools/synth.py`, then bump `CACHE` in `sw.js`.
