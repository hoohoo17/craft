# 소개 영상

홈페이지의 "🎬 소개 영상 보기" 버튼이 트는 트레일러다. 1080x1920, 20.5초, 30fps.

게임을 새로 추가한 뒤 다시 뽑으려면 (ffmpeg와 Pillow, numpy가 있어야 한다):

```
python3 make_music.py music.wav
python3 make_trailer.py craft-trailer.mp4 ../index.html music.wav
```

게임 목록은 `../index.html`의 카드에서 그대로 읽어 오므로 따로 고칠 것이 없다.
표지 그림(poster.jpg)은 2.2초 지점의 화면이다.

---

# 가수 스물네 명 노래 영상

`singers.mp4` — 가수가 1.5초마다 바뀌는 노래 영상이다. 1080x1920, 39.6초, 30fps, 24명.
가수 이름도 가사도 전부 `../story`("나의 이야기")에 진짜로 나오는 것이다.

목소리는 맥에 들어 있는 한국어 목소리(Yuna) 하나로 만든다.
글자를 하나씩 말하게 한 다음 소리를 빠르게/느리게 다시 읽어서 음 높이를 바꾸는데,
가수마다 바꾸는 정도가 달라서 스물네 명이 전부 다른 목소리로 들린다.
찌지직 +19가 제일 삐약삐약하고, 콰콰쾅 -15가 제일 우렁우렁하다.

다시 만들려면 (ffmpeg와 numpy, Pillow가 있어야 한다):

```
python3 make_song.py song.wav
python3 make_singer_video.py singers.mp4 song.wav
```

가수와 가사는 `song_data.py`의 `CAST` 한 군데에만 적는다.
한 줄이 (이름, 얼굴, 부르는 말, 목소리 높낮이, 떨림)이다.
가락은 글자 수를 보고 저절로 만들어지니 따로 적을 필요가 없다.
한 사람이 1.5초이므로 가사는 두 글자에서 여덟 글자 사이가 좋고,
목소리 높낮이는 사람마다 다른 값을 줘야 목소리가 겹치지 않는다.
소리와 영상이 `song_data.py`를 같이 읽으므로 거기만 고치면 둘 다 따라 바뀐다.

---

# 빠른 노래 (한 사람이 다 부르는 노래)

`solo-song.mp4` — 곽재후가 쓴 가사를 한 사람이 쭉 부른다. 1080x1920, 23.4초, 30fps.
받침이 잔뜩 붙어 있어서 따라 부르기 아주 어려운 가사다.
같은 가사를 두 번 부르는데, 두 번째는 170bpm에서 225bpm으로 더 빨라진다.

목소리는 가수 노래와 같은 방법(맥의 Yuna를 음 높이만 바꾼다)으로 만든다.
여기서는 가수가 한 명이라 `VOICE` 하나만 쓴다.

다시 만들려면:

```
python3 make_solo_song.py solo-song.wav
python3 make_solo_video.py solo-song.mp4 solo-song.wav
```

가사는 `solo_data.py`의 `LINES`에 한 줄씩 적는다. 한 줄이 4박자이므로
6~8글자가 알맞다. `SECTIONS`에 (빠르기, 화면에 띄울 말)을 적으면
같은 가사를 그 빠르기로 여러 번 부른다. 가락은 글자 수를 보고 저절로 만들어진다.

---

# 진짜 책이 된 『나의 이야기』 소개 영상

홈페이지의 "📚 진짜 책 나왔어요!" 버튼이 트는 영상이다. `book-trailer.mp4`,
1080x1920, 16.6초, 30fps. 교보문고(kyobobook.co.kr)에 실제로 나온 곽재후의
POD 책 『나의 이야기』를 축하하는 영상이다.

표지 그림(`book_cover.jpg`)은 교보문고 상품 페이지에서 받아 둔 진짜 표지다.
배경음악은 `music.wav`(트레일러와 같은 곡)를 그대로 쓴다.

다시 만들려면 (ffmpeg와 Pillow가 있어야 한다):

```
python3 make_book_trailer.py book-trailer.mp4
```

표지가 바뀌면 `book_cover.jpg`를 새로 받아 두면 된다.
표지 그림(book-poster.jpg)은 4.2초 지점의 화면이다.
