/* 만화 그림 담당: 사람, 기린, 배경, 효과 무늬를 SVG로 그린다. */
(function(){
  const INK = '#17140f';
  const SKIN = '#F6D9B8';

  /* 이름마다 정해 둔 모습. 없는 이름은 이름 글자로 색과 머리 모양을 자동으로 고른다. */
  const CAST = {
    '추루룹'   :{s:'man',   c:'#8C5A2B', h:'#3A2A1C', prop:'🫙'},
    '추르릅'   :{s:'woman', c:'#C0607A', h:'#2E2119', prop:'🍜'},
    '촤르릅'   :{s:'girl',  c:'#E4572E', h:'#2E2119', eyes:'big'},
    '뽀파뽀프' :{s:'man',   c:'#3C8DAD', h:'#2E2119', glasses:1},
    '뿌파뿌포' :{s:'woman', c:'#6A7FDB', h:'#4A3423'},
    '빠푸뽀푸' :{s:'boy',   c:'#E0A458', h:'#2E2119', prop:'🎤', mouth:'talk'},
    '차추초추' :{s:'boy',   c:'#7A9E3F', h:'#2E2119', prop:'✉️'},
    '초차초츠' :{s:'man',   c:'#7A6FB0', h:'#6E6A63', prop:'🤞'},
    '초추초추' :{s:'ref',   c:'#2F3640', h:'#2E2119', prop:'🔍'},
    '잉잉을할랑':{s:'boy',  c:'#2E9E7B', h:'#2E2119', glasses:1, prop:'💻'},
    '꼬르륵'   :{s:'chef',  c:'#D64545', h:'#2E2119', prop:'🍢'},
    '뾰뿝'     :{s:'cap',   c:'#B4656F', h:'#2E2119', cap:'#6B4B3E', prop:'🚚'},
    '부릉부'   :{s:'helmet',c:'#F2A35E', h:'#2E2119', cap:'#E24E1B', prop:'💨'},
    '우당탕'   :{s:'boy',   c:'#9B59B6', h:'#2E2119', mouth:'talk'},
    '쨍그랑'   :{s:'man',   c:'#4FB3BF', h:'#6E6A63', prop:'🫙'},
    '주최자'   :{s:'suit',  c:'#34495E', h:'#2E2119', prop:'🏆'},
    '쀼보부'   :{s:'old',   c:'#8E7C68', h:'#E7E2D8', prop:'🖌️'},
    '홀짝훌'   :{s:'man',   c:'#A0703A', h:'#3A2A1C', prop:'🥄'},
    '훌짝훌'   :{s:'old',   c:'#7B6A55', h:'#E7E2D8', prop:'🍜'},
    '냠냠냠'   :{s:'boy',   c:'#E07A5F', h:'#2E2119', prop:'🍽️'},
    '또각또'   :{s:'man',   c:'#586F7C', h:'#2E2119', prop:'🧮'},
    '콰콰쾅'   :{s:'cap',   c:'#C44536', h:'#2E2119', cap:'#8C2F23', prop:'🔨'},
    '촉촉촉'   :{s:'cap',   c:'#3F88C5', h:'#2E2119', cap:'#2A5F8F', prop:'💧'},
    '방긋방'   :{s:'cap',   c:'#F2C14E', h:'#2E2119', cap:'#C99A2E', eyes:'smile'},
    '삐뽀삐'   :{s:'cap',   c:'#D7263D', h:'#2E2119', cap:'#8E1524', prop:'🧯'},
    '원장님'   :{s:'man',   c:'#6B8E23', h:'#6E6A63', prop:'🦒'},
    '우편배달부':{s:'cap',  c:'#2E86AB', h:'#2E2119', cap:'#1B5E7E', prop:'✉️'},
    '기다랑'   :{g:1, c:'#E8B44A', spot:'#B57B22'},
    '기다래'   :{g:1, c:'#EFC46B', spot:'#C68B2E', lash:1}
  };

  const PAL = ['#E4572E','#3C8DAD','#7A9E3F','#C06C84','#E0A458','#6A7FDB',
               '#2E9E7B','#B4656F','#846C5B','#4F6D7A','#D4894A','#8E6BB0'];
  const STYLES = ['boy','man','woman','girl','cap'];

  function hash(s){
    let h = 0;
    for(let i=0; i<s.length; i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function look(name){
    if(CAST[name]) return CAST[name];
    const h = hash(name);
    return {s:STYLES[h % STYLES.length], c:PAL[h % PAL.length], h:'#2E2119',
            cap:PAL[(h>>3) % PAL.length]};
  }

  /* ── 사람 그리기 ── */
  function personInner(g){
    const c = g.c, hair = g.h || '#2E2119';
    let s = '';
    s += '<ellipse cx="50" cy="163" rx="26" ry="5" fill="rgba(0,0,0,.18)"/>';
    // 다리와 신발
    s += '<rect x="38" y="124" width="9" height="32" rx="4" fill="#3B3730"/>'
       + '<rect x="53" y="124" width="9" height="32" rx="4" fill="#3B3730"/>'
       + '<ellipse cx="42" cy="157" rx="8.5" ry="5" fill="' + INK + '"/>'
       + '<ellipse cx="58" cy="157" rx="8.5" ry="5" fill="' + INK + '"/>';
    // 팔
    s += '<path d="M32 104 L19 130" stroke="' + c + '" stroke-width="10" stroke-linecap="round"/>'
       + '<path d="M68 104 L81 130" stroke="' + c + '" stroke-width="10" stroke-linecap="round"/>';
    // 몸
    s += '<path d="M31 130 Q28 96 50 92 Q72 96 69 130 Z" fill="' + c
       + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>';
    if(g.s === 'suit'){
      s += '<path d="M50 93 L45 104 L50 118 L55 104 Z" fill="#C0392B" stroke="' + INK + '" stroke-width="1.5"/>';
    }
    if(g.s === 'chef'){
      s += '<rect x="38" y="100" width="24" height="30" rx="3" fill="#FFF6E8" stroke="' + INK + '" stroke-width="2"/>';
    }
    // 손
    s += '<circle cx="18" cy="132" r="6" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>'
       + '<circle cx="82" cy="132" r="6" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>';
    // 목과 얼굴
    s += '<rect x="45" y="82" width="10" height="12" fill="' + SKIN + '"/>';
    s += '<circle cx="24" cy="64" r="5" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>'
       + '<circle cx="76" cy="64" r="5" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="2"/>';
    s += '<circle cx="50" cy="62" r="26" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="3"/>';

    // 머리 모양
    const st = g.s;
    if(st === 'girl'){
      s += '<ellipse cx="21" cy="72" rx="9" ry="17" fill="' + hair + '" stroke="' + INK + '" stroke-width="2"/>'
         + '<ellipse cx="79" cy="72" rx="9" ry="17" fill="' + hair + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<path d="M24 58 Q25 33 50 33 Q75 33 76 58 Q64 44 50 46 Q36 44 24 58 Z" fill="' + hair + '"/>';
      s += '<circle cx="30" cy="42" r="4" fill="#FF6B6B" stroke="' + INK + '" stroke-width="1.5"/>';
    }else if(st === 'woman'){
      s += '<circle cx="50" cy="30" r="12" fill="' + hair + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<path d="M23 62 Q23 33 50 33 Q77 33 77 62 Q66 44 50 46 Q34 44 23 62 Z" fill="' + hair + '"/>';
    }else if(st === 'old'){
      s += '<path d="M25 58 Q24 40 34 36 M75 58 Q76 40 66 36" stroke="' + hair
         + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
      s += '<path d="M29 66 Q50 100 71 66 Q50 82 29 66 Z" fill="' + hair + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<ellipse cx="50" cy="34" rx="25" ry="9" fill="#7A5C3E" stroke="' + INK + '" stroke-width="2.5"/>';
    }else if(st === 'cap' || st === 'ref'){
      const cap = st === 'ref' ? '#2F3640' : (g.cap || '#6B4B3E');
      s += '<path d="M24 52 Q26 27 50 27 Q74 27 76 52 Z" fill="' + cap + '" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '<rect x="14" y="49" width="46" height="8" rx="4" fill="' + cap + '" stroke="' + INK + '" stroke-width="2.5"/>';
      if(st === 'ref'){
        s += '<path d="M50 94 L64 108" stroke="' + INK + '" stroke-width="2"/>'
           + '<circle cx="66" cy="110" r="5" fill="#F1C40F" stroke="' + INK + '" stroke-width="2"/>';
      }
    }else if(st === 'chef'){
      s += '<path d="M24 56 Q26 36 50 36 Q74 36 76 56 Q64 46 50 47 Q36 46 24 56 Z" fill="' + hair + '"/>';
      s += '<rect x="32" y="26" width="36" height="14" rx="3" fill="#FFF8EE" stroke="' + INK + '" stroke-width="2.5"/>'
         + '<circle cx="36" cy="22" r="10" fill="#FFF8EE" stroke="' + INK + '" stroke-width="2.5"/>'
         + '<circle cx="50" cy="18" r="11" fill="#FFF8EE" stroke="' + INK + '" stroke-width="2.5"/>'
         + '<circle cx="64" cy="22" r="10" fill="#FFF8EE" stroke="' + INK + '" stroke-width="2.5"/>'
         + '<rect x="32" y="30" width="36" height="10" fill="#FFF8EE"/>';
    }else if(st === 'helmet'){
      s += '<path d="M23 62 A27 27 0 0 1 77 62 Z" fill="' + (g.cap || '#E24E1B') + '" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '<rect x="21" y="58" width="58" height="7" rx="3.5" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>';
    }else{ // boy, man, suit
      s += '<path d="M24 58 Q26 32 50 32 Q74 32 76 58 Q64 43 50 45 Q36 43 24 58 Z" fill="' + hair + '"/>';
      if(st === 'man' || st === 'suit'){
        s += '<path d="M41 75 Q50 81 59 75" stroke="' + hair + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
      }
    }

    // 눈
    if(g.eyes === 'big'){
      s += '<circle cx="40" cy="62" r="7" fill="#fff" stroke="' + INK + '" stroke-width="2"/>'
         + '<circle cx="60" cy="62" r="7" fill="#fff" stroke="' + INK + '" stroke-width="2"/>'
         + '<circle cx="41" cy="63" r="4" fill="' + INK + '"/><circle cx="61" cy="63" r="4" fill="' + INK + '"/>'
         + '<circle cx="39" cy="60" r="1.6" fill="#fff"/><circle cx="59" cy="60" r="1.6" fill="#fff"/>';
    }else if(g.eyes === 'smile'){
      s += '<path d="M35 63 Q40 57 45 63 M55 63 Q60 57 65 63" stroke="' + INK
         + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    }else{
      s += '<circle cx="41" cy="62" r="3.4" fill="' + INK + '"/><circle cx="59" cy="62" r="3.4" fill="' + INK + '"/>'
         + '<circle cx="40" cy="61" r="1.1" fill="#fff"/><circle cx="58" cy="61" r="1.1" fill="#fff"/>';
    }
    if(g.glasses){
      s += '<g fill="none" stroke="' + INK + '" stroke-width="2.2">'
         + '<circle cx="41" cy="62" r="8"/><circle cx="59" cy="62" r="8"/><path d="M49 62 H51"/></g>';
    }
    // 볼과 입
    s += '<circle cx="32" cy="71" r="4.5" fill="#F09A8C" opacity=".5"/>'
       + '<circle cx="68" cy="71" r="4.5" fill="#F09A8C" opacity=".5"/>';
    if(g.mouth === 'talk'){
      s += '<ellipse cx="50" cy="77" rx="6" ry="5" fill="#8E3B34" stroke="' + INK + '" stroke-width="2"/>';
    }else if(g.s !== 'old'){
      s += '<path d="M44 76 Q50 82 56 76" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    }
    if(g.prop){
      s += '<text x="84" y="120" font-size="24" text-anchor="middle">' + g.prop + '</text>';
    }
    return s;
  }

  /* ── 기린 그리기 ── */
  function giraffeInner(g){
    const c = g.c, sp = g.spot;
    let s = '';
    s += '<ellipse cx="52" cy="163" rx="34" ry="5" fill="rgba(0,0,0,.18)"/>';
    s += '<rect x="26" y="118" width="10" height="42" rx="5" fill="' + c + '" stroke="' + INK + '" stroke-width="2.5"/>'
       + '<rect x="42" y="118" width="10" height="42" rx="5" fill="' + c + '" stroke="' + INK + '" stroke-width="2.5"/>'
       + '<rect x="60" y="118" width="10" height="42" rx="5" fill="' + c + '" stroke="' + INK + '" stroke-width="2.5"/>'
       + '<rect x="74" y="118" width="10" height="42" rx="5" fill="' + c + '" stroke="' + INK + '" stroke-width="2.5"/>';
    // 꼬리
    s += '<path d="M24 112 Q10 122 14 138" stroke="' + c + '" stroke-width="5" fill="none" stroke-linecap="round"/>'
       + '<circle cx="14" cy="140" r="5" fill="' + sp + '" stroke="' + INK + '" stroke-width="2"/>';
    // 몸
    s += '<ellipse cx="54" cy="108" rx="34" ry="24" fill="' + c + '" stroke="' + INK + '" stroke-width="3"/>';
    // 목
    s += '<path d="M66 96 L82 30 L100 34 L86 102 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>';
    // 갈기
    s += '<path d="M82 32 L86 100" stroke="' + sp + '" stroke-width="5" stroke-linecap="round"/>';
    // 무늬
    s += '<g fill="' + sp + '" opacity=".85">'
       + '<circle cx="40" cy="100" r="6"/><circle cx="56" cy="95" r="7"/><circle cx="68" cy="112" r="6"/>'
       + '<circle cx="46" cy="118" r="5.5"/><circle cx="30" cy="112" r="4.5"/>'
       + '<circle cx="88" cy="55" r="4"/><circle cx="84" cy="76" r="4"/><circle cx="92" cy="40" r="3.5"/></g>';
    // 머리
    s += '<ellipse cx="103" cy="26" rx="17" ry="11" fill="' + c + '" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 103 26)"/>';
    s += '<ellipse cx="116" cy="26" rx="7" ry="6" fill="' + sp + '" stroke="' + INK + '" stroke-width="2"/>';
    // 뿔과 귀
    s += '<path d="M96 16 L93 6 M106 15 L106 5" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>'
       + '<circle cx="92" cy="5" r="3.5" fill="' + sp + '" stroke="' + INK + '" stroke-width="2"/>'
       + '<circle cx="106" cy="4" r="3.5" fill="' + sp + '" stroke="' + INK + '" stroke-width="2"/>'
       + '<ellipse cx="88" cy="20" rx="7" ry="4" fill="' + c + '" stroke="' + INK + '" stroke-width="2" transform="rotate(-25 88 20)"/>';
    // 눈
    s += '<circle cx="104" cy="22" r="4.2" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>'
       + '<circle cx="105" cy="22" r="2.4" fill="' + INK + '"/>';
    if(g.lash){
      s += '<path d="M100 17 L97 14 M104 16 L103 12 M108 17 L110 13" stroke="' + INK
         + '" stroke-width="1.8" stroke-linecap="round"/>';
    }
    return s;
  }

  const cache = {};
  function parts(name){
    if(cache[name]) return cache[name];
    const g = look(name);
    const o = g.g
      ? {inner:giraffeInner(g), vb:'0 0 124 170', face:'80 0 46 46'}
      : {inner:personInner(g),  vb:'0 0 100 170', face:'20 30 60 60'};
    cache[name] = o;
    return o;
  }

  window.drawPerson = function(name){
    const p = parts(name);
    return '<svg viewBox="' + p.vb + '" xmlns="http://www.w3.org/2000/svg">' + p.inner + '</svg>';
  };
  window.drawFace = function(name){
    const p = parts(name);
    return '<svg viewBox="' + p.face + '" xmlns="http://www.w3.org/2000/svg">' + p.inner + '</svg>';
  };

  /* ── 배경 ── */
  function wrap(inner){
    return '<svg class="bg" viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice" '
         + 'xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  const BG = {
    day: '<rect width="200" height="130" fill="#BFE3F5"/><circle cx="168" cy="24" r="14" fill="#FFE07A"/>'
       + '<path d="M0 104 Q40 78 84 104 T200 100 V130 H0 Z" fill="#9FCB72"/>'
       + '<ellipse cx="40" cy="26" rx="20" ry="9" fill="#fff" opacity=".8"/>'
       + '<ellipse cx="58" cy="30" rx="14" ry="7" fill="#fff" opacity=".8"/>',
    home:'<rect width="200" height="130" fill="#F3E2C7"/><rect y="98" width="200" height="32" fill="#C89B6A"/>'
       + '<rect x="18" y="16" width="52" height="42" rx="3" fill="#BFE3F5" stroke="#8A6A45" stroke-width="4"/>'
       + '<path d="M44 16 V58 M18 37 H70" stroke="#8A6A45" stroke-width="4"/>'
       + '<rect x="112" y="72" width="70" height="10" rx="3" fill="#A9743F"/>'
       + '<rect x="120" y="82" width="8" height="18" fill="#8A5C2E"/><rect x="166" y="82" width="8" height="18" fill="#8A5C2E"/>'
       + '<circle cx="146" cy="66" r="7" fill="#5A3A22"/>',
    factory:'<rect width="200" height="130" fill="#D9CBB2"/><rect y="100" width="200" height="30" fill="#A9987A"/>'
       + '<g fill="#8B5A2B" stroke="#5A3A1C" stroke-width="3">'
       + '<rect x="14" y="60" width="30" height="40" rx="6"/><rect x="50" y="60" width="30" height="40" rx="6"/>'
       + '<rect x="32" y="20" width="30" height="38" rx="6"/><rect x="140" y="60" width="30" height="40" rx="6"/></g>'
       + '<rect x="96" y="14" width="14" height="86" fill="#B9A886"/>',
    shop:'<rect width="200" height="130" fill="#FFE7CC"/>'
       + '<g><rect width="200" height="22" fill="#E24E1B"/>'
       + '<rect x="0" y="0" width="20" height="22" fill="#FFF3CF"/><rect x="40" y="0" width="20" height="22" fill="#FFF3CF"/>'
       + '<rect x="80" y="0" width="20" height="22" fill="#FFF3CF"/><rect x="120" y="0" width="20" height="22" fill="#FFF3CF"/>'
       + '<rect x="160" y="0" width="20" height="22" fill="#FFF3CF"/></g>'
       + '<rect y="96" width="200" height="34" fill="#C0793C"/>'
       + '<circle cx="40" cy="80" r="16" fill="#D7442B" stroke="#8E2A18" stroke-width="3"/>'
       + '<path d="M34 58 q6 -8 0 -16 M46 58 q6 -8 0 -16" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>',
    stage:'<rect width="200" height="130" fill="#3A2438"/>'
       + '<path d="M0 0 H46 Q34 60 46 130 H0 Z" fill="#8E2B3C"/><path d="M200 0 H154 Q166 60 154 130 H200 Z" fill="#8E2B3C"/>'
       + '<rect y="104" width="200" height="26" fill="#8A6034"/>'
       + '<path d="M100 0 L58 104 H142 Z" fill="#FFF2B0" opacity=".28"/>',
    sea: '<rect width="200" height="130" fill="#BFE3F5"/><circle cx="34" cy="22" r="12" fill="#FFE07A"/>'
       + '<rect y="62" width="200" height="68" fill="#3E86B5"/>'
       + '<path d="M0 78 q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0" stroke="#7FB8DA" stroke-width="3" fill="none"/>'
       + '<path d="M0 98 q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0" stroke="#7FB8DA" stroke-width="3" fill="none"/>'
       + '<path d="M120 62 h44 l-8 14 h-28 Z" fill="#C0392B" stroke="#17140f" stroke-width="2"/>'
       + '<rect x="138" y="42" width="4" height="20" fill="#5A3A22"/><path d="M142 44 h16 l-16 12 Z" fill="#FFF3CF"/>',
    park:'<rect width="200" height="130" fill="#CFEAF7"/><rect y="88" width="200" height="42" fill="#8CC06A"/>'
       + '<rect x="24" y="40" width="12" height="52" fill="#7A5230"/>'
       + '<circle cx="30" cy="34" r="22" fill="#5E9E48"/><circle cx="12" cy="48" r="15" fill="#5E9E48"/><circle cx="50" cy="48" r="15" fill="#5E9E48"/>'
       + '<g stroke="#A9865B" stroke-width="4"><path d="M120 92 V64 M150 92 V64 M180 92 V64 M110 72 H196 M110 84 H196"/></g>',
    screen:'<rect width="200" height="130" fill="#16233A"/><rect x="8" y="10" width="184" height="110" rx="6" fill="#2E7D4F" stroke="#0E1726" stroke-width="4"/>'
       + '<g stroke="#5FBF86" stroke-width="2" opacity=".8"><path d="M100 10 V120"/><circle cx="100" cy="65" r="20" fill="none"/>'
       + '<rect x="8" y="42" width="26" height="46" fill="none"/><rect x="166" y="42" width="26" height="46" fill="none"/></g>'
       + '<circle cx="100" cy="65" r="6" fill="#fff" stroke="#16233A" stroke-width="2"/>',
    snow:'<rect width="200" height="130" fill="#DCE9F2"/><rect y="96" width="200" height="34" fill="#FFFFFF"/>'
       + '<g fill="#fff"><circle cx="20" cy="18" r="3"/><circle cx="58" cy="40" r="2.5"/><circle cx="96" cy="14" r="3"/>'
       + '<circle cx="134" cy="36" r="2.5"/><circle cx="172" cy="20" r="3"/><circle cx="40" cy="70" r="2.5"/>'
       + '<circle cx="150" cy="70" r="3"/><circle cx="110" cy="56" r="2.5"/></g>'
       + '<rect x="56" y="100" width="88" height="26" rx="4" fill="#F3D9A8" stroke="#B99A63" stroke-width="3"/>'
       + '<g stroke="#B99A63" stroke-width="2"><path d="M56 113 H144 M78 100 V126 M100 100 V126 M122 100 V126"/></g>',
    storm:'<rect width="200" height="130" fill="#4A5563"/>'
       + '<ellipse cx="50" cy="26" rx="40" ry="18" fill="#2F3947"/><ellipse cx="112" cy="20" rx="46" ry="20" fill="#2F3947"/>'
       + '<ellipse cx="172" cy="30" rx="36" ry="16" fill="#2F3947"/>'
       + '<g stroke="#9FC4E0" stroke-width="2.5" opacity=".8">'
       + '<path d="M20 54 L10 84 M52 48 L42 82 M84 56 L74 88 M116 50 L106 84 M148 58 L138 90 M180 52 L170 86"/></g>'
       + '<rect y="110" width="200" height="20" fill="#3B4654"/>',
    letter:'<rect width="200" height="130" fill="#F6E7C9"/><rect y="104" width="200" height="26" fill="#C9A874"/>'
       + '<g fill="#FFFDF0" stroke="#B08A54" stroke-width="2.5">'
       + '<rect x="14" y="16" width="34" height="24" rx="2"/><rect x="62" y="24" width="34" height="24" rx="2"/>'
       + '<rect x="110" y="14" width="34" height="24" rx="2"/><rect x="156" y="26" width="34" height="24" rx="2"/>'
       + '<rect x="38" y="60" width="34" height="24" rx="2"/><rect x="92" y="62" width="34" height="24" rx="2"/></g>'
       + '<g stroke="#B08A54" stroke-width="2" fill="none"><path d="M14 16 L31 30 L48 16 M62 24 L79 38 L96 24 M110 14 L127 28 L144 14'
       + ' M156 26 L173 40 L190 26 M38 60 L55 74 L72 60 M92 62 L109 76 L126 62"/></g>',
    road:'<rect width="200" height="130" fill="#CFEAF7"/><rect y="78" width="200" height="52" fill="#6E6A63"/>'
       + '<rect y="72" width="200" height="8" fill="#8CC06A"/>'
       + '<g fill="#FFF3CF"><rect x="10" y="102" width="26" height="6"/><rect x="58" y="102" width="26" height="6"/>'
       + '<rect x="106" y="102" width="26" height="6"/><rect x="154" y="102" width="26" height="6"/></g>'
       + '<rect x="150" y="34" width="10" height="38" fill="#7A5230"/><circle cx="155" cy="30" r="18" fill="#5E9E48"/>'
  };
  window.drawBg = function(kind){ return wrap(BG[kind] || BG.day); };

  /* ── 큰 글자 칸 뒤의 번쩍 무늬 ── */
  window.drawBurst = function(gold){
    let rays = '';
    for(let i=0; i<24; i++){
      const a = (i * 15) * Math.PI / 180;
      const x = 100 + Math.cos(a) * 200, y = 60 + Math.sin(a) * 200;
      const b = a + 0.13;
      rays += '<path d="M100 60 L' + x.toFixed(1) + ' ' + y.toFixed(1) + ' L'
            + (100 + Math.cos(b) * 200).toFixed(1) + ' ' + (60 + Math.sin(b) * 200).toFixed(1) + ' Z" fill="'
            + (gold ? '#8A6A12' : '#3A342A') + '"/>';
    }
    return '<svg class="bg" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" '
         + 'xmlns="http://www.w3.org/2000/svg">' + rays + '</svg>';
  };
})();
