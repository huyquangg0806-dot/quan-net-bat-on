/* Quán Nét Bất Ổn — hướng dẫn, menu, âm thanh, bản lưu, khởi động.
   Logic game chia nhiều file, nạp theo thứ tự trong index.html; dùng chung S, R, C và tiện ích ở game-core.js. */
'use strict';

// ---------- Hướng dẫn ----------
// Chia mục hướng dẫn thành tab cho người mới khỏi ngợp; tab cuối người chơi xem được giữ trong phiên.
let howtoTab = 0;
function howtoTabs(groups) {
  howtoTab = Math.min(howtoTab, groups.length - 1);
  return `<div class="howto-tabs" role="tablist">${groups.map(([name], i) => `<button class="btn small ${i === howtoTab ? 'primary' : 'ghost'}" role="tab" aria-selected="${i === howtoTab}" data-howto-tab="${i}">${name}</button>`).join('')}</div>
    ${groups.map(([, items], i) => `<ol class="howto" data-howto-panel="${i}" ${i === howtoTab ? '' : 'hidden'}>${items.map(t => `<li>${t}</li>`).join('')}</ol>`).join('')}`;
}
function bindHowtoTabs(card) {
  card.addEventListener('click', e => {
    const b = e.target.closest('[data-howto-tab]');
    if (!b) return;
    howtoTab = Number(b.dataset.howtoTab);
    card.querySelectorAll('[data-howto-tab]').forEach(x => {
      const on = Number(x.dataset.howtoTab) === howtoTab;
      x.classList.toggle('primary', on); x.classList.toggle('ghost', !on); x.setAttribute('aria-selected', on);
    });
    card.querySelectorAll('[data-howto-panel]').forEach(p => { p.hidden = Number(p.dataset.howtoPanel) !== howtoTab; });
  });
}
function openHowTo() {
  const playing = R && !R.over;
  const wasPaused = playing && R.paused;
  if (playing) setPause(true);
  const m = openModal({
    title: '📖 Cách chơi',
    body: `${howtoTabs([
      ['🎮 Cơ bản', [`<b>🚪 Đón khách:</b> bấm khách đang chờ ở cửa để mở quầy nạp giờ, chọn máy đúng hạng khách cần (sạch, không treo). Thanh màu dưới lời thoại là sức chờ của khách.`,
        `<b>⏱️ Nạp giờ:</b> giữ nút (hoặc <kbd>Space</kbd>) để nạp, thả tay ngay vạch vàng. Nạp dư là cho không, nạp thiếu khách sẽ cáu.`,
        `<b>🍜 Gọi đồ:</b> khách gọi món thì hiện phiếu trên máy. Bấm vào máy, làm món ở quầy (giữ nút để nấu/rót) rồi mang ra. Khách rụt rè 💭 thì bấm vào để hỏi.`,
        `<b>🧹 Dọn và sửa:</b> khách về để lại bàn bừa, bấm 🧹 để dọn trước khi xếp người mới. Máy treo 💥 thì bấm vào để sửa ngay.`,
        `<b>🎮 Game:</b> quán chưa cài game khách muốn thì khách bỏ đi. Buổi sáng xem game đang 🔥 hot, mua thêm ở tab <i>Nâng máy → Thư viện game</i>.`,
        `<b>🌙 Đóng cửa:</b> quán không tự đóng. Tối vắng khách thì bấm <i>🌙 Đóng cửa → Chuẩn bị đóng cửa</i>; sau 23h dễ bị công an kiểm tra.`,
        `<b>☀️ Buổi sáng:</b> nhập hàng (có hạn dùng), nâng máy, xem hóa đơn rồi <i>Kéo cửa, mở quán</i>. Mấy ngày đầu tính năng mới mở dần, có báo ở đầu tab Nhập hàng.`]],
      ['🧑‍🍳 Nhân viên', [`<b>🧑‍🍳 Thuê người:</b> tuyển, chỉnh lương và training ở tab <i>Hóa đơn</i> mỗi sáng. Mỗi người phụ trách tối đa ${C.STAFF_PCS} máy: dẫn khách vào máy đúng hạng, nhận đơn, mang món, lau bàn trống. Lương trả cuối ngày; lương cao và training giúp ghi đơn ít sai.`,
        `<b>⏱️ Nạp giờ khi có nhân viên:</b> người đã training tự nạp đúng giờ khách cần; người chưa training chuyển quầy cho bạn nạp. Chỉ còn máy khác nhu cầu thì nhân viên hỏi ý bạn trước khi dẫn khách vào.`,
        `<b>🍜 Bếp:</b> có đơn thì quầy bếp tự hiện, bạn làm món rồi giao nhân viên mang ra. Lỡ đóng quầy thì bấm nút công việc dưới cửa để mở lại.`,
        `<b>🧘 Nhịp quán:</b> khách tới thưa hơn khi còn nhiều việc chờ xử lý; sau mẹ gank, trộm hoặc công an có khoảng nghỉ đón khách. Nút <i>🦹 Bắt trộm</i>, <i>📢 Nhắc máy</i> và <i>🌙 Đóng cửa</i> nằm dưới cảnh quán, luôn hiện cả khi mở quầy. Việc khẩn cấp trả tua nhanh về ×1; hộp thoại nhắc khách ồn tạm dừng để bạn chọn.`,
        `<b>🏠 Về tiêu đề:</b> ca đang mở tạm dừng trong tab này, <i>Chơi tiếp</i> trở lại đúng ca. Tải lại hoặc đóng tab giữa ca thì mất ca đó (chỉ giữ mốc lưu buổi sáng), game sẽ hỏi lại trước khi rời trang.`]],
      ['🙋 Khách', [`<b>🙋 Mỗi khách một kiểu:</b> để ý câu chào ở cửa. Khách <i>đang vội</i> chịu chờ ngắn hơn — xếp máy và làm món cho họ trước. Khách <i>ngại bẩn</i> rất khó chịu với bàn bừa và máy treo. Khách <i>tính kỹ</i> để ý từng phút nạp giờ. Trưa hay có dân văn phòng, chiều có học sinh, tối có game thủ đi rank.`,
        `<b>😶 Khách rụt rè:</b> nhân viên sẽ hỏi để biết khách cần máy và muốn gọi món gì. Khi không có nhân viên phụ trách, bấm khách ở cửa hoặc 💭 trên máy để hỏi. Khách khác đang chơi ổn mà bị hỏi nhiều thì thấy phiền.`,
        `<b>📒 Khách quen:</b> khách nhớ quán. Lần trước bực chuyện gì sẽ nhắc ở cửa — lặp lại lỗi cũ thì họ khó chịu gấp rưỡi, làm tốt thì thiện cảm tăng. Xếp đúng ❤️ máy quen cũng được lòng. Bị bỏ bê nhiều lần họ sẽ chuyển quán.`,
        `<b>💬 Nhận xét cuối ngày:</b> xem khách khen gì, chê gì; bấm vào từng khách để biết vì sao họ vui hay bực.`,
        `<b>📢 Khách ồn ào:</b> có khách hay hát hò, la hét làm khách ngồi cùng hàng máy khó chịu. Thấy 📢 trên máy thì bấm vào: <i>nhắc nhở</i> (đa số chịu nhỏ tiếng, không được thì còn ồn hơn) hoặc <i>mời về</i> (phải trả lại tiền giờ, khách đó chấm sao thấp). Nhân viên cũng tự đi nhắc.`,
        `<b>📅 Lịch tuần:</b> Thứ 7, Chủ nhật quán đông hơn, học sinh tới cả buổi sáng. Học sinh đổ về lúc tan trường (trưa và chiều). Mỗi tháng có một tuần thi học kỳ: học sinh gần như không ghé, buổi sáng xem thông báo để nhập hàng cho vừa.`]],
      ['💰 Tiền & sổ sách', [`<b>🎯 Nhiệm vụ tuần:</b> đầu tab <i>Nhập hàng</i> có ${C.QUEST_COUNT} nhiệm vụ mỗi tuần (Thứ 2 → Chủ nhật), mục tiêu nhích hơn kết quả tuần trước một chút. Kết quả cộng khi đóng cửa, xong là có thưởng ngay; xong hết còn được thưởng thêm. Có kinh doanh thẻ thì gom đủ ${C.CARD_MILESTONES.map(m => m.n).join('/')} mã khác nhau của một bộ để nhận thưởng mốc sưu tầm.`,
        `<b>🧾 Tiền nong:</b> mặt bằng, mạng, điện cộng dồn và chốt hóa đơn mỗi 7 ngày — đủ tiền thì game tự trả khi chốt; thiếu tiền thì trễ hạn bị phạt rồi cắt mạng. Thiếu vốn thì vay ngân hàng (lãi thấp) hoặc vay nóng (lãi cao) ở tab <i>Hóa đơn</i>.`,
        `<b>📒 Kế toán & thuế:</b> chốt sổ mỗi ${C.ACCOUNT_DAYS} ngày, kỳ đầu miễn thuế. Giá vốn ghi khi dùng/bỏ nguyên liệu. Tiền mua máy, linh kiện, nâng cấp, game được khấu hao dần ${C.DEPRECIATION_RATE * 100}%/ngày vào chi phí; kỳ lỗ được trừ vào lãi các kỳ sau. Tab <i>Hóa đơn</i> cho xem báo cáo, đóng thuế và thuê kế toán ${money(C.ACCOUNT_FEE)}/${C.ACCOUNT_DAYS} ngày để nhắc dự phòng, tự đóng thuế khi bật tùy chọn.`,
        `<b>♻️ Đồ thải:</b> hàng bỏ, khay đổ và linh kiện cũ thay ra (khi nâng cấp hoặc thay phím chuột) gom riêng ở tab <i>Nhập hàng</i>, giữ ${C.WASTE_KEEP_DAYS} ngày, tối đa ${C.WASTE_CAP} đơn vị. Mỗi ngày một lời chào thu gom; bán ngay hoặc nhờ kế toán trả giá một lần (có thể bị rút lời chào). Có thể đặt giá tối thiểu để nhờ tự bán.`,
        `<b>☠️ Hàng hết date:</b> hàng cận date rẻ một nửa nhưng mau hết hạn. Hàng hết date vẫn bán được nhưng khách có thể đau bụng rồi báo công an — bị phạt nặng!`,
        `<b>🛠️ Nâng cấp máy:</b> nâng cả CPU và card đồ họa để lên hạng (Thường → Pre → VIP → Pro Max), khách chơi game nặng và streamer sẽ tìm tới. Chuột, phím, màn hình, bàn ghế xịn làm giá giờ cao hơn và khách vui hơn.`,
        `<b>🏗️ Hạ tầng:</b> thanh dưới đồng hồ cho biết nhiệt độ phòng, mạng và điện. Trời nóng thì bật ❄️ điều hòa (tốn điện). Quán đông quá sức mạng thì khách bị giật lag — nâng gói mạng ở tab <i>Hóa đơn</i>. Cúp điện thì máy tắt: có 🔋 UPS khách kịp lưu game, có 🛢️ máy phát thì bấm nổ máy (tốn xăng). Khách thua hay đập phím, buổi sáng nhớ sửa.`]],
      ['🚨 Rắc rối', [`<b>🦹 Trộm:</b> thỉnh thoảng có kẻ trộm giả làm khách (nạp ít giờ, nói lấp lửng, ngồi một lúc thì lộ 👀). Khi nó gỡ đồ chạy ra cửa, bạn có vài giây để <i>bấm vào máy đó</i> bắt lại. Bắt được thì chọn giao công an (có thưởng), tha (thành khách quen) hay bắt đền. Để thoát thì máy thiếu đồ, sáng mai mua lại. Camera và khóa cáp giúp phòng trộm.`,
        `<b>👩 Mẹ gank:</b> học sinh đang chơi có thể bị phụ huynh tới tìm bất cứ lúc nào trong ngày (thấy điện thoại 📱 rung là sắp tới). <i>Giấu giùm</i> thì được lòng học sinh, nhưng trong quán càng nhiều học sinh càng dễ lộ; lộ sau 21h còn có thể bị báo công an. <i>Chỉ chỗ</i> thì mất khách đó nhưng phụ huynh tin quán.`,
        `<b>🌙 Đóng cửa:</b> quán không tự đóng — bạn tự chọn giờ, mở được tới 8h sáng hôm sau. Bấm <i>🌙 Đóng cửa</i> ở khung Cửa quán: <i>chuẩn bị đóng cửa</i> thì không nhận khách mới, khách chơi nốt rồi quán tự đóng; <i>đóng ngay</i> thì phải hoàn tiền giờ chưa chơi. Mở càng khuya càng tốn: từ 18h đèn, biển hiệu tính tiền theo giờ, sau 22h trả thêm lương ca đêm và nhân viên mệt hay ghi sai đơn. Từ 21h có khách xin <i>bao đêm</i> (trả trọn gói, chơi tới 6h).`,
        `<b>👮 Mở quá giờ:</b> từ 23h tới 6h công an có thể ập vào kiểm tra — quán càng đông, có khách ồn hay học sinh thì càng dễ bị báo. Bị bắt là phải đóng cửa ngay; lần đầu cảnh cáo, sau đó phạt tiền, tái phạm nhiều lần bị đình chỉ một ngày. Từ 22h có nút <i>🚪 Kéo cửa cuốn</i>: chỉ khách quen gọi cửa mới vào, đỡ lộ hơn. Quán vắng thì bấm <i>⏩</i> trên cùng để tua nhanh.`]],
      ['🖥️ Máy chủ & thẻ', [`<b>🖥️ Máy tính chủ:</b> bấm màn hình ở quầy hoặc nút Máy chủ để mở Bảng tin phố, Đánh giá, Ngân hàng, Vay nóng và Tài xỉu. Đọc tin cúp điện, game hot, trend trước khi mở cửa. Đánh giá chưa trả lời ở trên cùng; trả lời nhanh hoặc tự viết tối đa ${C.HOST_REPLY_MAX_LENGTH} ký tự và chọn thái độ. Nháp giữ khi đổi app trong cửa sổ máy chủ; đóng máy chủ bỏ nháp. Rep một lần, không đổi sao cũ; xin lỗi rồi làm tốt ở lần ghé sau mới thêm thiện cảm. Cà khịa làm mất thiện cảm. Quán tạm dừng khi mở máy chủ; trả lời, vay/trả nợ và tự chơi tài xỉu thực hiện buổi sáng.`,
        `<b>🎲 Tài xỉu tiền game:</b> nhập tiền nguyên tùy ý, không giới hạn lượt; 3–10 Tài / 11–18 Xỉu, ra bộ ba thì cả hai cửa thua, thắng nhận tổng x${C.HOST_DICE_PAYOUT} gồm vốn. Kết quả lưu trước khi quay. Chơi nhiều/cược lớn tăng nghi ngờ, bị bắt thì phạt theo tiền cao nhất ngày. Trong ca dùng app giới thiệu một lần mỗi khách người lớn; khách có tiền riêng, có thể từ chối hoặc thưởng một phần lãi khi thắng. Giới thiệu bị phát hiện còn đình chỉ 1 ngày, vẫn trả mặt bằng/lãi. Dán bảng cấm chặn khách đặt mới, giải quyết lượt đã cược, không xóa nghi ngờ. Một ngày không cược mới giảm nghi ngờ.`,
        `<b>🎴 ${CARD_COPY.app}:</b> ${CARD_COPY.help}`]],
    ])}
    <p class="hint">Khách vui thì cho tip và tăng đánh giá ★ — đánh giá càng cao càng đông khách. Phím tắt: giữ <kbd>Space</kbd> để nạp/nấu, <kbd>Esc</kbd> để đóng.</p>`,
    actions: [{ label: 'Hiểu rồi!', cls: 'primary', onClick: () => closeModal() }],
    onClose: () => { if (playing && !wasPaused && R && !R.over) setPause(false); },
  });
  bindHowtoTabs(m.card);
}

