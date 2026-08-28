/* 눈 쉬는 시간
   게임을 30분 하면 10분 쉬는 화면이 뜬다.
   놀았던 시간은 모든 게임이 함께 센다(같은 사이트라 저장소를 공유).
   쉬는 동안에도 게임 자체는 계속 돌아간다 — 나의 정원처럼 실제 시각으로
   자라는 게임은 쉬는 시간에도 그대로 자란다. */
(function(){
  var PLAY_MS = 30 * 60 * 1000;   // 30분 놀면
  var REST_MS = 10 * 60 * 1000;   // 10분 쉰다
  var K_PLAYED = 'craft-played-ms';
  var K_UNTIL  = 'craft-rest-until';

  function num(k){
    try{ return parseInt(localStorage.getItem(k), 10) || 0; }catch(e){ return 0; }
  }
  function put(k, v){
    try{ localStorage.setItem(k, String(v)); }catch(e){}
  }

  var box = null, label = null;

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
        '<p style="margin:0 0 4px;font-size:1.05rem;opacity:.85">30분 동안 재미있게 놀았어요.<br>10분만 쉬었다 하자 🙂</p>' +
        '<div id="craft-rest-time" style="font-size:2.6rem;font-weight:900;margin:16px 0 10px">10:00</div>' +
        '<p style="margin:0;font-size:.9rem;opacity:.6">쉬는 동안에도 꽃은 계속 자라요 🌱</p>' +
      '</div>';
    (document.body || document.documentElement).appendChild(box);
    label = box.querySelector('#craft-rest-time');
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

  var last = Date.now();

  function tick(){
    var now = Date.now();
    var until = num(K_UNTIL);

    if(until > now){                 // 쉬는 중
      show();
      if(label) label.textContent = fmt(until - now);
      last = now;
      return;
    }
    if(until){                       // 막 끝났다
      put(K_UNTIL, 0);
      hide();
    }

    // 화면을 보고 있을 때만 논 시간으로 센다
    var gap = now - last;
    last = now;
    if(document.visibilityState !== 'visible') return;
    if(gap < 0) return;
    // 절전이나 느려진 타이머로 확 튄 시간은 잘라서 더한다(버리면 아예 안 쌓인다)
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
