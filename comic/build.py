# -*- coding: utf-8 -*-
"""story/index.html 의 이야기를 만화 칸(panel)으로 바꿔서 comic/story.js 를 만든다.
   이야기가 바뀌면 python3 comic/build.py 만 다시 돌리면 만화도 같이 바뀐다."""
import re, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 등장인물 이름 (긴 이름부터 찾아야 겹치는 이름을 안 놓친다)
NAMES = [
    '잉잉을할랑','뿌파뿌포','빠푸뽀푸','뽀파뽀프','초차초츠','초추초추','차추초추',
    '추루룹','추르릅','촤르릅','쀼보부','꼬르륵','기다랑','기다래','홀짝훌','훌짝훌',
    '주최자','쨍그랑','부릉부','우당탕','뾰뿝','냠냠냠','또각또','콰콰쾅','촉촉촉',
    '방긋방','삐뽀삐','짭짭짭','후루룩','꿀꺽꿀','뚜두둡','빠바밥','찌지직','딸깍딱',
    '팡파팡','헐레벌','스르륵','데굴데','텀벙텀','킁킁킁','쭈룹쭙','홀짝훌','원장님',
    '우편배달부',
]
NAMES = sorted(set(NAMES), key=len, reverse=True)

# "그때 촤르릅이 말했다." 처럼 누가 말하는지만 알려 주는 짧은 문장 — 말풍선에 이름이 나오니 빼도 된다
SAY_ONLY = r'^(?:그때|그러자|그리고|그런데)?\s*[^.!?]{0,26}(?:말했다|말한다|소리쳤다|외쳤다|물었다|답했다|대답했다|발표했다|선언했다)\.?$'

SAY = r'(?:말했다|말한다|소리쳤다|외쳤다|물었다|답했다|대답했다|속삭였다|발표했다|선언했다|말씀|말하며|말하자)'

# 배경: 글에 이런 말이 나오면 그 배경을 그린다 (위에서부터 먼저 맞는 것)
BG_RULES = [
    ('storm',  ['태풍','우르릉','천둥','비바람']),
    ('sea',    ['바다','항구','방파제','배를 타','배가 출발','섬 동물원','섬에','선장','뱃삯','배 위']),
    ('park',   ['동물원','기린','공원','아카시아','울타리']),
    ('snow',   ['눈발','눈이 소복','대윷놀이','윷판','설날 아침','떡국']),
    ('home',   ['윷놀이','윷가락','윷을','윷 하나','거실','우리 집','집에서']),
    ('factory',['공장','간장통','창고','메주','급속 간장','간장 100통']),
    ('shop',   ['식당','떡볶이','국수','가게','주방','만두','식혜','배달']),
    ('letter', ['편지','봉투','우체','수첩']),
    ('stage',  ['대회','무대','이젤','심사','트로피','광장','관객','그림','우승']),
    ('screen', ['온라인','조별리그','골대','축구','화면','채팅','승부차기','게임']),
    ('road',   ['트럭','마당','골목','길로']),
]

# 효과음처럼 읽히는 대사는 말풍선 대신 큰 효과 글자로 그린다
FX_HINTS = ['꼬르르','따르릉','부우우','삐빅','슈우웅','우르릉','콰콰쾅','보글보글',
            '쿠구궁','콸콸콸','삑—','땡!','부릉','쨍그랑!']

def parse_pages():
    src = open(os.path.join(ROOT, 'story', 'index.html'), encoding='utf-8').read()
    s = src.index('const PAGES = [')
    e = src.index('\n];', s)
    raw = re.findall(r'`(.*?)`', src[s:e], re.S)
    pages = []
    for p in raw:
        items = []
        for m in re.finditer(r'<(h1|p|div)(?:\s+class="([a-z-]+)")?>(.*?)</\1>', p, re.S):
            cls = m.group(2) or ('title' if m.group(1) == 'h1' else 'n')
            txt = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(3))).strip()
            if txt:
                items.append((cls, txt))
        pages.append(items)
    return pages

def names_in(text):
    """글에 나오는 사람 이름을, 나온 순서대로"""
    found = []
    for n in NAMES:
        i = text.find(n)
        if i >= 0:
            found.append((i, n))
    found.sort()
    out = []
    for _, n in found:
        # 긴 이름 안에 들어 있는 짧은 이름은 빼기 (홀짝훌 안의 훌짝훌 같은 경우)
        if any(n != o and n in o for o in [x for _, x in found]):
            continue
        if n not in out:
            out.append(n)
    return out

def pick_bg(text):
    for key, words in BG_RULES:
        for w in words:
            if w in text:
                return key
    return 'day'

def is_fx(q):
    return any(h in q for h in FX_HINTS)

def guess_speaker(quote, prev_narr):
    """누가 한 말인지 확실할 때만 알려 준다. 애매하면 None."""
    q = quote.strip('"\u201c\u201d ')
    if '뾰뿝' in q and q.rstrip('.! ').endswith('뾰뿝'):
        return '뾰뿝'
    if not prev_narr:
        return None
    # "촤르릅이 말했다" 처럼 대놓고 알려 주는 경우 — 대사에 제일 가까운 이름을 고른다
    best, best_at = None, -1
    for n in NAMES:
        for m in re.finditer(re.escape(n) + r'(?:\s*씨)?(?:가|이|은|는)?\s*[^.!?"]{0,20}' + SAY, prev_narr):
            if m.start() > best_at:
                best, best_at = n, m.start()
    cand = best
    if not cand:
        # 앞 문장에 '누가' 하고 나오는 이름이 딱 하나면 그 사람이 말한 것으로 본다
        ns = [n for n in names_in(prev_narr)
              if re.search(re.escape(n) + r'(?:\s*씨)?(?:가|이|은|는|도|의)', prev_narr)]
        cand = ns[0] if len(ns) == 1 else None
    if not cand:
        return None
    # 말 안에 그 이름이 나오면(촤르릅아~, 냠냠냠!!) 말한 사람은 딴 사람이다.
    # 뾰뿝만은 말끝마다 자기 이름을 붙이는 버릇이 있어서 그대로 둔다.
    if cand != '뾰뿝' and cand in q:
        return None
    return cand

