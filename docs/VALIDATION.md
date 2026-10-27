# Validation

Validation is performed on the built v1.0.0 installer and an isolated copy of its exact payload. It includes:

- native compilation and policy tests for once-per-session playback, stable readiness, and the completion gate;
- a bounded-probe timeout, recovery, and unready result test;
- first install, repeat install, and uninstall in a fresh isolated directory;
- SHA-256 comparison of extracted payload files;
- native WebView2 playback: one complete film, identical held-frame captures while readiness is false, then entry only after stable simulated readiness;
- MP4 stream inspection for dimensions, frame count, duration, and zero audio streams;
- native readiness of a visible WebView2 sign-in screen with a single enabled Sign in button, using an isolated local test page and profile;
- an allowlist and private-path review of release and Git contents.

Local native playback validates rendering and lifecycle without opening, restarting, or signing into a user's Codex client. It does not establish compatibility with every future Codex release or every managed Windows policy. Readiness is based on public accessibility controls; Esc provides a documented fallback when those controls change or are unavailable.

The exact results and installer hashes are saved locally with the release artifacts. Windows SmartScreen reputation is separate from successful local validation; this community installer is unsigned.
