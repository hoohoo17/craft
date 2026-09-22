const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function game({ saved = new Map(), flat = true } = {}) {
  const nodes = new Map();
  const drawing = new Proxy({}, { get: () => () => {} });
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, {
      style: {}, classList: { add() {}, remove() {} }, append() {},
      setAttribute() {}, addEventListener() {}, getContext: () => drawing,
    });
    return nodes.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => [],
      createElement: () => element(Symbol()), addEventListener() {} },
    window: { addEventListener() {} }, localStorage: { getItem: k => saved.get(k), setItem: (k,v) => saved.set(k,v) },
    innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
    setTimeout() {}, clearTimeout() {}, setInterval() {}, requestAnimationFrame() {},
  });
  const source = fs.readFileSync(`${__dirname}/game.js`, 'utf8');
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `
    ${flat ? `
    world.fill(0);
    for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++)set(x,0,z,3);
    player={x:20.5,y:2.65,z:20.5,yaw:0,pitch:0};
    active=true;velocity=0;grounded=true;
    ` : ''}
    globalThis.game={get player(){return player},keys,set,get,update,collides,flight,save,load,changed,packWorld,rebuild,
      SIZE,HEIGHT,world,get faces(){return faces}};
  })();`), context);
  return context.game;
}

for (const dt of [1 / 60, 1 / 25]) {
  test(`walk onto a one-block ledge at ${Math.round(1 / dt)} fps`, () => {
    const g = game();
    for (let z = 21; z < 26; z++) g.set(20, 1, z, 3);
    g.keys.add('KeyW');
    for (let i = 0; i < Math.round(.6 / dt); i++) g.update(dt);
    assert(g.player.z > 22);
    assert(g.player.y >= 3.62 && g.player.y < 3.75);
    assert(!g.collides(g.player.x, g.player.y, g.player.z));
  });
  test(`jump clears a block at ${Math.round(1 / dt)} fps`, () => {
    const g = game();
    g.keys.add('Space');g.update(dt);g.keys.clear();
    let peak = g.player.y;
    for (let i = 0; i < Math.round(2 / dt); i++) {
      g.update(dt);peak = Math.max(peak, g.player.y);
    }
    assert(peak > 4, 'jump has clearance above a one-block ledge');
    assert(g.player.y >= 2.62 && g.player.y < 2.75, 'returns to ground');
  });
}

test('does not climb two-block walls or pass through a low ceiling', () => {
  for (const ceiling of [false, true]) {
    const g = game();g.set(20, 1, 21, 3);
    if (ceiling) g.set(20, 3, 20, 3);
    else g.set(20, 2, 21, 3);
    g.keys.add('KeyW');
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    assert(g.player.z < 20.74);
    assert(g.player.y < 2.75);
    assert(!g.collides(g.player.x, g.player.y, g.player.z));
  }
});

test('walks up successive stairs and falls after leaving a ledge', () => {
  const g = game();
  for (let z = 21; z <= 23; z++) for (let y = 1; y <= z - 20; y++) g.set(20, y, z, 3);
  g.keys.add('KeyW');
  for (let i = 0; i < 40; i++) g.update(1 / 60);
  assert(g.player.y > 5.6);
  for (let i = 0; i < 90; i++) g.update(1 / 60);
  assert(g.player.y >= 2.62 && g.player.y < 2.75);
});

test('flying into a block does not automatically change altitude', () => {
  const g = game();g.set(20, 1, 21, 3);g.flight();g.keys.add('KeyW');
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert.equal(g.player.y, 2.65);
  assert(g.player.z < 20.74);
});

test('expanded world has deep ground and bounded nearby geometry', () => {
  const g = game({ flat: false });
  assert.equal(g.SIZE,160);assert.equal(g.HEIGHT,128);
  assert(g.player.y>60);
  for(const x of [10,80,150])for(const z of [10,80,150]) {
    assert.equal(g.get(x,1,z),3);assert.equal(g.get(x,50,z),3);
  }
  assert(g.faces.every(f=>Math.abs(f.x-g.player.x)<35&&Math.abs(f.z-g.player.z)<35));
  g.player.x=140;g.player.z=140;g.rebuild();
  assert(g.faces.length>0);assert(g.faces.every(f=>f.x>100&&f.z>100));
});

test('legacy buildings, excavations and position survive expansion and a save round trip', () => {
  const old=new Array(40*40*24).fill(0);
  for(let z=0;z<40;z++)for(let x=0;x<40;x++)old[z*40+x]=3;
  old[(4*40+20)*40+19]=7;
  const legacy=JSON.stringify({world:old,player:{x:20.5,y:5.65,z:20.5,yaw:.4,pitch:-.2},flying:true});
  const saved=new Map([['craft-block-forest-v1',legacy]]);
  const g=game({saved,flat:false});
  assert.equal(g.player.x,80.5);assert.equal(g.player.y,65.65);
  assert.equal(g.get(79,64,80),7);assert.equal(g.get(80,63,80),0);
  assert.equal(g.get(80,59,80),3);assert(!g.collides(g.player.x,g.player.y,g.player.z));
  g.set(120,12,120,8);g.changed();g.save();
  assert.equal(saved.get('craft-block-forest-v1'),legacy,'keep original backup');
  const raw=saved.get('craft-block-forest-v2');assert(raw.length<1500000,'compact browser save');
  g.set(120,12,120,0);assert(g.load());assert.equal(g.get(120,12,120),8);
  assert.equal(g.get(79,64,80),7);assert.equal(g.get(80,63,80),0);
});
