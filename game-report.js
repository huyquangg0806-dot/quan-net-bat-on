/* Quán Nét Bất Ổn — hết ngày và bảng nhận xét.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

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
  for (const c of R.queue.filter(c => c.cardBuyer)) cardBuyerLeaves(c);
  R.queue = [];
  R.selected = null;
  renderQueue();
  renderPlay();

  const led = R.led;
  led.closedAt = R.time;
  // mặt bằng, mạng, điện, đèn: ghi vào hóa đơn tuần · xăng máy phát, lương: trả tiền mặt ngay
  // bị đình chỉ: nhân viên nghỉ ở nhà, không trả lương
  const costs = { rent: rentCost(), net: netPlan().daily, power: round500(led.power), acPower: round500(led.acPower),
    lights: round500(led.lights), fuel: round500(led.fuel), nightWage: round500(led.nightWage),
    staff: R.suspended ? 0 : S.staff.reduce((n, p) => n + p.wage, 0) };
  S.money -= costs.fuel + costs.staff + costs.nightWage;
  led.staff = costs.staff;

  S.pendingPolice += R.reports;   // tin báo công an chưa kịp tới → sáng mai tới
  S.pendingKid += R.kidReports;
  R.reports = R.kidReports = 0;
  const day = S.day;
  trackQuests(led);
  if (S.gambling.activityDay !== day) {
    S.gambling.risk = Math.max(0, S.gambling.risk - C.HOST_GAMBLE_DECAY);
    if (!S.gambling.risk) S.gambling.organized = false;
  }
  S.ledger.at = day;   // bút toán cuối ngày ghi vào ngày vừa mở cửa
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
      if (p > C.EXPIRED_KEEP_DAYS) { sp += b.qty; discardStock(k, b); return false; }
      if (p === 1) nw += b.qty;
      return true;
    });
    if (nw) newlyExpired.push({ k, qty: nw });
    if (sp) spoiled.push({ k, qty: sp });
  }
  S.lastAsked = led.lost;
  pickHotGame();
  pruneWaste();
  finishAccounts(day, led, costs, books);
  const bankrupt = S.money < C.BANKRUPT_AT || books.evicted;
  // Phá sản không xóa bản lưu: giữ bản buổi sáng của ngày này để còn "Thử lại ngày này".
  if (!bankrupt) saveGame();
  showSummary({ led, costs, books, newlyExpired, spoiled, day, bankrupt });
}

// Sổ sách cuối ngày (gọi sau khi đã sang ngày mới): phạt hóa đơn trễ, chốt hóa đơn tuần, lãi vay, đòi nợ.
// Trả về { news: [[lớp, chữ]], interest, evicted }
function closeBooks(day, costs) {
  const news = [];
  let lateFee = 0;
  let evicted = false;
  autoPayBill(news);   // còn hóa đơn cũ chưa trả mà đủ tiền: trả luôn, khỏi bị phạt hay mất mặt bằng
  const d = S.dueBill;
  if (d) {
    const late = day - d.dueDay;
    if (late > 0) {
      const fee = round1k(d.base * C.LATE_FEE);
      d.fee += fee;
      lateFee += fee;
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
  b.power += costs.power + costs.acPower + costs.lights;
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
  const interestBy = {};
  for (const [k, rate] of [['bank', C.BANK_RATE], ['shark', C.SHARK_RATE]]) {
    if (!S.loans[k]) continue;
    const i = Math.max(1000, round1k(S.loans[k] * rate));
    S.loans[k] += i;
    interest += i;
    interestBy[k] = i;
  }
  if (S.loans.shark > 0) {
    S.sharkDays++;
    if (S.sharkDays > C.SHARK_DUE_DAYS) {
      S.rating = clamp(S.rating - C.SHARK_RATING_HIT, 1, 5);
      news.push(['bad', '💀 Người cho vay nóng tới quán đòi nợ, khách thấy sợ (đánh giá giảm). Trả hết nợ nóng đi!']);
    }
  } else S.sharkDays = 0;
  if (evicted) news.push(['bad', '🏚️ Nợ tiền mặt bằng quá lâu, chủ nhà lấy lại mặt bằng.']);
  return { news, interest, interestBy, evicted, lateFee };
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
  const income = led.hours + led.food + led.tips + (led.thiefCash || 0) + (led.salvage || 0) + (led.cardIncome || 0);
  const cash = [['🧑‍🍳 Lương nhân viên', costs.staff], ['🌙 Lương ca đêm', costs.nightWage], ['🛢️ Xăng máy phát', costs.fuel], ['💸 Hoàn tiền giờ vì cúp điện', led.refund],
    ['↩️ Hoàn tiền giờ khi đóng cửa', led.closeRefund], ['🚨 Tiền phạt', led.fine], ['🏦 Lãi vay', interest]]
    .filter(([, v]) => v);
  const billed = [['⚡ Điện chạy máy', costs.power], ['💡 Đèn biển hiệu buổi tối', costs.lights], ['❄️ Điện điều hòa', costs.acPower], ['🏠 Mặt bằng & bảo trì', costs.rent], ['📶 Tiền mạng', costs.net]]
    .filter(([, v], i) => v || i === 0 || i === 3);
  const out = [...cash, ...billed].reduce((s, [, v]) => s + v, 0);
  const materials = led.materials || 0, prep = led.prepCosts || 0;
  const dep = led.depreciation || 0;
  const profit = income - out - materials - prep - dep;
  const group = (title, sum, rows, cls) => `<details class="sum-group ${cls}"><summary>${row(title, sum, cls)}</summary>${rows}</details>`;
  return `<div class="sum-block">
    ${group('💰 Thu', plus(income), row('⏱️ Tiền giờ chơi', plus(led.hours)) + row('🍜 Bán đồ ăn uống', plus(led.food)) + row('💝 Tiền tip', plus(led.tips)) + (led.thiefCash ? row('🦹 Thưởng / bắt đền trộm', plus(led.thiefCash)) : '') + (led.salvage ? row('♻️ Thu hồi đồ thải', plus(led.salvage)) : '') + (led.cardIncome ? row('🎴 ' + CARD_SHOP_COPY.income, plus(led.cardIncome)) : ''), 'up')}
    ${cash.length ? group('💵 Chi phí & hoàn tiền', minus(cash.reduce((s, [, v]) => s + v, 0)), cash.map(([l, v]) => row(l, minus(v))).join(''), 'down') : ''}
    ${group('🧾 Ghi vào hóa đơn tuần', minus(billed.reduce((s, [, v]) => s + v, 0)), billed.map(([l, v]) => row(l, minus(v))).join(''), 'down')}
    ${row('🍳 Giá vốn nguyên liệu và thẻ đã dùng/bán/bỏ', minus(materials))}
    ${led.cardCost ? `<p class="hint">🎴 ${CARD_SHOP_COPY.expense}: ${money(led.cardCost)} — đã nằm trong giá vốn bên trên.</p>` : ''}
    ${led.cardSpent || led.cardPackSales || led.cardSales || led.cardOpened ? `<p class="note">🎴 ${CARD_SHOP_COPY.summary}: ${CARD_SHOP_COPY.spent} ${money(led.cardSpent || 0)} · ${CARD_SHOP_COPY.soldPacks} ${led.cardPackSales || 0} · ${CARD_SHOP_COPY.soldCards} ${led.cardSales || 0} · ${CARD_SHOP_COPY.opened} ${led.cardOpened || 0}. Tiền nhập gói chuyển thành hàng tồn; chỉ ghi giá vốn khi bán.</p>` : ''}
    ${prep ? row('🧮 Chi phí sáng, kế toán & phạt hóa đơn', minus(prep)) : ''}
    ${dep ? row('📉 Khấu hao máy, nâng cấp & game', minus(dep)) : ''}
    ${row(profit >= 0 ? 'Lãi hôm nay trước thuế' : 'Lỗ hôm nay trước thuế', (profit >= 0 ? '+' : '') + money(profit), 'total ' + (profit >= 0 ? 'up' : 'down'))}
    ${led.leisureOut ? `<p class="note">🎲 Giải trí riêng buổi sáng: cược ${money(led.leisureOut)}, nhận ${money(led.leisureIn)}; chênh lệch ${money(led.leisureIn - led.leisureOut)}. Đã tính vào tiền quán, tách khỏi lãi kinh doanh bên trên.</p>` : ''}
    ${led.gambleTips || led.gambleFine || led.gambleInvites ? `<p class="note">🎲 Giới thiệu ${led.gambleInvites} khách đồng ý · khách cược ${money(led.gambleWagered)} bằng tiền riêng · thưởng chủ ${money(led.gambleTips)} · phạt cờ bạc ${money(led.gambleFine)}. Thưởng và phạt tách khỏi lãi kinh doanh.</p>` : ''}
    ${led.gambleCase ? gamblingCaseHTML(led.gambleCase) : ''}
    ${led.gambleNotes?.length ? `<details><summary>🎲 Diễn biến cờ bạc trong quán</summary>${led.gambleNotes.map(n => `<p>${esc(n)}</p>`).join('')}</details>` : ''}
    ${led.onboard ? `<p class="note">🎉 Xong ngày khai trương: quà +${money(led.onboard)}.</p>` : ''}
    ${led.quests?.length ? `<p class="note">🎯 ${led.quests.map(x => `${esc(x.text)}: +${money(x.reward)}`).join(' · ')}. Thưởng tách khỏi lãi kinh doanh.</p>` : ''}
    ${led.replyNotes?.length ? `<p class="note">💬 Sau phản hồi review: ${led.replyNotes.map(esc).join(' · ')}</p>` : ''}
    <p class="muted small">Bấm vào từng nhóm để xem chi tiết. Hóa đơn tuần đang cộng dồn <b>${money(S.bill.rent + S.bill.net + S.bill.power)}</b>${S.bill.days ? `, chốt sau ${C.BILL_DAYS - S.bill.days} ngày` : ''}.</p>
  </div>`;
}
// Ghi chú hạ tầng trong ngày (nóng, mạng, cúp điện, phím) + tin về ngày mai
function infraNotes(led) {
  const p = [];
  if (R.suspended) p.push(['bad', `🚫 Hôm nay quán bị đình chỉ vì ${S.suspendReason === 'gambling' ? 'giới thiệu cờ bạc mạng' : 'mở quá giờ nhiều lần'}: không mở cửa được, vẫn tốn mặt bằng và lãi vay.`]);
  else if (led.closedAt >= C.NIGHT_FROM) p.push(['note', `🌙 Mở tới ${clockText(led.closedAt)}${led.overnight ? ` · ${led.overnight} khách bao đêm` : ''}.`]);
  if (led.raid) p.push(['bad', `👮 Công an kiểm tra lúc ${clockText(led.raid.time)}, buộc đóng cửa${led.raid.fine ? `, phạt ${money(led.raid.fine)}` : ' (cảnh cáo)'}. Vi phạm lần ${led.raid.n}.`]);
  if (S.suspendDay === S.day) p.push(['bad', `🚫 <b>Ngày mai (ngày ${S.day}) quán bị đình chỉ</b>, không được mở cửa.`]);
  else if (nightStrikes() && !R.suspended) p.push(['warn', `📋 Đang có ${S.nightStrikes} lần vi phạm giờ giấc. Thêm lần nữa: ${S.nightStrikes + 1 >= C.NIGHT_SUSPEND_AT ? 'bị đình chỉ 1 ngày' : `phạt ${money(C.NIGHT_FINES[Math.min(S.nightStrikes + 1, C.NIGHT_FINES.length) - 1])}`}.`]);
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
    ${books.report ? `<details class="account-box" open><summary>📒 Chốt kỳ ngày ${books.report.from}–${books.report.to}</summary>${reportHTML(books.report)}${accountantActive(day) ? `<p class="account-advice">${accountAdvice(books.report)}</p>` : ''}</details>` : ''}
    ${led.wasteQty ? `<p class="note">♻️ Gom ${led.wasteQty} đơn vị đồ bỏ vào kho đồ thải (đầy kho thì chuyển xử lý).</p>` : ''}
    <div class="sum-stats">
      <div><b>${led.served}</b><span>khách phục vụ</span></div>
      <div><b>${led.walkouts}</b><span>khách bỏ về</span></div>
      <div><b>${avg}%</b><span>hài lòng TB</span></div>
      <div><b>${S.rating.toFixed(1)}★</b><span>${dr >= 0 ? '▲' : '▼'} ${Math.abs(dr).toFixed(2)}</span></div>
    </div>
    ${reviewsBlock}
    ${notes}
    ${lostList ? `<p class="warn">🎮 Khách tìm game quán chưa có: ${lostList}</p>` : ''}
    ${led.staffLoads ? `<p>⏱️ Nhân viên đã đào tạo tự nạp giờ cho ${led.staffLoads} lượt khách.</p>` : ''}
    ${led.staffMistakes ? `<p class="warn">📝 Nhân viên ghi sai ${led.staffMistakes} đơn hôm nay. Có thể tăng lương hoặc training vào buổi sáng.</p>` : ''}
    ${bankrupt ? '' : UNLOCKS.filter(u => u.day === S.day).map(u => `<p class="note">🆕 Ngày mai mở khóa: <b>${u.icon} ${u.name}</b></p>`).join('')}
    ${bankrupt ? '' : `<p class="note">🔥 Ngày mai đang hot: <b>${gameIcon(S.hot)}</b>${S.installed[S.hot] ? ' (quán có sẵn)' : ' — quán chưa cài!'}</p>`}
    ${led.sick ? `<p class="warn">🤢 ${led.sick} khách bị đau bụng vì đồ hết date!</p>` : ''}
    ${(S.pendingPolice || S.pendingKid) && !bankrupt ? `<p class="warn">📞 Có người đã báo công an — sáng mai công an sẽ tới kiểm tra!</p>` : ''}
    ${newlyExpired.length ? `<p class="warn">☠️ Vừa hết date: ${itemList(newlyExpired)}. Sáng mai bỏ đi, hoặc giữ lại bán tiếp (khách có thể đau bụng!).</p>` : ''}
    ${spoiled.length ? `<p class="warn">♻️ Hư hẳn, chuyển sang kho đồ thải: ${itemList(spoiled)}</p>` : ''}
    <p>Tiền hiện có: <b class="${S.money < 0 ? 'neg' : ''}">${money(S.money)}</b>${S.dueBill ? ` · Hóa đơn chưa trả: <b class="neg">${money(dueTotal())}</b>` : ''}${debt ? ` · Đang vay: <b>${money(debt)}</b>` : ''}</p>
    ${bankrupt ? `<p class="warn">💸 ${books.evicted ? 'Mất mặt bằng' : 'Quán nợ quá nhiều'} nên phải đóng cửa. Bản lưu cũ vẫn còn: thử lại ngày ${day} (trả hóa đơn, vay thêm cho kịp) hoặc chơi lại từ đầu.</p>`
      : S.money < 0 ? `<p class="warn">⚠️ Bạn đang nợ! Nợ quá ${money(-C.BANKRUPT_AT)} là phá sản.</p>` : ''}`;
  openModal({
    title: bankrupt ? `💸 ${esc(S.shopName)} phá sản rồi…` : R.suspended ? `🚫 ${esc(S.shopName)} · ngày ${day} bị đình chỉ` : `🌙 ${esc(S.shopName)} · hết ngày ${day}`,
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
