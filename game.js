/* Quán Nét Bất Ổn — logic game */
(() => {
'use strict';

const C = CONFIG;

// ---------- Tiện ích ----------
const $ = (s, r = document) => r.querySelector(s);
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function setText(node, v) { if (node.textContent !== v) node.textContent = v; }
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, ch => ESC[ch]);

function money(n) {
  const sign = n < 0 ? '-' : '';
  n = Math.abs(Math.round(n));
  if (n >= 1e6) return sign + (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + 'tr';
  return sign + (Math.round(n / 100) / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'k';
}
function hoursText(h) {
  const whole = Math.floor(h), half = h - whole >= 0.5;
  if (!half) return `${whole} tiếng`;
  return whole ? `${whole} tiếng rưỡi` : 'nửa tiếng';
}
function durText(h) {
  h = Math.max(0, h);
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh++; mm = 0; }
  return `${hh}:${String(mm).padStart(2, '0')}`;
}
function clockText(t) {
  const h = Math.floor(t), m = Math.floor((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
const mood = s => s >= 85 ? '😍' : s >= 65 ? '🙂' : s >= 40 ? '😐' : '😡';
const keysOf = cat => Object.keys(ITEMS).filter(k => ITEMS[k].cat === cat && S.unlocked[k]);
const patienceMul = () => R && acRunning() ? C.AC_PATIENCE_BONUS : 1;
const rentCost = () => C.RENT_BASE + C.RENT_PER_PC * S.machines.length;
const netPlan = () => NET_PLANS.find(p => p.id === S.net) || NET_PLANS[0];
const netCap = () => S.netCut ? 0 : netPlan().cap;   // nợ cước bị cắt mạng: máy nào chạy cũng giật
const round500 = n => Math.round(n / 500) * 500;
const round1k = n => Math.round(n / 1000) * 1000;

// ---------- Hạ tầng trong ngày: điện, nhiệt độ ----------
const gridOut = () => !!(R.outage && R.time >= R.outage.from && R.time < R.outage.to);
const powered = () => !gridOut() || R.genOn;
const acRunning = () => !!(S.upgrades.ac && R.acOn && powered());
// nhiệt độ ngoài trời: sáng tối dịu, nóng nhất khoảng 13h30 (S.forecast là mức cao nhất trong ngày)
const outsideTemp = t => S.forecast - 5 * clamp(Math.abs(t - 13.5) / 5.5, 0, 1);

// ---------- Lịch: thứ trong tuần, tuần thi (ngày 1 là Thứ 2) ----------
const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const weekday = (day = S.day) => (day - 1) % 7;   // 0 = Thứ 2 … 6 = Chủ nhật
const isWeekend = (day = S.day) => weekday(day) >= 5;
const dayText = (day = S.day) => `${day} · ${WEEKDAYS[weekday(day)]}`;
// vị trí trong chu kỳ thi: 0–6 là tuần thi, 7 là ngày đầu thi xong
const examPhase = day => ((day - C.EXAM_FROM_DAY) % C.EXAM_CYCLE + C.EXAM_CYCLE) % C.EXAM_CYCLE;
const isExamDay = (day = S.day) => day >= C.EXAM_FROM_DAY && examPhase(day) < 7;
const isAfterExam = (day = S.day) => day > C.EXAM_FROM_DAY && examPhase(day) === 7;
// còn mấy ngày nữa tới tuần thi (chỉ tính trong tuần ngay trước đó), không thì 0
const daysToExam = (day = S.day) => day >= C.EXAM_FROM_DAY - 7 && examPhase(day) >= C.EXAM_CYCLE - 7
  ? C.EXAM_CYCLE - examPhase(day) : 0;
const kidMul = () => isExamDay() ? C.EXAM_KID_MUL : isAfterExam() ? C.EXAM_AFTER_MUL : 1;

// ---------- Máy & linh kiện ----------
// wear = độ bền phím chuột (0–100), khách đập phím thì giảm
// missing = linh kiện bị trộm mất (vd. 'mouse'); máy thiếu đồ thì không xếp khách được tới khi mua lại
const newMachine = () => ({ ...Object.fromEntries(Object.keys(PARTS).map(k => [k, 0])), wear: 100, missing: null });
const machineTier = m => Math.min(m.cpu, m.gpu) + 1;
const partsOf = pred => Object.keys(PARTS).filter(k => pred(PARTS[k]));
const gearBonus = m => partsOf(p => p.bonus).reduce((s, k) => s + PARTS[k].bonus * m[k], 0);   // tiền giờ cộng thêm
const gearSat = m => partsOf(p => p.sat).reduce((s, k) => s + PARTS[k].sat * m[k], 0);         // khách vui thêm
const machineRate = m => TIERS[machineTier(m)].rate + gearBonus(m);

// ---------- Trạng thái ----------
let S = null;      // dữ liệu lưu qua nhiều ngày
let R = null;      // trạng thái trong một ngày mở cửa
let modal = null;
let hold = null;
let lastFrame = performance.now();

// ---------- Lưu game ----------
const SAVE_KEY = 'quan-net-nho-v1';
function saveGame() {
  try { CloudSave.save(S); }
  catch (e) { saveFailed(e); }
}
function loadGame() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function clearSave() { try { CloudSave.save(null); } catch (e) { saveFailed(e); } }
function saveFailed(e) {
  if (R && !R.over) setPause(true);
  document.querySelectorAll('.cloud-status').forEach(n => { n.textContent = e.message; });
  openModal({ title: 'Chưa lưu được', body: '<p>'+esc(e.message)+'</p><p>Giữ trang này mở và chép bản lưu dự phòng nếu cần.</p>',
    actions: [{ label: 'Đóng', onClick: closeModal }] });
}

function newGame(shopName) {
  S = {
    shopName, day: 1, money: C.START_MONEY, rating: 3,
    machines: [newMachine(), newMachine(), newMachine()],
    upgrades: {}, unlocked: {}, inv: {},
    reviews: [], starCounts: [0, 0, 0, 0, 0],
    installed: {}, hot: 'lmhb', lastAsked: {}, pendingPolice: 0, pendingKid: 0,
    seenTutorial: false,
    net: 'home',
    staff: [], nextStaffId: 1,
  };
  normalizeSave();
  addStock('mi', 10); addStock('trung', 10); addStock('sting', 6); addStock('suoi', 6);
}
function normalizeSave() {
  S.upgrades = S.upgrades || {};
  S.net = S.net || 'home';
  S.netCut = !!S.netCut;
  S.acOn = S.acOn ?? true;            // lần trước để điều hòa bật hay tắt
  S.forecast = S.forecast || 32;      // nhiệt độ cao nhất hôm nay
  S.outageNext = S.outageNext || null; // lịch cúp điện hôm nay (báo từ tối qua)
  S.bill = S.bill || { rent: 0, net: 0, power: 0, days: 0 };   // hóa đơn tuần đang cộng dồn
  S.dueBill = S.dueBill || null;      // hóa đơn đã chốt, chưa trả
  S.loans = S.loans || { bank: 0, shark: 0 };
  S.sharkDays = S.sharkDays || 0;     // số ngày đang nợ vay nóng
  S.unlocked = S.unlocked || {};
  S.inv = S.inv || {};
  S.reviews = S.reviews || [];
  S.starCounts = S.starCounts || [0, 0, 0, 0, 0];
  S.installed = S.installed || {};
  S.lastAsked = S.lastAsked || {};
  S.staff = Array.isArray(S.staff) ? S.staff : [];
  S.nextStaffId = Math.max(S.nextStaffId || 1, ...S.staff.map(p => (p.id || 0) + 1));
  for (const p of S.staff) {
    p.wage = clamp(Math.round((Number(p.wage) || C.STAFF_WAGE_DEFAULT) / 5000) * 5000, C.STAFF_WAGE_MIN, C.STAFF_WAGE_MAX);
    p.trained = !!p.trained;
  }
  // bỏ game đã gỡ khỏi danh sách (file lưu cũ)
  for (const id in S.installed) if (!GAMES[id]) delete S.installed[id];
  for (const id in S.lastAsked) if (!GAMES[id]) delete S.lastAsked[id];
  for (const id in GAMES) if (!GAMES[id].cost) S.installed[id] = true;
  if (!GAMES[S.hot]) S.hot = 'lmhb';
  S.pendingPolice = S.pendingPolice || 0;
  S.pendingKid = S.pendingKid || 0;
  S.hintSeen = S.hintSeen || {};   // số lần đã hiện gợi ý "Lần tới" cho từng sự việc
  S.regulars = S.regulars || [];   // sổ khách quen: danh tính cố định + ký ức về quán
  S.nextRegId = S.nextRegId || 1;
  // Khách quen trong bản lưu cũ chưa có giới tính: đoán từ tên, rồi đổi ảnh/dáng vẻ nếu đang lệch giới tính
  for (const r of S.regulars) {
    if (r.gender) continue;
    r.gender = genderOfName(r.name);
    const s = SEGMENTS[r.seg] || SEGMENTS.vanglai;
    if (!avatarsOf(s, r.gender).includes(r.avatar)) r.avatar = pick(avatarsOf(s, r.gender));
    // dáng vẻ cũ: tóc bob/búi/dài là nữ — nếu khớp tên thì giữ nguyên, lệch thì vẽ lại
    const lookGender = r.look && (['bob', 'bun', 'long'].includes(r.look.hairStyle) ? 'f' : 'm');
    if (r.look && lookGender !== r.gender) r.look = ART.makeLook(r.seg, r.gender);
    else if (r.look) r.look.gender = r.gender;
  }
  // File lưu cũ: máy là số hạng (1 thường, 2 gaming, 3 phòng VIP) → đổi sang linh kiện
  S.machines = S.machines.map(m => {
    if (typeof m !== 'number') return { ...newMachine(), ...m };
    const chair = S.upgrades.chair ? 1 : 0;   // nâng cấp "ghế gaming" cũ áp cho cả quán
    if (m === 2) return { ...newMachine(), cpu: 1, gpu: 1, chair };
    if (m === 3) return { ...newMachine(), cpu: 2, gpu: 2, mouse: 2, kb: 2, mon: 2, chair: Math.max(chair, 2) };
    return { ...newMachine(), chair };
  });
  for (const m of S.machines) if (m.wear == null) m.wear = 100;
  for (const k in ITEMS) {
    if (S.unlocked[k] == null) S.unlocked[k] = !ITEMS[k].unlockCost;
    if (!Array.isArray(S.inv[k])) S.inv[k] = [];
  }
}

// ---------- Thư viện game ----------
const gameIcon = id => GAMES[id].icon + ' ' + GAMES[id].name;
const gameWeight = id => GAMES[id].pop * (S.hot === id ? C.HOT_MULT : 1);
// game khách máy loại `tier` có thể tìm (VIP = streamer, chơi game nào cũng được)
// Thường → game nhẹ; Pre → game gaming; VIP → game gaming + game nặng; Pro Max (streamer) → game nào cũng được
const gamesForTier = tier => Object.keys(GAMES).filter(id => {
  const t = GAMES[id].minTier;
  return tier === 4 || t === tier || (tier === 3 && t === 2);
});
// prefer = game tệp khách ưa chuộng; nếu có game hợp hạng máy thì chỉ chọn trong đó
function pickGame(tier, prefer) {
  let ids = gamesForTier(tier);
  const fav = prefer ? ids.filter(id => prefer.includes(id)) : [];
  if (fav.length) ids = fav;
  let r = Math.random() * ids.reduce((s, id) => s + gameWeight(id), 0);
  for (const id of ids) { r -= gameWeight(id); if (r < 0) return id; }
  return ids[ids.length - 1];
}
// phần trăm khách của loại máy đó tìm game này
function gameShare(id) {
  const ids = gamesForTier(GAMES[id].minTier);
  return gameWeight(id) / ids.reduce((s, x) => s + gameWeight(x), 0);
}
function buyGame(id) {
  const g = GAMES[id];
  if (!g || S.installed[id] || S.money < g.cost) return;
  S.money -= g.cost;
  S.installed[id] = true;
  saveGame();
  renderPrep();
}
function pickHotGame() {
  S.hot = pick(Object.keys(GAMES).filter(id => id !== S.hot));
}

// ---------- Kho hàng (dùng hàng cũ trước) ----------
// b.exp = ngày cuối còn hạn. Qua ngày đó là hết date (vẫn nằm trong kho nếu không bỏ).
const daysPast = b => S.day - b.exp;   // > 0 là đã hết date
const nearShelf = k => Math.max(1, Math.round(ITEMS[k].shelf * C.NEAR_SHELF_RATIO));
const nearCost = k => Math.round(ITEMS[k].packCost * (1 - C.NEAR_DISCOUNT) / 1000) * 1000;
function invCount(k) { return S.inv[k].reduce((s, b) => s + b.qty, 0); }
function expiredCount(k) { return S.inv[k].reduce((s, b) => s + (daysPast(b) > 0 ? b.qty : 0), 0); }
function addStock(k, qty, shelf = ITEMS[k].shelf) {
  const exp = S.day + shelf - 1;
  const b = S.inv[k].find(x => x.exp === exp);
  if (b) b.qty += qty; else S.inv[k].push({ qty, exp });
  S.inv[k].sort((a, b2) => a.exp - b2.exp);
}
// Lấy hàng cũ nhất trước. Trả về số ngày đã quá hạn (0 = còn hạn), hoặc null nếu hết hàng.
function invTake(k) {
  const list = S.inv[k];
  if (!list.length) return null;
  const past = Math.max(0, daysPast(list[0]));
  list[0].qty--;
  if (list[0].qty <= 0) list.shift();
  return past;
}
// Bỏ hàng hết date; trả về số lượng đã bỏ
function removeExpired(k) {
  const n = expiredCount(k);
  S.inv[k] = S.inv[k].filter(b => daysPast(b) <= 0);
  return n;
}

// ---------- Màn hình & modal ----------
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  window.scrollTo(0, 0);
}

// dock = hiện ở quầy thao tác nửa dưới màn chơi (không che cảnh quán, vẫn bấm được khách và máy)
// foot = phần luôn nằm ở đáy quầy cùng hàng nút (thanh đo, nút giữ), không bị cuộn khuất
function openModal({ title, body, actions = [], cls = '', onClose, dismissable = true, dock = false, foot = null }) {
  if (modal) closeModal();
  if (dock) return openDock({ title, body, actions, cls, onClose, dismissable, foot });
  const overlay = el('div', 'modal-overlay');
  const card = el('div', 'modal ' + cls);
  if (title) card.appendChild(el('h2', 'modal-title', title));
  const bodyEl = el('div', 'modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  card.appendChild(bodyEl);
  if (actions.length) {
    const bar = el('div', 'modal-actions');
    for (const a of actions) {
      const b = el('button', 'btn ' + (a.cls || ''), a.label);
      if (a.id) b.id = a.id;
      b.addEventListener('click', a.onClick);
      bar.appendChild(b);
    }
    card.appendChild(bar);
  }
  overlay.appendChild(card);
  if (dismissable) overlay.addEventListener('pointerdown', e => { if (e.target === overlay) closeModal(); });
  $('#modal-root').appendChild(overlay);
  modal = { overlay, card, bodyEl, onClose, dismissable, update: null, holdBtn: null, pc: null };
  return modal;
}
function openDock({ title, body, actions, cls, onClose, dismissable, foot }) {
  const card = el('div', 'dock-card ' + cls);
  const head = el('div', 'dock-card-head');
  head.appendChild(el('h2', 'dock-title', title || ''));
  if (dismissable) {
    const x = el('button', 'icon-btn dock-close', '✕');
    x.setAttribute('aria-label', 'Đóng');
    x.addEventListener('click', () => closeModal());
    head.appendChild(x);
  }
  card.appendChild(head);
  const bodyEl = el('div', 'dock-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  card.appendChild(bodyEl);
  const footEl = el('div', 'dock-foot');
  if (foot) footEl.appendChild(foot);
  if (actions.length) {
    const bar = el('div', 'dock-actions');
    for (const a of actions) {
      const b = el('button', 'btn ' + (a.cls || ''), a.label);
      if (a.id) b.id = a.id;
      b.addEventListener('click', a.onClick);
      bar.appendChild(b);
    }
    footEl.appendChild(bar);
  }
  if (footEl.childElementCount) card.appendChild(footEl);
  $('#dock-panel').appendChild(card);
  $('#dock').classList.add('open');
  $('#dock').scrollTop = 0;
  syncSceneCrop();
  modal = { overlay: card, card, bodyEl, onClose, dismissable, update: null, holdBtn: null, pc: null, docked: true };
  return modal;
}
function closeModal() {
  if (!modal) return;
  const m = modal;
  modal = null;
  stopHold();
  m.overlay.remove();
  if (m.docked) { $('#dock').classList.remove('open'); syncSceneCrop(); }
  if (m.onClose) m.onClose();
}

// Màn dọc (điện thoại): khi quầy mở thì thu cảnh quán lại cho quầy đủ chỗ, không phải cuộn cả trang
const COMPACT_MQ = matchMedia('not all and (min-width: 900px) and (min-aspect-ratio: 4/3)');
function syncSceneCrop() {
  const on = COMPACT_MQ.matches && $('#dock').classList.contains('open');
  $('#screen-play').classList.toggle('dock-open', on);
  PlayScene.crop(on);
}

// ---------- Nút "giữ để đổ đầy" (cơ chế chính) ----------
function bindHold(btn, target, prop, rate, max) {
  const start = e => {
    if (e) e.preventDefault();
    if (btn.disabled) return;
    hold = { btn, target, prop, rate, max };
    btn.classList.add('holding');
    SFX.loop({ cook: 'sizzle', pour: 'pour', v: 'charge' }[prop]);
    if (modal) modal.holdBtn = btn;
  };
  btn.addEventListener('pointerdown', e => {
    start(e);
    try { btn.setPointerCapture(e.pointerId); } catch (_) { /* bỏ qua */ }
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    btn.addEventListener(ev, () => { if (hold && hold.btn === btn) stopHold(); });
  }
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn._startHold = start;
}
function stopHold() {
  if (!hold) return;
  SFX.stopLoop();
  hold.btn.classList.remove('holding');
  hold = null;
}

function buildFill({ vertical = false, max, zone, mark, ticks = [], cls = '' }) {
  const root = el('div', `fill ${vertical ? 'vertical' : ''} ${cls}`);
  const p = v => v / max * 100;
  const side = vertical ? 'bottom' : 'left';
  const size = vertical ? 'height' : 'width';
  const level = el('div', 'fill-level');
  const zoneEl = el('div', 'fill-zone');
  zoneEl.style[side] = p(zone[0]) + '%';
  zoneEl.style[size] = p(zone[1] - zone[0]) + '%';
  root.append(level, zoneEl);
  if (mark != null) {
    const m = el('div', 'fill-mark');
    m.style[side] = p(mark) + '%';
    root.appendChild(m);
  }
  for (const t of ticks) {
    const tk = el('div', 'fill-tick', t.label);
    tk.style[side] = p(t.v) + '%';
    root.appendChild(tk);
  }
  return { root, set: v => { level.style[size] = clamp(p(v), 0, 100) + '%'; } };
}

function judge(v, zone, tol) {
  if (v >= zone[0] && v <= zone[1]) return 'perfect';
  const d = v < zone[0] ? zone[0] - v : v - zone[1];
  return d <= tol ? 'ok' : 'bad';
}
function cookLabel(v, z) {
  if (v <= 0) return 'chưa nấu';
  if (v < z[0] - 8) return 'còn sống';
  if (v < z[0]) return 'hơi sống';
  if (v <= z[1]) return 'chín vừa ✓';
  if (v <= z[1] + 8) return 'hơi nhừ';
  return 'nát bét';
}
function pourLabel(v, z) {
  if (v <= 0) return 'chưa rót';
  if (v < z[0] - 6) return 'ít quá';
  if (v < z[0]) return 'hơi ít';
  if (v <= z[1]) return 'đúng vạch ✓';
  if (v <= z[1] + 6) return 'hơi đầy';
  return 'tràn ly';
}

// ---------- Hiệu ứng ----------
function fx(target, text, cls = '', delay = 0) {
  const show = () => {
    const r = target.getBoundingClientRect();
    if (!r.width) return;
    SFX.cue(cls);   // tiếng chung theo loại chữ bay: money/good/warn/bad
    if (cls === 'money') VFX.coins(target);   // tiền vào: xu bay về ô 💵
    const d = el('div', 'fx ' + cls, text);
    d.style.left = (r.left + r.width / 2) + 'px';
    d.style.top = (r.top + r.height * 0.3) + 'px';
    $('#fx-layer').appendChild(d);
    setTimeout(() => d.remove(), 1500);
  };
  if (delay) setTimeout(show, delay); else show();
}
function fxList(target, notes) {
  notes.forEach((n, i) => fx(target, n[0], n[1], 280 * (i + 1)));
}
function log(msg) {
  const box = $('#log');
  box.prepend(el('div', 'log-line', msg));
  while (box.children.length > 6) box.lastChild.remove();
}

// ---------- Tên quán ----------
function askShopName({ title, initial = '', canCancel = false, onDone }) {
  const body = el('div', 'name-form');
  body.innerHTML = `
    <p class="hint">Tên này sẽ hiện trên bảng hiệu và trên Google Maps. Đổi lại được bất cứ lúc nào.</p>
    <div class="name-row">
      <input class="name-input" maxlength="28" placeholder="Ví dụ: Net Tèo" autocomplete="off">
      <button class="btn ghost name-dice" title="Gợi ý tên ngẫu nhiên" aria-label="Gợi ý tên">🎲</button>
    </div>`;
  const input = body.querySelector('.name-input');
  input.value = initial;
  const submit = () => {
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (!name) { input.focus(); input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
    closeModal();
    onDone(name);
  };
  body.querySelector('.name-dice').addEventListener('click', () => {
    input.value = pick(SHOP_NAME_IDEAS.filter(n => n !== input.value));
    input.focus();
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  const actions = [{ label: 'Treo bảng hiệu ✓', cls: 'primary', onClick: submit }];
  if (canCancel) actions.unshift({ label: 'Thôi', cls: 'ghost', onClick: () => closeModal() });
  openModal({ title, body, actions, cls: 'modal-name', dismissable: canCancel });
  setTimeout(() => { input.focus(); input.select(); }, 30);
}

function renderShopName() {
  const name = S.shopName;
  document.querySelectorAll('.shop-name').forEach(n => setText(n, name));
  document.title = `${name} · Quán Nét Bất Ổn`;
}

// ---------- Sổ sự việc của khách ----------
// c.ev[sự việc] = tổng điểm hài lòng sự việc đó đã cộng/trừ (âm là xấu) — dùng để chọn điều khách nhắc tới.
// c.causes = nguyên nhân viết bằng chữ, hiện khi bấm vào nhận xét trên bảng cuối ngày.
const segOf = c => SEGMENTS[c.seg];
const traitOf = c => TRAITS[c.trait];

// Mức quan tâm = care của tệp khách × hệ số tính cách (tính cách chỉ nhân chiều xấu hoặc tốt tương ứng)
function careOf(c, aspect, sign) {
  if (!aspect) return 1;
  const t = traitOf(c)[sign < 0 ? 'bad' : 'good'];
  return (segOf(c).care[aspect] ?? 1) * (t?.[aspect] ?? 1);
}
function cause(c, text) { if (text) c.causes.push(text); }
// Khách quen lần trước bị chuyện này rồi mà hôm nay lại bị nữa?
const repeatsMemory = (c, t) => !!(c.mem && !c.mem.good && MEM_GROUP[t] === c.mem.key);
function markAgain(c) { if (!c.ev.again) note(c, 'again', -10, 'Lại gặp đúng chuyện như lần trước'); }
// Ghi một sự việc có ảnh hưởng đến độ hài lòng. Trả về số điểm thực tế đã áp.
// Lỗi lặp lại đúng chuyện khách còn nhớ thì khó chịu gấp rưỡi.
function hit(c, t, base, aspect, why) {
  let mul = careOf(c, aspect, base);
  if (base < 0 && repeatsMemory(c, t)) { mul *= 1.5; markAgain(c); }
  const d = base * mul;
  c.sat = clamp(c.sat + d, 0, 100);
  c.ev[t] = (c.ev[t] || 0) + d;
  cause(c, why);
  return d;
}
// Ghi một sự việc khách để ý nhưng không đổi độ hài lòng (w chỉ để xếp độ nổi bật)
function note(c, t, w, why) { c.ev[t] = (c.ev[t] || 0) + w; cause(c, why); }

// Mức chờ tính theo sức chịu chờ của từng khách (f = phần kiên nhẫn đã dùng), không quy ra đồng hồ
const waitWord = f => f < 0.25 ? 'Được xếp máy ngay' : f < 0.6 ? 'Chờ máy một lúc'
  : f < 0.85 ? 'Chờ máy khá lâu' : 'Đợi gần hết kiên nhẫn mới có máy';
const foodWord = f => f < 0.3 ? 'Món ra nhanh' : f < 0.6 ? '' : f < 0.85 ? 'Món ra hơi chậm' : 'Món ra rất chậm';

function starsHTML(n) {
  return `<span class="stars" aria-label="${n} sao"><span class="on">${'★'.repeat(n)}</span><span class="off">${'★'.repeat(5 - n)}</span></span>`;
}

// Câu có sẵn cho sự việc: câu riêng của tệp khách → câu theo giọng → câu chung (giọng vui)
function linesFor(c, key) {
  const own = segOf(c).lines?.[key];
  if (own && Math.random() < 0.8) return own;
  return (c.voice !== 'vui' && VOICE_LINES[c.voice][key]) || REVIEW_LINES[key] || own || null;
}
// "again" / "better" nói về ký ức lần trước nên câu lấy từ MEMORY_TEXT
const MEMORY_KEYS = ['again', 'better'];
const hasLines = (c, key) => MEMORY_KEYS.includes(key) ? !!c.mem
  : !!(segOf(c).lines?.[key] || VOICE_LINES.thang[key] || REVIEW_LINES[key]);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Chọn sự việc nổi bật nhất hợp với số sao, đôi khi ghép thêm một ý đối lập đã thực sự xảy ra.
function comment(c, stars, pcNo) {
  const ev = Object.entries(c.ev).filter(([k, d]) => d && hasLines(c, k));
  const bad = ev.filter(e => e[1] < 0).sort((a, b) => a[1] - b[1]);
  const good = ev.filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
  let main, other;
  if (stars <= 2) { main = bad[0]; other = good[0]; }
  else if (stars >= 4) { main = good[0]; other = bad[0]; }
  else if (bad[0] || good[0]) {
    [main, other] = !good[0] || (bad[0] && -bad[0][1] >= good[0][1]) ? [bad[0], good[0]] : [good[0], bad[0]];
  }
  const key = main ? main[0] : stars <= 2 ? 'bad' : stars >= 4 ? 'good' : 'meh';
  const vars = { game: GAMES[c.game].name, pc: pcNo || '', shop: S.shopName };
  const fill = line => line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  if (MEMORY_KEYS.includes(key)) return { key, text: MEMORY_TEXT[c.mem.key][key] };
  const severe = ['sick', 'rage', 'walkout', 'nogame'].includes(key);
  if (!severe && other && Math.abs(other[1]) >= 4 && CLAUSES[key] && CLAUSES[other[0]] && Math.random() < 0.6) {
    const turn = main[1] > 0 ? 'nhưng bù lại' : 'nhưng';
    return { key, text: `${cap(CLAUSES[other[0]])}, ${turn} ${CLAUSES[key]}.` };
  }
  const pool = linesFor(c, key) || REVIEW_LINES[stars <= 2 ? 'bad' : stars >= 4 ? 'good' : 'meh'];
  const recent = S.reviews.slice(0, 6).map(r => r.text);
  const fresh = pool.filter(l => !recent.includes(fill(l)));   // tránh lặp câu vừa viết
  return { key, text: fill(pick(fresh.length ? fresh : pool)) };
}

// Ý định quay lại tách khỏi giọng văn: khách nói nhẹ nhàng vẫn có thể không quay lại
const intentOf = sat => sat >= 75 ? { t: '🔁 Sẽ quay lại', cls: 'good' }
  : sat >= 50 ? { t: '🤔 Còn phân vân', cls: 'warn' } : { t: '🚪 Chắc không quay lại', cls: 'bad' };

// ---------- Khách quen ----------
const regById = id => S.regulars.find(r => r.id === id);
// Thiện cảm càng cao càng hay ghé; bị bỏ bê nhiều thì ghé ít dần rồi chuyển quán
const returnWeight = aff => aff < 30 ? 0.25 : aff < 60 ? 0.7 : 1.3;
const hearts = aff => '♥'.repeat(Math.round(aff / 20)) + '♡'.repeat(5 - Math.round(aff / 20));

// Cập nhật sổ khách quen sau một lượt ghé (khách mới thì mở trang mới).
// Trả về thông tin cho bảng cuối ngày: lần ghé thứ mấy, thiện cảm đổi bao nhiêu, có bỏ quán không.
function remember(c, sat, pcNo) {
  let rec = c.regId && regById(c.regId);
  const isNew = !rec;
  if (!rec) {
    rec = { id: S.nextRegId++, name: c.name, avatar: c.avatar, gender: c.gender, seg: c.seg, trait: c.trait, voice: c.voice,
      tier: c.tier, game: c.game, hours: c.hours, visits: 0, aff: 50, mem: null, favPc: null, seenDay: S.day };
    S.regulars.push(rec);
  }
  if (!rec.look) rec.look = c.look;
  const before = rec.aff;
  rec.aff = clamp(rec.aff + (sat - 60) / 3 + (c.affBonus || 0), 0, 100);   // affBonus: vd. được giấu khi mẹ tới tìm
  rec.visits++;
  rec.lastDay = S.day;
  if (!c.lost) {
    // nhớ chuyện tệ nhất nếu đủ nặng; không thì nhớ là lần trước vui (và có được sửa máy tử tế không)
    const worst = Object.entries(c.ev).filter(([k, d]) => MEM_GROUP[k] && d <= -8).sort((a, b) => a[1] - b[1])[0];
    rec.mem = worst ? { key: MEM_GROUP[worst[0]], good: false, day: S.day }
      : sat >= 70 ? { key: c.ev.fixed ? 'fixed' : 'good', good: true, day: S.day } : null;
    if (pcNo && sat >= 80 && !c.ev.lag && !c.ev.broken && !c.ev.rage) rec.favPc = pcNo - 1;
  }
  let gone = false;
  if (rec.aff < C.REG_LEAVE_AT) {
    gone = true;
    S.regulars.splice(S.regulars.indexOf(rec), 1);
    R.led.gone.push(rec.name);
  } else if (S.regulars.length > C.REG_MAX) {
    // sổ đầy: bỏ bớt người ít gắn bó nhất (không tính người vừa ghé)
    const others = S.regulars.filter(r => r !== rec);
    const drop = others.reduce((a, b) => (a.aff + a.visits * 4 <= b.aff + b.visits * 4 ? a : b));
    S.regulars.splice(S.regulars.indexOf(drop), 1);
  }
  if (isNew) R.led.newFaces++; else R.led.returning++;
  return { n: rec.visits, delta: rec.aff - before, isNew, gone };
}

// Chọn một khách quen quay lại (hoặc null = khách mới). w = trọng số hạng máy đang có.
function pickRegular(w) {
  const chance = Math.min(C.REG_CHANCE_MAX, 0.12 + 0.035 * S.regulars.length);
  if (Math.random() > chance) return null;
  const cands = S.regulars.filter(r => r.seenDay !== S.day && w[r.tier] > 0 && segWeight(r.seg, r.tier) > 0);
  return cands.length ? weighted(cands, r => segWeight(r.seg, r.tier) * returnWeight(r.aff)) : null;
}
// Biểu tượng tính cách chỉ hiện với khách quen (lần đầu phải nhận ra qua câu chào)
const knownIcon = c => c.regId ? traitOf(c).icon || '' : '';
const avatarHTML = c => c.avatar + (knownIcon(c) ? `<span class="trait-badge" title="${traitOf(c).name}">${knownIcon(c)}</span>` : '');
// ---------- Giới tính: tên, ảnh đại diện và dáng vẻ phải khớp nhau ----------
// Danh sách tên & ảnh theo tệp khách và giới tính ('m' nam, 'f' nữ); tệp không có riêng thì dùng danh sách chung
const namesOf = (s, g) => g === 'f' ? s.namesNu || CUSTOMER_NAMES_NU : s.names || CUSTOMER_NAMES;
const avatarsOf = (s, g) => g === 'f' ? s.avatarsNu || CUSTOMER_AVATARS_NU : s.avatars || CUSTOMER_AVATARS;
// Chọn giới tính theo tỉ lệ khách nữ của tệp (tệp nào không có tên nữ thì luôn là nam)
function pickGender(s) {
  if (s.names && !s.namesNu) return 'm';
  return Math.random() < (s.girlRate ?? 0.45) ? 'f' : 'm';
}
// Đoán giới tính từ tên — dùng cho khách quen trong bản lưu cũ (chưa có giới tính)
function genderOfName(name) {
  if (/^(Chị|Cô|Bà)\s/.test(name)) return 'f';
  if (/^(Anh|Chú|Ông|Cu)\s/.test(name)) return 'm';
  const female = [CUSTOMER_NAMES_NU, ...Object.values(SEGMENTS).map(s => s.namesNu || [])].flat();
  return female.includes(name) ? 'f' : 'm';
}
// Tên chưa ai trong sổ khách quen hay trong quán hôm nay dùng
// (hết tên riêng của tệp thì mượn tên chung cùng giới tính)
function freshName(list, g) {
  const used = new Set([...S.regulars.map(r => r.name), ...R.namesToday]);
  const free = list.filter(n => !used.has(n));
  if (free.length) return pick(free);
  const common = (g === 'f' ? CUSTOMER_NAMES_NU : CUSTOMER_NAMES).filter(n => !used.has(n));
  return common.length ? pick(common) : `${pick(list)} ${R.nextId}`;
}
// Lời chào ở cửa của khách quen: nhắc chuyện lần trước (để chủ quán biết mà tránh), hoặc xin máy quen
function regularGreet(c) {
  const shy = traitOf(c).shy ? 'Dạ… ' : '';
  if (c.mem && !c.mem.good) return shy + MEMORY_TEXT[c.mem.key].remind;
  if (c.favPc != null && c.favPc < R.pcs.length && Math.random() < 0.6) return shy + pick(FAVPC_GREETS)(c.favPc + 1);
  return shy + pick(REGULAR_GREETS);
}

// Khách rời quán: ghi vào sổ cuối ngày và có thể đăng review Google Maps.
function finishVisit(c, pcNo, forcedStars) {
  const stars = forcedStars || clamp(Math.round(c.sat / 20 + rand(-0.5, 0.5)), 1, 5);
  const { key, text } = comment(c, stars, pcNo);
  const seg = segOf(c), tr = traitOf(c);
  const visit = {
    name: c.name, avatar: c.avatar, seg: c.seg, trait: c.trait, stars, key, text,
    sat: forcedStars ? forcedStars * 20 - 10 : c.sat, ev: c.ev, causes: c.causes, lost: c.lost, posted: 0,
  };
  visit.reg = remember(c, visit.sat, pcNo);
  R.led.visits.push(visit);
  if (Math.random() > C.REVIEW_CHANCE[stars]) return null;
  const rv = {
    name: c.name, avatar: c.avatar, stars, day: S.day, time: clockText(R.time), text,
    who: c.seg === 'vanglai' ? '' : seg.name + (tr.name ? ' · ' + tr.name : ''),
    guide: Math.random() < 0.15 ? Math.round(rand(5, 180)) : 0,   // "Local Guide · N bài đánh giá"
  };
  visit.posted = stars;
  S.reviews.unshift(rv);
  if (S.reviews.length > C.REVIEW_KEEP) S.reviews.length = C.REVIEW_KEEP;
  S.starCounts[stars - 1]++;
  R.led.reviews.push(rv);
  log(`📍 ${c.name} đánh giá ${stars}★ trên Google Maps`);
  return rv;
}

function reviewHTML(rv) {
  const sub = rv.guide ? `Local Guide · ${rv.guide} bài đánh giá` : rv.who || '';
  return `<div class="review s${rv.stars}">
    <div class="rv-head"><span class="rv-av">${rv.avatar}</span>
      <div><b>${esc(rv.name)}</b>${sub ? `<div class="rv-guide">${esc(sub)}</div>` : ''}</div></div>
    <div class="rv-meta">${starsHTML(rv.stars)}<span class="muted small">Ngày ${rv.day} · ${rv.time}</span></div>
    <p class="rv-text">${esc(rv.text)}</p>
  </div>`;
}

function openAllReviews() {
  openModal({
    title: `📍 ${esc(S.shopName)} trên Google Maps`,
    body: `<div class="review-list">${S.reviews.map(reviewHTML).join('')}</div>`,
    cls: 'modal-reviews',
    actions: [{ label: 'Đóng', cls: 'primary', onClick: () => closeModal() }],
  });
}

// =====================================================================
//  BUỔI SÁNG: nhập hàng & nâng cấp
// =====================================================================
function allUpgrades() {
  const unlocks = Object.keys(ITEMS).filter(k => ITEMS[k].unlockCost).map(k => ({
    id: 'unlock:' + k, icon: ITEMS[k].icon, name: 'Thêm món: ' + ITEMS[k].name,
    desc: ITEMS[k].desc, cost: ITEMS[k].unlockCost, once: true,
  }));
  return [...UPGRADES, ...unlocks];
}
function upgradeState(u) {
  const owned = u.id.startsWith('unlock:') ? S.unlocked[u.id.slice(7)] : !!S.upgrades[u.id];
  if (owned) return { ok: false, owned: true, label: 'Đã có ✓' };
  if (u.needs && !S.upgrades[u.needs]) return { ok: false, label: 'Cần ' + UPGRADES.find(x => x.id === u.needs).name.toLowerCase() };
  return { ok: S.money >= u.cost, label: money(u.cost) };
}
function buyUpgrade(id) {
  const u = allUpgrades().find(x => x.id === id);
  if (!u || !upgradeState(u).ok) return;
  S.money -= u.cost;
  if (id.startsWith('unlock:')) S.unlocked[id.slice(7)] = true;
  else S.upgrades[id] = true;
  SFX.play('levelUp');
  VFX.burst(document.activeElement);   // pháo sao ngay nút vừa bấm mua
  saveGame();
  renderPrep();
}

// ---------- Dàn máy ----------
function buyMachine() {
  if (S.machines.length >= C.MAX_PCS || S.money < C.PC_COST) return;
  S.money -= C.PC_COST;
  S.machines.push(newMachine());
  SFX.play('coin');
  saveGame();
  renderPrep();
}
function buyPart(i, k) {
  const m = S.machines[i], lv = m[k];
  if (lv >= 3) return;
  const cost = PARTS[k].cost[lv + 1];
  if (S.money < cost) return;
  const tierBefore = machineTier(m);
  S.money -= cost;
  m[k]++;
  if (m.missing === k) m.missing = null;   // mua đồ mới cấp cao hơn thì khỏi mua lại đồ bị trộm
  saveGame();
  renderPrep();
  const t = machineTier(m);
  SFX.play(t > tierBefore ? 'levelUp' : 'coin');
  if (t > tierBefore) VFX.burst($('#modal-root .modal'));
  if (t > tierBefore) fx($('#modal-root .modal') || document.body, `${TIERS[t].icon} Lên ${TIERS[t].name}!`, 'good');
}

// ---------- Phím chuột: sửa tạm / thay mới · thanh lý máy ----------
const replaceCost = m => C.REPLACE_BASE + C.REPLACE_PER_LV * (m.kb + m.mouse);
function fixWear(i, full) {
  const m = S.machines[i];
  const cost = full ? replaceCost(m) : C.FIX_CHEAP;
  if (m.wear >= 100 || S.money < cost) return;
  S.money -= cost;
  m.wear = full ? 100 : Math.min(100, m.wear + C.FIX_CHEAP_GAIN);
  saveGame();
  renderPrep();
}
// Mua lại linh kiện bị trộm: giá đúng cấp đang có (đồ cấp thấp nhất thì giá cố định)
const restockCost = m => !m.missing ? 0
  : m[m.missing] ? PARTS[m.missing].cost[m[m.missing]] : C.THIEF_BASE_REPLACE[m.missing];
function restockPart(i) {
  const m = S.machines[i], cost = restockCost(m);
  if (!m.missing || S.money < cost) return;
  S.money -= cost;
  m.missing = null;
  SFX.play('coin');
  saveGame();
  renderPrep();
}
// tiền thu về khi bán máy: một phần tiền mua máy + linh kiện đã nâng
function sellValue(m) {
  const spent = C.PC_COST + Object.keys(PARTS).reduce((s, k) => s + PARTS[k].cost.slice(1, m[k] + 1).reduce((a, b) => a + b, 0), 0);
  return round1k(spent * C.SELL_RATIO);
}
function sellMachine(i) {
  if (S.machines.length <= 1) return;
  S.money += sellValue(S.machines[i]);
  S.machines.splice(i, 1);
  // máy quen của khách quen dịch theo số thứ tự mới
  for (const r of S.regulars) {
    if (r.favPc === i) r.favPc = null;
    else if (r.favPc > i) r.favPc--;
  }
  saveGame();
  renderPrep();
}
function askSellMachine(i) {
  const v = sellValue(S.machines[i]);
  openModal({
    title: `💸 Thanh lý Máy ${i + 1}?`,
    body: `<p>Bán cả máy lẫn linh kiện, thu về <b>${money(v)}</b> (${Math.round(C.SELL_RATIO * 100)}% tiền đã bỏ ra).</p>
      <p class="muted small">Quán bớt một máy thì cũng bớt ${money(C.RENT_PER_PC)} bảo trì mỗi ngày.</p>`,
    actions: [{ label: 'Thôi', cls: 'ghost', onClick: () => closeModal() },
      { label: `Bán · +${money(v)}`, cls: 'primary', onClick: () => { closeModal(); sellMachine(i); } }],
  });
}
const wearChip = m => m.wear <= 0 ? '<span class="chip bad">⌨️ Phím chuột hỏng</span>'
  : m.wear < C.WORN_AT ? `<span class="chip warn">⌨️ Bền ${m.wear}%</span>` : '';

const pipsHTML = lv => `<span class="pips">${[0, 1, 2, 3].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>`;

function renderMachines() {
  const cnt = [0, 0, 0, 0, 0];
  S.machines.forEach(m => cnt[machineTier(m)]++);
  $('#machine-summary').innerHTML = `<div class="machines">
    ${[1, 2, 3, 4].map(t => `<span class="chip t${t}">${TIERS[t].icon} ${TIERS[t].short}: <b>${cnt[t]}</b></span>`).join('')}
    <span class="muted small">${S.machines.length}/${C.MAX_PCS} máy</span></div>`;
  const full = S.machines.length >= C.MAX_PCS;
  $('#machine-list').innerHTML = S.machines.map((m, i) => {
    const t = machineTier(m);
    const parts = Object.keys(PARTS).map(k =>
      `<span class="pp" title="${PARTS[k].name}: ${PARTS[k].levels[m[k]]}">${PARTS[k].icon}<b>${m[k] + 1}</b></span>`).join('');
    const fix = m.wear >= 100 ? '' : `<div class="mc-fix">
        <span class="muted small">⌨️🖱️ Độ bền phím chuột <b>${m.wear}%</b></span>
        <button class="btn small ghost" data-fix="${i}" ${S.money < C.FIX_CHEAP ? 'disabled' : ''}>🔧 Sửa tạm · ${money(C.FIX_CHEAP)}</button>
        <button class="btn small ghost" data-replace="${i}" ${S.money < replaceCost(m) ? 'disabled' : ''}>🆕 Thay mới · ${money(replaceCost(m))}</button></div>`;
    return `<div class="mc-row" data-mc="${i}">
      <div class="si">${TIERS[t].icon}</div>
      <div><b>Máy ${i + 1}</b> <span class="chip t${t}">${TIERS[t].short}</span>
        <span class="muted small">${money(machineRate(m))}/giờ</span> ${wearChip(m)}
        <div class="mc-parts">${parts}</div>${fix}${m.missing ? `<div class="mc-fix">
          <span class="bad-text small">🦹 Bị trộm mất ${PARTS[m.missing].icon} ${PARTS[m.missing].levels[m[m.missing]]} — máy chưa dùng được</span>
          <button class="btn small primary" data-restock="${i}" ${S.money < restockCost(m) ? 'disabled' : ''}>🛒 Mua lại · ${money(restockCost(m))}</button></div>` : ''}</div>
      <button class="btn small" data-mc-open="${i}">Nâng cấp</button></div>`;
  }).join('') + `
    <div class="mc-buy"><button class="btn small ${!full && S.money >= C.PC_COST ? 'primary' : ''}" data-buy-pc
      ${full || S.money < C.PC_COST ? 'disabled' : ''}>${full ? 'Đã đủ máy' : `➕ Mua thêm máy · ${money(C.PC_COST)}`}</button>
      <span class="muted small">Máy mới là máy thường, đồ cơ bản. Bảo trì +${money(C.RENT_PER_PC)}/ngày.</span></div>`;
}

function machineBodyHTML(i) {
  const m = S.machines[i], t = machineTier(m), bonus = gearBonus(m);
  const row = k => {
    const p = PARTS[k], lv = m[k];
    const cost = lv < 3 ? p.cost[lv + 1] : 0;
    const btn = lv >= 3 ? '<span class="chip">Tối đa ✓</span>'
      : `<button class="btn small ${S.money >= cost ? 'primary' : ''}" data-part="${k}" ${S.money >= cost ? '' : 'disabled'}>
          Nâng · ${money(cost)}</button>`;
    return `<div class="part-row"><div class="si">${p.icon}</div>
      <div><b>${p.name}</b> ${pipsHTML(lv)}
        <div class="small">${p.levels[lv]}${lv < 3 ? ` <span class="muted">→ ${p.levels[lv + 1]}</span>` : ''}</div>
        ${p.bonus ? `<div class="muted small">+${money(p.bonus)}/giờ mỗi cấp, khách vui hơn</div>` : ''}</div>
      ${btn}</div>`;
  };
  const next = t < 4
    ? `<div class="note">⬆️ Nâng cả CPU và card lên cấp ${t + 1} (${PARTS.cpu.levels[t]} + ${PARTS.gpu.levels[t]})
        để thành <b>${TIERS[t + 1].icon} ${TIERS[t + 1].name}</b> — giá gốc ${money(TIERS[t + 1].rate)}/giờ.</div>`
    : `<div class="note">💎 Máy cấu hình cao nhất rồi! Streamer sẽ tìm tới.</div>`;
  return `
    <div class="mc-head">
      <span class="chip t${t}">${TIERS[t].icon} ${TIERS[t].name}</span>
      <span>Giá <b>${money(machineRate(m))}/giờ</b>
        <span class="muted small">= ${money(TIERS[t].rate)} giá gốc${bonus ? ` + ${money(bonus)} đồ xịn` : ''}</span></span>
      <span class="muted small mc-money">Tiền: <b>${money(S.money)}</b></span>
    </div>
    ${machinePreview(i)}
    ${next}
    <h4 class="part-h">⚙️ Cấu hình — quyết định hạng máy</h4>
    ${partsOf(p => p.core).map(row).join('')}
    <h4 class="part-h">🎮 Đồ chơi game & bàn ghế — tăng giá giờ, khách vui hơn</h4>
    ${partsOf(p => !p.core).map(row).join('')}
    <div class="mc-sell">${S.machines.length > 1
      ? `<button class="btn small ghost danger" data-sell>💸 Thanh lý máy này · +${money(sellValue(m))}</button>`
      : '<span class="muted small">Quán còn một máy, không thanh lý được.</span>'}</div>`;
}

// Minh họa hạng kế tiếp; bản sao này không được lưu vào S.
function machinePreview(i) {
  const m = S.machines[i], after = { ...m }, t = machineTier(m);
  if (t < 4) { after.cpu = Math.max(after.cpu,t); after.gpu = Math.max(after.gpu,t); }
  const picture = (machine, label) => '<figure>'+ART.previewSVG(machine,i,machine===m?'pr-before-':'pr-after-')+'<figcaption>'+label+'</figcaption></figure>';
  return '<div class="pr-preview">'+picture(m,'Máy hiện tại')+picture(after,t<4?'Sau khi nâng CPU + card lên hạng kế':'Đã đạt hạng cao nhất')+'</div>';
}
function renderMorning() {
  const lines = Object.keys(ITEMS).filter(k => S.unlocked[k]).map(k => ({name:ITEMS[k].name,price:money(ITEMS[k].price)}));
  const rates = Object.values(TIERS).map(t => t.short+' '+money(t.rate)).join(' · ')+' /giờ';
  $('#prep-scene').innerHTML = ART.morningSVG(S.shopName,lines,rates,GAMES[S.hot].name);
}
function openMachine(i) {
  const body = el('div', 'machine-edit');
  const m = openModal({
    title: `🛠️ Nâng cấp Máy ${i + 1}`, body, cls: 'modal-machine',
    actions: [{ label: 'Xong', cls: 'primary', onClick: () => closeModal() }],
  });
  const render = () => { body.innerHTML = machineBodyHTML(i); };
  body.addEventListener('click', e => {
    if (e.target.closest('[data-sell]')) return askSellMachine(i);
    const b = e.target.closest('[data-part]');
    if (!b || b.disabled) return;
    buyPart(i, b.dataset.part);
    render();
  });
  render();
  return m;
}
function buyStock(k, near) {
  const it = ITEMS[k];
  const cost = near ? nearCost(k) : it.packCost;
  if (!S.unlocked[k] || S.money < cost) return;
  S.money -= cost;
  addStock(k, it.pack, near ? nearShelf(k) : it.shelf);
  saveGame();
  renderPrep();
}
function trashExpired(k) {
  if (!removeExpired(k)) return;
  saveGame();
  renderPrep();
}

function showPrep() {
  R = null;
  renderPrep();
  showScreen('prep');
}

function renderMaps() {
  const total = S.starCounts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...S.starCounts);
  const bars = [5, 4, 3, 2, 1].map(s => `<div class="mb-row"><span>${s}</span>
    <div class="mb-bar"><i style="width:${S.starCounts[s - 1] / maxCount * 100}%"></i></div></div>`).join('');
  const latest = S.reviews.slice(0, 2);
  $('#maps').innerHTML = `
    <div class="maps-score">
      <b>${S.rating.toFixed(1)}</b>
      ${starsHTML(Math.round(S.rating))}
      <span class="muted small">${total ? total + ' đánh giá' : 'Chưa có đánh giá'}</span>
    </div>
    <div class="maps-bars">${bars}</div>
    <div class="maps-reviews">
      ${latest.length ? latest.map(reviewHTML).join('')
        : '<p class="hint">Chưa ai đánh giá quán. Mở cửa đón vị khách đầu tiên thôi!</p>'}
      ${S.reviews.length > latest.length ? `<button class="btn ghost small" id="btn-all-reviews">Xem ${S.reviews.length} đánh giá gần đây</button>` : ''}
    </div>`;
}

function renderGames() {
  // game nặng chỉ có khách chơi khi quán có máy đủ mạnh
  const tiers = S.machines.map(machineTier);
  const hasTier = t => tiers.some(x => x >= t);
  const hot = GAMES[S.hot];
  $('#games-hot').innerHTML = `🔥 Hôm nay đang hot: <b>${gameIcon(S.hot)}</b>` +
    (S.installed[S.hot] ? ' — quán có sẵn, khách sẽ kéo tới!' : ` — quán <b class="warn-text">chưa cài</b>, mua ngay kẻo mất khách (${money(hot.cost)}).`);
  const ids = Object.keys(GAMES).sort((a, b) => GAMES[a].minTier - GAMES[b].minTier);
  $('#game-list').innerHTML = ids.map(id => {
    const g = GAMES[id], own = !!S.installed[id], T = TIERS[g.minTier];
    const asked = S.lastAsked[id];
    const notes = [];
    notes.push(`${Math.round(gameShare(id) * 100)}% khách ${T.phrase} tìm game này`);
    if (!own && asked) notes.push(`<span class="warn-text">hôm qua ${asked} khách hỏi mà không có</span>`);
    if (!hasTier(g.minTier)) notes.push(`<span class="warn-text">cần ${T.phrase} trở lên mới có khách chơi</span>`);
    const btn = own
      ? `<span class="chip">${g.cost ? 'Đã cài ✓' : 'Miễn phí ✓'}</span>`
      : `<button class="btn small ${S.money >= g.cost ? 'primary' : ''}" data-game="${id}" ${S.money >= g.cost ? '' : 'disabled'}>Mua ${money(g.cost)}</button>`;
    return `<div class="game-row ${own ? 'own' : ''}"><div class="si">${g.icon}</div>
      <div><b>${g.name}</b> <span class="chip t${g.minTier}">${T.icon} ${T.short}</span>${S.hot === id ? ' <span class="chip hot">🔥 HOT</span>' : ''}
        ${!own && g.desc ? `<div class="muted small">${g.desc}</div>` : ''}
        <div class="muted small">${notes.join(' · ')}</div></div>
      ${btn}</div>`;
  }).join('');
}

function renderRegulars() {
  const list = [...S.regulars].sort((a, b) => b.aff - a.aff || b.visits - a.visits);
  if (!list.length) {
    $('#regulars').innerHTML = '<p class="muted small">Chưa có ai. Khách ghé một lần là quán sẽ nhớ mặt.</p>';
    return;
  }
  const memText = r => !r.mem ? ''
    : r.mem.good ? (r.mem.key === 'fixed' ? '🙂 Nhớ lần trước máy treo được sửa ngay' : '🙂 Lần trước chơi vui')
    : `⚠️ Còn nhớ: “${MEMORY_TEXT[r.mem.key].remind}”`;
  $('#regulars').innerHTML = `<div class="reg-list">${list.map(r => {
    const tr = TRAITS[r.trait], seg = SEGMENTS[r.seg];
    const who = [r.seg !== 'vanglai' ? seg.name : '', tr.name ? `${tr.icon} ${tr.name}` : ''].filter(Boolean).join(' · ');
    return `<div class="reg-row ${r.aff < 30 ? 'cold' : ''}">
      <span class="reg-av">${r.avatar}</span>
      <div class="reg-main">
        <div><b>${esc(r.name)}</b> <span class="reg-hearts" title="Thiện cảm ${Math.round(r.aff)}/100">${hearts(r.aff)}</span></div>
        <div class="muted small">${esc(who || 'Khách thường')} · ${r.visits} lần ghé${r.favPc != null ? ` · ❤️ Máy ${r.favPc + 1}` : ''}</div>
        ${memText(r) ? `<div class="small reg-mem ${r.mem.good ? 'good' : 'bad'}">${esc(memText(r))}</div>` : ''}
      </div></div>`;
  }).join('')}</div>`;
}

const staffName = id => `Bạn ${id}`;
const staffById = id => S.staff.find(p => p.id === id);
const staffMistakeChance = p => clamp(0.06 - (p.wage - C.STAFF_WAGE_DEFAULT) / 1000000, 0.01, 0.12) * (p.trained ? 0.35 : 1);
function renderStaff() {
  const max = Math.ceil(S.machines.length / C.STAFF_PCS);
  const wage = S.staff.reduce((sum, p) => sum + p.wage, 0);
  $('#prep-staff').innerHTML = `<div class="staff-box">
    <p><b>${S.staff.length}/${max} nhân viên</b> · sức phục vụ ${S.staff.length * C.STAFF_PCS} máy · lương ${money(wage)}/ngày</p>
    <p class="muted small">Một người phụ trách tối đa 3 máy đang có khách. Không có nhân viên trống, bạn vẫn tự nhận đơn và mang món như trước.</p>
    ${S.staff.map(p => `<div class="staff-row" data-staff="${p.id}">
      <div><b>🧑‍🍳 ${staffName(p.id)}</b> ${p.trained ? '<span class="chip">Đã training</span>' : ''}
        <div class="muted small">Lỗi ghi đơn khoảng ${Math.round(staffMistakeChance(p) * 100)}%</div></div>
      <label>Lương/ngày <input type="number" data-wage="${p.id}" min="${C.STAFF_WAGE_MIN}" max="${C.STAFF_WAGE_MAX}" step="5000" value="${p.wage}"></label>
      <div class="staff-actions"><button class="btn small" data-train="${p.id}" ${p.trained || S.money < C.STAFF_TRAIN_COST ? 'disabled' : ''}>Training · ${money(C.STAFF_TRAIN_COST)}</button>
        <button class="btn small ghost" data-fire="${p.id}">Cho nghỉ</button></div>
    </div>`).join('')}
    <button class="btn small primary" data-hire ${S.staff.length >= max ? 'disabled' : ''}>+ Tuyển nhân viên · lương mặc định ${money(C.STAFF_WAGE_DEFAULT)}/ngày</button>
  </div>`;
}
function hireStaff() {
  if (S.staff.length >= Math.ceil(S.machines.length / C.STAFF_PCS)) return;
  S.staff.push({ id: S.nextStaffId++, wage: C.STAFF_WAGE_DEFAULT, trained: false });
  saveGame(); renderPrep();
}
function setStaffWage(id, value) {
  const p = staffById(id);
  if (!p) return;
  p.wage = clamp(Math.round(Number(value) / 5000) * 5000 || C.STAFF_WAGE_DEFAULT, C.STAFF_WAGE_MIN, C.STAFF_WAGE_MAX);
  saveGame(); renderPrep();
}
function trainStaff(id) {
  const p = staffById(id);
  if (!p || p.trained || S.money < C.STAFF_TRAIN_COST) return;
  S.money -= C.STAFF_TRAIN_COST;
  p.trained = true;
  saveGame(); renderPrep();
}
function fireStaff(id) {
  S.staff = S.staff.filter(p => p.id !== id);
  saveGame(); renderPrep();
}
function askFireStaff(id) {
  const p = staffById(id);
  if (!p) return;
  openModal({ title: `Cho ${staffName(id)} nghỉ?`, body: `<p>Nhân viên này sẽ rời quán. Tiền training đã chi sẽ không lấy lại được.</p>`,
    actions: [
      { label: 'Giữ lại', cls: 'ghost', onClick: closeModal },
      { label: 'Cho nghỉ', cls: 'danger', onClick: () => { closeModal(); fireStaff(id); } },
    ] });
}
function renderPrep() {
  renderMorning();
  renderShopName();
  renderMaps();
  renderRegulars();
  renderGames();
  renderStaff();
  $('#prep-day').textContent = dayText();
  $('#prep-money').textContent = money(S.money);
  $('#prep-money').classList.toggle('neg', S.money < 0);
  $('#prep-rating').textContent = S.rating.toFixed(1) + '★';

  $('#stock-list').innerHTML = Object.keys(ITEMS).map(k => {
    const it = ITEMS[k];
    if (!S.unlocked[k]) {
      return `<div class="stock-row locked"><div class="si">${ART.itemSVG(k)}</div>
        <div><b>${it.name}</b><div class="muted small">🔒 Mở khóa trong phần nâng cấp</div></div><div></div></div>`;
    }
    const chips = S.inv[k].map(b => {
      const past = daysPast(b);
      if (past > 0) return `<span class="chip expired">☠️ ${b.qty} cái · hết date ${past} ngày</span>`;
      const left = 1 - past;
      const cls = left <= 1 ? 'bad' : left <= 2 ? 'warn' : '';
      return `<span class="chip ${cls}">${b.qty} cái · ${left <= 1 ? 'hết hạn sau hôm nay' : 'còn ' + left + ' ngày'}</span>`;
    }).join('');
    const exp = expiredCount(k), nc = nearCost(k);
    return `<div class="stock-row ${exp ? 'has-expired' : ''}"><div class="si">${ART.itemSVG(k)}</div>
      <div><b>${it.name}</b> <span class="muted small">bán ${money(it.price)} · hạn ${it.shelf} ngày</span>
        <div class="chips">${chips || '<span class="chip bad">Hết hàng</span>'}</div></div>
      <div class="stock-btns">
        <button class="btn small" data-buy="${k}" ${S.money < it.packCost ? 'disabled' : ''}>+${it.pack} · ${money(it.packCost)}</button>
        <button class="btn small ghost near" data-near="${k}" ${S.money < nc ? 'disabled' : ''}
          title="Hàng cận date: rẻ một nửa nhưng chỉ còn ${nearShelf(k)} ngày">🏷️ Cận date ${money(nc)} · ${nearShelf(k)} ngày</button>
        ${exp ? `<button class="btn small ghost danger" data-trash="${k}">🗑️ Bỏ ${exp} hết date</button>` : ''}
      </div>
    </div>`;
  }).join('');

  renderMachines();

  $('#upgrade-list').innerHTML = allUpgrades().map(u => {
    const st = upgradeState(u);
    return `<div class="up-row ${st.owned ? 'owned' : ''}"><div class="si">${u.icon}</div>
      <div><b>${u.name}</b><div class="muted small">${u.desc}</div></div>
      <button class="btn small ${st.ok ? 'primary' : ''}" data-up="${u.id}" ${st.ok ? '' : 'disabled'}>${st.label}</button></div>`;
  }).join('');

  const empty = Object.keys(ITEMS).filter(k => S.unlocked[k] && invCount(k) === 0).map(k => ITEMS[k].name);
  const expTotal = Object.keys(ITEMS).reduce((s, k) => s + expiredCount(k), 0);
  $('#prep-costs').innerHTML = todayHTML() +
    (empty.length ? `<p class="warn-text">⚠️ Đang hết: ${empty.join(', ')} — khách gọi sẽ không có mà bán!</p>` : '') +
    (expTotal ? `<p class="bad-text">☠️ Kho còn ${expTotal} món hết date — sẽ bị dùng trước. Khách có thể đau bụng, công an kiểm tra là bị phạt!</p>` : '') +
    (S.pendingPolice || S.pendingKid ? `<p class="bad-text">👮 Hôm qua có người báo công an — sáng nay công an sẽ tới kiểm tra!</p>` : '') +
    billHTML() + netPlansHTML() + loansHTML();
}

// ---------- Hóa đơn buổi sáng: thời tiết, lịch cúp điện, hóa đơn tuần, vay vốn ----------
function todayHTML() {
  const f = S.forecast, hot = f + 1 >= C.HOT_TEMP;
  const weather = `🌡️ Hôm nay trời <b>${f}°C</b> lúc trưa. ` + (!hot ? 'Mát mẻ, có thể tắt điều hòa cho đỡ tiền điện.'
    : S.upgrades.ac ? 'Nóng đấy — nhớ bật ❄️ điều hòa khi quán đông.'
    : '<span class="warn-text">Nóng đấy — quán chưa có điều hòa, máy dễ treo và khách mau bực.</span>');
  const o = S.outageNext;
  const outage = !o ? '' : `<p class="warn-text">⚡ Lịch cúp điện hôm nay: <b>${clockText(o.from)}–${clockText(o.to)}</b>. ` +
    (S.upgrades.gen ? 'Nhớ bấm 🛢️ nổ máy phát khi cúp.' : S.upgrades.ups ? 'Có UPS nên khách kịp lưu game, nhưng máy vẫn tắt.'
      : 'Chưa có UPS hay máy phát: cúp điện là khách mất trận và phải ngồi chờ.') + '</p>';
  return `<div class="bill-today"><p>${weather}</p>${calendarHTML()}${outage}</div>`;
}
// Lịch hôm nay: cuối tuần, tuần thi sắp tới / đang thi / vừa thi xong
function calendarHTML() {
  const notes = [];
  if (isWeekend()) notes.push(`🎉 Hôm nay <b>${WEEKDAYS[weekday()]}</b> — khách đông hơn, học sinh tới từ sáng.`);
  if (isExamDay()) {
    const left = 7 - examPhase(S.day);
    notes.push(`<span class="warn-text">📚 Tuần thi: học sinh ít ghé quán (còn ${left} ngày, kể cả hôm nay).</span>`);
  } else if (isAfterExam()) notes.push('🎉 Thi xong rồi! Học sinh đổ về quán, nhớ nhập đủ mì và nước ngọt.');
  else if (daysToExam()) notes.push(`📅 Còn ${daysToExam()} ngày nữa học sinh thi học kỳ — tuần đó quán sẽ vắng học sinh.`);
  return notes.map(n => `<p>${n}</p>`).join('');
}
const dueTotal = () => S.dueBill ? S.dueBill.base + S.dueBill.fee : 0;
function billHTML() {
  const b = S.bill, d = S.dueBill;
  const today = rentCost() + netPlan().daily;
  const left = C.BILL_DAYS - b.days;
  let h = `<div class="bill-box"><h4>🧾 Hóa đơn tuần</h4>
    <p class="small">Mặt bằng, tiền mạng, tiền điện được <b>cộng dồn</b>, ${left <= 1 ? '<b>tối nay</b> chốt' : `chốt sau <b>${left} ngày</b>`}.
      Đang cộng dồn: <b>${money(b.rent + b.net + b.power)}</b>.</p>
    <p class="muted small">Hôm nay cộng thêm ${money(today)} (mặt bằng ${money(rentCost())}${netPlan().daily ? ` + mạng ${money(netPlan().daily)}` : ''}) + tiền điện theo giờ máy chạy và điều hòa.</p>`;
  if (d) {
    const late = S.day - d.dueDay;
    const ok = S.money >= dueTotal();
    h += `<div class="due ${late > 0 ? 'late' : ''}">
      <div><b>Cần trả: ${money(dueTotal())}</b>${d.fee ? ` <span class="bad-text">(gồm ${money(d.fee)} phạt trễ)</span>` : ''}
        <div class="small">${late > 0 ? `<span class="bad-text">Đã trễ hạn ${late} ngày! Mỗi ngày trễ phạt thêm ${Math.round(C.LATE_FEE * 100)}%.</span>`
          : late === 0 ? '<span class="warn-text">Hạn chót là hôm nay.</span>' : `Hạn chót: hết ngày ${d.dueDay}.`}
          ${S.netCut ? ' <span class="bad-text">📵 Đang bị cắt mạng.</span>' : ''}</div></div>
      <button class="btn small ${ok ? 'primary' : ''}" data-pay-bill ${ok ? '' : 'disabled'}>${ok ? 'Trả ngay' : 'Chưa đủ tiền'}</button></div>`;
  }
  return h + '</div>';
}
function payBill() {
  const total = dueTotal();
  if (!total || S.money < total) return;
  S.money -= total;
  S.dueBill = null;
  S.netCut = false;
  saveGame();
  renderPrep();
}
// Đủ tiền thì game tự trả hóa đơn (không cần bấm "Trả ngay"); thiếu tiền thì vẫn để nợ như cũ.
function autoPayBill(news) {
  const total = dueTotal();
  if (!total || S.money < total) return;
  S.money -= total;
  S.dueBill = null;
  if (S.netCut) news.push(['note', '📶 Đã trả nợ cước, nhà mạng nối mạng lại.']);
  S.netCut = false;
  news.push(['note', `✅ Đã tự trả hóa đơn tuần <b>${money(total)}</b>.`]);
}

// Vay vốn: ngân hàng lãi thấp có hạn mức; vay nóng lãi cao, ai cũng vay được, lâu không trả có người tới đòi
const bankLimit = () => round1k((C.BANK_BASE + C.BANK_PER_PC * S.machines.length) * S.rating / 3);
function canBorrow(kind, amt) {
  if (kind === 'bank') {
    if (S.dueBill && S.day > S.dueBill.dueDay) return false;   // đang trễ hóa đơn thì ngân hàng không cho vay
    return S.loans.bank + amt <= bankLimit();
  }
  return S.loans.shark + amt <= C.SHARK_MAX;
}
function borrow(kind, amt) {
  if (!canBorrow(kind, amt)) return;
  S.loans[kind] += amt;
  S.money += amt;
  saveGame();
  renderPrep();
}
function repay(kind, amt) {
  const pay = Math.min(amt || S.loans[kind], S.loans[kind], Math.max(0, S.money));
  if (pay <= 0) return;
  S.loans[kind] -= pay;
  S.money -= pay;
  if (!S.loans.shark) S.sharkDays = 0;
  saveGame();
  renderPrep();
}
function loansHTML() {
  const L = S.loans;
  const btn = (attr, kind, amt, label, ok) => `<button class="btn small ${attr === 'repay' ? '' : 'ghost'}" data-${attr}="${kind}" data-amt="${amt}" ${ok ? '' : 'disabled'}>${label}</button>`;
  const row = (kind, icon, name, rate, note) => {
    const bal = L[kind];
    const amts = [100000, 300000];
    return `<div class="loan-row"><div><b>${icon} ${name}</b> · lãi ${(rate * 100).toFixed(1).replace('.0', '')}%/ngày
        <div class="muted small">${bal ? `Đang nợ <b>${money(bal)}</b>` : 'Chưa nợ'} · ${note}</div></div>
      <div class="loan-btns">${amts.map(a => btn('borrow', kind, a, `Vay ${money(a)}`, canBorrow(kind, a))).join('')}
        ${bal ? btn('repay', kind, 0, `Trả ${money(Math.min(bal, Math.max(0, S.money)))}`, S.money > 0) : ''}</div></div>`;
  };
  const late = S.dueBill && S.day > S.dueBill.dueDay;
  return `<div class="loans"><h4>🏦 Vay vốn</h4>
    ${row('bank', '🏦', 'Ngân hàng', C.BANK_RATE, late ? '<span class="bad-text">đang trễ hóa đơn, ngân hàng không cho vay</span>'
      : `hạn mức ${money(bankLimit())} (theo số máy và đánh giá)`)}
    ${row('shark', '💀', 'Vay nóng', C.SHARK_RATE, S.sharkDays > C.SHARK_DUE_DAYS ? '<span class="bad-text">quá hạn, người đòi nợ ghé quán mỗi ngày!</span>'
      : `tối đa ${money(C.SHARK_MAX)}, nợ quá ${C.SHARK_DUE_DAYS} ngày sẽ có người tới đòi`)}
    <p class="muted small">Lãi cộng vào số nợ mỗi tối. Trả bớt lúc nào cũng được.</p></div>`;
}

// Gói mạng: gói đang dùng + nút đổi sang gói khác (đổi gói nhỏ hơn không tốn tiền lắp)
function netPlansHTML() {
  const cur = netPlan();
  const items = NET_PLANS.map(p => {
    if (p.id === cur.id) return `<div class="net-plan cur"><span>${p.icon} <b>${p.name}</b> · ${p.cap} máy</span><span class="chip">Đang dùng</span></div>`;
    const fee = p.cap > cur.cap ? p.cost : 0;
    const ok = S.money >= fee;
    return `<div class="net-plan"><span>${p.icon} <b>${p.name}</b> · ${p.cap} máy · ${p.daily ? money(p.daily) + '/ngày' : 'không tốn tiền mạng'}</span>
      <button class="btn small ${ok ? 'primary' : ''}" data-net="${p.id}" ${ok ? '' : 'disabled'}>${fee ? 'Lắp · ' + money(fee) : 'Đổi gói'}</button></div>`;
  }).join('');
  return `<div class="net-plans"><div class="muted small">📶 Mạng gánh được <b>${cur.cap} máy</b> chạy cùng lúc${cur.daily ? `, trả thêm <b>${money(cur.daily)}</b>/ngày` : ''}. Quá tải thì khách bị giật lag.</div>${items}</div>`;
}
function changeNet(id) {
  const p = NET_PLANS.find(x => x.id === id);
  if (!p || id === S.net) return;
  const fee = p.cap > netPlan().cap ? p.cost : 0;
  if (S.money < fee) return;
  S.money -= fee;
  S.net = id;
  saveGame();
  renderPrep();
}

// =====================================================================
//  TRONG NGÀY
// =====================================================================
function startDay() {
  R = {
    time: C.OPEN_HOUR, paused: false, over: false,
    spawnIn: 1.5, queue: [], selected: null, pick: null, nextId: 1,
    pcs: S.machines.map((m, i) => ({ i, m, tier: machineTier(m), cust: null, dirty: false, cleaningBy: null, cleanIn: 0,
      broken: false, repair: 0, brokeFor: 0, breakLoss: 0, el: null, bubbleKey: '' })),
    led: { pingHours: 0, hours: 0, food: 0, tips: 0, power: 0, staff: 0, staffMistakes: 0, served: 0, walkouts: 0, satSum: 0, ratingBefore: S.rating, reviews: [], lost: {}, fine: 0, sick: 0, visits: [],
      returning: 0, newFaces: 0, gone: [],
      acPower: 0, fuel: 0, refund: 0, hotHours: 0, darkHours: 0, smashes: 0, outages: 0, noise: 0, kicked: 0, mom: [], thefts: [], caught: 0, thiefCash: 0 },
    // hạ tầng: nhiệt độ phòng, điều hòa, lịch cúp điện hôm nay, máy phát
    temp: outsideTemp(C.OPEN_HOUR) + 1, hot: false, acOn: S.acOn, running: 0,
    outage: S.outageNext || surpriseOutage(), wasOut: false, genOn: false, darkT: 0,
    segCount: {},   // số khách mỗi tệp đã tới hôm nay
    namesToday: new Set(),
    // tin báo từ hôm qua → công an tới sớm; không thì thỉnh thoảng kiểm tra bất chợt
    // kidReports = tin phụ huynh báo quán cho học sinh chơi khuya (mẹ gank bị lộ)
    reports: S.pendingPolice, kidReports: S.pendingKid,
    policeAt: S.pendingPolice || S.pendingKid ? C.OPEN_HOUR + rand(0.3, 1.2)
      : Math.random() < C.POLICE_RANDOM ? rand(C.OPEN_HOUR + 1, C.LAST_ENTRY_HOUR - 1) : null,
    momAt: null, momKid: 0, momCount: 0,   // mẹ gank: giờ phụ huynh tới, tìm khách nào, số lần hôm nay
    // trộm: giờ kẻ trộm tới hôm nay (camera làm trộm ngại ghé) · escape = kẻ trộm đang chạy ra cửa
    thiefAt: S.day >= C.THIEF_FROM_DAY && Math.random() < C.THIEF_DAY_CHANCE * (S.upgrades.camera ? 0.5 : 1)
      ? rand(C.OPEN_HOUR + 1, C.LAST_ENTRY_HOUR - 2) : null,
    escape: null,
  };
  S.pendingPolice = 0;
  S.pendingKid = 0;
  $('#log').innerHTML = '';
  renderShopName();
  setPause(false);
  buildFloor();
  renderQueue();
  showScreen('play');
  SFX.play('open');
  SFX.setMood('busy');
  VFX.shutter('up');
  log('☀️ Quán mở cửa!');
  if (S.staff.length) log(`🧑‍🍳 ${S.staff.length} nhân viên vào ca, phụ trách tối đa ${S.staff.length * C.STAFF_PCS} máy`);
  if (!S.seenTutorial) {
    S.seenTutorial = true;
    saveGame();
    openHowTo();
  }
}

// ---------- Cúp điện, nhiệt độ, điều hòa, máy phát ----------
// Lịch cúp điện ngày mai (báo trước trên bảng tổng kết và tab Hóa đơn)
function planOutage() {
  if (S.day < C.OUTAGE_FROM_DAY || Math.random() >= C.OUTAGE_PLANNED) return null;
  const len = Math.round(rand(...C.OUTAGE_LEN) * 2) / 2;
  const from = Math.round(rand(C.OPEN_HOUR + 1, C.LAST_ENTRY_HOUR - len) * 2) / 2;
  return { from, to: from + len, planned: true };
}
// Cúp điện bất ngờ trong ngày (không báo trước)
function surpriseOutage() {
  if (S.day < C.SURPRISE_FROM_DAY || Math.random() >= C.OUTAGE_SURPRISE) return null;
  const from = rand(C.OPEN_HOUR + 1.5, C.LAST_ENTRY_HOUR - 1);
  return { from, to: from + rand(...C.SURPRISE_LEN), planned: false };
}
function onOutage() {
  R.darkT = 0;
  R.led.outages++;
  SFX.play('powerDown');
  VFX.flicker();
  log(R.outage.planned ? '⚡ Cúp điện theo lịch!' : '⚡ Cúp điện bất ngờ!');
  for (const pc of R.pcs) {
    const c = pc.cust;
    if (!c) continue;
    c.darkFor = 0;
    if (S.upgrades.ups) { note(c, 'upssave', 2, 'Cúp điện nhưng kịp lưu game nhờ UPS'); fx(pc.el.root, '🔋 Kịp lưu game', 'good'); }
    else { hit(c, 'outage', C.OUTAGE_HIT, 'pc', 'Cúp điện, mất luôn trận đang chơi'); fx(pc.el.root, 'Mất trận rồi! 😫', 'bad'); }
  }
}
function onPowerBack() {
  R.genOn = false;
  SFX.play('powerUp');
  VFX.flicker();
  log('💡 Có điện lại rồi!');
}
function toggleGen() {
  if (!S.upgrades.gen || !gridOut()) return;
  R.genOn = !R.genOn;
  log(R.genOn ? '🛢️ Nổ máy phát điện — máy chạy lại, tốn xăng' : '🛢️ Tắt máy phát');
}
function toggleAc() {
  if (!S.upgrades.ac) return;
  R.acOn = S.acOn = !R.acOn;
  log(R.acOn ? '❄️ Bật điều hòa' : '❄️ Tắt điều hòa cho đỡ tiền điện');
}
// Mỗi khung hình: điện có hay không, nhiệt độ phòng, tiền điện điều hòa, tiền xăng
function updateInfra(dt, gh) {
  const out = gridOut();
  if (out && !R.wasOut) onOutage();
  if (!out && R.wasOut) onPowerBack();
  R.wasOut = out;
  const on = powered();
  R.running = on ? R.pcs.filter(pc => pc.cust && !pc.cust.awaitingLoad && !pc.broken).length : 0;
  let target = outsideTemp(R.time) + C.HEAT_PER_PC * R.running;
  if (acRunning()) target = Math.min(target, C.AC_TEMP + C.AC_LOAD_PER_PC * R.running);
  const step = C.TEMP_SPEED * gh;
  R.temp += clamp(target - R.temp, -step, step);
  R.hot = R.temp >= C.HOT_TEMP;
  if (R.hot) R.led.hotHours += gh;
  if (acRunning() && !out) R.led.acPower += C.AC_POWER * (S.upgrades.inverter ? 1 - C.INVERTER_SAVE : 1) * gh;
  if (out && R.genOn) R.led.fuel += (C.GEN_FUEL_BASE + C.GEN_FUEL_PER_PC * R.running + (acRunning() ? C.GEN_FUEL_AC : 0)) * gh;
  if (!on) { R.darkT += dt; R.led.darkHours += gh; }
}

// ---------- Khách đập phím khi thua ----------
const smashRate = c => C.SMASH_PER_HOUR * (SMASH_MUL[c.seg] ?? 1) * (c.trait === 'voi' ? 1.5 : 1) * (c.sat < 50 ? 1.5 : 1);
function wornHit(c, pc) { hit(c, 'worn', C.WORN_HIT, 'pc', `Phím chuột máy ${pc.i + 1} liệt nút`); }
function smash(pc, c) {
  const m = pc.m;
  if (m.wear <= 0) return;
  const tough = 1 - 0.15 * (m.kb + m.mouse) / 2;   // phím chuột xịn bền hơn
  m.wear = Math.max(0, Math.round(m.wear - rand(...C.SMASH_DMG) * tough));
  R.led.smashes++;
  SFX.play('smash');
  VFX.shake();
  VFX.burst(pc.el.root, 'hit');
  fx(pc.el.root, '💢 Thua trận, đập phím!', 'bad');
  log(`💢 ${c.name} đập phím máy ${pc.i + 1}${m.wear <= 0 ? ' — phím chuột liệt luôn!' : ''}`);
  if (m.wear <= 0) wornHit(c, pc);
  if (canNoise(c) && Math.random() < C.NOISE_ON_LOSE) startNoise(pc);
}

// ---------- Khách ồn ào ----------
// Khách tính cách 📢 thỉnh thoảng hát hò, la hét: khách ngồi cùng hàng máy (3 máy một hàng) khó chịu dần.
// Bấm vào máy có 📢 để nhắc nhở hoặc mời về; có nhân viên thì nhân viên tự đi nhắc.
const NOISE_ACTS = ['hát karaoke ầm ĩ', 'la hét gọi đồng đội', 'đập bàn hò hét', 'mở loa ngoài nghe nhạc'];
const canNoise = c => !!traitOf(c).noisy && !c.noisy && S.day >= C.NOISE_FROM_DAY;
const neighbors = pc => R.pcs.filter(p => p !== pc && Math.floor(p.i / 3) === Math.floor(pc.i / 3));
const hushChance = c => Math.min(0.95, (c.trait === 'voi' || c.voice === 'thang' ? C.NOISE_CALM_HARD : C.NOISE_CALM_CHANCE)
  + C.NOISE_CALM_RETRY * (c.hushTries || 0));
function startNoise(pc) {
  const c = pc.cust;
  c.noisy = true;
  c.loud = 1;
  c.noiseFor = 0;
  c.staffTried = false;
  c.noiseAct = pick(NOISE_ACTS);
  R.led.noise++;
  fx(pc.el.root, '📢 ' + pick(['Lên nhạc!', 'Hú hú hú!', 'Gánh team điii!', 'La la la ~']), 'bad');
  log(`📢 ${c.name} (máy ${pc.i + 1}) ${c.noiseAct} — bấm vào máy để nhắc`);
}
function updateNoise(dt) {
  if (!powered()) return;
  const quiet = S.upgrades.headphone ? C.NOISE_HEADPHONE : 1;
  for (const pc of R.pcs) {
    const c = pc.cust;
    if (!c || !c.noisy) continue;
    c.noiseFor += dt;
    for (const nb of neighbors(pc)) {
      const n = nb.cust;
      if (!n || n.noisy || n.awaitingLoad || n.remaining <= 0 || (n.noiseLoss || 0) >= C.NOISE_MAX_LOSS) continue;
      const d = Math.min(n.sat, C.NOISE_MAX_LOSS - (n.noiseLoss || 0),
        C.NOISE_SAT_DRAIN * dt * c.loud * quiet * careOf(n, 'quiet', -1));
      n.sat -= d;
      n.noiseLoss = (n.noiseLoss || 0) + d;
      n.ev.noise = (n.ev.noise || 0) - d;
      if (!n.noiseNoted) {
        n.noiseNoted = true;
        cause(n, `Máy bên cạnh ${c.noiseAct}`);
        if (repeatsMemory(n, 'noise')) markAgain(n);
      }
    }
    // nhân viên tự đi nhắc (mỗi đợt ồn một lần; nhắc không được thì chủ quán phải ra mặt)
    if (S.staff.length && !c.staffTried && c.noiseFor >= C.NOISE_STAFF_DELAY) {
      c.staffTried = true;
      hushNoisy(pc, S.staff[0]);
    }
  }
}
function hushNoisy(pc, worker) {
  const c = pc.cust;
  if (!c || !c.noisy) return;
  const who = worker ? staffName(worker.id) : 'Chủ quán';
  if (Math.random() < hushChance(c)) {
    c.noisy = false;
    c.hushTries = 0;
    fx(pc.el.root, '🤫 Dạ, em nhỏ tiếng lại…', 'good');
    log(`🤫 ${who} nhắc ${c.name}, khách đã nhỏ tiếng`);
    for (const nb of neighbors(pc)) {
      const n = nb.cust;
      if (n && n.noiseNoted && !n.ev.hushed) hit(n, 'hushed', 4, null, 'Có khách ồn, quán ra nhắc ngay');
    }
  } else {
    c.hushTries = (c.hushTries || 0) + 1;
    c.loud = C.NOISE_LOUDER;
    hit(c, 'scolded', -10, null, 'Bị nhắc nhở giữa lúc đang vui');
    fx(pc.el.root, '😤 Kệ tui!', 'bad');
    log(`😤 ${c.name} cãi lại ${who.toLowerCase()}, còn ồn hơn — nhắc lần nữa dễ nghe hơn`);
  }
}
function kickNoisy(pc) {
  const c = pc.cust;
  if (!c) return;
  const refund = round500(Math.max(0, c.remaining) * payRate(pc, c));
  S.money -= refund;
  R.led.refund += refund;
  R.led.kicked++;
  log(`🚪 Mời ${c.name} về vì làm ồn${refund ? `, trả lại ${money(refund)} tiền giờ` : ''}`);
  for (const nb of neighbors(pc)) {
    const n = nb.cust;
    if (n && n.noiseNoted && !n.ev.hushed) hit(n, 'hushed', 5, null, 'Chủ quán dẹp ồn nhanh');
  }
  leave(pc, 'kicked');
}
function openNoise(pc) {
  const c = pc.cust;
  const refund = round500(Math.max(0, c.remaining) * payRate(pc, c));
  const near = neighbors(pc).filter(p => p.cust && !p.cust.awaitingLoad).length;
  openModal({
    title: `📢 ${c.name} đang làm ồn`,
    body: `<p>${c.avatar} <b>${c.name}</b> ở máy ${pc.i + 1} đang ${c.noiseAct}.
        ${near ? `${near} khách ngồi cạnh bắt đầu khó chịu.` : 'Hàng máy này chưa có ai khác, nhưng ai vào ngồi cạnh sẽ khó chịu.'}</p>
      <p class="muted small">🤫 Nhắc nhở: khoảng ${Math.round(hushChance(c) * 100)}% khách chịu nhỏ tiếng, không được thì khách cãi lại và còn ồn hơn.<br>
        🚪 Mời về: dẹp ồn ngay nhưng phải trả lại ${money(refund)} tiền giờ chưa chơi, khách này sẽ chấm sao thấp.</p>`,
    actions: [
      { label: 'Để sau', onClick: () => closeModal() },
      { label: '🚪 Mời về', cls: 'danger', onClick: () => { closeModal(); if (pc.cust === c) kickNoisy(pc); } },
      { label: '🤫 Nhắc nhở', cls: 'primary', onClick: () => { closeModal(); if (pc.cust === c) hushNoisy(pc, null); } },
    ],
  });
}

// ---------- Mẹ gank ----------
// Học sinh đang chơi có thể bị phụ huynh tới tìm (bất cứ giờ nào trong ngày). Chủ quán chọn giấu giùm hay chỉ chỗ.
const MOM_LINES = [
  n => `${n} nhà cô có ở đây không? Nó bảo cô đi học thêm!`,
  n => `Cháu ơi, ${n} có chơi ở đây không? Cả nhà đi tìm nãy giờ!`,
  n => `${n} đâu rồi! Cô biết thừa nó trốn ra đây mà!`,
  n => `Cho cô hỏi, ${n} có đây không? Mai nó thi mà giờ này chưa về.`,
  n => `${n}! Ra đây ngay cho mẹ!`,
];
const isKid = c => !!SEGMENTS[c.seg].kid;
const kidName = c => c.name.replace(/ lớp \d+$/, '').replace(/^(Bé|Thằng) /, '');
// phụ huynh có thể tới bất cứ lúc nào trong ngày (xác suất như nhau mọi giờ), tuần thi canh kỹ hơn
const momRate = () => C.MOM_RATE * (isExamDay() ? C.MOM_EXAM_MUL : 1);
const kidsPlaying = () => R.pcs.filter(p => p.cust && isKid(p.cust) && !p.cust.awaitingLoad && p.cust.remaining > 0);
// Lên lịch phụ huynh tới (giống công an: tới giờ thì đợi chủ quán làm xong việc đang dở)
function updateMom(gh) {
  if (R.momAt != null || S.day < C.MOM_FROM_DAY || R.momCount >= C.MOM_MAX_PER_DAY || !powered()) return;
  for (const pc of kidsPlaying()) {
    const c = pc.cust;
    if (c.momDone || Math.random() >= momRate() * gh) continue;
    c.momDone = true;
    R.momCount++;
    R.momKid = c.id;
    R.momAt = R.time + rand(0.15, 0.4);
    log(`📱 Máy ${pc.i + 1}: điện thoại của ${c.name} rung liên tục… "Mẹ" gọi nhỡ 5 cuộc`);
    return;
  }
}
function momArrives() {
  R.momAt = null;
  const pc = R.pcs.find(p => p.cust && p.cust.id === R.momKid);
  if (!pc) { log('👩 Có cô tới tìm con, nhưng bé về nhà rồi. Hú hồn!'); return; }
  const c = pc.cust;
  stopHold();
  SFX.play('door');
  SFX.play('warn');
  const others = kidsPlaying().filter(p => p !== pc).length;
  const chance = Math.max(0.1, C.MOM_HIDE_CHANCE - C.MOM_HIDE_PER_KID * others);
  const late = R.time >= C.MOM_REPORT_FROM;
  const wasPaused = R.paused;
  setPause(true);
  openModal({
    title: '👩 Có cô tìm con!',
    body: `<p><b><i>“${pick(MOM_LINES)(kidName(c))}”</i></b></p>
      <p>${c.avatar} <b>${c.name}</b> đang chơi ở máy ${pc.i + 1}${c.regId ? ' — khách quen của quán' : ''}.</p>
      <p class="muted small">🙈 Giấu giùm: khoảng ${Math.round(chance * 100)}% không bị lộ${others ? ` (trong quán còn ${others} học sinh khác, dễ lộ hơn)` : ''}. Lộ thì quán mất uy tín${late ? ', và vì đã khuya nên phụ huynh có thể báo công an' : ''}.<br>
        🙋 Chỉ chỗ: bé phải về ngay và giận quán, nhưng phụ huynh tin quán đàng hoàng.</p>`,
    dismissable: false,
    actions: [
      { label: '🙋 Chỉ chỗ', onClick: () => { closeModal(); momTake(pc, c, 'pointed'); } },
      { label: '🙈 Giấu giùm', cls: 'primary', onClick: () => { closeModal(); momHide(pc, c, chance); } },
    ],
    onClose: () => { if (R && !R.over && !wasPaused) setPause(false); },
  });
}
function momHide(pc, c, chance) {
  if (pc.cust !== c) return;
  if (Math.random() >= chance) return momTake(pc, c, 'caught');
  hit(c, 'momhid', 15, null, 'Mẹ tới tìm, chủ quán giấu giùm');
  c.affBonus = (c.affBonus || 0) + C.MOM_HIDE_AFF;
  R.led.mom.push({ name: c.name, choice: 'hide', ok: true });
  fx(pc.el.root, '🙈 Thoát rồi!', 'good');
  log(`🙈 Giấu ${c.name} thành công — cô đi tìm chỗ khác`);
}
// Phụ huynh kéo con về: 'pointed' = chủ quán chỉ chỗ · 'caught' = giấu mà bị lộ
function momTake(pc, c, how) {
  if (pc.cust !== c) return;
  R.led.mom.push({ name: c.name, choice: how === 'pointed' ? 'point' : 'hide', ok: false });
  if (how === 'pointed') {
    hit(c, 'mompointed', -45, null, 'Mẹ tới tìm, chủ quán chỉ chỗ luôn');
    updateRating(100, 1);    // phụ huynh thấy quán đàng hoàng (bù phần nào việc bé giận chấm sao thấp)
    log(`🙋 Chỉ chỗ ${c.name} — cô cảm ơn rồi xách tai bé về`);
  } else {
    note(c, 'momcaught', -5, 'Chủ quán giấu giùm nhưng vẫn bị mẹ phát hiện');
    updateRating(0, 1.5);    // phụ huynh bực vì quán bao che
    log(`😱 Lộ rồi! Cô tìm ra ${c.name} sau cánh tủ, mắng cả chủ quán`);
    if (R.time >= C.MOM_REPORT_FROM && Math.random() < C.MOM_REPORT_CHANCE) {
      R.kidReports++;
      if (R.policeAt == null) R.policeAt = R.time + rand(0.3, 0.8);
      log('📞 Cô gọi báo công an phường: quán cho học sinh chơi khuya!');
    }
  }
  leave(pc, 'mom');
  // các bạn học sinh khác thấy cảnh đó: có bạn hoảng, chơi nốt chút rồi về
  for (const p of kidsPlaying()) {
    if (Math.random() >= C.MOM_PANIC) continue;
    p.cust.remaining = Math.min(p.cust.remaining, 5 / 60);
    note(p.cust, 'panic', -3, 'Thấy bạn bị mẹ bắt về, hoảng quá về sớm');
    fx(p.el.root, '😱 Chết, về thôi!', 'bad');
  }
}

// ---------- Trộm linh kiện ----------
// Kẻ trộm vào như khách lạ (nạp ít giờ, nói lấp lửng, ngồi một lúc thì lộ 👀), rồi gỡ một món của máy mình và
// chạy ra cửa. Có vài giây để bấm vào máy đó bắt lại; anh công an đang chơi hoặc nhân viên có thể tóm giùm.
const partName = k => PARTS[k].name.toLowerCase();
function steal(pc) {
  const c = pc.cust;
  const parts = Object.keys(C.THIEF_PARTS).filter(k => !(S.upgrades.cablelock && (k === 'mouse' || k === 'kb')));
  const part = weighted(parts, k => C.THIEF_PARTS[k]);
  if (modal && modal.pc === pc) closeModal();
  c.order = null;
  c.stole = part;
  pc.cust = null;
  pc.broken = false;
  pc.repair = 0;
  pc.dirty = true;
  pc.m.missing = part;
  // anh công an đang chơi trong quán hoặc nhân viên tóm luôn tại chỗ
  const cop = R.pcs.find(p => p.cust && p.cust.seg === 'congan' && !p.cust.awaitingLoad);
  if (cop) { log(`👮 ${cop.cust.name} đứng bật dậy tóm gọn ${c.name} ngay cửa!`); return caughtThief(pc, c, cop.cust.name); }
  if (S.staff.length && Math.random() < C.THIEF_STAFF_CATCH) {
    log(`🧑‍🍳 ${staffName(S.staff[0].id)} chặn cửa, tóm được ${c.name}!`);
    return caughtThief(pc, c, staffName(S.staff[0].id));
  }
  R.escape = { pc, c, part, left: C.THIEF_CATCH_SEC + (S.upgrades.camera ? C.THIEF_CAM_SEC : 0) };
  pc.alarm = true;
  SFX.play('warn');
  fx(pc.el.root, `⚠️ Mất ${partName(part)}! Bấm bắt trộm!`, 'bad');
  log(`🦹 ${c.name} gỡ ${partName(part)} máy ${pc.i + 1} rồi chạy ra cửa — bấm máy ${pc.i + 1} để bắt!`);
}
// Đếm ngược thời gian bắt; hết giờ là kẻ trộm chạy mất
function updateEscape(dt) {
  const e = R.escape;
  if (!e) return;
  e.left -= dt;
  if (e.left > 0) return;
  R.escape = null;
  e.pc.alarm = false;
  R.led.thefts.push({ pc: e.pc.i + 1, part: e.part });
  SFX.play('bad');
  log(`💨 ${e.c.name} chạy mất cùng ${partName(e.part)} máy ${e.pc.i + 1}. Sáng mai mua lại ở tab Nâng máy.`);
}
function catchThief() {
  const e = R.escape;
  R.escape = null;
  e.pc.alarm = false;
  log(`🙌 Chủ quán đuổi kịp, tóm được ${e.c.name}!`);
  caughtThief(e.pc, e.c, null);
}
// Bắt được: lấy lại đồ, rồi chọn giao công an / tha / bắt đền
function caughtThief(pc, c, by) {
  pc.m.missing = null;
  R.led.caught++;
  SFX.play('good');
  fx(pc.el.root, '🙌 Bắt được rồi!', 'good');
  const wasPaused = R.paused;
  setPause(true);
  const done = () => {
    if (c.relapse) S.regulars = S.regulars.filter(r => r.id !== c.regId);   // tha rồi còn tái phạm: gạch tên
    closeModal();
  };
  const actions = [
    { label: `💬 Bắt đền ${money(C.THIEF_FINE)}`, onClick: () => {
      S.money += C.THIEF_FINE; R.led.thiefCash += C.THIEF_FINE;
      log(`💬 ${c.name} xin lỗi rối rít, đền ${money(C.THIEF_FINE)} rồi đi`);
      done();
    } },
    { label: '👮 Giao công an', cls: 'primary', onClick: () => {
      S.money += C.THIEF_REWARD; R.led.thiefCash += C.THIEF_REWARD;
      updateRating(95, 0.6);
      log(`👮 Giao ${c.name} cho công an phường, được thưởng ${money(C.THIEF_REWARD)}`);
      done();
    } },
  ];
  if (!c.relapse) actions.unshift({ label: '🤝 Tha cho đi', onClick: () => {
    // vào sổ khách quen, hứa không tái phạm (nhưng vẫn có thể…)
    S.regulars.push({ id: S.nextRegId++, name: c.name, avatar: c.avatar, seg: c.seg, trait: c.trait, voice: c.voice,
      tier: c.tier, game: c.game, hours: c.hours, visits: 1, aff: 75, mem: null, favPc: null, seenDay: S.day, lastDay: S.day,
      look: c.look, gender: c.gender, reformed: true });
    log(`🤝 Tha cho ${c.name} — người đó cảm ơn rối rít, hứa sẽ quay lại làm khách đàng hoàng`);
    done();
  } });
  openModal({
    title: '🦹 Bắt được kẻ trộm!',
    body: `<p>${by ? `<b>${by}</b> đã tóm` : 'Bạn đã tóm'} được <b>${c.name}</b> đang ôm ${PARTS[c.stole].icon} ${partName(c.stole)} của máy ${pc.i + 1}. Đồ đã lấy lại.</p>
      ${c.relapse ? '<p class="bad-text">Lại là người lần trước được tha! Lần này không tha nữa.</p>' : ''}
      <p class="muted small">👮 Giao công an: được thưởng ${money(C.THIEF_REWARD)}, quán được tiếng an ninh.<br>
        ${c.relapse ? '' : '🤝 Tha: thêm một khách quen, nhưng thỉnh thoảng có thể tái phạm.<br>'}
        💬 Bắt đền: thu ${money(C.THIEF_FINE)} tại chỗ cho xong chuyện.</p>`,
    dismissable: false, actions,
    onClose: () => { if (R && !R.over && !wasPaused) setPause(false); },
  });
}

function setPause(p) {
  if (!R) return;
  R.paused = p;
  $('#screen-play').classList.toggle('paused', p);
  $('#btn-pause').textContent = p ? '▶' : '⏸';
  SFX.duck(p);
}

// ---------- Khách ----------
function nextSpawnDelay() {
  const t = R.time;
  const curve = t < 11 ? 0.75 : t < 13.5 ? 1.1 : t < 17 ? 0.9 : 1.25;   // trưa có dân văn phòng, tối đông nhất
  const demand = (0.55 + S.rating * 0.15) * curve * (isWeekend() ? C.WEEKEND_DEMAND : 1);
  const mean = C.SPAWN_BASE / (R.pcs.length * demand);
  return mean * rand(0.5, 1.5);
}

// thief = true: kẻ trộm đã lên lịch hôm nay (luôn là khách lạ, vào máy thấp nhất)
function spawnCustomer(thief = false) {
  // khách máy xịn chỉ tới khi quán có máy loại đó; càng nhiều máy loại đó càng đông
  const n = [0, 0, 0, 0, 0];
  R.pcs.forEach(p => n[p.tier]++);
  const w = [0,
    n[1] ? 1 : 0.15,
    n[2] ? Math.min(0.9, 0.25 + 0.12 * n[2]) : 0,
    n[3] ? Math.min(0.7, 0.2 + 0.1 * n[3]) : 0,
    n[4] ? Math.min(0.5, 0.12 + 0.08 * n[4]) : 0];
  // khách quen giữ nguyên danh tính, tính cách, giọng nói và thói quen (máy, game, số giờ)
  const rec = thief ? null : pickRegular(w);
  let tier, segId, trait, voice, name, avatar, gender, game, hours;
  if (rec) {
    ({ tier, seg: segId, trait, voice, name, avatar, gender } = rec);
    rec.seenDay = S.day;
    game = rec.game && Math.random() < 0.75 ? rec.game : pickGame(tier, SEGMENTS[segId].games);
    hours = rec.hours && Math.random() < 0.7 ? rec.hours : null;
  } else {
    tier = thief ? [1, 2, 3, 4].find(t => n[t]) || 1 : weighted([1, 2, 3, 4], t => w[t]);
    segId = thief ? 'vanglai' : pickSegment(tier);
    const s = SEGMENTS[segId];
    trait = thief ? 'thuong' : weighted(Object.keys(TRAITS), k => TRAITS[k].weight * (s.traits?.[k] ?? 1));
    // giọng nói cố định của khách: nghiêng theo tệp khách / tính cách, còn lại ngẫu nhiên
    voice = s.voice && Math.random() < 0.6 ? s.voice
      : TRAITS[trait].voice && Math.random() < 0.5 ? TRAITS[trait].voice : pick(VOICES);
    gender = pickGender(s);   // chọn giới tính trước để tên, ảnh và dáng vẻ khớp nhau
    name = freshName(namesOf(s, gender), gender);
    avatar = pick(avatarsOf(s, gender));
    game = pickGame(tier, s.games);
  }
  const seg = SEGMENTS[segId], tr = TRAITS[trait];
  R.segCount[segId] = (R.segCount[segId] || 0) + 1;
  R.namesToday.add(name);
  hours = hours || (seg.hours ? pick(seg.hours) : tier === 4 ? pick([2, 2.5, 3, 4])
    : S.day < 3 ? pick([1, 2, 2, 3]) : pick([1, 1.5, 2, 2, 2.5, 3, 4]));
  if (thief) {   // nạp ít giờ, game gì cũng được (không bao giờ hỏi game quán chưa có)
    hours = pick([0.5, 1]);
    if (!S.installed[game]) game = Object.keys(GAMES).find(k => S.installed[k] && GAMES[k].minTier <= tier) || game;
  }
  const lost = !S.installed[game];   // quán chưa cài game khách muốn → khách hỏi rồi đi
  const P = lost ? C.LOST_LINGER : C.QUEUE_PATIENCE * patienceMul() * (tr.patience || 1);
  const c = {
    id: R.nextId++, name, avatar, gender,
    seg: segId, trait, voice,
    tier, hours, patience: P, patienceMax: P, sat: 100,
    game, lost, atCounter: false,
    loaded: 0, remaining: 0, order: null, ordered: false, ate: false,
    ev: {}, causes: [],   // sổ sự việc trong lúc ở quán — dùng để viết nhận xét
    // khách quen: đã biết tính cách (hiện biểu tượng), nhớ chuyện lần trước và máy quen
    regId: rec ? rec.id : 0, visitNo: rec ? rec.visits + 1 : 1,
    mem: rec?.mem ? { ...rec.mem } : null, favPc: rec ? rec.favPc : null,
    look: rec?.look || ART.makeLook(segId, gender),   // dáng vẻ chibi trong cảnh; khách quen giữ nguyên
    asked: !tr.shy,   // khách rụt rè chưa nói yêu cầu cho tới khi được hỏi (bấm chọn ở cửa)
  };
  // kẻ trộm: tên trộm hôm nay, hoặc khách từng được tha mà tái phạm. Ngồi một lúc thì lộ 👀 (có camera thì lộ ngay)
  if (thief || (rec?.reformed && Math.random() < C.THIEF_RELAPSE)) {
    c.thief = true;
    c.relapse = !thief;
    c.playT = 0;
    c.stealAfter = hours * rand(0.3, 0.6);
    c.shifty = !!S.upgrades.camera;
  }
  const g = GAMES[game].name;
  // khách lạ lộ tính cách qua câu chào; khách quen nhắc chuyện lần trước hoặc xin máy quen
  c.greet = lost ? '' : rec ? regularGreet(c) : tr.greet ? pick(tr.greet) : '';
  const request = lost ? pick(LOST_LINES)(g)
    : thief ? pick(THIEF_LINES)(TIERS[tier].phrase, hoursText(hours))
    : tier === 4 ? pick(STREAM_LINES)(hoursText(hours), g)
    : pick(seg.requests || CUSTOMER_LINES)(TIERS[tier].phrase, hoursText(hours), g);
  c.line = c.greet ? `${c.greet} ${request}` : request;
  R.queue.push(c);
  SFX.play('door');
  renderQueue();
  log(lost ? `🤔 ${c.name} hỏi quán có ${g} không`
    : rec ? `🔁 ${c.avatar} ${c.name} quay lại quán (lần ${c.visitNo})` : `${c.avatar} ${c.name} vừa vào quán`);
}

function weighted(keys, weightOf) {
  let r = Math.random() * keys.reduce((s, k) => s + weightOf(k), 0);
  for (const k of keys) { r -= weightOf(k); if (r < 0) return k; }
  return keys[0];
}
// Trọng số tệp khách theo giờ hiện tại: lấy khung giờ khớp có trọng số cao nhất, ngoài khung dùng `base`.
// Cuối tuần cộng thêm khung `weekend`; học sinh (`kid`) vắng vào tuần thi, đổ về ngày thi xong.
function segWeight(id, tier) {
  const s = SEGMENTS[id];
  if (!s.tiers.includes(tier)) return 0;
  if (s.maxPerDay && (R.segCount[id] || 0) >= s.maxPerDay) return 0;
  const wins = [...(s.when || []), ...(isWeekend() ? s.weekend || [] : [])];
  const inWin = wins.filter(([a, b]) => R.time >= a && R.time < b).map(x => x[2]);
  const w = inWin.length ? Math.max(...inWin) : s.base;
  return s.kid ? w * kidMul() : w;
}
function pickSegment(tier) {
  const ids = Object.keys(SEGMENTS).filter(id => segWeight(id, tier) > 0);
  return ids.length ? weighted(ids, id => segWeight(id, tier)) : 'vanglai';
}

// Khách tìm game quán chưa có: không trừ nhiều điểm nhưng mất khách
function leaveLost(c) {
  R.queue.splice(R.queue.indexOf(c), 1);
  R.led.lost[c.game] = (R.led.lost[c.game] || 0) + 1;
  updateRating(45, 0.3);
  log(`😕 ${c.name} đi tìm quán khác có ${GAMES[c.game].name}`);
  note(c, 'nogame', -30, `Quán chưa cài ${GAMES[c.game].name}`);
  finishVisit(c, 0, pick([2, 3, 3]));
  renderQueue();
}

function walkout(c) {
  R.queue.splice(R.queue.indexOf(c), 1);
  if (R.selected === c) R.selected = null;
  R.led.walkouts++;
  updateRating(0, 0.7);
  log(`😤 ${c.name} chờ lâu quá nên bỏ đi`);
  note(c, 'walkout', -80, 'Chờ hết kiên nhẫn ở cửa rồi bỏ đi');
  finishVisit(c, 0, pick([1, 1, 2]));
  renderQueue();
}

function updateRating(sat, weight) {
  S.rating = clamp(S.rating + (sat / 20 - S.rating) * 0.06 * weight, 1, 5);
}

// ---------- Nạp giờ (xếp khách vào máy) ----------
// Mặt chibi của khách (dùng ở quầy nạp giờ và bếp)
const faceSVG = (c, mood = 'smile') =>
  `<svg class="face" viewBox="-42 -54 84 90" aria-hidden="true"><circle cy="-4" r="40" fill="#F6EBD4"/>${ART.headSVG(c.look, mood)}${c.look.headset ? ART.headsetSVG(c.look) : ''}</svg>`;

// Máy nên gợi ý cho khách: trống, sạch, đủ hạng mà không dư nhiều nhất
function bestPc(c) {
  const free = R.pcs.filter(p => !p.cust && !p.m.missing);
  const score = p => (p.tier >= c.tier ? 0 : 100 * (c.tier - p.tier)) + (p.dirty ? 30 : 0) + (p.tier - c.tier) * 3
    + (c.favPc === p.i ? -20 : 0);
  return free.sort((a, b) => score(a) - score(b))[0] || null;
}
function availableStaff() {
  return S.staff.find(p => R.pcs.filter(pc => pc.cust && pc.cust.staffId === p.id).length < C.STAFF_PCS) || null;
}

// Nhân viên tự chọn máy đúng hạng, sạch và hoạt động tốt. Máy khác hạng cần chủ quán duyệt.
function staffChoice(c) {
  const free = R.pcs.filter(p => !p.cust && !p.dirty && !p.cleaningBy && !p.broken && p.m.wear > 0 && !p.m.missing);
  const exact = free.filter(p => p.tier === c.tier).sort((a, b) => (b.i === c.favPc) - (a.i === c.favPc))[0];
  if (exact) return { pc: exact, approved: true };
  // Có máy đúng hạng nhưng bàn bẩn: lau trước, đừng tự đề nghị một máy sai nhu cầu.
  if (R.pcs.some(p => !p.cust && p.tier === c.tier && p.dirty && p.m.wear > 0 && !p.m.missing)) return null;
  const other = free.sort((a, b) => {
    const score = p => (p.tier < c.tier ? 100 : 0) + Math.abs(p.tier - c.tier) * 10 - (p.i === c.favPc ? 2 : 0);
    return score(a) - score(b);
  })[0];
  return other ? { pc: other, approved: false } : null;
}
function guideCustomer(pc, c, worker) {
  if (!worker || pc.cust || !R.queue.includes(c)) return false;
  R.queue.splice(R.queue.indexOf(c), 1);
  c.asked = true;
  c.staffProposal = null;
  c.staffId = worker.id;
  c.awaitingLoad = true;
  c.loadPatienceMax = C.STAFF_LOAD_PATIENCE * (traitOf(c).patience || 1);
  c.loadPatience = c.loadPatienceMax;
  pc.cust = c;
  if (R.selected === c) R.selected = null;
  PlayScene.guide(pc.i, c);
  log(`🧑‍🍳 ${staffName(worker.id)} dẫn ${c.name} vào máy ${pc.i + 1} · chờ bạn nạp giờ`);
  renderQueue();
  return true;
}
function approveStaffSeat(c, pc) {
  const worker = availableStaff();
  if (!worker || !pc || pc.cust || pc.dirty || pc.broken || pc.m.wear <= 0 || pc.m.missing || !R.queue.includes(c)) return false;
  return guideCustomer(pc, c, worker);
}
function updateStaff(dt) {
  if (!S.staff.length || R.over) return;
  for (const pc of R.pcs) {
    if (!pc.cleaningBy) continue;
    pc.cleanIn -= dt;
    if (pc.cleanIn > 0) continue;
    pc.cleaningBy = null;
    pc.cleanIn = 0;
    pc.dirty = false;
    fx(pc.el.root, '🧹 Nhân viên lau xong', 'good');
    VFX.burst(pc.el.root, 'sparkle');
    log(`🧹 Nhân viên lau sạch máy ${pc.i + 1}`);
  }
  for (const pc of R.pcs) {
    if (!pc.dirty || pc.cust || pc.cleaningBy) continue;
    const worker = S.staff.find(p => !R.pcs.some(x => x.cleaningBy === p.id));
    if (!worker) break;
    pc.cleaningBy = worker.id;
    pc.cleanIn = C.STAFF_CLEAN_SECONDS;
    PlayScene.clean?.(pc.i);
  }
  if (!powered()) return;
  for (const c of [...R.queue]) {
    if (c.lost || c.atCounter) continue;
    const worker = availableStaff();
    if (!worker) break;
    const choice = staffChoice(c);
    const proposal = choice && !choice.approved ? choice.pc.i : null;
    if (choice) c.asked = true;
    if (c.staffProposal !== proposal) { c.staffProposal = proposal; c.staffProposalPrompted = false; renderQueue(); }
    if (choice?.approved) guideCustomer(choice.pc, c, worker);
  }
}

// ---------- Nạp giờ (xếp khách vào máy) ----------
// Quầy nạp giờ ở nửa dưới màn: chọn máy trong danh sách (hoặc bấm máy trong cảnh), giữ nút để nạp.
function openCheckin(pc, c) {
  const guided = !!(c.awaitingLoad && pc && pc.cust === c);
  c.atCounter = true;
  R.selected = c;
  const st = { v: 0 };
  pc = guided ? pc : pc && !pc.cust ? pc : bestPc(c);
  const body = el('div', 'checkin');
  body.innerHTML = `
    <div class="talk">${faceSVG(c)}
      <div class="speech"><small>${esc(c.name)}${c.regId ? ` · 🔁 lần ${c.visitNo}` : ''}</small>“${esc(c.line)}”</div></div>
    <div class="chips want">
      <span class="chip t${c.tier}">${TIERS[c.tier].icon} ${TIERS[c.tier].name}</span>
      <span class="chip">⏱️ ${hoursText(c.hours)}</span><span class="chip">${gameIcon(c.game)}${c.game === S.hot ? ' 🔥' : ''}</span>
      ${c.favPc != null && c.favPc < R.pcs.length ? `<span class="chip">❤️ Máy ${c.favPc + 1}</span>` : ''}
    </div>
    <p class="hint">${guided ? `🧑‍🍳 Nhân viên đã dẫn khách vào máy ${pc.i + 1}. Bạn chỉ cần nạp giờ.`
      : 'Bạn tự nạp giờ và chọn máy cho khách này.'}</p>
    <div class="picker"></div>
    <div class="assign"></div>`;
  const foot = el('div', 'checkin-foot');
  foot.innerHTML = `
    <div class="fill-wrap"></div>
    <div class="readout">Đã nạp <b class="ro-val">0:00</b> <span class="muted">/ khách cần ${durText(c.hours)}</span></div>
    <button class="btn hold">⏱️ Giữ để nạp giờ</button>`;
  const ticks = [];
  for (let h = 1; h <= C.MAX_LOAD_HOURS; h++) ticks.push({ v: h, label: h + 'h' });
  const fill = buildFill({
    max: C.MAX_LOAD_HOURS, zone: [c.hours - C.HOUR_PERFECT, c.hours + C.HOUR_PERFECT],
    mark: c.hours, ticks, cls: 'fill-hours',
  });
  foot.querySelector('.fill-wrap').appendChild(fill.root);
  const holdBtn = foot.querySelector('.hold');
  bindHold(holdBtn, st, 'v', C.HOUR_FILL_RATE, C.MAX_LOAD_HOURS);
  const pickerEl = body.querySelector('.picker'), assignEl = body.querySelector('.assign');

  const m = openModal({
    title: guided ? `⏱️ Nạp giờ · Máy ${pc.i + 1}` : '🧾 Quầy nạp giờ', body, foot, cls: 'modal-checkin', dock: true,
    actions: [
      { label: 'Để sau', cls: 'ghost', onClick: () => closeModal() },
      { label: 'Xếp máy ✓', cls: 'primary', id: 'btn-confirm-hours', onClick: () => {
        if (st.v <= 0.05 || !pc || (pc.cust && !(guided && pc.cust === c))) return;
        const p = pc;
        closeModal();
        seat(p, c, st.v);
      } },
    ],
    onClose: () => { c.atCounter = false; if (R.selected === c) R.selected = null; R.pick = null; renderQueue(); },
  });
  m.holdBtn = holdBtn;
  m.checkin = c;
  const ro = foot.querySelector('.ro-val');
  const confirm = m.card.querySelector('#btn-confirm-hours');

  let pickKey = '';
  function renderPicker() {
    if (guided) {
      if (pickKey === 'guided') return;
      pickKey = 'guided';
      pickerEl.innerHTML = `<div class="assign-line">🧑‍🍳 Máy ${pc.i + 1} đã được nhân viên ${pc.tier === c.tier ? 'chọn đúng nhu cầu' : 'dẫn khách vào theo ý bạn'}.</div>`;
      assignEl.innerHTML = `<div class="assign-line">${TIERS[pc.tier].icon} ${TIERS[pc.tier].name} · ${money(payRate(pc, c))}/giờ</div>`;
      return;
    }
    const key = R.pcs.map(p => `${p.cust ? 1 : 0}${p.dirty ? 1 : 0}${p.tier}${p.m.wear > 0 ? 1 : 0}${p.m.missing || ''}`).join('') + '|' + (pc ? pc.i : -1);
    if (key === pickKey) return;
    pickKey = key;
    pickerEl.innerHTML = R.pcs.map(p => {
      const s = p.cust ? ['off', 'có khách'] : p.m.missing ? ['off', 'thiếu ' + PARTS[p.m.missing].name.toLowerCase()] : p.dirty ? ['bad', 'bàn bẩn'] : p.m.wear <= 0 ? ['bad', 'phím hỏng']
        : p.tier < c.tier ? ['bad', 'sẽ lag']
        : p.tier > c.tier ? ['ok', 'xịn hơn'] : ['ok', 'vừa đúng'];
      return `<button class="pk ${pc === p ? 'sel' : ''} ${s[0]}" data-pk="${p.i}" ${p.cust || p.m.missing ? 'disabled' : ''}>
        <b>${String(p.i + 1).padStart(2, '0')} · ${TIERS[p.tier].short}</b><small>${c.favPc === p.i && !p.cust ? '❤️ ' : ''}${s[1]}</small></button>`;
    }).join('');
    if (!pc) { assignEl.innerHTML = '<div class="warn">Hết máy trống — để khách chờ hoặc bấm “Để sau”.</div>'; return; }
    const T = TIERS[pc.tier];
    const note = pc.tier < c.tier
      ? `<div class="warn">⚠️ Khách cần <b>${TIERS[c.tier].name}</b> — máy này sẽ lag, khách chỉ trả giá ${T.short}.</div>`
      : pc.tier > c.tier ? `<div class="note">✨ Máy xịn hơn yêu cầu — khách vui nhưng chỉ trả giá ${TIERS[c.tier].short}.</div>` : '';
    assignEl.innerHTML = `<div class="assign-line">Máy <b>${pc.i + 1}</b> · ${T.icon} ${T.name} · <b>${money(payRate(pc, c))}</b>/giờ</div>
      ${note}${pc.dirty ? '<div class="warn">🧹 Bàn chưa dọn — khách sẽ khó chịu.</div>' : ''}
      ${pc.m.wear <= 0 ? '<div class="warn">⌨️ Phím chuột máy này đã liệt — khách sẽ bực. Sửa ở tab Nâng máy buổi sáng.</div>' : ''}`;
  }
  m.pickPc = p => {
    if (guided) return fx(p.el.root, 'Nhân viên đã dẫn khách vào máy rồi', 'warn');
    if (p.cust) return fx(p.el.root, 'Máy đang có người', 'warn');
    if (p.m.missing) return fx(p.el.root, `Máy thiếu ${PARTS[p.m.missing].name.toLowerCase()}`, 'warn');
    pc = p;
    R.pick = p.i;
    PlayScene.showRowOf(p.i);
  };
  PlayScene.onTap(pickerEl, t => t.closest('[data-pk]'), b => {
    if (b && !b.disabled && modal === m) m.pickPc(R.pcs[+b.dataset.pk]);
  });
  if (pc) { R.pick = pc.i; PlayScene.showRowOf(pc.i); }
  m.update = () => {
    if (!guided && pc && pc.cust) { pc = bestPc(c); R.pick = pc ? pc.i : null; }
    renderPicker();
    fill.set(st.v);
    setText(ro, durText(st.v));
    confirm.disabled = st.v <= 0.05 || !pc || (guided && pc.cust !== c);
    setText(confirm, guided ? `Bắt đầu máy ${pc.i + 1} ✓` : pc ? `Xếp vào máy ${pc.i + 1} ✓` : 'Xếp máy ✓');
  };
  m.update();
  renderQueue();
}

// Khách trả theo hạng thấp hơn giữa máy và yêu cầu, cộng tiền đồ xịn (chuột, phím, màn, ghế) của máy
const payRate = (pc, c) => TIERS[Math.min(c.tier, pc.tier)].rate + gearBonus(pc.m);

function seat(pc, c, loaded) {
  if (pc.m.missing) return;
  const guided = !!(c.awaitingLoad && pc.cust === c);
  if (!guided && (pc.cust || !R.queue.includes(c))) return;
  if (!guided) R.queue.splice(R.queue.indexOf(c), 1);
  c.awaitingLoad = false;
  if (R.selected === c) R.selected = null;
  renderQueue();

  const notes = [];
  const tr = traitOf(c);
  // chờ xếp máy: tính theo phần kiên nhẫn đã dùng của chính khách này
  const waited = Math.max(1 - c.patience / c.patienceMax,
    guided ? 1 - c.loadPatience / c.loadPatienceMax : 0);
  if (waited < 0.25) hit(c, 'quickseat', 3, 'wait', waitWord(waited));
  else hit(c, waited > 0.6 ? 'wait' : 'waitbit', -waited * 20, 'wait', waitWord(waited));
  if (c.favPc === pc.i) { hit(c, 'favpc', 5, null, `Được ngồi đúng máy quen (máy ${pc.i + 1})`); notes.push(['Đúng máy quen! ❤️', 'good']); }
  if (c.game === S.hot) note(c, 'hotgame', 3);
  if (c.seg === 'hoainiem' && GAMES[c.game].cost) note(c, 'oldgame', 6, `Quán có ${GAMES[c.game].name}`);
  if (pc.dirty) {
    hit(c, 'dirty', -12, 'clean', 'Bị xếp vào bàn chưa dọn');
    pc.dirty = false;
    notes.push([tr.noticeClean ? 'Bàn bẩn thế này à?! 😣' : 'Bàn bẩn quá!', 'bad']);
  } else if (tr.noticeClean) {
    hit(c, 'cleanseat', 4, 'clean', 'Được ngồi bàn sạch sẽ');
    notes.push(['Bàn sạch ✓', 'good']);
  }
  if (pc.tier < c.tier) {
    hit(c, 'lag', -25 * (c.tier - pc.tier), 'pc', `Cần ${TIERS[c.tier].phrase} nhưng ngồi ${TIERS[pc.tier].phrase}`);
    notes.push(['Máy lag quá!', 'bad']);
  } else if (pc.tier > c.tier) {
    hit(c, 'fancy', 6, 'pc', 'Được ngồi máy xịn hơn yêu cầu');
    notes.push(['Máy xịn ghê!', 'good']);
  }
  if (pc.m.wear <= 0) { wornHit(c, pc); notes.push(['Phím liệt nút! 😤', 'bad']); }
  const comfy = gearSat(pc.m);
  if (comfy) {
    const gear = pc.m.mouse + pc.m.kb + pc.m.mon >= 6;
    hit(c, gear ? 'gear' : pc.m.chair >= 2 ? 'chair' : 'comfy', comfy, 'pc');
    if (gear) notes.push(['Gear xịn! 🎮', 'good']);
  }

  const diff = loaded - c.hours;
  if (Math.abs(diff) <= C.HOUR_PERFECT) { hit(c, 'perfect', 6, 'hours', 'Nạp đúng giờ'); notes.push(['Chuẩn giờ! ✓', 'good']); }
  else if (diff > 0) { hit(c, 'bonus', 2, 'hours', `Được nạp dư ${durText(diff)} (quán tặng)`); notes.push([`Dư ${durText(diff)} — cho không`, 'warn']); }
  else {
    hit(c, 'short', -Math.min(30, 8 + -diff * 18), 'hours', `Nạp thiếu ${durText(-diff)}`);
    notes.push([tr.bad?.hours ? `Thiếu ${durText(-diff)}! Em tính rồi nha 😤` : `Thiếu ${durText(-diff)}!`, 'bad']);
  }

  const rate = payRate(pc, c);
  const pay = Math.round(Math.min(loaded, c.hours) * rate / 500) * 500;
  S.money += pay;
  R.led.hours += pay;

  c.loaded = loaded;
  c.remaining = loaded;
  const worker = guided ? staffById(c.staffId) : availableStaff();
  c.staffId = worker ? worker.id : null;
  const longSession = loaded >= 1.5;
  const habit = segOf(c).order || {};
  c.wantsOrder = Math.random() < (habit.chance ?? (longSession ? 0.7 : 0.4));
  c.allowFood = longSession && !habit.drinkOnly;
  // gọi đồ sau khi chơi được 10–35% thời gian; dân văn phòng gọi ngay khi vừa ngồi
  c.orderAt = loaded * (habit.early ? rand(0.85, 0.95) : rand(0.65, 0.9));
  pc.cust = c;

  if (worker && !guided) {
    PlayScene.guide(pc.i, c);
    notes.push([`${staffName(worker.id)} dẫn vào máy`, 'good']);
  }

  fx(pc.el.root, `+${money(pay)}`, 'money');
  fxList(pc.el.root, notes);
  log(`${c.avatar} ${c.name} bắt đầu chơi máy ${pc.i + 1}${worker ? ` · ${staffName(worker.id)} phụ trách` : ''}`);
}

// ---------- Gọi đồ & bếp ----------
// bad[k] = danh sách số ngày quá hạn của từng món hết date đã bỏ vào khay
const newTray = () => ({ items: {}, bad: {}, cook: 0, pour: 0 });
const trayEmpty = t => !Object.keys(t.items).length;

// habit = thói quen gọi đồ của tệp khách (món quen, đồ uống hay gọi)
function genOrder(allowFood, habit = {}) {
  const drinks = keysOf('drink'), tops = keysOf('topping');
  const favDrinks = (habit.drinks || []).filter(k => drinks.includes(k));
  const drink = () => favDrinks.length && Math.random() < 0.75 ? pick(favDrinks) : pick(drinks);
  const items = {};
  if (allowFood && Math.random() < (habit.food ? 0.9 : 0.6)) {
    items.mi = 1;
    for (const t of tops) {
      const fav = (habit.toppings || []).includes(t);
      if (Math.random() < (fav ? 0.9 : 0.45)) items[t] = (t === 'trung' && Math.random() < 0.2) ? 2 : 1;
    }
    if (Math.random() < 0.55) items[drink()] = 1;
  } else {
    const d = drink();
    items[d] = 1;
    if (Math.random() < 0.25) {
      const d2 = pick(drinks.filter(x => x !== 'caphe' || d !== 'caphe'));
      items[d2] = (items[d2] || 0) + 1;
    }
  }
  return items;
}

function createOrder(pc) {
  const c = pc.cust;
  const P = C.ORDER_PATIENCE * patienceMul() * (traitOf(c).patience || 1);
  const a = rand(50, 68), line = rand(66, 86);
  const worker = staffById(c.staffId);
  const items = genOrder(c.allowFood, segOf(c).order);
  const actualItems = { ...items };
  let mistake = false;
  if (worker && Math.random() < staffMistakeChance(worker)) {
    const drinks = keysOf('drink');
    const old = drinks.find(k => items[k]);
    const other = drinks.filter(k => k !== old);
    if (other.length) {
      if (old) delete items[old];
      items[pick(other)] = 1;
      mistake = true;
      R.led.staffMistakes++;
    }
  }
  c.order = {
    items, actualItems, mistake, tray: newTray(),
    patience: P, patienceMax: P,
    cookZone: [a, a + 16], pourZone: [line - 5, line + 5], pourLine: line,
    // khách rụt rè: bong bóng hiện mờ vài giây rồi thu thành 💭; chưa được hỏi thì chưa tính giờ chờ món
    hidden: !worker && !!traitOf(c).shy, flash: C.SHY_FLASH,
  };
  c.ordered = true;
  log(c.order.hidden ? `💭 ${c.name} (máy ${pc.i + 1}) hình như muốn gọi gì đó…`
    : worker ? `📝 ${staffName(worker.id)} nhận đơn của ${c.name} (máy ${pc.i + 1})`
      : `🔔 ${c.name} (máy ${pc.i + 1}) gọi đồ`);
}

// Chủ quán hỏi khách rụt rè → khách mới nói món, bắt đầu tính giờ chờ món
function revealOrder(pc) {
  const c = pc.cust, o = c && c.order;
  if (!o || !o.hidden) return;
  o.hidden = false;
  if (!c.ev.asked) hit(c, 'asked', 5, null, 'Được chủ quán hỏi han nên dám gọi món');
  fx(pc.el.root, 'Dạ… cho em gọi món ạ', 'good');
}

// Bấm vào máy đang có khách mà khách không cần gì: hỏi thăm.
// Khách rụt rè thấy được quan tâm; khách khác bị hỏi nhiều lần thì thấy phiền.
function askCustomer(pc) {
  const c = pc.cust;
  if (traitOf(c).shy) {
    if (!c.ev.asked) { hit(c, 'asked', 4, null, 'Được chủ quán hỏi han'); fx(pc.el.root, 'Dạ… em ổn ạ, cảm ơn anh 😊', 'good'); }
    else fx(pc.el.root, 'Dạ… em ổn ạ', '');
    return;
  }
  c.pester = (c.pester || 0) + 1;
  if (c.pester === 1) return fx(pc.el.root, 'Em ổn, cảm ơn anh!', '');
  if (c.pester <= 3) hit(c, 'pester', -3, null, c.pester === 2 ? 'Bị hỏi han nhiều lúc đang chơi' : null);
  fx(pc.el.root, 'Em đang chơi mà… 😑', 'warn');
}

function cancelOrder(pc, reason) {
  const c = pc.cust;
  if (!c || !c.order) return;
  if (modal && modal.pc === pc) closeModal();
  c.order = null;
  if (reason === 'timeout') {
    hit(c, 'foodslow', -22, 'food', 'Chờ món quá lâu nên thôi không ăn');
    fx(pc.el.root, 'Chờ đồ ăn lâu quá! 😤', 'bad');
    log(`😤 ${c.name} chờ đồ ăn lâu quá, thôi không ăn nữa`);
  } else {
    hit(c, 'outofstock', -8, 'food', 'Gọi món thì quán hết hàng');
    fx(pc.el.root, 'Thôi vậy…', 'warn');
  }
}

function stockBtn(k, label, disabled) {
  const n = invCount(k), bad = expiredCount(k);
  // lấy hàng cũ trước: nếu còn hàng hết date thì món tiếp theo là đồ hết date
  return `<button class="stock-btn ${bad ? 'next-expired' : ''}" data-add="${k}" ${disabled || !n ? 'disabled' : ''}>
    <span class="si">${ITEMS[k].icon}</span>${label || ITEMS[k].name}<small>${n ? 'còn ' + n : 'hết hàng'}</small>
    ${bad ? `<small class="bad-text">☠️ ${bad} hết date</small>` : ''}</button>`;
}

function trayHTML(o) {
  const t = o.tray;
  if (trayEmpty(t)) return '<span class="muted">Khay trống</span>';
  return Object.entries(t.items).map(([k, n]) => {
    const bad = (t.bad[k] || []).length;
    let s = `${ITEMS[k].icon} ${ITEMS[k].name}${n > 1 ? ' ×' + n : ''}${bad ? ` <b class="bad-text">☠️${bad > 1 ? '×' + bad : ''}</b>` : ''}`;
    if (k === 'mi') s += ` · <em>${cookLabel(t.cook, o.cookZone)}</em>`;
    if (k === 'caphe') s += ` · <em>${pourLabel(t.pour, o.pourZone)}</em>`;
    return `<span class="chip">${s}</span>`;
  }).join('');
}

// Nồi mì vẽ theo khay: mì chín dần đổi màu, trứng/xúc xích nổi lên, lửa bật khi đang giữ nút nấu
function potSVG(t, cooking) {
  const has = !!t.items.mi, v = t.cook;
  const broth = !has ? '#DCE3E6' : v < 35 ? '#F6DE9C' : v < 75 ? '#E7A94A' : '#C98A3A';
  const eggs = t.items.trung || 0, sau = t.items.xucxich || 0;
  let top = '';
  if (has) {
    top += `<path d="M28,40 q6,-6 12,0 t12,0 t12,0 t12,0 t12,0" stroke="${v < 35 ? '#FFF1C4' : '#F8DB8A'}" stroke-width="3.5" fill="none"/>`;
    for (let k = 0; k < eggs; k++) top += `<g transform="translate(${70 - k * 20} 38)"><ellipse rx="10" ry="5.5" fill="#fff"/><circle r="3.6" fill="#F7B32B"/></g>`;
    for (let k = 0; k < sau; k++) top += `<ellipse cx="${36 + k * 10}" cy="37" rx="5" ry="3" fill="#D9534F" stroke="#A8322E"/>`;
  }
  const steam = has && v > 15 ? `<g class="steam ${cooking ? 'strong' : ''}" transform="translate(60 26)" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9">
    <path d="M-16,0 q-7,-9 0,-18 q7,-9 0,-18"/><path d="M0,0 q-7,-9 0,-18 q7,-9 0,-18"/><path d="M16,0 q-7,-9 0,-18 q7,-9 0,-18"/></g>` : '';
  return `<svg viewBox="0 -10 120 106" aria-hidden="true">
    <rect x="8" y="86" width="104" height="10" rx="3" fill="#5B5F63"/>
    ${cooking ? '<g class="flame-on"><path d="M30,86 q5,-16 10,0 z M55,86 q5,-19 10,0 z M80,86 q5,-16 10,0 z" fill="#4AA8FF"/></g>' : ''}
    <rect x="16" y="36" width="88" height="40" rx="9" fill="#B9C0C4"/>
    <rect x="4" y="46" width="14" height="7" rx="3.5" fill="#8E969A"/><rect x="102" y="46" width="14" height="7" rx="3.5" fill="#8E969A"/>
    <ellipse cx="60" cy="38" rx="44" ry="10" fill="${broth}"/>${top}
    <path d="M26,60 H94" stroke="#fff" stroke-width="3" opacity=".35"/>${steam}</svg>`;
}

function openKitchen(pc) {
  const c = pc.cust;
  if (!c || !c.order) return;
  revealOrder(pc);
  const o = c.order;
  const toppings = keysOf('topping'), drinks = keysOf('drink');
  const body = el('div', 'kitchen');
  PlayScene.showRowOf(pc.i);
  const m = openModal({
    title: `🍳 Bếp — Máy ${pc.i + 1}`, body, cls: 'modal-kitchen', dock: true,
    actions: [
      { label: 'Hết món, xin lỗi 🙏', cls: 'ghost danger', onClick: () => cancelOrder(pc, 'sorry') },
      { label: 'Đổ bỏ khay', cls: 'ghost', onClick: () => { o.tray = newTray(); render(); } },
      { label: c.staffId ? 'Giao nhân viên mang ra 🧑‍🍳' : 'Mang ra 🚶', cls: 'primary', id: 'k-deliver', onClick: () => deliver(pc) },
    ],
  });
  m.pc = pc;
  const deliverBtn = m.card.querySelector('#k-deliver');
  let cookFill = null, pourFill = null, pbar = null, trayEl = null, trayKey = '', potEl = null, potKey = '';
  let hadMi = false, hadCafe = false;
  const wantsFood = keysOf('base').concat(toppings).some(k => o.items[k]);

  function render() {
    stopHold();
    const t = o.tray;
    const hasMi = !!t.items.mi, hasCafe = !!t.items.caphe;
    body.innerHTML = `
      <div class="ticket">
        <div class="ticket-head">${faceSVG(c, 'idle')}<div><b>${esc(c.name)}</b> <span class="muted">· máy ${pc.i + 1} gọi</span>
          <div class="ticket-items">${Object.entries(o.items).map(([k, n]) =>
            `<span class="it">${ITEMS[k].icon} ${ITEMS[k].name}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div></div></div>
        <div class="pbar"><i></i></div>
      </div>
      <div class="tray"><div class="tray-head">🍽️ Khay</div><div class="tray-items"></div></div>
      <div class="station cook ${wantsFood || hasMi ? '' : 'dim later'}">
        <div class="cook-row"><div class="pot"></div>
          <div class="cook-side"><h4>🔥 Nồi mì</h4>
            <div class="row">${hasMi ? '' : stockBtn('mi', 'Thả gói mì')}${toppings.map(k => stockBtn(k, null, !hasMi)).join('')}</div>
            ${hasMi ? '' : `<p class="hint">Thả mì vào nồi trước rồi mới thêm topping.</p>`}</div></div>
        ${hasMi ? `<div class="cook-go"><div class="cook-area"></div><button class="btn hold hold-cook">🔥 Giữ để nấu</button></div>` : ''}
      </div>
      <div class="station drinks">
        <h4>🧊 Quầy nước</h4>
        <div class="row">${drinks.map(k => stockBtn(k, null, k === 'caphe' && hasCafe)).join('')}</div>
        ${hasCafe ? `<div class="pour-area"><div class="glass-wrap"></div>
          <div class="pour-side"><p class="hint">Rót sữa tới vạch vàng.</p><button class="btn hold hold-pour">🥛 Giữ để rót</button></div></div>` : ''}
      </div>`;
    pbar = body.querySelector('.pbar i');
    trayEl = body.querySelector('.tray-items');
    potEl = body.querySelector('.pot');
    potKey = '';
    trayKey = '';
    cookFill = pourFill = null;
    m.holdBtn = null;
    if (hasMi) {
      const z = o.cookZone;
      cookFill = buildFill({
        max: 100, zone: z, cls: 'fill-cook',
        ticks: [{ v: 6, label: 'Sống' }, { v: (z[0] + z[1]) / 2, label: 'Vừa' }, { v: 94, label: 'Nát' }],
      });
      body.querySelector('.cook-area').appendChild(cookFill.root);
      const b = body.querySelector('.hold-cook');
      bindHold(b, t, 'cook', C.COOK_FILL_RATE, 100);
      m.holdBtn = b;
    }
    if (hasCafe) {
      pourFill = buildFill({ vertical: true, max: 100, zone: o.pourZone, mark: o.pourLine, cls: 'fill-pour' });
      body.querySelector('.glass-wrap').appendChild(pourFill.root);
      const b = body.querySelector('.hold-pour');
      bindHold(b, t, 'pour', C.POUR_FILL_RATE, 100);
      m.holdBtn = m.holdBtn || b;
    }
    // vừa thả mì / lấy cà phê: cuộn quầy tới thanh đo và nút giữ vừa hiện ra
    const fresh = hasMi && !hadMi ? '.cook-go' : hasCafe && !hadCafe ? '.pour-area' : null;
    hadMi = hasMi;
    hadCafe = hasCafe;
    if (fresh) body.querySelector(fresh).scrollIntoView({ block: 'nearest' });
  }

  body.addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (!b || b.disabled) return;
    const k = b.dataset.add;
    const past = invTake(k);
    if (past === null) return;
    o.tray.items[k] = (o.tray.items[k] || 0) + 1;
    if (past > 0) (o.tray.bad[k] = o.tray.bad[k] || []).push(past);
    render();
  });

  m.update = () => {
    const t = o.tray;
    pbar.style.width = (o.patience / o.patienceMax * 100) + '%';
    pbar.classList.toggle('low', o.patience / o.patienceMax < 0.3);
    if (cookFill) cookFill.set(t.cook);
    if (pourFill) pourFill.set(t.pour);
    const cooking = !!(hold && hold.target === t && hold.prop === 'cook');
    const pk = [t.items.mi || 0, t.items.trung || 0, t.items.xucxich || 0, Math.floor(t.cook / 10), cooking].join('|');
    if (pk !== potKey) { potKey = pk; potEl.innerHTML = potSVG(t, cooking); }
    const key = trayHTML(o);
    if (key !== trayKey) { trayEl.innerHTML = key; trayKey = key; }
    deliverBtn.disabled = trayEmpty(t);
  };
  render();
}

function deliver(pc) {
  const c = pc.cust;
  if (!c || !c.order || trayEmpty(c.order.tray)) return;
  if (modal && modal.pc === pc) closeModal();
  const o = c.order, t = o.tray;
  let pay = 0;
  const notes = [];
  for (const k of new Set([...Object.keys(o.items), ...Object.keys(o.actualItems || o.items), ...Object.keys(t.items)])) {
    const need = o.items[k] || 0, got = t.items[k] || 0;
    pay += Math.min((o.actualItems || o.items)[k] || 0, got) * ITEMS[k].price;
    // khách ăn/uống món hết date → có thể đau bụng một lúc sau (khách không biết ngay)
    const bad = (t.bad[k] || []).slice(0, Math.min(need, got));
    if (bad.some(past => Math.random() < C.SICK_CHANCE[Math.min(past, C.SICK_CHANCE.length - 1)]) && c.sickAt == null) {
      c.sickAt = R.time + rand(0.3, 1);
    }
    if (got < need) { hit(c, 'missing', -15 * (need - got), 'food', `Mang ra thiếu ${ITEMS[k].name}`); notes.push([`Thiếu ${ITEMS[k].name}!`, 'bad']); }
    else if (got > need) { hit(c, 'extra', -4, 'food'); notes.push([`Thừa ${ITEMS[k].name}`, 'warn']); }
  }
  if (o.items.mi && t.items.mi) {
    const j = judge(t.cook, o.cookZone, 8), under = t.cook < o.cookZone[0];
    if (j === 'ok') { hit(c, 'cookmeh', -8, 'food'); notes.push([under ? 'Mì hơi sống' : 'Mì hơi nhừ', 'warn']); }
    if (j === 'bad') { hit(c, under ? 'raw' : 'mushy', -22, 'food', under ? 'Mì còn sống' : 'Mì nấu nát'); notes.push([under ? 'Mì còn sống!' : 'Mì nát bét!', 'bad']); }
  }
  if (o.items.caphe && t.items.caphe) {
    const j = judge(t.pour, o.pourZone, 6), under = t.pour < o.pourZone[0];
    if (j === 'ok') { hit(c, 'coffeemeh', -8, 'food'); notes.push([under ? 'Cà phê hơi ít' : 'Cà phê hơi đầy', 'warn']); }
    if (j === 'bad') { hit(c, 'coffee', -20, 'food', under ? 'Cà phê rót quá ít' : 'Cà phê rót tràn ly'); notes.push([under ? 'Ít cà phê quá!' : 'Tràn ly rồi!', 'bad']); }
  }
  if (o.mistake && Object.keys({ ...o.actualItems, ...t.items }).some(k => (t.items[k] || 0) !== (o.actualItems[k] || 0))) {
    hit(c, 'orderwrong', -12, 'food', 'Nhân viên ghi sai món khách gọi');
    notes.push(['Nhân viên ghi sai đơn!', 'bad']);
    log(`📝 ${staffName(c.staffId)} ghi sai đơn của ${c.name}`);
  }
  // món ra nhanh hay chậm: tính theo sức chờ món của chính khách này
  const late = 1 - o.patience / o.patienceMax;
  hit(c, late > 0.6 ? 'foodslow' : 'foodwait', -late * 12, 'food', foodWord(late));
  if (!notes.length) {
    hit(c, late < 0.5 ? (o.items.mi ? 'tasty' : 'quick') : 'foodok', 8, 'food');
    notes.push(['Ngon quá! 😋', 'good']);
  }

  PlayScene.deliver(pc.i, c, t.items.mi ? 'bowl' : 'cup', !!c.staffId);
  c.order = null;
  c.ate = true;
  c.ateMi = c.ateMi || !!t.items.mi;
  c.hadCoffee = c.hadCoffee || !!t.items.caphe;
  S.money += pay;
  R.led.food += pay;
  fx(pc.el.root, `+${money(pay)}`, 'money');
  fxList(pc.el.root, notes);
}

// ---------- Máy: sửa, dọn, khách về ----------
function startRepair(pc) {
  if (!pc.broken || pc.repair > 0) return;
  pc.repair = C.REPAIR_SECONDS;
}
function cleanPc(pc) {
  if (!pc.dirty || pc.cust) return;
  pc.cleaningBy = null;
  pc.cleanIn = 0;
  pc.dirty = false;
  fx(pc.el.root, '✨ Sạch bong', 'good');
  VFX.burst(pc.el.root, 'sparkle');
}

// ---------- Đau bụng & công an ----------
// Khách ăn phải đồ hết date. Trả về true nếu khách gọi báo công an.
function sicken(c) {
  c.sickAt = null;
  c.sick = true;
  hit(c, 'sick', -50, null, 'Ăn phải đồ hết date, bị đau bụng');
  R.led.sick++;
  if (Math.random() >= C.REPORT_CHANCE) return false;
  if (R.over) S.pendingPolice++;           // tối rồi → sáng mai công an tới
  else {
    R.reports++;
    if (R.policeAt == null) R.policeAt = R.time + rand(0.5, 1.5);
  }
  return true;
}

function inspect() {
  R.policeAt = null;
  stopHold();
  SFX.play('police');
  const found = [];
  let qty = 0;
  for (const k in ITEMS) {
    const n = removeExpired(k);   // tịch thu
    if (n) { found.push(`${ITEMS[k].icon} ${n} ${ITEMS[k].name}`); qty += n; }
  }
  const reports = R.reports, kids = R.kidReports;
  R.reports = R.kidReports = 0;
  const kidFine = kids * C.MOM_FINE;
  const fine = reports * C.FINE_REPORT + qty * C.FINE_PER_ITEM + kidFine;
  const kidNote = kids ? `<div class="warn">👩 Phụ huynh báo quán cho học sinh chơi game tới khuya. Phạt ${money(kidFine)}.</div>` : '';
  const wasPaused = R.paused;
  setPause(true);
  let body;
  if (fine) {
    S.money -= fine;
    R.led.fine += fine;
    updateRating(10, 1.5);
    body = `${reports
        ? `<p>📞 Nhận được ${reports > 1 ? reports + ' tin' : 'tin'} báo có khách bị đau bụng sau khi ăn uống ở quán.</p>`
        : kids ? '<p>📞 Nhận được tin báo từ phụ huynh học sinh. Tiện kiểm tra luôn kho hàng.</p>'
        : '<p>Kiểm tra vệ sinh an toàn thực phẩm đột xuất.</p>'}
      ${kidNote}
      ${qty ? `<div class="warn">☠️ Phát hiện hàng hết date trong kho: ${found.join(', ')}. Tịch thu toàn bộ!</div>`
        : '<p>Kho không còn hàng hết date.</p>'}
      <div class="fine">Tiền phạt <b>-${money(fine)}</b></div>`;
    log(`🚨 Bị công an phạt ${money(fine)}`);
  } else {
    updateRating(95, 0.6);
    body = `<p>Kiểm tra vệ sinh an toàn thực phẩm đột xuất.</p>
      <div class="note">✅ Kho sạch sẽ, không có hàng hết date. Quán làm ăn đàng hoàng, tốt lắm!</div>`;
    log('👮 Công an kiểm tra: quán sạch sẽ ✓');
  }
  openModal({
    title: '👮 Công an phường ghé kiểm tra', body, cls: 'modal-police', dismissable: false,
    actions: [{ label: fine ? 'Nộp phạt 😭' : 'Cảm ơn các anh 🫡', cls: 'primary', onClick: () => closeModal() }],
    onClose: () => { if (R && !R.over && !wasPaused) setPause(false); },
  });
}

// Kết thúc một lần máy treo. Sửa xong nhanh = "được sửa ngay" (khách thông cảm);
// để lâu hoặc khách bỏ về = ghi sự việc máy treo với số điểm đã mất trong lúc chờ.
function settleBreak(pc, fixed) {
  const c = pc.cust;
  if (!c || !pc.brokeFor) return;
  if (fixed && pc.brokeFor <= C.FIX_FAST) hit(c, 'fixed', 4, 'pc', 'Máy treo, được sửa ngay');
  else {
    c.ev.broken = (c.ev.broken || 0) - pc.breakLoss;
    cause(c, fixed ? 'Máy treo, phải chờ khá lâu mới được sửa' : 'Máy treo mãi không ai sửa');
    if (repeatsMemory(c, 'broken')) markAgain(c);
  }
  pc.brokeFor = pc.breakLoss = 0;
}
// drain = hệ số mất hài lòng khi máy treo · giveup = hệ số thời gian chịu ngồi chờ sửa
function breakMemory(c) {
  if (c.mem?.key === 'fixed') return { drain: 0.6, giveup: 1.5 };   // lần trước được sửa ngay → thông cảm hơn
  if (repeatsMemory(c, 'broken')) return { drain: 1.5, giveup: 0.8 };
  return { drain: 1, giveup: 1 };
}

// Khách quen từng phàn nàn chuyện gì: lần này quán làm ổn chưa? (chỉ tính khi chuyện đó có dịp xảy ra)
const BETTER = {
  wait: c => !c.ev.wait, dirty: c => !c.ev.dirty, short: c => !c.ev.short, lag: c => !c.ev.lag,
  broken: c => !c.ev.broken && !c.ev.rage, closed: c => !c.ev.closed,
  foodslow: c => c.ate && !c.ev.foodslow, cook: c => c.ateMi && !c.ev.raw && !c.ev.mushy,
  missing: c => c.ate && !c.ev.missing, coffee: c => c.hadCoffee && !c.ev.coffee,
  outofstock: c => c.ate && !c.ev.outofstock,
  ping: c => !c.ev.ping, hot: c => !c.ev.hot, worn: c => !c.ev.worn, noise: c => !c.ev.noise,
};
function checkBetter(c) {
  if (!c.mem || c.mem.good || c.ev.again || !BETTER[c.mem.key]?.(c)) return;
  hit(c, 'better', 6, null, 'Chuyện lần trước phàn nàn, hôm nay quán đã làm tốt');
}

function leaveUnloaded(pc) {
  const c = pc.cust;
  if (!c || !c.awaitingLoad) return;
  if (modal && modal.checkin === c) closeModal();
  c.awaitingLoad = false;
  pc.cust = null;
  R.led.walkouts++;
  updateRating(0, 0.7);
  note(c, 'walkout', -80, 'Đã vào máy nhưng chờ nạp giờ quá lâu nên bỏ về');
  log(`😤 ${c.name} chờ nạp giờ ở máy ${pc.i + 1} quá lâu nên bỏ về`);
  fx(pc.el.root, 'Chờ nạp giờ lâu quá!', 'bad');
  finishVisit(c, pc.i + 1, pick([1, 1, 2]));
}

function leave(pc, reason) {
  const c = pc.cust;
  if (!c) return;
  if (pc.broken) settleBreak(pc, false);
  if (c.order) {
    if (modal && modal.pc === pc) closeModal();
    // khách rụt rè chưa dám nói món thì không phạt giờ chờ — chỉ là quán mất một đơn
    if (c.order.hidden) note(c, 'shyskip', -2, 'Muốn gọi đồ nhưng ngại, không dám gọi');
    else hit(c, 'foodslow', -15, 'food', 'Chưa nhận được món đã phải về');
    c.order = null;
  }
  if (reason === 'close' && c.remaining > 0.25) {
    // đóng cửa khi khách còn giờ đã trả tiền
    hit(c, 'closed', -Math.min(30, c.remaining * 10), 'hours', 'Còn giờ chơi mà quán đã đóng cửa');
  }
  // ăn đồ hết date mà chưa kịp đau bụng ở quán → về nhà mới đau
  const sickAtHome = c.sickAt != null;
  const reported = sickAtHome && sicken(c);
  if (reason === 'rage') note(c, 'rage', -60);
  if (reason === 'kicked') {
    c.sat = Math.min(c.sat, 30);
    note(c, 'kicked', -60, 'Bị chủ quán mời về vì làm ồn');
  }
  if (reason === 'dark' && c.remaining > 0.1) {
    // cúp điện lâu quá: khách đòi lại tiền giờ chưa chơi
    const refund = round500(c.remaining * payRate(pc, c));
    S.money -= refund;
    R.led.refund += refund;
    log(`💸 ${c.name} đòi lại ${money(refund)} tiền giờ chưa chơi`);
  }
  if (acRunning() && R.temp < 29 && !c.ev.hot) note(c, 'ac', 3, 'Quán mát rượi');
  checkBetter(c);
  let tip = 0;
  if (!['rage', 'kicked', 'mom'].includes(reason) && !c.sick && c.sat >= 85) {
    tip = pick([2000, 5000, 5000, 10000]);
    S.money += tip;
    R.led.tips += tip;
  }
  const face = mood(c.sat);
  fx(pc.el.root, face + (tip ? ` tip +${money(tip)}` : ''), tip ? 'money' : '');
  updateRating(c.sat, 1);
  R.led.served++;
  R.led.satSum += c.sat;
  pc.cust = null;
  pc.broken = false;
  pc.repair = 0;
  pc.dirty = c.ate || Math.random() < 0.35;
  if (reason === 'rage') log(`😡 ${c.name} bực mình bỏ về (máy ${pc.i + 1})`);
  else if (reason === 'dark') log(`🕯️ ${c.name} chờ có điện lâu quá, về luôn`);
  else if (reason === 'kicked') fx(pc.el.root, '😒 Về thì về!', 'bad', 350);
  else if (reason === 'mom') fx(pc.el.root, '😭 Mẹ ơi con xin lỗi!', 'bad', 350);
  else if (reason === 'done') log(`${face} ${c.name} chơi xong, rời máy ${pc.i + 1}`);
  if (sickAtHome) log(`🤢 ${c.name} về tới nhà thì đau bụng…`);
  if (reported) log(`📞 ${c.name} gọi báo công an phường!`);
  const rv = finishVisit(c, pc.i + 1, reason === 'rage' || c.sick ? 1 : reason === 'kicked' ? pick([1, 2]) : 0);
  if (rv) fx(pc.el.root, `📍 ${rv.stars}★`, rv.stars >= 4 ? 'good' : rv.stars <= 2 ? 'bad' : 'warn', 700);
  if (rv && rv.stars >= 4) setTimeout(() => VFX.burst(pc.el.root, rv.stars === 5 ? 'stars' : 'sparkle'), 700);
}

function onPcClick(pc) {
  if (R.over) return;
  if (R.escape && R.escape.pc === pc) return catchThief();   // kẻ trộm đang chạy: bấm kịp là bắt được
  if (!pc.cust) {
    if (modal && modal.checkin) return modal.pickPc(pc);   // đang ở quầy nạp giờ: bấm máy trong cảnh để chọn
    if (pc.m.missing) return fx(pc.el.root, `Máy thiếu ${partName(pc.m.missing)} — sáng mai mua lại ở tab Nâng máy`, 'warn');
    if (R.selected) return openCheckin(pc, R.selected);
    if (pc.dirty) return pc.cleaningBy ? fx(pc.el.root, 'Nhân viên đang lau bàn', 'good') : cleanPc(pc);
    return fx(pc.el.root, 'Chọn khách ở cửa trước nhé', 'warn');
  }
  if (pc.cust.awaitingLoad) return openCheckin(pc, pc.cust);
  if (pc.cust.order) return openKitchen(pc);   // kể cả 💭 của khách rụt rè: bấm vào là hỏi
  if (pc.broken) return startRepair(pc);
  if (pc.cust.noisy && !R.selected) return openNoise(pc);
  if (pc.cust.shifty && !R.selected) return fx(pc.el.root, '👀 Người này cứ nhìn quanh… để ý máy này nhé', 'warn');
  if (R.selected) return fx(pc.el.root, 'Máy đang có người', 'warn');
  askCustomer(pc);
}

// ---------- Vòng lặp ----------
function update(dt) {
  const gh = dt * 1000 / C.GAME_HOUR_MS;
  R.time += gh;

  // công an tới (đợi chủ quán làm xong việc đang dở)
  // (quầy thao tác ở nửa dưới không chặn — công an tới thì đóng quầy lại)
  if (R.policeAt != null && R.time >= R.policeAt && (!modal || modal.docked) && !hold) { inspect(); return; }
  if (R.momAt != null && R.time >= R.momAt && (!modal || modal.docked) && !hold) { momArrives(); return; }

  updateInfra(dt, gh);
  const on = powered();

  if (R.time < C.LAST_ENTRY_HOUR) {
    R.spawnIn -= dt;
    if (R.spawnIn <= 0) {
      if (R.queue.length < C.QUEUE_MAX && on) spawnCustomer(R.thiefAt != null && R.time >= R.thiefAt);   // quán tối om thì không ai vào
      if (R.queue.some(c => c.thief && !c.relapse)) R.thiefAt = null;
      R.spawnIn = nextSpawnDelay();
    }
  }

  updateStaff(dt);

  for (const c of [...R.queue]) {
    if (c.atCounter) continue;
    c.patience -= dt * (R.hot ? C.HOT_QUEUE_DRAIN : 1);
    if (c.patience <= 0) { if (c.lost) leaveLost(c); else walkout(c); }
  }

  const breakRate = C.BREAK_PER_HOUR * (S.upgrades.ups ? 0.45 : 1) * (R.hot ? C.HOT_BREAK_MUL : 1);
  // Mạng: máy đang chạy vượt sức tải gói mạng thì giật
  const netOver = R.running > netCap();
  if (netOver) R.led.pingHours += gh;
  for (const pc of R.pcs) {
    const c = pc.cust;
    if (!c) continue;

    if (c.awaitingLoad) {
      if (!c.atCounter) c.loadPatience -= dt * (R.hot ? C.HOT_QUEUE_DRAIN : 1);
      if (c.loadPatience <= 0) leaveUnloaded(pc);
      continue;
    }

    if (c.sickAt != null && R.time >= c.sickAt) {
      const reported = sicken(c);
      fx(pc.el.root, '🤢 Đau bụng quá!', 'bad');
      log(`🤢 ${c.name} đau bụng, ôm bụng chạy về!`);
      if (reported) log(`📞 ${c.name} gọi báo công an phường!`);
      leave(pc, 'sick');
      continue;
    }

    if (c.order && c.order.hidden) c.order.flash -= dt;   // chưa được hỏi: chưa tính giờ chờ món
    else if (c.order) {
      c.order.patience -= dt * (modal && modal.pc === pc ? 0.5 : 1);
      if (c.order.patience <= 0) cancelOrder(pc, 'timeout');
    }

    if (pc.repair > 0) {
      pc.repair -= dt;
      if (pc.repair <= 0) {
        pc.repair = 0; pc.broken = false;
        settleBreak(pc, true);
        fx(pc.el.root, 'Đã sửa ✓', 'good');
      }
    }
    if (pc.broken) {
      // mỗi lần treo chỉ trừ tới khi khách hết chịu nổi (BREAK_GIVEUP), rồi khách bỏ về.
      // Khách quen từng được sửa máy tử tế thì kiên nhẫn hơn; từng bị treo mãi thì khó chịu hơn.
      const m = breakMemory(c);
      const d = Math.min(c.sat, C.BROKEN_SAT_DRAIN * dt * careOf(c, 'pc', -1) * m.drain);
      c.sat -= d;
      pc.breakLoss += d;
      pc.brokeFor += dt;
      if (c.sat <= 0 || pc.brokeFor >= C.BREAK_GIVEUP * m.giveup) leave(pc, 'rage');
      continue;
    }

    if (!on) {
      // cúp điện, máy tắt: giờ chơi đứng yên, khách ngồi chờ có điện (có UPS thì mấy giây đầu còn kịp lưu game)
      if (R.darkT > (S.upgrades.ups ? C.UPS_GRACE : 0)) {
        const d = Math.min(c.sat, C.DARK_SAT_DRAIN * dt * careOf(c, 'pc', -1));
        c.sat -= d;
        c.ev.dark = (c.ev.dark || 0) - d;
        c.darkFor = (c.darkFor || 0) + dt;
        if (!c.darkNoted) { c.darkNoted = true; cause(c, 'Cúp điện, ngồi chờ mãi không có máy chơi'); }
        if (c.sat <= 0 || c.darkFor >= C.DARK_GIVEUP) leave(pc, 'dark');
      }
      continue;
    }

    if (R.hot && c.remaining > 0 && (c.heatLoss || 0) < C.HEAT_MAX_LOSS) {
      const d = Math.min(c.sat, C.HEAT_SAT_DRAIN * dt);
      c.sat -= d;
      c.heatLoss = (c.heatLoss || 0) + d;
      c.ev.hot = (c.ev.hot || 0) - d;
      if (!c.hotNoted) { c.hotNoted = true; cause(c, `Quán nóng ${Math.round(R.temp)}°C, mồ hôi nhễ nhại`); }
    }

    if (netOver && c.remaining > 0 && (c.pingLoss || 0) < C.PING_MAX_LOSS) {
      const d = Math.min(c.sat, C.PING_SAT_DRAIN * dt * careOf(c, 'pc', -1));
      c.sat -= d;
      c.pingLoss = (c.pingLoss || 0) + d;
      c.ev.ping = (c.ev.ping || 0) - d;
      if (!c.pingNoted) { c.pingNoted = true; cause(c, 'Mạng giật, ping nhảy loạn'); }
    }

    if (c.remaining > 0) {
      c.remaining -= gh;
      if (!gridOut()) R.led.power += TIERS[pc.tier].power * gh;   // chạy máy phát thì tính vào tiền xăng
      if (Math.random() < smashRate(c) * gh) smash(pc, c);
      if (canNoise(c) && Math.random() < C.NOISE_PER_HOUR * gh) startNoise(pc);
      if (c.thief) {
        c.playT += gh;
        if (!c.shifty && c.playT >= c.stealAfter / 2) c.shifty = true;
        if (c.playT >= c.stealAfter) { steal(pc); continue; }
      }
      if (Math.random() < breakRate * gh) {
        pc.broken = true;
        pc.brokeFor = pc.breakLoss = 0;
        log(`💥 Máy ${pc.i + 1} bị treo!`);
      }
    }
    if (c.wantsOrder && !c.ordered && c.remaining <= c.orderAt) createOrder(pc);
    // hết giờ nhưng còn chờ đồ ăn thì ngồi đợi (khách rụt rè chưa dám gọi thì thôi, về luôn)
    if (c.remaining <= 0 && (!c.order || c.order.hidden)) leave(pc, 'done');
  }

  updateNoise(dt);
  updateMom(gh);
  updateEscape(dt);

  const anyone = R.queue.length || R.pcs.some(p => p.cust);
  if (R.time >= C.CLOSE_HOUR || (R.time >= C.LAST_ENTRY_HOUR && !anyone)) endDay();
  else if (!modal) openStaffTask(nextStaffTask(true));
}

function tick(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (hold) hold.target[hold.prop] = Math.min(hold.max, hold.target[hold.prop] + hold.rate * dt);
  if (R && !R.over && !R.paused) update(dt);
  if (R && !R.over) renderPlay(R.paused ? 0 : dt);
  if (modal && modal.update) modal.update();
  requestAnimationFrame(tick);
}

// ---------- Vẽ màn chơi ----------
// Cảnh quán (play-scene.js) vẽ máy, khách, chủ quán; ở đây chỉ nối dữ liệu và chỗ bấm.
function buildFloor() {
  const k = n => money(n).replace(',0', '');
  PlayScene.start({
    shopName: S.shopName,
    staffCount: S.staff.length,
    hot: S.hot, hotName: GAMES[S.hot].name,   // TV treo tường chiếu game đang hot
    // đồ đạc theo nâng cấp: quạt/máy lạnh, router + dây mạng, ổ điện/UPS
    decor: { ac: !!S.upgrades.ac, inverter: !!S.upgrades.inverter, ups: !!S.upgrades.ups, net: NET_PLANS.findIndex(p => p.id === S.net) },
    prices: [
      ['Thường', k(TIERS[1].rate) + '/h'], ['Pre', k(TIERS[2].rate) + '/h'], ['VIP', k(TIERS[3].rate) + '/h', '#FFD66B'],
      ['Mì trứng', k(ITEMS.mi.price + ITEMS.trung.price), '#FFB199'],
    ],
  });
  // chữ bay (tiền, lời khách) bám theo máy trong cảnh
  for (const pc of R.pcs) pc.el = { get root() { return PlayScene.anchor(pc.i); } };
}

// Bấm khách ở cửa (thẻ bên dưới hoặc người trong cảnh): mở quầy nạp giờ cho khách đó
function onQueueClick(c, target) {
  if (!R || R.over || !R.queue.includes(c)) return;
  if (c.lost) return fx(target, 'Quán chưa cài game này', 'warn');
  if (!powered()) return fx(target, S.upgrades.gen ? 'Cúp điện — nổ máy phát trước đã' : 'Cúp điện, chưa mở máy được', 'warn');
  if (c.staffProposal != null && availableStaff()) return openStaffApproval(c);
  if (!c.asked) {   // khách rụt rè: bấm vào hỏi thì mới nói cần gì
    c.asked = true;
    fx(target, 'Dạ… em cần…', 'good');
  }
  if (modal && modal.checkin === c) return closeModal();
  openCheckin(null, c);
}

function openStaffApproval(c) {
  const pc = R.pcs[c.staffProposal];
  if (!pc || pc.cust || pc.dirty || pc.m.wear <= 0 || pc.m.missing) return;
  c.atCounter = true;
  const lower = pc.tier < c.tier;
  openModal({ title: '🧑‍🍳 Nhân viên xin ý kiến',
    body: `<p><b>${esc(c.name)}</b> cần <b>${TIERS[c.tier].name}</b>, nhưng hiện chỉ còn máy <b>${pc.i + 1} · ${TIERS[pc.tier].name}</b>.</p>
      <p class="${lower ? 'warn' : 'note'}">${lower ? 'Máy yếu hơn nhu cầu, khách có thể bực và chỉ trả giá máy này.'
        : 'Máy xịn hơn nhu cầu; khách chỉ trả theo hạng đã yêu cầu.'}</p>
      <p>Cho nhân viên dẫn khách vào máy này? Bạn vẫn tự nạp giờ sau đó.</p>`,
    actions: [
      { label: 'Để khách chờ', cls: 'ghost', onClick: closeModal },
      { label: 'Tự chọn máy', cls: 'ghost', onClick: () => { closeModal(); openCheckin(null, c); } },
      { label: `Đồng ý máy ${pc.i + 1}`, cls: 'primary', onClick: () => {
        closeModal();
        if (!approveStaffSeat(c, pc)) updateStaff(0);
      } },
    ],
    onClose: () => { c.atCounter = false; renderQueue(); },
  });
}

// Việc nhân viên chuyển thẳng tới quầy của chủ; nút dưới cửa mở lại việc đã đóng.
function nextStaffTask(automatic = false) {
  if (!R || R.over) return null;
  for (const pc of R.pcs) {
    const c = pc.cust;
    if (c?.staffId && c.order && !c.order.hidden && (!automatic || !c.order.staffPrompted))
      return { type: 'order', pc, label: `🍳 Làm đơn máy ${pc.i + 1}` };
  }
  for (const pc of R.pcs) {
    const c = pc.cust;
    if (c?.awaitingLoad && (!automatic || !c.staffLoadPrompted))
      return { type: 'load', pc, label: `⏱️ Nạp giờ máy ${pc.i + 1}` };
  }
  for (const c of R.queue) {
    if (c.staffProposal != null && (!automatic || !c.staffProposalPrompted))
      return { type: 'approval', c, label: `⚠️ Duyệt máy cho ${c.name}` };
  }
  return null;
}
function openStaffTask(task) {
  if (!task || modal || R.over) return;
  if (task.type === 'order') {
    task.pc.cust.order.staffPrompted = true;
    openKitchen(task.pc);
  } else if (task.type === 'load') {
    task.pc.cust.staffLoadPrompted = true;
    openCheckin(task.pc, task.pc.cust);
  } else {
    task.c.staffProposalPrompted = true;
    openStaffApproval(task.c);
  }
}

function renderQueue() {
  if (!R) return;
  const q = $('#queue');
  q.innerHTML = '';
  $('#queue-count').textContent = R.queue.length ? `(${R.queue.length}/${C.QUEUE_MAX})` : '';
  if (!R.queue.length) { q.appendChild(el('div', 'empty', 'Chưa có khách… Cậu Vàng đang ngủ 💤')); return; }
  for (const c of R.queue) {
    const card = el('button', 'cust' + (R.selected === c ? ' selected' : '') + ` want-${c.tier}` +
      (c.lost ? ' lost' : '') + (c.shown ? '' : ' enter'));
    c.shown = true;
    const face = c.look ? faceSVG(c, c.lost ? 'hungry' : 'idle') : `<div class="avatar">${c.avatar}</div>`;
    card.innerHTML = c.lost
      ? `${face}<div class="req"><b>${esc(c.name)}</b><span>❌ Chưa có ${gameIcon(c.game)}</span></div>
        <div class="patience"><i></i></div>`
      : `${face}<div class="req"><b>${esc(c.name)}${knownIcon(c) ? ' ' + knownIcon(c) : ''}</b>
          ${c.staffProposal != null ? `<span class="cust-shy">⚠️ Nhân viên xin duyệt máy ${c.staffProposal + 1}</span>` : c.asked
            ? `<span>${TIERS[c.tier].icon} ${TIERS[c.tier].short} · ${durText(c.hours)}</span>`
            : `<span class="cust-shy">❔ Bấm để hỏi</span>`}
          ${c.regId ? `<span class="cust-reg">🔁 Lần ${c.visitNo}${c.favPc != null && c.favPc < R.pcs.length ? ` · ❤️ Máy ${c.favPc + 1}` : ''}</span>` : ''}</div>
        <div class="patience"><i></i></div>`;
    if (c.greet && !c.lost) card.title = c.greet;
    card.dataset.cid = c.id;
    c.bar = card.querySelector('.patience i');
    q.appendChild(card);
  }
}

function renderPlay(dt = 0) {
  setText($('#hud-day'), dayText());
  setText($('#hud-clock'), clockText(R.time));
  setText($('#hud-money'), money(S.money));
  setText($('#hud-rating'), S.rating.toFixed(1));
  $('#hud-money').classList.toggle('neg', S.money < 0);

  renderInfra();
  const pendingLoad = R.pcs.filter(p => p.cust?.awaitingLoad).length;
  const approvals = R.queue.filter(c => c.staffProposal != null).length;
  const busy = R.pcs.filter(p => p.cust && p.cust.order && !p.cust.order.hidden).length;
  const broken = R.pcs.filter(p => p.broken && p.repair <= 0).length;
  const noisy = R.pcs.filter(p => p.cust?.noisy).length;
  const missing = R.pcs.filter(p => p.m.missing).length;
  const dark = !powered();
  setText($('#floor-hint'), R.escape ? `🦹 CÓ TRỘM! Bấm ngay máy ${R.escape.pc.i + 1} để bắt!`
    : dark ? (S.upgrades.gen ? '⚡ Cúp điện! Bấm 🛢️ ở thanh trên để nổ máy phát.' : '⚡ Cúp điện! Khách đang ngồi chờ có điện…')
    : pendingLoad ? `⏱️ ${pendingLoad} khách đã vào máy — bạn nạp giờ tại quầy.`
    : approvals ? `⚠️ ${approvals} khách cần bạn duyệt máy khác nhu cầu.`
    : broken ? `💥 ${broken} máy đang treo — bấm vào máy để sửa!`
    : noisy ? '📢 Có khách làm ồn — bấm vào máy có 📢 để nhắc nhở.'
    : missing && !R.queue.length ? `🦹 ${missing} máy bị trộm mất đồ, chưa dùng được — sáng mai mua lại ở tab Nâng máy.`
    : busy ? `📝 ${busy} phiếu gọi món — làm đồ tại quầy${S.staff.length ? ', rồi giao nhân viên mang ra' : ' và mang ra'}`
    : R.time >= C.LAST_ENTRY_HOUR ? '🌙 Sắp đóng cửa — không nhận khách mới.'
    : R.queue.length ? (S.staff.length ? 'Nhân viên đang tìm máy đúng nhu cầu cho khách.' : 'Bấm khách đang chờ để tự nạp giờ.') : '');
  const staffTask = nextStaffTask();
  const staffBtn = $('#staff-task-btn');
  staffBtn.hidden = !staffTask;
  if (staffTask) setText(staffBtn, staffTask.label);

  PlayScene.frame({
    time: R.time, pcs: R.pcs, queue: R.queue, selected: R.selected, pick: R.pick,
    cooking: modal && modal.docked && modal.pc ? modal.pc.i : null,
    paused: R.paused, repairSeconds: C.REPAIR_SECONDS, dark,
  }, dt);

  for (const c of R.queue) {
    if (!c.bar) continue;
    const f = c.patience / c.patienceMax;
    c.bar.style.width = f * 100 + '%';
    c.bar.className = f < 0.3 ? 'low' : f < 0.6 ? 'mid' : '';
  }
}

// Thanh hạ tầng dưới HUD: nhiệt độ + nút điều hòa, tải mạng, điện (cúp điện thì có nút máy phát)
let infraKey = '';
function renderInfra() {
  const temp = Math.round(R.temp), out = gridOut(), cap = netCap();
  const soon = R.outage && R.outage.planned && !out && R.time < R.outage.from;
  const staffed = R.pcs.filter(p => p.cust && p.cust.staffId).length;
  const key = [temp, R.hot, S.upgrades.ac, R.acOn, powered(), R.running, cap, out, R.genOn, S.upgrades.gen, soon, staffed].join('|');
  if (key === infraKey) return;
  infraKey = key;
  const pill = (cls, html) => `<span class="ipill ${cls}">${html}</span>`;
  const btn = (id, cls, html) => `<button class="ipill btn-i ${cls}" data-infra="${id}">${html}</button>`;
  let h = pill(R.hot ? 'bad' : temp >= C.HOT_TEMP - 2 ? 'warn' : '', `🌡️ ${temp}°C`);
  if (S.upgrades.ac) h += btn('ac', R.acOn ? (powered() ? 'on' : 'off') : 'off', `❄️ ${R.acOn ? 'Đang bật' : 'Đang tắt'}`);
  h += pill(R.running > cap ? 'bad' : R.running === cap ? 'warn' : '', `📶 ${R.running}/${cap} máy${S.netCut ? ' · bị cắt mạng' : ''}`);
  if (S.staff.length) h += pill('', `🧑‍🍳 ${staffed}/${S.staff.length * C.STAFF_PCS} máy`);
  if (out) h += S.upgrades.gen ? btn('gen', R.genOn ? 'on' : 'bad blink', R.genOn ? '🛢️ Máy phát đang chạy · Tắt' : '⚡ Cúp điện · 🛢️ Nổ máy phát')
    : pill('bad blink', '⚡ Cúp điện');
  else if (soon) h += pill('warn', `⚡ Cúp lúc ${clockText(R.outage.from)}`);
  $('#infra').innerHTML = h;
}

const sceneHandlers = {
  pc: i => { if (R && R.pcs[i]) onPcClick(R.pcs[i]); },
  bubble: i => {
    const pc = R && R.pcs[i];
    if (!pc || R.over) return;
    if (pc.cust && pc.cust.order) openKitchen(pc); else onPcClick(pc);
  },
  cust: id => { const c = R && R.queue.find(x => x.id === id); if (c) onQueueClick(c, $('#scene')); },
};

// ---------- Hết ngày ----------
function endDay() {
  if (R.escape) { R.escape.left = 0; updateEscape(0); }
  R.over = true;
  stopHold();
  SFX.play('close');
  SFX.setMood('calm');
  VFX.shutter('down');
  SFX.duck(false);
  if (modal) closeModal();
  for (const pc of R.pcs) if (pc.cust) {
    if (pc.cust.awaitingLoad) leaveUnloaded(pc); else leave(pc, 'close');
  }
  R.queue = [];
  R.selected = null;
  renderQueue();
  renderPlay();

  const led = R.led;
  // mặt bằng, mạng, điện: ghi vào hóa đơn tuần · xăng máy phát: trả tiền mặt ngay
  const costs = { rent: rentCost(), net: netPlan().daily, power: round500(led.power), acPower: round500(led.acPower), fuel: round500(led.fuel), staff: S.staff.reduce((n, p) => n + p.wage, 0) };
  S.money -= costs.fuel + costs.staff;
  led.staff = costs.staff;

  S.pendingPolice += R.reports;   // tin báo công an chưa kịp tới → sáng mai tới
  S.pendingKid += R.kidReports;
  R.reports = R.kidReports = 0;
  const day = S.day;
  S.day++;
  const books = closeBooks(day, costs);
  S.forecast = clamp(Math.round(S.forecast + rand(-3, 3)), ...C.FORECAST);
  S.outageNext = planOutage();
  // Hàng qua hạn không tự bỏ nữa: chủ quán tự quyết giữ hay bỏ. Quá lâu thì hư hẳn.
  const newlyExpired = [], spoiled = [];
  for (const k in S.inv) {
    let nw = 0, sp = 0;
    S.inv[k] = S.inv[k].filter(b => {
      const p = daysPast(b);
      if (p > C.EXPIRED_KEEP_DAYS) { sp += b.qty; return false; }
      if (p === 1) nw += b.qty;
      return true;
    });
    if (nw) newlyExpired.push({ k, qty: nw });
    if (sp) spoiled.push({ k, qty: sp });
  }
  S.lastAsked = led.lost;
  pickHotGame();
  const bankrupt = S.money < C.BANKRUPT_AT || books.evicted;
  // Phá sản không xóa bản lưu: giữ bản buổi sáng của ngày này để còn "Thử lại ngày này".
  if (!bankrupt) saveGame();
  showSummary({ led, costs, books, newlyExpired, spoiled, day, bankrupt });
}

// Sổ sách cuối ngày (gọi sau khi đã sang ngày mới): phạt hóa đơn trễ, chốt hóa đơn tuần, lãi vay, đòi nợ.
// Trả về { news: [[lớp, chữ]], interest, evicted }
function closeBooks(day, costs) {
  const news = [];
  let evicted = false;
  autoPayBill(news);   // còn hóa đơn cũ chưa trả mà đủ tiền: trả luôn, khỏi bị phạt hay mất mặt bằng
  const d = S.dueBill;
  if (d) {
    const late = day - d.dueDay;
    if (late > 0) {
      const fee = round1k(d.base * C.LATE_FEE);
      d.fee += fee;
      news.push(['bad', `⏰ Hóa đơn đã trễ ${late} ngày, bị phạt thêm ${money(fee)}. Trả ở tab Hóa đơn sáng mai.`]);
      if (late >= C.CUT_AFTER && !S.netCut) {
        S.netCut = true;
        news.push(['bad', '📵 Nhà mạng cắt mạng vì nợ cước! Máy nào chạy cũng giật cho tới khi trả hóa đơn.']);
      }
      if (late >= C.EVICT_AFTER) evicted = true;
    }
  }
  const b = S.bill;
  b.rent += costs.rent;
  b.net += costs.net;
  b.power += costs.power + costs.acPower;
  b.days++;
  if (b.days >= C.BILL_DAYS) {
    const total = b.rent + b.net + b.power;
    if (S.dueBill) S.dueBill.base += total;   // hóa đơn cũ chưa trả: gộp chung
    else S.dueBill = { base: total, fee: 0, dueDay: S.day + C.BILL_GRACE - 1 };
    news.push(['warn', `🧾 Chốt hóa đơn tuần: <b>${money(total)}</b> (mặt bằng ${money(b.rent)} · điện ${money(b.power)}${b.net ? ` · mạng ${money(b.net)}` : ''}). Hạn trả: hết ngày ${S.dueBill.dueDay}.`]);
    S.bill = { rent: 0, net: 0, power: 0, days: 0 };
    autoPayBill(news);
  }
  let interest = 0;
  for (const [k, rate] of [['bank', C.BANK_RATE], ['shark', C.SHARK_RATE]]) {
    if (!S.loans[k]) continue;
    const i = Math.max(1000, round1k(S.loans[k] * rate));
    S.loans[k] += i;
    interest += i;
  }
  if (S.loans.shark > 0) {
    S.sharkDays++;
    if (S.sharkDays > C.SHARK_DUE_DAYS) {
      S.rating = clamp(S.rating - C.SHARK_RATING_HIT, 1, 5);
      news.push(['bad', '💀 Người cho vay nóng tới quán đòi nợ, khách thấy sợ (đánh giá giảm). Trả hết nợ nóng đi!']);
    }
  } else S.sharkDays = 0;
  if (evicted) news.push(['bad', '🏚️ Nợ tiền mặt bằng quá lâu, chủ nhà lấy lại mặt bằng.']);
  return { news, interest, evicted };
}

// ---------- Bảng nhận xét cuối ngày ----------
// Ba phần: khách khen gì · khách khó chịu vì gì · vài khách đáng nhớ (bấm để xem nguyên nhân).
function boardHTML(visits) {
  const seen = visits.filter(v => !v.lost);   // khách hỏi game chưa có đã có dòng riêng
  if (!seen.length) return '';
  // gom khách theo sự việc: khen (điểm ≥ 3) hoặc chê (điểm ≤ -3)
  const group = sign => {
    const m = {};
    for (const v of seen) for (const [k, d] of Object.entries(v.ev)) {
      if (CLAUSES[k] && d * sign >= 3) (m[k] = m[k] || []).push(v);
    }
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  };
  const segNote = vs => {
    if (vs.length < 2) return '';
    const cnt = {};
    for (const v of vs) cnt[v.seg] = (cnt[v.seg] || 0) + 1;
    const [seg, n] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    if (seg === 'vanglai' || n < 2 || n * 2 < vs.length) return '';
    return ` <span class="muted">· ${n === vs.length ? 'đều' : n + ' người'} là ${SEGMENTS[seg].short}</span>`;
  };
  const praise = group(1), gripes = group(-1);
  const gripeCount = Object.fromEntries(gripes.map(([k, vs]) => [k, vs.length]));
  const li = (k, vs, verb) => `<li><b>${vs.length} khách</b> ${verb} ${CLAUSES[k]}${segNote(vs)}</li>`;
  const list = (items, empty) => items.length ? `<ul>${items.join('')}</ul>` : `<p class="muted small">${empty}</p>`;

  // khách đáng nhớ: sự việc càng mạnh càng nổi; mỗi người một chuyện khác nhau
  const score = v => Math.max(0, ...Object.values(v.ev).map(Math.abs))
    + (v.trait !== 'thuong' ? 5 : 0) + (v.seg !== 'vanglai' ? 5 : 0)
    + (v.ev.again || v.ev.better ? 12 : 0) + (v.reg && !v.reg.isNew ? 4 : 0);
  const sorted = [...seen].sort((a, b) => score(b) - score(a));
  const picks = [], keys = new Set();
  for (const v of sorted) {
    if (picks.length >= C.BOARD_MEMO) break;
    if (!keys.has(v.key)) { keys.add(v.key); picks.push(v); }
  }
  const happy = sorted.find(v => v.stars >= 4);
  if (happy && !picks.some(v => v.stars >= 4)) {
    if (picks.length < C.BOARD_MEMO) picks.push(happy); else picks[picks.length - 1] = happy;
  }

  // "Lần tới": chỉ gợi ý chuyện còn mới với người chơi, hoặc đang lặp lại nhiều trong ngày
  const hinted = new Set();
  const hintFor = v => {
    if (v.stars >= 4) return '';
    const worst = Object.entries(v.ev).filter(([k, d]) => d < 0 && HINTS[k]).sort((a, b) => a[1] - b[1])[0];
    if (!worst) return '';
    const k = worst[0];
    const text = TRAIT_HINTS[v.trait]?.[k] || SEGMENTS[v.seg].hints?.[k] || HINTS[k];
    if (hinted.has(text) || ((S.hintSeen[k] || 0) >= 3 && (gripeCount[k] || 0) < 3)) return '';
    hinted.add(text);
    S.hintSeen[k] = (S.hintSeen[k] || 0) + 1;
    return `<p class="memo-next">💡 Lần tới: ${esc(text)}</p>`;
  };
  const memo = v => {
    const who = [v.seg !== 'vanglai' ? SEGMENTS[v.seg].name : '', TRAITS[v.trait].name].filter(Boolean).join(' · ');
    const r = v.reg;
    const regTag = !r ? '' : r.isNew ? '<span class="reg-tag new">🆕 Khách mới</span>'
      : `<span class="reg-tag">🔁 Lần ${r.n}</span>`;
    const aff = !r ? '' : r.gone ? ' · <span class="intent bad">🚪 Đã chuyển quán</span>'
      : Math.abs(r.delta) >= 1 ? ` · Thiện cảm <span class="intent ${r.delta > 0 ? 'good' : 'bad'}">${r.delta > 0 ? '▲' : '▼'}${Math.round(Math.abs(r.delta))}</span>` : '';
    const it = intentOf(v.sat);
    const cnt = new Map();
    for (const t of v.causes) cnt.set(t, (cnt.get(t) || 0) + 1);
    const why = [...cnt].map(([t, n]) => `<li>${esc(t)}${n > 1 ? ` ×${n}` : ''}</li>`).join('')
      || '<li>Không có gì đặc biệt</li>';
    return `<details class="memo s${v.stars}">
      <summary><span class="memo-av">${v.avatar}</span>
        <div class="memo-main">
          <div class="memo-head"><b>${esc(v.name)}</b>${regTag}${who ? `<small>${esc(who)}</small>` : ''}</div>
          <q>${esc(v.text)}</q>
          <div class="memo-meta"><span class="intent ${it.cls}">${it.t}</span>${aff}${v.posted ? ` · 📍 đăng ${v.posted}★ lên Google Maps` : ''}</div>
        </div></summary>
      <ul class="memo-why">${why}</ul>${hintFor(v)}
    </details>`;
  };

  return `<div class="board">
    <div class="board-cols">
      <div class="board-col up"><h4>👍 Khách khen</h4>
        ${list(praise.map(([k, vs]) => li(k, vs, 'hài lòng vì')), 'Chưa có gì nổi bật.')}</div>
      <div class="board-col down"><h4>👎 Khách khó chịu</h4>
        ${list(gripes.map(([k, vs]) => li(k, vs, k === 'walkout' ? 'bỏ về vì' : 'khó chịu vì')), 'Không ai phàn nàn gì. Tuyệt!')}</div>
    </div>
    <h4>💬 Khách đáng nhớ <span class="muted small">· bấm vào để xem vì sao</span></h4>
    <div class="memo-list">${picks.map(memo).join('')}</div>
    ${regularsLine()}
  </div>`;
}

// Một dòng tóm tắt khách quen hôm nay: ai quay lại, ai mới, ai bỏ sang quán khác
function regularsLine() {
  const L = R.led;
  const parts = [];
  if (L.returning) parts.push(`<b>${L.returning}</b> lượt khách quen ghé lại`);
  if (L.newFaces) parts.push(`<b>${L.newFaces}</b> khách mới`);
  let s = parts.length ? `<p class="small">📒 Hôm nay: ${parts.join(' · ')}.</p>` : '';
  if (L.gone.length) s += `<p class="warn">🚪 Chuyển sang quán khác vì bị bỏ bê nhiều lần: ${L.gone.map(esc).join(', ')}.</p>`;
  return s;
}

// Bảng thu chi chia 3 nhóm: thu · chi tiền mặt trong ngày · ghi vào hóa đơn tuần (chưa phải trả ngay)
function ledgerHTML(led, costs, interest) {
  const row = (l, v, cls = '') => `<div class="sum-row ${cls}"><span>${l}</span><b>${v}</b></div>`;
  const plus = n => '+' + money(n), minus = n => '-' + money(n);
  const income = led.hours + led.food + led.tips + (led.thiefCash || 0);
  const cash = [['🧑‍🍳 Lương nhân viên', costs.staff], ['🛢️ Xăng máy phát', costs.fuel], ['💸 Hoàn tiền giờ vì cúp điện', led.refund], ['🚨 Tiền phạt', led.fine], ['🏦 Lãi vay', interest]]
    .filter(([, v]) => v);
  const billed = [['⚡ Điện chạy máy', costs.power], ['❄️ Điện điều hòa', costs.acPower], ['🏠 Mặt bằng & bảo trì', costs.rent], ['📶 Tiền mạng', costs.net]]
    .filter(([, v], i) => v || i === 0 || i === 2);
  const out = [...cash, ...billed].reduce((s, [, v]) => s + v, 0);
  const profit = income - out;
  const group = (title, sum, rows, cls) => `<details class="sum-group ${cls}"><summary>${row(title, sum, cls)}</summary>${rows}</details>`;
  return `<div class="sum-block">
    ${group('💰 Thu', plus(income), row('⏱️ Tiền giờ chơi', plus(led.hours)) + row('🍜 Bán đồ ăn uống', plus(led.food)) + row('💝 Tiền tip', plus(led.tips)) + (led.thiefCash ? row('🦹 Thưởng / bắt đền trộm', plus(led.thiefCash)) : ''), 'up')}
    ${cash.length ? group('💵 Chi tiền mặt', minus(cash.reduce((s, [, v]) => s + v, 0)), cash.map(([l, v]) => row(l, minus(v))).join(''), 'down') : ''}
    ${group('🧾 Ghi vào hóa đơn tuần', minus(billed.reduce((s, [, v]) => s + v, 0)), billed.map(([l, v]) => row(l, minus(v))).join(''), 'down')}
    ${row(profit >= 0 ? 'Lãi hôm nay' : 'Lỗ hôm nay', (profit >= 0 ? '+' : '') + money(profit), 'total ' + (profit >= 0 ? 'up' : 'down'))}
    <p class="muted small">Bấm vào từng nhóm để xem chi tiết. Hóa đơn tuần đang cộng dồn <b>${money(S.bill.rent + S.bill.net + S.bill.power)}</b>${S.bill.days ? `, chốt sau ${C.BILL_DAYS - S.bill.days} ngày` : ''}.</p>
  </div>`;
}
// Ghi chú hạ tầng trong ngày (nóng, mạng, cúp điện, phím) + tin về ngày mai
function infraNotes(led) {
  const p = [];
  if (led.hotHours >= 1) p.push(['warn', `🌡️ Quán nóng quá ${C.HOT_TEMP}°C suốt ${Math.round(led.hotHours)} giờ — máy dễ treo, khách mau bực.${S.upgrades.ac ? ' Nhớ bật điều hòa lúc trưa.' : ' Cân nhắc lắp điều hòa.'}`]);
  if (led.pingHours >= 1) p.push(['warn', `📶 Mạng quá tải ${Math.round(led.pingHours)} giờ — cân nhắc nâng gói mạng.`]);
  if (led.outages) p.push(['warn', `⚡ Cúp điện ${Math.round(led.darkHours * 10) / 10 || 0} giờ không có điện chạy máy${led.refund ? `, hoàn tiền giờ ${money(led.refund)}` : ''}.`]);
  if (led.smashes) p.push(['warn', `💢 Khách đập phím ${led.smashes} lần.`]);
  if (led.thefts.length) p.push(['bad', `🦹 Bị trộm: ${led.thefts.map(t => `${PARTS[t.part].icon} ${partName(t.part)} máy ${t.pc}`).join(', ')} — mua lại ở tab Nâng máy.${S.upgrades.camera ? '' : ' Camera giúp bắt trộm dễ hơn.'}`]);
  if (led.caught) p.push(['note', `🙌 Bắt được trộm ${led.caught} lần, lấy lại đồ.`]);
  if (led.mom.length) {
    const hid = led.mom.filter(m => m.choice === 'hide' && m.ok).length;
    p.push(['warn', `👩 Mẹ gank ${led.mom.length} lần${hid ? ` · giấu được ${hid}` : ''}: ${led.mom.map(m => m.name).join(', ')}.`]);
  }
  if (led.noise) p.push(['warn', `📢 Khách làm ồn ${led.noise} lần${led.kicked ? ` · mời về ${led.kicked} người` : ''}.${S.upgrades.headphone ? '' : ' Tai nghe chống ồn giúp khách ngồi cạnh đỡ khó chịu.'}`]);
  const worn = S.machines.map((m, i) => m.wear <= 0 ? i + 1 : 0).filter(Boolean);
  if (worn.length) p.push(['bad', `⌨️ Phím chuột hỏng ở máy ${worn.join(', ')} — sửa ở tab Nâng máy sáng mai.`]);
  const f = S.forecast, o = S.outageNext;
  p.push(['note', `🌤️ Ngày mai trời ${f}°C${f + 1 >= C.HOT_TEMP ? ' — nóng' : ''}.${o ? ` ⚡ <b>Có lịch cúp điện ${clockText(o.from)}–${clockText(o.to)}</b>.` : ''}`]);
  return p;
}

function showSummary({ led, costs, books, newlyExpired, spoiled, day, bankrupt }) {
  const itemList = list => list.map(e => `${ITEMS[e.k].icon} ${e.qty} ${ITEMS[e.k].name}`).join(', ');
  const avg = led.served ? Math.round(led.satSum / led.served) : 0;
  const dr = S.rating - led.ratingBefore;
  const lostList = Object.entries(led.lost).sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${gameIcon(id)} ×${n}`).join(', ');
  const reviewsBlock = boardHTML(led.visits)
    + (led.reviews.length ? `<p class="muted small">📍 Hôm nay có ${led.reviews.length} đánh giá mới trên Google Maps.</p>` : '');
  if (!bankrupt) saveGame();   // lưu số lần đã hiện gợi ý "Lần tới"
  const notes = [...books.news, ...(bankrupt ? [] : infraNotes(led))]
    .map(([cls, t]) => `<p class="${cls}">${t}</p>`).join('');
  const debt = S.loans.bank + S.loans.shark;
  const body = `
    ${ledgerHTML(led, costs, books.interest)}
    <div class="sum-stats">
      <div><b>${led.served}</b><span>khách phục vụ</span></div>
      <div><b>${led.walkouts}</b><span>khách bỏ về</span></div>
      <div><b>${avg}%</b><span>hài lòng TB</span></div>
      <div><b>${S.rating.toFixed(1)}★</b><span>${dr >= 0 ? '▲' : '▼'} ${Math.abs(dr).toFixed(2)}</span></div>
    </div>
    ${reviewsBlock}
    ${notes}
    ${lostList ? `<p class="warn">🎮 Khách tìm game quán chưa có: ${lostList}</p>` : ''}
    ${led.staffMistakes ? `<p class="warn">📝 Nhân viên ghi sai ${led.staffMistakes} đơn hôm nay. Có thể tăng lương hoặc training vào buổi sáng.</p>` : ''}
    ${bankrupt ? '' : `<p class="note">🔥 Ngày mai đang hot: <b>${gameIcon(S.hot)}</b>${S.installed[S.hot] ? ' (quán có sẵn)' : ' — quán chưa cài!'}</p>`}
    ${led.sick ? `<p class="warn">🤢 ${led.sick} khách bị đau bụng vì đồ hết date!</p>` : ''}
    ${(S.pendingPolice || S.pendingKid) && !bankrupt ? `<p class="warn">📞 Có người đã báo công an — sáng mai công an sẽ tới kiểm tra!</p>` : ''}
    ${newlyExpired.length ? `<p class="warn">☠️ Vừa hết date: ${itemList(newlyExpired)}. Sáng mai bỏ đi, hoặc giữ lại bán tiếp (khách có thể đau bụng!).</p>` : ''}
    ${spoiled.length ? `<p class="warn">🗑️ Hư hẳn, phải bỏ: ${itemList(spoiled)}</p>` : ''}
    <p>Tiền hiện có: <b class="${S.money < 0 ? 'neg' : ''}">${money(S.money)}</b>${S.dueBill ? ` · Hóa đơn chưa trả: <b class="neg">${money(dueTotal())}</b>` : ''}${debt ? ` · Đang vay: <b>${money(debt)}</b>` : ''}</p>
    ${bankrupt ? `<p class="warn">💸 ${books.evicted ? 'Mất mặt bằng' : 'Quán nợ quá nhiều'} nên phải đóng cửa. Bản lưu cũ vẫn còn: thử lại ngày ${day} (trả hóa đơn, vay thêm cho kịp) hoặc chơi lại từ đầu.</p>`
      : S.money < 0 ? `<p class="warn">⚠️ Bạn đang nợ! Nợ quá ${money(-C.BANKRUPT_AT)} là phá sản.</p>` : ''}`;
  openModal({
    title: bankrupt ? `💸 ${esc(S.shopName)} phá sản rồi…` : `🌙 ${esc(S.shopName)} · hết ngày ${day}`,
    body, cls: 'modal-summary', dismissable: false,
    actions: bankrupt ? [
      { label: 'Chơi lại từ đầu', cls: 'ghost', onClick: () => { closeModal(); newGame(S.shopName); saveGame(); showPrep(); } },
      { label: `Thử lại ngày ${day} ↩️`, cls: 'primary', onClick: () => {
        const s = loadGame();
        if (!s) { closeModal(); newGame(S.shopName); saveGame(); return showPrep(); }
        closeModal(); S = s; normalizeSave(); showPrep();
      } }]
      : [{ label: 'Sang ngày mới ☀️', cls: 'primary', onClick: () => { closeModal(); showPrep(); } }],
  });
}

// ---------- Hướng dẫn ----------
function openHowTo() {
  const playing = R && !R.over;
  const wasPaused = playing && R.paused;
  if (playing) setPause(true);
  openModal({
    title: '📖 Cách chơi',
    body: `<ol class="howto">
       <li><b>🚪 Đón khách:</b> nhân viên tự dẫn khách vào máy đúng hạng, sạch và hoạt động tốt; quầy nạp giờ tự hiện để bạn giữ nút hoặc giữ Space. Nếu chỉ còn máy khác nhu cầu, nhân viên tự hỏi ý bạn trước khi dẫn khách vào.</li>
      <li><b>🎮 Game:</b> quán chưa cài game khách muốn thì khách bỏ đi. Buổi sáng xem game nào đang 🔥 hot và mua thêm game trong <i>Thư viện game</i>.</li>
      <li><b>⏱️ Nạp giờ:</b> giữ nút để nạp, thả tay ngay vạch vàng. Nạp dư là cho không, nạp thiếu khách sẽ cáu.</li>
       <li><b>🍜 Gọi đồ:</b> nhân viên nhận đơn ở máy mình phụ trách và quầy bếp tự hiện. Bạn làm món, giữ nút hoặc Space để nấu/rót, rồi giao nhân viên mang ra. Nếu đóng quầy, dùng nút công việc dưới cửa để mở lại. Máy chưa có nhân viên thì bạn tự hỏi khách và mang món.</li>
       <li><b>🧑‍🍳 Nhân viên:</b> mỗi người phụ trách tối đa 3 máy và tự lau bàn trống. Tuyển, chỉnh lương và training ở tab Hóa đơn mỗi sáng. Lương trả cuối ngày; lương cao và training giúp giảm lỗi ghi đơn.</li>
      <li><b>🔧 Sự cố:</b> máy treo thì sửa ngay. Khách về rồi thì 🧹 dọn bàn trước khi xếp người mới.</li>
      <li><b>🏗️ Hạ tầng:</b> thanh dưới đồng hồ cho biết nhiệt độ phòng, mạng và điện. Trời nóng thì bật ❄️ điều hòa (tốn điện). Quán đông quá sức mạng thì khách bị giật lag — nâng gói mạng ở tab <i>Hóa đơn</i>. Cúp điện thì máy tắt: có 🔋 UPS khách kịp lưu game, có 🛢️ máy phát thì bấm nổ máy (tốn xăng). Khách thua hay đập phím, buổi sáng nhớ sửa.</li>
      <li><b>🧾 Tiền nong:</b> mặt bằng, mạng, điện cộng dồn và chốt hóa đơn mỗi 7 ngày — đủ tiền thì game tự trả khi chốt; thiếu tiền thì trễ hạn bị phạt rồi cắt mạng. Thiếu vốn thì vay ngân hàng (lãi thấp) hoặc vay nóng (lãi cao) ở tab <i>Hóa đơn</i>.</li>
      <li><b>🙋 Mỗi khách một kiểu:</b> để ý câu chào ở cửa. Khách <i>đang vội</i> chịu chờ ngắn hơn — xếp máy và làm món cho họ trước. Khách <i>ngại bẩn</i> rất khó chịu với bàn bừa và máy treo. Khách <i>tính kỹ</i> để ý từng phút nạp giờ. Trưa hay có dân văn phòng, chiều có học sinh, tối có game thủ đi rank.</li>
      <li><b>📢 Khách ồn ào:</b> có khách hay hát hò, la hét làm khách ngồi cùng hàng máy khó chịu. Thấy 📢 trên máy thì bấm vào: <i>nhắc nhở</i> (đa số chịu nhỏ tiếng, không được thì còn ồn hơn) hoặc <i>mời về</i> (phải trả lại tiền giờ, khách đó chấm sao thấp). Nhân viên cũng tự đi nhắc.</li>
      <li><b>🦹 Trộm:</b> thỉnh thoảng có kẻ trộm giả làm khách (nạp ít giờ, nói lấp lửng, ngồi một lúc thì lộ 👀). Khi nó gỡ đồ chạy ra cửa, bạn có vài giây để <i>bấm vào máy đó</i> bắt lại. Bắt được thì chọn giao công an (có thưởng), tha (thành khách quen) hay bắt đền. Để thoát thì máy thiếu đồ, sáng mai mua lại. Camera và khóa cáp giúp phòng trộm.</li>
      <li><b>👩 Mẹ gank:</b> học sinh đang chơi có thể bị phụ huynh tới tìm bất cứ lúc nào trong ngày (thấy điện thoại 📱 rung là sắp tới). <i>Giấu giùm</i> thì được lòng học sinh, nhưng trong quán càng nhiều học sinh càng dễ lộ; lộ sau 21h còn có thể bị báo công an. <i>Chỉ chỗ</i> thì mất khách đó nhưng phụ huynh tin quán.</li>
      <li><b>📅 Lịch tuần:</b> Thứ 7, Chủ nhật quán đông hơn, học sinh tới cả buổi sáng. Học sinh đổ về lúc tan trường (trưa và chiều). Mỗi tháng có một tuần thi học kỳ: học sinh gần như không ghé, buổi sáng xem thông báo để nhập hàng cho vừa.</li>
      <li><b>😶 Khách rụt rè:</b> nhân viên sẽ hỏi để biết khách cần máy và muốn gọi món gì. Khi không có nhân viên phụ trách, bấm khách ở cửa hoặc 💭 trên máy để hỏi. Khách khác đang chơi ổn mà bị hỏi nhiều thì thấy phiền.</li>
      <li><b>📒 Khách quen:</b> khách nhớ quán. Lần trước bực chuyện gì sẽ nhắc ở cửa — lặp lại lỗi cũ thì họ khó chịu gấp rưỡi, làm tốt thì thiện cảm tăng. Xếp đúng ❤️ máy quen cũng được lòng. Bị bỏ bê nhiều lần họ sẽ chuyển quán.</li>
      <li><b>💬 Nhận xét cuối ngày:</b> xem khách khen gì, chê gì; bấm vào từng khách để biết vì sao họ vui hay bực.</li>
      <li><b>🛠️ Nâng cấp máy:</b> nâng cả CPU và card đồ họa để lên hạng (Thường → Pre → VIP → Pro Max), khách chơi game nặng và streamer sẽ tìm tới. Chuột, phím, màn hình, bàn ghế xịn làm giá giờ cao hơn và khách vui hơn.</li>
      <li><b>🌙 Cuối ngày:</b> xem thu chi, tiền điện và mặt bằng được ghi vào hóa đơn tuần. Sáng hôm sau nhập hàng (có hạn dùng!), xem dự báo thời tiết, lịch cúp điện và nâng cấp quán.</li>
      <li><b>☠️ Hàng hết date:</b> hàng cận date rẻ một nửa nhưng mau hết hạn. Hàng hết date vẫn bán được nhưng khách có thể đau bụng rồi báo công an — bị phạt nặng!</li>
    </ol>
    <p class="hint">Khách vui thì cho tip và tăng đánh giá ★ — đánh giá càng cao càng đông khách. Phím tắt: giữ <kbd>Space</kbd> để nạp/nấu, <kbd>Esc</kbd> để đóng.</p>`,
    actions: [{ label: 'Hiểu rồi!', cls: 'primary', onClick: () => closeModal() }],
    onClose: () => { if (playing && !wasPaused && R && !R.over) setPause(false); },
  });
}

// ---------- Chuyển bản lưu giữa hai trang / hai máy ----------
// Bộ nén đi kèm trang để máy gửi/nhận không phụ thuộc tính năng trình duyệt.
async function saveCode() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? SaveCode.encode(raw) : '';
}
async function readCode(code) {
  return SaveTransfer.isShort(code) ? SaveTransfer.read(code) : SaveCode.decode(code);
}
async function openTransfer() {
  let code = '';
  let exportError = '';
  try { code = await saveCode(); } catch (e) { exportError = e.message; }
  const body = el('div', 'transfer');
  body.innerHTML = `
    <h4>📤 Gửi quán sang máy khác</h4>
    ${code ? `<p class="hint">Tạo mã 6 ký tự rồi gửi cho máy nhận (nhắn tin, đọc qua điện thoại đều được). Cả hai máy cần internet. Mã dùng trong 24 giờ.</p>
      <button class="btn primary" data-create>Tạo mã 6 ký tự</button>
      <div data-short-result hidden>
        <input class="transfer-short-code" readonly aria-label="Mã chuyển quán 6 ký tự" spellcheck="false">
        <p class="hint" data-expiry></p>
        <button class="btn small" data-copy-short>📋 Chép mã</button>
      </div>
      <p class="hint">Ai có mã đều mở được bản sao quán. Chỉ gửi cho người bạn muốn chia sẻ.</p>
      <details><summary>Mã dài dự phòng · dùng khi không có internet</summary>
        <textarea class="code-box" readonly rows="2" aria-label="Mã quán đang chơi" spellcheck="false" autocapitalize="off" autocorrect="off">${code}</textarea>
        <button class="btn small" data-copy-long>Chép mã dài</button>
      </details>`
      : exportError ? `<p class="bad-text">Chưa lấy được mã: ${esc(exportError)}</p>` : '<p class="hint">Trang này chưa có quán nào để lấy mã.</p>'}
    <h4>📥 Dán mã để mở quán</h4>
    <p class="hint">Quán đang lưu ở trang này (nếu có) sẽ bị thay bằng quán trong mã.</p>
    <textarea class="code-box" data-in rows="2" aria-label="Mã bản lưu cần mở" placeholder="Nhập mã 6 ký tự (vd. K7M-Q2P) hoặc dán mã dài" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
    <p class="hint" data-working role="status" hidden></p>
    <p class="bad-text small" data-err role="alert" hidden></p>`;
  let active = true, busy = false;
  const inputBox = body.querySelector('[data-in]');
  const error = message => {
    const err = body.querySelector('[data-err]'); err.textContent = message; err.hidden = false;
  };
  const working = message => {
    busy = !!message;
    const status = body.querySelector('[data-working]'); status.textContent = message; status.hidden = !message;
    body.querySelectorAll('button,textarea').forEach(b => { b.disabled = busy; });
    m.card.querySelector('[data-import-button]').disabled = busy;
  };
  const m = openModal({
    title: '📦 Chuyển bản lưu', body, cls: 'modal-transfer',
    onClose: () => { active = false; },
    actions: [{ label: 'Đóng', cls: 'ghost', onClick: () => closeModal() },
      { label: 'Mở quán từ mã', cls: 'primary', id: 'transfer-import', onClick: async () => {
        if (busy) return;
        const before = localStorage.getItem(SAVE_KEY);
        working('Đang mở bản lưu…');
        try {
          const s = await readCode(inputBox.value);
          if (!active) return;
          if (localStorage.getItem(SAVE_KEY) !== before) throw new Error('Bản trên máy vừa thay đổi. Đóng rồi mở lại hộp chuyển bản lưu nhé.');
          const previous = S;
          try {
            if (before) localStorage.setItem('quan-net-backup-v1', before);
            S = s; normalizeSave(); CloudSave.save(S);
          } catch (e) { S = previous; throw e; }
          R = null; closeModal(); showPrep();
        } catch (e) { if (active) error(e.message); }
        finally { if (active) working(''); }
      } }],
  });
  m.card.querySelector('#transfer-import').setAttribute('data-import-button', '');
  let shortCode = '';
  const create = body.querySelector('[data-create]');
  if (create) create.addEventListener('click', async () => {
    if (busy) return;
    working('Đang tạo mã 6 ký tự…');
    body.querySelector('[data-err]').hidden = true;
    try {
      const result = await SaveTransfer.create(localStorage.getItem(SAVE_KEY));
      if (!active) return;
      shortCode = result.code;
      body.querySelector('[data-short-result]').hidden = false;
      body.querySelector('.transfer-short-code').value = SaveTransfer.format(shortCode);
      body.querySelector('[data-expiry]').textContent = 'Dùng đến ' + new Date(result.expiresAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) + '.';
      create.textContent = 'Lấy lại mã quán đang lưu';
      body.querySelector('[data-copy-short]').textContent = '📋 Chép mã';
    } catch (e) { if (active) error(e.message); }
    finally { if (active) working(''); }
  });
  const bindCopy = (button, box, value) => {
    if (!button) return;
    button.addEventListener('click', async () => {
      let copied = false;
      const text = value();
      if (navigator.clipboard) {
        try { await navigator.clipboard.writeText(text); copied = true; } catch (_) { /* chọn mã để chép */ }
      }
      if (!copied) {
        box.focus(); box.select(); box.setSelectionRange(0, box.value.length);
        try { copied = document.execCommand('copy'); } catch (_) { /* chép thủ công */ }
      }
      button.textContent = copied ? '✓ Đã chép toàn bộ mã' : 'Chưa chép được — hãy chép đoạn mã đang chọn';
    });
  };
  bindCopy(body.querySelector('[data-copy-short]'), body.querySelector('.transfer-short-code'), () => shortCode);
  bindCopy(body.querySelector('[data-copy-long]'), body.querySelector('details .code-box'), () => code);
  inputBox.addEventListener('input', () => { body.querySelector('[data-err]').hidden = true; });
}

// ---------- Tài khoản và bản lưu trực tuyến ----------
function refreshContinue() {
  const saved = loadGame();
  $('#btn-continue').hidden = !saved;
  $('#btn-continue').innerHTML = saved?.shopName
    ? `Chơi tiếp<small>${esc(saved.shopName)} · ngày ${saved.day}</small>` : 'Chơi tiếp';
}
function acceptCloudSave(before) {
  const after = localStorage.getItem(SAVE_KEY);
  refreshContinue();
  if (before === after) return;
  S = loadGame(); R = null;
  if (S) { normalizeSave(); renderPrep(); }
  else showScreen('title');
}
function openCloud() {
  if (R && !R.over) return;
  const body = el('div', 'cloud-panel');
  body.innerHTML = `<p>Chơi ngay vẫn tự lưu trên máy. Liên kết email để chơi tiếp trên thiết bị khác.</p>
    <p class="cloud-message note" role="status" aria-live="polite"></p>
    <div data-cloud-login>
      <form data-cloud-form><label>Email<input type="email" name="email" autocomplete="email" required placeholder="ban@gmail.com"></label>
        <label>Mật khẩu (ít nhất 6 ký tự)<input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
        <button class="btn primary" type="submit" data-mode="login">Đăng nhập</button>
        <button class="btn" type="submit" data-mode="signup">Tạo tài khoản</button></form>
      <p class="hint">Lần đầu thì bấm "Tạo tài khoản". Nhớ kỹ mật khẩu, quên thì phải nhờ chủ quán đặt lại.</p>
    </div>
    <div data-cloud-account hidden><p data-cloud-email></p>
      <button class="btn primary" data-cloud-sync>Đồng bộ ngay</button>
      <button class="btn ghost" data-cloud-signout>Ngắt đồng bộ trên máy này</button></div>
    <div data-cloud-conflict hidden><h3>Chọn bản muốn giữ</h3><p>Bản được chọn sẽ thay thế bản còn lại. Game giữ bản trên máy trước khi tải về làm dự phòng.</p>
      <div class="cloud-choices"><div><b>Trên máy này</b><p data-cloud-local></p><button class="btn" data-cloud-choose="local">Giữ bản trên máy</button></div>
      <div><b>Trên tài khoản</b><p data-cloud-remote></p><button class="btn" data-cloud-choose="cloud">Dùng bản trên tài khoản</button></div></div></div>
    <p class="hint">Tiến độ được lưu tại các mốc cũ của game: chuẩn bị quán và hết ngày. Đóng giữa ngày không lưu toàn bộ ca đang chơi.</p>`;
  let unsubscribe;
  const m = openModal({ title: '☁️ Lưu & đồng bộ', body, dismissable: false,
    actions: [{ label: 'Xong', cls: 'ghost', id: 'cloud-done', onClick: closeModal }],
    onClose: () => unsubscribe?.() });
  const describe = s => s ? `${s.shopName || 'Quán chưa đặt tên'} · ngày ${s.day} · ${money(s.money)}` : 'Chưa có bản lưu';
  const render = () => {
    const st = CloudSave.state();
    body.querySelector('.cloud-message').textContent = st.status;
    body.querySelector('[data-cloud-login]').hidden = st.signedIn;
    body.querySelector('[data-cloud-account]').hidden = !st.signedIn;
    body.querySelector('[data-cloud-email]').textContent = st.email;
    body.querySelector('[data-cloud-conflict]').hidden = !st.conflict;
    body.querySelector('[data-cloud-local]').textContent = describe(st.local);
    body.querySelector('[data-cloud-remote]').textContent = describe(st.remote);
    m.card.querySelectorAll('button,input').forEach(b => { b.disabled = st.busy || st.blocked; });
  };
  const listener = () => { if (body.isConnected) render(); };
  window.addEventListener('cloud-save-status', listener);
  unsubscribe = () => window.removeEventListener('cloud-save-status', listener);
  const action = async fn => {
    const before = localStorage.getItem(SAVE_KEY);
    try { await fn(); acceptCloudSave(before); } catch { /* Lỗi được hiển thị ở dòng trạng thái. */ }
    render();
  };
  body.querySelector('[data-cloud-form]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, create = e.submitter?.dataset.mode === 'signup';
    action(() => CloudSave.signIn(f.email.value, f.password.value, create));
  });
  body.querySelector('[data-cloud-sync]').addEventListener('click', () => action(() => CloudSave.sync(true)));
  body.querySelector('[data-cloud-signout]').addEventListener('click', () => action(() => CloudSave.signOut()));
  body.querySelectorAll('[data-cloud-choose]').forEach(b => b.addEventListener('click', () => action(() => CloudSave.choose(b.dataset.cloudChoose))));
  render();
}

// ---------- Khởi động ----------
function init() {
  $('#title-scene').innerHTML = ART.titleSVG([1,2,3].map(t => [TIERS[t].short,money(TIERS[t].rate)+'/h']));
  const tabs = [...document.querySelectorAll('[data-prep-tab]')];
  const selectTab = b => tabs.forEach(t => {
    const active = t === b;
    t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
    $('#pr-'+t.dataset.prepTab).hidden = !active;
  });
  tabs.forEach((b,i) => {
    b.addEventListener('click', () => selectTab(b));
    b.addEventListener('keydown', e => {
      const j = e.key === 'ArrowRight' ? (i+1)%4 : e.key === 'ArrowLeft' ? (i+3)%4 : e.key === 'Home' ? 0 : e.key === 'End' ? 3 : -1;
      if (j < 0) return;
      e.preventDefault(); selectTab(tabs[j]); tabs[j].focus();
    });
  });
  const saved = loadGame();
  $('#btn-continue').hidden = !saved;
  if (saved) {
    $('#btn-continue').innerHTML = saved.shopName
      ? `Chơi tiếp<small>${esc(saved.shopName)} · ngày ${saved.day}</small>` : 'Chơi tiếp';
  }
  $('#btn-continue').addEventListener('click', () => {
    const s = loadGame();
    if (!s) return;
    S = s;
    normalizeSave();
    if (S.shopName) return showPrep();
    // file lưu cũ chưa có tên quán
    askShopName({ title: '🏪 Quán mình tên gì?', initial: 'Quán Nét Bất Ổn',
      onDone: name => { S.shopName = name; saveGame(); showPrep(); } });
  });
  $('#btn-new').addEventListener('click', () => {
    const start = () => askShopName({
      title: '🏪 Đặt tên cho quán', canCancel: true,
      onDone: name => { newGame(name); saveGame(); showPrep(); },
    });
    if (!loadGame()) return start();
    openModal({
      title: 'Chơi mới?', body: '<p>Quán hiện tại sẽ bị xóa và bắt đầu lại từ ngày 1.</p>',
      actions: [{ label: 'Thôi', cls: 'ghost', onClick: () => closeModal() }, { label: 'Chơi mới', cls: 'primary', onClick: start }],
    });
  });
  $('#btn-transfer').addEventListener('click', openTransfer);
  document.querySelectorAll('[data-action="cloud"]').forEach(b => b.addEventListener('click', openCloud));
  window.addEventListener('cloud-save-status', e => {
    const st = e.detail;
    document.querySelectorAll('.cloud-status').forEach(n => { n.textContent = st.status; });
    for (const id of ['btn-new','btn-continue','btn-open','btn-transfer']) $('#'+id).disabled = st.busy || st.blocked;
    if (st.blocked) {
      if (R && !R.over) setPause(true);
      openModal({ title: 'Game đang mở ở tab khác', body: '<p>'+esc(st.status)+'</p>', dismissable: false,
        actions: [{ label: 'Tải lại trang', cls: 'primary', onClick: () => location.reload() }] });
    }
  });
  CloudSave.init().then(refreshContinue).catch(() => {}).finally(() => {
    document.querySelectorAll('.cloud-status').forEach(n => { n.textContent = CloudSave.state().status; });
  });
  $('#btn-rename').addEventListener('click', () => askShopName({
    title: '✏️ Đổi tên quán', initial: S.shopName, canCancel: true,
    onDone: name => { S.shopName = name; saveGame(); renderPrep(); },
  }));
  $('#maps').addEventListener('click', e => { if (e.target.closest('#btn-all-reviews')) openAllReviews(); });
  document.querySelectorAll('[data-action="howto"]').forEach(b => b.addEventListener('click', openHowTo));
  $('#btn-open').addEventListener('click', startDay);
  $('#prep-costs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.net) changeNet(b.dataset.net);
    else if (b.dataset.payBill != null) payBill();
    else if (b.dataset.borrow) borrow(b.dataset.borrow, +b.dataset.amt);
    else if (b.dataset.repay) repay(b.dataset.repay, +b.dataset.amt);
  });
  $('#prep-staff').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.hire != null) hireStaff();
    else if (b.dataset.train) trainStaff(+b.dataset.train);
    else if (b.dataset.fire) askFireStaff(+b.dataset.fire);
  });
  $('#prep-staff').addEventListener('change', e => {
    if (e.target.matches('[data-wage]')) setStaffWage(+e.target.dataset.wage, e.target.value);
  });
  // nút ở thanh hạ tầng và thẻ khách được vẽ lại liên tục: bắt chạm lúc ấn xuống
  PlayScene.onTap($('#infra'), t => t.closest('[data-infra]'), b => {
    if (!b || !R || R.over) return;
    if (b.dataset.infra === 'ac') toggleAc();
    else if (b.dataset.infra === 'gen') toggleGen();
  });
  PlayScene.onTap($('#queue'), t => t.closest('[data-cid]'), card => {
    const c = card && R && R.queue.find(x => x.id === +card.dataset.cid);
    if (c) onQueueClick(c, $(`#queue [data-cid="${c.id}"]`) || $('#queue'));
  });
  $('#staff-task-btn').addEventListener('click', () => openStaffTask(nextStaffTask()));
  $('#btn-pause').addEventListener('click', () => setPause(!R.paused));
  PlayScene.mount($('#scene'), $('#rows'), sceneHandlers);
  $('#stock-list').addEventListener('click', e => {
    const b = e.target.closest('[data-buy], [data-near], [data-trash]');
    if (!b) return;
    if (b.dataset.buy) buyStock(b.dataset.buy, false);
    else if (b.dataset.near) buyStock(b.dataset.near, true);
    else trashExpired(b.dataset.trash);
  });
  $('#upgrade-list').addEventListener('click', e => { const b = e.target.closest('[data-up]'); if (b) buyUpgrade(b.dataset.up); });
  $('#game-list').addEventListener('click', e => { const b = e.target.closest('[data-game]'); if (b) buyGame(b.dataset.game); });
  $('#machine-list').addEventListener('click', e => {
    if (e.target.closest('[data-buy-pc]')) return buyMachine();
    const restock = e.target.closest('[data-restock]');
    if (restock) return restock.disabled || restockPart(+restock.dataset.restock);
    const fix = e.target.closest('[data-fix], [data-replace]');
    if (fix) return fix.disabled || fixWear(+(fix.dataset.fix ?? fix.dataset.replace), fix.dataset.replace != null);
    const row = e.target.closest('[data-mc]');
    if (row) openMachine(+row.dataset.mc);
  });

  // Chạm giữ trên chữ: không bôi đen, không hiện menu copy / tìm Google (trừ ô nhập tên, ô mã bản lưu)
  const typing = t => t.closest && t.closest('input, textarea, [contenteditable]');
  document.addEventListener('contextmenu', e => { if (!typing(e.target)) e.preventDefault(); });
  document.addEventListener('selectstart', e => { if (!typing(e.target)) e.preventDefault(); });
  COMPACT_MQ.addEventListener('change', syncSceneCrop);
  // Ấn hơi lâu trên điện thoại thành "chạm giữ": trình duyệt không gửi click nên nút như bị liệt.
  // Nhấc tay trên đúng nút mà vẫn chưa có click thì bấm hộ. Bỏ qua nút giữ (nạp/nấu/rót)
  // và các vùng đã tự bắt chạm (data-tap: cảnh, thẻ khách, chọn máy, thanh hạ tầng).
  const LONG_PRESS_MS = 400;
  let press = null;
  document.addEventListener('pointerdown', e => {
    const b = e.pointerType === 'mouse' ? null : e.target.closest('button');
    press = b && !b.classList.contains('hold') && !b.closest('[data-tap]')
      ? { b, x: e.clientX, y: e.clientY, id: e.pointerId, t: e.timeStamp, clicked: false } : null;
  }, true);
  document.addEventListener('pointercancel', () => { press = null; }, true);
  document.addEventListener('click', () => { if (press) press.clicked = true; }, true);
  document.addEventListener('pointerup', e => {
    const p = press;
    press = null;
    if (!p || p.id !== e.pointerId || e.timeStamp - p.t < LONG_PRESS_MS) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 16) return;
    press = p;   // chờ xem click thật có tới không
    setTimeout(() => {
      if (press === p) press = null;
      if (!p.clicked && p.b.isConnected && !p.b.disabled) p.b.click();
    }, 80);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;   // đang gõ tên quán
    if (e.code === 'Space' && modal) {
      e.preventDefault();
      if (!e.repeat && modal.holdBtn && modal.holdBtn.isConnected) modal.holdBtn._startHold();
    }
    if (e.key === 'Escape' && modal && modal.dismissable) closeModal();
  });
  document.addEventListener('keyup', e => { if (e.code === 'Space') stopHold(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && R && !R.over) setPause(true); });
  window.addEventListener('blur', stopHold);

  requestAnimationFrame(t => { lastFrame = t; requestAnimationFrame(tick); });
}

init();
})();
