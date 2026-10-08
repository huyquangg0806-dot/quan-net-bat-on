/* Album và hiệu ứng mở gói. Giao dịch do game xử lý, tranh không đổi luật chơi. */
(() => {
  'use strict';
  const C = CONFIG, T = CARD_COPY;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = id => CARD_CATALOG.find(c => c.id === id);
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  function collectionCards({ setId, rarityId = 'all', search = '', owned = null }) {
    const query = norm(search);
    return CARD_CATALOG.filter(c => c.set === setId && (rarityId === 'all' || c.rarity === rarityId)
      && (!owned || owned[c.id] > 0) && norm(c.name + ' ' + c.id).includes(query));
  }
  function pictureHTML(card) {
    return `<span class="tcg-picture" role="img" aria-label="${esc(card.name)}"><span class="tcg-art-fallback" aria-hidden="true">${window.CardArt.svg(card)}</span></span>`;
  }
  const fxText = card => CARD_FX[card.fx].text.replace('{v}', C.CARD_FX_POWER[card.rarity]);
  const fxHTML = card => `<span class="tcg-fx" title="${esc(CARD_FX[card.fx].name)}">${CARD_FX[card.fx].icon} ${esc(fxText(card))}</span>`;
  function faceHTML(card, { showBase = false, money = n => n.toLocaleString('vi-VN') + 'đ' } = {}) {
    card = byId(card?.id);
    if (!card) return '';
    const rarity = CARD_RARITIES.find(r => r.id === card.rarity), set = CARD_SETS.find(s => s.id === card.set);
    return `<span class="tcg-face tcg-${rarity.id}${showBase ? ' tcg-with-base' : ''}"><span class="tcg-card-top"><span class="tcg-rarity">${rarity.name}</span><span class="tcg-stamp">${set.stamp}</span></span>
      ${pictureHTML(card)}<span class="tcg-name">${esc(card.name)}</span>${fxHTML(card)}<span class="tcg-code">${card.id}</span>${showBase ? `<span class="tcg-base-price">${CARD_SHOP_COPY.base}: <b>${esc(money(C.CARD_BASE_PRICES[card.id]))}</b></span>` : ''}</span>`;
  }
  // Thứ tự mẫu giúp xem đủ độ hiếm; không phải xác suất của gacha thật.
  function demoPack(setId, round = 0) {
    if (!CARD_SETS.some(s => s.id === setId)) return [];
    const ascending = cards => cards.sort((a, b) => CARD_RARITIES.findIndex(r => r.id === a.rarity) - CARD_RARITIES.findIndex(r => r.id === b.rarity));
    if (setId === 'huyen-bi' && round === 0) return ascending(CARD_PAINTED_SAMPLE.map(byId));
    return ascending(Array.from({ length: C.CARD_DEMO_PACK_SIZE }, (_, i) => {
      const rarity = CARD_RARITIES[(round * C.CARD_DEMO_PACK_SIZE + i) % CARD_RARITIES.length];
      const pool = CARD_CATALOG.filter(c => c.set === setId && c.rarity === rarity.id);
      return pool[(round + i) % pool.length];
    }));
  }
  function createDemo({ cards, onChange = () => {}, schedule = setTimeout, cancel = clearTimeout, reduced = () => false }) {
    let phase = 'sealed', flipping = -1, timer = null, closed = false, generation = 0, spotlight = -1;
    const revealed = new Set(), pack = cards.slice();
    const rank = c => CARD_RARITIES.findIndex(r => r.id === c.rarity);
    const best = () => pack.reduce((b, c, i) => rank(c) > rank(pack[b]) ? i : b, 0);
    const snapshot = () => ({ phase, flipping, spotlight, revealed: [...revealed], cards: pack.slice() });
    const notify = () => { if (!closed) onChange(snapshot()); };
    const later = (ms, fn) => {
      if (closed) return;
      if (reduced()) { fn(); return; }
      const token = ++generation;
      timer = schedule(() => { if (closed || token !== generation) return; timer = null; fn(); }, ms);
    };
    return {
      snapshot,
      tear() {
        if (closed || phase !== 'sealed') return false;
        phase = 'tearing'; notify();
        later(C.CARD_TEAR_MS, () => { phase = 'ready'; notify(); });
        return true;
      },
      flip(index) {
        if (closed || phase !== 'ready' || !Number.isInteger(index) || index < 0 || index >= pack.length || revealed.has(index)) return false;
        phase = 'flipping'; flipping = index; notify();
        // Epic trở lên rung nạp sáng trước khi lật
        later(C.CARD_FLIP_MS + (rank(pack[index]) >= C.CARD_CHARGE_FROM ? C.CARD_CHARGE_MS : 0), () => {
          revealed.add(index); flipping = -1; phase = revealed.size === pack.length ? 'complete' : 'ready';
          if (rank(pack[index]) >= C.CARD_SPOTLIGHT_FROM) spotlight = index;
          notify();
        });
        return true;
      },
      revealAll(quick = false) {
        if (closed || phase === 'complete' || (!quick && phase === 'revealing')) return false;
        if (timer !== null) cancel(timer);
        generation++; timer = null; flipping = -1;
        const finish = () => {
          pack.forEach((_, i) => revealed.add(i)); phase = 'complete';
          spotlight = !quick && rank(pack[best()]) >= C.CARD_SPOTLIGHT_FROM ? best() : -1;
          notify();
        };
        if (quick) finish();
        else { phase = 'revealing'; notify(); later(C.CARD_FLIP_MS + Math.max(0, pack.length - 1) * C.CARD_REVEAL_STAGGER_MS, finish); }
        return true;
      },
      // Đóng màn hào quang của lá Legend/Mythic
      dismiss() {
        if (closed || spotlight < 0) return false;
        spotlight = -1; notify();
        return true;
      },
      close() { closed = true; generation++; if (timer !== null) cancel(timer); timer = null; },
    };
  }
  function mount(root, trade = null) {
    root.style.setProperty('--card-tear-ms', C.CARD_TEAR_MS + 'ms');
    root.style.setProperty('--card-flip-ms', C.CARD_FLIP_MS + 'ms');
    let setId = CARD_SETS[0].id, rarityId = 'all', search = '', round = 0, demo = null, stage = 'album', selected = null;
    let disposed = false, drag = null, suppressStripClick = false, keyboardFocus = false;
    let realOpen = null, message = '', shopPane = 'owned', ownedOnly = true;
    const P = CARD_SHOP_COPY;
    const cardMoney = n => trade ? trade.money(n, true) : n.toLocaleString('vi-VN') + 'đ';
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const set = () => CARD_SETS.find(s => s.id === setId);
    const filters = () => `<div class="tcg-sets">${CARD_SETS.map(s => `<button class="btn small ${s.id === setId ? 'primary' : 'ghost'}" data-card-set="${s.id}" aria-pressed="${s.id === setId}">${s.name}</button>`).join('')}</div>`;
    const priceInfo = (c, stock) => `<span class="tcg-owned">${P.ownedCount}: <b>${stock.owned[c.id]}</b> ${P.copies} · ${P.market}: <b data-card-price="${c.id}">${trade.money(stock.prices[c.id])}</b></span>`;
    const marketClock = stock => `<p class="tcg-market-clock" data-market-clock role="timer">${P.updateIn(stock.nextIn)}</p>`;
    function oddsHTML(pack) {
      const mythic = 1 - Math.pow(1 - C.CARD_MYTHIC_PERCENT / 100, 1 / C.CARD_PACK_SIZE);
      const sum = pack.rates.reduce((n, v) => n + v, 0);
      return CARD_RARITIES.map((r, i) => r.name + ' ' + (100 * (i === CARD_RARITIES.length - 1 ? mythic : (1 - mythic) * pack.rates[i] / sum)).toFixed(2) + '%').join(' · ');
    }
    function shopHTML(stock) {
      const disabled = stock.canManage ? '' : 'disabled';
      return `<div class="tcg-shop"><h3>🎴 ${P.inventory} · 💵 ${trade.money(stock.money)}</h3>
        <p class="hint">${P.packRule}</p>${marketClock(stock)}${stock.playing ? `<p class="tcg-demo-note">${P.morning}</p>` : ''}
        ${stock.opening ? `<button class="btn primary" data-card-resume ${disabled}>${P.pending}</button>` : ''}
        ${CARD_PACKS.map(pack => {
          const key = setId + ':' + pack.id, config = stock.packPrices[key], count = stock.stock[key];
          return `<article class="tcg-stock-row"><div><b>${pack.name}</b><p class="hint">${pack.desc}</p><p>${P.importPrice}: <b data-pack-import="${key}">${trade.money(config.buy)}</b> · ${P.retail}: <b data-pack-retail="${key}">${trade.money(config.sell)}</b></p>
            <p>${P.stock}: <b>${count} ${P.packs}</b></p><details><summary>${P.odds}</summary><p>${oddsHTML(C.CARD_PACK_PRICES[pack.id])}</p><p>${P.perPack}</p></details></div>
            <div class="tcg-stock-actions">${[1, C.CARD_BUY_BATCH].map(qty => `<button class="btn small" data-card-buy="${key}" data-card-qty="${qty}" data-card-buy-price="${config.buy}" data-card-quote-tick="${stock.tick}" ${disabled} ${stock.money < config.buy * qty ? 'disabled' : ''}>${P.buy} ${qty} · ${trade.money(config.buy * qty)}</button>`).join('')}
              <button class="btn small" data-card-open="${key}" ${disabled} ${!count || stock.opening ? 'disabled' : ''}>${T.tear}</button>
              <button class="btn small primary" data-card-open="${key}" data-card-quick ${disabled} ${!count || stock.opening ? 'disabled' : ''}>${T.quick}</button></div></article>`;
        }).join('')}
        <details class="tcg-market-notes"><summary>${P.waiting} · ${stock.offers.length}</summary>${stock.offers.length ? stock.offers.map(o => `<p><b>${esc(o.name)}</b> · ${o.kind === 'card' ? esc(byId(o.cardId).name) : CARD_PACKS.find(p => p.id === o.key.split(':')[1]).name} · ${P.offer} ${trade.money(o.price)} <button class="btn small" data-card-meet="${o.id}">${P.meet}</button></p>`).join('') : `<p>${P.noBuyers}</p>`}</details></div>`;
    }
    function shelfHTML(stock) {
      const off = stock.canManage ? '' : 'disabled', full = !stock.shelf.includes(null);
      const slots = stock.shelf.map((id, i) => {
        const c = id && byId(id);
        return c ? `<div class="tcg-shelf-slot">${faceHTML(c)}<button class="btn small ghost" data-shelf-slot="${i}" data-shelf-card="" ${off}>${P.shelfRemove}</button></div>`
          : `<div class="tcg-shelf-slot is-empty"><span>${P.shelfEmpty}</span></div>`;
      }).join('');
      const active = Object.entries(stock.fx).filter(([, v]) => v);
      const owned = CARD_CATALOG.filter(c => stock.owned[c.id] > 0 && !stock.shelf.includes(c.id))
        .sort((a, b) => CARD_RARITIES.findIndex(r => r.id === b.rarity) - CARD_RARITIES.findIndex(r => r.id === a.rarity));
      return `<div class="tcg-shelf"><h3>🗄️ ${P.shelf} · ${stock.shelf.filter(Boolean).length}/${stock.shelf.length}</h3><p class="hint">${P.shelfHint}</p>
        ${stock.playing ? `<p class="tcg-demo-note">${P.morning}</p>` : ''}
        <div class="tcg-shelf-row">${slots}</div>
        <p class="tcg-shelf-total"><b>${P.shelfTotal}:</b> ${active.length ? active.map(([k, v]) => `${CARD_FX[k].icon} ${CARD_FX[k].name} +${v}%`).join(' · ') : P.shelfNone} <span class="hint">(${P.shelfCap(C.CARD_FX_CAP)})</span></p>
        ${stock.shelf.length < C.CARD_SHELF_SLOTS + C.CARD_SHELF_EXTRA ? `<p class="hint">${P.shelfMore}</p>` : ''}
        <h4>${P.shelfPick}</h4><div class="tcg-grid">${owned.length ? owned.map(c => `<div class="tcg-shelf-pick">${faceHTML(c)}<button class="btn small primary" data-shelf-put="${c.id}" ${off} ${full ? 'disabled' : ''}>${full ? P.shelfFull : P.shelfPut}</button></div>`).join('') : `<p>${T.noOwned}</p>`}</div></div>`;
    }
    function album() {
      const stock = trade?.read();
      const allOwned = stock ? collectionCards({ setId, owned: stock.owned }) : [];
      const cards = collectionCards({ setId, rarityId, search, owned: stock && ownedOnly ? stock.owned : null });
      const header = `${filters()}<p class="hint">${set().scope} · ${T.count}</p>${stock ? `<div class="tcg-shop-tabs"><button class="btn small ${shopPane === 'stock' ? 'primary' : 'ghost'}" data-card-pane="stock" aria-pressed="${shopPane === 'stock'}">${P.inventory}</button><button class="btn small ${shopPane === 'shelf' ? 'primary' : 'ghost'}" data-card-pane="shelf" aria-pressed="${shopPane === 'shelf'}">🗄️ ${P.shelf} · ${stock.shelf.filter(Boolean).length}/${stock.shelf.length}</button><button class="btn small ${shopPane === 'owned' ? 'primary' : 'ghost'}" data-card-pane="owned" aria-pressed="${shopPane === 'owned'}">${P.owned} · ${Object.values(stock.owned).reduce((n, v) => n + v, 0)} ${P.copies}</button></div>` : ''}`;
      if (stock && shopPane === 'stock') return header + shopHTML(stock);
      if (stock && shopPane === 'shelf') return header + shelfHTML(stock);
      return `${header}
        ${stock?.opening ? `<button class="btn primary" data-card-resume ${stock.canManage ? '' : 'disabled'}>${P.pending}</button>` : ''}
        ${stock ? `<p class="tcg-collection-progress">${T.collectionProgress(allOwned.length, CARD_CATALOG.filter(c => c.set === setId).length, allOwned.reduce((n, c) => n + stock.owned[c.id], 0))}</p><div class="tcg-collection-tabs"><button class="btn small ${ownedOnly ? 'primary' : 'ghost'}" data-card-owned="true" aria-pressed="${ownedOnly}">${T.ownedOnly}</button><button class="btn small ${ownedOnly ? 'ghost' : 'primary'}" data-card-owned="false" aria-pressed="${!ownedOnly}">${T.catalog}</button></div>` : ''}
        <div class="tcg-filters"><label>${T.all}<select data-card-rarity aria-label="${T.app} · ${T.all}"><option value="all">${T.all}</option>${CARD_RARITIES.map(r => `<option value="${r.id}" ${r.id === rarityId ? 'selected' : ''}>${r.name} · ${r.count}</option>`).join('')}</select></label>
        <label>${T.search}<input type="search" data-card-search value="${esc(search)}" placeholder="${T.searchHint}"></label></div>
        ${stock ? marketClock(stock) : ''}<div class="tcg-album-bar"><b data-card-count aria-live="polite">${cards.length} ${T.cards}</b><button class="btn primary" data-card-action="sample">${T.sample}</button></div>
        <div class="tcg-grid">${cards.length ? cards.map(c => `<button class="tcg-thumb" data-card-id="${c.id}" aria-label="${T.view}: ${esc(c.name)} · ${c.id}">${faceHTML(c)}${stock ? priceInfo(c, stock) : ''}</button>`).join('') : stock && ownedOnly && !allOwned.length ? `<div class="tcg-empty-owned"><p>${T.noOwned}</p><button class="btn primary" data-card-pane="stock">${T.stockLink}</button></div>` : `<p class="hint">${T.empty}</p>`}</div>`;
    }
    // Lá hiếm nhất trong gói quyết định ánh sáng của bao và độ rung; lá Rare trở lên lóe viền ở lưng.
    const rank = c => CARD_RARITIES.findIndex(r => r.id === c.rarity);
    const bestOf = cards => cards.reduce((a, c) => rank(c) > rank(a) ? c : a, cards[0]);
    const flipMs = c => C.CARD_FLIP_MS + (rank(c) >= C.CARD_CHARGE_FROM ? C.CARD_CHARGE_MS : 0);
    const backHTML = (c, i, total) => `<span class="tcg-back tcg-hint-${c.rarity}" aria-hidden="true"><b>✦</b><span>${set().stamp}</span><small>${i + 1}/${total}</small></span>`;
    function badgeHTML(i, c) {
      if (!realOpen?.fresh) return '';
      return realOpen.fresh[i] ? `<span class="tcg-badge is-new">${P.fresh}</span>`
        : `<span class="tcg-badge">${P.duplicate(C.CARD_DUST[c.rarity])}</span>`;
    }
    function valueHTML(s) {
      const stock = trade?.read();
      if (!realOpen || !stock || s.phase !== 'complete') return '';
      const value = s.cards.reduce((n, c) => n + stock.prices[c.id], 0), cost = realOpen.cost || 0, diff = value - cost;
      return `<p class="tcg-pack-value ${diff >= 0 ? 'good-text' : 'bad-text'}">${P.packValue(trade.money(value), trade.money(cost))} · <b>${diff >= 0 ? P.packGain(trade.money(diff)) : P.packLoss(trade.money(-diff))}</b></p>`;
    }
    function spotlightHTML(s) {
      if (s.spotlight < 0) return '';
      const c = s.cards[s.spotlight], r = CARD_RARITIES[rank(c)];
      return `<div class="tcg-spotlight tcg-spot-${c.rarity}" role="dialog" aria-label="${r.name}: ${esc(c.name)}">
        <span class="tcg-rays" aria-hidden="true"></span><span class="tcg-sparks" aria-hidden="true">${'<i></i>'.repeat(12)}</span>
        <b class="tcg-spot-title">${P.spotTitle(r.name)}</b>
        <div class="tcg-spot-card">${faceHTML(c, { showBase: true, money: cardMoney })}${badgeHTML(s.spotlight, c)}</div>
        <button class="btn primary" data-card-action="dismiss">${P.spotOk}</button></div>`;
    }
    function packHTML(s) {
      const sealed = s.phase === 'sealed', tearing = s.phase === 'tearing', best = bestOf(s.cards);
      if (sealed || tearing) return `<div class="tcg-pack-stage ${tearing ? 'is-tearing' : ''}">
        <div class="tcg-pack tcg-aura-${best.rarity}" aria-label="${realOpen ? P.actualPack : T.pack} · ${set().name}">
          <span class="tcg-aura" aria-hidden="true"></span>
          <button class="tcg-tear-strip" data-card-action="tear" data-tear-strip ${tearing ? 'disabled' : ''} aria-label="${T.tear}"><span>✂ · · · · · · · · · →</span></button>
          <div class="tcg-pack-body"><b>${realOpen ? CARD_PACKS.find(p => p.id === realOpen.key.split(':')[1]).name : T.pack}</b><span>${set().name}</span><div>${pictureHTML(byId(setId === 'huyen-bi' ? 'HB-029' : 'QN-038'))}</div><small>${set().stamp} · ${s.cards.length} ${T.cards}</small></div>
          <span class="tcg-pull-cards" aria-hidden="true">${s.cards.map(() => '<i></i>').join('')}</span>
        </div><p class="tcg-stage-status" role="status">${tearing ? T.tearing : rank(best) >= C.CARD_CHARGE_FROM ? P.auraHint : T.sampleHint}</p>
        <div class="tcg-open-actions"><button class="btn primary" data-card-action="tear" ${tearing ? 'disabled' : ''}>${T.tear}</button><button class="btn ghost" data-card-action="quick">${T.quick}</button></div></div>`;
      const busy = ['flipping', 'revealing'].includes(s.phase), stock = trade?.read();
      const next = realOpen && stock.canManage && stock.stock[realOpen.key] > 0;
      const actions = `<div class="tcg-open-actions">${s.phase === 'complete' ? `${next ? `<button class="btn primary" data-card-action="next-quick">${P.quickNext}</button><button class="btn ghost" data-card-action="next">${P.next}</button>` : ''}<button class="btn ${next ? 'ghost' : 'primary'}" data-card-action="${realOpen ? 'stock' : 'sample'}">${realOpen ? P.actualAgain : T.again}</button><button class="btn ghost" data-card-action="album">${T.album}</button>`
        : `<button class="btn ghost" data-card-action="all" ${busy ? 'disabled' : ''}>${T.revealAll}</button><button class="btn ghost" data-card-action="quick">${T.quick}</button>`}</div>`;
      // Lật tất cả / đã xong: cả năm lá xếp hàng. Lật từng lá: chồng thẻ ở giữa, lá đã lật xếp hàng bên dưới.
      if (s.phase === 'revealing' || s.phase === 'complete') {
        return `<div class="tcg-open-stage"><p class="tcg-stage-status" role="status">${s.phase === 'complete' ? (realOpen ? P.actualDone : T.done) : T.revealing}</p>
          <div class="tcg-reveal-row">${s.cards.map((c, i) => {
            const open = s.revealed.includes(i), flipping = !open && s.phase === 'revealing';
            return `<span class="tcg-reveal ${open ? 'is-open tcg-' + c.rarity : ''} ${flipping ? 'is-flipping' : ''}" style="--card-delay:${i * C.CARD_REVEAL_STAGGER_MS}ms">
              <span class="tcg-flip-inner">${backHTML(c, i, s.cards.length)}<span class="tcg-front" aria-hidden="${!open}">${faceHTML(c, { showBase: true, money: cardMoney })}</span></span>${open ? badgeHTML(i, c) : ''}</span>`;
          }).join('')}</div>${valueHTML(s)}${actions}${spotlightHTML(s)}</div>`;
      }
      const order = s.cards.map((_, i) => i), top = s.flipping >= 0 ? s.flipping : order.find(i => !s.revealed.includes(i));
      const c = s.cards[top], charging = s.flipping === top && rank(c) >= C.CARD_CHARGE_FROM;
      const left = s.cards.length - s.revealed.length;
      return `<div class="tcg-open-stage"><p class="tcg-stage-status" role="status">${s.flipping >= 0 ? (charging ? P.charging : T.revealing) : P.tapTop(left)}</p>
        <div class="tcg-stack" style="--stack:${left - 1}">
          ${'<i class="tcg-stack-under" aria-hidden="true"></i>'.repeat(Math.max(0, left - 1))}
          <button class="tcg-reveal tcg-top ${s.flipping === top ? 'is-flipping' : ''} ${charging ? 'is-charging' : ''}" style="--card-flip-ms:${flipMs(c)}ms" data-card-flip="${top}" ${busy ? 'disabled' : ''} aria-label="${T.reveal} ${top + 1}">
            <span class="tcg-flip-inner">${backHTML(c, top, s.cards.length)}<span class="tcg-front" aria-hidden="true">${faceHTML(c, { showBase: true, money: cardMoney })}</span></span></button>
        </div>
        <div class="tcg-revealed-strip">${s.revealed.map(i => `<span class="tcg-mini tcg-${s.cards[i].rarity}">${faceHTML(s.cards[i])}${badgeHTML(i, s.cards[i])}</span>`).join('')}</div>
        <p class="tcg-progress" aria-live="polite">${T.progress}: ${s.revealed.length}/${s.cards.length}</p>${actions}${spotlightHTML(s)}</div>`;
    }
    function detailHTML() {
      const stock = trade?.read();
      const actions = () => {
        const off = stock.canManage ? '' : 'disabled', on = stock.shelf.includes(selected.id), free = stock.owned[selected.id] - (on ? 1 : 0);
        const dust = C.CARD_DUST[selected.rarity], craft = dust * C.CARD_CRAFT_MUL, empty = stock.shelf.indexOf(null);
        return `<div class="tcg-card-actions"><p><b>${P.effect}:</b> ${CARD_FX[selected.fx].icon} ${CARD_FX[selected.fx].name} · ${esc(fxText(selected))}</p>
          <p>${on ? `✅ ${P.shelfOn}` : stock.owned[selected.id] ? `<button class="btn small primary" data-shelf-put="${selected.id}" ${off} ${empty < 0 ? 'disabled' : ''}>${empty < 0 ? P.shelfFull : P.shelfPut}</button>` : ''}</p>
          <p><b>${P.dust}:</b> ${stock.dust} ✨ <span class="hint">${P.dustHint}</span></p>
          <div class="tcg-stock-actions"><button class="btn small" data-card-dust="${selected.id}" ${off} ${free > 0 ? '' : 'disabled'}>${P.disenchant(dust)}</button>
          <button class="btn small" data-card-craft="${selected.id}" ${off} ${stock.dust >= craft ? '' : 'disabled'}>${P.craft(craft)}</button></div>
          ${on && free <= 0 ? `<p class="hint">${P.noFree}</p>` : ''}</div>`;
      };
      return `<button class="btn small ghost" data-card-action="album">${T.back}</button><div class="tcg-detail">${faceHTML(selected)}</div><p class="center hint">${set().scope}</p>`
        + (stock ? actions() : '')
        + (stock ? `<div class="tcg-price-detail">${marketClock(stock)}<p>${P.ownedCount}: <b>${stock.owned[selected.id]} ${P.copies}</b></p><p>${P.base}: <b>${trade.money(C.CARD_BASE_PRICES[selected.id])}</b></p><p>${P.market}: <b data-card-price="${selected.id}">${trade.money(stock.prices[selected.id])}</b> · ${P.previous}: <span data-card-previous="${selected.id}">${trade.money(stock.previous[selected.id])}</span></p><p>${P.cost}: ${trade.money(stock.costs[selected.id])}</p><p class="hint">${P.future}</p></div>` : '');
    }
    function render() {
      if (disposed) return;
      const note = realOpen ? P.retained : stage === 'pack' || !trade ? T.note : P.note;
      root.innerHTML = `<section class="tcg-album"><p class="tcg-demo-note">${note}</p>${message ? `<p class="tcg-message" role="status">${esc(message)}</p>` : ''}${stage === 'album' ? album() : stage === 'detail' ? detailHTML() : `<div class="tcg-pack-heading"><button class="btn small ghost" data-card-action="album">${T.back}</button><b>${set().name}</b></div>${packHTML(demo.snapshot())}`}</section>`;
      // Giữ luồng bàn phím khi thay bao bằng thẻ; không giật cuộn lúc người chơi kéo/chạm.
      if (keyboardFocus) {
        const phase = demo?.snapshot().phase;
        const target = stage === 'album' ? root.querySelector('[data-card-set][aria-pressed="true"]')
          : stage === 'detail' ? root.querySelector('[data-card-action="album"]')
          : phase === 'sealed' ? root.querySelector('[data-card-action="tear"]')
          : phase === 'ready' ? root.querySelector('.tcg-top')
          : phase === 'complete' ? root.querySelector('.tcg-open-actions .primary') : root.querySelector('[role="status"]');
        if (target) { if (target.tagName !== 'BUTTON') target.tabIndex = -1; target.focus({ preventScroll: true }); }
      }
    }
    // Âm thanh theo diễn biến mở gói: rung nạp sáng, lật theo độ hiếm, hào quang
    let heard = { revealed: 0, flipping: -1, spotlight: -1 };
    const RARITY_SOUND = { basic: 'click', rare: 'good', epic: 'sparkle', legend: 'levelUp', mythic: 'levelUp' };
    function sound(s) {
      const sfx = window.SFX;
      if (!sfx || !s) return;
      if (s.flipping >= 0 && s.flipping !== heard.flipping && rank(s.cards[s.flipping]) >= C.CARD_CHARGE_FROM) sfx.loop('charge');
      if (s.revealed.length > heard.revealed) {
        sfx.stopLoop();
        const c = s.cards[s.revealed[s.revealed.length - 1]];
        if (s.phase !== 'complete' || s.revealed.length - heard.revealed === 1) sfx.play(RARITY_SOUND[c.rarity]);
      }
      if (s.spotlight >= 0 && s.spotlight !== heard.spotlight) { sfx.play('door'); sfx.play('levelUp'); }
      heard = { revealed: s.revealed.length, flipping: s.flipping, spotlight: s.spotlight };
    }
    const onDemo = s => { sound(s); render(); };
    function start() {
      demo?.close(); stage = 'pack'; drag = null; realOpen = null; message = '';
      heard = { revealed: 0, flipping: -1, spotlight: -1 };
      demo = createDemo({ cards: demoPack(setId, round++), reduced, onChange: onDemo });
      render();
    }
    function startReal(key, quick = false, previousId = null) {
      const result = trade.open(key, previousId);
      if (!result) { message = P.failed; render(); return; }
      realOpen = result; message = ''; setId = result.key.split(':')[0];
      demo?.close(); stage = 'pack'; drag = null;
      heard = { revealed: 0, flipping: -1, spotlight: -1 };
      demo = createDemo({ cards: result.ids.map(byId), reduced, onChange: onDemo });
      if (quick) demo.revealAll(true); else render();
    }
    const click = e => {
      const b = e.target.closest('button');
      if (!b || !root.contains(b) || b.disabled) return;
      keyboardFocus = e.detail === 0;
      if (b.hasAttribute('data-tear-strip') && suppressStripClick) { suppressStripClick = false; return; }
      if (b.dataset.cardPane) { shopPane = b.dataset.cardPane; message = ''; render(); }
      else if (b.dataset.cardOwned) { ownedOnly = b.dataset.cardOwned === 'true'; message = ''; render(); }
      else if (b.dataset.cardBuy) {
        const quote = { buy: +b.dataset.cardBuyPrice, tick: +b.dataset.cardQuoteTick }, qty = +b.dataset.cardQty;
        const ok = trade.buy(b.dataset.cardBuy, qty, quote);
        message = ok ? P.purchase(qty, CARD_PACKS.find(p => p.id === b.dataset.cardBuy.split(':')[1]).name, trade.money(quote.buy * qty)) : trade.read().tick !== quote.tick ? P.priceChanged : P.failed;
        render();
      }
      else if (b.dataset.cardOpen) startReal(b.dataset.cardOpen, b.hasAttribute('data-card-quick'));
      else if (b.hasAttribute('data-card-resume')) startReal(trade.read().opening.key);
      else if (b.dataset.cardMeet) trade.meet(b.dataset.cardMeet);
      else if (b.dataset.shelfSlot !== undefined) { if (!trade.shelve(+b.dataset.shelfSlot, null)) message = P.failed; render(); }
      else if (b.dataset.shelfPut) {
        const slot = trade.read().shelf.indexOf(null);
        message = slot < 0 ? P.shelfFull : trade.shelve(slot, b.dataset.shelfPut) ? '' : P.failed; render();
      }
      else if (b.dataset.cardDust) { const n = trade.dust(b.dataset.cardDust); message = n ? P.disenchanted(byId(b.dataset.cardDust).name, n) : P.failed; render(); }
      else if (b.dataset.cardCraft) { message = trade.craft(b.dataset.cardCraft) ? P.crafted(byId(b.dataset.cardCraft).name) : P.failed; render(); }
      else if (b.dataset.cardSet) { setId = b.dataset.cardSet; search = ''; message = ''; render(); }
      else if (b.dataset.cardId) { selected = byId(b.dataset.cardId); stage = 'detail'; render(); }
      else if (b.dataset.cardFlip !== undefined) demo?.flip(+b.dataset.cardFlip);
      else if (b.dataset.cardAction === 'sample') start();
      else if (b.dataset.cardAction === 'tear') demo?.tear();
      else if (b.dataset.cardAction === 'quick') demo?.revealAll(true);
      else if (b.dataset.cardAction === 'dismiss') demo?.dismiss();
      else if (b.dataset.cardAction === 'all') demo?.revealAll();
      else if (['next', 'next-quick'].includes(b.dataset.cardAction)) startReal(realOpen.key, b.dataset.cardAction === 'next-quick', realOpen.id);
      else if (b.dataset.cardAction === 'reveal') { const s = demo.snapshot(); demo.flip(s.cards.findIndex((_, i) => !s.revealed.includes(i))); }
      else if (['album', 'stock'].includes(b.dataset.cardAction)) {
        if (realOpen && demo.snapshot().phase === 'complete' && !trade.finish(realOpen.id)) { message = P.failed; render(); return; }
        if (stage === 'pack' && b.dataset.cardAction === 'album') ownedOnly = true;
        demo?.close(); demo = null; realOpen = null; stage = 'album'; shopPane = b.dataset.cardAction === 'stock' ? 'stock' : 'owned'; message = ''; render();
      }
    };
    const input = e => {
      if (!e.target.hasAttribute('data-card-search')) return;
      search = e.target.value;
      // Chỉ thay lưới để bàn phím điện thoại không đóng khi gõ.
      const shell = document.createElement('div'); shell.innerHTML = album();
      root.querySelector('.tcg-grid').replaceWith(shell.querySelector('.tcg-grid'));
      root.querySelector('[data-card-count]').textContent = shell.querySelector('[data-card-count]').textContent;
    };
    const change = e => { if (e.target.hasAttribute('data-card-rarity')) { rarityId = e.target.value; render(); } };
    const down = e => {
      const strip = e.target.closest('[data-tear-strip]');
      if (!strip || strip.disabled || e.button !== 0 || demo?.snapshot().phase !== 'sealed') return;
      keyboardFocus = false;
      suppressStripClick = false; drag = { id: e.pointerId, x: e.clientX, width: strip.getBoundingClientRect().width, dx: 0, strip };
      strip.setPointerCapture(e.pointerId);
    };
    const move = e => {
      if (!drag || drag.id !== e.pointerId) return;
      drag.dx = Math.max(0, Math.min(drag.width, e.clientX - drag.x));
      if (drag.dx > 8) suppressStripClick = true;
      drag.strip.style.setProperty('--drag', drag.dx + 'px');
    };
    const up = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null; d.strip.style.setProperty('--drag', '0px');
      if (d.width > 0 && d.dx / d.width >= C.CARD_DRAG_RATIO) demo.tear();
    };
    const cancelDrag = () => { if (drag) drag.strip.style.setProperty('--drag', '0px'); drag = null; suppressStripClick = false; };
    const events = { click, input, change, pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancelDrag };
    Object.entries(events).forEach(([type, listener]) => root.addEventListener(type, listener));
    const refreshMarket = () => {
      if (disposed || !trade) return;
      const stock = trade.read();
      root.querySelectorAll('[data-market-clock]').forEach(e => { e.textContent = P.updateIn(stock.nextIn); });
      root.querySelectorAll('[data-card-price]').forEach(e => { e.textContent = trade.money(stock.prices[e.dataset.cardPrice]); });
      root.querySelectorAll('[data-card-previous]').forEach(e => { e.textContent = trade.money(stock.previous[e.dataset.cardPrevious]); });
      root.querySelectorAll('[data-pack-import]').forEach(e => { e.textContent = trade.money(stock.packPrices[e.dataset.packImport].buy); });
      root.querySelectorAll('[data-pack-retail]').forEach(e => { e.textContent = trade.money(stock.packPrices[e.dataset.packRetail].sell); });
      root.querySelectorAll('[data-card-buy]').forEach(e => {
        const price = stock.packPrices[e.dataset.cardBuy].buy, qty = +e.dataset.cardQty;
        e.dataset.cardBuyPrice = price; e.dataset.cardQuoteTick = stock.tick;
        e.textContent = `${P.buy} ${qty} · ${trade.money(price * qty)}`;
        e.disabled = !stock.canManage || stock.money < price * qty;
      });
    };
    const marketTimer = trade ? setInterval(refreshMarket, C.CARD_MARKET_UI_MS) : null;
    render();
    return () => {
      disposed = true; demo?.close(); cancelDrag();
      if (marketTimer !== null) clearInterval(marketTimer);
      Object.entries(events).forEach(([type, listener]) => root.removeEventListener(type, listener));
    };
  }
  window.CardAlbum = { faceHTML, collectionCards, demoPack, createDemo, mount };
})();
