#!/usr/bin/env python3
"""craft 게임 모음 트레일러 (1080x1920, 30fps, 20s) -> mp4"""
import math, re, subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
OUT = sys.argv[1] if len(sys.argv) > 1 else "trailer.mp4"
SRC = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "index.html")
AUDIO = sys.argv[3] if len(sys.argv) > 3 else None

NAVY = (44, 53, 96)
SUB = (124, 134, 168)
PASTEL = [(255, 210, 122), (255, 159, 184), (140, 220, 174),
          (127, 176, 255), (188, 164, 255), (127, 221, 228)]

KR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
EMOJI_PATH = "/System/Library/Fonts/Apple Color Emoji.ttc"
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


def paste_emoji(img, ch, size, cx, cy, alpha=1.0, scale=1.0):
    s = max(4, int(size * scale))
    e = emoji(ch, size)
    if s != size:
        e = e.resize((s, s), Image.LANCZOS)
    if alpha < 1.0:
        a = e.getchannel("A").point(lambda v: int(v * alpha))
        e = e.copy()
        e.putalpha(a)
    img.alpha_composite(e, (int(cx - s / 2), int(cy - s / 2)))


def games():
    h = open(SRC, encoding="utf-8").read()
    # 카드에 data-cat 같은 다른 속성이 붙어도 읽히게 한다
    return re.findall(
        r'<a [^>]*href="https://hoohoo17\.github\.io/craft/[^"]+"[^>]*>\s*'
        r'<span class="ico">([^<]*)</span>\s*<span class="title">([^<]*)</span>', h)


GAMES = games()
N = len(GAMES)

# ---------- background ----------
_bg_base = None


def bg_base():
    global _bg_base
    if _bg_base is None:
        im = Image.new("RGB", (1, H))
        px = im.load()
        top, bot = (247, 249, 255), (232, 240, 255)
        for y in range(H):
            u = y / (H - 1)
            px[0, y] = tuple(int(top[i] + (bot[i] - top[i]) * u) for i in range(3))
        _bg_base = im.resize((W, H)).convert("RGBA")
    return _bg_base


SQUARES = []
for i in range(16):
    r = (i * 2654435761) % 1000 / 1000
    r2 = (i * 40503 + 7919) % 1000 / 1000
    r3 = (i * 97 + 13) % 1000 / 1000
    SQUARES.append(dict(x=r * W, y=r2 * H, size=90 + r3 * 150,
                        col=PASTEL[i % len(PASTEL)], sp=0.35 + r3 * 0.9,
                        ph=r * 6.28, rot=r2 * 360, rs=(-1) ** i * (6 + r3 * 10)))


