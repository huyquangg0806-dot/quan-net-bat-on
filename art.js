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
    <pattern id="pFloor" width="92" height="92" patternUnits="userSpaceOnUse" patternTransform="translate(0 ${FLOOR_TOP}) scale(1 .58)">
      <rect width="92" height="92" fill="#F3E9D2"/>
      <g fill="#C8DCD0" opacity=".6"><circle r="20"/><circle cx="92" r="20"/><circle cy="92" r="20"/><circle cx="92" cy="92" r="20"/></g>
      <g transform="translate(46 46)" fill="#DFBC9D" opacity=".45"><ellipse rx="5" ry="14"/><ellipse rx="14" ry="5"/></g>
      <circle cx="46" cy="46" r="3" fill="#D5B18E" opacity=".5"/>
      <path d="M0,0 H92 V92" fill="none" stroke="#DDD0B6" stroke-width="1.5"/>
    </pattern>
    <pattern id="pWains" width="44" height="26" patternUnits="userSpaceOnUse" patternTransform="translate(44 352)">
      <rect width="44" height="26" fill="#71A899"/><rect x="1.5" y="1.5" width="41" height="23" rx="2" fill="#91C4B3"/>
      <path d="M4,4 H39" stroke="#BFE0D0" stroke-width="1" opacity=".6"/>
    </pattern>
    <pattern id="pAwning" width="60" height="80" patternUnits="userSpaceOnUse">
      <rect width="30" height="80" fill="#238D80"/><rect x="30" width="30" height="80" fill="#FFF3DA"/>
      <path d="M2,22 V46 M32,22 V46" stroke="#FFFFFF" stroke-width="2" opacity=".16"/>
    </pattern>
    <pattern id="pWalk" width="60" height="30" patternUnits="userSpaceOnUse" patternTransform="translate(0 ${FRONT + 6})">
      <rect width="60" height="30" fill="#A3A9AB"/><path d="M0,0 H60 M0,0 V30" stroke="#8E9496" stroke-width="2"/>
    </pattern>
    <pattern id="pMesh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#5E6672"/><path d="M0,0 V6" stroke="#7A838F" stroke-width="2"/>
    </pattern>
    <linearGradient id="gCeil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8E6847" stop-opacity=".2"/><stop offset="1" stop-color="#8E6847" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gWall" x2="0" y2="1">
      <stop stop-color="#FFF4DC"/><stop offset="1" stop-color="#EEDAB4"/>
    </linearGradient>
    <linearGradient id="gWood" x2="0" y2="1">
      <stop stop-color="#D6A676"/><stop offset="1" stop-color="#A77550"/>
    </linearGradient>
    <linearGradient id="gMetal" x2="1" y2="0">
      <stop stop-color="#929CA0"/><stop offset=".4" stop-color="#DCE1DC"/><stop offset="1" stop-color="#A2AEAE"/>
    </linearGradient>
    <linearGradient id="gOak" x2="0" y2="1">
      <stop stop-color="#EDC99A"/><stop offset=".5" stop-color="#D6A875"/><stop offset="1" stop-color="#B77D50"/>
    </linearGradient>
    <linearGradient id="gPlastic" x2="1" y2="1">
      <stop stop-color="#F3EAD6"/><stop offset=".5" stop-color="#DAD0B6"/><stop offset="1" stop-color="#AEA48C"/>
    </linearGradient>
    <linearGradient id="gLeather" x2="1" y2="1">
      <stop stop-color="#545B60"/><stop offset=".45" stop-color="#30373C"/><stop offset="1" stop-color="#1C2529"/>
    </linearGradient>
    <linearGradient id="gBlueSeat" x2="1" y2="1">
      <stop stop-color="#78AFC5"/><stop offset=".5" stop-color="#528FA8"/><stop offset="1" stop-color="#35687F"/>
    </linearGradient>
    <linearGradient id="gCeramic" x2="0" y2="1">
      <stop stop-color="#FFFDF1"/><stop offset="1" stop-color="#D7C9A9"/>
    </linearGradient>
    <linearGradient id="gGlass" x2="1" y2="1">
      <stop stop-color="#4C6470"/><stop offset=".45" stop-color="#263B43"/><stop offset="1" stop-color="#162B32"/>
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
      <stop offset=".4" stop-color="#152E3A" stop-opacity="0"/><stop offset="1" stop-color="#152E3A"/>
    </radialGradient>
  </defs>`;
}

// ---------- Biển hiệu (vẽ sau lớp tối để chữ luôn sáng) ----------
function signSVG() {
  return `<g transform="translate(800 0)">
    <line x1="-250" y1="0" x2="-250" y2="14" stroke="#333" stroke-width="3"/><line x1="250" y1="0" x2="250" y2="14" stroke="#333" stroke-width="3"/>
    <rect x="-300" y="15" width="600" height="92" rx="12" fill="#5B3F2E" opacity=".22"/>
    <rect x="-300" y="10" width="600" height="92" rx="12" fill="url(#gWood)" stroke="#654936" stroke-width="4"/>
    <rect x="-288" y="20" width="576" height="72" rx="8" fill="#244A40" stroke="#F0D7A4" stroke-width="2"/>
    <path d="M-276,27 H276" stroke="#FFFFFF" stroke-width="1.5" opacity=".22"/>
    <text id="signText" class="baloo" y="72" text-anchor="middle" font-size="52" fill="#FFF1CA" letter-spacing="1"></text>
    <g transform="translate(-258 56)" fill="#FFD04A">
      <rect x="-15" y="-9" width="30" height="18" rx="9"/><circle cx="-7" cy="0" r="2.5" fill="#10302C"/><circle cx="8" cy="-3" r="2" fill="#10302C"/><circle cx="8" cy="3" r="2" fill="#10302C"/>
    </g>
    <g transform="translate(258 56)" fill="#FF8C6B">
      <path d="M-14,-4 H14 Q13,12 0,13 Q-13,12 -14,-4 Z"/><path d="M-10,-10 L12,-7" stroke="#FFD04A" stroke-width="2.5"/>
    </g>
  </g>`;
}

// ---------- Đồ vật trong phòng ----------
function counterSVG(interactive = true) {
  const planks = Array.from({ length: 7 }, (_, k) => `<path d="M${1136 + k * 44},417 V521" stroke="#8E6246" stroke-width="1.5" opacity=".5"/>
    <path d="M${1140 + k * 44},426 Q${1144 + k * 44},458 ${1140 + k * 44},486" stroke="#F2C996" stroke-width="1.4" opacity=".5" fill="none"/>
    <circle cx="${1115 + k * 44}" cy="420" r="1.8" fill="#8B694B"/>`).join('');
  return `
  <ellipse cx="1262" cy="533" rx="190" ry="12" fill="#3A2A22" opacity=".12"/>
  <path d="M1096,378 L1428,378 L1436,406 L1088,406 Z" fill="url(#gOak)" stroke="#72513B" stroke-width="2" stroke-linejoin="round"/>
  <path d="M1114,397 Q1210,391 1270,397 T1420,396" stroke="#B58352" stroke-width="1.3" opacity=".6" fill="none"/>
  <path d="M1106,387 H1422" stroke="#FFF0D5" stroke-width="2" opacity=".7"/>
  <rect x="1088" y="404" width="348" height="9" fill="#8A5A3B"/>
  <rect x="1092" y="413" width="340" height="114" fill="url(#gWood)" stroke="#72513B" stroke-width="2"/>${planks}
  <rect x="1092" y="522" width="340" height="9" fill="#6D4428"/>
  <path d="M1096,414 H1428 M1096,520 H1428" stroke="#F5CC98" stroke-width="2" opacity=".5"/>
  <rect x="1104" y="531" width="16" height="6" rx="2" fill="#66513D"/><rect x="1404" y="531" width="16" height="6" rx="2" fill="#66513D"/>
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
  <g ${interactive ? 'data-hit="host" role="button" tabindex="0" aria-label="Mở máy tính chủ" class="host-monitor"' : ''}>
    <title>Máy tính chủ · bấm để mở các app</title>
    <rect x="1095" y="324" width="78" height="58" fill="transparent"/>
    <rect x="1106" y="337" width="56" height="40" rx="4" fill="#25383D"/>
    <rect x="1104" y="334" width="56" height="40" rx="3" fill="#46585D" stroke="#21383C" stroke-width="1.4"/>
    <rect x="1109" y="339" width="46" height="29" rx="2" fill="#1F857B"/>
    <path d="M1110,340 H1133 L1110,358 Z" fill="#B9E7CD" opacity=".18"/>
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
  <rect x="1350" y="326" width="58" height="40" rx="7" fill="url(#gMetal)" stroke="#687676" stroke-width="2"/>
  <path d="M1353,354 Q1379,362 1405,354 V361 Q1379,370 1353,361 Z" fill="#879F9F" opacity=".5"/>
  <rect x="1340" y="334" width="12" height="6" rx="3" fill="#8E969A"/><rect x="1406" y="334" width="12" height="6" rx="3" fill="#8E969A"/>
  <ellipse cx="1379" cy="327" rx="31" ry="6" fill="#869B9C"/><ellipse cx="1379" cy="324" rx="31" ry="6" fill="#DDE4DE" stroke="#718889" stroke-width="1.2"/>
  <ellipse cx="1379" cy="322" rx="21" ry="3" fill="#F2F5E8"/><rect x="1373" y="314" width="12" height="7" rx="3" fill="#3A5156"/>
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
  const leaf = (r, len, c) => `<g transform="rotate(${r})"><path d="M0,0 Q${-len * .4},${-len * .55} 0,${-len} Q${len * .4},${-len * .55} 0,0 Z" fill="${c}" stroke="${shade(c, .66)}" stroke-width="1.3"/>
    <path d="M0,-6 Q-5,${-len * .5} 0,${-len + 9}" stroke="${shade(c, 1.4)}" stroke-width="1.2" fill="none"/></g>`;
  return `<g transform="scale(${scale})">
    <ellipse rx="30" ry="6" fill="#3A2A22" opacity=".14"/>
    <g transform="translate(0 -44)">
      ${leaf(-50, 80, '#4F9A5A')}${leaf(-20, 96, '#5FAE68')}${leaf(10, 104, '#4F9A5A')}${leaf(38, 88, '#6BBF72')}${leaf(62, 70, '#4F9A5A')}${leaf(-72, 60, '#6BBF72')}
    </g>
    <path d="M-26,-46 L26,-46 L20,0 Q0,7 -20,0 Z" fill="#C98659" stroke="#8D583B" stroke-width="1.7"/>
    <path d="M12,-44 H24 L19,0 Q7,4 0,3 Z" fill="#A46343"/>
    <path d="M-18,-37 L-15,-8" stroke="#F0B98B" stroke-width="3" stroke-linecap="round"/>
    <rect x="-29" y="-52" width="58" height="10" rx="3" fill="#DDA577" stroke="#8D583B" stroke-width="1.5"/><path d="M-25,-49 H24" stroke="#F5D3A3" stroke-width="1.5"/>
  </g>`;
}

