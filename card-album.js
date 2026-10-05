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
  // Dùng chung cho album lẫn thẻ trong cửa sổ khách mua.
  if (typeof document !== 'undefined') document.addEventListener('error', e => {
    if (e.target.classList?.contains('tcg-painted-art')) e.target.hidden = true;
  }, true);
  function pictureHTML(card) {
    const image = CARD_ILLUSTRATIONS[card.id];
    return `<span class="tcg-picture" role="img" aria-label="${esc(card.name)}"><span class="tcg-art-fallback" aria-hidden="true">${window.CardArt.svg(card)}</span>${image ? `<img class="tcg-painted-art" src="${image}" alt="" loading="lazy" decoding="async">` : ''}</span>`;
  }
  function faceHTML(card, { showBase = false, money = n => n.toLocaleString('vi-VN') + 'đ' } = {}) {
    card = byId(card?.id);
    if (!card) return '';
    const rarity = CARD_RARITIES.find(r => r.id === card.rarity), set = CARD_SETS.find(s => s.id === card.set);
    return `<span class="tcg-face tcg-${rarity.id}${showBase ? ' tcg-with-base' : ''}"><span class="tcg-card-top"><span class="tcg-rarity">${rarity.name}</span><span class="tcg-stamp">${set.stamp}</span></span>
      ${pictureHTML(card)}<span class="tcg-name">${esc(card.name)}</span><span class="tcg-code">${card.id}</span>${showBase ? `<span class="tcg-base-price">${CARD_SHOP_COPY.base}: <b>${esc(money(C.CARD_BASE_PRICES[card.id]))}</b></span>` : ''}</span>`;
  }
  // Thứ tự mẫu giúp xem đủ độ hiếm; không phải xác suất của gacha thật.
  function demoPack(setId, round = 0) {
    if (!CARD_SETS.some(s => s.id === setId)) return [];
    if (setId === 'huyen-bi' && round === 0) return CARD_PAINTED_SAMPLE.map(byId);
    return Array.from({ length: C.CARD_DEMO_PACK_SIZE }, (_, i) => {
      const rarity = CARD_RARITIES[(round * C.CARD_DEMO_PACK_SIZE + i) % CARD_RARITIES.length];
      const pool = CARD_CATALOG.filter(c => c.set === setId && c.rarity === rarity.id);
      return pool[(round + i) % pool.length];
    });
  }
  function createDemo({ cards, onChange = () => {}, schedule = setTimeout, cancel = clearTimeout, reduced = () => false }) {
    let phase = 'sealed', flipping = -1, timer = null, closed = false, generation = 0;
    const revealed = new Set(), pack = cards.slice();
    const snapshot = () => ({ phase, flipping, revealed: [...revealed], cards: pack.slice() });
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
        later(C.CARD_FLIP_MS, () => {
          revealed.add(index); flipping = -1; phase = revealed.size === pack.length ? 'complete' : 'ready'; notify();
        });
        return true;
      },
      revealAll(quick = false) {
        if (closed || phase === 'complete' || (!quick && phase === 'revealing')) return false;
        if (timer !== null) cancel(timer);
        generation++; timer = null; flipping = -1;
        const finish = () => { pack.forEach((_, i) => revealed.add(i)); phase = 'complete'; notify(); };
        if (quick) finish();
        else { phase = 'revealing'; notify(); later(C.CARD_FLIP_MS + Math.max(0, pack.length - 1) * C.CARD_REVEAL_STAGGER_MS, finish); }
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
    function album() {
      const stock = trade?.read();
      const allOwned = stock ? collectionCards({ setId, owned: stock.owned }) : [];
      const cards = collectionCards({ setId, rarityId, search, owned: stock && ownedOnly ? stock.owned : null });
      const header = `${filters()}<p class="hint">${set().scope} · ${T.count}</p>${stock ? `<div class="tcg-shop-tabs"><button class="btn small ${shopPane === 'stock' ? 'primary' : 'ghost'}" data-card-pane="stock" aria-pressed="${shopPane === 'stock'}">${P.inventory}</button><button class="btn small ${shopPane === 'owned' ? 'primary' : 'ghost'}" data-card-pane="owned" aria-pressed="${shopPane === 'owned'}">${P.owned} · ${Object.values(stock.owned).reduce((n, v) => n + v, 0)} ${P.copies}</button></div>` : ''}`;
      if (stock && shopPane === 'stock') return header + shopHTML(stock);
      return `${header}
        ${stock?.opening ? `<button class="btn primary" data-card-resume ${stock.canManage ? '' : 'disabled'}>${P.pending}</button>` : ''}
        ${stock ? `<p class="tcg-collection-progress">${T.collectionProgress(allOwned.length, CARD_CATALOG.filter(c => c.set === setId).length, allOwned.reduce((n, c) => n + stock.owned[c.id], 0))}</p><div class="tcg-collection-tabs"><button class="btn small ${ownedOnly ? 'primary' : 'ghost'}" data-card-owned="true" aria-pressed="${ownedOnly}">${T.ownedOnly}</button><button class="btn small ${ownedOnly ? 'ghost' : 'primary'}" data-card-owned="false" aria-pressed="${!ownedOnly}">${T.catalog}</button></div>` : ''}
        <div class="tcg-filters"><label>${T.all}<select data-card-rarity aria-label="${T.app} · ${T.all}"><option value="all">${T.all}</option>${CARD_RARITIES.map(r => `<option value="${r.id}" ${r.id === rarityId ? 'selected' : ''}>${r.name} · ${r.count}</option>`).join('')}</select></label>
        <label>${T.search}<input type="search" data-card-search value="${esc(search)}" placeholder="${T.searchHint}"></label></div>
        ${stock ? marketClock(stock) : ''}<div class="tcg-album-bar"><b data-card-count aria-live="polite">${cards.length} ${T.cards}</b><button class="btn primary" data-card-action="sample">${T.sample}</button></div>
        <div class="tcg-grid">${cards.length ? cards.map(c => `<button class="tcg-thumb" data-card-id="${c.id}" aria-label="${T.view}: ${esc(c.name)} · ${c.id}">${faceHTML(c)}${stock ? priceInfo(c, stock) : ''}</button>`).join('') : stock && ownedOnly && !allOwned.length ? `<div class="tcg-empty-owned"><p>${T.noOwned}</p><button class="btn primary" data-card-pane="stock">${T.stockLink}</button></div>` : `<p class="hint">${T.empty}</p>`}</div>`;
    }
    function packHTML(s) {
      const sealed = s.phase === 'sealed', tearing = s.phase === 'tearing';
      if (sealed || tearing) return `<div class="tcg-pack-stage ${tearing ? 'is-tearing' : ''}">
        <div class="tcg-pack" aria-label="${realOpen ? P.actualPack : T.pack} · ${set().name}">
          <button class="tcg-tear-strip" data-card-action="tear" data-tear-strip ${tearing ? 'disabled' : ''} aria-label="${T.tear}"><span>✂ · · · · · · · · · →</span></button>
          <div class="tcg-pack-body"><b>${realOpen ? CARD_PACKS.find(p => p.id === realOpen.key.split(':')[1]).name : T.pack}</b><span>${set().name}</span><div>${pictureHTML(byId(setId === 'huyen-bi' ? 'HB-029' : 'QN-038'))}</div><small>${set().stamp} · ${s.cards.length} ${T.cards}</small></div>
          <span class="tcg-pull-cards" aria-hidden="true">${s.cards.map(() => '<i></i>').join('')}</span>
        </div><p class="tcg-stage-status" role="status">${tearing ? T.tearing : T.sampleHint}</p>
        <div class="tcg-open-actions"><button class="btn primary" data-card-action="tear" ${tearing ? 'disabled' : ''}>${T.tear}</button><button class="btn ghost" data-card-action="quick">${T.quick}</button></div></div>`;
      const count = s.revealed.length;
      const busy = ['flipping', 'revealing'].includes(s.phase), stock = trade?.read();
      const next = realOpen && stock.canManage && stock.stock[realOpen.key] > 0;
      return `<div class="tcg-open-stage"><p class="tcg-stage-status" role="status">${s.phase === 'complete' ? (realOpen ? P.actualDone : T.done) : busy ? T.revealing : T.ready}</p>
        <div class="tcg-reveal-row">${s.cards.map((c, i) => {
          const open = s.revealed.includes(i), flipping = !open && (s.flipping === i || s.phase === 'revealing');
          const delay = s.phase === 'revealing' ? i * C.CARD_REVEAL_STAGGER_MS : 0;
          return `<button class="tcg-reveal ${open ? 'tcg-' + c.rarity : ''} ${open ? 'is-open' : ''} ${flipping ? 'is-flipping' : ''}" style="--card-delay:${delay}ms" data-card-flip="${i}" ${open || busy ? 'disabled' : ''} aria-label="${open ? esc(c.name) + ' · ' + CARD_RARITIES.find(r => r.id === c.rarity).name + ' · ' + P.base + ': ' + esc(cardMoney(C.CARD_BASE_PRICES[c.id])) : flipping ? T.flippingCard(i + 1) : T.reveal + ' ' + (i + 1)}">
            <span class="tcg-flip-inner"><span class="tcg-back" aria-hidden="true"><b>✦</b><span>${set().stamp}</span><small>${i + 1}/${s.cards.length}</small></span><span class="tcg-front" aria-hidden="${!open}">${faceHTML(c, { showBase: true, money: cardMoney })}</span></span></button>`;
        }).join('')}</div>
        <p class="tcg-progress" aria-live="polite">${T.progress}: ${count}/${s.cards.length}</p>
        <div class="tcg-open-actions">${s.phase === 'complete' ? `${next ? `<button class="btn primary" data-card-action="next-quick">${P.quickNext}</button><button class="btn ghost" data-card-action="next">${P.next}</button>` : ''}<button class="btn ${next ? 'ghost' : 'primary'}" data-card-action="${realOpen ? 'stock' : 'sample'}">${realOpen ? P.actualAgain : T.again}</button>` : `<button class="btn primary" data-card-action="all" ${busy ? 'disabled' : ''}>${T.revealAll}</button><button class="btn ghost" data-card-action="reveal" ${busy ? 'disabled' : ''}>${T.reveal}</button><button class="btn ghost" data-card-action="quick">${T.quick}</button>`}<button class="btn ghost" data-card-action="album">${T.album}</button></div></div>`;
    }
    function detailHTML() {
      const stock = trade?.read();
      return `<button class="btn small ghost" data-card-action="album">${T.back}</button><div class="tcg-detail">${faceHTML(selected)}</div><p class="center hint">${set().scope}</p>`
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
          : phase === 'ready' ? root.querySelector('[data-card-action="reveal"]')
          : phase === 'complete' ? root.querySelector('.tcg-open-actions .primary') : root.querySelector('[role="status"]');
        if (target) { if (target.tagName !== 'BUTTON') target.tabIndex = -1; target.focus({ preventScroll: true }); }
      }
    }
    function start() {
      demo?.close(); stage = 'pack'; drag = null; realOpen = null; message = '';
      demo = createDemo({ cards: demoPack(setId, round++), reduced, onChange: render });
      render();
    }
    function startReal(key, quick = false, previousId = null) {
      const result = trade.open(key, previousId);
      if (!result) { message = P.failed; render(); return; }
      realOpen = result; message = ''; setId = result.key.split(':')[0];
      demo?.close(); stage = 'pack'; drag = null;
      demo = createDemo({ cards: result.ids.map(byId), reduced, onChange: render });
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
      else if (b.dataset.cardSet) { setId = b.dataset.cardSet; search = ''; message = ''; render(); }
      else if (b.dataset.cardId) { selected = byId(b.dataset.cardId); stage = 'detail'; render(); }
      else if (b.dataset.cardFlip !== undefined) demo?.flip(+b.dataset.cardFlip);
      else if (b.dataset.cardAction === 'sample') start();
      else if (b.dataset.cardAction === 'tear') demo?.tear();
      else if (b.dataset.cardAction === 'quick') demo?.revealAll(true);
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
