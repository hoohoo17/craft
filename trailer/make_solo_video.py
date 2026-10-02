#!/usr/bin/env python3
"""'빠른 노래' 영상 (1080x1920, 30fps) -> mp4

한 사람이 가사를 쭉 부른다. 가사는 노래에 맞춰 한 글자씩 켜진다.
같은 가사를 두 번 부르는데 두 번째는 더 빠르다.
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import solo_data as S

W, H, FPS = 1080, 1920, 30
OUT = sys.argv[1] if len(sys.argv) > 1 else "solo-song.mp4"
AUDIO = sys.argv[2] if len(sys.argv) > 2 else "solo-song.wav"

KR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
EMOJI_PATH = "/System/Library/Fonts/Apple Color Emoji.ttc"
INK = (255, 255, 255)

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
        top = mix(color, (255, 255, 255), 0.40)
        bot = mix(color, (24, 18, 46), 0.48)
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
    FLOAT.append(dict(x=r * W, y=r2 * H, size=int(66 + r3 * 70), ch=NOTES[i % len(NOTES)],
                      sp=30 + r3 * 40, ph=r * 6.28, rs=(-1) ** i * (8 + r3 * 14)))


def background(color, t, speed=1.0):
    img = bg_for(color).copy()
    for s in FLOAT:
        x = s["x"] + math.sin(t * 0.7 + s["ph"]) * 46
        y = (s["y"] - t * s["sp"] * speed) % (H + 300) - 150
        paste_emoji(img, s["ch"], s["size"], x, y, alpha=0.28,
                    rot=s["rs"] * math.sin(t * .5 + s["ph"]))
    return img


# ---------- 노래 소리 크기 ----------
def load_levels():
    n = int(S.TOTAL * FPS) + 2
    lv = np.zeros(n)
    if not os.path.exists(AUDIO):
        return lv
    with wave.open(AUDIO) as f:
        sr = f.getframerate()
        x = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    win = int(sr / FPS)
    for i in range(n):
        seg = x[i * win:i * win + win]
        if len(seg):
            lv[i] = math.sqrt(float((seg ** 2).mean()))
    return np.clip(lv / (lv.max() or 1.0), 0, 1)


LEVELS = load_levels()


def level(t):
    i = int(t * FPS)
    return float(LEVELS[i]) if 0 <= i < len(LEVELS) else 0.0


def bars(img, t, y=1620):
    n, bw, bh0 = 17, 34, 150
    lvl = level(t)
    bx = (W - (n * bw + (n - 1) * 14)) / 2
    for j in range(n):
        k = abs(j - (n - 1) / 2) / ((n - 1) / 2)
        hgt = 16 + bh0 * lvl * (1.05 - 0.6 * k) * (0.55 + 0.45 * abs(math.sin(t * 7 + j)))
        rect_a(img, (bx + j * (bw + 14), y - hgt, bx + j * (bw + 14) + bw, y),
               10, (255, 255, 255), 200)


# ---------- 한 줄 그리기 ----------
def draw_line(img, line, y, size, alpha, lit=-1, pulse=0.0):
    """가사 한 줄. lit까지 켜고 나머지는 흐리게."""
    syl = [c for c in line if c != " "]
    brk = S.spaces_of(line)
    gap, wordgap = 10, 34
    lf = fit_font(line + " ", W - 120, size, 6, 30)
    widths = [lf.getlength(c) for c in syl]
    gaps = [(wordgap if j in brk else gap) for j in range(len(widths))]
    x = (W - (sum(widths) + sum(gaps[:-1]))) / 2
    for j, c in enumerate(syl):
        cx = x + widths[j] / 2
        if lit < 0:
            text_a(img, (cx, y), c, lf, INK, alpha)
        elif j <= lit:
            f2 = lf if j != lit else font(int(lf.size * (1 + 0.14 * pulse)), 6)
            shadow_text(img, (cx, y), c, f2, 255)
        else:
            text_a(img, (cx, y), c, lf, INK, 80)
        x += widths[j] + gaps[j]


# ---------- 장면 ----------
def intro(t):
    img = background(S.PALETTE[0], t, 0.6)
    u = clamp(t / 0.6)
    paste_emoji(img, S.VOICE["emoji"], 330, W / 2, 680 - 90 * (1 - ease_out_back(u)),
                alpha=u, scale=0.55 + 0.45 * ease_out_back(u))
    u2 = clamp((t - 0.35) / 0.5)
    shadow_text(img, (W / 2, 1060 + 40 * (1 - u2)), S.TITLE, font(170, 6), int(255 * u2))
    u3 = clamp((t - 0.7) / 0.5)
    shadow_text(img, (W / 2, 1215 + 25 * (1 - u3)), S.AUTHOR, font(62, 4), int(230 * u3))
    u4 = clamp((t - 1.1) / 0.5)
    if u4 > 0:
        txt = "따라 불러 보세요"
        f = font(52, 6)
        pw, ph = f.getlength(txt) + 110, 118
        px, py = (W - pw) / 2, 1360
        rect_a(img, (px, py, px + pw, py + ph), 59, (255, 255, 255), int(240 * u4))
        text_a(img, (W / 2, py + ph / 2), txt, f, (60, 50, 110), int(255 * u4))
    return img


def sing(t, p):
    img = background(p["color"], t, 1.0 + 0.6 * p["section"])
    local = t - p["start"]

    # 지금 부르는 글자
    lit, pulse = -1, 0.0
    for j, e in enumerate(p["events"]):
        if e["at"] <= t < e["at"] + e["dur"]:
            lit = j
            pulse = math.exp(-(t - e["at"]) * 9.0)
            break
    if lit < 0 and t >= p["events"][-1]["at"]:
        lit = len(p["events"]) - 1

    # 위쪽 제목과 진행 막대
    head = S.TITLE
    hf = font(50, 4)
    shadow_text(img, (W / 2 + 32, 132), head, hf, 225)
    paste_emoji(img, "🎤", 56, W / 2 - hf.getlength(head) / 2 - 6, 132, alpha=0.95)
    prog = clamp((t - S.INTRO) / (S.SONG_END - S.INTRO))
    rect_a(img, (90, 186, W - 90, 202), 8, (255, 255, 255), 80)
    if prog > 0.004:
        rect_a(img, (90, 186, 90 + (W - 180) * prog, 202), 8, (255, 255, 255), 245)

    # 노래하는 얼굴 — 박자마다 통통
    bob = math.sin(t * 6.0) * 12
    paste_emoji(img, S.VOICE["emoji"], 260, W / 2, 470 + bob,
                scale=1 + 0.17 * pulse + 0.05 * level(t))

    # 앞 줄 / 지금 줄 / 뒤 줄
    i = S.PLAN.index(p)
    if i > 0 and S.PLAN[i - 1]["section"] == p["section"]:
        draw_line(img, S.PLAN[i - 1]["line"], 800, 50, 85)
    draw_line(img, p["line"], 1020, 104, 255, lit, pulse)
    if i + 1 < len(S.PLAN) and S.PLAN[i + 1]["section"] == p["section"]:
        draw_line(img, S.PLAN[i + 1]["line"], 1235, 50, 85)

    # 두 번째 부를 때 알림
    if p["label"] and p["index"] == 0 and local < 1.2:
        u = clamp(local / 0.25) * clamp((1.2 - local) / 0.3)
        f = font(96, 6)
        pw, ph = f.getlength(p["label"]) + 120, 168
        px, py = (W - pw) / 2, 1282
        rect_a(img, (px, py, px + pw, py + ph), 88, (255, 255, 255), int(245 * u))
        text_a(img, (W / 2, py + ph / 2), p["label"], f, (220, 50, 90), int(255 * u))

    bars(img, t)
    part = f"{p['section'] + 1}번째" + (" · 더 빠르게" if p["section"] else "")
    shadow_text(img, (W / 2, 1755), f"{part}   {p['index'] + 1} / {S.N_LINES}줄",
                font(46, 4), 220)
    return img


def outro(local, t):
    img = background((120, 90, 220), t, 0.7)
    u = clamp(local / 0.4)
    paste_emoji(img, "🎤", 300, W / 2, 620, alpha=u, scale=0.5 + 0.5 * ease_out_back(u))
    for i, ch in enumerate(["🎵", "✨", "🎶", "✨", "🎵"]):
        uu = clamp((local - 0.1 - i * 0.05) / 0.35)
        paste_emoji(img, ch, 120, 180 + i * 180, 900, alpha=uu,
                    scale=0.4 + 0.6 * ease_out_back(uu))
    u2 = clamp((local - 0.3) / 0.45)
    shadow_text(img, (W / 2, 1160 + 40 * (1 - u2)), S.TITLE, font(150, 6), int(255 * u2))
    u3 = clamp((local - 0.55) / 0.45)
    shadow_text(img, (W / 2, 1300 + 25 * (1 - u3)), S.AUTHOR, font(62, 4), int(235 * u3))
    u4 = clamp((local - 0.85) / 0.5)
    if u4 > 0:
        txt = f"{S.N_SYL}글자 · 두 번 불렀습니다"
        f = font(50, 6)
        pw, ph = f.getlength(txt) + 110, 120
        px, py = (W - pw) / 2, 1450
        rect_a(img, (px, py, px + pw, py + ph), 60, (255, 255, 255), int(240 * u4))
        text_a(img, (W / 2, py + ph / 2), txt, f, (90, 60, 180), int(255 * u4))
    return img


def frame(t):
    if t < S.INTRO:
        return intro(t)
    if t >= S.SONG_END:
        return outro(t - S.SONG_END, t)
    p = S.line_at(t) or S.PLAN[-1]
    img = sing(t, p)
    # 줄이 바뀔 때 살짝 번쩍
    local = t - p["start"]
    if local < 0.16:
        u = 1 - local / 0.16
        img.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(110 * u * u))))
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
