# 소개 영상

홈페이지의 "🎬 소개 영상 보기" 버튼이 트는 트레일러다. 1080x1920, 20.5초, 30fps.

게임을 새로 추가한 뒤 다시 뽑으려면 (ffmpeg와 Pillow, numpy가 있어야 한다):

```
python3 make_music.py music.wav
python3 make_trailer.py craft-trailer.mp4 ../index.html music.wav
```

게임 목록은 `../index.html`의 카드에서 그대로 읽어 오므로 따로 고칠 것이 없다.
표지 그림(poster.jpg)은 2.2초 지점의 화면이다.
