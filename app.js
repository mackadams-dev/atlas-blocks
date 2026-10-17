/* Atlas Blocks — original block characters, synthesized sounds, no tracking, works offline. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- settings & stats ---------- */
const DEF = { sound: true, volume: 0.7, praiseSounds: true, voice: '', rate: 0.85, pitch: 1.1,
  sections: { talk: true, hum: true, potty: true, play: true }, letterOnWords: true, captions: true,
  micSens: 'med', micHold: 350, sitCount: 20, towerGoal: 10, triesCount: false, calm: false, countMax: 10 };
const load = (k, d) => { try { return Object.assign(structuredCloneSafe(d), JSON.parse(localStorage.getItem(k) || '{}')); } catch { return structuredCloneSafe(d); } };
function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o)); }
const S = load('atlas.s', DEF); S.sections = Object.assign({}, DEF.sections, S.sections);
const ST = load('atlas.st', { tower: 0, towers: 0, potty: 0, tries: 0, asks: 0, hums: 0, words: 0, traces: 0, counts: 0, orders: 0, missions: 0 });
const save = () => { localStorage.setItem('atlas.s', JSON.stringify(S)); localStorage.setItem('atlas.st', JSON.stringify(ST)); };

/* ---------- audio (Web Audio, everything synthesized) ---------- */
let AC = null, master = null;
function audio() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    AC = new C(); master = AC.createGain(); master.connect(AC.destination);
  }
  if (AC.state === 'suspended') AC.resume();
  master.gain.value = S.sound ? S.volume : 0;
  return AC;
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function tone(freq, t0 = 0, dur = 0.25, type = 'triangle', vol = 0.35) {
  const ac = audio(); if (!ac || !S.sound) return;
  const t = ac.currentTime + t0, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
/* notes: [midi|null, beats] */
function melody(notes, bpm = 132, type = 'triangle', vol = 0.3) {
  const b = 60 / bpm; let t = 0;
  for (const [m, beats] of notes) { if (m != null) { tone(mtof(m), t, b * beats * 0.95, type, vol); tone(mtof(m + 12), t, b * beats * 0.5, 'sine', vol * 0.25); } t += b * beats; }
  return t * 1000;
}
const SND = {
  tap: () => tone(660, 0, 0.08, 'sine', 0.2),
  chime: () => melody([[72, .5], [76, .5], [79, .5], [84, 1.5]], 220, 'triangle', .3),
  soft: () => { tone(392, 0, .18, 'sine', .18); tone(330, .16, .25, 'sine', .15); },
  hello: () => melody([[67, .5], [72, .5], [76, .5], [79, 1]], 180),
  num: n => { const sc = [0, 2, 4, 7, 9]; const m = 60 + 12 * Math.floor((n - 1) / 5) + sc[(n - 1) % 5]; tone(mtof(Math.min(m, 96)), 0, .3, 'triangle', .3); },
  letter: ch => { const i = ch.toUpperCase().charCodeAt(0) - 65; const sc = [0, 2, 4, 5, 7, 9, 11]; tone(mtof(60 + 12 * Math.floor(i / 7) + sc[i % 7]), 0, .3, 'triangle', .28); },
  // original wash-hands jingle (about 10 seconds)
  wash: () => melody([[60, 1], [64, 1], [67, 1], [64, 1], [65, 1], [69, 1], [72, 2], [71, 1], [67, 1], [69, 1], [65, 1], [64, 1], [62, 1], [60, 2],
    [67, .5], [67, .5], [69, 1], [67, 1], [64, 1], [65, .5], [65, .5], [67, 1], [65, 1], [62, 1], [60, 1], [64, 1], [62, 1], [60, 3]], 150),
  tower: () => melody([[60, .5], [64, .5], [67, .5], [72, .5], [76, .5], [79, .5], [84, 2]], 200),
  talk: words => { for (let i = 0; i < Math.min(words, 6); i++) tone(mtof(rnd([64, 67, 69, 72])), i * .18, .14, 'sine', .22); }
};
/* clapping: short band-passed noise bursts with tiny reflections, many "hands" = applause */
let noiseBuf = null;
function noise() {
  const ac = audio(); if (noiseBuf) return noiseBuf;
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return noiseBuf;
}
function clapAt(t, vol = .5, f = 1400) {
  const ac = AC; const src = ac.createBufferSource(); src.buffer = noise();
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = .9;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t);
  [0, .008, .017].forEach((o, i) => { g.gain.linearRampToValueAtTime(vol * (1 - i * .25), t + o + .001); g.gain.exponentialRampToValueAtTime(.02, t + o + .007); });
  g.gain.exponentialRampToValueAtTime(.0001, t + .09);
  src.connect(bp); bp.connect(g); g.connect(master); src.start(t, Math.random() * 1.5); src.stop(t + .12);
}
function applause(sec = 2.2, people = 7) {
  const ac = audio(); if (!ac || !S.sound || !S.praiseSounds) return;
  const t0 = ac.currentTime + .02;
  for (let p = 0; p < people; p++) {
    const rate = .22 + Math.random() * .1, f = 1000 + Math.random() * 1200, v = .18 + Math.random() * .2;
    for (let t = Math.random() * .2; t < sec; t += rate * (0.9 + Math.random() * .2)) clapAt(t0 + t, v * (t > sec - .5 ? (sec - t) / .5 : 1), f);
  }
}
/* crowd cheer: formant-filtered noise "ahh" + gliding voices "woo!" */
function cheer(sec = 1.8) {
  const ac = audio(); if (!ac || !S.sound || !S.praiseSounds) return;
  const t = ac.currentTime + .02;
  [[750, 5, .5], [1200, 6, .35], [2500, 8, .15]].forEach(([f, q, v]) => {
    const s = ac.createBufferSource(); s.buffer = noise();
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .25);
    g.gain.setValueAtTime(v, t + sec * .5); g.gain.exponentialRampToValueAtTime(.0001, t + sec);
    s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + sec + .1);
  });
  for (let i = 0; i < 6; i++) {
    const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), f1 = ac.createBiquadFilter(), g = ac.createGain();
    const base = 260 + Math.random() * 260, st = t + Math.random() * .25;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * 1.6, st + .35); o.frequency.exponentialRampToValueAtTime(base * 1.1, st + sec * .8);
    lfo.frequency.value = 5 + Math.random() * 2; lg.gain.value = base * .03; lfo.connect(lg); lg.connect(o.frequency);
    f1.type = 'bandpass'; f1.frequency.value = 900; f1.Q.value = 2;
    g.gain.setValueAtTime(.0001, st); g.gain.exponentialRampToValueAtTime(.05, st + .15); g.gain.exponentialRampToValueAtTime(.0001, st + sec * .85);
    o.connect(f1); f1.connect(g); g.connect(master); o.start(st); lfo.start(st); o.stop(st + sec); lfo.stop(st + sec);
  }
}

