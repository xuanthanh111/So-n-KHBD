"""Ghép khung hình + tạo âm hiệu ứng (tách, ting, bíp, vút) thành video MP4.

Dùng: python3 build.py <thư-mục-ra> <tệp.mp4>
Cần ffmpeg và numpy. Âm thanh tổng hợp giống các âm trong index.html.
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

SR = 48000
FPS = 30


def env_exp(n, k):
    return np.exp(-k * np.linspace(0, 1, n))


def click(rng):
    n = int(SR * 0.03)
    x = rng.uniform(-1, 1, n) * (1 - np.arange(n) / n) ** 6
    # bandpass-ish: difference of two smoothed copies
    hp = x - np.convolve(x, np.ones(6) / 6, mode="same")
    return 0.9 * hp


def ting():
    n = int(SR * 1.15)
    t = np.arange(n) / SR
    y = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1568, .28), (2349, .16), (3136, .06)))
    attack = np.minimum(1, t / 0.01)
    return y * attack * np.exp(-t * 6.0)


def beep():
    n = int(SR * 0.42)
    t = np.arange(n) / SR
    f = 190 - 40 * np.minimum(t / 0.35, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sign(np.sin(ph)) * 0.22
    y = np.convolve(y, np.ones(24) / 24, mode="same")  # soften (lowpass)
    attack = np.minimum(1, t / 0.02)
    return y * attack * np.exp(-t * 9)


def whoosh(rng):
    n = int(SR * 0.6)
    x = rng.uniform(-1, 1, n) * np.sin(np.pi * np.arange(n) / n)
    k = np.linspace(40, 6, n).astype(int)
    y = np.array([x[max(0, i - k[i]):i + 1].mean() for i in range(n)])
    return 0.5 * y


def main(out, mp4):
    tl = json.load(open(os.path.join(out, "timeline.json")))
    start, frames, sfx = tl["start"], tl["frames"], tl["sfx"]
    frames = [f for f in frames if f["t"] >= start - 1000 / FPS] or frames
    end = frames[-1]["t"] + 1000

    # concat list with per-frame durations
    lst = os.path.join(out, "frames.txt")
    with open(lst, "w") as fh:
        for i, f in enumerate(frames):
            t0 = max(f["t"], start)
            t1 = frames[i + 1]["t"] if i + 1 < len(frames) else end
            fh.write(f"file 'frames/{f['name']}'\nduration {max(t1 - t0, 1) / 1000:.4f}\n")
        fh.write(f"file 'frames/{frames[-1]['name']}'\n")

    rng = np.random.default_rng(7)
    total = int((end - start) / 1000 * SR) + SR
    audio = np.zeros(total)
    for t, kind in sfx:
        i = int((t - start) / 1000 * SR)
        if i < 0:
            continue
        snd = {"click": lambda: click(rng), "ting": ting, "beep": beep, "whoosh": lambda: whoosh(rng)}[kind]()
        j = min(total, i + len(snd))
        audio[i:j] += snd[: j - i]
    audio = np.clip(audio * 0.8, -1, 1)
    wav = os.path.join(out, "sfx.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((audio * 32767).astype("<i2").tobytes())

    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav,
        "-vf", f"fps={FPS},format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
        "-tune", "animation", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", mp4,
    ], check=True)
    print("wrote", mp4)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
