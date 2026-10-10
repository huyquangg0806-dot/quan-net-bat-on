/* Quán Nét Bất Ổn — thuế kỳ 5 ngày theo doanh thu, tờ khai tự điền, kế toán điền hộ, đối chiếu và truy thu.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Tính thuế theo bậc doanh thu ----------
// Lũy tiến từng phần: mỗi bậc chỉ đánh trên phần doanh thu nằm trong bậc đó.
function taxBrackets(net) {
  let from = 0;
  return C.TAX_BRACKETS.map(b => {
    const top = b.upTo ?? Infinity, part = Math.max(0, Math.min(net, top) - from);
    const row = { from, upTo: b.upTo, rate: b.rate, part, tax: Math.floor(part * b.rate) };
    from = top;
    return row;
  });
}
const taxForRevenue = net => taxBrackets(net).reduce((n, b) => n + b.tax, 0);
// Các ô thuế trên tờ khai: chỉ bậc có thuế suất > 0, đánh số tiếp sau [04]
const taxBracketLines = () => taxBrackets(0).map((b, i) => [b, i]).filter(([b]) => b.rate > 0).map(([b, i], k) =>
  [`b${i}`, `[${String(5 + k).padStart(2, '0')}]`, `Phần trên ${money(b.from, true)}${b.upTo ? ` tới ${money(b.upTo, true)}` : ''} × ${Math.round(b.rate * 100)}%`]);
const taxFormLines = () => {
  const brackets = taxBracketLines();
  return [...TAX_FORM_LINES, ...brackets, ['total', `[${String(5 + brackets.length).padStart(2, '0')}]`, 'Tổng thuế phải nộp = cộng các ô thuế từng bậc']];
};
// Điền tiếp tờ khai từ ba ô doanh thu; dùng cho số đúng theo sổ và cho bản nháp (có thể sai) của kế toán
function taxFill(v) {
  const out = { s5111: v.s5111, s5113: v.s5113, s521: v.s521, net: v.s5111 + v.s5113 - v.s521 };
  taxBrackets(out.net).forEach((b, i) => { if (b.rate > 0) out[`b${i}`] = b.tax; });
  out.total = taxForRevenue(out.net);
  return out;
}
// Doanh thu kỳ đang chạy theo sổ (tài khoản doanh thu đã về 0 sau mỗi lần kết chuyển)
function ledgerRevenue() {
  const b = ledgerBalances();
  return { s5111: -balOf(b, '5111') || 0, s5113: -balOf(b, '5113') || 0, s521: balOf(b, '521') };
}
const pendingTaxTotal = () => S.tax.pending.reduce((n, p) => n + p.T, 0);
const hiddenTaxTotal = () => S.tax.filed.reduce((n, f) => n + f.shortfall, 0);
// Số dư Có 3334 phải bằng: thuế đã khai chưa nộp + thuế kỳ đã chốt chưa khai + phần khai thiếu chưa bị phát hiện − thuế nộp thừa
const taxBookOwed = () => S.taxes.reduce((n, t) => n + t.base, 0) + pendingTaxTotal() + hiddenTaxTotal() - S.tax.credit;
const taxFeeOwed = () => S.taxes.reduce((n, t) => n + t.fee, 0);

function normalizeTax() {
  const validDay = n => Number.isInteger(n) && n >= 1, num = n => Number.isSafeInteger(n) && n >= 0;
  S.tax = { pending: [], filed: [], history: [], credit: 0, trust: C.TAX_TRUST_START, nextId: 1, ...S.tax };
  S.tax.pending = (Array.isArray(S.tax.pending) ? S.tax.pending : []).filter(p => p && num(p.id) && num(p.T) && validDay(p.dueDay) && p.rev);
  S.tax.filed = (Array.isArray(S.tax.filed) ? S.tax.filed : []).filter(f => f && num(f.shortfall) && f.shortfall > 0 && validDay(f.day));
  S.tax.history = (Array.isArray(S.tax.history) ? S.tax.history : []).slice(0, C.ACCOUNT_HISTORY);
  S.tax.credit = num(S.tax.credit) ? S.tax.credit : 0;
  S.tax.trust = clamp(Number(S.tax.trust) || 0, 0, 100);
  S.tax.nextId = Math.max(Number(S.tax.nextId) || 1, ...S.tax.pending.map(p => p.id + 1));
}

// ---------- Chốt kỳ, khai thuế, nộp thuế ----------
// Gọi khi chốt kỳ (trước kết chuyển): ghi chi phí thuế theo sổ, chờ người chơi khai. Trả về số thuế đúng theo sổ.
function closeTaxPeriod(from, to, free, news) {
  if (free) return 0;
  const rev = ledgerRevenue(), T = taxForRevenue(rev.s5111 + rev.s5113 - rev.s521);
  post('PKT', `Thuế TNDN phải nộp kỳ ngày ${from}–${to} (theo doanh thu)`, [['821', '3334', T]]);
  const p = { id: S.tax.nextId++, from, to, T, rev, dueDay: S.day + C.TAX_GRACE - 1 };
  S.tax.pending.push(p);
  news.push(['warn', `🧾 Cần nộp tờ khai thuế kỳ ngày ${from}–${to} trước hết ngày ${p.dueDay} (tab Hóa đơn → Sổ sách & thuế).`]);
  return T;
}
// Kế toán điền hộ: phần lớn đúng, đôi khi quên giảm trừ hoặc ghi thiếu doanh thu dịch vụ. Lưu lại để tải lại không đổi.
function accountantDraft(p) {
  if (p.draft) return p.draft;
  const v = { ...p.rev };
  let note = '';
  if (Math.random() < C.ACCOUNT_ERROR_RATE) {
    if (v.s521 > 0 && Math.random() < 0.5) { v.s521 = 0; note = 'forgot521'; }
    else { v.s5113 = Math.round(v.s5113 * 0.9 / 1000) * 1000; note = 'short5113'; }
  }
  p.draft = { ...taxFill(v), note };
  return p.draft;
}
// Nộp tờ khai. by: 'self' (tự khai), 'accountant' (kế toán tự nộp), 'assessed' (quá hạn, cơ quan thuế ấn định)
function fileDeclaration(p, values, by) {
  const truth = taxFill(p.rev), lines = taxFormLines();
  const val = k => Math.round(Number(values[k]) || 0);
  const right = lines.filter(([k]) => Math.abs(val(k) - truth[k]) <= C.TAX_DECLARE_TOLERANCE).length;
  const D = Math.max(0, val('total')), T = p.T;
  S.tax.pending = S.tax.pending.filter(x => x !== p);
  // Thuế nộp thừa kỳ trước trừ vào số phải nộp; khai thừa kỳ này thì cộng vào để trừ kỳ sau
  const used = Math.min(S.tax.credit, D);
  S.tax.credit += Math.max(0, D - T) - used;
  const base = D - used;
  if (base > 0) S.taxes.push({ to: p.to, base, fee: 0, dueDay: p.dueDay });
  // Khai doanh thu thấp hơn tổng hóa đơn đã xuất: cơ quan thuế có sẵn hóa đơn để đối chiếu
  const invoiceGap = val('s5111') + val('s5113') < invoicedBetween(p.from, p.to);
  if (T > D) S.tax.filed.push({ from: p.from, to: p.to, T, D, shortfall: T - D, dueDay: p.dueDay, day: S.day, invoiceGap });
  const allRight = right === lines.length;
  if (allRight && by !== 'assessed') S.tax.trust = Math.min(100, S.tax.trust + C.TAX_TRUST_GOOD);
  if (allRight && by === 'self') {
    S.money += C.TAX_DECLARE_REWARD;
    post('PT', 'Thưởng tự khai thuế đúng hạn, đúng số', [['1111', '711', C.TAX_DECLARE_REWARD]]);
  }
  const result = { from: p.from, to: p.to, D, T, used, base, right, total: lines.length, by, values: Object.fromEntries(lines.map(([k]) => [k, val(k)])), truth };
  S.tax.history.unshift(result);
  S.tax.history = S.tax.history.slice(0, C.ACCOUNT_HISTORY);
  return result;
}
// Khai bổ sung tự nguyện phần khai thiếu: nộp thêm thuế và phạt chồng từ hạn cũ, không bị phạt khai sai, không mất uy tín
function amendDeclaration(to) {
  const f = S.tax.filed.find(x => x.to === to);
  if (!f || (R && !R.over)) return false;
  S.tax.filed = S.tax.filed.filter(x => x !== f);
  const late = Math.floor(f.shortfall * ((1 + C.TAX_LATE_RATE) ** Math.max(0, S.day - 1 - f.dueDay) - 1));
  post('PKT', `Khai bổ sung thuế kỳ ngày ${f.from}–${f.to}`, [['811', '3339', late, 'Phạt chồng tính từ hạn nộp cũ']]);
  S.taxes.push({ to: f.to, base: f.shortfall, fee: late, dueDay: S.day + C.TAX_GRACE - 1 });
  saveGame();
  renderPrep();
  return true;
}
function submitDeclaration(id, values) {
  const p = S.tax.pending.find(x => x.id === id);
  if (!p || (R && !R.over)) return null;
  const result = fileDeclaration(p, values, 'self');
  saveGame();
  renderPrep();
  return result;
}
// Cuối ngày, trước khi tự đóng thuế: kế toán được nhờ thì tự nộp bản điền sẵn (không ai soát)
function accountantFiles(day, news) {
  if (!accountantActive(day) || !S.accountant.autoTax) return;
  for (const p of [...S.tax.pending]) {
    const r = fileDeclaration(p, accountantDraft(p), 'accountant');
    news.push(['note', `🧮 Kế toán đã nộp tờ khai kỳ ngày ${p.from}–${p.to}: khai thuế ${money(r.D, true)}.`]);
  }
}
// Cuối ngày: quá hạn không khai thì bị ấn định, thuế trễ bị phạt chồng, tờ khai thiếu có thể bị đối chiếu ra.
function taxDaily(day, news) {
  for (const p of [...S.tax.pending]) {
    if (day < p.dueDay) continue;
    fileDeclaration(p, taxFill(p.rev), 'assessed');
    S.tax.trust = Math.max(0, S.tax.trust - C.TAX_TRUST_LATE);
    post('PKT', `Phạt chậm nộp tờ khai kỳ ngày ${p.from}–${p.to}`, [['811', '3339', C.TAX_DECLARE_LATE_FINE]]);
    const t = S.taxes.find(x => x.to === p.to && x.dueDay === p.dueDay);
    if (t) t.fee += C.TAX_DECLARE_LATE_FINE; else S.taxes.push({ to: p.to, base: 0, fee: C.TAX_DECLARE_LATE_FINE, dueDay: p.dueDay });
    news.push(['bad', `🧾 Quá hạn không nộp tờ khai kỳ ngày ${p.from}–${p.to}: phạt ${money(C.TAX_DECLARE_LATE_FINE, true)}, cơ quan thuế ấn định thuế ${money(p.T, true)} theo sổ.`]);
  }
  // Phạt chồng: mỗi ngày trễ tính trên cả thuế gốc lẫn tiền phạt đã cộng
  for (const t of S.taxes) {
    if (day <= t.dueDay) continue;
    const add = Math.floor((t.base + t.fee) * C.TAX_LATE_RATE);
    if (!add) continue;
    t.fee += add;
    post('PKT', `Phạt chậm nộp thuế kỳ ngày ${t.to}`, [['811', '3339', add]]);
    news.push(['warn', `⏰ Thuế kỳ ngày ${t.to} trễ hạn, phạt chồng thêm ${money(add, true)}.`]);
  }
  // Đối chiếu: khai lệch càng nhiều, uy tín càng thấp thì càng dễ bị phát hiện
  for (const f of [...S.tax.filed]) {
    if (f.expired || day - f.day > C.TAX_AUDIT_WINDOW) { f.expired = true; continue; }   // thôi đối chiếu, nhưng sổ vẫn ghi nợ thuế
    const chance = C.TAX_AUDIT_DAILY * (1.5 - S.tax.trust / 100) * (1 + f.shortfall / Math.max(1, f.T)) * (f.invoiceGap ? C.INVOICE_DECLARE_AUDIT_MUL : 1);
    if (Math.random() >= chance) continue;
    S.tax.filed = S.tax.filed.filter(x => x !== f);
    const fine = Math.floor(f.shortfall * C.TAX_UNDERDECLARE_FINE);
    const late = Math.floor(f.shortfall * ((1 + C.TAX_LATE_RATE) ** Math.max(0, day - f.dueDay) - 1));
    post('PKT', `Truy thu, phạt khai thiếu thuế kỳ ngày ${f.from}–${f.to}`, [['811', '3339', fine, 'Phạt khai sai làm thiếu số thuế'],
      ['811', '3339', late, 'Phạt chồng tính từ hạn nộp cũ']]);
    S.taxes.push({ to: f.to, base: f.shortfall, fee: fine + late, dueDay: S.day + C.TAX_GRACE - 1, audit: true });
    S.tax.trust = Math.max(0, S.tax.trust - C.TAX_TRUST_CAUGHT);
    news.push(['bad', `🔎 Cơ quan thuế đối chiếu sổ sách: kỳ ngày ${f.from}–${f.to} khai thiếu ${money(f.shortfall, true)}. Truy thu kèm phạt ${money(fine + late, true)}.`]);
  }
}

// ---------- Màn tờ khai ----------
let taxFormId = null;
function taxBoxHTML() {
  const playing = R && !R.over;
  const rates = taxBrackets(0).map(b => `${b.upTo ? `tới ${money(b.upTo, true)}` : 'phần còn lại'}: ${Math.round(b.rate * 100)}%`).join(' · ');
  return `<h4>🧾 Tờ khai thuế</h4>
    <p>Uy tín thuế: <b>${Math.round(S.tax.trust)}/100</b>${S.tax.credit ? ` · thuế nộp thừa được trừ kỳ sau: <b>${money(S.tax.credit, true)}</b>` : ''}</p>
    ${S.tax.pending.map(p => `<div class="due ${S.day >= p.dueDay ? 'late' : ''}"><div><b>Tờ khai kỳ ngày ${p.from}–${p.to}</b>
      <div class="small">${S.day >= p.dueDay ? '<span class="bad-text">Hôm nay là hạn chót!</span>' : `Hạn nộp: hết ngày ${p.dueDay}.`}${accountantActive() ? ' Kế toán đã điền sẵn, nhớ soát lại.' : ''}</div></div>
      <button class="btn small primary" data-tax-form="${p.id}" ${playing ? 'disabled' : ''}>Điền tờ khai</button></div>`).join('')}
    ${S.tax.filed.map(f => `<div class="due"><div><b>Kỳ ngày ${f.from}–${f.to}: khai thiếu ${money(f.shortfall, true)} so với sổ</b>
      <div class="small">${f.expired ? 'Đã quá thời gian đối chiếu nhưng trên sổ vẫn còn nợ thuế.' : 'Khai bổ sung tự nguyện thì không bị phạt khai sai, chỉ chịu phạt chồng từ hạn cũ.'}</div></div>
      <button class="btn small" data-tax-amend="${f.to}" ${playing ? 'disabled' : ''}>Khai bổ sung</button></div>`).join('')}
    ${S.tax.history.slice(0, 3).map(h => `<p class="small">Kỳ ${h.from}–${h.to}: ${h.by === 'assessed' ? 'cơ quan thuế ấn định' : h.by === 'accountant' ? 'kế toán nộp' : 'tự khai'} ${money(h.D, true)} · đúng ${h.right}/${h.total} ô.</p>`).join('')}
    <p class="muted small">Thuế mỗi kỳ ${C.ACCOUNT_DAYS} ngày tính trên doanh thu thuần, lũy tiến từng phần (${rates}). Khai và đóng trong ${C.TAX_GRACE} ngày sau khi chốt.
      Trễ đóng: phạt chồng ${Math.round(C.TAX_LATE_RATE * 100)}%/ngày trên cả thuế lẫn phạt. Không nộp tờ khai: phạt ${money(C.TAX_DECLARE_LATE_FINE, true)} và bị ấn định thuế.
      Khai thiếu: trong ${C.TAX_AUDIT_WINDOW} ngày có thể bị đối chiếu, truy thu kèm phạt ${Math.round(C.TAX_UNDERDECLARE_FINE * 100)}% và phạt chồng từ hạn cũ.</p>`;
}
const parseVnd = s => Math.round(Number(String(s).replace(/[^\d-]/g, '')) || 0);
function taxFormHTML(p) {
  const draft = accountantActive() ? accountantDraft(p) : null;
  p.input = p.input || {};
  const val = k => p.input[k] ?? (draft ? draft[k] : '');
  return `<p>Kỳ ngày <b>${p.from}–${p.to}</b> · hạn nộp hết ngày <b>${p.dueDay}</b>.</p>
    <p class="muted small">Lấy số từ sổ cái 5111, 5113, 521 của kỳ này (hoặc B02-DN mã 01, 02 tách theo tài khoản). ${draft ? '🧮 Kế toán đã điền sẵn — so lại với sổ trước khi ký, kế toán cũng có lúc nhầm.' : 'Tự khai đúng hết các ô được thưởng ' + money(C.TAX_DECLARE_REWARD, true) + '.'}</p>
    <div class="ledger-scroll"><table class="ledger-table tax-form"><tr><th>Chỉ tiêu</th><th></th><th class="num">Số tiền (đồng)</th></tr>
    ${taxFormLines().map(([k, no, name]) => `<tr><td>${esc(name)}</td><td>${no}</td>
      <td class="num"><input inputmode="numeric" data-tax-field="${k}" value="${val(k) === '' ? '' : vnd(val(k))}" aria-label="${esc(name)}"></td></tr>`).join('')}</table></div>`;
}
function taxResultHTML(r) {
  const rows = taxFormLines().map(([k, no, name]) => {
    const ok = Math.abs(r.values[k] - r.truth[k]) <= C.TAX_DECLARE_TOLERANCE;
    return `<tr><td>${no} ${esc(name)}</td><td class="num">${vnd(r.values[k])}</td><td class="num">${vnd(r.truth[k])}</td><td>${ok ? '<b class="good-text">✓</b>' : '<b class="bad-text">✗</b>'}</td></tr>`;
  }).join('');
  return `<div class="ledger-scroll"><table class="ledger-table"><tr><th>Chỉ tiêu</th><th class="num">Bạn khai</th><th class="num">Theo sổ sách</th><th></th></tr>${rows}</table></div>
    <p>Đúng <b>${r.right}/${r.total}</b> ô. Thuế phải nộp theo tờ khai: <b>${money(r.base, true)}</b>${r.used ? ` (đã trừ ${money(r.used, true)} nộp thừa kỳ trước)` : ''}.</p>
    ${r.right === r.total ? `<p class="note">✅ Tờ khai khớp sổ sách. Uy tín thuế +${C.TAX_TRUST_GOOD}${r.by === 'self' ? `, thưởng ${money(C.TAX_DECLARE_REWARD, true)}` : ''}.</p>` : ''}
    ${r.D < r.T ? `<p class="warn">⚠️ Khai thiếu ${money(r.T - r.D, true)} so với sổ. Trong ${C.TAX_AUDIT_WINDOW} ngày tới cơ quan thuế có thể đối chiếu ra: truy thu, phạt ${Math.round(C.TAX_UNDERDECLARE_FINE * 100)}% và phạt chồng từ hạn này.</p>` : ''}
    ${r.D > r.T ? `<p class="note">Khai thừa ${money(r.D - r.T, true)} so với sổ: số thừa được trừ vào tờ khai kỳ sau.</p>` : ''}`;
}
function openTaxForm(id) {
  const p = S.tax.pending.find(x => x.id === id);
  if (!p || (R && !R.over)) return;
  taxFormId = id;
  const read = () => { document.querySelectorAll('[data-tax-field]').forEach(i => { p.input[i.dataset.taxField] = parseVnd(i.value); }); };
  const back = () => openTaxForm(id);
  const m = openModal({ title: '🧾 Tờ khai thuế kỳ', body: taxFormHTML(p), cls: 'ledger-modal', actions: [
    { label: '📚 Mở sổ sách', onClick: () => {
      read();
      const i = S.ledger.reports.findIndex(r => r.to === p.to);
      ledgerView = { ...ledgerView, period: i + 1, acc: '5113', entry: null };
      openLedgerBook('socai', back);
    } },
    { label: 'Đóng', onClick: () => { read(); closeModal(); } },
    { label: 'Ký và nộp tờ khai', cls: 'primary', onClick: () => {
      read();
      const r = submitDeclaration(id, p.input);
      if (r) openModal({ title: `🧾 Đã nộp tờ khai kỳ ngày ${r.from}–${r.to}`, body: taxResultHTML(r), cls: 'ledger-modal', actions: [{ label: 'Đóng', onClick: closeModal }] });
    } },
  ] });
  // Gõ số tới đâu tự thêm dấu chấm hàng nghìn
  m.bodyEl.addEventListener('change', e => { if (e.target.matches('[data-tax-field]')) e.target.value = vnd(parseVnd(e.target.value)); });
  return m;
}
