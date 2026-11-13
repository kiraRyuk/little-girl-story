# Browser-independent chapter narration

**Current status:** disabled at the user’s request after listening to eSpeak. The recordings below remain as draft assets/evidence, but are not imported or shipped by the application. Sound currently controls ambience only. A natural voice source is still unresolved; do not re-enable eSpeak automatically.

The screenshot established that this Firefox installation has no English Web Speech voice. The app now prefers original chapter recordings and needs no installed browser voice to play them. It falls back to Web Speech only for chapters without a recording.

Place independently generated or recorded tracks in `src/assets/narration/`, named:
`book.wav`, `city.wav`, `street.wav`, `matches.wav`, `corner.wav`, `stove.wav`, `goose.wav`, `tree.wav`, `grandmother.wav`, `morning.wav`, `close.wav`.
MP3 or Ogg files with the same base names also work; provide only one format per chapter. Vite discovers these files at build time and creates hashed URLs. Missing recordings cause no speculative audio requests. Rebuild/restart after adding files.

`node scripts/export-narration.mjs` prints the eleven narration texts as JSON. This exports our independent public-domain-story adaptation, not source or narration from the reference website.

Recordings start only after sound opt-in or Read chapter. Changing chapters replaces playback, replay restarts the chapter, muting unloads the audio source, hiding the tab pauses playback, and the background is reduced while a recording plays. No track is bulk-decoded into Web Audio. Only the current track is retained. Audible quality and Firefox playback still require manual verification.

## Approved local generation route — pending package capture

The user approved a small speech-engine download subject to compatibility checks. Selected upstream: eSpeak NG 1.52.0 (a compact formant synthesizer with a recognizably synthetic voice). Official Arch package dependencies are libsonic 0.2.0-2 and pcaudiolib 1.3-1, with host ALSA/Pulse libraries also required. These versions were checked against official Arch package pages on 2026-11-13:

- https://archlinux.org/packages/extra/x86_64/espeak-ng/
- https://archlinux.org/packages/extra/x86_64/libsonic/
- https://archlinux.org/packages/extra/x86_64/pcaudiolib/

A bounded Codex curl attempt to official Arch metadata failed with DNS resolution error (exit 6). No package was downloaded. Use the existing working Konsole networking:

```sh
cd '/home/sam/projects/rea 1/onecoldnight-story'
bash scripts/fetch-speech-engine.sh
```

The script downloads three exact signed packages from the official Arch archive into a new private `/tmp/onecoldnight-tts.*` directory, authenticates signatures against the existing Arch keyring, and saves verification logs. It performs no package-manager operations, extraction, installation, or native engine execution. It stops on any failure. Maximum package download sizes are 12 MiB for eSpeak NG and 256 KiB per small dependency. Signature downloads are capped at 16 KiB. Report the printed capture directory for inspection.

Next: inspect archive members, package/build metadata, ELF architecture, GNU ISA notes, linked dependencies, required symbol versions and host availability before any engine execution. Inspect compiler flags as CPU-baseline evidence; x86_64 naming or absence of AVX opcodes alone does not prove compatibility. If compatibility remains inconclusive, request approval for one bounded supervised probe with core dumps disabled. Stop on SIGILL.

After verification, extract only into an isolated temporary tool directory and generate one sample WAV, then the eleven chapter WAV files sequentially. No live audio playback, services, GPU use, global installation, or browser-profile modifications are needed. Once generated, the site retains only the original chapter audio files; temporary tools may be removed by exact captured directory path. Never remove unrelated `/tmp` directories.

At the initial integration stage, recordings had not yet been generated. The completed generation and verification are documented below.

## Signature-verifier correction — 2026-11-13

