#!/usr/bin/env python3
"""'빠른 노래' — 한 사람이 다 부르는 노래 -> wav

맥의 한국어 목소리(Yuna)로 글자를 하나씩 말하게 한 뒤,
소리를 빠르게/느리게 다시 읽어서 음 높이를 바꾼다. 그러면 노래가 된다.
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

import solo_data as S

SR = 44100
VOICE = "Yuna"
BASE_F0 = 256.4          # Yuna가 평소에 내는 음 높이(Hz)
OUT = sys.argv[1] if len(sys.argv) > 1 else "solo-song.wav"

_tmp = tempfile.mkdtemp(prefix="solo-")
_cache = {}


def freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)


def trim(x, thr=0.02):
    a = np.abs(x)
    m = a.max()
    if m <= 0:
        return x
    idx = np.where(a > thr * m)[0]
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - int(0.005 * SR)):min(len(x), idx[-1] + int(0.02 * SR))]


def speak(syl, rate):
    """글자 하나를 말한 소리. 같은 건 한 번만 만든다."""
    key = (syl, rate)
    if key in _cache:
        return _cache[key]
    path = os.path.join(_tmp, f"{abs(hash(key))}.wav")
    subprocess.run(["say", "-v", VOICE, "-r", str(rate),
                    "--data-format", f"LEI16@{SR}", "-o", path, syl], check=True)
    with wave.open(path) as f:
        x = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float64)
    os.remove(path)
    _cache[key] = trim(x / 32768.0)
    return _cache[key]


def shift(x, k, vib):
    """소리를 k배 빠르게 읽어 음을 k배 높인다."""
    if len(x) < 32:
        return x
    n = max(16, int(len(x) / k))
    t = np.arange(n) / SR
    pos = np.cumsum(k * (1 + vib * np.sin(2 * np.pi * 5.5 * t)))
    pos = pos[pos < len(x) - 1]
    if len(pos) < 16:
        return x[:16]
    return np.interp(pos, np.arange(len(x)), x)


def fit(x, n):
    """음표 길이에 딱 맞춘다. 모자라면 모음을 늘려 끈다."""
    if n <= 0:
        return np.zeros(0)
    if len(x) == 0:
        return np.zeros(n)
    if len(x) >= n:
        out = x[:n].astype(np.float64).copy()
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
    at = max(1, min(int(0.006 * SR), n // 4))
    rl = max(1, min(int(0.025 * SR), n // 3))
    out[:at] *= np.linspace(0, 1, at)
    out[-rl:] *= np.linspace(1, 0, rl)
    return out


buf = np.zeros(int((S.TOTAL + 1.0) * SR))


def put(at, sig, amp=1.0):
    i = int(at * SR)
    m = min(len(sig), len(buf) - i)
    if m > 0:
        buf[i:i + m] += sig[:m] * amp


def vocals():
    sh, vib = S.VOICE["shift"], S.VOICE["vib"]
    for p in S.PLAN:
        if p["index"] == 0:
            print(f"  {p['section'] + 1}번째, {p['bpm']}bpm", flush=True)
        for e in p["events"]:
            k = freq(e["note"] + sh) / BASE_F0
            rate = int(min(340, max(100, 200 / k)))
            v = shift(speak(e["syl"], rate), k, vib)
            put(e["at"], fit(v, int(e["dur"] * SR)), 0.95)


# ---------- 반주 ----------
def env(n, a, r):
    e = np.ones(n)
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
        return w * env(n, 0.005, 0.10)
    w = 0.6 * np.sin(2 * np.pi * f * t) + 0.18 * np.sin(6 * np.pi * f * t)
    return w * env(n, 0.003, 0.08)


def kick(dur=0.10):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 125 * np.exp(-t * 30) + 48
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 24)


_rng = np.random.default_rng(11)
_HAT = _rng.standard_normal(int(0.03 * SR)) * np.exp(-np.arange(int(0.03 * SR)) / SR * 160)
_SNARE = _rng.standard_normal(int(0.09 * SR)) * np.exp(-np.arange(int(0.09 * SR)) / SR * 45)

PROG = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]


def backing():
    for p in S.PLAN:
        beat, base = p["beat"], p["start"]
        root, chord = PROG[p["index"] % len(PROG)]
        put(base, tone(root, beat * 1.8, "bass"), 0.30)
        put(base + 2 * beat, tone(root + 7, beat * 1.8, "bass"), 0.24)
        for j in range(8):
            put(base + j * beat / 2, tone(chord[j % 3] + 12, beat * 0.45, "arp"), 0.05)
        for j in (0, 2):
            put(base + j * beat, kick(), 0.34)
        for j in (1, 3):
            put(base + j * beat, _SNARE, 0.10)
        for j in range(8):
            if j % 2:
                put(base + j * beat / 2, _HAT, 0.05)
    # 마지막 쿵
    put(S.SONG_END, kick(0.2), 0.42)
    put(S.SONG_END, tone(48, 1.2, "bass"), 0.30)


def main():
    print("목소리 만드는 중...")
    vocals()
    print("반주 넣는 중...")
    backing()
    out = buf[:int(S.TOTAL * SR)]
    fi, fo = int(0.12 * SR), int(1.1 * SR)
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
