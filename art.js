/* Quán Nét Bất Ổn — hình vẽ SVG (nhân vật chibi, dàn máy, quầy mì, đồ trang trí).
   Chỉ tạo chuỗi SVG, không đụng DOM hay trạng thái game. Dùng qua window.ART. */
(() => {
'use strict';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => clamp(Math.round(v * f), 0, 255));
  return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
}
const tierOf = st => Math.min(st.m.cpu, st.m.gpu) + 1;

// Khung cảnh dọc (đơn vị SVG): tường cao tới FLOOR_TOP, mép trước quán ở FRONT
const VW = 760, VH = 680, FLOOR_TOP = 280, FRONT = 672;

const rg = (id, color, a = .85) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

function defsSVG() {
  return `<defs>
    <pattern id="pFloor" width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="translate(0 ${FLOOR_TOP}) scale(1 .58)">
      <rect width="72" height="72" fill="#EFE3C8"/>
      <circle r="17" fill="#D6E4D4"/><circle cx="72" r="17" fill="#D6E4D4"/><circle cy="72" r="17" fill="#D6E4D4"/><circle cx="72" cy="72" r="17" fill="#D6E4D4"/>
      <g transform="translate(36 36)" fill="#EFCDB3"><ellipse rx="5" ry="13"/><ellipse rx="13" ry="5"/></g>
      <circle cx="36" cy="36" r="3.5" fill="#E2AE90"/>
      <path d="M0,0 H72 V72" fill="none" stroke="#E2D2AE" stroke-width="2"/>
    </pattern>
    <pattern id="pWains" width="44" height="26" patternUnits="userSpaceOnUse" patternTransform="translate(44 352)">
      <rect width="44" height="26" fill="#6EB3A1"/><rect x="1.5" y="1.5" width="41" height="23" rx="2" fill="#7CC0AE"/>
    </pattern>
    <pattern id="pAwning" width="64" height="80" patternUnits="userSpaceOnUse">
      <rect width="32" height="80" fill="#1FA89A"/><rect x="32" width="32" height="80" fill="#FFF3DA"/>
    </pattern>
    <pattern id="pWalk" width="60" height="30" patternUnits="userSpaceOnUse" patternTransform="translate(0 ${FRONT + 6})">
      <rect width="60" height="30" fill="#A3A9AB"/><path d="M0,0 H60 M0,0 V30" stroke="#8E9496" stroke-width="2"/>
    </pattern>
    <pattern id="pMesh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#5E6672"/><path d="M0,0 V6" stroke="#7A838F" stroke-width="2"/>
    </pattern>
    <linearGradient id="gCeil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5A3B22" stop-opacity=".38"/><stop offset="1" stop-color="#5A3B22" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gFloorShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6B4A2F" stop-opacity=".16"/><stop offset=".5" stop-color="#6B4A2F" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gCone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE3A3" stop-opacity=".55"/><stop offset="1" stop-color="#FFE3A3" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gSun" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#FFF1C4" stop-opacity=".9"/><stop offset="1" stop-color="#FFF1C4" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gRainbow" x1="0" x2="1">
      <stop offset="0" stop-color="#FF5C6C"/><stop offset=".2" stop-color="#FFB547"/><stop offset=".4" stop-color="#FFE45C"/>
      <stop offset=".6" stop-color="#4FE38A"/><stop offset=".8" stop-color="#46E6F2"/><stop offset="1" stop-color="#9B6BFF"/>
    </linearGradient>
    <linearGradient id="gPoster" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5B3FB8"/><stop offset="1" stop-color="#1FA89A"/>
    </linearGradient>
    <linearGradient id="gJug" x1="0" x2="1">
      <stop offset="0" stop-color="#7CC0EA"/><stop offset=".45" stop-color="#C9E8FA"/><stop offset="1" stop-color="#6FB2DE"/>
    </linearGradient>
    ${rg('gWarm', '#FFC874')}${rg('gCyan', '#46E6F2')}${rg('gPurple', '#A57BFF')}${rg('gGold', '#FFD04A', .95)}
    ${rg('gRed', '#FF5C6C')}${rg('gTeal', '#5FF2DC', .7)}${rg('gCool', '#D2F4FF', .8)}${rg('gBlue', '#9FD0FF')}
    <filter id="fNeon" x="-20%" y="-60%" width="140%" height="220%">
      <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="fBlur"><feGaussianBlur stdDeviation="10"/></filter>
    <radialGradient id="gVig" cx=".5" cy=".55" r=".75">
      <stop offset=".45" stop-color="#0E0F26" stop-opacity="0"/><stop offset="1" stop-color="#0E0F26"/>
    </radialGradient>
  </defs>`;
}

// ---------- Biển hiệu (vẽ sau lớp tối để đèn neon luôn sáng) ----------
function signSVG() {
  return `<g transform="translate(800 0)">
    <line x1="-250" y1="0" x2="-250" y2="14" stroke="#333" stroke-width="3"/><line x1="250" y1="0" x2="250" y2="14" stroke="#333" stroke-width="3"/>
    <rect x="-300" y="10" width="600" height="92" rx="12" fill="#10302C" stroke="#0A1F1C" stroke-width="5"/>
    <rect x="-288" y="20" width="576" height="72" rx="8" fill="none" stroke="#5FF2DC" stroke-width="2.5" filter="url(#fNeon)"/>
    <text id="signText" class="baloo" y="72" text-anchor="middle" font-size="52" fill="#DFFFF8" filter="url(#fNeon)" letter-spacing="1"></text>
    <g transform="translate(-258 56)" fill="#FFD04A">
      <rect x="-15" y="-9" width="30" height="18" rx="9"/><circle cx="-7" cy="0" r="2.5" fill="#10302C"/><circle cx="8" cy="-3" r="2" fill="#10302C"/><circle cx="8" cy="3" r="2" fill="#10302C"/>
    </g>
    <g transform="translate(258 56)" fill="#FF8C6B">
      <path d="M-14,-4 H14 Q13,12 0,13 Q-13,12 -14,-4 Z"/><path d="M-10,-10 L12,-7" stroke="#FFD04A" stroke-width="2.5"/>
    </g>
  </g>`;
}

// ---------- Đồ vật trong phòng ----------
function counterSVG() {
  const planks = Array.from({ length: 9 }, (_, k) => `<line x1="${1126 + k * 34}" y1="414" x2="${1126 + k * 34}" y2="524" stroke="#94603A" stroke-width="2"/>`).join('');
  return `
  <ellipse cx="1262" cy="532" rx="190" ry="10" fill="#3A2A22" opacity=".12"/>
  <path d="M1096,378 L1428,378 L1436,406 L1088,406 Z" fill="#C8905E"/>
  <rect x="1088" y="404" width="348" height="9" fill="#8A5A3B"/>
  <rect x="1092" y="413" width="340" height="114" fill="#A86F45"/>${planks}
  <rect x="1092" y="522" width="340" height="9" fill="#6D4428"/>
  <g transform="translate(1180 466) rotate(-3)">
    <rect x="-50" y="-28" width="100" height="56" fill="#FFFDF4"/>
    <rect x="-12" y="-34" width="24" height="10" fill="#F6E3A0" opacity=".9"/>
    <text class="marker" y="-3" text-anchor="middle" font-size="18" fill="#C0392B">MÌ TRỨNG</text>
    <text class="marker" y="20" text-anchor="middle" font-size="18" fill="#2F6FB3">17K</text>
  </g>
  <g transform="translate(1330 470)">
    <circle r="24" fill="#1FA89A"/><circle r="19" fill="none" stroke="#FFF3DA" stroke-width="1.5" stroke-dasharray="3 3"/>
    <text class="baloo" y="6" text-anchor="middle" font-size="15" fill="#FFF3DA">NET</text>
  </g>
  <!-- Máy chủ + hộp tiền -->
  <g data-hit="host" role="button" tabindex="0" aria-label="Mở máy tính chủ" class="host-monitor">
    <title>Máy tính chủ · bấm để mở các app</title>
    <rect x="1095" y="324" width="78" height="58" fill="transparent"/>
    <rect x="1104" y="334" width="56" height="40" rx="3" fill="#2D2F36"/>
    <rect x="1109" y="339" width="46" height="29" rx="2" fill="#1FA89A"/>
    <text x="1132" y="358" text-anchor="middle" font-size="11" fill="#FFFDF4">APP</text>
    <rect x="1127" y="374" width="10" height="6" fill="#2D2F36"/>
  </g>
  <rect x="1166" y="360" width="38" height="20" rx="2" fill="#D9CFB8"/><rect x="1171" y="365" width="28" height="4" fill="#9A8F78"/>
  <!-- Ống đũa, chồng tô, tương ớt (chừa chỗ cho mặt chủ quán) -->
  <g transform="translate(1218 380)">
    <path d="M-4,-26 L-7,-44 M0,-26 L1,-46 M4,-26 L8,-43" stroke="#C8905E" stroke-width="2.5"/>
    <rect x="-9" y="-28" width="18" height="28" rx="3" fill="#E9E2CF" stroke="#CFC5AE"/>
  </g>
  <g transform="translate(1272 388)" fill="#F4EFE6" stroke="#D3C7B3">
    <path d="M-18,-4 Q-16,4 0,5 Q16,4 18,-4 Z"/><path d="M-18,-12 Q-16,-4 0,-3 Q16,-4 18,-12 Z"/><path d="M-18,-20 Q-16,-12 0,-11 Q16,-12 18,-20 Z"/>
  </g>
  <g transform="translate(1316 380)"><rect x="-5" y="-28" width="10" height="28" rx="3" fill="#D9342B"/><rect x="-3" y="-34" width="6" height="7" fill="#2FA36B"/></g>
  <!-- Bếp gas + nồi -->
  <rect x="1340" y="366" width="78" height="14" rx="3" fill="#5B5F63"/>
  <g id="flame" transform="translate(1379 366)">
    <path d="M-16,0 q4,-12 8,0 z M-4,0 q4,-14 8,0 z M8,0 q4,-12 8,0 z" fill="#4AA8FF"/>
  </g>
  <rect x="1350" y="326" width="58" height="40" rx="7" fill="#B9C0C4"/>
  <rect x="1340" y="334" width="12" height="6" rx="3" fill="#8E969A"/><rect x="1406" y="334" width="12" height="6" rx="3" fill="#8E969A"/>
  <ellipse cx="1379" cy="326" rx="31" ry="6" fill="#D5DBDE"/><circle cx="1379" cy="318" r="4" fill="#3A3A3A"/>
  <path d="M1356,346 H1402" stroke="#fff" stroke-width="3" opacity=".4"/>
  <g id="potSteam" class="steam" transform="translate(1379 312)" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85">
    <path d="M-10,0 q-8,-10 0,-20 q8,-10 0,-20"/><path d="M4,0 q-8,-10 0,-20 q8,-10 0,-20"/><path d="M16,0 q-8,-10 0,-20 q8,-10 0,-20"/>
  </g>`;
}

