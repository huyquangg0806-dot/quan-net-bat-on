/* Quán Nét Bất Ổn — TV treo tường chiếu game đang hot bằng hình pixel.
   Màn hình máy khách quay lưng về phía người chơi, nên TV là chỗ duy nhất "nhìn thấy" game.
   Mỗi thể loại game một cảnh pixel 64×36 điểm, chuyển động bằng CSS (style.css, nhóm .px-*).
   Chỉ tạo chuỗi SVG. Dùng qua window.TV. */
(() => {
'use strict';

// Vị trí TV trên tường (đơn vị SVG của cảnh quán) và khung màn hình bên trong
const X = 376, Y = 66, W = 152, H = 90;
const SCR = { x: 8, y: 8, w: 136, h: 64 };   // màn 136×64 hiển thị lưới 64×30 điểm + dải LIVE bên dưới

const GENRE = {
  lmhb: 'moba', pipa: 'ball', luachua: 'fps', valoran: 'fps', dotkit: 'fps', coso: 'fps',
  mairap: 'block', rolac: 'block', cauca: 'fish', audisan: 'dance', tromxe: 'drive', denring: 'souls',
};
// màu ánh TV hắt ra quán ban đêm theo thể loại
const GLOW = { moba: 'gCyan', ball: 'gTeal', fps: 'gWarm', block: 'gCool', fish: 'gBlue', dance: 'gPurple', drive: 'gCyan', souls: 'gRed' };

const r = (x, y, w, h, c, cls = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${cls ? ` class="${cls}"` : ''}/>`;

// ---------- Cảnh pixel (lưới 64×30) ----------
const SCENES = {
  // MOBA: đường giữa chéo, trụ xanh – trụ đỏ, hai tướng lao vào nhau, chiêu nổ lóe sáng
  moba: () => r(0, 0, 64, 30, '#2E6B3A') + r(0, 0, 64, 30, '#3A7A44', 'px-blink-slow') +
    `<polygon points="0,30 9,30 64,5 64,0 55,0 0,25" fill="#B8A06A"/>` +
    `<polygon points="20,0 27,0 46,30 39,30" fill="#3F8FC9" opacity=".75"/>` +
    r(4, 22, 4, 6, '#4AA8FF') + r(5, 20, 2, 2, '#BFE3FF') + r(56, 2, 4, 6, '#FF5C6C') + r(57, 0, 2, 2, '#FFC2C8') +
    `<g class="px-moba-a">${r(12, 21, 3, 3, '#4AA8FF')}${r(13, 20, 1, 1, '#FFFFFF')}</g>` +
    `<g class="px-moba-b">${r(49, 7, 3, 3, '#FF5C6C')}${r(50, 6, 1, 1, '#FFFFFF')}</g>` +
    `<g class="px-flash">${r(29, 12, 6, 6, '#FFE45C')}${r(31, 10, 2, 10, '#FFFFFF')}${r(27, 14, 10, 2, '#FFFFFF')}</g>` +
    r(0, 0, 12, 7, '#1B2A1E') + r(1, 5, 1, 1, '#4AA8FF') + r(10, 1, 1, 1, '#FF5C6C'),
  // Bóng đá: sân sọc, bóng chạy qua lại, hai cầu thủ đuổi theo
  ball: () => Array.from({ length: 8 }, (_, i) => r(i * 8, 0, 8, 30, i % 2 ? '#47A853' : '#3E9B4A')).join('') +
    r(31, 0, 1, 30, '#E8F5E8') + `<rect x="25" y="9" width="13" height="12" fill="none" stroke="#E8F5E8" stroke-width="1"/>` +
    r(0, 10, 2, 10, '#FFFFFF') + r(62, 10, 2, 10, '#FFFFFF') +
    `<g class="px-ball">${r(0, 0, 2, 2, '#FFFFFF')}${r(1, 1, 1, 1, '#333333')}</g>` +
    `<g class="px-chase-a">${r(0, 0, 2, 3, '#E2463A')}${r(0, -1, 2, 1, '#F1C39A')}</g>` +
    `<g class="px-chase-b">${r(0, 0, 2, 3, '#2F6FB3')}${r(0, -1, 2, 1, '#F1C39A')}</g>` +
    r(26, 0, 12, 4, '#1B1B22') + r(27, 1, 3, 2, '#E2463A') + r(34, 1, 3, 2, '#2F6FB3'),
  // Bắn súng góc nhìn thứ nhất: thùng gỗ, địch thò đầu ra, tâm ngắm, súng lóe lửa
  fps: () => r(0, 0, 64, 12, '#7DB9E0') + r(0, 12, 64, 8, '#C9A46A') + r(0, 20, 64, 10, '#7A6A55') +
    r(6, 6, 10, 14, '#A8875A') + r(46, 4, 12, 16, '#A8875A') + r(48, 7, 3, 3, '#3A3A44') + r(53, 7, 3, 3, '#3A3A44') +
    `<g class="px-peek">${r(23, 11, 4, 4, '#E2463A')}${r(24, 12, 2, 1, '#2B2B31')}${r(22, 15, 6, 4, '#5A4A3A')}</g>` +
    r(18, 14, 14, 8, '#8A5A3B') + r(18, 17, 14, 1, '#6B4A2F') +
    r(31, 13, 1, 5, '#FFFFFF') + r(29, 15, 5, 1, '#FFFFFF') +
    r(44, 21, 14, 9, '#4A4A52') + r(41, 23, 4, 3, '#5A5A63') + `<g class="px-flash">${r(37, 21, 5, 6, '#FFD04A')}${r(38, 22, 3, 4, '#FFFFFF')}</g>` +
    r(2, 27, 12, 2, '#3A3A44') + r(2, 27, 9, 2, '#4FE38A'),
  // Thế giới khối vuông: nắng, cỏ, đất, nhân vật nhảy, một khối đang bị đập
  block: () => r(0, 0, 64, 30, '#8FD3FF') + r(50, 3, 6, 6, '#FFE45C') + r(8, 5, 10, 3, '#FFFFFF') + r(30, 8, 8, 2, '#FFFFFF') +
    r(0, 20, 64, 2, '#5DBB4C') + r(0, 22, 64, 8, '#8A5A3B') + r(40, 16, 8, 4, '#5DBB4C') + r(40, 18, 8, 2, '#8A5A3B') +
    r(48, 12, 8, 8, '#8A5A3B') + r(48, 12, 8, 2, '#5DBB4C') + r(10, 24, 3, 3, '#9AA1A9') + r(30, 26, 3, 2, '#9AA1A9') +
    `<g class="px-blink">${r(48, 12, 8, 8, '#000000')}</g>` +
    `<g class="px-jump">${r(36, 12, 3, 3, '#F1C39A')}${r(36, 15, 3, 3, '#1FA89A')}${r(36, 18, 3, 2, '#2F4A7A')}</g>`,
  // Câu cá: hoàng hôn, sóng trôi, thuyền, phao nhấp nhô, cá nhảy khỏi mặt nước
  fish: () => r(0, 0, 64, 7, '#FF9E6B') + r(0, 7, 64, 7, '#FFC48A') + r(40, 9, 8, 4, '#FFE45C') +
    r(0, 14, 64, 16, '#2F7FB3') + `<g class="px-wave">${r(0, 17, 6, 1, '#7CC0EA')}${r(16, 21, 6, 1, '#7CC0EA')}${r(34, 18, 6, 1, '#7CC0EA')}${r(50, 24, 6, 1, '#7CC0EA')}${r(64, 17, 6, 1, '#7CC0EA')}</g>` +
    r(6, 12, 14, 3, '#8A5A3B') + r(8, 15, 10, 1, '#6B4A2F') + r(12, 8, 2, 4, '#F2CB57') + r(12, 6, 2, 2, '#F1C39A') +
    `<line x1="14" y1="8" x2="34" y2="3" stroke="#3A2A22" stroke-width=".6"/><line x1="34" y1="3" x2="34" y2="15" stroke="#FFFFFF" stroke-width=".4"/>` +
    `<g class="px-bob">${r(33, 14, 2, 2, '#E2463A')}</g>` +
    `<g class="px-fishjump">${r(0, 0, 4, 2, '#C0C8D0')}${r(4, 0, 1, 2, '#9AA1A9')}</g>`,
  // Nhảy theo nhạc: nền disco nhấp nháy, mũi tên trôi lên, vũ công lắc lư
  dance: () => r(0, 0, 64, 30, '#2A1640') +
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => r(i * 8, 22, 8, 8, ['#FF6FB5', '#46E6F2', '#FFD04A', '#9B6BFF'][i % 4], `px-disco d${i % 3}`)).join('') +
    r(2, 1, 28, 6, '#1B0E2B') + ['#FF6FB5', '#46E6F2', '#4FE38A', '#FFD04A'].map((c, i) => r(4 + i * 7, 2, 4, 4, c)).join('') +
    `<g class="px-scroll">${['#FF6FB5', '#46E6F2', '#4FE38A', '#FFD04A'].map((c, i) => r(4 + i * 7, 12 + (i * 5) % 9, 4, 4, c)).join('')}</g>` +
    `<g class="px-dancer">${r(44, 6, 4, 4, '#F1C39A')}${r(43, 5, 6, 2, '#2A1D17')}${r(43, 10, 6, 6, '#FF6FB5')}${r(41, 10, 2, 4, '#F1C39A')}${r(49, 8, 2, 4, '#F1C39A')}${r(44, 16, 2, 5, '#2F4A7A')}${r(46, 16, 2, 5, '#2F4A7A')}</g>`,
  // Lái xe thế giới mở: nhà cao tầng, đường chạy, vạch kẻ trôi xuống, xe lạng lách
  drive: () => r(0, 0, 64, 12, '#87CEEB') + r(2, 3, 8, 9, '#6B7A8F') + r(12, 6, 6, 6, '#8A97A8') + r(46, 2, 7, 10, '#6B7A8F') + r(55, 5, 7, 7, '#8A97A8') +
    r(4, 5, 1, 1, '#FFE45C') + r(7, 8, 1, 1, '#FFE45C') + r(48, 4, 1, 1, '#FFE45C') +
    r(0, 12, 64, 18, '#5DBB4C') + `<polygon points="26,12 38,12 58,30 6,30" fill="#4A4A52"/>` +
    `<g class="px-road">${r(31, 13, 2, 3, '#FFFFFF')}${r(31, 19, 2, 4, '#FFFFFF')}${r(31, 26, 2, 5, '#FFFFFF')}${r(31, 33, 2, 5, '#FFFFFF')}</g>` +
    `<g class="px-car">${r(27, 22, 10, 6, '#E2463A')}${r(29, 20, 6, 3, '#FF8C7A')}${r(28, 28, 2, 1, '#1B1B22')}${r(34, 28, 2, 1, '#1B1B22')}${r(27, 23, 1, 1, '#FFE45C')}${r(36, 23, 1, 1, '#FFE45C')}</g>`,
  // Game khó: nền tối, trùm khổng lồ thở phì phò, hiệp sĩ bé tí, thỉnh thoảng hiện "YOU DIED"
  souls: () => r(0, 0, 64, 30, '#1A1420') + r(0, 22, 64, 8, '#2B2530') + r(6, 4, 2, 2, '#FFE45C') + r(56, 6, 1, 1, '#FFFFFF') +
    `<g class="px-breath">${r(36, 4, 20, 18, '#4A1F2A')}${r(39, 0, 4, 5, '#4A1F2A')}${r(49, 0, 4, 5, '#4A1F2A')}${r(40, 9, 3, 2, '#FF5C6C')}${r(49, 9, 3, 2, '#FF5C6C')}${r(41, 15, 10, 2, '#1A1420')}</g>` +
    `<g class="px-jump">${r(14, 16, 3, 3, '#D5DAE0')}${r(14, 19, 3, 3, '#9AA1A9')}${r(17, 15, 1, 6, '#FFFFFF')}</g>` +
    r(2, 27, 14, 2, '#3A3A44') + r(2, 27, 4, 2, '#FF5C6C') +
    `<g class="px-died"><rect y="10" width="64" height="9" fill="#000000" opacity=".75"/><text x="32" y="17" text-anchor="middle" font-size="7" fill="#C0392B" font-family="Georgia, serif" letter-spacing=".5">YOU DIED</text></g>`,
};

function genreOf(gameId) { return GENRE[gameId] || 'fps'; }

// Khung TV (vẽ cùng tường, chịu lớp tối ban đêm): giá treo, viền đen, chân đèn nguồn
function frameSVG() {
  return `<g transform="translate(${X} ${Y})">
    <rect x="${W / 2 - 22}" y="-8" width="44" height="10" rx="2" fill="#5B5F63"/>
    <rect x="-3" y="-3" width="${W + 6}" height="${H + 6}" rx="9" fill="#3A2A22" opacity=".18"/>
    <rect width="${W}" height="${H}" rx="7" fill="#1B1D22"/>
    <rect x="${SCR.x - 1}" y="${SCR.y - 1}" width="${SCR.w + 2}" height="${SCR.h + 12}" rx="2" fill="#0B0C10"/>
    <circle cx="${W - 9}" cy="${H - 5}" r="1.6" fill="#7CFFB0"/>
  </g>`;
}
// Màn hình đang chiếu (vẽ trên lớp tối vì màn hình tự phát sáng)
function screenSVG(gameId, gameName) {
  const g = genreOf(gameId);
  const safe = String(gameName || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  return `<g transform="translate(${X} ${Y})">
    <svg x="${SCR.x}" y="${SCR.y}" width="${SCR.w}" height="${SCR.h}" viewBox="0 0 64 30" preserveAspectRatio="none" shape-rendering="crispEdges" overflow="hidden">
      ${SCENES[g]()}
    </svg>
    <rect x="${SCR.x}" y="${SCR.y + SCR.h}" width="${SCR.w}" height="10" fill="#101218"/>
    <g class="px-live"><rect x="${SCR.x + 2}" y="${SCR.y + SCR.h + 2}" width="22" height="6" rx="1.5" fill="#E2463A"/>
      <text x="${SCR.x + 13}" y="${SCR.y + SCR.h + 7}" text-anchor="middle" font-size="5.5" font-weight="800" fill="#FFFFFF">LIVE</text></g>
    <text x="${SCR.x + 28}" y="${SCR.y + SCR.h + 7.5}" font-size="6.5" font-weight="700" fill="#E8ECF2">🔥 ${safe}</text>
    <rect x="${SCR.x}" y="${SCR.y}" width="${SCR.w}" height="${SCR.h / 2}" fill="#FFFFFF" opacity=".05"/>
  </g>`;
}
// Quầng sáng TV hắt ra quán (lớp hoà sáng)
function glowSVG(gameId) {
  return `<ellipse cx="${X + W / 2}" cy="${Y + H / 2}" rx="${W * .85}" ry="${H * .95}" fill="url(#${GLOW[genreOf(gameId)]})"/>`;
}

window.TV = { frameSVG, screenSVG, glowSVG, genreOf };
})();