// ---------- Menu gọn cho điện thoại ----------
// Điện thoại không đủ chỗ cho cả hàng nút phụ: gom vào một nút ☰
function openMenu() {
  const playing = R && !R.over;
  const wasPaused = playing && R.paused;
  if (playing) setPause(true);
  const items = [['host', '🖥️ Máy chủ', openHost], ['howto', '📖 Cách chơi', openHowTo], ['sound', '🔊 Âm thanh', openSound],
    ...(playing ? [] : [['cloud', '☁️ Bản lưu', openCloud]]), ['title', '🏠 Về tiêu đề', returnToTitle]];
  const m = openModal({ title: '☰ Menu', cls: 'modal-menu',
    body: `<p class="muted small">${esc(S.shopName)} · ngày ${dayText()}</p><div class="menu-list">${items.map(([id, label]) => `<button class="btn" data-menu="${id}">${label}</button>`).join('')}</div>`,
    actions: [{ label: 'Đóng', cls: 'ghost', onClick: closeModal }],
    onClose: () => { if (playing && !wasPaused && R && !R.over) setPause(false); } });
  m.card.addEventListener('click', e => {
    const b = e.target.closest('[data-menu]');
    if (!b) return;
    closeModal();
    items.find(x => x[0] === b.dataset.menu)[2]();
  });
}