function dispenserSVG() {
  return `<ellipse rx="34" ry="6" fill="#3A2A22" opacity=".14"/>
    <rect x="-26" y="-74" width="52" height="74" rx="4" fill="#F5F4EE" stroke="#D6D4CA" stroke-width="2"/>
    <rect x="-16" y="-56" width="8" height="10" rx="2" fill="#E2463A"/><rect x="8" y="-56" width="8" height="10" rx="2" fill="#2F6FB3"/>
    <rect x="-18" y="-30" width="36" height="4" fill="#C9C7BC"/>
    <path d="M-22,-76 Q-27,-122 -18,-130 L-8,-142 L-8,-154 L8,-154 L8,-142 L18,-130 Q27,-122 22,-76 Z" fill="url(#gJug)" stroke="#5AA7D6" stroke-width="1.5" opacity=".95"/>
    <path d="M-20,-100 H20" stroke="#5AA7D6" stroke-width="1.2" opacity=".6"/>
    <rect x="-14" y="-118" width="28" height="14" rx="3" fill="#fff" opacity=".85"/>
    <text y="-107.5" text-anchor="middle" font-size="8" font-weight="800" fill="#2F6FB3">NƯỚC</text>`;
}

function plantSVG(scale = 1) {
  const leaf = (r, len, c) => `<ellipse cx="0" cy="${-len / 2}" rx="${len * .22}" ry="${len / 2}" fill="${c}" transform="rotate(${r})"/>`;
  return `<g transform="scale(${scale})">
    <ellipse rx="30" ry="6" fill="#3A2A22" opacity=".14"/>
    <g transform="translate(0 -44)">
      ${leaf(-50, 80, '#4F9A5A')}${leaf(-20, 96, '#5FAE68')}${leaf(10, 104, '#4F9A5A')}${leaf(38, 88, '#6BBF72')}${leaf(62, 70, '#4F9A5A')}${leaf(-72, 60, '#6BBF72')}
    </g>
    <path d="M-26,-46 L26,-46 L20,0 L-20,0 Z" fill="#C7683F"/><rect x="-29" y="-52" width="58" height="10" rx="3" fill="#D97B4F"/>
  </g>`;
}

function stoolSVG(color) {
  return `<ellipse rx="30" ry="6" fill="#3A2A22" opacity=".14"/>
    <path d="M-24,-34 L24,-34 L29,0 L20,0 L16,-12 L-16,-12 L-20,0 L-29,0 Z" fill="${color}"/>
    <ellipse cy="-34" rx="26" ry="6.5" fill="${shade(color, 1.15)}"/>
    <path d="M-6,-26 q6,-7 12,0 q-6,8 -12,0z" fill="${shade(color, .7)}"/>`;
}



function dogSVG(awake) {
  return `<ellipse rx="52" ry="8" fill="#3A2A22" opacity=".16"/>
    <g class="${awake ? 'wag' : ''}"><path d="M-40,-10 q-22,-4 -16,-24 q3,10 14,12" fill="#D39148"/></g>
    <g class="breath">
      <ellipse cx="-6" cy="-17" rx="40" ry="18" fill="#E3A45A"/>
      <ellipse cx="-2" cy="-8" rx="30" ry="8" fill="#F5D3A0"/>
    </g>
    <ellipse cx="-28" cy="-6" rx="13" ry="7" fill="#D39148"/>
    <ellipse cx="22" cy="-4" rx="14" ry="5.5" fill="#F3CF98"/><ellipse cx="34" cy="-3" rx="12" ry="5" fill="#F3CF98"/>
    <g transform="translate(32 ${awake ? -30 : -19})">
      <path class="ear" d="M-14,-8 L-10,-30 L0,-14 Z" fill="#C98640"/>
      <path class="ear" d="M4,-12 L14,-30 L18,-8 Z" fill="#C98640" style="animation-delay:.25s"/>
      <circle r="17" fill="#E3A45A"/>
      <ellipse cx="11" cy="7" rx="10" ry="7.5" fill="#F5D3A0"/>
      <ellipse cx="19" cy="4" rx="3.6" ry="3" fill="#4A2C1A"/>
      ${awake
        ? `<circle cx="-2" cy="-2" r="3" fill="#2A1B17"/><circle cx="9" cy="-3" r="3" fill="#2A1B17"/><path d="M8,13 q4,6 8,0" fill="#FF8A80"/>`
        : `<path d="M-6,-1 q4,3 8,0 M6,-2 q4,3 8,0" stroke="#4A2C1A" stroke-width="2" fill="none" stroke-linecap="round"/>`}
    </g>
    ${awake ? '' : `<g class="zzz chalk" fill="#6B4A2F" font-size="16"><text x="48" y="-44">z</text><text x="56" y="-52">z</text><text x="64" y="-60">Z</text></g>`}`;
}

