# Third-party notices

- **Microsoft WebView2 SDK 1.0.4258.31**: `Microsoft.Web.WebView2.Core.dll`, `Microsoft.Web.WebView2.WinForms.dll`, and x64 `WebView2Loader.dll` are redistributed in the installer. The unmodified Microsoft license and notices are included at `licenses/WebView2-LICENSE.txt` and `licenses/WebView2-NOTICE.txt`.
- **Microsoft Edge WebView2 Evergreen Bootstrapper**: the installer contains Microsoft's Authenticode-signed bootstrapper downloaded from the official WebView2 download page. It is run only if the runtime is missing. Microsoft supplies the runtime under its own terms. See [Microsoft's distribution guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).
- **.NET Framework / Windows**: the app uses the framework and APIs supplied by supported Windows versions. The Windows operating system and .NET Framework are not redistributed.
- **OpenAI Codex**: not bundled in this project. The Codex name and the artwork's brand references identify the companion's intended host; they do not imply endorsement or transfer trademark rights. Users obtain Codex and authenticate through OpenAI's own application.
- **Remotion, React, sharp**: used only by the optional media rendering source. They are not required for installing or running the release. Review [Remotion's license](https://www.remotion.dev/license) before rendering commercially or in an organization. React is MIT licensed; sharp is Apache-2.0 licensed. Its FFmpeg build and codecs have their own licenses, provided with the developer dependency packages.
- **Fonts**: proprietary font files are not included. Source rendering uses the fonts available on the developer's own operating system. Released rendered images contain rasterized typography.

The original film, source, and final-frame stills are provided under this project's MIT license, subject to third-party trademark rights described above.
