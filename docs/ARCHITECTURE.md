# Architecture

The WinForms launcher hosts a local, restricted WebView2 document with no remote fetches, host objects, permission grants, new windows, or developer tools. A virtual local HTTPS origin serves only the installed `web/` folder.

The film selects the closest aspect ratio, covers its viewport proportionally, and plays once. A completion event switches to the matching final PNG. Both JavaScript and native code require completion plus stable client readiness before automatic entry. The native form uses `WS_EX_TOOLWINDOW` and remains opaque so Chromium can render its first frame behind it. It follows Codex's bounds and uses window ownership to stay with the client.

Readiness comes from a responsive native window and visible enabled UI Automation controls in a web document. A usable editor/navigation screen, or a visible sign-in/onboarding action, qualifies. Each accessibility observation runs in a disposable child process with a two-second deadline; a stuck provider cannot freeze the launcher. Only that owned child is terminated on timeout. Account contents, chat text, and network responses are not inspected.

The optional watcher observes only recognized Codex process paths, records process ID + creation time, and plays once per process session. Minimizing, restoring, or recreating a window does not replay the film. Watcher synchronization uses a project-specific event and mutex, separate from previous local prototypes.

The installer is a .NET Framework executable with an embedded ZIP. It extracts into a unique temporary directory and validates every payload SHA-256 before installation. The payload is assembled from explicit allowlists. Runtime setup occurs before application replacement. Updates keep a rollback copy of replaced files, and uninstall follows the installed file record rather than deleting arbitrary user folders. The shared WebView2 installation and Codex profiles are never removed.
