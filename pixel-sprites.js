/* Quán Nét Bất Ổn — hình pixel vẽ tay: nhân vật, dàn máy, gạch quán, icon.
   Mỗi hình là lưới ký tự theo bảng màu PX.PAL. Cần pixel.js nạp trước. window.SPR */
(() => {
'use strict';
const { check, grid, toRows, put, stamp, blank, svg, recolor } = window.PX;

// ---------- Nhân vật chibi 20×27 (đứng, nhìn thẳng) ----------
// S da, s da bóng, r má, e mắt/lông mày, z ánh mắt, H/h/G tóc (G vệt sáng), A/a áo, P/p quần, F dép
// Mặt: lông mày hàng 7, mắt hàng 8–9 (cột 6–7 và 12–13), miệng hàng 10–11
const BODY = check('BODY', [
  '.......kkkkkk.......',
  '.....kkHHHHHHkk.....',
  '....kHHGGHHHHHHk....',
  '...kHHGGHHHHHHHHk...',
  '...kHHhHHHHHHhHHk...',
  '..kHHHSSSSSSSSHHHk..',
  '..kHHSSSSSSSSSSHHk..',
  '..kHSSSSSSSSSSSSHk..',
  '..kHSSzeSSSSzeSSHk..',
  '..kSSSeeSSSSeeSSSk..',
  '..kSrSSSSKKSSSSrSk..',
  '...kSSSSSSSSSSSsk...',
  '.....kkSSSSSSkk.....',
  '........kSSk........',
  '.....kAAAAAAAAk.....',
  '....kAAAAAAAAAak....',
  '...kAAAAAAAAAAAak...',
  '...kAAkAAAAAakAak...',
  '...kAAkAAAAAakAak...',
  '...kSSkAAAAAakSsk...',
  '...kkkkaaaaaakkkk...',
  '......kPPPPPpk......',
  '......kPPPPPpk......',
  '......kPPkkPpk......',
  '......kPPkkPpk......',
  '.....kFFFkkFFFk.....',
  '.....kkkk..kkkk.....',
]);
// Biểu cảm: thay hàng 6–11 (giữ viền mặt, chỉ đổi mắt, mày, miệng)
const MOODS = {
  idle: {},
  blink: { 8: '..kHSSSSSSSSSSSSHk..' },
  // mắt cong ^ ^, miệng há cười, má hồng đậm
  happy: { 8: '..kHSSeSSSSSSeSSHk..', 9: '..kSSeSeSSSSeSeSSk..', 10: '..krrSSSkkkkSSSrrk..', 11: '...kSSSSkRRkSSSsk...' },
  // mày xếch vào giữa, mắt híp, miệng méo xuống
  angry: { 7: '..kHSeeSSSSSSeeSHk..', 8: '..kHSSSeSSSSeSSSHk..', 9: '..kSSSeeSSSSeeSSSk..', 10: '..kSRSSSSkkSSSSRSk..', 11: '...kSSSSkSSkSSSsk...' },
  // mày nhíu lên, giọt nước mắt, miệng nhỏ trễ xuống (đói, buồn, chờ lâu)
  sad: { 6: '..kHHSSeSSSSeSSHHk..', 7: '..kHSSeSSSSSSeSSHk..', 10: '..kSrSbSSSSSSSSrSk..', 11: '...kSSSSSkkSSSSsk...' },
  // mắt tròn to, miệng chữ O (bị bắt, mẹ tới, cúp điện)
  shock: { 7: '..kHSeeSSSSSSeeSHk..', 8: '..kHSkzkSSSSkzkSHk..', 9: '..kSSkekSSSSkekSSk..', 10: '..kSrSSSSkkSSSSrSk..', 11: '...kSSSSkRRkSSSsk...' },
};
// Kiểu tóc / mũ: thay hàng hoặc chấm từng ô
const HAIR = {
  short: g => g,
  long: g => {
    stamp(g, 5, 0, ['..kHHHHSSSSSSHHHHk..']);
    for (let r = 6; r <= 10; r++) { put(g, r, 1, 'kH'); put(g, r, 17, 'Hk'); }
    stamp(g, 11, 0, ['.kHkSSSSSSSSSSSskHk.', '.kHH.kkSSSSSSkk.HHk.', '.kHH....kSSk....HHk.', '.kHHkAAAAAAAAAakHHk.', '.kHHkAAAAAAAAAakHHk.', '..kkAAAAAAAAAAAakk..']);
    return g;
  },
  ponytail: g => { for (let r = 4; r <= 10; r++) put(g, r, 17, r === 4 ? 'Rk' : 'Hk'); put(g, 4, 16, 'R'); put(g, 11, 17, 'kk'); return g; },
  twin: g => { for (let r = 6; r <= 12; r++) { put(g, r, 0, r === 6 ? '.kR' : 'kHk'); put(g, r, 17, r === 6 ? 'Rk.' : 'kHk'); } put(g, 13, 1, 'k'); put(g, 13, 18, 'k'); return g; },
  bun: g => stamp(g, 0, 0, ['........kkkk........', '.......kHGHHk.......', '....kkkHHHHHHkkk....']),
  spiky: g => stamp(g, 0, 0, ['.....k.k.kk.k.k.....', '....kHkHkHHkHkHk....']),
  bald: g => stamp(g, 1, 0, ['.....kkSSSSSSkk.....', '....kSSSzSSSSSSk....', '...kHSSSSSSSSSSHk...', '...kHHSSSSSSSSHHk...', '..kHHSSSSSSSSSSHHk..']),
  cap: g => stamp(g, 1, 0, ['.....kkMMMMMMkk.....', '....kMMMMzzMMMMk....', '...kMMMMMMMMMMMMk...', '..kMMMMMMMMMMMMMMk..', '..kVVVVVVVVVVVVVVk..']),
  // mũ kê-pi công an: chóp ô-liu, huy hiệu sao vàng nền đỏ, đai đỏ, lưỡi trai đen
  police: g => stamp(g, 0, 0, ['....kkkkkkkkkkkk....', '...kDDDDDDDDDDDDk...', '..kDDDDDDRRDDDDDDk..', '..kDDDDDRooRDDDDDk..', '..kRRRRRRRRRRRRRRk..', '..kkkkkkkkkkkkkkkk..']),
  hood: g => {
    stamp(g, 0, 0, ['......kkkkkkkk......', '....kkmmmmmmmmkk....', '...kmmmmmmmmmmmmk...', '..kmmmkkkkkkkkmmmk..', '..kmmkSSSSSSSSkmmk..']);
    for (let r = 5; r <= 11; r++) { put(g, r, 2, 'kmm'); put(g, r, 15, 'mmk'); }
    put(g, 12, 3, 'kkmm'); put(g, 12, 13, 'mmkk');
    return g;
  },
};
// Phụ kiện
const EXTRA = {
  headset: g => { put(g, 1, 7, 'mmmmmm'); for (let r = 7; r <= 10; r++) { put(g, r, 1, 'km'); put(g, r, 17, 'mk'); } put(g, 6, 1, 'kk'); put(g, 11, 1, 'kk'); put(g, 6, 17, 'kk'); put(g, 11, 17, 'kk'); return g; },
  glasses: g => { for (const c of [5, 11]) { put(g, 7, c, 'LLLL'); put(g, 10, c, 'LLLL'); put(g, 8, c, 'L'); put(g, 8, c + 3, 'L'); put(g, 9, c, 'L'); put(g, 9, c + 3, 'L'); } put(g, 8, 9, 'LL'); return g; },   // gọng xám, tách khỏi mắt
  apron: g => { stamp(g, 15, 7, ['JJJJJ', 'JJJJJJ']); for (let r = 17; r <= 20; r++) put(g, r, 7, 'JJJJJg'); put(g, 14, 7, 'k'); put(g, 14, 12, 'k'); return g; },
  tie: g => { put(g, 14, 9, 'zz'); for (let r = 15; r <= 19; r++) put(g, r, 9, r === 19 ? 'E' : 'RE'); return g; },
  beard: g => { put(g, 10, 5, 'hh'); put(g, 10, 13, 'hh'); put(g, 11, 5, 'hhhhhhhhhh'); put(g, 12, 7, 'hhhhhh'); return g; },
  mask: g => { put(g, 10, 4, 'llllllllllll'); put(g, 11, 4, 'lllllllllll'); put(g, 12, 7, 'llllll'); return g; },
  bag: g => { for (let r = 14; r <= 20; r++) put(g, r, 5 + (r - 14), 'W'); return g; },
  skirt: g => stamp(g, 21, 0, ['.....kPPPPPPPPk.....', '....kPPPPPPPPPpk....', '......kSSkkSSk......', '......kSSkkSsk......']),
  sweat: g => { put(g, 5, 16, 'b'); put(g, 6, 16, 'b'); return g; },
  // quân phục công an: ve cổ đỏ, cầu vai, túi ngực có nắp, cúc vàng, thắt lưng đen khóa vàng
  police: g => {
    put(g, 14, 6, 'URR'); put(g, 14, 11, 'RRU');
    put(g, 15, 5, 'UU'); put(g, 15, 13, 'UU');
    put(g, 16, 6, 'UU'); put(g, 16, 12, 'UU'); put(g, 17, 9, 'o'); put(g, 19, 9, 'o');
    stamp(g, 20, 0, ['...kkkkkkookkkkkk...']);
    return g;
  },
};
// look: màu là ký tự trong PX.PAL — { skin, skinShade, hair, hairShade, hairLight, shirt, shirtShade, pants, pantsShade, shoes, cap, capShade (mũ M/V), hairStyle, mood, extras: [] }
function person(look = {}) {
  let g = grid(BODY);
  const mood = MOODS[look.mood || 'idle'];
  for (const r in mood) g[r] = mood[r].split('');
  g = (HAIR[look.hairStyle || 'short'])(g);
  for (const x of look.extras || []) g = EXTRA[x](g);
  return recolor(toRows(g), personMap(look));
}
function personMap(look = {}) {
  return Object.fromEntries(Object.entries({
    S: look.skin, s: look.skinShade, H: look.hair, h: look.hairShade, G: look.hairLight || 'K', A: look.shirt, a: look.shirtShade,
    P: look.pants, p: look.pantsShade, F: look.shoes, M: look.cap, V: look.capShade,
  }).filter(([, v]) => v));
}

// ---------- Bong bóng cảm xúc trên đầu (11×9) ----------
const BUBBLE = ['.kkkkkkkkk.', 'kzzzzzzzzzk', 'kzzzzzzzzzk', 'kzzzzzzzzzk', 'kzzzzzzzzzk', 'kzzzzzzzzzk', 'kzzzzzzzzzk', '.kkzkkkkkk.', '..kk.......'];
const EMOTE = {
  love: ['.RR.RR.', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
  angry: ['.RR.RR.', 'RR...RR', '.......', 'RR...RR', '.RR.RR.'],
  hungry: ['..l.l..', '.l.l...', 'kkkkkkk', '.kTTTk.', '..kkk..'],
  wait: ['.......', '.......', 'k..k..k', '.......', '.......'],
  shock: ['...k...', '...k...', '...k...', '.......', '...k...'],
  sweat: ['...b...', '..bbb..', '.bbbbb.', '.bbzbb.', '..bbb..'],
};
const emote = kind => { const g = grid(BUBBLE); stamp(g, 1, 2, EMOTE[kind]); return toRows(g); };

// ---------- Khách ngồi chơi, nhìn từ sau lưng (18×23) ----------
// đầu, vai, lưng ghế che nửa dưới; ghế xoay có chân
const BACK = check('BACK', [
  '......kkkkkk......',
  '....kkHHHHHHkk....',
  '...kHHGGHHHHHHk...',
  '..kHHGGHHHHHhHHk..',
  '..kHHHHHHHHhHHHk..',
  '..kHHHHHHHhHHHHk..',
  '.kSHHHHHHhHHHHHSk.',
  '.kSHHHHHhHHHHHHSk.',
  '..kHHHHhHHHHhHHk..',
  '...kkHHHHHHHHkk...',
  '.....kksSSskk.....',
  '...kkAAAAAAAAkk...',
  '..kAAAAAAAAAAAak..',
  '.kAAAAAAAAAAAAAak.',
  '.kAkkkkkkkkkkkkak.',
  '.kAkWwwwwwwwwwkak.',
  '.kAkWWWWWWWWWWkak.',
  '.kakWvvvvvvvvWkak.',
  '..kkWWWWWWWWWWkk..',
  '...kkkkkkkkkkkk...',
  '.......kvvk.......',
  '.....kkkvvkkk.....',
  '....kk..kk..kk....',
]);
const back = (look = {}) => {
  const g = grid(BACK);
  if (look.extras?.includes('headset')) { put(g, 1, 6, 'mmmmmm'); for (let r = 5; r <= 7; r++) { put(g, r, 0, 'km'); put(g, r, 16, 'mk'); } }
  if (look.hairStyle === 'long') for (let r = 9; r <= 12; r++) put(g, r, 5, 'HHHHHHHH');
  return recolor(toRows(g), personMap(look));
};

// ---------- Dàn máy 32×28: màn hình (15 hàng) + bàn, thùng máy (13 hàng) ----------
const MONITOR = {
  crt: check('CRT', [
    '................................',
    '........kkkkkkkkkkkkkkkk........',
    '........kllllllllllllllk........',
    '........klkkkkkkkkkkkklk........',
    '........klkxxxxxxxxxxklk........',
    '........klkxXXxxxxxxxklk........',
    '........klkxxxxxxxxxxklk........',
    '........klkxxxxxxxXxxklk........',
    '........klkxxxxxxxxxxklk........',
    '........klkkkkkkkkkkkklk........',
    '........kllllllllllllJlk........',
    '........kLLLLLLLLLLLLLLk........',
    '........kkkkkkkkkkkkkkkk........',
    '..............kLLk..............',
    '............kkLLLLkk............',
  ]),
  wide: check('WIDE', [
    '................................',
    '................................',
    '......kkkkkkkkkkkkkkkkkkkk......',
    '......kxxxxxxxxxxxxxxxxxxk......',
    '......kxXXXxxxxxxxxxxxxxxk......',
    '......kxxxxxxxxqqqqxxxxxxk......',
    '......kxxxxxxxqQQQQqxxxxxk......',
    '......kxxxjjxxxxxxxxxxxxxk......',
    '......kxxjjjjxxxxxxxxXxxxk......',
    '......kxxxxxxxxxxxxxxxxxxk......',
    '......kJJJJJJJJJJJJJJJJJJk......',
    '......kkkkkkkkkkkkkkkkkkkk......',
    '..............kmmk..............',
    '..............kmmk..............',
    '............kkmmmmkk............',
  ]),
};
const DESK = {
  basic: check('DESK', [
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '..kwwwwwwkllllllllllkwwwwwwwwk..',
    '..kWWWWWWWWWWWWWWWWWWWWWWWWWWk..',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '...kvk.............kkkkkk.kvk...',
    '...kvk.............kllllk.kvk...',
    '...kvk.............klJllk.kvk...',
    '...kvk.............kllllk.kvk...',
    '...kvk.............kLLLLk.kvk...',
    '...kvk.............kllllk.kvk...',
    '...kvk.............kllllk.kvk...',
    '...kvk.............kkkkkk.kvk...',
    '..kkkkk..................kkkkk..',
  ]),
  vip: check('DESKVIP', [
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '..kmmmmmmkjJjJjJjJjJkmmmmmmmmk..',
    '..kmmmmmmmmmmmmmmmmmmmmmmmmmmk..',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '...kmk.............kkkkkk.kmk...',
    '...kmk.............kqQqQk.kmk...',
    '...kmk.............kQjQqk.kmk...',
    '...kmk.............kqQjQk.kmk...',
    '...kmk.............kQqQqk.kmk...',
    '...kmk.............kxxxxk.kmk...',
    '...kmk.............kxJJxk.kmk...',
    '...kmk.............kkkkkk.kmk...',
    '..kkkkk..................kkkkk..',
  ]),
};
const CHAIR = { basic: {}, vip: { W: 'E', w: 'R', v: 'k' } };
// khách ngồi trước bàn: vai ngang mặt bàn, đầu che nửa dưới màn hình
function station(tier = 'basic', cust = null) {
  const vip = tier === 'vip';
  const g = grid([...MONITOR[vip ? 'wide' : 'crt'], ...DESK[vip ? 'vip' : 'basic']]);
  if (cust) {
    const b = grid(recolor(back(cust), CHAIR[vip ? 'vip' : 'basic']));
    b.forEach((row, y) => row.forEach((v, x) => { if (v !== '.' && g[5 + y]) g[5 + y][7 + x] = v; }));
  }
  return toRows(g);
}

// ---------- Gạch quán ----------
const TILE = {
  // gạch men ngọc ốp chân tường 8×8
  wains: check('WAINS', ['gggggggg', 'gjjjjJJg', 'gjJJJJJg', 'gJJJJJJg', 'gJJJJJJg', 'gJJJJJJg', 'gJJJJJgg', 'gggggggg']),
};
// Bốn kiểu sàn để chọn: trả về ký tự ô (x, y) tính từ mép sàn
const FLOORS = {
  plain: { name: 'A · Gạch trơn kem', at: (x, y) => (x % 16 === 0 || y % 16 === 0) ? 'd' : (x % 16 > 12 && y % 16 > 12) ? 'C' : 'c' },
  checker: { name: 'B · Caro kem – đất nung', at: (x, y) => {
    const dark = ((x >> 4) + (y >> 4)) & 1, gx = x % 16, gy = y % 16;
    if (!gx || !gy) return dark ? 'u' : 'd';
    return dark ? (gx > 12 && gy > 12 ? 'T' : 't') : (gx > 12 && gy > 12 ? 'C' : 'c');
  } },
  wood: { name: 'C · Sàn gỗ', at: (x, y) => {
    const row = y >> 2, off = (row % 3) * 11, gy = y % 4;
    if (!gy) return 'W';
    if ((x + off) % 32 === 0) return 'W';
    if (gy === 2 && (x * 5 + row * 7) % 23 < 3) return 'v';
    return 'w';
  } },
  tile: { name: 'D · Gạch bông lớn nhạt', at: (x, y) => {
    const gx = x % 16, gy = y % 16;
    if (!gx || !gy) return 'd';
    const dd = Math.abs(gx - 8) + Math.abs(gy - 8);
    if (dd === 0) return 'T';
    if (dd === 2) return 't';
    if (dd === 5) return 'C';
    if (Math.min(gx, 16 - gx) + Math.min(gy, 16 - gy) <= 3) return 'C';
    return 'c';
  } },
};
// Góc quán w×h: tường vữa kem có vệt, nẹp gỗ, ốp gạch ngọc, sàn theo kiểu chọn
function room(w = 96, h = 60, floor = 'tile') {   // chủ dự án chọn sàn D
  const g = blank(w, h, 'c');
  const wallH = Math.round(h * 0.42), wainH = 10;
  for (let y = 0; y < wallH; y++) for (let x = 0; x < w; x++) {
    // vệt vữa cố định (không ngẫu nhiên) cho tường đỡ phẳng
    if ((x * 7 + y * 13) % 29 === 0) g[y][x] = 'C';
    if ((x * 11 + y * 5) % 53 === 0) g[y][x] = 'd';
  }
  for (let x = 0; x < w; x++) { g[wallH][x] = 'w'; g[wallH + 1][x] = 'W'; }   // nẹp gỗ trên gạch ốp
  for (let y = 2; y < wainH; y++) for (let x = 0; x < w; x++) g[wallH + y][x] = TILE.wains[(y - 2) % 8][x % 8];
  const base = wallH + wainH;
  for (let x = 0; x < w; x++) { g[base][x] = 'W'; g[base + 1][x] = 'v'; }
  for (let y = base + 2; y < h; y++) for (let x = 0; x < w; x++) g[y][x] = FLOORS[floor].at(x, y - base - 2);
  return { rows: toRows(g), floorY: base + 2 };
}
// Mẫu sàn rời để so sánh
const floorSwatch = (floor, w = 48, h = 32) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => FLOORS[floor].at(x, y)).join(''));

// Mặt cảm xúc 12×12 dùng chung một khung, chỉ đổi mắt/mày/miệng
const FACE = ['...kkkkkk...', '..kooooook..', '.kooooooook.', 'kooooooooook', 'kookooookook', 'kookooookook', 'koooooooooOk', 'koooooooooOk', '.koooooooOk.', '..kooooOOk..', '...kkkkkk...', '............'];
const face = (rows, map = {}) => check('face', recolor(FACE.map((r, i) => rows[i] || r), map));
const SAD = { 6: 'koookkkkooOk', 7: 'kookooookoOk' };
const FACES = {
  smile: face({ 6: 'kokooooookOk', 7: 'kookkkkkkoOk' }),
  sad: face(SAD),
  angry: face({ 3: 'kokkooookkok', 4: 'koookookoook', 5: 'koooooooooOk', ...SAD }),
  sick: face(SAD, { o: 'j', O: 'J' }),
  neutral: face({ 7: 'koookkkkooOk' }),
};

// ---------- Icon 12×12 ----------
const ICON = {
  money: check('money', ['............', '............', 'kkkkkkkkkkkk', 'kjjjjjjjjjjk', 'kjJjjggjjJjk', 'kjjjgjjgjjjk', 'kjjjgjjgjjjk', 'kjJjjggjjJjk', 'kjjjjjjjjjjk', 'kkkkkkkkkkkk', '............', '............']),
  star: check('star', ['.....kk.....', '....kook....', '....kook....', 'kkkkooookkkk', 'koooooooooOk', '.kooooooOOk.', '..koooooOk..', '..kooooOOk..', '.koookkoOOk.', '.kook..kOOk.', 'kkkk....kkkk', '............']),
  clock: check('clock', ['...kkkkkk...', '..kzzzzzzk..', '.kzzzzkzzzk.', 'kzzzzzkzzzzk', 'kzzzzzkzzzzk', 'kzzzzzkkkkzk', 'kzzzzzzzzzCk', 'kzzzzzzzzzCk', '.kzzzzzzzCk.', '..kCCCCCCk..', '...kkkkkk...', '............']),
  pc: check('pc', ['kkkkkkkkkkkk', 'kllllllllllk', 'klxxxxxxxxlk', 'klxXXxxxxxlk', 'klxxxxxxxxlk', 'klxxxxxXxxlk', 'klxxxxxxxxlk', 'kllllllllJlk', 'kkkkkkkkkkkk', '....kLLk....', '..kkLLLLkk..', '..kkkkkkkk..']),
  noodle: check('noodle', ['...z...z....', '..z...z...z.', '...z...z..z.', '..z...z.....', 'kkkkkkkkkkkk', 'koOooOooOook', 'kzzRzzRzzRzk', '.kzzzzzzzlk.', '..kzzzzzlk..', '...kkkkkk...', '...kllllk...', '...kkkkkk...']),
  drink: check('drink', ['...kkkkkk...', '..kllllllk..', '..kRRRRRRk..', '..kRzRRREk..', '..kRzRRREk..', '..kooooOOk..', '..kRRRRREk..', '..kRRRRREk..', '..kRRRREEk..', '..kllllllk..', '...kkkkkk...', '............']),
  card: check('card', ['..kkkkkkkk..', '..koooooOk..', '..kobbbbOk..', '..kobJJbOk..', '..kobJJbOk..', '..kobbbbOk..', '..koooooOk..', '..kozzzoOk..', '..koooooOk..', '..kOOOOOOk..', '..kkkkkkkk..', '............']),
  warn: check('warn', ['.....kk.....', '....kook....', '....kook....', '...kokkok...', '...kokkok...', '..kookkook..', '..kookkook..', '.koooooooOk.', '.koookkooOk.', 'kooooooooOOk', 'kkkkkkkkkkkk', '............']),
  tool: check('tool', ['..........kk', '.........kRk', '........kRk.', '.......kEk..', '......klk...', '.....klk....', '....klk.....', '...klk......', '..klk.......', '.klk........', 'kkk.........', '............']),
  night: check('night', ['....kkk.....', '...kook.....', '..kook......', '.kook.......', '.kook.....o.', '.kook....ooo', '.kooOk....o.', '.kooOOk..kk.', '..kooOOkkOk.', '...kooOOOk..', '....kkkkk...', '............']),
  door: check('door', ['..kkkkkkkk..', '..kWWWWWWk..', '..kWwwwwWk..', '..kWwWWwWk..', '..kWwwwwWk..', '..kWWWWoWk..', '..kWwwwwWk..', '..kWwWWwWk..', '..kWwwwwWk..', '..kWWWWWWk..', '.kkkkkkkkkk.', '............']),
  dice: check('dice', ['............', '.kkkkkkkkkk.', '.kzzzzzzzlk.', '.kzkzzzzzlk.', '.kzzzzzzzlk.', '.kzzzkkzzlk.', '.kzzzkkzzlk.', '.kzzzzzzzlk.', '.kzzzzzzklk.', '.kllllllllk.', '.kkkkkkkkkk.', '............']),
  megaphone: check('megaphone', ['............', '.........kk.', '.......kkok.', '.....kkooOk.', 'kkkkkooooOk.', 'kRRkoooooOk.', 'kRRkoooooOk.', 'kkkkkooooOk.', '....kkkooOk.', '....kRk.kkk.', '....kkk.....', '............']),
  police: check('police', ['..kkkkkkkk..', '.kDDDDDDDDk.', '.kDDDRRDDDk.', '.kDDRooRDDk.', '.kDDRooRDDk.', '.kDDDRRDDDk.', '.kRRRRRRRRk.', '..kDDDDDDk..', '...kDDDDk...', '....kDDk....', '.....kk.....', '............']),
  thief: check('thief', ['...kkkkkk...', '..kmmmmmmk..', '.kmmmmmmmmk.', '.kmkkkkkkmk.', '.kmkzkkzkmk.', '.kmkkkkkkmk.', '.kmSSSSSSmk.', '.kmllllllmk.', '.kmllllllmk.', '..kmmmmmmk..', '...kkkkkk...', '............']),
  chef: check('chef', ['...kkkkkk...', '..kzzzzzzk..', '.kzzzzzzzzk.', '.kzzzzzzzzk.', '..kzzzzzzk..', '..kllllllk..', '..kSSSSSSk..', '..kSeSSeSk..', '..kSSSSSSk..', '..kSSKKSSk..', '...kkkkkk...', '............']),
  bolt: check('bolt', ['.......kkk..', '......kook..', '.....kook...', '....kook....', '...kooookk..', '..kkkooook..', '....kook....', '...kook.....', '..kook......', '..kok.......', '..kk........', '............']),
  fuel: check('fuel', ['............', '..kkkkkkkk..', '..kRRRRRRk..', '..kEEEEEEk..', '..kRRRRRRk..', '..kRzRRRRk..', '..kRzRRRRk..', '..kEEEEEEk..', '..kRRRRRRk..', '..kRRRRREk..', '..kkkkkkkk..', '............']),
  broom: check('broom', ['.........kk.', '........kWk.', '.......kWk..', '......kWk...', '.....kWk....', '....kWk.....', '..kkkkkk....', '.koooOOk....', 'koooOOOk....', 'kooOOOk.....', 'kkkkkk......', '............']),
  chat: check('chat', ['............', '.kkkkkkkkkk.', 'kzzzzzzzzzzk', 'kzzzzzzzzzzk', 'kzkzzkzzkzzk', 'kzzzzzzzzzzk', 'kzzzzzzzzzzk', '.kkzkkkkkkk.', '..kk........', '............', '............', '............']),
  snow: check('snow', ['.....bb.....', '..b..bb..b..', '...b.bb.b...', '....bbbb....', '.bbbbBBbbbb.', '.bbbbBBbbbb.', '....bbbb....', '...b.bb.b...', '..b..bb..b..', '.....bb.....', '............', '............']),
  check: check('check', ['............', '..........kk', '.........kjk', '........kjk.', '.kk....kjk..', 'kjjk..kjk...', '.kjjkkjk....', '..kjjjk.....', '...kjk......', '....k.......', '............', '............']),
  cross: check('cross', ['............', '.kk......kk.', '.kRk....kRk.', '..kRk..kRk..', '...kRkkRk...', '....kRRk....', '....kRRk....', '...kRkkRk...', '..kRk..kRk..', '.kRk....kRk.', '.kk......kk.', '............']),
  fire: check('fire', ['.....k......', '....kRk.....', '....kRk..k..', '...kRRk.kRk.', '..kRRoRkkRk.', '..kRooRRRRk.', '.kRoooooRRk.', '.kRoozzooRk.', '.kRozzzzoRk.', '..kRoooooRk.', '...kkkkkkk..', '............']),
  ban: check('ban', ['...kkkkkk...', '..kRRRRRRk..', '.kRRRRRRRRk.', 'kRRRRRRRRRRk', 'kRzzzzzzzzRk', 'kRzzzzzzzzRk', 'kRRRRRRRRRRk', 'kRRRRRRRRRRk', '.kRRRRRRRRk.', '..kRRRRRRk..', '...kkkkkk...', '............']),
  keyboard: check('keyboard', ['............', '............', 'kkkkkkkkkkkk', 'klllllllllLk', 'klklklklklLk', 'kllllllllllk', 'klklklklklLk', 'kllllllllllk', 'kllkkkkkkllk', 'kLLLLLLLLLLk', 'kkkkkkkkkkkk', '............']),
  house: check('house', ['.....kk.....', '....kRRk....', '...kRRRRk...', '..kRRRRRRk..', '.kRRRRRRRRk.', 'kkkkkkkkkkkk', '.kcccccccck.', '.kcckkcbbck.', '.kckWkcbbck.', '.kckWkcccck.', '.kkkkkkkkkk.', '............']),
  mom: check('mom', ['...kkkkkk...', '..kHHHHHHk..', '.kHHSSSSHHk.', '.kHSeSSeSHk.', '.kHSSSSSSHk.', '.kHSSKKSSHk.', '.kHkSSSSkHk.', '..kHkkkkHk..', '..kRRRRRRk..', '.kRRRRRRRRk.', '.kRRRRRRRRk.', '.kkkkkkkkkk.']),
  person: check('person', ['...kkkkkk...', '..kHHHHHHk..', '..kHSSSSHk..', '..kSeSSeSk..', '..kSSSSSSk..', '..kSSKKSSk..', '...kSSSSk...', '..kkJJJJkk..', '.kJJJJJJJJk.', '.kJJJJJJJJk.', '.kJJJJJJJJk.', '.kkkkkkkkkk.']),
  skull: check('skull', ['...kkkkkk...', '..kzzzzzzk..', '.kzzzzzzzzk.', '.kzkkzzkkzk.', '.kzkkzzkkzk.', '.kzzzzzzzzk.', '..kzzkkzzk..', '..kzzzzzzk..', '...kzkzkk...', '....kkkk....', '............', '............']),
  pin: check('pin', ['...kkkkk....', '..kRRRRRk...', '.kRRzRRRRk..', '.kRRRRRRRk..', '.kRRRRRRRk..', '..kRRRRRk...', '...kRRRk....', '....kRk.....', '....kRk.....', '.....k......', '............', '............']),
  target: check('target', ['...kkkkkk...', '..kRRRRRRk..', '.kRzzzzzzRk.', 'kRzRRRRRRzRk', 'kRzRzzzzRzRk', 'kRzRzRRzRzRk', 'kRzRzRRzRzRk', 'kRzRzzzzRzRk', 'kRzRRRRRRzRk', '.kRzzzzzzRk.', '..kRRRRRRk..', '...kkkkkk...']),
  recycle: check('recycle', ['....kkkk....', '.kkkkkkkkkk.', '.kJJJJJJJJk.', '..kJjJJjJk..', '..kJjJJjJk..', '..kJjJJjJk..', '..kJjJJjJk..', '..kJjJJjJk..', '..kJJJJJJk..', '..kkkkkkkk..', '............', '............']),   // thùng gom đồ thải
  signal: check('signal', ['............', '.........kkk', '.........kJk', '......kkkkJk', '......kJkkJk', '...kkkkJkkJk', '...kJkkJkkJk', 'kkkkJkkJkkJk', 'kJkkJkkJkkJk', 'kJkkJkkJkkJk', 'kkkkkkkkkkkk', '............']),
  book: check('book', ['.kkkkkkkkkk.', '.kRzzzzzzzk.', '.kRzkkkkzzk.', '.kRzzzzzzzk.', '.kRzkkkkkzk.', '.kRzzzzzzzk.', '.kRzkkkkzzk.', '.kRzzzzzzzk.', '.kRzkkkzzzk.', '.kRzzzzzzzk.', '.kkkkkkkkkk.', '............']),
  heart: check('heart', ['............', '..kk....kk..', '.kRRk..kRRk.', 'kRzRRkkRRRRk', 'kRzRRRRRRRRk', 'kRRRRRRRRRRk', '.kRRRRRRRRk.', '..kRRRRRRk..', '...kRRRRk...', '....kRRk....', '.....kk.....', '............']),
  phone: check('phone', ['............', '..kkk.......', '.kRRRk......', '.kRRk.......', '.kRk........', '.kRk........', '.kRRk.......', '..kRRk..kk..', '...kRRkkRRk.', '....kRRRRRk.', '.....kkkkk..', '............']),
  bank: check('bank', ['.....kk.....', '...kkllkk...', '.kklllllLkk.', 'kllllllllLLk', 'kkkkkkkkkkkk', '.kkkkkkkkkk.', '.klk.kk.klk.', '.klk.kk.klk.', '.klk.kk.klk.', 'kkkkkkkkkkkk', 'kLLLLLLLLLLk', 'kkkkkkkkkkkk']),
  eye: check('eye', ['............', '............', '...kkkkkk...', '.kkzzzzzzkk.', 'kzzzkxXkzzzk', 'kzzzkxxkzzzk', '.kkzzkkzzkk.', '...kkkkkk...', '............', '............', '............', '............']),
  speaker: check('speaker', ['............', '.....kk.....', '....kmk..k..', 'kkkkmmk...k.', 'kllkmmk.k.k.', 'kllkmmk.k.k.', 'kllkmmk.k.k.', 'kkkkmmk...k.', '....kmk..k..', '.....kk.....', '............', '............']),
  back: check('back', ['............', '...k........', '..kok.......', '.kooookkkk..', 'kooooooooOk.', '.kooookkkoOk', '..kok....kOk', '...k.....kOk', '.....kkkkoOk', '.....kOOOOk.', '.....kkkkk..', '............']),
  party: check('party', ['..R...o...b.', '.....b...R..', '.o.......k..', '........kok.', '.......kRk..', '......kook..', '.....kRRk...', '....kooOk...', '...kRRRk....', '..koooOk....', '.kkkkkk.....', '............']),
  cloud: check('cloud', ['............', '............', '....kkkk....', '...kzzzzk...', '.kkzzzzzzkk.', 'kzzzzzzzzzzk', 'kzzzzzzzzzzk', 'kzzzzzzzzzlk', '.kllllllllk.', '..kkkkkkkk..', '............', '............']),
  sparkle: check('sparkle', ['.....o......', '.....o....O.', '....ooo..OOO', 'oooooOooo.O.', '....ooo.....', '.....o......', '.....o..O...', '.......OOO..', '........O...', '............', '............', '............']),
  lock: check('lock', ['....kkkk....', '...kLLLLk...', '..kLk..kLk..', '..kLk..kLk..', '..kLk..kLk..', '.kkkkkkkkkk.', '.koooooOOOk.', '.koookkoOOk.', '.kooookoOOk.', '.kooookoOOk.', '.koooooOOOk.', '.kkkkkkkkkk.']),
  sun: check('sun', ['.....oo.....', '.o...oo...o.', '..o.kkkk.o..', '...koooOk...', 'ookoooooOkoo', 'ookoooooOkoo', '...kooOOk...', '..o.kkkk.o..', '.o...oo...o.', '.....oo.....', '............', '............']),
  gamepad: check('gamepad', ['............', '............', '..kkkkkkkk..', '.kmmmmmmmmk.', 'kmmkmmmmRmmk', 'kmkkkmmRmRmk', 'kmmkmmmmRmmk', 'kmmmmmmmmmmk', 'kmmkkkkkkmmk', '.kk......kk.', '............', '............']),
  thermo: check('thermo', ['.....kk.....', '....kzzk....', '....kzzk....', '....kzRk....', '....kzRk....', '....kzRk....', '....kRRk....', '...kRRRRk...', '...kRRRRk...', '...kRRREk...', '....kkkk....', '............']),
  bulb: check('bulb', ['....kkkk....', '...kooook...', '..koozoook..', '..kozooook..', '..koooooOk..', '...kooOOk...', '....kook....', '....kllk....', '....kLLk....', '....kllk....', '.....kk.....', '............']),
  calendar: check('calendar', ['..k....k....', '.kkkkkkkkkk.', '.kRRRRRRRRk.', '.kRRRRRRRRk.', '.kkkkkkkkkk.', '.kzzzzzzzzk.', '.kzkzkzkzzk.', '.kzzzzzzzzk.', '.kzkzkzkzzk.', '.kzzzzzzzzk.', '.kkkkkkkkkk.', '............']),
  box: check('box', ['............', '..kkkkkkkk..', '.kwwwwwwwwk.', 'kwwwwWWwwwwk', 'kkkkkkkkkkkk', 'kwwwwWWwwwWk', 'kwwwwWWwwwWk', 'kwwwwwwwwwWk', 'kwwwwwwwwwWk', 'kWWWWWWWWWWk', 'kkkkkkkkkkkk', '............']),
  pencil: check('pencil', ['.........kkk', '........kRRk', '.......koRk.', '......kook..', '.....kook...', '....kook....', '...kook.....', '..kook......', '.kcck.......', '.kck........', 'kkk.........', '............']),
  ffwd: check('ffwd', ['............', '............', '.kk...kk....', '.kJk..kJk...', '.kJJk.kJJk..', '.kJJJkkJJJk.', '.kJJJkkJJJk.', '.kJJk.kJJk..', '.kJk..kJk...', '.kk...kk....', '............', '............']),
  pause: check('pause', ['............', '............', '..kkk..kkk..', '..kJk..kJk..', '..kJk..kJk..', '..kJk..kJk..', '..kJk..kJk..', '..kJk..kJk..', '..kJk..kJk..', '..kkk..kkk..', '............', '............']),
  play: check('play', ['............', '..kk........', '..kJk.......', '..kJJk......', '..kJJJk.....', '..kJJJJk....', '..kJJJJk....', '..kJJJk.....', '..kJJk......', '..kJk.......', '..kk........', '............']),
  globe: check('globe', ['...kkkkkk...', '..kbbJJbbk..', '.kbJJJbbbbk.', 'kbbbJbbJJJbk', 'kbbbbbbJJJbk', 'kbbbbbbbJbbk', 'kbJJbbbbbbbk', 'kbJJJbbbbbbk', '.kbJJbbbbbk.', '..kbbbbbbk..', '...kkkkkk...', '............']),
  battery: check('battery', ['............', '............', 'kkkkkkkkkk..', 'kjjjjjjjlkk.', 'kJJJJJJJlklk', 'kJJJJJJJlklk', 'kJJJJJJJlkk.', 'kkkkkkkkkk..', '............', '............', '............', '............']),
  ...FACES,
};
const icon = (name, scale = 2) => svg(ICON[name], { scale });

window.SPR = { FACES, BODY, MOODS, HAIR, EXTRA, person, personMap, emote, EMOTE, back, MONITOR, DESK, station, TILE, FLOORS, room, floorSwatch, ICON, icon };
})();
