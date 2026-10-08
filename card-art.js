/* Tranh thẻ sưu tầm: vẽ SVG kiểu chibi tô bóng nhiều lớp, cùng tông ấm của quán. Chỉ vẽ, không đổi trạng thái.
   Không dùng gradient/id (url(#…)): cùng một lá hiện nhiều lần trên trang, id trùng sẽ vẽ sai khi bản đầu bị ẩn. */
(() => {
  'use strict';
  const W = 240, H = 300, GROUND = 238;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // ---------- Màu ----------
  const hex = n => '#' + n.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shade = (h, k) => hex(rgb(h).map(v => v * k));                      // k < 1: tối đi
  const tint = (h, k) => hex(rgb(h).map(v => v + (255 - v) * k));           // k 0–1: sáng lên
  const line = h => shade(h, 0.48);
  // ---------- Hình cơ bản ----------
  const attrs = (fill, stroke, w, extra = '') => ` fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}`;
  const P = (d, fill = 'none', stroke = null, w = 2.4, extra = '') => `<path d="${d}"${attrs(fill, stroke, w, extra)}/>`;
  const E = (x, y, rx, ry, fill, stroke = null, w = 2.4, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"${attrs(fill, stroke, w, extra)}/>`;
  const O = (x, y, r, fill, stroke = null, w = 2.4, extra = '') => E(x, y, r, r, fill, stroke, w, extra);
  const R = (x, y, w, h, fill, r = 4, stroke = null, sw = 2.4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"${attrs(fill, stroke, sw)}/>`;
  const G = (t, body, extra = '') => `<g transform="${t}"${extra}>${body}</g>`;
  const fade = (o, body) => `<g opacity="${o}">${body}</g>`;
  const ring = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  // Khối tô bóng: lớp tối ở đáy, lớp màu chính lệch lên trái, vệt sáng, viền cùng tông
  function blob(x, y, rx, ry, c, { stroke = true, light = true } = {}) {
    return E(x, y, rx, ry, shade(c, 0.8)) + E(x - rx * 0.07, y - ry * 0.1, rx * 0.9, ry * 0.86, c)
      + (light ? E(x - rx * 0.36, y - ry * 0.46, rx * 0.26, ry * 0.15, '#FFFFFF', null, 0, ' opacity=".5"') : '')
      + (stroke ? E(x, y, rx, ry, 'none', line(c)) : '');
  }
  // Hình tự do có bóng: vẽ hình tối, hình sáng thu nhỏ quanh tâm, rồi viền
  function shape(d, c, cx, cy, k = 0.9) {
    return P(d, shade(c, 0.8)) + G(`translate(${cx} ${cy}) scale(${k}) translate(${-cx - 2} ${-cy - 4})`, P(d, c)) + P(d, 'none', line(c));
  }
  const star = (x, y, r, c = '#FFE27A', o = 1) => P(`M${x},${y - r}Q${x + r * 0.18},${y - r * 0.18} ${x + r},${y}Q${x + r * 0.18},${y + r * 0.18} ${x},${y + r}Q${x - r * 0.18},${y + r * 0.18} ${x - r},${y}Q${x - r * 0.18},${y - r * 0.18} ${x},${y - r}Z`, c, null, 0, ` opacity="${o}"`);
  const glow = (x, y, r, c, o = 0.18, n = 4) => ring(n, i => O(x, y, r * (1 - i * 0.2), c, null, 0, ` opacity="${o}"`));
  // ---------- Mắt và mặt chibi ----------
  function face(x, y, { gap = 15, size = 1, iris = '#3A2A3E', mood = 'smile', blush = '#F49BA0', mouth = true } = {}) {
    const eye = ex => mood === 'sleep' ? P(`M${ex - 6 * size},${y} Q${ex},${y + 5 * size} ${ex + 6 * size},${y}`, 'none', '#3A2A3E', 2.4)
      : E(ex, y, 6 * size, 7.6 * size, '#2A1E2C') + E(ex, y + 2.2 * size, 4.4 * size, 4.4 * size, iris, null, 0, ' opacity=".9"')
        + O(ex - 2.2 * size, y - 3 * size, 2.4 * size, '#FFFFFF') + O(ex + 2.4 * size, y + 2.6 * size, 1.1 * size, '#FFFFFF');
    const m = !mouth ? '' : mood === 'open' ? E(x, y + 11 * size, 4 * size, 3.6 * size, '#B5475A', '#3A2A3E', 1.6)
      : P(`M${x - 5 * size},${y + 9 * size} Q${x - 2.5 * size},${y + 12.5 * size} ${x},${y + 9.5 * size} Q${x + 2.5 * size},${y + 12.5 * size} ${x + 5 * size},${y + 9 * size}`, 'none', '#3A2A3E', 1.8);
    return eye(x - gap) + eye(x + gap) + E(x - gap - 6, y + 9 * size, 6 * size, 3 * size, blush, null, 0, ' opacity=".6"')
      + E(x + gap + 6, y + 9 * size, 6 * size, 3 * size, blush, null, 0, ' opacity=".6"') + m;
  }
  // ---------- Nền theo môi trường ----------
  const ENV = {
    meadow: { sky: '#CFE8E4', far: '#A9D3B8', near: '#8CC59A', ground: '#79B07E', accent: '#F4D58A' },
    forest: { sky: '#D7E8C8', far: '#8FB98A', near: '#6E9F6E', ground: '#5E8F5F', accent: '#F6E7A2', trees: true },
    pond: { sky: '#D3ECEB', far: '#9ED0C0', near: '#7FBFA9', ground: '#6BB0C4', accent: '#F2B6C6', water: true },
    river: { sky: '#D4E9F2', far: '#9CC8B8', near: '#86BCA6', ground: '#6CA9C9', accent: '#E8F4F7', water: true },
    sky: { sky: '#BFE1F5', far: '#E9F6FC', near: '#FFFFFF', ground: '#D9EEF9', accent: '#FFF1B0', clouds: true },
    blossom: { sky: '#FBE3E6', far: '#F3C3CF', near: '#E7A7B9', ground: '#C9DDA9', accent: '#FFFFFF', petals: true },
    desert: { sky: '#FBE7C4', far: '#EFC98E', near: '#E4B271', ground: '#D9A25E', accent: '#FFF3C2', sun: true },
    snow: { sky: '#DCEBF6', far: '#BFD6EA', near: '#E8F2FA', ground: '#F4F8FC', accent: '#FFFFFF', flakes: true },
    night: { sky: '#2E3A66', far: '#3E4D7A', near: '#33456B', ground: '#2C3C5C', accent: '#FFE6A0', stars: true, moon: true },
    lantern: { sky: '#3A2E5E', far: '#4C3C70', near: '#3E3260', ground: '#33294F', accent: '#FFC56B', stars: true, lanterns: true },
    sea: { sky: '#9AD3E6', far: '#6FB6D3', near: '#4F9EC2', ground: '#3F8AB2', accent: '#E6F7FF', bubbles: true, deep: true },
    coral: { sky: '#7CC6DA', far: '#5DAFCB', near: '#4A99BC', ground: '#E7C9A0', accent: '#FF9E8F', bubbles: true, deep: true, reef: true },
    storm: { sky: '#7D8AA8', far: '#A3AEC6', near: '#C3CBDB', ground: '#E5E9F1', accent: '#FFE45C', clouds: true, bolts: true },
    volcano: { sky: '#5B2A3A', far: '#7A3540', near: '#4A2630', ground: '#3B1F27', accent: '#FF9A3D', embers: true },
    dawn: { sky: '#FFD9B8', far: '#F7B999', near: '#E89C86', ground: '#C98C78', accent: '#FFF3C2', sun: true, clouds: true },
    space: { sky: '#241E46', far: '#3B2E6A', near: '#2B2452', ground: '#1E1A3A', accent: '#C9B6FF', stars: true, nebula: true },
  };
  function backdrop(env, seed) {
    const e = ENV[env], s = [];
    s.push(R(-4, -4, W + 8, H + 8, e.sky, 0));
    // dải trời nhạt dần (không gradient): vài lớp chồng mờ
    s.push(ring(4, i => R(-4, 120 + i * 22, W + 8, 200, e.far, 0)).replace(/rx="0"/g, 'rx="0" opacity=".12"'));
    if (e.nebula) s.push(fade(0.35, O(70, 80, 70, '#7A5CC8') + O(180, 120, 60, '#C25CA8') + O(130, 60, 40, '#5C8FD8')));
    if (e.stars) s.push(ring(22, i => O((i * 53 + seed * 17) % W, (i * 37 + seed * 11) % 170 + 6, i % 5 ? 1.2 : 2, '#FFFFFF', null, 0, ` opacity="${0.4 + (i % 3) * 0.2}"`)));
    if (e.moon) s.push(glow(190, 52, 34, '#FFF1C4', 0.12) + O(190, 52, 17, '#FFF1C4') + O(197, 47, 14, e.sky));
    if (e.sun) s.push(glow(184, 64, 44, '#FFF1C4', 0.16) + O(184, 64, 20, '#FFF0B8'));
    if (e.clouds) s.push(cloud(48, 70, 1, e.near) + cloud(186, 110, 0.8, e.far) + cloud(110, 40, 0.6, e.near));
    if (e.deep) s.push(ring(5, i => P(`M${-10 + i * 55},0 L${20 + i * 55},0 L${-30 + i * 55 + 60},${H} L${-60 + i * 55 + 60},${H}Z`, '#FFFFFF', null, 0, ' opacity=".06"')));
    // đồi xa, đồi gần
    if (!e.deep) {
      s.push(P(`M-4,${GROUND - 70} Q40,${GROUND - 110} 92,${GROUND - 78} T190,${GROUND - 90} T244,${GROUND - 70} V${H} H-4Z`, e.far));
      if (e.trees) s.push(ring(6, i => tree(14 + i * 44, GROUND - 74 + (i % 2) * 8, 0.7 + (i % 3) * 0.12, shade(e.near, 0.9))));
      if (env === 'volcano') s.push(P(`M60,${GROUND - 60} L104,${GROUND - 150} L132,${GROUND - 150} L184,${GROUND - 60}Z`, e.far) + P(`M104,${GROUND - 150} Q118,${GROUND - 120} 132,${GROUND - 150}`, e.accent, null, 0) + glow(118, GROUND - 160, 30, e.accent, 0.15));
      s.push(P(`M-4,${GROUND - 34} Q60,${GROUND - 62} 120,${GROUND - 40} T244,${GROUND - 44} V${H} H-4Z`, e.near));
    } else {
      s.push(P(`M-4,${GROUND - 20} Q60,${GROUND - 40} 120,${GROUND - 24} T244,${GROUND - 30} V${H} H-4Z`, e.near, null, 0, ' opacity=".7"'));
    }
    s.push(P(`M-4,${GROUND - 8} Q70,${GROUND - 20} 130,${GROUND - 8} T244,${GROUND - 10} V${H + 4} H-4Z`, e.ground));
    if (e.water) s.push(P(`M-4,${GROUND - 4} Q60,${GROUND - 12} 130,${GROUND - 4} T244,${GROUND - 6} V${H + 4} H-4Z`, e.ground) + ring(5, i => P(`M${20 + i * 45},${GROUND + 14 + (i % 2) * 18} h22`, 'none', tint(e.ground, 0.5), 2.4)));
    if (e.reef) s.push(coralTuft(26, GROUND + 6, '#FF8F7E') + coralTuft(214, GROUND + 2, '#F7B05C') + coralTuft(196, GROUND + 18, '#C784D8'));
    if (env === 'desert') s.push(ring(3, i => P(`M${30 + i * 80},${GROUND + 20 + i * 8} q14,-8 28,0`, 'none', shade(e.ground, 0.85), 2)));
    if (env === 'forest' || env === 'meadow' || env === 'blossom') s.push(ring(5, i => tuft(18 + i * 52, GROUND + 26 + (i % 2) * 14, shade(e.ground, 0.8))));
    return s.join('');
  }
  // Lớp phía trước (hạt bay) theo môi trường
  function foreground(env, seed) {
    const e = ENV[env];
    if (e.flakes) return ring(16, i => O((i * 47 + seed * 9) % W, (i * 31 + seed * 5) % H, i % 3 ? 1.8 : 2.8, '#FFFFFF', null, 0, ' opacity=".8"'));
    if (e.petals) return ring(9, i => G(`translate(${(i * 61 + seed * 13) % W} ${(i * 43 + seed * 7) % (H - 40)}) rotate(${i * 40})`, E(0, 0, 4, 2.4, '#F6B9C9')));
    if (e.bubbles) return ring(9, i => O((i * 59 + seed * 7) % W, (i * 37 + seed * 3) % (H - 30), 2 + (i % 3) * 1.5, 'none', '#FFFFFF', 1.4, ' opacity=".7"'));
    if (e.embers) return ring(12, i => O((i * 41 + seed * 9) % W, (i * 29 + seed * 13) % (H - 30), 1.6 + (i % 2), '#FFB35C', null, 0, ' opacity=".85"'));
    if (e.lanterns) return ring(3, i => lantern(30 + i * 90, 44 + (i % 2) * 24, 0.6));
    if (e.bolts) return P('M200,40 l-14,30 h12 l-16,34', 'none', '#FFE45C', 3) + P('M38,60 l-10,22 h9 l-12,26', 'none', '#FFE45C', 2.4);
    return '';
  }
  // ---------- Hiệu ứng theo độ hiếm (sau lưng và trước mặt nhân vật) ----------
  function aura(rarity, x, y, c) {
    if (rarity === 'basic') return '';
    if (rarity === 'rare') return ring(3, i => star(x - 70 + i * 70, y - 80 + (i % 2) * 30, 5, '#FFFFFF', 0.8));
    if (rarity === 'epic') return glow(x, y, 92, c, 0.1) + ring(5, i => star(x - 86 + i * 43, y - 96 + (i % 2) * 40, 5 + (i % 2) * 2, '#FFFFFF', 0.85));
    const rays = (col, n, o) => ring(n, i => G(`translate(${x} ${y}) rotate(${i * (360 / n)})`, P('M-6,0 L6,0 L22,-240 L-22,-240Z', col, null, 0, ` opacity="${o}"`)));
    if (rarity === 'legend') return rays('#FFE7A0', 12, 0.22) + glow(x, y, 96, '#FFE7A0', 0.14);
    return rays('#FFB3E2', 8, 0.2) + G(`rotate(22 ${x} ${y})`, rays('#9FE8FF', 8, 0.16)) + glow(x, y, 100, '#E6D2FF', 0.16)
      + ring(3, i => O(x, y, 70 + i * 22, 'none', ['#FFB3E2', '#9FE8FF', '#FFE7A0'][i], 1.6, ' opacity=".45"'));
  }
  function twinkles(rarity, seed) {
    if (!['epic', 'legend', 'mythic'].includes(rarity)) return '';
    const n = rarity === 'epic' ? 4 : rarity === 'legend' ? 6 : 9;
    return ring(n, i => star((i * 71 + seed * 19) % 220 + 10, (i * 53 + seed * 7) % 240 + 20, 3 + (i % 3) * 2, i % 2 ? '#FFFFFF' : '#FFE27A', 0.9));
  }
  // ---------- Chi tiết dùng lại ----------
  const cloud = (x, y, k, c) => G(`translate(${x} ${y}) scale(${k})`, O(-20, 6, 16, c) + O(0, -4, 22, c) + O(22, 6, 16, c) + R(-36, 4, 74, 18, c, 9));
  const tree = (x, y, k, c) => G(`translate(${x} ${y}) scale(${k})`, R(-4, 10, 8, 30, shade(c, 0.6), 2) + O(0, 0, 22, c) + O(-12, 10, 15, c) + O(12, 10, 15, c));
  const tuft = (x, y, c) => P(`M${x - 8},${y} q4,-12 8,-14 q-1,8 1,14 q3,-10 9,-12 q-3,7 -2,12Z`, c);
  const coralTuft = (x, y, c) => P(`M${x},${y} v-26 m0,10 q-10,-4 -12,-16 m12,10 q10,-6 12,-18`, 'none', c, 6);
  const leaf = (x, y, rot, c, k = 1) => G(`translate(${x} ${y}) rotate(${rot}) scale(${k})`, P('M0,0 Q-14,-22 0,-40 Q14,-22 0,0Z', c, line(c), 2) + P('M0,-4 V-34', 'none', line(c), 1.4));
  const flower = (x, y, c, k = 1) => G(`translate(${x} ${y}) scale(${k})`, ring(5, i => E(0, -7, 4.6, 7, c, line(c), 1.2, ` transform="rotate(${i * 72})"`)) + O(0, 0, 3.6, '#FFE27A'));
  function lantern(x, y, k = 1) {
    return G(`translate(${x} ${y}) scale(${k})`, glow(0, 10, 26, '#FFC56B', 0.18) + P('M0,-16 V-6', 'none', '#6B4A2F', 2) + R(-10, -6, 20, 4, '#6B4A2F', 2)
      + E(0, 10, 14, 16, '#F2784B', '#8A3B22', 2) + E(-3, 6, 5, 9, '#FFC56B', null, 0, ' opacity=".85"') + P('M-14,10 H14 M0,-6 V26', 'none', '#B9502E', 1.4) + R(-6, 25, 12, 4, '#6B4A2F', 2));
  }
  const shadow = (x, w) => E(x, GROUND + 8, w, 9, '#000000', null, 0, ' opacity=".16"');
  // ---------- Bộ sinh vật chibi ----------
  // Bốn chân ngồi: thân, đầu to, tai/đuôi/mõm thay theo loài
  function critter(c, o = {}) {
    const belly = o.belly || tint(c, 0.6), x = 120, by = 196, hy = o.headY || 140, ink = line(c);
    const ears = {
      cat: P(`M${x - 40},${hy - 10} L${x - 34},${hy - 52} L${x - 10},${hy - 30}Z M${x + 40},${hy - 10} L${x + 34},${hy - 52} L${x + 10},${hy - 30}Z`, c, ink) + P(`M${x - 33},${hy - 20} L${x - 31},${hy - 42} L${x - 18},${hy - 29}Z M${x + 33},${hy - 20} L${x + 31},${hy - 42} L${x + 18},${hy - 29}Z`, '#F7B6B6'),
      fox: P(`M${x - 42},${hy - 6} L${x - 38},${hy - 62} L${x - 8},${hy - 30}Z M${x + 42},${hy - 6} L${x + 38},${hy - 62} L${x + 8},${hy - 30}Z`, c, ink) + P(`M${x - 36},${hy - 18} L${x - 34},${hy - 50} L${x - 16},${hy - 30}Z M${x + 36},${hy - 18} L${x + 34},${hy - 50} L${x + 16},${hy - 30}Z`, '#3A2A3E', null, 0, ' opacity=".55"'),
      round: O(x - 34, hy - 34, 14, c, ink) + O(x + 34, hy - 34, 14, c, ink) + O(x - 34, hy - 34, 7, '#F7C3B6') + O(x + 34, hy - 34, 7, '#F7C3B6'),
      mouse: O(x - 38, hy - 30, 22, c, ink) + O(x + 38, hy - 30, 22, c, ink) + O(x - 38, hy - 30, 13, '#F7B6C6') + O(x + 38, hy - 30, 13, '#F7B6C6'),
      bunny: G(`rotate(-10 ${x - 18} ${hy - 30})`, E(x - 18, hy - 66, 13, 38, c, ink) + E(x - 18, hy - 62, 6, 26, '#F7B6C6')) + G(`rotate(12 ${x + 18} ${hy - 30})`, E(x + 18, hy - 66, 13, 38, c, ink) + E(x + 18, hy - 62, 6, 26, '#F7B6C6')),
      wolf: P(`M${x - 40},${hy - 6} L${x - 30},${hy - 60} L${x - 6},${hy - 32}Z M${x + 40},${hy - 6} L${x + 30},${hy - 60} L${x + 6},${hy - 32}Z`, c, ink),
      none: '',
    }[o.ears || 'cat'];
    const tails = {
      fox: shape(`M${x + 30},${by + 20} Q${x + 100},${by + 10} ${x + 86},${by - 70} Q${x + 70},${by - 20} ${x + 34},${by - 6}Z`, c, x + 70, by - 10) + P(`M${x + 88},${by - 70} Q${x + 98},${by - 44} ${x + 92},${by - 30} L${x + 76},${by - 44}Z`, o.tipColor || '#FFF6E3', line(c)),
      cat: P(`M${x + 34},${by + 14} Q${x + 86},${by + 10} ${x + 74},${by - 44}`, 'none', ink, 15) + P(`M${x + 34},${by + 14} Q${x + 86},${by + 10} ${x + 74},${by - 44}`, 'none', c, 10),
      thin: P(`M${x + 34},${by + 16} Q${x + 92},${by + 28} ${x + 86},${by - 10}`, 'none', o.tailColor || '#E7A7B5', 4),
      bushy: shape(`M${x + 28},${by + 18} Q${x + 92},${by + 24} ${x + 80},${by - 40} Q${x + 60},${by - 10} ${x + 30},${by - 2}Z`, c, x + 60, by),
      none: '',
    }[o.tail || 'cat'];
    const body = blob(x, by, 46, 40, c) + E(x, by + 8, 26, 24, belly) + blob(x - 26, by + 34, 16, 10, c) + blob(x + 26, by + 34, 16, 10, c);
    const head = blob(x, hy, 52, 44, c) + (o.muzzle ? E(x, hy + 18, 22, 14, belly) + O(x, hy + 8, 4.4, '#3A2A3E') : '') + (o.marks || '');
    return tails + body + ears + head + face(x, hy + (o.muzzle ? -2 : 4), { gap: 19, iris: o.iris || '#4A3A6E', mood: o.mood, mouth: !o.muzzle }) + (o.muzzle ? P(`M${x - 6},${hy + 14} Q${x},${hy + 20} ${x + 6},${hy + 14}`, 'none', '#3A2A3E', 1.8) : '') + (o.extra || '');
  }
  // Chim tròn: thân trứng, cánh nhỏ hoặc dang rộng, đuôi lông vũ cho phượng hoàng
  function birdy(c, o = {}) {
    const x = 120, y = 178, ink = line(c), wing = o.wing || shade(c, 0.9);
    const plume = (k, col) => G(`translate(${x} ${y + 24}) rotate(${k})`, P('M0,0 C26,10 66,8 98,-6 C84,14 52,30 0,14Z', col, line(col), 2) + O(84, -2, 6, '#FFE27A', line(col), 1.4) + O(84, -2, 2.6, shade(col, 0.7)));
    const plumes = o.plumes ? [10, 30, 50].map((k, i) => plume(k, o.plumes[i % o.plumes.length]) + G(`translate(${2 * x} 0) scale(-1 1)`, plume(k, o.plumes[(i + 1) % o.plumes.length]))).join('') : '';
    const right = shape(`M${x + 26},${y - 14} C${x + 60},${y - 60} ${x + 96},${y - 96} ${x + 112},${y - 108} C${x + 112},${y - 86} ${x + 104},${y - 74} ${x + 96},${y - 68} C${x + 104},${y - 58} ${x + 98},${y - 44} ${x + 86},${y - 40} C${x + 92},${y - 28} ${x + 82},${y - 16} ${x + 70},${y - 14} C${x + 72},${y - 2} ${x + 58},${y + 6} ${x + 40},${y + 4}Z`, wing, x + 70, y - 46)
      + P(`M${x + 40},${y - 22} L${x + 92},${y - 82} M${x + 44},${y - 10} L${x + 82},${y - 42}`, 'none', line(wing), 1.8);
    const wings = o.spread ? right + G(`translate(${2 * x} 0) scale(-1 1)`, right) : blob(x - 42, y + 6, 16, 28, wing) + blob(x + 42, y + 6, 16, 28, wing);
    return plumes + wings + P(`M${x - 14},${y + 46} v14 m-8,0 h16 M${x + 14},${y + 46} v14 m-8,0 h16`, 'none', '#D98A3C', 3.4)
      + blob(x, y, 44, 50, c) + E(x, y + 14, 28, 30, o.belly || tint(c, 0.6))
      + (o.crest ? ring(3, i => P(`M${x - 8 + i * 8},${y - 42} Q${x - 18 + i * 12},${y - 70} ${x - 2 + i * 10},${y - 78}`, 'none', o.crest, 4)) : '')
      + face(x, y - 12, { gap: 16, iris: o.iris || '#3E4E7E', mouth: false }) + P(`M${x - 7},${y + 2} L${x},${y + 13} L${x + 7},${y + 2}Z`, '#F7B23B', '#A8641E', 1.8) + (o.extra || '');
  }
  // Rồng phương Đông: thân uốn S bằng nét dày nhiều lớp
  function dragon(c, o = {}) {
    const d = o.path || 'M168,250 C230,200 200,140 140,170 C80,200 40,150 70,110 C92,80 126,96 128,100';
    const ink = line(c);
    const body = P(d, 'none', o.mane || '#F7A65C', 10, ' stroke-dasharray="5 12" transform="translate(-3 -18)"') + P(d, 'none', ink, 40) + P(d, 'none', c, 34) + P(d, 'none', o.belly || tint(c, 0.55), 12, ' stroke-dasharray="10 8"')
      + P(d, 'none', '#FFFFFF', 4, ' opacity=".35" transform="translate(-6 -6)"');
    const hx = o.hx || 118, hy = o.hy || 96;
    const horns = P(`M${hx - 18},${hy - 24} Q${hx - 30},${hy - 56} ${hx - 12},${hy - 66} M${hx + 18},${hy - 24} Q${hx + 30},${hy - 56} ${hx + 12},${hy - 66}`, 'none', o.horn || '#F2D08A', 6);
    const mane = ring(5, i => P(`M${hx - 30 + i * 4},${hy - 6 + i * 6} l-22,${4 + i * 2}`, 'none', o.mane || '#F7A65C', 5));
    const whisk = P(`M${hx - 20},${hy + 18} Q${hx - 60},${hy + 26} ${hx - 70},${hy + 6} M${hx + 20},${hy + 18} Q${hx + 60},${hy + 26} ${hx + 70},${hy + 6}`, 'none', o.horn || '#F2D08A', 3);
    return body + mane + horns + blob(hx, hy, 40, 32, c) + E(hx, hy + 18, 24, 13, tint(c, 0.55)) + O(hx - 8, hy + 16, 2.4, ink) + O(hx + 8, hy + 16, 2.4, ink)
      + face(hx, hy - 4, { gap: 16, size: 0.9, iris: o.iris || '#C8473C', mouth: false }) + whisk + (o.extra || '');
  }
  function deer(c, o = {}) {
    const ink = line(c), legs = [86, 102, 138, 154].map((lx, i) => R(lx - 6, 196, 12, 42, i % 3 ? c : shade(c, 0.85), 5, ink) + E(lx, 238, 8, 4, o.hoof || '#6B4A2F')).join('');
    const antler = o.antler || '#8A6A4A';
    return P('M90,96 L74,54 L86,32 M80,68 L58,58 M150,96 L166,54 L154,32 M160,68 L182,58', 'none', antler, 6) + (o.antlerTips || '')
      + (o.tail || P('M164,196 q20,-12 16,-30 q-8,14 -20,14', c, ink)) + legs + blob(120, 200, 52, 28, c) + ring(4, i => O(96 + i * 16, 196 - (i % 2) * 6, 3.4, '#FFF6E3', null, 0, ' opacity=".9"'))
      + P('M104,186 Q112,160 112,150 L130,150 Q132,166 138,186Z', c, ink) + P('M84,118 L62,104 L72,130 M156,118 L178,104 L168,130', tint(c, 0.2), ink)
      + blob(120, 132, 36, 34, tint(c, 0.15)) + E(120, 150, 16, 10, tint(c, 0.55)) + O(120, 146, 3, '#3A2A3E') + face(120, 128, { gap: 14, size: 0.82, iris: o.iris || '#5A9E6A', mouth: false }) + (o.extra || '');
  }
  const spikes = (x, y, rx, ry, n, c) => ring(n, i => { const a = Math.PI * (0.9 + i * 1.2 / (n - 1)), px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry; return P(`M${px - 9},${py} L${px + Math.cos(a) * 18},${py + Math.sin(a) * 18} L${px + 9},${py}Z`, c, line(c), 1.8); });
  // ---------- 40 sinh vật huyền bí ----------
  // env: nền · fn: nhân vật · aura: màu hào quang (Epic+)
  const MYSTIC = {
    1: { env: 'meadow', glow: '#BDF2C9', fn: () => leaf(96, 120, -30, '#8FD18A', 1.5) + leaf(144, 120, 30, '#8FD18A', 1.5) + blob(120, 182, 54, 50, '#EAF7DE') + leaf(120, 230, 180, '#7CC27A', 0.9) + E(120, 206, 30, 16, '#B9E3A8') + face(120, 176, { gap: 18, iris: '#3E8E5E' }) + O(84, 132, 7, '#E6F7FF', '#9CCFE0', 1.6) + O(166, 150, 5, '#E6F7FF', '#9CCFE0', 1.4) + O(150, 112, 4, '#E6F7FF', '#9CCFE0', 1.2) },
    2: { env: 'night', glow: '#FFE38A', fn: () => R(96, 168, 48, 66, '#F3E3C3', 18, line('#F3E3C3')) + face(120, 196, { gap: 13, size: 0.85 }) + shape('M48,170 Q50,96 120,90 Q190,96 192,170 Q120,186 48,170Z', '#E8955A', 120, 140) + ring(5, i => O(70 + i * 25, 132 + (i % 2) * 14, 8 - (i % 2) * 2, '#FFF1C4')) + ring(6, i => glow(40 + (i * 37) % 170, 70 + (i * 29) % 120, 7, '#FFE38A', 0.4, 2) + O(40 + (i * 37) % 170, 70 + (i * 29) % 120, 2.4, '#FFF6B0')) },
    3: { env: 'pond', glow: '#BFE6B0', fn: () => blob(176, 204, 22, 18, '#9CCB8E') + blob(70, 228, 18, 10, '#9CCB8E') + blob(160, 230, 18, 10, '#9CCB8E') + blob(112, 194, 66, 44, '#7FA86A') + ring(4, i => P(`M${84 + i * 20},${172 + (i % 2) * 10} l9,-8 h12 l6,10 l-6,10 h-12Z`, '#A9C98A', line('#7FA86A'), 1.6)) + P('M70,176 Q112,146 156,174', 'none', '#5E8F4A', 6) + leaf(108, 160, -10, '#6FBF6E', 0.8) + flower(130, 158, '#F7B6C6', 0.9) + blob(186, 186, 30, 26, '#A8D49A') + face(188, 184, { gap: 11, size: 0.75 }) },
    4: { env: 'sky', glow: '#FFFFFF', fn: () => cloud(120, 236, 1.6, '#FFFFFF') + critter('#FDFDFF', { ears: 'bunny', tail: 'none', iris: '#7A8FD8', belly: '#EEF3FF' }) + cloud(64, 214, 0.7, '#F2F6FF') + cloud(180, 220, 0.6, '#F2F6FF') },
    5: { env: 'forest', glow: '#CBE8A0', fn: () => birdy('#9CC27A', { wing: '#7EA860', belly: '#E8F2C8', crest: '#6FA850', iris: '#D8A23A', extra: leaf(84, 120, -40, '#8FD18A', 0.7) + leaf(156, 120, 40, '#8FD18A', 0.7) + R(56, 236, 128, 10, '#8A5A3B', 5) }) },
    6: { env: 'river', glow: '#BFE6F5', fn: () => ring(10, i => P(`M${(i * 29) % 230},${(i * 47) % 120 + 20} l-4,12`, 'none', '#7FB8D6', 2)) + shape('M120,108 Q170,170 160,206 Q140,240 100,232 Q66,222 72,184 Q80,150 120,108Z', '#8ECFE6', 118, 190) + P('M154,200 L196,176 L190,224Z', '#6FB6D3', line('#6FB6D3')) + E(104, 190, 10, 7, '#FFFFFF', null, 0, ' opacity=".6"') + face(116, 196, { gap: 13, size: 0.85, iris: '#2F6E96' }) },
    7: { env: 'pond', glow: '#F7D6E8', fn: () => blob(108, 222, 70, 18, '#E8D3BC') + O(132, 168, 46, '#F4DDE9', line('#E0B8D0')) + P('M132,168 m-34,0 a34,34 0 1 1 34,34 a22,22 0 1 1 -22,-22 a12,12 0 1 1 12,12', 'none', '#C99AC0', 4) + O(118, 150, 6, '#FFFFFF', null, 0, ' opacity=".7"') + blob(70, 206, 24, 24, '#E8D3BC') + P('M62,186 L56,164 M78,186 L84,164', 'none', line('#E8D3BC'), 3) + O(56, 162, 4, '#F7B6C6') + O(84, 162, 4, '#F7B6C6') + face(70, 206, { gap: 9, size: 0.6 }) },
    8: { env: 'pond', glow: '#C8EBC0', fn: () => E(120, 238, 88, 16, '#6FB46E', line('#6FB46E')) + flower(54, 232, '#F7B6C6', 1.6) + blob(120, 200, 50, 36, '#8FCB7A') + blob(88, 166, 20, 20, '#8FCB7A') + blob(152, 166, 20, 20, '#8FCB7A') + E(120, 184, 46, 32, '#8FCB7A') + face(120, 176, { gap: 32, size: 0.9, iris: '#4E7A2E' }) + E(120, 210, 28, 16, '#E8F2C8') + flower(120, 146, '#F7B6C6', 1.1) },
    9: { env: 'night', glow: '#D8B8F0', fn: () => shape('M96,170 Q40,120 20,150 Q36,160 30,184 Q56,170 70,196Z', '#8C6AB8', 60, 168) + shape('M144,170 Q200,120 220,150 Q204,160 210,184 Q184,170 170,196Z', '#8C6AB8', 180, 168) + critter('#B08AD8', { ears: 'fox', tail: 'none', iris: '#E05A7A', extra: ring(5, i => O(98 + i * 11, 214 - (i % 2) * 8, 7, '#C8406A', line('#C8406A'), 1.6)) + leaf(120, 206, 0, '#6FBF6E', 0.5) }) },
    10: { env: 'forest', glow: '#F2C890', fn: () => spikes(120, 150, 54, 50, 11, '#9A6A42') + spikes(120, 190, 50, 40, 7, '#8A5A3B') + critter('#C99A6A', { ears: 'round', tail: 'none', muzzle: true, belly: '#F3DDBF', extra: G('translate(120 220)', E(0, 0, 16, 13, '#8A5A3B', line('#8A5A3B')) + P('M-16,-2 Q0,-16 16,-2', '#C9A27A', line('#8A5A3B'), 2)) }) },
    11: { env: 'sky', glow: '#FFF1B0', fn: () => P('M120,50 V96', 'none', '#B98E5A', 3) + ring(4, i => R(88 + i * 18, 96, 6, 34 + (i % 2) * 12, '#E8C46A', 2, line('#E8C46A'), 1.6)) + R(80, 92, 82, 6, '#B98E5A', 3) + birdy('#F7DA8E', { wing: '#F2C36A', belly: '#FFF3D2', iris: '#3E6E9E' }) },
    12: { env: 'desert', glow: '#FFE0A8', fn: () => P('M150,214 Q214,226 206,254', 'none', line('#E3A96A'), 14) + P('M150,214 Q214,226 206,254', 'none', '#E3A96A', 9) + blob(118, 210, 52, 30, '#E3A96A') + P('M78,218 l-18,16 M156,222 l18,16 M84,200 l-20,-8 M152,198 l20,-8', 'none', line('#E3A96A'), 7) + blob(112, 166, 46, 34, '#EDBB7E') + ring(4, i => O(96 + i * 14, 204 + (i % 2) * 4, 4, '#FFF0C8')) + face(112, 166, { gap: 18 }) },
    13: { env: 'meadow', glow: '#D6F2FF', fn: () => fade(0.75, E(76, 168, 30, 50, '#DDF3FF', '#8CC6E0', 2, ' transform="rotate(-24 76 168)"') + E(164, 168, 30, 50, '#DDF3FF', '#8CC6E0', 2, ' transform="rotate(24 164 168)"')) + P('M86,214 l-24,14 M154,214 l24,14 M90,196 l-26,0 M150,196 l26,0', 'none', '#3A4E4A', 4) + blob(120, 196, 38, 42, '#4FA394') + P('M120,158 V236', 'none', line('#4FA394'), 3) + blob(120, 150, 28, 22, '#4FA394') + P('M108,132 Q100,110 92,108 M132,132 Q140,110 148,108', 'none', '#3A4E4A', 3) + face(120, 150, { gap: 11, size: 0.75 }) },
    14: { env: 'snow', glow: '#E8F2FF', fn: () => fade(0.5, cloud(60, 230, 1.2, '#FFFFFF') + cloud(190, 220, 1, '#FFFFFF')) + critter('#E6EEF2', { ears: 'cat', tail: 'cat', iris: '#6A9AC8', belly: '#FFFFFF' }) + fade(0.6, cloud(120, 248, 1.3, '#FFFFFF')) },
    15: { env: 'night', glow: '#FFE27A', fn: () => critter('#A9B4D6', { ears: 'mouse', tail: 'thin', iris: '#3E4E8E', extra: star(120, 214, 16, '#FFE27A') + glow(120, 214, 26, '#FFE27A', 0.2, 2) }) },
    16: { env: 'lantern', glow: '#FFC56B', fn: () => critter('#F0A866', { ears: 'fox', tail: 'fox', iris: '#8E4A1E', belly: '#FFF1DC', extra: P('M170,190 Q186,160 182,140', 'none', '#6B4A2F', 3) + lantern(182, 152, 0.95) }) },
    17: { env: 'night', glow: '#FFF1C4', fn: () => critter('#C9D6EA', { ears: 'cat', tail: 'cat', iris: '#E8B83A', marks: P('M112,102 A13,13 0 1 0 128,116 A10,10 0 0 1 112,102Z', '#FFE27A', null, 0) }) },
    18: { env: 'river', glow: '#BFF2F0', fn: () => critter('#8FB8A8', { ears: 'round', tail: 'bushy', muzzle: true, belly: '#E2F0E6', extra: P('M104,196 L120,176 L136,196 L120,226Z', '#BFF2F5', '#4FA3B8', 2.4) + P('M104,196 H136 M120,176 V226', 'none', '#4FA3B8', 1.4) + glow(120, 200, 26, '#BFF2F5', 0.2, 2) }) },
    19: { env: 'blossom', glow: '#FFD0DC', fn: () => birdy('#F6B9C9', { spread: true, wing: '#F9D2DC', belly: '#FFF0F4', crest: '#E88AA4', extra: flower(62, 100, '#FFFFFF', 0.9) + flower(178, 96, '#FFFFFF', 0.9) + flower(120, 228, '#F48FAE', 1) }) },
    20: { env: 'forest', glow: '#B8F2C8', fn: () => P('M80,238 C20,210 60,170 120,186 C180,202 210,170 176,136', 'none', line('#5DBB8A'), 30) + P('M80,238 C20,210 60,170 120,186 C180,202 210,170 176,136', 'none', '#5DBB8A', 24) + P('M80,238 C20,210 60,170 120,186 C180,202 210,170 176,136', 'none', '#B8F2C8', 6, ' stroke-dasharray="6 10"') + blob(166, 122, 34, 28, '#5DBB8A') + face(168, 122, { gap: 13, size: 0.8, iris: '#2E7E5A' }) + P('M188,138 l10,8 l-2,-10', 'none', '#E8506A', 2) + P('M150,96 l-6,-12 M180,96 l6,-12', 'none', '#F2D08A', 4) },
    21: { env: 'snow', glow: '#CDE6FF', fn: () => critter('#9FB8D6', { ears: 'wolf', tail: 'bushy', muzzle: true, belly: '#EAF2FA', iris: '#3A8ED8', marks: P('M100,112 l20,14 l20,-14', 'none', '#6E8AB0', 4) }) },
    22: { env: 'forest', glow: '#FFD580', fn: () => critter('#D9A36A', { ears: 'round', tail: 'none', muzzle: true, belly: '#F6DDB3', extra: glow(120, 212, 30, '#FFD580', 0.25, 3) + R(98, 192, 44, 40, '#F7C24A', 10, line('#F7C24A')) + R(98, 192, 44, 10, '#B98E5A', 4) + P('M106,210 q4,8 0,14', 'none', '#FFF1B0', 3) }) },
    23: { env: 'meadow', glow: '#E6D8FF', fn: () => fade(0.85, E(78, 146, 44, 56, '#D6EEFF', '#8FB8E0', 2.4, ' transform="rotate(-20 78 146)"') + E(162, 146, 44, 56, '#EADCFF', '#B09AE0', 2.4, ' transform="rotate(20 162 146)"') + E(90, 214, 30, 30, '#EADCFF', '#B09AE0', 2.4) + E(150, 214, 30, 30, '#D6EEFF', '#8FB8E0', 2.4)) + E(70, 136, 14, 20, '#FFFFFF', null, 0, ' opacity=".6"') + blob(120, 190, 13, 48, '#F2DFA8') + blob(120, 130, 20, 18, '#F2DFA8') + face(120, 130, { gap: 8, size: 0.55, mouth: false }) + P('M112,114 Q100,92 92,94 M128,114 Q140,92 148,94', 'none', '#6B4A2F', 2.4) },
    24: { env: 'sea', glow: '#BFF0F5', fn: () => P('M120,240 C150,230 150,196 130,190 C100,180 100,140 126,132', 'none', line('#5FB8C8'), 30) + P('M120,240 C150,230 150,196 130,190 C100,180 100,140 126,132', 'none', '#5FB8C8', 24) + P('M120,240 C150,230 150,196 130,190', 'none', '#BFF0F5', 6, ' stroke-dasharray="4 6"') + P('M126,240 q18,8 10,24 q-14,-4 -10,-24', '#5FB8C8', line('#5FB8C8')) + blob(132, 118, 30, 26, '#5FB8C8') + P('M156,122 h28 q6,0 6,6 h-30', '#5FB8C8', line('#5FB8C8')) + P('M110,96 l-10,-20 l14,8 l2,-16 l10,16', '#BFF0F5', line('#5FB8C8'), 2) + face(130, 116, { gap: 11, size: 0.75, iris: '#1E5E7E' }) + P('M40,200 q20,-20 40,0 t40,0', 'none', '#FFFFFF', 3, ' opacity=".6"') },
    25: { env: 'coral', glow: '#FFC0B0', fn: () => P('M70,206 L44,226 M76,220 L58,246 M170,206 L196,226 M164,220 L182,246', 'none', line('#F07A62'), 6) + shape('M74,176 Q40,180 34,150 L22,124 L44,134 L48,112 L66,140 Q72,160 80,160Z', '#F07A62', 52, 146) + shape('M166,176 Q200,180 206,150 L218,124 L196,134 L192,112 L174,140 Q168,160 160,160Z', '#F07A62', 188, 146) + blob(120, 196, 52, 36, '#F07A62') + P('M100,170 V146 M140,170 V146', 'none', line('#F07A62'), 4) + O(100, 140, 10, '#FFFFFF', line('#F07A62')) + O(140, 140, 10, '#FFFFFF', line('#F07A62')) + O(102, 142, 5, '#2A1E2C') + O(142, 142, 5, '#2A1E2C') + P('M110,206 Q120,214 130,206', 'none', '#3A2A3E', 2) + coralTuft(96, 176, '#FFC0B0') + coralTuft(146, 178, '#C784D8') },
    26: { env: 'night', glow: '#D8F2C8', fn: () => deer('#C6B0E0', { antlerTips: leaf(86, 32, -20, '#8FD18A', 0.5) + leaf(154, 32, 20, '#8FD18A', 0.5) + leaf(58, 58, -60, '#8FD18A', 0.5) + leaf(182, 58, 60, '#8FD18A', 0.5), extra: P('M112,98 A12,12 0 1 0 128,112 A9,9 0 0 1 112,98Z', '#FFF1C4') }) },
    27: { env: 'blossom', glow: '#FFC0D8', fn: () => birdy('#F48FAE', { spread: true, wing: '#F9B8CC', belly: '#FFE3EC', crest: '#FFD84A', plumes: ['#F48FAE', '#FFD84A', '#F9B8CC'], extra: flower(70, 96, '#FFFFFF', 1) + flower(170, 92, '#FFFFFF', 1) + flower(120, 64, '#FFD84A', 0.9) }) },
    28: { env: 'storm', glow: '#FFF6A0', fn: () => cloud(120, 248, 1.8, '#D8DEEA') + critter('#F6F4EE', { ears: 'round', tail: 'cat', muzzle: true, iris: '#3A8ED8', belly: '#FFFFFF', marks: P('M86,128 l14,4 M84,140 l14,0 M154,128 l-14,4 M156,140 l-14,0 M112,102 l8,10 l8,-10', 'none', '#3A3A4A', 4), extra: P('M58,90 l-12,24 h12 l-14,28', 'none', '#FFE45C', 4) + P('M186,84 l-12,24 h12 l-14,28', 'none', '#FFE45C', 4) }) },
    29: { env: 'space', glow: '#C9B6FF', fn: () => cloud(60, 240, 1.2, '#E6DCFF') + cloud(186, 246, 1.1, '#E6DCFF') + shape('M36,170 Q40,118 110,116 Q178,114 192,150 L222,126 L218,190 L188,172 Q160,214 100,212 Q40,212 36,170Z', '#9C8AD8', 120, 166) + P('M50,184 Q110,214 170,186', '#E6DCFF', line('#9C8AD8'), 2) + O(60, 150, 5, '#2A1E2C') + O(58, 148, 1.6, '#FFFFFF') + ring(5, i => O(90 + i * 18, 140 + (i % 2) * 8, 2.4, '#FFFFFF', null, 0, ' opacity=".8"')) + R(92, 82, 44, 36, '#C98A5A', 4, line('#C98A5A')) + P('M86,84 L114,58 L142,84Z', '#E86A6A', line('#E86A6A')) + R(104, 94, 12, 12, '#FFE38A', 2) + R(120, 94, 10, 24, '#8A5A3B', 2) + glow(110, 100, 14, '#FFE38A', 0.3, 2) + leaf(84, 118, -70, '#6FBF6E', 0.5) + leaf(144, 118, 70, '#6FBF6E', 0.5) },
    30: { env: 'space', glow: '#E6D8FF', fn: () => fade(0.7, ring(6, i => G(`translate(120 150) rotate(${i * 30})`, P('M-110,0 H110', 'none', '#DCCFFF', 1.4))) + ring(3, i => O(120, 150, 30 + i * 28, 'none', '#DCCFFF', 1.4))) + ring(5, i => star(60 + i * 30, 70 + (i % 2) * 150, 5, '#FFE27A')) + P('M96,170 L66,130 L40,128 M94,184 L56,166 L34,176 M98,196 L58,210 L40,232 M144,170 L174,130 L200,128 M146,184 L184,166 L206,176 M142,196 L182,210 L200,232', 'none', '#4A3E6E', 5) + blob(120, 204, 30, 28, '#9C8AD8') + blob(120, 160, 34, 32, '#B4A4E6') + face(120, 160, { gap: 12, size: 0.8, iris: '#FFE27A' }) + ring(4, i => O(106 + i * 9, 144, 2, '#2A1E2C')) },
    31: { env: 'volcano', glow: '#FF9A3D', fn: () => P('M150,214 Q214,222 206,254', 'none', line('#E2603A'), 16) + P('M150,214 Q214,222 206,254', 'none', '#E2603A', 11) + blob(118, 208, 50, 32, '#E2603A') + P('M80,216 l-18,16 M156,220 l18,16', 'none', line('#E2603A'), 8) + blob(114, 162, 46, 36, '#EC7A4A') + P('M92,196 l14,10 l-6,12 M132,190 l-6,14 l16,10', 'none', '#FFD24A', 4) + P('M96,142 l10,6 l-4,10 M130,140 l-6,10', 'none', '#FFD24A', 3) + face(114, 166, { gap: 18, iris: '#FFD24A' }) },
    32: { env: 'snow', glow: '#DDEEFF', fn: () => birdy('#E6EEF6', { spread: true, wing: '#C9D8EA', belly: '#FFFFFF', crest: '#8FB0D0', iris: '#E8A23A', extra: P('M44,94 l14,26 l8,-22 M182,100 l10,22 l10,-28', 'none', '#9FC6E8', 4) }) },
    33: { env: 'sky', glow: '#BFF0E0', fn: () => dragon('#7CCBB4', { mane: '#F2F6FF', horn: '#F2D08A' }) + cloud(60, 236, 1, '#FFFFFF') + cloud(190, 250, 1.1, '#FFFFFF') },
    34: { env: 'coral', glow: '#FFB8C8', fn: () => dragon('#F28FA0', { mane: '#FFD6A0', horn: '#FFFFFF', iris: '#2E7E8E', extra: coralTuft(84, 70, '#FFFFFF') + coralTuft(152, 70, '#FFFFFF') }) },
    35: { env: 'dawn', glow: '#FFE07A', fn: () => birdy('#F7A04A', { spread: true, wing: '#FFC864', belly: '#FFE8B8', crest: '#FF6A4A', plumes: ['#FF6A4A', '#FFC864', '#F7A04A'], iris: '#B8401E' }) + glow(120, 160, 70, '#FFE07A', 0.12) },
    36: { env: 'forest', glow: '#C8F0B0', fn: () => blob(190, 204, 26, 22, '#6E8E6A') + blob(66, 232, 22, 12, '#6E8E6A') + blob(170, 234, 22, 12, '#6E8E6A') + blob(116, 200, 76, 48, '#4E6E5A') + ring(5, i => P(`M${70 + i * 22},${180 + (i % 2) * 10} l10,-9 h14 l7,11 l-7,11 h-14Z`, '#6E8E6A', '#2E4E3A', 1.6)) + R(108, 76, 18, 110, '#8A5A3B', 4, line('#8A5A3B')) + O(116, 76, 44, '#6FA86A', line('#6FA86A')) + O(80, 98, 30, '#8FC27A', line('#8FC27A')) + O(152, 100, 32, '#8FC27A', line('#8FC27A')) + ring(4, i => O(90 + i * 20, 70 + (i % 2) * 20, 4, '#FFE27A')) + blob(200, 184, 30, 26, '#6E8E6A') + face(202, 182, { gap: 11, size: 0.72, iris: '#C8A23A' }) },
    37: { env: 'lantern', glow: '#FFC56B', fn: () => ring(9, i => G(`translate(120 206) rotate(${-80 + i * 20})`, P('M0,0 Q-22,-50 0,-112 Q22,-50 0,0Z', i % 2 ? '#F7D6A8' : '#FFF1DC', line('#E8B07A'), 2) + lantern(0, -112, 0.42))) + critter('#FFF1DC', { ears: 'fox', tail: 'none', iris: '#C8401E', belly: '#FFFFFF', marks: P('M112,104 l8,-10 l8,10', 'none', '#E86A4A', 3) }) },
    38: { env: 'space', glow: '#E6C8FF', fn: () => deer('#ECE4FF', { antler: '#FFE27A', iris: '#B05CE8', hoof: '#B8A8E8', tail: P('M164,196 Q214,186 206,140 Q192,172 160,178', '#9FE8FF', line('#9FE8FF')), antlerTips: star(86, 32, 7) + star(154, 32, 7) + star(58, 58, 6) + star(182, 58, 6), extra: P('M120,104 L114,78 L120,60 L126,78Z', '#FFE27A', line('#E8B83A'), 1.6) + P('M98,112 Q120,100 142,112', 'none', '#9FE8FF', 6) + ring(4, i => star(96 + i * 16, 206 + (i % 2) * 8, 4, '#B8A8E8')) }) },
    39: { env: 'space', glow: '#B8A8FF', fn: () => dragon('#6E5CB8', { mane: '#C9B6FF', horn: '#FFE27A', iris: '#FFE27A', path: 'M190,250 C240,190 170,150 120,180 C60,214 20,160 50,120 C76,86 120,100 122,100', extra: O(196, 72, 16, '#C9B6FF') + O(204, 66, 13, '#3B2E6A') + star(60, 210, 10, '#FFE27A') }) },
    40: { env: 'dawn', glow: '#FFD0A0', fn: () => O(120, 236, 70, '#FFE8B8') + birdy('#FFB86A', { spread: true, wing: '#FFD9A0', belly: '#FFF3D8', crest: '#FF8A6A', plumes: ['#FF8A6A', '#FFD9A0', '#F7B6C6'], iris: '#B8401E' }) },
  };
  // ---------- Bộ nội bộ: đồ vật có mặt và người trong quán ----------
  const ROOM = {
    room: { wall: '#F4E3BE', band: '#9CCDBC', bandLine: '#74B3A3', floor: '#EFE3C8', floorLine: '#D9C4A0' },
    kitchen: { wall: '#FBEBD0', band: '#BFE0EA', bandLine: '#8FC0D0', floor: '#E8D8BC', floorLine: '#CDB892', shelf: true },
    night: { wall: '#4E4A6E', band: '#3E5E6E', bandLine: '#2E4A58', floor: '#3E3A58', floorLine: '#2E2A46', glow: true },
  };
  function room(kind, seed) {
    const r = ROOM[kind], s = [];
    s.push(R(-4, -4, W + 8, H + 8, r.wall, 0));
    s.push(ring(6, i => O((i * 47 + seed * 13) % W, (i * 29 + seed * 7) % 130 + 10, 26, '#FFFFFF', null, 0, ` opacity="${kind === 'night' ? 0.03 : 0.08}"`)));
    // trang trí tường thay theo lá: cửa sổ, poster, đồng hồ, kệ
    const deco = seed % 4;
    if (deco === 0) s.push(R(150, 30, 70, 58, kind === 'night' ? '#2A3058' : '#BFE3F2', 6, '#8A6A4A', 4) + P('M185,30 V88 M150,59 H220', 'none', '#8A6A4A', 3) + (kind === 'night' ? O(200, 46, 6, '#FFF1C4') : cloud(170, 48, 0.35, '#FFFFFF')));
    if (deco === 1) s.push(R(24, 30, 52, 66, '#E86A92', 4, '#8A3B52', 3) + O(50, 56, 12, '#FFE27A') + R(32, 76, 36, 6, '#FFF6E3', 2) + R(160, 36, 54, 70, '#5A8FE0', 4, '#2E4E8A', 3) + star(187, 66, 14, '#FFE27A'));
    if (deco === 2) s.push(O(186, 58, 22, '#FFF6E3', '#8A6A4A', 4) + P('M186,58 V44 M186,58 L196,64', 'none', '#3A2A22', 3) + leaf(36, 120, -10, '#6FBF6E', 1.1) + R(26, 118, 22, 22, '#C9905E', 4, '#8A5A3B', 2));
    if (deco === 3) s.push(R(20, 84, 200, 8, '#B98E5A', 3, '#8A5A3B', 2) + ring(5, i => R(30 + i * 38, 60, 20, 24, ['#F07A5A', '#7CC0AE', '#F2CB57', '#8E6BD8', '#EFA6AB'][i], 4, '#3A2A22', 1.6)));
    if (r.shelf) s.push(R(14, 100, 90, 7, '#B98E5A', 3) + ring(3, i => E(34 + i * 28, 94, 11, 6, '#FFFFFF', '#8FC0D0', 2)));
    s.push(R(-4, 150, W + 8, 40, r.band, 0) + P(`M-4,170 H${W + 4}` + ring(7, i => ` M${i * 40},150 V190`), 'none', r.bandLine, 1.4));
    s.push(R(-4, 190, W + 8, H, r.floor, 0) + P(`M-4,230 H${W + 4} M-4,268 H${W + 4} M40,190 L20,${H} M110,190 L104,${H} M180,190 L196,${H}`, 'none', r.floorLine, 1.4));
    if (r.glow) s.push(glow(60, 120, 50, '#5FF2DC', 0.08) + glow(190, 110, 40, '#A57BFF', 0.08));
    return s.join('');
  }
  // Đồ vật nhân hóa: thêm mặt và đổ bóng chung
  const objFace = (x, y, k = 0.75, mood = 'smile') => face(x, y, { gap: 13 * k + 4, size: k, mood, iris: '#3A2A3E' });
  const box = (x, y, w, h, c, r = 8) => R(x, y, w, h, shade(c, 0.8), r) + R(x, y, w - 5, h - 6, c, r) + R(x + 6, y + 5, w * 0.3, 5, '#FFFFFF', 2).replace('/>', ' opacity=".5"/>') + R(x, y, w, h, 'none', r, line(c));
  const keysRow = (x, y, n, c = '#E4E1D6') => ring(n, i => R(x + i * 13, y, 10, 9, c, 2, '#8A8A90', 1.2));
  function keyboard(x, y, k, worn = false) {
    return G(`translate(${x} ${y}) scale(${k})`, box(-70, -26, 140, 52, '#4A4C56', 8) + ring(3, row => keysRow(-62 + row * 4, -18 + row * 13, 9 - (row ? 1 : 0), worn && row === 1 ? '#C9C5B6' : '#E4E1D6')) + (worn ? P('M-40,-6 h8 M-14,7 h8 M12,-6 h8', 'none', '#8A8A90', 2) : ''));
  }
  function monitor(x, y, k, screen = '#7CC0AE', faceOn = true) {
    return G(`translate(${x} ${y}) scale(${k})`, R(-8, 30, 16, 20, '#4A4C56', 2) + R(-30, 48, 60, 8, '#4A4C56', 4) + box(-50, -36, 100, 70, '#3A3C46', 8) + R(-42, -28, 84, 52, screen, 4) + (faceOn ? objFace(0, -6, 0.7) : ''));
  }
  function actor(kind) {
    const A = window.ART;
    if (!A?.standingSVG) return blob(120, 180, 40, 60, '#49B7A8');
    const L = { ...A.OWNER_LOOK, apron: false, towel: false, style: 'tee', shirt: '#49B7A8', trim: '#137A70', accent: '#1FA89A' };
    let mood = 'smile', carry = null, extra = '', back = '';
    if (kind === 'gamer') { Object.assign(L, { shirt: '#2B2D35', trim: '#424655', headset: true }); back = monitor(120, 132, 1.25, '#E8506A', false) + ring(3, i => star(70 + i * 50, 70 + (i % 2) * 20, 6, '#FFE27A')); extra = keyboard(120, 236, 0.9); }
    if (kind === 'staff') { Object.assign(L, { hairStyle: 'ponytail', shirt: '#F07A5A', apron: true }); carry = 'cup'; extra = G('translate(186 196) scale(.8)', P('M-18,0 Q0,-40 18,0Z', '#9FD0E8', line('#9FD0E8')) + R(-3, -30, 6, 34, '#8A6A4A', 2)) + G('translate(56 206)', box(-16, -20, 32, 30, '#F7C24A', 6)); }
    if (kind === 'credit') { Object.assign(L, { hairStyle: 'bun', shirt: '#8E6BD8', glasses: true }); extra = G('translate(182 190)', box(-22, -16, 44, 30, '#F3DFB1', 5) + R(-14, -8, 28, 10, '#7CC0AE', 2)) + star(56, 90, 10) + star(186, 74, 7); }
    if (kind === 'cook') { Object.assign(L, { shirt: '#F7F3EA', apron: true, towel: true }); carry = 'bowl'; extra = ring(3, i => P(`M${92 + i * 28},${80} q-10,-14 0,-28 q10,-14 0,-28`, 'none', '#FFFFFF', 4, ' opacity=".8"')); }
    if (kind === 'night') { Object.assign(L, { style: 'hoodie', shirt: '#668BA9', trim: '#4A5A78', headset: true, beard: true }); mood = 'idle'; back = monitor(120, 132, 1.25, '#5FB8E8', false); extra = G('translate(196 214)', R(-10, -22, 20, 26, '#FFFFFF', 3, '#8A8A90', 2) + P('M-2,-30 q-4,-8 2,-14', 'none', '#FFFFFF', 2.4)); }
    if (kind === 'accountant') { Object.assign(L, { style: 'cardigan', shirt: '#C9A27A', trim: '#94603A', inner: '#FFF6E3', hairStyle: 'bob', glasses: true }); extra = G('translate(184 196)', box(-18, -26, 36, 48, '#FFF6E3', 4) + P('M-10,-14 h20 M-10,-4 h20 M-10,6 h14', 'none', '#8A6A4A', 2)) + G('translate(56 200)', box(-16, -12, 32, 24, '#5A8FE0', 4) + O(0, 0, 4, '#FFE27A')); }
    if (kind === 'repair') { Object.assign(L, { shirt: '#5A8FE0', hairStyle: 'side' }); extra = G('translate(186 184)', box(-18, -30, 36, 60, '#4A4C56', 5) + O(0, 0, 9, '#7CC0AE') + P('M-6,-6 L6,6 M-6,6 L6,-6', 'none', '#3A2A22', 2)) + G('translate(54 210) rotate(-30)', R(-4, -26, 8, 34, '#B9C0C4', 3, '#6A7078', 2) + O(0, -28, 8, 'none', '#6A7078', 4)); }
    if (kind === 'mom') { Object.assign(L, { style: 'blouse', shirt: '#8E6BD8', trim: '#6B4DAD', hairStyle: 'bun', helmet: '#E2463A', pattern: 'dots' }); mood = 'angry'; extra = P('M54,92 l14,10 M58,110 l16,2 M186,92 l-14,10 M182,110 l-16,2', 'none', '#E2463A', 4) + G('translate(190 170) rotate(20)', R(-6, -40, 12, 50, '#B98E5A', 5, '#8A5A3B', 2)); }
    if (kind === 'leader') { Object.assign(L, { hairStyle: 'ponytail', shirt: '#E86A92', headset: true }); extra = G('translate(52 240) scale(.72)', A.standingSVG({ ...L, shirt: '#5A8FE0', hairStyle: 'cap', cap: '#1FA89A' }, { mood: 'smile' })) + G('translate(190 240) scale(.72)', A.standingSVG({ ...L, shirt: '#F2CB57', hairStyle: 'side' }, { mood: 'smile' })) + P('M100,40 h40 l-6,10 h-28Z', '#FFE27A', line('#FFE27A')); }
    if (kind === 'guard') { Object.assign(L, { hair: '#8A8F9A', hairStyle: 'cap', cap: '#4A5A78', shirt: '#4A5A78', trim: '#30415C', beard: true }); extra = G('translate(176 170)', R(-4, -6, 30, 12, '#D6D4CA', 3, '#6A7078', 2) + P('M26,-8 L74,-30 L74,30 L26,8Z', '#FFF1C4', null, 0, ' opacity=".35"')); }
    if (kind === 'veteran') { Object.assign(L, { shirt: '#A86F45', trim: '#6D4428', hairStyle: 'side', headset: true, beard: true, glasses: true }); mood = 'idle'; back = ring(3, i => G(`translate(${70 + i * 50} ${70 + (i % 2) * 16})`, R(-14, -18, 28, 36, '#FFD24A', 4, '#B98A2A', 2) + R(-6, 18, 12, 10, '#B98A2A', 2))); }
    if (kind === 'owner') { Object.assign(L, A.OWNER_LOOK); carry = 'bowl'; back = glow(120, 140, 90, '#FFE27A', 0.14); }
    return back + shadow(120, 44) + G('translate(120 244) scale(1.42)', A.standingSVG(L, { mood, carry, owner: kind === 'owner' })) + extra;
  }
  // env: room/kitchen/night · fn: tranh
  const CAFE = {
    1: { env: 'room', glow: '#FFB3A0', fn: () => R(80, 196, 12, 46, '#D8454A', 4, line('#E85A5A')) + R(148, 196, 12, 46, '#D8454A', 4, line('#E85A5A')) + box(64, 100, 112, 90, '#E85A5A', 16) + ring(3, i => R(78, 116 + i * 18, 84, 7, '#C8404A', 3)) + box(60, 184, 120, 18, '#E85A5A', 6) + objFace(120, 140, 0.8) + G('translate(150 112) rotate(30)', R(-12, -5, 24, 10, '#F3DFB1', 3, '#C9A27A', 1.4)) },
    2: { env: 'room', glow: '#D6D8E0', fn: () => P('M120,98 C120,60 160,60 170,40 S200,20 214,30', 'none', '#4A4C56', 5) + shape('M120,96 C70,96 64,170 78,200 C92,232 148,232 162,200 C176,170 170,96 120,96Z', '#5A5C68', 120, 164) + P('M120,98 V150 M74,150 H166', 'none', '#2E3038', 2.4) + R(114, 112, 12, 26, '#D6D4CA', 5) + objFace(120, 182, 0.8) },
    3: { env: 'room', glow: '#C9F0E0', fn: () => keyboard(120, 200, 1.4, true) + objFace(120, 162, 0.9) + P('M76,140 l-10,-12 M164,140 l10,-12', 'none', '#8A8A90', 3) },
    4: { env: 'room', glow: '#D6D8E0', fn: () => P('M64,180 C50,70 190,70 176,180', 'none', '#3A3C46', 16) + P('M64,180 C50,70 190,70 176,180', 'none', '#5A5C68', 10) + box(46, 150, 36, 74, '#3A3C46', 14) + box(158, 150, 36, 74, '#3A3C46', 14) + R(52, 160, 22, 54, '#B98E5A', 9) + R(166, 160, 22, 54, '#B98E5A', 9) + P('M56,176 l8,6 l-6,8 M172,196 l8,-6', 'none', '#E8D3B0', 3) + objFace(120, 170, 0.85) },
    5: { env: 'room', glow: '#BFD8F0', fn: () => box(30, 150, 180, 86, '#5A7FA8', 10) + R(42, 160, 156, 66, '#6E92BA', 6) + P('M30,226 l-8,8 M44,236 l-6,10 M196,236 l8,8 M210,220 l10,4', 'none', '#B9C0C4', 2.4) + objFace(120, 186, 0.9) + G('translate(170 196)', shape('M0,-26 C-24,-26 -24,26 0,26 C24,26 24,-26 0,-26Z', '#E4E1D6', 0, 0)) },
    6: { env: 'kitchen', glow: '#BFF0E0', fn: () => R(110, 176, 20, 50, '#7CC0AE', 4, line('#7CC0AE')) + E(120, 230, 46, 10, '#7CC0AE', line('#7CC0AE')) + O(120, 128, 60, '#E8F6F0', line('#7CC0AE'), 3) + ring(3, i => G(`translate(120 128) rotate(${i * 120 + 20})`, P('M0,0 Q-10,-50 26,-44 Q44,-14 0,0Z', '#9FD8C8', line('#7CC0AE'), 2))) + O(120, 128, 16, '#F3DFB1', line('#C9A27A')) + objFace(120, 126, 0.55) + P('M190,100 q10,10 0,20 M200,92 q14,18 0,36 M48,100 q-10,10 0,20 M38,92 q-14,18 0,36', 'none', '#5FA898', 2.4) + P('M58,128 H182 M120,66 V190', 'none', '#7CC0AE', 1.4, ' opacity=".5"') },
    7: { env: 'kitchen', glow: '#FFE0A0', fn: () => P('M76,110 L88,232 H152 L164,110Z', '#F2B85A', line('#F2B85A')) + P('M80,140 L88,232 H152 L160,140Z', '#E89A3A', null, 0, ' opacity=".7"') + ring(3, i => G(`translate(${100 + i * 20} ${128 + (i % 2) * 14}) rotate(${i * 20})`, R(-10, -10, 20, 20, '#E6F7FF', 4, '#9FD0E8', 2))) + P('M74,108 H166', 'none', '#FFFFFF', 4, ' opacity=".7"') + P('M142,60 L130,180', 'none', '#E85A5A', 6) + objFace(120, 196, 0.75) + E(98, 160, 6, 18, '#FFFFFF', null, 0, ' opacity=".35"') },
    8: { env: 'room', glow: '#FFF6B0', fn: () => P('M28,200 C10,160 60,140 70,110', 'none', '#3A3C46', 6) + box(50, 170, 160, 50, '#F6F2E8', 12) + ring(4, i => R(66 + i * 36, 184, 22, 20, '#E4E1D6', 5, '#8A8A90', 1.6) + R(72 + i * 36, 189, 3, 9, '#3A3C46', 1) + R(81 + i * 36, 189, 3, 9, '#3A3C46', 1)) + O(196, 194, 6, '#E8506A') + G('translate(96 150)', box(-12, -24, 24, 28, '#3A3C46', 4) + P('M0,-24 C0,-60 40,-60 60,-80', 'none', '#3A3C46', 5)) + objFace(140, 140, 0.8) },
    9: { env: 'room', glow: '#FFD0B0', fn: () => [[84, 196, -12], [156, 196, 12]].map(([x, y, a]) => G(`translate(${x} ${y}) rotate(${a})`, shape('M0,-62 C30,-62 32,62 0,62 C-32,62 -30,-62 0,-62Z', '#5A8FE0', 0, 0) + ring(6, i => O(-8 + (i % 2) * 16, -38 + Math.floor(i / 2) * 22, 5, '#3E6EB8')) + P('M-26,-20 Q0,6 26,-20', 'none', '#3E6EB8', 9) + objFace(0, 20, 0.55))).join('') },
    10: { env: 'room', glow: '#D0F0FF', fn: () => monitor(120, 150, 1.4, '#BFE3F2', true) + G('translate(176 176) rotate(-20)', shape('M-26,-22 Q0,-34 26,-22 L30,22 Q0,30 -30,22Z', '#F7B6C6', 0, 0) + P('M-20,-6 h40 M-20,6 h40', 'none', '#E88AA4', 2)) + star(70, 110, 8, '#FFFFFF') + star(96, 96, 5, '#FFFFFF') },
    11: { env: 'room', glow: '#C8E6FF', fn: () => ring(4, i => P(`M${60 + i * 8},${170 + i * 4} C${-10 + i * 6},${90} ${210 - i * 10},${60 + i * 8} ${196 - i * 4},${150} C${190},${230} ${40 + i * 8},${230} ${70 + i * 10},${150} C${90},${110} ${170 - i * 6},${120} ${160},${180}`, 'none', ['#5A8FE0', '#7CC0AE', '#8E6BD8', '#F2CB57'][i], 6)) + R(40, 150, 22, 30, '#E4E1D6', 3, '#8A8A90', 2) + R(178, 196, 22, 30, '#E4E1D6', 3, '#8A8A90', 2) + objFace(120, 162, 0.85, 'open') },
    12: { env: 'room', glow: '#F6E0A0', fn: () => box(46, 74, 148, 156, '#A86F45', 8) + R(56, 84, 128, 136, '#2E4A40', 4) + P('M70,110 H130 M70,138 H120 M70,166 H136 M70,194 H118', 'none', '#FFF6E3', 3.4) + P('M146,110 h22 M140,138 h28 M150,166 h18 M144,194 h24', 'none', '#FFE27A', 3.4) + objFace(156, 232, 0.6) + P('M76,240 l-14,18 M164,240 l14,18', 'none', '#8A5A3B', 6) },
    13: { env: 'room', glow: '#FFE27A', fn: () => box(52, 150, 136, 80, '#C9905E', 8) + P('M52,150 L44,112 L188,96 L188,150Z', '#E0B07A', line('#C9905E')) + ring(3, i => R(66 + i * 22, 160 + i * 3, 50, 30, ['#9FD8C8', '#C9C790', '#F7B6C6'][i], 2, line('#9FD8C8'), 1.4)) + ring(5, i => O(70 + i * 24, 220 + (i % 2) * 8, 10, '#F2CB57', '#C98A10', 2) + P(`M${66 + i * 24},${220 + (i % 2) * 8} h8`, 'none', '#C98A10', 1.6)) + objFace(120, 128, 0.7) },
    14: { env: 'room', glow: '#F6E0A0', fn: () => P('M130,180 L156,40', 'none', line('#B98E5A'), 12) + P('M130,180 L156,40', 'none', '#B98E5A', 8) + shape('M102,168 L150,176 L172,244 H70Z', '#E8B84A', 120, 206) + ring(6, i => P(`M${82 + i * 16},${214} l${-4 + i * 2},28`, 'none', '#C9902A', 2)) + R(104, 168, 50, 14, '#E85A5A', 4, line('#E85A5A')) + objFace(124, 204, 0.7) + ring(4, i => O(40 + i * 12, 236 - i * 6, 3, '#C9B48A', null, 0, ' opacity=".7"')) },
    15: { env: 'room', glow: '#C8F0FF', fn: () => box(52, 84, 136, 150, '#FFF6E3', 10) + ring(3, i => P(`M${120 - 18 - i * 16},${150 - i * 14} Q120,${126 - i * 22} ${120 + 18 + i * 16},${150 - i * 14}`, 'none', '#1FA89A', 7)) + O(120, 162, 7, '#1FA89A') + R(70, 186, 100, 12, '#E4E1D6', 4) + R(80, 206, 80, 10, '#E4E1D6', 4) + P('M82,192 h8 m6,0 h8 m6,0 h8 m6,0 h8', 'none', '#3A3C46', 3) + P('M120,84 V60', 'none', '#8A6A4A', 3) + O(120, 58, 4, '#8A6A4A') + objFace(152, 112, 0.5) },
    16: { env: 'kitchen', glow: '#FFE6A0', fn: () => P('M72,120 L86,234 H154 L168,120Z', '#FFFDF4', line('#E8D3B0')) + R(70, 112, 100, 14, '#E85A5A', 4, line('#E85A5A')) + R(80, 150, 80, 26, '#E85A5A', 3) + P('M90,163 h60', 'none', '#FFFFFF', 3) + ring(3, i => P(`M${92 + i * 28},100 q-10,-14 0,-28 q10,-14 0,-28`, 'none', '#FFFFFF', 5, ' opacity=".85"')) + objFace(120, 200, 0.75, 'open') + P('M150,112 L172,40', 'none', '#C9A27A', 4) + P('M158,112 L184,44', 'none', '#C9A27A', 4) },
    17: { env: 'room', glow: '#BFF0E0', fn: () => box(56, 100, 128, 132, '#4A4C56', 10) + O(120, 160, 44, '#B9C0C4', line('#B9C0C4')) + O(120, 160, 10, '#6A7078') + P('M120,160 L150,130', 'none', '#3A3C46', 4) + ring(4, i => G(`translate(${72 + i * 32} 214)`, R(-12, -10, 24, 20, ['#E8506A', '#5A8FE0', '#7CC0AE', '#F2CB57'][i], 4, '#2E3038', 1.6))) + objFace(120, 118, 0.55) + O(172, 112, 3.4, '#4FE38A') },
    18: { env: 'night', glow: '#9FE8FF', fn: () => ring(3, i => P(`M${84 + i * 36},150 L${74 + i * 46},${70 - (i % 2) * 14}`, 'none', '#3A3C46', 7) + O(74 + i * 46, 70 - (i % 2) * 14, 6, '#3A3C46')) + box(48, 146, 144, 60, '#E4E1D6', 12) + ring(5, i => O(72 + i * 24, 192, 4.6, ['#4FE38A', '#4FE38A', '#FFE27A', '#4FE38A', '#5FB8E8'][i]) + glow(72 + i * 24, 192, 9, '#4FE38A', 0.15, 2)) + objFace(120, 168, 0.75) + ring(3, i => P(`M${150 + i * 10},${100 - i * 10} q12,-10 24,0`, 'none', '#9FE8FF', 3, ' opacity=".7"')) },
    19: { env: 'kitchen', glow: '#FFC0B0', fn: () => ring(5, i => G(`translate(${72 + i * 24} ${146 + (i % 2) * 6})`, R(-9, -40, 18, 50, ['#E85A5A', '#7CC0AE', '#F2B85A', '#5FB8E8', '#E86A92'][i], 6, '#3A2A22', 1.8) + R(-5, -50, 10, 12, '#E4E1D6', 2, '#8A8A90', 1.4) + R(-8, -24, 16, 12, '#FFF6E3', 1))) + box(48, 150, 144, 86, '#E85A5A', 8) + R(60, 160, 120, 18, '#C8404A', 4) + objFace(120, 200, 0.8) },
    20: { env: 'room', glow: '#C8D6FF', fn: () => box(78, 58, 86, 120, '#3A3C46', 22) + R(92, 72, 58, 92, '#5A7FA8', 16) + R(112, 104, 22, 18, '#E8D3B0', 3) + P('M112,104 l22,18 M134,104 l-22,18', 'none', '#B98E5A', 2) + box(70, 168, 102, 30, '#5A7FA8', 10) + P('M120,198 V230 M120,228 L84,240 M120,228 L156,240', 'none', '#3A3C46', 7) + objFace(121, 92, 0.6) + P('M62,150 h16 M162,150 h16', 'none', '#3A3C46', 8) },
    21: { env: 'room', glow: '#FFFFFF', fn: () => P('M92,150 Q76,230 110,250 L160,250 Q140,220 150,150Z', '#FFFDF4', line('#E8D3B0')) + P('M104,180 h34 M100,196 h30 M104,212 h36 M108,228 h26', 'none', '#B9B4A8', 2) + box(56, 92, 128, 70, '#4A4C56', 10) + R(76, 146, 88, 10, '#2E3038', 3) + O(168, 112, 4, '#4FE38A') + objFace(116, 118, 0.7) },
    22: { env: 'kitchen', glow: '#FFE6A0', fn: () => E(120, 214, 76, 26, '#FFFDF4', line('#E8D3B0')) + P('M44,176 Q120,276 196,176Z', '#FFFDF4', line('#E8D3B0')) + P('M54,186 Q120,252 186,186', 'none', '#7CC0AE', 3) + E(120, 178, 72, 18, '#F3D27A', line('#E8B84A')) + ring(5, i => P(`M${70 + i * 20},${176} q8,-8 16,0`, 'none', '#E8B84A', 2)) + G('translate(96 168)', E(0, 0, 26, 18, '#FFFFFF', line('#E8D3B0')) + O(0, 0, 11, '#F7B23B') + objFace(0, -2, 0.42)) + G('translate(150 164) rotate(-20)', R(-28, -9, 56, 18, '#D77853', 9, line('#D77853')) + objFace(0, -4, 0.4)) + leaf(130, 150, 20, '#7CC27A', 0.4) },
    23: { env: 'room', glow: '#FFE27A', fn: () => G('rotate(-8 120 160)', box(42, 100, 156, 100, '#1FA89A', 12) + R(54, 116, 40, 30, '#F2CB57', 5, '#B98A2A', 1.6) + P('M58,124 h32 M58,131 h32 M58,138 h32', 'none', '#B98A2A', 1.2) + star(160, 126, 18, '#FFE27A') + R(56, 176, 100, 8, '#FFFFFF', 3, null) + P('M58,166 h60', 'none', '#BFF0E8', 4)) + objFace(126, 200, 0.6) },
    24: { env: 'kitchen', glow: '#C8F0FF', fn: () => box(62, 46, 116, 196, '#F6F2E8', 14) + P('M62,108 H178', 'none', line('#F6F2E8'), 3) + R(158, 70, 8, 26, '#B9C0C4', 3) + R(158, 126, 8, 40, '#B9C0C4', 3) + objFace(116, 82, 0.6) + R(74, 120, 76, 110, '#BFE3F2', 6) + ring(6, i => R(80 + (i % 3) * 22, 126 + Math.floor(i / 3) * 50, 14, 40, ['#E85A5A', '#7CC0AE', '#F2B85A'][i % 3], 4, '#3A2A22', 1.4)) },
    25: { env: 'night', glow: '#FF8A8A', fn: () => R(150, 60, 50, 14, '#B9C0C4', 4, '#6A7078', 2) + P('M176,74 V100', 'none', '#6A7078', 6) + G('rotate(16 120 130)', box(46, 92, 130, 74, '#F6F2E8', 14) + R(36, 84, 150, 18, '#E4E1D6', 6, '#8A8A90', 2) + O(78, 130, 26, '#3A3C46', '#2E3038', 3) + O(78, 130, 14, '#5A7FA8') + O(72, 124, 5, '#FFFFFF') + objFace(136, 126, 0.55) + O(160, 104, 4, '#E85A5A')) + glow(160, 104, 12, '#E85A5A', 0.25, 2) + P('M60,170 L20,280 H160Z', '#FFF1C4', null, 0, ' opacity=".12"') },
    26: { env: 'night', glow: '#FF8AA0', fn: () => actor('gamer') },
    27: { env: 'room', glow: '#FFC0A0', fn: () => actor('staff') },
    28: { env: 'room', glow: '#D8C0FF', fn: () => actor('credit') },
    29: { env: 'kitchen', glow: '#FFE6A0', fn: () => actor('cook') },
    30: { env: 'night', glow: '#9FD8FF', fn: () => actor('night') },
    31: { env: 'room', glow: '#F0D8B0', fn: () => actor('accountant') },
    32: { env: 'room', glow: '#BFE0FF', fn: () => actor('repair') },
    33: { env: 'room', glow: '#FF9A9A', fn: () => actor('mom') },
    34: { env: 'room', glow: '#FFC0D8', fn: () => actor('leader') },
    35: { env: 'night', glow: '#FFF1C4', fn: () => actor('guard') },
    36: { env: 'night', glow: '#FFD24A', fn: () => actor('veteran') },
    37: { env: 'night', glow: '#C9A0FF', fn: () => ring(3, i => G(`translate(${60 + i * 60} 0)`, monitor(0, 120 + (i === 1 ? -10 : 0), i === 1 ? 1 : 0.8, ['#E8506A', '#5FB8E8', '#4FE38A'][i], false))) + box(26, 186, 188, 16, '#8A5A3B', 4) + keyboard(120, 214, 0.9) + G('translate(198 206)', box(-16, -40, 32, 60, '#2E3038', 6) + ring(3, i => O(0, -26 + i * 14, 4, ['#E8506A', '#5FB8E8', '#4FE38A'][i]))) + P('M20,190 H220', 'none', '#FF6AD0', 3, ' opacity=".8"') + P('M20,196 H220', 'none', '#5FF2DC', 3, ' opacity=".6"') },
    38: { env: 'room', glow: '#FFE27A', fn: () => actor('owner') },
    39: { env: 'room', glow: '#FFE27A', fn: () => box(60, 216, 120, 24, '#E85A5A', 6) + critter('#FFFDF4', { ears: 'cat', tail: 'none', iris: '#3A8E6A', belly: '#FFFFFF', marks: O(90, 122, 10, '#F2A54A', null, 0, ' opacity=".9"') + O(152, 118, 8, '#3A3C46', null, 0, ' opacity=".7"'), extra: R(92, 176, 56, 10, '#E85A5A', 4, line('#E85A5A')) + O(120, 192, 9, '#F2CB57', '#C98A10', 2) + G('translate(166 140) rotate(-20)', blob(0, 0, 13, 22, '#FFFDF4') + P('M-6,-16 v-8 M6,-16 v-8', 'none', line('#FFFDF4'), 2)) + G('translate(80 210)', O(0, 0, 14, '#F2CB57', '#C98A10', 2) + P('M-6,0 h12', 'none', '#C98A10', 2)) }) },
    40: { env: 'night', glow: '#FFE6A0', fn: () => box(18, 86, 204, 156, '#F4E3BE', 6) + R(30, 120, 180, 122, '#9CCDBC', 0) + R(96, 136, 50, 106, '#354C43', 4) + R(106, 146, 30, 30, '#FFE6A0', 3) + glow(121, 160, 30, '#FFE6A0', 0.3, 2) + R(38, 140, 46, 44, '#FFE6A0', 4, '#8A6A4A', 3) + R(158, 140, 46, 44, '#FFE6A0', 4, '#8A6A4A', 3) + glow(61, 162, 34, '#FFE6A0', 0.18, 2) + glow(181, 162, 34, '#FFE6A0', 0.18, 2) + R(28, 64, 184, 40, '#137A70', 6, '#0E5A52', 3) + P('M44,84 h152', 'none', '#FFE27A', 4, ' stroke-dasharray="12 8"') + P('M14,104 H226 L212,124 H28Z', '#FFF6E3', '#C9A27A', 2) + ring(6, i => R(20 + i * 34, 104, 17, 20, '#1FA89A', 0)) + glow(120, 84, 70, '#FFE27A', 0.1) },
  };
  function render(card) {
    const seed = card.art;
    if (card.set === 'noi-bo') {
      const def = CAFE[seed];
      return room(def.env, seed) + aura(card.rarity, 120, 160, def.glow) + (seed < 26 || seed === 37 ? shadow(120, 70) : '') + def.fn() + twinkles(card.rarity, seed);
    }
    const def = MYSTIC[seed];
    return backdrop(def.env, seed) + aura(card.rarity, 120, 170, def.glow) + shadow(120, 74) + G(`translate(120 ${GROUND}) scale(1.08) translate(-120 ${-GROUND})`, def.fn()) + foreground(def.env, seed) + twinkles(card.rarity, seed);
  }
  function svg(card) {
    card = CARD_CATALOG.find(c => c.id === card?.id);
    if (!card) return '';
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(card.name)}" xmlns="http://www.w3.org/2000/svg">${render(card)}</svg>`;
  }
  window.CardArt = { svg };
})();
