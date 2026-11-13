# little-girl-story

**The Little Match Girl — independent reconstruction**

An original, scroll-driven winter picture book built with Astro, Vite, Three.js r180, WebGL2, and custom GLSL. Its illustrations are generated locally from Canvas 2D drawing code; it does not use the reference site's artwork, narration, or source code.

## Story system

The experience has eleven chapters across a 35 viewport-height timeline: book, town, street, matches, corner, stove, feast, tree, embrace, morning, and final page. Native document scrolling sets the timeline target. A damped timeline follows it, and the renderer draws the active chapter or both sides of a page transition into reusable render targets before applying a full-screen shader.

Sound is optional and currently adds winter ambience/effects only. Narration is disabled at the user's request after listening to the robotic eSpeak voice. The eleven draft WAVs and their verification evidence are preserved in source, but are not imported, requested, or included in the production build. There is no narration/replay control in the current interface. A future natural recording source must be selected before re-enabling narration.

Captions, scene animation, and sound cues share chapter-content progress. A chapter's reading window excludes its incoming and outgoing page-turn halves, preventing its text/actions from playing behind a turning page. Captions remain until the next caption begins; page turns suppress captions. Scroll travel is 1.25 viewport heights per story unit, with native scrolling and the existing damped timeline. Resize preserves the normalized scroll target. Narrative beat constants live in `src/story/beats.ts`; prose timings and scene actions reference these same anchors. All text is readable immediately, with a short card entrance instead of per-word delay.

The text is an independent English adaptation of Andersen’s public-domain 1845 story, including the unsold matches, fear of returning home, four visions, grandmother’s embrace, and the girl's death in the morning. Captions, spoken text, page typography, and text fallback share that story rather than the earlier softened retelling.

## Project layout

- `src/pages/index.astro` — semantic entry screen, controls, captions, and scroll surface.
- `src/story/timeline.ts` — chapter durations, content windows, caption selection, cues, smoothing, and transitions.
- `src/story/beats.ts` — shared progress anchors for illustrated events, captions and effects.
- `src/story/chapters.ts` — Three.js scene construction and chapter-local animation.
- `src/story/art.ts` — original procedural Canvas textures and character sprites.
- `src/story/character-art.ts` — local generated character atlas loading, alpha trimming, and pose sizing; artwork and prompt details are in `docs/character-art.md`.
- `src/story/book.ts` — three-dimensional covers, turning leaves, independently typeset textures, and a live scene portal.
- `src/story/town.ts` — instanced town buildings and descending city camera.
- `src/story/stage.ts` — later chapter sets, close-up match bundle, feast reveal shader, dawn crowd, stars, and chapter-specific camera paths.
- `src/story/roast.ts` — original cooked goose on an oval serving platter, baked skin texture, drumsticks, garnish and steam.
- `src/story/renderer.ts` — adaptive resolution, offscreen targets, and GLSL transitions/compositing.
- `src/story/audio.ts` — opt-in Web Audio ambience/effects and speech synthesis.
- `src/story/main.ts` — input, entry flow, caption state, lifecycle, and subsystem coordination.
- `src/styles/global.css` — responsive gate, HUD, captions, sound controls, and reduced-motion styles.

## Local development

Dependencies are installed and recorded in `package-lock.json`. Verified versions: Astro 5.18.2, Vite 6.4.6, Three.js 0.180.0, @types/three 0.180.0, and TypeScript 5.9.3.

Run the local development server:

```sh
cd '/home/sam/projects/rea 1/onecoldnight-story'
npm run dev
```

It binds to `127.0.0.1`. Production output is in `dist/`.

## Verification — 2026-11-13

- TypeScript `tsc --noEmit`: passed after correcting the Canvas drawing helper's nullable fill argument.
- Astro production build: passed in 4.26 seconds, with a 120-second timeout, core dumps disabled, a 1536 MiB Node heap limit, and telemetry disabled for that command.
- Built HTML and its referenced local assets exist.
- Client bundle: approximately 526 kB minified / 136 kB gzipped. Vite reports its standard 500 kB chunk warning.
- Native artifacts were inspected as x86-64 ELF files with recorded npm registry SHA-512 integrity entries. esbuild binaries declare GOAMD64=v1; inspected shared-library symbol requirements are available on this host. The build succeeded without an illegal-instruction error. This establishes compatibility for the exercised build paths only.
- Browser rendering, GPU behavior, scrolling, responsive appearance, and audio have not been tested. No browser or development server was launched during verification.

