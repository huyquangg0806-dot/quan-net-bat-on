/* Quán Nét Bất Ổn — sự cố trong ngày: cúp điện, đập phím, khách ồn, mẹ gank, trộm.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Cúp điện, nhiệt độ, điều hòa, máy phát ----------
// Lịch cúp điện ngày mai (báo trước trên bảng tổng kết và tab Hóa đơn)
function planOutage() {
  if (S.day < C.OUTAGE_FROM_DAY || Math.random() >= C.OUTAGE_PLANNED) return null;
  const len = Math.round(rand(...C.OUTAGE_LEN) * 2) / 2;
  const from = Math.round(rand(C.OPEN_HOUR + 1, C.EVENT_END_HOUR - len) * 2) / 2;
  return { from, to: from + len, planned: true };
}
// Cúp điện bất ngờ trong ngày (không báo trước)
function surpriseOutage() {
  if (S.day < C.SURPRISE_FROM_DAY || Math.random() >= C.OUTAGE_SURPRISE) return null;
  const from = rand(C.OPEN_HOUR + 1.5, C.EVENT_END_HOUR - 1);
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
  m.wear = Math.max(0, Math.round(m.wear - rand(...C.SMASH_DMG) * tough * (1 - cardFx('tough'))));
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
const canNoise = c => !!traitOf(c).noisy && !c.noisy && S.day >= C.NOISE_FROM_DAY && !R.escape && !(R.paceRest > 0);
const neighbors = pc => R.pcs.filter(p => p !== pc && Math.floor(p.i / 3) === Math.floor(pc.i / 3));
const hushChance = c => Math.min(0.95, (c.trait === 'voi' || c.voice === 'thang' ? C.NOISE_CALM_HARD : C.NOISE_CALM_CHANCE)
  + C.NOISE_CALM_RETRY * (c.hushTries || 0));
function startNoise(pc) {
  const c = pc.cust;
  R.speed = 1;
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
  c.refunded = (c.refunded || 0) + refund;
  R.led.kicked++;
  log(`🚪 Mời ${c.name} về vì làm ồn${refund ? `, trả lại ${money(refund)} tiền giờ` : ''}`);
  for (const nb of neighbors(pc)) {
    const n = nb.cust;
    if (n && n.noiseNoted && !n.ev.hushed) hit(n, 'hushed', 5, null, 'Chủ quán dẹp ồn nhanh');
  }
  leave(pc, 'kicked');
}
function openNoise(pc) {
  if (!pc?.cust?.noisy || !R || R.over) return;
  closeModal();
  const wasPaused = R.paused;
  setPause(true);
  const c = pc.cust;
  const refund = round500(Math.max(0, c.remaining) * payRate(pc, c));
  const near = neighbors(pc).filter(p => p.cust && !p.cust.awaitingLoad).length;
  openModal({
    title: `📢 ${c.name} đang làm ồn`,
    body: `<p>${c.avatar} <b>${esc(c.name)}</b> ở máy ${pc.i + 1} đang ${c.noiseAct}.
        ${near ? `${near} khách ngồi cạnh bắt đầu khó chịu.` : 'Hàng máy này chưa có ai khác, nhưng ai vào ngồi cạnh sẽ khó chịu.'}</p>
      <p class="muted small">🤫 Nhắc nhở: khoảng ${Math.round(hushChance(c) * 100)}% khách chịu nhỏ tiếng, không được thì khách cãi lại và còn ồn hơn.<br>
        🚪 Mời về: dẹp ồn ngay nhưng phải trả lại ${money(refund)} tiền giờ chưa chơi, khách này sẽ chấm sao thấp.</p>`,
    actions: [
      { label: 'Để sau', onClick: () => closeModal() },
      { label: '🚪 Mời về', cls: 'danger', onClick: () => { closeModal(); if (pc.cust === c) kickNoisy(pc); } },
      { label: '🤫 Nhắc nhở', cls: 'primary', onClick: () => { closeModal(); if (pc.cust === c) hushNoisy(pc, null); } },
    ],
    onClose: () => { if (R && !R.over && !wasPaused) setPause(false); },
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
  if (R.momAt != null || R.escape || R.paceRest > 0 || S.day < C.MOM_FROM_DAY || R.momCount >= C.MOM_MAX_PER_DAY || !powered()) return;
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
  eventBreather();
  closeModal();
  R.momAt = null;
  const pc = R.pcs.find(p => p.cust && p.cust.id === R.momKid);
  if (!pc) { log('👩 Có cô tới tìm con, nhưng bé về nhà rồi. Hú hồn!'); PlayScene.momIn?.('Ủa, về rồi à?'); PlayScene.momOut?.(false); return; }
  const c = pc.cust;
  stopHold();
  SFX.play('door');
  SFX.play('warn');
  const others = kidsPlaying().filter(p => p !== pc).length;
  const chance = Math.max(0.1, C.MOM_HIDE_CHANCE - C.MOM_HIDE_PER_KID * others);
  const late = R.time >= C.MOM_REPORT_FROM;
  const wasPaused = R.paused;
  setPause(true);
  PlayScene.momIn?.(`${kidName(c)} đâu rồi!`);   // phụ huynh bước vào đứng gần quầy
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
  PlayScene.momOut?.(false);
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
  PlayScene.momOut?.(true);
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
  eventBreather();
  const c = pc.cust;
  const parts = Object.keys(C.THIEF_PARTS).filter(k => !(S.upgrades.cablelock && (k === 'mouse' || k === 'kb')));
  const part = weighted(parts, k => C.THIEF_PARTS[k]);
  if (modal && modal.pc === pc) closeModal();
  discardTray(c.order);
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
  c.runFor = R.escape.left;   // cảnh vẽ kẻ trộm ôm đồ chạy ra cửa đúng chừng ấy giây
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
  eventBreather();
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
  eventBreather();
  closeModal();
  pc.m.missing = null;
  c.caught = true;   // cảnh: kẻ trộm khựng lại, cúi đầu xin lỗi
  R.led.caught++;
  SFX.play('good');
  fx(pc.el.root, '🙌 Bắt được rồi!', 'good');
  const wasPaused = R.paused;
  setPause(true);
  const done = () => {
    if (c.relapse) S.regulars = S.regulars.filter(r => r.id !== c.regId);   // tha rồi còn tái phạm: gạch tên
    c.released = true;   // cảnh: lủi thủi đi ra cửa
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
