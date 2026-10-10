/* Quán Nét Bất Ổn — buổi sáng: dàn máy, phím chuột, hóa đơn, vay vốn, mở cửa.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Dàn máy ----------
function buyMachine() {
  if (S.machines.length >= C.MAX_PCS || S.money < C.PC_COST) return;
  S.money -= C.PC_COST;
  recordBook('investment', C.PC_COST);
  post('PC', 'Mua máy tính mới', [['2112', '1111', C.PC_COST]]);
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
  recordBook('investment', cost);
  post('PC', `Nâng cấp ${PARTS[k].name} máy ${i + 1}`, [['2112', '1111', cost]]);
  if (m.missing !== k) addPartWaste(k, lv);   // đồ cũ tháo ra (đồ bị trộm thì không còn gì để thu)
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
  recordBook('operating', cost);
  post('PC', full ? `Thay phím chuột máy ${i + 1}` : `Sửa tạm phím chuột máy ${i + 1}`, [['642', '1111', cost]]);
  if (full) { addPartWaste('kb', m.kb); addPartWaste('mouse', m.mouse); }
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
  recordBook('investment', cost);
  post('PC', `Mua lại ${PARTS[m.missing].name} bị trộm, máy ${i + 1}`, [['2112', '1111', cost]]);
  m.missing = null;
  SFX.play('coin');
  saveGame();
  renderPrep();
}
// tiền thu về khi bán máy: một phần tiền mua máy + linh kiện đã nâng
const machineSpent = m => C.PC_COST + Object.keys(PARTS).reduce((s, k) => s + PARTS[k].cost.slice(1, m[k] + 1).reduce((a, b) => a + b, 0), 0);
function sellValue(m) {
  return round1k(machineSpent(m) * C.SELL_RATIO);
}
// Thanh lý: tiền thu ghi thu nhập khác; ghi giảm nguyên giá máy và phần hao mòn tương ứng, giá trị còn lại vào chi phí khác
function postMachineSale(m) {
  const b = ledgerBalances(), pool = balOf(b, '2112', '2113', '2118');
  const cost = Math.min(machineSpent(m), balOf(b, '2112')), dep = pool > 0 ? Math.round(-balOf(b, '2141') * cost / pool) : 0;
  post('PKT', 'Thanh lý máy tính', [['1111', '711', sellValue(m), 'Thu tiền thanh lý máy', '22'],
    ['2141', '2112', dep, 'Ghi giảm hao mòn máy thanh lý'], ['811', '2112', cost - dep, 'Giá trị còn lại máy thanh lý']]);
}
function sellMachine(i) {
  if (S.machines.length <= 1) return;
  postMachineSale(S.machines[i]);
  recordBook('assetSales', sellValue(S.machines[i]));
  S.books.assets -= Math.min(S.books.assets, sellValue(S.machines[i]));
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
      <div class="si mc-picture">${PSCN.preview(m, i)}</div>
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
  const picture = (machine, label) => '<figure>'+PSCN.preview(machine,i)+'<figcaption>'+label+'</figcaption></figure>';
  return '<div class="pr-preview">'+picture(m,'Máy hiện tại')+picture(after,t<4?'Sau khi nâng CPU + card lên hạng kế':'Đã đạt hạng cao nhất')+'</div>';
}
// Đồ nâng cấp treo tường mà cảnh buổi sáng và cảnh trong ca cùng vẽ
const decorOf = () => ({ ac: !!S.upgrades.ac, inverter: !!S.upgrades.inverter, ups: !!S.upgrades.ups, net: NET_PLANS.findIndex(p => p.id === S.net) });
function renderMorning() {
  const lines = Object.keys(ITEMS).filter(k => S.unlocked[k]).map(k => ({name:ITEMS[k].name,price:money(ITEMS[k].price),icon:PXUI.MAP[ITEMS[k].icon]}));
  const rates = Object.values(TIERS).map((t, i, all) => t.short+' '+money(t.rate)+(i === all.length - 1 ? ' /giờ' : ''));
  $('#prep-scene').innerHTML = PSCN.morning(S.shopName,lines,rates,GAMES[S.hot].name,S.machines,decorOf());
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
  const quote = quotePrice(k, near);
  if (!S.unlocked[k] || S.money < quote) return;
  // Sổ ghi theo hóa đơn nhà cung cấp; giao thiếu thì kho thật ít hơn sổ (lộ ra khi kiểm kê)
  const { paid, short } = supplierDeal(k, near, quote);
  S.money -= paid;
  addStock(k, it.pack - short, near ? nearShelf(k) : it.shelf, paid / it.pack);
  post('PNK', `Nhập kho ${it.name}${near ? ' (hàng cận date)' : ''}`, [[stockAcc(k), '1111', paid]]);
  if (short) addMissing(k, 'supplier', short, paid - Math.round((it.pack - short) * paid / it.pack));
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
// lương ca đêm (sau 22h) mỗi giờ cho cả nhóm nhân viên
const nightWagePerHour = () => S.staff.reduce((n, p) => n + p.wage, 0) / C.SHIFT_HOURS * C.NIGHT_WAGE_MUL;
function renderStaff() {
  const max = Math.ceil(S.machines.length / C.STAFF_PCS);
  const wage = S.staff.reduce((sum, p) => sum + p.wage, 0);
  $('#prep-staff').innerHTML = `<div class="staff-box">
    <p><b>${S.staff.length}/${max} nhân viên</b> · sức phục vụ ${S.staff.length * C.STAFF_PCS} máy · lương ${money(wage)}/ngày</p>
    <p class="muted small">Một người phụ trách tối đa 3 máy đang có khách. Đã đào tạo thì tự nạp đúng giờ khách yêu cầu. Không có nhân viên trống, bạn vẫn tự nhận đơn và mang món như trước.</p>
    <p class="muted small">🌙 Lương ngày trả cho ca 8h–22h. Mở quá 22h: mỗi giờ trả thêm ${money(nightWagePerHour())} cho cả nhóm, và nhân viên mệt nên ghi sai đơn nhiều gấp ${C.NIGHT_STAFF_TIRED}.</p>
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
  recordBook('operating', C.STAFF_TRAIN_COST);
  post('PC', `Chi phí training ${staffName(p.id)}`, [['641', '1111', C.STAFF_TRAIN_COST]]);
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
  gamblingPeak();
  if (ensureQuests()) saveGame();   // nhiệm vụ tuần mới thuộc đúng bản lưu, tải lại không đổi
  ensureWasteQuote();
  autoSellWaste();
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
      return `<div class="stock-row locked"><div class="si">${PSCN.itemIcon(ITEMS[k].icon)}</div>
        <div><b>${it.name}</b><div class="muted small">🔒 Mở khóa trong phần nâng cấp</div></div><div></div></div>`;
    }
    const chips = S.inv[k].map(b => {
      const past = daysPast(b);
      if (past > 0) return `<span class="chip expired">☠️ ${b.qty} cái · hết date ${past} ngày</span>`;
      const left = 1 - past;
      const cls = left <= 1 ? 'bad' : left <= 2 ? 'warn' : '';
      return `<span class="chip ${cls}">${b.qty} cái · ${left <= 1 ? 'hết hạn sau hôm nay' : 'còn ' + left + ' ngày'}</span>`;
    }).join('');
    const exp = expiredCount(k), nc = quotePrice(k, true), pc = quotePrice(k, false);
    return `<div class="stock-row ${exp ? 'has-expired' : ''}"><div class="si">${PSCN.itemIcon(ITEMS[k].icon)}</div>
      <div><b>${it.name}</b> <span class="muted small">bán ${money(it.price)} · hạn ${it.shelf} ngày</span>
        <div class="chips">${chips || '<span class="chip bad">Hết hàng</span>'}</div></div>
      <div class="stock-btns">
        <button class="btn small" data-buy="${k}" ${S.money < pc ? 'disabled' : ''}>+${it.pack} · ${money(pc)}</button>
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
    (S.suspendDay === S.day ? `<p class="bad-text">🚫 Hôm nay quán bị đình chỉ vì ${S.suspendReason === 'gambling' ? 'giới thiệu cờ bạc mạng' : 'mở quá giờ nhiều lần'} — không mở cửa được.</p>` : '') +
    billHTML() + netPlansHTML() + loansHTML();
  $('#prep-accounts').innerHTML = accountsHTML();
  $('#prep-waste').innerHTML = unlocked('waste') || S.waste.lots.length ? wasteHTML() : '';
  $('#prep-quests').innerHTML = unlockNewsHTML() + (unlocked('quests') ? questsHTML() : '');
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
  post('PC', 'Trả hóa đơn tuần (mặt bằng, mạng, điện)', [['331', '1111', total]]);
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
  post('PC', 'Tự trả hóa đơn tuần (mặt bằng, mạng, điện)', [['331', '1111', total]]);
  S.dueBill = null;
  if (S.netCut) news.push(['note', '📶 Đã trả nợ cước, nhà mạng nối mạng lại.']);
  S.netCut = false;
  news.push(['note', `✅ Đã tự trả hóa đơn tuần <b>${money(total)}</b>.`]);
}

// Vay vốn: ngân hàng lãi thấp có hạn mức; vay nóng lãi cao, ai cũng vay được, lâu không trả có người tới đòi
const bankLimit = () => round1k((C.BANK_BASE + C.BANK_PER_PC * S.machines.length) * S.rating / 3);
function canBorrow(kind, amt) {
  if (!['bank', 'shark'].includes(kind) || !Number.isSafeInteger(amt) || amt <= 0) return false;
  if (kind === 'bank') {
    if (S.dueBill && S.day > S.dueBill.dueDay) return false;   // đang trễ hóa đơn thì ngân hàng không cho vay
    return S.loans.bank + amt <= bankLimit();
  }
  return S.loans.shark + amt <= C.SHARK_MAX;
}
function borrow(kind, amt) {
  if (hostPlaying() || !canBorrow(kind, amt)) return false;
  const before = { money: S.money, debt: S.loans[kind], ledger: JSON.stringify(S.ledger) };
  S.loans[kind] += amt;
  S.money += amt;
  post('PT', kind === 'bank' ? 'Vay ngân hàng' : 'Vay nóng', [['1111', '3411', amt]]);
  if (saveGame() === false) { S.money = before.money; S.loans[kind] = before.debt; S.ledger = JSON.parse(before.ledger); return false; }
  renderPrep();
  return true;
}
function repay(kind, amt) {
  if (hostPlaying() || !['bank', 'shark'].includes(kind) || !Number.isSafeInteger(amt) || amt < 0) return false;
  const pay = Math.min(amt || S.loans[kind], S.loans[kind], Math.max(0, S.money));
  if (pay <= 0) return false;
  const before = { money: S.money, debt: S.loans[kind], sharkDays: S.sharkDays, ledger: JSON.stringify(S.ledger) };
  S.loans[kind] -= pay;
  S.money -= pay;
  // trả lãi đã cộng dồn (335) trước, phần còn lại trừ vào nợ gốc (3411)
  const interest = Math.min(pay, S.ledger.interest[kind]);
  S.ledger.interest[kind] -= interest;
  post('PC', kind === 'bank' ? 'Trả nợ vay ngân hàng' : 'Trả nợ vay nóng', [['335', '1111', interest, 'Trả lãi vay'], ['3411', '1111', pay - interest, 'Trả nợ gốc vay']]);
  if (!S.loans.shark) S.sharkDays = 0;
  if (saveGame() === false) { S.money = before.money; S.loans[kind] = before.debt; S.sharkDays = before.sharkDays; S.ledger = JSON.parse(before.ledger); return false; }
  renderPrep();
  return true;
}
function loansHTML(only) {
  const L = S.loans;
  const btn = (attr, kind, amt, label, ok) => `<button class="btn small ${attr === 'repay' ? '' : 'ghost'}" data-${attr}="${kind}" data-amt="${amt}" ${ok ? '' : 'disabled'}>${label}</button>`;
  const row = (kind, icon, name, rate, note) => {
    if (only && only !== kind) return '';
    const bal = L[kind];
    const amts = [100000, 300000];
    return `<div class="loan-row"><div><b>${icon} ${name}</b> · lãi ${(rate * 100).toFixed(1).replace('.0', '')}%/ngày
        <div class="muted small">${bal ? `Đang nợ <b>${money(bal)}</b>` : 'Chưa nợ'} · ${note}</div></div>
      <div class="loan-btns">${amts.map(a => btn('borrow', kind, a, `Vay ${money(a)}`, !hostPlaying() && canBorrow(kind, a))).join('')}
        ${bal ? btn('repay', kind, 0, `Trả ${money(Math.min(bal, Math.max(0, S.money)))}`, !hostPlaying() && S.money > 0) : ''}</div></div>`;
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
  recordBook('investment', fee);
  post('PC', `Lắp đặt đường truyền ${p.name}`, [['2113', '1111', fee]]);
  S.net = id;
  saveGame();
  renderPrep();
}

// =====================================================================
//  TRONG NGÀY
// =====================================================================
function startDay() {
  normalizeCards();
  const invoiceNotes = invoicesOnOpen();   // hóa đơn khách xin hôm trước mà chưa lập: phạt trước khi mở cửa
  R = {
    time: C.OPEN_HOUR, paused: false, over: false,
    cardSpawnIn: C.CARD_BUYER_START_SECONDS,
    spawnIn: 1.5, queue: [], selected: null, pick: null, nextId: 1,
    pcs: S.machines.map((m, i) => ({ i, m, tier: machineTier(m), cust: null, dirty: false, cleaningBy: null, cleanIn: 0,
      broken: false, repair: 0, brokeFor: 0, breakLoss: 0, el: null, bubbleKey: '' })),
    led: { pingHours: 0, hours: 0, food: 0, tips: 0, power: 0, staff: 0, staffMistakes: 0, served: 0, walkouts: 0, satSum: 0, ratingBefore: S.rating, reviews: [], lost: {}, fine: 0, sick: 0, visits: [],
      returning: 0, newFaces: 0, gone: [], replyNotes: [],
      cardIncome: S.cards.daily.income, cardCost: S.cards.daily.cost, cardSpent: S.cards.daily.spent,
      cardPackSales: S.cards.daily.packSales, cardSales: S.cards.daily.cardSales, cardOpened: S.cards.daily.opened,
      leisureIn: S.casino.day === S.day ? S.casino.paid : 0, leisureOut: S.casino.day === S.day ? S.casino.wagered : 0,
      gambleTips: 0, gambleFine: S.gambling.lastCase?.day === S.day ? S.gambling.lastCase.fine : 0,
      gambleCase: S.gambling.lastCase?.day === S.day ? S.gambling.lastCase : null, gambleInvites: 0, gambleWagered: 0, gambleNotes: [],
      acPower: 0, fuel: 0, refund: 0, hotHours: 0, darkHours: 0, smashes: 0, outages: 0, noise: 0, kicked: 0, mom: [], thefts: [], caught: 0, thiefCash: 0,
      lights: 0, nightWage: 0, closeRefund: 0, overnight: 0, raid: null, closedAt: 0, staffLoads: 0, quests: [] },
    // đóng cửa chủ động: closing = đang chuẩn bị đóng (không nhận khách mới) · shutter = kéo cửa cuốn · speed = tua nhanh
    closing: false, shutter: false, speed: 1, paceRest: 0,
    // hạ tầng: nhiệt độ phòng, điều hòa, lịch cúp điện hôm nay, máy phát
    temp: outsideTemp(C.OPEN_HOUR) + 1, hot: false, acOn: S.acOn, running: 0,
    outage: S.outageNext || surpriseOutage(), wasOut: false, genOn: false, darkT: 0,
    segCount: {},   // số khách mỗi tệp đã tới hôm nay
    namesToday: new Set(),
    // tin báo từ hôm qua → công an tới sớm; không thì thỉnh thoảng kiểm tra bất chợt
    // kidReports = tin phụ huynh báo quán cho học sinh chơi khuya (mẹ gank bị lộ)
    reports: S.pendingPolice, kidReports: S.pendingKid,
    policeAt: S.pendingPolice || S.pendingKid ? C.OPEN_HOUR + rand(0.3, 1.2)
      : Math.random() < C.POLICE_RANDOM ? rand(C.OPEN_HOUR + 1, C.EVENT_END_HOUR - 1) : null,
    momAt: null, momKid: 0, momCount: 0,   // mẹ gank: giờ phụ huynh tới, tìm khách nào, số lần hôm nay
    // trộm: giờ kẻ trộm tới hôm nay (camera làm trộm ngại ghé) · escape = kẻ trộm đang chạy ra cửa
    thiefAt: S.day >= C.THIEF_FROM_DAY && Math.random() < C.THIEF_DAY_CHANCE * (S.upgrades.camera ? 0.5 : 1) * (1 - cardFx('guard'))
      ? rand(C.OPEN_HOUR + 1, C.EVENT_END_HOUR - 2) : null,
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
  invoiceNotes.forEach(t => log(t));
  if (S.suspendDay === S.day) {   // bị đình chỉ vì mở quá giờ nhiều lần: hôm nay không được mở
    R.suspended = true;
    R.policeAt = null;
    endDay();
    return;
  }
  if (!S.seenTutorial) {
    S.seenTutorial = true;
    saveGame();
    if (S.onboard.done) openHowTo(); else openWelcome();
  }
}
