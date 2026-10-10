/* Quán Nét Bất Ổn — màn hình, cửa sổ nổi, nút giữ, hiệu ứng, khách quen.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Màn hình & modal ----------
function showScreen(name) {
  atTitle = name === 'title';
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  window.scrollTo(0, 0);
}

function returnToTitle() {
  closeModal();
  if (R && !R.over) {
    titleWasPaused = R.paused;
    setPause(true);
  }
  refreshContinue();
  showScreen('title');
}

// dock = hiện ở quầy thao tác nửa dưới màn chơi (không che cảnh quán, vẫn bấm được khách và máy)
// foot = phần luôn nằm ở đáy quầy cùng hàng nút (thanh đo, nút giữ), không bị cuộn khuất
function openModal({ title, body, actions = [], cls = '', onClose, dismissable = true, dock = false, foot = null }) {
  if (modal) closeModal();
  if (dock) return openDock({ title, body, actions, cls, onClose, dismissable, foot });
  const overlay = el('div', 'modal-overlay');
  const card = el('div', 'modal ' + cls);
  if (title) card.appendChild(el('h2', 'modal-title', title));
  const bodyEl = el('div', 'modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  card.appendChild(bodyEl);
  if (actions.length) {
    const bar = el('div', 'modal-actions');
    for (const a of actions) {
      const b = el('button', 'btn ' + (a.cls || ''), a.label);
      if (a.id) b.id = a.id;
      b.addEventListener('click', a.onClick);
      bar.appendChild(b);
    }
    card.appendChild(bar);
  }
  overlay.appendChild(card);
  if (dismissable) overlay.addEventListener('pointerdown', e => { if (e.target === overlay) closeModal(); });
  $('#modal-root').appendChild(overlay);
  modal = { overlay, card, bodyEl, onClose, dismissable, update: null, holdBtn: null, pc: null };
  return modal;
}
function openDock({ title, body, actions, cls, onClose, dismissable, foot }) {
  const card = el('div', 'dock-card ' + cls);
  const head = el('div', 'dock-card-head');
  head.appendChild(el('h2', 'dock-title', title || ''));
  if (dismissable) {
    const x = el('button', 'icon-btn dock-close', '✕');
    x.setAttribute('aria-label', 'Đóng');
    x.addEventListener('click', () => closeModal());
    head.appendChild(x);
  }
  card.appendChild(head);
  const bodyEl = el('div', 'dock-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  card.appendChild(bodyEl);
  const footEl = el('div', 'dock-foot');
  if (foot) footEl.appendChild(foot);
  if (actions.length) {
    const bar = el('div', 'dock-actions');
    for (const a of actions) {
      const b = el('button', 'btn ' + (a.cls || ''), a.label);
      if (a.id) b.id = a.id;
      b.addEventListener('click', a.onClick);
      bar.appendChild(b);
    }
    footEl.appendChild(bar);
  }
  if (footEl.childElementCount) card.appendChild(footEl);
  $('#dock-panel').appendChild(card);
  $('#dock').classList.add('open');
  $('#dock').scrollTop = 0;
  syncSceneCrop();
  modal = { overlay: card, card, bodyEl, onClose, dismissable, update: null, holdBtn: null, pc: null, docked: true };
  return modal;
}
function closeModal() {
  if (!modal) return;
  const m = modal;
  modal = null;
  stopHold();
  m.overlay.remove();
  m.cardDemoCleanup?.();
  if (m.docked) { $('#dock').classList.remove('open'); syncSceneCrop(); }
  if (m.onClose) m.onClose();
}

// Màn dọc (điện thoại): khi quầy mở thì thu cảnh quán lại cho quầy đủ chỗ, không phải cuộn cả trang
const COMPACT_MQ = matchMedia('not all and (min-width: 900px) and (min-aspect-ratio: 4/3)');
function syncSceneCrop() {
  const on = COMPACT_MQ.matches && $('#dock').classList.contains('open');
  $('#screen-play').classList.toggle('dock-open', on);
  PlayScene.crop(on);
}

// ---------- Nút "giữ để đổ đầy" (cơ chế chính) ----------
function bindHold(btn, target, prop, rate, max) {
  const start = e => {
    if (e) e.preventDefault();
    if (btn.disabled) return;
    hold = { btn, target, prop, rate, max };
    btn.classList.add('holding');
    SFX.loop({ cook: 'sizzle', pour: 'pour', v: 'charge' }[prop]);
    if (modal) modal.holdBtn = btn;
  };
  btn.addEventListener('pointerdown', e => {
    start(e);
    try { btn.setPointerCapture(e.pointerId); } catch (_) { /* bỏ qua */ }
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    btn.addEventListener(ev, () => { if (hold && hold.btn === btn) stopHold(); });
  }
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn._startHold = start;
}
function stopHold() {
  if (!hold) return;
  SFX.stopLoop();
  hold.btn.classList.remove('holding');
  hold = null;
}

