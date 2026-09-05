/* 눈 쉬는 시간
   게임을 10분 하면 10분 쉬는 화면이 뜬다.
   놀았던 시간은 모든 게임이 함께 센다(같은 사이트라 저장소를 공유).
   쉬는 동안에도 게임 자체는 계속 돌아간다 — 나의 정원처럼 실제 시각으로
   자라는 게임은 쉬는 시간에도 그대로 자란다.
   비밀번호를 넣으면 무제한으로 놀 수 있고, 언제든 다시 켤 수 있다. */
(function(){
  var PLAY_MS = 10 * 60 * 1000;   // 10분 놀면
  var REST_MS = 10 * 60 * 1000;   // 10분 쉰다
  var PASS    = '309';            // 무제한으로 푸는 비밀번호
  var K_PLAYED = 'craft-played-ms';
  var K_UNTIL  = 'craft-rest-until';
  var K_FREE   = 'craft-unlimited';

  function num(k){
    try{ return parseInt(localStorage.getItem(k), 10) || 0; }catch(e){ return 0; }
  }
  function put(k, v){
    try{ localStorage.setItem(k, String(v)); }catch(e){}
  }
  function isFree(){
    try{ return localStorage.getItem(K_FREE) === '1'; }catch(e){ return false; }
  }

  var box = null, label = null, pill = null;

  // 화면 위쪽 가운데에 남은 시간을 띄운다.
  // 게임마다 아래쪽에 입력칸이나 버튼이 있어서 위가 안전하고,
  // 가운데라 좌우 어느 쪽 버튼과도 잘 겹치지 않는다.
  function buildPill(){
    if(pill) return;
    pill = document.createElement('div');
    pill.id = 'craft-timer';
    pill.style.cssText = [
      'position:fixed', 'top:calc(4px + env(safe-area-inset-top, 0px))',
      'left:50%', 'transform:translateX(-50%)', 'z-index:2147483646',
      'pointer-events:none',                      // 게임 조작을 절대 가리지 않게
      'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif',
      'font-size:12px', 'font-weight:700', 'font-variant-numeric:tabular-nums',
      'color:#fff', 'background:rgba(0,0,0,.42)',
      'padding:3px 9px', 'border-radius:12px',
      'opacity:.75', 'line-height:1.4', 'white-space:nowrap'
    ].join(';');
    (document.body || document.documentElement).appendChild(pill);
    // 무제한일 때만 눌러서 다시 켤 수 있게 한다(끄는 데는 비밀번호가 필요하지만
    // 다시 켜는 건 아무나 해도 안전하니까).
    pill.addEventListener('click', function(){
      if(!isFree()) return;
      if(confirm('쉬는 시간을 다시 켤까요?')){
        put(K_FREE, 0);
        put(K_PLAYED, 0);
        put(K_UNTIL, 0);
        tick();
      }
    });
  }

  function build(){
    if(box) return;
    box = document.createElement('div');
    box.id = 'craft-rest';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'display:none', 'align-items:center', 'justify-content:center',
      'background:rgba(8,10,20,.92)', 'padding:24px',
      'font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif',
      'color:#fff', 'text-align:center', '-webkit-user-select:none', 'user-select:none'
    ].join(';');
    box.innerHTML =
      '<div style="max-width:340px">' +
        '<div style="font-size:3.4rem;line-height:1">👀</div>' +
        '<h2 style="margin:14px 0 8px;font-size:1.6rem">눈 쉬는 시간!</h2>' +
        '<p style="margin:0 0 4px;font-size:1.05rem;opacity:.85">10분 동안 재미있게 놀았어요.<br>10분만 쉬었다 하자 🙂</p>' +
        '<div id="craft-rest-time" style="font-size:2.6rem;font-weight:900;margin:16px 0 10px">10:00</div>' +
        '<p style="margin:0 0 18px;font-size:.9rem;opacity:.6">쉬는 동안에도 꽃은 계속 자라요 🌱</p>' +
        '<button id="craft-unlock" style="font-family:inherit;font-size:.95rem;font-weight:700;' +
          'color:#fff;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);' +
          'border-radius:12px;padding:8px 16px;cursor:pointer">🔒 비밀번호 넣기</button>' +
      '</div>';
    (document.body || document.documentElement).appendChild(box);
    label = box.querySelector('#craft-rest-time');
    box.querySelector('#craft-unlock').addEventListener('click', unlock);
  }

  function unlock(){
    var typed = prompt('비밀번호를 넣으면 무제한으로 놀 수 있어요.');
    if(typed === null) return;                      // 취소
    if(String(typed).trim() !== PASS){
      alert('비밀번호가 달라요 🙈');
      return;
    }
    put(K_FREE, 1);
    put(K_PLAYED, 0);
    put(K_UNTIL, 0);
    hide();
    tick();
    alert('무제한으로 바뀌었어요! 🔓\n위쪽 시계를 누르면 다시 켤 수 있어요.');
  }

  function show(){
    build();
    box.style.display = 'flex';
  }
  function hide(){
    if(box) box.style.display = 'none';
  }
  function fmt(ms){
    var s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function showPill(leftMs){
    buildPill();
    pill.style.display = 'block';
    if(isFree()){
      pill.textContent = '🔓 무제한';
      pill.style.background = 'rgba(40,120,70,.6)';
      pill.style.opacity = '.75';
      pill.style.pointerEvents = 'auto';           // 눌러서 다시 켤 수 있게
      pill.style.cursor = 'pointer';
      return;
    }
    pill.textContent = '⏱ ' + fmt(leftMs) + ' 뒤 쉬는 시간';
    var soon = leftMs <= 2 * 60 * 1000;            // 2분 남으면 눈에 띄게
    pill.style.background = soon ? 'rgba(200,60,60,.72)' : 'rgba(0,0,0,.42)';
    pill.style.opacity = soon ? '.95' : '.75';
    pill.style.pointerEvents = 'none';             // 평소엔 게임 조작을 가리지 않게
    pill.style.cursor = 'default';
  }

  var last = Date.now();
  var wasVisible = false;   // 돌아온 직후인지 구분

  function tick(){
    var now = Date.now();

    if(isFree()){            // 무제한: 시간도 안 세고 쉬는 화면도 안 뜬다
      hide();
      showPill(0);
      last = now;
      return;
    }

    var until = num(K_UNTIL);

    if(until > now){                 // 쉬는 중
      show();
      if(label) label.textContent = fmt(until - now);
      if(pill) pill.style.display = 'none';   // 쉬는 화면에 이미 시계가 있다
      last = now;
      return;
    }
    if(until){                       // 막 끝났다
      put(K_UNTIL, 0);
      hide();
    }
    showPill(PLAY_MS - num(K_PLAYED));

    // 화면을 보고 있을 때만 논 시간으로 센다.
    // 앱을 나갔다 돌아온 직후 한 번은 건너뛴다 — 나가 있던 시간이 섞이지 않게.
    var gap = now - last;
    var visible = document.visibilityState === 'visible';
    last = now;
    if(!visible){ wasVisible = false; return; }
    if(!wasVisible){ wasVisible = true; return; }
    if(gap < 0) return;
    // 느려진 타이머로 확 튄 시간은 잘라서 더한다(버리면 아예 안 쌓인다)
    if(gap > 2000) gap = 2000;

    var played = num(K_PLAYED) + gap;
    if(played >= PLAY_MS){
      put(K_PLAYED, 0);
      put(K_UNTIL, now + REST_MS);
      show();
      if(label) label.textContent = fmt(REST_MS);
    }else{
      put(K_PLAYED, played);
    }
  }

  function start(){
    build();
    buildPill();
    tick();
    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function(){ last = Date.now(); });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  }else{
    start();
  }
})();
