/* Quán Nét Bất Ổn — hóa đơn bán hàng: khách xin hóa đơn, người chơi tự lập (kể cả số tiền viết bằng chữ),
   hóa đơn thay thế, phạt không lập / lập sai. Hóa đơn là chứng từ: doanh thu đã nằm trong bảng kê bán lẻ, không ghi sổ lần hai.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Đọc số tiền thành chữ ----------
const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
// Một nhóm 3 chữ số. full: nhóm đứng sau nhóm khác thì đọc đủ "không trăm", "linh"
function readTriple(n, full) {
  const h = Math.floor(n / 100), t = Math.floor(n % 100 / 10), u = n % 10, w = [];
  if (h || full) w.push(DIGIT_WORDS[h], 'trăm');
  if (t > 1) {
    w.push(DIGIT_WORDS[t], 'mươi');
    if (u === 1) w.push('mốt'); else if (u === 4) w.push('tư'); else if (u === 5) w.push('lăm'); else if (u) w.push(DIGIT_WORDS[u]);
  } else if (t === 1) {
    w.push('mười');
    if (u === 5) w.push('lăm'); else if (u) w.push(DIGIT_WORDS[u]);
  } else if (u) {
    if (h || full) w.push('linh');
    w.push(DIGIT_WORDS[u]);
  }
  return w;
}
function numberWords(n) {
  n = Math.round(Math.abs(n));
  if (!n) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ'], groups = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) groups.push(x % 1000);
  const w = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    w.push(...readTriple(groups[i], i < groups.length - 1));
    if (units[i]) w.push(units[i]);
  }
  const s = w.join(' ') + ' đồng';
  return s[0].toUpperCase() + s.slice(1);
}
// So chữ: bỏ hoa thường, dấu câu, "đồng/chẵn"; coi lẻ = linh, ngàn = nghìn, tư = bốn, lăm = năm, mốt = một; bỏ "không trăm"
const WORD_SAME = { 'lẻ': 'linh', 'ngàn': 'nghìn', 'tư': 'bốn', 'lăm': 'năm', 'nhăm': 'năm', 'mốt': 'một' };
function wordsKey(s) {
  const w = String(s).normalize('NFC').toLowerCase().replace(/[.,;:!?()\-]/g, ' ').split(/\s+/)
    .filter(x => x && !['đồng', 'chẵn', 'vnđ', 'vnd'].includes(x)).map(x => WORD_SAME[x] || x);
  return w.join(' ').replace(/\bkhông trăm /g, '').trim();
}
const sameWords = (a, b) => wordsKey(a) === wordsKey(b);

// ---------- Khách xin hóa đơn ----------
function normalizeInvoices() {
  const num = n => Number.isSafeInteger(n) && n >= 0;
  S.invoices = { requests: [], issued: [], nextReq: 1, nextNo: 1, ...S.invoices };
  const okLines = l => Array.isArray(l) && l.every(x => x && typeof x.name === 'string' && num(x.qty) && num(x.price));
  S.invoices.requests = (Array.isArray(S.invoices.requests) ? S.invoices.requests : []).filter(r => r && num(r.id) && r.buyer && okLines(r.lines));
  S.invoices.issued = (Array.isArray(S.invoices.issued) ? S.invoices.issued : []).filter(r => r && num(r.no) && okLines(r.lines)).slice(-C.INVOICE_KEEP);
  S.invoices.nextReq = Math.max(Number(S.invoices.nextReq) || 1, ...S.invoices.requests.map(r => r.id + 1));
  S.invoices.nextNo = Math.max(Number(S.invoices.nextNo) || 1, ...S.invoices.issued.map(r => r.no + 1));
}
const invoiceTotal = lines => lines.reduce((n, l) => n + l.qty * l.price, 0);
const invoiceNo = n => String(n).padStart(7, '0');
// Không dùng Math.random: khách xin hay không phụ thuộc mã khách và ngày, để không xáo số ngẫu nhiên của các việc khác trong ca
const steadyRoll = (a, b) => ((Math.imul(a + 1, 2654435761) ^ Math.imul(b + 7, 40503)) >>> 0) % 10000 / 10000;
// Phiếu tính tiền của khách: tiền giờ (sau hoàn) + từng món đã tính tiền
function invoiceLines(c, pc) {
  const lines = [], hours = (c.paid || 0) - (c.refunded || 0);
  if (hours > 0) lines.push({ name: c.overnight ? 'Gói chơi game bao đêm' : `Dịch vụ chơi game ${TIERS[machineTier(pc.m)].phrase}`, unit: 'lượt', qty: 1, price: hours });
  for (const k in c.bought || {}) lines.push({ name: ITEMS[k].name, unit: ITEMS[k].cat === 'drink' ? 'ly' : 'phần', qty: c.bought[k], price: ITEMS[k].price });
  if (c.foodExtra > 0) lines.push({ name: 'Phụ thu món đặc biệt', unit: 'lần', qty: 1, price: c.foodExtra });
  return lines;
}
// Gọi khi khách về (game-day.js leave)
function askInvoice(c, pc, reason) {
  if (!unlocked('invoice') || !['done', 'close'].includes(reason) || SEGMENTS[c.seg]?.kid) return;
  const lines = invoiceLines(c, pc);
  if (invoiceTotal(lines) < C.INVOICE_MIN || steadyRoll(c.id, S.day) >= (C.INVOICE_ASK[c.seg] ?? C.INVOICE_ASK_OTHER)) return;
  const buyer = INVOICE_BUYERS[Math.floor(steadyRoll(S.day, c.id) * INVOICE_BUYERS.length)];
  S.invoices.requests.push({ id: S.invoices.nextReq++, day: S.day, cust: c.name, buyer, lines });
  log(`📄 ${c.name} xin hóa đơn cho ${buyer.name}, để lại danh thiếp — lập trước giờ mở cửa mai`);
}
// Phạt đóng vào ngân sách: ghi nợ 3339 như tiền phạt thuế, đóng cùng nút "Đóng thuế"
function invoiceFine(amount, text) {
  post('PKT', text, [['811', '3339', amount]]);
  S.taxes.push({ to: S.day, base: 0, fee: amount, dueDay: S.day + C.TAX_GRACE - 1 });
}

// ---------- Lập hóa đơn ----------
const sameText = (a, b) => String(a ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() === String(b).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const digitsOnly = s => String(s ?? '').replace(/\D/g, '');
// Chấm từng ô: trả về danh sách ô sai
function invoiceErrors(req, v) {
  const bad = [], total = invoiceTotal(req.lines);
  if (!sameText(v.name, req.buyer.name)) bad.push('Tên đơn vị mua');
  if (digitsOnly(v.mst) !== req.buyer.mst) bad.push('Mã số thuế người mua');
  if (!sameText(v.addr, req.buyer.addr)) bad.push('Địa chỉ người mua');
  req.lines.forEach((l, i) => { if (Math.round(Number(v.amounts?.[i]) || 0) !== l.qty * l.price) bad.push(`Thành tiền dòng ${i + 1}`); });
  if (Math.round(Number(v.total) || 0) !== total) bad.push('Cộng tiền hàng');
  if (!sameWords(v.words || '', numberWords(total))) bad.push('Số tiền viết bằng chữ');
  return bad;
}
function issueInvoice(id, values, by = 'self') {
  const req = S.invoices.requests.find(r => r.id === id);
  if (!req || (R && !R.over)) return null;
  const errors = by === 'accountant' ? [] : invoiceErrors(req, values);
  const rec = { no: S.invoices.nextNo++, day: req.day, issuedOn: S.day, cust: req.cust, buyer: req.buyer, lines: req.lines,
    total: invoiceTotal(req.lines), values: by === 'accountant' ? null : values, errors, by, status: errors.length ? 'wrong' : 'ok' };
  if (req.replaces) {
    const old = S.invoices.issued.find(x => x.no === req.replaces);
    if (old) { old.status = 'replaced'; old.replacedBy = rec.no; }
    rec.replaces = req.replaces;
  }
  S.invoices.requests = S.invoices.requests.filter(r => r !== req);
  S.invoices.issued.push(rec);
  S.invoices.issued = S.invoices.issued.slice(-C.INVOICE_KEEP);
  saveGame();
  renderPrep();
  return rec;
}
// Kế toán lập hộ: luôn đúng, tốn phí mỗi tờ
function accountantInvoice(id) {
  if (!accountantActive() || S.money < C.INVOICE_ACCOUNTANT_FEE || (R && !R.over)) return null;
  S.money -= C.INVOICE_ACCOUNTANT_FEE;
  post('PC', 'Phí kế toán lập hóa đơn hộ', [['642', '1111', C.INVOICE_ACCOUNTANT_FEE]]);
  return issueInvoice(id, null, 'accountant');
}
// Hóa đơn đã lập bị sai: lập hóa đơn thay thế (khách đã có danh thiếp, không cần chờ khách)
function replaceInvoice(no) {
  const old = S.invoices.issued.find(x => x.no === no);
  if (!old || old.status !== 'wrong' || S.invoices.requests.some(r => r.replaces === no) || (R && !R.over)) return false;
  S.invoices.requests.push({ id: S.invoices.nextReq++, day: old.day, cust: old.cust, buyer: old.buyer, lines: old.lines, replaces: no });
  saveGame();
  renderPrep();
  return true;
}
function refuseInvoice(id) {
  const req = S.invoices.requests.find(r => r.id === id);
  if (!req || req.replaces || (R && !R.over)) return null;
  S.invoices.requests = S.invoices.requests.filter(r => r !== req);
  const reported = Math.random() < C.INVOICE_REPORT_RATE;
  if (reported) invoiceFine(C.INVOICE_REFUSE_FINE, `Phạt không xuất hóa đơn cho ${req.buyer.name}`);
  saveGame();
  renderPrep();
  return { reported };
}
// Kéo cửa mở quán: yêu cầu hôm trước chưa lập thì bị phạt lập không đúng thời điểm (khách không nhận được hóa đơn)
function invoicesOnOpen() {
  const notes = [];
  for (const req of S.invoices.requests.filter(r => !r.replaces && r.day < S.day)) {
    S.invoices.requests = S.invoices.requests.filter(r => r !== req);
    invoiceFine(C.INVOICE_LATE_FINE, `Phạt không lập hóa đơn đúng thời điểm (khách ${req.cust})`);
    notes.push(`📄 Chưa lập hóa đơn cho ${req.cust} (${req.buyer.name}): phạt ${money(C.INVOICE_LATE_FINE, true)}, đóng cùng thuế ở tab Hóa đơn.`);
  }
  return notes;
}
// Cuối ngày: hóa đơn sai chưa thay thế có thể bị cơ quan thuế đối chiếu ra
function invoiceDaily(day, news) {
  for (const rec of S.invoices.issued) {
    if (rec.status !== 'wrong' || rec.audited || S.invoices.requests.some(r => r.replaces === rec.no)) continue;
    if (Math.random() >= C.INVOICE_AUDIT_DAILY) continue;
    rec.audited = true;
    invoiceFine(C.INVOICE_ERROR_FINE, `Phạt lập hóa đơn sai số ${invoiceNo(rec.no)}`);
    news.push(['bad', `🔎 Cơ quan thuế phát hiện hóa đơn số ${invoiceNo(rec.no)} lập sai (${rec.errors.join(', ')}): phạt ${money(C.INVOICE_ERROR_FINE, true)}. Nên lập hóa đơn thay thế.`]);
  }
}
// Tổng tiền hóa đơn đã xuất (không tính hóa đơn đã bị thay thế) của các ngày bán [from, to]
const invoicedBetween = (from, to) => S.invoices.issued.filter(r => r.status !== 'replaced' && r.day >= from && r.day <= to).reduce((n, r) => n + r.total, 0);

// ---------- Màn hóa đơn ----------
function invoiceBoxHTML() {
  if (!unlocked('invoice') && !S.invoices.requests.length && !S.invoices.issued.length) return '';
  const playing = R && !R.over, acc = accountantActive();
  const reqs = S.invoices.requests.map(r => `<div class="due ${!r.replaces && r.day < S.day ? 'late' : ''}"><div><b>${r.replaces ? `Thay thế hóa đơn số ${invoiceNo(r.replaces)}` : `Khách ${esc(r.cust)}`}</b> · ${esc(r.buyer.name)}
      <div class="small">Ngày bán ${r.day} · ${money(invoiceTotal(r.lines), true)}${r.replaces ? '' : ' · lập trước khi kéo cửa'}</div></div>
      <div class="loan-btns"><button class="btn small primary" data-invoice-form="${r.id}" ${playing ? 'disabled' : ''}>Lập hóa đơn</button>
      ${acc && !r.replaces ? `<button class="btn small" data-invoice-accountant="${r.id}" ${playing || S.money < C.INVOICE_ACCOUNTANT_FEE ? 'disabled' : ''}>Nhờ kế toán · ${money(C.INVOICE_ACCOUNTANT_FEE)}</button>` : ''}
      ${r.replaces ? '' : `<button class="btn small ghost" data-invoice-refuse="${r.id}" ${playing ? 'disabled' : ''}>Từ chối</button>`}</div></div>`).join('');
  const issued = S.invoices.issued.slice(-5).reverse().map(r => `<p class="small">Số ${invoiceNo(r.no)} · ${esc(r.buyer.name)} · ${money(r.total, true)} ·
      ${r.status === 'ok' ? '<b class="good-text">đúng</b>' : r.status === 'replaced' ? `đã thay bằng số ${invoiceNo(r.replacedBy)}` : `<b class="bad-text">sai: ${esc(r.errors.join(', '))}</b>`}
      ${r.status === 'wrong' && !S.invoices.requests.some(q => q.replaces === r.no) ? `<button class="btn small" data-invoice-replace="${r.no}" ${playing ? 'disabled' : ''}>Lập hóa đơn thay thế</button>` : ''}</p>`).join('');
  return `<h4>📄 Hóa đơn bán hàng</h4>${reqs || '<p class="muted small">Chưa có khách xin hóa đơn.</p>'}${issued}
    <p class="muted small">Hóa đơn chỉ là chứng từ: doanh thu đã ghi trong bảng kê bán lẻ của ngày bán, không ghi sổ lần hai.
      Chưa lập trước khi mở cửa hôm sau: phạt ${money(C.INVOICE_LATE_FINE, true)}. Từ chối: khách có thể báo, phạt ${money(C.INVOICE_REFUSE_FINE, true)}.
      Lập sai mà không thay thế: dễ bị phạt ${money(C.INVOICE_ERROR_FINE, true)}. Khai doanh thu thấp hơn tổng hóa đơn đã xuất thì dễ bị đối chiếu gấp ${C.INVOICE_DECLARE_AUDIT_MUL} lần.</p>`;
}
function invoiceFormHTML(req) {
  req.input = req.input || {};
  const v = req.input, amt = i => v.amounts?.[i] ?? '';
  const num = (attr, val) => `<input inputmode="numeric" ${attr} value="${val === '' || val == null ? '' : vnd(val)}">`;
  const txt = (attr, val, label) => `<input type="text" ${attr} value="${esc(val ?? '')}" aria-label="${label}" autocomplete="off">`;
  return `<div class="invoice-src"><div class="invoice-card"><b>🪪 Danh thiếp khách đưa</b><br>${esc(req.buyer.name)}<br>MST: ${req.buyer.mst}<br>${esc(req.buyer.addr)}</div>
    <div class="invoice-card"><b>🧾 Phiếu tính tiền ngày ${req.day}</b>${req.lines.map(l => `<br>${esc(l.name)}: ${l.qty} ${l.unit} × ${vnd(l.price)}`).join('')}</div></div>
    <div class="invoice-paper"><p class="invoice-head"><b>HÓA ĐƠN BÁN HÀNG</b><br><span class="small">Ký hiệu: ${INVOICE_SELLER.series} · Số: ${invoiceNo(S.invoices.nextNo)} · Ngày ${req.day}</span></p>
    ${req.replaces ? `<p class="small warn-text">Thay thế cho hóa đơn số ${invoiceNo(req.replaces)}.</p>` : ''}
    <p class="small">Đơn vị bán: <b>${esc(S.shopName)}</b> · MST: ${INVOICE_SELLER.mst}</p>
    <label class="invoice-field">Tên đơn vị mua ${txt('data-inv="name"', v.name, 'Tên đơn vị mua')}</label>
    <label class="invoice-field">Mã số thuế ${txt('data-inv="mst" inputmode="numeric"', v.mst, 'Mã số thuế người mua')}</label>
    <label class="invoice-field">Địa chỉ ${txt('data-inv="addr"', v.addr, 'Địa chỉ người mua')}</label>
    <div class="ledger-scroll"><table class="ledger-table invoice-lines"><tr><th>STT</th><th>Tên hàng hóa, dịch vụ</th><th>ĐVT</th><th class="num">SL</th><th class="num">Đơn giá</th><th class="num">Thành tiền</th></tr>
    ${req.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.name)}</td><td>${l.unit}</td><td class="num">${l.qty}</td><td class="num">${vnd(l.price)}</td><td class="num">${num(`data-inv-amt="${i}" aria-label="Thành tiền dòng ${i + 1}"`, amt(i))}</td></tr>`).join('')}
    <tr class="total"><td></td><td colspan="2">Cộng tiền hàng</td><td></td><td></td><td class="num">${num('data-inv="total" aria-label="Cộng tiền hàng"', v.total ?? '')}</td></tr></table></div>
    <label class="invoice-field wide">Số tiền viết bằng chữ ${txt('data-inv="words"', v.words, 'Số tiền viết bằng chữ')}</label></div>`;
}
function invoiceResultHTML(rec) {
  const req = { buyer: rec.buyer, lines: rec.lines }, v = rec.values || {};
  const row = (name, mine, right) => `<tr><td>${name}</td><td>${esc(mine)}</td><td>${esc(right)}</td><td>${rec.errors.includes(name) ? '<b class="bad-text">✗</b>' : '<b class="good-text">✓</b>'}</td></tr>`;
  const rows = rec.values ? [row('Tên đơn vị mua', v.name || '', req.buyer.name), row('Mã số thuế người mua', v.mst || '', req.buyer.mst), row('Địa chỉ người mua', v.addr || '', req.buyer.addr),
    ...rec.lines.map((l, i) => row(`Thành tiền dòng ${i + 1}`, vnd(v.amounts?.[i]), vnd(l.qty * l.price))),
    row('Cộng tiền hàng', vnd(v.total), vnd(rec.total)), row('Số tiền viết bằng chữ', v.words || '', numberWords(rec.total))].join('') : '';
  return `${rows ? `<div class="ledger-scroll"><table class="ledger-table"><tr><th>Ô</th><th>Bạn ghi</th><th>Đúng</th><th></th></tr>${rows}</table></div>` : ''}
    ${rec.errors.length ? `<p class="warn">⚠️ Hóa đơn số ${invoiceNo(rec.no)} sai ${rec.errors.length} chỗ. Nên lập hóa đơn thay thế ở tab Hóa đơn trước khi cơ quan thuế đối chiếu ra.</p>`
      : `<p class="note">✅ Hóa đơn số ${invoiceNo(rec.no)} đã ký số và gửi cho ${esc(rec.buyer.name)}.</p>`}`;
}
function openInvoiceForm(id) {
  const req = S.invoices.requests.find(r => r.id === id);
  if (!req || (R && !R.over)) return;
  const read = () => {
    const v = req.input;
    document.querySelectorAll('[data-inv]').forEach(i => { v[i.dataset.inv] = i.dataset.inv === 'total' ? parseVnd(i.value) : i.value; });
    v.amounts = [...document.querySelectorAll('[data-inv-amt]')].map(i => i.value === '' ? '' : parseVnd(i.value));
  };
  const m = openModal({ title: req.replaces ? '📄 Lập hóa đơn thay thế' : '📄 Lập hóa đơn cho khách', body: invoiceFormHTML(req), cls: 'ledger-modal', actions: [
    { label: 'Đóng', onClick: () => { read(); closeModal(); } },
    { label: 'Ký số và gửi hóa đơn', cls: 'primary', onClick: () => {
      read();
      const rec = issueInvoice(id, req.input);
      if (rec) openModal({ title: `📄 Hóa đơn số ${invoiceNo(rec.no)}`, body: invoiceResultHTML(rec), cls: 'ledger-modal', actions: [{ label: 'Đóng', onClick: closeModal }] });
    } },
  ] });
  m.bodyEl.addEventListener('change', e => {
    if (e.target.matches('[data-inv-amt],[data-inv="total"]')) e.target.value = e.target.value.trim() === '' ? '' : vnd(parseVnd(e.target.value));
  });
  return m;
}