// ---------- Cài đặt âm thanh ----------
// Lưu riêng trên máy này (sfx.js), không nằm trong bản lưu game.
function openSound() {
  const playing = R && !R.over;
  const wasPaused = playing && R.paused;
  if (playing) setPause(true);
  const p = SFX.prefs();
  const row = (key, volKey, label) => `<div class="sound-row"><label><input type="checkbox" data-sound-on="${key}" ${p[key] ? 'checked' : ''}> ${label}</label>
    <input type="range" min="0" max="100" step="5" value="${Math.round(p[volKey] * 100)}" data-sound-vol="${volKey}" aria-label="Âm lượng ${label.toLowerCase()}">
    <b data-sound-pct="${volKey}">${Math.round(p[volKey] * 100)}%</b></div>`;
  const box = openModal({
    title: '🔊 Âm thanh',
    body: `${row('music', 'musicVol', 'Nhạc nền')}${row('sfx', 'sfxVol', 'Tiếng hiệu ứng')}
      <p class="muted small">Cài đặt lưu trên trình duyệt này, không đi theo bản lưu quán.</p>`,
    actions: [{ label: 'Xong', cls: 'primary', onClick: () => closeModal() }],
    onClose: () => { if (playing && !wasPaused && R && !R.over) setPause(false); },
  }).card;
  box.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.soundOn) SFX.setPrefs({ [t.dataset.soundOn]: t.checked });
    if (t.dataset.soundVol) {
      SFX.setPrefs({ [t.dataset.soundVol]: Number(t.value) / 100 });
      box.querySelector(`[data-sound-pct="${t.dataset.soundVol}"]`).textContent = t.value + '%';
    }
  });
  // thả thanh trượt tiếng hiệu ứng thì kêu thử một tiếng
  box.addEventListener('change', e => { if (e.target.dataset.soundVol === 'sfxVol' || e.target.dataset.soundOn === 'sfx') SFX.play('coin'); });
}

