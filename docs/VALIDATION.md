# Validation

Validation is performed on the built v1.1.0 installer and an isolated copy of its exact payload. It includes:

- native compilation and policy tests for once-per-session playback, stable readiness, and the completion gate;
- a bounded-probe timeout, recovery, and unready result test;
- first install, repeat install, and uninstall in a fresh isolated directory;
- SHA-256 comparison of extracted payload files;
- native WebView2 playback: one complete film, identical held-frame captures while readiness is false, then entry only after stable simulated readiness;
- MP4 stream inspection for dimensions, frame count, duration, and zero audio streams;
- native readiness of a visible WebView2 sign-in screen with a single enabled Sign in button, using an isolated local test page and profile;
- an allowlist and private-path review of release and Git contents.

For v1.1.0, all 22 native lifecycle checks and three bounded-probe checks passed. The release videos each contain 420 frames over 14 seconds, at 2880 × 2160 and 3840 × 2160, with no audio tracks. Every frame of both media files was decoded during film validation, with no black frames. Their SHA-256 values are pinned by `Get-Media.ps1`.

The exact installer passed clean and repeat installation, payload hash comparison, native playback, and isolated removal while retaining a user-created file. Its WebView2 run completed all 420 frames with `object-fit: cover`, played once, held identical captures 1.8 seconds apart while unready, and entered after simulated stable readiness. That run reported two dropped frames. A separate isolated visible sign-in fixture was recognized as interactive.

The public media project was installed from its dependency lock, independently bundled, and rendered at frame 216 of the 420-frame wide composition. The source uses installed system fonts and contains no proprietary font files or private shared dependency paths.

To repeat the package checks after building:

```powershell
node tests/gate.test.cjs
node tests/media-inspect.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-Package.ps1 -NativePlayback
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-Login.ps1
```

Local native playback validates rendering and lifecycle without opening, restarting, or signing into a user's Codex client. It does not establish compatibility with every future Codex release or every managed Windows policy. Readiness is based on public accessibility controls; Esc provides a documented fallback when those controls change or are unavailable.

The release includes a sanitized `VALIDATION.json` and `SHA256SUMS.txt`. These are local Windows validation results; this repository has no automated CI workflow. Windows SmartScreen reputation is separate from successful local validation; this community installer is unsigned.
