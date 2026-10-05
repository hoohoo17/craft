'use strict';
(() => {
const $=id=>document.getElementById(id),canvas=$('track'),ctx=canvas.getContext('2d'),M=RaceModel;
let state=M.create(),mode='menu',countdown=3.5,last=0,W=600,H=500,notice=0,previousLap=1;
const held=new Map(),keyboard=new Set(),input={};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function clearInput(){held.clear();keyboard.clear();document.querySelectorAll('[data-input]').forEach(b=>b.classList.remove('pressed'));}
function controls(){for(const key of ['left','right','brake','boost'])input[key]=keyboard.has(key)||[...held.values()].includes(key);}
const mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'brake',ArrowDown:'brake',ShiftLeft:'boost',ShiftRight:'boost',ArrowUp:'boost'};
document.addEventListener('keydown',e=>{if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat)pause();return;}if(!['running','countdown'].includes(mode))return;const key=mapping[e.code];if(key){e.preventDefault();keyboard.add(key);}});
document.addEventListener('keyup',e=>{if(mapping[e.code])keyboard.delete(mapping[e.code]);});
document.querySelectorAll('[data-input]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(!['running','countdown'].includes(mode))return;b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.input);b.classList.add('pressed');});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>{held.delete(e.pointerId);b.classList.remove('pressed');});
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
function format(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;}
const bestKey=difficulty=>`craft-racing-best-${M.LAPS}laps-${difficulty}`;
function best(){try{const v=Number(localStorage.getItem(bestKey($('difficulty').value)));$('best').textContent=v>0?'🏆 내 최고 기록 '+format(v):'첫 완주 기록을 남겨 보세요!';}catch{$('best').textContent='';}}
function start(){
  clearInput();state=M.create($('difficulty').value);countdown=3.5;previousLap=1;mode='countdown';notice=0;$('overlay').hidden=true;
}
function pause(){
  if(mode==='running'||mode==='countdown'){
    state.resumeMode=mode;mode='paused';clearInput();$('title').textContent='잠깐, 피트 스톱';$('description').textContent='준비되면 이어서 달려요.';$('settings').hidden=true;$('restart').hidden=false;$('start').textContent='계속 달리기 →';$('overlay').hidden=false;
  }
}
$('start').onclick=()=>{if(mode==='paused'){mode=state.resumeMode;$('overlay').hidden=true;clearInput();}else start();};
$('restart').onclick=start;$('pause').onclick=pause;$('difficulty').onchange=best;
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function finish(){
  mode='finished';clearInput();$('announcement').textContent='';$('title').textContent=state.rank===1?'🏆 우승!':`${state.rank}위로 완주!`;
  $('description').textContent=`완주 기록 ${format(state.time)} · 충돌 ${state.hits}회. ${state.rank===1?'멋진 레이스였어요!':'니트로를 모아 직선에서 추월해 보세요!'}`;
  try{const key=bestKey(state.difficulty),old=Number(localStorage.getItem(key));if(!old||state.time<old)localStorage.setItem(key,String(state.time));}catch{}
  $('settings').hidden=false;$('restart').hidden=true;$('start').textContent='한 번 더 달리기 →';$('overlay').hidden=false;best();
}
function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);}
window.addEventListener('resize',resize);resize();
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function road(t){const bend=M.curve(state.distance+650*(1-t));return {x:W/2+bend*W*.32*(1-t)*(1-t)-state.x*W*.055*t,y:H*.31+H*.72*t*t,w:W*(.022+.66*t*t)};}
function car(x,y,size,color,player=false){
  ctx.save();ctx.translate(x,y);ctx.scale(size/46,size/46);
  if(player)ctx.rotate((Number(input.right)-Number(input.left))*.055);
  ctx.fillStyle='#14202c55';ctx.beginPath();ctx.ellipse(0,3,29,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#172334';ctx.fillRect(-25,-35,9,18);ctx.fillRect(16,-35,9,18);ctx.fillRect(-25,-10,9,14);ctx.fillRect(16,-10,9,14);
  polygon([[-22,0],[-23,-29],[-15,-49],[15,-49],[23,-29],[22,0]],color);
  polygon([[-14,-29],[-10,-43],[10,-43],[14,-29]],'#253a54');
  ctx.fillStyle='#ffffff55';ctx.fillRect(-2,-26,4,23);ctx.fillStyle='#ffdfac';ctx.fillRect(-19,-5,8,4);ctx.fillRect(11,-5,8,4);
  ctx.fillStyle='#182c45';ctx.fillRect(-25,-13,50,5);
  if(player&&state.boosting){polygon([[-15,2],[-9,21+Math.random()*12],[-3,2]],'#81edff');polygon([[3,2],[9,21+Math.random()*12],[15,2]],'#81edff');}
  ctx.restore();
}
function draw(){
  const gradient=ctx.createLinearGradient(0,0,0,H*.55);gradient.addColorStop(0,'#a8ddf4');gradient.addColorStop(.65,'#ffe1c4');gradient.addColorStop(1,'#fff0cd');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffe1a2';ctx.beginPath();ctx.arc(W*.73,H*.17,H*.07,0,Math.PI*2);ctx.fill();
  polygon([[0,H*.33],[0,H*.26],[W*.13,H*.15],[W*.28,H*.29],[W*.43,H*.2],[W*.66,H*.31],[W*.84,H*.18],[W,H*.28],[W,H*.36]],'#a5bdd8');
  polygon([[0,H*.38],[0,H*.31],[W*.2,H*.25],[W*.42,H*.34],[W*.7,H*.27],[W,H*.32],[W,H*.4]],'#9bc9bc');
  ctx.fillStyle='#b0dba8';ctx.fillRect(0,H*.34,W,H);
  for(let i=0;i<70;i++){
    const a=road(i/70),b=road((i+1)/70),stripe=Math.floor(state.distance/28+(1-i/70)*28)%2;
    polygon([[0,a.y],[W,a.y],[W,b.y],[0,b.y]],stripe?'#b4dda9':'#a9d49e');
    polygon([[a.x-a.w*1.09,a.y],[a.x+a.w*1.09,a.y],[b.x+b.w*1.09,b.y],[b.x-b.w*1.09,b.y]],stripe?'#fff5df':'#edb09c');
    polygon([[a.x-a.w,a.y],[a.x+a.w,a.y],[b.x+b.w,b.y],[b.x-b.w,b.y]],stripe?'#778b9f':'#7c90a3');
    if(stripe)for(const lane of [-1/3,1/3])polygon([[a.x+a.w*(lane-.008),a.y],[a.x+a.w*(lane+.008),a.y],[b.x+b.w*(lane+.008),b.y],[b.x+b.w*(lane-.008),b.y]],'#f3e6d0a6');
  }
  // Fixed-distance objects share the same perspective as cars and the road.
  for(let d=800;d>0;d-=80){const ahead=((d-state.distance%80)+800)%800,t=1-ahead/850,p=road(t);if(t<.08)continue;
    for(const side of [-1,1]){const x=p.x+side*p.w*1.3,size=5+28*t*t;ctx.fillStyle='#ac886c';ctx.fillRect(x-size*.08,p.y-size,size*.16,size);polygon([[x,p.y-size*2.5],[x-size*.7,p.y-size*.55],[x+size*.7,p.y-size*.55]],'#62a58b');}
  }
  const visible=state.bots.map(b=>({b,d:M.gap(b.distance,state.distance)})).filter(v=>!v.b.finished&&v.d>0&&v.d<850).sort((a,b)=>b.d-a.d);
  visible.forEach(({b,d})=>{const t=.91*(1-d/850),p=road(t);car(p.x+b.x*p.w*.8,p.y,Math.max(4,Math.min(66,W*.12)*(t/.91)**2),b.color);});
  const p=road(.91);car(p.x+state.x*p.w*.8,p.y,Math.min(66,W*.12),'#ff936e',true);
  if(state.cooldown>1&&!reduced){ctx.fillStyle='#ffb08a30';ctx.fillRect(0,0,W,H);}
  // Full-race progress ribbon and opponent markers.
  ctx.fillStyle='#17263e80';ctx.fillRect(15,15,W-30,4);
  state.bots.forEach(b=>{ctx.fillStyle=b.color;ctx.fillRect(15+(W-30)*Math.min(1,b.distance/M.FINISH)-2,12,4,10);});
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(15+(W-30)*state.distance/M.FINISH,17,4,0,Math.PI*2);ctx.fill();
}
function frame(now){
  const dt=Math.min(.05,(now-last)/1000||0);last=now;controls();
  if($('craft-rest')?.style.display==='flex')pause();
  if(mode==='countdown'){countdown-=dt;$('announcement').textContent=countdown>.5?String(Math.ceil(countdown-.5)):'출발!';if(countdown<=0){mode='running';notice=.6;}}
  else if(mode==='running'){
    const hits=state.hits;M.step(state,input,dt);notice=Math.max(0,notice-dt);
    const lap=Math.min(M.LAPS,Math.floor(state.distance/M.LENGTH)+1);
    if(state.hits>hits){$('announcement').textContent='앗! 충돌';notice=.8;}
    else if(lap>previousLap){$('announcement').textContent=lap===M.LAPS?'마지막 바퀴!':`${lap}바퀴째!`;notice=1.5;previousLap=lap;}
    else if(notice===0)$('announcement').textContent='';
    if(state.finished)finish();
  }
  $('rank').innerHTML=`${state.rank} <em>/ 6</em>`;$('lap').innerHTML=`${Math.min(M.LAPS,Math.floor(state.distance/M.LENGTH)+1)} <em>/ ${M.LAPS}</em>`;
  $('speed').textContent=Math.round(state.speed);$('time').textContent=format(state.time);$('nitro').value=state.nitro;
  draw();requestAnimationFrame(frame);
}
best();requestAnimationFrame(frame);
})();