// ---------- Nhân vật chibi ----------
function eyesSVG(mood, lx) {
  const E = '#2A1B17';
  const open = x => `<ellipse cx="${x + lx}" cy="5" rx="3.7" ry="4.9" fill="${E}"/><circle cx="${x + lx + 1.3}" cy="3" r="1.4" fill="#fff"/>`;
  switch (mood) {
    case 'happy': return `<path d="M-15,7 Q-11,0 -7,7 M7,7 Q11,0 15,7" stroke="${E}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M-8,14 Q0,27 8,14 Z" fill="#8C2F2F"/><path d="M-4,20 Q0,24 4,20 Z" fill="#FF8A80"/>`;
    case 'sad': return `<path d="M-16,1 L-8,5 L-16,9 M16,1 L8,5 L16,9" stroke="${E}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-6,20 Q-3,16 0,20 Q3,24 6,20" stroke="${E}" stroke-width="2.2" fill="none"/>
      <path d="M26,-12 q6,9 0,12 q-6,-3 0,-12z" fill="#8FD3FF"/>`;
    case 'focus': return open(-11) + open(11) + `<path d="M-17,-5 L-6,-2 M17,-5 L6,-2" stroke="${E}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-4,18 L4,18" stroke="${E}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'call': return open(-11) + open(11) + `<ellipse cx="0" cy="18" rx="5" ry="6" fill="#8C2F2F"/>`;
    case 'hungry': return open(-11) + open(11) + `<circle cx="${lx * .5}" cy="18" r="3.2" fill="#8C2F2F"/><path d="M6,20 q2,5 0,8" stroke="#8FD3FF" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case 'eat': return `<path d="M-15,5 Q-11,9 -7,5 M7,5 Q11,9 15,5" stroke="${E}" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="2" cy="18" rx="4.5" ry="3.5" fill="#8C2F2F"/>`;
    case 'smile': return `<path d="M-15,6 Q-11,1 -7,6 M7,6 Q11,1 15,6" stroke="${E}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-6,15 Q0,21 6,15" stroke="${E}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    default: return open(-11) + open(11) + `<path d="M-4,16 Q0,20 4,16" stroke="${E}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
}

function headSVG(L, mood = 'idle', look = 0) {
  const h = L.hair, s = L.skin;
  let back = '', front = '';
  const bobFront = `<path d="M-31,-3 C-33,-33 -15,-41 0,-41 C15,-41 33,-33 31,-3 C25,-13 16,-11 10,-18 C4,-10 -8,-11 -13,-18 C-18,-10 -25,-11 -31,-3 Z" fill="${h}"/>`;
  const fringe = `<path d="M-31,-2 C-33,-31 -15,-39 0,-39 C15,-39 33,-31 31,-2 C24,-12 12,-12 6,-18 C0,-12 -12,-12 -18,-17 C-22,-9 -27,-9 -31,-2 Z" fill="${h}"/>`;
  switch (L.hairStyle) {
    case 'buzz':
      back = `<ellipse cy="-3" rx="32" ry="30" fill="${h}"/>`;
      front = `<path d="M-30,-4 C-31,-30 -15,-37 0,-37 C15,-37 31,-30 30,-4 C22,-16 -22,-16 -30,-4 Z" fill="${h}"/>`;
      break;
    case 'cap':
      back = `<ellipse cy="-3" rx="32" ry="30" fill="${h}"/>`;
      front = `<path d="M-32,-7 C-33,-41 33,-41 32,-7 C20,-14 -20,-14 -32,-7 Z" fill="${L.cap}"/>
        <path d="M-9,-13 Q0,-19 9,-13" stroke="#fff" stroke-width="2.2" fill="none" opacity=".7"/>
        <path d="M-29,-6 L-25,2 M29,-6 L25,2" stroke="${h}" stroke-width="5" stroke-linecap="round"/>`;
      break;
    case 'police':   // mũ kêpi xanh, vành đỏ, huy hiệu vàng
      back = `<ellipse cy="-3" rx="32" ry="30" fill="${h}"/>`;
      front = `<path d="M-30,-4 C-31,-24 -15,-30 0,-30 C15,-30 31,-24 30,-4 C22,-14 -22,-14 -30,-4 Z" fill="${h}"/>
        <path d="M-36,-18 Q-38,-50 0,-52 Q38,-50 36,-18 Z" fill="#5F7A3A"/>
        <rect x="-33" y="-24" width="66" height="9" rx="3" fill="#B8322A"/>
        <path d="M-34,-15 Q0,-4 34,-15 L30,-10 Q0,0 -30,-10 Z" fill="#2A2A2A"/>
        <circle cy="-34" r="6" fill="#F2C744" stroke="#B8322A" stroke-width="1.5"/>`;
      break;
    case 'bob':
      back = `<path d="M-37,22 C-41,-20 -26,-43 0,-43 C26,-43 41,-20 37,22 Q30,27 25,20 L25,0 L-25,0 L-25,20 Q-30,27 -37,22 Z" fill="${h}"/>`;
      front = bobFront;
      break;
    case 'long':
      back = `<path d="M-37,46 C-45,-20 -26,-43 0,-43 C26,-43 45,-20 37,46 Q24,52 22,22 L-22,22 Q-24,52 -37,46 Z" fill="${h}"/>`;
      front = bobFront;
      break;
    case 'bun':
      back = `<ellipse cy="-4" rx="34" ry="31" fill="${h}"/><circle cy="-42" r="13" fill="${h}"/><rect x="-7" y="-33" width="14" height="5" rx="2" fill="#F07A5A"/>`;
      front = fringe;
      break;
    case 'ponytail':   // buộc đuôi ngựa lệch sau gáy
      back = `<ellipse cy="-4" rx="34" ry="31" fill="${h}"/>
        <path d="M22,-26 Q50,-22 44,14 Q40,28 33,16 Q38,-4 20,-12 Z" fill="${h}"/>
        <rect x="21" y="-27" width="8" height="10" rx="3" fill="${L.clip || '#F07A5A'}" transform="rotate(-25 25 -22)"/>`;
      front = fringe;
      break;
    case 'twin':   // tết hai bím hai bên
      back = `<ellipse cy="-4" rx="34" ry="31" fill="${h}"/>
        <path d="M-28,-10 Q-48,-2 -44,22 Q-42,32 -36,24 Q-38,6 -26,0 Z M28,-10 Q48,-2 44,22 Q42,32 36,24 Q38,6 26,0 Z" fill="${h}"/>
        <circle cx="-31" cy="-4" r="4" fill="${L.clip || '#F07A5A'}"/><circle cx="31" cy="-4" r="4" fill="${L.clip || '#F07A5A'}"/>`;
      front = bobFront;
      break;
    case 'side':   // rẽ ngôi lệch, mái vuốt sang một bên
      back = `<ellipse cy="-4" rx="33" ry="30" fill="${h}"/>`;
      front = `<path d="M-31,-2 C-33,-32 -12,-42 4,-41 C22,-40 34,-28 31,-4 C25,-17 8,-24 -8,-15 C-17,-10 -25,-8 -31,-2 Z" fill="${h}"/>`;
      break;
    case 'spiky':   // tóc dựng
      back = `<ellipse cy="-5" rx="33" ry="30" fill="${h}"/>`;
      front = `<path d="M-31,-2 C-33,-26 -24,-36 -18,-38 L-20,-52 L-8,-41 L-4,-56 L4,-42 L12,-55 L14,-40 L24,-49 L22,-35 C30,-29 33,-18 31,-2 C24,-14 -24,-14 -31,-2 Z" fill="${h}"/>`;
      break;
    default: // messy
      back = `<ellipse cy="-5" rx="34" ry="31" fill="${h}"/>`;
      front = `<path d="M-31,-1 C-34,-30 -16,-41 1,-40 C19,-41 35,-29 31,-1 L27,-11 L21,-2 L15,-14 L8,-4 L1,-15 L-6,-4 L-13,-14 L-19,-3 L-25,-12 Z" fill="${h}"/>
        <path d="M-3,-39 L3,-51 L8,-38 Z" fill="${h}"/>`;
  }
  const blushR = mood === 'eat' || mood === 'happy' ? 7 : 5.5;
  // kẹp tóc nhỏ bên trái (tóc bob / dài / búi)
  const clip = L.clip && ['bob', 'long', 'bun'].includes(L.hairStyle)
    ? `<rect x="-26" y="-27" width="11" height="5" rx="2.5" fill="${L.clip}" transform="rotate(-28 -20 -24)"/>` : '';
  return back +
    `<circle cx="-30" cy="5" r="7" fill="${s}"/><circle cx="30" cy="5" r="7" fill="${s}"/>
     <ellipse cy="3" rx="30" ry="28.5" fill="${s}"/>` + front + clip +
    (L.beard ? `<path d="M-22,12 Q-20,30 0,31 Q20,30 22,12 Q12,22 0,22 Q-12,22 -22,12 Z" fill="${h}" opacity=".55"/>
      <path d="M-9,13 Q0,9 9,13 Q0,16 -9,13 Z" fill="${h}"/>` : '') + eyesSVG(mood, look) +
    `<ellipse cx="-19" cy="13" rx="${blushR}" ry="3.4" fill="#FF8F7E" opacity=".45"/><ellipse cx="19" cy="13" rx="${blushR}" ry="3.4" fill="#FF8F7E" opacity=".45"/>` +
    (L.glasses && mood !== 'happy' && mood !== 'eat' ? `<g fill="none" stroke="#3A3A44" stroke-width="2"><circle cx="-11" cy="5" r="8.5"/><circle cx="11" cy="5" r="8.5"/><path d="M-2.5,5 H2.5"/></g>` : '');
}

function headsetSVG(L) {
  return `<path d="M-34,4 C-36,-47 36,-47 34,4" fill="none" stroke="#24262C" stroke-width="5"/>
    <rect x="-41" y="-7" width="13" height="23" rx="5" fill="#24262C"/><rect x="28" y="-7" width="13" height="23" rx="5" fill="#24262C"/>
    <rect x="-39" y="-2" width="3" height="12" rx="1.5" fill="${L.accent}"/><rect x="36" y="-2" width="3" height="12" rx="1.5" fill="${L.accent}"/>
    <path d="M-36,13 Q-32,27 -13,25" stroke="#24262C" stroke-width="2.5" fill="none"/>`;
}

// Hoa văn trên thân áo: kẻ ngang, ca rô, chấm bi, hình in giữa ngực.
// top/bot = mép trên/dưới thân áo, hw = nửa bề ngang thân (để hoa văn không lòi ra ngoài)
function patternSVG(L, top, bot, hw) {
  const ink = L.trim, w = hw - 4;
  const rows = [];
  for (let y = top + 13; y < bot - 3; y += 9) rows.push(y);
  switch (L.pattern) {
    case 'stripe': return rows.map(y => `<path d="M${-w},${y} H${w}" stroke="${ink}" stroke-width="3.5" opacity=".85"/>`).join('');
    case 'plaid': return rows.map(y => `<path d="M${-w},${y} H${w}" stroke="${ink}" stroke-width="2.5" opacity=".55"/>`).join('') +
      [-w / 2, 0, w / 2].map(x => `<path d="M${x},${top + 8} V${bot - 2}" stroke="${ink}" stroke-width="2.5" opacity=".55"/>`).join('');
    case 'dots': return rows.map((y, i) => [-w / 2, 0, w / 2].map(x =>
      `<circle cx="${x + (i % 2 ? 5 : -5)}" cy="${y}" r="2" fill="${ink}" opacity=".8"/>`).join('')).join('');
    case 'print': {
      const cy = top + (bot - top) * .55;
      return `<circle cy="${cy}" r="${hw * .38}" fill="${L.accent}"/>
        <text y="${cy + hw * .15}" text-anchor="middle" font-size="${hw * .42}" font-weight="800" fill="#fff">${L.print}</text>`;
    }
    default: return '';
  }
}

// Chi tiết thân áo theo kiểu trang phục: hoa văn + cổ áo + phụ kiện (cà vạt, khăn quàng đỏ)
function topDetailSVG(L, top, bot, hw) {
  const dark = shade(L.shirt, .72);
  const mid = (top + bot) / 2;
  let s = patternSVG(L, top, bot, hw);
  switch (L.style) {
    case 'uniform':
      s += `<path d="M-11,${top + 1} L0,${top + 14} L11,${top + 1}" fill="none" stroke="${L.trim}" stroke-width="4" stroke-linejoin="round"/>
        <rect x="6" y="${top + 20}" width="9" height="7" rx="1" fill="none" stroke="${L.trim}" stroke-width="1.5"/>`;
      break;
    case 'hoodie': s += `<path d="M-7,${top + 4} L-8,${top + 22} M7,${top + 4} L8,${top + 22}" stroke="#E9E9EE" stroke-width="2" stroke-linecap="round"/>`; break;
    case 'jacket': s += `<path d="M0,${top + 2} V${bot}" stroke="${L.trim}" stroke-width="2.5"/>`; break;
    case 'shirt':   // sơ mi: cổ bẻ, hàng cúc
      s += `<path d="M-11,${top + 1} L-3,${top + 10} L0,${top + 4} L3,${top + 10} L11,${top + 1}" fill="${shade(L.shirt, 1.08)}" stroke="${dark}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M0,${top + 8} V${bot - 2}" stroke="${dark}" stroke-width="1.2" opacity=".6"/>
        ${[.32, .55, .78].map(k => `<circle cy="${top + (bot - top) * k}" r="1.4" fill="${dark}"/>`).join('')}`;
      break;
    case 'polo':   // cổ bẻ ngắn + 2 cúc
      s += `<path d="M-11,${top + 1} L-2,${top + 7} L-5,${top + 12} Z M11,${top + 1} L2,${top + 7} L5,${top + 12} Z" fill="${shade(L.shirt, 1.12)}" stroke="${dark}" stroke-width="1"/>
        <path d="M0,${top + 6} V${top + 18}" stroke="${dark}" stroke-width="1.3"/><circle cy="${top + 11}" r="1.2" fill="${dark}"/><circle cy="${top + 16}" r="1.2" fill="${dark}"/>`;
      break;
    case 'blouse':   // cổ sen tròn màu trắng
      s += `<path d="M-13,${top + 1} Q-12,${top + 10} -1,${top + 6} Q-6,${top + 2} -13,${top + 1} Z M13,${top + 1} Q12,${top + 10} 1,${top + 6} Q6,${top + 2} 13,${top + 1} Z" fill="#FFFDF6" stroke="${dark}" stroke-width="1"/>`;
      break;
    case 'cardigan':   // áo khoác len mở vạt, lộ áo trong
      s += `<path d="M-7,${top + 1} L7,${top + 1} L6,${bot - 1} L-6,${bot - 1} Z" fill="${L.inner}"/>
        <path d="M-7,${top + 1} L-6,${bot - 1} M7,${top + 1} L6,${bot - 1}" stroke="${dark}" stroke-width="1.5"/>
        ${[.35, .6].map(k => `<circle cx="-9" cy="${top + (bot - top) * k}" r="1.5" fill="${dark}"/>`).join('')}`;
      break;
    case 'tank':   // áo ba lỗ: khoét cổ sâu, lộ vai
      s += `<path d="M-13,${top} Q0,${top + 16} 13,${top} Z" fill="${L.skin}"/>`;
      break;
    case 'dress':   // váy liền: cổ tròn + dây thắt eo
      s += `<path d="M-9,${top + 1} Q0,${top + 8} 9,${top + 1}" stroke="${dark}" stroke-width="2.5" fill="none"/>
        <path d="M${-hw + 2},${bot - 7} H${hw - 2}" stroke="${dark}" stroke-width="3"/>`;
      break;
    case 'aodai':   // áo dài: cổ đứng + đường cúc chéo sang vai phải
      s += `<rect x="-7" y="${top - 2}" width="14" height="7" rx="2" fill="${L.shirt}" stroke="${dark}" stroke-width="1"/>
        <path d="M2,${top + 5} Q12,${top + 9} 16,${top + 20}" stroke="${dark}" stroke-width="1.3" fill="none"/>`;
      break;
    case 'jersey':   // áo thi đấu: cổ tim viền màu + số áo
      s += `<path d="M-9,${top + 1} L0,${top + 12} L9,${top + 1}" fill="none" stroke="${L.trim}" stroke-width="3.5" stroke-linejoin="round"/>
        <text y="${mid + hw * .3}" text-anchor="middle" font-size="${hw * .8}" font-weight="800" fill="${L.trim}">${L.number}</text>`;
      break;
    default: s += `<path d="M-9,${top + 1} Q0,${top + 8} 9,${top + 1}" stroke="${shade(L.shirt, .8)}" stroke-width="2.5" fill="none"/>`;
  }
  if (L.tie) s += `<path d="M-3,${top + 8} L3,${top + 8} L4.5,${top + 30} L0,${top + 36} L-4.5,${top + 30} Z" fill="${L.tie}"/>`;
  if (L.scarf)   // khăn quàng đỏ của học sinh
    s += `<path d="M-12,${top + 1} L0,${top + 8} L12,${top + 1} L9,${top + 6} L0,${top + 12} L-9,${top + 6} Z" fill="#D9312B"/>
      <path d="M-2,${top + 10} L-7,${top + 27} L-1,${top + 25} Z M2,${top + 10} L7,${top + 27} L1,${top + 25} Z" fill="#D9312B"/>`;
  return s;
}

// Độ dài tay áo (phần áo phủ trên cánh tay): 0 = không tay (ba lỗ)
const SLEEVE = { tee: .38, owner: .38, polo: .38, jersey: .38, blouse: .38, dress: .3, tank: 0 };
function armSVG(sx, sy, [hx, hy], L) {
  const t = SLEEVE[L.style] ?? .84;
  return `<path d="M${sx},${sy} L${hx},${hy}" stroke="${L.skin}" stroke-width="8.5" stroke-linecap="round"/>` +
    (t ? `<path d="M${sx},${sy} L${(sx + (hx - sx) * t).toFixed(1)},${(sy + (hy - sy) * t).toFixed(1)}" stroke="${L.shirt}" stroke-width="12.5" stroke-linecap="round"/>` : '');
}
const handSVG = ([x, y], L, cls = '') =>
  `<g class="${cls}"><circle cx="${x}" cy="${y}" r="6.5" fill="${L.skin}" stroke="${shade(L.skin, .82)}" stroke-width="1.5"/></g>`;

// ---------- Đồ ăn, thức uống ----------
function bowlSVG(empty = false) {
  return `<ellipse cy="1" rx="18" ry="5" fill="#000" opacity=".1"/>
    <path d="M-18,-3 Q-16,12 0,13 Q16,12 18,-3 Z" fill="#F4EFE6" stroke="#D3C7B3" stroke-width="1"/>
    <path d="M-12,5 H12" stroke="#2F6FB3" stroke-width="1.5" opacity=".6"/>
    <ellipse cy="-3" rx="17" ry="5" fill="${empty ? '#E9DCC4' : '#E7A94A'}"/>
    ${empty ? '' : `<path d="M-11,-3 q3,-3 6,0 t6,0 t6,0" stroke="#F8DB8A" stroke-width="2.2" fill="none"/>
      <ellipse cx="5" cy="-4" rx="6.5" ry="3.6" fill="#fff"/><circle cx="5" cy="-4.2" r="2.5" fill="#F7B32B"/>
      <circle cx="-8" cy="-5" r="1.4" fill="#4FA35A"/><circle cx="-4" cy="-2" r="1.2" fill="#4FA35A"/>`}
    <path d="M-22,-9 L18,-5 M-22,-6 L18,-2" stroke="#C8905E" stroke-width="2" stroke-linecap="round" ${empty ? 'transform="rotate(14)"' : ''}/>`;
}
function cupSVG(empty = false) {
  return `<ellipse cy="1" rx="10" ry="3" fill="#000" opacity=".1"/>
    <path d="M-9,-26 L9,-26 L7,0 L-7,0 Z" fill="#fff" fill-opacity=".35" stroke="#CFE0E6" stroke-width="1.2"/>
    ${empty ? `<path d="M-7,-6 L7,-6 L7,0 L-7,0 Z" fill="#F6C66B" opacity=".5"/>`
      : `<path d="M-8.3,-20 L8.3,-20 L7,0 L-7,0 Z" fill="#F6C66B" opacity=".92"/>
      <rect x="-6" y="-19" width="6" height="5" rx="1" fill="#fff" opacity=".7" transform="rotate(-12 -3 -16)"/>
      <rect x="1" y="-15" width="5" height="5" rx="1" fill="#fff" opacity=".7"/>
      <circle cx="3" cy="-23" r="4" fill="#B5D84A"/><circle cx="3" cy="-23" r="2.2" fill="#E9F59A"/>
      <circle cx="-6" cy="-10" r="1" fill="#fff" opacity=".8"/><circle cx="6.5" cy="-7" r=".9" fill="#fff" opacity=".8"/>`}
    <path d="M2,-26 L6,-38" stroke="#F07A5A" stroke-width="2.6" stroke-linecap="round"/>`;
}
function trashSVG() {
  return `<g transform="translate(-4 0)">${bowlSVG(true)}</g>
    <path d="M22,-4 q4,-7 9,-3 q5,2 1,7 q-5,4 -9,0 z" fill="#fff" stroke="#DDD" stroke-width="1"/>
    <g transform="translate(-30 -2) rotate(80)"><rect x="-6" y="-9" width="12" height="18" rx="3" fill="#2FA36B"/></g>`;
}

// Nhân vật đứng; gốc toạ độ ở chân
function standingSVG(L, o = {}) {
  // Phần dưới: quần dài / quần đùi / váy / váy liền / áo dài (vạt áo phủ trên quần)
  const B = L.bottom || 'pants';
  const bare = B === 'shorts' || B === 'skirt' || B === 'dress';   // cẳng chân để trần
  const shin = bare ? L.skin : L.pants;
  const skirtCol = B === 'dress' ? L.shirt : L.pants;
  // Ngồi ghế nhựa: đầu gối ngang mặt ghế, cẳng chân thả xuống đất
  const legs = o.stool
    ? `<rect x="-25" y="-40" width="12" height="36" rx="5" fill="${shin}"/><rect x="13" y="-40" width="12" height="36" rx="5" fill="${shin}"/>
       <circle cx="-19" cy="-38" r="7.5" fill="${B === 'shorts' || B === 'pants' ? L.pants : shin}"/><circle cx="19" cy="-38" r="7.5" fill="${B === 'shorts' || B === 'pants' ? L.pants : shin}"/>
       <ellipse cx="-20" cy="-3" rx="8" ry="3.5" fill="${L.sandal}"/><ellipse cx="20" cy="-3" rx="8" ry="3.5" fill="${L.sandal}"/>
       ${B === 'skirt' || B === 'dress' ? `<path d="M-29,-50 L29,-50 L32,-37 Q0,-32 -32,-37 Z" fill="${skirtCol}"/>` : ''}
       ${L.style === 'aodai' ? `<path d="M-24,-52 L24,-52 L27,-30 Q0,-26 -27,-30 Z" fill="${L.shirt}" stroke="${shade(L.shirt, .85)}"/>` : ''}`
    : `<g class="leg-l"><rect x="-12" y="-30" width="9" height="26" rx="4" fill="${shin}"/>${B === 'shorts' ? `<rect x="-13" y="-30" width="11" height="12" rx="3" fill="${L.pants}"/>` : ''}<ellipse cx="-8" cy="-3" rx="7" ry="3.5" fill="${L.sandal}"/></g>
    <g class="leg-r"><rect x="3" y="-30" width="9" height="26" rx="4" fill="${shin}"/>${B === 'shorts' ? `<rect x="2" y="-30" width="11" height="12" rx="3" fill="${L.pants}"/>` : ''}<ellipse cx="8" cy="-3" rx="7" ry="3.5" fill="${L.sandal}"/></g>
    ${B === 'skirt' || B === 'dress' ? `<path d="M-16,-27 L16,-27 L20,-13 Q0,-9 -20,-13 Z" fill="${skirtCol}"/>` : ''}
    ${L.style === 'aodai' ? `<path d="M-15,-27 L15,-27 L13,-7 Q0,-5 -13,-7 Z" fill="${L.shirt}" stroke="${shade(L.shirt, .85)}"/>` : ''}`;
  let hl = [-25, -32], hr = [25, -32];
  if (o.carry) { hl = [-11, -44]; hr = [11, -44]; }
  if (o.pose === 'cook') hr = [30, -56];
  const torso = `<path d="M-22,-24 C-24,-54 -18,-70 0,-70 C18,-70 24,-54 22,-24 Q0,-19 -22,-24 Z" fill="${L.shirt}"/>` + topDetailSVG(L, -70, -24, 22);
  const apron = L.apron ? `<path d="M-15,-58 L15,-58 L19,-22 Q0,-17 -19,-22 Z" fill="#1FA89A"/>
      <path d="M-15,-58 L-12,-68 M15,-58 L12,-68" stroke="#1FA89A" stroke-width="3"/>
      <text y="-36" text-anchor="middle" font-size="9" font-weight="800" fill="#FFF3DA">NET</text>` : '';
  const towel = L.towel ? `<path d="M6,-70 Q22,-73 24,-62 L22,-38 L14,-38 L15,-62 Z" fill="#fff" stroke="#E0DCD2"/><path d="M14,-44 H22" stroke="#F07A5A" stroke-width="2"/>` : '';
  const helmet = L.helmet && !o.carry
    ? `<g transform="translate(${hl[0] - 3} ${hl[1] + 8})"><path d="M-14,0 A14,13 0 0 1 14,0 Z" fill="${L.helmet}"/><rect x="-15" y="-1" width="30" height="4" rx="2" fill="${shade(L.helmet, .7)}"/><path d="M-6,-9 Q0,-12 6,-9" stroke="#fff" opacity=".5" stroke-width="2" fill="none"/></g>` : '';
  const bag = L.bag ? `<path d="M-17,-64 L15,-32" stroke="#6B4A2F" stroke-width="3.5"/><rect x="9" y="-38" width="15" height="12" rx="3" fill="#8A5A3B"/>` : '';
  const carry = o.carry ? `<g class="held" transform="translate(0 -46)">${o.carry === 'bowl' ? bowlSVG() : `<g transform="translate(0 4)">${cupSVG()}</g>`}</g>` : '';
  const hood = L.style === 'hoodie' || L.style === 'jacket' ? `<path d="M-24,-62 Q-28,-96 0,-98 Q28,-96 24,-62 Z" fill="${L.trim}"/>` : '';
  return `<ellipse rx="22" ry="6" fill="#3A2A22" opacity=".16"/>${legs}
    <g class="upper" ${o.stool ? 'transform="translate(0 -12)"' : ''}>${hood}${torso}${apron}${towel}${bag}
      ${armSVG(-18, -62, hl, L)}<g class="${o.pose === 'cook' ? 'stir' : ''}">${armSVG(18, -62, hr, L)}${handSVG(hr, L)}</g>
      ${handSVG(hl, L)}${helmet}
      <g transform="translate(0 -98)">${headSVG(L, o.mood || 'idle', o.look || 0)}${L.headset && !o.owner ? headsetSVG(L) : ''}</g>
      ${carry}
    </g>`;
}

// ---------- Dàn máy theo cấp linh kiện ----------
const DESKS = [
  { w: 90, top: '#C8905E', edge: '#8A5A3B', leg: '#7A4B2C' },
  { w: 90, top: '#D2A477', edge: '#946241', leg: '#7A4B2C' },
  { w: 96, top: '#2A2D34', edge: '#1B1D22', leg: '#15161A', rgb: true },
  { w: 106, top: '#EDE3D2', edge: '#B89C78', leg: '#DCD0BC', glow: true },
];
function chairSVG(lv) {
  switch (lv) {
    case 0: return `<rect x="-38" y="-214" width="76" height="72" rx="13" fill="#3D7FD6"/>
      <rect x="-27" y="-201" width="54" height="7" rx="3.5" fill="#2C66B4"/><rect x="-27" y="-187" width="54" height="7" rx="3.5" fill="#2C66B4"/>`;
    case 1: return `<rect x="-36" y="-234" width="72" height="96" rx="17" fill="#2F323A"/><rect x="-28" y="-224" width="56" height="74" rx="13" fill="#3C4049"/>
      <rect x="-48" y="-162" width="16" height="8" rx="4" fill="#222"/><rect x="32" y="-162" width="16" height="8" rx="4" fill="#222"/>`;
    case 2: return `<path d="M-46,-236 L-56,-212 L-44,-192 Z M46,-236 L56,-212 L44,-192 Z" fill="#2A2E36"/>
      <path d="M-42,-140 L-46,-236 Q-44,-270 -22,-278 L22,-278 Q44,-270 46,-236 L42,-140 Z" fill="#1F2228"/>
      <path d="M-20,-272 L-14,-150 M20,-272 L14,-150" stroke="#1FA89A" stroke-width="7"/>
      <path d="M-7,-262 L0,-253 L7,-262 L0,-271 Z" fill="#46E6F2"/>
      <rect x="-54" y="-164" width="18" height="9" rx="4" fill="#15161A"/><rect x="36" y="-164" width="18" height="9" rx="4" fill="#15161A"/>`;
    default: return `<rect x="-6" y="-256" width="12" height="24" fill="#9AA1A9"/>
      <rect x="-32" y="-288" width="64" height="32" rx="13" fill="#5D6570" stroke="#D5DAE0" stroke-width="3"/>
      <rect x="-40" y="-238" width="80" height="98" rx="20" fill="url(#pMesh)" stroke="#D5DAE0" stroke-width="4"/>
      <rect x="-54" y="-164" width="18" height="9" rx="4" fill="#D5DAE0"/><rect x="36" y="-164" width="18" height="9" rx="4" fill="#D5DAE0"/>`;
  }
}
function monitorSVG(lv) {
  const M = [
    { w: 70, h: 46, b: -124, c: '#CFC8B8', base: '#B9B2A2' },
    { w: 92, h: 50, b: -130, c: '#2D2F36', base: '#3A3C44' },
    { w: 116, h: 54, b: -130, c: '#26282F', base: '#3A3C44', ring: '#46E6F2' },
    { w: 156, h: 52, b: -132, c: '#1F2026', base: '#D5DAE0', ring: '#A57BFF', curve: true },
  ][lv];
  const x = -M.w / 2, y = M.b - M.h;
  const panel = M.curve
    ? `<path d="M${x},${y} Q0,${y + 9} ${-x},${y} L${-x},${M.b} Q0,${M.b + 9} ${x},${M.b} Z" fill="${M.c}"/>
       <path d="M${x + 6},${M.b + 2} Q0,${M.b + 10} ${-x - 6},${M.b + 2}" stroke="${M.ring}" stroke-width="2.5" fill="none" class="rgb"/>`
    : `<rect x="${x}" y="${y}" width="${M.w}" height="${M.h}" rx="${lv ? 4 : 6}" fill="${M.c}"/>`;
  const bulge = lv === 0
    ? `<rect x="-22" y="${y + 8}" width="44" height="30" rx="6" fill="${shade(M.c, .9)}"/><circle cx="0" cy="${y + 23}" r="3" fill="#9A927F"/>`
    : `<rect x="-17" y="${y + M.h * .3}" width="34" height="${M.h * .45}" rx="4" fill="${shade(M.c, 1.25)}"/>`;
  const ring = M.ring ? `<circle cx="0" cy="${y + M.h * .5}" r="${lv === 3 ? 15 : 12}" fill="none" stroke="${M.ring}" stroke-width="3" class="rgb"/>` : '';
  return `<ellipse cx="0" cy="-118" rx="${lv === 3 ? 26 : 19}" ry="4.5" fill="${M.base}"/>
    <rect x="-4" y="${M.b - 4}" width="8" height="${-118 - M.b + 4}" fill="${M.base}"/>
    ${panel}${bulge}${ring}`;
}
function keyboardSVG(lv) {
  const base = ['#DCD6C8', '#2B2B31', '#1D1D22', '#F4EAD8'][lv];
  let keys = '';
  const caps = ['#F07A5A', '#1FA89A', '#FFF6E3', '#F2B632'];
  [-114.5, -111, -107.5].forEach((y, r) => {
    for (let k = 0; k < 10; k++) {
      const x = -31 + k * 6.2 - r * .6;
      const fill = lv === 3 ? caps[(k + r) % 4] : lv === 2 ? 'url(#gRainbow)' : lv === 1 ? '#4A4A52' : '#C4BDAC';
      keys += `<rect x="${x.toFixed(1)}" y="${y}" width="5" height="2.6" rx=".6" fill="${fill}"/>`;
    }
  });
  return `<polygon points="-35,-117 31,-117 34,-104 -38,-104" fill="${base}" stroke="${shade(base, .78)}" stroke-width="1"/>
    <g class="${lv === 2 ? 'rgb' : ''}">${keys}</g>`;
}
function mouseSVG(lv) {
  const pad = lv === 1 || lv === 2 ? `<rect x="40" y="-121" width="32" height="19" rx="3" fill="#1D2230"/>` : '';
  const body = [
    `<path d="M55,-117 Q60,-128 44,-124" stroke="#9A927F" stroke-width="1.2" fill="none"/><ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#E4DECF" stroke="#BDB39C"/>`,
    `<ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#26262C"/><path d="M55,-117 V-112" stroke="#E2463A" stroke-width="1.5"/>`,
    `<ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#F4F5F7" stroke="#C9CDD2"/>`,
    `<ellipse cx="55" cy="-110" rx="7.5" ry="9.5" fill="none" stroke="#46E6F2" stroke-width="2" class="rgb" opacity=".8"/><ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#1B1B20"/>`,
  ][lv];
  return pad + body;
}
function caseSVG(lv) {
  switch (lv) {
    case 0: return `<rect x="42" y="-80" width="36" height="78" rx="3" fill="#DCD4C0" stroke="#BDB39C" stroke-width="1.5"/>
      <rect x="47" y="-72" width="26" height="7" fill="#CFC6B0" stroke="#B0A68E"/><rect x="47" y="-61" width="26" height="7" fill="#CFC6B0" stroke="#B0A68E"/>
      <circle cx="60" cy="-30" r="3.5" fill="#A8A08A"/><circle cx="69" cy="-12" r="1.8" fill="#5BE36A"/>`;
    case 1: return `<rect x="42" y="-82" width="36" height="80" rx="3" fill="#2A2C33"/>
      <rect x="46" y="-76" width="3" height="68" rx="1.5" fill="#4AA8FF"/><circle cx="66" cy="-72" r="3" fill="#4AA8FF"/>`;
    case 2: return `<rect x="40" y="-86" width="40" height="84" rx="3" fill="#1B1D22"/><rect x="44" y="-82" width="32" height="76" rx="2" fill="#10131A"/>
      <g fill="none" stroke="#46E6F2" stroke-width="3"><circle cx="60" cy="-62" r="10"/><circle cx="60" cy="-32" r="10"/></g>
      <g class="spin-slow" fill="#46E6F2" opacity=".5"><circle cx="60" cy="-62" r="4"/></g>`;
    default: return `<rect x="38" y="-92" width="44" height="90" rx="4" fill="#EEF0F4"/><rect x="42" y="-88" width="36" height="82" rx="2" fill="#1A1530"/>
      <g fill="none" stroke-width="3" class="rgb"><circle cx="60" cy="-72" r="8.5" stroke="#A57BFF"/><circle cx="60" cy="-48" r="8.5" stroke="#46E6F2"/><circle cx="60" cy="-24" r="8.5" stroke="#FF6FB5"/></g>`;
  }
}

const POSES = {
  play:  { l: [-16, -110], r: [55, -111], mood: 'focus', type: true },
  win:   { l: [-46, -262], r: [46, -262], mood: 'happy' },
  lose:  { l: [-31, -232], r: [31, -232], mood: 'sad' },
  order: { l: [-16, -110], r: [44, -270], mood: 'call' },
  wait:  { l: [-16, -110], r: [55, -111], mood: 'hungry', peek: true },
  eat:   { l: [-48, -114], r: [8, -192], mood: 'eat', frontR: true },
  drink: { l: [-16, -110], r: [6, -188], mood: 'eat', frontR: true },
  lag:   { l: [-16, -110], r: [55, -111], mood: 'sad', type: true },
};

function stationSVG(st) {
  const m = st.m, c = st.cust, tier = tierOf(st), D = DESKS[m.chair];
  const p = c ? POSES[c.pose] || POSES.play : null;
  const L = c && c.look;
  const low = ([, y]) => y > -140;

  let body = '';
  if (c) {
    const hood = L.style === 'hoodie' || L.style === 'jacket' ? `<path d="M-25,-178 Q-30,-214 0,-216 Q30,-214 25,-178 Z" fill="${L.trim}"/>` : '';
    const face = `<g transform="translate(0 -212)">${headSVG(L, p.mood, c.look2 || 0)}${L.headset ? headsetSVG(L) : ''}</g>`;
    const hi = h => (low(h) ? '' : handSVG(h, L));
    const chop = c.pose === 'eat' ? `<path d="M12,-186 L-2,-201 M15,-188 L2,-203" stroke="#C8905E" stroke-width="2.2" stroke-linecap="round"/><path d="M0,-200 q-4,10 1,18" stroke="#F8DB8A" stroke-width="2.4" fill="none"/>` : '';
    const heldCup = c.pose === 'drink' ? `<g transform="translate(8 -176) rotate(-10)">${cupSVG()}</g>` : '';
    body = `<g class="${p.peek ? 'peek' : ''} ${c.pose === 'win' ? 'hop' : ''} ${c.pose === 'lose' ? 'shake' : ''} ${c.justSat ? 'sit-in' : ''}">
      ${hood}<path d="M-25,-126 C-27,-160 -21,-188 0,-188 C21,-188 27,-160 25,-126 Z" fill="${L.shirt}"/>${topDetailSVG(L, -188, -126, 25)}
      ${armSVG(-19, -178, p.l, L)}${p.frontR ? '' : armSVG(19, -178, p.r, L)}
      ${face}${hi(p.l)}${p.frontR ? armSVG(19, -178, p.r, L) : ''}${hi(p.r)}${chop}${heldCup}
    </g>`;
  }

  let s = `<ellipse cx="0" cy="-2" rx="${D.w + 22}" ry="12" fill="#3A2A22" opacity=".13"/>
    <path class="hl" d="M${-D.w - 16},-6 Q0,14 ${D.w + 16},-6" stroke="#1FA89A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g class="seat ${c && c.pose === 'win' ? 'nudge' : ''}">${chairSVG(m.chair)}${body}</g>`;

  // Mặt bàn + đồ trên bàn
  s += `<path d="M${-D.w},-122 L${D.w},-122 L${D.w + 4},-92 L${-D.w - 4},-92 Z" fill="${D.top}"/>`;
  if (m.mouse === 3) s += `<rect x="-58" y="-121" width="134" height="21" rx="4" fill="#2A2240" stroke="#A57BFF" stroke-width="1.5"/>`;
  s += keyboardSVG(m.kb) + mouseSVG(m.mouse);
  if (st.trash) s += `<g transform="translate(-60 -104)">${trashSVG()}</g>`;
  else if (st.item === 'bowl' && c && c.pose === 'eat') s += `<g transform="translate(-58 -104)">${bowlSVG()}</g>`;
  else if (st.item === 'bowl') s += `<g transform="translate(-60 -104)">${bowlSVG(false)}</g>`;
  else if (st.item === 'cup') s += `<g transform="translate(-64 -103)">${cupSVG()}</g>`;
  else if (st.item === 'emptyBowl') s += `<g transform="translate(-60 -104)">${bowlSVG(true)}</g>`;
  else if (st.item === 'emptyCup') s += `<g transform="translate(-64 -103)">${cupSVG(true)}</g>`;

  if (c) {
    if (low(p.l)) s += handSVG(p.l, L, p.type ? 'tap' : '');
    if (low(p.r)) s += handSVG(p.r, L, p.type ? 'jig' : '');
  }
  s += monitorSVG(m.mon);

  // Mép bàn, chân bàn, gầm bàn
  if (c) {
    s += `<g class="${c.pose === 'win' ? 'kick' : ''}">
      <rect x="-15" y="-82" width="11" height="36" rx="4" fill="${L.pants}"/><rect x="4" y="-82" width="11" height="36" rx="4" fill="${L.pants}"/>
      <ellipse cx="-10" cy="-44" rx="8" ry="4" fill="${L.sandal}"/><ellipse cx="10" cy="-44" rx="8" ry="4" fill="${L.sandal}"/></g>`;
  }
  s += caseSVG(tier - 1);
  s += `<rect x="${-D.w - 4}" y="-92" width="${2 * D.w + 8}" height="10" rx="2" fill="${D.edge}"/>
    <rect x="${-D.w}" y="-84" width="${D.glow ? 14 : 8}" height="84" fill="${D.leg}"/><rect x="${D.w - (D.glow ? 14 : 8)}" y="-84" width="${D.glow ? 14 : 8}" height="84" fill="${D.leg}"/>`;
  if (D.rgb) s += `<rect class="rgb" x="${-D.w + 4}" y="-88" width="${2 * D.w - 8}" height="3" rx="1.5" fill="url(#gRainbow)"/>`;
  s += `<g transform="translate(${-D.w + 16} -87)"><rect x="-12" y="-6" width="24" height="12" rx="4" fill="#1FA89A"/>
    <text y="3.5" text-anchor="middle" font-size="9" font-weight="800" fill="#fff">${String(st.i + 1).padStart(2, '0')}</text></g>`;
  return s;
}

// Ánh màn hình — "chữ ký" ban đêm của quán (vẽ ở lớp hoà sáng "screen", trên lớp tối).
// Khách ngồi đối diện người chơi nên màn hình quay lưng lại: ánh sáng hắt lên mặt khách,
// rỉ ra viền màn hình và loang xuống sàn. Màu theo hạng máy, thắng thì vàng, thua thì đỏ.
const GLOW_HEX = { gBlue: '#9FD0FF', gCyan: '#46E6F2', gPurple: '#A57BFF', gGold: '#FFD04A', gRed: '#FF5C6C' };
const MONS = [{ w: 70, h: 46, b: -124 }, { w: 92, h: 50, b: -130 }, { w: 116, h: 54, b: -130 }, { w: 156, h: 52, b: -132 }];
function stationGlowSVG(st) {
  const c = st.cust, tier = tierOf(st), D = DESKS[st.m.chair];
  // máy trống: màn tắt, chỉ còn đèn chờ trên thùng máy
  if (!c) return `<circle cx="69" cy="-12" r="9" fill="url(#gCyan)"/><circle cx="69" cy="-12" r="2" fill="#7CFFB0"/>`;
  const g = c.pose === 'win' ? 'gGold' : c.pose === 'lose' ? 'gRed' : tier >= 4 ? 'gPurple' : tier >= 2 ? 'gCyan' : 'gBlue';
  const M = MONS[st.m.mon], hex = GLOW_HEX[g], x = -M.w / 2, y = M.b - M.h;
  // mỗi máy chập chờn lệch nhịp nhau như đang đổi cảnh game
  return `<g class="tv" style="animation-delay:${-(st.i % 3) * 0.9}s">
    <ellipse cx="0" cy="-200" rx="42" ry="40" fill="url(#${g})" opacity=".55"/>
    <ellipse cx="0" cy="${(y + M.b) / 2}" rx="${M.w * .8}" ry="${M.h * 1.05}" fill="url(#${g})" opacity=".5"/>
    <rect x="${x - 2}" y="${y - 2}" width="${M.w + 4}" height="${M.h + 4}" rx="6" fill="none" stroke="${hex}" stroke-width="5" opacity=".25"/>
    <rect x="${x - 1}" y="${y - 1}" width="${M.w + 2}" height="${M.h + 2}" rx="5" fill="none" stroke="${hex}" stroke-width="1.6" opacity=".65"/>
    <rect x="${-D.w}" y="-124" width="${D.w * 2}" height="5" rx="2" fill="${hex}" opacity=".35"/>
    <ellipse cx="0" cy="-4" rx="${D.w + 10}" ry="16" fill="url(#${g})" opacity=".55"/>
    ${D.glow ? `<ellipse cx="0" cy="-40" rx="120" ry="30" fill="url(#gPurple)" opacity=".7"/>` : ''}
  </g>`;
}

// Đèn nháy dọc mép tường ốp + biển neon tay cầm "GAME".
// lit = false: bóng tắt (vẽ cùng tường, dưới lớp tối) · lit = true: bóng sáng (vẽ ở lớp hoà sáng)
const BULBS = ['#FF6FB5', '#FFD04A', '#46E6F2', '#4FE38A'];
function fairyLightsSVG(lit) {
  const y = FLOOR_TOP - 72;
  let s = lit ? '' : `<path d="M0,${y} ${Array.from({ length: 19 }, (_, i) => `Q${i * 40 + 20},${y + 12} ${i * 40 + 40},${y}`).join(' ')}"
    fill="none" stroke="#3A2A22" stroke-width="1.2" opacity=".5"/>`;
  for (let i = 0; i < 19; i++) {
    const cx = i * 40 + 20, cy = y + 9, c = BULBS[i % 4];
    s += lit
      ? `<g class="twinkle" style="animation-delay:${(-(i * 0.37) % 1.6).toFixed(2)}s"><circle cx="${cx}" cy="${cy}" r="12" fill="url(#gWarm)" opacity=".7"/><circle cx="${cx}" cy="${cy}" r="3.2" fill="${c}"/></g>`
      : `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${shade(c, .7)}"/>`;
  }
  return s;
}
function neonGameSVG(lit) {
  const tube = lit ? '#FF6FB5' : '#C9A7B8', tube2 = lit ? '#46E6F2' : '#A9C2C4';
  const f = lit ? 'filter="url(#fNeon)"' : '';
  return `<g transform="translate(232 96)" class="${lit ? 'blink' : ''}">
    ${lit ? '' : `<rect x="-46" y="-26" width="92" height="66" rx="10" fill="#2B2230" opacity=".85"/>`}
    <g fill="none" stroke="${tube2}" stroke-width="3" stroke-linecap="round" ${f}>
      <path d="M-22,-12 h44 a10,10 0 0 1 0,20 h-44 a10,10 0 0 1 0,-20 z"/><path d="M-20,-2 h8 M-16,-6 v8"/><circle cx="14" cy="-4" r="1.5"/><circle cx="19" cy="1" r="1.5"/>
    </g>
    <text y="31" text-anchor="middle" font-size="20" class="baloo" fill="none" stroke="${tube}" stroke-width="1.6" ${f} letter-spacing="2">GAME</text>
  </g>`;
}

// ---------- Chủ quán & diện mạo khách ----------
const OWNER_LOOK = {
  skin: '#F1C39A', hair: '#2A1D17', hairStyle: 'messy', shirt: '#F7F3EA', trim: '#DDD8CC',
  style: 'owner', pants: '#4A4A52', sandal: '#3A3A3A', apron: true, towel: true,
};

const pick = a => a[Math.floor(Math.random() * a.length)];
const SKINS = ['#F8D6B3', '#F1C39A', '#E6B088', '#FADFC4', '#D9A27A'];
const HAIRS = ['#2A1D17', '#3B2A20', '#1E1B22', '#5A3B25'];
// Bảng màu: áo nhiều màu, quần/váy màu trầm — mỗi khách tự phối một bộ nên ít ai trùng ai
const TOPS = ['#F07A5A', '#49B7A8', '#F2CB57', '#5A8FE0', '#E86A92', '#8E6BD8', '#4FA35A', '#F4F1E8',
  '#2B2D35', '#E2463A', '#F3A8C0', '#7FC8E8', '#C9A27A', '#3C8D7F', '#F59E3A'];
const BOTTOMS = ['#4A5A78', '#3E4A5E', '#2B2B33', '#6B5A4A', '#5A6B3E', '#8A8F9A', '#2F4A7A', '#C9B79C'];
const PRINTS = ['★', 'GG', '♥', '☻', '99', '✿'];

// Mỗi bộ đồ: who = giới tính mặc được ('m' nam, 'f' nữ) · style = dáng áo · colors/pants = màu được chọn
// pattern = hoa văn có thể có (null = trơn) · bottom = quần dài / quần đùi / váy (nam không mặc váy)
const CASUAL = [
  { who: 'mf', style: 'tee', pattern: [null, null, 'stripe', 'print'], bottom: ['pants', 'pants', 'shorts'] },
  { who: 'mf', style: 'polo', bottom: ['pants', 'shorts'] },
  { who: 'm', style: 'shirt', pattern: ['plaid', 'plaid', null], bottom: ['pants'] },
  { who: 'm', style: 'tank', pattern: [null, 'stripe'], bottom: ['shorts'] },
  { who: 'mf', style: 'hoodie', bottom: ['pants'] },
  { who: 'mf', style: 'jacket', bottom: ['pants'], helmet: true },   // áo khoác chống nắng, đội mũ bảo hiểm
  { who: 'f', style: 'blouse', pattern: [null, 'dots'], bottom: ['skirt', 'pants'] },
  { who: 'f', style: 'dress', pattern: [null, 'dots', 'stripe'] },
  { who: 'f', style: 'cardigan', bottom: ['skirt', 'pants'] },
];
// Trang phục theo tệp khách (khóa trong SEGMENTS của data.js); tệp lạ thì mặc đồ thường
const SEG_OUTFITS = {
  vanphong: [
    { who: 'm', style: 'shirt', colors: ['#CFE2F5', '#FFFFFF', '#F5D6D6', '#DDE3EA'], pants: ['#3A3F4A', '#2B2B33', '#5A5048'], tie: .6, glasses: .4 },
    { who: 'f', style: 'blouse', colors: ['#FFFFFF', '#F5D6D6', '#CFE2F5', '#F2E6C9'], pants: ['#3A3F4A', '#2B2B33'], bottom: ['skirt', 'pants'], glasses: .3 },
    { who: 'f', style: 'cardigan', colors: ['#B8C6D9', '#E8C8A0', '#C9B3D9'], pants: ['#3A3F4A'], bottom: ['skirt'] },
  ],
  hocsinh: [   // THCS: áo trắng, khăn quàng đỏ
    { who: 'm', style: 'uniform', colors: ['#FFFFFF'], trim: '#2F4A7A', pants: ['#2F4A7A'], bottom: ['pants', 'shorts'], scarf: true, bag: true },
    { who: 'f', style: 'uniform', colors: ['#FFFFFF'], trim: '#2F4A7A', pants: ['#2F4A7A'], bottom: ['skirt'], scarf: true, bag: true },
    { who: 'mf', style: 'tee', pattern: ['print', 'stripe', null], bottom: ['shorts', 'pants'], bag: true },
  ],
  gioi: [   // THPT: nam áo trắng quần xanh, nữ áo dài trắng
    { who: 'm', style: 'uniform', colors: ['#FFFFFF'], trim: '#2F6FB3', pants: ['#2F4A7A', '#2B2B33'], glasses: .6, bag: true },
    { who: 'f', style: 'aodai', colors: ['#FFFFFF'], pants: ['#FFFFFF'], glasses: .4, bag: true },
    { who: 'f', style: 'uniform', colors: ['#FFFFFF'], trim: '#2F6FB3', pants: ['#2F4A7A'], bottom: ['skirt'], glasses: .5, bag: true },
  ],
  rank: [
    { who: 'mf', style: 'hoodie', colors: ['#2B2D35', '#3B2F5E', '#1F3A5A', '#5A1F2B', '#2F4A3A'], pants: ['#2B2B33'], headset: true },
    { who: 'mf', style: 'jersey', colors: ['#E2463A', '#2F6FB3', '#1FA89A', '#2B2D35', '#F2CB57'], pants: ['#2B2B33', '#3E4A5E'], bottom: ['pants', 'shorts'], headset: true },
  ],
  hoainiem: [
    { who: 'mf', style: 'tee', colors: ['#8FA38A', '#B7896B', '#7A8FA8', '#A89A7A'], pants: ['#5A5048', '#4A4A52'], beard: true, hair: ['#3A3A3A', '#6B6B6B', '#2A1D17'] },
    { who: 'm', style: 'shirt', pattern: ['plaid'], colors: ['#A8553A', '#3C6E8F', '#5A7A3A'], pants: ['#5A5048'], beard: true },
    { who: 'mf', style: 'polo', colors: ['#E8DCC0', '#7A8FA8', '#C98F6B'], pants: ['#4A4A52'], beard: true },
    { who: 'f', style: 'blouse', pattern: ['dots', null], colors: ['#C96B6B', '#6B8FC9', '#D9B36B'], pants: ['#4A4A52'] },
  ],
  congan: [{ who: 'mf', style: 'uniform', colors: ['#7C9A4A'], trim: '#C9A232', pants: ['#5F7A3A'], hairStyle: 'police' }],
  streamer: [
    { who: 'mf', style: 'hoodie', colors: ['#B06CE0', '#FF6FB5', '#46C6E6', '#F2CB57'], pants: ['#2B2B33'], headset: true, hair: ['#F07AA8', '#6FA8F0', '#2A1D17', '#B06CE0'] },
    { who: 'mf', style: 'tee', pattern: ['print'], colors: ['#2B2D35', '#F4F1E8'], pants: ['#2B2B33'], headset: true, hair: ['#F07AA8', '#6FA8F0', '#2A1D17'] },
  ],
};
const GIRL_HAIR = ['bob', 'bun', 'long', 'ponytail', 'twin'];
const BOY_HAIR = ['messy', 'buzz', 'side', 'spiky', 'cap'];

// gender: 'm' nam / 'f' nữ — lấy từ tên khách để hình luôn khớp tên (không truyền thì bốc ngẫu nhiên)
function makeLook(seg, gender) {
  const girl = gender ? gender === 'f' : Math.random() < .42;
  const g = girl ? 'f' : 'm';
  const fits = list => (list || []).filter(o => o.who.includes(g));
  const own = fits(SEG_OUTFITS[seg]);
  const o = pick(own.length ? own : fits(CASUAL));
  const shirt = pick(o.colors || TOPS);
  let bottom = o.style === 'dress' ? 'dress' : pick(o.bottom || ['pants']);
  if (!girl && bottom === 'skirt') bottom = 'pants';
  // người lớn (văn phòng, hoài niệm) ít tết hai bím; mũ lưỡi trai chỉ cho đồ thường
  const adult = seg === 'vanphong' || seg === 'hoainiem';
  const girlHair = adult ? GIRL_HAIR.filter(h => h !== 'twin') : GIRL_HAIR;
  const L = {
    gender: g, style: o.style, shirt, trim: o.trim || shade(shirt, .72),
    pants: pick(o.pants || BOTTOMS), bottom,
    pattern: pick(o.pattern || [null]), print: pick(PRINTS), number: pick([7, 9, 10, 17, 23, 99]),
    inner: pick(['#FFFFFF', '#F4F1E8', '#2B2D35']),
    skin: pick(SKINS), hair: pick(o.hair || HAIRS),
    hairStyle: o.hairStyle || (girl ? pick(girlHair) : pick(BOY_HAIR)),
    clip: girl && Math.random() < .4 ? pick(['#F07A5A', '#FF6FB5', '#F2CB57', '#46C6E6']) : null,
    sandal: pick(['#E2463A', '#2F6FB3', '#333333', '#F2B632', '#F4F1E8']),
    headset: !!o.headset || Math.random() < .25,
    glasses: Math.random() < (o.glasses || .15),
    helmet: o.helmet ? pick(['#E2463A', '#F4F4F0', '#2F6FB3', '#F2B632']) : null,
    bag: !!o.bag || (!o.helmet && Math.random() < .35),
    beard: !!o.beard && !girl && Math.random() < .75,
    tie: !girl && Math.random() < (o.tie || 0) ? pick(['#B8322A', '#2F4A7A', '#3A3A44']) : null,
    scarf: !!o.scarf,
    cap: pick(['#E2463A', '#1FA89A', '#2B2D35', '#F2CB57']),
    accent: seg === 'streamer' ? '#FF6FB5' : pick(['#46E6F2', '#FF6FB5', '#4FE38A', '#F59E3A']),
  };
  return L;
}

// ---------- Đồ trên tường cho cảnh dọc ----------
function priceBoardSVG(lines) {
  return `<g transform="translate(92 70)">
    <path d="M0,-10 L-58,8 M0,-10 L58,8" stroke="#6B4A2F" stroke-width="2"/><circle cy="-10" r="3" fill="#666"/>
    <rect x="-72" y="6" width="144" height="136" rx="6" fill="#8A5A3B"/><rect x="-65" y="13" width="130" height="122" rx="3" fill="#2F3B35"/>
    <text class="chalk" y="40" text-anchor="middle" font-size="22" fill="#FFF1C2">BẢNG GIÁ</text>
    <g class="chalk" font-size="16" fill="#F3EEDF">
      ${lines.map(([a, b, c], k) => `<text x="-56" y="${66 + k * 21}" ${c ? `fill="${c}"` : ''}>${a}</text><text x="56" y="${66 + k * 21}" text-anchor="end" ${c ? `fill="${c}"` : ''}>${b}</text>`).join('')}
    </g>
  </g>`;
}
// o.tv: tường có TV treo (tv.js) → dời tờ giấy "thua không được đập phím" xuống dưới TV
function wallSVG(priceLines, o = {}) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6;
    return `<circle cx="${(Math.sin(a) * 21).toFixed(1)}" cy="${(-Math.cos(a) * 21).toFixed(1)}" r="${i % 3 ? 1.3 : 2.2}" fill="#8A5A3B"/>`;
  }).join('');
  return `
    <rect width="${VW}" height="${FLOOR_TOP}" fill="#F2DFB4"/><rect y="56" width="${VW}" height="120" fill="url(#gCeil)"/>
    <path d="M250,96 q34,-9 56,16 q-26,22 -56,-16z M560,210 q24,-5 32,12 q-19,14 -32,-12z" fill="#E7CF9C" opacity=".5"/>
    <rect y="${FLOOR_TOP - 64}" width="${VW}" height="64" fill="url(#pWains)"/><rect y="${FLOOR_TOP - 70}" width="${VW}" height="8" fill="#4E8F80"/>
    <rect y="${FLOOR_TOP}" width="${VW}" height="${VH - FLOOR_TOP}" fill="url(#pFloor)"/><rect y="${FLOOR_TOP}" width="${VW}" height="${VH - FLOOR_TOP}" fill="url(#gFloorShade)"/>
    <rect y="${FLOOR_TOP - 4}" width="${VW}" height="6" fill="#3F7A6D"/>
    ${priceBoardSVG(priceLines)}
    <g transform="translate(318 128)"><circle r="31" fill="#8A5A3B"/><circle r="26" fill="#FFF8E6"/>${ticks}
      <line class="clock-h" y1="3" y2="-12" stroke="#3A2A22" stroke-width="4" stroke-linecap="round"/>
      <line class="clock-m" y1="4" y2="-19" stroke="#3A2A22" stroke-width="2.5" stroke-linecap="round"/><circle r="3" fill="#F07A5A"/></g>
    <g transform="${o.tv ? 'translate(480 184) rotate(-4) scale(.6)' : 'translate(452 160) rotate(-4)'}">
      <rect x="-70" y="-36" width="140" height="72" fill="#FFFDF4"/>
      <rect x="-80" y="-42" width="28" height="11" fill="#F6E3A0" opacity=".85" transform="rotate(-24 -66 -36)"/>
      <rect x="52" y="-42" width="28" height="11" fill="#F6E3A0" opacity=".85" transform="rotate(20 66 -36)"/>
      <text class="marker" y="-6" text-anchor="middle" font-size="18" fill="#C0392B">THUA KHÔNG ĐƯỢC</text>
      <text class="marker" y="17" text-anchor="middle" font-size="18" fill="#C0392B">ĐẬP PHÍM :)</text>
    </g>
    <g transform="translate(636 106) rotate(3)">
      <line x1="-60" y1="-56" x2="-60" y2="-16" stroke="#6B4A2F" stroke-width="2"/><line x1="60" y1="-56" x2="60" y2="-16" stroke="#6B4A2F" stroke-width="2"/>
      <rect x="-84" y="-18" width="168" height="36" rx="8" fill="#137A70"/>
      <text class="baloo" y="7" text-anchor="middle" font-size="16" fill="#FFF3DA">NẠP GIỜ TẠI QUẦY</text>
    </g>
    <g transform="translate(300 ${FLOOR_TOP + 4}) scale(.74)">${dispenserSVG()}</g>`;
}
// Mái hiên sọc + biển hiệu neon mang tên quán (chữ tự nhỏ lại khi tên dài)
function awningSVG(name) {
  let d = 'M0,50';
  for (let x = 0; x < VW; x += 30) d += ` A15,11 0 0 0 ${x + 30},50`;
  const safe = String(name).toUpperCase().replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const size = Math.round(clamp(52 * 14 / Math.max(14, name.length), 24, 52));
  const sign = signSVG().replace('font-size="52"', `font-size="${size}"`)
    .replace('letter-spacing="1"></text>', `letter-spacing="1">${safe}</text>`);
  return `<rect width="${VW}" height="20" fill="#5B5F63"/><path d="${d} L${VW},18 L0,18 Z" fill="url(#pAwning)"/>
    <g transform="translate(${VW / 2} 0) scale(.62) translate(-800 0)">${sign}</g>`;
}
function frameSVG() {
  return `<rect y="${FRONT}" width="${VW}" height="${VH - FRONT}" fill="#7E8387"/>
    <rect width="12" height="${VH}" fill="#EAD3A3"/><rect x="${VW - 12}" width="12" height="${VH}" fill="#EAD3A3"/>`;
}
// Đèn trong quán (vẽ ở lớp hoà sáng "screen"); game chỉnh độ mạnh từng nhóm bằng opacity
function lightsSVG(sx) {
  const cone = (x, top, bottom, spread) =>
    `<path d="M${x - 8},${top} L${x + 8},${top} L${x + spread},${bottom} L${x - spread},${bottom} Z" fill="url(#gCone)"/>`;
  return `<path class="lt-sun" d="M120,${FRONT} L${VW - 120},${FRONT} L${VW - 220},${FLOOR_TOP + 60} L220,${FLOOR_TOP + 60} Z" fill="url(#gSun)"/>
    <g class="lt-lamps">${sx.map(x => cone(x, 56, 420, 70)).join('')}</g>
    <g class="lt-counter"><ellipse cx="640" cy="250" rx="190" ry="125" fill="url(#gWarm)"/><ellipse cx="640" cy="230" rx="90" ry="70" fill="url(#gWarm)"/></g>
    <ellipse class="lt-sign" cx="${VW / 2}" cy="36" rx="260" ry="60" fill="url(#gTeal)"/>
    <g class="lt-neon">${neonGameSVG(true)}${fairyLightsSVG(true)}</g>`;
}


