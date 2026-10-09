/* Quán Nét Bất Ổn — bộ vẽ pixel art dùng chung.
   Mỗi hình là một lưới ký tự (mỗi ký tự = một ô pixel, '.' = trong suốt), vẽ tay, không sinh ảnh.
   PX.svg() đổi lưới thành SVG cạnh sắc; phóng to bao nhiêu cũng không nhòe. window.PX */
(() => {
'use strict';

// ---------- Bảng màu chung (~36 màu ấm: kem, gỗ, ngọc, đất nung) ----------
const PAL = {
  k: '#2B1D22', K: '#5A3E3A',                       // viền đậm, viền nâu mềm
  z: '#FFF8EC', c: '#F3E3C3', C: '#E3CBA0', d: '#C9AD82',   // trắng ngà, kem, kem bóng, kem tối
  w: '#C08552', W: '#8A5A3B', v: '#5E3B27',         // gỗ sáng, gỗ, gỗ tối
  j: '#6CCBB2', J: '#2E9C8A', g: '#1E6B5F',         // ngọc sáng, ngọc, ngọc tối
  t: '#EBA77A', T: '#C8693F', u: '#8E4430',         // đất nung sáng, đất nung, đất nung tối
  o: '#F6CB55', O: '#D3962E',                       // vàng, vàng tối
  i: '#FADFC4', I: '#E0AE86', f: '#B97D57',         // da sáng, da ngăm, da ngăm bóng
  Y: '#C96C8C', N: '#1B2D4C',                       // hồng tối, xanh than
  D: '#8C9A52', U: '#5C6834',                       // xanh ô-liu (quân phục công an), ô-liu tối
  b: '#7DB4E3', B: '#3F6FA8', n: '#27406B',         // xanh dương
  R: '#D9534A', E: '#9E3530', y: '#F29BB8',         // đỏ, đỏ tối, hồng
  q: '#9C7BD0', Q: '#5E4691',                       // tím
  l: '#D2CBBE', L: '#8F887E', m: '#57514B',         // xám sáng, xám, xám tối
  x: '#1D2433', X: '#8EF0DA',                       // màn hình tối, ánh màn hình
  // màu thay theo nhân vật (mặc định)
  S: '#F6CDA4', s: '#DFA27C', r: '#EE8F7A', e: '#2B1D22',  // da, da bóng, má, mắt
  H: '#3B2A26', h: '#24181A', G: '#6B4A40',         // tóc, tóc bóng, vệt sáng tóc
  A: '#2E9C8A', a: '#1E6B5F',                       // áo, áo bóng
  P: '#3E4A5E', p: '#2B3444', F: '#C8693F',         // quần, quần bóng, dép
  M: '#D9534A', V: '#9E3530',                       // mũ lưỡi trai, vành mũ
};

// ---------- Lưới ----------
const grid = rows => rows.map(r => r.split(''));
const toRows = g => g.map(r => r.join(''));
// Ghi một đoạn ký tự vào lưới tại (hàng, cột); '.' trong đoạn = giữ nguyên ô cũ
function put(g, r, c, str) {
  if (!g[r]) return g;
  [...str].forEach((ch, i) => { if (ch !== '.' && g[r][c + i] !== undefined) g[r][c + i] = ch; });
  return g;
}
// Đè từng hàng của hình nhỏ lên hình lớn
function stamp(g, r0, c0, rows) {
  rows.forEach((row, i) => put(g, r0 + i, c0, row));
  return g;
}
// Lưới trống w×h
const blank = (w, h, ch = '.') => Array.from({ length: h }, () => Array(w).fill(ch));
// Viền quanh các ô có màu (dùng cho chữ logo)
function outline(g, ch = 'k', diag = true) {
  const h = g.length, w = g[0].length, out = g.map(r => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] !== '.') continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (!diag && dx && dy) continue;
      if (g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.' && g[y + dy][x + dx] !== ch) out[y][x] = ch;
    }
  }
  return out;
}
// Mở rộng lưới để có chỗ cho viền/bóng
function pad(g, n = 1) {
  const w = g[0].length + n * 2;
  return [...Array(n)].map(() => Array(w).fill('.')).concat(
    g.map(r => [...Array(n).fill('.'), ...r, ...Array(n).fill('.')]),
    [...Array(n)].map(() => Array(w).fill('.')));
}
// Bóng cứng lệch xuống dưới (kiểu chữ game)
function shadow(g, ch = 'u', dy = 1, dx = 0) {
  const out = g.map(r => r.slice());
  g.forEach((row, y) => row.forEach((v, x) => {
    if (v !== '.' && out[y + dy] && out[y + dy][x + dx] === '.') out[y + dy][x + dx] = ch;
  }));
  return out;
}

