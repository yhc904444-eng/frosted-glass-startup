export const DURATION_SECONDS = 17;
export const FPS = 60;
export const DURATION_FRAMES = DURATION_SECONDS * FPS;
export const HOLD_START_SECONDS = 15.8;

// Keep paper feed, interface assembly and the 1.2-second hold at their original
// pace. The three printing passes and registration take 11.55s instead of 14.55s.
export function sourceTime(seconds: number): number {
  const time = Math.min(seconds, HOLD_START_SECONDS);
  if (time <= 2.35) return time;
  if (time < 13.9) return 2.35 + (time - 2.35) * (14.55 / 11.55);
  return time + 3;
}