## Visual revision

The initial version introduced a different title, boxed gate, centered transparent captions, and a bottom sound control. These have been replaced using measured values from the captured stylesheet: an unboxed black gate, italic story title, Cormorant Garamond, cream caption cards at the lower left, a top-right sound control, and a burning-match progress indicator. The font is requested from Google Fonts when the page opens, with Georgia as fallback. The opening/closing book and city are independently constructed 3D scenes. Other scene artwork remains an approximation; visual equivalence to the reference has not been established in a browser.

The later chapters now use independently constructed sets rather than full-screen backdrop drawings. Street and alley sets have facades, windows, lamps, and patterned ground. Matches uses a rotating close-up bundle. The stove has an iron grille and a glow tied to flame strength. The feast sits behind a scroll-controlled wall reveal. The tree uses etched branches, lights transforming into stars, and a falling-star trail. The embrace has a tracking ascent and a brightening sky. Morning returns to the alley with a seated figure and a gathering crowd. Repeated static meshes are instanced, unused backdrop textures are no longer allocated, and standing/seated characters use new original vector drawings. These changes require visual review in the user's browser; a successful build does not establish visual fidelity or GPU performance.

Later-scene revision verification: TypeScript passed; the bounded Astro build passed in 5.23 seconds. Client output is approximately 542 kB minified / 142 kB gzipped, retaining the existing Vite chunk-size warning. Browser and audio checks remain unperformed.

## Story and audio revision — 2026-11-13

Restored the story's tragic ending and concrete events throughout the eleven chapters, fallback text and book page. Removed the sine/triangle drone and cue oscillators; ambience now uses eight-second filtered noise buffers with slow gusts and irregular fire ticks. Chapter narration retains its utterance, waits for English voices, handles playback errors, pauses on tab hiding, and offers explicit replay. Narration is independent of individual caption changes; scrolling into another chapter replaces the reading.

Verification: TypeScript passed; `node --test tests/audio.test.mjs` passed with mocked Web Audio and speech APIs, covering delayed voice availability, unavailable APIs, chapter deduplication, replay, mute, error messages, visibility, ambient ducking and disposal. The bounded Astro build passed in 4.30 seconds; client output 546.55 kB / 143.31 kB gzip. The existing 500 kB chunk warning remains. These checks do not establish audible quality, browser voice availability, visual matching or GPU performance. No browser/server was launched. No local espeak/espeak-ng/piper/festival/flite executable was found; no speech engine or recorded narration has been installed or generated.

## Roast and recorded-narration revision — 2026-11-13

Replaced the standing white goose with a cooked bird: browned textured skin, folded wings, drumsticks with bone tips, an oval porcelain platter, gravy, garnish and faint steam. It remains on the dining table. The app now discovers local chapter recordings at build time and plays the current track independently of browser speech voices; replay, mute, chapter replacement, visibility pause/resume, playback errors and release are covered by mocked tests.

Checks: TypeScript passed; `node tests/audio.test.mjs` ran and passed both named tests. Shell syntax validation for the capture helper passed. Narration export produced eleven unique chapter entries and 409 words. The bounded production build passed in 4.20 seconds; client bundle 548.75 kB / 143.99 kB gzip, retaining the existing chunk-size warning. No browser or audio playback was performed. No speech-engine packages or narration recordings exist yet: the approved official metadata retrieval failed in Codex with curl DNS exit 6. The documented Konsole capture is the remaining external step before package/CPU compatibility inspection and generation.

## Bundled narration complete — 2026-11-13

After signed-package and ELF/dependency inspection, the explicitly approved bounded native probe passed. Eleven original English eSpeak NG chapter WAV recordings are now bundled (158.7 seconds, 7,000,704 bytes). Firefox no longer needs a browser speech voice for these chapters. The narrator is synthetic; only one chapter recording is loaded at a time. All three audio/asset tests and TypeScript passed. The production build passed in 7.44 seconds and its eleven WAVs match the source hashes and client references. Client JS is 549.51 kB / 144.28 kB gzip, with the existing chunk-size warning. Audible quality, autoplay behavior and visual fidelity still need manual browser review. No browser was launched, audio played, or system package installed. See docs/narration.md and docs/narration-manifest.json for exact generation settings, checks and limitations.

## Pacing and synchronization revision — 2026-11-13

