/* Lưu trên máy và đồng bộ Supabase. Không biết hay thay đổi luật chơi. */
(function (root) {
'use strict';
const SAVE = 'quan-net-nho-v1', META = 'quan-net-cloud-v1', AUTH = 'quan-net-auth-v1';
const BACKUP = 'quan-net-backup-v1';
const canonical = v => JSON.stringify(v, function (_, x) {
  return x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x;
});
function validSave(s) {
  return s === null || (s && typeof s === 'object' && !Array.isArray(s)
    && Number.isInteger(s.day) && s.day > 0 && Number.isFinite(s.money)
    && Number.isFinite(s.rating) && Array.isArray(s.machines) && s.machines.length > 0
    && s.machines.every(m => typeof m === 'number' || (m && typeof m === 'object')));
}
function createCloudSave({ config, storage, fetcher, uuid, notify = () => {}, delay = 800 }) {
  const parse = key => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };
  let session = parse(AUTH), meta = parse(META), remote = null, conflict = false;
  let status = session ? 'Đang kiểm tra bản lưu trực tuyến…' : 'Chơi trên máy · chưa liên kết email';
  let busy = false, blocked = false, timer, serial = Promise.resolve(), generation = 0;
  const local = () => {
    const raw = storage.getItem(SAVE);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!validSave(s)) throw new Error('Bản lưu trên máy không hợp lệ. Hãy giữ bản sao trước khi tiếp tục.');
    return s;
  };
  const state = () => ({ status, busy, blocked, conflict, email: session?.user?.email || '',
    local: (() => { try { return local(); } catch { return null; } })(), remote: remote?.payload ?? null,
    remoteExists: !!remote, signedIn: !!session, updatedAt: remote?.updated_at || null });
  const report = message => { if (message) status = message; notify(state()); };
  const persistMeta = () => storage.setItem(META, JSON.stringify(meta));
  const persistSession = s => {
    if (!s?.access_token || !s.refresh_token || !s.user?.id) throw new Error('Phiên đăng nhập không hợp lệ.');
    session = { ...s, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + s.expires_in };
    storage.setItem(AUTH, JSON.stringify(session));
  };
  // Ghi kèm giờ để bấm "Đồng bộ ngay" thấy dòng trạng thái đổi.
  const synced = s => report(s === null ? 'Máy này chưa có quán nào để đưa lên. Chơi một ngày hoặc dán mã bản lưu nhé.'
    : 'Đã đồng bộ lên Supabase lúc ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  function locked() { if (blocked) throw new Error('Game đã thay đổi trong tab khác. Tải lại trang trước khi chơi tiếp.'); }
  function errorText(e) {
    if (e.code === '40001') return 'Có bản lưu mới trên thiết bị khác. Hãy chọn bản cần giữ.';
    if (e.code === 'PGRST205' || e.code === 'PGRST202' || e.code === '42P01') return 'Supabase chưa được tạo bảng lưu. Bản trên máy vẫn được giữ.';
    if (e.code === 'invalid_credentials') return 'Sai email hoặc mật khẩu. Chưa có tài khoản thì bấm "Tạo tài khoản".';
    if (e.code === 'user_already_exists' || e.code === 'email_exists') return 'Email này đã có tài khoản. Bấm "Đăng nhập" nhé.';
    if (e.code === 'weak_password') return 'Mật khẩu cần ít nhất 6 ký tự.';
    if (e.code === 'email_address_invalid' || e.code === 'validation_failed') return 'Email chưa đúng dạng, ví dụ ban@gmail.com.';
    if (e.status === 429) return 'Thử quá nhiều lần. Hãy đợi một phút rồi thử lại.';
    if (e.status === 401 || e.status === 403) return 'Phiên đăng nhập hết hạn hoặc chưa được cấp quyền. Hãy đăng nhập lại.';
    return e.status ? 'Chưa đồng bộ được với Supabase. Bản trên máy vẫn được giữ.' : e.message || 'Chưa kết nối được mạng.';
  }
  async function request(path, body, token) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetcher(config.url + path, { method: body === undefined ? 'GET' : 'POST',
        headers: { apikey: config.key, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) { const e = new Error('Yêu cầu chưa thành công.'); e.status = res.status; e.code = data?.error_code || data?.code; throw e; }
      return data;
    } catch (e) {
      if (!e.status) throw new Error('Mất kết nối. Bản trên máy vẫn được giữ; thử đồng bộ lại khi có mạng.');
      throw e;
    } finally { clearTimeout(timeout); }
  }
  async function token() {
    locked();
    if (!session) throw new Error('Cần đăng nhập email trước.');
    if ((session.expires_at || 0) * 1000 < Date.now() + 60000) {
      const g = generation, s = await request('/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
      if (g !== generation) throw new Error('Phiên đã thay đổi.');
      persistSession(s);
    }
    return session.access_token;
  }
  function adopt(row) {
    remote = row;
    meta = { userId: session.user.id, revision: row?.revision || 0, base: canonical(row?.payload ?? null), pending: null };
    persistMeta(); conflict = false;
  }
  function apply(payload) {
    if (!validSave(payload)) throw new Error('Bản trực tuyến không tương thích với game.');
    const old = storage.getItem(SAVE);
    if (old) storage.setItem(BACKUP, old);
    if (payload === null) storage.removeItem(SAVE); else storage.setItem(SAVE, JSON.stringify(payload));
  }
  async function readRemote() {
    const rows = await request('/rest/v1/quan_net_player_saves?select=user_id,payload,revision,operation_id,updated_at&user_id=eq.'
      + encodeURIComponent(session.user.id), undefined, await token());
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('Phản hồi bản lưu chưa hợp lệ.');
    const row = rows?.[0] || null;
    if (row && (row.user_id !== session.user.id || !validSave(row.payload) || !Number.isSafeInteger(row.revision))) throw new Error('Bản trực tuyến chưa được hỗ trợ.');
    return row;
  }
  async function push() {
    locked();
    if (!session || conflict || meta?.userId !== session.user.id) return;
    // Mỗi lần mạng thành công sẽ ghi tiếp bản mới nhất nếu người chơi vừa mua hàng.
    for (let n = 0; n < 5; n++) {
      const s = local();
      if (!meta.pending && canonical(s) === meta.base) { synced(s); return; }
      if (!meta.pending) { meta.pending = { payload: s, revision: meta.revision, id: uuid() }; persistMeta(); }
      const p = meta.pending, userId = session.user.id;
      const rows = await request('/rest/v1/rpc/quan_net_write_save', {
        p_payload: p.payload, p_expected_revision: p.revision, p_operation_id: p.id,
      }, await token());
      locked();
      const row = rows?.[0];
      if (!row || row.user_id !== userId || !Number.isSafeInteger(row.revision)) throw new Error('Phản hồi lưu chưa hợp lệ.');
      adopt(row);
    }
    schedule();
  }
  async function reconcile(allowApply) {
    if (!session) return;
    locked();
    const row = await readRemote(), s = local(), value = canonical(s), cloud = canonical(row?.payload ?? null);
    locked(); remote = row;
    const ours = meta?.userId === session.user.id;
    if (ours && meta.pending && row?.operation_id === meta.pending.id) adopt(row);
    if (ours && (row?.revision || 0) === meta.revision) { conflict = false; await push(); return; }
    if (value === cloud) { adopt(row); synced(s); return; }
    if (!row && (!meta || ours)) { adopt(null); await push(); return; }
    if (allowApply && ((ours && value === meta.base && !meta.pending) || (!meta && s === null))) {
      apply(row?.payload ?? null); adopt(row); report('Đã tải bản lưu từ Supabase'); return;
    }
    conflict = true; report('Có hai bản lưu khác nhau. Chọn bản muốn chơi tiếp.');
  }
  function run(fn) {
    const job = serial.then(async () => {
      locked(); busy = true; report();
      try { return await fn(); }
      catch (e) {
        if (e.code === '40001') {
          conflict = true;
          try { remote = await readRemote(); } catch { remote = null; }
        }
        report(errorText(e)); throw e;
      } finally { busy = false; report(); }
    });
    serial = job.catch(() => {}); return job;
  }
  function schedule() {
    clearTimeout(timer);
    if (session && !blocked) timer = setTimeout(() => run(() => reconcile(false)).catch(() => {}), delay);
  }
  function save(s) {
    locked();
    if (!validSave(s)) throw new Error('Không thể lưu dữ liệu không hợp lệ.');
    if (s === null) storage.removeItem(SAVE); else storage.setItem(SAVE, JSON.stringify(s));
    report(session ? 'Đã lưu trên máy · chờ đồng bộ' : 'Đã lưu trên máy · chưa liên kết email'); schedule();
  }
  async function choose(which) {
    return run(async () => {
      // Đọc lại ngay trước khi chọn; nếu có bản mới phải cho người chơi xem lại.
      const row = await readRemote();
      if ((row?.revision || 0) !== (remote?.revision || 0)) {
        remote = row; conflict = true; report('Bản trực tuyến vừa thay đổi. Xem lại rồi chọn một lần nữa.'); return false;
      }
      if (which === 'cloud') { apply(row?.payload ?? null); adopt(row); report('Đã tải bản lưu từ Supabase'); }
      else if (which === 'local') { adopt(row); await push(); }
      else throw new Error('Lựa chọn không hợp lệ.');
      return true;
    });
  }
  return {
    state, save, local, choose,
    init: () => run(() => reconcile(true)),
    sync: allowApply => run(() => reconcile(!!allowApply)),
    // create = true: tạo tài khoản mới; false: đăng nhập. Supabase đã tắt "Confirm email" nên không cần gửi thư.
    signIn: (email, password, create) => run(async () => {
      const body = { email: email.trim(), password };
      const s = await request(create ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', body);
      if (!s?.access_token) throw new Error('Tài khoản đang chờ xác nhận email. Hãy tắt "Confirm email" trong Supabase.');
      persistSession(s); generation++; await reconcile(true);
    }),
    signOut: () => run(async () => {
      // Ngắt đồng bộ, giữ save và chủ cũ để không tự tải lên tài khoản mới.
      if (!meta && session) { meta = { userId: session.user.id, revision: -1, base: 'null', pending: null }; persistMeta(); }
      generation++; session = null; storage.removeItem(AUTH); clearTimeout(timer);
      conflict = false; remote = null; report('Đã ngắt đồng bộ · bản lưu vẫn ở trên máy');
    }),
    externalChange: () => { blocked = true; generation++; clearTimeout(timer); report('Hãy đóng tab game khác, rồi tải lại trang này trước khi chơi tiếp.'); },
    retry: () => schedule(),
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { createCloudSave, canonical, validSave };
else {
  root.CloudSave = createCloudSave({ config: root.CLOUD_CONFIG, storage: localStorage,
    fetcher: (...a) => fetch(...a), uuid: () => crypto.randomUUID(),
    notify: detail => root.dispatchEvent(new CustomEvent('cloud-save-status', { detail })) });
  root.addEventListener('storage', e => { if ([SAVE, META, AUTH].includes(e.key) || e.key === null) root.CloudSave.externalChange(); });
  root.addEventListener('online', () => root.CloudSave.retry());
  // Một tab được quyền ghi trên mỗi trình duyệt, tránh hai ca chơi ghi chồng nhau.
  if (navigator.locks) navigator.locks.request('quan-net-save-writer-v1', { ifAvailable: true }, lock => {
    if (!lock) { root.CloudSave.externalChange(); return; }
    return new Promise(() => {});
  }).catch(() => root.CloudSave.externalChange());
}
})(typeof window === 'undefined' ? globalThis : window);