// ---------- Chuyển bản lưu giữa hai trang / hai máy ----------
// Bộ nén đi kèm trang để máy gửi/nhận không phụ thuộc tính năng trình duyệt.
async function saveCode() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? SaveCode.encode(raw) : '';
}
async function readCode(code) {
  return SaveTransfer.isShort(code) ? SaveTransfer.read(code) : SaveCode.decode(code);
}
async function openTransfer() {
  let code = '';
  let exportError = '';
  try { code = await saveCode(); } catch (e) { exportError = e.message; }
  const body = el('div', 'transfer');
  body.innerHTML = `
    <h4>📤 Gửi quán sang máy khác</h4>
    ${code ? `<p class="hint">Tạo mã 6 ký tự rồi gửi cho máy nhận (nhắn tin, đọc qua điện thoại đều được). Cả hai máy cần internet. Mã dùng trong 24 giờ.</p>
      <button class="btn primary" data-create>Tạo mã 6 ký tự</button>
      <div data-short-result hidden>
        <input class="transfer-short-code" readonly aria-label="Mã chuyển quán 6 ký tự" spellcheck="false">
        <p class="hint" data-expiry></p>
        <button class="btn small" data-copy-short>📋 Chép mã</button>
      </div>
      <p class="hint">Ai có mã đều mở được bản sao quán. Chỉ gửi cho người bạn muốn chia sẻ.</p>
      <details><summary>Mã dài dự phòng · dùng khi không có internet</summary>
        <textarea class="code-box" readonly rows="2" aria-label="Mã quán đang chơi" spellcheck="false" autocapitalize="off" autocorrect="off">${code}</textarea>
        <button class="btn small" data-copy-long>Chép mã dài</button>
      </details>`
      : exportError ? `<p class="bad-text">Chưa lấy được mã: ${esc(exportError)}</p>` : '<p class="hint">Trang này chưa có quán nào để lấy mã.</p>'}
    <h4>📥 Dán mã để mở quán</h4>
    <p class="hint">Quán đang lưu ở trang này (nếu có) sẽ bị thay bằng quán trong mã.</p>
    <textarea class="code-box" data-in rows="2" aria-label="Mã bản lưu cần mở" placeholder="Nhập mã 6 ký tự (vd. K7M-Q2P) hoặc dán mã dài" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
    <p class="hint" data-working role="status" hidden></p>
    <p class="bad-text small" data-err role="alert" hidden></p>`;
  let active = true, busy = false;
  const inputBox = body.querySelector('[data-in]');
  const error = message => {
    const err = body.querySelector('[data-err]'); err.textContent = message; err.hidden = false;
  };
  const working = message => {
    busy = !!message;
    const status = body.querySelector('[data-working]'); status.textContent = message; status.hidden = !message;
    body.querySelectorAll('button,textarea').forEach(b => { b.disabled = busy; });
    m.card.querySelector('[data-import-button]').disabled = busy;
  };
  const m = openModal({
    title: '📦 Chuyển bản lưu', body, cls: 'modal-transfer',
    onClose: () => { active = false; },
    actions: [{ label: 'Đóng', cls: 'ghost', onClick: () => closeModal() },
      { label: 'Mở quán từ mã', cls: 'primary', id: 'transfer-import', onClick: async () => {
        if (busy) return;
        const before = localStorage.getItem(SAVE_KEY);
        working('Đang mở bản lưu…');
        try {
          const s = await readCode(inputBox.value);
          if (!active) return;
          if (localStorage.getItem(SAVE_KEY) !== before) throw new Error('Bản trên máy vừa thay đổi. Đóng rồi mở lại hộp chuyển bản lưu nhé.');
          const previous = S;
          try {
            if (before) localStorage.setItem('quan-net-backup-v1', before);
            S = s; normalizeSave(); CloudSave.save(S);
          } catch (e) { S = previous; throw e; }
          R = null; closeModal(); showPrep();
        } catch (e) { if (active) error(e.message); }
        finally { if (active) working(''); }
      } }],
  });
  m.card.querySelector('#transfer-import').setAttribute('data-import-button', '');
  let shortCode = '';
  const create = body.querySelector('[data-create]');
  if (create) create.addEventListener('click', async () => {
    if (busy) return;
    working('Đang tạo mã 6 ký tự…');
    body.querySelector('[data-err]').hidden = true;
    try {
      const result = await SaveTransfer.create(localStorage.getItem(SAVE_KEY));
      if (!active) return;
      shortCode = result.code;
      body.querySelector('[data-short-result]').hidden = false;
      body.querySelector('.transfer-short-code').value = SaveTransfer.format(shortCode);
      body.querySelector('[data-expiry]').textContent = 'Dùng đến ' + new Date(result.expiresAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) + '.';
      create.textContent = 'Lấy lại mã quán đang lưu';
      body.querySelector('[data-copy-short]').textContent = '📋 Chép mã';
    } catch (e) { if (active) error(e.message); }
    finally { if (active) working(''); }
  });
  const bindCopy = (button, box, value) => {
    if (!button) return;
    button.addEventListener('click', async () => {
      let copied = false;
      const text = value();
      if (navigator.clipboard) {
        try { await navigator.clipboard.writeText(text); copied = true; } catch (_) { /* chọn mã để chép */ }
      }
      if (!copied) {
        box.focus(); box.select(); box.setSelectionRange(0, box.value.length);
        try { copied = document.execCommand('copy'); } catch (_) { /* chép thủ công */ }
      }
      button.textContent = copied ? '✓ Đã chép toàn bộ mã' : 'Chưa chép được — hãy chép đoạn mã đang chọn';
    });
  };
  bindCopy(body.querySelector('[data-copy-short]'), body.querySelector('.transfer-short-code'), () => shortCode);
  bindCopy(body.querySelector('[data-copy-long]'), body.querySelector('details .code-box'), () => code);
  inputBox.addEventListener('input', () => { body.querySelector('[data-err]').hidden = true; });
}

