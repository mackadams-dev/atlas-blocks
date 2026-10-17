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
  sections: { talk: true, potty: true, play: true, shapes: true, colors: true, match: true, time: true, count: true, sing: true, feelings: true, routine: true, stickers: true }, letterOnWords: true, captions: true,
  micSens: 'med', micHold: 350, sitCount: 20, towerGoal: 10, triesCount: false, calm: false, countMax: 10 };
const load = (k, d) => { try { return Object.assign(structuredCloneSafe(d), JSON.parse(localStorage.getItem(k) || '{}')); } catch { return structuredCloneSafe(d); } };
function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o)); }
const S = load('atlas.s', DEF); S.sections = Object.assign({}, DEF.sections, S.sections); delete S.sections.hum;
const ST = load('atlas.st', { tower: 0, towers: 0, potty: 0, tries: 0, asks: 0, words: 0, traces: 0, counts: 0, orders: 0, missions: 0 });
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
let homePage = 0;
screens.home = {
  title: 'Atlas Blocks',
  render(el) {
    const ALL = [['talk', '💬', 'Talk'], ['potty', '🚽', 'Potty'], ['play', '🔤', 'ABC 123'], ['shapes', '⭐', 'Shapes'], ['colors', '🎨', 'Colors'], ['match', '🍎', 'Match'],
      ['time', '🌦️', 'Months & Weather'], ['count', '🧱', 'Count Blocks'], ['sing', '🎵', 'Sing-along'], ['feelings', '😀', 'Feelings'], ['routine', '🗓️', 'My Day'], ['stickers', '🌟', 'Stickers']]
      .filter(t => S.sections[t[0]] !== false);
    const PER = 6, pages = Math.max(1, Math.ceil(ALL.length / PER)); homePage = Math.min(homePage, pages - 1);
    const T = ALL.slice(homePage * PER, homePage * PER + PER);
    el.innerHTML = `<div class="hello">${'ATLAS'.split('').map((c, i) => `<button class="hb" data-i="${i}" aria-label="${c}">${letterBlock(c, 70)}</button>`).join('')}</div>
      <div class="homerow">${pages > 1 ? `<button class="pgbtn" id="pgL" aria-label="Previous page" ${homePage ? '' : 'disabled'}>◀</button>` : ''}
      <div class="tiles">${T.map(([k, p, l]) => `<button class="tile ${k}" data-go="${k}"><span class="pic">${p}</span>${l}</button>`).join('')}</div>
      ${pages > 1 ? `<button class="pgbtn" id="pgR" aria-label="Next page" ${homePage < pages - 1 ? '' : 'disabled'}>▶</button>` : ''}</div>
      ${pages > 1 ? `<div class="dots">${Array.from({ length: pages }, (_, i) => `<i class="${i === homePage ? 'on' : ''}"></i>`).join('')}</div>` : ''}
      ${S.sections.potty ? `<button class="bigpotty" id="potReq"><span style="font-size:1.4em">🚽</span> I need to go potty</button>` : ''}`;
    $$('.hb', el).forEach(b => b.onclick = async () => {
      const c = 'ATLAS'[b.dataset.i]; const blk = b.firstElementChild;
      blk.classList.remove('bounce'); void blk.offsetWidth; blk.classList.add('bounce'); SND.letter(c); say(c);
      if (b.dataset.i === '4') { await sleep(700); say('Atlas!'); }
    });
    $$('[data-go]', el).forEach(b => b.onclick = () => { SND.tap(); b.dataset.go === 'stickers' ? go('potty', 'stickers') : go(b.dataset.go); });
    const pl = $('#pgL', el), prr = $('#pgR', el);
    if (pl) pl.onclick = () => { SND.tap(); homePage--; go('home'); }; if (prr) prr.onclick = () => { SND.tap(); homePage++; go('home'); };
    let sx = null; const tl = $('.tiles', el);
    tl.addEventListener('pointerdown', e => { sx = e.clientX; }); tl.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 80) { if (dx < 0 && prr && !prr.disabled) prr.click(); else if (dx > 0 && pl && !pl.disabled) pl.click(); } });
    const pr = $('#potReq', el); if (pr) pr.onclick = pottyRequest;
  }
};