/* ---------- speech (with fallback for tablets without voices) ---------- */
const TTS = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
function loadVoices() { if (TTS) voices = TTS.getVoices().filter(v => /^en/i.test(v.lang) || !v.lang); }
if (TTS) { loadVoices(); TTS.onvoiceschanged = loadVoices; setTimeout(loadVoices, 800); }
let toastT;
function caption(text, ms = 2200) {
  const t = $('#toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
/* Bundled voice clips (pre-made, work without any device text-to-speech).
   Order: whole phrase clip -> sentence clips -> word-group clips -> device speechSynthesis -> big words on screen + tones. */
const CLIPS = window.ATLAS_AUDIO || {};
const normKey = s => String(s).toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').trim().replace(/\s+/g, ' ');
function clipPlan(text) {
  const whole = normKey(text); if (!whole) return null;
  if (CLIPS[whole]) return [CLIPS[whole]];
  const plan = [];
  for (const part of String(text).split(/(?<=[.!?,])\s+/)) {
    const k = normKey(part); if (!k) continue;
    if (CLIPS[k]) { plan.push(CLIPS[k]); continue; }
    const w = k.split(' '); let i = 0;
    while (i < w.length) { // greedy longest word-group match
      let j = w.length; for (; j > i; j--) if (CLIPS[w.slice(i, j).join(' ')]) break;
      if (j === i) return null; plan.push(CLIPS[w.slice(i, j).join(' ')]); i = j;
    }
  }
  return plan.length ? plan : null;
}
let curAudio = null, sayToken = 0;
function stopSpeech() { sayToken++; if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } if (TTS) try { TTS.cancel(); } catch (e) {} }
function playSrc(src, rate, tok) {
  return new Promise(res => {
    if (tok !== sayToken) return res(false);
    const a = new Audio(src); curAudio = a; let done = false;
    const fin = ok => { if (!done) { done = true; res(ok); } };
    a.volume = Math.min(1, S.volume + .3);
    try { a.playbackRate = Math.max(.6, Math.min(1.3, rate / .85)); a.preservesPitch = true; } catch (e) {}
    a.onended = () => fin(true); a.onerror = () => fin(false);
    setTimeout(() => fin(true), 9000);
    const p = a.play(); if (p && p.catch) p.catch(() => fin(false));
  });
}
async function playClips(plan, rate) {
  stopSpeech(); const tok = sayToken;
  for (const f of plan) { if (tok !== sayToken) return true; if (!(await playSrc(`audio/${f}.mp3`, rate, tok))) return false; }
  return true;
}
function say(text, { show = S.captions, rate = S.rate, quiet = false } = {}) {
  const est = 600 + text.length * 75 / rate;
  if (show) caption(text, Math.max(1800, est + 400));
  if (!S.sound) return sleep(400);
  const plan = clipPlan(text);
  if (plan) return playClips(plan, rate).then(ok => ok ? undefined : sayDevice(text, { show, rate, quiet, est }));
  return sayDevice(text, { show, rate, quiet, est });
}
/* play a parent-recorded clip (Blob) */
function sayBlob(blob, text) {
  if (S.captions) caption(text, 2200);
  if (!S.sound) return sleep(400);
  stopSpeech(); const tok = sayToken; const u = URL.createObjectURL(blob);
  return playSrc(u, S.rate, tok).then(ok => { URL.revokeObjectURL(u); if (!ok) return say(text); });
}
function sayDevice(text, { show, rate, quiet, est }) {
  const hasVoice = TTS && (voices.length || TTS.getVoices().length);
  if (!hasVoice && quiet) return sleep(400);
  if (!hasVoice) { // fallback: big caption (always shown here) + friendly "talk" tones
    if (!show) caption(text, Math.max(1800, est));
    SND.talk(text.split(/\s+/).length); return sleep(Math.min(est, 2500));
  }
  return new Promise(res => {
    try {
      TTS.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = voices.find(v => v.voiceURI === S.voice) || voices.find(v => /en[-_]US/i.test(v.lang)) || voices[0];
      if (v) u.voice = v; u.lang = (v && v.lang) || 'en-US';
      u.rate = rate; u.pitch = S.pitch; u.volume = Math.min(1, S.volume + .3);
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = () => { SND.talk(3); fin(); };
      setTimeout(fin, est + 1500); // some engines never fire onend
      TTS.speak(u);
    } catch (e) { SND.talk(3); setTimeout(res, est); }
  });
}

/* ---------- original block characters ---------- */
const NB_COL = ['#e94f64', '#8e5bd9', '#f59b23', '#21a67a', '#2f86de', '#e4588f', '#14b0bf', '#f4c22b', '#6a7be8', '#ff7a45',
  '#3fbf60', '#c25fd1', '#1fa3a0', '#ef6f3c', '#5f8ef0', '#d9a21b', '#b6489a', '#2a9d8f', '#e05d5d', '#4a6fe3'];
const ncol = n => NB_COL[(n - 1) % NB_COL.length];
function numberBlock(n, c = 36, { label = true, cls = '' } = {}) {
  if (n === 0) return `<span class="nb ${cls}" style="--c:${c}px">${label ? `<span class="num">0</span>` : ''}<span class="cube" style="--h:transparent;border-style:dashed"></span></span>`;
  const cols = []; let left = n; while (left > 0) { cols.push(Math.min(10, left)); left -= 10; }
  const h = ncol(n);
  const colHtml = cols.map((k, ci) => `<span class="col">${Array.from({ length: k }, (_, i) =>
    `<span class="cube${ci === 0 && i === k - 1 ? ' face' : ''}" style="--h:${n > 10 && ci > 0 ? ncol(k) : h}">${ci === 0 && i === k - 1 ? '<i></i>' : ''}</span>`).join('')}</span>`).join('');
  return `<span class="nb ${cls}" style="--c:${c}px" aria-label="${n}">${label ? `<span class="num">${n}</span>` : ''}<span class="cols">${colHtml}</span></span>`;
}
const isVowel = ch => /[aeiou]/i.test(ch);
function letterBlock(ch, c = 84, cls = '') {
  return `<span class="lb ${isVowel(ch) ? 'vowel' : 'cons'} ${cls}" style="--c:${c}px" aria-label="${esc(ch)}"><span class="eyes"><s></s><s></s></span><b>${esc(ch)}</b></span>`;
}
const SOUNDS = { a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'hhh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'aw',
  p: 'puh', q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz' };
const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const TENW = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];
const nword = n => NUMW[n] || (n > 20 && n < 60 ? TENW[Math.floor(n / 10)] + (n % 10 ? '-' + NUMW[n % 10] : '') : String(n));

/* ---------- celebration: confetti + clapping hands + cheering blocks + applause + spoken praise ---------- */
const PRAISE = ['Yay Atlas!', 'Great job!', 'You did it!', 'Woo hoo!', 'Awesome!', 'Way to go!', 'High five!', 'Super!', 'Great job Atlas!', 'Good job Atlas!', 'Atlas, you did it!'];
const calm = () => S.calm || matchMedia('(prefers-reduced-motion: reduce)').matches;
let celebrating = 0;
function celebrate({ big = false, words = null, speak = true } = {}) {
  const fx = $('#fx'); const id = ++celebrating; fx.innerHTML = '';
  const text = words || rnd(PRAISE);
  if (!calm()) {
    const cols = ['#e94f64', '#f59b23', '#f4c22b', '#21a67a', '#2f86de', '#8e5bd9', '#e4588f'];
    for (let i = 0; i < (big ? 90 : 45); i++) {
      const d = document.createElement('i'); d.className = 'conf';
      d.style.cssText = `left:${Math.random() * 100}%;background:${rnd(cols)};--x:${(Math.random() - .5) * 200}px;--r:${(Math.random() * 900) | 0}deg;--d:${1.8 + Math.random() * 1.6}s;animation-delay:${Math.random() * .5}s;${Math.random() < .4 ? 'border-radius:50%' : ''}`;
      fx.appendChild(d);
    }
  }
  const nums = big ? [1, 2, 3, 4, 5] : [1, 2, 3];
  fx.insertAdjacentHTML('beforeend', `<div class="praise">${esc(text)} 👏</div><div class="cheerrow">` +
    nums.map((n, i) => (i === Math.floor(nums.length / 2) ? '<span class="hands">👏</span>' : '') + numberBlock(n, 30, { label: false })).join('') + '</div>');
  SND.chime();
  setTimeout(() => { applause(big ? 3 : 2.2, big ? 10 : 7); cheer(big ? 2.2 : 1.6); }, 250);
  if (speak) setTimeout(() => say(text, { show: false, quiet: true }), 500);
  setTimeout(() => { if (id === celebrating) fx.innerHTML = ''; }, big ? 3600 : 2800);
}

/* ---------- IndexedDB for custom picture buttons ---------- */
const DB = {
  db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => {
    if (!window.indexedDB) return rej('no idb');
    const r = indexedDB.open('atlas', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('buttons', { keyPath: 'id' });
    r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error);
  }); },
  async all() { const db = await this.open(); return new Promise(res => { const q = db.transaction('buttons').objectStore('buttons').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); },
  async put(o) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('buttons', 'readwrite'); tx.objectStore('buttons').put(o); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  async del(id) { const db = await this.open(); return new Promise(res => { const tx = db.transaction('buttons', 'readwrite'); tx.objectStore('buttons').delete(id); tx.oncomplete = res; }); }
};
function shrinkImage(file, max = 360) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej('blob'), 'image/jpeg', .85);
    };
    img.onerror = () => rej('img'); img.src = url;
  });
}
const objURLs = [];
const blobURL = b => { const u = URL.createObjectURL(b); objURLs.push(u); return u; };