function buildFill({ vertical = false, max, zone, mark, ticks = [], cls = '' }) {
  const root = el('div', `fill ${vertical ? 'vertical' : ''} ${cls}`);
  const p = v => v / max * 100;
  const side = vertical ? 'bottom' : 'left';
  const size = vertical ? 'height' : 'width';
  const level = el('div', 'fill-level');
  const zoneEl = el('div', 'fill-zone');
  zoneEl.style[side] = p(zone[0]) + '%';
  zoneEl.style[size] = p(zone[1] - zone[0]) + '%';
  root.append(level, zoneEl);
  if (mark != null) {
    const m = el('div', 'fill-mark');
    m.style[side] = p(mark) + '%';
    root.appendChild(m);
  }
  for (const t of ticks) {
    const tk = el('div', 'fill-tick', t.label);
    tk.style[side] = p(t.v) + '%';
    root.appendChild(tk);
  }
  return { root, set: v => { level.style[size] = clamp(p(v), 0, 100) + '%'; } };
}

function judge(v, zone, tol) {
  if (v >= zone[0] && v <= zone[1]) return 'perfect';
  const d = v < zone[0] ? zone[0] - v : v - zone[1];
  return d <= tol ? 'ok' : 'bad';
}
function cookLabel(v, z) {
  if (v <= 0) return 'chưa nấu';
  if (v < z[0] - 8) return 'còn sống';
  if (v < z[0]) return 'hơi sống';
  if (v <= z[1]) return 'chín vừa ✓';
  if (v <= z[1] + 8) return 'hơi nhừ';
  return 'nát bét';
}
function pourLabel(v, z) {
  if (v <= 0) return 'chưa rót';
  if (v < z[0] - 6) return 'ít quá';
  if (v < z[0]) return 'hơi ít';
  if (v <= z[1]) return 'đúng vạch ✓';
  if (v <= z[1] + 6) return 'hơi đầy';
  return 'tràn ly';
}

// ---------- Hiệu ứng ----------
function fx(target, text, cls = '', delay = 0) {
  const show = () => {
    const r = target.getBoundingClientRect();
    if (!r.width) return;
    SFX.cue(cls);   // tiếng chung theo loại chữ bay: money/good/warn/bad
    if (cls === 'money') VFX.coins(target);   // tiền vào: xu bay về ô 💵
    const d = el('div', 'fx ' + cls, text);
    d.style.left = (r.left + r.width / 2) + 'px';
    d.style.top = (r.top + r.height * 0.3) + 'px';
    $('#fx-layer').appendChild(d);
    setTimeout(() => d.remove(), 1500);
  };
  if (delay) setTimeout(show, delay); else show();
}
function fxList(target, notes) {
  notes.forEach((n, i) => fx(target, n[0], n[1], 280 * (i + 1)));
}
function log(msg) {
  const box = $('#log');
  box.prepend(el('div', 'log-line', msg));
  while (box.children.length > 6) box.lastChild.remove();
}