/* ---------- Talk board (AAC-style) ---------- */
const CORE = [
  { w: 'I want', p: '🙋', c: 'verb' }, { w: 'more', p: '➕', c: 'social' }, { w: 'all done', p: '✋', c: 'social' }, { w: 'help', p: '🆘', c: 'verb' },
  { w: 'eat', p: '🍎', c: 'verb' }, { w: 'drink', p: '🥤', c: 'verb' }, { w: 'potty', p: '🚽', c: 'thing', say: 'I need to go potty' }, { w: 'play', p: '🧸', c: 'verb' },
  { w: 'yes', p: '👍', c: 'social' }, { w: 'no', p: '👎', c: 'no' }, { w: 'hurt', p: '🤕', c: 'feel' }, { w: 'happy', p: '😀', c: 'feel' },
  { w: 'sad', p: '😢', c: 'feel' }, { w: 'mad', p: '😠', c: 'feel' }, { w: 'Daddy', p: '👨', c: 'people' }, { w: 'Momma', p: '👩', c: 'people' },
  { w: 'Goose', p: '🐶', c: 'people' }, { w: 'Tuna', p: '🐱', c: 'people' },
  { w: 'Night Night', p: '🌙', c: 'social' }, { w: 'music', p: '🎵', c: 'thing' }, { w: 'blocks', p: '🧱', c: 'thing' }, { w: 'hug', p: '🤗', c: 'social' }, { w: 'tired', p: '😴', c: 'feel' }
];
/* fit a grid of n buttons into the remaining screen height (no scrolling) */
function fitGrid(grid, n, gap = 10) {
  const W = grid.clientWidth, H = innerHeight - grid.getBoundingClientRect().top - scrollY - 30; let best = null;
  for (let cols = 3; cols <= 10; cols++) { const rows = Math.ceil(n / cols), w = (W - gap * (cols - 1)) / cols, h = (H - gap * (rows - 1)) / rows;
    const sc = Math.min(w, h * 1.15); if (!best || sc > best.sc) best = { cols, h: Math.min(h, w * 1.1), sc }; }
  const h = Math.max(64, Math.floor(best.h));
  grid.style.gridTemplateColumns = `repeat(${best.cols},1fr)`; grid.style.gap = gap + 'px';
  $$('.word', grid).forEach(b => { b.style.minHeight = '0'; b.style.height = h + 'px'; b.style.padding = '4px'; b.style.fontSize = Math.max(14, Math.min(22, h * .16)) + 'px'; });
  grid.style.setProperty('--wp', Math.max(22, Math.min(64, h * .42)) + 'px');
}
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
    fitGrid($('#grid', el), items.length);
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
const STICKERS = ['⭐', '🌟', '🚀', '🦖', '🐶', '🐱', '🌈', '🍭', '🎈', '🦄', '🚂', '🐠', '🦁', '🍦', '🏆', '🎉', '🐝', '🍓', '🚗', '🦋'];
const STICKER_GOAL = 20;
function addSticker() { ST.stickers = ST.stickers || []; ST.stickers.push(STICKERS[ST.stickers.length % STICKERS.length]); if (ST.stickers.length > STICKER_GOAL) ST.stickers = ST.stickers.slice(-1); }
function addTowerBlock(el) {
  ST.tower++; ST.potty++; addSticker();
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
        <button class="chip ${sel === 'stickers' ? 'sel' : ''}" data-v="stickers">🌟 Stickers</button>
        <button class="chip" id="ask" style="background:var(--green);color:#fff;border-color:var(--green)">🚽 I need to go potty</button></div>`;
    }
    function wire() {
      $$('[data-v]', el).forEach(b => b.onclick = () => { stopT(); SND.tap(); b.dataset.v === 'tower' ? tower() : b.dataset.v === 'stickers' ? stickers() : (step = 0, mission()); });
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
    function stickers() {
      const got = ST.stickers || [];
      el.innerHTML = tabs('stickers') + `<div class="stickwrap"><div class="stickgrid">${Array.from({ length: STICKER_GOAL }, (_, i) => `<span class="stk ${i < got.length ? 'got' : ''}">${i < got.length ? got[i] : i + 1}</span>`).join('')}</div>
        <div class="stickside"><h2>Sticker Chart</h2><div class="sitnum">${got.length} <span style="font-size:.4em" class="muted">of ${STICKER_GOAL}</span></div>
        <p>Every potty in the potty gets a sticker!</p><div class="btnrow"><button class="btn" id="addS">🌟 I went potty!</button></div></div></div>`;
      wire();
      $('#addS', el).onclick = () => { addTowerBlock(el); setTimeout(() => { if (current === 'potty') stickers(); }, 600); setTimeout(() => say('You got a sticker!'), 2600); };
      say(got.length ? `${nword(got.length)} stickers!` : 'Let\u2019s get stickers!', { show: false, quiet: true });
    }
    view === 'tower' ? tower() : view === 'stickers' ? stickers() : mission();
  }
};

/* ---------- shared multi-stroke tracing engine (letters, shapes, color words) ---------- */
const ROUND_FONT = 'ui-rounded, "Nunito", "Varela Round", Roboto, Arial, sans-serif';
async function fontReady(f, txt) { if (document.fonts && document.fonts.load) { try { await Promise.race([document.fonts.load(f, txt), sleep(1500)]); } catch (e) {} } }
const traceShell = (stars = '') => `<div class="tracewrap"><div class="trace" id="tr"><canvas id="g"></canvas><canvas id="d"></canvas></div><div class="tside">
  <div class="tprog" aria-hidden="true"><i id="tp"></i></div>${stars ? `<div class="abcstars">${stars}</div>` : ''}
  <div class="btnrow" style="margin-top:10px"><button class="btn alt" id="prev">⬅️</button><button class="btn alt" id="clr">🧽 Try again</button><button class="btn" id="nxt">➡️</button></div></div></div>`;
/* size the board to the screen so nothing scrolls (portrait: controls below, landscape: beside) */
function fitTrace(box, aspect = 1) {
  const wrap = box.parentElement, side = $('.tside', wrap), land = innerWidth > innerHeight;
  wrap.classList.toggle('land', land);
  const top = box.getBoundingClientRect().top + scrollY, availH = innerHeight - top - 14 - (land ? 0 : side.offsetHeight + 10);
  const availW = wrap.clientWidth - (land ? side.offsetWidth + 16 : 0);
  const w = Math.max(180, Math.floor(Math.min(availW, availH / aspect, 640 / Math.sqrt(aspect))));
  box.style.width = w + 'px'; box.style.aspectRatio = 'auto'; box.style.height = Math.round(w * aspect) + 'px';
}
/* opts.paint(ctx, W, H) -> { fill(), stroke() } draws the target shape; strokes accumulate across finger lifts;
   celebrates only when >= NEED of the shape's core is covered and the finger has rested IDLE ms */
function traceBoard(el, { paint, aspect = 1, ink = null, lineW = .075, need = .85, idle = 1000, onDone, prev, next, guide = '#e8edf6', dash = '#9aa8c4' }) {
  const box = $('#tr', el), g = $('#g', el), d = $('#d', el), dpr = Math.min(2, window.devicePixelRatio || 1);
  fitTrace(box, aspect);
  const W = box.clientWidth, H = Math.round(W * aspect); [g, d].forEach(c => { c.width = W * dpr; c.height = H * dpr; });
  const gc = g.getContext('2d'); gc.scale(dpr, dpr);
  let p = paint(gc, W, H); gc.fillStyle = guide; gc.strokeStyle = guide; p.fill();
  gc.setLineDash([10, 12]); gc.lineWidth = 3; gc.strokeStyle = dash; p.stroke();
  const R = 100, RH = Math.round(R * aspect), m = document.createElement('canvas'); m.width = R; m.height = RH; const mc = m.getContext('2d');
  p = paint(mc, R, RH); mc.fillStyle = mc.strokeStyle = '#000'; p.fill();
  const md = mc.getImageData(0, 0, R, RH).data, inM = (x, y) => x >= 0 && y >= 0 && x < R && y < RH && md[(y * R + x) * 4 + 3] > 128;
  let core = [];
  for (let y = 0; y < RH; y++) for (let x = 0; x < R; x++) if (inM(x, y) && inM(x - 1, y) && inM(x + 1, y) && inM(x, y - 1) && inM(x, y + 1)) core.push(y * R + x);
  if (core.length < 40) { core = []; for (let i = 0; i < R * RH; i++) if (md[i * 4 + 3] > 128) core.push(i); }
  const dc = d.getContext('2d'); dc.scale(dpr, dpr); dc.lineCap = dc.lineJoin = 'round'; dc.lineWidth = W * lineW;
  const strokes = []; let cur = null, done = false, hue = 0, idleT = 0;
  const pt = e => { const r = d.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  d.onpointerdown = e => { if (done) return; clearTimeout(idleT); try { d.setPointerCapture(e.pointerId); } catch (x) {} cur = [pt(e)]; strokes.push(cur); };
  d.onpointermove = e => { if (!cur) return; const q = cur[cur.length - 1], p2 = pt(e); cur.push(p2);
    hue = (hue + 3) % 360; dc.strokeStyle = ink || `hsl(${hue} 80% 55%)`; dc.beginPath(); dc.moveTo(q[0] * W, q[1] * H); dc.lineTo(p2[0] * W, p2[1] * H); dc.stroke(); };
  d.onpointerup = d.onpointercancel = () => { if (!cur) return; cur = null; check(); }; // lifting a finger never ends the trace
  function coverage() {
    const s = document.createElement('canvas'); s.width = R; s.height = RH; const sc = s.getContext('2d');
    sc.lineCap = sc.lineJoin = 'round'; sc.lineWidth = R * .13; sc.strokeStyle = '#000';
    strokes.forEach(st => { sc.beginPath(); st.forEach((q, i) => i ? sc.lineTo(q[0] * R, q[1] * RH) : sc.moveTo(q[0] * R, q[1] * RH)); if (st.length === 1) sc.lineTo(st[0][0] * R + .5, st[0][1] * RH); sc.stroke(); });
    const dd = sc.getImageData(0, 0, R, RH).data; let hit = 0; for (const i of core) if (dd[i * 4 + 3] > 0) hit++;
    return hit / core.length;
  }
  function check() { if (done) return; const c = coverage(); $('#tp', el).style.width = Math.min(100, Math.round(c / need * 100)) + '%'; if (c >= need) idleT = setTimeout(finish, idle); }
  function finish() { if (done || cur) return; done = true; onDone && onDone(); }
  const base = (cleanup && cleanup.__base) || cleanup; cleanup = () => { clearTimeout(idleT); if (base) try { base(); } catch (e) {} }; cleanup.__base = base;
  $('#prev', el).onclick = () => { clearTimeout(idleT); SND.tap(); prev(); };
  $('#nxt', el).onclick = () => { clearTimeout(idleT); SND.tap(); next(); };
  $('#clr', el).onclick = () => { clearTimeout(idleT); dc.clearRect(0, 0, W, H); strokes.length = 0; done = false; $('#tp', el).style.width = '0'; SND.tap(); };
  window.__trace = { check, strokes, coverage, core: core.length, get done() { return done; } }; // test hook
}

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
        ${P.mode === 'trace' && P.set !== '123' ? `<button class="chip ${P.cursive ? 'sel' : ''}" id="cur">✒️ Cursive</button>` : ''}<button class="chip ${P.rev ? 'sel' : ''}" id="rev">${P.set === '123' ? (P.rev ? '20 → 0' : '0 → 20') : (P.rev ? 'Z → A' : 'A → Z')}</button></div>`}<div id="pl">${inner}</div>`;
      $$('[data-m]', el).forEach(b => b.onclick = () => { cleanup(); P.mode = b.dataset.m; P.idx = 0; SND.tap(); render(); });
      $$('[data-s]', el).forEach(b => b.onclick = () => { cleanup(); P.set = b.dataset.s; P.idx = 0; SND.tap(); render(); });
      const cu = $('#cur', el); if (cu) cu.onclick = () => { cleanup(); P.cursive = !P.cursive; P.idx = 0; SND.tap(); render(); };
      const r = $('#rev', el); if (r) r.onclick = () => { cleanup(); P.rev = !P.rev; P.idx = 0; SND.tap(); render(); };
    }
    const sayItem = ch => /\d/.test(ch) ? nword(+ch) : ch.toUpperCase() === ch ? `Big ${ch}` : `Little ${ch}`;
    const blockFor = (ch, big) => /\d/.test(ch) ? numberBlock(+ch, big ? Math.max(16, 40 - ch * 1.3) : (+ch > 10 ? 14 : 22)) : letterBlock(ch, big ? 150 : 88);

    async function trace() {
      const l = list(); P.idx = (P.idx + l.length) % l.length; const ch = l[P.idx];
      const curs = P.cursive && /[a-z]/i.test(ch);
      const setKey = /\d/.test(ch) ? '' : P.set + (curs ? '-cursive' : '-print');
      ST.abc = ST.abc || {}; const doneSet = setKey ? (ST.abc[setKey] = ST.abc[setKey] || []) : [];
      shell(traceShell(setKey ? `⭐ ${doneSet.length} / 26 letters traced${curs ? ' in cursive' : ''}` : ''));
      const fam = curs ? '"AtlasCursive", cursive' : ROUND_FONT, wt = curs ? 400 : 800, scale = curs ? .55 : (ch.length > 1 ? .62 : .78);
      if (curs) await fontReady(`${wt} 40px ${fam}`, ch);
      say(`Trace ${sayItem(ch)}`);
      traceBoard(el, {
        lineW: curs ? .06 : .075,
        paint: (c, W, H) => { c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${wt} ${W * scale}px ${fam}`; return { fill: () => c.fillText(ch, W / 2, H * .54), stroke: () => c.strokeText(ch, W / 2, H * .54) }; },
        onDone: () => {
          ST.traces++; if (setKey && !doneSet.includes(ch)) doneSet.push(ch);
          const all = setKey && doneSet.length >= 26; if (all) ST.abc[setKey] = [];
          save(); SND[/\d/.test(ch) ? 'num' : 'letter'](/\d/.test(ch) ? Math.max(1, +ch) : ch);
          if (all) { celebrate({ big: true, words: 'You traced the whole alphabet! Amazing, Atlas!' }); setTimeout(() => { if (current === 'play') { SND.tower(); celebrate({ big: true, words: 'Woo hoo!' }); } }, 3800); }
          else celebrate({ words: `${sayItem(ch)}! Great tracing!` });
        },
        prev: () => { P.idx--; trace(); }, next: () => { P.idx++; trace(); }
      });
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