/* ---------- router ---------- */
const screens = {};
let current = 'home', cleanup = null;
function go(name, arg) {
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  while (objURLs.length) URL.revokeObjectURL(objURLs.pop());
  current = name; const sc = screens[name];
  $('#title').textContent = sc.title; $('#backBtn').hidden = name === 'home';
  $('#screen').innerHTML = ''; window.scrollTo(0, 0);
  $('#toast').classList.remove('show'); stopSpeech();
  sc.render($('#screen'), arg);
  document.body.classList.toggle('calm', !!S.calm);
}
$('#backBtn').onclick = () => { SND.tap(); go(current === 'parent' || current === 'home' ? 'home' : 'home'); };
document.addEventListener('pointerdown', () => audio(), { once: true });

/* ---------- Home ---------- */
function pottyRequest() {
  ST.asks++; save();
  celebrate({ words: 'I need to go potty!', speak: false });
  say('I need to go potty!', { show: false });
}
screens.home = {
  title: 'Atlas Blocks',
  render(el) {
    const T = [['talk', '💬', 'Talk'], ['hum', '🎤', 'Hum & Say'], ['potty', '🚽', 'Potty'], ['play', '🔤', 'ABC 123']].filter(t => S.sections[t[0]]);
    el.innerHTML = `<div class="hello">${'ATLAS'.split('').map((c, i) => `<button class="hb" data-i="${i}" aria-label="${c}">${letterBlock(c, 70)}</button>`).join('')}</div>
      <div class="tiles">${T.map(([k, p, l]) => `<button class="tile ${k}" data-go="${k}"><span class="pic">${p}</span>${l}</button>`).join('')}</div>
      ${S.sections.potty ? `<button class="bigpotty" id="potReq"><span style="font-size:1.4em">🚽</span> I need to go potty</button>` : ''}`;
    $$('.hb', el).forEach(b => b.onclick = async () => {
      const c = 'ATLAS'[b.dataset.i]; const blk = b.firstElementChild;
      blk.classList.remove('bounce'); void blk.offsetWidth; blk.classList.add('bounce'); SND.letter(c); say(c);
      if (b.dataset.i === '4') { await sleep(700); say('Atlas!'); }
    });
    $$('[data-go]', el).forEach(b => b.onclick = () => { SND.tap(); go(b.dataset.go); });
    const pr = $('#potReq', el); if (pr) pr.onclick = pottyRequest;
  }
};

/* ---------- Talk board (AAC-style) ---------- */
const CORE = [
  { w: 'I want', p: '🙋', c: 'verb' }, { w: 'more', p: '➕', c: 'social' }, { w: 'all done', p: '✋', c: 'social' }, { w: 'help', p: '🆘', c: 'verb' },
  { w: 'eat', p: '🍎', c: 'verb' }, { w: 'drink', p: '🥤', c: 'verb' }, { w: 'potty', p: '🚽', c: 'thing', say: 'I need to go potty' }, { w: 'play', p: '🧸', c: 'verb' },
  { w: 'yes', p: '👍', c: 'social' }, { w: 'no', p: '👎', c: 'no' }, { w: 'hurt', p: '🤕', c: 'feel' }, { w: 'happy', p: '😀', c: 'feel' },
  { w: 'sad', p: '😢', c: 'feel' }, { w: 'mad', p: '😠', c: 'feel' }, { w: 'Dad', p: '👨', c: 'people' }, { w: 'Mom', p: '👩', c: 'people' },
  { w: 'music', p: '🎵', c: 'thing' }, { w: 'blocks', p: '🧱', c: 'thing' }, { w: 'hug', p: '🤗', c: 'social' }, { w: 'tired', p: '😴', c: 'feel' }
];
screens.talk = {
  title: 'Talk',
  async render(el) {
    const sentence = [];
    el.innerHTML = `<div class="strip"><div class="words" id="words"><span class="ph">Tap pictures to talk</span></div>
      <button id="back1" aria-label="Remove last">⌫</button><button class="say" id="sayAll" aria-label="Say it">🔊</button></div>
      <div class="grid" id="grid"></div>`;
    let custom = []; try { custom = await DB.all(); } catch (e) {}
    const items = CORE.concat(custom.map(c => ({ w: c.label, say: c.say || c.label, img: c.blob, rec: c.audio, c: 'custom' })));
    $('#grid', el).innerHTML = items.map((it, i) => `<button class="word ${it.c}" data-i="${i}">
      ${S.letterOnWords ? letterBlock(it.w[0].toUpperCase(), 34, 'small') : ''}
      ${it.img ? `<img alt="" src="${blobURL(it.img)}">` : `<span class="pic">${it.p}</span>`}<span>${esc(it.w)}</span></button>`).join('');
    const draw = () => { $('#words', el).innerHTML = sentence.length ? sentence.map(w => `<span>${esc(w)}</span>`).join('') : '<span class="ph">Tap pictures to talk</span>'; };
    $$('.word', el).forEach(b => b.onclick = () => {
      const it = items[b.dataset.i]; ST.words++; save();
      b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 200);
      sentence.push(it.w); if (sentence.length > 6) sentence.shift(); draw();
      if (it.rec) sayBlob(it.rec, it.say || it.w); else say(it.say || it.w);
      if (it.c === 'thing' && it.w === 'potty') { ST.asks++; save(); celebrate({ words: 'Great asking!', speak: false }); }
    });
    $('#back1', el).onclick = () => { sentence.pop(); draw(); SND.tap(); };
    $('#sayAll', el).onclick = async () => { if (!sentence.length) return SND.soft(); const recs = sentence.map(w => (items.find(x => x.w === w && x.rec) || {}).rec);
      if (!recs.some(Boolean)) return say(sentence.join(' '));
      if (S.captions) caption(sentence.join(' '), 3000);
      for (let i = 0; i < sentence.length; i++) await (recs[i] ? sayBlob(recs[i], sentence[i]) : say(sentence[i], { show: false })); };
  }
};

