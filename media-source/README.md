# Render the animation

This is the original Remotion scene and optical-ripple postprocessing source for the silent English opening. End users do not need any of these dependencies; use the release installer.

For rendering, install Node.js 22 or newer on a 64-bit Windows development PC, then:

```powershell
cd media-source
npm ci
npm run render
npm run render:wide
```

The renderer automatically obtains Remotion's browser when necessary and uses its supplied FFmpeg. It writes both silent H.264 videos and their final stills to `../assets`. The launcher/installer can then be compiled with `../Build.ps1`.

Rendering all 960 frames at 2160 pixels high is compute intensive. A developer with an existing compatible Chrome can configure Remotion's browser options if needed; no local developer's browser path or shared dependency directory is built in. Rendered typography may vary slightly with operating-system fonts. Proprietary font files are not redistributed.

The original source and generated media use the root MIT license, subject to third-party trademark rights. Review Remotion's own license before use in an organization or commercial rendering: https://www.remotion.dev/license.