// ---------- Tên quán ----------
function askShopName({ title, initial = '', canCancel = false, onDone }) {
  const body = el('div', 'name-form');
  body.innerHTML = `
    <p class="hint">Tên này sẽ hiện trên bảng hiệu và trên Google Maps. Đổi lại được bất cứ lúc nào.</p>
    <div class="name-row">
      <input class="name-input" maxlength="28" placeholder="Ví dụ: Net Tèo" autocomplete="off">
      <button class="btn ghost name-dice" title="Gợi ý tên ngẫu nhiên" aria-label="Gợi ý tên">🎲</button>
    </div>`;
  const input = body.querySelector('.name-input');
  input.value = initial;
  const submit = () => {
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (!name) { input.focus(); input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
    closeModal();
    onDone(name);
  };
  body.querySelector('.name-dice').addEventListener('click', () => {
    input.value = pick(SHOP_NAME_IDEAS.filter(n => n !== input.value));
    input.focus();
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  const actions = [{ label: 'Treo bảng hiệu ✓', cls: 'primary', onClick: submit }];
  if (canCancel) actions.unshift({ label: 'Thôi', cls: 'ghost', onClick: () => closeModal() });
  openModal({ title, body, actions, cls: 'modal-name', dismissable: canCancel });
  setTimeout(() => { input.focus(); input.select(); }, 30);
}

function renderShopName() {
  const name = S.shopName;
  document.querySelectorAll('.shop-name').forEach(n => setText(n, name));
  document.title = `${name} · Quán Nét Bất Ổn`;
}

// ---------- Sổ sự việc của khách ----------
// c.ev[sự việc] = tổng điểm hài lòng sự việc đó đã cộng/trừ (âm là xấu) — dùng để chọn điều khách nhắc tới.
// c.causes = nguyên nhân viết bằng chữ, hiện khi bấm vào nhận xét trên bảng cuối ngày.
const segOf = c => SEGMENTS[c.seg];
const traitOf = c => TRAITS[c.trait];

// Mức quan tâm = care của tệp khách × hệ số tính cách (tính cách chỉ nhân chiều xấu hoặc tốt tương ứng)
function careOf(c, aspect, sign) {
  if (!aspect) return 1;
  const t = traitOf(c)[sign < 0 ? 'bad' : 'good'];
  return (segOf(c).care[aspect] ?? 1) * (t?.[aspect] ?? 1);
}
function cause(c, text) { if (text) c.causes.push(text); }
// Khách quen lần trước bị chuyện này rồi mà hôm nay lại bị nữa?
const repeatsMemory = (c, t) => !!(c.mem && !c.mem.good && MEM_GROUP[t] === c.mem.key);
function markAgain(c) { if (!c.ev.again) note(c, 'again', -10, 'Lại gặp đúng chuyện như lần trước'); }
// Ghi một sự việc có ảnh hưởng đến độ hài lòng. Trả về số điểm thực tế đã áp.
// Lỗi lặp lại đúng chuyện khách còn nhớ thì khó chịu gấp rưỡi.
function hit(c, t, base, aspect, why) {
  let mul = careOf(c, aspect, base);
  if (base < 0 && repeatsMemory(c, t)) { mul *= 1.5; markAgain(c); }
  if (base < 0) mul *= 1 - cardFx('calm');   // thẻ Bình tĩnh trên kệ
  const d = base * mul;
  c.sat = clamp(c.sat + d, 0, 100);
  c.ev[t] = (c.ev[t] || 0) + d;
  cause(c, why);
  return d;
}
// Ghi một sự việc khách để ý nhưng không đổi độ hài lòng (w chỉ để xếp độ nổi bật)
function note(c, t, w, why) { c.ev[t] = (c.ev[t] || 0) + w; cause(c, why); }

// Mức chờ tính theo sức chịu chờ của từng khách (f = phần kiên nhẫn đã dùng), không quy ra đồng hồ
const waitWord = f => f < 0.25 ? 'Được xếp máy ngay' : f < 0.6 ? 'Chờ máy một lúc'
  : f < 0.85 ? 'Chờ máy khá lâu' : 'Đợi gần hết kiên nhẫn mới có máy';
const foodWord = f => f < 0.3 ? 'Món ra nhanh' : f < 0.6 ? '' : f < 0.85 ? 'Món ra hơi chậm' : 'Món ra rất chậm';

function starsHTML(n) {
  return `<span class="stars" aria-label="${n} sao"><span class="on">${'★'.repeat(n)}</span><span class="off">${'★'.repeat(5 - n)}</span></span>`;
}

// Câu có sẵn cho sự việc: câu riêng của tệp khách → câu theo giọng → câu chung (giọng vui)
function linesFor(c, key) {
  const own = segOf(c).lines?.[key];
  if (own && Math.random() < 0.8) return own;
  return (c.voice !== 'vui' && VOICE_LINES[c.voice][key]) || REVIEW_LINES[key] || own || null;
}
// "again" / "better" nói về ký ức lần trước nên câu lấy từ MEMORY_TEXT
const MEMORY_KEYS = ['again', 'better'];
const hasLines = (c, key) => MEMORY_KEYS.includes(key) ? !!c.mem
  : !!(segOf(c).lines?.[key] || VOICE_LINES.thang[key] || REVIEW_LINES[key]);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Chọn sự việc nổi bật nhất hợp với số sao, đôi khi ghép thêm một ý đối lập đã thực sự xảy ra.
function comment(c, stars, pcNo) {
  const ev = Object.entries(c.ev).filter(([k, d]) => d && hasLines(c, k));
  const bad = ev.filter(e => e[1] < 0).sort((a, b) => a[1] - b[1]);
  const good = ev.filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
  let main, other;
  if (stars <= 2) { main = bad[0]; other = good[0]; }
  else if (stars >= 4) { main = good[0]; other = bad[0]; }
  else if (bad[0] || good[0]) {
    [main, other] = !good[0] || (bad[0] && -bad[0][1] >= good[0][1]) ? [bad[0], good[0]] : [good[0], bad[0]];
  }
  const key = main ? main[0] : stars <= 2 ? 'bad' : stars >= 4 ? 'good' : 'meh';
  const vars = { game: GAMES[c.game].name, pc: pcNo || '', shop: S.shopName };
  const fill = line => line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  if (MEMORY_KEYS.includes(key)) return { key, text: MEMORY_TEXT[c.mem.key][key] };
  const severe = ['sick', 'rage', 'walkout', 'nogame'].includes(key);
  if (!severe && other && Math.abs(other[1]) >= 4 && CLAUSES[key] && CLAUSES[other[0]] && Math.random() < 0.6) {
    const turn = main[1] > 0 ? 'nhưng bù lại' : 'nhưng';
    return { key, text: `${cap(CLAUSES[other[0]])}, ${turn} ${CLAUSES[key]}.` };
  }
  const pool = linesFor(c, key) || REVIEW_LINES[stars <= 2 ? 'bad' : stars >= 4 ? 'good' : 'meh'];
  const recent = S.reviews.slice(0, 6).map(r => r.text);
  const fresh = pool.filter(l => !recent.includes(fill(l)));   // tránh lặp câu vừa viết
  return { key, text: fill(pick(fresh.length ? fresh : pool)) };
}

// Ý định quay lại tách khỏi giọng văn: khách nói nhẹ nhàng vẫn có thể không quay lại
const intentOf = sat => sat >= 75 ? { t: '🔁 Sẽ quay lại', cls: 'good' }
  : sat >= 50 ? { t: '🤔 Còn phân vân', cls: 'warn' } : { t: '🚪 Chắc không quay lại', cls: 'bad' };

// ---------- Khách quen ----------
const regById = id => S.regulars.find(r => r.id === id);
// Thiện cảm càng cao càng hay ghé; bị bỏ bê nhiều thì ghé ít dần rồi chuyển quán
const returnWeight = aff => aff < 30 ? 0.25 : aff < 60 ? 0.7 : 1.3;
const hearts = aff => '♥'.repeat(Math.round(aff / 20)) + '♡'.repeat(5 - Math.round(aff / 20));

// Cập nhật sổ khách quen sau một lượt ghé (khách mới thì mở trang mới).
// Trả về thông tin cho bảng cuối ngày: lần ghé thứ mấy, thiện cảm đổi bao nhiêu, có bỏ quán không.
function remember(c, sat, pcNo) {
  let rec = c.regId && regById(c.regId);
  const isNew = !rec;
  if (!rec) {
    rec = { id: S.nextRegId++, name: c.name, avatar: c.avatar, gender: c.gender, seg: c.seg, trait: c.trait, voice: c.voice,
      tier: c.tier, game: c.game, hours: c.hours, visits: 0, aff: 50, mem: null, favPc: null, seenDay: S.day };
    S.regulars.push(rec);
  }
  if (!rec.look) rec.look = c.look;
  const before = rec.aff;
  rec.aff = clamp(rec.aff + (sat - 60) / 3 + (c.affBonus || 0), 0, 100);   // affBonus: vd. được giấu khi mẹ tới tìm
  rec.visits++;
  rec.lastDay = S.day;
  if (!c.lost) {
    // nhớ chuyện tệ nhất nếu đủ nặng; không thì nhớ là lần trước vui (và có được sửa máy tử tế không)
    const worst = Object.entries(c.ev).filter(([k, d]) => MEM_GROUP[k] && d <= -8).sort((a, b) => a[1] - b[1])[0];
    rec.mem = worst ? { key: MEM_GROUP[worst[0]], good: false, day: S.day }
      : sat >= 70 ? { key: c.ev.fixed ? 'fixed' : 'good', good: true, day: S.day } : null;
    if (pcNo && sat >= 80 && !c.ev.lag && !c.ev.broken && !c.ev.rage) rec.favPc = pcNo - 1;
  }
  let gone = false;
  if (rec.aff < C.REG_LEAVE_AT) {
    gone = true;
    S.regulars.splice(S.regulars.indexOf(rec), 1);
    R.led.gone.push(rec.name);
  } else if (S.regulars.length > C.REG_MAX) {
    // sổ đầy: bỏ bớt người ít gắn bó nhất (không tính người vừa ghé)
    const others = S.regulars.filter(r => r !== rec);
    const drop = others.reduce((a, b) => (a.aff + a.visits * 4 <= b.aff + b.visits * 4 ? a : b));
    S.regulars.splice(S.regulars.indexOf(drop), 1);
  }
  if (isNew) R.led.newFaces++; else R.led.returning++;
  return { id: rec.id, n: rec.visits, delta: rec.aff - before, isNew, gone };
}

// Chọn một khách quen quay lại (hoặc null = khách mới). w = trọng số hạng máy đang có.
function pickRegular(w) {
  const chance = Math.min(C.REG_CHANCE_MAX, 0.12 + 0.035 * S.regulars.length);
  if (Math.random() > chance) return null;
  const cands = S.regulars.filter(r => r.seenDay !== S.day && w[r.tier] > 0 && segWeight(r.seg, r.tier) > 0);
  return cands.length ? weighted(cands, r => segWeight(r.seg, r.tier) * returnWeight(r.aff)) : null;
}
// Biểu tượng tính cách chỉ hiện với khách quen (lần đầu phải nhận ra qua câu chào)
const knownIcon = c => c.regId ? traitOf(c).icon || '' : '';
const avatarHTML = c => c.avatar + (knownIcon(c) ? `<span class="trait-badge" title="${traitOf(c).name}">${knownIcon(c)}</span>` : '');
// ---------- Giới tính: tên, ảnh đại diện và dáng vẻ phải khớp nhau ----------
// Danh sách tên & ảnh theo tệp khách và giới tính ('m' nam, 'f' nữ); tệp không có riêng thì dùng danh sách chung
const namesOf = (s, g) => g === 'f' ? s.namesNu || CUSTOMER_NAMES_NU : s.names || CUSTOMER_NAMES;
const avatarsOf = (s, g) => g === 'f' ? s.avatarsNu || CUSTOMER_AVATARS_NU : s.avatars || CUSTOMER_AVATARS;
// Chọn giới tính theo tỉ lệ khách nữ của tệp (tệp nào không có tên nữ thì luôn là nam)
function pickGender(s) {
  if (s.names && !s.namesNu) return 'm';
  return Math.random() < (s.girlRate ?? 0.45) ? 'f' : 'm';
}
// Đoán giới tính từ tên — dùng cho khách quen trong bản lưu cũ (chưa có giới tính)
function genderOfName(name) {
  if (/^(Chị|Cô|Bà)\s/.test(name)) return 'f';
  if (/^(Anh|Chú|Ông|Cu)\s/.test(name)) return 'm';
  const female = [CUSTOMER_NAMES_NU, ...Object.values(SEGMENTS).map(s => s.namesNu || [])].flat();
  return female.includes(name) ? 'f' : 'm';
}
// Tên chưa ai trong sổ khách quen hay trong quán hôm nay dùng
// (hết tên riêng của tệp thì mượn tên chung cùng giới tính)
function freshName(list, g) {
  const used = new Set([...S.regulars.map(r => r.name), ...R.namesToday]);
  const free = list.filter(n => !used.has(n));
  if (free.length) return pick(free);
  const common = (g === 'f' ? CUSTOMER_NAMES_NU : CUSTOMER_NAMES).filter(n => !used.has(n));
  return common.length ? pick(common) : `${pick(list)} ${R.nextId}`;
}
// Lời chào ở cửa của khách quen: nhắc chuyện lần trước (để chủ quán biết mà tránh), hoặc xin máy quen
function regularGreet(c) {
  const shy = traitOf(c).shy ? 'Dạ… ' : '';
  if (c.mem && !c.mem.good) return shy + MEMORY_TEXT[c.mem.key].remind;
  if (c.favPc != null && c.favPc < R.pcs.length && Math.random() < 0.6) return shy + pick(FAVPC_GREETS)(c.favPc + 1);
  return shy + pick(REGULAR_GREETS);
}

// Khách rời quán: ghi vào sổ cuối ngày và có thể đăng review Google Maps.
function finishVisit(c, pcNo, forcedStars) {
  settleReplyPromise(c, forcedStars);
  const stars = forcedStars || clamp(Math.round(c.sat / 20 + rand(-0.5, 0.5)), 1, 5);
  const { key, text } = comment(c, stars, pcNo);
  const seg = segOf(c), tr = traitOf(c);
  const visit = {
    name: c.name, avatar: c.avatar, seg: c.seg, trait: c.trait, stars, key, text,
    sat: forcedStars ? forcedStars * 20 - 10 : c.sat, ev: c.ev, causes: c.causes, lost: c.lost, posted: 0,
  };
  visit.reg = remember(c, visit.sat, pcNo);
  R.led.visits.push(visit);
  if (Math.random() > C.REVIEW_CHANCE[stars]) return null;
  const rv = {
    id: S.nextReviewId++, regId: visit.reg.id, key, game: c.game,
    name: c.name, avatar: c.avatar, stars, day: S.day, time: clockText(R.time), text,
    who: c.seg === 'vanglai' ? '' : seg.name + (tr.name ? ' · ' + tr.name : ''),
    guide: Math.random() < 0.15 ? Math.round(rand(5, 180)) : 0,   // "Local Guide · N bài đánh giá"
  };
  visit.posted = stars;
  S.reviews.unshift(rv);
  if (S.reviews.length > C.REVIEW_KEEP) S.reviews.length = C.REVIEW_KEEP;
  S.starCounts[stars - 1]++;
  R.led.reviews.push(rv);
  log(`📍 ${c.name} đánh giá ${stars}★ trên Google Maps`);
  return rv;
}

function reviewHTML(rv, options = {}) {
  const sub = rv.guide ? `Local Guide · ${rv.guide} bài đánh giá` : rv.who || '';
  return `<div class="review s${rv.stars}">
    <div class="rv-head"><span class="rv-av">${rv.avatar}</span>
      <div><b>${esc(rv.name)}</b>${sub ? `<div class="rv-guide">${esc(sub)}</div>` : ''}</div></div>
    <div class="rv-meta">${starsHTML(rv.stars)}<span class="muted small">Ngày ${rv.day} · ${rv.time}</span></div>
    <p class="rv-text">${esc(rv.text)}</p>
    ${rv.reply && !options.hideReply ? `<p class="muted small host-reply-text">💬 Chủ quán đã trả lời · ${esc(reviewReplyText(rv))}</p>` : ''}
  </div>`;
}

function openAllReviews() {
  openModal({
    title: `📍 ${esc(S.shopName)} trên Google Maps`,
    body: `<div class="review-list">${S.reviews.map(reviewHTML).join('')}</div>`,
    cls: 'modal-reviews',
    actions: [{ label: 'Đóng', cls: 'primary', onClick: () => closeModal() }],
  });
}

// =====================================================================
//  BUỔI SÁNG: nhập hàng & nâng cấp
// =====================================================================
function allUpgrades() {
  const unlocks = Object.keys(ITEMS).filter(k => ITEMS[k].unlockCost).map(k => ({
    id: 'unlock:' + k, icon: ITEMS[k].icon, name: 'Thêm món: ' + ITEMS[k].name,
    desc: ITEMS[k].desc, cost: ITEMS[k].unlockCost, once: true,
  }));
  return [...UPGRADES, ...unlocks];
}
function upgradeState(u) {
  const owned = u.id.startsWith('unlock:') ? S.unlocked[u.id.slice(7)] : !!S.upgrades[u.id];
  if (owned) return { ok: false, owned: true, label: 'Đã có ✓' };
  if (u.needs && !S.upgrades[u.needs]) return { ok: false, label: 'Cần ' + UPGRADES.find(x => x.id === u.needs).name.toLowerCase() };
  return { ok: S.money >= u.cost, label: money(u.cost) };
}
function buyUpgrade(id) {
  const u = allUpgrades().find(x => x.id === id);
  if (!u || !upgradeState(u).ok) return;
  S.money -= u.cost;
  recordBook('investment', u.cost);
  post('PC', id.startsWith('unlock:') ? `Mua dụng cụ để bán ${ITEMS[id.slice(7)].name}` : `Mua sắm ${u.name}`, [[id === 'shelf' ? '2118' : '2112', '1111', u.cost]]);
  if (id.startsWith('unlock:')) S.unlocked[id.slice(7)] = true;
  else S.upgrades[id] = true;
  SFX.play('levelUp');
  VFX.burst(document.activeElement);   // pháo sao ngay nút vừa bấm mua
  saveGame();
  renderPrep();
}
