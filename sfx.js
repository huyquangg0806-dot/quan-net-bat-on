/* Quán Nét Bất Ổn — âm thanh tự tạo bằng Web Audio (không cần file mp3).
   Hiệu ứng ngắn: SFX.play('coin') · Âm kéo dài khi giữ nút: SFX.loop('sizzle') / SFX.stopLoop()
   Nhạc nền lofi tự chơi lặp. Dùng qua window.SFX. */
(() => {
'use strict';

const PREF_KEY = 'quan-net-audio-v1';
// sfxVol / musicVol: 0–1, nhân với mức gốc của từng kênh
let pref = { sfx: true, music: true, sfxVol: 1, musicVol: 1 };
try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch (_) { /* dùng mặc định */ }
const vol = v => Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
pref.sfxVol = vol(pref.sfxVol); pref.musicVol = vol(pref.musicVol);
const sfxLevel = () => (pref.sfx ? 0.55 * pref.sfxVol : 0);
const savePref = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (_) { /* bỏ qua */ } };

// Trình duyệt chỉ cho phát tiếng sau lần bấm đầu tiên, nên tạo AudioContext lúc đó
let ctx = null, master = null, sfxBus = null, musicBus = null, synthBus = null, noiseBuf = null;
function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = sfxLevel(); sfxBus.connect(master);
  // musicBus: núm vặn to/nhỏ chung cho nhạc (file hoặc tự chơi)
  musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  // synthBus: nhạc tự chơi đi qua bộ lọc bớt âm cao cho ấm + tiếng vọng nhẹ (delay có hồi tiếp)
  synthBus = ctx.createGain();
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 2200; warm.Q.value = 0.3;
  const echo = ctx.createDelay(1); echo.delayTime.value = 60 / BPM * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const echoTone = ctx.createBiquadFilter(); echoTone.type = 'lowpass'; echoTone.frequency.value = 1400;
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  synthBus.connect(warm); warm.connect(musicBus);
  warm.connect(echo); echo.connect(echoTone); echoTone.connect(fb); fb.connect(echo); echoTone.connect(wet); wet.connect(musicBus);
  // 1 giây tiếng rè trắng, dùng cho tiếng xèo xèo, tiếng đập
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// ---------- Viên gạch âm thanh ----------
// Một nốt: dao động (sine/square/triangle/sawtooth) + bao âm nhanh vào, tắt dần
function tone(freq, { t = 0, dur = 0.15, type = 'sine', vol = 0.3, to = null, bus = sfxBus, attack = 0.005 } = {}) {
  const at = ctx.currentTime + t;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(bus);
  o.start(at); o.stop(at + dur + 0.05);
}
// Tiếng rè lọc qua bộ lọc (bandpass/lowpass/highpass)
function noise({ t = 0, dur = 0.2, vol = 0.3, filter = 'bandpass', freq = 1000, q = 1, bus = sfxBus } = {}) {
  const at = ctx.currentTime + t;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = filter; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(at); s.stop(at + dur + 0.05);
}

// ---------- Bộ hiệu ứng ----------
const SOUNDS = {
  click: () => tone(1400, { dur: 0.04, type: 'triangle', vol: 0.12 }),
  coin: () => { tone(988, { dur: 0.09, type: 'square', vol: 0.12 }); tone(1319, { t: 0.07, dur: 0.28, type: 'square', vol: 0.12 }); },
  good: () => { tone(784, { dur: 0.12, type: 'triangle', vol: 0.22 }); tone(1047, { t: 0.08, dur: 0.2, type: 'triangle', vol: 0.22 }); },
  warn: () => tone(520, { dur: 0.16, type: 'triangle', vol: 0.2, to: 440 }),
  bad: () => { tone(330, { dur: 0.18, type: 'sawtooth', vol: 0.12, to: 220 }); tone(247, { t: 0.14, dur: 0.3, type: 'sawtooth', vol: 0.12, to: 150 }); },
  // chuông gió treo cửa khi khách vào
  door: () => [1568, 1319, 1760].forEach((f, i) => tone(f, { t: i * 0.09, dur: 0.6, vol: 0.09 })),
  // khách thua trận đập phím: 2 tiếng bộp
  smash: () => { noise({ dur: 0.08, vol: 0.5, filter: 'lowpass', freq: 600 }); tone(120, { dur: 0.12, vol: 0.4, to: 60 });
    noise({ t: 0.13, dur: 0.07, vol: 0.4, filter: 'lowpass', freq: 800 }); },
  // cúp điện: tiếng máy tắt trầm dần
  powerDown: () => { tone(440, { dur: 0.9, type: 'sawtooth', vol: 0.15, to: 40 }); noise({ dur: 0.15, vol: 0.25, freq: 3000 }); },
  powerUp: () => tone(60, { dur: 0.6, type: 'sawtooth', vol: 0.12, to: 520 }),
  // lên hạng máy / mua nâng cấp: hợp âm rải đi lên
  levelUp: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { t: i * 0.07, dur: 0.35, type: 'square', vol: 0.09 })),
  sparkle: () => [2093, 2637, 3136].forEach((f, i) => tone(f, { t: i * 0.05, dur: 0.18, vol: 0.08 })),
  // mở cửa quán buổi sáng: tiếng cửa cuốn kéo lên rồi tiếng chuông
  open: () => { noise({ dur: 0.7, vol: 0.18, freq: 500, q: 3 }); [659, 784, 1047].forEach((f, i) => tone(f, { t: 0.6 + i * 0.12, dur: 0.4, type: 'triangle', vol: 0.18 })); },
  close: () => [784, 659, 523, 392].forEach((f, i) => tone(f, { t: i * 0.14, dur: 0.45, type: 'triangle', vol: 0.18 })),
  police: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, { t: i * 0.22, dur: 0.2, type: 'square', vol: 0.08 }); },
};