/* ---------- Shapes tracing ---------- */
const SHAPES = [
  ['circle', c => { const p = new Path2D(); p.arc(.5, .5, .36, 0, Math.PI * 2); return p; }],
  ['square', c => { const p = new Path2D(); p.rect(.17, .17, .66, .66); return p; }],
  ['triangle', c => poly([[.5, .14], [.88, .82], [.12, .82]])],
  ['rectangle', c => { const p = new Path2D(); p.rect(.08, .26, .84, .48); return p; }],
  ['star', c => poly(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .17 : .41; return [.5 + r * Math.cos(a), .54 + r * Math.sin(a)]; }))],
  ['heart', c => { const p = new Path2D(); p.moveTo(.5, .86); p.bezierCurveTo(.12, .6, .08, .36, .22, .24); p.bezierCurveTo(.34, .14, .47, .2, .5, .33);
    p.bezierCurveTo(.53, .2, .66, .14, .78, .24); p.bezierCurveTo(.92, .36, .88, .6, .5, .86); p.closePath(); return p; }],
  ['oval', c => { const p = new Path2D(); p.ellipse(.5, .5, .41, .27, 0, 0, Math.PI * 2); return p; }],
  ['diamond', c => poly([[.5, .1], [.82, .5], [.5, .9], [.18, .5]])],
  ['hexagon', c => poly(Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return [.5 + .38 * Math.cos(a), .5 + .38 * Math.sin(a)]; }))]
];
function poly(pts) { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; }
const cap = w => w[0].toUpperCase() + w.slice(1);
/* draw a unit-square Path2D scaled to W x H as a thick band (fill) or its dashed centre line (stroke) */
const shapePaint = mk => (c, W, H) => { const path = mk(); const go = (lw) => { c.save(); c.scale(W, H); c.lineJoin = c.lineCap = 'round'; c.lineWidth = lw / W; if (c.getLineDash().length) c.setLineDash(c.getLineDash().map(v => v / W)); c.stroke(path); c.restore(); };
  return { fill: () => go(W * .12), stroke: () => go(c.lineWidth) }; };
