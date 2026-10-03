/* Quán Nét Bất Ổn — cảnh quán dọc trong giờ mở cửa.
   Chỉ lo phần hình: vẽ dàn máy, khách, chủ quán, ánh sáng theo giờ và báo lại chỗ người chơi bấm.
   Logic game (tiền, hài lòng, đơn món…) vẫn nằm trong game.js; game gọi PlayScene.frame(view) mỗi khung hình. */
(() => {
'use strict';

const A = window.ART;
const NS = 'http://www.w3.org/2000/svg';
const PER_ROW = 3;
const SX = [140, 380, 620], SY = 658;
// Góc chờ: 2 ghế nhựa + 1 chỗ đứng gần cửa
const SLOTS = [{ x: 62, y: 400, stool: '#E2463A' }, { x: 156, y: 372, stool: '#2F6FB3' }, { x: 236, y: 424 }];
const OWNER_HOME = { x: 630, y: 305 }, OWNER_COOK = { x: 683, y: 305 };
const OWNER_EXIT = [{ x: 470, y: 318 }, { x: 470, y: 440 }];
const DELIVER_X = [262, 500, 500];
const STAFF_HOME = { x: 420, y: 355 };
const STAFF_LOOK = { ...A.OWNER_LOOK, hair: '#5A3B25', hairStyle: 'bob', shirt: '#F2CB57', trim: '#C9A232', towel: false };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function node(tag, attrs = {}, html = '') {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html) e.innerHTML = html;
  return e;
}
const escText = s => String(s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));

let svg = null, rowsEl = null, handlers = {};
let Lr = {};                 // các lớp SVG
let slots = [];              // 3 chỗ máy đang hiện: { g, glow, ui, key, custId, bar, tbar }
let row = 0, rowCount = 1;
let lastWaitKey = '', lastRowsKey = '';
const fxOf = new WeakMap();  // trạng thái diễn của từng khách (tư thế tạm, món đang ăn…)
const owner = { x: OWNER_HOME.x, y: OWNER_HOME.y, path: [], speed: 260, onArrive: null, carry: null, key: '', el: null };
const staff = { x: STAFF_HOME.x, y: STAFF_HOME.y, path: [], speed: 250, onArrive: null, carry: null, key: '', el: null, count: 0, tasks: [] };
const dog = { awake: 0, key: '' };
let lastView = null;
// Chuyển động chỉ nằm trong cảnh, không ghi vào khách hay file lưu.
const arrivals = new Map(), departures = [];
let previousGuests = new Map();
function stepGuests(v, dt) {
  const current = new Map();
  v.queue.forEach((c,k) => { const sl=SLOTS[k]; if(sl) current.set(c.id,{c,x:sl.x,y:sl.y,queue:true}); });
  v.pcs.forEach(pc => { if(pc.cust) { const k=pc.i-row*PER_ROW; current.set(pc.cust.id,{c:pc.cust,x:k>=0&&k<PER_ROW?SX[k]:470,y:SY,queue:false,visible:k>=0&&k<PER_ROW}); } });
  for (const [id,g] of current) if(g.queue&&!previousGuests.has(id)&&!arrivals.has(id)) arrivals.set(id,{t:0});
  for (const [id,g] of previousGuests) if(!current.has(id)) {
    arrivals.delete(id);
    if(g.c.stole) { addRunner(g.c, g.x, g.y); continue; }
    if(g.queue||g.visible) { const el=node('g',{'pointer-events':'none',class:'walking sc-departure'}); el.innerHTML='<g transform="scale(.92)">'+A.standingSVG(lookOf(g.c),{mood:'idle'})+'</g>'; Lr.front.prepend(el); departures.push({el,x:g.x,y:g.y,t:0}); }
  }
  for(const [id,a] of arrivals) { a.t+=dt; if(!current.get(id)?.queue||a.t>=1.8) { arrivals.delete(id); lastWaitKey=''; } }
  for(let i=departures.length-1;i>=0;i--) { const d=departures[i]; d.t+=dt; const f=clamp(d.t/2,0,1); d.el.setAttribute('transform','translate('+(d.x+(32-d.x)*f)+' '+(d.y+(A.VH+140-d.y)*f)+')'); if(f===1){d.el.remove();departures.splice(i,1);} }
  previousGuests=current;
}
function placeArrivals(v) {
  v.queue.slice(0,SLOTS.length).forEach((c,k)=>{
    const a=arrivals.get(c.id),e=Lr.wait.querySelector('[data-id="'+c.id+'"]'); if(!a||!e)return;
    const f=clamp(a.t/1.8,0,1),sl=SLOTS[k];
    e.setAttribute('transform','translate('+(32+(sl.x-32)*f)+' '+(A.VH+120+(sl.y-A.VH-120)*f)+') scale(.92)');
  });
}