function stoolSVG(color) {
  return `<ellipse rx="30" ry="6" fill="#3A2A22" opacity=".14"/>
    <path d="M-24,-34 L24,-34 L29,0 L20,0 L16,-12 L-16,-12 L-20,0 L-29,0 Z" fill="${color}" stroke="${shade(color, .63)}" stroke-width="1.6"/>
    <path d="M18,-31 L24,-3 M-22,-27 L-25,-5" stroke="${shade(color, 1.4)}" stroke-width="2" opacity=".65"/>
    <ellipse cy="-34" rx="26" ry="6.5" fill="${shade(color, 1.15)}" stroke="${shade(color, .63)}" stroke-width="1.4"/>
    <path d="M-19,-36 Q0,-41 19,-36" stroke="${shade(color, 1.5)}" stroke-width="1.5" fill="none"/>
    <path d="M-6,-26 q6,-7 12,0 q-6,8 -12,0z" fill="${shade(color, .7)}"/>`;
}



function dogSVG(awake) {
  return `<ellipse rx="52" ry="8" fill="#3A2A22" opacity=".16"/>
    <g class="${awake ? 'wag' : ''}"><path d="M-40,-10 q-22,-4 -16,-24 q3,10 14,12" fill="#D39148"/></g>
    <g class="breath">
      <ellipse cx="-6" cy="-17" rx="40" ry="18" fill="#E3A45A" stroke="#976236" stroke-width="1.5"/>
      <path d="M-40,-20 Q-25,-33 -9,-31" stroke="#F2C68C" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="-2" cy="-8" rx="30" ry="8" fill="#F5D3A0"/>
    </g>
    <ellipse cx="-28" cy="-6" rx="13" ry="7" fill="#D39148"/>
    <ellipse cx="22" cy="-4" rx="14" ry="5.5" fill="#F3CF98"/><ellipse cx="34" cy="-3" rx="12" ry="5" fill="#F3CF98"/>
    <g transform="translate(32 ${awake ? -30 : -19})">
      <path class="ear" d="M-14,-8 L-10,-30 L0,-14 Z" fill="#C98640"/>
      <path class="ear" d="M4,-12 L14,-30 L18,-8 Z" fill="#C98640" style="animation-delay:.25s"/>
      <circle r="17" fill="#E3A45A" stroke="#976236" stroke-width="1.5"/>
      <path d="M-12,-12 Q-4,-20 5,-15" stroke="#F2C68C" stroke-width="2" fill="none" stroke-linecap="round"/>
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
  const open = x => `<path d="M${x - 5.5 + lx},2 Q${x + lx},-2 ${x + 5.5 + lx},2" stroke="${E}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="${x + lx}" cy="6" rx="4.7" ry="6.4" fill="${E}"/><ellipse cx="${x + lx}" cy="9" rx="2.5" ry="2.7" fill="#74513B"/>
    <circle cx="${x + lx + 1.5}" cy="3.5" r="1.8" fill="#FFFDF5"/><circle cx="${x + lx - 1.5}" cy="8" r=".8" fill="#FFFDF5"/>`;
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
  return `<g stroke="#51392E" stroke-width="1.8" stroke-linejoin="round">${back}</g>` +
    `<g stroke="${shade(s, .68)}" stroke-width="1.6"><ellipse cx="-30" cy="6" rx="6.5" ry="8" fill="${s}"/><ellipse cx="30" cy="6" rx="6.5" ry="8" fill="${s}"/>
     <path d="M-29,-12 Q-36,4 -27,19 Q-17,33 0,33 Q17,33 27,19 Q36,4 29,-12 Q0,-30 -29,-12 Z" fill="${s}"/></g>
     <path d="M-29,5 Q-26,24 -8,30 Q13,35 27,15 Q20,33 0,33 Q-21,33 -29,5 Z" fill="${shade(s, .89)}"/>
     <ellipse cx="-12" cy="-1" rx="10" ry="6" fill="#FFF4DA" opacity=".24"/>
     <path d="M-32,4 Q-27,2 -29,9 M32,4 Q27,2 29,9" stroke="${shade(s, .78)}" stroke-width="1.3" fill="none"/>
     <path d="M-2,12 Q0,15 2,12" stroke="${shade(s, .76)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
    `<g stroke="#51392E" stroke-width="1.8" stroke-linejoin="round">${front}</g>` + clip +
    (['cap', 'police', 'buzz'].includes(L.hairStyle) ? '' : `<path d="M-22,-25 Q-14,-36 -3,-34 M-15,-23 Q-5,-33 8,-31 M14,-29 Q24,-24 25,-16" fill="none" stroke="${shade(h, 1.9)}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>
      <path d="M-18,-16 Q-13,-22 -7,-22 M4,-19 Q9,-25 14,-23" fill="none" stroke="${shade(h, .68)}" stroke-width="1.8" stroke-linecap="round"/>`) +
    (L.beard ? `<path d="M-22,12 Q-20,30 0,31 Q20,30 22,12 Q12,22 0,22 Q-12,22 -22,12 Z" fill="${h}" opacity=".55"/>
      <path d="M-9,13 Q0,9 9,13 Q0,16 -9,13 Z" fill="${h}"/>` : '') + eyesSVG(mood, look) +
    `<ellipse cx="-20" cy="15" rx="${blushR}" ry="4" fill="#E88373" opacity=".4"/><ellipse cx="20" cy="15" rx="${blushR}" ry="4" fill="#E88373" opacity=".4"/>` +
    (L.glasses && mood !== 'happy' && mood !== 'eat' ? `<g fill="none" stroke="#3A3A44" stroke-width="2"><circle cx="-11" cy="5" r="8.5"/><circle cx="11" cy="5" r="8.5"/><path d="M-2.5,5 H2.5"/></g>` : '');
}