/* ---------- Hum & Say: reward ANY vocalization, shaping hum -> vowels -> sounds -> words ---------- */
const HUM = [
  { name: '1 Hum', items: [
    { t: 'L', v: 'M', cue: 'Mmmm', sayit: 'Hum with me. Mmmmmm.', tune: [[60, 1], [64, 1], [67, 2]] },
    { t: 'L', v: 'H', cue: 'Hmm hmm', sayit: 'Hmm hmm hmm.', tune: [[67, .5], [67, .5], [64, 1], [60, 1]] },
    { t: 'N', v: 3, cue: 'Hum 1 2 3', sayit: 'Hum one, two, three.', tune: [[60, 1], [62, 1], [64, 2]] },
    { t: 'X', v: '🎵 High', cue: 'Hum high', sayit: 'Hum up high.', tune: [[72, 1], [76, 1], [79, 2]] },
    { t: 'X', v: '🎵 Low', cue: 'Hum low', sayit: 'Hum down low.', tune: [[55, 1], [52, 1], [48, 2]] },
    { t: 'X', v: '🎶 Song', cue: 'Hum a song', sayit: 'Hum a song with me!', tune: [[60, .5], [62, .5], [64, .5], [67, .5], [69, 1], [67, 1], [64, .5], [62, .5], [60, 2]] }] },
  { name: '2 Vowels', items: [['A', 'Ahh'], ['E', 'Eee'], ['I', 'Eye'], ['O', 'Ohh'], ['U', 'Ooo']].map(([v, cue]) => ({ t: 'L', v, cue, sayit: `${v} says ${cue}. ${cue}!` })) },
  { name: '3 Letter sounds', items: ['M', 'B', 'P', 'D', 'S', 'N', 'G', 'T', 'L', 'W'].map(v => ({ t: 'L', v, cue: SOUNDS[v.toLowerCase()], sayit: `${v} says ${SOUNDS[v.toLowerCase()]}` })) },
  { name: '4 Words', items: [['ma', 'Ma'], ['up', 'Up'], ['go', 'Go'], ['more', 'More'], ['potty', 'Potty'], ['hi', 'Hi'], ['bye', 'Bye'], ['dad', 'Dada']].map(([v, cue]) => ({ t: 'W', v, cue, sayit: `${cue}. Say ${cue}!` })) },
  { name: '5 Numbers', items: Array.from({ length: 10 }, (_, i) => ({ t: 'N', v: i + 1, cue: nword(i + 1), sayit: `${nword(i + 1)}!` })) }
];
const SENS = { low: .06, med: .035, high: .018 };
let humLevel = 0, humItem = 0;
screens.hum = {
  title: 'Hum & Say',
  render(el) {
    let stream = null, raf = 0, listening = false, autoStop = 0;
    const visual = (it, big) => it.t === 'L' ? letterBlock(it.v, big ? 130 : 56) : it.t === 'N' ? numberBlock(it.v, big ? Math.max(18, 36 - it.v * 1.5) : 16, { label: big }) :
      it.t === 'W' ? (big ? `<div style="display:flex;gap:6px">${it.v.toUpperCase().split('').map(c => letterBlock(c, it.v.length > 3 ? 64 : 84)).join('')}</div>` : `<span class="lbl">${esc(it.v)}</span>`) : `<span class="lbl">${esc(it.v)}</span>`;
    function draw() {
      const L = HUM[humLevel], it = L.items[humItem] || L.items[0];
      el.innerHTML = `<div class="levels">${HUM.map((l, i) => `<button class="chip ${i === humLevel ? 'sel' : ''}" data-l="${i}">${l.name}</button>`).join('')}</div>
        <div class="targets">${L.items.map((t, i) => `<button class="target ${i === humItem ? 'sel' : ''}" data-t="${i}">${visual(t, false)}</button>`).join('')}</div>
        <div class="stage"><div class="who"><div id="star">${visual(it, true)}</div><div class="cue">${esc(it.cue)}</div></div>
        <div class="ctrl"><button class="hear" id="hear">🔊 Hear it</button>
          <div class="meterwrap"><button class="mic" id="mic" aria-label="Your turn: make a sound">🎤</button>
          <div class="meter" id="meter">${[1, 2, 3, 4, 5, 6].map(n => `<span class="cube" style="--h:${ncol(n)}"></span>`).join('')}</div></div>
          <div class="muted" id="micMsg" style="font-size:18px;text-align:center">Tap 🎤 then hum or talk!</div>
          <button class="fallback" id="manual">✓ He made a sound</button></div></div>`;
      $$('[data-l]', el).forEach(b => b.onclick = () => { stop(); humLevel = +b.dataset.l; humItem = 0; SND.tap(); draw(); });
      $$('[data-t]', el).forEach(b => b.onclick = () => { stop(); humItem = +b.dataset.t; draw(); hear(); });
      $('#hear', el).onclick = hear; $('#mic', el).onclick = () => listening ? stop() : listen();
      $('#manual', el).onclick = () => reward();
    }
    const bounce = () => { const s = $('#star', el); if (s) { s.classList.remove('bounce'); void s.offsetWidth; s.classList.add('bounce'); } };
    async function hear() {
      stop(); const it = HUM[humLevel].items[humItem]; bounce();
      if (it.tune) { await sleep(melody(it.tune, 120, 'sine', .3) + 100); }
      else if (it.t === 'L') SND.letter(it.v); else if (it.t === 'N') SND.num(it.v);
      await say(it.sayit);
    }
    function reward() {
      stop(); ST.hums++; save(); bounce();
      const s = $('#star', el); if (s && !calm()) s.classList.add('dance');
      const it = HUM[humLevel].items[humItem];
      celebrate({ words: rnd(humLevel === 0 ? ['Great humming!', 'Beautiful humming!', 'I hear you!'] : ['Great sound!', 'I hear you!', 'Yay ' + it.cue + '!', 'Nice talking!']) });
    }
    async function listen() {
      const msg = $('#micMsg', el);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        msg.textContent = window.isSecureContext ? 'No microphone here. Use ✓ to reward.' : 'Microphone needs the https:// link. Use ✓ to reward.'; return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
      } catch (e) { msg.textContent = 'Microphone is off. Allow it in settings, or use ✓.'; return; }
      if (current !== 'hum') { stop(); return; }
      const ac = audio(); const src = ac.createMediaStreamSource(stream); const an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
      const buf = new Uint8Array(an.fftSize); listening = true;
      const mic = $('#mic', el); mic.classList.add('live'); msg.textContent = 'Listening… hum or talk!';
      let floor = 0, frames = 0, voiced = 0, last = performance.now();
      const base = SENS[S.micSens] || SENS.med;
      const loop = now => {
        if (!listening) return;
        an.getByteTimeDomainData(buf); let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length), dt = now - last; last = now; frames++;
        if (frames < 15) floor = Math.max(floor, rms); // quick room-noise calibration
        const th = Math.max(base, floor * 2.2);
        const lvl = Math.min(6, Math.round(rms / th * 3));
        $$('#meter .cube', el).forEach((c, i) => c.classList.toggle('lit', i < lvl));
        mic.style.setProperty('--lv', 1 + Math.min(.4, rms * 4));
        if (frames >= 15 && rms > th) voiced += dt; else voiced = Math.max(0, voiced - dt * .3);
        if (voiced >= S.micHold) { reward(); return; }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      autoStop = setTimeout(() => { if (listening) { stop(); const m = $('#micMsg', el); if (m) m.textContent = 'Tap 🎤 to try again!'; } }, 30000);
    }
    function stop() {
      listening = false; cancelAnimationFrame(raf); clearTimeout(autoStop);
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      const mic = $('#mic', el); if (mic) mic.classList.remove('live');
      $$('#meter .cube', el).forEach(c => c.classList.remove('lit'));
      const m = $('#micMsg', el); if (m && m.textContent.startsWith('Listening')) m.textContent = 'Tap 🎤 then hum or talk!';
    }
    cleanup = stop; draw();
  }
};