let shapeIdx = 0;
screens.shapes = {
  title: 'Shapes',
  render(el) {
    ST.shapesDone = ST.shapesDone || [];
    const draw = () => {
      shapeIdx = (shapeIdx + SHAPES.length) % SHAPES.length; const [name, mk] = SHAPES[shapeIdx];
      el.innerHTML = `<div class="tracehead"><span class="tname">${cap(name)}</span></div>` + traceShell(`⭐ ${ST.shapesDone.length} / ${SHAPES.length} shapes traced`);
      say(`Trace the ${name}`);
      traceBoard(el, { paint: shapePaint(mk), lineW: .08,
        onDone: () => { ST.traces++; if (!ST.shapesDone.includes(name)) ST.shapesDone.push(name);
          const all = ST.shapesDone.length >= SHAPES.length; if (all) ST.shapesDone = []; save(); SND.chime();
          celebrate(all ? { big: true, words: 'All the shapes! Amazing, Atlas!' } : { words: `${cap(name)}! Great tracing!` }); },
        prev: () => { shapeIdx--; draw(); }, next: () => { shapeIdx++; draw(); } });
    };
    draw();
  }
};

/* ---------- Color tracing: trace the word, the ink is that color ---------- */
const COLORS = [['red', '#e53935'], ['orange', '#fb8c00'], ['yellow', '#f2c200'], ['green', '#2e9e4f'], ['blue', '#1e6fe0'], ['purple', '#8e44c9'],
  ['pink', '#f0609e'], ['brown', '#8d5a3b'], ['black', '#222222'], ['gray', '#8a9099']];
let colorIdx = 0;
screens.colors = {
  title: 'Colors',
  render(el) {
    const draw = async () => {
      colorIdx = (colorIdx + COLORS.length) % COLORS.length; const [name, hex] = COLORS[colorIdx], word = name.toUpperCase();
      el.innerHTML = `<div class="tracehead"><span class="swatch" style="background:${hex}"></span><span class="tname" style="color:${hex}">${cap(name)}</span></div>` + traceShell();
      await fontReady(`800 40px ${ROUND_FONT}`, word);
      say(`Trace ${name}`);
      traceBoard(el, { aspect: .5, ink: hex, lineW: .045, guide: hex + '2e', dash: hex,
        paint: (c, W, H) => { c.textAlign = 'center'; c.textBaseline = 'middle'; let fs = H * .7; c.font = `800 ${fs}px ${ROUND_FONT}`;
          const mw = c.measureText(word).width; if (mw > W * .9) fs *= W * .9 / mw; c.font = `800 ${fs}px ${ROUND_FONT}`;
          return { fill: () => c.fillText(word, W / 2, H * .54), stroke: () => c.strokeText(word, W / 2, H * .54) }; },
        onDone: () => { ST.traces++; save(); $('#tr', el).style.background = hex + '22'; celebrate({ words: `${cap(name)}! Great tracing!` }); },
        prev: () => { colorIdx--; draw(); }, next: () => { colorIdx++; draw(); } });
    };
    draw();
  }
};

/* ---------- ABC Match: tap the picture that starts with the letter ---------- */
const XYLO = `<svg viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true"><g stroke="#333" stroke-width="2"><rect x="6" y="14" width="8" height="40" rx="3" fill="#e53935"/><rect x="18" y="18" width="8" height="32" rx="3" fill="#fb8c00"/><rect x="30" y="22" width="8" height="24" rx="3" fill="#f2c200"/><rect x="42" y="26" width="8" height="16" rx="3" fill="#2e9e4f"/><rect x="54" y="29" width="6" height="10" rx="2" fill="#1e6fe0"/></g><line x1="10" y1="60" x2="40" y2="4" stroke="#8d5a3b" stroke-width="3"/><circle cx="40" cy="4" r="4" fill="#8d5a3b"/></svg>`;
const ABCW = [['apple', '🍎'], ['bird', '🐦'], ['cat', '🐱'], ['dog', '🐶'], ['elephant', '🐘'], ['fish', '🐟'], ['grapes', '🍇'], ['house', '🏠'], ['ice cream', '🍦'],
  ['juice', '🧃'], ['key', '🔑'], ['lion', '🦁'], ['moon', '🌙'], ['nose', '👃'], ['octopus', '🐙'], ['pig', '🐷'], ['queen', '👸'], ['rainbow', '🌈'], ['sun', '☀️'],
  ['tree', '🌳'], ['umbrella', '☂️'], ['violin', '🎻'], ['whale', '🐳'], ['xylophone', XYLO], ['yarn', '🧶'], ['zebra', '🦓']];
let matchIdx = 0, matchRand = false;
screens.match = {
  title: 'ABC Match',
  render(el) {
    let nextT = 0; cleanup = () => clearTimeout(nextT);
    const round = () => {
      clearTimeout(nextT);
      if (matchRand) matchIdx = Math.floor(Math.random() * 26); matchIdx = (matchIdx + 26) % 26;
      const L = UP[matchIdx], right = ABCW[matchIdx];
      const others = shuffle(ABCW.filter((_, i) => i !== matchIdx)).slice(0, 2), opts = shuffle([right, ...others]);
      el.innerHTML = `<div class="match"><div class="mletter"><button class="hb" id="ml" aria-label="${L}">${letterBlock(L, 120)}</button><div class="mlow">${L}${L.toLowerCase()}</div></div>
        <div class="mopts">${opts.map(([w, pic]) => `<button class="mopt" data-w="${esc(w)}"><span class="pic">${pic}</span><span>${esc(w)}</span></button>`).join('')}</div></div>
        <div class="btnrow mnav"><button class="btn alt" id="mp">⬅️</button><button class="btn alt ${matchRand ? 'sel' : ''}" id="mr">🔀 ${matchRand ? 'Mixed' : 'A → Z'}</button><button class="btn" id="mn">➡️</button></div>`;
      const ask = () => say(`Which one starts with ${L}?`);
      ask(); $('#ml', el).onclick = () => { SND.letter(L); ask(); };
      let solved = false;
      $$('.mopt', el).forEach(b => b.onclick = () => {
        if (solved) return; const w = b.dataset.w;
        if (w === right[0]) { solved = true; b.classList.add('right', 'bounce'); ST.matches = (ST.matches || 0) + 1; save(); SND.letter(L);
          celebrate({ words: `${L} is for ${w}!` }); nextT = setTimeout(() => { if (current === 'match') { matchIdx++; round(); } }, 3400); }
        else { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); SND.soft(); say(`${cap(w)}. Try again!`); }
      });
      $('#mp', el).onclick = () => { SND.tap(); matchIdx--; round(); };
      $('#mn', el).onclick = () => { SND.tap(); matchIdx++; round(); };
      $('#mr', el).onclick = () => { SND.tap(); matchRand = !matchRand; round(); };
    };
    round();
  }
};

