/* Quán Nét Bất Ổn — thư viện game, kho hàng, sổ sách và thuế, đồ thải, người chơi mới, nhiệm vụ tuần.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

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
  recordBook('investment', g.cost);
  post('PC', `Mua bản quyền game ${g.name}`, [['2135', '1111', g.cost]]);
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
// val = giá trị còn lại của lô (đồng chẵn), để tồn kho trên sổ 152/156 khớp từng đồng
function addStock(k, qty, shelf = ITEMS[k].shelf, unitCost = ITEMS[k].packCost / ITEMS[k].pack) {
  const exp = S.day + shelf - 1, val = Math.round(qty * unitCost);
  const b = S.inv[k].find(x => x.exp === exp && x.unitCost === unitCost);
  if (b) { b.qty += qty; b.val += val; } else S.inv[k].push({ qty, exp, unitCost, val });
  S.inv[k].sort((a, b2) => a.exp - b2.exp);
}
// Lấy hàng cũ nhất trước. Trả về số ngày đã quá hạn (0 = còn hạn), hoặc null nếu hết hàng.
function invTake(k) {
  const list = S.inv[k];
  if (!list.length) return null;
  const past = Math.max(0, daysPast(list[0]));
  recordBook('materials', list[0].unitCost);
  const cost = list[0].qty === 1 ? list[0].val : Math.round(list[0].val / list[0].qty);
  list[0].val -= cost;
  post('PXK', 'Xuất kho bán cho khách', [['632', stockAcc(k), cost, `Giá vốn ${ITEMS[k].name}`]]);
  list[0].qty--;
  if (list[0].qty <= 0) list.shift();
  return past;
}
// Bỏ hàng hết date; trả về số lượng đã bỏ
function removeExpired(k) {
  const n = expiredCount(k);
  for (const b of S.inv[k]) if (daysPast(b) > 0) discardStock(k, b);
  S.inv[k] = S.inv[k].filter(b => daysPast(b) <= 0);
  return n;
}

// ---------- Sổ sách 5 ngày, kế toán và thuế ----------
const emptyBook = () => ({ revenue: 0, refunds: 0, materials: 0, operating: 0, investment: 0, assetSales: 0,
  salvage: 0, wasteCost: 0, wasteQty: 0, nightCost: 0, leisureIn: 0, leisureOut: 0, gambleTips: 0, gambleFine: 0, rewards: 0, depreciation: 0 });
const accountantActive = (day = S.day) => day < S.accountant.until;
const bookProfit = b => b.revenue + b.salvage - b.refunds - b.materials - b.operating - b.depreciation;
const taxTotal = () => S.taxes.reduce((n, t) => n + t.base + t.fee, 0);
function normalizeAccounts() {
  // Bản cũ bắt đầu kỳ mới ngay ngày hiện tại; không đoán doanh thu quá khứ.
  S.books = S.books || { from: S.day, days: 0, free: true, period: emptyBook(), pending: emptyBook(), reports: [] };
  const nonnegative = n => Number.isFinite(n) && n >= 0 ? n : 0;
  const validDay = n => Number.isInteger(n) && n >= 1;
  if (!validDay(S.books.from)) S.books.from = S.day;
  if (!Number.isInteger(S.books.days) || S.books.days < 0 || S.books.days >= C.ACCOUNT_DAYS) S.books.days = 0;
  S.books.free = S.books.free !== false;
  S.books.period = { ...emptyBook(), ...S.books.period };
  S.books.pending = { ...emptyBook(), ...S.books.pending };
  for (const k of Object.keys(emptyBook())) {
    S.books.period[k] = nonnegative(S.books.period[k]);
    S.books.pending[k] = nonnegative(S.books.pending[k]);
  }
  S.books.reports = Array.isArray(S.books.reports) ? S.books.reports.slice(0, C.ACCOUNT_HISTORY) : [];
  S.books.reports = S.books.reports.filter(r => r && validDay(r.from) && validDay(r.to)).map(r => {
    const report = { ...r };
    for (const k of Object.keys(emptyBook())) report[k] = nonnegative(report[k]);
    report.profit = bookProfit(report);
    report.tax = nonnegative(report.tax);
    report.net = report.profit - report.tax;
    return report;
  });
  // Bản cũ chưa theo dõi tài sản: bắt đầu từ 0, không đoán khoản đầu tư quá khứ.
  S.books.assets = nonnegative(S.books.assets);       // giá trị tài sản đầu tư còn lại, chưa khấu hao
  // Khoản thuế phải đóng (đã khai hoặc bị ấn định). Phạt chồng không có trần; khoản chỉ còn tiền phạt có gốc 0.
  S.taxes = (Array.isArray(S.taxes) ? S.taxes : []).filter(t => t && Number.isSafeInteger(t.base) && t.base >= 0 && validDay(t.dueDay));
  for (const t of S.taxes) {
    t.fee = Math.floor(nonnegative(t.fee));
    t.to = validDay(t.to) ? t.to : S.day;
  }
  S.taxes = S.taxes.filter(t => t.base + t.fee > 0);
  normalizeTax();
  normalizeInvoices();
  normalizeAudit();
  S.accountant = { until: 0, autoTax: false, minSale: null, ...S.accountant };
  S.accountant.until = Math.floor(nonnegative(S.accountant.until));
  S.accountant.autoTax = !!S.accountant.autoTax;
  S.accountant.minSale = Number.isFinite(S.accountant.minSale) && S.accountant.minSale >= 0 ? Math.floor(S.accountant.minSale) : null;
  S.waste = { nextId: 1, lots: [], quote: null, lastOfferDay: 0, ...S.waste };
  S.waste.lots = (Array.isArray(S.waste.lots) ? S.waste.lots : []).filter(b => b && (b.kind === 'part' ? PARTS[b.k] && Number.isInteger(b.lv) && b.lv >= 0 && b.lv <= 3 : ITEMS[b.k])
    && Number.isInteger(b.qty) && b.qty > 0 && Number.isInteger(b.id) && b.id > 0 && validDay(b.day) && Number.isFinite(b.unitCost) && b.unitCost >= 0
    && ['pack', 'cooked', 'part'].includes(b.kind));
  S.waste.nextId = Math.max(1, Math.floor(nonnegative(S.waste.nextId)), ...S.waste.lots.map(b => b.id + 1));
  S.waste.lastOfferDay = Math.floor(nonnegative(S.waste.lastOfferDay));
  S.waste.removed = nonnegative(S.waste.removed);
  const q = S.waste.quote;
  if (q && (!validDay(q.day) || !Array.isArray(q.ids) || !Number.isFinite(q.price) || q.price < 0
    || !['offer', 'sold', 'withdrawn'].includes(q.status))) S.waste.quote = null;
  if (S.waste.quote && !['raised', 'held', 'withdrawn'].includes(S.waste.quote.result)) delete S.waste.quote.result;
}
function recordBook(key, amount) {
  S.books.pending[key] += amount;
  if (key === 'investment') S.books.assets += amount;   // tiền đầu tư thành tài sản, khấu hao dần mỗi ngày
}
function hireAccountant() {
  if (accountantActive() || S.money < C.ACCOUNT_FEE || (R && !R.over)) return;
  S.money -= C.ACCOUNT_FEE;
  post('PC', 'Trả trước phí kế toán thuê ngoài', [['242', '1111', C.ACCOUNT_FEE]]);
  S.accountant.until = S.day + C.ACCOUNT_DAYS;
  saveGame();
  renderPrep();
}
function postTaxPaid() {
  post('PC', 'Nộp thuế vào ngân sách', [['3334', '1111', S.taxes.reduce((n, t) => n + t.base, 0), 'Nộp thuế TNDN'],
    ['3339', '1111', S.taxes.reduce((n, t) => n + t.fee, 0), 'Nộp tiền phạt chậm nộp thuế']]);
}
function payTax() {
  const total = taxTotal();
  if (!total || S.money < total || (R && !R.over)) return false;
  S.money -= total;
  postTaxPaid();
  S.taxes = [];
  saveGame();
  renderPrep();
  return true;
}
function autoPayTax(day, news) {
  const total = taxTotal();
  if (!accountantActive(day) || !S.accountant.autoTax || !total || S.money < total) return;
  S.money -= total;
  postTaxPaid();
  S.taxes = [];
  news.push(['note', `✅ Kế toán đã đóng ${money(total)} tiền thuế và phạt trễ (nếu có).`]);
}
function finishAccounts(day, led, costs, books) {
  auditBeforeClose(day, led, costs);
  ledgerCloseDay(day, led, costs, books);
  auditAfterClose(day, costs);
  const pending = S.books.pending;
  pending.revenue += led.hours + led.food + led.tips + (led.thiefCash || 0);
  pending.refunds += led.refund + led.closeRefund;
  const fee = accountantActive(day) ? C.ACCOUNT_FEE / C.ACCOUNT_DAYS : 0;
  pending.operating += Object.values(costs).reduce((n, v) => n + v, 0) + books.interest + led.fine + books.lateFee + fee;
  pending.nightCost += costs.nightWage + costs.lights;
  const dep = S.books.assets <= C.DEPRECIATION_MIN ? S.books.assets : Math.floor(S.books.assets * C.DEPRECIATION_RATE);
  S.books.assets -= dep;
  pending.depreciation += dep;
  led.depreciation = dep;
  led.materials = pending.materials;
  led.prepCosts = pending.operating - Object.values(costs).reduce((n, v) => n + v, 0) - books.interest - led.fine;
  led.salvage = pending.salvage;
  led.wasteQty = pending.wasteQty;
  for (const k in pending) S.books.period[k] += pending[k];
  S.books.days++;
  accountantFiles(day, books.news);
  autoPayTax(day, books.news);
  taxDaily(day, books.news);
  invoiceDaily(day, books.news);
  if (S.invoices.requests.length) books.news.push(['warn', `📄 Có ${S.invoices.requests.length} hóa đơn chờ lập: vào tab Hóa đơn → Sổ sách & thuế trước khi kéo cửa.`]);
  if (S.books.days >= C.ACCOUNT_DAYS) {
    const report = { ...S.books.period, from: S.books.from, to: day, free: S.books.free };
    report.profit = bookProfit(report);
    // Thuế tính trên doanh thu thuần theo sổ (không trừ chi phí, không chuyển lỗ); người chơi khai trong vài ngày tới
    report.tax = closeTaxPeriod(report.from, day, report.free, books.news);
    report.net = report.profit - report.tax;
    S.books.reports.unshift(report);
    S.books.reports = S.books.reports.slice(0, C.ACCOUNT_HISTORY);
    books.report = report;
    books.news.push(['note', `📒 Đã chốt sổ ngày ${report.from}–${day}: lãi trước thuế ${money(report.profit)}${report.free ? ' · kỳ đầu miễn thuế' : ` · thuế ${money(report.tax)}`}.`]);
    S.books.from = S.day;
    S.books.days = 0;
    S.books.free = false;
    S.books.period = emptyBook();
    accountantFiles(day, books.news);
    autoPayTax(day, books.news);
    ledgerClosePeriod(report.from, day);
  }
  S.books.pending = emptyBook();
  ledgerEndDay();
}
function currentBook() {
  const b = emptyBook();
  for (const k in b) b[k] = S.books.period[k] + S.books.pending[k];
  return b;
}
// Thuế dự kiến của kỳ đang chạy theo doanh thu đã ghi sổ; thuế kỳ đã chốt mà chưa khai cũng phải để dành
const expectedTax = () => { if (S.books.free) return 0; const r = ledgerRevenue(); return taxForRevenue(r.s5111 + r.s5113 - r.s521); };
const reservedMoney = () => S.bill.rent + S.bill.net + S.bill.power + dueTotal() + taxTotal() + pendingTaxTotal() + expectedTax();
function accountAdvice(b) {
  if (bookProfit(b) < 0) return ACCOUNT_LINES.loss;
  if (b.wasteCost > 0) return ACCOUNT_LINES.waste;
  if (b.nightCost > 0) return ACCOUNT_LINES.night;
  return ACCOUNT_LINES.calm;
}
function reportHTML(b) {
  const row = (name, value) => `<div class="sum-row"><span>${name}</span><b>${money(value)}</b></div>`;
  return `<div class="account-report">${row('Doanh thu sau hoàn tiền', b.revenue + b.salvage - b.refunds)}
    ${row('Giá vốn nguyên liệu và thẻ', b.materials)}${row('Chi phí vận hành', b.operating)}${b.depreciation ? row('Khấu hao tài sản', b.depreciation) : ''}
    ${row('Lợi nhuận trước thuế', b.profit)}${row(b.free ? 'Thuế (kỳ đầu miễn)' : 'Thuế kỳ này', b.tax)}
    ${row('Lợi nhuận sau thuế', b.net)}${row('Tiền đầu tư riêng', b.investment)}${row('Thu thanh lý máy riêng', b.assetSales)}
    ${b.leisureOut ? `<p class="muted small">🎲 Giải trí riêng: cược ${money(b.leisureOut)}, nhận ${money(b.leisureIn)}. Không tính vào lãi và thuế kinh doanh.</p>` : ''}
    ${b.gambleTips || b.gambleFine ? `<p class="muted small">🎲 Khách thưởng từ cược: ${money(b.gambleTips)} · phạt cờ bạc: ${money(b.gambleFine)}. Tách khỏi lãi và thuế kinh doanh.</p>` : ''}
    ${b.rewards ? `<p class="muted small">🎯 Thưởng nhiệm vụ và mốc sưu tầm: ${money(b.rewards)}. Không tính vào lãi và thuế kinh doanh.</p>` : ''}
    <p class="muted small">Thu hồi đồ thải: ${money(b.salvage)} · giá vốn đồ bỏ: ${money(b.wasteCost)} (đã nằm trong giá vốn).</p></div>`;
}
// Sổ sách gập lại cho tab Hóa đơn đỡ dài; có thuế cần đóng thì tự mở
let accountsOpen = false;
function accountsHTML() {
  const b = currentBook(), active = accountantActive(), latest = S.books.reports[0];
  return `<details class="account-box account-fold" ${accountsOpen || taxTotal() || S.tax.pending.length || S.invoices.requests.length ? 'open' : ''}><summary><h3>📒 Sổ sách & thuế</h3>
    <span class="muted small">Lãi đang ghi ${money(bookProfit(b))} · thuế dự kiến ${money(expectedTax())}${taxTotal() ? ` · <b class="bad-text">nợ thuế ${money(taxTotal())}</b>` : ''}${S.invoices.requests.length ? ` · <b class="warn-text">${S.invoices.requests.length} hóa đơn chờ lập</b>` : ''}</span></summary>
    ${invoiceBoxHTML()}
    <p>Ngày ${S.books.from}–${S.books.from + C.ACCOUNT_DAYS - 1} · chốt sau <b>${C.ACCOUNT_DAYS - S.books.days} ngày</b>${S.books.free ? ' · kỳ đầu miễn thuế' : ''}.</p>
    <div class="sum-row"><span>Lãi trước thuế đang ghi nhận</span><b>${money(bookProfit(b))}</b></div>
    <div class="sum-row"><span>Thuế dự kiến theo doanh thu đã ghi</span><b>${money(expectedTax())}</b></div>
    <div class="sum-row"><span>Tài sản đầu tư còn lại</span><b>${money(S.books.assets)}</b></div>
    <div class="sum-row"><span>Dự phòng hóa đơn & thuế</span><b>${money(reservedMoney())}</b></div>
    <div class="sum-row total"><span>Tiền có thể dùng sau dự phòng</span><b>${money(S.money - reservedMoney())}</b></div>
    <div class="ledger-open">${unlocked('audit') ? '<button class="btn small primary" data-open-audit>🔎 Kiểm toán nội bộ</button>' : ''}${[['b02', '📈 Kết quả kinh doanh'], ['b01', '🏦 Tình hình tài chính'], ['nkc', '📖 Nhật ký chung'], ['cdps', '⚖️ Cân đối phát sinh']]
      .map(([tab, name]) => `<button class="btn small" data-open-ledger="${tab}">${name}</button>`).join('')}</div>
    <p class="muted small">Số dự phòng chưa gồm tiền gốc vay và chi phí tương lai.</p>
    ${taxBoxHTML()}
    ${S.taxes.map(t => `<p class="${S.day > t.dueDay ? 'bad-text' : 'warn-text'}">Thuế kỳ ngày ${t.to}: <b>${money(t.base + t.fee)}</b> · hạn hết ngày ${t.dueDay}${t.fee ? ` · phạt ${money(t.fee)}` : ''}.</p>`).join('')}
    ${taxTotal() ? `<button class="btn small primary" data-pay-tax ${S.money < taxTotal() ? 'disabled' : ''}>Đóng thuế · ${money(taxTotal())}</button>` : '<p class="muted small">Không có thuế đang nợ.</p>'}
    <h4>🧮 Kế toán thuê ngoài</h4>
    ${active ? `<p>Hợp đồng còn ${S.accountant.until - S.day} ngày · phí đã trả trước.</p>
      <p class="account-advice">${accountAdvice(latest || b)}</p>`
      : `<p>Thuê ${C.ACCOUNT_DAYS} ngày, trả trước ${money(C.ACCOUNT_FEE)}. Phí tính dần vào chi phí mỗi ngày; không tự gia hạn.</p>
      <button class="btn small" data-hire-accountant ${S.money < C.ACCOUNT_FEE ? 'disabled' : ''}>${S.accountant.until ? 'Gia hạn' : 'Thuê kế toán'} · ${money(C.ACCOUNT_FEE)}</button>`}
    <label class="account-option"><input type="checkbox" data-auto-tax ${S.accountant.autoTax ? 'checked' : ''} ${active ? '' : 'disabled'}> Nhờ kế toán tự nộp tờ khai (bản điền sẵn, không ai soát) và tự đóng thuế cuối ngày khi đủ tiền</label>
    <p class="muted small">Tiền vay và trả gốc không tính vào lãi. Đầu tư máy, linh kiện, nâng cấp và game không trừ một lần mà khấu hao ${C.DEPRECIATION_RATE * 100}%/ngày trên giá trị còn lại. Thuế tính trên doanh thu nên lỗ không được chuyển kỳ. Giá vốn kho cũ ước theo giá nhập chuẩn.</p>
    ${S.books.reports.map(r => `<details><summary>Báo cáo ngày ${r.from}–${r.to} · sau thuế ${money(r.net)}</summary>${reportHTML(r)}</details>`).join('')}
    </details>`;
}

// ---------- Kho đồ thải và thương lượng thu gom ----------
const wasteCount = () => S.waste.lots.reduce((n, b) => n + b.qty, 0);
function addWaste(k, qty, unitCost, kind) {
  if (!qty) return;
  recordBook('wasteQty', qty);
  recordBook('wasteCost', qty * unitCost);
  if (R) R.led.wasteQty = (R.led.wasteQty || 0) + qty;
  const kept = Math.min(qty, Math.max(0, C.WASTE_CAP - wasteCount()));
  if (kept) S.waste.lots.push({ id: S.waste.nextId++, k, qty: kept, unitCost, kind, day: S.day });
  if (kept < qty) S.waste.removed = (S.waste.removed || 0) + qty - kept;
}
// Linh kiện cũ thay ra: là tài sản, không ghi giá vốn nguyên liệu; chỉ thu gom được một phần.
const partValue = (k, lv) => lv ? PARTS[k].cost[lv] : C.THIEF_BASE_REPLACE[k] ?? C.WASTE_PART_BASE;
function addPartWaste(k, lv) {
  if (wasteCount() >= C.WASTE_CAP) { S.waste.removed = (S.waste.removed || 0) + 1; return; }
  S.waste.lots.push({ id: S.waste.nextId++, k, lv, qty: 1, unitCost: partValue(k, lv), kind: 'part', day: S.day });
}
const wasteName = b => b.kind === 'part' ? `${PARTS[b.k].icon} ${PARTS[b.k].levels[b.lv] || PARTS[b.k].name}` : `${ITEMS[b.k].icon} ${ITEMS[b.k].name}`;
const wasteRatio = kind => kind === 'pack' ? C.WASTE_PACK_RATIO : kind === 'part' ? C.WASTE_PART_RATIO : C.WASTE_COOKED_RATIO;
function discardStock(k, b) {
  recordBook('materials', b.qty * b.unitCost);
  post('PXK', 'Xuất hủy hàng hết hạn, hư hỏng', [['632', stockAcc(k), b.val, `Hủy ${ITEMS[k].name}`]]);
  b.val = 0;
  addWaste(k, b.qty, b.unitCost, 'pack');
}
function discardTray(o) {
  if (!o || trayEmpty(o.tray)) return;
  for (const [k, qty] of Object.entries(o.tray.items)) {
    const cost = o.tray.costs?.[k] ?? qty * ITEMS[k].packCost / ITEMS[k].pack;
    addWaste(k, qty, cost / qty, 'cooked');
  }
  o.tray = newTray();
}
function pruneWaste() {
  const expired = S.waste.lots.filter(b => S.day - b.day >= C.WASTE_KEEP_DAYS);
  S.waste.removed = (S.waste.removed || 0) + expired.reduce((n, b) => n + b.qty, 0);
  S.waste.lots = S.waste.lots.filter(b => S.day - b.day < C.WASTE_KEEP_DAYS);
  if (S.waste.quote && S.waste.quote.day !== S.day) S.waste.quote = null;
}
function ensureWasteQuote() {
  pruneWaste();
  if (S.waste.lastOfferDay === S.day || !wasteCount()) return;
  const value = S.waste.lots.reduce((n, b) => n + b.qty * b.unitCost * wasteRatio(b.kind), 0);
  S.waste.quote = { day: S.day, ids: S.waste.lots.map(b => b.id), price: Math.floor(value), status: 'offer', negotiated: false };
  S.waste.lastOfferDay = S.day;
  saveGame();   // lời chào thuộc đúng lô, tải lại cũng không quay giá
}
function sellWaste() {
  const q = S.waste.quote;
  if (!q || q.day !== S.day || q.status !== 'offer' || (R && !R.over)) return false;
  const lots = S.waste.lots.filter(b => q.ids.includes(b.id));
  if (lots.length !== q.ids.length) return false;
  S.money += q.price;
  recordBook('salvage', q.price);
  post('PT', 'Bán đồ thải cho người thu gom', [['1111', '711', q.price]]);
  S.waste.lots = S.waste.lots.filter(b => !q.ids.includes(b.id));
  q.status = 'sold';
  saveGame();
  return true;
}
function bargainWaste() {
  const q = S.waste.quote;
  if (!accountantActive() || !q || q.day !== S.day || q.status !== 'offer' || q.negotiated || (R && !R.over)) return;
  q.negotiated = true;
  const roll = Math.random();
  if (roll < C.WASTE_BARGAIN_CHANCE) { q.price = Math.floor(q.price * (1 + C.WASTE_BARGAIN_BONUS)); q.result = 'raised'; }
  else if (roll < C.WASTE_BARGAIN_CHANCE + C.WASTE_KEEP_CHANCE) q.result = 'held';
  else { q.status = 'withdrawn'; q.result = 'withdrawn'; }
  saveGame();
  autoSellWaste();
  renderPrep();
}
function autoSellWaste() {
  const q = S.waste.quote;
  if (!accountantActive() || S.accountant.minSale == null || !q || q.status !== 'offer' || q.price < S.accountant.minSale) return false;
  return sellWaste();
}
function wasteHTML() {
  const q = S.waste.quote, active = accountantActive();
  const group = kind => S.waste.lots.filter(b => b.kind === kind).reduce((n, b) => n + b.qty, 0);
  return `<div class="account-box"><h3>♻️ Kho đồ thải</h3><p><b>${wasteCount()}/${C.WASTE_CAP}</b> đơn vị · giữ tối đa ${C.WASTE_KEEP_DAYS} ngày.</p>
    <p>Nguyên gói: ${group('pack')} · đồ đã chế biến: ${group('cooked')} · linh kiện cũ: ${group('part')}.</p>
    <p class="muted small">Kho riêng để thu hồi/xử lý, không đưa lại cho khách. Đồ quá hạn hoặc vượt sức chứa được chuyển xử lý, không ghi giá vốn lần hai.</p>
    ${S.waste.removed ? `<p class="warn-text">Đã chuyển xử lý ${S.waste.removed} đơn vị quá hạn hoặc vượt sức chứa.</p>` : ''}
    ${S.waste.lots.length ? `<details><summary>Xem các lô đồ thải</summary>${S.waste.lots.map(b => `<p>${wasteName(b)} ×${b.qty} · ${b.kind === 'pack' ? 'nguyên gói' : b.kind === 'part' ? 'linh kiện thay ra' : 'đã chế biến'} · còn ${C.WASTE_KEEP_DAYS - (S.day - b.day)} ngày.</p>`).join('')}</details>` : ''}
    ${q ? `<h4>${ACCOUNT_LINES.buyer}</h4><p class="muted small">${ACCOUNT_LINES.offer}</p>
      ${q.result ? `<p role="status">${ACCOUNT_LINES[q.result]}</p>` : ''}
      ${q.status === 'offer' ? `<p>Giá cả lô đã chào: <b>${money(q.price)}</b>. Đồ mới gom chờ lượt ngày mai.</p>
        <div class="account-actions"><button class="btn small primary" data-sell-waste>Bán ngay · ${money(q.price)}</button>
        <button class="btn small" data-bargain-waste ${!active || q.negotiated ? 'disabled' : ''}>Nhờ kế toán trả giá</button></div>
        <p class="muted small">Có thể giữ lại chờ ngày mai. Trả giá một lần: ${C.WASTE_BARGAIN_CHANCE * 100}% tăng ${C.WASTE_BARGAIN_BONUS * 100}%, ${C.WASTE_KEEP_CHANCE * 100}% giữ giá, còn lại rút lời chào.</p>`
      : `<p>${q.status === 'sold' ? '✅ Đã bán lô này. Ngày mai có lượt thu gom mới.' : 'Chưa bán được. Ngày mai có lượt thu gom mới.'}</p>`}`
      : `<p class="muted small">${wasteCount() ? 'Ngày mai có lượt thu gom mới.' : 'Chưa có đồ thải. Hàng bỏ, khay đổ và linh kiện cũ thay ra sẽ được gom vào đây.'}</p>`}
    <label class="account-option">Nhờ tự bán nếu giá cả lô từ (đồng)
      <input type="number" min="0" step="100" inputmode="numeric" data-min-sale placeholder="Để trống: tự quyết"
        value="${S.accountant.minSale ?? ''}" ${active ? '' : 'disabled'}></label>
    <p class="muted small">Cần hợp đồng kế toán còn hạn. Để trống để tắt tự bán; thu hồi chỉ được phần nhỏ giá vốn.</p></div>`;
}

// ---------- Người chơi mới: ngày khai trương, mở dần tính năng ----------
const unlockOf = id => UNLOCKS.find(u => u.id === id);
const unlocked = id => S.day >= (unlockOf(id)?.day || 1);
// Đánh dấu một bước khai trương đã làm; xong hết thì tặng quà
function onboardStep(id) {
  const o = S.onboard;
  if (!R || R.over || o.done || o.steps[id]) return;
  o.steps[id] = true;
  log(`✅ Xong bước khai trương: ${ONBOARD_STEPS.find(s => s.id === id).icon}`);
  if (!ONBOARD_STEPS.every(s => o.steps[s.id])) return;
  o.done = true;
  payReward(C.ONBOARD_REWARD);
  R.led.onboard = C.ONBOARD_REWARD;
  log(`🎉 Xong ngày khai trương! Quà ${money(C.ONBOARD_REWARD)}`);
  SFX.play('coin');
}
// Thẻ hướng dẫn trên cảnh quán: chỉ bước đầu tiên chưa làm
let coachKey = null;
function renderCoach() {
  const box = $('#coach'), o = S.onboard;
  const late = R.time >= C.ONBOARD_CLOSE_AT && !o.steps.close;   // tối rồi: nhắc đóng cửa trước, kẻo mở quá 23h
  const step = !o.done && ONBOARD_STEPS.find(s => late ? s.id === 'close' : !o.steps[s.id]);
  const key = step ? step.id : '';
  if (key === coachKey) return;
  coachKey = key;
  box.hidden = !step;
  if (!step) return;
  const done = ONBOARD_STEPS.filter(s => o.steps[s.id]).length;
  box.innerHTML = `<span class="coach-step">🎓 Khai trương ${done + 1}/${ONBOARD_STEPS.length}</span>
    <span class="coach-text">${step.icon} ${step.text}</span><button class="coach-skip" data-coach-skip>Bỏ qua</button>`;
}
function openWelcome() {
  const wasPaused = R.paused;
  setPause(true);
  openModal({ title: '🎉 Ngày khai trương!',
    body: `<p>Chào chủ quán <b>${esc(S.shopName)}</b>! Hôm nay làm quen ${ONBOARD_STEPS.length} việc, thẻ <b>🎓 Khai trương</b> trên cảnh quán sẽ chỉ từng bước:</p>
      <ol class="howto">${ONBOARD_STEPS.map(s => `<li>${s.icon} ${s.text}</li>`).join('')}</ol>
      <p class="hint">Làm xong được quà ${money(C.ONBOARD_REWARD)}. ${C.NEWBIE_DAYS} ngày đầu khách dễ tính hơn. Các tính năng khác mở dần trong mấy ngày sau. Bấm <b>?</b> bất cứ lúc nào để xem Cách chơi.</p>`,
    actions: [{ label: 'Xem Cách chơi', cls: 'ghost', onClick: () => { closeModal(); openHowTo(); } },
      { label: 'Mở quán thôi!', cls: 'primary', onClick: closeModal }],
    onClose: () => { if (R && !R.over && !wasPaused) setPause(false); } });
}
// Buổi sáng ngày mở khóa: báo tính năng mới ở đầu tab Nhập hàng
function unlockNewsHTML() {
  const news = UNLOCKS.filter(u => u.day === S.day);
  return news.map(u => `<div class="unlock-news">🆕 <b>Mở khóa: ${u.icon} ${u.name}</b><span>${u.text}</span></div>`).join('');
}

// ---------- Nhiệm vụ tuần & mốc sưu tầm thẻ ----------
const questWeek = (day = S.day) => Math.floor((day - 1) / 7) + 1;   // tuần 1 = ngày 1–7 (Thứ 2 → Chủ nhật)
const questDef = id => QUESTS.find(d => d.id === id);
const emptyQuestStats = () => Object.fromEntries(QUESTS.map(d => [d.id, 0]));
const questReward = (base, week = S.quests.week) => round1k(base * Math.min(C.QUEST_REWARD_MAX_MUL, 1 + C.QUEST_REWARD_GROWTH * (week - 1)));
// Kết quả một ngày theo từng chỉ số nhiệm vụ
function questStats(led) {
  return {
    served: led.served,
    happy: led.visits.filter(v => v.stars >= 4).length,
    fiveStar: led.reviews.filter(r => r.stars === 5).length,
    revenue: led.hours + led.food + led.tips,
    food: led.food,
    clean: !led.walkouts && led.served >= C.QUEST_CLEAN_MIN_SERVED ? 1 : 0,
    cards: (led.cardPackSales || 0) + (led.cardSales || 0),
  };
}
// Mục tiêu bám theo sức quán: hơn tuần trước một chút, không thấp hơn mức tối thiểu
function questTarget(def, last) {
  if (def.fixed) return def.min;
  const step = def.round || 1;
  // làm tròn 6 chữ số trước khi làm tròn lên: 200 × 1,1 phải ra 220, không phải 221 vì sai số dấu phẩy động
  return Math.max(def.min, Math.ceil(+((last[def.id] || 0) * C.QUEST_STRETCH / step).toFixed(6)) * step);
}
function questText(x) {
  const d = questDef(x.id);
  return d.text.replace('{n}', d.money ? money(x.target) : x.target).replace('{served}', C.QUEST_CLEAN_MIN_SERVED);
}
function normalizeQuests() {
  const q = S.quests && typeof S.quests === 'object' ? S.quests : {};
  const stats = raw => {
    const out = emptyQuestStats();
    for (const k in out) out[k] = Number.isFinite(raw?.[k]) && raw[k] >= 0 ? raw[k] : 0;
    return out;
  };
  S.quests = {
    week: Number.isSafeInteger(q.week) && q.week >= 1 ? q.week : 0,   // 0 = bản lưu cũ, chọn nhiệm vụ ở buổi sáng tới
    cur: stats(q.cur), last: stats(q.last), bonus: q.bonus === true,
    list: (Array.isArray(q.list) ? q.list : []).filter(x => x && questDef(x.id) && Number.isSafeInteger(x.target) && x.target > 0
      && Number.isSafeInteger(x.reward) && x.reward >= 0).slice(0, C.QUEST_COUNT)
      .map(x => ({ id: x.id, target: x.target, reward: x.reward, done: x.done === true })),
  };
}
// Sang tuần mới: kết quả tuần vừa xong làm mốc, chọn nhiệm vụ mới. Trả về true nếu vừa đổi.
function ensureQuests() {
  const week = questWeek(), q = S.quests;
  if (q.week === week && q.list.length) return false;
  if (q.week !== week) {
    q.last = q.week === week - 1 ? q.cur : emptyQuestStats();
    q.cur = emptyQuestStats();
    q.week = week;
    q.bonus = false;
  }
  const pool = QUESTS.filter(d => d.needs !== 'cards' || S.cards.enabled);
  q.list = [];
  while (q.list.length < C.QUEST_COUNT && pool.length) {
    const d = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    q.list.push({ id: d.id, target: questTarget(d, q.last), reward: questReward(d.reward, week), done: false });
  }
  return true;
}
function payReward(n) {
  S.money += n;
  recordBook('rewards', n);
  post('PT', 'Nhận tiền thưởng nhiệm vụ, mốc sưu tầm', [['1111', '711', n]]);
}
// Cuối ngày: cộng kết quả vào tuần, trả thưởng nhiệm vụ vừa xong (ghi vào led.quests cho bảng tổng kết)
function trackQuests(led) {
  ensureQuests();
  const q = S.quests, today = questStats(led);
  for (const k in q.cur) q.cur[k] += today[k] || 0;
  for (const x of q.list) {
    if (x.done || q.cur[x.id] < x.target) continue;
    x.done = true;
    payReward(x.reward);
    led.quests.push({ text: questText(x), reward: x.reward });
  }
  if (!q.bonus && q.list.length && q.list.every(x => x.done)) {
    q.bonus = true;
    const reward = questReward(C.QUEST_ALL_BONUS);
    payReward(reward);
    led.quests.push({ text: `Xong cả ${q.list.length} nhiệm vụ tuần`, reward });
  }
}
const cardUnique = setId => CARD_CATALOG.filter(c => c.set === setId && cardCount(S.cards.owned[c.id]) > 0).length;
// Nhận mọi mốc đã đạt của một bộ; trả về tổng tiền thưởng (0 nếu chưa có mốc nào)
function claimCardMilestones(setId) {
  normalizeCards();
  if (!CARD_SETS.some(s => s.id === setId) || hostPlaying()) return 0;
  const have = cardUnique(setId);
  let got = S.cards.milestones[setId], total = 0;
  while (got < C.CARD_MILESTONES.length && have >= C.CARD_MILESTONES[got].n) total += C.CARD_MILESTONES[got++].reward;
  if (!total) return 0;
  const ok = cardTransaction(() => {
    S.cards.milestones[setId] = got;
    payReward(total);
  });
  return ok ? total : 0;
}
function cardMilestonesHTML() {
  if (!S.cards.enabled) return '';
  return '<h4>🎴 Mốc sưu tầm thẻ</h4>' + CARD_SETS.map(set => {
    const have = cardUnique(set.id), total = CARD_CATALOG.filter(c => c.set === set.id).length;
    const next = C.CARD_MILESTONES[S.cards.milestones[set.id]], ready = next && have >= next.n;
    return `<div class="quest-row ${next ? '' : 'done'}"><span class="quest-icon">${next ? '🎴' : '🏆'}</span><div>
      <b>${esc(set.name)}</b><div class="quest-bar"><i style="width:${Math.round(have / total * 100)}%"></i></div>
      <span class="muted small">Đang có ${have}/${total} mã · ${next ? `mốc ${next.n} mã: thưởng ${money(next.reward)}` : 'đã nhận hết các mốc'}</span>
      ${ready ? `<button class="btn small primary" data-card-milestone="${set.id}" ${hostPlaying() ? 'disabled' : ''}>Nhận thưởng mốc</button>` : ''}</div></div>`;
  }).join('') + '<p class="muted small">Đếm số mã khác nhau đang có trong kho thẻ. Mỗi mốc nhận một lần; bán thẻ sau đó không bị thu lại thưởng.</p>';
}
function questsHTML() {
  const q = S.quests;
  const fmt = (d, n) => d.money ? money(n) : n;
  const rows = q.list.map(x => {
    const d = questDef(x.id), have = Math.min(q.cur[x.id], x.target);
    return `<div class="quest-row ${x.done ? 'done' : ''}"><span class="quest-icon">${x.done ? '✅' : d.icon}</span><div>
      <b>${questText(x)}</b><div class="quest-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${x.target}" aria-valuenow="${have}"><i style="width:${Math.round(have / x.target * 100)}%"></i></div>
      <span class="muted small">${fmt(d, have)}/${fmt(d, x.target)} · thưởng ${money(x.reward)}${x.done ? ' · đã nhận' : ''}</span></div></div>`;
  }).join('');
  return `<div class="quest-box"><h3>🎯 Nhiệm vụ tuần ${q.week}</h3>
    <p class="hint">Còn ${7 - weekday()} ngày, tính cả hôm nay. Kết quả cộng khi đóng cửa, xong là nhận thưởng ngay. Xong cả ${q.list.length} nhiệm vụ: thưởng thêm ${money(questReward(C.QUEST_ALL_BONUS))}${q.bonus ? ' ✅' : ''}.</p>
    ${rows}${cardMilestonesHTML()}</div>`;
}
