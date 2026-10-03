/* Mã chuyển quán 6 ký tự (vd. K7M-Q2P), không cần đăng nhập; bản lưu gốc vẫn ở trên máy.
   Mã 8 ký tự do bản game cũ tạo vẫn đọc được. */
(function (root) {
'use strict';
const normalize = code => String(code).replace(/[\s\u200B-\u200F\u2060\uFEFF-]/g, '').toUpperCase();
const CODE = /^[2-9A-HJ-NP-Z]{6}(?:[2-9A-HJ-NP-Z]{2})?$/;
const format = code => code.length === 6 ? code.slice(0, 3) + '-' + code.slice(3) : code;
const messages = {
  rate_limited: 'Thử quá nhiều lần. Đợi một phút rồi thử lại nhé.',
  not_found: 'Mã không tồn tại hoặc đã hết hạn. Xin mã mới từ máy gửi nhé.',
  invalid_save: 'Bản lưu chưa hợp lệ để tạo mã chuyển quán.',
  full: 'Chỗ chuyển bản lưu đang bận. Thử lại sau nhé.',
};
function createSaveTransfer({ config, codec, fetcher, timeoutMs = 12000, now = () => Date.now() }) {
  let cached = null;
  async function request(name, body) {
    if (!config?.url || !config.key) throw new Error('Chưa thiết lập chỗ chuyển bản lưu trực tuyến.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetcher(config.url + '/rest/v1/rpc/' + name, {
        method: 'POST', headers: { apikey: config.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.code === 'PGRST202' || data?.code === '42883') throw new Error('Chức năng mã ngắn chưa được bật trên máy chủ.');
        if (res.status === 429) throw new Error(messages.rate_limited);
        throw new Error('Chưa kết nối được chỗ chuyển bản lưu. Thử lại sau nhé.');
      }
      if (data?.error) throw new Error(messages[data.error] || 'Chưa chuyển được bản lưu. Thử lại nhé.');
      return data;
    } catch (e) {
      if (controller.signal.aborted) throw new Error('Kết nối quá lâu. Kiểm tra internet rồi thử lại nhé.');
      if (e instanceof TypeError) throw new Error('Cần internet để dùng mã ngắn. Kiểm tra mạng rồi thử lại nhé.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  return {
    isShort: code => /^(?:[A-Z0-9]{6}|[A-Z0-9]{8})$/.test(normalize(code)),
    format,
    async create(raw) {
      if (!raw) throw new Error('Máy này chưa có quán nào để tạo mã.');
      const saved = codec.encode(raw);
      if (cached?.saved === saved && Date.parse(cached.expiresAt) > now() + 60000) return cached;
      const data = await request('quan_net_create_transfer', { p_save_code: saved, p_len: 6 });
      if (!CODE.test(data?.code || '') || !Number.isFinite(Date.parse(data?.expires_at)) || Date.parse(data.expires_at) <= now()) {
        throw new Error('Máy chủ chưa trả về mã hợp lệ. Thử tạo mã lại nhé.');
      }
      cached = { code: data.code, expiresAt: data.expires_at, saved };
      return cached;
    },
    async read(code) {
      const short = normalize(code);
      if (!CODE.test(short)) throw new Error('Mã ngắn gồm 6 chữ và số (vd. K7M-Q2P), không có 0, 1, I hoặc O.');
      const data = await request('quan_net_read_transfer', { p_code: short });
      if (typeof data?.save_code !== 'string') throw new Error('Chưa tải được bản lưu từ mã này.');
      return codec.decode(data.save_code);
    },
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { createSaveTransfer };
else root.SaveTransfer = createSaveTransfer({ config: root.CLOUD_CONFIG, codec: root.SaveCode, fetcher: (...args) => fetch(...args) });
})(typeof globalThis !== 'undefined' ? globalThis : window);