let lastAt = {};
function play(name) {
  if (!pref.sfx || !ensure() || !SOUNDS[name]) return;
  const now = ctx.currentTime;
  if (now - (lastAt[name] || -1) < 0.06) return;   // nhiều tiếng giống nhau dồn một lúc thì chỉ kêu 1 lần
  lastAt[name] = now;
  SOUNDS[name]();
}
// Tiếng chung cho chữ bay (fx): chỉ kêu khi vừa rồi chưa có tiếng riêng nào
let lastSpecific = -1;
function cue(kind) {
  if (!ctx || ctx.currentTime - lastSpecific < 0.15) return;
  if (kind === 'money') play('coin');
  else if (kind === 'good' || kind === 'warn' || kind === 'bad') play(kind);
}
function special(name) { play(name); if (ctx) lastSpecific = ctx.currentTime; }

// ---------- Âm kéo dài khi giữ nút ----------
const LOOPS = {
  // nấu mì: xèo xèo
  sizzle: () => { const s = noiseSrc(); const f = filt('highpass', 2500, 0.7); return chain(s, f, 0.12); },
  // rót nước: tiếng chảy ồ ồ
  pour: () => { const s = noiseSrc(); const f = filt('bandpass', 900, 2);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = 300;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(); const n = chain(s, f, 0.18); n.extra = lfo; return n; },
  // nạp giờ: tiếng "tích tích" êm như máy đếm, cao dần rất nhẹ (tối đa nửa quãng tám)
  charge: () => {
    let k = 0;
    const tick = () => {
      const f = 520 * Math.pow(2, Math.min(k++, 24) / 48);
      tone(f, { dur: 0.08, vol: 0.07 });
      tone(f * 2, { dur: 0.03, vol: 0.015 });
    };
    tick();
    const id = setInterval(tick, 130);
    return { stop: () => clearInterval(id) };
  },
};
const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
const filt = (type, freq, q) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
function chain(src, f, vol) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.08);
  if (f) { src.connect(f); f.connect(g); } else src.connect(g);
  g.connect(sfxBus); src.start();
  return { src, g };
}
let looping = null;
function loop(name) {
  stopLoop();
  if (!pref.sfx || !ensure() || !LOOPS[name]) return;
  looping = LOOPS[name]();
}
function stopLoop() {
  if (!looping) return;
  if (looping.stop) { looping.stop(); looping = null; return; }
  const { src, g, extra } = looping, at = ctx.currentTime;
  g.gain.cancelScheduledValues(at);
  g.gain.setValueAtTime(g.gain.value, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
  src.stop(at + 0.12);
  if (extra) extra.stop(at + 0.12);
  looping = null;
}

// ---------- Nhạc nền lofi ----------
// Bộ hẹn giờ cứ 100ms xếp lịch trước các nốt sắp tới, nên nhạc không bị giật.
// Mỗi ô nhịp = 8 bước (nửa nhịp). Bài chạy vòng 16 ô nhịp:
//   ô 0–3 mở đầu (đàn + bass) · ô 4–11 đoạn chính (thêm giai điệu, trống) · ô 12–15 đoạn nghỉ (thưa lại)
// Giai điệu tự sáng tác lại mỗi vòng theo kiểu "hỏi – đáp", nên nghe lâu không bị lặp y hệt.
const BPM = 76, BEAT = 60 / BPM, STEP = BEAT / 2;
const PROGS = [
  [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],   // Fmaj7 Em7 Dm7 Cmaj7
  [[45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 64]],   // Am7 Dm7 G7 Cmaj7
];
const SCALE = [64, 67, 69, 72, 74, 76, 79, 81];      // ngũ cung Đô, quãng giữa (dễ nghe, không chói)
const RHYTHMS = [[0, 2, 3, 6], [0, 3, 4], [1, 2, 4, 6], [0, 4, 5], [0, 2, 6], [2, 3, 5]];
const COMPS = [[0, 3], [0, 5], [0, 3, 6], [1, 4], [0, 6]];   // chỗ đàn bấm hợp âm trong ô nhịp
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let musicTimer = null, nextAt = 0, step = 0, mood = 'calm';
let comp = COMPS[0], phrase = [], motif = null;

const chordAt = bar => PROGS[Math.floor(bar / 4) % 2][bar % 4];
// nốt gần n nhất thuộc hợp âm (để câu nhạc "đáp xuống" êm tai)
function snap(n, chord) {
  const pcs = chord.map(x => x % 12);
  for (let d = 0; d < 7; d++) for (const s of [n - d, n + d]) if (pcs.includes(s % 12) && s >= 62 && s <= 83) return s;
  return n;
}
// Sáng tác một câu 2 ô nhịp. Câu "đáp" lặp lại ô đầu của câu "hỏi" rồi kết khác đi.
function makePhrase(bar, answer) {
  const out = [];
  let idx = 2 + Math.floor(Math.random() * 4);
  for (let b = 0; b < 2; b++) {
    if (answer && motif && b === 0) { motif.forEach(n => out.push({ ...n })); idx = SCALE.indexOf(motif[motif.length - 1].n0); continue; }
    const rh = pick(RHYTHMS), chord = chordAt(bar + b);
    rh.forEach((s, k) => {
      idx = clamp((idx < 0 ? 3 : idx) + pick([-2, -1, -1, 0, 1, 1, 2]), 0, SCALE.length - 1);
      const n0 = SCALE[idx];
      const last = b === 1 && k === rh.length - 1;
      out.push({ step: b * 8 + s, n0, n: s === 0 || last ? snap(n0, chord) : n0, len: last ? 5 : 2 });
    });
  }
  if (!answer) motif = out.filter(n => n.step < 8);
  return out;
}

// Đàn piano điện: sóng sin + họa âm nhỏ, ngân rồi tắt dần
function keys(n, T, dur, vol) {
  tone(midi(n), { bus: synthBus, t: T, dur, vol, attack: 0.01 });
  tone(midi(n) * 2, { bus: synthBus, t: T, dur: dur * 0.4, vol: vol * 0.25, attack: 0.01 });
}
function scheduleStep(at, i) {
  const bar = Math.floor(i / 8), s = i % 8, sec = bar % 16;
  const part = sec < 4 ? 'intro' : sec < 12 ? 'main' : 'break';
  const chord = chordAt(bar), T = Math.max(0, at - ctx.currentTime);
  const busy = mood === 'busy';

  if (s === 0) {
    comp = part === 'break' ? [0] : pick(COMPS);
    if (bar % 2 === 0) phrase = makePhrase(bar, bar % 4 === 2);   // ô 0–1 hỏi, ô 2–3 đáp
  }
  // đàn hợp âm
  if (comp.includes(s)) chord.forEach((n, k) => keys(n, T + k * 0.012, s === comp[0] ? BEAT * 2.2 : BEAT * 1.1, 0.045));
  // bass: nốt gốc đầu ô nhịp, nốt năm cuối ô (đoạn nghỉ chỉ giữ nốt gốc)
  if (s === 0) tone(midi(chord[0] - 12), { bus: synthBus, t: T, dur: BEAT * 1.8, vol: 0.2, attack: 0.02 });
  if (s === 6 && part !== 'break') tone(midi(chord[2] - 12), { bus: synthBus, t: T, dur: BEAT * 0.9, vol: 0.14, attack: 0.02 });

  // trống nhẹ: chỉ có ở đoạn chính (buổi sáng chỉ có hi-hat lăn tăn)
  if (part === 'main' && busy) {
    if (s === 0 || (s === 5 && Math.random() < 0.5)) tone(95, { bus: synthBus, t: T, dur: 0.22, vol: 0.28, to: 42 });
    if (s === 2 || s === 6) noise({ t: T, dur: 0.16, vol: 0.05, filter: 'bandpass', freq: 1500, q: 0.6, bus: synthBus });
  }
  if (part !== 'intro' || busy) noise({ t: T, dur: 0.025, vol: (s % 2 ? 0.008 : 0.016) * (0.7 + Math.random() * 0.6), filter: 'highpass', freq: 8000, bus: synthBus });

  // giai điệu: đoạn mở đầu nghỉ, đoạn nghỉ thì thưa đi một nửa
  if (part !== 'intro' && (busy || sec >= 8)) {
    const local = (bar % 2) * 8 + s;
    for (const n of phrase) if (n.step === local && (part === 'main' || n.step % 4 === 0)) {
      tone(midi(n.n), { bus: synthBus, t: T, dur: STEP * n.len * 1.2, type: 'triangle', vol: 0.06, attack: 0.02 });
    }
  }
  // tiếng rè đĩa than lác đác
  if (Math.random() < 0.06) noise({ t: T + Math.random() * STEP, dur: 0.012, vol: 0.03, filter: 'highpass', freq: 3000, bus: synthBus });
}
function musicTick() {
  while (nextAt < ctx.currentTime + 0.25) {
    scheduleStep(nextAt, step++);
    // swing nhẹ: nửa nhịp lẻ hơi trễ cho có chất lofi
    nextAt += step % 2 ? STEP * 1.14 : STEP * 0.86;
  }
}
function fadeMusic(to, sec = 0.8) {
  if (!ctx) return;
  const at = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(at);
  musicBus.gain.setValueAtTime(musicBus.gain.value, at);
  musicBus.gain.linearRampToValueAtTime(to, at + sec);
}
let ducked = false;
const musicLevel = () => (ducked ? 0.25 : 0.6) * pref.musicVol;

// Có file nhạc (music/nhac-nen.mp3, tạo bằng tools/make-music.cjs) thì phát file lặp liền mạch;
// chưa tải xong hoặc không có file thì dùng nhạc tự chơi ở trên.
const TRACK_URL = 'music/nhac-nen.mp3';
let musicOn = false, track = null, trackSrc = null, trackTried = false;
function loadTrack() {
  if (trackTried) return;
  trackTried = true;
  fetch(TRACK_URL)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(b => new Promise((ok, fail) => ctx.decodeAudioData(b, ok, fail)))
    .then(buf => {
      track = buf;
      if (musicOn) { stopSynth(); startTrack(); }   // đang chơi nhạc tự tạo thì chuyển sang file
    })
    .catch(() => { /* không có file: giữ nhạc tự tạo */ });
}
// mp3 bị bộ nén chèn 1105 mẫu im lặng ở đầu và đệm thêm ở cuối → chỉ lặp đúng đoạn nhạc thật
// (bài dài 3256615 mẫu ở 44100Hz; nếu tạo lại bài với độ dài khác thì sửa số này)
const TRACK_START = 1105 / 44100, TRACK_END = (1105 + 3256615) / 44100;
function startTrack() {
  trackSrc = ctx.createBufferSource();
  trackSrc.buffer = track; trackSrc.loop = true;
  trackSrc.loopStart = TRACK_START; trackSrc.loopEnd = TRACK_END;
  trackSrc.connect(musicBus); trackSrc.start(0, TRACK_START);
}
function startSynth() {
  nextAt = ctx.currentTime + 0.1;
  musicTimer = setInterval(musicTick, 100);
  musicTick();
}
function stopSynth() { clearInterval(musicTimer); musicTimer = null; }
function startMusic() {
  if (!pref.music || !ensure() || musicOn) return;
  musicOn = true;
  loadTrack();
  if (track) startTrack(); else startSynth();
  fadeMusic(musicLevel(), 1.5);
}
function stopMusic() {
  if (!musicOn) return;
  musicOn = false;
  fadeMusic(0, 0.5);
  const src = trackSrc, timer = musicTimer;
  trackSrc = null; musicTimer = null;
  // để nhạc nhỏ dần hết rồi mới tắt hẳn
  setTimeout(() => { clearInterval(timer); if (src) src.stop(); }, 600);
}
// 'calm' (buổi sáng, tiêu đề) hoặc 'busy' (đang mở quán, có trống và giai điệu)
function setMood(m) { mood = m; }
// tạm dừng game thì nhạc nhỏ lại
function duck(on) { ducked = on; if (musicOn) fadeMusic(musicLevel(), 0.4); }

// ---------- Nút bật/tắt ----------
// Biểu tượng: 🔊 nhạc + tiếng · 🔉 chỉ tiếng · 🔇 tắt hết. Bấm nút mở cửa sổ Âm thanh trong game.js.
function mode() { return pref.music && pref.sfx ? 'all' : pref.sfx ? 'sfx' : pref.music ? 'music' : 'off'; }
const ICON = { all: '🔊', sfx: '🔉', music: '🎵', off: '🔇' };
const LABEL = { all: 'Âm thanh: nhạc + tiếng', sfx: 'Âm thanh: chỉ tiếng, tắt nhạc', music: 'Âm thanh: chỉ nhạc, tắt tiếng', off: 'Âm thanh: tắt' };
function renderButtons() {
  document.querySelectorAll('[data-action="sound"]').forEach(b => {
    b.textContent = ICON[mode()];
    b.title = LABEL[mode()];
    b.setAttribute('aria-label', LABEL[mode()]);
  });
}
// Đổi cài đặt (bật/tắt, âm lượng) từ cửa sổ Âm thanh của game; lưu ngay trên máy này.
function setPrefs(patch) {
  const before = pref.music;
  Object.assign(pref, patch);
  pref.sfx = !!pref.sfx; pref.music = !!pref.music;
  pref.sfxVol = vol(pref.sfxVol); pref.musicVol = vol(pref.musicVol);
  savePref();
  ensure();
  if (ctx) sfxBus.gain.value = sfxLevel();
  if (pref.music && !before) startMusic();
  else if (!pref.music) stopMusic();
  else if (musicOn) fadeMusic(musicLevel(), 0.2);
  renderButtons();
}
const prefs = () => ({ ...pref });

function init() {
  renderButtons();
  // lần bấm đầu tiên: mở khóa âm thanh và bật nhạc
  const unlock = () => { ensure(); startMusic(); };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });
  // tiếng "tách" nhỏ cho mọi nút bấm
  document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && !b.disabled && b.dataset.action !== 'sound') play('click');
  }, true);
  // chuyển tab / thu nhỏ trình duyệt thì im lặng
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

window.SFX = { play: special, cue, loop, stopLoop, setMood, duck, prefs, setPrefs };
})();