def background(t):
    img = bg_base().copy()
    for s in SQUARES:
        sz = int(s["size"])
        tile = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        ImageDraw.Draw(tile).rounded_rectangle(
            (0, 0, sz - 1, sz - 1), radius=sz // 4, fill=s["col"] + (58,))
        tile = tile.rotate(s["rot"] + s["rs"] * t, resample=Image.BICUBIC, expand=True)
        x = s["x"] + math.sin(t * s["sp"] + s["ph"]) * 40
        y = (s["y"] - t * s["sp"] * 26) % (H + 400) - 200
        img.alpha_composite(tile, (int(x - tile.width / 2), int(y - tile.height / 2)))
    return img


# ---------- helpers ----------
def shadow_card(img, box, radius, fill, alpha=255, blur_pad=14):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", (int(x1 - x0) + blur_pad * 2, int(y1 - y0) + blur_pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        (blur_pad, blur_pad + 6, sh.width - blur_pad, sh.height - blur_pad + 6),
        radius=radius, fill=(44, 53, 96, int(26 * alpha / 255)))
    from PIL import ImageFilter
    sh = sh.filter(ImageFilter.GaussianBlur(9))
    img.alpha_composite(sh, (int(x0 - blur_pad), int(y0 - blur_pad)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=radius, fill=fill[:3] + (alpha,))


def fit_font(text, max_w, start, weight=6, floor=22):
    s = start
    while s > floor:
        f = font(s, weight)
        if f.getlength(text) <= max_w:
            return f
        s -= 2
    return font(floor, weight)


def ease_out_back(u, k=1.7):
    u -= 1
    return 1 + u * u * ((k + 1) * u + k)


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


# ---------- scene 1: intro ----------
def intro(t, local):
    img = background(t)
    d = ImageDraw.Draw(img)
    cy = 780
    u = clamp(local / 0.55)
    paste_emoji(img, "🎮", 300, W / 2, cy - 120 * (1 - ease_out_back(u)), alpha=u,
                scale=0.6 + 0.4 * ease_out_back(u))
    u2 = clamp((local - 0.35) / 0.5)
    f = font(150, 6)
    d.text((W / 2, cy + 260 + 40 * (1 - u2)), "게임 모음", font=f, anchor="mm",
           fill=NAVY + (int(255 * u2),))
    u3 = clamp((local - 0.7) / 0.5)
    d.text((W / 2, cy + 390 + 30 * (1 - u3)), f"곽재후가 만든 게임 {N}개", font=font(56, 4),
           anchor="mm", fill=SUB + (int(255 * u3),))
    u4 = clamp((local - 1.0) / 0.5)
    if u4 > 0:
        txt = "전부 웹에서 바로 플레이"
        f2 = font(44, 4)
        tw = f2.getlength(txt)
        pw, ph = tw + 80, 92
        px, py = (W - pw) / 2, cy + 480
        shadow_card(img, (px, py, px + pw, py + ph), 46, (255, 255, 255), int(255 * u4))
        ImageDraw.Draw(img).text((W / 2, py + ph / 2), txt, font=f2, anchor="mm",
                                 fill=NAVY + (int(255 * u4),))
    return img


# ---------- scene 2: card shelf scroll ----------
COLS, MARGIN, GAP = 2, 60, 36
CW = (W - MARGIN * 2 - GAP * (COLS - 1)) // COLS
CH = 300
PITCH = CH + GAP
ROWS = math.ceil(N / COLS)
GRID_H = ROWS * PITCH - GAP
TOP_PAD, BOT_PAD = 300, 260
SCROLL = GRID_H + TOP_PAD + BOT_PAD - H


def trapezoid(u, e=0.12):
    if u <= 0:
        return 0.0
    if u >= 1:
        return 1.0
    tot = 1 - e
    if u < e:
        s = u * u / (2 * e)
    elif u > 1 - e:
        s = e / 2 + (1 - 2 * e) + (e * e - (1 - u) ** 2) / (2 * e)
    else:
        s = e / 2 + (u - e)
    return clamp(s / tot)


def shelf(t, local, dur):
    img = background(t)
    off = trapezoid(local / dur) * SCROLL
    for i, (ico, name) in enumerate(GAMES):
        r, c = divmod(i, COLS)
        y = TOP_PAD + r * PITCH - off
        if y > H + 40 or y + CH < -40:
            continue
        x = MARGIN + c * (CW + GAP)
        p = clamp((H - 60 - y) / 240)
        p = ease_out_back(p) if p < 1 else 1.0
        sc = 0.86 + 0.14 * p
        a = int(255 * clamp((H - 20 - y) / 200))
        cw, ch = CW * sc, CH * sc
        cx, cy = x + CW / 2, y + CH / 2
        box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
        shadow_card(img, box, int(44 * sc), (255, 255, 255), a)
        tint = PASTEL[i % len(PASTEL)]
        ImageDraw.Draw(img).rounded_rectangle(
            (box[0], box[1], box[2], box[1] + 12 * sc), radius=6, fill=tint + (a,))
        paste_emoji(img, ico.strip(), 130, cx, cy - 42 * sc, alpha=a / 255, scale=sc)
        f = fit_font(name, cw - 44, int(46 * sc), 6, 20)
        ImageDraw.Draw(img).text((cx, cy + 82 * sc), name, font=f, anchor="mm",
                                 fill=NAVY + (a,))
    # top bar
    bar = Image.new("RGBA", (W, 210), (0, 0, 0, 0))
    ImageDraw.Draw(bar).rectangle((0, 0, W, 210), fill=(247, 249, 255, 255))
    img.alpha_composite(bar, (0, 0))
    paste_emoji(img, "🎮", 78, 100, 108)
    d = ImageDraw.Draw(img)
    d.text((156, 108), "게임 모음", font=font(60, 6), anchor="lm", fill=NAVY + (255,))
    shown = min(N, int(1 + (off + H - TOP_PAD) / PITCH) * COLS)
    d.text((W - 60, 108), f"{shown} / {N}", font=font(46, 4), anchor="rm", fill=SUB + (255,))
    d.line((0, 210, W, 210), fill=(226, 233, 246, 255), width=3)
    return img


# ---------- scene 3: outro ----------
def outro(t, local):
    img = background(t)
    d = ImageDraw.Draw(img)
    picks = ["🐍", "💣", "🔢", "🚪", "🌀", "🧱", "🪐", "🍫"]
    for i, ch in enumerate(picks):
        r, c = divmod(i, 4)
        u = clamp((local - i * 0.05) / 0.4)
        paste_emoji(img, ch, 150, 190 + c * 234, 560 + r * 210,
                    alpha=u, scale=0.5 + 0.5 * ease_out_back(u))
    u = clamp((local - 0.3) / 0.5)
    d.text((W / 2, 1150 + 30 * (1 - u)), f"{N}개 전부 무료", font=font(110, 6),
           anchor="mm", fill=NAVY + (int(255 * u),))
    u2 = clamp((local - 0.55) / 0.5)
    d.text((W / 2, 1275 + 20 * (1 - u2)), "지금 바로 플레이", font=font(56, 4),
           anchor="mm", fill=SUB + (int(255 * u2),))
    u3 = clamp((local - 0.85) / 0.5)
    if u3 > 0:
        pulse = 1 + 0.02 * math.sin(local * 6)
        txt = "hoohoo17.github.io/craft"
        f = font(52, 6)
        pw, ph = (f.getlength(txt) + 110) * pulse, 128 * pulse
        px, py = (W - pw) / 2, 1440
        shadow_card(img, (px, py, px + pw, py + ph), int(ph / 2), (44, 53, 96), int(255 * u3))
        ImageDraw.Draw(img).text((W / 2, py + ph / 2), txt, font=f, anchor="mm",
                                 fill=(255, 255, 255, int(255 * u3)))
    return img


# ---------- timeline ----------
INTRO_D, SHELF_D, OUTRO_D = 3.2, 14.0, 3.4
TOTAL = INTRO_D + SHELF_D + OUTRO_D
XF = 0.5


def frame(t):
    if t < INTRO_D - XF:
        return intro(t, t)
    if t < INTRO_D:
        a = intro(t, t)
        b = shelf(t, 0, SHELF_D)
        return Image.blend(a, b, (t - (INTRO_D - XF)) / XF)
    s = t - INTRO_D
    if s < SHELF_D - XF:
        return shelf(t, s, SHELF_D)
    if s < SHELF_D:
        a = shelf(t, s, SHELF_D)
        b = outro(t, 0)
        return Image.blend(a, b, (s - (SHELF_D - XF)) / XF)
    return outro(t, s - SHELF_D)


def main():
    n = int(TOTAL * FPS)
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-"]
    if AUDIO:
        cmd += ["-i", AUDIO, "-c:a", "aac", "-b:a", "160k", "-shortest"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-preset", "medium", "-movflags", "+faststart", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for i in range(n):
        im = frame(i / FPS).convert("RGB")
        p.stdin.write(im.tobytes())
        if i % 30 == 0:
            print(f"  {i}/{n}", flush=True)
    p.stdin.close()
    p.wait()
    print("done", OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