function headsetSVG(L) {
  const accent = L.accent || '#4CA798';
  return `<path d="M-34,4 C-36,-47 36,-47 34,4" fill="none" stroke="#25343A" stroke-width="7"/>
    <path d="M-31,-13 C-27,-42 27,-42 31,-13" fill="none" stroke="#697B80" stroke-width="2"/>
    <g stroke="#202C31" stroke-width="1.8"><rect x="-41" y="-7" width="13" height="25" rx="6" fill="#42555B"/><rect x="28" y="-7" width="13" height="25" rx="6" fill="#42555B"/></g>
    <path d="M-38,-2 V12 M38,-2 V12" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M-36,15 Q-32,28 -13,25" stroke="#25343A" stroke-width="2.5" fill="none"/><rect x="-16" y="23" width="7" height="4" rx="2" fill="#697B80"/>`;
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
  const ex = (sx + (hx - sx) * t).toFixed(1), ey = (sy + (hy - sy) * t).toFixed(1);
  return `<path d="M${sx},${sy} L${hx},${hy}" stroke="${shade(L.skin, .66)}" stroke-width="10.5" stroke-linecap="round"/>
    <path d="M${sx},${sy} L${hx},${hy}" stroke="${L.skin}" stroke-width="7.5" stroke-linecap="round"/>` +
    (t ? `<path d="M${sx},${sy} L${ex},${ey}" stroke="${shade(L.shirt, .62)}" stroke-width="14" stroke-linecap="round"/>
      <path d="M${sx},${sy} L${ex},${ey}" stroke="${L.shirt}" stroke-width="11" stroke-linecap="round"/>` : '');
}
const handSVG = ([x, y], L, cls = '') =>
  `<g class="${cls}"><circle cx="${x}" cy="${y}" r="6.5" fill="${L.skin}" stroke="${shade(L.skin, .82)}" stroke-width="1.5"/></g>`;