// Bảng menu chỉ nhận chữ đã chuẩn bị, không thay đổi dữ liệu quán.
function morningSVG(name, lines, rates, hot) {
  const safe = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rows = lines.map((l,i) => '<text x="110" y="'+(133+i*27)+'">'+safe(l.name)+'</text><text x="620" y="'+(133+i*27)+'" text-anchor="end">'+safe(l.price)+'</text>').join('');
  const y = 148+lines.length*27;
  return scopeSVG('<svg viewBox="0 0 760 490" role="img" aria-label="Menu buổi sáng">'+defsSVG()+
    '<rect width="760" height="490" fill="#F2DFB4"/><rect y="383" width="760" height="107" fill="#E9CE9C"/><path d="M0 381H760 M0 435H760" stroke="#4E8F80" stroke-width="6"/>'+awningSVG(name)+
    '<rect x="80" y="65" width="570" height="'+(y-10)+'" rx="10" fill="#A86F45"/><rect x="93" y="78" width="544" height="'+(y-36)+'" rx="3" fill="#354C43"/><g fill="#FFF6E3" font-family="Patrick Hand,cursive" font-size="23"><text x="365" y="108" text-anchor="middle" font-size="29">✦ Menu hôm nay ✦</text>'+rows+
    '<text x="110" y="'+(y+2)+'" font-size="17" fill="#B3E1CE">'+safe(rates)+'</text><text x="110" y="'+(y+27)+'" font-size="19" fill="#FFC08F">HOT hôm nay: '+safe(hot)+'</text></g>'+
    '<g data-hit="host" role="button" tabindex="0" aria-label="Mở máy tính chủ" class="host-monitor"><title>Máy tính chủ · bấm để mở các app</title><rect x="520" y="387" width="110" height="82" rx="8" fill="#FFFDF4"/><rect x="534" y="394" width="82" height="49" rx="4" fill="#2D2F36"/><rect x="540" y="400" width="70" height="36" rx="2" fill="#1FA89A"/><text x="575" y="424" text-anchor="middle" font-size="19" fill="#FFFDF4">APP</text><text x="575" y="462" text-anchor="middle" font-size="17" fill="#3A2A22">Máy chủ</text></g>'+
    '<g transform="translate(690 456) scale(.6)">'+standingSVG(OWNER_LOOK,{owner:true,mood:'smile'})+'<path d="M-28,-110 L-70,0" stroke="#A86F45" stroke-width="6"/><path d="M-70,-10 l-18,22 h34z" fill="#D9A73D"/></g><g transform="translate(52 468) scale(.65)">'+dogSVG(true)+'</g></svg>', 'pr-');
}
function itemSVG(k) {
  const colors = {mi:'#F07A5A',sting:'#D84532',coca:'#C99831',suoi:'#96D8EF',caphe:'#A86F45'};
  let shape = k==='trung' ? '<ellipse cx="18" cy="29" rx="11" ry="16" fill="#FFFDF4"/><ellipse cx="34" cy="34" rx="11" ry="16" fill="#F8E6C9"/>' : k==='xucxich' ? '<rect x="16" y="8" width="20" height="46" rx="10" fill="#D77853"/><path d="M18 22l16-5m-16 18l16-5" stroke="#F2B691" stroke-width="3"/>' : '<rect x="10" y="12" width="32" height="42" rx="6" fill="'+(colors[k]||'#A86F45')+'"/><rect x="10" y="26" width="32" height="16" fill="#FFF6E3"/><text x="26" y="38" font-size="11" text-anchor="middle" fill="#3A2A22">'+(k==='mi'?'MÌ':k==='suoi'?'NƯỚC':k==='caphe'?'CÀ PHÊ':'NET')+'</text><rect x="16" y="6" width="20" height="7" rx="3" fill="#C2B7A2"/>';
  return '<svg viewBox="0 0 52 64" aria-hidden="true">'+shape+'</svg>';
}