/* ---------- Potty Mission ---------- */
const STEPS = [
  { p: '👖⬇️', l: 'Pants down', s: 'Pants down.' },
  { p: '🚽', l: 'Sit', s: 'Sit on the potty.', sit: true },
  { p: '💧', l: 'Go potty', s: 'Pee pee or poo poo in the potty.', go: true },
  { p: '🧻', l: 'Wipe', s: 'Wipe.' },
  { p: '🌀', l: 'Flush', s: 'Flush! Bye bye potty.' },
  { p: '👖⬆️', l: 'Pants up', s: 'Pants up.' },
  { p: '🧼', l: 'Wash hands', s: 'Wash hands. Scrub scrub scrub!', wash: true }
];
function towerHTML(n, goal) {
  return `<div class="tower" id="tower">${Array.from({ length: goal }, (_, i) =>
    `<span class="cube ${i < n ? (i === n - 1 ? 'face' : '') : 'ghost'}" style="--h:${i < n ? ncol(i + 1) : '#9aa4b8'};animation-delay:${i < n ? Math.min(i, 3) * .05 : 0}s">${i < n && i === n - 1 ? '<i></i>' : ''}</span>`).join('')}</div>`;
}
function addTowerBlock(el) {
  ST.tower++; ST.potty++;
  const goal = S.towerGoal;
  if (ST.tower >= goal) {
    ST.towers++; save();
    setTimeout(() => { SND.tower(); celebrate({ big: true, words: `Tower of ${goal}! Super star!` }); }, 300);
    setTimeout(() => { ST.tower = 0; save(); if (current === 'potty') go('potty', 'tower'); }, 4200);
  } else { save(); celebrate({ big: true, words: rnd(['Potty in the potty! Yay!', 'You did it! Great potty!', 'Woo hoo, potty!']) }); }
}
screens.potty = {
  title: 'Potty Mission',
  render(el, view) {
    let step = 0, timer = 0;
    const stopT = () => { clearInterval(timer); timer = 0; };
    cleanup = stopT;
    function tabs(sel) {
      return `<div class="tabs"><button class="chip ${sel === 'mission' ? 'sel' : ''}" data-v="mission">🚀 Mission</button>
        <button class="chip ${sel === 'tower' ? 'sel' : ''}" data-v="tower">🏆 Tower</button>
        <button class="chip" id="ask" style="background:var(--green);color:#fff;border-color:var(--green)">🚽 I need to go potty</button></div>`;
    }
    function wire() {
      $$('[data-v]', el).forEach(b => b.onclick = () => { stopT(); SND.tap(); b.dataset.v === 'tower' ? tower() : (step = 0, mission()); });
      $('#ask', el).onclick = pottyRequest;
    }
    function mission() {
      const st = STEPS[step];
      el.innerHTML = tabs('mission') + `<div class="steps">${STEPS.map((s, i) => `<div class="step ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}"><span class="pic">${i < step ? '✅' : s.p}</span>${s.l}</div>`).join('')}</div>
        <div class="bigstep"><div class="pic">${st.p}</div><div class="lab">${st.l}</div><div id="extra" style="width:100%"></div><div class="btnrow" id="acts"></div></div>`;
      wire();
      const acts = $('#acts', el), extra = $('#extra', el);
      const next = (txt = 'Next ➡️', cls = '') => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = txt; acts.appendChild(b); return b; };
      say(st.s);
      if (st.sit || st.wash) {
        const goal = st.sit ? S.sitCount : 20; let n = 0;
        extra.innerHTML = `<div class="sitnum" id="sn">0</div><div class="sitstack" id="ss"></div><p class="muted">${st.sit ? `Let's count to ${goal} while we sit!` : 'Scrub while we count to 20!'}</p>`;
        if (st.wash) setTimeout(() => SND.wash(), 1200);
        const tick = () => {
          n++; $('#sn', el).textContent = n;
          $('#ss', el).innerHTML = numberBlock(n, n > 10 ? 26 : 34, { label: false });
          if (st.sit) { SND.num(n); say(nword(n), { show: false, rate: 1, quiet: true }); }
          if (n >= goal) { stopT(); SND.chime(); say(st.sit ? `${goal}! Great sitting!` : 'Clean hands! Great washing!'); }
        };
        setTimeout(() => { if (!timer && current === 'potty') timer = setInterval(tick, st.sit ? 1300 : 550); }, st.wash ? 1200 : 1600);
      }
      if (st.go) {
        next('I went! 🎉').onclick = () => { addTowerBlock(el); step++; setTimeout(() => { if (current === 'potty' && $('#acts', el)) mission(); }, 2900); };
        next('I tried 👍', 'alt').onclick = () => {
          ST.tries++; save();
          if (S.triesCount) addTowerBlock(el); else celebrate({ words: 'Great trying!' });
          step++; setTimeout(() => { if (current === 'potty' && $('#acts', el)) mission(); }, 2900);
        };
      } else if (step < STEPS.length - 1) {
        next().onclick = () => { stopT(); SND.tap(); step++; mission(); };
      } else {
        next('Mission complete! 🚀', 'purple').onclick = () => { stopT(); ST.missions++; save(); celebrate({ big: true, words: 'Potty mission complete!' }); setTimeout(() => current === 'potty' && tower(), 3000); };
      }
      if (step > 0) next('⬅️', 'alt').onclick = () => { stopT(); step--; mission(); };
    }
    function tower() {
      const goal = S.towerGoal, n = Math.min(ST.tower, goal);
      el.innerHTML = tabs('tower') + `<div class="towerwrap">${towerHTML(n, goal)}
        <div style="text-align:center"><h2>Potty Tower</h2><div class="sitnum">${n} <span style="font-size:.4em" class="muted">of ${goal}</span></div>
        <p>Every potty in the potty adds a block.<br>Build to ${goal} for a big party!</p>
        <div class="stars" aria-label="${ST.towers} towers built">${'🏆'.repeat(Math.min(ST.towers, 12))}${ST.towers > 12 ? ' +' + (ST.towers - 12) : ''}</div>
        <p class="muted">${ST.towers} tower${ST.towers === 1 ? '' : 's'} built · ${ST.potty} potty wins</p>
        <div class="btnrow"><button class="btn" id="addB">+ Add a block</button></div></div></div>`;
      wire();
      $('#addB', el).onclick = () => { addTowerBlock(el); setTimeout(() => current === 'potty' && ST.tower > 0 && tower(), 400); };
      say(n ? `${nword(n)} blocks!` : 'Let\u2019s build a tower!', { show: false, quiet: true });
    }
    view === 'tower' ? tower() : mission();
  }
};

