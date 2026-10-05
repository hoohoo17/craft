'use strict';
(() => {
  const LENGTH=6000, LAPS=10, FINISH=LENGTH*LAPS;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const curve=d=>Math.sin(d/LENGTH*Math.PI*4)*.6+Math.sin(d/LENGTH*Math.PI*8)*.18;
  const gap=(a,b)=>((a-b+LENGTH*1.5)%LENGTH+LENGTH)%LENGTH-LENGTH/2;
  function create(difficulty='normal'){
    const pace={easy:172,normal:202,hard:223}[difficulty]||202;
    return {difficulty,time:0,distance:0,x:0,speed:0,nitro:100,cooldown:0,finished:false,rank:6,boosting:false,hits:0,
      bots:Array.from({length:5},(_,i)=>({distance:90+i*85,x:(i%3-1)*.62,pace:pace+i*3,color:['#6bd5f1','#ffe198','#b99cff','#87dba9','#f293bd'][i],finished:false}))};
  }
  function step(s,input,dt){
    if(s.finished)return;
    dt=clamp(dt,0,.05);s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);
    s.boosting=!!input.boost&&s.nitro>1&&!input.brake&&Math.abs(s.x)<1;
    const offroad=Math.abs(s.x)>1;
    const maximum=input.brake?75:offroad?100:s.boosting?325:250;
    s.speed=clamp(s.speed+(s.speed<maximum?90:-180)*dt,0,Math.max(maximum,s.speed));
    s.nitro=clamp(s.nitro+(s.boosting?-30:9)*dt,0,100);
    const steer=Number(!!input.right)-Number(!!input.left);
    s.x=clamp(s.x+steer*dt*(.45+s.speed/210)-curve(s.distance)*dt*s.speed/1100,-1.65,1.65);
    s.distance+=s.speed*dt;
    s.bots.forEach((b,i)=>{
      if(!b.finished){b.distance+=(b.pace+Math.sin(s.time*.5+i)*9)*dt;b.finished=b.distance>=FINISH;}
      b.x=Math.sin(b.distance/850+i*2)*.73;
      if(!b.finished&&s.cooldown===0&&Math.abs(gap(b.distance,s.distance))<24&&Math.abs(b.x-s.x)<.23){
        s.speed*=.52;s.cooldown=1.2;s.hits++;s.x=clamp(s.x+(s.x>=b.x?.13:-.13),-1.65,1.65);
      }
    });
    s.rank=1+s.bots.filter(b=>b.distance>s.distance||b.finished).length;
    if(s.distance>=FINISH){s.finished=true;s.distance=FINISH;s.boosting=false;}
  }
  const api={LENGTH,LAPS,FINISH,curve,gap,create,step};
  if(typeof module!=='undefined')module.exports=api;else globalThis.RaceModel=api;
})();
