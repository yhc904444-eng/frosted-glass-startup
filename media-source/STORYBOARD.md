# Formed in glass — 17 seconds

| Time | Action |
| --- | --- |
| 0–2.35 s | A clear droplet gathers, stretches and spreads into a glass printing surface. |
| 2.35–13.9 s | Transparent rollers feed the glass through dark, warm and cool printing passes; layers shift, overlap and register. |
| 13.9–15.8 s | The finished artwork reorganizes into a glass workspace while its original vector mark stays recognizable. |
| 15.8–17 s | The final layout rests; after playback the native player holds its decoded last frame until the client is ready. |

Motion is driven by the composition frame through `sourceTime()`, rather than CSS timers. Glass thickness, highlights and displaced background detail carry the material through the printing narrative. The renderer places a keyframe at the start of the static hold to keep compression from refreshing its texture during the pause.
