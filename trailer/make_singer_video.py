#!/usr/bin/env python3
"""'나의 이야기' 가수 열두 명 노래 영상 (1080x1920, 30fps) -> mp4

2초마다 가수가 바뀐다. 가사는 노래에 맞춰 한 글자씩 켜진다.
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import song_data as S

W, H, FPS = 1080, 1920, 30
OUT = sys.argv[1] if len(sys.argv) > 1 else "singers.mp4"
AUDIO = sys.argv[2] if len(sys.argv) > 2 else "song.wav"

KR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
EMOJI_PATH = "/System/Library/Fonts/Apple Color Emoji.ttc"
INK = (255, 255, 255)

from PIL import ImageFont

_fc = {}


def font(size, weight=6):
    k = (size, weight)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(KR, size, index=weight)
    return _fc[k]


_ef = ImageFont.truetype(EMOJI_PATH, 160)
_ecache = {}


def emoji(ch, size):
    k = (ch, size)
    if k not in _ecache:
        im = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((100, 100), ch, font=_ef, embedded_color=True, anchor="mm")
        _ecache[k] = im.resize((size, size), Image.LANCZOS)
    return _ecache[k]


def paste_emoji(img, ch, size, cx, cy, alpha=1.0, scale=1.0, rot=0.0):
    s = max(4, int(size * scale))
    e = emoji(ch, size)
    if s != size:
        e = e.resize((s, s), Image.LANCZOS)
    if rot:
        e = e.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1.0:
        a = e.getchannel("A").point(lambda v: int(v * alpha))
        e = e.copy()
        e.putalpha(a)
    img.alpha_composite(e, (int(cx - e.width / 2), int(cy - e.height / 2)))


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease_out_back(u, k=1.9):
    u -= 1
    return 1 + u * u * ((k + 1) * u + k)


def mix(c1, c2, u):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * u) for i in range(3))


def fit_font(text, max_w, start, weight=6, floor=22):
    s = start
    while s > floor:
        f = font(s, weight)
        if f.getlength(text) <= max_w:
            return f
        s -= 2
    return font(floor, weight)


def text_a(img, xy, text, f, rgb, alpha=255, anchor="mm"):
    """흐린 글씨. PIL은 RGBA 그림에 바로 쓰면 흐리게 안 되니 따로 써서 겹친다."""
    a = int(max(0, min(255, alpha)))
    if a <= 0:
        return
    d0 = ImageDraw.Draw(img)
    if a >= 254:
        d0.text(xy, text, font=f, anchor=anchor, fill=tuple(rgb) + (255,))
        return
    x0, y0, x1, y1 = d0.textbbox(xy, text, font=f, anchor=anchor)
    pad = 8
    x0, y0 = int(x0) - pad, int(y0) - pad
    w, h = int(x1) - x0 + pad * 2, int(y1) - y0 + pad * 2
    if w <= 0 or h <= 0:
        return
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((xy[0] - x0, xy[1] - y0), text, font=f,
                              anchor=anchor, fill=tuple(rgb) + (255,))
    tile.putalpha(tile.getchannel("A").point(lambda v: v * a // 255))
    img.alpha_composite(tile, (x0, y0))


def rect_a(img, box, radius, rgb, alpha=255):
    """흐린 둥근 네모. 글씨와 같은 이유로 따로 그려서 겹친다."""
    a = int(max(0, min(255, alpha)))
    if a <= 0:
        return
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        return
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius,
                                           fill=tuple(rgb) + (a,))
    img.alpha_composite(tile, (x0, y0))


def shadow_text(img, xy, text, f, alpha=255, rgb=INK, anchor="mm"):
    x, y = xy
    text_a(img, (x + 3, y + 5), text, f, (0, 0, 0), int(alpha * 0.35), anchor)
    text_a(img, (x, y), text, f, rgb, alpha, anchor)


# ---------- 배경 ----------
_bgc = {}


def bg_for(color):
    if color not in _bgc:
        top = mix(color, (255, 255, 255), 0.42)
        bot = mix(color, (26, 20, 48), 0.45)
        im = Image.new("RGB", (1, H))
        px = im.load()
        for y in range(H):
            px[0, y] = mix(top, bot, y / (H - 1))
        _bgc[color] = im.resize((W, H)).convert("RGBA")
    return _bgc[color]


NOTES = ["🎵", "🎶", "✨", "🎤"]
FLOAT = []
for i in range(14):
    r = (i * 2654435761) % 1000 / 1000
    r2 = (i * 40503 + 7919) % 1000 / 1000
    r3 = (i * 97 + 13) % 1000 / 1000
    FLOAT.append(dict(x=r * W, y=r2 * H, size=int(70 + r3 * 70), ch=NOTES[i % len(NOTES)],
                      sp=26 + r3 * 34, ph=r * 6.28, rs=(-1) ** i * (8 + r3 * 14)))


def background(color, t):
    img = bg_for(color).copy()
    for s in FLOAT:
        x = s["x"] + math.sin(t * 0.7 + s["ph"]) * 46
        y = (s["y"] - t * s["sp"]) % (H + 300) - 150
        paste_emoji(img, s["ch"], s["size"], x, y, alpha=0.30, rot=s["rs"] * math.sin(t * .5 + s["ph"]))
    return img


# ---------- 노래 소리 크기 ----------
def load_levels():
    """영상 한 장마다 소리가 얼마나 큰지 미리 재 둔다."""
    n = int(S.TOTAL * FPS) + 2
    lv = np.zeros(n)
    if not os.path.exists(AUDIO):
        return lv
    with wave.open(AUDIO) as f:
        sr = f.getframerate()
        x = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    win = int(sr / FPS)
    for i in range(n):
        a = i * win
        seg = x[a:a + win]
        if len(seg):
            lv[i] = math.sqrt(float((seg ** 2).mean()))
    m = lv.max() or 1.0
    return np.clip(lv / m, 0, 1)


LEVELS = load_levels()


def level(t):
    i = int(t * FPS)
    return float(LEVELS[i]) if 0 <= i < len(LEVELS) else 0.0


# ---------- 가수 한 명 장면 ----------
def singer_scene(i, local, t):
    s = S.SINGERS[i]
    img = background(s["color"], t)
    d = ImageDraw.Draw(img)

    entry = clamp(local / 0.38)
    e = ease_out_back(entry)

    # 위쪽: 제목과 순서 (마이크는 그림이라 따로 붙인다)
    head = "나의 이야기 노래"
    hf = font(52, 4)
    hw = hf.getlength(head)
    shadow_text(img, (W / 2 + 34, 140), head, hf, 225)
    paste_emoji(img, "🎤", 58, W / 2 - hw / 2 - 6, 140, alpha=0.95)

    # 진행 막대
    prog = clamp(t / (S.N * S.SEG))
    rect_a(img, (90, 196, W - 90, 212), 8, (255, 255, 255), 80)
    if prog > 0.004:
        rect_a(img, (90, 196, 90 + (W - 180) * prog, 212), 8, (255, 255, 255), 245)

    # 가수 이름
    name_y = 330 + 70 * (1 - e)
    nf = fit_font(s["name"], W - 150, 140, 6, 60)
    shadow_text(img, (W / 2, name_y), s["name"], nf, int(255 * entry))

    # 얼굴 — 음이 바뀔 때마다 통통 튄다
    notes = S.notes_of(s)
    beat = local / S.BEAT
    pulse, idx = 0.0, -1
    for j, (_syl, _n, b, dur) in enumerate(notes):
        if b <= beat < b + dur:
            idx = j
            pulse = math.exp(-(beat - b) * 7.0)
            break
    bob = math.sin(t * 5.2) * 14
    face = 430
    scale = (0.55 + 0.45 * e) * (1 + 0.16 * pulse + 0.05 * level(t))
    paste_emoji(img, s["emoji"], face, W / 2, 760 + bob, alpha=entry, scale=scale)

    # 입 모양 대신 소리 동그라미
    if entry > 0.6:
        rr = 250 + 120 * level(t)
        ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse((W / 2 - rr, 760 + bob - rr, W / 2 + rr, 760 + bob + rr),
                                     outline=(255, 255, 255, 60), width=6)
        img.alpha_composite(ring)

    # 가사 — 부른 글자부터 켜진다
    gap, wordgap = 10, 34
    brk = S.spaces_of(s)
    lf = fit_font(S.LINES.get(s["name"], "".join(s["syl"])) + " ", W - 150, 92, 6, 40)
    widths = [lf.getlength(c) for c in s["syl"]]
    gaps = [(wordgap if j in brk else gap) for j in range(len(widths))]
    total = sum(widths) + sum(gaps[:-1])
    x = (W - total) / 2
    ly = 1290
    for j, c in enumerate(s["syl"]):
        on = j <= idx if idx >= 0 else beat >= notes[-1][2]
        cx = x + widths[j] / 2
        if on:
            pop = 1.0 if j != idx else 1.0 + 0.14 * pulse
            f2 = lf if pop == 1.0 else font(int(lf.size * pop), 6)
            shadow_text(img, (cx, ly), c, f2, 255)
        else:
            text_a(img, (cx, ly), c, lf, INK, 80)
        x += widths[j] + gaps[j]

    # 소리 막대
    bars, bw, bh0 = 17, 34, 150
    lvl = level(t)
    bx = (W - (bars * bw + (bars - 1) * 14)) / 2
    for j in range(bars):
        k = abs(j - (bars - 1) / 2) / ((bars - 1) / 2)
        hgt = 16 + bh0 * lvl * (1.05 - 0.6 * k) * (0.55 + 0.45 * abs(math.sin(t * 7 + j)))
        rect_a(img, (bx + j * (bw + 14), 1600 - hgt, bx + j * (bw + 14) + bw, 1600),
               10, (255, 255, 255), 200)

    # 아래쪽 순서
    shadow_text(img, (W / 2, 1735), f"{i + 1} / {S.N}번째 가수", font(50, 4), 225)
    return img


# ---------- 마지막 ----------
def finale(local, t):
    img = background((120, 90, 220), t)
    d = ImageDraw.Draw(img)
    cols = 6 if S.N > 12 else 4
    size = 190 if cols == 4 else 132
    pitch = W / (cols + 0.35)
    x0 = (W - pitch * (cols - 1)) / 2
    rows = math.ceil(S.N / cols)
    y0 = 880 - (rows - 1) * (pitch * 0.92) / 2
    for i, s in enumerate(S.SINGERS):
        r, c = divmod(i, cols)
        u = clamp((local - i * 0.028) / 0.35)
        paste_emoji(img, s["emoji"], size, x0 + c * pitch, y0 + r * pitch * 0.92,
                    alpha=u, scale=0.4 + 0.6 * ease_out_back(u))
    u = clamp((local - 0.35) / 0.45)
    shadow_text(img, (W / 2, 1280 + 40 * (1 - u)), S.TITLE, font(150, 6), int(255 * u))
    u2 = clamp((local - 0.6) / 0.45)
    shadow_text(img, (W / 2, 1420 + 25 * (1 - u2)), S.AUTHOR, font(62, 4), int(235 * u2))
    u3 = clamp((local - 0.9) / 0.5)
    if u3 > 0:
        txt = f"노래한 사람 {S.N}명"
        f = font(54, 6)
        pw, ph = f.getlength(txt) + 110, 120
        px, py = (W - pw) / 2, 1560
        rect_a(img, (px, py, px + pw, py + ph), 60, (255, 255, 255), int(240 * u3))
        text_a(img, (W / 2, py + ph / 2), txt, f, (90, 60, 180), int(255 * u3))
    return img


# ---------- 시간표 ----------
XF = 0.22


def frame(t):
    end = S.N * S.SEG
    if t >= end:
        return finale(t - end, t)
    i = min(S.N - 1, int(t / S.SEG))
    local = t - i * S.SEG
    img = singer_scene(i, local, t)
    # 가수가 바뀔 때 잠깐 하얗게 번쩍
    if local < XF and i > 0:
        u = 1 - local / XF
        flash = Image.new("RGBA", (W, H), (255, 255, 255, int(150 * u * u)))
        img.alpha_composite(flash)
    return img


def main():
    n = int(S.TOTAL * FPS)
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-"]
    if os.path.exists(AUDIO):
        cmd += ["-i", AUDIO, "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19",
            "-preset", "medium", "-movflags", "+faststart", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for i in range(n):
        p.stdin.write(frame(i / FPS).convert("RGB").tobytes())
        if i % 60 == 0:
            print(f"  {i}/{n}", flush=True)
    p.stdin.close()
    p.wait()
    print("완성!", OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