/* ---------- ABC & 123 play ---------- */
const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), LO = UP.map(c => c.toLowerCase()), NUMS = Array.from({ length: 21 }, (_, i) => String(i));
const P = { mode: 'trace', set: 'ABC', rev: false, idx: 0 };
screens.play = {
  title: 'ABC & 123',
  render(el) {
    let paradeT = 0, paradeOn = false;
    cleanup = () => { paradeOn = false; clearTimeout(paradeT); };
    const list = () => { const l = P.set === 'ABC' ? UP : P.set === 'abc' ? LO : NUMS; return P.rev ? l.slice().reverse() : l; };
    function shell(inner) {
      el.innerHTML = `<div class="tabs">${[['trace', '✍️ Trace'], ['count', '🍎 Count'], ['order', '🧱 Order'], ['parade', '🎵 Parade']].map(([k, l]) => `<button class="chip ${P.mode === k ? 'sel' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
        ${P.mode === 'count' ? '' : `<div class="tabs">${['ABC', 'abc', '123'].map(s => `<button class="chip ${P.set === s ? 'sel' : ''}" data-s="${s}">${s}</button>`).join('')}
        <button class="chip ${P.rev ? 'sel' : ''}" id="rev">${P.set === '123' ? (P.rev ? '20 → 0' : '0 → 20') : (P.rev ? 'Z → A' : 'A → Z')}</button></div>`}<div id="pl">${inner}</div>`;
      $$('[data-m]', el).forEach(b => b.onclick = () => { cleanup(); P.mode = b.dataset.m; P.idx = 0; SND.tap(); render(); });
      $$('[data-s]', el).forEach(b => b.onclick = () => { cleanup(); P.set = b.dataset.s; P.idx = 0; SND.tap(); render(); });
      const r = $('#rev', el); if (r) r.onclick = () => { cleanup(); P.rev = !P.rev; P.idx = 0; SND.tap(); render(); };
    }
    const sayItem = ch => /\d/.test(ch) ? nword(+ch) : ch.toUpperCase() === ch ? `Big ${ch}` : `Little ${ch}`;
    const blockFor = (ch, big) => /\d/.test(ch) ? numberBlock(+ch, big ? Math.max(16, 40 - ch * 1.3) : (+ch > 10 ? 14 : 22)) : letterBlock(ch, big ? 150 : 88);

    function trace() {
      const l = list(); P.idx = (P.idx + l.length) % l.length; const ch = l[P.idx];
      shell(`<div class="trace" id="tr"><canvas id="g"></canvas><canvas id="d"></canvas></div>
        <div class="btnrow" style="margin-top:14px"><button class="btn alt" id="prev">⬅️</button><button class="btn alt" id="clr">🧽 Clear</button><button class="btn" id="nxt">➡️</button></div>`);
      const box = $('#tr', el), g = $('#g', el), d = $('#d', el), dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = box.clientWidth; [g, d].forEach(c => { c.width = W * dpr; c.height = W * dpr; });
      const font = s => `800 ${s}px ui-rounded, "Nunito", "Varela Round", Roboto, Arial, sans-serif`;
      const gc = g.getContext('2d'); gc.scale(dpr, dpr); gc.textAlign = 'center'; gc.textBaseline = 'middle';
      gc.font = font(W * (ch.length > 1 ? .62 : .78)); gc.fillStyle = '#e8edf6'; gc.fillText(ch, W / 2, W * .54);
      gc.setLineDash([10, 12]); gc.lineWidth = 3; gc.strokeStyle = '#9aa8c4'; gc.strokeText(ch, W / 2, W * .54);
      // low-res mask for coverage scoring
      const R = 100, m = document.createElement('canvas'); m.width = m.height = R; const mc = m.getContext('2d');
      mc.textAlign = 'center'; mc.textBaseline = 'middle'; mc.font = font(R * (ch.length > 1 ? .62 : .78)); mc.fillText(ch, R / 2, R * .54);
      const mask = mc.getImageData(0, 0, R, R).data; let total = 0; for (let i = 3; i < mask.length; i += 4) if (mask[i] > 128) total++;
      const dc = d.getContext('2d'); dc.scale(dpr, dpr); dc.lineCap = dc.lineJoin = 'round'; dc.lineWidth = W * .075;
      const strokes = []; let cur = null, done = false, hue = 0;
      const pt = e => { const r = d.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
      d.onpointerdown = e => { d.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); };
      d.onpointermove = e => { if (!cur) return; const p = pt(e), q = cur[cur.length - 1]; cur.push(p);
        hue = (hue + 3) % 360; dc.strokeStyle = `hsl(${hue} 80% 55%)`; dc.beginPath(); dc.moveTo(q[0] * W, q[1] * W); dc.lineTo(p[0] * W, p[1] * W); dc.stroke(); };
      d.onpointerup = d.onpointercancel = () => { cur = null; score(); };
      function score() {
        if (done) return; const s = document.createElement('canvas'); s.width = s.height = R; const sc = s.getContext('2d');
        sc.lineCap = sc.lineJoin = 'round'; sc.lineWidth = R * .11; sc.strokeStyle = '#000';
        strokes.forEach(st => { sc.beginPath(); st.forEach((p, i) => i ? sc.lineTo(p[0] * R, p[1] * R) : sc.moveTo(p[0] * R, p[1] * R)); if (st.length === 1) sc.lineTo(st[0][0] * R + .5, st[0][1] * R); sc.stroke(); });
        const dd = sc.getImageData(0, 0, R, R).data; let hit = 0; for (let i = 3; i < dd.length; i += 4) if (mask[i] > 128 && dd[i] > 0) hit++;
        if (hit / total > .55) { done = true; ST.traces++; save(); SND[/\d/.test(ch) ? 'num' : 'letter'](/\d/.test(ch) ? Math.max(1, +ch) : ch); celebrate({ words: `${sayItem(ch)}! Great tracing!` }); }
      }
      say(`Trace ${sayItem(ch)}`);
      $('#prev', el).onclick = () => { P.idx--; trace(); };
      $('#nxt', el).onclick = () => { P.idx++; trace(); };
      $('#clr', el).onclick = () => { dc.clearRect(0, 0, W, W); strokes.length = 0; done = false; };
    }

    function count() {
      const N = 1 + Math.floor(Math.random() * S.countMax), emo = rnd(['⭐', '🍎', '🚗', '🐟', '🎈', '🦆', '🍪', '🚀', '🍌', '🐶']);
      const tapped = new Set(); let k = 0;
      shell(`<p style="text-align:center;font-size:24px;font-weight:800;margin:4px 0 10px">Tap each one to count!</p>
        <div class="objs" id="objs">${Array.from({ length: N }, (_, i) => `<button class="obj" data-i="${i}">${emo}</button>`).join('')}</div>
        <div class="choices" id="ch"></div>`);
      $$('.obj', el).forEach(b => b.onclick = () => {
        if (tapped.has(b.dataset.i)) return; tapped.add(b.dataset.i); k++;
        b.classList.add('c', 'bounce'); b.insertAdjacentHTML('beforeend', `<em>${k}</em>`); SND.num(k); say(nword(k), { rate: 1 });
        if (k === N) setTimeout(choices, 700);
      });
      function choices() {
        const opts = new Set([N]); while (opts.size < Math.min(3, S.countMax)) opts.add(1 + Math.floor(Math.random() * S.countMax));
        say(`${nword(N)}! Find ${nword(N)}.`);
        $('#ch', el).innerHTML = shuffle([...opts]).map(v => `<button class="choice" data-v="${v}">${numberBlock(v, v > 10 ? 18 : 30)}</button>`).join('');
        $$('.choice', el).forEach(b => b.onclick = () => {
          if (+b.dataset.v === N) { ST.counts++; save(); b.firstElementChild.classList.add('dance'); celebrate({ words: `${nword(N)}! You counted ${N}!` }); setTimeout(() => current === 'play' && P.mode === 'count' && count(), 3200); }
          else { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); SND.soft(); say(`That's ${nword(+b.dataset.v)}. Find ${nword(N)}!`); }
        });
      }
    }

    function order() {
      const l = list(), len = Math.min(5, l.length), start = Math.floor(Math.random() * (l.length - len + 1));
      const seq = l.slice(start, start + len); let k = 0;
      shell(`<p style="text-align:center;font-size:22px;font-weight:800;margin:4px 0 10px">Put them in order: ${esc(seq[0])} first!</p>
        <div class="line" id="line"></div><div class="pool" id="pool">${shuffle(seq).map(ch => `<button data-c="${ch}">${blockFor(ch, false)}</button>`).join('')}</div>`);
      say(`Put them in order. Start with ${sayItem(seq[0])}`);
      $$('#pool button', el).forEach(b => b.onclick = () => {
        if (b.dataset.c === seq[k]) {
          $('#line', el).appendChild(b); b.onclick = null; b.firstElementChild.classList.add('bounce');
          /\d/.test(seq[k]) ? SND.num(Math.max(1, +seq[k])) : SND.letter(seq[k]); say(sayItem(seq[k]), { rate: 1 }); k++;
          if (k === seq.length) { ST.orders++; save(); setTimeout(() => celebrate({ words: 'In order! Great job!' }), 500); setTimeout(() => current === 'play' && P.mode === 'order' && order(), 3600); }
        } else { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); SND.soft(); }
      });
    }

    function parade() {
      const l = list(); P.idx = (P.idx + l.length) % l.length;
      shell(`<div class="parade"><div id="pb" style="min-height:260px;display:flex;align-items:flex-end">${blockFor(l[P.idx], true)}</div>
        <div class="sitnum" style="font-size:40px">${esc(l[P.idx])}</div>
        <div class="btnrow"><button class="btn alt" id="pp">⬅️</button><button class="btn purple" id="go">${paradeOn ? '⏸ Pause' : '▶️ March!'}</button><button class="btn alt" id="pn">➡️</button></div></div>`);
      const show = () => { const ch = l[P.idx]; $('#pb', el).innerHTML = blockFor(ch, true); $('#pb', el).firstElementChild.classList.add('bounce');
        $('.sitnum', el).textContent = ch; /\d/.test(ch) ? SND.num(Math.max(1, +ch)) : SND.letter(ch); return say(/\d/.test(ch) ? nword(+ch) : ch, { rate: 1 }); };
      const step = async () => { if (!paradeOn) return; await show(); if (!paradeOn) return;
        if (P.idx >= l.length - 1) { paradeOn = false; celebrate({ big: true, words: P.set === '123' ? 'All the numbers!' : 'All the letters!' }); $('#go', el).textContent = '▶️ March!'; P.idx = 0; return; }
        paradeT = setTimeout(() => { P.idx++; step(); }, 450); };
      $('#go', el).onclick = () => { paradeOn = !paradeOn; $('#go', el).textContent = paradeOn ? '⏸ Pause' : '▶️ March!'; clearTimeout(paradeT); if (paradeOn) step(); };
      $('#pp', el).onclick = () => { paradeOn = false; P.idx = (P.idx - 1 + l.length) % l.length; parade(); show(); };
      $('#pn', el).onclick = () => { paradeOn = false; P.idx = (P.idx + 1) % l.length; parade(); show(); };
    }
    function render() { $('#toast').classList.remove('show'); ({ trace, count, order, parade })[P.mode](); }
    render();
  }
};

