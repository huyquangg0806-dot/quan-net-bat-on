/* Quán Nét Bất Ổn — thẻ sưu tầm, kệ trưng bày, bụi thẻ.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Thẻ sưu tầm: kho, thị trường và giao dịch ----------
const cardKeys = () => CARD_SETS.flatMap(s => CARD_PACKS.map(p => s.id + ':' + p.id));
const cardById = id => CARD_CATALOG.find(c => c.id === id);
const cardPackInfo = (key, day = S.day, tick = cardMarketTick()) => {
  const [setId, packId] = String(key).split(':');
  const set = CARD_SETS.find(s => s.id === setId), pack = CARD_PACKS.find(p => p.id === packId);
  if (!set || !pack || key !== set.id + ':' + pack.id) return null;
  const base = C.CARD_PACK_PRICES[packId], factor = cardMarketFactor(set.id, 'pack', day, tick);
  const price = n => Math.round(n * factor / C.CARD_PACK_PRICE_STEP) * C.CARD_PACK_PRICE_STEP;
  return { set, pack, ...base, baseBuy: base.buy, baseSell: base.sell, buy: price(base.buy), sell: price(base.sell) };
};
const cardCount = lots => (lots || []).reduce((n, lot) => n + lot.qty, 0);
const cardHash = text => [...String(text)].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261) / 4294967296;
const cardNews = (day = S.day) => CARD_MARKET_NEWS[(day - 1) % CARD_MARKET_NEWS.length];
const cardRoundPrice = price => Math.max(C.CARD_PRICE_STEP, Math.round(price / C.CARD_PRICE_STEP) * C.CARD_PRICE_STEP);
const cardMarketTick = () => Math.floor(Date.now() / C.CARD_MARKET_INTERVAL_MS);
function cardMarketFactor(setId, key, day = S.day, tick = cardMarketTick(), rarity = null, fx = null) {
  const news = cardNews(day);
  const applies = (!news.set || news.set === setId) && (!news.rarities || news.rarities.includes(rarity))
    && (!news.fx || [].concat(news.fx).includes(fx));
  // Hai sóng nhỏ giữ giá thay đổi từ từ; cùng nhịp/cùng bản lưu không quay giá lại.
  const phase = cardHash(setId + ':' + key) * Math.PI * 2;
  const variation = 1 + C.CARD_MARKET_VARIANCE * (Math.sin(tick / C.CARD_MARKET_SLOW_TICKS + phase) * C.CARD_MARKET_SLOW_WEIGHT
    + Math.sin(tick / C.CARD_MARKET_FAST_TICKS + phase) * (1 - C.CARD_MARKET_SLOW_WEIGHT));
  return clamp(variation * (applies ? news.factor : 1), C.CARD_MARKET_MIN, C.CARD_MARKET_MAX);
}
function cardPrice(id, day = S.day, tick = cardMarketTick()) {
  const card = cardById(id);
  if (!card) return 0;
  return cardRoundPrice(C.CARD_BASE_PRICES[id] * cardMarketFactor(card.set, id, day, tick, card.rarity, card.fx));
}
function normalizeCards() {
  const raw = S.cards && typeof S.cards === 'object' ? S.cards : {};
  const integer = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
  const lots = arr => (Array.isArray(arr) ? arr : []).filter(l => l && Number.isSafeInteger(l.qty) && l.qty > 0 && Number.isSafeInteger(l.cost) && l.cost >= 0)
    .map(l => ({ qty: Math.min(l.qty, C.CARD_COUNT_MAX), cost: l.cost }));
  S.cards = { enabled: raw.enabled === true, packs: {}, owned: {}, nextOpen: Math.max(1, integer(raw.nextOpen)), opening: null, daily: null };
  // số mốc sưu tầm đã nhận của từng bộ
  S.cards.milestones = Object.fromEntries(CARD_SETS.map(s => [s.id, Math.min(integer(raw.milestones?.[s.id]), C.CARD_MILESTONES.length)]));
  for (const key of cardKeys()) S.cards.packs[key] = lots(raw.packs?.[key]);
  for (const card of CARD_CATALOG) S.cards.owned[card.id] = lots(raw.owned?.[card.id]);
  // Sau khi có kho thẻ: kệ trưng bày (mã thẻ hoặc null mỗi ô) và bụi thẻ. Bản cũ: kệ trống, bụi 0.
  S.cards.dust = integer(raw.dust);
  S.cards.shelf = Array.from({ length: shelfSlots() }, (_, i) => {
    const id = Array.isArray(raw.shelf) ? raw.shelf[i] : null;
    return cardById(id) && cardCount(S.cards.owned[id]) && raw.shelf.indexOf(id) === i ? id : null;
  });
  S.cards.enabled ||= cardKeys().some(k => cardCount(S.cards.packs[k])) || CARD_CATALOG.some(c => cardCount(S.cards.owned[c.id]));
  const pending = raw.opening;
  if (pending && Number.isSafeInteger(pending.id) && pending.id > 0 && cardPackInfo(pending.key)
    && Array.isArray(pending.ids) && [C.CARD_PACK_SIZE, C.CARD_LEGACY_PACK_SIZE].includes(pending.ids.length)
    && pending.ids.every(id => cardById(id)?.set === cardPackInfo(pending.key).set.id)) {
    S.cards.opening = { id: pending.id, key: pending.key, ids: pending.ids.slice() };
    // gói mở từ bản cũ chưa có hai trường này: chỉ không hiện nhãn MỚI và lời/lỗ
    if (Array.isArray(pending.fresh) && pending.fresh.length === pending.ids.length) S.cards.opening.fresh = pending.fresh.map(x => x === true);
    if (Number.isSafeInteger(pending.cost) && pending.cost >= 0) S.cards.opening.cost = pending.cost;
    S.cards.nextOpen = Math.max(S.cards.nextOpen, pending.id + 1);
  }
  const old = raw.daily?.day === S.day ? raw.daily : {};
  const daily = S.cards.daily = { day: S.day, spent: integer(old.spent), imported: integer(old.imported), opened: integer(old.opened),
    packSales: integer(old.packSales), cardSales: integer(old.cardSales), income: integer(old.income), cost: integer(old.cost), offers: [] };
  const ids = new Set();
  for (const offer of Array.isArray(old.offers) ? old.offers : []) {
    if (!offer || typeof offer.id !== 'string' || ids.has(offer.id) || !Number.isSafeInteger(offer.price) || offer.price <= 0
      || !['waiting', 'sold', 'declined', 'gone'].includes(offer.status) || !['pack', 'card'].includes(offer.kind)
      || (offer.kind === 'pack' ? !cardPackInfo(offer.key) : !cardById(offer.cardId)) || typeof offer.name !== 'string') continue;
    ids.add(offer.id);
    daily.offers.push({ id: offer.id, kind: offer.kind, key: offer.key, cardId: offer.cardId, price: offer.price,
      name: offer.name.slice(0, 80), gender: offer.gender === 'f' ? 'f' : 'm', status: offer.status, look: offer.look });
    if (daily.offers.length >= C.CARD_DAILY_BUYERS) break;
  }
}
// ---------- Kệ trưng bày, tác dụng và bụi thẻ ----------
const shelfSlots = () => C.CARD_SHELF_SLOTS + (S.upgrades.shelf ? C.CARD_SHELF_EXTRA : 0);
// Bản còn bán/phân rã được: lá đang trên kệ giữ lại một bản
const cardFree = id => Math.max(0, cardCount(S.cards.owned[id]) - (S.cards.shelf.includes(id) ? 1 : 0));
const fxPower = card => C.CARD_FX_POWER[card.rarity];
// Tổng tác dụng một loại từ các lá trên kệ (0–CARD_FX_CAP%), dạng tỉ lệ 0–1
function cardFx(type) {
  if (!S?.cards?.shelf) return 0;
  const total = S.cards.shelf.reduce((n, id) => { const c = id && cardById(id); return c && c.fx === type ? n + fxPower(c) : n; }, 0);
  return Math.min(total, C.CARD_FX_CAP) / 100;
}
const cardFxText = card => CARD_FX[card.fx].text.replace('{v}', fxPower(card));
// Đặt (id) hoặc gỡ (null) thẻ ở một ô kệ, chỉ buổi sáng
function setShelf(slot, id) {
  normalizeCards();
  if (hostPlaying() || !Number.isInteger(slot) || slot < 0 || slot >= S.cards.shelf.length) return false;
  if (id !== null && (!cardById(id) || !cardCount(S.cards.owned[id]) || S.cards.shelf.some((x, i) => x === id && i !== slot))) return false;
  return cardTransaction(() => { S.cards.shelf[slot] = id; });
}
const cardCraftCost = card => C.CARD_DUST[card.rarity] * C.CARD_CRAFT_MUL;
// Phân rã một bản rảnh ra bụi; giá vốn bản đó ghi vào chi phí. Trả về số bụi nhận (0 nếu không được).
function disenchantCard(id) {
  normalizeCards();
  const card = cardById(id);
  if (hostPlaying() || !card || !cardFree(id)) return 0;
  const ok = cardTransaction(() => {
    recordBook('materials', takeCardLot(S.cards.owned[id]));
    S.cards.dust += C.CARD_DUST[card.rarity];
  });
  return ok ? C.CARD_DUST[card.rarity] : 0;
}
// Dùng bụi chế một bản lá bất kỳ (thường để lấp ô còn thiếu); bản chế có giá vốn 0
function craftCard(id) {
  normalizeCards();
  const card = cardById(id);
  if (hostPlaying() || !card || S.cards.dust < cardCraftCost(card)) return false;
  return cardTransaction(() => {
    S.cards.dust -= cardCraftCost(card);
    S.cards.owned[id].push({ qty: 1, cost: 0 });
    S.cards.enabled = true;
  });
}
function cardRarity(packId, roll) {
  if (!C.CARD_PACK_PRICES[packId] || !Number.isFinite(roll) || roll < 0 || roll >= 1) return null;
  const mythic = 1 - Math.pow(1 - C.CARD_MYTHIC_PERCENT / 100, 1 / C.CARD_PACK_SIZE);
  if (roll < mythic) return 'mythic';
  const weights = C.CARD_PACK_PRICES[packId].rates;
  let percent = (roll - mythic) / (1 - mythic) * weights.reduce((n, v) => n + v, 0);
  for (let i = 0; i < C.CARD_PACK_PRICES[packId].rates.length; i++) {
    percent -= C.CARD_PACK_PRICES[packId].rates[i];
    if (percent < 0) return CARD_RARITIES[i].id;
  }
  return 'legend';
}
function drawCardPack(key, random = Math.random) {
  const info = cardPackInfo(key);
  if (!info) return [];
  return Array.from({ length: C.CARD_PACK_SIZE }, () => {
    const rarity = cardRarity(info.pack.id, random());
    const pool = CARD_CATALOG.filter(c => c.set === info.set.id && c.rarity === rarity);
    return pool[Math.floor(random() * pool.length)].id;
  });
}
let cardWriting = false;
function cardTransaction(change) {
  if (cardWriting || CloudSave.state().blocked || CloudSave.state().busy) return false;
  const before = JSON.stringify(S);
  cardWriting = true;
  try { change(); CloudSave.save(S); return true; }
  catch (e) { S = JSON.parse(before); saveFailed(e); return false; }
  finally { cardWriting = false; }
}
function syncCardLedger() {
  if (!hostPlaying()) return;
  const daily = S.cards.daily;
  R.led.cardIncome = daily.income; R.led.cardCost = daily.cost;
  R.led.cardPackSales = daily.packSales; R.led.cardSales = daily.cardSales;
  R.led.cardSpent = daily.spent; R.led.cardOpened = daily.opened;
}
function buyCardPacks(key, qty, quote = null) {
  normalizeCards();
  const info = cardPackInfo(key), total = cardKeys().reduce((n, k) => n + cardCount(S.cards.packs[k]), 0);
  if (hostPlaying() || !info || !Number.isSafeInteger(qty) || qty < 1 || total + qty > C.CARD_STOCK_MAX || S.money < info.buy * qty) return false;
  if (quote && (quote.tick !== cardMarketTick() || quote.buy !== info.buy)) return false;
  return cardTransaction(() => {
    S.money -= info.buy * qty; S.cards.enabled = true;
    S.cards.packs[key].push({ qty, cost: info.buy });
    S.cards.daily.spent += info.buy * qty; S.cards.daily.imported += qty;
  });
}
function takeCardLot(lots) {
  const cost = lots[0].cost;
  if (--lots[0].qty === 0) lots.shift();
  return cost;
}
function openCardPack(key, previousId = null) {
  normalizeCards();
  if (hostPlaying()) return false;
  if (S.cards.opening && S.cards.opening.id !== previousId) return S.cards.opening;
  if (!cardPackInfo(key) || !cardCount(S.cards.packs[key])) return false;
  let result;
  const ok = cardTransaction(() => {
    const cost = takeCardLot(S.cards.packs[key]), ids = drawCardPack(key);
    if (ids.length !== C.CARD_PACK_SIZE) throw new Error(CARD_SHOP_COPY.failed);
    // Xếp hiếm dần để lá hiếm nhất luôn lật cuối; chỉ đổi thứ tự hiện, không bốc lại.
    const rank = id => CARD_RARITIES.findIndex(r => r.id === cardById(id).rarity);
    ids.sort((a, b) => rank(a) - rank(b));
    const fresh = ids.map((id, i) => !cardCount(S.cards.owned[id]) && ids.indexOf(id) === i);
    // Chia hết giá vốn của gói cho các bản thẻ; bản trùng vẫn là hai món hàng.
    ids.forEach((id, i) => S.cards.owned[id].push({ qty: 1, cost: i === ids.length - 1 ? cost - Math.floor(cost / ids.length) * (ids.length - 1) : Math.floor(cost / ids.length) }));
    result = S.cards.opening = { id: S.cards.nextOpen++, key, ids, fresh, cost };
    S.cards.daily.opened++;
  });
  return ok ? result : false;
}
function finishCardOpening(id) {
  if (!S.cards.opening || S.cards.opening.id !== id || hostPlaying()) return false;
  return cardTransaction(() => { S.cards.opening = null; });
}
function cardShopView() {
  normalizeCards();
  const tick = cardMarketTick();
  return { money: S.money, canManage: !hostPlaying() && !CloudSave.state().blocked && !CloudSave.state().busy,
    tick, nextIn: Math.ceil((C.CARD_MARKET_INTERVAL_MS - Date.now() % C.CARD_MARKET_INTERVAL_MS) / 1000),
    packPrices: Object.fromEntries(cardKeys().map(k => { const info = cardPackInfo(k, S.day, tick); return [k, { buy: info.buy, sell: info.sell }]; })),
    playing: hostPlaying(), stock: Object.fromEntries(cardKeys().map(k => [k, cardCount(S.cards.packs[k])])),
    owned: Object.fromEntries(CARD_CATALOG.map(c => [c.id, cardCount(S.cards.owned[c.id])])),
    costs: Object.fromEntries(CARD_CATALOG.map(c => [c.id, S.cards.owned[c.id][0]?.cost || 0])),
    prices: Object.fromEntries(CARD_CATALOG.map(c => [c.id, cardPrice(c.id, S.day, tick)])),
    previous: Object.fromEntries(CARD_CATALOG.map(c => [c.id, cardPrice(c.id, S.day, tick - 1)])),
    shelf: S.cards.shelf.slice(), dust: S.cards.dust, fx: Object.fromEntries(Object.keys(CARD_FX).map(k => [k, Math.round(cardFx(k) * 100)])),
    opening: S.cards.opening, offers: S.cards.daily.offers.filter(o => o.status === 'waiting' && R?.queue.some(c => c.cardBuyer === o.id)) };
}
function cardMarketHTML() {
  const T = CARD_SHOP_COPY, news = cardNews(), tick = cardMarketTick();
  const featured = CARD_CATALOG.filter(c => (!news.set || news.set === c.set) && (!news.rarities || news.rarities.includes(c.rarity)))
    .filter(c => c.rarity !== 'basic').slice(-C.CARD_PACK_SIZE);
  return `<h3>🎴 ${esc(news.title)}</h3><p>${esc(news.text)}</p><p class="hint">${T.marketHint} ${T.future}</p>`
    + CARD_SETS.map(s => `<p><b>${esc(s.name)}</b> · ${CARD_PACKS.map(p => { const info = cardPackInfo(s.id + ':' + p.id, S.day, tick); return esc(p.name) + ': ' + money(info.buy) + ' / ' + money(info.sell); }).join(' · ')} (${T.importPrice} / ${T.retail})</p>`).join('')
    + featured.map(c => `<p><b>${esc(c.name)}</b> · ${T.base}: ${money(C.CARD_BASE_PRICES[c.id])} · ${T.market}: <b>${money(cardPrice(c.id, S.day, tick))}</b> · ${T.previous}: ${money(cardPrice(c.id, S.day, tick - 1))}</p>`).join('');
}
function cardOfferItem(o) {
  if (!o) return '';
  const info = o.kind === 'pack' && cardPackInfo(o.key);
  return info ? `${info.pack.name} · ${info.set.name}` : cardById(o.cardId)?.name || '';
}
function cardBuyerCustomer(offer) {
  return { id: R.nextId++, cardBuyer: offer.id, name: offer.name, gender: offer.gender, avatar: '🎴',
    seg: 'vanglai', trait: 'thuong', voice: 'vui', tier: 1, hours: 0, game: 'lmhb', lost: false, overnight: false,
    asked: true, atCounter: false, regId: 0, ev: {}, causes: [], sat: 100,
    patience: C.CARD_BUYER_PATIENCE, patienceMax: C.CARD_BUYER_PATIENCE,
    look: offer.look && typeof offer.look === 'object' ? offer.look : ART.makeLook('vanglai', offer.gender),
    line: offer.kind === 'pack' ? CARD_SHOP_COPY.requestPack(cardPackInfo(offer.key).pack.name, cardPackInfo(offer.key).set.name, money(offer.price))
      : CARD_SHOP_COPY.requestCard(cardById(offer.cardId).name, money(offer.price)) };
}
function spawnCardBuyer() {
  if (!hostPlaying() || !S.cards.enabled || R.closing || R.shutter || R.queue.length >= C.QUEUE_MAX || !powered()) return false;
  const offers = S.cards.daily.offers;
  let offer = offers.find(o => o.status === 'waiting' && !R.queue.some(c => c.cardBuyer === o.id));
  if (!offer) {
    if (offers.length >= C.CARD_DAILY_BUYERS) return false;
    const available = cardKeys().filter(k => cardCount(S.cards.packs[k]));
    const owned = CARD_CATALOG.filter(c => c.rarity !== 'basic' && cardFree(c.id));
    if (!available.length && !owned.length) return false;
    const index = offers.length, visitor = CARD_VISITORS[index % CARD_VISITORS.length];
    const seed = S.day + ':' + index, kind = index % 2 === 0 ? 'pack' : 'card';
    offer = { ...visitor, id: seed, kind, status: 'waiting', look: ART.makeLook('vanglai', visitor.gender) };
    if (kind === 'pack') {
      const pool = available.length ? available : cardKeys();
      offer.key = pool[Math.floor(cardHash(seed) * pool.length)]; offer.price = cardPackInfo(offer.key).sell;
    } else {
      const wanted = [].concat(cardNews().fx || []), hot = owned.filter(c => wanted.includes(c.fx));
      const pool = hot.length && cardHash(seed + ':fx') < C.CARD_FX_DEMAND ? hot : owned.length ? owned : CARD_CATALOG.filter(c => c.rarity !== 'basic');
      offer.cardId = pool[Math.floor(cardHash(seed) * pool.length)].id;
      offer.price = cardRoundPrice(cardPrice(offer.cardId) * (C.CARD_OFFER_MIN + cardHash(seed + ':gia') * (C.CARD_OFFER_MAX - C.CARD_OFFER_MIN)));
    }
    offers.push(offer);
  }
  const c = cardBuyerCustomer(offer);
  R.queue.push(c); renderQueue(); SFX.play('door'); log(CARD_SHOP_COPY.arrival(c.name));
  return c;
}
function cardBuyerLeaves(c) {
  const offer = S.cards.daily.offers.find(o => o.id === c.cardBuyer);
  if (offer?.status === 'waiting') offer.status = 'gone';
  const index = R.queue.indexOf(c);
  if (index >= 0) R.queue.splice(index, 1);
  log(CARD_SHOP_COPY.leaves(c.name)); renderQueue();
}
function sellToCardBuyer(c) {
  const offer = S.cards.daily.offers.find(o => o.id === c?.cardBuyer);
  if (!hostPlaying() || !R.queue.includes(c) || offer?.status !== 'waiting') return false;
  const lots = offer.kind === 'pack' ? S.cards.packs[offer.key] : S.cards.owned[offer.cardId];
  if (offer.kind === 'pack' ? !cardCount(lots) : !cardFree(offer.cardId)) return false;
  const ok = cardTransaction(() => {
    const cost = takeCardLot(lots);
    S.money += offer.price; recordBook('revenue', offer.price); recordBook('materials', cost);
    const daily = S.cards.daily;
    daily.income += offer.price; daily.cost += cost;
    daily[offer.kind === 'pack' ? 'packSales' : 'cardSales']++;
    offer.status = 'sold';
  });
  if (!ok) return false;
  syncCardLedger(); R.queue.splice(R.queue.indexOf(c), 1); renderQueue();
  SFX.play('coin'); log(CARD_SHOP_COPY.sale(c.name, cardOfferItem(offer), money(offer.price)));
  return true;
}
function declineCardBuyer(c) {
  const offer = S.cards.daily.offers.find(o => o.id === c?.cardBuyer);
  if (!hostPlaying() || !R.queue.includes(c) || offer?.status !== 'waiting') return false;
  if (!cardTransaction(() => { offer.status = 'declined'; })) return false;
  R.queue.splice(R.queue.indexOf(c), 1); renderQueue(); return true;
}
function openCardBuyer(c) {
  if (!hostPlaying() || !R.queue.includes(c)) return;
  closeModal();
  const T = CARD_SHOP_COPY, o = S.cards.daily.offers.find(x => x.id === c.cardBuyer);
  if (o?.status !== 'waiting') return;
  const paused = R.paused; setPause(true); c.atCounter = true;
  const card = o.kind === 'card' && cardById(o.cardId), info = o.kind === 'pack' && cardPackInfo(o.key);
  const count = cardCount(card ? S.cards.owned[card.id] : S.cards.packs[o.key]);
  const cost = (card ? S.cards.owned[card.id] : S.cards.packs[o.key])[0]?.cost || 0;
  const reference = card ? cardPrice(card.id) : info.sell;
  const m = openModal({ title: '🎴 ' + T.buyTitle,
    body: `<div class="talk">${faceSVG(c)}<div class="speech"><small>${esc(c.name)}</small>${esc(c.line)}</div></div>`
      + (card ? `<div class="tcg-buyer-card">${window.CardAlbum.faceHTML(card)}</div>` : `<h3>${esc(cardOfferItem(o))}</h3>`)
      + `<div class="tcg-quote"><p>${T.offer}: <b>${money(o.price, true)}</b></p><p>${T.comparison}: <span data-buyer-comparison>${Math.round((o.price / reference - 1) * 100)}%</span> · ${T.market}: <span data-buyer-market>${money(reference)}</span></p>`
      + `<p>${T.stock}: ${count} ${card ? T.copies : T.packs} · ${T.cost}: ${money(cost)}</p>${!count ? `<p class="bad">${T.missing}</p>` : ''}</div>`,
    actions: [{ label: T.decline, cls: 'ghost', onClick: () => { if (declineCardBuyer(c)) closeModal(); } },
      { label: T.sell, cls: 'primary', onClick: () => { if (sellToCardBuyer(c)) closeModal(); } }],
    onClose: () => { c.atCounter = false; if (hostPlaying() && !paused) setPause(false); } });
  m.card.classList.add('tcg-buyer-modal');
  m.card.querySelector('.modal-actions .primary').disabled = !count || CloudSave.state().blocked || CloudSave.state().busy;
  const timer = setInterval(() => {
    const price = card ? cardPrice(card.id) : cardPackInfo(o.key).sell;
    m.card.querySelector('[data-buyer-market]').textContent = money(price);
    m.card.querySelector('[data-buyer-comparison]').textContent = Math.round((o.price / price - 1) * 100) + '%';
  }, C.CARD_MARKET_UI_MS);
  m.cardDemoCleanup = () => clearInterval(timer);
}
