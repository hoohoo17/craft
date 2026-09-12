#!/usr/bin/env python3
"""밝은 8비트풍 배경음 (약 21초) -> wav"""
import sys
import numpy as np

SR = 44100
DUR = 21.0
BPM = 120
BEAT = 60.0 / BPM
OUT = sys.argv[1] if len(sys.argv) > 1 else "music.wav"


def f(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)


def env(n, a=0.012, d=0.10, s=0.65, r=0.16):
    t = np.arange(n) / SR
    total = n / SR
    e = np.ones(n) * s
    ai = int(a * SR)
    di = int(d * SR)
    ri = min(int(r * SR), n)
    e[:ai] = np.linspace(0, 1, ai)
    e[ai:ai + di] = np.linspace(1, s, min(di, n - ai))
    e[n - ri:] *= np.linspace(1, 0, ri)
    return e


def tone(midi, dur, amp, kind="lead"):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f(midi)
    if kind == "lead":
        w = (0.55 * np.sin(2 * np.pi * fr * t)
             + 0.22 * np.sign(np.sin(2 * np.pi * fr * t))
             + 0.12 * np.sin(4 * np.pi * fr * t))
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t)
        w = w * vib
    elif kind == "bass":
        w = (0.7 * np.sin(2 * np.pi * fr * t)
             + 0.3 * np.sin(2 * np.pi * fr * t) ** 3)
    else:  # arp bell
        w = 0.5 * np.sin(2 * np.pi * fr * t) + 0.2 * np.sin(6 * np.pi * fr * t)
    return w * env(n, r=0.12 if kind != "bass" else 0.2) * amp


buf = np.zeros(int(DUR * SR) + SR)


def put(at, sig):
    i = int(at * SR)
    m = min(len(sig), len(buf) - i)
    if m > 0:
        buf[i:i + m] += sig[:m]


# 4마디 8초 루프 x 3
CHORDS = [(36, [72, 76, 79, 76]), (43, [74, 79, 83, 79]),
          (45, [81, 79, 76, 72]), (41, [77, 81, 84, 84])]
ARP = {36: [60, 64, 67], 43: [62, 67, 71], 45: [57, 60, 64], 41: [65, 69, 72]}

loop = 4 * 4 * BEAT
for rep in range(3):
    base = rep * loop
    for bi, (root, mel) in enumerate(CHORDS):
        bt = base + bi * 4 * BEAT
        for k, m in enumerate(mel):
            put(bt + k * BEAT, tone(m, BEAT * 0.92, 0.30 if rep else 0.26))
        put(bt, tone(root, BEAT * 1.9, 0.26, "bass"))
        put(bt + 2 * BEAT, tone(root + 7, BEAT * 1.9, 0.20, "bass"))
        for k in range(8):
            note = ARP[root][k % 3]
            put(bt + k * BEAT / 2, tone(note, BEAT * 0.45, 0.07, "arp"))

buf = buf[:int(DUR * SR)]
# 페이드 인/아웃
fi, fo = int(0.35 * SR), int(1.8 * SR)
buf[:fi] *= np.linspace(0, 1, fi)
buf[-fo:] *= np.linspace(1, 0, fo)
buf /= max(1e-9, np.abs(buf).max())
buf *= 0.62
pcm = (buf * 32767).astype(np.int16)

import wave
with wave.open(OUT, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", OUT, len(pcm) / SR, "s")