The first Konsole capture is `/tmp/onecoldnight-tts.N3Ybgj`. The local `/usr/share/pacman/keyrings/archlinux.gpg` contains ASCII-armored public keys. Passing it directly as a binary gpgv keyring caused `invalid packet (ctb=2d)`. Converting a copy with `gpg --dearmor` inside an isolated temporary GnuPG directory fixed the failure. The captured eSpeak NG package now verifies with Alexander Epaneshnikov's signing key fingerprint `89DB0CFD528EC1A92E0C11341736C918F59A5673`. The original failure log is preserved; successful verification is recorded separately. The system and personal keyrings were not changed.

The helper now supports resuming a capture and converting an armored keyring copy. Cached packages and signatures are reused and reverified; each verification attempt keeps separate logs. Syntax validation passed. An offline smoke check with a deliberately failing mock curl verified the cached package successfully and stopped at the first missing dependency without making a network request.

Resume in Konsole:

```sh
cd '/home/sam/projects/rea 1/onecoldnight-story'
bash scripts/fetch-speech-engine.sh /tmp/onecoldnight-tts.N3Ybgj
```

Preliminary static inspection extracted only the signed executable and library into an isolated inspection directory; neither was executed. The executable is ELF64 x86-64 and declares `x86-64-baseline`. The engine library requires GLIBC up to 2.38 and GLIBCXX up to 3.4.30, plus `libsonic.so` and `libpcaudio.so.0`. Those two dependencies are still missing. Full dependency/CPU compatibility checks and audio generation remain pending. The earlier statement that the capture helper does not extract remains true; inspection was a separate read-only analysis of the verified package.


## Completed local generation — 2026-11-13

All three captured packages reverified successfully. They were unpacked only under `/tmp/onecoldnight-tts.N3Ybgj/isolated-engine-0n2m28ys`. Static ELF inspection covered the executable and all three new libraries. The executable declares x86-64-baseline; direct dependency names and required host symbol versions are available (engine maximum GLIBC 2.38, GLIBCXX 3.4.30). No AVX/BMI candidates were found in disassembly; this alone was not treated as proof of compatibility.

Because library CPU declarations were incomplete, explicit user approval was obtained for one supervised bounded native probe followed by chapter generation on success. With core dumps disabled, a 10-second timeout and no speaker playback, the probe produced a valid 3.871-second WAV and exited successfully. No SIGILL occurred on the tested generation paths. This does not establish compatibility for every engine/voice code path.

`scripts/generate-narration.py` generated the eleven chapter recordings sequentially with `en-gb`, 145 words/minute, pitch 42, amplitude 100. WAVs are PCM signed 16-bit mono at 22050 Hz; 158.7 seconds total, 7,000,704 bytes. All have nonzero signal and verified SHA-256 hashes. Per-file text, sizes, hashes and durations are retained in `docs/narration-manifest.json`. There was no audio playback during validation; perceived quality still needs user listening. This is an explicitly synthetic formant voice, not human narration.

The first generation run synthesized all tracks but hit `EXDEV` when publishing from `/tmp` onto the project filesystem. Its temporary staging was cleaned automatically. Staging was corrected to use the destination filesystem and generation completed successfully. The successful native probe was not repeated.

The generator refuses to overwrite existing audio assets. Future changes to chapter text require intentional re-generation or replacement of those tracks, with native compatibility checked as appropriate. It uses the project's own text exporter and does not execute captured website scripts. The independent artwork and story adaptation remain the only creative inputs; no reference-site recording is used.

The separate timed-out `/tmp/onecoldnight-tts.cb5s0G` capture is unrelated and was left untouched. No package manager, global installation, speech daemon, browser profile or system library was modified. Temporary engine/capture files are retained as verification evidence; the built site uses only its own bundled WAV files and does not require that engine at runtime.

Final checks: TypeScript passed; both mocked audio-lifecycle tests passed; the narration-asset test passed for all eleven chapters against current caption text, sizes, hashes and PCM headers. The bounded Astro production build passed in 7.44 seconds. All eleven emitted WAVs match their source hashes and are referenced by the client bundle. Client JS is 549.51 kB / 144.28 kB gzip; the existing 500 kB warning remains. No browser or listening test was performed.
