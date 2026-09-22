'use strict';
(() => {
const canvas = document.getElementById('view'), ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const SIZE = 160, HEIGHT = 128, GROUND = 64, SAVE = 'craft-block-forest-v2';
const LEGACY_SAVE = 'craft-block-forest-v1', MID = SIZE / 2;
const blocks = [null, ['잔디','#79a749'], ['흙','#96704d'], ['돌','#8c9595'], ['나무','#92643b'], ['나뭇잎','#448457'], ['모래','#e3cf91'], ['벽돌','#b66850'], ['유리빛 블록','#91dbe1']];
let world = new Uint8Array(SIZE * SIZE * HEIGHT), seed = 1, selected = 1;
let player = {x:20.5,y:10,z:20.5,yaw:0,pitch:-.15}, flying = false, velocity = 0, grounded = false;
let active = false, dirty = false, saveTimer, toastTimer, faces = [], target = null, last = 0, width = 1, height = 1, focal = 1;
let meshRegion = '', packedWorld = null;
const keys = new Set();
const idx = (x,y,z) => (z * SIZE + x) * HEIGHT + y;
const inside = (x,y,z) => x>=0 && x<SIZE && z>=0 && z<SIZE && y>=0 && y<HEIGHT;
const get = (x,y,z) => inside(x,y,z) ? world[idx(x,y,z)] : 0;
const set = (x,y,z,b) => { if(inside(x,y,z)){world[idx(x,y,z)] = b;packedWorld=null;} };
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function surface(x,z){for(let y=HEIGHT-1;y>=0;y--)if(get(x,y,z))return y+1;return 1;}
function spawn(){player={x:MID+.5,y:surface(MID,MID)+1.65,z:MID+.5,yaw:.5,pitch:-.15};velocity=0;}
function generate(){
  world.fill(0);packedWorld=null;seed=(Date.now()^Math.floor(Math.random()*1e8))>>>0;const phase=random()*10;
  for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++){
    const h=Math.floor(GROUND+Math.sin(x*.19+phase)*1.4+Math.cos(z*.22)*1.3+Math.sin((x+z)*.3)*.7);
    for(let y=0;y<=h;y++)set(x,y,z,y===h?(h<GROUND-1?6:1):y>h-3?2:3);
  }
  for(let x=3;x<SIZE-3;x+=3)for(let z=3;z<SIZE-3;z+=3){
    if(Math.abs(x-MID)<4&&Math.abs(z-MID)<4||random()>.32)continue;
    let y=surface(x,z);if(get(x,y-1,z)!==1)continue;
    for(let j=0;j<4;j++)set(x,y+j,z,4);
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=2;dy<=4;dy++){
      if(Math.abs(dx)+Math.abs(dz)+(dy===4?1:0)>3||get(x+dx,y+dy,z+dz))continue;
      set(x+dx,y+dy,z+dz,5);
    }
  }
  spawn();rebuild();dirty=true;
}
function load(){
  try{
    const current=localStorage.getItem(SAVE),raw=current||localStorage.getItem(LEGACY_SAVE);if(!raw)return false;const s=JSON.parse(raw);
    if(!s.player||!['x','y','z','yaw','pitch'].every(k=>Number.isFinite(s.player[k])))return false;
    const limit=current?SIZE:40,top=current?HEIGHT:24;
    if(s.player.x<.28||s.player.x>limit-.28||s.player.z<.28||s.player.z>limit-.28||s.player.y<1.65||s.player.y>top+8)return false;
    if(current){
      if(s.version!==2||s.size!==SIZE||s.height!==HEIGHT||!Array.isArray(s.runs)||s.runs.length%2)return false;
      let total=0;
      for(let i=0;i<s.runs.length;i+=2){const b=s.runs[i],n=s.runs[i+1];if(!Number.isInteger(b)||b<0||b>=blocks.length||!Number.isInteger(n)||n<=0)return false;total+=n;}
      if(total!==world.length)return false;
      let offset=0;for(let i=0;i<s.runs.length;i+=2){world.fill(s.runs[i],offset,offset+s.runs[i+1]);offset+=s.runs[i+1];}
      packedWorld=s.runs;player=s.player;
    }else{
      if(!Array.isArray(s.world)||s.world.length!==40*40*24||!s.world.every(b=>Number.isInteger(b)&&b>=0&&b<blocks.length))return false;
      generate();
      // Keep every old block (including excavated air) in the center of the larger world.
      for(let y=0;y<24;y++)for(let z=0;z<40;z++)for(let x=0;x<40;x++)set(x+60,y+60,z+60,s.world[(y*40+z)*40+x]);
      player={...s.player,x:s.player.x+60,y:s.player.y+60,z:s.player.z+60};dirty=true;
    }
    player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch));flying=!!s.flying;rebuild();return true;
  }catch{return false;}
}
function packWorld(){
  if(packedWorld)return packedWorld;
  const runs=[];let b=world[0],count=0;
  for(const value of world){if(value===b)count++;else{runs.push(b,count);b=value;count=1;}}
  runs.push(b,count);packedWorld=runs;return runs;
}
function save(){
  clearTimeout(saveTimer);if(!dirty)return;
  try{localStorage.setItem(SAVE,JSON.stringify({version:2,size:SIZE,height:HEIGHT,runs:packWorld(),player,flying}));dirty=false;}
  catch{toast('저장 공간이 부족하거나 저장이 차단되어 있어요.');}
}
function changed(){dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(save,1000);}
function toast(s){$('tip').textContent=s;$('tip').classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('tip').classList.remove('on'),2600);}
// Only mesh nearby blocks; the rest of the large world stays in the compact voxel array.
const sides=[
 {n:[1,0,0],v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],shade:.78},
 {n:[-1,0,0],v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],shade:.64},
 {n:[0,1,0],v:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]],shade:1},
 {n:[0,-1,0],v:[[0,0,1],[0,0,0],[1,0,0],[1,0,1]],shade:.5},
 {n:[0,0,1],v:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],shade:.85},
 {n:[0,0,-1],v:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],shade:.7}
];
function rebuild(){
  faces=[];
  const centers=[player.x,player.y,player.z].map(v=>Math.floor(v/8)*8+4);
  meshRegion=centers.join(',');
  const [cx,cy,cz]=centers,radius=30;
  for(let y=Math.max(0,cy-radius);y<Math.min(HEIGHT,cy+radius);y++)for(let z=Math.max(0,cz-radius);z<Math.min(SIZE,cz+radius);z++)for(let x=Math.max(0,cx-radius);x<Math.min(SIZE,cx+radius);x++){
    const b=get(x,y,z);if(!b)continue;
    sides.forEach((s,i)=>{if(!get(x+s.n[0],y+s.n[1],z+s.n[2])){
      const hex=(b===1&&i!==2?blocks[2]:blocks[b])[1];const color=parseInt(hex.slice(1),16);
      const variation=(((x*17+y*31+z*13)%9)-4)*2;
      faces.push({x,y,z,i,b,n:s.n,v:s.v.map(v=>[x+v[0],y+v[1],z+v[2]]),rgb:[color>>16,(color>>8)&255,color&255].map(c=>Math.max(0,Math.min(255,Math.round(c*s.shade+variation))))});
    }});
  }
}
function collides(x,y,z){
  if(x<.28||z<.28||x>SIZE-.28||z>SIZE-.28||y<1.65||y>HEIGHT+8)return true;
  for(let a=Math.floor(x-.27);a<=Math.floor(x+.27);a++)for(let b=Math.floor(y-1.62);b<=Math.floor(y+.12);b++)for(let c=Math.floor(z-.27);c<=Math.floor(z+.27);c++)if(get(a,b,c))return true;
  return false;
}
function direction(){return [Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),Math.cos(player.yaw)*Math.cos(player.pitch)];}
function ray(){
  const d=direction();let old=null;
  for(let t=0;t<7;t+=.025){const cell=[Math.floor(player.x+d[0]*t),Math.floor(player.y+d[1]*t),Math.floor(player.z+d[2]*t)];
    if(old&&cell.every((v,i)=>v===old[i]))continue;
    if(get(...cell))return {cell,previous:old};old=cell;
  }return null;
}
function edit(place){
  if(!active)return;const hit=ray();if(!hit){toast('조준점을 가까운 블록에 맞춰 주세요.');return;}
  const p=place?hit.previous:hit.cell;if(!p||!inside(...p))return;
  if(!place&&p[1]===0){toast('세계의 바닥은 부술 수 없어요.');return;}
  if(place){set(...p,selected);if(collides(player.x,player.y,player.z)){set(...p,0);toast('서 있는 자리에는 놓을 수 없어요.');return;}}
  else set(...p,0);
  rebuild();changed();
}
function choose(n){selected=n;$('selected').textContent=blocks[n][0]+' · 무제한';document.querySelectorAll('#hotbar button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===n)));}
blocks.slice(1).forEach((b,i)=>{const button=document.createElement('button');button.title=`${i+1} · ${b[0]}`;button.setAttribute('aria-label',b[0]);button.innerHTML=`<small>${i+1}</small><span class="swatch" style="background:${b[1]}"></span>`;button.onclick=()=>choose(i+1);$('hotbar').append(button);});
function flight(){flying=!flying;velocity=0;$('fly').textContent='🪽 비행: '+(flying?'켜짐':'꺼짐');toast(flying?'비행 모드 · Space 올라가기 / Shift 내려가기':'걷기 모드 · Space 점프');changed();}
function pause(){active=false;keys.clear();$('overlay').hidden=false;document.exitPointerLock?.();save();}
$('start').onclick=()=>{active=true;$('overlay').hidden=true;last=performance.now();toast('드래그해서 둘러보고, 블록을 자유롭게 쌓아 보세요!');};
$('menu').onclick=pause;$('fly').onclick=flight;
$('home').onclick=()=>{spawn();changed();toast('시작 위치로 돌아왔어요.');};
$('reset').onclick=()=>{if(confirm('저장된 세계를 지우고 새로 만들까요?')){generate();changed();toast('새 숲이 만들어졌어요.');}};
$('break').onclick=()=>edit(false);$('place').onclick=()=>edit(true);
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){pause();return;}if(!active)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(e.repeat)return;if(e.code==='KeyF')flight();if(/^Digit[1-8]$/.test(e.code))choose(Number(e.code.slice(-1)));
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.querySelectorAll('[data-key]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
});
let drag=null;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(!active)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:0,button:e.button,type:e.pointerType};});
canvas.addEventListener('pointermove',e=>{
  if(!active||!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
  player.yaw+=dx*.005;player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch-dy*.005));dirty=true;
});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(drag.moved<7&&drag.type==='mouse')edit(drag.button===2);drag=null;});
canvas.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('blur',()=>{drag=null;if(active)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',save);setInterval(save,5000);
function resize(){const ratio=Math.min(devicePixelRatio||1,1.5);width=innerWidth;height=innerHeight;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);focal=Math.min(width,height)*.85;}
window.addEventListener('resize',resize);resize();
function moveHorizontal(axis,amount){
  if(!amount)return;
  const next={...player,[axis]:player[axis]+amount};
  if(!collides(next.x,next.y,next.z)){player[axis]=next[axis];return;}
  // Walk up a single block only from solid ground, with clearance above the player.
  if(flying||velocity>0||!collides(player.x,player.y-.1,player.z))return;
  const raised=player.y+1.001;
  if(collides(next.x,raised,next.z)||!collides(next.x,raised-.12,next.z))return;
  for(let lift=.1;lift<1.1;lift+=.1){
    if(collides(player.x,Math.min(raised,player.y+lift),player.z))return;
  }
  player[axis]=next[axis];player.y=raised;velocity=0;grounded=true;
}
function update(dt){
  if(!active)return;
  if($('craft-rest')?.style.display==='flex'){pause();return;}
  const before=[player.x,player.y,player.z];
  let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  let right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const length=Math.hypot(forward,right)||1,speed=(flying?6:4.5)*dt;
  const dx=(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*right)/length*speed;
  const dz=(Math.cos(player.yaw)*forward-Math.sin(player.yaw)*right)/length*speed;
  moveHorizontal('x',dx);
  moveHorizontal('z',dz);
  if(flying)velocity=(Number(keys.has('Space'))-Number(keys.has('ShiftLeft')||keys.has('ShiftRight')))*5;
  else{if(keys.has('Space')&&grounded){velocity=8;grounded=false;}velocity=Math.max(-18,velocity-20*dt);}
  const dy=velocity*dt;const steps=Math.max(1,Math.ceil(Math.abs(dy)/.09));grounded=false;
  for(let i=0;i<steps;i++){
    if(!collides(player.x,player.y+dy/steps,player.z))player.y+=dy/steps;
    else{grounded=dy<0;velocity=0;break;}
  }
  if(player.x!==before[0]||player.y!==before[1]||player.z!==before[2])dirty=true;
}
// Near-plane clipping keeps faces stable when the camera approaches a block.
function clip(poly){const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],ai=a[2]>=.08,bi=b[2]>=.08;if(ai)out.push(a);
  if(ai!==bi){const t=(.08-a[2])/(b[2]-a[2]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,.08]);}
}return out;}
function render(){
  if([player.x,player.y,player.z].map(v=>Math.floor(v/8)*8+4).join(',')!==meshRegion)rebuild();
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#78b7d8');sky.addColorStop(1,'#dfeddc');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw),sp=Math.sin(player.pitch),cp=Math.cos(player.pitch);
  const transform=v=>{const x=v[0]-player.x,y=v[1]-player.y,z=v[2]-player.z;const depth=x*sy+z*cy;return [x*cy-z*sy,y*cp-depth*sp,y*sp+depth*cp];};
  const list=[];target=ray();
  for(const f of faces){
    const center=[f.x+.5+f.n[0]*.5,f.y+.5+f.n[1]*.5,f.z+.5+f.n[2]*.5];
    const dx=center[0]-player.x,dy=center[1]-player.y,dz=center[2]-player.z;
    if(dx*f.n[0]+dy*f.n[1]+dz*f.n[2]>=0)continue;
    const dist=dx*dx+dy*dy+dz*dz;if(dist>24*24)continue;
    const depth=transform(center)[2];if(depth<-1)continue;
    const vertices=clip(f.v.map(transform));if(vertices.length<3)continue;
    const points=vertices.map(v=>[width/2+v[0]/v[2]*focal,height/2-v[1]/v[2]*focal]);
    if(points.every(v=>v[0]<0)||points.every(v=>v[0]>width)||points.every(v=>v[1]<0)||points.every(v=>v[1]>height))continue;
    list.push({f,points,dist,depth});
  }
  list.sort((a,b)=>b.depth-a.depth);
  for(const {f,points,dist} of list){
    const fog=Math.max(0,Math.min(.9,(Math.sqrt(dist)-13)/13));
    ctx.fillStyle=`rgb(${f.rgb.map((v,i)=>Math.round(v*(1-fog)+[191,219,218][i]*fog)).join(',')})`;
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();
    ctx.strokeStyle=`rgba(20,45,35,${.13*(1-fog)})`;ctx.lineWidth=.65;ctx.stroke();
    if(target&&target.cell[0]===f.x&&target.cell[1]===f.y&&target.cell[2]===f.z){ctx.strokeStyle='#fff4ae';ctx.lineWidth=2;ctx.stroke();}
  }
  $('stats').textContent=`${flying?'🪽 비행':'🥾 걷기'} · ${Math.floor(player.x)}, ${Math.floor(player.y)}, ${Math.floor(player.z)} · 세계 ${SIZE}×${SIZE} · ${dirty?'저장 중…':'자동 저장'}${target?' · '+blocks[get(...target.cell)][0]:''}`;
}
function frame(now){const dt=Math.min(.04,(now-last)/1000||.016);last=now;update(dt);render();requestAnimationFrame(frame);}
if(!load())generate();choose(1);$('fly').textContent='🪽 비행: '+(flying?'켜짐':'꺼짐');requestAnimationFrame(frame);
})();
