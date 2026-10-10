/* Tranh thẻ pixel vẽ tay trên lưới 48×60; chỉ vẽ, không đổi dữ liệu game.
   Màu khớp pixel.js; giữ bảng nhỏ riêng để trang xem thẻ cũ vẫn chạy độc lập. */
(() => {
  'use strict';
  const W = 48, H = 60;
  const PAL = {
    k: '#2B1D22', K: '#5A3E3A', z: '#FFF8EC', c: '#F3E3C3', C: '#E3CBA0', d: '#C9AD82',
    w: '#C08552', W: '#8A5A3B', v: '#5E3B27', j: '#6CCBB2', J: '#2E9C8A', g: '#1E6B5F',
    t: '#EBA77A', T: '#C8693F', u: '#8E4430', o: '#F6CB55', O: '#D3962E', i: '#FADFC4',
    I: '#E0AE86', Y: '#C96C8C', N: '#1B2D4C', D: '#8C9A52', U: '#5C6834',
    b: '#7DB4E3', B: '#3F6FA8', n: '#27406B', R: '#D9534A', E: '#9E3530', y: '#F29BB8',
    q: '#9C7BD0', Q: '#5E4691', l: '#D2CBBE', L: '#8F887E', m: '#57514B', x: '#1D2433', X: '#8EF0DA',
  };
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // ---------- Ghép lưới: tọa độ và kích thước đều là ô pixel nguyên ----------
  function fill(g, x, y, w, h, ch) {
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) {
      if (g[r]?.[c] !== undefined) g[r][c] = ch;
    }
  }
  function stamp(g, x, y, rows, map = {}, rim = false) {
    if (rim) rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) fill(g, x + c + dx, y + r + dy, 1, 1, 'k');
    }));
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== '.') fill(g, x + c, y + r, 1, 1, map[ch] || ch);
    }));
  }
  const STAR = ['..o..', '..z..', 'ozzzo', '..z..', '..o..'];
  const LEAF = ['...j', '..jJ', '.jJg', 'jJg.', '.g..'];
  const FLOWER = ['..y.y..', '.yzyzy.', '..yoy..', '.yzyzy.', '..y.y..', '...J...', '..jJ...'];
  const CLOUD = ['...zzzzz....', '.zzzzzzzzz..', 'zzzzzzzzzzzz', '..cccccccc..'];
  const LANTERN = ['...K...', '..ooo..', '.oRRo..', '.oRTo..', '.oRRo..', '..OOO..', '...T...', '...o...'];
  const CRYSTAL = ['...X...', '..Xzb..', '.XzzbB.', 'XzzbbBB', '.XbbBB.', '..XBB..', '...B...'];
  const FLAME = ['...o....', '..oo....', '..oz.o..', '.oozoo..', '.ozzoo..', 'ozzzooT.', 'ozzooTT.', '.ooTTT..', '..TTT...'];
  const TREE = ['....jJJ....', '..jjJJJJJ..', '.jjJJJJJJJ.', 'jjJJJJJJJJg', '.JJJJJJJgg.', '..ggWggg...', '....Ww.....', '....Ww.....'];
  const MOON = ['..oooo..', '.oooc...', 'oooc....', 'ooc.....', 'ooc.....', 'oooc....', '.oooooc.', '..oooo..'];
  const BOLT = ['...oo', '..oo.', '.oo..', 'ooooo', '...o.', '..o..', '.o...', 'o....'];

  // ---------- Cảnh nền: hai lớp xa gần và nền quán quen ----------
  const ENV = {
    meadow: ['b', 'j', 'J', 'D'], forest: ['c', 'D', 'g', 'U'], pond: ['b', 'j', 'J', 'B'],
    sky: ['b', 'c', 'z', 'c'], night: ['N', 'n', 'Q', 'n'], desert: ['c', 't', 'O', 'd'],
    snow: ['b', 'l', 'c', 'z'], blossom: ['c', 'y', 'Y', 'D'], sea: ['B', 'b', 'J', 'd'],
    storm: ['n', 'B', 'L', 'l'], volcano: ['N', 'u', 'E', 'v'], dawn: ['t', 'y', 'T', 'C'],
    space: ['x', 'N', 'Q', 'N'], lantern: ['N', 'Q', 'u', 'v'],
    room: ['c', 'C', 'J', 'd'], kitchen: ['c', 'z', 'b', 'C'], cafeNight: ['N', 'n', 'g', 'v'],
  };
  function background(env, seed) {
    const [sky, far, near, ground] = ENV[env];
    const g = Array.from({ length: H }, () => Array(W).fill(sky));
    if (['room', 'kitchen', 'cafeNight'].includes(env)) {
      fill(g, 0, 30, W, 10, near); fill(g, 0, 39, W, 2, 'W'); fill(g, 0, 41, W, 19, ground);
      for (let x = 0; x < W; x += 8) fill(g, x, 30, 1, 9, far);
      for (let y = 45; y < H; y += 7) {
        fill(g, 0, y, W, 1, far);
        for (let x = (y % 2) * 5; x < W; x += 10) fill(g, x, y + 1, 1, 6, far);
      }
      fill(g, 3, 5, 11, 13, 'W'); fill(g, 4, 6, 9, 11, env === 'cafeNight' ? 'x' : 'b');
      fill(g, 8, 6, 1, 11, 'C'); fill(g, 4, 11, 9, 1, 'C');
      fill(g, 34, 6, 10, 11, 'W'); fill(g, 35, 7, 8, 9, seed % 2 ? 'T' : 'B');
      stamp(g, 37, 8, ['..o..', '.ooo.', '..o..']);
      if (env === 'kitchen') {
        fill(g, 2, 24, 44, 2, 'W');
        for (let x = 4; x < 44; x += 7) stamp(g, x, 20, ['.zz.', 'cccc', '.CC.']);
      }
    } else {
      for (let x = 0; x < W; x++) {
        fill(g, x, 28 + Math.floor((x + seed * 3) / 7) % 4, 1, 32, far);
        fill(g, x, 35 + Math.floor((x + seed * 5) / 5) % 3, 1, 25, near);
      }
      fill(g, 0, 46, W, 14, ground);
      if (['night', 'space', 'lantern'].includes(env)) {
        for (let i = 0; i < 15; i++) fill(g, (i * 13 + seed * 3) % 46 + 1, (i * 7 + seed) % 26 + 2, 1, 1, i % 3 ? 'c' : 'o');
        stamp(g, 34, 5, MOON);
      } else if (env === 'volcano') {
        stamp(g, 33, 8, ['....u....', '...uou...', '..uooou..', '.uuEEuuE.', 'uuEEEEuuE']);
      } else if (!['sea', 'storm'].includes(env)) {
        stamp(g, 3, 7 + seed % 3, CLOUD); stamp(g, 33, 12, CLOUD);
      }
      if (['forest', 'meadow'].includes(env)) { stamp(g, -3, 27, TREE); stamp(g, 40, 30, TREE); }
      if (['pond', 'sea'].includes(env)) {
        for (let y = 48; y < H; y += 4) for (let x = (y + seed) % 9; x < W; x += 13) fill(g, x, y, 6, 1, 'b');
      } else if (env === 'snow') {
        for (let i = 0; i < 14; i++) fill(g, (i * 17 + seed) % W, (i * 11) % 55, 1, 1, 'z');
      } else {
        for (let x = 2; x < W; x += 9) stamp(g, x, 51 + x % 3, ['.J.', 'JJJ']);
      }
    }
    fill(g, 13, 47, 22, 2, ['pond', 'sea'].includes(env) ? 'n' : 'K');
    fill(g, 17, 49, 14, 1, ['pond', 'sea'].includes(env) ? 'B' : 'W');
    return g;
  }
  function aura(g, rarity) {
    if (rarity === 'basic') return;
    const color = { rare: 'b', epic: 'q', legend: 'o', mythic: 'y' }[rarity];
    if (rarity !== 'rare') {
      // Vòng hào quang bậc thang, giữ cạnh sắc cả khi phóng to.
      stamp(g, 6, 12, ['...............aaaaaa', '..........aaaaa......aaaaa', '.......aaa................aaa', '.....aa......................aa', '...aa..........................aa', '..a..............................a', '.a................................a', 'a..................................a'], { a: color });
      stamp(g, 6, 20, ['a..................................a', 'a..................................a', 'a..................................a', 'a..................................a', 'a..................................a', '.a................................a', '..a..............................a', '...aa..........................aa'], { a: color });
    }
    stamp(g, 5, 17, STAR, { o: color }); stamp(g, 38, 31, STAR, { o: color });
    if (rarity === 'legend' || rarity === 'mythic') { stamp(g, 34, 4, STAR, { o: color }); stamp(g, 3, 41, STAR, { o: color }); }
    if (rarity === 'mythic') { stamp(g, 4, 4, CRYSTAL, { b: 'q', B: 'Q' }); stamp(g, 37, 48, CRYSTAL); }
  }

  // ---------- Lô 1 · HB-001–020 ----------
  const MYSTIC = [null,
    { env: 'meadow', rows: [
      '......jj....jj......', '.....jzJj..jzJj.....', '.....jJJJjjJJJj.....', '......ggjjjjgg......',
      '....cccczzcccc......', '...cczzzzzzzzcc.....', '..czzzzzzzzzzzzc....', '.czzzzzzzzzzzzzzc...',
      '.czzkkzzzzkkzzzzc...', '.czzkzzzzzkzzzzzc...', '.czzzyzzzzzyzzzzc...', '..czzzzzKzzzzzzc....',
      '...cczzzzzzzzcc.....', '.....cczzzzcc.......', '.......JJJ..........', '.....jjJJJjj........', '......ggggg.........',
    ], props: [['leaf', 6, 38], ['crystal', 36, 25]] },
    { env: 'night', rows: [
      '.......OOOOOO.......', '....OOOOoooOOOO.....', '..OOoooooozooooOO...', '.OoozzoooozzoooooO..', 'OoozzzzooooooooccoO.',
      'OooozzooooozzoooooO.', 'OooooooooozzzoooooO.', '.OOOOOOOOOOOOOOOOO..', '...CCCCCCCCCCCC.....', '......cccccc........',
      '......czzzzc........', '......czkzkc........', '......czzzzc........', '......czyyzc........', '.....cczzzzcc.......', '....CCCCCCCCCC......',
    ], props: [['star', 7, 22], ['star', 34, 34], ['star', 19, 10]] },
    { env: 'pond', rows: [
      '.........jj....y.....', '.........JJ...yoy....', '......DDDDDDDD.J.....', '....DDjjDDjjDDDD.....', '...DDjJDDjJDDjJDD....',
      '..DDDDDDDDDDDDDDDD...', '.DDjjDDjjDDjjDDjjDD..', 'DDjJDDjJDDjJDDjJDDD..', 'UUUUUUUUUUUUUUUUU...',
      '.jjUUUUUUUUUUUUUUjjj', 'jjjjUUUUUUUUUUUjjjjj', '.jJjUUUUUUUUUUUjkzjk', '..JJJJJJJJJJJJJjjjjj', '...JJJ........JJJJ..', '...ggg........gggg..',
    ], props: [['leaf', 5, 40]] },
    { env: 'sky', rows: [
      '.....zz....zz.....', '....zyzz..zzyz....', '....zyzz..zzyz....', '....zyzz..zzyz....', '....zyzz..zzyz....',
      '....zzzz..zzzz....', '.....zzzzzzzz.....', '...zzzzzzzzzzzz...', '..zzzzzzzzzzzzzz..', '.zzzzzzzzzzzzzzzz.',
      '.zzzBkzzzzkBzzzzz.', '.zzzBzzzzzzBzzzzz.', '.zzzyzzzzzzyzzzzz.', '..zzzzzzKzzzzzz...',
      '...zzzzzzzzzzzz...', '....cccccccccc....', '...zzcczzzzcczz...', '...zzcczzzzcczz...', '...zzzzzzzzzzzz...', '....cccc..cccc....',
    ], props: [['cloud', 4, 46], ['cloud', 32, 44]] },
    { env: 'forest', rows: [
      '...jJ..........Jj...', '..jJJj........jJJj..', '.jJJJj........jJJJj.', '..jDDDDDDDDDDDDDj...', '.DDDDDDDDDDDDDDDDD..',
      '.DDccDDDDDDDDccDDD..', 'DDczzcDDDDDDczzcDDD.', 'DDczkzDDDDDDzkzcDDD.', 'DDczzcDDDDDDczzcDDD.', '.DDccDDDOODDDccDDD..',
      '..DDDDDDOODDDDDDD...', '...DDDDccccDDDDD....', '..DDDDccccccDDDDD...', '.jDDDccCccCccDDDJj..', '.gDDDccccccccDDDg...',
      '..gDDccCccCccDDg....', '....DDccccccDD......', '.....OOO..OOO.......', 'WWWWWWWWWWWWWWWWWWWW',
    ] },
    { env: 'pond', rows: [
      '.........b.........', '........bzb........', '.......bzzbb.......', '......bzzzzbb......', '.....bzzzzzzbb.....',
      '....bzzzzzzbbbb....', '...bzzzzzzbbbbbb...', '..bzzzzzzbbbbbbbb..', '.bzzzzbbbbbbbbbbbb.', 'bzzzzbbbbbbbbbbbbbB',
      'bzzbbbbbbbbbbbbbbbB', 'bbbbBzkbbbbkzBbbbbB', 'bbbbBkkbbbbkkBbbbbB', '.bbbbbybbbbybbbbB..', '..bbbbbbbbbbbbbB...',
      '...BBBBBkkBBBBB....', '.....BBBBBBBB......', '.......BBBB........',
    ], props: [['crystal', 35, 36]] },
    { env: 'pond', rows: [
      '............yyyyyyy.....', '..........yyzzzzzzzyy...', '.........yzzYYYYYzzzyy..', '........yzzYzzzzzYzzzyy.',
      '........yzYzzYYYzzYzzyy.', '........yzYzYzzzYzYzzyy.', '........yzYzYzYzYzYzzyy.', '........yzYzzYYzYzYzzyy.',
      '........yzzYzzzYzzYzzyy.', '.........yzzYYYYYYzzyyy.', '..c...c...yzzzzzzzzyyyy.', '..C...C....yyyyyyyyyyy..',
      '.ckzckzc....CCCCCCCC...', 'cczzzzzzcCCCCCCCCCCC...', 'czzzyyzzzzzzzzzzzzCCC..', '.CCCCCCCCCCCCCCCCCCC...',
    ], props: [['crystal', 5, 30]] },
    { env: 'pond', rows: [
      '.........y.y.........', '........yzyzy........', '.........yoy.........', '.....jj.......jj.....', '....jzzj.....jzzj....',
      '....jzkj.....jkzj....', '...jjjjjjjjjjjjjjj...', '..jjjjjjjjjjjjjjjjj..', '.jjjjjjjzjjjjjjjjjjj.', '.jjjjjjzzzzjjjjjjjjj.',
      '..JJJJJJKKKJJJJJJJJ..', '...JJJccccccJJJJJJ...', '..JJJcczzzzccJJJJJJ..', '.jjJJcczzzzccJJJJJjj.', 'jjjjJJJccccJJJJJjjjjj',
      '.ggggggggggggggggggg.', '.....jjjjjjjjjjj.....', '...JJJJJJJJJJJJJJJ...',
    ], props: [['flower', 4, 42]] },
    { env: 'night', rows: [
      'qq.................qq', 'qQq...............qQq', 'qQQq...q.....q...qQQq', 'qQQQq.qQq...qQq.qQQQq', 'qQQQQqqqqqqqqqqqQQQQq',
      '.qQQQQqqqqqqqqqQQQQq.', '..qQQqqzkqqqkzqqQQq..', '...qQqqkkqqqkkqqQq...', '....qqqqqyqqqqqqq....', '.....qqqqqqqqqqq.....',
      '......QQQyyQQQ.......', '......QQQQQQQQ.......', '.....QQQQRRQQQQ......', '.....QQQRRRRQQQ......', '......QQQRRQQQ.......',
    ], props: [['leaf', 25, 41]] },
    { env: 'forest', rows: [
      '.......W.W.W.W.......', '.....WWwWwWwWwWW.....', '...WWwWwWwWwWwWwWW...', '..WwWwWwWwWwWwWwWwW..', '.WwWwWwWwWwWwWwWwWwW.',
      'WwWwWwWwWwWwWwWwWwWwW', '.WwWwWwWwwwwwwwwWwWw.', '..WwWwwwwwttttwwwwW..', '...Wwwwtttttttttww...', '....wwttzktttkzttw...',
      '....wwttkktttkkttw...', '....wwtttttktttttw...', '....wwtcttcccttctw...', '.....wccccccccccw....',
      '......ccwwwwwccc.....', '......ccwOOOwccc.....', '.......cwOOOwc.......', '.......wwwwwww.......',
    ] },
    { env: 'sky', rows: [
      '........O........', '........O........', '....OOOOOOOOO....', '....O..O.O..O....', '....O..O.O..O....', '....O..O.O..O....',
      '....O..O.O..O....', '.......oooo......', '.....ooooooOO....', '....oozzooooOO...', '...oozzzzooooOO..', '..ooooooozkoooOO.',
      '.oooooooookooOOO.', '.OoooooooOOooooo.', '..OooooooOOoOOO..', '...OOOOOOoOO.....', '.....OOO.........', '....O..O.........',
    ] },
    { env: 'desert', rows: [
      '.........tttttt..........', '.......tttttttttt........', '......tttttttttttt.......', '.....ttttzktttkzttt......', '.....ttttkktttkkttt......',
      '......tttttKtttttt.......', '.......TTTTTTTTTT........', '....ttTTTtTTtTTTTtt......', '...ttTTTttTTttTTTTtt.....', '..ttTTTTTTTTTTTTTTTTt....',
      '..TTTTTTTTTTTTTTTTTTTT...', '.tTTTTTtTTtTTtTTTTTTTTT..', 'tttt.TTTTTTTTTTTT...TTTTT', 'tttt..TTTTTTTTTT.....TTTT', '.......tt....tt.......TTT',
      '......ttt....ttt.......TT', '......TTT....TTT......TT.',
    ] },
    { env: 'meadow', rows: [
      '....K........K....', '.....K......K.....', '..bb..JJJJJJ..bb..', '.bzzbJJzkzkJJbzzb.', 'bzzzbJJkkkkJJbzzzb',
      'bzzzzbJJJJJJbzzzzb', 'bzzzzzbJJJJbzzzzzb', 'bzzzzzbJJJJbzzzzzb', 'bzzzzzbJjJJbzzzzzb', '.bzzzzbJjJJbzzzzb.',
      '..bbbbJJJJJJbbbb..', '..KK..JJkJJJ..KK..', '.K....JJkJJJ....K.', 'K.....JJkJJJ.....K', '.K....JJJJJJ....K.',
      '..K...JJJJJJ...K..', '.......gggg.......',
    ], props: [['flower', 35, 44]] },
    { env: 'snow', rows: [
      '....l..........l....', '...lzl........lzl...', '...lzzl......lzzl...', '..lzzzzllllllzzzzl..', '.lzzzzzzzzzzzzzzzzl.',
      'lzzzzzzzzzzzzzzzzzzl', 'lzzzzBzkzzzkzBzzzzzl', 'lzzzzBkkzzzkkBzzzzzl', 'lzzzzyzzzzzzzyzzzzzl', '.lzzzzzzKzzzzzzzzzl.',
      '..lllzzzzzzzzllll...', '....lzzzzzzzzl....ll', '...lzzzzzccczzl..lzl', '..lzzzzzzcccczzllzzl', '..lzzzzzzcccczzlzzl.',
      '...lzzzzzzzzzzlzzl..', '....lll....llllll...',
    ], props: [['cloud', 5, 46]] },
    { env: 'space', rows: [
      '...llll......llll...', '..lzzzzl....lzzzzl..', '.lzyyyzzl..lzzyyyzl.', '.lzyyyyzzllzzyyyyzl.', '..lzzzzzzzzzzzzzzl..',
      '...lzzzzzzzzzzzzl...', '..lzzzzzzzzzzzzzzl..', '..lzzkzzzzzzkzzzzl..', '..lzzzzzzKzzzzzzzl..', '...lzzzzzzzzzzzzl...',
      '....lzzzzzzzzzzl....', '....llzzzozzzzll....', '...lzzlzozozlzzzl...', '...lzzlzooozlzzzl...', '....lzzzzzzzzzzl....',
      '.....llzzzzzzll..YY.', '.....lll..lll...Y..Y', '..............YY....',
    ], props: [['star', 5, 25]] },
    { env: 'lantern', rows: [
      '.....t..........t.....', '....tct........tct....', '....tcct......tcct....', '...tccctttttttccct....', '...tctttttttttttct....',
      '..ttttttttttttttttt...', '.ttttttttttttttttttt..', '.tttKztttttttzKttttt..', '.tttkktttttttkkttttt..', '..tccctttttttcccttt...',
      '...tccccKcccccttt.....', '....tcccccccctt.......', '....TTTcccTTTT.....cc.', '...TTTcccccTTTT...ccc.', '..TTTTcccccTTTTT.cccc.',
      '..TTTTTcccTTTTTTTTcc..', '...TTTTTTTTTTTTTTTT...', '....TTT.....TTTTTT....',
    ], props: [['lantern', 35, 25]] },
    { env: 'night', rows: [
      '....b..........b....', '...bzb........bzb...', '...bzzb......bzzb...', '..bzzzzbbbbbbzzzzb..', '.bzzzzzzoooozzzzzzb.',
      'bzzzzzzoozzzzzzzzzzb', 'bzzzzzoozzzzzzzzzzzb', 'bzzzzzzoooozzzzzzzzb', 'bzzzzOzkzzzkzOzzzzzb', 'bzzzzOkkzzzkkOzzzzzb',
      '.bzzzzzzKzzzzzzzzzb.', '..bbbzzzzzzzzbbbb...', '....bzzzzzzzzb....bb', '...bzzzzcccczzb..bzb', '..bzzzzzcccczzzbbzzb',
      '..bzzzzzzcczzzzbzzb.', '...bzzzzzzzzzzbzzb..', '....bbb....bbbbbb...',
    ] },
    { env: 'pond', rows: [
      '....jjjj......jjjj....', '...jccccj....jccccj...', '...jccjjjjjjjjjjccj...', '..jjjjjjjjjjjjjjjjjj..', '.jjjjjjjjjjjjjjjjjjjj.',
      '.jjjjzkjjjjjjkzjjjjjj.', '.jjjjkkjjjjjjkkjjjjjj.', '..jjjcccjKjjcccjjjjj..', '...jjccccccccccjjjj...', '....JJccccccccJJJJ....',
      '...JJJJccXXccJJJJJJ...', '..JJjJJJXzzXJJJjJJJJ..', '..JJjjJXzzbbXJjjJJJJ..', '...JJJJJXbbXJJJJJJJ...', '....JJJJJXXJJJJJJ.....',
      '.....JJJ...JJJ..JJJJ..', '.....ggg...ggg...JJJJ.',
    ], props: [['crystal', 34, 43]] },
    { env: 'blossom', rows: [
      'y.......................y', 'yy.....................yy', 'yzyy.................yyzy', 'yzzzyy.............yyzzzy', '.yzzzzyy...yyy...yyzzzzy.',
      '..yzzzzzy.yyyyY.yzzzzzy..', '...yzzzzyyyyyyYYzzzzzy...', '....yzzzyyzkzyYYzzzzy....', '.....yzyyykkzyYYzzyy.....', '......yyyyOOyyyYyy.......',
      '.......yycccyyyyY........', '.......ycccccyyyY........', '.......yccCccyyyY........', '........ycccyyyY.........', '.........yyYyyY..........',
      '.........O...O...........',
    ], props: [['flower', 4, 36], ['flower', 36, 15]] },
    { env: 'forest', rows: [
      '...................jjjj..', '..................jzzjjj.', '.................jjzkjjjj', '.................jjkkjjjj', '.................jjjjjjjj',
      '..................jjjjjj.', '..................JJJJ...', '......JJJJJJJJ....JJJ....', '....JJjjjjjjJJJJ.JJJ.....', '...JJjjccjjccjjJJJJ......',
      '..JJjjjjjjjjjjjjJJ.......', '..JJjjjjjjjjjjjJJ........', '..JJJJJJJJJJJJJJ.........', '...JJJJ......JJJ.........', '....JJJJJJJJJJJ..........',
      '......ggggggg............',
    ], props: [['leaf', 33, 20]] },
  ];

  // ---------- Lô 2 · HB-021–040 ----------
  MYSTIC.push(
    { env: 'snow', rows: [
      '....B...........B....', '...Bzb.........bzB...', '..Bzzzb.......bzzzB..', '..BzzzzBBBBBBBzzzzB..', '.BzzzzzzbbbbzzzzzzzB.',
      'BzzzzzzbbbbbbzzzzzzzB', 'BzzzkzBzzzzzzzBzkzzzB', 'BzzzkkBzzzzzzzBkkzzzB', 'BzzzzzzcckcczzzzzzzzB', '.BzzzzzccccczzzzzzzB.',
      '..BBBzzzzzzzzzzBBB...', '....BzzzzcccczzB.....', '...BzzzzzcccczzzB....', '..BzzzzzzcccczzzzB...', '..BzzzzzzzzzzzzzzB..B',
      '...BzzzBzzzzBzzzB..BB', '...czzzB....BzzzcBBB.', '...ccccB....BccccBB..',
    ], props: [['crystal', 4, 34]] },
    { env: 'forest', rows: [
      '....tttt......tttt....', '...tcccct....tcccct...', '...tccctttttttccctt...', '..tttttttttttttttttt..', '.tttttttttttttttttttt.',
      '.ttttzkttttttkztttttt.', '.ttttkkttttttkktttttt.', '..tttttcckcccttttttt..', '...ttttcccccttttttt...', '....TTccccccccTTTT....',
      '...TTTTccccccTTTTTT...', '..TTttTTTTTTTTttTTTT..', '..TTttOOOOOOOOttTTTT..', '..TTTTOooooooOTTTTTT..', '...TTTOozooooOTTTTT...',
      '....TTOozooooOTTTT....', '....TTTOOOOOOTTTTT....', '.....TTT....TTT.......',
    ], props: [['star', 35, 34]] },
    { env: 'meadow', rows: [
      '...b............q...', '..bzb..........qzq..', '.bzzzb........qzzzq.', 'bzzzzzb......qzzzzzq', 'bzzXzzzb....qzzzXzzq',
      'bzzXzzzzbkkqzzzzXzzq', 'bzzzzzzzbkkqzzzzzzzq', '.bzzzzzzbkkqzzzzzzq.', '..bbbbbbbkkqqqqqqq..', '.....bbJJkkJJqq.....',
      '...qqzzzJkkJzzzbb...', '..qzzXzzJkkJzzXzzb..', '..qzzXzzJkkJzzXzzb..', '...qzzzzJkkJzzzzb...', '....qqqq.kk.bbbb....',
      '.........kk.........',
    ], props: [['flower', 4, 46], ['crystal', 37, 25]] },
    { env: 'sea', rows: [
      '...........j..........', '..........jzj.........', '......j..jjzj.........', '......jjjzzzzjj.......', '.....jzzzzzzzzjj......',
      '....jzzkzzzzzzzjj.....', '....jzzkzzzzzzzzjjjjj.', '....jzzzzzzzjjjjjjjjj.', '.....jzzccjj..........', '.....jzzccjj..........',
      '......jzccjj..........', '.......jccjj..........', '.....jjjccjj..........', '....jzzccjj...........', '...jzzccjj............',
      '..jzzccjj.............', '..jzccjj...jjjj.......', '..jzccjj..jzzjj.......', '...jzccjjjjzjj........', '....jjzzzzzjj.........', '......jjjjjj..........',
    ], props: [['crystal', 36, 38]] },
    { env: 'sea', rows: [
      'RR....RR........RR....RR', 'RRR..RRR........RRR..RRR', 'RRRRRRRR........RRRRRRRR', '.RRRRRR..........RRRRRR.', '..EEEE............EEEE..',
      '...EE....z....z....EE...', '....EE..zk...kz...EE....', '.....E..TT...TT..EE.....', '.....TTTTTTTTTTTTTT.....', '....TTzzTTTTTTTTzzTT....',
      '...TTTTTTTTTTTTTTTTTT...', '....TTTTTTkkkTTTTTTT....', '..TT.TTTTTTTTTTTTTTT.TT.', '.TT...EEEEEEEEEEEEE...TT', 'TT...TT...........TT..TT',
      '....TT.............TT...',
    ], props: [['flower', 5, 45], ['leaf', 35, 46]] },
    { env: 'night', rows: [
      '....W.........W....', '...W.W.......W.W...', '..W...W.....W...W..', '.W....W.....W....W.', '..W.W.W.....W.W.W..', '...WWW.......WWW...',
      '....W.........W....', '..qqqqqqqqqqqqqqq..', '.qzzqqqqooooqqqzzq.', '..qqqqqooqqqqqqqq..', '...qqqooqqqqqqqq...', '...qqqzkqqqkzqqq...',
      '...qqqkkqqqkkqqq...', '....qqccckcccqq....', '.....qcccccccq.....', '......QQQQQQQ......', '......QQQQQQQ......', '.....QQQQQQQQQ.....',
      '...QQQQcQQcQQQQQ...', '..QQQQQQQQQQQQQQQ..', '..QQQQQQQQQQQQQQQ..', '...QQQQQQQQQQQQQ...', '....QQ..QQ..QQ.....', '....WW..WW..WW.....',
    ], props: [['leaf', 12, 16], ['leaf', 30, 16]] },
    { env: 'blossom', rows: [
      'yy........................yy', 'yzyy....................yyzy', '.yzzzyy..............yyzzzy.', '..yzzzzyy..........yyzzzzy..', '...yzzzzzyy..yy..yyzzzzzy...',
      '....yzzzzzyyyyyyyzzzzzy....', '.....yzzzzyyzkzyyzzzzy.....', '......yyyzyykkzyyzyyy......', '.......yyyyOOyyyyyy........', '........yyccccyyY..........',
      '........yccCccyyY..........', '.......yyccCccyyYY.........', '......yyYccCccYyyYY........', '.....yyYYccCccYYyyYY.......', '....yyYYYyyyyyYYYyyYY......',
      '...yyYYY..OOO..YYYyyYY.....', '..yyYYY..yy.yy..YYYyyYY....', '.yyYYY..yy...yy..YYYyyYY...', 'yyYYY..yy.....yy..YYYyyYY..', '.YYY..yy.......yy..YYY.....',
    ], props: [['flower', 18, 11], ['flower', 5, 37]] },
    { env: 'storm', rows: [
      '...zzzz.......zzzz...', '..zzkkzz.....zzkkzz..', '..zzzzzzzzzzzzzzzzz..', '.zzzzzzzzkkzzzzzzzzz.', 'zzzzzzzzzkkzzzzzzzzzz',
      'zzkkzzzkkzzkkzzzkkzzz', 'zzzzzzzzzzzzzzzzzzzzz', 'zzzkzzzzzzzzzzzzkzzzz', 'zzzkzzzzcckcczzzkzzzz', '.zzzzzzzccccczzzzzzz.',
      '..zzzzzzzzzzzzzzzzz..', '...zzzzzzzzzzzzzzz...', '...zzkkzzccczzkkzz...', '..zzzzzzzccczzzzzzz..', '..zzkkzzzccczzzkkzz..',
      '..zzzzzzzzzzzzzzzzz..', '...zzzzzzzzzzzzzzz...', '...zzkkzz...zzkkzz...', '...zzzzzz...zzzzzz...', '...cccccc...cccccc...',
    ], props: [['bolt', 5, 19], ['bolt', 38, 16], ['cloud', 7, 47]] },
    { env: 'space', rows: [
      '...........RRR...............', '..........RRRRR..............', '.........RRRRRRR.............', '........WWWwwWWWW............', '........WzWccWzzW............',
      '........WWWccWWWW............', '....qqqqqqqqqqqqqqqq.........', '..qqzzqqqqqqqqqqqqqqqq.......', '.qzzzzqqqqqqqqqqqqqqqqq...qq.', 'qzzzzqqqqqqqqqqqqqqqqqqq.qqq.',
      'qzzkqqqqqqqqqqqqqqqqqqqqqqqqq', 'qzzkqqqqqqqqqqqqqqqqqqqqqqqqq', 'qqqqqccccccccccccqqqqqqqqqqq.', '.qqqqqcccccccccccqqqqqqq.qqq.',
      '..qqqqqcccccccccqqqqqqq...qq.', '...qqqqqqqqqqqqqqqqqqq.......', '.....qqqqqQQQQqqqqqq.........', '..........QQQ................',
    ], props: [['cloud', 4, 48], ['star', 37, 23]] },
    { env: 'space', rows: [
      'k.........................k', '.k.........qqqqq.........k.', '..kk......qqqqqqq......kk..', '....kk...qqozqzoqq...kk....', '......kk.qqkkqkkqq.kk......',
      '........kqqqqqqqqqk........', '........qqqqqqqqqqq........', '..kkkkkk.QQQQQQQQQ.kkkkkk..', '.k......kQQQQQQQQQk......k.', 'k........QQQQQQQQQ........k',
      '........QQQQQQQQQQQ........', '.......QQQQQQQQQQQQQ.......', '....kkQQQQqQQQqQQQQQQkk....', '...k..QQQQQqQqQQQQQQQ..k...', '..k...QQQQQQqQQQQQQQQ...k..',
      '.k.....QQQQQQQQQQQQQ.....k.', 'k........QQQQQQQQQ........k',
    ], props: [['star', 20, 8]] },
    { env: 'volcano', rows: [
      '........RRRRRR.............', '......RRRooRRRRR...........', '.....RRRooooRRRRR..........', '.....RRzkRRRRkzRR..........', '.....RRkkRRRRkkRR..........',
      '......RRRRkRRRRR...........', '.......RRRRRRRR............', '....RRRRooooRRRRRR.........', '..RRRRRooooooRRRRRRR.......', '.RRRRRRRooRRRRooRRRRR......',
      'RRRRRRRRRRRRRooRRRRRRR.....', '.RRR.RRRRRRRRooRRRR.RRRRR..', 'RRR...RRRRRRRRRRRRR...RRRRR', '.......RRR....RRR.......RRR', '......RRRR....RRRR.....RRRR',
    ], props: [['flame', 36, 38], ['flame', 4, 29]] },
    { env: 'snow', rows: [
      'z........................z', 'zz......................zz', 'zzzz..................zzzz', '.zzzzzz............zzzzzz.', '..zzzzzzzz......zzzzzzzz..', '...zzBzzzzzzzzzzzzzzBzz...',
      '....zzBzzzzzzzzzzzzBzz....', '.....zzBzzzzzzzzzzBzz.....', '......zzBzzzkzzzzBzz......', '.......zzBzzkzzzBzz.......', '........zzzzOOzzzz........', '.........zzcccczz.........',
      '........zzcccccczz........', '........zzccCccczz........', '........zzcccccczz........', '.........zzcccczz.........', '..........BBBBBB..........', '..........OO..OO..........',
    ], props: [['crystal', 5, 39], ['crystal', 36, 41]] },
    { env: 'sky', rows: [
      '........O........O...........', '.......OO........OO..........', '......OO..........OO.........', '......O..jjjjjjjj..O.........', '.....jjjjjjjjjjjjjjjj........',
      '....jjjjzkjjjjkzjjjjjj.......', '....jjjjkkjjjjkkjjjjjj.......', '..ccccjjjjjjjjjjjjcccc.......', '.cc...jjjcckcccjjj...cc......', '......jjjccccccjjj...........',
      '.......JJJccccJJJ............', '..........JcccJJ.............', '..........JcccJJ......jjjj...', '..........JcccJJ....jjccJJJ..', '.......JJJJcccJJ...jjccJJJJJ.',
      '.....JJJccccccJJ..jjccJJ.JJJ.', '....JJcccccccJJ..jjccJJ..JJJ.', '...JJcccJJJJJJ..jjccJJ...JJJ.', '...JJcccJJ.....jjccJJ....JJJ.',
      '...JJccccJJJJJJccJJJ....JJJ..', '....JJccccccccccJJJ....JJJ...', '......JJJJJJJJJJJ....JJJJ....', '..................JJJJ......',
    ], props: [['cloud', 3, 47], ['cloud', 33, 48]] },
    { env: 'sea', rows: [
      '.....y..y.........y..y.......', '.....yy.y.........y.yy.......', '......yyy.........yyy........', '.......y..yyyyyy..y..........', '.....yyyyyyyyyyyyyyyy........',
      '....yyyyzkyyykzyyyyyy.......', '....yyyykkyyyykkyyyyyy.......', '..ccccyyyyyyyyyyyycccc.......', '.cc...yyycckcccyyy...cc......',
      '......yyyccccccyyy...........', '.......YYYccccYYY............', '..........YcccYY.............', '..........YcccYY......yyyy...', '..........YcccYY....yyccYYY..',
      '.......YYYYcccYY...yyccYYYYY.', '.....YYYccccccYY..yyccYY.YYY.', '....YYcccccccYY..yyccYY..YYY.', '...YYcccYYYYYY..yyccYY...YYY.',
      '...YYcccYY.....yyccYY....YYY.', '...YYccccYYYYYYccYYY....YYY..', '....YYccccccccccYYY....YYY...', '......YYYYYYYYYYY....YYYY....',
    ], props: [['flower', 3, 39], ['crystal', 36, 44]] },
    { env: 'dawn', rows: [
      'o........................o', 'oo......................oo', 'ozoo..................oozo', '.ozzoo..............oozzo.', '..ozzzoo....ooo...oozzzo..', '...ozzzzoo.ooOOOoozzzzo...',
      '....ozzzzoooozkoozzzzo....', '.....ozzzzoookozzzzo.....', '......ozzzooooOOzzzo......', '.......ooooocccoooo.......', '........ooocccccooo.......',
      '........oocccCccooO.......', '.......ooccccCcccooO......', '......ooOccccCcccOooO.....', '.....ooOOccccCcccOOooO....', '....ooOO..ooooo...OOooO...',
      '...ooOO..oo.o.oo...OOooO..', '..ooOO..oo..o..oo...OOooO.', '.ooOO..oo...o...oo...OOooO', 'ooOO..oo....o....oo...OOoo', '.OO..oo.....o.....oo...OO.',
    ], props: [['flame', 4, 42], ['star', 36, 42]] },
    { env: 'forest', rows: [
      '............jjJJJj...........', '.........jjjjJJJJJJj.........', '.......jjJJJJJJJJJJJJj.......', '......jjJJJJJJJJJJJJJJj......', '.....jjJJJJJJJJJJJJJJJJj.....',
      '......JJJJJJJJJJJJJJJJg......', '.......gggggWWgggggggg.......', '............Ww...............', '............Ww...............', '............Ww...............',
      '.........DDDDDDDDDD..........', '......DDDjjDDjjDDjjDDD.......', '....DDDjjDDjjDDjjDDjjDDD.....', '...DDjjDDjjDDjjDDjjDDjjDD....', '..DDDDDDDDDDDDDDDDDDDDDDD...',
      '.UUUUUUUUUUUUUUUUUUUUUUUU...', '..jjUUUUUUUUUUUUUUUUUUUjjjjj', '.jjjUUUUUUUUUUUUUUUUUjjjjjjj', '..jJjUUUUUUUUUUUUUUUUjjkzjjk', '...JJJJJJJJJJJJJJJJJJjjjjjjj',
      '....JJJJ..........JJJJJ.....', '....gggg..........ggggg.....',
    ], props: [['star', 18, 18], ['leaf', 4, 42]] },
    { env: 'lantern', rows: [
      'cc....cc....cc....cc....cc', 'ccc...ccc...cc...ccc...ccc', '.ccc..cccc..cc..cccc..ccc.', '.cccc..ccc..cc..ccc..cccc.', '..cccc..ccc.cc.ccc..cccc..',
      '...cccc..cccccccc..cccc...', '....ccccccccccccccccc....', 'cc...cccctccccccctcccc..cc', 'ccc...cctctccccctctcc..ccc', '.cccc..tccctttttccct..cccc',
      '..ccccctttttttttttttcccc..', '...cccttzktttttkzttttcc...', '....ccttkktttttkkttttc....', '.....ctccctttttcccttc.....', '......tccccKccccttt.......',
      '......TTcccccccTTTT.......', '.....TTTcccccccTTTTT......', '.....TTTTcccccTTTTTT......', '......TTTTTTTTTTTTT.......', '.......TTT...TTT..........',
    ], props: [['lantern', 4, 22], ['lantern', 36, 24]] },
    { env: 'space', rows: [
      '..........o...............', '.........ooo..............', '.........ozo..............', '.........ozo.....ooo......', '.....oo..ozo....o...o.....', '..ooo..o.ooo...o..ooo.....',
      '....o...ozzzo..o..........', '...qqqqqzzzzzqqqq.........', '..qzzzzzzzzzzzzzqq........', '.qzzzzzkzzzzkzzzzqq.......', '.qzzzzzkkzzzkkzzzqq.......', '..qzzzzzzckcczzzzqq.......',
      '...qqzzzzcccczzqqq........', '....qqzzzzzzzzqq..........', '.....qzzzzzzzzq...........', '.....qzzzzzzzzq........qq.', '....qzzzzzzzzzzq......qzq.', '...qzzzzqzzzzqzzq....qzzq.',
      '..qzzzzzzzzzzzzzzq..qzzq..', '..qzzzzzzzzzzzzzzqqqzzq...', '...qzzzzzzzzzzzzqqzzq.....', '....qqzzqqzzqqzzqqqq......', '.....qqq..qq..qqq.........', '.....ooo..oo..ooo.........',
    ], props: [['star', 5, 31], ['crystal', 36, 38]] },
    { env: 'space', rows: [
      '........o........o................', '.......oo........oo...............', '......oo..........oo..............', '......o..qqqqqqqq..o..............', '.....qqqqqqqqqqqqqqqq.............',
      '....qqqqozqqqqzoqqqqqq............', '....qqqqkkqqqqkkqqqqqq............', '..XXXXqqqqqqqqqqqqXXXX............', '.XX...qqqcckcccqqq...XX...........', '......qqqccccccqqq................',
      '.......QQQccccQQQ.................', '..........QcccQQ..................', '..........QcccQQ..........qqqq....', '..........QcccQQ.......qqqXXQQQ...', '..........QcccQQ.....qqXXQQQQQQQ..',
      '.......QQQQcccQQ....qqXXQQQ..QQQQ..', '.....QQQccccccQQ...qqXXQQQ....QQQ..', '....QQcccccccQQ...qqXXQQ......QQQ..', '...QQcccQQQQQQ...qqXXQQ.......QQQ..',
      '..QQcccQQ.......qqXXQQ........QQQ.', '..QQcccQQ.....qqqXXQQ.........QQQ.', '..QQccccQQQQQQXXQQQ..........QQQ..', '...QQcccccccccccQQ..........QQQ...',
      '....QQQQQQQQQQQQQ.........QQQQ....', '.......................QQQQ.......',
    ], props: [['crystal', 35, 16], ['star', 5, 44]] },
    { env: 'dawn', rows: [
      'y..............................y', 'yy............................yy', 'yoyy........................yyoy', '.yooyy....................yyooy.', '..yoozyy......ooo.......yyzooy..', '...yoozzyy...ozozo....yyzzooy...',
      '....yoozzzyy.ozzzo..yyzzzooy....', '.....yoozzzzyoozoooyzzzzooy.....', '......yoozzzyozkzooyzzzooy......', '.......yoozzyokkooyzzooy.......', '........yoozyoooooyzooy........',
      '.........yooooOOooooy.........', '..........ooccccoooo..........', '.........oocccCccoooO.........', '........ooccccCcccoooO........', '.......ooOccccCcccOoooO.......',
      '......ooOOccccCcccOOoooO......', '.....ooOO...oooo...OOoooO.....', '....ooOO..yy.o.yy...OOoooO....', '...ooOO..yy..o..yy...OOoooO...', '..ooOO..yy...o...yy...OOoooO..',
      '.ooOO..yy....o....yy...OOoooO.', 'ooOO..yy.....o.....yy...OOoooO', '.OO..yy......o......yy...OOoo.',
    ], props: [['star', 21, 7], ['flame', 4, 43], ['flower', 35, 43]] }
  );

  // ---------- Lô 3, 4 · Bộ nội bộ ----------
  const CAFE = [null,
    // QN-001 · Ghế nhựa, vết băng dính ở tựa lưng.
    { env: 'room', rows: [
      '...RRRRRRRRRRRRRRRR...', '..RRzzRRRRRRRRRRRRRR..', '..RRRRRRRRRRRRccRRRR..', '..RRREEEEEEEEEccRRRR..', '..RRRRRRRRRRRRccRRRR..',
      '..RRREEEEEEEEEEERRRR..', '..RRRRRRRRRRRRRRRRRR..', '..RRRzkRRRRRRkzRRRRR..', '..RRRkkRRRRRRkkRRRRR..', '..RRRRRRRRRRRRRRRRRR..',
      '..RRREEEEkkEEEERRRRR..', '..RRRRRRRRRRRRRRRRRR..', '..RRREEEEEEEEEEERRRR..', '..RRRRRRRRRRRRRRRRRR..', '.RRRRRRRRRRRRRRRRRRRR.',
      'RRRRRRRRRRRRRRRRRRRRRR', 'EEEEEEEEEEEEEEEEEEEEEE', '.EEE..............EEE.', '.EEE..............EEE.', '.EEE..............EEE.',
      '.EEE..............EEE.', 'EEE................EEE', 'EEE................EEE',
    ] },
    // QN-002 · Hai nút và bánh cuộn, dây vắt phía sau.
    { env: 'room', rows: [
      '..............kk....', '...........kkk..k...', '..........k......k..', '.........k.......k..', '.........k......k...', '.........k.....k....',
      '.......LLLLL..k.....', '.....LllklLLL.k.....', '....LlllklLLLLk.....', '...LllllklLLLLL.....', '..LlllllklLLLLLL....', '..LlllllklLLLLLL....',
      '..LlllllkLLLLLLL....', '..LkkkkkkkkkkkLL....', '..LllllllllLLLLL....', '..LllzklllzkLLLL....', '..LllkklllkkLLLL....', '...LllllllllLLL.....',
      '....LlllkkLLLL......', '.....LLLLLLLL.......',
    ] },
    // QN-003 · Chữ phím mờ và thanh cách đã bóng tay.
    { env: 'room', rows: [
      '..............kk..............', '............kk................', '...........k..................', '.mmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
      'mllllllllllllllllllllllllllllm', 'mlcczlczzlczzlccclccclczzlczzlm', 'mlCCClCCClCCClCCClCCClCCClm',
      'mllllllllllllllllllllllllllllm', 'mlccclccclccclccclczzlczzlccclm', 'mlCCClCCClCCClCCClCCClCCClCCClm', 'mllllllllllllllllllllllllllllm',
      'mlccclccclccclccclccclccclccclm', 'mlCCClCCClCCClCCClCCClCCClCCClm', 'mllllllllllllllllllllllllllllm', 'mlcccclcccccccccccclccccccclllm',
      'mlCCCClCCCCCCCCCCCClCCCCCCClllm', 'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
    ], props: [['star', 4, 23]] },
    // QN-004 · Da đệm bong thành các mảng sáng.
    { env: 'room', rows: [
      '.........mmmmmmmm.........', '......mmmLLLLLLLLmmm......', '....mmLLLmmmmmmmmLLLmm....', '...mLLLmm........mmLLLm...', '..mLLLm............mLLLm..',
      '..mLLm..............mLLm..', '.mLLm................mLLm.', '.mLLm................mLLm.', '.mLLm................mLLm.', 'mmLLmm..............mmLLmm',
      'mLccLm..............mLccLm', 'mLcwLm..............mLwcLm', 'mLwwLm....zk..kz....mLwwLm', 'mLwcLm....kk..kk....mLcwLm', 'mLwwLm..............mLwwLm',
      'mLccLm......kk......mLccLm', 'mLwwLm..............mLwwLm', '.mmmm................mmmm.',
    ] },
    // QN-005 · Tấm lót sờn, chuột nằm lệch góc.
    { env: 'room', rows: [
      'b.BBBBBBBBBBBBBBBBBBBBBBBB..', '.BBBBBBBBBBBBBBBBBBBBBBBBBb', 'BBbbbbbbbbbbbbbbbbbbbbbbbBB', 'BBbbbbbbbbbbbbbbbbbbbbbbbBB', 'BBbbbbbbbbbbbbbbbbbbbbbbbBB',
      'BBbbbzkbbbbkzbbbbLLLLLbbbbBB', 'BBbbbkkbbbbkkbbbLllkLLbbbBB', 'BBbbbbbbbbbbbbbbLllkLLbbbBB', 'BBbbbbbbbbbbbbbbLllllLbbbBB', 'BBbbbbbbkkbbbbbbLllllLbbbBB',
      'BBbbbbbbbbbbbbbbLLLLLLbbbBB', 'BBbbbbbbbbbbbbbbbbbbbbbbbBB', 'BBbbbbbbbbbbbbbbbbbbbbbbbBB', '.BBBBBBBBBBBBBBBBBBBBBBBBBB', 'b.BBBBBBBBBBBBBBBBBBBBBBB.b',
    ] },
    // QN-006 · Lồng quạt vuông bo bậc và ba cánh.
    { env: 'kitchen', rows: [
      '.......JJJJJJJJ.......', '....JJJzzzzzzzzJJJ....', '..JJzzzzzzzzzzzzzzJJ..', '.JzzzzzzkkzzzzzzzzzzJ.', 'JzzzzzzkjjkzzzzzzzzzzJ',
      'JzzzzzzkjjjkzzzzzzzzzJ', 'JzzzzzzkjjjjkzzzzzzzzJ', 'JzzzzzzkjjjjjkzzzzzzzJ', 'JzzzkkkcckkcckkkzzzzzJ', 'JzzkjjjcckkccjjjkzzzzJ',
      'JzkjjjjccccccjjjkzzzzJ', 'JzkkkjjjjkkjjjjkzzzzzJ', '.JzzzkkkkzzkkkkzzzzzJ.', '..JJzzzzzzzzzzzzzzJJ..', '....JJJzzzzzzzzJJJ....', '.......JJJJJJJJ.......',
      '.........JJJJ.........', '.........JzzJ.........', '.........JzzJ.........', '.........JJJJ.........', '......JJJJJJJJJJ......', '....JJjjjjjjjjjjJJ....',
    ] },
    // QN-007 · Ly trà có đá, lát chanh và ống hút.
    { env: 'kitchen', rows: [
      '............z.....', '............z.....', '...........z......', '...........z......', '.cccccccccccccccc.', 'czoooooooooooooozc',
      'czozzoozzoozzooozc', 'czozcoozcoozcooozc', '.coooooooozozzzoc.', '.coooooooozozczoc.', '.cOOOOOOOOOOOOOOc.', '.cOOzkOOOOOzkOOOc.',
      '.cOOkkOOOOOkkOOOc.', '..cOOOOOOOOOOOOc..', '..cOOOOOkkOOOOOc..', '..cOOOOOOOOOOOOc..', '..cOOOOOOOOOOOOc..', '...cccccccccccc...',
    ], props: [['leaf', 35, 33]] },
    // QN-008 · Ổ điện có ba cặp lỗ và công tắc đỏ.
    { env: 'room', rows: [
      '.......................kk...', '.....................kk..k..', '....................k.....k.', '....................k.....k.', '.cccccccccccccccccccccccc.k.',
      'czzzzzzzzzzzzzzzzzzzzzzzzc.k', 'czRRRzzzzzzzzzzzzzzzzzzzzc.k', 'czRzRzzcccczzcccczzcccczzc.k', 'czRRRzzckkczzckkczzckkczzckk', 'czzzzzzcccczzcccczzcccczzc..',
      'czzzzzzckkczzckkczzckkczzc..', 'czzzzzzcccczzcccczzcccczzc..', 'czzzzzzzzzzzzzzzzzzzzzzzzc..', '.cccccccccccccccccccccccc...',
    ] },
    // QN-009 · Hai chiếc dép, quai và lỗ tổ ong.
    { env: 'room', rows: [
      '...ooooo.....ooooo...', '..ooooooo...ooooooo..', '.ooOoooOoo.ooOoooOoo.', '.oOoooOooo.oOoooOooo.', '.ooooooooo.ooooooooo.',
      '.ooOOOOOoo.ooOOOOOoo.', '.oOOOOOOOo.oOOOOOOOo.', '.oOOoooOOo.oOOoooOOo.', '.oOOozoOOo.oOOozoOOo.', '.oOOoooOOo.oOOoooOOo.',
      '.oOOOOOOOo.oOOOOOOOo.', '.ooOOOOOoo.ooOOOOOoo.', '.ooooooooo.ooooooooo.', '.ooOoooOoo.ooOoooOoo.', '.oOoooOooo.oOoooOooo.',
      '..ooooooo...ooooooo..', '..OOOOOOO...OOOOOOO..',
    ] },
    // QN-010 · Khăn caro gấp chéo và chai lau.
    { env: 'room', rows: [
      '..................BBB...', '..................BBB...', '..................ccc...', '..................ccc...', 'BBBBBBBBBBBB....BBBBBBB.', 'BbbBbbBbbBbbB...BzzzzBB.',
      'BbbBbbBbbBbbBB..BzzzzBB.', 'BBBBBBBBBBBBBBB.BzzzzBB.', 'BbbBbbBbbBbbBbbBBzzzzBB.', 'BbbBbbBbbBbbBbbBBzzzzBB.', 'BBBBBBBBBBBBBBBBBJJJJBB.',
      'BbbBbbBbbBbbBbbBBJzzJBB.', 'BbbBbbBbbBbbBbbBBJJJJBB.', 'BBBBBBBBBBBBBBBBBzzzzBB.', 'BbbBbbBbbBbbBbbBBzzzzBB.', 'BBBBBBBBBBBBBBBBBBBBBBB.',
    ], props: [['star', 5, 24]] },
    // QN-011 · Bó dây với hai đầu mạng và vòng thắt.
    { env: 'room', rows: [
      '.....BBBBBBBBBBBBBBBB......', '...BBbbbbbbbbbbbbbbbbBB....', '..BbbBBBBBBBBBBBBBBbbbbB...', '.BbBB..............BBbbbB..', '.BbB....JJJJJJJJ.....BbbB..',
      '.BbB..JJjjjjjjjjJJ...BbbB..', '..BbBJjjJJJJJJjjjjJ..BbbB..', '...BBJjJ......JJjjJ.BbbB...', '....JjjJ..qqqq..JjJBbbB....', '....JjjJ.qQQQQq.JjJBB......',
      '....JjjJ.qQccQq.JjJ........', '.....JjjJqQccQqJjJ.........', '......JJJqQQQQqJJ..........', '.......B..qqqq..J..........', '.......B........J..........',
      '.....ccccc....ccccc........', '.....coooc....coooc........', '.....coooc....coooc........', '.....ccccc....ccccc........',
    ] },
    // QN-012 · Các dòng giá phấn trắng và vàng.
    { env: 'room', rows: [
      'WWWWWWWWWWWWWWWWWWWWWWWW', 'WwwwwwwwwwwwwwwwwwwwwwwW', 'WwggggggggggggggggggggwW', 'WwgzzzzzzzzzzzzzzzzzzgwW', 'WwggggggggggggggggggggwW',
      'WwgzzzzzzzzgggooooggggwW', 'WwggggggggggggggggggggwW', 'WwgzzzzzzgggggooooggggwW', 'WwggggggggggggggggggggwW', 'WwgzzzzzzzzzgggoooggggwW',
      'WwggggggggggggggggggggwW', 'WwgzzzzzzgggggooooggggwW', 'WwggggggggggggggggggggwW', 'WwgggggggzkggkzgggggggwW', 'WwgggggggkkggkkgggggggwW',
      'WwgggggggggkkgggggggggwW', 'WwwwwwwwwwwwwwwwwwwwwwwW', 'WWWWWWWWWWWWWWWWWWWWWWWW', '...WW..............WW...', '...WW..............WW...',
    ] },
    // QN-013 · Hộp mở, tiền giấy và xu vàng.
    { env: 'room', rows: [
      '................wwwwwwww..', '..........wwwwwwcccccccw..', '....wwwwwwcccccccccccccw..', 'wwwwcccccccccccccccccccw..', 'wccccccccccccccccccccccw..',
      '.wcccccccccccccccccccccw..', '..wccccccccccccccccccccw..', '...wcccccccccccccccccccw..', 'wwwwwwwwwwwwwwwwwwwwwwww..', 'wvvvvvvvvvvvvvvvvvvvvvvw..',
      'wvjjjjjjjccccccccccvvvww..', 'wvjzzzjjjcooooczzzcjjjjw..', 'wvjjjjjjjcoooocccccjjjjw..', 'wvvvvvvvvvvvvvvvvvvvvvvw..',
      'wwooooowwwwooooowwooooow..', 'woozoooOwoozoooOwoozoooOw.', 'wooooooOwooooooOwooooooOw.', 'wwOOOOOwwwwOOOOOwwwOOOOOww', 'wwwwwwwwwwwwwwwwwwwwwwwww.',
    ] },
    // QN-014 · Chổi bó rơm và đường bụi nhỏ.
    { env: 'room', rows: [
      '............ww..', '............ww..', '...........ww...', '...........ww...', '...........ww...', '..........ww....', '..........ww....', '..........ww....',
      '.........ww.....', '.........ww.....', '.........ww.....', '........ww......', '........ww......', '........ww......', '.......ww.......', '.......ww.......',
      '.....RRRRRR.....', '.....RRRRRR.....', '....ooooooOo....', '....ooOoooOo....', '...oooOoooOoo...', '...oooOoooOoo...', '..ooooOoooOooo..',
      '..ooooOoooOooo..', '.oooooOoooOoooo.', '.oooooOoooOoooo.', 'ooooooOoooOooooo', 'OOO.OOO.OOO.OOOO',
    ] },
    // QN-015 · Tín hiệu Wi-Fi bậc thang và ô mật khẩu.
    { env: 'room', rows: [
      'WWWWWWWWWWWWWWWWWWWWWW', 'WzzzzzzzzzzzzzzzzzzzzW', 'WzzzzzzJJJJJJJJzzzzzzW', 'WzzzzJJzzzzzzzzJJzzzzW', 'WzzzJzzzzzzzzzzzzJzzzW',
      'WzzJzzzzJJJJJJzzzzJzzW', 'WzzzzzJJzzzzzzJJzzzzzW', 'WzzzzJzzzzzzzzzzJzzzzW', 'WzzzzzzzJJJJJJzzzzzzzW', 'WzzzzzzJzzzzzzJzzzzzzW',
      'WzzzzzzzzzJJzzzzzzzzzW', 'WzzzzzzzzzJJzzzzzzzzzW', 'WzzzzzzzzzzzzzzzzzzzzW', 'WzzcccccccccccccccczzW', 'WzzcKcKcKcKcKcKcKcczzW',
      'WzzcccccccccccccccczzW', 'WzzzzzzzzzzzzzzzzzzzzW', 'WWWWWWWWWWWWWWWWWWWWWW',
    ] },
    // QN-016 · Mì ly có đôi đũa và hơi nóng.
    { env: 'kitchen', rows: [
      '.................w.w...', '.................w.w...', '.....c.....c....w.w....', '....c.....c.....w.w....', '.....c.....c...w.w.....', '......c.....c..w.w.....',
      '.....c.....c..w.w......', '....c.....c...w.w......', 'RRRRRRRRRRRRRRRRRRRRRR.', 'RzzzzzzzzzzzzzzzzzzzR..', '.RoooooooooooooooooR...', '.RoooooooooooooooooR...',
      '..RzzzzzzzzzzzzzzzR....', '..RzzzzzzzzzzzzzzzR....', '..RzRRRRRRRRRRRRRzR....', '..RzRzzzzzzzzzzzRzR....', '...RzRRRRRRRRRRRzR.....',
      '...RzzzkzzzzkzzzzR.....', '...RzzzkkzzzkkzzzR.....', '....RzzzzzzzzzzzR......', '....RzzzzkkzzzzzR......', '.....RRRRRRRRRRR.......',
    ] },
    // QN-017 · Ổ cứng mở, đĩa và nhãn game.
    { env: 'room', rows: [
      'mmmmmmmmmmmmmmmmmmmmmm', 'mllllllllllllllllllllm', 'mlzzzzzzzzzzzzzzzzlllm', 'mlzcccccccccccccczlllm', 'mlzcccccccccccccczlllm', 'mlzzzzzzzzzzzzzzzzlllm',
      'mllllllllllllllllllllm', 'mlllllLLLLLLLLlllllllm', 'mlllLLzzzzzzzzLLlllllm', 'mllLzzzzzzzzzzzzLllllm', 'mlLzzzzzzzzzzzzzzLlllm', 'mlLzzzzzzkkzzzzzzLlllm',
      'mlLzzzzzzkkzzzzzzLlllm', 'mlLzzzzzzzkzzzzzzLlllm', 'mllLzzzzzzzkkzzzLllllm', 'mlllLLzzzzzzzkkllllllm', 'mlllllLLLLLLLLlklllllm',
      'mlRRRlBBBljJJlooollm', 'mlRRRlBBBljJJlooollm', 'mmmmmmmmmmmmmmmmmmmmmm',
    ] },
    // QN-018 · Router ba ăng-ten, đèn mạng sáng.
    { env: 'cafeNight', rows: [
      '..m...........m...........m..', '..m...........m...........m..', '..m...........m...........m..', '...m..........m..........m...', '...m..........m..........m...',
      '....m.........m.........m....', '....m.........m.........m....', '.....m........m........m.....', '.....m........m........m.....', '......m.......m.......m......',
      '.ccccccccccccccccccccccccccc.', 'czzzzzzzzzzzzzzzzzzzzzzzzzzzc', 'czzzzzzzzzzzzzzzzzzzzzzzzzzzc', 'czzzzzzzzzkkzzzkkzzzzzzzzzzzc',
      'czzzzzzzzzzzzzzzzzzzzzzzzzzzc', 'czzjjzzjjzzoozzjjzzbbzzzzzzzc', '.ccccccccccccccccccccccccccc.', '...mmmmmmmmmmmmmmmmmmmmmmm...',
    ], props: [['star', 37, 15]] },
    // QN-019 · Sáu chai màu trong két đỏ.
    { env: 'kitchen', rows: [
      '..ccc..ccc..ccc..ccc..ccc..', '..ccc..ccc..ccc..ccc..ccc..', '..RRR..jjj..ooo..bbb..yyy..', '.RRRRRjjjjjooooobbbbbyyyyy.', '.RRzRRjjzjjoozoobbzbbyyzyy.',
      '.RRzRRjjzjjoozoobbzbbyyzyy.', '.RRRRRjjjjjooooobbbbbyyyyy.', '.RcccRjcccjocccobcccbycccy.', '.RcccRjcccjocccobcccbycccy.', '.RRRRRjjjjjooooobbbbbyyyyy.',
      'RRRRRRRRRRRRRRRRRRRRRRRRRR', 'RzzzzzzzzzzzzzzzzzzzzzzzzR', 'RRRRRRRRRRRRRRRRRRRRRRRRRR', 'RREEEEEEEEEEEEEEEEEEEEEERR', 'RREEEEEEEEEEEEEEEEEEEEEERR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRR', 'RRRzkRRRRRRRRRRRRRRkzRRRRR', 'RRRkkRRRRRRRRRRRRRRkkRRRRR', 'RRRRRRRRRRkkRRRRRRRRRRRRRR', 'EEEEEEEEEEEEEEEEEEEEEEEEEE',
    ] },
    // QN-020 · Ghế gaming, gối dán băng và chân sao.
    { env: 'room', rows: [
      '.......mmmmmmmm.......', '.....mmBBBBBBBBmm.....', '....mBBBmmmmmmBBBm....', '....mBBmBBBBBBmBBm....', '...mBBmBBBBBBBBmBBm...', '...mBBmBBBBBBBBmBBm...',
      '...mBBmBBBBBBBBmBBm...', '...mBBmBBccccBBmBBm...', '...mBBmBBcKKcBBmBBm...', '...mBBmBBccccBBmBBm...', '...mBBmBBBBBBBBmBBm...', '...mBBmBBBBBBBBmBBm...',
      '...mBBmBBBBBBBBmBBm...', '...mBBmBBBBBBBBmBBm...', '.mmmBBmBBBBBBBBmBBmmm.', 'mm..mBBmmmmmmmmBBm..mm', 'mm..mBBBBBBBBBBBBm..mm', '....mmmmmmmmmmmmmm....',
      '.....mBBBBBBBBBBm.....', '.....mmmmmmmmmmmm.....', '.........mmmm.........', '.........mmmm.........', '.........mmmm.........', '........mmmmmm........',
      '......mmm....mmm......', '....mmm........mmm....', '...mm............mm...',
    ] },
  ];
  // ---------- Người trong quán: đầu chibi, tóc, đồng phục và đồ nghề ----------
  const HEAD = {
    short: ['....KKKKKKKK....', '..KKwwwwwwwwKK..', '.KwwwwwwwwwwwwK.', 'KwwwwKKwwwwwwwwK', 'KwwwKiiKKKKKKwwK', 'KwwKiiiiiiiiiKwK', 'KKKiiiiiiiiiiKKK', '.KiiikziizkiiiK.', '.KiiikkiikkiiiK.', '.KiiiyiiiiiyiiK.', '..KiiiiiiiiiiK..', '...KiiikkiiiK...', '....KiiiiiiK....', '.....KKKKKK.....'],
    pony: ['....KKKKKKKK....', '..KKwwwwwwwwKK..', '.KwwwwwwwwwwwwK.', 'KwwwwwwwwwwwwwwK', 'KwwwKKKKKKKKwwwK', 'KwwKiiiiiiiiKwwK', 'KKKiiiiiiiiiiKKK', '.KiiikziizkiiiK.', '.KiiikkiikkiiiK.', '.KiiiyiiiiiyiiK.', '..KiiiiiiiiiiK..', '...KiiikkiiiK...', '....KiiiiiiK....', '.....KKKKKK.....'],
    cap: ['.....BBBBBB.....', '...BBbbbbbbBB...', '..BBbbbbbbbbBB..', '.BBbbbbbbbbbbBB.', 'BBBBBBBBBBBBBBBB', '..KKiiiiiiiiKK..', '.KiiiiiiiiiiiiK.', '.KiiikziizkiiiK.', '.KiiikkiikkiiiK.', '.KiiiyiiiiiyiiK.', '..KiiiiiiiiiiK..', '...KiiikkiiiK...', '....KiiiiiiK....', '.....KKKKKK.....'],
    bun: ['.....KKKKKK.....', '....KwwwwwwK....', '...KKKKKKKKKK...', '..KwwwwwwwwwwK..', '.KwwwKKKKKKwwwK.', 'KwwwKiiiiiiKwwwK', 'KKKKiiiiiiiiKKKK', '.KiiikziizkiiiK.', '.KiiikkiikkiiiK.', '.KiiiyiiiiiyiiK.', '..KiiiiiiiiiiK..', '...KiiikkiiiK...', '....KiiiiiiK....', '.....KKKKKK.....'],
    helmet: ['.....RRRRRR.....', '...RRzzRRRRRR...', '..RRzzRRRRRRRR..', '.RRzzRRRRRRRRRR.', 'RRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRR', '.KKiiiiiiiiiiKK.', '.KiiiKziizKiiiK.', '.KiiikkiikkiiiK.', '.KiiiyiiiiiyiiK.', '..KiiiiiiiiiiK..', '...KiiiEiiiiK...', '....KiiiiiiK....', '.....KKKKKK.....'],
  };
  const BODY = [
    '.....iiiii.....', '...aaaaaaaaa...', '..aaazzzzabaaa.', '.aaaazzzzabaaaa', 'iaaaazzzzabaaaai', 'iiaaazzzzabaaaii', 'iiaaaaaaabaaaaii',
    'iiaaaaaaabaaaaii', '.iaaaaaaabaaaai.', '..aaaaaaaaaaa..', '...nnnnnnnnn...', '...nnnn.nnnn...', '...nnnn.nnnn...', '...nnnn.nnnn...', '...kkkk.kkkk...',
  ];
  const NOTEBOOK = ['WWWWWWWWW', 'WzzzzzzcW', 'WzKKKKzcW', 'WzzzzzzcW', 'WzKKKKzcW', 'WzzzzzzcW', 'WzKKKKzcW', 'WzzzzzzcW', 'WWWWWWWWW'];
  const CUP = ['.zzzz.', 'zOOOzz', 'zOOOzz', 'zOOO.z', 'zzzzzz', '.zzzz.'];
  const BOWL = ['.oooooooooo.', 'zzzzzzzzzzzz', '.zzyyccyyzz.', '..zzzzzzzz..', '...cccccc...'];
  const KEYBOARD = ['mmmmmmmmmmmmmmmmmmmmmmmm', 'mlclclclclclclclclclclcm', 'mlclclclclclclclclclclcm', 'mlclclcccccccclclclclclm', 'mmmmmmmmmmmmmmmmmmmmmmmm'];
  const MONITOR = ['kkkkkkkkkkkkkkkkkk', 'kXXXXXXXXXXXXXXbbk', 'kXbbbbbbbbbbbbbXbk', 'kXbbXXbbXXbbbbbXbk', 'kXbbbbbbbbbbbbbXbk', 'kXXXXXXXXXXXXXXbbk', 'kkkkkkkkkkkkkkkkkk', '.......mmmm.......', '.....mmmmmmmm.....'];
  function person(kind) {
    const looks = {
      gamer: ['short', 'm', 'L', 'cafeNight'], staff: ['pony', 'T', 'u', 'room'], credit: ['bun', 'q', 'Q', 'room'],
      cook: ['short', 'z', 'C', 'kitchen'], night: ['cap', 'B', 'n', 'cafeNight'], accountant: ['bun', 'w', 'W', 'room'],
      repair: ['cap', 'B', 'n', 'room'], mom: ['helmet', 'q', 'Q', 'room'], leader: ['pony', 'Y', 'y', 'room'],
      guard: ['cap', 'D', 'U', 'cafeNight'], veteran: ['short', 'T', 'u', 'cafeNight'], owner: ['short', 'J', 'g', 'room'],
    };
    const [hair, shirt, seam, env] = looks[kind];
    const g = Array.from({ length: 33 }, () => Array(32).fill('.'));
    if (['gamer', 'night', 'veteran'].includes(kind)) stamp(g, 1, 17, MONITOR, { X: kind === 'gamer' ? 'R' : 'X' });
    if (hair === 'pony') stamp(g, 24, 5, ['KKKK', 'KwwK', '.KwwK', '.KwwK', '..KwwK', '..KKKK']);
    stamp(g, 8, 1, HEAD[hair], kind === 'guard' ? { B: 'U', b: 'D', w: 'L' } : {});
    stamp(g, 8, 15, BODY, { a: shirt, b: seam });
    if (['staff', 'cook', 'owner'].includes(kind)) stamp(g, 12, 17, ['zzzzzzzz', 'zccccccz', 'zczzzzcz', 'zczzzzcz', 'zccccccz', 'zzzzzzzz', 'cccccccc']);
    if (['credit', 'accountant', 'veteran'].includes(kind)) stamp(g, 10, 8, ['kkkkk.kkkkk', 'k...kkk...k', 'kkkkk.kkkkk']);
    if (['gamer', 'night', 'leader', 'veteran'].includes(kind)) stamp(g, 6, 4, ['kkkkkkkkkkkkkkkkkkkk', 'k..................k', 'k..................k', 'k..................k', 'kk................kk', 'kRk..............kRk', 'kRk..............kRk', 'kk................kk']);
    if (['gamer', 'night', 'veteran'].includes(kind)) { stamp(g, 4, 27, KEYBOARD); stamp(g, 27, 20, CUP); }
    if (kind === 'staff') { stamp(g, 1, 22, CUP); stamp(g, 25, 16, ['..w...', '..w...', '..w...', '..w...', '..w...', '.JJJ..', 'JjjjJ.', '.JJJ..']); }
    if (kind === 'credit') { stamp(g, 1, 21, ['jjjjjjjj', 'jzzozzjj', 'jzooozjj', 'jzzozzjj', 'jjjjjjjj']); stamp(g, 26, 20, ['.ooo.', 'oozoo', '.OOO.', '.ooo.', 'oozoo', '.OOO.']); }
    if (kind === 'cook') { stamp(g, 10, 0, ['..zzzzzzzz..', '.zzzzzzzzzz.', 'zzzzzzzzzzzz', '.cccccccccc.']); stamp(g, 3, 24, BOWL); stamp(g, 27, 18, ['.L..L', '.LLLL', '..LL.', '..LL.', '..LL.', '..LL.']); }
    if (kind === 'night') { stamp(g, 12, 9, ['BBB...BBB']); stamp(g, 4, 0, MOON); }
    if (kind === 'accountant') { stamp(g, 1, 19, NOTEBOOK); stamp(g, 24, 22, ['mmmmmmm', 'mXXXXXm', 'mmmmmmm', 'mclclcm', 'mclclcm', 'mmmmmmm']); }
    if (kind === 'repair') { stamp(g, 1, 20, ['..L.L..', '.L...L.', '.L...L.', '..LLL..', '...L...', '...L...', '...L...', '...L...']); stamp(g, 24, 19, ['kkkkkkk', 'kJJJJJk', 'kJcccJk', 'kJcocJk', 'kJcccJk', 'kJJJJJk', 'kkkkkkk']); }
    if (kind === 'mom') { stamp(g, 12, 8, ['KK....KK']); stamp(g, 15, 12, ['EEE']); stamp(g, 26, 13, ['.w.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.', 'ooo', 'oOo', 'oOo', 'ooo']); stamp(g, 1, 6, ['R.R', '.R.', 'R.R']); }
    if (kind === 'leader') { stamp(g, 26, 21, ['.ooo.', 'ooooo', '.ooo.', '..o..', '.ooo.']); stamp(g, 1, 18, ['.BBBBB.', 'BiiiiiB', 'BikikB', '.iiiii.', '.JJJJJ.', 'JJJJJJJ', '.nn.nn.', '.kk.kk.']); }
    if (kind === 'guard') { stamp(g, 14, 3, ['.o.', 'ooo', '.o.']); stamp(g, 1, 19, ['kkkkkk', 'kllllk', 'kkkkkk', '..kk..']); stamp(g, 26, 18, ['cc....', 'cccc..', 'cccccc', 'cccccc', 'cccc..', 'cc....']); }
    if (kind === 'veteran') { stamp(g, 11, 11, ['KiiiiiK', '.KKKKK.']); stamp(g, 26, 7, ['oo...oo', 'ooooooo', '.ooooo.', '..OOO..', '...O...', '.OOOOO.']); }
    if (kind === 'owner') { stamp(g, 3, 24, BOWL); stamp(g, 26, 18, ['.zzzz.', 'zzzzzz', 'zczzcz', 'zczzcz', 'zczzcz', 'cccccc']); }
    return { env, rows: g.map(row => row.join('')) };
  }

  // ---------- Lô 4 · QN-021–040 ----------
  CAFE.push(
    { env: 'room', rows: [
      '....mmmmmmmmmmmmmmmm....', '...mllllllllllllllllm...', '..mllllllllllllllllllm..', '.mllllllllllllllllllllm.', 'mlllllzkllllllkzlllllllm', 'mlllllkkllllllkklllllllm',
      'mllllllllllllllllllJllm', 'mlllllllkkkkkkllllllllm', 'mmmmmmmmmmmmmmmmmmmmmmmm', '...kkkkkkkkkkkkkkkkkk...', '....zzzzzzzzzzzzzz......', '....zzKKKKKKKKKKzz......',
      '....zzzzzzzzzzzzzz......', '....zzKKKKKKKKzzzz......', '....zzzzzzzzzzzzzz......', '....zzKKKKKKKKKKzz......', '....zzzzzzzzzzzzzz......', '....zzKKKKKKKKzzzz......',
      '....zzzzzzzzzzzzzz......', '....zzKKKKKKKKKKzz......', '....zzzzzzzzzzzzzz......', '.....cccccccccccccc.....', '......cccccccccccccc....',
    ] },
    { env: 'kitchen', rows: [
      '....z......z......z....', '...z......z......z.....', '....z......z......z....', '.....z......z......z...', '....z......z......z....', '...z......z......z.....',
      '.......jjjjj..........', '......jjJJJjj.........', '.....oooooooooo.......', '...oooOOOoooOOOooo....', '.oooOOooooooooooOOooo.', 'oooooozzzzzooooooTTTTT',
      'ooooozzzzzzzooooTTTTTT', 'ooooozzooozzooooTTTTTT', 'ooooozzooozzoooooTTTTT', 'zzzzzzzzzzzzzzzzzzzzzz', '.zzzzzzzzzzzzzzzzzzzz.', '..zzJJJJJJJJJJJJJJzz..',
      '...zzzzzzzzzzzzzzzz...', '....zzzzzzzzzzzzzz....', '.....cccccccccccc.....',
    ] },
    { env: 'room', rows: [
      '.JJJJJJJJJJJJJJJJJJJJJJJJJJ.', 'JjzzjjjjjjjjjjjjjjjjjjjjjjJJ', 'JjzzjjjjjjjjjjjjjjjjjjjjjjJJ', 'JjjjOOOOOOjjjjjjjjjjojjjjjJJ', 'JjjjOooooOjjjjjjjjjooojjjjJJ',
      'JjjjOooooOjjjjjjjjooooojjjJJ', 'JjjjOOOOOOjjjjjjjjjooojjjjJJ', 'JjjjjjjjjjjjjjjjjjjjojjjjjJJ', 'JjjjjjjjjjjjjjjjjjjjjjjjjjJJ', 'JjjjzzzzzzzzzzzzzzzzzzjjjjJJ',
      'JjjjjjjjjjjjjjjjjjjjjjjjjjJJ', 'JjjjzzzzzzzzzzzzjjjjjjjjjjJJ', 'JjjjjjjjjjjjjjjjjjjjjjjjjjJJ', '.JJJJJJJJJJJJJJJJJJJJJJJJJJ.',
    ], props: [['star', 5, 23], ['star', 36, 20]] },
    { env: 'kitchen', rows: [
      '.cccccccccccccccccccc.', 'czzzzzzzzzzzzzzzzzzzzc', 'czzzzzzzzzzzzzzzzzzzzc', 'czzzzzkzzzzkzzzzzzczc', 'czzzzzzzzzzzzzzzzzczc', 'czzzzzzzkkzzzzzzzzczc',
      'czzzzzzzzzzzzzzzzzzzzc', 'cccccccccccccccccccccc', 'cbbbbbbbbbbbbbbbbbczc', 'cbzzzzzzzzzzzzzzzbczc', 'cbzRRRzJJJzooozzzbczc',
      'cbzRzRzJzJzozozzzbczc', 'cbzRRRzJJJzooozzzbczc', 'cbzRRRzJJJzooozzzbczc', 'cbcccccccccccccccbczc', 'cbzbbbzyyyzRRRzzzbczc', 'cbzbzbzyzyzRzRzzzbczc',
      'cbzbbbzyyyzRRRzzzbczc', 'cbzbbbzyyyzRRRzzzbczc', 'cbcccccccccccccccbczc', 'cbzzzzzzzzzzzzzzzbczc', 'cbbbbbbbbbbbbbbbbbczc', 'cccccccccccccccccccccc',
    ] },
    { env: 'cafeNight', rows: [
      '................LLLLLL..', '................LLLLLL..', '..................LL....', '..................LL....', '..................LL....', '..ccccccccccccccccLLLL..',
      '.czzzzzzzzzzzzzzzzzzzc..', 'czmmmmmmmzzzzzzzzzzzzzc.', 'czmBBBBBmzzzzzzzRzzzzzc.', 'czmBbbbBmzzzzzzzzzkkzzc.', 'czmBbzbbmzzzzzzzkkzzzzc.',
      'czmBbbbBmzzzzzzzzzzzzzc.', 'czmmmmmmmzzzzzzzzzzzzzc.', '.czzzzzzzzzzzzzzzzzzzc..', '..ccccccccccccccccccc...', '......cc................', '.....cccc...............',
      '....cccccc..............', '...cccccccc.............', '..cccccccccc............', '.cccccccccccc...........',
    ] },
    person('gamer'), person('staff'), person('credit'), person('cook'), person('night'),
    person('accountant'), person('repair'), person('mom'), person('leader'), person('guard'), person('veteran'),
    // QN-037 · Dàn ba màn và thùng máy có quạt RGB.
    { env: 'cafeNight', rows: [
      '.........kkkkkkkkkkkk.........', '.........kXXXXXXXXXXk.........', 'kkkkkkkkkkXBBBBBBBBXkkkkkkkkkk', 'kRRRRRRRRkXBBBBBBBBXkbbbbbbbbk', 'kRooooooRkXXXXXXXXXXkbBBBBBBbk',
      'kRooooooRkkkkkkkkkkkkkbBBBBBBbk', 'kRRRRRRRRk...mmmm...kbbbbbbbbk', 'kkkkkkkkkk..mmmmmm..kkkkkkkkkk', '....mm................mm.....', '..mmmmmm............mmmmmm...',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', 'WwwwwwwwwwwwwwwwwwwwwwwwwwwwwW', 'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', 'jjjjjjjjjjjjjjjjjjjjjjjjjjjjjj',
      'mmmmmmmmmmmmmmmmmmmm...mmmmmmm', 'mclclclclclclclclclm...mRRRRRm', 'mclclclclclclclclclm...mRzzRm', 'mclclcccccccclclclcm...mRRRRRm',
      'mmmmmmmmmmmmmmmmmmmm...mBBBBBm', '......................mBzzBm', '......................mBBBBBm', '......................mmmmmmm',
    ] },
    person('owner'),
    // QN-039 · Mèo tam thể vẫy chân, chuông và đồng tiền.
    { env: 'room', rows: [
      '....z............z......', '...zyz..........zyz.....', '...zyyz........zyyz.....', '..zzzzzzzzzzzzzzzzzz....', '.zzzTTzzzzzzzzzzkkzzz...',
      'zzzzTTTzzzzzzzzzkkzzzz..', 'zzzzzkzzzzzzzzzkzzzzzz..', 'zzzzzkkzzzzzzzkkzzzzzz..', 'zzzzzyzzzzKzzzzyzzzzzz..', '.zzzzzzzzzzzzzzzzzzzz...',
      '..zzzzzzzzzzzzzzzzzz....', '....RRRRRRRRRRRRRR...zz.', '....zzzzzzOOzzzzzz..zzzz', '...zzzzzzOOOOzzzzzz.zzzz', '..zzzzzzzzOOzzzzzzzzzzzz',
      '..zzzzzzzzzzzzzzzzzzzzz.', '..zzzzOOOzzzzzzzzzzzzz..', '...zzOOzOOzzzzzzzzzz....', '...zzOOOOOzzzzzzzzzz....', '....zzOOOzzzzzzzzzz.....',
      '....zzzzzz....zzzzz.....', 'RRRRRRRRRRRRRRRRRRRRRRRR', 'EEEEEEEEEEEEEEEEEEEEEEEE',
    ], props: [['star', 5, 20], ['star', 37, 27]] },
    // QN-040 · Mặt tiền quán, mái sọc và cửa sáng trong đêm.
    { env: 'cafeNight', rows: [
      '....WWWWWWWWWWWWWWWWWWWWWW....', '....WJJJJJJJJJJJJJJJJJJJJW....', '....WJooJooJooJooJooJooJJW....', '....WJooJooJooJooJooJooJJW....', '....WWWWWWWWWWWWWWWWWWWWWW....',
      '...JJJzzzJJJzzzJJJzzzJJJzzz...', '..JJJJzzzzJJJJzzzzJJJJzzzzJJ..', '.JJJJJzzzzzJJJJJzzzzzJJJJJzz.', 'JJJJJJzzzzzzJJJJJJzzzzzzJJJJJJ', '.cccccccccccccccccccccccccccc.',
      '.czzzzzzzzzzzzzzzzzzzzzzzzzzc.', '.czWWWWWWzzzWWWWWWzzzWWWWWWzc.', '.czWoozoWzzzWjjjjWzzzWoozoWzc.', '.czWooooWzzzWjoojWzzzWooooWzc.',
      '.czWooooWzzzWjoojWzzzWooooWzc.', '.czWooooWzzzWjjjjWzzzWooooWzc.', '.czWWWWWWzzzWjjjjWzzzWWWWWWzc.', '.czzzzzzzzzzWjjojWzzzzzzzzzzc.',
      '.czJJJJJJzzzWjjjjWzzzJJJJJJzc.', '.czJJJJJJzzzWjjjjWzzzJJJJJJzc.', '.czzzzzzzzzzWjjjjWzzzzzzzzzzc.', '.cccccccccccWWWWWWcccccccccccc.',
      '..WWWWWWWWWWWWWWWWWWWWWWWWWW..', '..WWWWWWWWWWWWWWWWWWWWWWWWWW..',
    ] }
  );
  const PROPS = { star: STAR, leaf: LEAF, flower: FLOWER, cloud: CLOUD, lantern: LANTERN, crystal: CRYSTAL, moon: MOON, bolt: BOLT, flame: FLAME, tree: TREE };
  const cache = new Map();
  // Phóng lưới bằng ô gần nhất: sinh vật nhỏ cũng đủ rõ ở ảnh album trên điện thoại.
  function portraitRows(rows) {
    const w = Math.max(...rows.map(row => row.length)), h = rows.length;
    const scale = Math.min(2, 38 / w, 38 / h);
    return Array.from({ length: Math.round(h * scale) }, (_, y) =>
      Array.from({ length: Math.round(w * scale) }, (_, x) => rows[Math.min(h - 1, Math.floor(y / scale))][Math.min(w - 1, Math.floor(x / scale))] || '.').join(''));
  }
  function svg(card) {
    card = CARD_CATALOG.find(c => c.id === card?.id);
    if (!card) return '';
    if (cache.has(card.id)) return cache.get(card.id);
    const def = (card.set === 'noi-bo' ? CAFE : MYSTIC)[card.art];
    const g = background(def.env, card.art);
    aura(g, card.rarity);
    const rows = portraitRows(def.rows), width = rows[0].length;
    stamp(g, Math.floor((W - width) / 2), 46 - rows.length, rows, def.map, true);
    (def.props || []).forEach(([name, x, y]) => stamp(g, x, y, PROPS[name]));
    let body = '';
    g.forEach((row, y) => {
      for (let x = 0; x < W;) {
        const ch = row[x];
        let n = 1;
        while (row[x + n] === ch) n++;
        body += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PAL[ch]}"/>`;
        x += n;
      }
    });
    const result = `<svg viewBox="0 0 240 300" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" role="img" aria-label="${esc(card.name)}" xmlns="http://www.w3.org/2000/svg"><g transform="scale(5)">${body}</g></svg>`;
    cache.set(card.id, result);
    return result;
  }
  window.CardArt = { svg };
})();
