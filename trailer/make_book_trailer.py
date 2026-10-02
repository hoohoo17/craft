#!/usr/bin/env python3
"""곽재후의 진짜 책 『나의 이야기』 소개 영상 (1080x1920, 30fps, ~17.5초) -> mp4

교보문고(kyobobook.co.kr)에 실제로 나온 책을 축하하는 영상이다.
표지 그림은 교보문고 상품 페이지에서 받아 둔 book_cover.jpg를 쓴다.
"""
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else "book-trailer.mp4"
AUDIO = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "music.wav")
COVER_PATH = os.path.join(HERE, "book_cover.jpg")

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


# ---------- background (트레일러와 같은 배경) ----------
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


def shadow_card(img, box, radius, fill, alpha=255, blur_pad=14):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", (int(x1 - x0) + blur_pad * 2, int(y1 - y0) + blur_pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        (blur_pad, blur_pad + 6, sh.width - blur_pad, sh.height - blur_pad + 6),
        radius=radius, fill=(44, 53, 96, int(26 * alpha / 255)))
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


# ---------- 표지 그림 ----------
_cover = None


def cover():
    global _cover
    if _cover is None:
        im = Image.open(COVER_PATH)
        im = ImageOps.exif_transpose(im).convert("RGBA")
        _cover = im
    return _cover


def cover_card(img, cx, cy, w, alpha=255, corner=22):
    c = cover()
    h = int(w * c.height / c.width)
    c2 = c.resize((int(w), h), Image.LANCZOS)
    box = (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    shadow_card(img, box, corner, (255, 255, 255), alpha, blur_pad=20)
    mask = Image.new("L", c2.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, c2.size[0] - 1, c2.size[1] - 1),
                                            radius=corner, fill=255)
    if alpha < 255:
        a = mask.point(lambda v: int(v * alpha / 255))
    else:
        a = mask
    tmp = c2.copy()
    tmp.putalpha(a)
    img.alpha_composite(tmp, (int(box[0]), int(box[1])))


# ---------- scene 1: 검색하면 ----------
def scene_search(t, local):
    img = background(t)
    d = ImageDraw.Draw(img)
    cy = 780
    u = clamp(local / 0.5)
    paste_emoji(img, "🔍", 220, W / 2, cy - 260 - 60 * (1 - ease_out_back(u)), alpha=u,
                scale=0.6 + 0.4 * ease_out_back(u))
    u2 = clamp((local - 0.35) / 0.5)
    d.text((W / 2, cy - 20 + 20 * (1 - u2)), "교보문고에서", font=font(70, 5),
           anchor="mm", fill=SUB + (int(255 * u2),))
    u3 = clamp((local - 0.7) / 0.5)
    if u3 > 0:
        txt = "곽재후"
        f2 = font(140, 7)
        tw = f2.getlength(txt)
        pw, ph = tw + 100, 176
        px, py = (W - pw) / 2, cy + 90
        shadow_card(img, (px, py, px + pw, py + ph), 40, (255, 255, 255), int(255 * u3))
        ImageDraw.Draw(img).text((W / 2, py + ph / 2), txt, font=f2, anchor="mm",
                                 fill=NAVY + (int(255 * u3),))
    u4 = clamp((local - 1.15) / 0.5)
    d.text((W / 2, cy + 380 + 20 * (1 - u4)), "검색하면...", font=font(56, 4),
           anchor="mm", fill=SUB + (int(255 * u4),))
    return img


# ---------- scene 2: 표지 공개 ----------
def scene_reveal(t, local):
    img = background(t)
    d = ImageDraw.Draw(img)
    u = clamp(local / 0.6)
    e = ease_out_back(u)
    cover_card(img, W / 2, 860, 560 * (0.7 + 0.3 * e), alpha=int(255 * u))
    u2 = clamp((local - 0.55) / 0.5)
    d.text((W / 2, 1440 + 20 * (1 - u2)), "나의 이야기", font=font(96, 7),
           anchor="mm", fill=NAVY + (int(255 * u2),))
    u3 = clamp((local - 0.85) / 0.5)
    d.text((W / 2, 1540 + 20 * (1 - u3)), "곽재후 지음 · 진짜 책!", font=font(50, 5),
           anchor="mm", fill=SUB + (int(255 * u3),))
    u4 = clamp((local - 1.2) / 0.5)
    if u4 > 0:
        paste_emoji(img, "🎉", 130, W / 2 - 300, 300, alpha=u4, scale=0.5 + 0.5 * ease_out_back(u4))
        paste_emoji(img, "🎉", 130, W / 2 + 300, 300, alpha=u4, scale=0.5 + 0.5 * ease_out_back(u4))
    return img


