/* Quán Nét Bất Ổn — đồ đạc phản ánh việc nâng cấp quán.
   Chưa nâng cấp thì quán "bất ổn": quạt trần lắc lư, router dán băng keo, dây mạng chằng chịt,
   ổ điện nối dài cắm chồng tóe lửa. Nâng cấp tới đâu, quán gọn gàng tới đó.
   d = { ac, inverter, ups, net }  (net: 0 gói gia đình · 1 cáp quang · 2 doanh nghiệp)
   Chỉ tạo chuỗi SVG (vẽ cùng lớp tường của cảnh quán). Dùng qua window.DECOR. */
(() => {
'use strict';

const COOL = { x: 604, y: 158 };   // khoảng tường trên quầy, dưới biển "Nạp giờ tại quầy"
const ROUTER = { x: 232, y: 170 };  // dưới biển neon GAME (tránh bình nước)
const RUN = 224;                    // độ cao bó cáp / máng cáp chạy ngang trên tường ốp
const WALL_FOOT = 278;              // chân tường (sàn bắt đầu ở 280)

// ---------- Làm mát ----------
// Quạt treo tường kiểu quán Việt: lồng quạt lắc qua lại (co bề ngang), cánh quay tít, giá đỡ lỏng lẻo
function fanSVG() {
  const { x, y } = COOL;
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4;
    return `<line x1="0" y1="0" x2="${(Math.cos(a) * 17).toFixed(1)}" y2="${(Math.sin(a) * 17).toFixed(1)}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y})">
    <path d="M0,30 L0,16 M-8,32 H8" stroke="#8A8F94" stroke-width="3" stroke-linecap="round"/>
    <rect x="-9" y="30" width="18" height="6" rx="2" fill="#B9BFC6"/>
    <g class="dc-sway">
      <ellipse cx="0" cy="0" rx="9" ry="8" fill="#DCD6C8"/>
      <g class="dc-spin"><ellipse cx="0" cy="-9" rx="5" ry="9" fill="#7CC0EA" opacity=".85"/><ellipse cx="8" cy="5" rx="5" ry="9" fill="#7CC0EA" opacity=".85" transform="rotate(120 8 5)"/>
        <ellipse cx="-8" cy="5" rx="5" ry="9" fill="#7CC0EA" opacity=".85" transform="rotate(240 -8 5)"/><circle r="3" fill="#2F6FB3"/></g>
      <circle r="18" fill="none" stroke="#9AA1A9" stroke-width="1.6"/><g stroke="#B9BFC6" stroke-width=".7">${spokes}</g>
      <circle r="4" fill="#F4F4F0" stroke="#9AA1A9"/>
    </g>
  </g>`;
}
// Máy lạnh treo tường + luồng gió mát thổi xuống
function acSVG(inverter) {
  const { x, y } = COOL;
  const air = [-26, -6, 14].map((dx, i) =>
    `<path class="dc-air" style="animation-delay:${-(i * .6)}s" d="M${dx},16 q4,6 0,12 q-4,6 0,12" fill="none" stroke="#9FD8F5" stroke-width="1.8" stroke-linecap="round"/>`).join('');
  return `<g transform="translate(${x} ${y - 12})">
    <rect x="-46" y="-12" width="92" height="28" rx="6" fill="#F4F5F7" stroke="#C9CDD2" stroke-width="1.5"/>
    <rect x="-40" y="9" width="80" height="4" rx="2" fill="#D5DAE0"/><path d="M-38,11 H38" stroke="#B9BFC6" stroke-width=".8"/>
    <circle cx="36" cy="-4" r="1.6" fill="#4AA8FF"/>${inverter ? '<text x="-38" y="-1" font-size="6" font-weight="800" fill="#9AA1A9">INVERTER</text>' : ''}
    ${air}
  </g>`;
}

// ---------- Mạng ----------
const WIRE = ['#2F6FB3', '#F2CB57', '#E2463A', '#3A3A44', '#1FA89A'];
function routerSVG(net) {
  const { x, y } = ROUTER;
  const leds = n => Array.from({ length: n }, (_, i) =>
    `<circle class="dc-led" style="animation-delay:${-(i * .23) % 1}s" cx="${x - 9 + i * 4.5}" cy="${y + 1}" r="1.1" fill="${i % 3 ? '#7CFFB0' : '#FFD04A'}"/>`).join('');
  if (net >= 2) {   // tủ mạng nhỏ gắn tường, đèn nhấp nháy dày đặc
    return `<rect x="${x - 18}" y="${y - 14}" width="36" height="26" rx="2" fill="#26282F"/>
      <rect x="${x - 15}" y="${y - 11}" width="30" height="6" fill="#3A3C44"/><rect x="${x - 15}" y="${y - 3}" width="30" height="6" fill="#3A3C44"/>
      <g transform="translate(0 -9)">${leds(7)}</g><g transform="translate(0 -1)">${leds(7)}</g>`;
  }
  const tape = net === 0
    ? `<rect x="${x - 20}" y="${y - 4}" width="12" height="5" fill="#E9D58A" opacity=".9" transform="rotate(-28 ${x - 14} ${y - 2})"/>
       <rect x="${x + 8}" y="${y - 4}" width="12" height="5" fill="#E9D58A" opacity=".9" transform="rotate(24 ${x + 14} ${y - 2})"/>` : '';
  return `<line x1="${x - 10}" y1="${y - 4}" x2="${x - 15}" y2="${y - 18}" stroke="#3A3A44" stroke-width="2" stroke-linecap="round"/>
    <line x1="${x + 10}" y1="${y - 4}" x2="${net === 0 ? x + 19 : x + 15}" y2="${y - 18}" stroke="#3A3A44" stroke-width="2" stroke-linecap="round"/>
    <rect x="${x - 14}" y="${y - 5}" width="28" height="10" rx="3" fill="${net === 0 ? '#F4F1EA' : '#2B2D35'}" stroke="${net === 0 ? '#CFC6B0' : '#1B1D22'}"/>
    <g transform="translate(2 0)">${leds(4)}</g>${tape}`;
}
function cablesSVG(net) {
  const { x, y } = ROUTER, top = y + 5;
  if (net === 0) {
    // dây mạng chằng chịt: mỗi sợi võng một kiểu, một cuộn thừa thòng lòng
    const ends = [40, 150, 230, 470, 560, 700];
    const wires = ends.map((ex, i) => {
      const sag = 26 + (i * 13) % 30, c = WIRE[i % WIRE.length];
      return `<path d="M${x - 6 + i * 2.4},${top} C${x + (ex - x) * .3},${top + sag} ${ex - (ex - x) * .2},${top + sag + 10} ${ex},${RUN - 10} L${ex + (i % 2 ? 3 : -3)},${WALL_FOOT}"
        fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`;
    }).join('');
    return wires + `<path d="M${x + 4},${top} q-6,30 6,34 q12,4 2,-12 q-8,-10 -12,6" fill="none" stroke="#F2CB57" stroke-width="1.8"/>`;
  }
  if (net === 1) {
    // gom thành bó, có dây rút; chỉ hơi võng
    const ties = [120, 330, 470, 610].map(tx => `<rect x="${tx - 1.5}" y="${RUN - 2}" width="3" height="8" rx="1" fill="#F4F4F0"/>`).join('');
    return `<path d="M${x},${top} L${x},${RUN} M30,${RUN} Q${(30 + x) / 2},${RUN + 5} ${x},${RUN} Q${(x + 720) / 2},${RUN + 5} 720,${RUN}" fill="none" stroke="#3A3A44" stroke-width="4" stroke-linecap="round"/>
      <path d="M30,${RUN} Q${(30 + x) / 2},${RUN + 5} ${x},${RUN} Q${(x + 720) / 2},${RUN + 5} 720,${RUN}" fill="none" stroke="#2F6FB3" stroke-width="1.2"/>
      ${ties}${[140, 380, 620].map(sx => `<line x1="${sx}" y1="${RUN + 3}" x2="${sx}" y2="${WALL_FOOT}" stroke="#3A3A44" stroke-width="2"/>`).join('')}`;
  }
  // máng cáp thẳng tắp, mỗi máy một đường xuống gọn gàng
  return `<rect x="${x - 3}" y="${top + 6}" width="6" height="${RUN - top - 6}" fill="#E4E7EB" stroke="#B9BFC6"/>
    <rect x="20" y="${RUN}" width="720" height="8" rx="1" fill="#E4E7EB" stroke="#B9BFC6"/>
    ${[140, 380, 620].map(sx => `<rect x="${sx - 2.5}" y="${RUN + 8}" width="5" height="${WALL_FOOT - RUN - 8}" fill="#E4E7EB" stroke="#B9BFC6"/>`).join('')}`;
}

// ---------- Điện ----------
function strip(x, y, w = 30) {
  const holes = Array.from({ length: Math.floor(w / 8) }, (_, i) => `<rect x="${x + 4 + i * 8}" y="${y + 2}" width="4" height="3" rx="1" fill="#9AA1A9"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="7" rx="2" fill="#F4F4F0" stroke="#C9CDD2"/>${holes}`;
}
function powerSVG(ups) {
  if (ups) {
    // bộ lưu điện UPS đứng gọn cạnh quầy, ổ điện bắt vít lên tường ốp
    return `<rect x="458" y="246" width="24" height="40" rx="3" fill="#2B2D35"/><rect x="462" y="252" width="16" height="7" rx="1" fill="#1B1D22"/>
      <rect x="464" y="254" width="8" height="3" fill="#4FE38A"/><circle cx="470" cy="276" r="2.5" fill="#3A3C44" stroke="#5B5F63"/>
      ${strip(392, 238, 46)}<path d="M415,245 V286 M440,241 H458" stroke="#3A3A44" stroke-width="1.8" fill="none"/>`;
  }
  // ổ nối dài cắm chồng lên nhau, dây xoắn trên sàn, một chỗ lâu lâu tóe lửa
  return `<path d="M330,${WALL_FOOT} q6,10 18,9 t22,-2 q14,-1 20,6 t26,1 q14,-4 26,2" fill="none" stroke="#2B2B31" stroke-width="2"/>
    ${strip(346, 286)}${strip(388, 290)}${strip(432, 286)}
    <rect x="398" y="281" width="9" height="9" rx="1.5" fill="#F4F4F0" stroke="#C9CDD2"/><rect x="401" y="276" width="6" height="7" rx="1" fill="#E4DECF" stroke="#BDB39C"/>
    <path d="M404,276 q-6,-10 -18,-6" fill="none" stroke="#2B2B31" stroke-width="1.6"/>
    <g class="dc-spark"><path d="M408,279 l5,-6 l-1,5 l5,-3 l-4,6" fill="#FFD04A" stroke="#FF9500" stroke-width=".8"/></g>
    <g transform="translate(478 262)"><path d="M0,-9 L9,7 L-9,7 Z" fill="#F2CB57" stroke="#3A2A22" stroke-width="1.4" stroke-linejoin="round"/>
      <text y="5" text-anchor="middle" font-size="9" font-weight="800" fill="#3A2A22">!</text></g>`;
}

// Tất cả đồ "nâng cấp" trên tường + chân tường
function wallSVG(d = {}) {
  const net = Math.max(0, Math.min(2, d.net | 0));
  return cablesSVG(net) + routerSVG(net) + powerSVG(!!d.ups) +
    (d.ac ? acSVG(d.inverter) : fanSVG());
}

window.DECOR = { wallSVG };
})();
