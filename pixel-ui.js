/* Quán Nét Bất Ổn — đổi emoji trong giao diện thành icon pixel vẽ tay.
   Chữ trong data.js và game-*.js vẫn viết emoji như cũ (dễ đọc khi sửa code); khi hiện ra màn hình,
   emoji có icon thì thay bằng icon pixel, emoji hiếm không có icon thì bỏ đi.
   Lời thoại của khách (.speech, .talk) và chỗ có data-raw giữ nguyên emoji cho giống người thật nhắn.
   Cần pixel.js và pixel-sprites.js nạp trước. window.PXUI */
(() => {
'use strict';
const { PX, SPR } = window;

// emoji → tên icon trong SPR.ICON (nhiều emoji cùng nghĩa dùng chung một icon)
const MAP = {
  '💰': 'money', '💵': 'money', '💸': 'money', '🪙': 'money', '🧧': 'money',
  '⭐': 'star', '★': 'star', '🌟': 'star', '🏆': 'star',
  '⏱️': 'clock', '⏰': 'clock', '🕒': 'clock', '⌛': 'clock', '⏳': 'clock',
  '🖥️': 'pc', '💻': 'pc', '🖥': 'pc',
  '🍜': 'noodle', '🍳': 'noodle', '🥚': 'noodle', '🌭': 'noodle', '🍲': 'noodle',
  '🥤': 'drink', '☕': 'drink', '🧃': 'drink', '💧': 'drink',
  '🎴': 'card', '🃏': 'card',
  '⚠️': 'warn', '🚨': 'warn', '❗': 'warn',
  '🔧': 'tool', '🛠️': 'tool', '🔨': 'tool', '⚙️': 'tool',
  '🌙': 'night', '🌃': 'night', '😴': 'night', '💤': 'night',
  '🚪': 'door', '🎲': 'dice', '📢': 'megaphone', '📣': 'megaphone',
  '👮': 'police', '🦹': 'thief', '🧑‍🍳': 'chef', '⚡': 'bolt', '🛢️': 'fuel',
  '🧹': 'broom', '💬': 'chat', '💭': 'chat', '🗨️': 'chat', '❄️': 'snow',
  '✅': 'check', '✓': 'check', '✔️': 'check', '❌': 'cross', '✕': 'cross',
  '🔥': 'fire', '🚫': 'ban', '⛔': 'ban', '⌨️': 'keyboard', '🖱️': 'keyboard',
  '🏠': 'house', '🏪': 'house', '🏢': 'house',
  '👩': 'mom', '🙋': 'person', '👦': 'person', '👧': 'person', '🧔': 'person', '🧑': 'person', '👨': 'person', '👤': 'person', '👥': 'person',
  '☠️': 'skull', '💀': 'skull', '📍': 'pin', '🎯': 'target', '♻️': 'recycle', '📶': 'signal',
  '📒': 'book', '🎓': 'book', '📋': 'book', '📝': 'book', '🧾': 'book', '📖': 'book', '📊': 'book', '📈': 'book', '📉': 'book',
  '❤️': 'heart', '💝': 'heart', '💖': 'heart', '💔': 'heart',
  '📞': 'phone', '📱': 'phone', '🏦': 'bank', '👀': 'eye', '👁️': 'eye',
  '🔊': 'speaker', '🔈': 'speaker', '🔇': 'speaker', '🎵': 'speaker',
  '↩️': 'back', '🔁': 'back', '🔄': 'back',
  '🎉': 'party', '🎊': 'party', '🎁': 'party',
  '☁️': 'cloud', '🌤️': 'sun', '☀️': 'sun', '🌧️': 'cloud',
  '✨': 'sparkle', '🆕': 'sparkle', '💎': 'sparkle',
  '🔒': 'lock', '🔐': 'lock', '🔓': 'lock',
  '🎮': 'gamepad', '🕹️': 'gamepad', '🌡️': 'thermo', '💡': 'bulb', '📅': 'calendar', '🗓️': 'calendar',
  '📦': 'box', '🗄️': 'box', '🛒': 'box', '✏️': 'pencil', '⏩': 'ffwd', '⏸': 'pause', '⏸️': 'pause', '▶': 'play', '▶️': 'play',
  '🌐': 'globe', '🔋': 'battery',
  '🙂': 'smile', '😊': 'smile', '😄': 'smile', '😁': 'smile', '😋': 'smile', '🥳': 'smile', '🙌': 'smile', '🤝': 'smile', '👍': 'smile',
  '😕': 'sad', '😞': 'sad', '😭': 'sad', '😢': 'sad', '🥺': 'sad', '😟': 'sad', '😩': 'sad', '👎': 'sad',
  '😤': 'angry', '💢': 'angry', '😠': 'angry', '😡': 'angry', '🤬': 'angry',
  '🤢': 'sick', '🤮': 'sick', '😶': 'neutral', '🤫': 'neutral', '🙈': 'neutral', '😐': 'neutral', '🤔': 'neutral',
};
const ICONS = { ...SPR.ICON, ...SPR.FACES };
// bắt cả chuỗi emoji ghép (ZWJ) và dấu biến thể; ★ ✓ ✕ cũng là ký hiệu cần thay. Không đụng × (nhân, tốc độ 2×)
const RE = /\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*|[★✓✕]/gu;
const SKIP = 'svg, script, style, textarea, input, .speech, .talk, [data-raw], .avatar, .px-ic';

const url = name => PX.png(ICONS[name]);
function icon(name, alt = '') {
  const im = document.createElement('img');
  im.className = 'px-ic';
  im.src = url(name);
  im.alt = alt;
  im.setAttribute('aria-hidden', 'true');
  return im;
}
// Thay emoji trong một nút chữ; trả về true nếu có đổi
function swap(text) {
  const s = text.nodeValue;
  RE.lastIndex = 0;
  if (!RE.test(s)) return false;
  const parent = text.parentElement;
  if (!parent || parent.closest(SKIP)) return false;
  const frag = document.createDocumentFragment();
  let last = 0;
  s.replace(RE, (m, i) => {
    let before = s.slice(last, i);
    const name = MAP[m] || MAP[m.replace(/️/g, '')];
    if (name && ICONS[name]) {
      if (before) frag.append(before);
      frag.append(icon(name));
    } else if (before) frag.append(before);
    last = i + m.length;
    // emoji không có icon: bỏ luôn khoảng trắng ngay sau cho khỏi hụt chữ
    if (!name && s[last] === ' ') last++;
    return m;
  });
  if (last < s.length) frag.append(s.slice(last));
  text.replaceWith(frag);
  return true;
}
function iconize(root) {
  if (!root) return;
  if (root.nodeType === 3) { swap(root); return; }
  if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const list = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/[☀-➿⭐★✓✕]|[\uD83C-\uD83E]/.test(n.nodeValue)) list.push(n);
  list.forEach(swap);
}
// Chữ mới thêm vào màn hình (render lại, nhật ký, cửa sổ nổi) cũng được đổi ngay
const obs = new MutationObserver(muts => {
  for (const m of muts) {
    if (m.type === 'characterData') swap(m.target);
    else m.addedNodes.forEach(iconize);
  }
});
function start() {
  iconize(document.body);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

window.PXUI = { MAP, iconize, icon };
})();