// ---------- Tài khoản và bản lưu trực tuyến ----------
function refreshContinue() {
  const playing = !!(R && !R.over);
  const saved = playing ? S : loadGame();
  $('#title-session').hidden = !playing;
  $('#btn-transfer').disabled = playing || CloudSave.state().busy || CloudSave.state().blocked;
  $('#title-cloud').disabled = playing || CloudSave.state().busy || CloudSave.state().blocked;
  $('#btn-continue').hidden = !saved;
  $('#btn-continue').innerHTML = saved?.shopName
    ? `Chơi tiếp<small>${esc(saved.shopName)} · ngày ${saved.day}</small>` : 'Chơi tiếp';
}
function acceptCloudSave(before) {
  const after = localStorage.getItem(SAVE_KEY);
  refreshContinue();
  if (before === after) return;
  S = loadGame(); R = null;
  if (S) { normalizeSave(); renderPrep(); }
  else showScreen('title');
}
function openCloud() {
  if (R && !R.over) return;
  const body = el('div', 'cloud-panel');
  body.innerHTML = `<p>Chơi ngay vẫn tự lưu trên máy. Liên kết email để chơi tiếp trên thiết bị khác.</p>
    <p class="cloud-message note" role="status" aria-live="polite"></p>
    <div data-cloud-login>
      <form data-cloud-form><label>Email<input type="email" name="email" autocomplete="email" required placeholder="ban@gmail.com"></label>
        <label>Mật khẩu (ít nhất 6 ký tự)<input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
        <button class="btn primary" type="submit" data-mode="login">Đăng nhập</button>
        <button class="btn" type="submit" data-mode="signup">Tạo tài khoản</button></form>
      <p class="hint">Lần đầu thì bấm "Tạo tài khoản". Nhớ kỹ mật khẩu, quên thì phải nhờ chủ quán đặt lại.</p>
    </div>
    <div data-cloud-account hidden><p data-cloud-email></p>
      <button class="btn primary" data-cloud-sync>Đồng bộ ngay</button>
      <button class="btn ghost" data-cloud-signout>Ngắt đồng bộ trên máy này</button></div>
    <div data-cloud-conflict hidden><h3>Chọn bản muốn giữ</h3><p>Bản được chọn sẽ thay thế bản còn lại. Game giữ bản trên máy trước khi tải về làm dự phòng.</p>
      <div class="cloud-choices"><div><b>Trên máy này</b><p data-cloud-local></p><button class="btn" data-cloud-choose="local">Giữ bản trên máy</button></div>
      <div><b>Trên tài khoản</b><p data-cloud-remote></p><button class="btn" data-cloud-choose="cloud">Dùng bản trên tài khoản</button></div></div></div>
    <p class="hint">Tiến độ được lưu tại các mốc cũ của game: chuẩn bị quán và hết ngày. Đóng giữa ngày không lưu toàn bộ ca đang chơi.</p>`;
  let unsubscribe;
  const m = openModal({ title: '☁️ Lưu & đồng bộ', body, dismissable: false,
    actions: [{ label: 'Xong', cls: 'ghost', id: 'cloud-done', onClick: closeModal }],
    onClose: () => unsubscribe?.() });
  const describe = s => s ? `${s.shopName || 'Quán chưa đặt tên'} · ngày ${s.day} · ${money(s.money)}` : 'Chưa có bản lưu';
  const render = () => {
    const st = CloudSave.state();
    body.querySelector('.cloud-message').textContent = st.status;
    body.querySelector('[data-cloud-login]').hidden = st.signedIn;
    body.querySelector('[data-cloud-account]').hidden = !st.signedIn;
    body.querySelector('[data-cloud-email]').textContent = st.email;
    body.querySelector('[data-cloud-conflict]').hidden = !st.conflict;
    body.querySelector('[data-cloud-local]').textContent = describe(st.local);
    body.querySelector('[data-cloud-remote]').textContent = describe(st.remote);
    m.card.querySelectorAll('button,input').forEach(b => { b.disabled = st.busy || st.blocked; });
  };
  const listener = () => { if (body.isConnected) render(); };
  window.addEventListener('cloud-save-status', listener);
  unsubscribe = () => window.removeEventListener('cloud-save-status', listener);
  const action = async fn => {
    const before = localStorage.getItem(SAVE_KEY);
    try { await fn(); acceptCloudSave(before); } catch { /* Lỗi được hiển thị ở dòng trạng thái. */ }
    render();
  };
  body.querySelector('[data-cloud-form]').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, create = e.submitter?.dataset.mode === 'signup';
    action(() => CloudSave.signIn(f.email.value, f.password.value, create));
  });
  body.querySelector('[data-cloud-sync]').addEventListener('click', () => action(() => CloudSave.sync(true)));
  body.querySelector('[data-cloud-signout]').addEventListener('click', () => action(() => CloudSave.signOut()));
  body.querySelectorAll('[data-cloud-choose]').forEach(b => b.addEventListener('click', () => action(() => CloudSave.choose(b.dataset.cloudChoose))));
  render();
}

