# Render the animation

The v1.2.0 scene is a deterministic 17-second liquid glass printing sequence at 1920 × 1080 and 60 fps (1020 frames). It uses SVG geometry, layered refraction, transparent rollers, exact vector branding and a continuous transition into a glass workspace. End users only need the release installer.

Install Node.js 22 or newer on a 64-bit Windows development PC, then:

```powershell
cd media-source
npm ci
npm run proof -- --frames=0,460,800,1019
npm run render
```

`src/index.tsx` registers the `PrintWide` composition. `src/timing.ts` accelerates the printing passes, preserves interface assembly, and freezes motion from 15.8 to 17 seconds. `render.mjs` uses Remotion's browser and FFmpeg; set `CHROME_PATH` to use an existing compatible Chrome. Dependencies resolve from this folder's `node_modules`, with an optional `FROSTED_MEDIA_NODE_MODULES` override for an existing compatible installation.

The full renderer decodes all frames, checks dimensions, frame count, duration and audio absence, and compares 13 samples across the final 72-frame hold. It exports `startup-wide.mp4`, its decoded last frame `final-wide.png`, and a softened `backdrop.png` into `../assets`. Build the launcher with `../Build.ps1` afterward. `npm run verify` repeats media checks on a completed render; reduced-scale proof renders never replace release assets.

Rendering 1020 frames is compute intensive. The source uses system Bahnschrift/Arial fonts; no proprietary font binaries or private developer paths are included. Typography can vary across systems. `public/asset-provenance.json` records the exact vector mark's hash and trademark notice. Earlier v1.1.0 scene files remain in this folder and Git history, but are not used by the current entry point.

Original code and media use the root MIT license, subject to third-party trademark rights. Review [Remotion's license](https://www.remotion.dev/license) before rendering commercially or in an organization.
