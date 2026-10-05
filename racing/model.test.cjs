const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('./model.js');
function run(s,input,seconds){for(let i=0;i<seconds*60;i++)M.step(s,input,1/60);}
test('automatic acceleration, braking and off-road slowdown',()=>{
  const s=M.create();s.bots=[];run(s,{},3);assert(s.speed>240);
  run(s,{brake:true},2);assert(s.speed<=76);
  s.x=1.5;s.speed=250;run(s,{},1);assert(s.speed<110);
});
test('nitro accelerates, consumes fuel, then recharges',()=>{
  const s=M.create();s.bots=[];s.speed=250;run(s,{boost:true},1);
  assert(s.speed>300);assert(s.nitro<71);
  const fuel=s.nitro;run(s,{},1);assert(s.nitro>fuel);
});
test('steering stays in bounds',()=>{
  const s=M.create();run(s,{right:true},10);assert(s.x<=1.65);
  run(s,{left:true},10);assert(s.x>=-1.65);assert(s.x<0);
});
test('collision slows once during its cooldown',()=>{
  const s=M.create();s.speed=250;s.bots=[{distance:5,x:0,pace:200,color:'red',finished:false}];
  M.step(s,{},1/60);assert.equal(s.hits,1);assert(s.speed<150);
  s.bots[0].distance=s.distance+5;M.step(s,{},1/60);assert.equal(s.hits,1);
});
test('ten laps finish and freeze the race with the correct position',()=>{
  assert.equal(M.LAPS,10);
  const s=M.create();s.distance=M.FINISH-1;s.speed=250;
  s.bots[0].finished=true;s.bots[0].distance=M.FINISH+10;
  M.step(s,{},.02);assert(s.finished);assert.equal(s.rank,2);assert.equal(s.distance,M.FINISH);
  const time=s.time;M.step(s,{boost:true},.05);assert.equal(s.time,time);
  assert.equal(M.create().distance,0);assert.equal(M.create().nitro,100);
});
test('difficulty affects opponents and wraparound distances remain continuous',()=>{
  assert(M.create('hard').bots[0].pace>M.create('easy').bots[0].pace);
  assert.equal(M.gap(5,M.LENGTH-5),10);assert.equal(M.gap(M.LENGTH-5,5),-10);
});
test('race can be completed without invalid state',()=>{
  const s=M.create('easy');
  for(let i=0;i<36000&&!s.finished;i++){
    M.step(s,{left:s.x>.08,right:s.x<-.08,boost:Math.abs(M.curve(s.distance))<.3},1/60);
    assert(Number.isFinite(s.speed)&&s.nitro>=0&&s.nitro<=100);
  }
  assert(s.finished);assert(s.time>180&&s.time<600);assert(s.rank>=1&&s.rank<=6);
});
