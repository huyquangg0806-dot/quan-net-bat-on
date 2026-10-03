/* Chuyển bản lưu ngoại tuyến. Giữ định dạng Z và base64 của các bản cũ.
   Bộ nén fflate 0.8.3 đi kèm trang: https://github.com/101arrowz/fflate (MIT). */
(function (root) {
'use strict';
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_CODE = Math.ceil(MAX_BYTES * 4 / 3) + 4;
const clean = code => String(code).trim().replace(/^```(?:\w+)?\s*\n?/, '').replace(/```$/, '')
  .replace(/[\s\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '');
function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unbase64(code) {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(code)) throw new Error('Mã chứa ký tự lạ. Hãy dùng nút Chép mã rồi dán nguyên đoạn.');
  try { return Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0)); }
  catch (_) { throw new Error('Mã bị thiếu hoặc sai ký tự. Hãy chép lại đầy đủ.'); }
}
function validate(s) {
  if (!s || Array.isArray(s) || typeof s !== 'object' || typeof s.shopName !== 'string'
    || !Number.isInteger(s.day) || s.day < 1 || !Number.isFinite(s.money) || !Number.isFinite(s.rating)
    || !Array.isArray(s.machines) || !s.machines.length
    || !s.machines.every(m => Number.isInteger(m) || (m && typeof m === 'object' && !Array.isArray(m)))) {
    throw new Error('Mã không chứa bản lưu quán hợp lệ.');
  }
  return s;
}
function encode(raw) {
  // Chỉ bỏ khoảng trắng trong JSON; giữ toàn bộ dữ liệu và độ chính xác của số.
  const json = JSON.stringify(validate(JSON.parse(raw)));
  const bytes = fflate.strToU8(json);
  if (bytes.length > MAX_BYTES) throw new Error('Bản lưu quá lớn để chuyển bằng mã.');
  return 'Z' + base64(fflate.deflateSync(bytes, { level: 9 }));
}
function decode(code) {
  const t = clean(code);
  if (!t) throw new Error('Bạn chưa dán mã bản lưu.');
  if (t.length > MAX_CODE) throw new Error('Mã bản lưu quá dài.');
  let bytes = unbase64(t[0] === 'Z' ? t.slice(1) : t);
  try {
    if (t[0] === 'Z') bytes = fflate.inflateSync(bytes, { out: new Uint8Array(MAX_BYTES + 1) });
    if (bytes.length > MAX_BYTES) throw new Error('size');
    return validate(JSON.parse(fflate.strFromU8(bytes)));
  } catch (e) {
    if (e.message === 'Mã không chứa bản lưu quán hợp lệ.') throw e;
    throw new Error('Mã bị thiếu hoặc hỏng. Hãy dùng nút Chép mã trên máy gửi rồi dán lại.');
  }
}
root.SaveCode = { encode, decode };
if (typeof module !== 'undefined' && module.exports) module.exports = root.SaveCode;
})(typeof globalThis !== 'undefined' ? globalThis : window);