// Cảnh chào đầu game, chỉ dùng cấu hình minh họa.
// Mỗi hình có bộ màu riêng để các màn ẩn không tranh ID gradient.
function scopeSVG(svg, prefix) {
  return svg.replace(/id="([^"]+)"/g, (_,id) => 'id="'+prefix+id+'"').replace(/url\(#([^)]+)\)/g,(_,id) => 'url(#'+prefix+id+')');
}
function previewSVG(m, i, prefix) {
  return scopeSVG('<svg viewBox="-140 -270 280 290" aria-hidden="true">'+defsSVG()+stationSVG({m,i})+'</svg>',prefix);
}
function titleSVG(prices) {
  const m = {cpu:1,gpu:1,chair:1,mon:1,kb:1,mouse:1};
  return scopeSVG('<svg viewBox="0 0 760 680" role="img" aria-label="Quán nhỏ có máy tính, quầy mì và Cậu Vàng">'+defsSVG()+wallSVG(prices)+
    '<g transform="translate(630 305) scale(.82)">'+standingSVG(OWNER_LOOK,{owner:true,mood:'smile'})+'</g><g transform="translate(-316 -19) scale(.75)">'+counterSVG()+'</g>'+
    [140,380,620].map((x,i)=>'<g transform="translate('+x+' 658)">'+stationSVG({m:{...m,cpu:i,gpu:i,mon:i,chair:i},i})+'</g>').join('')+
    '<g transform="translate(60 667) scale(.62)">'+dogSVG(true)+'</g>'+awningSVG('Quán Nét Bất Ổn')+'</svg>', 'tt-');
}
window.ART = {
  titleSVG, previewSVG,
  morningSVG, itemSVG,
  VW, VH, FLOOR_TOP, FRONT, shade, tierOf, makeLook, OWNER_LOOK, POSES, DESKS,
  defsSVG, wallSVG, awningSVG, frameSVG, lightsSVG, counterSVG, stoolSVG, plantSVG, dogSVG,
  headSVG, headsetSVG, standingSVG, stationSVG, stationGlowSVG, bowlSVG, cupSVG, trashSVG,
  fairyLightsSVG, neonGameSVG,
};
})();