/* ---------- Parent area (hold lock 3 seconds) ---------- */
(function lock() {
  const b = $('#lockBtn'); let t = 0;
  const start = e => { e.preventDefault(); b.classList.add('holding'); t = setTimeout(() => { b.classList.remove('holding'); SND.chime(); go('parent'); }, 3000); };
  const end = () => { clearTimeout(t); b.classList.remove('holding'); };
  b.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, end));
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', () => { if (current !== 'parent') caption('Grown-ups: hold 3 seconds', 1500); });
})();
screens.parent = {
  title: 'Grown-ups',
  async render(el) {
    const sw = (k, obj = S) => `<button class="switch" role="switch" aria-checked="${!!obj[k]}" data-k="${k}"></button>`;
    const vs = TTS ? (voices.length ? voices : TTS.getVoices()) : [];
    el.innerHTML = `
    <div class="panel"><h3 style="margin-top:0">Sound & voice</h3>
      <div class="row">Sound on ${sw('sound')}</div>
      <div class="row">Volume <input type="range" id="vol" min="0" max="1" step="0.05" value="${S.volume}"></div>
      <div class="row">Clapping & cheering on praise ${sw('praiseSounds')}</div>
      <div class="row">Voice <select id="voice"><option value="">Default</option>${vs.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.voice ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></div>
      <div class="note">All built-in words and praise use the app's own recorded voice, so it talks even on tablets with no text-to-speech (like Kindle Kids profiles). For your own picture buttons, record your voice when you add them.${vs.length ? '' : ' (No device voices found: anything without a clip shows big words on screen.)'}</div>
      <div class="row">Talking speed <input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${S.rate}"></div>
      <div class="row">Show words on screen when talking ${sw('captions')}</div>
      <div class="row"><span></span><button class="sbtn" id="test">🔊 Test voice + praise</button></div></div>

    <div class="panel"><h3 style="margin-top:0">Sections on the home screen</h3>
      ${[['talk', 'Talk board'], ['hum', 'Hum & Say'], ['potty', 'Potty Mission'], ['play', 'ABC & 123']].map(([k, l]) => `<div class="row">${l} ${sw(k, S.sections).replace('data-k', 'data-sec')}</div>`).join('')}
      <div class="row">Less motion (calm mode) ${sw('calm')}</div></div>

    <div class="panel"><h3 style="margin-top:0">Talk board</h3>
      <div class="row">Show first-letter block on buttons ${sw('letterOnWords')}</div>
      <div class="row" style="align-items:flex-start;flex-direction:column">
        <b>Add a picture button</b>
        <input type="file" id="ph" accept="image/*">
        <input type="text" id="lab" placeholder="Word on button (e.g. Grandma)" maxlength="24">
        <input type="text" id="phr" placeholder="What it says (optional, e.g. I want Grandma)" maxlength="80">
        <div class="btnrow" style="justify-content:flex-start;gap:8px"><button class="sbtn" id="recBtn">🎤 Record voice</button><button class="sbtn" id="recPlay" hidden>▶️ Play</button><span class="muted" id="recMsg" style="font-size:15px">Record yourself saying it (this tablet has no built-in voice for new words).</span></div>
        <button class="sbtn" id="addBtn">+ Add button</button></div>
      <div class="customlist" id="clist"></div></div>

    <div class="panel"><h3 style="margin-top:0">Hum & Say</h3>
      <div class="row">Microphone sensitivity <select id="sens">${[['high', 'High (quiet hums count)'], ['med', 'Medium'], ['low', 'Low (noisy room)']].map(([v, l]) => `<option value="${v}" ${S.micSens === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="row">Sound needed <select id="hold">${[[200, 'Very short'], [350, 'Short'], [700, 'Longer'], [1200, 'Long hum']].map(([v, l]) => `<option value="${v}" ${+S.micHold === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <p class="muted" style="font-size:16px">Sound is only measured for loudness on the device. Nothing is recorded or saved.</p></div>

    <div class="panel"><h3 style="margin-top:0">Potty</h3>
      <div class="row">Sit and count to <select id="sit">${[5, 10, 15, 20, 30].map(v => `<option ${+S.sitCount === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="row">Tower size <select id="goal">${[5, 10].map(v => `<option ${+S.towerGoal === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="row">"I tried" also earns a block ${sw('triesCount')}</div>
      <div class="row">Counting game goes up to <select id="cmax">${[5, 10, 20].map(v => `<option ${+S.countMax === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>

    <div class="panel"><h3 style="margin-top:0">Progress</h3>
      ${[['potty', '🚽 Potty successes'], ['tries', '👍 Potty tries'], ['tower', '🧱 Blocks on current tower'], ['towers', '🏆 Towers built'], ['asks', '🙋 Asked for potty'],
        ['missions', '🚀 Potty missions finished'], ['hums', '🎤 Sounds rewarded'], ['words', '💬 Talk buttons pressed'], ['traces', '✍️ Letters/numbers traced'], ['counts', '🍎 Counting wins'], ['orders', '🧱 Ordering wins']]
        .map(([k, l]) => `<div class="row">${l} <b style="font-size:24px">${ST[k]}</b></div>`).join('')}
      <div class="row"><button class="sbtn" id="resetTower">Reset tower</button><button class="sbtn red" id="resetAll">Reset all counts</button></div></div>

    <div class="panel"><h3 style="margin-top:0">Tips for grown-ups</h3><ul class="tips">
      <li><b>Model, don't test.</b> Tap the Talk buttons yourself while you talk ("more… more juice"). Kids learn to use picture talk by seeing it used, not by being quizzed.</li>
      <li><b>Reward every try.</b> Humming counts. Smile, clap, and copy his sound back to him, then add a small change (hum "mmm" → "ma"). That back-and-forth builds sound play.</li>
      <li><b>Wait a little.</b> After you say something, pause 5–10 seconds with an expectant look. It gives him room to answer in his own way.</li>
      <li><b>Sing and stop.</b> He loves songs. Sing a familiar line and pause before the last word, so he can fill it in with any sound.</li>
      <li><b>Use the same steps every time.</b> Run the Potty Mission the same way at regular times (after waking, after meals, before bath). Visual schedules help kids know what comes next.</li>
      <li><b>Praise the asking.</b> Any request for the potty (button, sign, or sound) gets big praise, even if it's a false alarm.</li>
      <li><b>Keep it calm.</b> Accidents get a neutral "Oops, let's change." No scolding. Short sits (count to 10–20) beat long ones.</li>
      <li><b>Letters are a bridge.</b> He loves letters and numbers. Point to the letter block while you say its sound to link what he knows to talking.</li>
    </ul>
    <div class="note">These are general, evidence-informed ideas, not medical or therapy advice. Please share this app with Atlas's speech, ABA, and OT therapists so they can match the words, steps, and rewards to his plan.</div></div>

    <div class="panel"><h3 style="margin-top:0">Install on a tablet</h3>
      <p style="font-size:17px"><b>Kindle Fire (Silk):</b> open the app's https link, tap the ⋮ menu, then <i>Add to Home Screen</i>.<br>
      <b>iPhone/iPad (Safari):</b> tap Share, then <i>Add to Home Screen</i>.<br>It works offline after the first visit. The microphone only works from an https:// link.</p>
      <p class="muted" style="font-size:15px">Atlas Blocks has original characters and music. It isn't affiliated with any TV show.</p></div>`;

    $$('.switch[data-k]', el).forEach(b => b.onclick = () => { S[b.dataset.k] = !S[b.dataset.k]; b.setAttribute('aria-checked', S[b.dataset.k]); save(); audio(); document.body.classList.toggle('calm', !!S.calm); });
    $$('.switch[data-sec]', el).forEach(b => b.onclick = () => { const k = b.dataset.sec; S.sections[k] = !S.sections[k]; b.setAttribute('aria-checked', S.sections[k]); save(); });
    $('#vol', el).oninput = e => { S.volume = +e.target.value; save(); audio(); };
    $('#vol', el).onchange = () => SND.chime();
    $('#rate', el).onchange = e => { S.rate = +e.target.value; save(); say('Hi Atlas!'); };
    $('#voice', el).onchange = e => { S.voice = e.target.value; save(); say('Hi Atlas! Great job!'); };
    $('#test', el).onclick = () => celebrate({ words: 'Great job Atlas!' });
    const sel = (id, k, num = true) => $(id, el).onchange = e => { S[k] = num ? +e.target.value : e.target.value; save(); };
    sel('#sens', 'micSens', false); sel('#hold', 'micHold'); sel('#sit', 'sitCount'); sel('#goal', 'towerGoal'); sel('#cmax', 'countMax');
    $('#resetTower', el).onclick = () => { if (confirm('Start a new tower at 0?')) { ST.tower = 0; save(); go('parent'); } };
    $('#resetAll', el).onclick = () => { if (confirm('Reset all progress counts?')) { Object.keys(ST).forEach(k => ST[k] = 0); save(); go('parent'); } };
    async function list() {
      let c = []; try { c = await DB.all(); } catch (e) {}
      $('#clist', el).innerHTML = c.length ? c.map(x => `<span class="it"><img alt="" src="${blobURL(x.blob)}">${esc(x.label)}<button class="sbtn red" data-del="${x.id}" aria-label="Delete ${esc(x.label)}">✕</button></span>`).join('') : '<span class="muted">No custom buttons yet.</span>';
      $$('[data-del]', el).forEach(b => b.onclick = async () => { if (confirm('Delete this button?')) { await DB.del(b.dataset.del); list(); } });
    }
    // parent voice recording for custom buttons (MediaRecorder)
    let recBlob = null, rec = null, recStream = null, recT = 0;
    const stopRec = () => { clearTimeout(recT); if (rec && rec.state !== 'inactive') rec.stop(); };
    cleanup = () => { stopRec(); if (recStream) recStream.getTracks().forEach(t => t.stop()); };
    $('#recBtn', el).onclick = async () => {
      if (rec && rec.state === 'recording') return stopRec();
      if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#recMsg', el).textContent = 'Recording is not supported in this browser.'; return; }
      try {
        recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
        rec = type ? new MediaRecorder(recStream, { mimeType: type }) : new MediaRecorder(recStream); const chunks = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = () => { recStream.getTracks().forEach(t => t.stop()); recStream = null;
          recBlob = chunks.length ? new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' }) : null;
          $('#recBtn', el).textContent = recBlob ? '🎤 Record again' : '🎤 Record voice'; $('#recPlay', el).hidden = !recBlob;
          $('#recMsg', el).textContent = recBlob ? 'Got it! Tap Play to check, then Add button.' : 'Nothing recorded, try again.'; };
        rec.start(); $('#recBtn', el).textContent = '⏹ Stop'; $('#recMsg', el).textContent = 'Recording… speak now (stops after 6 seconds).';
        recT = setTimeout(stopRec, 6000);
      } catch (e) { $('#recMsg', el).textContent = 'Microphone not allowed. Allow it in browser settings to record.'; }
    };
    $('#recPlay', el).onclick = () => { if (recBlob) sayBlob(recBlob, $('#lab', el).value.trim() || 'Your recording'); };
    $('#addBtn', el).onclick = async () => {
      const f = $('#ph', el).files[0], label = $('#lab', el).value.trim();
      if (!f || !label) { caption('Pick a photo and type a word', 2000); return; }
      try { const blob = await shrinkImage(f); const o = { id: 'c' + Date.now(), label, say: $('#phr', el).value.trim() || label, blob, at: Date.now() };
        if (recBlob) o.audio = recBlob; await DB.put(o);
        $('#ph', el).value = ''; $('#lab', el).value = ''; $('#phr', el).value = ''; recBlob = null; $('#recPlay', el).hidden = true; $('#recMsg', el).textContent = 'Saved.'; caption('Added to the Talk board!'); list(); }
      catch (e) { caption('Could not save that photo'); }
    };
    list();
  }
};

/* ---------- start ---------- */
go('home');
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
