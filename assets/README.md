# Release media

Large media files are excluded from Git. End users should download the ready-to-install Setup.exe; it includes all media.

Developers can run `Get-Media.ps1` to fetch the hash-pinned `Codex-Liquid-Glass-Startup-1.2.0-Media.zip`. It contains exactly:

| File | Resolution | Content | Audio |
| --- | --- | --- | --- |
| startup-wide.mp4 | 1920 × 1080 | 17 s / 1020 frames / 60 fps | none |
| final-wide.png | 1920 × 1080 | decoded final frame | n/a |
| backdrop.png | 960 × 540 | softened background for other window ratios | n/a |

The complete film is displayed proportionally without cropping. The final still uses the same sizing; the backdrop fills the remaining area. See [media-source/README.md](../media-source/README.md) to render replacements. Original assets use the project MIT license subject to the third-party trademark notice.
