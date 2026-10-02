#!/usr/bin/env python3
"""'빠른 노래' — 한 사람이 다 부르는 노래. 가사와 가락. 소리와 영상이 같이 읽는다.

가사는 곽재후가 썼다. 받침이 잔뜩 붙어 있어서 따라 부르기 아주 어렵다.
같은 가사를 두 번 부르는데, 두 번째는 더 빠르다.
"""

TITLE = "빠른 노래"
AUTHOR = "글 곽재후"

# 노래하는 목소리 (맥의 Yuna를 이만큼 높인다. 떨림도 준다.)
VOICE = dict(shift=+5, vib=0.05, emoji="🎤")

BEATS_PER_LINE = 4
INTRO = 2.6
OUTRO = 3.4

# 한 줄이 4박자. 6~8글자가 알맞다.
LINES = [
    "잃 놇랞 한굵일많",
    "알암듣는답 십집업",
    "딸롸붉을 수돍 없닭",
    "묽롢 욀굵임듥음",
    "햇섥엔 싥관입 걹립",
    "겄있곳 읽언 찲",
    "어렵움 놓랩답",
]

# (빠르기, 화면에 띄울 말). 같은 가사를 두 번 부른다.
SECTIONS = [
    (170, ""),
    (225, "더 빠르게!!"),
]

# 가락 모양. 글자 수에 맞춰 늘려 쓴다. 0이 가온다.
SHAPES = [
    [0, 2, 4, 5, 7, 5, 4, 2],
    [7, 7, 9, 11, 12, 11, 9, 7],
    [4, 4, 5, 7, 9, 7, 5, 4],
    [12, 11, 9, 7, 9, 12, 9, 7],
    [0, 4, 7, 4, 5, 2, 0, 0],
    [7, 5, 4, 2, 0, 2, 4, 0],
    [9, 7, 5, 4, 5, 7, 9, 12],
]

# 줄마다 배경색이 바뀐다.
PALETTE = [
    (255, 107, 107), (255, 159, 67), (254, 202, 87), (29, 209, 161),
    (72, 219, 251), (84, 160, 255), (168, 92, 245),
]


def _melody(syl, idx):
    """글자 수에 맞춰 음 높이와 박자를 만든다. 박자 합은 4를 넘지 않는다."""
    n = len(syl)
    if n >= 8:
        step = BEATS_PER_LINE / n
    else:
        step = max(0.5, min(1.0, 3.0 / n))
    last = max(step, min(2.0, BEATS_PER_LINE - step * (n - 1)))
    durs = [step] * (n - 1) + [last]
    shape = SHAPES[idx % len(SHAPES)]
    if n == 1:
        notes = [60 + shape[0]]
    else:
        notes = [60 + shape[round(i * (len(shape) - 1) / (n - 1))] for i in range(n)]
    return notes, durs


def _build():
    """언제 어느 글자를 부르는지 시간표를 만든다."""
    plan, t = [], INTRO
    for si, (bpm, label) in enumerate(SECTIONS):
        beat = 60.0 / bpm
        for li, line in enumerate(LINES):
            syl = [c for c in line if c != " "]
            notes, durs = _melody(syl, li)
            ev, b = [], 0.0
            for c, note, d in zip(syl, notes, durs):
                ev.append(dict(syl=c, note=note, at=t + b * beat, dur=d * beat))
                b += d
            plan.append(dict(section=si, label=label, bpm=bpm, beat=beat,
                             index=li, line=line, syl=syl, events=ev,
                             start=t, end=t + BEATS_PER_LINE * beat,
                             color=PALETTE[li % len(PALETTE)]))
            t += BEATS_PER_LINE * beat
    return plan, t


PLAN, SONG_END = _build()
TOTAL = SONG_END + OUTRO
N_LINES = len(LINES)
N_SYL = sum(len([c for c in l if c != " "]) for l in LINES)


def line_at(t):
    """그 시각에 부르고 있는 줄. 노래 전이나 후면 None."""
    for p in PLAN:
        if p["start"] <= t < p["end"]:
            return p
    return None


def spaces_of(line):
    """몇 번째 글자 뒤에서 띄어 쓰는지 알려 준다."""
    out, i = set(), -1
    for ch in line:
        if ch == " ":
            out.add(i)
        else:
            i += 1
    return out