// ---------- Người ngoài: phụ huynh tới tìm con, kẻ trộm ôm đồ chạy ----------
// Đi theo đồng hồ thật (không theo dt của game) vì lúc phụ huynh tới game đang tạm dừng chờ chủ quán chọn.
const DOOR = { x: 32, y: A.VH + 140 }, MOM_SPOT = { x: 300, y: 452 }, AISLE_Y = 520;
// điểm trên đường gấp khúc pts ứng với phần quãng đường f (0..1)
function along(pts, f) {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  let d = f * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? clamp(d / seg[i], 0, 1) : 1; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k }; }
    d -= seg[i];
  }
  return pts[pts.length - 1];
}
let mom = null, runners = [], extraClock = 0;
const bubbleSVG = (text, y = -168, kind = '') => {
  const w = Math.max(60, [...text].length * 9.5 + 26);
  return `<g transform="translate(0 ${y})"><rect x="${-w / 2}" y="-19" width="${w}" height="30" rx="15" fill="#FFFDF4"
    stroke="${kind === 'bad' ? '#C0392B' : '#D9B98A'}" stroke-width="2.5"/><path d="M-6,11 L0,20 L6,11 Z" fill="#FFFDF4"/>
    <text y="2" text-anchor="middle" font-size="16" font-weight="800" fill="${kind === 'bad' ? '#C0392B' : '#3A2A22'}">${escText(text)}</text></g>`;
};
function momIn(line) {
  if (mom) mom.el.remove();
  const el = node('g', { 'pointer-events': 'none', class: 'walking' });
  Lr.front.prepend(el);
  mom = { el, x: DOOR.x, y: DOOR.y, to: MOM_SPOT, look: A.makeLook('vanphong', 'f'), line, mood: 'call', key: '' };
}
function momOut(withKid) {
  if (!mom) return;
  Object.assign(mom, { to: DOOR, line: withKid ? 'Về nhà ngay cho mẹ!' : 'Hừm… không có thật à?', mood: withKid ? 'call' : 'idle', key: '' });
}
// Kẻ trộm rời máy: thay cảnh "khách đi về" bằng cảnh ôm đồ chạy (dur = số giây được phép bắt)
function addRunner(c, x, y) {
  const el = node('g', { class: 'walking sc-thief', 'data-hit': 'thief' });
  Lr.front.prepend(el);
  // chạy lên lối đi giữa quán, băng sang trái rồi ra cửa — để người chơi kịp thấy và bấm
  const path = [{ x, y }, { x, y: AISLE_Y }, { x: 70, y: AISLE_Y }, DOOR];
  runners.push({ el, c, path, x, y, t: 0, dur: Math.max(0.8, c.runFor || 1), key: '' });
}
const maskSVG = `<g transform="translate(0 -98)"><path d="M-30,-6 Q0,-12 30,-6 L30,10 Q0,4 -30,10 Z" fill="#26232E"/>
  <ellipse cx="-11" cy="3" rx="6" ry="4.5" fill="#F6EBD4"/><ellipse cx="11" cy="3" rx="6" ry="4.5" fill="#F6EBD4"/>
  <circle cx="-11" cy="3" r="2.3" fill="#26232E"/><circle cx="11" cy="3" r="2.3" fill="#26232E"/></g>`;
function stepExtras() {
  const now = performance.now();
  const dt = extraClock ? Math.min(0.1, (now - extraClock) / 1000) : 0;
  extraClock = now;
  if (mom) {
    const dx = mom.to.x - mom.x, dy = mom.to.y - mom.y, d = Math.hypot(dx, dy), step = 230 * dt;
    if (d <= step) { mom.x = mom.to.x; mom.y = mom.to.y; } else { mom.x += dx / d * step; mom.y += dy / d * step; }
    const moving = d > 1;
    if (!moving && mom.to === DOOR) { mom.el.remove(); mom = null; }
    else {
      const key = [mom.line, mom.mood, moving].join('|');
      if (key !== mom.key) {
        mom.key = key;
        mom.el.setAttribute('class', moving ? 'walking' : '');
        mom.el.innerHTML = `<g transform="scale(.95)">${A.standingSVG(mom.look, { mood: mom.mood })}</g>${moving && mom.to !== DOOR ? '' : bubbleSVG(mom.line)}`;
      }
      mom.el.setAttribute('transform', `translate(${mom.x} ${mom.y})`);
    }
  }
  for (let i = runners.length - 1; i >= 0; i--) {
    const r = runners[i], c = r.c;
    // bị tóm: khựng lại (anh công an / nhân viên tóm ngay thì vẫn kịp chạy vài bước)
    const frozen = c.caught && !c.released && r.t >= Math.min(0.5, r.dur);
    if (c.released && !r.released) { r.released = true; r.relT = 0; }   // chọn xong: lủi thủi đi ra cửa
    if (r.released) r.relT += dt;
    else if (!frozen) r.t += dt;
    const f = r.released ? clamp(r.relT / 2.2, 0, 1) : clamp(r.t / r.dur, 0, 1);
    if (r.released) ({ x: r.x, y: r.y } = along([{ x: r.rx, y: r.ry }, { x: 70, y: r.ry }, DOOR], f));
    else { ({ x: r.x, y: r.y } = along(r.path, f)); r.rx = r.x; r.ry = r.y; }
    if (f >= 1) { r.el.remove(); runners.splice(i, 1); continue; }
    const state = r.released ? 'out' : frozen ? 'caught' : 'run';
    if (state !== r.key) {
      r.key = state;
      r.el.setAttribute('class', state === 'caught' ? 'sc-thief' : 'walking sc-thief');
      r.el.setAttribute('pointer-events', state === 'run' ? 'all' : 'none');
      const icon = c.stole && state === 'run' ? PARTS[c.stole].icon : '';
      r.el.innerHTML = `<rect x="-40" y="-150" width="80" height="160" fill="transparent"/>
        <g transform="scale(.92)">${A.standingSVG(lookOf(c), { mood: state === 'run' ? 'focus' : 'sad' })}${maskSVG}
        ${icon ? `<text y="-40" text-anchor="middle" font-size="30">${icon}</text>` : ''}</g>
        ${state === 'run' ? bubbleSVG('🦹 Bắt trộm!', -168, 'bad') : state === 'caught' ? bubbleSVG('🙇 Em xin lỗi…') : ''}`;
    }
    r.el.setAttribute('transform', `translate(${r.x} ${r.y})`);
  }
}

