/* Quán Nét Bất Ổn — nền chung: tiện ích, trạng thái S/R, lịch, lưu game.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
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
// nhớ chuỗi đã ghi: emoji trong chữ bị pixel-ui.js đổi thành icon nên không so được bằng textContent
function setText(node, v) { if (node._text !== v) { node._text = v; node.textContent = v; } }
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, ch => ESC[ch]);

function money(n, exact = false) {
  if (exact) return Math.round(n).toLocaleString('vi-VN') + 'đ';
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
  const h = Math.floor(t), m = Math.floor((t - h) * 60);   // qua nửa đêm: 25 = 01:00
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
const mood = s => s >= 85 ? '😍' : s >= 65 ? '🙂' : s >= 40 ? '😐' : '😡';
const keysOf = cat => Object.keys(ITEMS).filter(k => ITEMS[k].cat === cat && S.unlocked[k]);
// mấy ngày đầu khách dễ tính hơn cho người mới kịp làm quen
const newbieMul = () => S.day <= C.NEWBIE_DAYS ? C.NEWBIE_PATIENCE : 1;
const patienceMul = () => (R && acRunning() ? C.AC_PATIENCE_BONUS : 1) * (1 + cardFx('patience')) * newbieMul();
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
let atTitle = true;
let titleWasPaused = false;
let modal = null;
let hold = null;
let allowLeave = false;   // tải lại có chủ đích (game mở ở tab khác) thì không hỏi lại
let lastFrame = performance.now();

// ---------- Lưu game ----------
const SAVE_KEY = 'quan-net-nho-v1';
function saveGame() {
  try { CloudSave.save(S); return true; }
  catch (e) { saveFailed(e); return false; }
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
  R = null;
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
  openLedger(S.machines.length * C.PC_COST, 'Vốn góp ban đầu bằng tiền, máy và hàng');
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
  S.nightStrikes = S.nightStrikes || 0;       // số lần bị công an bắt mở quá giờ (chưa được xóa)
  S.nightStrikeDay = S.nightStrikeDay || 0;   // ngày vi phạm gần nhất
  S.suspendDay = S.suspendDay || 0;           // ngày bị đình chỉ, không được mở cửa
  S.suspendReason = S.suspendReason === 'gambling' ? 'gambling' : 'night';
  S.hintSeen = S.hintSeen || {};   // số lần đã hiện gợi ý "Lần tới" cho từng sự việc
  S.onboard = S.onboard || { steps: {}, done: S.day > 1 };   // các bước ngày khai trương đã làm
  S.onboard.steps = S.onboard.steps || {};
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
    for (const b of S.inv[k]) {
      if (!Number.isFinite(b.unitCost) || b.unitCost < 0) b.unitCost = ITEMS[k].packCost / ITEMS[k].pack;
      if (!Number.isSafeInteger(b.val) || b.val < 0) b.val = Math.round(b.qty * b.unitCost);   // bản lưu cũ chưa có giá trị lô
    }
  }
  normalizeAccounts();
  normalizeHost();
  normalizeCards();
  normalizeQuests();
  normalizeLedger();   // sau cùng: bút toán số dư đầu kỳ cần đủ kho, thẻ, nợ, thuế
}