/* ---------- Months, Seasons & Weather ---------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SEASONS = [['winter', '⛄', '#5f8ef0'], ['spring', '🌷', '#3fbf60'], ['summer', '🏖️', '#f5a623'], ['fall', '🍂', '#d9682b']];
const SEASON_OF = m => SEASONS[Math.floor(((m + 1) % 12) / 3)]; // Dec-Feb winter, Mar-May spring, Jun-Aug summer, Sep-Nov fall
const SEASON_PICS = { winter: ['⛄', '❄️', '🧤', '🛷'], spring: ['🌷', '🐣', '🌱', '🦋'], summer: ['🏖️', '🍉', '🩳', '🏊'], fall: ['🍂', '🎃', '🍁', '🌰'] };
const WEATHER = [['sunny', '☀️', '#8fd3ff'], ['cloudy', '☁️', '#b8c7d9'], ['rainy', '🌧️', '#8aa0b8'], ['stormy', '⛈️', '#5d6b82'], ['snowy', '🌨️', '#dfe9f5'],
  ['windy', '🌬️', '#bfe3f2'], ['foggy', '🌫️', '#cfd4da'], ['rainbow', '🌈', '#9fd8ff']];
const W_OPT = { mode: 'months', puzzle: 0 };
const choiceBtns = opts => `<div class="mopts ${opts.length > 3 ? 'four' : ''}">${opts.map(o => `<button class="mopt" data-v="${esc(o.v)}"${o.c ? ` style="border-color:${o.c}"` : ''}><span class="pic">${o.pic}</span>${o.label ? `<span>${esc(o.label)}</span>` : ''}</button>`).join('')}</div>`;
screens.time = {
  title: 'Months, Seasons & Weather',
  render(el) {
    let T = 0, playOn = false; const tm = (f, ms) => { clearTimeout(T); T = setTimeout(f, ms); };
    cleanup = () => { clearTimeout(T); playOn = false; };
    const MODES = [['months', '📅 Months'], ['next', '➡️ Next'], ['order', '🧩 Order'], ['seasons', '🌸 Seasons'], ['mseason', '📆 Month → Season'], ['weather', '🌦️ Weather'], ['puzzle', '🧩 Puzzle']];
    function shell(inner) {
      el.innerHTML = `<div class="tabs wtabs">${MODES.map(([k, l]) => `<button class="chip ${W_OPT.mode === k ? 'sel' : ''}" data-m="${k}">${l}</button>`).join('')}</div><div id="wb" class="wbody">${inner}</div>`;
      $$('[data-m]', el).forEach(b => b.onclick = () => { cleanup(); W_OPT.mode = b.dataset.m; SND.tap(); run(); });
    }
    /* generic choice round: prompt, options [{v,pic,label}], right value, praise words */
    function quiz({ head, prompt, opts, right, praise, again }) {
      shell(`<div class="wq"><div class="whead">${head}</div>${choiceBtns(opts)}</div>`);
      say(prompt); const h = $('.whead', el); h.onclick = () => say(prompt);
      let solved = false;
      $$('.mopt', el).forEach(b => b.onclick = () => {
        if (solved) return;
        if (b.dataset.v === right) { solved = true; b.classList.add('right', 'bounce'); ST.wins = (ST.wins || 0) + 1; save(); celebrate({ words: praise }); tm(again, 3400); }
        else { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); SND.soft(); say('Try again!'); }
      });
    }
    const monthCard = (i, cls = '') => { const [, , col] = SEASON_OF(i); return `<span class="mcard ${cls}" style="--mc:${col};background:${col}22"><b>${MONTHS[i].slice(0, 3)}</b><small>${MONTHS[i]}</small></span>`; };
    const modes = {
      months() {
        shell(`<div class="mgrid">${MONTHS.map((m, i) => `<button class="mbtn" data-i="${i}">${monthCard(i)}</button>`).join('')}</div>
          <div class="btnrow wnav"><button class="btn" id="sing">▶️ Say them all</button></div>`);
        const hi = i => { $$('.mbtn', el).forEach(b => b.classList.toggle('on', +b.dataset.i === i)); };
        $$('.mbtn', el).forEach(b => b.onclick = () => { playOn = false; const i = +b.dataset.i; hi(i); SND.num(i + 1); say(MONTHS[i]); });
        $('#sing', el).onclick = async () => {
          if (playOn) { playOn = false; return; } playOn = true; $('#sing', el).textContent = '⏸ Stop';
          for (let i = 0; i < 12 && playOn; i++) { hi(i); SND.num(i + 1); await say(MONTHS[i], { rate: 1 }); await sleep(250); }
          const fin = playOn; playOn = false; hi(-1); if ($('#sing', el)) $('#sing', el).textContent = '▶️ Say them all';
          if (fin) celebrate({ big: true, words: 'All twelve months! Great job!' });
        };
        say('The months of the year!');
      },
      next() {
        const i = Math.floor(Math.random() * 12), n = (i + 1) % 12;
        const wrong = shuffle([...Array(12).keys()].filter(k => k !== n && k !== i)).slice(0, 2);
        quiz({ head: `<div class="wprompt">${monthCard(i, 'big')}<span class="arrow">➡️</span><span class="qmark">?</span></div>`, prompt: `What comes after ${MONTHS[i]}?`,
          opts: shuffle([n, ...wrong]).map(k => ({ v: String(k), pic: monthCard(k) })), right: String(n), praise: `${MONTHS[n]}! Great job!`, again: modes.next });
      },
      order() {
        const len = 4, st = Math.floor(Math.random() * 12), seq = Array.from({ length: len }, (_, k) => (st + k) % 12); let k = 0;
        shell(`<div class="wq"><div class="slots">${seq.map((_, j) => `<span class="slot" data-j="${j}">${j + 1}</span>`).join('')}</div>
          <div class="mopts four">${shuffle(seq).map(m => `<button class="mopt" data-v="${m}"><span class="pic">${monthCard(m)}</span></button>`).join('')}</div></div>`);
        say(`Put the months in order. Start with ${MONTHS[seq[0]]}`);
        $$('.mopt', el).forEach(b => b.onclick = () => {
          if (b.disabled) return;
          if (+b.dataset.v === seq[k]) { b.disabled = true; b.classList.add('used'); const sl = $(`.slot[data-j="${k}"]`, el); sl.innerHTML = monthCard(seq[k]); sl.classList.add('filled', 'bounce');
            SND.num(k + 1); say(MONTHS[seq[k]], { rate: 1 }); k++;
            if (k === len) { ST.orders++; save(); tm(() => celebrate({ words: 'In order! Great job!' }), 700); T2 = setTimeout(() => current === 'time' && W_OPT.mode === 'order' && modes.order(), 4000); } }
          else { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); SND.soft(); say('Try again!'); }
        });
      },
      seasons() {
        const [name, , col] = rnd(SEASONS);
        quiz({ head: `<div class="wprompt"><span class="sname" style="color:${col}">${cap(name)}</span></div>`, prompt: `Which one goes with ${name}?`,
          opts: shuffle(SEASONS.map(([n]) => ({ v: n, pic: rnd(SEASON_PICS[n]) }))), right: name, praise: `${cap(name)}! Great job!`, again: modes.seasons });
      },
      mseason() {
        const m = Math.floor(Math.random() * 12), [sn] = SEASON_OF(m);
        quiz({ head: `<div class="wprompt">${monthCard(m, 'big')}</div>`, prompt: `What season is ${MONTHS[m]}?`,
          opts: SEASONS.map(([n, pic, c]) => ({ v: n, pic, label: cap(n), c })), right: sn, praise: `${MONTHS[m]} is in ${sn}!`, again: modes.mseason });
      },
      weather() {
        const opts = shuffle(WEATHER).slice(0, 4), [name] = rnd(opts);
        quiz({ head: `<div class="wprompt"><span class="sname">${cap(name)}</span></div>`, prompt: `Which one is ${name}?`,
          opts: opts.map(([n, pic, c]) => ({ v: n, pic, c })), right: name, praise: `${cap(name)}! Great job!`, again: modes.weather });
      },
      puzzle() { weatherPuzzle(); }
    };
    let T2 = 0; const oc = cleanup; cleanup = () => { oc(); clearTimeout(T2); };
    /* jigsaw: a weather picture cut into 4 big pieces; drag (or tap piece, then tap spot) */
    function weatherPuzzle() {
      const [name, emo, sky] = WEATHER[W_OPT.puzzle % WEATHER.length];
      shell(`<div class="pz"><div class="pzboard" id="pzb"></div><div class="pztray" id="pzt"></div></div>
        <div class="btnrow wnav"><button class="btn alt" id="pzn">➡️ New picture</button></div>`);
      const land = innerWidth > innerHeight, top = $('#pzb', el).getBoundingClientRect().top;
      const nav = 96, avail = innerHeight - top - nav - 10;
      const S2 = Math.max(200, Math.floor(Math.min(land ? avail : (avail - 20) / 1.55, land ? (el.clientWidth - 40) / 2.1 : el.clientWidth - 20, 460)));
      const half = S2 / 2;
      const src = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1); src.width = src.height = S2 * dpr; const c = src.getContext('2d'); c.scale(dpr, dpr);
      const gr = c.createLinearGradient(0, 0, 0, S2); gr.addColorStop(0, sky); gr.addColorStop(1, '#ffffff'); c.fillStyle = gr; c.fillRect(0, 0, S2, S2);
      c.fillStyle = '#7cc66b'; c.fillRect(0, S2 * .82, S2, S2 * .18);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${S2 * .62}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`; c.fillText(emo, S2 / 2, S2 * .47);
      const board = $('#pzb', el), tray = $('#pzt', el);
      board.style.width = board.style.height = S2 + 'px'; tray.style.width = land ? S2 + 'px' : S2 + 'px'; tray.style.height = land ? S2 + 'px' : half + 'px';
      board.innerHTML = `<img class="pzghost" alt="" src="${src.toDataURL()}" style="width:${S2}px;height:${S2}px">` + [0, 1, 2, 3].map(q => `<span class="pzslot" data-q="${q}" style="left:${(q % 2) * half}px;top:${Math.floor(q / 2) * half}px;width:${half}px;height:${half}px"></span>`).join('');
      let placed = 0, sel = null;
      const order = shuffle([0, 1, 2, 3]);
      const pieces = order.map((q, k) => {
        const p = document.createElement('canvas'); p.width = p.height = half * dpr; p.className = 'pzpiece'; p.dataset.q = q;
        p.getContext('2d').drawImage(src, (q % 2) * half * dpr, Math.floor(q / 2) * half * dpr, half * dpr, half * dpr, 0, 0, half * dpr, half * dpr);
        const sc = land ? .92 : .86, pw = half * sc;
        p.style.width = p.style.height = pw + 'px';
        const home = land ? [(k % 2) * half + (half - pw) / 2, Math.floor(k / 2) * half + (half - pw) / 2] : [k * (S2 / 4) + (S2 / 4 - pw * .5) / 2, (half - pw * .5) / 2];
        if (!land) { p.style.width = p.style.height = pw * .5 + 'px'; }
        p.style.left = home[0] + 'px'; p.style.top = home[1] + 'px'; p._home = home; p._w = parseFloat(p.style.width);
        tray.appendChild(p); return p;
      });
      const place = (p, slot) => {
        if (+slot.dataset.q !== +p.dataset.q) { SND.soft(); say('Try again!'); back(p); return; }
        slot.appendChild(p); p.classList.add('done'); p.style.left = p.style.top = '0'; p.style.width = p.style.height = half + 'px'; p.style.transform = ''; slot.classList.add('filled');
        SND.num(++placed); if (placed === 4) { ST.wins = (ST.wins || 0) + 1; save(); tm(() => celebrate({ big: true, words: `${cap(name)}! You did the puzzle!` }), 400); T2 = setTimeout(() => { if (current === 'time' && W_OPT.mode === 'puzzle') { W_OPT.puzzle++; weatherPuzzle(); } }, 4200); }
      };
      const back = p => { p.style.transform = ''; p.style.zIndex = ''; p.classList.remove('sel'); };
      const slotAt = (x, y) => $$('.pzslot', el).find(sl => { const r = sl.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
      pieces.forEach(p => {
        let sx = 0, sy = 0, moved = false;
        p.onpointerdown = e => { if (p.classList.contains('done')) return; e.preventDefault(); try { p.setPointerCapture(e.pointerId); } catch (x) {} sx = e.clientX; sy = e.clientY; moved = false; p.style.zIndex = 5; };
        p.onpointermove = e => { if (!sx || p.classList.contains('done')) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 8) moved = true; p.style.transform = `translate(${dx}px,${dy}px) scale(1.06)`; };
        p.onpointerup = e => { if (!sx || p.classList.contains('done')) return; sx = 0;
          if (!moved) { back(p); $$('.pzpiece', el).forEach(o => o.classList.remove('sel')); sel = p; p.classList.add('sel'); SND.tap(); return; }
          const sl = slotAt(e.clientX, e.clientY); if (sl && !sl.classList.contains('filled')) place(p, sl); else back(p); };
      });
      $$('.pzslot', el).forEach(sl => sl.onclick = () => { if (sel && !sl.classList.contains('filled')) { const p = sel; sel = null; place(p, sl); } });
      $('#pzn', el).onclick = () => { SND.tap(); W_OPT.puzzle++; weatherPuzzle(); };
      say(`Make the ${name} picture!`);
      window.__pz = { name, pieces };
    }
    const run = () => { clearTimeout(T); clearTimeout(T2); playOn = false; $('#toast').classList.remove('show'); modes[W_OPT.mode](); };
    run();
  }
};

/* ---------- Count Blocks: tap to stack, count aloud, then trace the number ---------- */
let cbN = 0;
screens.count = {
  title: 'Count Blocks',
  render(el) {
    const MAX = 20;
    const draw = () => {
      el.innerHTML = `<div class="cbwrap"><button class="cbstage" id="cbs" aria-label="Add a block">${cbN ? numberBlock(cbN, cbSize(), { label: false, cls: 'cbnb' }) : '<span class="muted cbhint">Tap to add a block!</span>'}</button>
        <div class="cbside"><div class="sitnum" id="cbn">${cbN}</div><div class="cbword">${cbN ? cap(nword(cbN)) : ''}</div>
        <div class="btnrow"><button class="btn" id="cbp">➕</button><button class="btn alt" id="cbm">➖</button></div>
        <div class="btnrow"><button class="btn alt" id="cbc">🔊 Count</button><button class="btn purple" id="cbt" ${cbN ? '' : 'disabled'}>✍️ Trace ${cbN || ''}</button></div>
        <div class="btnrow"><button class="btn alt" id="cb0">🧽 Start over</button></div></div></div>`;
      const add = () => { if (cbN >= MAX) { SND.soft(); return; } cbN++; draw(); const nb = $('.cbnb', el); if (nb) nb.classList.add('bounce'); SND.num(cbN); say(cap(nword(cbN)) + '!', { rate: 1 });
        if (cbN % 5 === 0) celebrate({ words: `${cap(nword(cbN))}! Great counting!` }); };
      $('#cbs', el).onclick = add; $('#cbp', el).onclick = add;
      $('#cbm', el).onclick = () => { if (cbN > 0) { cbN--; draw(); SND.tap(); if (cbN) say(cap(nword(cbN)), { rate: 1 }); } };
      $('#cb0', el).onclick = () => { cbN = 0; draw(); SND.tap(); };
      $('#cbc', el).onclick = async () => { for (let i = 1; i <= cbN; i++) { if (current !== 'count') return; $('#cbn', el).textContent = i; SND.num(i); await say(nword(i), { rate: 1, show: false }); }
        if (cbN) celebrate({ words: `${cap(nword(cbN))}! Great counting!` }); };
      $('#cbt', el).onclick = () => { if (!cbN) return; P.mode = 'trace'; P.set = '123'; P.rev = false; P.idx = cbN; go('play'); };
    };
    const cbSize = () => { const h = innerHeight - 200, rows = Math.min(10, cbN || 1); return Math.max(14, Math.min(48, Math.floor(h / (rows + 1.5)))); };
    draw(); if (!cbN) say('Tap to add a block!');
  }
};

/* ---------- Sing-along: ABC song and counting song, items light up as they're sung ---------- */
// public-domain "Twinkle"/ABC tune, one note per letter (MIDI)
const ABC_TUNE = [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 62, 62, 60, 67, 67, 65, 64, 64, 62, 67, 65, 64, 62];
const ABC_BEATS = [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, .5, .5, .5, .5, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2];
const COUNT_TUNE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 74, 72, 71, 69, 67, 65, 64, 62, 60, 72];
let singSong = 'abc';
screens.sing = {
  title: 'Sing-along',
  render(el) {
    let on = false; cleanup = () => { on = false; };
    const items = () => singSong === 'abc' ? UP : singSong === 'c10' ? Array.from({ length: 10 }, (_, i) => String(i + 1)) : Array.from({ length: 20 }, (_, i) => String(i + 1));
    const draw = () => {
      const it = items();
      el.innerHTML = `<div class="tabs">${[['abc', '🔤 ABC song'], ['c10', '🔢 Count to 10'], ['c20', '🔢 Count to 20']].map(([k, l]) => `<button class="chip ${singSong === k ? 'sel' : ''}" data-s="${k}">${l}</button>`).join('')}</div>
        <div class="singgrid ${singSong}">${it.map((x, i) => `<span class="sg" data-i="${i}">${/\d/.test(x) ? `<b class="sgn">${x}</b>` : letterBlock(x, sgSize(it.length), 'small')}</span>`).join('')}</div>
        <div class="btnrow wnav"><button class="btn" id="go">▶️ Sing!</button></div>`;
      $$('[data-s]', el).forEach(b => b.onclick = () => { on = false; singSong = b.dataset.s; SND.tap(); draw(); });
      $$('.sg', el).forEach(b => b.onclick = () => { const x = it[+b.dataset.i]; light(+b.dataset.i); /\d/.test(x) ? SND.num(+x) : SND.letter(x); say(/\d/.test(x) ? nword(+x) : x, { rate: 1, show: false }); });
      $('#go', el).onclick = sing;
    };
    const sgSize = n => { const land = innerWidth > innerHeight, cols = land ? (n > 20 ? 9 : 10) : (n > 20 ? 6 : 5), rows = Math.ceil(n / cols);
      return Math.max(34, Math.min(92, Math.floor(Math.min((el.clientWidth - 20) / cols - 14, (innerHeight - 330) / rows - 14)))); };
    const light = i => $$('.sg', el).forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    async function sing() {
      if (on) { on = false; return; } on = true; $('#go', el).textContent = '⏸ Stop';
      const it = items(), abc = singSong === 'abc';
      await say(abc ? 'Let\u2019s sing the ABCs!' : 'Let\u2019s count!', { show: false }); await sleep(200);
      for (let i = 0; i < it.length && on; i++) {
        light(i); const m = abc ? ABC_TUNE[i] : COUNT_TUNE[i % COUNT_TUNE.length], beats = abc ? ABC_BEATS[i] : 1;
        tone(mtof(m), 0, .35, 'triangle', .22); const t0 = Date.now();
        await say(abc ? it[i] : nword(+it[i]), { rate: 1, show: false });
        const want = (abc ? 520 : 650) * beats; const left = want - (Date.now() - t0); if (left > 0) await sleep(left);
      }
      const fin = on; on = false; light(-1); if ($('#go', el)) $('#go', el).textContent = '▶️ Sing!';
      if (fin) { if (abc) { SND.chime(); await say('Now I know my ABCs!'); } celebrate({ big: true, words: 'Great singing!' }); }
    }
    draw();
  }
};

/* ---------- Feelings board ---------- */
const FEELINGS = [['happy', '😀', '#f4c22b'], ['sad', '😢', '#5f8ef0'], ['tired', '😴', '#8e7cc3'], ['hungry', '😋', '#f59b23'], ['angry', '😠', '#e04848'], ['scared', '😨', '#6a7be8'],
  ['silly', '🤪', '#ef5d93'], ['sick', '🤒', '#3fbf60'], ['excited', '🤩', '#ff7a45'], ['calm', '😌', '#14b0bf'], ['hurt', '🤕', '#c25fd1'], ['loved', '🥰', '#e4588f']];
screens.feelings = {
  title: 'Feelings',
  render(el) {
    el.innerHTML = `<div class="feelgrid">${FEELINGS.map(([w, p, c]) => `<button class="feel" data-w="${w}" style="--k:${c}"><span class="pic">${p}</span><span>${cap(w)}</span></button>`).join('')}</div>`;
    $$('.feel', el).forEach(b => b.onclick = () => { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); ST.words++; save(); say(`I feel ${b.dataset.w}`); });
    say('How do you feel?');
  }
};

/* ---------- My Day: picture schedule, tap to mark done ---------- */
const ROUTINE = [['wake', '🌅', 'Wake up', 'Wake up!'], ['teeth', '🦷', 'Brush teeth', 'Brush teeth!'], ['eat', '🍽️', 'Eat', 'Eat!'], ['play', '🧸', 'Play', 'Play!'],
  ['bath', '🛁', 'Bath', 'Bath time!'], ['night', '🌙', 'Night Night', 'Night Night!']];
screens.routine = {
  title: 'My Day',
  render(el) {
    const today = new Date().toDateString();
    if (!ST.day || ST.day.date !== today) { ST.day = { date: today, done: [] }; save(); }
    const draw = () => {
      const dn = ST.day.done, nextI = ROUTINE.findIndex(r => !dn.includes(r[0]));
      el.innerHTML = `<div class="routine">${ROUTINE.map(([k, p, l], i) => `<button class="rstep ${dn.includes(k) ? 'done' : ''} ${i === nextI ? 'now' : ''}" data-k="${k}">
          <span class="rnum">${i + 1}</span><span class="pic">${dn.includes(k) ? '✅' : p}</span><span class="rl">${l}</span></button>`).join('')}</div>
        <div class="btnrow wnav"><button class="btn alt" id="rreset">🧽 Start the day over</button></div>`;
      $$('.rstep', el).forEach(b => b.onclick = () => {
        const k = b.dataset.k, r = ROUTINE.find(x => x[0] === k);
        if (dn.includes(k)) { ST.day.done = dn.filter(x => x !== k); save(); SND.tap(); draw(); return; }
        dn.push(k); save(); draw(); SND.chime(); say(r[3]);
        if (ROUTINE.every(x => dn.includes(x[0]))) setTimeout(() => celebrate({ big: true, words: 'All done! Great day!' }), 1200);
        else setTimeout(() => { applause(1.2, 5); }, 300);
      });
      $('#rreset', el).onclick = () => { ST.day.done = []; save(); SND.tap(); draw(); };
    };
    draw(); say('My day!', { show: false });
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
      ${[['talk', 'Talk board'], ['potty', 'Potty Mission'], ['play', 'ABC & 123'], ['shapes', 'Shapes tracing'], ['colors', 'Color tracing'], ['match', 'ABC Match'], ['time', 'Months, Seasons & Weather'], ['count', 'Count Blocks'], ['sing', 'Sing-along'], ['feelings', 'Feelings'], ['routine', 'My Day schedule'], ['stickers', 'Sticker chart tile']].map(([k, l]) => `<div class="row">${l} ${sw(k, S.sections).replace('data-k', 'data-sec')}</div>`).join('')}
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


    <div class="panel"><h3 style="margin-top:0">Potty</h3>
      <div class="row">Sit and count to <select id="sit">${[5, 10, 15, 20, 30].map(v => `<option ${+S.sitCount === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="row">Tower size <select id="goal">${[5, 10].map(v => `<option ${+S.towerGoal === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="row">"I tried" also earns a block ${sw('triesCount')}</div>
      <div class="row">Counting game goes up to <select id="cmax">${[5, 10, 20].map(v => `<option ${+S.countMax === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>

    <div class="panel"><h3 style="margin-top:0">Progress</h3>
      ${[['potty', '🚽 Potty successes'], ['tries', '👍 Potty tries'], ['tower', '🧱 Blocks on current tower'], ['towers', '🏆 Towers built'], ['asks', '🙋 Asked for potty'],
        ['missions', '🚀 Potty missions finished'], ['words', '💬 Talk buttons pressed'], ['traces', '✍️ Letters/numbers traced'], ['counts', '🍎 Counting wins'], ['orders', '🧱 Ordering wins']]
        .map(([k, l]) => `<div class="row">${l} <b style="font-size:24px">${ST[k]}</b></div>`).join('')}
      <div class="row"><button class="sbtn" id="resetTower">Reset tower</button><button class="sbtn" id="resetStk">Reset sticker chart</button><button class="sbtn red" id="resetAll">Reset all counts</button></div></div>

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
    sel('#sit', 'sitCount'); sel('#goal', 'towerGoal'); sel('#cmax', 'countMax');
    $('#resetStk', el).onclick = () => { if (confirm('Clear the sticker chart?')) { ST.stickers = []; save(); go('parent'); } };
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
let rsT = 0, lastW = innerWidth;
addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; if (current === 'talk' || (current === 'play' && P.mode === 'trace') || current === 'shapes' || current === 'colors' || (current === 'time' && W_OPT.mode === 'puzzle')) go(current); } }, 300); });
go('home');
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