def build():
    pages = parse_pages()
    prev_bg = 'day'
    panels = []          # 만화 칸을 쭉 늘어놓는다. 쪽 나누기는 그다음에.
    chapter_no = 0

    for items in pages:
        text = ' '.join(t for _, t in items)
        bg = pick_bg(text)
        if bg == 'day':
            bg = prev_bg
        prev_bg = bg
        cast_all = names_in(text)

        if any(c == 'title' for c, _ in items):
            panels.append({'k': 'cover'})
            continue

        # 먼저 각 대사마다 "누가 말했는지"를 찾아 둔다.
        # 앞 문장에서 못 찾으면 바로 뒤 문장도 본다 ("...!" 하고 촤르릅이 소리쳤다).
        who_of, drop_n, used_n = {}, set(), set()
        for i, (cls, txt) in enumerate(items):
            if cls != 'quote' or is_fx(txt):
                continue
            for j in range(i - 1, -1, -1):          # 바로 앞의 설명 문장
                if items[j][0] == 'quote':
                    j = -1
                    break
                if items[j][0] == 'n':
                    break
            else:
                j = -1
            who = None
            if j >= 0 and j not in used_n:
                who = guess_speaker(txt, items[j][1])
                if who:
                    used_n.add(j)
                    if re.match(SAY_ONLY, items[j][1]):
                        drop_n.add(j)               # 말풍선에 이름이 있으니 뺀다
            if not who and i + 1 < len(items) and items[i+1][0] == 'n' and (i+1) not in used_n:
                who = guess_speaker(txt, items[i+1][1])
                if who:
                    used_n.add(i+1)
                    if re.match(SAY_ONLY, items[i+1][1]):
                        drop_n.add(i+1)
            if who:
                who_of[i] = who

        scene = None

        def close_scene():
            nonlocal scene
            if scene:
                if not scene['cast']:
                    scene['cast'] = cast_all[:2]
                scene['cast'] = scene['cast'][:4]
                panels.append(scene)
                scene = None

        for i, (cls, txt) in enumerate(items):
            if cls == 'n' and i in drop_n:
                continue

            if cls == 'chapter':
                close_scene()
                chapter_no += 1
                panels.append({'k': 'chapter', 's': txt, 'no': chapter_no})
                continue

            if cls == 'ending':
                close_scene()
                panels.append({'k': 'end'})
                continue

            if cls in ('turn', 'goal'):
                close_scene()
                panels.append({'k': 'bang', 's': txt.strip('"\u201c\u201d '),
                               'gold': cls == 'goal'})
                continue

            if cls == 'list':
                if panels and panels[-1]['k'] == 'board' and not scene and len(panels[-1]['lines']) < 6:
                    panels[-1]['lines'].append(txt)
                else:
                    close_scene()
                    panels.append({'k': 'board', 'lines': [txt]})
                continue

            if scene is None or len(scene['lines']) >= 3:
                close_scene()
                scene = {'k': 'scene', 'bg': bg, 'cast': [], 'lines': []}

            if cls == 'quote':
                q = txt.strip()
                if is_fx(q):
                    scene['lines'].append({'t': 'fx', 's': q.strip('"\u201c\u201d ')})
                else:
                    who = who_of.get(i)
                    scene['lines'].append({'t': 'q', 'who': who, 's': q})
                    if who and who not in scene['cast']:
                        scene['cast'].append(who)
            else:
                scene['lines'].append({'t': 'n', 's': txt})
                for n in names_in(txt):
                    if n not in scene['cast']:
                        scene['cast'].append(n)

        close_scene()

    # 칸을 만화 쪽에 나눠 담는다 (한 쪽이 너무 빽빽하지 않게)
    def weight(p):
        if p['k'] == 'scene':  return max(2, len(p['lines']))
        if p['k'] == 'bang':   return 2
        if p['k'] == 'end':    return 6
        if p['k'] == 'board':  return 2 + len(p['lines'])
        if p['k'] == 'chapter':return 2
        return 6
    comic, cur, w, ch = [], [], 0, None
    def flush():
        nonlocal cur, w
        if cur:
            comic.append({'ch': ch, 'panels': cur})
            cur, w = [], 0
    for p in panels:
        if p['k'] in ('chapter', 'cover', 'end') or w + weight(p) > 6 or len(cur) >= 3:
            flush()
        if p['k'] == 'chapter':
            ch = p['s']
        cur.append(p); w += weight(p)
        if p['k'] in ('cover', 'end'):
            flush()
    flush()

    out = os.path.join(ROOT, 'comic', 'story.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('/* 이 파일은 comic/build.py 가 만든다. 손으로 고치지 말고 build.py 를 다시 돌리자. */\n')
        f.write('const COMIC = ')
        json.dump(comic, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    n_panel = sum(len(p['panels']) for p in comic)
    qs = [l for p in comic for pa in p['panels'] if pa['k'] == 'scene' for l in pa['lines'] if l['t'] == 'q']
    print('만화 %d쪽, 칸 %d개, 말풍선 %d개 (말한 사람 아는 것 %d개)'
          % (len(comic), n_panel, len(qs), sum(1 for l in qs if l.get('who'))))
    print('-> %s (%d bytes)' % (out, os.path.getsize(out)))

if __name__ == '__main__':
    build()