// ---------- Đồ ăn, thức uống ----------
function bowlSVG(empty = false) {
  return `<ellipse cy="13" rx="17" ry="3.5" fill="#5D4630" opacity=".16"/>
    <ellipse cy="12" rx="7" ry="2.5" fill="#D5C3A0" stroke="#8C7056" stroke-width="1"/>
    <path d="M-19,-3 Q-16,11 0,12 Q16,11 19,-3 Z" fill="#FFF6DE" stroke="#765C43" stroke-width="1.4"/>
    <path d="M2,10 Q13,8 17,-2 H10 Q8,7 2,10 Z" fill="#DCCCAB"/>
    <path d="M-13,3 Q0,8 13,3" stroke="#408B83" stroke-width="2" fill="none"/>
    <path d="M-13,0 Q-11,6 -6,7" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cy="-3" rx="19" ry="5.5" fill="#FFF9E8" stroke="#8C7056" stroke-width="1.2"/>
    <ellipse cy="-3" rx="16" ry="4" fill="${empty ? '#D5C7A6' : '#D59C43'}"/>
    ${empty ? '<path d="M-8,-4 Q0,-1 8,-4" stroke="#B8A886" stroke-width="1" fill="none"/>' : `<path d="M-12,-4 q3,-4 6,0 t6,0 t6,0 M-10,-1 q3,-3 6,0 t6,0" stroke="#F8DB8A" stroke-width="1.8" fill="none"/>
      <ellipse cx="5" cy="-4" rx="6.5" ry="3.6" fill="#FFFDF1" stroke="#D9C898" stroke-width=".6"/><ellipse cx="5" cy="-4.2" rx="2.8" ry="2" fill="#EFB332"/>
      <path d="M-11,-6 l3,2 M-6,-5 l2,-2 M-3,-1 l3,-1" stroke="#569B62" stroke-width="1.7" stroke-linecap="round"/>
      <g class="steam" fill="none" stroke="#FFF8E5" stroke-width="1.6" stroke-linecap="round" opacity=".8"><path d="M-9,-11 q-3,-4 0,-8 M0,-10 q3,-4 0,-8"/></g>`}
    <path d="M-22,-9 L18,-5 M-22,-6 L18,-2" stroke="#A9784D" stroke-width="1.7" stroke-linecap="round" ${empty ? 'transform="rotate(14)"' : ''}/>`;
}
function cupSVG(empty = false) {
  return `<ellipse cy="1" rx="11" ry="3" fill="#5D4630" opacity=".16"/>
    <path d="M-9,-26 L9,-26 L7,0 L-7,0 Z" fill="#D5E6DF" fill-opacity=".45" stroke="#6C918D" stroke-width="1.6"/>
    ${empty ? `<path d="M-7,-6 L7,-6 L7,0 L-7,0 Z" fill="#F6C66B" opacity=".5"/>`
      : `<path d="M-8.3,-20 L8.3,-20 L7,0 L-7,0 Z" fill="#F6C66B" opacity=".92"/>
      <rect x="-6" y="-19" width="6" height="5" rx="1" fill="#fff" opacity=".7" transform="rotate(-12 -3 -16)"/>
      <rect x="1" y="-15" width="5" height="5" rx="1" fill="#fff" opacity=".7"/>
      <circle cx="3" cy="-23" r="4" fill="#B5D84A"/><circle cx="3" cy="-23" r="2.2" fill="#E9F59A"/>
      <circle cx="-6" cy="-10" r="1" fill="#fff" opacity=".8"/><circle cx="6.5" cy="-7" r=".9" fill="#fff" opacity=".8"/>`}
    <ellipse cy="-26" rx="9" ry="2.8" fill="none" stroke="#8EAEA3" stroke-width="1.2"/>
    <path d="M-6,-20 L-5,-5" stroke="#FFFCED" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>
    <path d="M2,-26 L6,-38" stroke="#A8553D" stroke-width="3" stroke-linecap="round"/><path d="M2,-26 L6,-38" stroke="#EEAE8D" stroke-width="1.3" stroke-linecap="round"/>`;
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
  const torso = `<path d="M-22,-24 C-24,-54 -18,-70 0,-70 C18,-70 24,-54 22,-24 Q0,-19 -22,-24 Z" fill="${L.shirt}" stroke="${shade(L.shirt, .65)}" stroke-width="1.8"/>` + topDetailSVG(L, -70, -24, 22) +
    `<path d="M-19,-48 Q-18,-31 -15,-27 M15,-33 L18,-28" fill="none" stroke="${shade(L.shirt, .75)}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>`;
  const apron = L.apron ? `<path d="M-15,-58 L15,-58 L19,-22 Q0,-17 -19,-22 Z" fill="#238D80" stroke="#175C53" stroke-width="1.5"/>
      <path d="M-15,-58 L-12,-68 M15,-58 L12,-68" stroke="#1FA89A" stroke-width="3"/>
      <path d="M-10,-35 H10 V-25 Q0,-21 -10,-25 Z" fill="#3AA294" stroke="#175C53"/>
      <text y="-42" text-anchor="middle" font-size="9" font-weight="800" fill="#FFF3DA">NET</text>` : '';
  const towel = L.towel ? `<path d="M6,-70 Q22,-73 24,-62 L22,-38 L14,-38 L15,-62 Z" fill="#fff" stroke="#E0DCD2"/><path d="M14,-44 H22" stroke="#F07A5A" stroke-width="2"/>` : '';
  const helmet = L.helmet && !o.carry
    ? `<g transform="translate(${hl[0] - 3} ${hl[1] + 8})"><path d="M-14,0 A14,13 0 0 1 14,0 Z" fill="${L.helmet}"/><rect x="-15" y="-1" width="30" height="4" rx="2" fill="${shade(L.helmet, .7)}"/><path d="M-6,-9 Q0,-12 6,-9" stroke="#fff" opacity=".5" stroke-width="2" fill="none"/></g>` : '';
  const bag = L.bag ? `<path d="M-17,-64 L15,-32" stroke="#6B4A2F" stroke-width="3.5"/><rect x="9" y="-38" width="15" height="12" rx="3" fill="#8A5A3B"/>` : '';
  const carry = o.carry ? `<g class="held" transform="translate(0 -46)">${o.carry === 'bowl' ? bowlSVG() : `<g transform="translate(0 4)">${cupSVG()}</g>`}</g>` : '';
  const hood = L.style === 'hoodie' || L.style === 'jacket' ? `<path d="M-24,-62 Q-28,-96 0,-98 Q28,-96 24,-62 Z" fill="${L.trim}"/>` : '';
  return `<ellipse cx="2" cy="1" rx="25" ry="6" fill="#3A2A22" opacity=".12"/><ellipse rx="16" ry="3" fill="#3A2A22" opacity=".1"/>
    <g stroke="${shade(shin, .65)}" stroke-width="1.2" stroke-linejoin="round">${legs}</g>
    ${o.stool ? '' : `<path d="M-11,-4 L-4,-4 M4,-4 L11,-4" stroke="#BABBB0" stroke-width="1" stroke-linecap="round"/>
      <path d="M-9,-26 V-11 M6,-26 V-11" stroke="${shade(shin, 1.3)}" stroke-width="1.2" opacity=".5"/>`}
    <g class="upper" stroke-linejoin="round" ${o.stool ? 'transform="translate(0 -12)"' : ''}>${hood}${torso}${apron}${towel}${bag}
      <path d="M-20,-48 Q-22,-30 -16,-25 L-7,-24 Q-15,-32 -14,-46 Z" fill="${shade(L.shirt, .78)}" opacity=".6"/>
      <path d="M-14,-65 Q-7,-70 3,-69" stroke="${shade(L.shirt, 1.17)}" stroke-width="2" fill="none" stroke-linecap="round"/>
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
  const base = lv === 0
    ? `<path d="M-28,-135 L-34,-13 M28,-135 L34,-13" stroke="#456C7A" stroke-width="8"/><path d="M-28,-120 L-32,-25 M28,-120 L32,-25" stroke="#91B6BF" stroke-width="2"/>
      <path d="M-37,-146 Q0,-134 37,-146 L36,-130 Q0,-117 -36,-130 Z" fill="url(#gBlueSeat)"/>`
    : `<rect x="-6" y="-138" width="12" height="100" rx="4" fill="url(#gMetal)"/><path d="M0,-42 L-38,-17 M0,-42 L38,-17 M0,-42 V-10" stroke="#39454B" stroke-width="8" stroke-linecap="round"/>
      <path d="M0,-44 L-32,-22 M0,-44 L32,-22" stroke="#7D8B8D" stroke-width="2"/>
      ${[-38,0,38].map(x => `<ellipse cx="${x}" cy="${x ? -14 : -8}" rx="7" ry="5" fill="#26343A"/><path d="M${x - 4},${x ? -15 : -9} H${x + 3}" stroke="#788C8E" stroke-width="1.3"/>`).join('')}
      <path d="M-37,-149 Q0,-156 37,-149 L39,-131 Q0,-121 -39,-131 Z" fill="url(#gLeather)"/>`;
  let back;
  if (lv === 0) {
    back = `<path d="M-37,-146 L-39,-204 Q-38,-220 -22,-220 H22 Q38,-220 39,-204 L37,-146 Z" fill="url(#gBlueSeat)" stroke="#345D70" stroke-width="2.5"/>
      <path d="M-28,-201 H28 M-28,-188 H28 M-28,-175 H28" stroke="#376C81" stroke-width="6" stroke-linecap="round"/>
      <path d="M-27,-204 H26 M-27,-191 H26 M-27,-178 H26" stroke="#ABD3D9" stroke-width="1.5" opacity=".7"/>
      <path d="M-34,-208 Q-34,-217 -23,-217 H21" stroke="#C0D8D8" stroke-width="2" fill="none"/>
      <path d="M-35,-162 Q0,-153 35,-162" stroke="#345D70" stroke-width="2" fill="none"/>`;
  } else if (lv === 1) {
    back = `<rect x="-37" y="-236" width="74" height="99" rx="22" fill="url(#gLeather)" stroke="#26363B" stroke-width="2.5"/>
      <rect x="-29" y="-227" width="58" height="78" rx="17" fill="#46545A" stroke="#6E7B7C" stroke-width="1.2"/>
      <path d="M-22,-218 Q0,-225 22,-218 M-23,-190 Q0,-185 23,-190 M0,-222 V-155" stroke="#2C3E45" stroke-width="1.8" fill="none"/>
      <path d="M-26,-213 V-163" stroke="#8B9693" stroke-width="2" opacity=".6"/>
      <rect x="-49" y="-164" width="19" height="10" rx="5" fill="#34434A"/><rect x="30" y="-164" width="19" height="10" rx="5" fill="#34434A"/>`;
  } else if (lv === 2) {
    back = `<path d="M-42,-139 L-47,-237 Q-47,-266 -23,-279 H23 Q47,-266 47,-237 L42,-139 Z" fill="url(#gLeather)" stroke="#203438" stroke-width="2.5"/>
      <path d="M-28,-267 L-34,-236 L-26,-210 L-25,-150 M28,-267 L34,-236 L26,-210 L25,-150" stroke="#3EAC9B" stroke-width="10" fill="none" stroke-linejoin="round"/>
      <path d="M-27,-266 L-30,-237 M27,-266 L30,-237" stroke="#97D7BD" stroke-width="2" fill="none"/>
      <path d="M-16,-273 H16 L20,-258 H-20 Z" fill="#203238"/>
      <path d="M-9,-267 L-4,-260 M9,-267 L4,-260" stroke="#9EBDB4" stroke-width="3" stroke-linecap="round"/>
      <path d="M-20,-233 Q0,-223 20,-233 L17,-208 Q0,-200 -17,-208 Z" fill="#344A4E" stroke="#738C85"/>
      <path d="M-20,-186 Q0,-177 20,-186" stroke="#738C85" stroke-width="1.5" fill="none"/>
      <rect x="-54" y="-164" width="21" height="11" rx="5" fill="#31474B"/><rect x="33" y="-164" width="21" height="11" rx="5" fill="#31474B"/>`;
  } else {
    back = `<rect x="-6" y="-263" width="12" height="28" fill="url(#gMetal)"/><rect x="-32" y="-289" width="64" height="30" rx="12" fill="url(#gLeather)" stroke="#D4D9CD" stroke-width="3"/>
      <path d="M-22,-282 Q0,-286 22,-282" stroke="#A0B2AC" stroke-width="1.5" fill="none"/>
      <rect x="-42" y="-240" width="84" height="103" rx="21" fill="#526767" stroke="#C5D3C5" stroke-width="5"/>
      <rect x="-34" y="-232" width="68" height="83" rx="16" fill="url(#pMesh)" stroke="#8BA399"/>
      <path d="M-32,-184 Q0,-170 32,-184" stroke="#B2CAB9" stroke-width="4" fill="none"/>
      <rect x="-54" y="-166" width="21" height="11" rx="5" fill="#D3DDCC"/><rect x="33" y="-166" width="21" height="11" rx="5" fill="#D3DDCC"/>`;
  }
  return base + back;
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
  const vents = Array.from({ length: lv === 0 ? 7 : 9 }, (_, i) => `<path d="M${x + 8 + i * 4},${y + 7} v5" stroke="${shade(M.c, .58)}" stroke-width="1.6"/>`).join('');
  return `<ellipse cx="3" cy="-116" rx="${lv === 3 ? 29 : 23}" ry="5" fill="#3A2A22" opacity=".18"/>
    <path d="M-20,-123 H20 L25,-118 Q0,-113 -25,-118 Z" fill="${M.base}"/><path d="M-15,-122 H15" stroke="#D6DBCB" stroke-width="1" opacity=".65"/>
    <rect x="-4" y="${M.b - 4}" width="8" height="${-118 - M.b + 4}" rx="2" fill="${M.base}"/>
    <g transform="translate(3 3)" fill="${shade(M.c, .6)}">${panel}</g>${panel}
    <path d="M${x + 5},${y + 3} ${M.curve ? `Q0,${y + 10}` : 'L'} ${-x - 5},${y + 3}" stroke="${shade(M.c, 1.5)}" stroke-width="2" opacity=".7" fill="none"/>
    ${vents}${bulge}${ring}<path d="M-3,${M.b - 2} Q-20,-99 -6,-83 Q6,-67 -8,-44" stroke="#514C43" stroke-width="2" fill="none"/>
    <rect x="${x + 6}" y="${M.b - 8}" width="11" height="3" rx="1" fill="${shade(M.c, .62)}"/>
    <circle cx="${-x - 8}" cy="${M.b - 6}" r="1.4" fill="#84B5A4"/>`;
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
  return `<path d="M-37,-104 H34 V-101 H-37 Z" fill="${shade(base, .6)}"/>
    <polygon points="-35,-117 31,-117 34,-104 -38,-104" fill="${base}" stroke="${shade(base, .7)}" stroke-width="1.2"/>
    <path d="M-32,-116 H28" stroke="#FFF9E5" stroke-width="1" opacity=".6"/>
    <g class="${lv === 2 ? 'rgb' : ''}">${keys}</g><rect x="-13" y="-105" width="26" height="1.5" rx=".6" fill="${shade(base, .74)}"/>`;
}
function mouseSVG(lv) {
  const pad = lv === 1 || lv === 2 ? `<rect x="40" y="-121" width="32" height="19" rx="3" fill="#293C44" stroke="#596D71" stroke-width=".8"/><path d="M43,-118 H68" stroke="#768C86" stroke-width=".6"/>` : '';
  const body = [
    `<path d="M55,-117 Q60,-128 44,-124" stroke="#9A927F" stroke-width="1.2" fill="none"/><ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#E4DECF" stroke="#BDB39C"/>`,
    `<ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#26262C"/><path d="M55,-117 V-112" stroke="#E2463A" stroke-width="1.5"/>`,
    `<ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#F4F5F7" stroke="#C9CDD2"/>`,
    `<ellipse cx="55" cy="-110" rx="7.5" ry="9.5" fill="none" stroke="#46E6F2" stroke-width="2" class="rgb" opacity=".8"/><ellipse cx="55" cy="-110" rx="5.5" ry="7.5" fill="#1B1B20"/>`,
  ][lv];
  return pad + `<ellipse cx="56" cy="-107" rx="7" ry="8" fill="#1C292D" opacity=".17"/>` + body +
    `<path d="M52,-115 Q49,-112 50,-108" stroke="#E5EBDA" stroke-width="1" opacity=".7" fill="none"/>
    <path d="M55,-117 V-113" stroke="#71998E" stroke-width="1.6" stroke-linecap="round"/>`;
}
function caseSVG(lv) {
  const x = lv >= 2 ? 38 : 42, top = [-80,-82,-86,-92][lv], w = lv >= 2 ? 44 : 36;
  const light = lv === 0 || lv === 3, edge = light ? '#8F9386' : '#182C33';
  const panel = light ? 'url(#gPlastic)' : 'url(#gLeather)';
  let detail;
  if (lv === 0) {
    detail = `<rect x="47" y="-73" width="26" height="7" rx="1" fill="#B4AB94"/>
      <path d="M49,-69 H69 M49,-59 H69" stroke="#756E5D" stroke-width="1.3"/><rect x="47" y="-63" width="26" height="8" rx="1" fill="#C9BFA6"/>
      <circle cx="60" cy="-44" r="3" fill="#8D978A" stroke="#F3EAD6"/>
      ${Array.from({ length: 5 }, (_, i) => `<path d="M48,${-31 + i * 4} H71" stroke="#A69F8A" stroke-width="1.5"/>`).join('')}
      <rect x="45" y="-51" width="10" height="4" rx="1" fill="#F3EAD6"/><path d="M46,-49 H53" stroke="#739185" stroke-width="1"/>`;
  } else if (lv === 1) {
    detail = `<path d="M47,-76 V-12" stroke="#75BABB" stroke-width="3"/>
      <rect x="52" y="-65" width="20" height="49" rx="2" fill="#23343B"/>
      ${Array.from({ length: 6 }, (_, i) => `<path d="M55,${-57 + i * 6} H69" stroke="#455B61" stroke-width="1.5"/>`).join('')}
      <circle cx="66" cy="-72" r="2.5" fill="#76B8B1"/>`;
  } else {
    const colors = lv === 2 ? ['#69C7B9','#69C7B9'] : ['#B3A2DA','#7BCAC2','#E4A3AB'];
    const ys = lv === 2 ? [-63,-30] : [-72,-48,-24];
    detail = `<rect x="43" y="${top + 5}" width="34" height="${-8 - top}" rx="2" fill="url(#gGlass)"/>` + ys.map((y, i) =>
      `<g transform="translate(60 ${y})"><circle r="${lv === 2 ? 12 : 10}" fill="#172930" stroke="${colors[i]}" stroke-width="2.4"/>
        ${Array.from({ length: 5 }, (_, a) => `<path d="M0,-2 Q-9,-11 -8,-3 Q-5,1 0,2 Z" fill="#5B767D" transform="rotate(${a * 72})"/>`).join('')}
        <circle r="2.8" fill="#B8D5CA"/><circle r="${lv === 2 ? 9 : 7}" fill="none" stroke="#E9F4DC" stroke-width=".6" opacity=".45"/></g>`).join('') +
      `<path d="M45,${top + 9} L74,${top + 32} V${top + 18} L61,${top + 7} Z" fill="#D8F1E4" opacity=".12"/>`;
  }
  return `<ellipse cx="64" cy="-2" rx="27" ry="5" fill="#342D24" opacity=".18"/>
    <path d="M${x},${top} L${x + w - 4},${top} L${x + w + 4},${top - 5} L${x + 7},${top - 5} Z" fill="${light ? '#EEE7D6' : '#677577'}"/>
    <path d="M${x + w - 4},${top} L${x + w + 4},${top - 5} V-8 L${x + w - 4},-2 Z" fill="${light ? '#B7B5A3' : '#1C3038'}"/>
    <rect x="${x}" y="${top}" width="${w - 4}" height="${-2 - top}" rx="3" fill="${panel}" stroke="${edge}" stroke-width="1.5"/>${detail}
    <path d="M${x + 2},${top + 4} V-9" stroke="#F4F0DC" stroke-width="1.3" opacity=".45"/>
    <circle cx="69" cy="-9" r="1.6" fill="#A4D09A"/><rect x="47" y="${top + 3}" width="4" height="2" rx=".5" fill="#203A40"/>
    <rect x="44" y="-4" width="5" height="5" rx="1" fill="#52615D"/><rect x="71" y="-4" width="5" height="5" rx="1" fill="#52615D"/>`;
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
      ${hood}<path d="M-25,-126 C-27,-160 -21,-188 0,-188 C21,-188 27,-160 25,-126 Z" fill="${L.shirt}" stroke="${shade(L.shirt, .65)}" stroke-width="1.8"/>${topDetailSVG(L, -188, -126, 25)}
      ${armSVG(-19, -178, p.l, L)}${p.frontR ? '' : armSVG(19, -178, p.r, L)}
      ${face}${hi(p.l)}${p.frontR ? armSVG(19, -178, p.r, L) : ''}${hi(p.r)}${chop}${heldCup}
    </g>`;
  }

  let s = `<ellipse cx="3" cy="-1" rx="${D.w + 22}" ry="14" fill="#3A2A22" opacity=".11"/>
    <ellipse cx="4" cy="-2" rx="${D.w - 10}" ry="8" fill="#3A2A22" opacity=".1"/>
    <path class="hl" d="M${-D.w - 16},-6 Q0,14 ${D.w + 16},-6" stroke="#1FA89A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g class="seat ${c && c.pose === 'win' ? 'nudge' : ''}"><g stroke="#4C4740" stroke-width="1.8" stroke-linejoin="round">${chairSVG(m.chair)}</g>${body}</g>`;

  // Mặt bàn + đồ trên bàn
  s += `<path d="M${-D.w},-122 L${D.w},-122 L${D.w + 4},-92 L${-D.w - 4},-92 Z" fill="${m.chair < 2 ? 'url(#gOak)' : D.top}" stroke="${D.edge}" stroke-width="2" stroke-linejoin="round"/>
    ${m.chair < 2 ? [0,1,2].map(i => `<path d="M${-D.w + 7},${-117 + i * 7} Q-20,${-114 + i * 7} ${D.w - 9},${-117 + i * 7}" stroke="#98683F" stroke-width=".9" opacity=".4" fill="none"/>`).join('') : ''}
    <path d="M${-D.w + 6},-120 H${D.w - 6}" stroke="#FFF3DD" stroke-width="1.8" opacity=".6"/>`;
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
  s += `<g stroke="#4C4740" stroke-width="1.6" stroke-linejoin="round">${monitorSVG(m.mon)}</g>`;

  // Mép bàn, chân bàn, gầm bàn
  if (c) {
    s += `<g class="${c.pose === 'win' ? 'kick' : ''}">
      <rect x="-15" y="-82" width="11" height="36" rx="4" fill="${L.pants}"/><rect x="4" y="-82" width="11" height="36" rx="4" fill="${L.pants}"/>
      <ellipse cx="-10" cy="-44" rx="8" ry="4" fill="${L.sandal}"/><ellipse cx="10" cy="-44" rx="8" ry="4" fill="${L.sandal}"/></g>`;
  }
  s += `<g stroke="#4C4740" stroke-width="1.6" stroke-linejoin="round">${caseSVG(tier - 1)}</g>`;
  s += `<path d="M-48,-84 Q-70,-37 -38,-25 Q-10,-15 -19,-48 Q-26,-60 -36,-37" fill="none" stroke="#514B3F" stroke-width="1.6" opacity=".8"/>
    <rect x="${-D.w - 4}" y="-92" width="${2 * D.w + 8}" height="10" rx="2" fill="${D.edge}"/>
    <path d="M${-D.w},-90 H${D.w}" stroke="#E9C799" stroke-width="1.2" opacity=".45"/>
    <path d="M${-D.w},-82 H${D.w}" stroke="#4B3929" stroke-width="2" opacity=".3"/>
    <rect x="${-D.w}" y="-84" width="${D.glow ? 14 : 8}" height="84" fill="${D.leg}"/><rect x="${D.w - (D.glow ? 14 : 8)}" y="-84" width="${D.glow ? 14 : 8}" height="84" fill="${D.leg}"/>
    <path d="M${-D.w + 2},-80 V-8 M${D.w - 6},-80 V-8" stroke="#E4BB87" stroke-width="1.3" opacity=".4"/>
    <g fill="#3C3B32"><rect x="${-D.w - 1}" y="-4" width="11" height="5" rx="1"/><rect x="${D.w - 9}" y="-4" width="11" height="5" rx="1"/></g>
    <g fill="#785940">${[-D.w + 5,D.w - 5].map(x => `<circle cx="${x}" cy="-86" r="1.3"/>`).join('')}</g>`;
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
    <rect x="-70" y="9" width="144" height="136" rx="6" fill="#342F26" opacity=".18"/>
    <rect x="-72" y="6" width="144" height="136" rx="6" fill="url(#gWood)" stroke="#735139" stroke-width="2"/>
    <rect x="-65" y="13" width="130" height="122" rx="3" fill="#2F4A3F" stroke="#D3AF77" stroke-width="1.5"/>
    <path d="M-62,15 H61 M-68,138 H68" stroke="#F5DBAA" stroke-width="1.2" opacity=".6"/>
    <path d="M-56,125 H30" stroke="#D8E5C3" stroke-width=".7" opacity=".22"/>
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
    <rect width="${VW}" height="${FLOOR_TOP}" fill="url(#gWall)"/><rect y="56" width="${VW}" height="120" fill="url(#gCeil)"/>
    <path d="M18,62 V${FLOOR_TOP} M742,62 V${FLOOR_TOP}" stroke="#D1B58B" stroke-width="7" opacity=".5"/>
    <rect y="${FLOOR_TOP - 64}" width="${VW}" height="64" fill="url(#pWains)"/><rect y="${FLOOR_TOP - 70}" width="${VW}" height="8" fill="#4E8F80"/>
    <rect y="${FLOOR_TOP}" width="${VW}" height="${VH - FLOOR_TOP}" fill="url(#pFloor)"/><rect y="${FLOOR_TOP}" width="${VW}" height="${VH - FLOOR_TOP}" fill="url(#gFloorShade)"/>
    <rect y="${FLOOR_TOP - 4}" width="${VW}" height="6" fill="#527C6A"/>
    ${pendantSVG(708)}
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
// Mái hiên sọc + biển hiệu gỗ mang tên quán (chữ tự nhỏ lại khi tên dài)
function awningSVG(name) {
  let d = 'M0,50';
  for (let x = 0; x < VW; x += 30) d += ` A15,11 0 0 0 ${x + 30},50`;
  const safe = String(name).toUpperCase().replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const size = Math.round(clamp(52 * 14 / Math.max(14, name.length), 24, 52));
  const sign = signSVG().replace('font-size="52"', `font-size="${size}"`)
    .replace('letter-spacing="1"></text>', `letter-spacing="1">${safe}</text>`);
  return `<rect y="48" width="${VW}" height="12" fill="#604C35" opacity=".13"/><rect width="${VW}" height="20" fill="#5B5F63"/><path d="${d} L${VW},18 L0,18 Z" fill="url(#pAwning)" stroke="#527C6A" stroke-width="1"/>
    <g transform="translate(${VW / 2} 0) scale(.62) translate(-800 0)">${sign}</g>`;
}
function frameSVG() {
  return `<rect y="${FRONT}" width="${VW}" height="${VH - FRONT}" fill="#7E8387"/>
    <rect width="12" height="${VH}" fill="#EAD3A3"/><rect x="${VW - 12}" width="12" height="${VH}" fill="#EAD3A3"/>`;
}
// Đèn có chụp rõ ràng để ánh vàng ở quầy có nguồn sáng trong phòng.
function pendantSVG(x) {
  return `<g transform="translate(${x} 58)" stroke-linejoin="round">
    <path d="M0,0 V20" stroke="#644D3B" stroke-width="2"/>
    <path d="M-9,20 H9 L27,38 Q0,45 -27,38 Z" fill="#2B7165" stroke="#365B4E" stroke-width="2"/>
    <ellipse cy="39" rx="22" ry="4" fill="#FFDE99"/>
    <path d="M-7,25 H7" stroke="#9ACBB5" stroke-width="2" opacity=".65"/>
  </g>`;
}
// Đèn trong quán (vẽ ở lớp hoà sáng "screen"); game chỉnh độ mạnh từng nhóm bằng opacity
function lightsSVG(sx) {
  const cone = (x, top, bottom, spread) =>
    `<path d="M${x - 8},${top} L${x + 8},${top} L${x + spread},${bottom} L${x - spread},${bottom} Z" fill="url(#gCone)"/>`;
  return `<path class="lt-sun" d="M120,${FRONT} L${VW - 120},${FRONT} L${VW - 220},${FLOOR_TOP + 60} L220,${FLOOR_TOP + 60} Z" fill="url(#gSun)"/>
    <g class="lt-lamps">${sx.map(x => cone(x, 56, 420, 70)).join('')}</g>
    <g class="lt-counter">${cone(708, 98, 350, 100)}<ellipse cx="640" cy="250" rx="125" ry="90" fill="url(#gWarm)" opacity=".3"/></g>
    <ellipse class="lt-sign" cx="${VW / 2}" cy="36" rx="230" ry="54" fill="url(#gWarm)"/>
    <g class="lt-neon">${neonGameSVG(true)}${fairyLightsSVG(true)}</g>`;
}


window.ART = {
  VW, VH, FLOOR_TOP, FRONT, shade, tierOf, makeLook, OWNER_LOOK, POSES, DESKS,
  defsSVG, wallSVG, awningSVG, frameSVG, lightsSVG, counterSVG, stoolSVG, plantSVG, dogSVG,
  headSVG, headsetSVG, standingSVG, stationSVG, stationGlowSVG, bowlSVG, cupSVG, trashSVG,
  fairyLightsSVG, neonGameSVG,
};
})();