// ---------- Vẽ ra SVG ----------
// rows: mảng chuỗi hoặc lưới; map: đổi màu riêng (vd. { A: '#E86A92' }); scale: số px màn hình mỗi ô
function svg(rows, { map = {}, scale = 1, cls = '', title = '' } = {}) {
  const g = typeof rows[0] === 'string' ? grid(rows) : rows;
  const h = g.length, w = g[0].length;
  let rects = '';
  g.forEach((row, y) => {
    for (let x = 0; x < w;) {
      const ch = row[x];
      let n = 1;
      while (row[x + n] === ch) n++;
      if (ch !== '.' && ch !== ' ') {
        const fill = map[ch] || PAL[ch];
        if (!fill) throw new Error(`PX: không có màu cho ký tự "${ch}"`);
        rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${fill}"/>`;
      }
      x += n;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges"${cls ? ` class="${cls}"` : ''}${title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'}>${rects}</svg>`;
}
// Đổi ký hiệu sang màu trong bảng (vd. áo A → vàng o) để ghép nhiều hình vào một cảnh không lẫn màu
const recolor = (rows, map) => rows.map(r => [...r].map(ch => map[ch] || ch).join(''));
// Hình lớn (tường, sàn, cảnh): vẽ một lần lên canvas thành ảnh PNG, phóng to bằng CSS pixelated — nhẹ hơn nhiều so với hàng nghìn ô SVG
const cache = new Map();
function png(rows, map = {}) {
  const key = JSON.stringify(map) + rows.join('|');
  if (cache.has(key)) return cache.get(key);
  const h = rows.length, w = rows[0].length, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    ctx.fillStyle = map[ch] || PAL[ch];
    ctx.fillRect(x, y, 1, 1);
  }));
  const url = cv.toDataURL();
  cache.set(key, url);
  return url;
}
const img = (rows, { map = {}, scale = 1, cls = '', alt = '' } = {}) =>
  `<img src="${png(rows, map)}" width="${rows[0].length * scale}" height="${rows.length * scale}" style="image-rendering:pixelated"${cls ? ` class="${cls}"` : ''} alt="${alt}">`;
// Kiểm tra mọi hàng cùng độ dài (bắt lỗi khi vẽ tay)
function check(name, rows) {
  const w = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== w) throw new Error(`PX ${name}: hàng ${i} dài ${r.length}, cần ${w}`); });
  return rows;
}

// ---------- Chữ pixel cho logo (5×7, nét đôi khi vẽ) ----------
const GLYPH = {
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
  N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  Q: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..X.', '.XX.X'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};
// dấu đặt trên chữ (từ trên xuống, sát chữ chừa một hàng trống)
const MARK = {
  acute: ['...X.', '..X..'],
  circ: ['..X..', '.X.X.'],
  circAcute: ['...X.', '..X..', '.....', '..X..', '.X.X.'],
  circHook: ['.XX..', '...X.', '..X..', '.....', '..X..', '.X.X.'],
};
const LETTER = { 'Á': ['A', 'acute'], 'É': ['E', 'acute'], 'Ấ': ['A', 'circAcute'], 'Ổ': ['O', 'circHook'] };
// Logo: chữ pixel phóng đôi, tô hai tầng màu, viền đậm và bóng cứng
function logo(text, { top = 'o', bottom = 'O', line = 'k', drop = 'u' } = {}) {
  const chars = [...text.toUpperCase()];
  const accentRows = Math.max(0, ...chars.map(ch => LETTER[ch] ? MARK[LETTER[ch][1]].length + 1 : 0));
  const H = (accentRows + 7) * 2, gap = 2;
  const parts = chars.map(ch => {
    const [base, mark] = LETTER[ch] || [ch];
    const gl = GLYPH[base];
    if (!gl) throw new Error('PX.logo: chưa vẽ chữ ' + ch);
    const gw = gl[0].length * 2, g = blank(gw, H);
    const fill = (rows, r0, colorOf) => rows.forEach((row, y) => [...row].forEach((v, x) => {
      if (v !== 'X') return;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) g[(r0 + y) * 2 + dy][x * 2 + dx] = colorOf(y);
    }));
    fill(gl, accentRows, y => y < 4 ? top : bottom);
    if (mark) fill(MARK[mark], accentRows - MARK[mark].length - 1, () => top);
    return g;
  });
  const W = parts.reduce((n, g) => n + g[0].length, 0) + gap * (parts.length - 1);
  const g = blank(W, H);
  let x = 0;
  parts.forEach(p => { p.forEach((row, y) => row.forEach((v, i) => { if (v !== '.') g[y][x + i] = v; })); x += p[0].length + gap; });
  return shadow(outline(pad(g, 2), line), drop, 2);
}

window.PX = { PAL, grid, toRows, put, stamp, blank, outline, pad, shadow, svg, png, img, check, recolor, logo };
})();