// ---------- Khởi động ----------
function init() {
  $('#title-scene').innerHTML = ART.titleSVG([1,2,3].map(t => [TIERS[t].short,money(TIERS[t].rate)+'/h']));
  const tabs = [...document.querySelectorAll('[data-prep-tab]')];
  const selectTab = b => tabs.forEach(t => {
    const active = t === b;
    t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
    $('#pr-'+t.dataset.prepTab).hidden = !active;
  });
  tabs.forEach((b,i) => {
    b.addEventListener('click', () => selectTab(b));
    b.addEventListener('keydown', e => {
      const j = e.key === 'ArrowRight' ? (i+1)%4 : e.key === 'ArrowLeft' ? (i+3)%4 : e.key === 'Home' ? 0 : e.key === 'End' ? 3 : -1;
      if (j < 0) return;
      e.preventDefault(); selectTab(tabs[j]); tabs[j].focus();
    });
  });
  const saved = loadGame();
  $('#btn-continue').hidden = !saved;
  if (saved) {
    $('#btn-continue').innerHTML = saved.shopName
      ? `Chơi tiếp<small>${esc(saved.shopName)} · ngày ${saved.day}</small>` : 'Chơi tiếp';
  }
  $('#btn-continue').addEventListener('click', () => {
    if (R && !R.over) {
      closeModal();
      showScreen('play');
      setPause(titleWasPaused);
      return;
    }
    const s = loadGame();
    if (!s) return;
    S = s;
    normalizeSave();
    if (S.shopName) return showPrep();
    // file lưu cũ chưa có tên quán
    askShopName({ title: '🏪 Quán mình tên gì?', initial: 'Quán Nét Bất Ổn',
      onDone: name => { S.shopName = name; saveGame(); showPrep(); } });
  });
  $('#btn-new').addEventListener('click', () => {
    const start = () => askShopName({
      title: '🏪 Đặt tên cho quán', canCancel: true,
      onDone: name => { newGame(name); saveGame(); showPrep(); },
    });
    if (!loadGame()) return start();
    openModal({
      title: 'Chơi mới?', body: '<p>Quán hiện tại sẽ bị xóa và bắt đầu lại từ ngày 1.</p>',
      actions: [{ label: 'Thôi', cls: 'ghost', onClick: () => closeModal() }, { label: 'Chơi mới', cls: 'primary', onClick: start }],
    });
  });
  $('#btn-transfer').addEventListener('click', openTransfer);
  document.querySelectorAll('[data-action="title"]').forEach(b => b.addEventListener('click', returnToTitle));
  document.querySelectorAll('[data-action="host"]').forEach(b => b.addEventListener('click', openHost));
  $('#prep-scene').addEventListener('click', e => { if (e.target.closest('[data-hit="host"]')) openHost(); });
  for (const id of ['scene', 'prep-scene']) $('#'+id).addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-hit="host"]')) { e.preventDefault(); openHost(); }
  });
  document.querySelectorAll('[data-action="cloud"]').forEach(b => b.addEventListener('click', openCloud));
  window.addEventListener('cloud-save-status', e => {
    const st = e.detail;
    document.querySelectorAll('.cloud-status').forEach(n => { n.textContent = st.status; });
    for (const id of ['btn-new','btn-continue','btn-open','btn-transfer','title-cloud']) $('#'+id).disabled = st.busy || st.blocked || (['btn-transfer','title-cloud'].includes(id) && R && !R.over);
    if (st.blocked) {
      if (R && !R.over) setPause(true);
      openModal({ title: 'Game đang mở ở tab khác', body: '<p>'+esc(st.status)+'</p>', dismissable: false,
        actions: [{ label: 'Tải lại trang', cls: 'primary', onClick: () => { allowLeave = true; location.reload(); } }] });
    }
  });
  CloudSave.init().then(refreshContinue).catch(() => {}).finally(() => {
    document.querySelectorAll('.cloud-status').forEach(n => { n.textContent = CloudSave.state().status; });
  });
  $('#btn-rename').addEventListener('click', () => askShopName({
    title: '✏️ Đổi tên quán', initial: S.shopName, canCancel: true,
    onDone: name => { S.shopName = name; saveGame(); renderPrep(); },
  }));
  $('#maps').addEventListener('click', e => { if (e.target.closest('#btn-all-reviews')) openAllReviews(); });
  document.querySelectorAll('[data-action="howto"]').forEach(b => b.addEventListener('click', openHowTo));
  document.querySelectorAll('[data-action="menu"]').forEach(b => b.addEventListener('click', openMenu));
  document.querySelectorAll('[data-action="sound"]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openSound(); }));
  $('#btn-open').addEventListener('click', startDay);
  $('#prep-costs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.net) changeNet(b.dataset.net);
    else if (b.dataset.payBill != null) payBill();
    else if (b.dataset.borrow) borrow(b.dataset.borrow, +b.dataset.amt);
    else if (b.dataset.repay) repay(b.dataset.repay, +b.dataset.amt);
  });
  $('#prep-staff').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.hire != null) hireStaff();
    else if (b.dataset.train) trainStaff(+b.dataset.train);
    else if (b.dataset.fire) askFireStaff(+b.dataset.fire);
  });
  $('#prep-staff').addEventListener('change', e => {
    if (e.target.matches('[data-wage]')) setStaffWage(+e.target.dataset.wage, e.target.value);
  });
  $('#prep-accounts').addEventListener('toggle', e => { if (e.target.classList.contains('account-fold')) accountsOpen = e.target.open; }, true);
  $('#prep-accounts').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.hireAccountant != null) hireAccountant();
    else if (b.dataset.payTax != null) payTax();
  });
  $('#prep-accounts').addEventListener('change', e => {
    if (!e.target.matches('[data-auto-tax]') || !accountantActive()) return;
    S.accountant.autoTax = e.target.checked;
    saveGame();
    renderPrep();
  });
  $('#coach').addEventListener('click', e => { if (e.target.closest('[data-coach-skip]')) S.onboard.done = true; });
  $('#prep-quests').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled || !b.dataset.cardMilestone) return;
    const got = claimCardMilestones(b.dataset.cardMilestone);
    if (got) { SFX.play('levelUp'); VFX.burst(b); fx(b, '+' + money(got), 'good'); }
    renderPrep();
  });
  $('#prep-waste').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.sellWaste != null) { sellWaste(); renderPrep(); }
    else if (b.dataset.bargainWaste != null) bargainWaste();
  });
  $('#prep-waste').addEventListener('change', e => {
    if (!e.target.matches('[data-min-sale]') || !accountantActive()) return;
    const raw = e.target.value.trim(), value = Number(raw);
    S.accountant.minSale = raw && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
    saveGame();
    renderPrep();
  });
  // nút ở thanh hạ tầng và thẻ khách được vẽ lại liên tục: bắt chạm lúc ấn xuống
  PlayScene.onTap($('#infra'), t => t.closest('[data-infra]'), b => {
    if (!b || !R || R.over) return;
    if (b.dataset.infra === 'ac') toggleAc();
    else if (b.dataset.infra === 'gen') toggleGen();
  });
  PlayScene.onTap($('#queue'), t => t.closest('[data-cid]'), card => {
    const c = card && R && R.queue.find(x => x.id === +card.dataset.cid);
    if (c) onQueueClick(c, $(`#queue [data-cid="${c.id}"]`) || $('#queue'));
  });
  $('#staff-task-btn').addEventListener('click', () => openStaffTask(nextStaffTask()));
  $('#btn-catch-thief').addEventListener('click', () => { if (R && !R.over && R.escape) catchThief(); });
  $('#btn-noise').addEventListener('click', () => { if (R && !R.over) openNoise(R.pcs.find(p => p.cust?.noisy)); });
  $('#btn-pause').addEventListener('click', () => setPause(!R.paused));
  $('#btn-speed').addEventListener('click', cycleSpeed);
  $('#btn-close').addEventListener('click', () => {
    if (!R || R.over) return;
    if (!R.closing) return openCloseMenu();
    closeModal();
    const wasPaused = R.paused;   // đang chuẩn bị đóng: hỏi lại trước khi mời hết khách về
    setPause(true);
    const refund = R.pcs.reduce((s, p) => s + (p.cust && !p.cust.awaitingLoad ? refundFor(p.cust) : 0), 0);
    openModal({ title: '🔒 Đóng cửa ngay?',
      body: `<p>Mời hết khách về${refund ? ` và hoàn <b>${money(refund)}</b> tiền giờ chưa chơi` : ''}.</p>`,
      actions: [{ label: 'Thôi', cls: 'ghost', onClick: closeModal },
        { label: '🔒 Đóng ngay', cls: 'primary', onClick: () => { closeModal(); closeNow(); } }],
      onClose: () => { if (R && !R.over && !wasPaused) setPause(false); } });
  });
  $('#btn-reopen').addEventListener('click', () => { if (R && !R.over && R.closing) reopen(); });
  $('#btn-shutter').addEventListener('click', toggleShutter);
  PlayScene.mount($('#scene'), $('#rows'), sceneHandlers);
  $('#stock-list').addEventListener('click', e => {
    const b = e.target.closest('[data-buy], [data-near], [data-trash]');
    if (!b) return;
    if (b.dataset.buy) buyStock(b.dataset.buy, false);
    else if (b.dataset.near) buyStock(b.dataset.near, true);
    else trashExpired(b.dataset.trash);
  });
  $('#upgrade-list').addEventListener('click', e => { const b = e.target.closest('[data-up]'); if (b) buyUpgrade(b.dataset.up); });
  $('#game-list').addEventListener('click', e => { const b = e.target.closest('[data-game]'); if (b) buyGame(b.dataset.game); });
  $('#machine-list').addEventListener('click', e => {
    if (e.target.closest('[data-buy-pc]')) return buyMachine();
    const restock = e.target.closest('[data-restock]');
    if (restock) return restock.disabled || restockPart(+restock.dataset.restock);
    const fix = e.target.closest('[data-fix], [data-replace]');
    if (fix) return fix.disabled || fixWear(+(fix.dataset.fix ?? fix.dataset.replace), fix.dataset.replace != null);
    const row = e.target.closest('[data-mc]');
    if (row) openMachine(+row.dataset.mc);
  });

  // Chạm giữ trên chữ: không bôi đen, không hiện menu copy / tìm Google (trừ ô nhập tên, ô mã bản lưu)
  const typing = t => t.closest && t.closest('input, textarea, [contenteditable]');
  document.addEventListener('contextmenu', e => { if (!typing(e.target)) e.preventDefault(); });
  document.addEventListener('selectstart', e => { if (!typing(e.target)) e.preventDefault(); });
  COMPACT_MQ.addEventListener('change', syncSceneCrop);
  // Ấn hơi lâu trên điện thoại thành "chạm giữ": trình duyệt không gửi click nên nút như bị liệt.
  // Nhấc tay trên đúng nút mà vẫn chưa có click thì bấm hộ. Bỏ qua nút giữ (nạp/nấu/rót)
  // và các vùng đã tự bắt chạm (data-tap: cảnh, thẻ khách, chọn máy, thanh hạ tầng).
  const LONG_PRESS_MS = 400;
  let press = null;
  document.addEventListener('pointerdown', e => {
    const b = e.pointerType === 'mouse' ? null : e.target.closest('button');
    press = b && !b.classList.contains('hold') && !b.closest('[data-tap]')
      ? { b, x: e.clientX, y: e.clientY, id: e.pointerId, t: e.timeStamp, clicked: false } : null;
  }, true);
  document.addEventListener('pointercancel', () => { press = null; }, true);
  document.addEventListener('click', () => { if (press) press.clicked = true; }, true);
  document.addEventListener('pointerup', e => {
    const p = press;
    press = null;
    if (!p || p.id !== e.pointerId || e.timeStamp - p.t < LONG_PRESS_MS) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 16) return;
    press = p;   // chờ xem click thật có tới không
    setTimeout(() => {
      if (press === p) press = null;
      if (!p.clicked && p.b.isConnected && !p.b.disabled) p.b.click();
    }, 80);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;   // đang gõ tên quán
    if (e.code === 'Space' && modal) {
      e.preventDefault();
      if (!e.repeat && modal.holdBtn && modal.holdBtn.isConnected) modal.holdBtn._startHold();
    }
    if (e.key === 'Escape' && modal && modal.dismissable) closeModal();
  });
  document.addEventListener('keyup', e => { if (e.code === 'Space') stopHold(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && R && !R.over) setPause(true); });
  // ca đang chạy chỉ lưu khi đóng cửa: rời trang giữa chừng thì hỏi lại, kẻo mất trắng cả ngày
  window.addEventListener('beforeunload', e => {
    if (allowLeave || !R || R.over) return;
    e.preventDefault();
    e.returnValue = '';
  });
  window.addEventListener('blur', stopHold);

  requestAnimationFrame(t => { lastFrame = t; requestAnimationFrame(tick); });
}

init();