// ---------- Dựng khung cảnh ----------
function mount(svgEl, rowsElement, h) {
  svg = svgEl;
  rowsEl = rowsElement;
  handlers = h;
  svg.setAttribute('viewBox', `0 0 ${A.VW} ${A.VH}`);
  onTap(svg, hitInfo, fire);
  onTap(rowsEl, t => t.closest('[data-row]'), b => {
    if (b) { row = +b.dataset.row; slots.forEach(s => { s.key = ''; }); }
  });
}

// Màn hẹp khi quầy thao tác đang mở: cắt bớt phần tường phía trên, giữ khách, máy, bong bóng
const CROP_TOP = 170;
function crop(on) {
  if (svg) svg.setAttribute('viewBox', on ? `0 ${CROP_TOP} ${A.VW} ${A.VH - CROP_TOP}` : `0 0 ${A.VW} ${A.VH}`);
}

// Bấm bằng chạm: đọc mục tiêu ngay lúc ấn xuống (pick), gọi fn lúc nhấc tay nếu ngón không trượt.
// Cảnh và thẻ khách vẽ lại liên tục, phần tử dưới ngón tay có thể bị thay trước khi nhấc tay
// làm trình duyệt bỏ mất "click". Bàn phím (click không kèm con trỏ, detail = 0) vẫn chạy qua click.
const TAP_SLOP = 16;
function onTap(root, pick, fn) {
  let down = null;
  root.setAttribute('data-tap', '');
  root.addEventListener('pointerdown', e => {
    down = e.button > 0 ? null : { v: pick(e.target), x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  root.addEventListener('pointercancel', () => { down = null; });
  root.addEventListener('pointerup', e => {
    const d = down;
    down = null;
    if (d && d.id === e.pointerId && Math.hypot(e.clientX - d.x, e.clientY - d.y) <= TAP_SLOP) fn(d.v, e);
  });
  root.addEventListener('click', e => { if (e.detail === 0) fn(pick(e.target), e); });
}

function start({ shopName, prices, staffCount = 0, hot = '', hotName = '', decor = {} }) {
  arrivals.clear(); departures.length = 0; previousGuests.clear();
  mom = null; runners = []; extraClock = 0;
  svg.innerHTML = A.defsSVG();
  const layer = (id, style) => { const g = node('g', { id }); if (style) g.setAttribute('style', style); svg.appendChild(g); return g; };
  Lr = {
    wall: layer('sc-wall'), ownerBack: layer('sc-owner-back'), counter: layer('sc-counter'),
    wait: layer('sc-wait'), ownerWalk: layer('sc-owner-walk'), stations: layer('sc-stations'),
    front: layer('sc-front'), night: layer('sc-night', 'mix-blend-mode:multiply'),
    sign: layer('sc-sign'), light: layer('sc-light', 'mix-blend-mode:screen'), ui: layer('sc-ui'),
  };
  Lr.night.setAttribute('pointer-events', 'none');
  Lr.sign.setAttribute('pointer-events', 'none');
  Lr.light.setAttribute('pointer-events', 'none');
  // khung SVG rộng hơn cảnh (dư hai bên): cắt quầng sáng cho khỏi tràn ra phần dư
  svg.querySelector('defs').insertAdjacentHTML('beforeend', `<clipPath id="cScene"><rect width="${A.VW}" height="${A.VH}"/></clipPath>`);
  Lr.light.setAttribute('clip-path', 'url(#cScene)');
  Lr.wall.innerHTML = A.wallSVG(prices, { tv: true }) + A.neonGameSVG(false) + A.fairyLightsSVG(false) + DECOR.wallSVG(decor) + TV.frameSVG();
  // biển tên quán vẽ lại trên lớp tối (chỉ đúng khung biển) để neon luôn sáng rõ; màn TV cũng tự phát sáng
  Lr.sign.innerHTML = `<clipPath id="cSign"><rect x="194" y="6" width="372" height="58" rx="7"/></clipPath>
    <g clip-path="url(#cSign)">${A.awningSVG(shopName)}</g>${TV.screenSVG(hot, hotName)}`;
  Lr.counter.innerHTML = `<g transform="translate(-316 -19) scale(.75)">${A.counterSVG()}
    <g data-gamble-sign="" display="none" transform="translate(1194 412)"><rect width="224" height="36" rx="3" fill="#FFFDF4" stroke="#A83226" stroke-width="3"/><text x="112" y="25" text-anchor="middle" font-size="22" font-weight="bold" fill="#A83226">CẤM CỜ BẠC</text></g></g>`;
  Lr.front.innerHTML = `<g class="dog-spot" data-hit="dog"></g>` + A.frameSVG() + A.awningSVG(shopName);
  Lr.night.innerHTML = `<rect class="ov-dusk" width="${A.VW}" height="${A.VH}" fill="#FFA464" opacity="0"/>
    <rect class="ov-night" width="${A.VW}" height="${A.VH}" fill="#20234F" opacity="0"/>
    <rect class="ov-vig" width="${A.VW}" height="${A.VH}" fill="url(#gVig)" opacity="0"/>
    <rect class="ov-dark" width="${A.VW}" height="${A.VH}" fill="#1B1426" opacity="0"/>`;
  Lr.light.innerHTML = A.lightsSVG(SX) + `<g class="lt-tv">${TV.glowSVG(hot)}</g><g class="lt-glows"></g>`;
  slots = SX.map((x, k) => {
    const g = node('g', { transform: `translate(${x} ${SY})`, class: 'sc-st', 'data-hit': 'pc', 'data-slot': k });
    const glow = node('g', { transform: `translate(${x} ${SY})` });
    const ui = node('g', { transform: `translate(${x} ${SY})` });
    Lr.stations.appendChild(g);
    svg.querySelector('.lt-glows').appendChild(glow);
    Lr.ui.appendChild(ui);
    return { k, g, glow, ui, key: '', uiKey: '', custId: 0, bar: null, tbar: null, rbar: null };
  });
  owner.el = node('g');
  Lr.ownerBack.appendChild(owner.el);
  Object.assign(owner, { x: OWNER_HOME.x, y: OWNER_HOME.y, path: [], onArrive: null, carry: null, key: '' });
  staff.el = node('g');
  Lr.ownerBack.appendChild(staff.el);
  Object.assign(staff, { x: STAFF_HOME.x, y: STAFF_HOME.y, path: [], onArrive: null, carry: null, key: '', count: staffCount, tasks: [] });
  dog.awake = 0; dog.key = '';
  row = 0;
  lastWaitKey = lastRowsKey = '';
}

// ---------- Bấm trong cảnh ----------
// Đọc chỗ bấm lúc ấn xuống (lúc đó phần tử còn trong cảnh), xử lý lúc nhấc tay.
function hitInfo(target) {
  const hit = target.closest && target.closest('[data-hit]');
  if (!hit) return null;
  const slot = hit.closest('[data-slot]');
  return { kind: hit.dataset.hit, id: +hit.dataset.id, i: slot ? row * PER_ROW + +slot.dataset.slot : -1 };
}
function fire(h) {
  if (!h) return handlers.empty && handlers.empty();
  if (h.kind === 'dog') { dog.awake = 2.6; say(58, 600, 'Gâu~ ♥', 'good'); return; }
  if (h.kind === 'host') return handlers.host && handlers.host();
  if (h.kind === 'cust') return handlers.cust(h.id);
  if (h.kind === 'thief') return handlers.thief && handlers.thief();
  if (h.kind === 'bubble') return handlers.bubble(h.i);
  return handlers.pc(h.i);
}

// ---------- Chữ nổi trong cảnh ----------
function say(x, y, text, kind = '') {
  const colors = { bad: '#C0392B', good: '#137A70', gold: '#B7791F', soft: '#8A7360' };
  const big = kind === 'gold';
  const fs = big ? 26 : 17;
  const w = Math.max(40, text.length * fs * .55 + 22);
  const g = node('g', { transform: `translate(${x} ${y})` });
  g.innerHTML = `<g class="sc-float">
    ${big ? '' : `<rect x="${-w / 2}" y="${-fs - 6}" width="${w}" height="${fs + 16}" rx="${(fs + 16) / 2}" fill="#FFFDF4" stroke="#D9B98A" stroke-width="2"/>`}
    <text class="${big ? 'baloo' : ''}" y="${big ? 0 : 1}" text-anchor="middle" font-size="${fs}" font-weight="800"
      fill="${colors[kind] || '#3A2A22'}" ${big ? 'stroke="#FFFDF4" stroke-width="5" paint-order="stroke"' : ''}>${escText(text)}</text></g>`;
  Lr.ui.appendChild(g);
  setTimeout(() => g.remove(), 1700);
}

// ---------- Diễn xuất của khách ----------
const WIN_LINES = ['Gánh team!', 'Quá dễ!', 'Top 1 server!', 'Ghế này hên ghê!'];
const LOSE_LINES = ['Tại mạng lag!', 'Team phá quá…', 'Hên thôi mà…', 'Ván sau gỡ!'];
function fxFor(c) {
  let f = fxOf.get(c);
  if (!f) { f = { flair: null, flairT: 0, next: rand(6, 12), callT: 0, callNext: 0, eatT: 0, eatItem: null, item: null, look2: 0 }; fxOf.set(c, f); }
  return f;
}
// Tư thế hiện tại suy từ trạng thái thật của khách
function poseOf(pc, c, f) {
  if (c.awaitingLoad) return 'wait';
  if (pc.broken) return 'lose';
  if (f.eatT > 0) return f.eatItem === 'bowl' ? 'eat' : 'drink';
  if (c.order && !c.order.hidden) return f.callT > 0 ? 'order' : 'wait';
  if (f.flairT > 0) return f.flair;
  if (c.sat < 40) return 'lag';
  return 'play';
}
function actTick(pc, c, f, dt, k) {
  if (c.awaitingLoad) return;
  f.flairT = Math.max(0, f.flairT - dt);
  f.callT = Math.max(0, f.callT - dt);
  if (f.eatT > 0) {
    f.eatT -= dt;
    if (f.eatT <= 0) f.item = f.eatItem === 'bowl' ? 'emptyBowl' : 'emptyCup';
  }
  if (c.order && !c.order.hidden) {
    f.callNext -= dt;
    if (f.callNext <= 0) { f.callT = 1.6; f.callNext = rand(4, 6); }
    return;
  }
  if (pc.broken || f.eatT > 0 || f.flairT > 0 || (lastView && lastView.dark)) return;   // cúp điện: máy tắt, không thắng thua gì
  f.next -= dt;
  if (f.next > 0) return;
  f.next = rand(9, 16);
  f.flair = Math.random() < .55 ? 'win' : 'lose';
  f.flairT = f.flair === 'win' ? 2.4 : 2.6;
  if (k == null) return;
  const x = SX[k];
  if (f.flair === 'win') {
    say(x, SY - 318, 'VICTORY!', 'gold');
    setTimeout(() => say(x + 40, SY - 282, pick(WIN_LINES)), 500);
  } else {
    // thua thì liếc sang máy bên cạnh
    f.look2 = k === 2 ? -3 : 3;
    setTimeout(() => say(x + 40, SY - 282, pc.m.mouse === 0 && Math.random() < .5 ? 'Chuột quán đơ quá!' : pick(LOSE_LINES), 'soft'), 500);
  }
}

// ---------- Vẽ từng chỗ máy ----------
function renderSlot(s, pc, v) {
  if (!pc) {
    if (s.key !== 'none') {
      s.key = 'none';
      s.g.innerHTML = `<g data-slot="${s.k}" opacity=".5"><ellipse cy="-4" rx="96" ry="14" fill="none" stroke="#C9B28A" stroke-width="3" stroke-dasharray="8 8"/>
        <text y="-12" text-anchor="middle" font-size="15" font-weight="700" fill="#A48A66">Chỗ trống</text></g>`;
      s.glow.innerHTML = s.ui.innerHTML = '';
      s.uiKey = '';
    }
    return;
  }
  const c = pc.cust;
  const f = c ? fxFor(c) : null;
  const pose = c ? poseOf(pc, c, f) : '';
  const sel = v.selected;
  const picked = v.pick === pc.i;
  // khách mới ngồi: diễn cảnh ngồi xuống một lần
  const justSat = c && s.custId !== c.id;
  if (c) s.custId = c.id; else s.custId = 0;
  const item = c ? f.item || (f.eatT > 0 ? f.eatItem : null) : null;
  const key = [pc.i, JSON.stringify(pc.m), c ? c.id : 0, pose, f ? f.look2 : 0, item, pc.dirty && !c, pc.broken].join('|');
  if (key !== s.key || justSat) {
    s.key = key;
    const cust = c ? { look: lookOf(c), pose, look2: pose === 'lose' || pose === 'wait' ? (pose === 'wait' ? 3 : f.look2) : 0, justSat } : null;
    const stObj = { i: pc.i, m: pc.m, cust, item, trash: !c && pc.dirty };
    s.g.innerHTML = `<g data-slot="${s.k}">${A.stationSVG(stObj)}</g>`;
    s.glow.innerHTML = A.stationGlowSVG(stObj);
  }
  // Lớp giao diện: vòng chọn máy, bong bóng, thanh giờ
  const o = c && c.order;
  const shy = o && o.hidden ? (o.flash > 0 ? 'faded' : 'shy') : '';
  const items = o ? Object.entries(o.items).map(([k, n]) => ITEMS[k].icon.repeat(n)).join('') : '';
  const fit = sel && !c ? (pc.dirty ? 'dirty' : pc.tier >= sel.tier ? 'good' : 'low') : '';
  const uiKey = [fit, picked, shy, items, pc.broken, pc.repair > 0, !c && pc.dirty, !!c, !!c?.awaitingLoad, !!c?.noisy, !!c?.shifty, !!pc.alarm, pc.m.missing || ''].join('|');
  if (uiKey !== s.uiKey) {
    s.uiKey = uiKey;
    const w = A.DESKS[pc.m.chair].w;
    let h = '';
    if (fit) {
      const col = fit === 'good' ? '#1FA89A' : '#E0A11B';
      h += `<ellipse class="sc-ring" cy="-2" rx="${w + (picked ? 30 : 24)}" ry="${picked ? 18 : 15}" fill="${picked ? '#5FF2DC33' : 'none'}"
        stroke="${col}" stroke-width="${picked ? 6 : 4}" ${fit === 'good' ? '' : 'stroke-dasharray="10 7"'}/>`;
    }
    if (c && !c.awaitingLoad) h += `<g transform="translate(${-w + 26} -83)"><rect width="56" height="6" rx="3" fill="#00000030"/><rect class="tbar" width="56" height="6" rx="3" fill="#1FA89A"/></g>`;
    if (pc.broken) {
      h += `<g transform="translate(50 -268)" data-slot="${s.k}" data-hit="pc"><g class="sc-bubble">
        <circle r="26" fill="#FFF1EE" stroke="#C0392B" stroke-width="3"/><text y="9" text-anchor="middle" font-size="26">${pc.repair > 0 ? '🔧' : '💥'}</text>
        ${pc.repair > 0 ? `<rect x="-24" y="32" width="48" height="6" rx="3" fill="#00000025"/><rect class="rbar" x="-24" y="32" width="0" height="6" rx="3" fill="#2E9E5B"/>` : ''}</g></g>`;
    } else if (c?.awaitingLoad) {
      h += `<g transform="translate(52 -266)" data-slot="${s.k}" data-hit="bubble"><g class="sc-bubble">
        <circle r="27" fill="#FFFDF4" stroke="#1FA89A" stroke-width="3"/><text y="9" text-anchor="middle" font-size="26">⏱️</text>
      </g></g>`;
    } else if (o) {
      const txt = shy === 'shy' ? '💭' : items;
      const bw = Math.max(58, [...txt].length * 13 + 26);
      h += `<g transform="translate(52 -266)" data-slot="${s.k}" data-hit="bubble"><g class="sc-bubble ${shy}">
        <path d="M${-bw / 2 + 8},-54 H${bw / 2 - 8} Q${bw / 2},-54 ${bw / 2},-46 V-12 Q${bw / 2},-4 ${bw / 2 - 8},-4 H-8 L-20,8 L-18,-4 H${-bw / 2 + 8} Q${-bw / 2},-4 ${-bw / 2},-12 V-46 Q${-bw / 2},-54 ${-bw / 2 + 8},-54 Z"
          fill="#FFFDF4" stroke="#D9B98A" stroke-width="3"/>
        <text y="-21" text-anchor="middle" font-size="24">${txt}</text>
        ${shy ? '' : `<rect x="${-bw / 2 + 10}" y="-13" width="${bw - 20}" height="5" rx="2.5" fill="#00000018"/><rect class="obar" x="${-bw / 2 + 10}" y="-13" width="${bw - 20}" height="5" rx="2.5" fill="#2E9E5B"/>`}
      </g></g>`;
    } else if (c?.noisy) {
      h += `<g transform="translate(52 -266)" data-slot="${s.k}" data-hit="pc"><g class="sc-bubble">
        <circle r="27" fill="#FFF1EE" stroke="#E0A11B" stroke-width="3"/><text y="9" text-anchor="middle" font-size="26">📢</text>
      </g></g>`;
    } else if (c?.shifty) {
      h += `<g transform="translate(52 -266)" data-slot="${s.k}" data-hit="pc"><g class="sc-bubble">
        <circle r="24" fill="#FFFDF4" stroke="#8A7360" stroke-width="3"/><text y="8" text-anchor="middle" font-size="24">👀</text>
      </g></g>`;
    } else if (pc.alarm) {
      h += `<g transform="translate(0 -230)" data-slot="${s.k}" data-hit="pc"><g class="sc-bubble">
        <circle r="34" fill="#FFE1DC" stroke="#C0392B" stroke-width="4"/><text y="11" text-anchor="middle" font-size="32">🦹</text>
      </g></g>`;
    } else if (!c && pc.m.missing) {
      h += `<g transform="translate(0 -230)" data-slot="${s.k}" data-hit="pc"><g class="sc-bubble">
        <circle r="22" fill="#F3EFE6" stroke="#8A7360" stroke-width="3" stroke-dasharray="6 4"/><text y="8" text-anchor="middle" font-size="22">❓</text>
      </g></g>`;
    } else if (!c && pc.dirty) {
      h += `<g transform="translate(-60 -158)" data-slot="${s.k}" data-hit="pc"><g class="sc-bubble"><circle r="20" fill="#FFFDF4" stroke="#D9B98A" stroke-width="3"/>
        <text y="7" text-anchor="middle" font-size="20">🧹</text></g></g>`;
    }
    s.ui.innerHTML = h;
    s.tbar = s.ui.querySelector('.tbar');
    s.obar = s.ui.querySelector('.obar');
    s.rbar = s.ui.querySelector('.rbar');
    s.obarW = s.obar ? +s.obar.getAttribute('width') : 0;
  }
  // thanh đo cập nhật từng khung hình, không vẽ lại cả cụm
  if (s.tbar) {
    const f2 = clamp(c.remaining / c.loaded, 0, 1);
    s.tbar.setAttribute('width', (56 * f2).toFixed(1));
    s.tbar.setAttribute('fill', f2 < .15 ? '#E0A11B' : '#1FA89A');
  }
  if (s.obar && o) {
    const f2 = clamp(o.patience / o.patienceMax, 0, 1);
    s.obar.setAttribute('width', (s.obarW * f2).toFixed(1));
    s.obar.setAttribute('fill', f2 < .3 ? '#C0392B' : '#2E9E5B');
  }
  if (s.rbar) s.rbar.setAttribute('width', (48 * clamp(1 - pc.repair / v.repairSeconds, 0, 1)).toFixed(1));
}

const lookOf = c => (c.look = c.look || A.makeLook(c.seg, c.gender));

// ---------- Góc chờ ----------
function renderWaiting(v) {
  const q = v.queue;
  const key = q.slice(0, SLOTS.length).map(c => `${c.id}:${c.lost ? 1 : 0}:${c.patience / c.patienceMax < .3 ? 1 : 0}`).join(',')
    + '|' + (v.selected ? v.selected.id : 0) + '|' + q.length;
  if (key === lastWaitKey) return;
  lastWaitKey = key;
  let h = '';
  SLOTS.forEach((sl, k) => {
    if (sl.stool) h += `<g transform="translate(${sl.x} ${sl.y})">${A.stoolSVG(sl.stool)}</g>`;
    const c = q[k];
    if (!c) return;
    const low = c.patience / c.patienceMax < .3;
    const mood = c.lost ? 'hungry' : low ? 'sad' : v.selected === c ? 'smile' : 'idle';
    if (v.selected === c) h += `<ellipse class="sc-ring" cx="${sl.x}" cy="${sl.y}" rx="36" ry="11" fill="#5FF2DC33" stroke="#1FA89A" stroke-width="5"/>`;
    h += `<g transform="translate(${sl.x} ${sl.y}) scale(.92)" data-hit="cust" data-id="${c.id}" class="sc-cust ${arrivals.has(c.id) ? 'walking' : ''}">
      <g class="sc-pop">${A.standingSVG(lookOf(c), { stool: !!sl.stool && !arrivals.has(c.id), mood })}</g></g>`;
    if (c.lost) h += `<g transform="translate(${sl.x + 26} ${sl.y - 150})"><circle r="15" fill="#FFFDF4" stroke="#D9B98A" stroke-width="2.5"/><text y="6" text-anchor="middle" font-size="18" font-weight="800" fill="#C0392B">?</text></g>`;
  });
  if (q.length > SLOTS.length) {
    h += `<g transform="translate(236 470)"><rect x="-30" y="-16" width="60" height="30" rx="15" fill="#F07A5A"/>
      <text y="6" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">+${q.length - SLOTS.length}</text></g>`;
  }
  Lr.wait.innerHTML = h;
}

// ---------- Chủ quán ----------
function stepOwner(dt) {
  if (!owner.path.length) return false;
  let d = owner.speed * dt;
  while (d > 0 && owner.path.length) {
    const t = owner.path[0], dx = t.x - owner.x, dy = t.y - owner.y, len = Math.hypot(dx, dy);
    if (len <= d) { owner.x = t.x; owner.y = t.y; owner.path.shift(); d -= len; }
    else { owner.x += dx / len * d; owner.y += dy / len * d; d = 0; }
  }
  if (!owner.path.length && owner.onArrive) { const f = owner.onArrive; owner.onArrive = null; f(); }
  return true;
}
function renderOwner(v) {
  const walking = owner.path.length > 0;
  const out = walking || owner.y !== OWNER_HOME.y;   // đang ra khỏi quầy
  const cooking = v.cooking != null && !out;
  if (!out) owner.x = cooking ? OWNER_COOK.x : OWNER_HOME.x;
  const parent = out ? Lr.ownerWalk : Lr.ownerBack;
  if (owner.el.parentNode !== parent) parent.appendChild(owner.el);
  const key = [cooking, walking, owner.carry].join('|');
  if (key !== owner.key) {
    owner.key = key;
    owner.el.classList.toggle('walking', walking);
    owner.el.innerHTML = `<g transform="scale(.82)">${A.standingSVG(A.OWNER_LOOK, {
      owner: true, carry: owner.carry, pose: cooking ? 'cook' : 'stand', mood: cooking ? 'focus' : 'smile' })}</g>`;
    const flame = svg.querySelector('#flame'), steam = svg.querySelector('#potSteam');
    if (flame) flame.classList.toggle('on', cooking);
    if (steam) steam.classList.toggle('strong', cooking);
  }
  owner.el.setAttribute('transform', `translate(${owner.x.toFixed(1)} ${owner.y.toFixed(1)})`);
}
// Bưng món ra: chủ quán đi tới máy rồi quay về quầy. Khách bắt đầu ăn khi món tới bàn.
function deliver(i, c, item, byStaff = false) {
  const f = fxFor(c);
  const k = i - row * PER_ROW;
  const serve = () => { f.eatT = 5; f.eatItem = item; f.item = null; f.flairT = 0; };
  if (byStaff) { staffTrip(i, item, serve); return; }
  if (k < 0 || k >= PER_ROW || owner.path.length) { serve(); return; }
  const spot = { x: DELIVER_X[k], y: 600 };
  owner.carry = item;
  owner.path = [...OWNER_EXIT, { x: spot.x, y: OWNER_EXIT[1].y }, spot];
  owner.onArrive = () => {
    owner.carry = null;
    serve();
    owner.path = [{ x: spot.x, y: OWNER_EXIT[1].y }, ...OWNER_EXIT.slice().reverse(), OWNER_HOME];
  };
}

// Một nhân viên đại diện trên cảnh; nhiều nhân viên vẫn có sức phục vụ riêng trong game.js.
function staffTrip(i, item, onArrive = () => {}) {
  const k = i - row * PER_ROW;
  if (!staff.count || k < 0 || k >= PER_ROW) { onArrive(); return; }
  staff.tasks.push({ k, item, onArrive });
}
function guide(i) { staffTrip(i, null); }
function clean(i) { staffTrip(i, null); }
function stepStaff(dt) {
  if (!staff.count) return;
  if (!staff.path.length && staff.tasks.length) {
    const job = staff.tasks.shift(), spot = { x: DELIVER_X[job.k], y: 600 };
    staff.carry = job.item;
    staff.path = [...OWNER_EXIT, { x: spot.x, y: OWNER_EXIT[1].y }, spot];
    staff.onArrive = () => {
      staff.carry = null;
      job.onArrive();
      staff.path = [{ x: spot.x, y: OWNER_EXIT[1].y }, ...OWNER_EXIT.slice().reverse(), STAFF_HOME];
    };
  }
  if (!staff.path.length) return;
  let d = staff.speed * dt;
  while (d > 0 && staff.path.length) {
    const t = staff.path[0], dx = t.x - staff.x, dy = t.y - staff.y, len = Math.hypot(dx, dy);
    if (len <= d) { staff.x = t.x; staff.y = t.y; staff.path.shift(); d -= len; }
    else { staff.x += dx / len * d; staff.y += dy / len * d; d = 0; }
  }
  if (!staff.path.length && staff.onArrive) { const f = staff.onArrive; staff.onArrive = null; f(); }
}
function renderStaff() {
  if (!staff.el) return;
  staff.el.hidden = !staff.count;
  if (!staff.count) return;
  const walking = staff.path.length > 0;
  const parent = walking || staff.y !== STAFF_HOME.y ? Lr.ownerWalk : Lr.ownerBack;
  if (staff.el.parentNode !== parent) parent.appendChild(staff.el);
  const key = [walking, staff.carry, staff.count].join('|');
  if (key !== staff.key) {
    staff.key = key;
    staff.el.classList.toggle('walking', walking);
    staff.el.innerHTML = `<g transform="scale(.75)">${A.standingSVG(STAFF_LOOK, { carry: staff.carry, mood: 'smile' })}</g>`;
  }
  staff.el.setAttribute('transform', `translate(${staff.x.toFixed(1)} ${staff.y.toFixed(1)})`);
}

// ---------- Dãy máy (mỗi dãy 3 máy) ----------
function renderRows(v) {
  rowCount = Math.max(1, Math.ceil(v.pcs.length / PER_ROW));
  if (row >= rowCount) row = 0;
  const alert = r => v.pcs.slice(r * PER_ROW, r * PER_ROW + PER_ROW)
    .some(pc => pc.broken || (pc.cust && pc.cust.order) || (v.selected && !pc.cust));
  const key = rowCount + '|' + row + '|' + [...Array(rowCount)].map((_, r) => alert(r) ? 1 : 0).join('');
  if (key === lastRowsKey) return;
  lastRowsKey = key;
  rowsEl.hidden = rowCount <= 1;
  rowsEl.innerHTML = rowCount <= 1 ? '' : [...Array(rowCount)].map((_, r) =>
    `<button data-row="${r}" class="${r === row ? 'on' : ''} ${alert(r) && r !== row ? 'alert' : ''}">Dãy ${r + 1}
      <small>máy ${r * PER_ROW + 1}–${Math.min(v.pcs.length, r * PER_ROW + PER_ROW)}</small></button>`).join('');
}
// Phần tử để game đặt chữ bay (tiền, lời khách) đúng chỗ máy; máy ở dãy khác thì bay ở nút dãy
function anchor(i) {
  const k = i - row * PER_ROW;
  if (k >= 0 && k < PER_ROW && slots[k]) return slots[k].g;
  return rowsEl.querySelector(`[data-row="${Math.floor(i / PER_ROW)}"]`) || svg;
}
function showRowOf(i) {
  const r = Math.floor(i / PER_ROW);
  if (r !== row) { row = r; slots.forEach(s => { s.key = ''; s.uiKey = ''; }); lastRowsKey = ''; }
}

// ---------- Ánh sáng theo giờ ----------
function applyLight(t) {
  // giờ chạy liên tục qua nửa đêm (24 = 0h, 30 = 6h): gần 6h sáng trời hửng dần
  const dawn = smooth(29, 30.8, t);
  const n = smooth(16.4, 19.2, t) * (1 - dawn);
  const dusk = clamp(1 - Math.abs(t - 17.6) / 1.5, 0, 1);
  const set = (sel, val) => { const e = svg.querySelector(sel); if (e) e.setAttribute('opacity', val.toFixed(3)); };
  // đêm: quán chìm vào xanh tím, tối dần ra mép khung; khu máy chỉ còn ánh màn hình, quầy vẫn vàng ấm
  set('.ov-night', n * .8);
  set('.ov-vig', n * .7);
  set('.ov-dusk', dusk * .3 * (1 - n * .5));
  set('.lt-lamps', Math.max(.05, smooth(16.8, 18, t) * .18));
  set('.lt-counter', Math.max(.1, smooth(16.8, 18.2, t) * .95));
  set('.lt-sun', (1 - n) * .5 * smooth(7, 9, t));
  set('.lt-sign', .25 + n * .75);
  set('.lt-glows', .12 + n * .88);
  set('.lt-neon', smooth(17.2, 19, t));   // đèn nháy + biển GAME bật lúc chập tối
  set('.lt-tv', .1 + n * .6);             // TV hắt sáng ra quán, rõ nhất về đêm
  const hh = svg.querySelector('.clock-h'), mm = svg.querySelector('.clock-m');
  if (hh) hh.setAttribute('transform', `rotate(${((t % 12) * 30).toFixed(1)})`);
  if (mm) mm.setAttribute('transform', `rotate(${((t % 1) * 360).toFixed(1)})`);
}

// ---------- Mỗi khung hình ----------
// view: { time, pcs, queue, selected, pick, cooking, paused, repairSeconds, dark }
function frame(v, dt) {
  if (!svg || !Lr.wall) return;
  Lr.counter.querySelector('[data-gamble-sign]').setAttribute('display', v.gamblingBanned ? 'inline' : 'none');
  lastView = v;
  if (v.paused) dt = 0;
  applyLight(v.time);
  // cúp điện: cả quán tối sầm, đèn và màn hình tắt
  const od = svg.querySelector('.ov-dark');
  if (od) od.setAttribute('opacity', v.dark ? '.62' : '0');
  Lr.light.style.opacity = v.dark ? '.04' : '';
  Lr.sign.style.opacity = v.dark ? '0' : '';
  renderRows(v);
  for (const pc of v.pcs) if (pc.cust) {
    const k = pc.i - row * PER_ROW;
    actTick(pc, pc.cust, fxFor(pc.cust), dt, k >= 0 && k < PER_ROW ? k : null);
  }
  slots.forEach((s, k) => renderSlot(s, v.pcs[row * PER_ROW + k], v));
  stepGuests(v, dt);
  renderWaiting(v);
  placeArrivals(v);
  stepExtras();
  stepOwner(dt);
  renderOwner(v);
  stepStaff(dt);
  renderStaff();
  if (dog.awake > 0) dog.awake -= dt;
  const dk = dog.awake > 0 ? 'awake' : 'sleep';
  if (dk !== dog.key) {
    dog.key = dk;
    svg.querySelector('.dog-spot').innerHTML = `<g transform="translate(58 ${A.VH - 12}) scale(.62)">${A.dogSVG(dog.awake > 0)}</g>`;
  }
}

window.PlayScene = { mount, start, frame, deliver, guide, clean, anchor, showRowOf, say, crop, onTap, momIn, momOut, PER_ROW };
})();
