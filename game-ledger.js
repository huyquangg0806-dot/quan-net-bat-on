/* Quán Nét Bất Ổn — sổ kép theo Thông tư 99/2025/TT-BTC: bút toán Nợ/Có, Nhật ký chung (S03a-DN), sổ cái,
   bảng cân đối số phát sinh, B01-DN, B02-DN, B03-DN (trực tiếp).
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Ghi bút toán ----------
// Một dòng bút toán: [TK Nợ, TK Có, số tiền, diễn giải riêng?, mã lưu chuyển tiền?]. Số dư tính theo Nợ dương, Có âm.
const PL_ACCS = ['5111', '5113', '521', '632', '635', '641', '642', '711', '811', '821', '911'];   // không có số dư cuối kỳ
const TANGIBLE = ['2112', '2113', '2118'], INTANGIBLE = ['2135'];
const stockAcc = k => ITEMS[k].acc || '152';
const ACC_ORDER = Object.keys(ACCOUNTS).sort();   // thứ tự hệ thống tài khoản: 1111, 1388, 152, 156…
const emptyLedger = () => ({ entries: [], base: {}, batch: [], seq: 1, no: { day: 0 }, at: 0,
  interest: { bank: 0, shark: 0 }, period: null, reports: [] });
const ledgerDay = () => S.ledger.at || S.day;   // lúc đóng cửa: bút toán cuối ngày ghi vào ngày vừa mở
function voucherNo(type, day) {
  if (S.ledger.no.day !== day) S.ledger.no = { day };
  S.ledger.no[type] = (S.ledger.no[type] || 0) + 1;
  return `${type} ${String(S.ledger.no[type]).padStart(3, '0')}/${String(day).padStart(2, '0')}`;
}
function cleanLines(lines) {
  const out = [];
  for (const [dr, cr, amt, text, cf] of lines) {
    if (!ACCOUNTS[dr] || !ACCOUNTS[cr] || dr === cr) throw new Error(`Định khoản sai: Nợ ${dr} / Có ${cr}`);
    if (!Number.isFinite(amt)) throw new Error(`Số tiền không hợp lệ: Nợ ${dr} / Có ${cr}`);
    const n = Math.round(amt);
    if (!n) continue;
    const l = n > 0 ? [dr, cr, n] : [cr, dr, -n];   // số âm: đảo vế Nợ/Có
    if (text || cf) l.push(text || '');
    if (cf) l.push(cf);
    out.push(l);
  }
  return out;
}
function addEntry(type, text, lines, extra = {}) {
  const day = ledgerDay();
  const e = { id: S.ledger.seq++, d: day, no: extra.no || voucherNo(type, day), t: text, l: lines };
  if (extra.open) e.open = true;
  S.ledger.entries.push(e);
  return e;
}
// Ghi một chứng từ. Trong ca: gom theo loại, đóng cửa lập một chứng từ tổng (như bảng kê cuối ngày).
function post(type, text, lines) {
  if (!VOUCHERS[type]) throw new Error('Loại chứng từ lạ: ' + type);
  const clean = cleanLines(lines);
  if (!clean.length) return null;
  if (!hostPlaying()) return addEntry(type, text, clean);
  for (const l of clean) {
    const t = l[3] || text, same = S.ledger.batch.find(b => b.type === type && b.l[0] === l[0] && b.l[1] === l[1] && b.l[3] === t && b.l[4] === l[4]);
    if (same) same.l[2] += l[2];
    else S.ledger.batch.push({ type, l: l[4] ? [l[0], l[1], l[2], t, l[4]] : [l[0], l[1], l[2], t] });
  }
  return null;
}
function flushBatch(day) {
  const groups = {};
  for (const b of S.ledger.batch) (groups[b.type] = groups[b.type] || []).push(b.l);
  S.ledger.batch = [];
  for (const type in groups) addEntry(type, `Tổng hợp ${VOUCHERS[type].toLowerCase()} trong ca ngày ${day}`, groups[type]);
}

// ---------- Số dư, kiểm tra khớp với trạng thái game ----------
function ledgerBalances(entries = S.ledger.entries, base = S.ledger.base) {
  const b = { ...base };
  for (const e of entries) for (const [dr, cr, n] of e.l) { b[dr] = (b[dr] || 0) + n; b[cr] = (b[cr] || 0) - n; }
  return b;
}
const balOf = (b, ...accs) => accs.reduce((n, a) => n + (b[a] || 0), 0);
// Phát sinh Nợ/Có từng tài khoản của các bút toán có id trong [fromId, toId)
function turnover(fromId, toId = Infinity) {
  const t = {};
  for (const e of S.ledger.entries) {
    if (e.id < fromId || e.id >= toId) continue;
    for (const [dr, cr, n] of e.l) { (t[dr] = t[dr] || [0, 0])[0] += n; (t[cr] = t[cr] || [0, 0])[1] += n; }
  }
  return t;
}
// Giá trị kho theo lô: 152 nguyên liệu, 156 hàng hóa (nước đóng chai + thẻ bài)
function stockValue(acc) {
  let n = 0;
  for (const k in ITEMS) if (stockAcc(k) === acc) n += (S.inv[k] || []).reduce((s, b) => s + b.val, 0);
  if (acc === '156' && S.cards) {
    const lots = arr => (arr || []).reduce((s, l) => s + l.qty * l.cost, 0);
    for (const k in S.cards.packs) n += lots(S.cards.packs[k]);
    for (const k in S.cards.owned) n += lots(S.cards.owned[k]);
  }
  return n;
}
const prepaidFee = () => accountantActive() ? (S.accountant.until - S.day) * C.ACCOUNT_FEE / C.ACCOUNT_DAYS : 0;
const billOwed = () => S.bill.rent + S.bill.net + S.bill.power + dueTotal();
// Đối chiếu sổ với thực tế (tiền trong két, kho, nợ vay, hóa đơn, thuế). Trả về danh sách chỗ lệch; rỗng là khớp.
function ledgerCheck() {
  const b0 = ledgerBalances(), bad = [];
  // Sổ trừ phần kế toán ghi sai chưa điều chỉnh; kho thật cộng phần hàng thiếu chưa kiểm kê ra
  const b = { ...b0 };
  for (const e of S.audit.errors) for (const a in e.delta) b[a] = (b[a] || 0) - e.delta[a];
  const same = (name, book, real) => { if (Math.round(book) !== Math.round(real)) bad.push(`${name}: sổ ${Math.round(book)}, thực tế ${Math.round(real)}`); };
  same('Tiền mặt 1111', balOf(b, '1111'), S.money);
  same('Nguyên liệu 152', balOf(b, '152'), stockValue('152') + missingVal('152'));
  same('Hàng hóa 156', balOf(b, '156'), stockValue('156') + missingVal('156'));
  same('Vay 3411 + lãi phải trả 335', -balOf(b, '3411', '335'), S.loans.bank + S.loans.shark);
  same('Phải trả người bán 331', -balOf(b, '331'), billOwed());
  same('Thuế TNDN 3334', -balOf(b, '3334'), taxBookOwed());
  same('Phạt nộp ngân sách 3339', -balOf(b, '3339'), taxFeeOwed());
  same('Chi phí trả trước 242', balOf(b, '242'), prepaidFee());
  const sum = Object.values(b).reduce((n, v) => n + v, 0);
  if (sum !== 0) bad.push(`Tổng số dư Nợ khác tổng số dư Có: lệch ${sum}`);
  if (!hostPlaying() && S.ledger.batch.length) bad.push('Còn bút toán trong ca chưa lập chứng từ');
  return bad;
}

// ---------- Mở sổ, bản lưu cũ ----------
// Bút toán số dư đầu kỳ: mọi tài sản và nợ hiện có đối ứng với vốn góp 4111.
function openLedger(fixed, text) {
  S.ledger = emptyLedger();
  const debt = S.loans.bank + S.loans.shark;
  addEntry('PKT', text, cleanLines([
    ['1111', '4111', S.money, 'Tiền mặt tại két'],
    ['152', '4111', stockValue('152'), 'Nguyên liệu tồn kho'],
    ['156', '4111', stockValue('156'), 'Hàng hóa tồn kho (nước, thẻ bài)'],
    ['2112', '4111', fixed, 'Máy móc, thiết bị đang dùng'],
    ['242', '4111', prepaidFee(), 'Phí kế toán trả trước còn lại'],
    ['4111', '3411', debt, 'Nợ vay đang có'],
    ['4111', '331', billOwed(), 'Hóa đơn mặt bằng, mạng, điện chưa trả'],
    ['4111', '3334', taxBookOwed(), 'Thuế còn nợ'],
    ['4111', '3339', S.taxes.reduce((n, t) => n + t.fee, 0), 'Tiền phạt chậm nộp thuế còn nợ'],
  ]), { open: true, no: `PKT 000/${String(S.day).padStart(2, '0')}` });
  S.ledger.period = { from: S.day, fromId: S.ledger.seq, open: ledgerBalances() };
}
function normalizeLedger() {
  const L = S.ledger;
  // Bản lưu chưa từng theo dõi tài sản: lấy tiền đã bỏ ra mua máy làm nguyên giá
  const fixed = S.books.assets || S.machines.reduce((n, m) => n + machineSpent(m), 0);
  if (!L || !Array.isArray(L.entries) || !L.period) return openLedger(fixed, 'Số dư đầu kỳ chuyển sang sổ kép (bản lưu cũ)');
  const okLine = l => Array.isArray(l) && ACCOUNTS[l[0]] && ACCOUNTS[l[1]] && Number.isSafeInteger(l[2]);
  L.entries = L.entries.filter(e => e && Number.isInteger(e.id) && Array.isArray(e.l) && e.l.every(okLine));
  L.base = L.base && typeof L.base === 'object' ? L.base : {};
  L.batch = Array.isArray(L.batch) ? L.batch.filter(b => b && VOUCHERS[b.type] && okLine(b.l)) : [];
  L.seq = Math.max(Number(L.seq) || 1, ...L.entries.map(e => e.id + 1));
  L.no = L.no && typeof L.no === 'object' ? L.no : { day: 0 };
  L.at = 0;
  L.interest = { bank: 0, shark: 0, ...L.interest };
  L.reports = Array.isArray(L.reports) ? L.reports.slice(0, C.ACCOUNT_HISTORY) : [];
}
// Bỏ bớt chi tiết cũ, dồn vào số dư gốc. Giữ đủ chứng từ của kỳ đang chạy.
function pruneLedger() {
  const L = S.ledger, keepFrom = Math.min(L.period.from, S.day - C.LEDGER_KEEP_DAYS);
  const old = L.entries.filter(e => e.d < keepFrom && e.id < L.period.fromId);
  if (!old.length) return;
  L.base = ledgerBalances(old, L.base);
  L.entries = L.entries.filter(e => !old.includes(e));
}

// ---------- Cuối ngày và cuối kỳ ----------
function depreciate(costAccs, accDep, text) {
  const b = ledgerBalances(), net = balOf(b, ...costAccs) + balOf(b, accDep);
  if (net <= 0) return [];
  return [['642', accDep, net <= C.DEPRECIATION_MIN ? net : Math.floor(net * C.DEPRECIATION_RATE), text]];
}
// Gọi trong finishAccounts, sau khi đã sang ngày mới (S.day = day + 1)
function ledgerCloseDay(day, led, costs, books) {
  const z = o => new Proxy(o || {}, { get: (t, k) => t[k] || 0 });   // khoản không phát sinh coi là 0
  led = z(led); costs = z(costs); books = z(books);
  S.ledger.at = day;
  flushBatch(day);
  post('BKBL', `Bảng kê bán lẻ ngày ${day}`, [
    ['1111', '5113', led.hours, 'Tiền giờ chơi, bao đêm'], ['1111', '5113', led.food, 'Đồ ăn, nước tại quầy']]);
  post('PT', `Thu khác ngày ${day}`, [['1111', '711', led.tips, 'Khách tip'], ['1111', '711', led.thiefCash, 'Tiền đền, tiền thưởng bắt trộm']]);
  post('PC', `Chi trong ca ngày ${day}`, [['521', '1111', led.refund + led.closeRefund, 'Hoàn tiền giờ cho khách'],
    ['811', '1111', led.fine, 'Nộp phạt hành chính'], ['642', '1111', costs.fuel, 'Xăng máy phát']]);
  const by = { ...books.interestBy };
  for (const k in by) S.ledger.interest[k] += by[k];
  post('PKT', `Chi phí phải trả ngày ${day}`, [
    ['642', '331', costs.rent, 'Tiền thuê mặt bằng'], ['642', '331', costs.net, 'Cước internet'],
    ['642', '331', costs.power + costs.acPower + costs.lights, 'Tiền điện (máy, điều hòa, đèn)'],
    ['811', '331', books.lateFee, 'Phạt trễ hạn hóa đơn tuần'],
    ['635', '335', by.bank || 0, 'Lãi vay ngân hàng'], ['635', '335', by.shark || 0, 'Lãi vay nóng']]);
  const wage = costs.staff + costs.nightWage;
  post('PKT', `Tiền lương ngày ${day}`, [['641', '334', wage, 'Lương nhân viên phục vụ']]);
  post('PC', `Trả lương ngày ${day}`, [['334', '1111', wage, 'Trả lương nhân viên']]);
  const fee = accountantActive(day) ? Math.min(balOf(ledgerBalances(), '242'), C.ACCOUNT_FEE / C.ACCOUNT_DAYS) : 0;
  post('PKT', `Khấu hao và phân bổ ngày ${day}`, [
    ...depreciate(TANGIBLE, '2141', 'Khấu hao TSCĐ hữu hình'), ...depreciate(INTANGIBLE, '2143', 'Khấu hao phần mềm (thư viện game)'),
    ['642', '242', fee, 'Phân bổ phí kế toán thuê ngoài']]);
}
// Chốt kỳ: kết chuyển doanh thu, chi phí sang 911, lãi lỗ sang 421; lưu báo cáo kỳ.
function ledgerClosePeriod(from, to) {
  const L = S.ledger, b = ledgerBalances();
  const pl = Object.fromEntries(PL_ACCS.map(a => [a, b[a] || 0]));
  const cf = cashFlows(L.period.fromId);
  const lines = [['5113', '521', pl['521'], 'Kết chuyển các khoản giảm trừ doanh thu']];
  for (const a of ['5111', '5113', '711']) lines.push([a, '911', -(a === '5113' ? pl[a] + pl['521'] : pl[a]), `Kết chuyển ${ACCOUNTS[a].name.toLowerCase()}`]);
  for (const a of ['632', '635', '641', '642', '811', '821']) lines.push(['911', a, pl[a], `Kết chuyển ${ACCOUNTS[a].name.toLowerCase()}`]);
  const profit = -PL_ACCS.reduce((n, a) => n + pl[a], 0);
  lines.push(['911', '4212', profit, 'Kết chuyển lợi nhuận sau thuế kỳ này']);
  lines.push(['4212', '4211', profit, 'Kết chuyển LNST kỳ này sang lũy kế']);
  post('KC', `Kết chuyển cuối kỳ ngày ${from}–${to}`, lines);
  L.reports.unshift({ from, to, fromId: L.period.fromId, toId: L.seq, open: L.period.open, close: ledgerBalances(),
    turn: turnover(L.period.fromId), pl, cf });
  L.reports = L.reports.slice(0, C.ACCOUNT_HISTORY);
  L.period = { from: to + 1, fromId: L.seq, open: ledgerBalances() };
}
function ledgerEndDay() {
  S.ledger.at = 0;
  pruneLedger();
}

// ---------- Báo cáo tài chính ----------
const CF_IN = { '5111': '01', '5113': '01', '711': '06', '1388': '06', '3411': '33', '4111': '31' };
const CF_OUT = { '521': '01', '152': '02', '156': '02', '242': '02', '331': '02', '641': '02', '642': '02', '334': '03', '335': '04',
  '3334': '05', '3339': '07', '811': '07', '1388': '07', '2112': '21', '2113': '21', '2118': '21', '2135': '21', '3411': '34', '4111': '31' };
function cashFlows(fromId, toId = Infinity) {
  const cf = {};
  for (const e of S.ledger.entries) {
    if (e.id < fromId || e.id >= toId) continue;
    for (const [dr, cr, n, , code] of e.l) {
      if (dr === '1111') cf[code || CF_IN[cr] || '06'] = (cf[code || CF_IN[cr] || '06'] || 0) + n;
      if (cr === '1111') cf[code || CF_OUT[dr] || '07'] = (cf[code || CF_OUT[dr] || '07'] || 0) - n;
    }
  }
  return cf;
}
function b01(b) {
  const v = a => b[a] || 0, r = {};
  r['111'] = r['110'] = v('1111');
  r['130'] = Math.max(0, v('1388')) + v('1381');
  r['140'] = v('152') + v('156');
  r['160'] = v('242') + Math.max(0, v('3334'));   // thuế nộp thừa (3334 dư Nợ) là khoản phải thu Nhà nước
  r['100'] = r['110'] + r['130'] + r['140'] + r['160'];
  r['222'] = balOf(b, ...TANGIBLE, ...INTANGIBLE);
  r['223'] = v('2141') + v('2143');
  r['220'] = r['200'] = r['222'] + r['223'];
  r['280'] = r['100'] + r['200'];
  r['311'] = -v('331');
  r['314'] = Math.max(0, -v('3334')) - v('3339');
  r['315'] = -v('334');
  r['320'] = -v('335') + Math.max(0, -v('1388'));
  r['321'] = -v('3411');
  r['310'] = r['300'] = r['311'] + r['314'] + r['315'] + r['320'] + r['321'];
  r['411'] = -v('4111');
  r['421'] = -v('4211') - v('4212') - PL_ACCS.reduce((n, a) => n + v(a), 0);   // gồm lãi lỗ chưa kết chuyển
  r['410'] = r['400'] = r['411'] + r['421'];
  r['440'] = r['300'] + r['400'];
  return r;
}
function b02(p) {
  const v = a => p[a] || 0, r = {};
  r['01'] = -v('5111') - v('5113');
  r['02'] = v('521');
  r['10'] = r['01'] - r['02'];
  r['11'] = v('632');
  r['20'] = r['10'] - r['11'];
  r['22'] = 0;
  r['23'] = r['24'] = v('635');
  r['25'] = v('641');
  r['26'] = v('642');
  r['30'] = r['20'] + r['22'] - r['23'] - r['25'] - r['26'];
  r['31'] = -v('711');
  r['32'] = v('811');
  r['40'] = r['31'] - r['32'];
  r['50'] = r['30'] + r['40'];
  r['51'] = v('821');
  r['52'] = 0;
  r['60'] = r['50'] - r['51'] - r['52'];
  return r;
}
function b03(cf, cashOpen) {
  const v = k => cf[k] || 0, r = {};
  for (const k of ['01', '02', '03', '04', '05', '06', '07', '21', '22', '31', '33', '34']) r[k] = v(k);
  r['20'] = r['01'] + r['02'] + r['03'] + r['04'] + r['05'] + r['06'] + r['07'];
  r['30'] = r['21'] + r['22'];
  r['40'] = r['31'] + r['33'] + r['34'];
  r['50'] = r['20'] + r['30'] + r['40'];
  r['60'] = cashOpen;
  r['70'] = r['60'] + r['50'];
  return r;
}
// Kỳ đang xem: 0 = kỳ đang chạy, n = báo cáo đã chốt thứ n (1 = gần nhất)
function ledgerPeriod(i) {
  const L = S.ledger;
  if (!i) {
    const b = ledgerBalances();
    return { from: L.period.from, to: null, fromId: L.period.fromId, toId: Infinity, open: L.period.open, close: b,
      turn: turnover(L.period.fromId), pl: Object.fromEntries(PL_ACCS.map(a => [a, b[a] || 0])), cf: cashFlows(L.period.fromId) };
  }
  return L.reports[i - 1] || null;
}

// ---------- Màn sổ sách ----------
const vnd = n => Math.round(n || 0).toLocaleString('vi-VN');
const accName = a => `${a} · ${ACCOUNTS[a].name}`;
const B01_ACCS = { '111': ['1111'], '130': ['1388', '1381'], '140': ['152', '156'], '160': ['242', '3334'], '222': [...TANGIBLE, ...INTANGIBLE],
  '223': ['2141', '2143'], '311': ['331'], '314': ['3334', '3339'], '315': ['334'], '320': ['335', '1388'], '321': ['3411'],
  '411': ['4111'], '421': ['4211', '4212'] };
const B02_ACCS = { '01': ['5111', '5113'], '02': ['521'], '11': ['632'], '23': ['635'], '24': ['635'], '25': ['641'], '26': ['642'],
  '31': ['711'], '32': ['811'], '51': ['821'] };
const LEDGER_TABS = [['nkc', '📖 Nhật ký chung'], ['cdps', '⚖️ Cân đối phát sinh'], ['b01', '🏦 B01 Tình hình tài chính'],
  ['b02', '📈 B02 Kết quả kinh doanh'], ['b03', '💵 B03 Lưu chuyển tiền'], ['socai', '📒 Sổ cái']];
let ledgerView = { tab: 'b02', period: 0, acc: '1111', entry: null };
const periodName = p => p.to ? `Ngày ${p.from}–${p.to}` : `Kỳ đang chạy (từ ngày ${p.from})`;
function periodPicker() {
  const opts = [0, ...S.ledger.reports.map((_, i) => i + 1)].map(i => {
    const p = ledgerPeriod(i);
    return `<option value="${i}" ${i === ledgerView.period ? 'selected' : ''}>${periodName(p)}</option>`;
  });
  return `<label class="ledger-pick">Kỳ: <select data-ledger-period>${opts.join('')}</select></label>`;
}
const accLink = a => `<button class="link" data-ledger-acc="${a}">${a}</button>`;
function entryRows(entries, acc) {
  return entries.map(e => e.l.filter(l => !acc || l[0] === acc || l[1] === acc).map(l => `<tr data-ledger-entry="${e.id}" class="${ledgerView.entry === e.id ? 'sel' : ''}">
    <td>${e.d}</td><td class="nowrap">${esc(e.no)}</td><td>${esc(l[3] || e.t)}</td>
    ${acc ? `<td>${accLink(l[0] === acc ? l[1] : l[0])}</td><td class="num">${l[0] === acc ? vnd(l[2]) : ''}</td><td class="num">${l[1] === acc ? vnd(l[2]) : ''}</td>`
      : `<td>${accLink(l[0])}</td><td>${accLink(l[1])}</td><td class="num">${vnd(l[2])}</td>`}</tr>`).join('')).join('');
}
function entryCard(id) {
  const e = S.ledger.entries.find(x => x.id === id);
  if (!e) return '';
  const type = e.no.split(' ')[0];
  return `<div class="ledger-voucher"><b>${esc(VOUCHERS[type] || type)} số ${esc(e.no)}</b> · ngày ${e.d}<br><span class="muted">${esc(e.t)}</span>
    <table class="ledger-table"><tr><th>Diễn giải</th><th>TK Nợ</th><th>TK Có</th><th class="num">Số tiền</th></tr>
    ${e.l.map(l => `<tr><td>${esc(l[3] || e.t)}</td><td>${accLink(l[0])}</td><td>${accLink(l[1])}</td><td class="num">${vnd(l[2])}</td></tr>`).join('')}
    <tr class="total"><td>Cộng</td><td></td><td></td><td class="num">${vnd(e.l.reduce((n, l) => n + l[2], 0))}</td></tr></table></div>`;
}
function nkcHTML() {
  const p = ledgerPeriod(ledgerView.period), list = S.ledger.entries.filter(e => e.id >= p.fromId && e.id < p.toId);
  return `${periodPicker()}<p class="muted small">Mẫu số S03a-DN. Bấm số tài khoản để mở sổ cái, bấm một dòng để xem chứng từ.</p>
    ${list.length ? `<div class="ledger-scroll"><table class="ledger-table"><tr><th>Ngày</th><th>Số CT</th><th>Diễn giải</th><th>TK Nợ</th><th>TK Có</th><th class="num">Số tiền</th></tr>${entryRows(list)}</table></div>`
      : '<p class="muted">Chi tiết kỳ này đã lưu trữ, chỉ còn số dư (xem Cân đối phát sinh).</p>'}`;
}
function cdpsHTML() {
  const p = ledgerPeriod(ledgerView.period), sum = [0, 0, 0, 0, 0, 0];
  const split = n => n >= 0 ? [n, 0] : [0, -n];
  const rows = ACC_ORDER.map(a => {
    const o = p.open[a] || 0, t = p.turn[a] || [0, 0], c = p.close[a] || 0;
    if (!o && !t[0] && !t[1] && !c) return '';
    const cells = [...split(o), t[0], t[1], ...split(c)];
    cells.forEach((n, i) => { sum[i] += n; });
    return `<tr><td>${accLink(a)}</td><td>${esc(ACCOUNTS[a].name)}</td>${cells.map(n => `<td class="num">${vnd(n)}</td>`).join('')}</tr>`;
  }).join('');
  const ok = (x, y) => x === y ? '<b class="good-text">OK</b>' : `<b class="bad-text">LỆCH ${vnd(x - y)}</b>`;
  return `${periodPicker()}<div class="ledger-scroll"><table class="ledger-table"><tr><th rowspan="2">Mã hiệu</th><th rowspan="2">Tên tài khoản</th>
    <th colspan="2">Số dư đầu kỳ</th><th colspan="2">Phát sinh trong kỳ</th><th colspan="2">Số dư cuối kỳ</th></tr>
    <tr><th>Nợ</th><th>Có</th><th>Nợ</th><th>Có</th><th>Nợ</th><th>Có</th></tr>${rows}
    <tr class="total"><td colspan="2">TỔNG CỘNG</td>${sum.map(n => `<td class="num">${vnd(n)}</td>`).join('')}</tr></table></div>
    <p>Kiểm tra đầu kỳ: ${ok(sum[0], sum[1])} · phát sinh: ${ok(sum[2], sum[3])} · cuối kỳ: ${ok(sum[4], sum[5])}</p>`;
}
function reportTable(lines, cur, prev, accs, heads) {
  const bold = code => /^(100|200|280|300|400|440|10|20|30|40|50|60|70)$/.test(code);
  return `<div class="ledger-scroll"><table class="ledger-table report"><tr><th>Chỉ tiêu</th><th>Mã số</th>${heads.map(h => `<th class="num">${h}</th>`).join('')}</tr>
    ${lines.map(([code, name, indent]) => {
      if (!code) return `<tr class="head"><td colspan="${2 + heads.length}">${esc(name)}</td></tr>`;
      const link = accs[code] ? ` data-ledger-acc="${accs[code][0]}" class="link"` : '';
      const cols = [cur[code], ...(prev ? [prev[code], cur[code] - prev[code]] : [])];
      return `<tr class="${bold(code) ? 'total' : ''}"><td style="padding-left:${(indent || 0) * 12 + 4}px">${link ? `<button${link}>${esc(name)}</button>` : esc(name)}</td>
        <td>${code}</td>${cols.map(n => `<td class="num">${vnd(n)}</td>`).join('')}</tr>`;
    }).join('')}</table></div>`;
}
function b01HTML() {
  const p = ledgerPeriod(ledgerView.period), end = b01(p.close), start = b01(p.open);
  const diff = end['280'] - end['440'];
  return `${periodPicker()}<p class="muted small">Mẫu số B01-DN, lập tại ${p.to ? `cuối ngày ${p.to}` : 'thời điểm hiện tại'}. Bấm chỉ tiêu để xem sổ cái.</p>
    ${reportTable(B01_LINES, end, start, B01_ACCS, [p.to ? `Ngày ${p.to}` : 'Hiện tại', `Đầu kỳ (ngày ${p.from})`, 'Chênh lệch'])}
    <p>Chênh lệch cân đối: <b>${vnd(diff)}</b> · ${diff ? '<b class="bad-text">KHÔNG CÂN ĐỐI</b>' : '<b class="good-text">CÂN ĐỐI</b>'}</p>`;
}
function b02HTML() {
  const i = ledgerView.period, p = ledgerPeriod(i), prev = ledgerPeriod(i + 1);
  return `${periodPicker()}<p class="muted small">Mẫu số B02-DN. ${p.to ? '' : 'Kỳ chưa chốt: số liệu tới hiện tại, chưa kết chuyển. '}Bấm chỉ tiêu để xem sổ cái.</p>
    ${reportTable(B02_LINES, b02(p.pl), prev ? b02(prev.pl) : null, B02_ACCS, [periodName(p), ...(prev ? [periodName(prev), 'Chênh lệch'] : [])])}`;
}
function b03HTML() {
  const i = ledgerView.period, p = ledgerPeriod(i), prev = ledgerPeriod(i + 1);
  const cur = b03(p.cf, p.open['1111'] || 0), cash = p.close['1111'] || 0;
  return `${periodPicker()}<p class="muted small">Mẫu số B03-DN, phương pháp trực tiếp: lấy từ các bút toán có TK 1111.</p>
    ${reportTable(B03_LINES, cur, prev ? b03(prev.cf, prev.open['1111'] || 0) : null, {}, [periodName(p), ...(prev ? [periodName(prev), 'Chênh lệch'] : [])])}
    <p>Đối chiếu tiền cuối kỳ với B01-DN (mã 110): ${cur['70'] === cash ? '<b class="good-text">KHỚP</b>' : `<b class="bad-text">LỆCH ${vnd(cur['70'] - cash)}</b>`}</p>`;
}
function socaiHTML() {
  const a = ledgerView.acc, p = ledgerPeriod(ledgerView.period);
  const list = S.ledger.entries.filter(e => e.id >= p.fromId && e.id < p.toId && e.l.some(l => l[0] === a || l[1] === a));
  const t = p.turn[a] || [0, 0], o = p.open[a] || 0, c = p.close[a] || 0;
  const side = n => n >= 0 ? `Nợ ${vnd(n)}` : `Có ${vnd(-n)}`;
  const opts = ACC_ORDER.map(x => `<option value="${x}" ${x === a ? 'selected' : ''}>${esc(accName(x))}</option>`).join('');
  return `${periodPicker()} <label class="ledger-pick">Tài khoản: <select data-ledger-acc-pick>${opts}</select></label>
    <p>Số dư đầu kỳ: <b>${side(o)}</b></p>
    <div class="ledger-scroll"><table class="ledger-table"><tr><th>Ngày</th><th>Số CT</th><th>Diễn giải</th><th>TK đối ứng</th><th class="num">Nợ</th><th class="num">Có</th></tr>
    ${entryRows(list, a)}<tr class="total"><td colspan="4">Cộng phát sinh</td><td class="num">${vnd(t[0])}</td><td class="num">${vnd(t[1])}</td></tr></table></div>
    <p>Số dư cuối kỳ: <b>${side(c)}</b></p>`;
}
function bookViewHTML() {
  const V = { nkc: nkcHTML, cdps: cdpsHTML, b01: b01HTML, b02: b02HTML, b03: b03HTML, socai: socaiHTML };
  return `<div class="howto-tabs ledger-tabs">${LEDGER_TABS.map(([id, name]) => `<button class="btn small ${id === ledgerView.tab ? 'primary' : 'ghost'}" data-ledger-tab="${id}">${name}</button>`).join('')}</div>
    <div class="ledger-body">${V[ledgerView.tab]()}</div>${ledgerView.entry ? entryCard(ledgerView.entry) : ''}
    <p class="muted small">Theo Thông tư 99/2025/TT-BTC. Bán lẻ cho khách lập bảng kê cuối ngày; mua hàng, đầu tư, vay, nộp thuế mỗi nghiệp vụ một chứng từ.</p>`;
}
// back: mở từ tờ khai thì có nút quay lại tờ khai
function openLedgerBook(tab, back) {
  if (tab) ledgerView = { ...ledgerView, tab, entry: null };
  const actions = [...(back ? [{ label: '← Quay lại tờ khai', cls: 'primary', onClick: back }] : []), { label: 'Đóng', onClick: closeModal }];
  const m = openModal({ title: '📚 Sổ sách kế toán', body: bookViewHTML(), cls: 'ledger-modal', actions });
  const redraw = () => { m.bodyEl.innerHTML = bookViewHTML(); };
  m.bodyEl.addEventListener('click', e => {
    const t = e.target.closest('[data-ledger-tab],[data-ledger-acc],[data-ledger-entry]');
    if (!t) return;
    if (t.dataset.ledgerTab) ledgerView = { ...ledgerView, tab: t.dataset.ledgerTab, entry: null };
    else if (t.dataset.ledgerAcc) ledgerView = { ...ledgerView, tab: 'socai', acc: t.dataset.ledgerAcc, entry: null };
    else ledgerView.entry = Number(t.dataset.ledgerEntry);
    redraw();
  });
  m.bodyEl.addEventListener('change', e => {
    if (e.target.matches('[data-ledger-period]')) ledgerView = { ...ledgerView, period: Number(e.target.value), entry: null };
    else if (e.target.matches('[data-ledger-acc-pick]')) ledgerView = { ...ledgerView, acc: e.target.value, entry: null };
    else return;
    redraw();
  });
  return m;
}
