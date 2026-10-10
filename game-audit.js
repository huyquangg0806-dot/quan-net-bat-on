/* Quán Nét Bất Ổn — kiểm toán nội bộ: sai phạm cài vào hoạt động quán (nhân viên ăn bớt tiền, lấy hàng, rơi vỡ,
   nhà cung cấp giao thiếu / tính sai giá, kế toán ghi sai) để lại dấu vết trên sổ; người chơi đối chiếu để bắt.
   Mọi số ngẫu nhiên ở đây dùng auditRoll (theo bản lưu), không đụng Math.random của ca chơi.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Trạng thái và dấu vết ẩn ----------
const auditOn = () => unlocked('audit');
const auditRoll = salt => steadyRoll(S.audit.seq++, S.day * 97 + salt);
// Nhân viên gian hay không là cố định theo người; đã bị cảnh cáo thì bớt hẳn
const dishonest = p => steadyRoll(p.id, 1234) < C.AUDIT_DISHONEST_RATE;
const sinRate = (p, rate) => dishonest(p) ? rate * (p.warned ? 0.3 : 1) : 0;
function normalizeAudit() {
  const arr = a => Array.isArray(a) ? a : [];
  S.audit = { seq: 1, nextId: 1, log: [], skims: [], missing: {}, purchases: [], errors: [], markupUntil: 0, countDay: 0, found: 0, wrong: 0, ...S.audit };
  for (const k of ['log', 'skims', 'purchases', 'errors']) S.audit[k] = arr(S.audit[k]);
  S.audit.missing = S.audit.missing && typeof S.audit.missing === 'object' ? S.audit.missing : {};
  for (const k in S.audit.missing) if (!ITEMS[k] || !(S.audit.missing[k].qty > 0)) delete S.audit.missing[k];
  S.audit.errors = S.audit.errors.filter(e => e && e.delta && typeof e.delta === 'object');
}
// Chênh lệch sổ − thực tế do kế toán ghi sai (chưa điều chỉnh), theo từng tài khoản
const auditDelta = acc => S.audit.errors.reduce((n, e) => n + (e.delta[acc] || 0), 0);
// Hàng thiếu chưa phát hiện: sổ vẫn ghi, kho thực không còn
const missingVal = acc => Object.keys(S.audit.missing).filter(k => stockAcc(k) === acc).reduce((n, k) => n + S.audit.missing[k].val, 0);
function addMissing(k, cause, qty, val, staffId) {
  const m = S.audit.missing[k] = S.audit.missing[k] || { qty: 0, val: 0, theft: 0, supplier: 0, breakage: 0, theftVal: 0, supplierVal: 0, staff: [] };
  m.qty += qty; m.val += val; m[cause] += qty;
  if (cause !== 'breakage') m[cause + 'Val'] += val;
  if (staffId && !m.staff.includes(staffId)) m.staff.push(staffId);
}
// Lấy hàng khỏi kho thật mà không ghi sổ (cũ trước). Trả về { qty, val } đã lấy.
function takePhysical(k, qty) {
  let got = 0, val = 0;
  const list = S.inv[k];
  while (got < qty && list.length) {
    const b = list[0], n = Math.min(qty - got, b.qty), v = n === b.qty ? b.val : Math.round(b.val * n / b.qty);
    b.qty -= n; b.val -= v; got += n; val += v;
    if (b.qty <= 0) list.shift();
  }
  return { qty: got, val };
}

// ---------- Sai phạm phát sinh ----------
// Giá nhà cung cấp đang báo (bị tố oan thì họ tăng giá vài ngày)
const quotePrice = (k, near) => {
  const base = near ? nearCost(k) : ITEMS[k].packCost;
  return S.day < S.audit.markupUntil ? Math.round(base * (1 + C.AUDIT_MARKUP) / 1000) * 1000 : base;
};
// Nhập hàng: đôi khi hóa đơn tính dư, đôi khi giao thiếu. Trả về { paid, short } để buyStock ghi sổ theo hóa đơn.
function supplierDeal(k, near, quote) {
  const it = ITEMS[k];
  let over = 0, short = 0;
  if (auditOn()) {
    if (auditRoll(11) < C.AUDIT_SUPPLIER_OVER) over = Math.round(quote * C.AUDIT_OVER_SHARE / 1000) * 1000;
    if (auditRoll(12) < C.AUDIT_SUPPLIER_SHORT) short = Math.min(it.pack - 1, 1 + Math.floor(auditRoll(13) * 2));
  }
  if (S.money < quote + over) over = 0;
  S.audit.purchases.push({ id: S.audit.nextId++, day: S.day, k, near: !!near, qty: it.pack, total: quote + over, quote, over, status: 'open' });
  S.audit.purchases = S.audit.purchases.filter(p => S.day - p.day < C.AUDIT_LOG_DAYS);
  return { paid: quote + over, short };
}
// Đầu finishAccounts (trước khi lập bảng kê): nhân viên gian giữ lại một phần tiền giờ; log máy chủ vẫn ghi đủ
function auditBeforeClose(day, led, costs) {
  if (!auditOn()) return;
  const before = led.hours || 0;
  if (costs.staff > 0 && before > 0) {
    const p = S.staff.find(x => x.trained && auditRoll(1) < sinRate(x, C.AUDIT_SKIM_RATE));
    const amount = p ? Math.min(before, Math.round(before * C.AUDIT_SKIM_SHARE / 1000) * 1000) : 0;
    if (amount > 0) {
      led.hours -= amount;
      S.money -= amount;
      S.audit.skims.push({ day, amount, staffId: p.id });
    }
  }
  S.audit.log.push({ day, hours: before });
  S.audit.log = S.audit.log.filter(x => day - x.day < C.AUDIT_LOG_DAYS);
  S.audit.skims = S.audit.skims.filter(x => day - x.day < C.AUDIT_LOG_DAYS);
}
// Sau khi lập chứng từ cuối ngày: rơi vỡ, nhân viên lấy hàng, kế toán ghi sai
const WRONG_ACC = { '642': '641', '641': '642', '2112': '642', '152': '156', '156': '152', '2135': '2112', '2113': '2112', '2118': '2112', '242': '642', '331': '642', '334': '641' };
function auditAfterClose(day, costs) {
  if (!auditOn()) return;
  const stocked = acc => Object.keys(ITEMS).filter(k => (!acc || stockAcc(k) === acc) && invCount(k) > 0);
  if (auditRoll(2) < C.AUDIT_BREAK_RATE) {
    const ks = stocked('156');
    if (ks.length) { const k = ks[Math.floor(auditRoll(3) * ks.length)], t = takePhysical(k, 1); if (t.qty) addMissing(k, 'breakage', t.qty, t.val); }
  }
  if (costs.staff > 0) for (const p of S.staff) {
    if (auditRoll(4) >= sinRate(p, C.AUDIT_THEFT_RATE)) continue;
    const ks = stocked();
    if (!ks.length) break;
    const k = ks[Math.floor(auditRoll(5) * ks.length)], t = takePhysical(k, 1 + Math.floor(auditRoll(6) * 3));
    if (t.qty) addMissing(k, 'theft', t.qty, t.val, p.id);
  }
  if (accountantActive(day) && auditRoll(7) < C.AUDIT_BOOK_ERROR_RATE) {
    const list = S.ledger.entries.filter(e => e.d === day && !e.open && ['PC', 'PNK'].includes(e.no.split(' ')[0]) && e.l.length === 1 && e.l[0][1] === '1111');
    if (list.length) bookError(list[Math.floor(auditRoll(8) * list.length)], auditRoll(9));
  }
}
// Kế toán ghi sai một chứng từ: ghi trùng, ghi sai tài khoản Nợ, hoặc gõ sai số tiền
function bookError(e, roll) {
  const [dr, cr, n] = e.l[0], delta = {};
  const add = (a, v) => { delta[a] = (delta[a] || 0) + v; };
  let kind, target = e;
  if (roll < 0.4) {
    kind = 'dup';
    target = addEntry(e.no.split(' ')[0], e.t, e.l.map(l => [...l]));
    add(dr, n); add(cr, -n);
  } else if (roll < 0.7 && WRONG_ACC[dr]) {
    kind = 'wrongacc';
    e.l[0][0] = WRONG_ACC[dr];
    add(WRONG_ACC[dr], n); add(dr, -n);
  } else {
    kind = 'wrongamt';
    const m = n >= 20000 ? n - 9000 : n + 9000;   // gõ nhầm một chữ số hàng nghìn
    e.l[0][2] = m;
    add(dr, m - n); add(cr, n - m);
  }
  S.audit.errors.push({ id: S.audit.nextId++, entryId: target.id, kind, delta });
}

// ---------- Công cụ 1: đối chiếu doanh thu giờ chơi với log máy chủ ----------
function grudge() { for (const p of S.staff) p.wage = Math.min(C.STAFF_WAGE_MAX, p.wage + C.AUDIT_WAGE_GRUDGE); }
function reportSkim(day, amount) {
  if (R && !R.over) return null;
  const sk = S.audit.skims.find(x => x.day === day);
  if (!sk) { S.audit.wrong++; grudge(); saveGame(); renderPrep(); return { ok: false, accused: true }; }
  if (Math.abs(Math.round(amount) - sk.amount) > 500) return { ok: false, near: true };
  S.audit.skims = S.audit.skims.filter(x => x !== sk);
  S.audit.found++;
  post('PKT', `Ghi bổ sung doanh thu giờ chơi ngày ${day} bị nhân viên giữ lại`, [['1388', '5113', sk.amount]]);
  S.money += sk.amount;
  post('PT', `${staffName(sk.staffId)} nộp lại tiền giờ giữ lại ngày ${day}`, [['1111', '1388', sk.amount]]);
  saveGame(); renderPrep();
  return { ok: true, amount: sk.amount, staffId: sk.staffId };
}

// ---------- Công cụ 2: kiểm kê kho ----------
const COUNT_ACCS = [['632', '632 · Hao hụt'], ['1381', '1381 · Chờ xử lý'], ['1388', '1388 · Bắt bồi thường']];
const countRows = () => Object.keys(ITEMS).filter(k => S.unlocked[k] || invCount(k) || S.audit.missing[k]);
const bookQty = k => invCount(k) + (S.audit.missing[k]?.qty || 0);
// values: { k: { qty, acc } }. Kiểm kê luôn điều chỉnh sổ theo thực tế; chọn đúng tài khoản xử lý thì đòi lại được tiền.
function countStock(values) {
  if ((R && !R.over) || S.audit.countDay === S.day) return null;
  const rows = [], staff = new Set();
  for (const k of countRows()) {
    const m = S.audit.missing[k], v = values[k] || {}, said = Math.max(0, Math.round(Number(v.qty) || 0));
    const qty = m?.qty || 0, guilty = m ? m.theft + m.supplier > 0 : false;
    const acc = ['632', '1381', '1388'].includes(v.acc) ? v.acc : '632';
    const row = { k, said, qty, acc, rightQty: said === qty, rightAcc: !qty || acc === '1381' || acc === (guilty ? '1388' : '632'), lines: [], notes: [] };
    if (qty) {
      const it = ITEMS[k], recover = m.theftVal + m.supplierVal, lost = m.val - recover;
      const lines = [[acc, stockAcc(k), m.val, `Hàng thiếu khi kiểm kê: ${qty} ${it.name}`]];
      // 1381 chờ xử lý: tìm ra nguyên nhân thì chuyển tiếp ngay
      if (acc === '1381') lines.push(['1388', '1381', recover, 'Xác định người chịu trách nhiệm bồi thường'], ['632', '1381', lost, 'Phần hao hụt tự nhiên tính vào giá vốn']);
      if (acc === '1388') {
        lines.push(['632', '1388', lost, 'Hao hụt tự nhiên không ai bồi thường']);
        if (m.breakage) row.notes.push(`${m.breakage} ${it.name} rơi vỡ tự nhiên: lẽ ra để vào giá vốn (632).`);
      }
      post('PKT', `Biên bản kiểm kê kho ngày ${S.day}: ${it.name}`, lines);
      if (acc !== '632' && recover) {
        S.money += recover;
        post('PT', `Thu bồi thường hàng thiếu: ${it.name}`, [['1111', '1388', recover]]);
      }
      if (acc === '632' && recover) row.notes.push(`Bỏ lọt ${money(recover, true)}: hàng mất do ${m.theft ? 'nhân viên lấy' : ''}${m.theft && m.supplier ? ' và ' : ''}${m.supplier ? 'nhà cung cấp giao thiếu' : ''}, lẽ ra phải bắt bồi thường (1388).`);
      if (acc !== '632') {
        if (m.supplier) row.notes.push(`Nhà cung cấp giao thiếu ${m.supplier} ${it.name}, đã hoàn tiền.`);
        if (m.theft) m.staff.forEach(id => staff.add(id));
      }
      row.val = m.val;
      delete S.audit.missing[k];
    }
    if (row.rightQty && qty) S.audit.found++;
    rows.push(row);
  }
  S.audit.countDay = S.day;
  saveGame(); renderPrep();
  return { rows, staff: [...staff] };
}

// ---------- Công cụ 3: hóa đơn mua vào so với báo giá ----------
function flagPurchase(id) {
  const p = S.audit.purchases.find(x => x.id === id);
  if (!p || p.status !== 'open' || (R && !R.over)) return null;
  if (!p.over) {
    p.status = 'disputed';
    S.audit.wrong++;
    S.audit.markupUntil = S.day + C.AUDIT_MARKUP_DAYS;
    saveGame(); renderPrep();
    return { ok: false };
  }
  p.status = 'refunded';
  S.audit.found++;
  S.money += p.over;
  // Hàng còn trong kho thì ghi giảm giá trị lô mới nhất; đã bán hết thì ghi giảm giá vốn
  let left = p.over, toStock = 0;
  for (const b of [...S.inv[p.k]].reverse()) { const c = Math.min(left, b.val); b.val -= c; left -= c; toStock += c; if (!left) break; }
  post('PT', `Nhà cung cấp hoàn tiền tính sai giá ${ITEMS[p.k].name} ngày ${p.day}`, [['1111', stockAcc(p.k), toStock, 'Giảm giá trị hàng còn trong kho'], ['1111', '632', left, 'Giảm giá vốn hàng đã bán']]);
  saveGame(); renderPrep();
  return { ok: true, over: p.over };
}

// ---------- Công cụ 4: rà sổ, lập bút toán điều chỉnh ----------
// lines: [[TK Nợ, TK Có, số tiền]]. Đúng khi ảnh hưởng thuần của bút toán điều chỉnh triệt tiêu đúng sai sót.
function adjustEntry(entryId, lines) {
  if (R && !R.over) return null;
  const err = S.audit.errors.find(e => e.entryId === entryId);
  const clean = lines.filter(l => ACCOUNTS[l[0]] && ACCOUNTS[l[1]] && l[0] !== l[1] && Math.round(Number(l[2])) > 0).map(l => [l[0], l[1], Math.round(Number(l[2]))]);
  if (!err) { S.audit.wrong++; saveGame(); return { ok: false, noError: true }; }
  const net = {};
  for (const [dr, cr, n] of clean) { net[dr] = (net[dr] || 0) + n; net[cr] = (net[cr] || 0) - n; }
  const keys = new Set([...Object.keys(net), ...Object.keys(err.delta)]);
  const ok = clean.length && [...keys].every(a => (net[a] || 0) + (err.delta[a] || 0) === 0);
  if (!ok) return { ok: false, kind: err.kind };
  post('PKT', `Bút toán điều chỉnh sai sót (chứng từ số ${S.ledger.entries.find(e => e.id === entryId)?.no || entryId})`, clean.map(l => [...l, 'Điều chỉnh sai sót kế toán']));
  S.audit.errors = S.audit.errors.filter(e => e !== err);
  S.audit.found++;
  S.money += C.AUDIT_BOOK_REFUND;
  post('PT', 'Kế toán dịch vụ bồi thường do ghi sổ sai', [['1111', '711', C.AUDIT_BOOK_REFUND]]);
  saveGame(); renderPrep();
  return { ok: true, kind: err.kind };
}
const ERROR_KIND = { dup: 'ghi trùng chứng từ', wrongacc: 'ghi sai tài khoản', wrongamt: 'ghi sai số tiền' };

// ---------- Màn kiểm toán nội bộ ----------
let auditTab = 'revenue', auditPick = null;
const AUDIT_TABS = [['revenue', '🖥️ Đối chiếu doanh thu'], ['count', '📦 Kiểm kê kho'], ['buy', '🧾 Hóa đơn mua vào'], ['review', '📒 Rà soát sổ']];
function auditRevenueHTML() {
  const rows = S.audit.log.map(x => `<tr><td>${x.day}</td><td class="num">${vnd(x.hours)}</td></tr>`).join('');
  return `<p class="muted small">Log máy chủ ghi đủ mọi lượt nạp giờ. So với dòng "Tiền giờ chơi, bao đêm" trên bảng kê bán lẻ (Nhật ký chung / sổ cái 5113) của cùng ngày. Lệch là có người giữ lại tiền.</p>
    <div class="ledger-scroll"><table class="ledger-table"><tr><th>Ngày</th><th class="num">Tiền giờ theo log máy chủ</th></tr>${rows || '<tr><td colspan="2">Chưa có log.</td></tr>'}</table></div>
    <div class="audit-act"><label>Ngày lệch <select data-audit-skim-day>${S.audit.log.map(x => `<option value="${x.day}">${x.day}</option>`).join('')}</select></label>
      <label>Số tiền lệch <input inputmode="numeric" data-audit-skim-amt></label>
      <button class="btn small primary" data-audit-skim ${S.audit.log.length ? '' : 'disabled'}>Báo chênh lệch</button></div>
    <p class="muted small">Tố oan thì cả nhóm nhân viên phật ý, đòi tăng lương ${money(C.AUDIT_WAGE_GRUDGE, true)} mỗi người.</p>`;
}
function auditCountHTML() {
  const done = S.audit.countDay === S.day;
  return `<p class="muted small">Đếm thực tế rồi so với thẻ kho (tồn theo sổ). Ghi số thiếu và chọn cách xử lý: 632 hao hụt trong định mức (vào giá vốn), 1381 tài sản thiếu chưa rõ nguyên nhân (chờ xử lý), 1388 đã rõ người chịu trách nhiệm (bắt bồi thường). Kiểm kê xong, sổ được điều chỉnh theo thực tế. Mỗi ngày kiểm kê một lần.</p>
    <div class="ledger-scroll"><table class="ledger-table tax-form"><tr><th>Hàng</th><th class="num">Tồn theo sổ</th><th class="num">Thực tế đếm</th><th>Thiếu · cách xử lý</th></tr>
    ${countRows().map(k => `<tr><td>${esc(ITEMS[k].name)}</td><td class="num">${bookQty(k)}</td><td class="num">${invCount(k)}</td>
      <td class="count-cell"><input inputmode="numeric" data-count-qty="${k}" aria-label="Số thiếu"><select data-count-acc="${k}" aria-label="Cách xử lý">${COUNT_ACCS.map(([a, n]) => `<option value="${a}">${n}</option>`).join('')}</select></td></tr>`).join('')}</table></div>
    <div class="audit-act"><button class="btn small primary" data-audit-count ${done ? 'disabled' : ''}>${done ? 'Hôm nay đã kiểm kê' : 'Lập biên bản kiểm kê'}</button></div>`;
}
function auditBuyHTML() {
  const quote = Object.keys(ITEMS).filter(k => S.unlocked[k]).map(k => `<tr><td>${esc(ITEMS[k].name)}</td><td class="num">${ITEMS[k].pack}</td><td class="num">${vnd(quotePrice(k, false))}</td><td class="num">${vnd(quotePrice(k, true))}</td></tr>`).join('');
  const rows = [...S.audit.purchases].reverse().map(p => `<tr><td>${p.day}</td><td>${esc(ITEMS[p.k].name)}${p.near ? ' (cận date)' : ''}</td><td class="num">${p.qty}</td><td class="num">${vnd(p.total)}</td>
    <td>${p.status === 'open' ? `<button class="btn small" data-audit-flag="${p.id}">Tính sai giá?</button>` : p.status === 'refunded' ? '<b class="good-text">đã hoàn</b>' : '<span class="muted">không sai</span>'}</td></tr>`).join('');
  return `<p class="muted small">So thành tiền trên hóa đơn mua vào với bảng báo giá của nhà cung cấp${S.day < S.audit.markupUntil ? ' (đang tăng giá vì bị tố oan)' : ''}. Tố oan thì nhà cung cấp tăng giá ${Math.round(C.AUDIT_MARKUP * 100)}% trong ${C.AUDIT_MARKUP_DAYS} ngày.</p>
    <div class="ledger-scroll"><table class="ledger-table compact"><tr><th>Bảng báo giá</th><th class="num">SL/thùng</th><th class="num">Giá thường</th><th class="num">Giá cận date</th></tr>${quote}</table></div>
    <div class="ledger-scroll"><table class="ledger-table compact"><tr><th>Ngày</th><th>Hàng</th><th class="num">SL</th><th class="num">Thành tiền hóa đơn</th><th></th></tr>${rows || '<tr><td colspan="5">Chưa có hóa đơn mua vào.</td></tr>'}</table></div>`;
}
function auditReviewHTML() {
  const list = S.ledger.entries.filter(e => !e.open && S.day - e.d <= C.LEDGER_KEEP_DAYS).slice(-80).reverse();
  const opts = ACC_ORDER.map(a => `<option value="${a}">${esc(accName(a))}</option>`).join('');
  const line = i => `<div class="audit-line"><select data-adj-dr="${i}"><option value="">Nợ…</option>${opts}</select><select data-adj-cr="${i}"><option value="">Có…</option>${opts}</select><input inputmode="numeric" data-adj-amt="${i}" placeholder="Số tiền"></div>`;
  return `<p class="muted small">Đối chiếu từng bút toán với chứng từ gốc (hóa đơn mua vào, bảng báo giá, việc bạn đã làm). Kế toán thuê ngoài đôi khi ghi trùng, ghi sai tài khoản hoặc sai số tiền. Chọn bút toán sai rồi lập bút toán điều chỉnh.</p>
    <div class="ledger-scroll audit-review"><table class="ledger-table"><tr><th></th><th>Ngày</th><th>Số CT</th><th>Diễn giải</th><th>Nợ</th><th>Có</th><th class="num">Số tiền</th></tr>
    ${list.map(e => e.l.map((l, i) => `<tr class="${auditPick === e.id ? 'sel' : ''}">${i ? '<td></td>' : `<td rowspan="${e.l.length}"><input type="radio" name="adj-entry" value="${e.id}" ${auditPick === e.id ? 'checked' : ''} data-adj-pick></td>`}
      <td>${e.d}</td><td class="nowrap">${esc(e.no)}</td><td>${esc(l[3] || e.t)}</td><td>${l[0]}</td><td>${l[1]}</td><td class="num">${vnd(l[2])}</td></tr>`).join('')).join('')}</table></div>
    <p><b>Bút toán điều chỉnh</b> ${auditPick ? `cho chứng từ đã chọn` : '(chọn một bút toán ở bảng trên)'}</p>${line(0)}${line(1)}
    <div class="audit-act"><button class="btn small primary" data-audit-adjust ${auditPick ? '' : 'disabled'}>Ghi bút toán điều chỉnh</button></div>`;
}
function auditHTML(msg = '') {
  const V = { revenue: auditRevenueHTML, count: auditCountHTML, buy: auditBuyHTML, review: auditReviewHTML };
  return `<div class="howto-tabs ledger-tabs">${AUDIT_TABS.map(([id, n]) => `<button class="btn small ${id === auditTab ? 'primary' : 'ghost'}" data-audit-tab="${id}">${n}</button>`).join('')}</div>
    ${msg}<div class="ledger-body">${V[auditTab]()}</div>
    <p class="muted small">Đã phát hiện đúng ${S.audit.found} sai phạm · báo nhầm ${S.audit.wrong} lần.</p>`;
}
function staffChoiceHTML(ids) {
  return ids.filter(id => staffById(id)).map(id => `<p>👤 Thủ phạm: <b>${staffName(id)}</b>
    <button class="btn small" data-audit-warn="${id}">Cảnh cáo</button> <button class="btn small danger" data-audit-fire="${id}">Cho nghỉ</button></p>`).join('');
}
function openAudit() {
  if (R && !R.over) return;
  const m = openModal({ title: '🔎 Kiểm toán nội bộ', body: auditHTML(), cls: 'ledger-modal', actions: [{ label: 'Đóng', onClick: closeModal }] });
  const redraw = (msg = '') => { m.bodyEl.innerHTML = auditHTML(msg); };
  const box = (cls, html) => `<div class="${cls}">${html}</div>`;
  m.bodyEl.addEventListener('change', e => { if (e.target.matches('[data-adj-pick]')) { auditPick = Number(e.target.value); redraw(); } });
  m.bodyEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const q = sel => m.bodyEl.querySelector(sel);
    if (b.dataset.auditTab) { auditTab = b.dataset.auditTab; return redraw(); }
    if (b.dataset.auditWarn) { const p = staffById(Number(b.dataset.auditWarn)); if (p) p.warned = true; saveGame(); return redraw(box('note', `Đã cảnh cáo ${staffName(Number(b.dataset.auditWarn))}.`)); }
    if (b.dataset.auditFire) { fireStaff(Number(b.dataset.auditFire)); return redraw(box('note', 'Đã cho nghỉ việc.')); }
    if (b.dataset.auditSkim != null) {
      const r = reportSkim(Number(q('[data-audit-skim-day]').value), parseVnd(q('[data-audit-skim-amt]').value));
      if (!r) return;
      return redraw(r.ok ? box('note', `✅ Đúng: ngày đó bị giữ lại ${money(r.amount, true)}. Đã ghi bổ sung doanh thu (Nợ 1388 / Có 5113) và thu lại tiền (Nợ 1111 / Có 1388).`) + staffChoiceHTML([r.staffId])
        : r.near ? box('warn', 'Ngày này đúng là có chênh lệch, nhưng số tiền chưa khớp. Đối chiếu lại.')
        : box('warn', '❌ Ngày này log máy chủ khớp sổ. Tố oan: nhân viên phật ý, đòi tăng lương.'));
    }
    if (b.dataset.auditCount != null) {
      const values = {};
      m.bodyEl.querySelectorAll('[data-count-qty]').forEach(i => { values[i.dataset.countQty] = { qty: parseVnd(i.value), acc: q(`[data-count-acc="${i.dataset.countQty}"]`).value }; });
      const r = countStock(values);
      if (!r) return;
      const rows = r.rows.filter(x => x.qty || x.said).map(x => `<p>${x.rightQty ? '✅' : '❌'} ${esc(ITEMS[x.k].name)}: bạn ghi thiếu ${x.said}, thực tế thiếu ${x.qty}${x.qty ? ` (trị giá ${money(x.val, true)}) · xử lý ${x.acc} ${x.rightAcc ? '✓' : '✗'}` : ''}</p>${x.notes.map(n => `<p class="small">${esc(n)}</p>`).join('')}`).join('');
      return redraw(box('note', `<b>Biên bản kiểm kê ngày ${S.day}</b>${rows || '<p>Kho khớp sổ, không thiếu gì.</p>'}`) + staffChoiceHTML(r.staff));
    }
    if (b.dataset.auditFlag) {
      const r = flagPurchase(Number(b.dataset.auditFlag));
      if (!r) return;
      return redraw(r.ok ? box('note', `✅ Hóa đơn tính dư ${money(r.over, true)}. Nhà cung cấp đã hoàn tiền.`) : box('warn', '❌ Hóa đơn này đúng báo giá. Nhà cung cấp phật ý, tăng giá vài ngày.'));
    }
    if (b.dataset.auditAdjust != null) {
      const lines = [0, 1].map(i => [q(`[data-adj-dr="${i}"]`).value, q(`[data-adj-cr="${i}"]`).value, parseVnd(q(`[data-adj-amt="${i}"]`).value)]);
      const r = adjustEntry(auditPick, lines);
      if (!r) return;
      if (r.ok) auditPick = null;
      return redraw(r.ok ? box('note', `✅ Đúng: kế toán đã ${ERROR_KIND[r.kind]}. Bút toán điều chỉnh đã ghi sổ, kế toán dịch vụ bồi thường ${money(C.AUDIT_BOOK_REFUND, true)}.`)
        : r.noError ? box('warn', '❌ Bút toán này đúng, không cần điều chỉnh.')
        : box('warn', `Bút toán này đúng là có sai sót (${ERROR_KIND[r.kind]}), nhưng bút toán điều chỉnh chưa triệt tiêu đúng phần sai. Thử lại.`));
    }
  });
  return m;
}