Current behavior supersedes the earlier narration-enabled milestones above: narration is disabled by explicit user choice, the draft WAVs remain preserved, and the production output contains no WAV files or replay control. Winter ambience remains optional.

The previous chapter-local time included page transitions. For example, the street's first caption occupied timeline units 6.105–6.63 while its incoming page turn ended at 6.65, so the complete caption could pass before the illustration was fully revealed. `chapterWindow` now excludes each incoming/outgoing transition half; `chapterProgress` feeds both the renderer and captions/effects. `captionAt` holds the preceding caption until the next authored start and suppresses captions during page turns. All words appear together with a cancellable 180 ms card entrance. These are deliberate changes to this reconstruction, not new claims about the reference site's implementation.

Shared `BEATS` anchors coordinate the carriage, match strikes/extinguishing, wall reveal, tree lights rising into stars, falling star, grandmother appearance/ascent, and the cooked roast moving from its platter during the fantasy passage. The roast remains on its dish through the table-description beat. Scroll travel is 1.25 viewport heights per timeline unit, retaining 35 story units, native input, the existing exponential smoothing and reduced-motion handling. Resize preserves the scroll target in story units. No scroll locking, snapping, automatic chapter narration, or new dependencies were added.

Verification: TypeScript passed; six named tests passed across timing, preserved audio assets and mocked audio lifecycle. Timing tests cover every authored caption outside page turns, former caption gaps, chapter endpoints during transitions and forward/reverse selection across 1,401 timeline positions. The bounded production build passed in 4.47 seconds; JS 549.73 kB / 144.30 kB gzip with the existing chunk-size warning. The built page has no narration control and the production tree has no WAVs; eleven source drafts remain intact.

Manual review still required: refresh, scroll into street and confirm its first caption follows the completed turn; stop between caption beats and confirm text remains readable; reverse through stove/tree/embrace and check visual events against text; resize partway through a chapter and confirm position retention; confirm sound enables only ambience. No browser/server was launched or visual fidelity, perceived smoothness, GPU behavior or premium quality established by these static checks.

## Hardback book revision — 2026-11-13

Rebuilt opening/closing book topology: one portrait back board, a single enclosed page block, a separately hinged front board, rounded cover corners, cloth spine with small gilt ribs, and layered page edges. The old fixed left-hand stack made even the closed pose look like an open spread. Original procedural cover art now uses dark cloth texture, gilt borders/corner flourishes, a small engraved match, restrained typography and the publication date. The inside lining is a separate front-facing surface; the exterior cover cannot appear reversed on it. Turning leaves use a printed front and plain back. No image assets or dependencies were downloaded.

`src/story/book-motion.ts` holds the closed cover through the automatic introduction, coordinates the opening/leaf/portal phases, and reverses the same pose for the ending. Camera framing follows the closed book center before shifting to the open spread and portal. Opening/closing chapter grades reduce grain from the general setting and retain more cover color, without changing renderer resolution or graphics settings.

Checks: TypeScript passed. Two CPU-only book tests passed using Three.js math and stub Canvas drawing: intro/closing pose consistency, the white page block fitting below the closed cover, one-page board width, hidden closed leaves, cover face culling, finite camera placement, and single disposal of shared geometry/materials. Three timeline tests and the retained narration-asset consistency test passed. A signed-zero assertion in the initial book test was corrected to compare rotation magnitude. The bounded production build passed in 4.36 seconds; client JS is 583.29 kB / 155.00 kB gzip. The increase includes Three.js shape/extrusion support for rounded boards; the existing chunk-size warning remains. No browser or GPU test was performed, so actual appearance and performance still require manual review.

## Vercel setup — 2026-11-13

Added `vercel.json` for the Astro framework, `npm ci --no-audit --no-fund`, `npm run build` and static `dist` output. No adapter or dependencies were added. `.vercelignore` omits local build/dependency folders, development-only materials and unused draft narration from CLI uploads. `.vercel/` is now ignored by Git, after a dated, SHA-256-verified backup of the prior `.gitignore` in `/tmp`.

Local checks passed for the JSON configuration, matching Astro build script, existing lockfile/output, upload exclusions and unlinked status. The existing verified build was reused; application source did not change. Nothing has been published, no Vercel CLI installed and no account credentials accessed. Connecting a Vercel account/project through Git import or an explicitly approved CLI setup is still required. See [Vercel deployment instructions](docs/vercel.md).
