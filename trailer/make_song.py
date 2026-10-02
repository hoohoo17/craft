#!/usr/bin/env python3
"""'나의 이야기' 가수 열두 명 노래 -> wav

맥의 한국어 목소리(Yuna)로 글자를 하나씩 말하게 한 뒤,
소리를 빠르게/느리게 다시 읽어서 음 높이를 바꾼다. 그러면 노래가 된다.
가수마다 높낮이가 달라서 목소리가 전부 다르게 들린다.
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

import song_data as S

SR = 44100
VOICE = "Yuna"
BASE_F0 = 256.4          # Yuna가 평소에 내는 음 높이(Hz). 가온다와 거의 같다.
OUT = sys.argv[1] if len(sys.argv) > 1 else "song.wav"

_tmp = tempfile.mkdtemp(prefix="song-")
_cache = {}


def freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)


def speak(syl, rate):
    """글자 하나를 말한 소리를 가져온다. 같은 건 한 번만 만든다."""
    key = (syl, rate)
    if key in _cache:
        return _cache[key]
    path = os.path.join(_tmp, f"{abs(hash(key))}.wav")
    subprocess.run(["say", "-v", VOICE, "-r", str(rate),
                    "--data-format", f"LEI16@{SR}", "-o", path, syl],
                   check=True)
    with wave.open(path) as f:
        x = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float64)
    os.remove(path)
    x /= 32768.0
    _cache[key] = trim(x)
    return _cache[key]


def trim(x, thr=0.02):
    """앞뒤 조용한 부분을 잘라 낸다."""
    a = np.abs(x)
    m = a.max()
    if m <= 0:
        return x
    idx = np.where(a > thr * m)[0]
    if len(idx) == 0:
        return x
    lo = max(0, idx[0] - int(0.005 * SR))
    hi = min(len(x), idx[-1] + int(0.02 * SR))
    return x[lo:hi]


def shift(x, k, vib):
    """소리를 k배 빠르게 읽어 음을 k배 높인다. vib는 떨리는 정도."""
    if len(x) < 32:
        return x
    n = max(16, int(len(x) / k))
    t = np.arange(n) / SR
    step = k * (1 + vib * np.sin(2 * np.pi * 5.5 * t))
    pos = np.cumsum(step)
    pos = pos[pos < len(x) - 1]
    if len(pos) < 16:
        return x[:16]
    return np.interp(pos, np.arange(len(x)), x)


def fit(x, n):
    """음표 길이에 딱 맞춘다. 모자라면 모음을 늘려서 길게 끈다."""
    if n <= 0:
        return np.zeros(0)
    if len(x) == 0:
        return np.zeros(n)
    if len(x) >= n:
        out = x[:n].copy()
    else:
        a = int(len(x) * 0.45)
        b = min(len(x), a + int(0.06 * SR))
        loop = x[a:b]
        if len(loop) < 64:
            out = np.zeros(n)
            out[:len(x)] = x
        else:
            xf = min(len(loop) // 3, int(0.012 * SR))
            out = x[:a].astype(np.float64).copy()
            while len(out) < n:
                seg = loop.copy()
                if xf > 0 and len(out) > xf:
                    w = np.linspace(0, 1, xf)
                    out[-xf:] = out[-xf:] * (1 - w) + seg[:xf] * w
                    seg = seg[xf:]
                out = np.concatenate([out, seg])
            out = out[:n]
    at = max(1, min(int(0.008 * SR), n // 4))
    rl = max(1, min(int(0.03 * SR), n // 3))
    out[:at] *= np.linspace(0, 1, at)
    out[-rl:] *= np.linspace(1, 0, rl)
    return out


buf = np.zeros(int((S.TOTAL + 1.0) * SR))


def put(at, sig, amp=1.0):
    i = int(at * SR)
    m = min(len(sig), len(buf) - i)
    if m > 0:
        buf[i:i + m] += sig[:m] * amp


def sing(syl, midi, at, beats, shift_semi, vib, amp):
    k = freq(midi + shift_semi) / BASE_F0
    rate = int(min(340, max(100, 200 / k)))
    v = shift(speak(syl, rate), k, vib)
    put(at, fit(v, int(beats * S.BEAT * SR)), amp)


# ---------- 노래 ----------
def vocals():
    for i, s in enumerate(S.SINGERS):
        base = S.seg_start(i)
        print(f"  {i + 1}/{S.N} {s['name']}", flush=True)
        for syl, midi, b, d in S.notes_of(s):
            sing(syl, midi, base + b * S.BEAT, d, s["shift"], s["vib"], 0.95)
    # 마지막은 다 같이
    base = S.N * S.SEG
    print("  다 같이 🎉", flush=True)
    for s in S.SINGERS:
        b = 0.0
        for syl, midi, d in zip(S.FINALE, S.FINALE_NOTE, S.FINALE_DUR):
            sing(syl, midi, base + b * S.BEAT, d, s["shift"], s["vib"], 0.32)
            b += d


# ---------- 반주 ----------
def env(n, a, r, s=1.0):
    e = np.ones(n) * s
    ai = max(1, min(int(a * SR), n))
    ri = max(1, min(int(r * SR), n))
    e[:ai] *= np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e


def tone(midi, dur, kind):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq(midi)
    if kind == "bass":
        w = 0.8 * np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * t) ** 3
        return w * env(n, 0.006, 0.12)
    w = 0.6 * np.sin(2 * np.pi * f * t) + 0.18 * np.sin(6 * np.pi * f * t)
    return w * env(n, 0.004, 0.10)


def kick(dur=0.11):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t * 28) + 48
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)


def hat(dur=0.035):
    n = int(dur * SR)
    rng = np.random.default_rng(7)
    return rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 140)


def backing():
    for i, (root, chord) in enumerate(S.CHORDS):
        base = i * S.SEG
        if base >= S.TOTAL:
            break
        put(base, tone(root, S.BEAT * 1.8, "bass"), 0.30)
        put(base + 2 * S.BEAT, tone(root + 7, S.BEAT * 1.8, "bass"), 0.24)
        for j in range(8):
            put(base + j * S.BEAT / 2, tone(chord[j % 3] + 12, S.BEAT * 0.45, "arp"), 0.055)
        for j in (0, 2):
            put(base + j * S.BEAT, kick(), 0.34)
        for j in range(8):
            if j % 2:
                put(base + j * S.BEAT / 2, hat(), 0.05)


def main():
    print("목소리 만드는 중...")
    vocals()
    print("반주 넣는 중...")
    backing()
    out = buf[:int(S.TOTAL * SR)]
    fi, fo = int(0.15 * SR), int(1.0 * SR)
    out[:fi] *= np.linspace(0, 1, fi)
    out[-fo:] *= np.linspace(1, 0, fo)
    out = np.tanh(out * 1.15)
    out /= max(1e-9, np.abs(out).max())
    out *= 0.92
    with wave.open(OUT, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    print("완성!", OUT, round(len(out) / SR, 2), "초")


if __name__ == "__main__":
    main()
