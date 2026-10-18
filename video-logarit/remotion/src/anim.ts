import { Easing, interpolate } from "remotion";
import { TL } from "./timeline";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 trong `d` khung hình kể từ `a`. */
export const ramp = (f: number, a: number, d: number) => interpolate(f, [a, a + d], [0, 1], { ...clamp, easing: easeOut });

export const fadeUp = (f: number, a: number, d = 13, dist = 14): React.CSSProperties => ({
  opacity: ramp(f, a, d),
  translate: `0px ${(1 - ramp(f, a, d)) * dist}px`,
});

export const popScale = (f: number, a: number, d = 13) =>
  interpolate(f, [a, a + d * 0.65, a + d], [0.6, 1.12, 1], { ...clamp, easing: Easing.out(Easing.quad) });

export const pop = (f: number, a: number, d = 13): React.CSSProperties => ({
  opacity: ramp(f, a, d * 0.5),
  scale: String(popScale(f, a, d)),
});

/** Rung ngang 0,4 s. */
export const shakeX = (f: number, a: number) =>
  interpolate(f, [a, a + 2, a + 4, a + 6, a + 8, a + 10, a + 12], [0, -14, 14, -10, 10, -5, 0], clamp);

export const fadeOut = (f: number, a: number, d = 13) => 1 - ramp(f, a, d);

/** Cảnh hiện tại (0–5) tại khung hình f. */
export const sceneAt = (f: number) => {
  let i = 0;
  TL.scenes.forEach((s, k) => {
    if (f >= s.start) i = k;
  });
  return i;
};
