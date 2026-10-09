/* Quán Nét Bất Ổn — trong ngày: khách, nạp giờ, gọi đồ, vòng lặp, đóng cửa, vẽ màn chơi.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Khách ----------
// Khoảng nghỉ chỉ chặn việc mới; khách đang chơi và đơn cũ vẫn chạy bình thường.
function eventBreather() {
  R.speed = 1;
  R.paceRest = C.PACE_EVENT_REST;
}
function pendingWork() {
  return R.queue.filter(c => !c.lost).length + R.pcs.reduce((n, pc) => n
    + (pc.cust?.awaitingLoad ? 1 : 0) + (pc.cust?.order ? 1 : 0)
    + (pc.broken ? 1 : 0) + (pc.cust?.noisy ? 1 : 0), 0);
}
function nextSpawnDelay() {
  const t = R.time;
  // trưa có dân văn phòng, tối đông nhất; qua 22h thưa dần, 0h–5h gần như vắng, gần sáng lác đác
  const curve = t < 11 ? 0.75 : t < 13.5 ? 1.1 : t < 17 ? 0.9 : t < 22 ? 1.25
    : t < 24 ? 0.7 : t < 26 ? 0.35 : t < 29 ? 0.15 : 0.3;
  const demand = (0.55 + S.rating * 0.15) * curve * (isWeekend() ? C.WEEKEND_DEMAND : 1);
  const pcs = Math.min(R.pcs.length, C.PACE_LINEAR_PCS)
    + Math.sqrt(Math.max(0, R.pcs.length - C.PACE_LINEAR_PCS)) * C.PACE_EXTRA_PC_MUL;
  const busy = Math.min(C.PACE_MAX_BUSY_MUL, 1 + pendingWork() * C.PACE_TASK_MUL);
  const mean = C.SPAWN_BASE / (pcs * demand * (1 + cardFx('traffic')));
  return Math.max(C.PACE_MIN_SPAWN, mean * rand(0.5, 1.5)) * busy;
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
  if (R.shutter && !rec) return;   // kéo cửa cuốn: chỉ khách quen gọi cửa mới vào
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
  // khuya: người lớn hay xin bao đêm (chơi tới 6h, trả trọn gói)
  const overnight = !thief && !lost && !seg.kid && !R.closing && R.time >= C.OVERNIGHT_FROM && R.time < C.OVERNIGHT_TO
    && Math.random() < C.OVERNIGHT_CHANCE;
  if (overnight) hours = C.OVERNIGHT_UNTIL - R.time;
  const P = lost ? C.LOST_LINGER : C.QUEUE_PATIENCE * patienceMul() * (tr.patience || 1);
  const c = {
    id: R.nextId++, name, avatar, gender,
    seg: segId, trait, voice,
    tier, hours, patience: P, patienceMax: P, sat: 100,
    game, lost, overnight, atCounter: false,
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
  if (!lost && !rec && !c.thief && hostTrend().segs.includes(c.seg) && Math.random() < C.HOST_TREND_CHANCE) {
    c.greet = `${c.greet} ${hostTrend().greet}`.trim();
  }
  const request = lost ? pick(LOST_LINES)(g)
    : thief ? pick(THIEF_LINES)(TIERS[tier].phrase, hoursText(hours))
    : overnight ? pick(OVERNIGHT_LINES)(TIERS[tier].phrase, g)
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
  const vip = C.CARD_VIP_SEGMENTS.includes(id) ? 1 + cardFx('vip') : 1;
  return (s.kid ? w * kidMul() : w) * vip;
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
  if (c.cardBuyer) return cardBuyerLeaves(c);
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
  if (c.cardBuyer) return null;
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
  if (c.cardBuyer) return null;
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
  c.staffLoadIn = C.STAFF_AUTO_LOAD_SECONDS;
  pc.cust = c;
  if (R.selected === c) R.selected = null;
  PlayScene.guide(pc.i, c);
  log(`🧑‍🍳 ${staffName(worker.id)} dẫn ${c.name} vào máy ${pc.i + 1} · ${worker.trained ? 'đang tự nạp giờ' : 'chờ bạn nạp giờ'}`);
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
  // Mỗi nhân viên nạp từng khách một; không giành lượt chủ quán đang thao tác.
  for (const worker of S.staff) {
    if (!worker.trained) continue;
    const pc = R.pcs.find(p => p.cust?.awaitingLoad && p.cust.staffId === worker.id && !p.cust.atCounter);
    if (!pc) continue;
    pc.cust.staffLoadIn -= dt;
    if (pc.cust.staffLoadIn > 0) continue;
    seat(pc, pc.cust, pc.cust.hours);
    R.led.staffLoads++;
  }
  for (const c of [...R.queue]) {
    if (c.lost || c.atCounter || c.cardBuyer) continue;
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
    ${guided ? '' : '<div class="patience checkin-patience" title="Kiên nhẫn của khách"><i></i></div>'}
    <div class="chips want">
      <span class="chip t${c.tier}">${TIERS[c.tier].icon} ${TIERS[c.tier].name}</span>
      <span class="chip">${c.overnight ? `🌙 Bao đêm tới ${clockText(C.OVERNIGHT_UNTIL)}` : `⏱️ ${hoursText(c.hours)}`}</span><span class="chip">${gameIcon(c.game)}${c.game === S.hot ? ' 🔥' : ''}</span>
      ${c.favPc != null && c.favPc < R.pcs.length ? `<span class="chip">❤️ Máy ${c.favPc + 1}</span>` : ''}
    </div>
    <p class="hint">${guided ? `🧑‍🍳 Nhân viên đã dẫn khách vào máy ${pc.i + 1}. Bạn chỉ cần nạp giờ.`
      : 'Bạn tự nạp giờ và chọn máy cho khách này.'}</p>
    <div class="picker"></div>
    <div class="assign"></div>`;
  const foot = el('div', 'checkin-foot');
  let fill = null, holdBtn = null;
  if (c.overnight) {   // bao đêm: trả trọn gói, không cần giữ nút nạp giờ
    st.v = c.hours;
    foot.innerHTML = `<div class="readout">🌙 Gói bao đêm: chơi tới <b>${clockText(C.OVERNIGHT_UNTIL)}</b> · trả trọn gói
      <b class="ro-val"></b> <span class="muted">(bằng ${C.OVERNIGHT_PAY_HOURS} giờ chơi)</span></div>`;
  } else {
    foot.innerHTML = `
      <div class="fill-wrap"></div>
      <div class="readout">Đã nạp <b class="ro-val">0:00</b> <span class="muted">/ khách cần ${durText(c.hours)}</span></div>
      <button class="btn hold">⏱️ Giữ để nạp giờ</button>`;
    const ticks = [];
    for (let h = 1; h <= C.MAX_LOAD_HOURS; h++) ticks.push({ v: h, label: h + 'h' });
    fill = buildFill({
      max: C.MAX_LOAD_HOURS, zone: [c.hours - C.HOUR_PERFECT, c.hours + C.HOUR_PERFECT],
      mark: c.hours, ticks, cls: 'fill-hours',
    });
    foot.querySelector('.fill-wrap').appendChild(fill.root);
    holdBtn = foot.querySelector('.hold');
    bindHold(holdBtn, st, 'v', C.HOUR_FILL_RATE, C.MAX_LOAD_HOURS);
  }
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
  m.checkinBar = body.querySelector('.checkin-patience i');
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
    if (fill) fill.set(st.v);
    setText(ro, c.overnight ? (pc ? money(overnightPrice(pc, c)) : '') : durText(st.v));
    confirm.disabled = st.v <= 0.05 || !pc || (guided && pc.cust !== c);
    setText(confirm, guided ? `Bắt đầu máy ${pc.i + 1} ✓` : pc ? `Xếp vào máy ${pc.i + 1} ✓` : 'Xếp máy ✓');
  };
  m.update();
  renderQueue();
}

// Khách trả theo hạng thấp hơn giữa máy và yêu cầu, cộng tiền đồ xịn (chuột, phím, màn, ghế) của máy
const payRate = (pc, c) => TIERS[Math.min(c.tier, pc.tier)].rate + gearBonus(pc.m);
const overnightPrice = (pc, c) => round500(C.OVERNIGHT_PAY_HOURS * payRate(pc, c));
// Đóng cửa khi khách còn giờ: hoàn phần tiền giờ chưa chơi (theo tỉ lệ giờ còn lại / giờ đã nạp)
const refundFor = c => c.loaded > 0 ? round500((c.paid || 0) * clamp(c.remaining / c.loaded, 0, 1)) : 0;

function seat(pc, c, loaded) {
  if (c.cardBuyer) return;
  if (pc.m.missing) return;
  const guided = !!(c.awaitingLoad && pc.cust === c);
  if (!guided && (pc.cust || !R.queue.includes(c))) return;
  if (!guided) R.queue.splice(R.queue.indexOf(c), 1);
  c.awaitingLoad = false;
  if (R.selected === c) R.selected = null;
  renderQueue();
  onboardStep('seat');

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
  if (c.overnight) { hit(c, 'overnight', 5, 'hours', 'Được bao đêm giá hời'); notes.push(['Bao đêm tới sáng! 🌙', 'good']); }
  else if (Math.abs(diff) <= C.HOUR_PERFECT) { hit(c, 'perfect', 6, 'hours', 'Nạp đúng giờ'); notes.push(['Chuẩn giờ! ✓', 'good']); }
  else if (diff > 0) { hit(c, 'bonus', 2, 'hours', `Được nạp dư ${durText(diff)} (quán tặng)`); notes.push([`Dư ${durText(diff)} — cho không`, 'warn']); }
  else {
    hit(c, 'short', -Math.min(30, 8 + -diff * 18), 'hours', `Nạp thiếu ${durText(-diff)}`);
    notes.push([tr.bad?.hours ? `Thiếu ${durText(-diff)}! Em tính rồi nha 😤` : `Thiếu ${durText(-diff)}!`, 'bad']);
  }

  const rate = payRate(pc, c);
  const pay = c.overnight ? overnightPrice(pc, c) : Math.round(Math.min(loaded, c.hours) * rate / 500) * 500;
  S.money += pay;
  R.led.hours += pay;
  c.paid = pay;
  if (c.overnight) R.led.overnight++;

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
  if (worker && Math.random() < staffMistakeChance(worker) * (R.time >= C.NIGHT_FROM ? C.NIGHT_STAFF_TIRED : 1)) {   // ca đêm: nhân viên mệt
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
  discardTray(c.order);
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
    <span class="si">${ART.itemSVG(k)}</span>${label || ITEMS[k].name}<small>${n ? 'còn ' + n : 'hết hàng'}</small>
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
    <defs><linearGradient id="k-pot-metal"><stop stop-color="#849B9D"/><stop offset=".3" stop-color="#DCE6DE"/><stop offset=".6" stop-color="#BACDCA"/><stop offset="1" stop-color="#799194"/></linearGradient></defs>
    <ellipse cx="60" cy="91" rx="53" ry="5" fill="#544936" opacity=".14"/>
    <rect x="8" y="86" width="104" height="10" rx="3" fill="#3C5156" stroke="#223C42" stroke-width="1.5"/>
    <path d="M15,89 H100" stroke="#88A69F" stroke-width="1.3"/>
    ${cooking ? '<g class="flame-on"><path d="M30,86 q5,-16 10,0 z M55,86 q5,-19 10,0 z M80,86 q5,-16 10,0 z" fill="#4AA8FF"/></g>' : ''}
    <rect x="16" y="36" width="88" height="42" rx="10" fill="url(#k-pot-metal)" stroke="#547174" stroke-width="1.7"/>
    <path d="M20,65 Q60,76 100,65 V73 Q60,85 20,73 Z" fill="#668C8E" opacity=".35"/>
    <rect x="4" y="46" width="14" height="7" rx="3.5" fill="#405D62"/><rect x="102" y="46" width="14" height="7" rx="3.5" fill="#405D62"/>
    <ellipse cx="60" cy="38" rx="44" ry="10" fill="#EAF0E2" stroke="#547174" stroke-width="1.5"/>
    <ellipse cx="60" cy="38" rx="40" ry="8" fill="${broth}"/>${top}
    <path d="M27,49 V65 M33,52 V68" stroke="#FAFFF1" stroke-width="2.5" opacity=".7" stroke-linecap="round"/>${steam}</svg>`;
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
      { label: 'Đổ bỏ khay', cls: 'ghost', onClick: () => { discardTray(o); render(); } },
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
    const cost = S.inv[k][0]?.unitCost;
    const past = invTake(k);
    if (past === null) return;
    o.tray.items[k] = (o.tray.items[k] || 0) + 1;
    o.tray.costs = o.tray.costs || {};
    o.tray.costs[k] = (o.tray.costs[k] || 0) + cost;
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
  onboardStep('order');
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
  if (cardFx('food')) pay = round500(pay * (1 + cardFx('food')));   // thẻ Ngon miệng trên kệ
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
  onboardStep('clean');
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
  eventBreather();
  closeModal();
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
  settleCustomerGamble(c);
  if (pc.broken) settleBreak(pc, false);
  if (c.order) {
    if (modal && modal.pc === pc) closeModal();
    // khách rụt rè chưa dám nói món thì không phạt giờ chờ — chỉ là quán mất một đơn
    if (c.order.hidden) note(c, 'shyskip', -2, 'Muốn gọi đồ nhưng ngại, không dám gọi');
    else hit(c, 'foodslow', -15, 'food', 'Chưa nhận được món đã phải về');
    discardTray(c.order);
    c.order = null;
  }
  if (reason === 'close' && c.remaining > 0.1) {
    // đóng cửa khi khách còn giờ: hoàn tiền giờ chưa chơi, khách vẫn hơi tiếc
    const refund = refundFor(c);
    if (refund) {
      S.money -= refund;
      R.led.closeRefund += refund;
      fx(pc.el.root, `↩️ Hoàn ${money(refund)}`, 'warn');
    }
    if (c.remaining > 0.25) hit(c, 'closed', -Math.min(C.CLOSE_HIT_MAX, c.remaining * C.CLOSE_HIT_PER_HOUR), 'hours',
      `Còn ${durText(c.remaining)} giờ chơi mà quán đóng cửa${refund ? ' (được hoàn tiền)' : ''}`);
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
    tip = round500(pick([2000, 5000, 5000, 10000]) * (1 + cardFx('tip')));
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
  R.paceRest = Math.max(0, (R.paceRest || 0) - dt);
  if (updateGambling(dt, gh)) return;

  // công an tới (đợi chủ quán làm xong việc đang dở)
  // (quầy thao tác ở nửa dưới không chặn — công an tới thì đóng quầy lại)
  if (R.policeAt != null && R.time >= R.policeAt && (!modal || modal.docked) && !hold) { inspect(); return; }
  if (R.momAt != null && R.time >= R.momAt && !R.escape && (!modal || modal.docked) && !hold) { momArrives(); return; }

  updateInfra(dt, gh);
  updateNight(gh);
  if (R.over || (modal && modal.raid)) return;   // công an vừa ập vào
  const on = powered();

  if (!R.closing && !R.escape && R.paceRest <= 0) {
    if (S.cards.enabled) {
      R.cardSpawnIn -= dt;
      if (R.cardSpawnIn <= 0) {
        if (R.queue.length < C.QUEUE_MAX && on) {
          spawnCardBuyer();
          R.cardSpawnIn = C.CARD_BUYER_INTERVAL;
        }
      }
    }
    R.spawnIn -= dt;
    if (R.spawnIn <= 0) {
      if (R.queue.length < C.QUEUE_MAX && on) spawnCustomer(R.thiefAt != null && R.time >= R.thiefAt);   // quán tối om thì không ai vào
      if (R.queue.some(c => c.thief && !c.relapse)) R.thiefAt = null;
      R.spawnIn = nextSpawnDelay();
    }
  }

  updateStaff(dt);

  // khách đang đứng ở quầy vẫn sốt ruột, chỉ chậm hơn (không thì mở quầy để "giữ" khách cả ngày)
  const drain = c => dt * (R.hot ? C.HOT_QUEUE_DRAIN : 1) * (c.atCounter ? C.COUNTER_DRAIN : 1);
  for (const c of [...R.queue]) {
    c.patience -= drain(c);
    if (c.patience > 0) continue;
    if (modal && modal.checkin === c) closeModal();
    if (c.lost) leaveLost(c); else walkout(c);
  }

  const breakRate = C.BREAK_PER_HOUR * (S.upgrades.ups ? 0.45 : 1) * (R.hot ? C.HOT_BREAK_MUL : 1);
  // Mạng: máy đang chạy vượt sức tải gói mạng thì giật
  const netOver = R.running > netCap();
  if (netOver) R.led.pingHours += gh;
  for (const pc of R.pcs) {
    const c = pc.cust;
    if (!c) continue;

    if (c.awaitingLoad) {
      c.loadPatience -= drain(c);
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
  if (R.time >= C.MAX_OPEN_UNTIL) {
    log('🌅 8h sáng rồi — quán phải đóng để dọn dẹp, kiểm kê');
    endDay();
  } else if (R.closing && !anyone && !R.escape) endDay();   // chuẩn bị đóng cửa và khách đã về hết
  else if (!modal) openStaffTask(nextStaffTask(true));
}

// ---------- Mở đêm & đóng cửa chủ động ----------
// Mỗi khung hình: tiền đèn buổi tối, lương ca đêm, công an kiểm tra giờ giấc (23h–6h)
function updateNight(gh) {
  if (R.time >= C.LIGHTS_FROM) R.led.lights += C.LIGHTS_PER_HOUR * gh;
  if (R.time >= C.NIGHT_FROM) R.led.nightWage += nightWagePerHour() * gh;
  if (Math.random() < nightPoliceRate() * gh) nightRaid();
}
const inNightBan = (t = R.time) => t >= C.NIGHT_POLICE_FROM && t < C.NIGHT_POLICE_TO;
// khả năng bị công an kiểm tra mỗi giờ game: quán càng đông, càng ồn, có học sinh thì càng dễ bị báo
function nightPoliceRate() {
  if (!inNightBan()) return 0;
  const playing = R.pcs.filter(p => p.cust && !p.cust.awaitingLoad).length;
  let rate = C.NIGHT_POLICE_BASE + C.NIGHT_POLICE_PER_CUST * playing;
  if (R.pcs.some(p => p.cust?.noisy)) rate *= C.NIGHT_POLICE_NOISE;
  if (kidsPlaying().length) rate *= C.NIGHT_POLICE_KID;
  if (R.shutter) rate *= C.SHUTTER_POLICE_MUL;
  return rate;
}
// Số lần vi phạm còn tính (sạch đủ lâu thì được xóa)
function nightStrikes() {
  if (S.nightStrikes && S.day - S.nightStrikeDay >= C.NIGHT_STRIKE_RESET) S.nightStrikes = 0;
  return S.nightStrikes;
}
// Công an kiểm tra giờ giấc: buộc đóng cửa ngay (hoàn tiền), phạt theo số lần vi phạm
function nightRaid() {
  eventBreather();
  closeModal();
  stopHold();
  SFX.play('police');
  const n = nightStrikes() + 1;
  S.nightStrikes = n;
  S.nightStrikeDay = S.day;
  const fine = C.NIGHT_FINES[Math.min(n, C.NIGHT_FINES.length) - 1];
  const suspend = n >= C.NIGHT_SUSPEND_AT;
  if (fine) {
    S.money -= fine;
    R.led.fine += fine;
  }
  if (n >= 2) S.rating = clamp(S.rating - C.NIGHT_RATING_HIT, 1, 5);
  if (suspend) {
    if (S.suspendDay !== S.day + 1 || S.suspendReason !== 'gambling') S.suspendReason = 'night';
    S.suspendDay = S.day + 1;
  }
  const kids = kidsPlaying().length;
  R.led.raid = { n, fine, suspend, time: R.time, kids };
  log(`🚨 Công an kiểm tra lúc ${clockText(R.time)} — quán phải đóng cửa${fine ? `, phạt ${money(fine)}` : ''}`);
  setPause(true);
  const m = openModal({
    title: '👮 Công an kiểm tra giờ mở cửa', cls: 'modal-police', dismissable: false,
    body: `<p>Đã ${clockText(R.time)} mà quán vẫn mở${kids ? `, lại có ${kids} học sinh đang chơi` : ''}. Yêu cầu đóng cửa ngay!</p>
      ${fine ? `<div class="fine">Vi phạm lần ${n} · Tiền phạt <b>-${money(fine)}</b></div>`
        : '<div class="warn">⚠️ Lần đầu: cảnh cáo, chưa phạt tiền. Tái phạm sẽ bị phạt.</div>'}
      ${n >= 2 ? '<p class="warn">⭐ Bị lập biên bản, hàng xóm đồn ầm lên: đánh giá quán giảm.</p>' : ''}
      ${suspend ? '<p class="bad-text">🚫 Tái phạm nhiều lần: quán bị <b>đình chỉ ngày mai</b> (vẫn tốn mặt bằng).</p>' : ''}
      <p class="muted small">Khách đang chơi được hoàn tiền giờ chưa chơi. ${C.NIGHT_STRIKE_RESET} ngày không vi phạm thì được xóa tiền án.</p>`,
    actions: [{ label: fine ? 'Nộp phạt, đóng cửa 😭' : 'Dạ, em đóng cửa liền 🫡', cls: 'primary', onClick: () => closeModal() }],
    onClose: () => { if (R && !R.over) endDay(); },
  });
  m.raid = true;
}
function announceClosing() {
  R.closing = true;
  if (R.time < C.NIGHT_POLICE_FROM) onboardStep('close');
  log('🌙 Chuẩn bị đóng cửa — không nhận khách mới, khách đang chơi chơi nốt');
  for (const pc of R.pcs) if (pc.cust && !pc.cust.awaitingLoad) fx(pc.el.root, '📢 Quán sắp đóng cửa', 'warn');
}
function reopen() {
  R.closing = false;
  R.spawnIn = Math.min(R.spawnIn, 1.5);
  log('↩️ Quán mở cửa đón khách tiếp');
}
// Hộp thoại nút "Đóng cửa": chuẩn bị đóng (khách chơi nốt) hoặc đóng ngay (hoàn tiền)
function openCloseMenu() {
  if (!R || R.over) return;
  closeModal();
  const wasPaused = R.paused;
  setPause(true);
  const playing = R.pcs.filter(p => p.cust && !p.cust.awaitingLoad);
  const refund = playing.reduce((s, p) => s + refundFor(p.cust), 0);
  const last = playing.reduce((t, p) => Math.max(t, R.time + Math.max(0, p.cust.remaining)), R.time);
  const n = playing.length + R.queue.length + R.pcs.filter(p => p.cust?.awaitingLoad).length;
  const chooseNow = () => { closeModal(); closeNow(); };
  openModal({
    title: '🌙 Đóng cửa quán',
    body: n ? `<p>Đang có <b>${playing.length}</b> khách chơi${R.queue.length ? ` và <b>${R.queue.length}</b> khách chờ ở cửa` : ''}.</p>
      <p><b>Chuẩn bị đóng cửa:</b> không nhận khách mới, khách đã vào chơi nốt giờ${playing.length ? ` (người về muộn nhất khoảng <b>${clockText(last)}</b>)` : ''}. Hết khách quán tự đóng.</p>
      <p><b>Đóng cửa ngay:</b> mời hết khách về${refund ? `, hoàn <b>${money(refund)}</b> tiền giờ chưa chơi. Khách sẽ hơi tiếc` : ''}.</p>`
      : '<p>Quán đang vắng. Đóng cửa và tổng kết ngày luôn?</p>',
    actions: n ? [
      { label: 'Thôi', cls: 'ghost', onClick: closeModal },
      { label: '🔒 Đóng ngay', cls: 'ghost', onClick: chooseNow },
      { label: '🌙 Chuẩn bị đóng cửa', cls: 'primary', onClick: () => { closeModal(); announceClosing(); } },
    ] : [
      { label: 'Thôi', cls: 'ghost', onClick: closeModal },
      { label: '🔒 Đóng cửa', cls: 'primary', onClick: chooseNow },
    ],
    onClose: () => { if (R && !R.over && !wasPaused) setPause(false); },
  });
}
function closeNow() {
  if (!R || R.over) return;
  log(`🔒 Đóng cửa lúc ${clockText(R.time)}`);
  if (R.time < C.NIGHT_POLICE_FROM) onboardStep('close');
  endDay();
}
function toggleShutter() {
  if (!R || R.over || R.time < C.NIGHT_FROM) return;
  R.shutter = !R.shutter;
  log(R.shutter ? '🚪 Kéo cửa cuốn — chỉ khách quen gọi cửa mới vào, đỡ lộ' : '🚪 Kéo cửa cuốn lên, đón khách bình thường');
}
function cycleSpeed() {
  if (!R || R.over) return;
  if (R.escape || R.pcs.some(p => p.cust?.noisy)) { R.speed = 1; return; }
  const i = C.SPEEDS.indexOf(R.speed);
  R.speed = C.SPEEDS[(i + 1) % C.SPEEDS.length];
}

function tick(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (hold) hold.target[hold.prop] = Math.min(hold.max, hold.target[hold.prop] + hold.rate * dt);
  // tua nhanh: chạy logic nhiều bước mỗi khung hình (dừng ngay nếu hết ngày hoặc có sự kiện bắt tạm dừng)
  for (let k = 0; !atTitle && R && k < R.speed && !R.over && !R.paused; k++) update(dt);
  if (!atTitle && R && !R.over) renderPlay(R.paused ? 0 : dt);
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
  if (c.cardBuyer) return openCardBuyer(c);
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
  closeModal();
  const wasPaused = R.paused;
  setPause(true);
  c.atCounter = true;
  const lower = pc.tier < c.tier;
  openModal({ title: '🧑‍🍳 Nhân viên xin ý kiến',
    body: `<p><b>${esc(c.name)}</b> cần <b>${TIERS[c.tier].name}</b>, nhưng hiện chỉ còn máy <b>${pc.i + 1} · ${TIERS[pc.tier].name}</b>.</p>
      <p class="${lower ? 'warn' : 'note'}">${lower ? 'Máy yếu hơn nhu cầu, khách có thể bực và chỉ trả giá máy này.'
        : 'Máy xịn hơn nhu cầu; khách chỉ trả theo hạng đã yêu cầu.'}</p>
      <p>Cho nhân viên dẫn khách vào máy này? Nhân viên đã đào tạo sẽ tự nạp giờ; người chưa đào tạo vẫn chờ bạn nạp.</p>`,
    actions: [
      { label: 'Để khách chờ', cls: 'ghost', onClick: closeModal },
      { label: 'Tự chọn máy', cls: 'ghost', onClick: () => { closeModal(); openCheckin(null, c); } },
      { label: `Đồng ý máy ${pc.i + 1}`, cls: 'primary', onClick: () => {
        closeModal();
        if (!approveStaffSeat(c, pc)) updateStaff(0);
      } },
    ],
    onClose: () => { c.atCounter = false; renderQueue(); if (R && !R.over && !wasPaused) setPause(false); },
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
    if (c?.awaitingLoad && !staffById(c.staffId)?.trained && (!automatic || !c.staffLoadPrompted))
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
    card.innerHTML = c.cardBuyer
      ? `${face}<div class="req"><b>${esc(c.name)}</b><span>🎴 ${esc(cardOfferItem(S.cards.daily.offers.find(o => o.id === c.cardBuyer)))}</span></div><div class="patience"><i></i></div>`
      : c.lost
      ? `${face}<div class="req"><b>${esc(c.name)}</b><span>❌ Chưa có ${gameIcon(c.game)}</span></div>
        <div class="patience"><i></i></div>`
      : `${face}<div class="req"><b>${esc(c.name)}${knownIcon(c) ? ' ' + knownIcon(c) : ''}</b>
          ${c.staffProposal != null ? `<span class="cust-shy">⚠️ Nhân viên xin duyệt máy ${c.staffProposal + 1}</span>` : c.asked
            ? `<span>${TIERS[c.tier].icon} ${TIERS[c.tier].short} · ${c.overnight ? '🌙 Bao đêm' : durText(c.hours)}</span>`
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
  renderCoach();
  const thiefBtn = $('#btn-catch-thief');
  thiefBtn.hidden = !R.escape;
  if (R.escape) setText(thiefBtn, `🦹 Bắt trộm · ${Math.ceil(R.escape.left)}s`);
  const noiseBtn = $('#btn-noise');
  const noisyPcs = R.pcs.filter(p => p.cust?.noisy);
  noiseBtn.hidden = !noisyPcs.length;
  if (noisyPcs.length) setText(noiseBtn, `📢 Nhắc máy ${noisyPcs[0].i + 1}${noisyPcs.length > 1 ? ` · ${noisyPcs.length} khách ồn` : ''}`);
  const pendingLoad = R.pcs.filter(p => p.cust?.awaitingLoad).length;
  const approvals = R.queue.filter(c => c.staffProposal != null).length;
  const busy = R.pcs.filter(p => p.cust && p.cust.order && !p.cust.order.hidden).length;
  const broken = R.pcs.filter(p => p.broken && p.repair <= 0).length;
  const noisy = R.pcs.filter(p => p.cust?.noisy).length;
  const missing = R.pcs.filter(p => p.m.missing).length;
  const dark = !powered();
  setText($('#floor-hint'), R.escape ? `🦹 CÓ TRỘM! Bấm ngay máy ${R.escape.pc.i + 1} để bắt!`
    : dark ? (S.upgrades.gen ? '⚡ Cúp điện! Bấm 🛢️ ở thanh trên để nổ máy phát.' : '⚡ Cúp điện! Khách đang ngồi chờ có điện…')
    : pendingLoad ? `⏱️ ${pendingLoad} khách chờ nạp — nhân viên đã đào tạo tự nạp, bạn phụ người chưa đào tạo.`
    : approvals ? `⚠️ ${approvals} khách cần bạn duyệt máy khác nhu cầu.`
    : broken ? `💥 ${broken} máy đang treo — bấm vào máy để sửa!`
    : noisy ? '📢 Có khách làm ồn — bấm nút Nhắc máy ở hàng nút dưới cảnh.'
    : missing && !R.queue.length ? `🦹 ${missing} máy bị trộm mất đồ, chưa dùng được — sáng mai mua lại ở tab Nâng máy.`
    : busy ? `📝 ${busy} phiếu gọi món — làm đồ tại quầy${S.staff.length ? ', rồi giao nhân viên mang ra' : ' và mang ra'}`
    : R.closing ? '🌙 Đang chuẩn bị đóng cửa — không nhận khách mới, khách về hết thì quán tự đóng.'
    : R.paceRest > 0 ? '🧘 Tạm nghỉ đón khách sau sự kiện — tranh thủ xử lý việc còn lại.'
    : inNightBan() ? `👮 Đã quá ${C.NIGHT_POLICE_FROM}h — mở tiếp có thể bị công an kiểm tra${R.shutter ? ' (đã kéo cửa cuốn)' : ''}.`
    : R.time >= C.NIGHT_FROM && !R.queue.length ? '🌙 Khuya rồi, khách thưa dần. Đóng cửa khi thấy không còn đáng mở.'
    : R.queue.some(c => c.cardBuyer) ? CARD_SHOP_COPY.waiting + ' · ' + CARD_SHOP_COPY.meet
    : R.queue.length ? (S.staff.length ? 'Nhân viên đang tìm máy đúng nhu cầu cho khách.' : 'Bấm khách đang chờ để tự nạp giờ.') : '');
  renderDoorCtl();
  const staffTask = nextStaffTask();
  const staffBtn = $('#staff-task-btn');
  staffBtn.hidden = !staffTask;
  if (staffTask) setText(staffBtn, staffTask.label);

  PlayScene.frame({
    time: R.time, pcs: R.pcs, queue: R.queue, selected: R.selected, pick: R.pick,
    gamblingBanned: S.gambling.banned,
    cooking: modal && modal.docked && modal.pc ? modal.pc.i : null,
    paused: R.paused, repairSeconds: C.REPAIR_SECONDS, dark,
  }, dt);

  const paint = (bar, f) => { bar.style.width = f * 100 + '%'; bar.className = f < 0.3 ? 'low' : f < 0.6 ? 'mid' : ''; };
  for (const c of R.queue) if (c.bar) paint(c.bar, c.patience / c.patienceMax);
  // quầy nạp giờ che mất hàng chờ trên điện thoại: hiện luôn kiên nhẫn của khách đang đứng ở quầy
  const at = modal?.checkinBar && modal.checkin;
  if (at && R.queue.includes(at)) paint(modal.checkinBar, at.patience / at.patienceMax);
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

// Nút đóng cửa, cửa cuốn ở khung Cửa quán + nút tua nhanh trên HUD
function renderDoorCtl() {
  const closeBtn = $('#btn-close'), shutterBtn = $('#btn-shutter'), reopenBtn = $('#btn-reopen');
  setText(closeBtn, R.closing ? '🔒 Đóng ngay' : '🌙 Đóng cửa');
  closeBtn.classList.toggle('warn', R.closing);
  reopenBtn.hidden = !R.closing;
  shutterBtn.hidden = R.time < C.NIGHT_FROM;
  setText(shutterBtn, R.shutter ? '🚪 Kéo cửa lên' : '🚪 Kéo cửa cuốn');
  shutterBtn.classList.toggle('on', R.shutter);
  setText($('#btn-speed'), `⏩${R.speed}×`);
  $('#btn-speed').classList.toggle('on', R.speed > 1);
}

const sceneHandlers = {
  host: openHost,
  pc: i => { if (R && R.pcs[i]) onPcClick(R.pcs[i]); },
  bubble: i => {
    const pc = R && R.pcs[i];
    if (!pc || R.over) return;
    if (pc.cust && pc.cust.order) openKitchen(pc); else onPcClick(pc);
  },
  cust: id => { const c = R && R.queue.find(x => x.id === id); if (c) onQueueClick(c, $('#scene')); },
  thief: () => { if (R && !R.over && R.escape) catchThief(); },
};
