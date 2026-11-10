# Validation

The built v1.2.0 installer and its exact payload passed the following local Windows checks:

- 22 native lifecycle policy checks, three bounded-readiness probe checks, and the JavaScript completion/readiness gate.
- Clean installation, repeat installation, and a deliberately locked-file update. The failed update preserved the complete installed payload and installation record.
- Installed payload SHA-256 comparison, WebView2 runtime detection, and isolated uninstall that retained a user-created file.
- Native WebView2 playback of the 17-second, 1020-frame silent film with proportional contain sizing. The release payload played once, held identical captures 1.8 seconds apart while unready, and entered after stable simulated readiness. It reported 0 dropped frames.
- A visible isolated WebView2 sign-in fixture with one enabled Sign in button, recognized as interactive.
- All 1020 frames of the approved 1920 × 1080, 60 fps film decoded successfully. Thirteen samples across its final 72-frame hold passed the static-tail thresholds. The MP4 has no audio streams; file hashes are pinned by Get-Media.ps1.
- Natural browser playback completed in 17.023 seconds with no reported page/media errors.
- Independent npm ci, bundling and full-resolution source proof renders at frames 0, 460, 800, 1019. This source check rendered keyframes, rather than a second full film.
- Existing-helper playback at 1200 × 900, 2094 × 1314 and 1600 × 900. All cases retained the complete composition and passed the held-frame and gated-entry checks; dropped-frame counts were 0, 5, 0 respectively.
- The maintainer's installed helper played the approved film once in 17.034 seconds over the current client window, matched its bounds, and retained the media hashes. Current client readiness was probed separately. Preview entry itself uses simulated readiness.

To repeat package checks after building:

```powershell
node tests/gate.test.cjs
node tests/media-inspect.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-Package.ps1 -NativePlayback
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-Login.ps1
```

The current client was not restarted; actual cold-start playback is unverified in this revision. Native lifecycle tests simulate readiness and do not measure model/network availability or successful authentication. Public accessibility controls can change; Esc remains the manual fallback.

The release includes a sanitized VALIDATION.json and SHA256SUMS.txt. Local profiles, logs, developer paths, private installation records, proprietary font binaries, and previous builds are excluded from the release. There is no automated CI workflow. The installer is unsigned; local validation does not establish SmartScreen reputation.
