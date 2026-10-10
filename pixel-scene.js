/* Quán Nét Bất Ổn — cảnh quán trong ca vẽ bằng pixel.
   Thay phần hình của art.js cho play-scene.js, giữ đúng hệ tọa độ 760×680 của cảnh (1 ô pixel = U đơn vị),
   nên vùng bấm, vị trí khách/máy và logic không đổi. Mỗi hình lớn vẽ một lần ra PNG (PX.png) rồi đặt bằng <image>.
   Cần pixel.js, pixel-sprites.js. window.PSCN */
(() => {
'use strict';
const { PX, SPR } = window;
const { check, grid, toRows, put, stamp, blank, recolor, png } = PX;
const U = 5;                                  // 1 ô pixel = 5 đơn vị cảnh
const SU = 7;                                 // dàn máy hàng trước gần người nhìn hơn: ô to hơn
const VW = 760, VH = 680, FLOOR_TOP = 280;
const GW = VW / U, GH = VH / U, FLOOR_ROW = FLOOR_TOP / U;   // 152×136 ô, sàn từ hàng 56
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
// Đặt lưới ký tự tại (x, y) đơn vị cảnh, mỗi ô = u đơn vị
const image = (rows, x, y, u = U, attrs = '') => `<image href="${png(rows)}" x="${x}" y="${y}" width="${rows[0].length * u}" height="${rows.length * u}" style="image-rendering:pixelated" preserveAspectRatio="none"${attrs}/>`;
const paste = (g, rows, y0, x0) => rows.forEach((r, y) => [...r].forEach((v, x) => { if (v !== '.' && g[y0 + y] && g[y0 + y][x0 + x] !== undefined) g[y0 + y][x0 + x] = v; }));

// ---------- Màu nhân vật: đổi màu hex của game (art.js makeLook) sang màu gần nhất trong bảng ----------
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function nearest(hex, chars) {
  if (!hex || hex[0] !== '#') return chars[0];
  const [r, g, b] = rgb(hex);
  let best = chars[0], bd = Infinity;
  for (const ch of chars) {
    const [r2, g2, b2] = rgb(PX.PAL[ch]);
    const d = (r - r2) ** 2 * 2 + (g - g2) ** 2 * 4 + (b - b2) ** 2 * 3;
    if (d < bd) { bd = d; best = ch; }
  }
  return best;
}
const SHADE = { z: 'l', c: 'C', C: 'd', j: 'J', J: 'g', g: 'k', t: 'T', T: 'u', u: 'K', o: 'O', O: 'u', b: 'B', B: 'n', n: 'N', N: 'k',
  R: 'E', E: 'K', y: 'Y', Y: 'E', q: 'Q', Q: 'k', l: 'L', L: 'm', m: 'k', D: 'U', U: 'k', w: 'W', W: 'v', v: 'k', K: 'k', H: 'h', h: 'k',
  S: 's', i: 'S', I: 'f', k: 'k' };
const SHIRTS = 'zcjJgtTuoObBnNREyYqQlLmDUwW'.split('');
const PANTS = 'nNBmkKWvLlUdC'.split('');
const HAIRS = 'HhkKWvLoqR'.split('');
const GIRL = { bob: 'long', bun: 'bun', long: 'long', ponytail: 'ponytail', twin: 'twin' };
const BOY = { messy: 'short', buzz: 'short', side: 'short', spiky: 'spiky', cap: 'cap' };
// L: look của art.js (màu hex); seg: tệp khách. Trả về look pixel cho SPR.person/back
function fromLook(L = {}, seg = '') {
  if (L.pixel) return L.pixel;
  const skin = nearest(L.skin, ['S', 'i', 'I']);
  const hair = nearest(L.hair, HAIRS), shirt = nearest(L.shirt, SHIRTS), pants = nearest(L.pants, PANTS);
  const extras = [];
  if (L.headset) extras.push('headset');
  if (L.glasses) extras.push('glasses');
  if (L.beard) extras.push('beard');
  if (L.tie) extras.push('tie');
  if (L.bag) extras.push('bag');
  if (L.bottom === 'skirt' || L.bottom === 'dress') extras.push('skirt');
  let hairStyle = (L.gender === 'f' ? GIRL : BOY)[L.hairStyle] || 'short';
  const look = { skin, skinShade: SHADE[skin], hair, hairShade: SHADE[hair] === hair ? 'k' : SHADE[hair], shirt, shirtShade: SHADE[shirt],
    pants, pantsShade: SHADE[pants], hairStyle, extras };
  if (hairStyle === 'cap' || L.helmet) { look.hairStyle = 'cap'; const cap = nearest(L.helmet || L.cap, SHIRTS); look.cap = cap; look.capShade = SHADE[cap]; }
  if (seg === 'congan') Object.assign(look, { hairStyle: 'police', shirt: 'D', shirtShade: 'U', pants: 'U', pantsShade: 'k', shoes: 'k', extras: [...extras, 'police'] });
  return look;
}
const OWNER = { shirt: 'z', shirtShade: 'l', pants: 'v', pantsShade: 'k', extras: ['apron'] };
const STAFF = { hairStyle: 'cap', cap: 'J', capShade: 'g', hair: 'W', hairShade: 'v', shirt: 'o', shirtShade: 'O', pants: 'v', pantsShade: 'k' };
const MOOD = { idle: 'idle', smile: 'happy', happy: 'happy', sad: 'sad', hungry: 'sad', focus: 'idle', call: 'shock', angry: 'angry', shock: 'shock' };

// ---------- Đồ vật nhỏ ----------
const BOWL = check('BOWL', ['.z..z.z.', 'kkkkkkkk', 'koOooOok', 'kzRzzRzk', '.kzzzzk.', '..kkkk..']);
const BOWL_EMPTY = check('BOWLE', ['........', 'kkkkkkkk', 'kllllllk', 'kzRzzRzk', '.kzzzzk.', '..kkkk..']);
const CUP = check('CUP', ['.kkkk.', '.koOk.', '.kRRkk', '.kRRk.', '.kRRk.', '.kkkk.']);
const CUP_EMPTY = check('CUPE', ['.kkkk.', '.kllk.', '.kRRkk', '.kRRk.', '.kRRk.', '.kkkk.']);
const BOX = check('BOX', ['kkkkkkkk', 'kwwwwwwk', 'kkkkkkkk', 'kwwWWwwk', 'kwwwwwwk', 'kkkkkkkk']);
const STOOL = check('STOOL', ['.kkkkkkkkkkkk.', 'kRRRRRRRRRRRRk', 'kEEEEEEEEEEEEk', '.kRk......kRk.', '.kRk......kRk.', '.kEk......kEk.', '.kk........kk.']);
const DOG_SLEEP = check('DOG', [
  '......................',
  '..............kk..kk..',
  '.............kOOkkOOk.',
  '....kkkkkkkkkkooooook.',
  '..kkoooooooookoeooeok.',
  '.kooooooooooookooooook',
  'kOoooooooooooookoKKok.',
  'kOOoooooooozzzzkoook..',
  '.kOOOOoooozzzzzzkkk...',
  '..kkkkkkkkkkkkkkk.....',
]);
const DOG_AWAKE = check('DOGA', [
  '.............kk..kk...',
  '............kOOkkOOk..',
  '............kooooook..',
  '...........koeooeook..',
  '..kk.......kooKKoook..',
  '.kOk.......kozzzzook..',
  '.kOk..kkkkkkozzzzok...',
  '..kOkkooooooooooook...',
  '...kOoooooooooooook...',
  '...kOOOOOOOOOOOOOOk...',
  '....kOk.kOk.kOk.kOk...',
  '....kkk.kkk.kkk.kkk...',
]);

// ---------- Nền: tường vữa kem, đèn thả, ốp gạch ngọc, sàn gạch bông D ----------
function backgroundRows() {
  const g = blank(GW, GH, 'c');
  for (let y = 0; y < FLOOR_ROW; y++) for (let x = 0; x < GW; x++) {
    if ((x * 7 + y * 13) % 29 === 0) g[y][x] = 'C';
    if ((x * 11 + y * 5) % 53 === 0) g[y][x] = 'd';
  }
  for (let y = 12; y < 15; y++) for (let x = 0; x < GW; x++) if (g[y][x] === 'c') g[y][x] = 'C';   // bóng dưới mái hiên
  const rail = FLOOR_ROW - 14;
  for (let x = 0; x < GW; x++) { g[rail][x] = 'w'; g[rail + 1][x] = 'W'; }
  for (let y = rail + 2; y < FLOOR_ROW - 1; y++) for (let x = 0; x < GW; x++) g[y][x] = SPR.TILE.wains[(y - rail - 2) % 8][x % 8];
  for (let x = 0; x < GW; x++) g[FLOOR_ROW - 1][x] = 'v';
  for (let y = FLOOR_ROW; y < GH; y++) for (let x = 0; x < GW; x++) g[y][x] = SPR.FLOORS.tile.at(x, y - FLOOR_ROW);
  for (let x = 0; x < GW; x++) if (g[FLOOR_ROW][x] !== 'd') g[FLOOR_ROW][x] = 'C';   // bóng chân tường
  // cột gỗ hai bên khung cảnh
  for (let y = 0; y < GH; y++) { g[y][0] = 'W'; g[y][1] = 'w'; g[y][GW - 2] = 'w'; g[y][GW - 1] = 'W'; }
  // đèn thả trên quầy
  stamp(g, 12, 138, ['...k...', '...k...', '..kkk..', '.kJJJk.', 'kJJJJJk', 'kkkkkkk', '.ooooo.']);
  // dây đèn trang trí chạy ngang trên ốp tường
  for (let x = 2; x < GW - 2; x++) { const y = rail - 2 + (((x % 12) < 6) ? (x % 6 > 2 ? 1 : 0) : 0); g[y][x] = 'K'; if (x % 8 === 4) g[y + 1][x] = 'RoJyb'[(x >> 3) % 5]; }
  // bình nước
  paste(g, [
    '...kkkk...', '..kbbbbk..', '..kbzbbk..', '..kbzbbk..', '..kbbbbk..', '...kkkk...', '.kkkkkkkk.', '.kzzzzzzk.', '.kzRzzbzk.', '.kzzzzzzk.',
    '.kzllllzk.', '.kzzzzzzk.', '.kzzzzzzk.', '.kzzzzzzk.', '.kzzzzzzk.', '.kllllllk.', '.kkkkkkkk.', '..k....k..'], FLOOR_ROW - 17, 57);
  return toRows(g);
}
// ---------- Bảng giá phấn (chữ VT323 đặt trên bảng pixel) ----------
function priceBoard(lines = []) {
  const w = 32, h = 8 + lines.length * 4 + 2;
  const g = blank(w, h + 3);
  put(g, 0, 14, 'kk'); put(g, 1, 9, 'K....KK....K'); put(g, 2, 7, 'K..............K'.slice(0, 16));
  for (let y = 3; y < h + 3; y++) for (let x = 0; x < w; x++) g[y][x] = (y === 3 || y === h + 2 || x === 0 || x === w - 1) ? 'k' : (y === 4 || y === h + 1 || x === 1 || x === w - 2) ? 'W' : 'g';
  for (let x = 3; x < w - 3; x++) if (x % 5 === 0) g[h][x] = 'J';   // vệt phấn mờ
  const x0 = 18, y0 = 60;
  const text = lines.map(([a, b, c], k) => `<text x="${x0 + 14}" y="${y0 + 72 + k * 20}" ${c ? `fill="${c}"` : ''}>${esc(a)}</text><text x="${x0 + w * U - 14}" y="${y0 + 72 + k * 20}" text-anchor="end" ${c ? `fill="${c}"` : ''}>${esc(b)}</text>`).join('');
  return image(toRows(g), x0, y0) + `<g class="px-text" font-family="VT323, monospace" fill="#FFF8EC">
    <text x="${x0 + w * U / 2}" y="${y0 + 48}" text-anchor="middle" font-size="24" fill="#F6CB55">BẢNG GIÁ</text>
    <g font-size="17">${text}</g></g>`;
}
// ---------- Đồng hồ: mặt pixel, kim do game xoay (clock-h, clock-m) ----------
const CLOCK = check('CLOCK', ['....kkkkkk....', '..kkWWWWWWkk..', '.kWWzzzzzzWWk.', '.kWzzzzRzzzWk.', 'kWzzzzzzzzzzWk', 'kWzzzzzzzzzzWk', 'kWzRzzzzzzRzWk', 'kWzzzzzzzzzzWk', 'kWzzzzzzzzzzWk', '.kWzzzzRzzzWk.', '.kWWzzzzzzWWk.', '..kkWWWWWWkk..', '....kkkkkk....', '..............']);
function clock() {
  return image(CLOCK, 318 - 35, 128 - 35) + `<g transform="translate(318 128)" shape-rendering="crispEdges">
    <rect class="clock-h" x="-3" y="-14" width="6" height="16" fill="#2B1D22"/><rect class="clock-m" x="-2" y="-21" width="4" height="23" fill="#2B1D22"/>
    <rect x="-3" y="-3" width="6" height="6" fill="#D9534A"/></g>`;
}
// ---------- Biển, giấy dán, neon ----------
function wallSigns() {
  const sign = blank(36, 12);
  stamp(sign, 0, 0, ['...k......................k.........', '...k......................k.........', '...k......................k.........', '...k......................k.........']);
  for (let y = 4; y < 12; y++) for (let x = 0; x < 36; x++) sign[y][x] = (y === 4 || y === 11 || x === 0 || x === 35) ? 'k' : y === 10 ? 'g' : 'J';
  const note = blank(26, 10, 'z');
  for (let x = 0; x < 26; x++) { note[9][x] = 'l'; }
  put(note, 0, 1, 'oooo'); put(note, 0, 21, 'oooo');
  const neon = blank(20, 14, 'k');
  for (let y = 1; y < 13; y++) for (let x = 1; x < 19; x++) neon[y][x] = 'x';
  paste(neon, ['.yyyyyy.', 'y......y', 'y.X..X.y', 'yXXX..Xy', 'y.X..X.y', 'y......y', '.yyyyyy.'], 2, 6);
  return image(toRows(sign), 556, 66) + `<text x="${556 + 18 * U}" y="${66 + 9 * U}" text-anchor="middle" font-family="VT323, monospace" font-size="18" fill="#FFF8EC">NẠP GIỜ TẠI QUẦY</text>`
    + image(toRows(note), 418, 168) + `<g font-family="VT323, monospace" font-size="17" fill="#C8693F" text-anchor="middle"><text x="483" y="188">THUA KHÔNG ĐƯỢC</text><text x="483" y="207">ĐẬP PHÍM :)</text></g>`
    + `<g class="px-neon">${image(toRows(neon), 182, 62)}<text x="232" y="${62 + 12.6 * U}" text-anchor="middle" font-family="VT323, monospace" font-size="16" fill="#8EF0DA">GAME</text></g>`;
}
// ---------- Đồ nâng cấp trên tường: quạt / điều hòa, router, ổ điện / UPS ----------
const FAN = check('FAN', ['....kkkk....', '..kkllllkk..', '.kllkkkklllk'.slice(0, 12), 'klkllllllklk', 'klklJJJJlklk', 'klklJkkJlklk', 'klklJJJJlklk', 'klkllllllklk', '.kllkkkkllk.', '..kkllllkk..', '....kkkk....', '.....kk.....', '....kLLk....']);
const AC = check('AC', ['kkkkkkkkkkkkkkkkkkkk', 'kzzzzzzzzzzzzzzzzzzk', 'kzzzzzzzzzzzzzzzJzzk', 'kllllllllllllllllllk', 'kLkLkLkLkLkLkLkLkLLk', 'kkkkkkkkkkkkkkkkkkkk']);
const ROUTER = [
  check('R0', ['.k......k.', '.k......k.', '.k......k.', 'kkkkkkkkkk', 'kmmmmmmmmk', 'kmJmomRmmk', 'kkkkkkkkkk']),
  check('R1', ['.k..k...k.', '.k..k...k.', '.k..k...k.', 'kkkkkkkkkk', 'kzzzzzzzzk', 'kzJzJzJzzk', 'kkkkkkkkkk']),
  check('R2', ['k..k..k..k', 'k..k..k..k', 'k..k..k..k', 'kkkkkkkkkk', 'kmmmmmmmmk', 'kmJmJmJmqk', 'kkkkkkkkkk']),
];
const UPS = check('UPS', ['kkkkk', 'kmmmk', 'kxJxk', 'kmmmk', 'kmmmk', 'kmmmk', 'kmlmk', 'kkkkk']);
const STRIP = check('STRIP', ['kkkkkkk', 'klklklk', 'kkkkkkk']);
function decor(d = {}) {
  const net = Math.max(0, Math.min(2, d.net | 0));
  let s = d.ac ? image(AC, 600, 132) + (d.inverter ? `<text x="650" y="151" text-anchor="middle" font-family="VT323, monospace" font-size="12" fill="#2E9C8A">INVERTER</text>` : '')
    : image(FAN, 690, 130);
  s += image(ROUTER[net], 208, 152);
  s += `<rect x="232" y="187" width="5" height="20" fill="#2B1D22"/><rect x="232" y="207" width="40" height="5" fill="#2B1D22"/>`;   // dây mạng chạy dọc nẹp tường
  if (d.ups) s += image(UPS, 456, FLOOR_TOP - 40) + image(STRIP, 392, FLOOR_TOP - 40);
  else s += image(STRIP, 350, FLOOR_TOP + 2) + image(STRIP, 395, FLOOR_TOP + 6) + `<g class="dc-spark">${image(['.o.', 'ooo', '.o.'], 410, FLOOR_TOP - 6)}</g>`;
  return s;
}
// ---------- Mái hiên sọc + biển tên quán ----------
function awning(name) {
  const g = blank(GW, 12, '.');
  for (let x = 0; x < GW; x++) {
    for (let y = 0; y < 3; y++) g[y][x] = 'm';
    const stripe = ((x / 6) | 0) % 2 ? 'z' : 'J';
    for (let y = 3; y < 9; y++) g[y][x] = stripe;
    const cx = x % 6;
    if (cx > 0 && cx < 5) g[9][x] = stripe;
    if (cx > 1 && cx < 4) g[10][x] = stripe;
    g[3][x] = 'g';
  }
  for (let x = 0; x < GW; x++) for (let y = 4; y < 11; y++) if (g[y][x] !== '.' && (g[y + 1]?.[x] === '.' || y === 10)) g[y][x] = g[y][x] === 'z' ? 'l' : 'g';
  const sw = 78, board = blank(sw, 13);
  for (let y = 0; y < 13; y++) for (let x = 0; x < sw; x++) board[y][x] = (y === 0 || y === 12 || x === 0 || x === sw - 1) ? 'k' : (y === 1 || y === 11 || x === 1 || x === sw - 2) ? 'W' : 'g';
  put(board, 6, 3, 'oo'); put(board, 6, sw - 5, 'oo');
  const size = Math.round(Math.max(22, Math.min(44, 44 * 14 / Math.max(14, String(name).length))));
  return image(toRows(g), 0, 0) + image(toRows(board), VW / 2 - sw * U / 2, 2)
    + `<text x="${VW / 2}" y="${2 + 8.6 * U}" text-anchor="middle" font-family="VT323, monospace" font-size="${size}" fill="#FFF8EC" letter-spacing="1">${esc(String(name).toUpperCase())}</text>`;
}
const frame = () => `<rect y="672" width="${VW}" height="8" fill="#5E3B27"/>`;

// ---------- Quầy: máy tính chủ (bấm được), nồi mì, giấy giá ----------
// live = false: bản vẽ cho màn tiêu đề/buổi sáng, không có vùng bấm và không trùng id hơi nồi của cảnh trong ca
function counter(live = true) {
  const w = 52, h = 24, g = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (y === 0 || x === 0 || x === w - 1 || y === h - 1) { g[y][x] = 'k'; continue; }
    if (y < 4) { g[y][x] = y === 1 ? 'w' : 'W'; continue; }
    if (y === 4) { g[y][x] = 'v'; continue; }
    g[y][x] = (x % 7 === 0) ? 'v' : (x % 7 === 1) ? 'w' : 'W';
  }
  paste(g, ['kkkkkkkkkkkkkk', 'kzzzzzzzzzzzzk', 'kzzzzzzzzzzzzk', 'kzzzzzzzzzzzzk', 'kzzzzzzzzzzzzk', 'kzzzzzzzzzzzzk', 'kzzzzzzzzzzzzk', 'kkkkkkkkkkkkkk'], 8, 6);   // giấy "MÌ TRỨNG 17K"
  paste(g, ['.kkkkk.', 'kJJJJJk', 'kJzzzJk', 'kJJJJJk', '.kkkkk.'], 10, 39);   // logo NET
  const host = check('HOST', ['kkkkkkkkk', 'kmmmmmmmk', 'kmxxxxxmk', 'kmxXXxxmk', 'kmxxxxxmk', 'kmmmmmmmk', 'kkkkkkkkk', '...kmk...', '.kkkkkkk.']);
  const pot = check('POT', ['..kkkkkkkk..', 'kkllllllllkk', '.kLLLLLLLLk.', '.klllllllLk.', '.klllllllLk.', '.kLLLLLLLLk.', '..kkkkkkkk..', '..kRk..kRk..']);
  const steam = ['..l..l..', '.l..l..l', '..l..l..', '.l..l...'];
  return image(toRows(g), 506, 262) + `<g font-family="VT323, monospace" text-anchor="middle"><text x="571" y="${262 + 11.6 * U}" font-size="14" fill="#C8693F">MÌ TRỨNG</text><text x="571" y="${262 + 14.2 * U}" font-size="16" fill="#3F6FA8">17K</text></g>`
    + `<g ${live ? 'data-hit="host" role="button" tabindex="0" aria-label="Mở máy tính chủ" class="host-monitor"' : ''}>${image(host, 512, 218)}<text x="534" y="243" text-anchor="middle" font-family="VT323, monospace" font-size="12" fill="#8EF0DA">APP</text></g>`
    + `<g ${live ? 'id="potSteam" ' : ''}class="px-steam">${image(steam, 706, 196)}</g>` + image(pot, 694, 222)
    + (live ? `<g id="flame" class="px-flame">${image(['.o.o.o.', 'oRoRoRo'], 703, 262)}</g>` : '');
}

// ---------- Dàn máy: màn hình theo cấp màn, bàn theo cấp ghế, bàn phím, thùng máy theo hạng máy ----------
const MON = [
  SPR.MONITOR.crt,
  check('LCD', [
    '................................', '................................', '................................',
    '.........kkkkkkkkkkkkkk.........', '.........kxxxxxxxxxxxxk.........', '.........kxXXxxxxxxxxxk.........', '.........kxxxxxxxxxxxxk.........',
    '.........kxxxxxxxXxxxxk.........', '.........kxxxxxxxxxxxxk.........', '.........kxxxxxxxxxxxxk.........', '.........kkkkkkkkkkkkkk.........',
    '...............kk...............', '...............kk...............', '..............kmmk..............', '............kkmmmmkk............']),
  SPR.MONITOR.wide,
  check('CURVE', [
    '................................', '.....kkkkkkkkkkkkkkkkkkkkkk.....', '....kqqqqqqqqqqqqqqqqqqqqqqk....', '....kqxxxxxxxxxxxxxxxxxxxxqk....',
    '....kqxXXXxxxxxxxxxxxxxxxxqk....', '....kqxxxxxxxxxqqqqxxxxxxxqk....', '....kqxxxxxxxxqQQQQqxxxxxxqk....', '....kqxxxjjxxxxxxxxxxxxxxxqk....',
    '....kqxxjjjjxxxxxxxxxXxxxxqk....', '....kqxxxxxxxxxxxxxxxxxxxxqk....', '.....kqqqqqqqqqqqqqqqqqqqqk.....', '......kkkkkkkkkkkkkkkkkkkk......',
    '..............kmmk..............', '..............kmmk..............', '............kkmmmmkk............']),
];
const DESK_BASE = SPR.DESK.basic;
const DESK_TINT = [{}, {}, { w: 'm', W: 'm', v: 'm' }, { w: 'z', W: 'l', v: 'L' }];
const KB = ['llllllllll', 'mmmmmmmmmm', 'jJjJjJjJjJ', 'yqJoyqJoyq'];
const TOWER = [null, ['kkkkkk', 'kllllk', 'klJllk', 'kllllk', 'kLLLLk', 'kllllk', 'kllllk', 'kkkkkk'],
  ['kkkkkk', 'kmmmmk', 'kmJmmk', 'kmmmmk', 'kmmmmk', 'kmmmmk', 'kmJmmk', 'kkkkkk'],
  ['kkkkkk', 'kqQqQk', 'kQjQqk', 'kqQjQk', 'kQqQqk', 'kxxxxk', 'kxJJxk', 'kkkkkk'],
  ['kkkkkk', 'kjqyok', 'kqyojk', 'kyojqk', 'kojqyk', 'kxxxxk', 'kxqyxk', 'kkkkkk']];
const CHAIR = [{ W: 'B', w: 'b', v: 'n' }, {}, { W: 'E', w: 'R', v: 'k' }, { W: 'l', w: 'z', v: 'L' }];
// tư thế: sửa lưới lưng khách trước khi tô màu
const POSE = {
  order: g => { put(g, 0, 16, 'kk'); put(g, 1, 16, 'Sk'); put(g, 2, 16, 'Sk'); for (let r = 3; r <= 11; r++) put(g, r, 16, 'Ak'); },
  win: g => { for (const [c, a, b] of [[16, 'Sk', 'Ak'], [0, 'kS', 'kA']]) { put(g, 0, c, 'kk'); put(g, 1, c, a); put(g, 2, c, a); for (let r = 3; r <= 11; r++) put(g, r, c, b); } },
  lose: g => { put(g, 1, 2, 'SS'); put(g, 1, 14, 'SS'); put(g, 2, 1, 'kSS'); put(g, 2, 14, 'SSk'); for (let r = 3; r <= 10; r++) { put(g, r, 0, 'kA'); put(g, r, 16, 'Ak'); } },
};
const POSE_EMOTE = { lose: 'angry', lag: 'sweat', wait: 'wait', order: null, win: 'love' };
const tierOf = m => Math.min(m.cpu, m.gpu) + 1;
// st = { i, m, cust: { look (pixel), pose, justSat } | null, item, trash }
// Phần đứng yên: màn hình, bàn, phím, thùng máy, đồ trên bàn, ghế
function stationRows(st) {
  const m = st.m, lv = Math.max(0, Math.min(3, m.chair | 0));
  const mon = m.missing === 'mon' ? Array(15).fill('.'.repeat(32)) : MON[Math.max(0, Math.min(3, m.mon | 0))];
  const g = grid([...mon, ...recolor(DESK_BASE, DESK_TINT[lv])]);
  TOWER[Math.max(1, Math.min(4, tierOf(m)))].forEach((r, y) => put(g, 19 + y, 19, r));
  if (m.missing !== 'kb') put(g, 16, 10, KB[Math.max(0, Math.min(3, m.kb | 0))]);
  if (m.missing !== 'mouse') put(g, 16, 21, m.mouse >= 2 ? 'Jk' : 'lk');
  const it = { bowl: BOWL, emptyBowl: BOWL_EMPTY, cup: CUP, emptyCup: CUP_EMPTY }[st.item];
  if (it) paste(g, it, 17 - it.length, 23);
  if (st.trash) { paste(g, ['.kkk.', 'kRkRk', 'kRRRk'], 13, 4); paste(g, ['..k.', '.klk', 'klLk'], 14, 25); }
  // ghế quay lưng ra (khách ngồi thì đầu, vai vẽ ở lớp riêng phía trên)
  paste(g, recolor(SPR.back({}).slice(13), CHAIR[lv]), 18, 7);
  return toRows(g);
}
// Phần chuyển động: đầu, vai, tay của khách (13 hàng trên của lưng khách) theo tư thế
function custRows(c) {
  const pl = c.look.pixel || c.look;
  const b = grid(SPR.back(pl).slice(0, 13));
  if (POSE[c.pose]) {
    POSE[c.pose](b);
    const map = SPR.personMap(pl);
    b.forEach((row, y) => row.forEach((v, x) => { if (map[v]) b[y][x] = map[v]; }));
  }
  return toRows(b);
}
// SVG một chỗ máy, gốc tọa độ ở giữa chân (như art.js stationSVG)
function station(st) {
  const rows = stationRows(st), w = rows[0].length * SU, h = rows.length * SU;
  const c = st.cust, lv = Math.max(0, Math.min(3, st.m.chair | 0));
  let s = `<rect x="${-w / 2 + 14}" y="-8" width="${w - 28}" height="10" fill="#2B1D22" opacity=".12"/>` + image(rows, -w / 2, -h, SU);
  if (c) {
    const cls = ['px-cust', c.pose === 'play' ? 'px-type' : '', c.pose === 'win' ? 'px-hop' : '', c.pose === 'lose' ? 'px-shake' : '', c.justSat ? 'px-sit' : ''].join(' ');
    s += `<g class="${cls}">${image(custRows(c), -w / 2 + 7 * SU, -h + 5 * SU, SU)}</g>`;
    // lưng ghế phía trước khách (che phần dưới lưng)
    s += image(recolor(SPR.back({}).slice(13, 19), CHAIR[lv]), -w / 2 + 7 * SU, -h + 18 * SU, SU);
    const em = POSE_EMOTE[c.pose];
    if (em) s += image(SPR.emote(em), 24, -h - 4 * SU, SU);
  }
  return s;
}
// ánh màn hình (lớp sáng): khối màu vuông đè lên màn, không dải màu
function stationGlow(st) {
  const c = st.cust, rowsTop = -28 * SU;
  if (!c) return `<rect x="${20 * SU - 16 * SU}" y="${rowsTop + 21 * SU}" width="${SU}" height="${SU}" fill="#7CFFB0" opacity=".7"/>`;
  const tier = tierOf(st.m);
  const hex = c.pose === 'win' ? '#F6CB55' : c.pose === 'lose' ? '#D9534A' : tier >= 4 ? '#9C7BD0' : tier >= 2 ? '#8EF0DA' : '#7DB4E3';
  return `<g class="px-flick" style="animation-delay:${-(st.i % 3) * 0.4}s"><rect x="${-9 * SU}" y="${rowsTop + 2 * SU}" width="${18 * SU}" height="${11 * SU}" fill="${hex}" opacity=".35"/>
    <rect x="${-14 * SU}" y="${rowsTop + 15 * SU}" width="${28 * SU}" height="${SU}" fill="${hex}" opacity=".3"/></g>`;
}

// ---------- Người đứng (khách chờ, chủ quán, nhân viên, phụ huynh, kẻ trộm) ----------
// gốc tọa độ ở giữa chân; o = { mood, stool, carry, cook, pixel: look pixel sẵn }
function standing(look, o = {}) {
  const pl = look.pixel || look;
  let rows = SPR.person({ ...pl, mood: MOOD[o.mood] || 'idle' });
  if (o.carry) { const g = grid(rows); const it = { bowl: BOWL, cup: CUP, box: BOX }[o.carry] || CUP; paste(g, it, 15, it[0].length >= 8 ? 6 : 7); rows = toRows(g); }
  const w = rows[0].length * U, h = rows.length * U;
  let s = image(rows, -w / 2, -h);
  if (o.stool) s = `<g transform="translate(0 -12)">${s}</g>` + image(STOOL.map(r => o.stool === 'B' ? r.replace(/R/g, 'B').replace(/E/g, 'n') : r), -35, -35);
  if (o.emote) s += image(SPR.emote(o.emote), 14, -h - 40, U);
  return s;
}
// Chân dung cho quầy nạp giờ, bếp, thẻ khách ở cửa: đầu + vai trên nền kem khuyết góc
function portrait(look, mood = 'smile') {
  const pl = look.pixel || look;
  const head = SPR.person({ ...pl, mood: MOOD[mood] || 'happy' }).slice(0, 19);
  const g = blank(22, 20, 'C');
  g[0][0] = g[0][21] = g[19][0] = g[19][21] = '.';
  paste(g, head, 1, 1);
  return PX.svg(toRows(g), { cls: 'face' });
}
const dog = awake => image(awake ? DOG_AWAKE : DOG_SLEEP, -55, awake ? -60 : -50);
// ---------- Bong bóng trên máy (lớp giao diện): khung pixel + icon ----------
function bubble(icons, { border = 'k', fill = 'z', bar = false } = {}) {
  const n = Math.max(1, icons.length), w = n * 13 + 3, h = 17;
  const g = blank(w, h + 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y][x] = (y === 0 || y === h - 1 || x === 0 || x === w - 1) ? border : fill;
  g[0][0] = g[0][w - 1] = g[h - 1][0] = g[h - 1][w - 1] = '.';
  put(g, h, 4, border + border + border); put(g, h + 1, 4, border + border); put(g, h + 2, 4, border);
  const u = 3, x0 = -w * u / 2, y0 = -(h + 3) * u;
  let s = image(toRows(g), x0, y0, u);
  icons.forEach((name, k) => { const ic = SPR.ICON[name] || SPR.FACES[name]; if (ic) s += image(ic, x0 + (2 + k * 13) * u, y0 + 2 * u, u); });
  if (bar) s += `<rect x="${x0 + 2 * u}" y="${y0 + 14 * u}" width="${(w - 4) * u}" height="${u}" fill="#3A2A2E"/><rect class="obar" x="${x0 + 2 * u}" y="${y0 + 14 * u}" width="${(w - 4) * u}" height="${u}" fill="#2E9C8A"/>`;
  return s;
}

// ---------- Bảng phấn đứng (buổi sáng): món bán hôm nay, giá giờ chơi, game hot ----------
// lines = [{ name, price, icon }] (icon là tên trong SPR.ICON); chữ người chơi đặt đều qua esc()
function menuBoard(lines, rates, hot, x0 = 14, y0 = 70) {
  const W = 54, n = lines.length;
  const hpx = 76 + n * 28 + 14 + 2 * 20 + 30, H = Math.ceil(hpx / U), legs = 7;
  const g = blank(W, H + legs);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    g[y][x] = (y === 0 || y === H - 1 || x === 0 || x === W - 1) ? 'k' : (y < 3 || y > H - 4 || x < 3 || x > W - 4) ? (y === 1 || x === 1 ? 'w' : 'W') : 'g';
  for (let x = 4; x < W - 4; x++) if (x % 9 === 2) g[H - 5][x] = 'J';   // vệt phấn mờ
  const dash = Math.round((76 + n * 28 - 6) / U);
  for (let x = 6; x < W - 6; x++) if (x % 3 !== 2) g[dash][x] = 'j';
  for (let y = H; y < H + legs; y++) for (const c of [6, W - 9]) put(g, y, c, y === H + legs - 1 ? 'kkkk' : 'kWwk');
  const rateLines = [rates.slice(0, 2).join(' · '), rates.slice(2).join(' · ')].filter(Boolean);
  const rateTop = y0 + 76 + n * 28 + 14;
  return image(toRows(g), x0, y0) + `<g font-family="VT323, monospace" fill="#FFF8EC">
    <text x="${x0 + W * U / 2}" y="${y0 + 44}" text-anchor="middle" font-size="28" fill="#F6CB55">MENU HÔM NAY</text>
    ${lines.map((l, k) => {
      const y = y0 + 76 + k * 28, ic = SPR.ICON[l.icon];
      return (ic ? image(ic, x0 + 18, y - 20, 2) : '') + `<text x="${x0 + 50}" y="${y}" font-size="23">${esc(l.name)}</text>`
        + `<text x="${x0 + W * U - 18}" y="${y}" text-anchor="end" font-size="23">${esc(l.price)}</text>`;
    }).join('')}
    <g font-size="19" fill="#CFE6DA">${rateLines.map((t, i) => `<text x="${x0 + 18}" y="${rateTop + i * 20}">${esc(t)}</text>`).join('')}</g>
    ${image(SPR.ICON.fire, x0 + 18, rateTop + 30, 2)}<text x="${x0 + 50}" y="${rateTop + 50}" font-size="21" fill="#F6CB55">HOT: ${esc(hot)}</text></g>`;
}
// ---------- Nút máy tính chủ dưới cảnh buổi sáng ----------
function hostBar(y0 = 684) {
  const W = 150, H = 18, g = blank(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    g[y][x] = (y === 0 || y === H - 1 || x === 0 || x === W - 1) ? 'k' : y === H - 2 ? 'C' : 'z';
  g[0][0] = g[0][W - 1] = g[H - 1][0] = g[H - 1][W - 1] = '.';
  paste(g, ['k....', 'kk...', 'kJk..', 'kJJk.', 'kJk..', 'kk...', 'k....'], 5, W - 10);   // mũi tên
  return `<g data-hit="host" role="button" tabindex="0" aria-label="Mở máy tính chủ" class="host-monitor">
    <title>Máy tính chủ · bấm để mở các app</title>${image(toRows(g), 5, y0)}${image(SPR.ICON.pc, 30, y0 + 21, 4)}
    <text x="100" y="${y0 + 60}" font-family="VT323, monospace" font-size="42" fill="#1E6B5F">MÁY CHỦ</text>
    <text x="270" y="${y0 + 58}" font-family="VT323, monospace" font-size="26" fill="#8E4430">Các app quản lý quán</text></g>`;
}
const svgOpen = (h, label) => `<svg viewBox="0 0 ${VW} ${h}" role="img" aria-label="${label}" shape-rendering="crispEdges">`;
// Cảnh buổi sáng: quán chưa mở, chủ đứng quầy, dàn máy hàng trước, bảng phấn đứng. Chỉ đọc dữ liệu, không sửa.
function morning(name, lines, rates, hot, machines = [], decorOpt = {}) {
  const row = machines.slice(0, 3).map((m, i) => `<g transform="translate(${[140, 380, 620][i]} 658)">${station({ i, m })}</g>`).join('');
  return svgOpen(780, 'Quán và menu buổi sáng') + `<rect width="${VW}" height="780" fill="#F3E3C3"/>`
    + image(backgroundRows(), 0, 0) + clock() + wallSigns() + decor(decorOpt)
    + `<g transform="translate(630 305)">${standing({ pixel: OWNER }, { mood: 'smile' })}</g>` + counter(false) + row
    + `<g transform="translate(70 668)">${dog(false)}</g>` + menuBoard(lines, rates, hot) + awning(name) + frame() + hostBar() + '</svg>';
}
// Màn tiêu đề: một ca đông vui cố định (không lấy số ngẫu nhiên), không có vùng bấm
const TITLE_GUESTS = [
  { hairStyle: 'long', hair: 'k', hairShade: 'h', shirt: 'b', shirtShade: 'B', extras: ['headset'] },
  { hairStyle: 'spiky', hair: 'W', hairShade: 'v', hairLight: 'w', shirt: 'R', shirtShade: 'E', extras: ['headset'] },
  { hairStyle: 'cap', cap: 'J', capShade: 'g', shirt: 't', shirtShade: 'T' },
];
const TITLE_WALKER = { hairStyle: 'ponytail', shirt: 'o', shirtShade: 'O', pants: 'B', pantsShade: 'n', extras: ['bag'] };
function title(prices) {
  const base = { cpu: 1, gpu: 1, chair: 1, mon: 1, kb: 1, mouse: 1 };
  const row = [0, 1, 2].map(i => `<g transform="translate(${[140, 380, 620][i]} 658)">${station({
    i, m: { ...base, cpu: i + 1, gpu: i + 1, mon: i + 1, chair: i + 1, kb: i + 1 }, item: ['bowl', 'cup', null][i],
    cust: { look: TITLE_GUESTS[i], pose: ['play', 'win', 'play'][i] } })}</g>`).join('');
  return svgOpen(VH, 'Quán nhỏ có máy tính, quầy mì và chú chó') + image(backgroundRows(), 0, 0) + priceBoard(prices) + clock() + wallSigns() + decor({ net: 1 })
    + `<g transform="translate(630 305)">${standing({ pixel: OWNER }, { mood: 'smile' })}</g>` + counter(false)
    + `<g transform="translate(430 430)">${standing(TITLE_WALKER, { mood: 'happy', carry: 'bowl' })}</g>` + row
    + `<g transform="translate(70 668)">${dog(true)}</g>` + awning('Quán Nét Bất Ổn') + frame() + '</svg>';
}
// Icon món trong sổ nhập hàng và nút kho của bếp (emoji của món → icon pixel)
const itemIcon = (emoji, scale = 3) => PX.img(SPR.ICON[window.PXUI.MAP[emoji]] || SPR.ICON.noodle, { scale, cls: 'px-item' });
// Hình một dàn máy cho catalogue và bảng nâng cấp (không khách)
function preview(m, i = 0) {
  const rows = stationRows({ i, m }), w = rows[0].length * SU, h = rows.length * SU;
  return `<svg viewBox="${-w / 2} ${-h - 4} ${w} ${h + 8}" aria-hidden="true" shape-rendering="crispEdges">${station({ i, m })}</svg>`;
}

window.PSCN = { U, fromLook, OWNER, STAFF, background: () => image(backgroundRows(), 0, 0), priceBoard, clock, wallSigns, decor, awning, frame, counter,
  station, stationGlow, stationRows, standing, portrait, dog, bubble, tierOf, menuBoard, hostBar, morning, title, preview, itemIcon,
  stool: color => image(STOOL.map(r => color === 'B' ? r.replace(/R/g, 'B').replace(/E/g, 'n') : r), -35, -22) };
})();