# ---------- scene 3: 줄거리 ----------
BLURB_LINES = [
    "설날에 던진 윷 한 번이",
    "온 마을의 일 년을 바꿨다",
    "마흔두 개로 이어지는 이야기",
    "소리 내어 읽으면 더 재미있다",
]


def scene_blurb(t, local):
    img = background(t)
    d = ImageDraw.Draw(img)
    paste_emoji(img, "📖", 150, W / 2, 380, alpha=1.0)
    y0 = 620
    gap = 210
    for i, line in enumerate(BLURB_LINES):
        u = clamp((local - i * 1.35) / 0.5)
        if u <= 0:
            continue
        e = ease_out_back(u)
        f = fit_font(line, W - 140, 62, 5, 30)
        py = y0 + i * gap + 40 * (1 - e)
        pw = f.getlength(line) + 90
        px = (W - pw) / 2
        shadow_card(img, (px, py - 55, px + pw, py + 55), 40, (255, 255, 255), int(230 * u))
        ImageDraw.Draw(img).text((W / 2, py), line, font=f, anchor="mm",
                                 fill=NAVY + (int(255 * u),))
    return img


# ---------- scene 4: outro ----------
def scene_outro(t, local):
    img = background(t)
    d = ImageDraw.Draw(img)
    u = clamp(local / 0.5)
    e = ease_out_back(u)
    cover_card(img, W / 2, 560, 320 * (0.7 + 0.3 * e), alpha=int(255 * u))
    u2 = clamp((local - 0.3) / 0.5)
    d.text((W / 2, 980 + 20 * (1 - u2)), "9,000원", font=font(96, 7),
           anchor="mm", fill=NAVY + (int(255 * u2),))
    u3 = clamp((local - 0.55) / 0.5)
    d.text((W / 2, 1090 + 20 * (1 - u3)), "교보문고에서 살 수 있어요", font=font(52, 5),
           anchor="mm", fill=SUB + (int(255 * u3),))
    u4 = clamp((local - 0.9) / 0.5)
    if u4 > 0:
        pulse = 1 + 0.02 * math.sin(local * 6)
        txt = "kyobobook.co.kr"
        f = font(48, 6)
        pw, ph = (f.getlength(txt) + 110) * pulse, 120 * pulse
        px, py = (W - pw) / 2, 1280
        shadow_card(img, (px, py, px + pw, py + ph), int(ph / 2), (44, 53, 96), int(255 * u4))
        ImageDraw.Draw(img).text((W / 2, py + ph / 2), txt, font=f, anchor="mm",
                                 fill=(255, 255, 255, int(255 * u4)))
    u5 = clamp((local - 1.2) / 0.5)
    if u5 > 0:
        paste_emoji(img, "✨", 110, W / 2 - 260, 1470, alpha=u5, scale=0.5 + 0.5 * ease_out_back(u5))
        paste_emoji(img, "📚", 130, W / 2, 1470, alpha=u5, scale=0.5 + 0.5 * ease_out_back(u5))
        paste_emoji(img, "✨", 110, W / 2 + 260, 1470, alpha=u5, scale=0.5 + 0.5 * ease_out_back(u5))
    return img


# ---------- timeline ----------
SEARCH_D, REVEAL_D, BLURB_D, OUTRO_D = 3.0, 3.2, 6.4, 4.0
TOTAL = SEARCH_D + REVEAL_D + BLURB_D + OUTRO_D
XF = 0.5


def frame(t):
    if t < SEARCH_D - XF:
        return scene_search(t, t)
    if t < SEARCH_D:
        a = scene_search(t, t)
        b = scene_reveal(t, 0)
        return Image.blend(a, b, (t - (SEARCH_D - XF)) / XF)
    s = t - SEARCH_D
    if s < REVEAL_D - XF:
        return scene_reveal(t, s)
    if s < REVEAL_D:
        a = scene_reveal(t, s)
        b = scene_blurb(t, 0)
        return Image.blend(a, b, (s - (REVEAL_D - XF)) / XF)
    s2 = s - REVEAL_D
    if s2 < BLURB_D - XF:
        return scene_blurb(t, s2)
    if s2 < BLURB_D:
        a = scene_blurb(t, s2)
        b = scene_outro(t, 0)
        return Image.blend(a, b, (s2 - (BLURB_D - XF)) / XF)
    return scene_outro(t, s2 - BLURB_D)


def main():
    n = int(TOTAL * FPS)
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-"]
    if AUDIO and os.path.exists(AUDIO):
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
