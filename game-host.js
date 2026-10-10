/* Quán Nét Bất Ổn — máy tính chủ, cờ bạc tiền game.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Máy tính chủ: dữ liệu và giao dịch buổi sáng ----------
const hostPlaying = () => !!(R && !R.over);
const hostTrend = () => HOST_TRENDS[(S.day - 1) % HOST_TRENDS.length];
const diceRounds = () => S.casino.day === S.day ? S.casino.rounds : [];
let diceAnimating = false;
function normalizeHost() {
  S.nextReviewId = Number.isSafeInteger(S.nextReviewId) && S.nextReviewId > 0 ? S.nextReviewId : 1;
  for (const rv of S.reviews) if (Number.isSafeInteger(rv.id)) S.nextReviewId = Math.max(S.nextReviewId, rv.id + 1);
  const ids = new Set();
  for (const rv of S.reviews) {
    if (!Number.isSafeInteger(rv.id) || rv.id < 1 || ids.has(rv.id)) rv.id = S.nextReviewId++;
    ids.add(rv.id);
    S.nextReviewId = Math.max(S.nextReviewId, rv.id + 1);
    // Review cũ chỉ có tên: không đoán ID vì khách khác có thể dùng lại tên đó.
    if (rv.reply && !HOST_REPLIES[rv.reply.kind]) delete rv.reply;
    if (rv.reply && 'text' in rv.reply) {
      if (typeof rv.reply.text !== 'string' || !rv.reply.text.trim() || rv.reply.text.trim().length > C.HOST_REPLY_MAX_LENGTH) delete rv.reply.text;
      else rv.reply.text = rv.reply.text.trim();
    }
  }
  for (const r of S.regulars) {
    const p = r.replyPromise;
    if (p && !MEMORY_TEXT[p.key] && p.key !== 'sick' && !(p.key === 'nogame' && GAMES[p.game])) delete r.replyPromise;
  }
  if (!S.casino || !Number.isInteger(S.casino.day) || !Array.isArray(S.casino.rounds)) S.casino = { day: S.day, rounds: [] };
  S.casino.rounds = S.casino.rounds.filter(r => r && validDiceBet(r.bet)
    && ['tai', 'xiu'].includes(r.side) && Array.isArray(r.dice) && r.dice.length === C.HOST_DICE_COUNT
    && r.dice.every(d => Number.isInteger(d) && d >= 1 && d <= C.HOST_DICE_SIDES)).slice(-C.HOST_DICE_HISTORY);
  for (const r of S.casino.rounds) {
    r.total = r.dice.reduce((n, d) => n + d, 0);
    r.won = diceWon(r.side, r.dice);
    r.payout = r.won ? r.bet * C.HOST_DICE_PAYOUT : 0;
  }
  const casino = S.casino;
  casino.count = Number.isSafeInteger(casino.count) && casino.count >= casino.rounds.length ? casino.count : casino.rounds.length;
  for (const key of ['wagered', 'paid']) {
    if (!Number.isFinite(casino[key]) || casino[key] < 0) casino[key] = casino.rounds.reduce((n, r) => n + (key === 'paid' ? r.payout : r.bet), 0);
  }
  const g = S.gambling = { risk: 0, banned: false, organized: false, activityDay: 0, peakDay: S.day,
    peak: Math.max(0, S.money), lastRaidDay: 0, lastCase: null, ...S.gambling };
  g.risk = Number.isFinite(g.risk) ? clamp(g.risk, 0, C.HOST_GAMBLE_RISK_MAX) : 0;
  g.banned = g.banned === true;
  g.organized = g.organized === true;
  for (const key of ['activityDay', 'peakDay', 'lastRaidDay']) if (!Number.isSafeInteger(g[key]) || g[key] < 0) g[key] = 0;
  if (!Number.isFinite(g.peak) || g.peak < 0) g.peak = Math.max(0, S.money);
  if (g.lastCase && (!Number.isFinite(g.lastCase.fine) || g.lastCase.fine < 0 || !Number.isSafeInteger(g.lastCase.day))) g.lastCase = null;
}
// Bộ ba (ba mặt giống nhau) là phần nhà cái ăn: cửa nào cũng thua.
const diceTriple = dice => C.HOST_DICE_TRIPLE_LOSES && dice.every(d => d === dice[0]);
const diceWon = (side, dice) => !diceTriple(dice) && side === (dice.reduce((n, d) => n + d, 0) <= C.HOST_DICE_SPLIT ? 'tai' : 'xiu');
const validDiceBet = bet => Number.isSafeInteger(bet) && bet > 0 && Number.isSafeInteger(bet * C.HOST_DICE_PAYOUT);
// Tiền và kết quả được ghi chung; lỗi ghi trên máy thì phục hồi giao dịch trong bộ nhớ.
function hostTransaction(change) {
  if (hostPlaying() || CloudSave.state().blocked || CloudSave.state().busy) return false;
  const before = JSON.stringify(S);
  change();
  try { CloudSave.save(S); return true; }
  catch (e) { S = JSON.parse(before); saveFailed(e); return false; }
}
const reviewReplyText = rv => rv.reply?.text || HOST_REPLIES[rv.reply?.kind]?.text || '';
function replyReview(id, kind, text) {
  const rv = S.reviews.find(r => r.id === id), choice = HOST_REPLIES[kind];
  if (!rv || rv.reply || !choice) return false;
  if (text !== undefined) {
    if (typeof text !== 'string' || !text.trim() || text.trim().length > C.HOST_REPLY_MAX_LENGTH) return false;
    text = text.trim();
  }
  return hostTransaction(() => {
    const rec = regById(rv.regId);
    const delta = kind === 'sassy' ? C.HOST_REPLY_SASSY
      : kind === 'apology' && rv.stars <= 3 ? C.HOST_REPLY_APOLOGY
      : kind === 'thanks' && rv.stars >= 4 ? C.HOST_REPLY_THANKS
      : kind === 'explain' ? C.HOST_REPLY_EXPLAIN : 0;
    rv.reply = { kind, day: S.day, delta: rec ? delta : 0 };
    if (text !== undefined) rv.reply.text = text;
    if (rec) {
      rec.aff = clamp(rec.aff + delta, 0, 100);
      const key = MEM_GROUP[rv.key] || (rv.key === 'sick' ? 'sick' : rv.key === 'nogame' && GAMES[rv.game] ? 'nogame' : null);
      if (kind === 'apology' && rv.stars <= 3 && key && !rec.replyPromise) rec.replyPromise = { key, day: S.day, game: rv.game, reviewId: rv.id };
    }
  });
}
function settleReplyPromise(c, forcedStars) {
  const rec = regById(c.regId), promise = rec?.replyPromise;
  if (!promise || (c.lost && promise.key !== 'nogame')) return;
  const failed = promise.key === 'nogame' ? c.lost && c.game === promise.game
    : promise.key === 'sick' ? !!c.sick || c.ev.sick < 0
    : Object.entries(c.ev).some(([key, value]) => MEM_GROUP[key] === promise.key && value < 0);
  const fixed = promise.key !== 'nogame' || S.installed[promise.game];
  const good = !c.lost && !failed && fixed && (forcedStars ? forcedStars * 20 - 10 : c.sat) >= C.HOST_PROMISE_SAT;
  if (!failed && !good) return;
  c.affBonus = (c.affBonus || 0) + (good ? C.HOST_PROMISE_GOOD : C.HOST_PROMISE_BAD);
  delete rec.replyPromise;
  const text = good ? `${c.name}: quán đã giữ lời sau khi xin lỗi.` : `${c.name}: lại gặp lỗi quán đã hứa sửa.`;
  R.led.replyNotes.push(text);
  log(`💬 ${text}`);
}
function rollDice(side, bet) {
  if (!['tai', 'xiu'].includes(side) || !validDiceBet(bet) || diceAnimating
    || S.money < bet || S.gambling.lastRaidDay === S.day || S.suspendDay === S.day
    || !Number.isSafeInteger(S.money + bet)) return false;
  return hostTransaction(() => {
    if (S.casino.day !== S.day) S.casino = { day: S.day, rounds: [], count: 0, wagered: 0, paid: 0 };
    gamblingPeak();
    const dice = Array.from({ length: C.HOST_DICE_COUNT }, () => 1 + Math.floor(Math.random() * C.HOST_DICE_SIDES));
    const total = dice.reduce((n, d) => n + d, 0);
    const won = diceWon(side, dice);
    const payout = won ? bet * C.HOST_DICE_PAYOUT : 0;
    S.money += payout - bet;
    // tiền riêng của chủ quán lấy từ két đi chơi: ghi phải thu chủ sở hữu, không phải chi phí của quán
    post('PC', 'Chủ quán lấy tiền quỹ chơi tài xỉu', [['1388', '1111', bet]]);
    post('PT', 'Chủ quán nộp lại tiền thắng tài xỉu vào quỹ', [['1111', '1388', payout]]);
    recordBook('leisureIn', payout);
    recordBook('leisureOut', bet);
    S.casino.rounds.push({ dice, total, side, bet, won, payout });
    S.casino.rounds = S.casino.rounds.slice(-C.HOST_DICE_HISTORY);
    S.casino.count++;
    S.casino.wagered += bet;
    S.casino.paid += payout;
    addGamblingRisk(C.HOST_GAMBLE_RISK_ROUND, bet);
    const rate = gamblingRaidRate();
    if (rate > 0 && Math.random() < rate) catchGambling();
  });
}

// ---------- Cờ bạc tiền game: nghi ngờ, khách và xử phạt ----------
function gamblingPeak() {
  const g = S.gambling;
  if (g.peakDay !== S.day) { g.peakDay = S.day; g.peak = 0; }
  g.peak = Math.max(g.peak, S.money, 0);
}
function addGamblingRisk(points, bet = 0) {
  gamblingPeak();
  const g = S.gambling, before = g.risk;
  g.risk = Math.min(C.HOST_GAMBLE_RISK_MAX, g.risk + points + bet / C.HOST_GAMBLE_RISK_MONEY);
  g.activityDay = S.day;
  if (hostPlaying() && before < C.HOST_GAMBLE_WARN && g.risk >= C.HOST_GAMBLE_WARN) log('🚨 Giao dịch bất thường: khu phố đang chú ý chuyện cờ bạc ở quán.');
}
const gamblingRaidRate = () => S.gambling.lastRaidDay === S.day ? 0
  : Math.min(C.HOST_GAMBLE_RAID_MAX, Math.max(0, S.gambling.risk - C.HOST_GAMBLE_WARN) * C.HOST_GAMBLE_RAID_RATE);
function catchGambling() {
  const g = S.gambling;
  if (g.lastRaidDay === S.day) return null;
  if (hostPlaying()) for (const pc of R.pcs) if (pc.cust?.gamble?.pending) settleCustomerGamble(pc.cust);
  gamblingPeak();
  const organized = g.organized;
  const fine = Math.ceil(Math.max(organized ? C.HOST_GAMBLE_ORG_FINE : C.HOST_GAMBLE_FINE,
    g.peak * (organized ? C.HOST_GAMBLE_ORG_RATE : C.HOST_GAMBLE_FINE_RATE)));
  S.money -= fine;
  recordBook('gambleFine', fine);
  post('PC', 'Nộp phạt hành chính vì tổ chức cờ bạc', [['811', '1111', fine]]);
  g.lastRaidDay = S.day;
  g.lastCase = { day: S.day, fine, organized, peak: g.peak };
  g.risk = 0;
  g.organized = false;
  if (organized) { S.suspendDay = S.day + 1; S.suspendReason = 'gambling'; }
  if (hostPlaying()) {
    R.led.gambleFine += fine;
    R.led.gambleCase = g.lastCase;
    for (const pc of R.pcs) if (pc.cust?.gamble) pc.cust.gamble.active = false;
    log(`👮 Phát hiện cờ bạc mạng: phạt ${money(fine)}${organized ? ', đình chỉ quán ngày mai' : ''}.`);
  }
  return g.lastCase;
}
function gamblingCaseHTML(c) {
  return `<p class="bad-text">👮 Ngày ${c.day}: phát hiện ${c.organized ? 'giới thiệu khách chơi cờ bạc mạng' : 'chủ quán chơi cờ bạc mạng'}. Đã trừ <b>${money(c.fine)}</b>, căn cứ tiền cao nhất ngày ${money(c.peak)}.</p>
    <p>${c.organized ? 'Quán bị đình chỉ ngày kế tiếp, vẫn trả mặt bằng và lãi vay.' : 'Tài khoản bị khóa đến hết ngày này.'}</p>`;
}
function gamblingRaid() {
  const c = catchGambling();
  if (!c) return;
  eventBreather();
  closeModal();
  const wasPaused = R.paused;
  setPause(true);
  SFX.play('police');
  openModal({ title: '👮 Phát hiện cờ bạc mạng', cls: 'modal-police modal-gambling', dismissable: false,
    body: gamblingCaseHTML(c), actions: [{ label: 'Chấp hành xử phạt', cls: 'primary', onClick: closeModal }],
    onClose: () => { if (hostPlaying() && !wasPaused) setPause(false); } });
}
function setGamblingBan(banned) {
  if (typeof banned !== 'boolean' || S.gambling.banned === banned || CloudSave.state().blocked || CloudSave.state().busy) return false;
  const change = () => {
    S.gambling.banned = banned;
    if (hostPlaying()) {
      if (banned) for (const pc of R.pcs) if (pc.cust?.gamble) pc.cust.gamble.active = false;
      R.led.gambleNotes.push(banned ? 'Dán bảng cấm: chặn lượt cược mới, lượt đã cược giải quyết xong.' : 'Gỡ bảng cấm cờ bạc.');
      log(banned ? '🚫 Đã dán bảng cấm cờ bạc; lịch sử vi phạm vẫn còn.' : '🎲 Đã gỡ bảng cấm cờ bạc.');
    }
  };
  if (!hostPlaying()) return hostTransaction(change);
  change();
  return true;
}
function inviteGambling(i) {
  const pc = R?.pcs[i], c = pc?.cust;
  if (!hostPlaying() || !c || c.awaitingLoad || c.shifty || c.seg === 'hocsinh' || c.gambleInvited
    || S.gambling.banned || S.gambling.lastRaidDay === S.day || R.closing
    || CloudSave.state().blocked || CloudSave.state().busy) return false;
  c.gambleInvited = true;
  S.gambling.organized = true;
  addGamblingRisk(C.HOST_GAMBLE_INVITE_RISK);
  if (Math.random() >= C.HOST_GAMBLE_ACCEPT) {
    hit(c, 'gamble', C.HOST_GAMBLE_LOSS_HIT, null, 'Không thích chủ quán rủ cờ bạc');
    log(`🚫 ${c.name} từ chối: “Em vào chơi game, đừng rủ cái này!”`);
    R.led.gambleNotes.push(`${c.name} từ chối lời giới thiệu.`);
    return true;
  }
  const budget = pick(C.HOST_GAMBLE_BUDGETS);
  c.gamble = { active: true, budget, rounds: 0, wait: 0, pending: null };
  R.led.gambleInvites++;
  startCustomerGamble(c);
  log(`🎲 ${c.name} đồng ý; ngân sách riêng ${money(budget)}, tối đa ${C.HOST_GAMBLE_CUSTOMER_ROUNDS} lượt lần ghé này.`);
  return true;
}
function startCustomerGamble(c) {
  const g = c.gamble;
  if (!g?.active || g.pending || S.gambling.banned || S.gambling.lastRaidDay === S.day
    || g.rounds >= C.HOST_GAMBLE_CUSTOMER_ROUNDS || g.budget < 1) return;
  const bet = Math.max(1, Math.floor(g.budget * C.HOST_GAMBLE_STAKE_RATE));
  const dice = Array.from({ length: C.HOST_DICE_COUNT }, () => 1 + Math.floor(Math.random() * C.HOST_DICE_SIDES));
  const side = pick(['tai', 'xiu']);
  g.budget -= bet;
  g.rounds++;
  g.pending = { bet, dice, side, won: diceWon(side, dice), left: C.HOST_DICE_ANIMATION_MS / 1000 };
  addGamblingRisk(C.HOST_GAMBLE_CUSTOMER_RISK, bet);
  R.led.gambleWagered += bet;
}
function settleCustomerGamble(c) {
  const g = c.gamble, r = g?.pending;
  if (!r) return;
  g.pending = null;
  g.last = { ...r };
  let tip = 0;
  if (r.won) {
    g.budget += r.bet * C.HOST_DICE_PAYOUT;
    if (Math.random() < C.HOST_GAMBLE_TIP_CHANCE) tip = Math.floor(r.bet * (C.HOST_DICE_PAYOUT - 1) * C.HOST_GAMBLE_TIP_RATE);
    g.budget -= tip;
    S.money += tip;
    recordBook('gambleTips', tip);
    post('PT', 'Khách thưởng chủ quán sau ván cược', [['1111', '711', tip]]);
    R.led.gambleTips += tip;
  } else hit(c, 'gamble', C.HOST_GAMBLE_LOSS_HIT, null, 'Thua cược sau khi chủ quán giới thiệu');
  gamblingPeak();
  const text = `${c.name}: ${r.dice.join(' + ')} · ${r.won ? 'thắng' : 'thua'} cược ${money(r.bet)}${tip ? `, thưởng chủ ${money(tip)}` : ''}.`;
  R.led.gambleNotes.push(text);
  log(`🎲 ${text}`);
  g.wait = C.HOST_GAMBLE_INTERVAL;
  if (g.rounds >= C.HOST_GAMBLE_CUSTOMER_ROUNDS || g.budget < 1) g.active = false;
}
function updateGambling(dt, gh) {
  gamblingPeak();
  for (const pc of R.pcs) {
    const c = pc.cust, g = c?.gamble;
    if (!g) continue;
    if (g.pending) {
      g.pending.left -= dt;
      if (g.pending.left <= 0) settleCustomerGamble(c);
    } else if (g.active && powered() && !pc.broken && !R.closing) {
      g.wait -= gh;
      if (g.wait <= 0) startCustomerGamble(c);
    }
  }
  const rate = gamblingRaidRate();
  if (rate > 0 && (!modal || modal.docked) && !hold && Math.random() < 1 - Math.exp(-rate * gh)) { gamblingRaid(); return true; }
  return false;
}

// ---------- Máy tính chủ: desktop và các app ----------
function hostNewsHTML() {
  const hot = GAMES[S.hot], trend = hostTrend(), outage = S.outageNext;
  const card = (title, text) => `<article class="host-news"><h3>${title}</h3><p>${text}</p></article>`;
  return `<p class="host-status">🌐 Bản tin đã cập nhật · ngày ${dayText()} · tin trong thế giới game</p>`
    + card('⚡ Điện lực thông báo', outage ? `Dự kiến cúp điện từ <b>${clockText(outage.from)} đến ${clockText(outage.to)}</b>. Kiểm tra UPS và máy phát trước khi mở cửa.`
      : 'Chưa có lịch cúp điện được báo trước hôm nay. Sự cố bất chợt vẫn có thể xảy ra.')
    + card('🌤️ Dự báo & lịch phố', todayHTML())
    + `<article class="host-news">${cardMarketHTML()}</article>`
    + card(`🔥 ${hot.icon} ${hot.name}`, S.installed[S.hot] ? 'Quán đã cài game hot hôm nay. Kiểm tra máy đủ hạng để đón khách.'
      : `Quán chưa cài: giá <b>${money(hot.cost)}</b>, cần máy ${TIERS[hot.minTier].short}. Ghé tab Nâng máy để xem thư viện game.`)
    + card(`💬 Trend: ${trend.title}`, esc(trend.text))
    + card('🦹 Thông báo an ninh', S.day < C.THIEF_FROM_DAY ? `Từ ngày ${C.THIEF_FROM_DAY}, đề phòng người giả làm khách để gỡ linh kiện.`
      : 'Khu phố đang tìm kẻ hay giả làm khách, nạp ít giờ rồi nhìn quanh máy. Đây là dấu hiệu để quan sát, chưa đủ kết luận một khách là trộm. Camera và khóa cáp giúp phòng mất đồ.');
}
function hostReviewsHTML() {
  // Chỉ xếp bản hiển thị: giữ lịch sử mới nhất trong từng nhóm và trong bản lưu.
  const reviews = [...S.reviews.filter(rv => !rv.reply), ...S.reviews.filter(rv => rv.reply)];
  const pending = reviews.filter(rv => !rv.reply).length;
  return `<p class="host-status" role="status">Chưa trả lời: <b>${pending}</b> · Đã trả lời: <b>${reviews.length - pending}</b></p>
    <p class="hint">Đánh giá chưa trả lời ở trên cùng. Trả lời một lần mỗi đánh giá; sao cũ giữ nguyên. ${hostPlaying() ? 'Đang trong ca: chỉ đọc, sáng mai hãy trả lời.' : 'Xin lỗi rồi sửa đúng lỗi ở lần ghé sau mới được thêm thiện cảm.'}</p>`
    + (reviews.length ? reviews.map(rv => {
      const rec = regById(rv.regId);
      const draft = modal?.reviewDrafts?.[rv.id], disabled = hostPlaying() ? 'disabled' : '';
      const reply = rv.reply ? `<div class="host-reply"><b>Chủ quán · ngày ${rv.reply.day}</b><p class="host-reply-text">${esc(reviewReplyText(rv))}</p>
        <p class="muted small">${rec ? `Thiện cảm khi trả lời: ${rv.reply.delta > 0 ? '+' : ''}${rv.reply.delta}.` : 'Review chưa liên kết với khách trong sổ quen; phản hồi vẫn được lưu.'}
        ${rec?.replyPromise?.reviewId === rv.id ? ' Khách đang chờ quán giữ lời ở lần ghé sau.' : ''}</p></div>`
        : `<div class="host-reply-actions">${Object.entries(HOST_REPLIES).map(([kind, choice]) => `<button class="btn small ${kind === 'sassy' ? 'danger' : ''}"
          data-reply="${kind}" data-review-id="${rv.id}" ${disabled}>${choice.label}</button>`).join('')}</div>
          <details class="host-reply-editor" data-custom-review="${rv.id}" ${draft?.open ? 'open' : ''}>
            <summary>✍️ Tự viết trả lời</summary>
            <label for="reply-kind-${rv.id}">Thái độ trả lời</label>
            <select id="reply-kind-${rv.id}" data-reply-kind="${rv.id}" ${disabled}>${Object.entries(HOST_REPLIES).map(([kind, choice]) => `<option value="${kind}" ${kind === (draft?.kind || 'explain') ? 'selected' : ''}>${choice.label}</option>`).join('')}</select>
            <p class="hint">Thái độ quyết định thiện cảm như nút trả lời nhanh. Chọn xin lỗi là hứa sửa lỗi khách gặp.</p>
            <label for="reply-text-${rv.id}">Nội dung trả lời</label>
            <textarea id="reply-text-${rv.id}" data-reply-text="${rv.id}" maxlength="${C.HOST_REPLY_MAX_LENGTH}" rows="3" placeholder="Viết lời trả lời của chủ quán…" ${disabled}>${esc(draft?.text || '')}</textarea>
            <p class="muted small" data-reply-count="${rv.id}">${(draft?.text || '').length}/${C.HOST_REPLY_MAX_LENGTH} ký tự</p>
            <p class="bad-text small" data-reply-error="${rv.id}" role="alert"></p>
            <button class="btn primary" data-reply-custom="${rv.id}" ${disabled}>Gửi trả lời</button>
          </details>`;
      return `<article data-review-card="${rv.id}">${reviewHTML(rv, { hideReply: true })}${reply}</article>`;
    }).join('') : '<p class="note">Chưa có review. Mở cửa đón khách, rồi quay lại xem nhé!</p>');
}
function hostLoanHTML(kind) {
  const bank = kind === 'bank', rate = bank ? C.BANK_RATE : C.SHARK_RATE;
  const debt = S.loans[kind], interest = debt ? Math.max(1000, round1k(debt * rate)) : 0;
  return `<p class="host-status">${bank ? '🏦 Ngân hàng khu phố' : '💀 Vay nóng · lãi cao'}</p>
    <p>Tiền quán: <b>${money(S.money)}</b> · tổng nợ cả hai app: <b>${money(S.loans.bank + S.loans.shark)}</b>.</p>
    <p>Lãi dự kiến tối nay trên khoản nợ hiện tại: <b>${money(interest)}</b>, cộng vào nợ.</p>
    <p class="hint">${bank ? 'Ngân hàng xét hạn mức theo dàn máy và đánh giá; không có hạn trả cố định, trả bớt mỗi sáng để giảm lãi.'
      : `Vay nóng không có kỳ ân hạn riêng cho từng lượt vay. Đang nợ ${S.sharkDays} ngày; sau ${C.SHARK_DUE_DAYS} ngày chưa trả hết, người đòi nợ có thể làm mất uy tín quán.`}</p>
    ${hostPlaying() ? '<p class="note">Chỉ xem trong ca. Vay hoặc trả nợ vào buổi sáng.</p>' : ''}${loansHTML(kind)}`;
}
function hostDiceHTML() {
  const rounds = diceRounds(), last = S.casino.rounds[S.casino.rounds.length - 1], g = S.gambling;
  const canPlay = !hostPlaying() && g.lastRaidDay !== S.day && S.suspendDay !== S.day && !diceAnimating;
  const betValue = Math.min(modal?.hostBet || C.HOST_DICE_BETS[0], Math.max(1, S.money));
  const result = diceAnimating ? '<div class="host-dice-result" aria-live="polite"><div class="host-dice dice-rolling"><span>⚄</span><span>⚁</span><span>⚅</span></div><b>Đang quay xúc xắc…</b></div>' : last ? `<div class="host-dice-result ${last.won ? 'good-text' : 'bad-text'}" aria-live="polite"><div class="host-dice" aria-label="Xúc xắc ${last.dice.join(', ')}">${last.dice.map(d => `<span>${['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][d]}</span>`).join('')}</div>
    <b>${last.total} điểm · ${diceTriple(last.dice) ? 'Bộ ba, nhà cái ăn' : last.total <= C.HOST_DICE_SPLIT ? 'Tài' : 'Xỉu'} · ${last.won ? 'Thắng' : 'Thua'}</b>
    <p>Ngày ${S.casino.day} · cược ${money(last.bet, true)} · nhận ${money(last.payout, true)} · ${last.won ? 'lãi' : 'mất'} ${money(last.bet, true)}.</p></div>` : '';
  const customers = hostPlaying() ? `<h3>Khách trong quán</h3><p class="hint">Giới thiệu một lần mỗi khách người lớn. Khách có ngân sách riêng, có thể từ chối; thắng có thể thưởng ${Math.round(C.HOST_GAMBLE_TIP_RATE * 100)}% tiền lãi. Chơi tiếp khi đóng máy chủ. Thu chi trong ca chốt cuối ngày.</p>`
    + R.pcs.filter(pc => pc.cust && !pc.cust.awaitingLoad).map(pc => {
      const c = pc.cust, cg = c.gamble;
      const allowed = c.seg !== 'hocsinh' && !c.shifty && !c.gambleInvited && !g.banned && g.lastRaidDay !== S.day && !R.closing;
      return `<article class="host-news"><b>Máy ${pc.i + 1} · ${esc(c.name)}</b><p>${cg ? `Ngân sách còn ${money(cg.budget, true)} · ${cg.rounds}/${C.HOST_GAMBLE_CUSTOMER_ROUNDS} lượt · ${cg.pending ? '🎲 đang quay' : cg.active ? 'chờ lượt tiếp' : 'đã dừng'}` : c.gambleInvited ? 'Khách đã từ chối lời giới thiệu.' : c.seg === 'hocsinh' ? 'Không giới thiệu cho học sinh.' : 'Chưa giới thiệu.'}</p>
        ${cg?.pending ? '<div class="host-dice dice-rolling" aria-label="Khách đang quay xúc xắc"><span>⚄</span><span>⚁</span><span>⚅</span></div>' : cg?.last ? `<p>🎲 ${cg.last.dice.join(' + ')} · ${cg.last.won ? 'Thắng' : 'Thua'} cược ${money(cg.last.bet, true)}</p>` : ''}
        <button class="btn small danger" data-gamble-invite="${pc.i}" ${allowed ? '' : 'disabled'}>Giới thiệu tài xỉu</button></article>`;
    }).join('') : '<p class="hint">Mở cửa rồi quay lại app để giới thiệu cho khách đang chơi.</p>';
  return `<p class="host-status">🎲 Tiền game · ${S.casino.day === S.day ? S.casino.count : 0} lượt hôm nay · còn ${money(S.money, true)}</p>
    <p>Luật riêng của quán: <b>3–10 Tài · 11–18 Xỉu</b>. Tung 3 xúc xắc; ${C.HOST_DICE_TRIPLE_LOSES ? 'ra bộ ba (ba mặt giống nhau) thì cả hai cửa thua' : 'bộ ba vẫn tính tổng'}. Thắng nhận tổng x${C.HOST_DICE_PAYOUT}, đã gồm vốn cược.</p>
    <p class="hint">Ví dụ cược 10k, thắng nhận 20k: lãi 10k. Kết quả được lưu ngay; tải lại không tung lại. Thu chi giải trí tách khỏi lợi nhuận quán.</p>
    ${hostPlaying() ? '<p class="note">Chủ quán tự chơi buổi sáng; trong ca có thể giới thiệu khách hoặc dán bảng cấm.</p>' : ''}
    ${!diceAnimating && g.lastCase?.day === S.day ? gamblingCaseHTML(g.lastCase) : ''}
    ${S.suspendDay === S.day ? '<p class="bad-text">Hôm nay bị đình chỉ: tài xỉu bị khóa.</p>' : ''}
    <div class="host-bets"><div><label for="host-bet">Số tiền cược (đồng)</label><input id="host-bet" type="number" inputmode="numeric" min="1" max="${Math.max(0, S.money)}" step="1" value="${betValue}" ${canPlay ? '' : 'disabled'}>
      <div>${C.HOST_DICE_BETS.map(bet => `<button class="btn small ghost" data-bet-preset="${bet}" ${canPlay ? '' : 'disabled'}>${money(bet)}</button>`).join('')}</div>
      <div>${['tai', 'xiu'].map(side => `<button class="btn" data-dice-side="${side}" ${canPlay && S.money >= 1 ? '' : 'disabled'}>${side === 'tai' ? 'Tài 3–10' : 'Xỉu 11–18'}</button>`).join('')}</div><p class="bad-text" data-bet-error role="alert"></p></div></div>
    ${result}${rounds.length ? `<p class="muted small">Cả ngày: cược ${money(S.casino.wagered)}, nhận ${money(S.casino.paid)}. Không giới hạn lượt; mỗi lượt tăng nguy cơ bị phát hiện.</p>` : ''}
    <p class="${g.risk >= C.HOST_GAMBLE_WARN ? 'bad-text' : 'hint'}">🚨 Mức nghi ngờ: <b>${Math.round(g.risk)}/${C.HOST_GAMBLE_RISK_MAX}</b>. ${g.risk >= C.HOST_GAMBLE_WARN ? 'Có dấu hiệu giao dịch bất thường; công an có thể kiểm tra.' : 'Chơi hoặc giới thiệu nhiều sẽ bị chú ý.'}</p>
    <p class="hint">Tự chơi: phạt ít nhất ${money(C.HOST_GAMBLE_FINE)} hoặc ${C.HOST_GAMBLE_FINE_RATE * 100}% tiền cao nhất ngày. Giới thiệu khách: ít nhất ${money(C.HOST_GAMBLE_ORG_FINE)} hoặc ${C.HOST_GAMBLE_ORG_RATE * 100}%, đình chỉ 1 ngày. Ngày không cược mới giảm ${C.HOST_GAMBLE_DECAY} điểm nghi ngờ.</p>
    <div class="host-ban"><b>${g.banned ? '🚫 Đang treo bảng CẤM CỜ BẠC' : 'Chưa treo bảng cấm cờ bạc'}</b><p>Chặn khách đặt lượt mới; lượt đã cược giải quyết xong. Bảng không xóa lịch sử vi phạm và không chặn chủ tự chơi.</p><button class="btn" data-gamble-ban="${g.banned ? 'off' : 'on'}">${g.banned ? 'Gỡ bảng cấm' : 'Dán bảng Cấm cờ bạc'}</button></div>${customers}`;
}
function renderHostApp(app = 'desktop', keepScroll = false) {
  if (!modal?.host) return;
  modal.cardDemoCleanup?.();
  modal.cardDemoCleanup = null;
  if (!unlocked(app)) app = 'desktop';
  const scrollTop = keepScroll ? modal.bodyEl.scrollTop : 0;
  modal.hostApp = app;
  const title = HOST_APPS.find(a => a.id === app);
  const desktop = `<p class="host-status">Xin chào chủ quán · ${esc(S.shopName)} · ngày ${dayText()}</p>
    <div class="host-apps">${HOST_APPS.map(a => unlocked(a.id) ? `<button class="host-app" data-host-app="${a.id}"><span aria-hidden="true">${a.icon}</span><b>${a.name}</b><small>${a.desc}</small></button>`
      : `<button class="host-app locked" disabled><span aria-hidden="true">🔒</span><b>${a.name}</b><small>Mở từ ngày ${unlockOf(a.id).day}</small></button>`).join('')}</div>`;
  modal.bodyEl.innerHTML = `<div class="host-toolbar">${app !== 'desktop' ? '<button class="btn small ghost" data-host-app="desktop">← Các app</button>' : ''}
    <span>${title ? `${title.icon} ${title.name}` : '🖥️ Máy tính chủ'}</span><b>${money(S.money)}</b></div><div class="host-content">`
    + (app === 'cards' ? '<div data-card-album></div>' : app === 'news' ? hostNewsHTML() : app === 'reviews' ? hostReviewsHTML() : ['bank', 'shark'].includes(app) ? hostLoanHTML(app) : app === 'dice' ? hostDiceHTML() : desktop) + '</div>';
  if (app === 'cards') {
    const refresh = () => {
      if (hostPlaying()) renderPlay(); else renderPrep();
      if (modal?.host) modal.bodyEl.querySelector('.host-toolbar > b').textContent = money(S.money);
    };
    modal.cardDemoCleanup = window.CardAlbum.mount(modal.bodyEl.querySelector('[data-card-album]'), {
      read: cardShopView, money,
      buy: (key, qty, quote) => { const ok = buyCardPacks(key, qty, quote); if (ok) refresh(); return ok; },
      open: (key, previousId) => { const result = openCardPack(key, previousId); if (result) refresh(); return result; },
      finish: finishCardOpening,
      shelve: (slot, id) => { const ok = setShelf(slot, id); if (ok) refresh(); return ok; },
      dust: id => { const got = disenchantCard(id); if (got) refresh(); return got; },
      craft: id => { const ok = craftCard(id); if (ok) refresh(); return ok; },
      meet: id => { const c = R?.queue.find(c => c.cardBuyer === id); if (c) openCardBuyer(c); },
    });
  }
  if (app === 'news') {
    let tick = cardMarketTick();
    const timer = setInterval(() => {
      if (modal?.hostApp === 'news' && cardMarketTick() !== tick) { tick = cardMarketTick(); renderHostApp('news', true); }
    }, C.CARD_MARKET_UI_MS);
    modal.cardDemoCleanup = () => clearInterval(timer);
  }
  modal.bodyEl.scrollTop = scrollTop;
}
function openHost() {
  if (!S || atTitle || (modal && !modal.dismissable)) return;
  closeModal();
  const playing = hostPlaying(), wasPaused = playing && R.paused;
  if (playing) setPause(true);
  const m = openModal({ title: '🖥️ Máy tính chủ', cls: 'modal-host', body: '',
    actions: [{ label: '🏠 Về tiêu đề', cls: 'ghost', onClick: returnToTitle }, { label: 'Đóng máy chủ', cls: 'primary', onClick: closeModal }],
    onClose: () => { if (hostPlaying() && !wasPaused) setPause(false); } });
  m.host = true;
  m.reviewDrafts = {};
  const rememberDraft = e => {
    const input = e.target, id = input.dataset.replyText || input.dataset.replyKind;
    if (!id) return;
    const draft = m.reviewDrafts[id] ||= { text: '', kind: 'explain', open: true };
    if (input.dataset.replyText) {
      draft.text = input.value;
      m.bodyEl.querySelector(`[data-reply-count="${id}"]`).textContent = `${input.value.length}/${C.HOST_REPLY_MAX_LENGTH} ký tự`;
      m.bodyEl.querySelector(`[data-reply-error="${id}"]`).textContent = '';
    } else draft.kind = input.value;
  };
  m.bodyEl.addEventListener('input', rememberDraft);
  m.bodyEl.addEventListener('change', rememberDraft);
  m.bodyEl.addEventListener('toggle', e => {
    const id = e.target.dataset.customReview;
    if (id) (m.reviewDrafts[id] ||= { text: '', kind: 'explain' }).open = e.target.open;
  }, true);
  m.bodyEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (diceAnimating) return;
    if (b.dataset.hostApp) return renderHostApp(b.dataset.hostApp);
    if (CloudSave.state().blocked || CloudSave.state().busy) return;
    if (b.dataset.betPreset) { m.bodyEl.querySelector('#host-bet').value = b.dataset.betPreset; m.hostBet = +b.dataset.betPreset; return; }
    let ok = false;
    if (b.dataset.reply) ok = replyReview(+b.dataset.reviewId, b.dataset.reply);
    else if (b.dataset.replyCustom) {
      const id = b.dataset.replyCustom, input = m.bodyEl.querySelector(`[data-reply-text="${id}"]`);
      const kind = m.bodyEl.querySelector(`[data-reply-kind="${id}"]`).value;
      if (!input.value.trim() || input.value.trim().length > C.HOST_REPLY_MAX_LENGTH) {
        m.bodyEl.querySelector(`[data-reply-error="${id}"]`).textContent = `Viết từ 1 đến ${C.HOST_REPLY_MAX_LENGTH} ký tự trước khi gửi.`;
        input.focus({ preventScroll: true });
        return;
      }
      ok = replyReview(+id, kind, input.value);
    }
    else if (b.dataset.diceSide) {
      const input = m.bodyEl.querySelector('#host-bet'), bet = +input.value;
      if (!validDiceBet(bet) || bet > S.money || !Number.isSafeInteger(S.money + bet)) {
        m.bodyEl.querySelector('[data-bet-error]').textContent = 'Nhập số tiền nguyên từ 1 đồng đến số tiền đang có.';
        return;
      }
      m.hostBet = bet;
      ok = rollDice(b.dataset.diceSide, bet);
      if (ok) {
        diceAnimating = true;
        renderPrep();
        renderHostApp('dice');
        setTimeout(() => {
          diceAnimating = false;
          if (modal === m) renderHostApp('dice');
        }, C.HOST_DICE_ANIMATION_MS);
        return;
      }
    }
    else if (b.dataset.gambleInvite !== undefined) ok = inviteGambling(+b.dataset.gambleInvite);
    else if (b.dataset.gambleBan) ok = setGamblingBan(b.dataset.gambleBan === 'on');
    else if (!hostPlaying() && (b.dataset.borrow || b.dataset.repay)) {
      const kind = b.dataset.borrow || b.dataset.repay;
      if (!['bank', 'shark'].includes(kind)) return;
      ok = b.dataset.borrow ? borrow(kind, +b.dataset.amt) : repay(kind, +b.dataset.amt);
    }
    if (ok && modal === m) {
      const replied = b.dataset.reviewId || b.dataset.replyCustom;
      if (replied) delete m.reviewDrafts[replied];
      if (!hostPlaying()) renderPrep();
      renderHostApp(m.hostApp, !!replied);
    }
  });
  renderHostApp();
}
