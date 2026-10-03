/* Quán Nét Bất Ổn — hiệu ứng hình ảnh: xu bay về ví, pháo sao, rung màn hình, đèn chập chờn, cửa cuốn.
   Chỉ tạo phần tử trang trí tạm thời trong #fx-layer / .scene-wrap, không đụng trạng thái game. Dùng qua window.VFX. */
(() => {
'use strict';

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;   // người chơi muốn ít chuyển động
const layer = () => document.getElementById('fx-layer');
const rand = (a, b) => a + Math.random() * (b - a);
function center(el) {
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  if (!r || !r.width) return { x: innerWidth / 2, y: innerHeight / 2 };
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.35 };
}
function dot(cls, x, y, html = '') {
  const d = document.createElement('div');
  d.className = 'vfx ' + cls;
  d.style.left = x + 'px'; d.style.top = y + 'px';
  d.innerHTML = html;
  layer().appendChild(d);
  return d;
}
// ô tiền đang hiện trên màn (màn chơi hoặc buổi sáng)
const wallet = () => [document.getElementById('hud-money'), document.getElementById('prep-money')]
  .find(e => e && e.getBoundingClientRect().width);

// ---------- Xu bay về ví ----------
function coins(from, n = 5) {
  const to = wallet();
  if (!to || calm()) return;
  const a = center(from), b = center(to);
  for (let i = 0; i < n; i++) {
    const c = dot('coin', a.x, a.y);
    const sx = rand(-36, 36), sy = rand(-50, -20);          // văng lên một chút trước khi bay đi
    const anim = c.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
      { transform: `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px)) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(.6)`, opacity: 0.9 },
    ], { duration: 750 + i * 70, delay: i * 45, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' });
    anim.onfinish = () => {
      c.remove();
      if (i === n - 1) bump(to);
    };
  }
}
function bump(el) {
  const pill = el.closest('.ppill, .hud-item') || el;
  pill.classList.remove('vfx-bump');
  void pill.offsetWidth;   // khởi động lại hiệu ứng nếu đang chạy dở
  pill.classList.add('vfx-bump');
}

// ---------- Pháo sao / lấp lánh / tia va chạm ----------
const BURSTS = {
  stars: { n: 18, chars: ['★', '✦', '●', '■'], colors: ['#FFB800', '#13968A', '#F0603F', '#E2463A', '#2F6FB3'], dist: [55, 120], fall: 60, dur: 1100, size: [14, 24] },
  sparkle: { n: 8, chars: ['✦', '✧'], colors: ['#FFB800', '#13968A', '#FFFFFF'], dist: [18, 46], fall: 0, dur: 750, size: [14, 20] },
  hit: { n: 7, chars: ['💢', '✶', '✶'], colors: ['#FF3B30', '#FF9500', '#FFD60A'], dist: [20, 50], fall: 10, dur: 550, size: [14, 22] },
};
function burst(from, kind = 'stars') {
  if (calm()) return;
  const k = BURSTS[kind], p = center(from);
  for (let i = 0; i < k.n; i++) {
    const ang = (i / k.n) * Math.PI * 2 + rand(-0.3, 0.3), dist = rand(...k.dist);
    const ch = k.chars[i % k.chars.length];
    const d = dot('spark', p.x, p.y, ch);
    d.style.color = k.colors[i % k.colors.length];
    d.style.fontSize = rand(...k.size) + 'px';
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    d.animate([
      // chặng 1: văng ra thật nhanh rồi chậm lại · chặng 2: rơi nhẹ và mờ dần
      { transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 1, easing: 'cubic-bezier(.15,.8,.35,1)' },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${rand(-180, 180)}deg)`, opacity: 1, offset: 0.45, easing: 'ease-in' },
      { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + k.fall}px)) scale(.6) rotate(${rand(-360, 360)}deg)`, opacity: 0 },
    ], { duration: k.dur * rand(0.85, 1.15), fill: 'both' }).onfinish = () => d.remove();
  }
}

// ---------- Rung khung cảnh quán ----------
function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}
const scene = () => document.querySelector('#screen-play .scene-wrap');
function shake() { if (!calm()) replay(scene(), 'vfx-shake'); }
// đèn chập chờn lúc cúp điện / có điện lại
function flicker() { replay(scene(), 'vfx-flicker'); }

// ---------- Cửa cuốn ----------
// 'up': mở quán, cửa cuốn kéo lên rồi biến mất · 'down': đóng quán, cửa kéo xuống và nằm yên
function shutter(dir) {
  const wrap = scene();
  if (!wrap) return;
  wrap.querySelectorAll('.vfx-shutter').forEach(s => s.remove());
  const s = document.createElement('div');
  s.className = 'vfx-shutter';
  s.innerHTML = '<span class="vfx-shutter-handle"></span>';
  wrap.appendChild(s);
  // thu chiều cao lại (vân thép bám đáy) → trông như cửa cuộn lên trục, không trồi ra ngoài khung cảnh
  const up = { height: '0%' }, down = { height: '100%' };
  const anim = s.animate(dir === 'up' ? [down, up] : [up, down],
    { duration: calm() ? 1 : 1000, delay: dir === 'up' ? 150 : 0, easing: dir === 'up' ? 'cubic-bezier(.5,0,.3,1)' : 'cubic-bezier(.6,0,.9,.6)', fill: 'both' });
  if (dir === 'up') anim.onfinish = () => s.remove();
}

window.VFX = { coins, burst, shake, flicker, shutter };
})();
