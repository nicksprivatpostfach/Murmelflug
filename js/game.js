import { World, Preview, zoneOfLevel, MAXL } from './world.js';

/* =========================================================
   Murmelflug – Spiellogik
   ========================================================= */
const $ = s => document.querySelector(s);

const DIFFS = [
  { id: 'sternchen', name: 'Sternchen', star: true, desc: 'Plus und Minus bis 20, später bis 100.', excl: { kind: 'gear', id: 'engel' } },
  { id: 'leicht', name: 'Entdecker', off: 0, desc: 'Plus und Minus mit großen Zahlen, später das Einmaleins.', excl: { kind: 'mat', id: 'nordlicht' } },
  { id: 'mittel', name: 'Forscher', off: 25, desc: 'Zahlen über 200, Einmaleins, Teilen und Lücken.', excl: { kind: 'mat', id: 'plasma' } },
  { id: 'schwer', name: 'Astronaut', off: 50, desc: 'Große Mal-Aufgaben, Klammern, drei Zahlen.', excl: { kind: 'gear', id: 'jet' } },
  { id: 'profi', name: 'Genie', off: 80, desc: 'Punkt vor Strich, zweistellig mal zweistellig.', excl: { kind: 'mat', id: 'singular' } },
];
const ZONES = ['Erde', 'Wolken', 'Mond', 'Planeten', 'Sternennebel', 'Schwarzes Loch'];
const ZONE_LONG = ['Auf der Erde', 'Über den Wolken', 'Beim Mond', 'Bei den Planeten', 'Im Sternennebel', 'Am Schwarzen Loch'];
const ZONE_COL = ['#45b54f', '#5cc6ff', '#9aa7c8', '#ff8a4c', '#c04dff', '#2b1745'];
const PATTERNS = [
  { id: 'uni', name: 'Klarglas', price: 0 }, { id: 'streifen', name: 'Streifen', price: 25 }, { id: 'punkte', name: 'Tupfen', price: 40 },
  { id: 'katzenauge', name: 'Katzenauge', price: 70 }, { id: 'spirale', name: 'Wirbel', price: 110 }, { id: 'baender', name: 'Planetenbänder', price: 160 },
  { id: 'flammen', name: 'Flammen', price: 220 }, { id: 'schuppen', name: 'Drachenschuppen', price: 300 }, { id: 'galaxie', name: 'Galaxie', price: 450 },
];
const MATS = [
  { id: 'glitzer', name: 'Glitzer', lvl: 5, price: 50 },
  { id: 'perlmutt', name: 'Perlmutt', lvl: 10, price: 90 },
  { id: 'leucht', name: 'Leucht-Gel', lvl: 15, price: 130 },
  { id: 'gold', name: 'Goldstaub', lvl: 22, price: 180 },
  { id: 'regenbogen', name: 'Regenbogen-Gel', lvl: 30, price: 250 },
  { id: 'lava', name: 'Lava-Gel', lvl: 36, price: 300 },
  { id: 'sternenstaub', name: 'Sternenstaub', lvl: 40, price: 340 },
  { id: 'horizont', name: 'Ereignishorizont', lvl: 52, price: 480 },
  { id: 'nordlicht', name: 'Nordlicht-Gel', excl: 'leicht' },
  { id: 'plasma', name: 'Plasma-Gel', excl: 'mittel' },
  { id: 'singular', name: 'Singularität', excl: 'profi' },
];
const GEAR = [
  { id: 'propeller', name: 'Propeller', slot: 'body', lvl: 8, price: 200 },
  { id: 'duesen', name: 'Düsenantrieb', slot: 'body', lvl: 25, price: 450 },
  { id: 'engel', name: 'Engelsflügel', slot: 'body', excl: 'sternchen' },
  { id: 'jet', name: 'Jetflügel', slot: 'body', excl: 'schwer' },
  { id: 'funken', name: 'Funkenspur', slot: 'trail', lvl: 18, price: 220 },
  { id: 'komet', name: 'Kometenschweif', slot: 'trail', excl: 'all' },
];
const ENDINGS = [
  { id: 'wurm', name: 'Das Wurmloch', desc: 'Durch das Wurmloch zurück zur Erde.' },
  { id: 'stern', name: 'Ein neuer Stern', desc: 'Die Murmel wird zum Stern.' },
  { id: 'urknall', name: 'Urknall', desc: 'Ein neues Universum entsteht.' },
  { id: 'aliens', name: 'Murmel-Aliens', desc: 'Besuch aus dem All.' },
  { id: 'zeit', name: 'Zeitreise', desc: 'Mit goldener Spur zum Anfang.' },
];
const COLORS = ['#ff4d6d', '#ff8a3d', '#ffc83d', '#7ad94f', '#1fc48c', '#22c3d9', '#3a8bff', '#6c4dff', '#b04dff', '#ff5fbf', '#ffffff', '#2b2b3a'];
const SLOT_LV = [1, 12, 30];
const SD_START = 60, SD_BONUS = 3;
const exclLabel = id => id === 'all' ? 'Alle 5 Stufen schaffen' : DIFFS.find(d => d.id === id).name + ' schaffen';

/* ---------------- Speicher ---------------- */
const KEY = 'murmelflug.v2';
function fresh() {
  const lv = {}; DIFFS.forEach(d => lv[d.id] = 1);
  return { diff: null, levels: { ...lv }, best: { ...lv }, done: {}, coins: 0, streak: 0, owned: ['uni'], mats: [], gear: [],
    marble: { pattern: 'uni', c1: '#3a8bff', c2: '#ffffff', mix: [], body: null, trail: null }, sound: true, used: [], pin: null,
    allSlots: false, endings: [], sdBest: 0, hist: [], updatedAt: 0 };
}
function normalize(d) {
  const f = fresh(), n = Object.assign(f, d);
  n.levels = Object.assign(fresh().levels, d.levels || {}); n.best = Object.assign(fresh().best, d.best || {});
  n.marble = Object.assign(fresh().marble, d.marble || {}); if (!Array.isArray(n.marble.mix)) n.marble.mix = [];
  for (const k of ['owned', 'mats', 'gear', 'used', 'endings', 'hist']) if (!Array.isArray(n[k])) n[k] = [];
  if (!n.owned.includes('uni')) n.owned.unshift('uni'); if (typeof n.done !== 'object' || !n.done) n.done = {};
  return n;
}
let S = fresh();
try {
  const raw = localStorage.getItem(KEY) || localStorage.getItem('murmelflug.v1');
  if (raw) S = normalize(JSON.parse(raw));
} catch (e) { }
function save() { S.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
const bestAny = () => Math.max(...DIFFS.map(d => S.best[d.id] || 1));
const slotCount = () => S.allSlots ? 3 : SLOT_LV.filter(l => bestAny() >= l).length;
const diffObj = id => DIFFS.find(d => d.id === (id || S.diff)) || DIFFS[0];
const curLevel = () => S.levels[S.diff || 'sternchen'];
const allDone = () => DIFFS.every(d => S.done[d.id]);

/* ---------------- Aufgaben ---------------- */
const TYPE_NAMES = {
  plus: 'Plus ohne Zehnerübergang', plusU: 'Plus mit Zehnerübergang', minus: 'Minus ohne Zehnerübergang', minusU: 'Minus mit Zehnerübergang',
  miss: 'Lücken-Aufgaben', mul: 'Einmaleins', div: 'Geteilt', three: 'Drei Zahlen', mul21: 'Zweistellig mal einstellig', brack: 'Klammern',
  missmul: 'Mal-Lücken', prec: 'Punkt vor Strich', div21: 'Großes Teilen', mul22: 'Zweistellig mal zweistellig', sq: 'Quadratzahlen'
};
const TYPE_MIN = { plus: 1, plusU: 1, minus: 1, minusU: 1, mul: 12, miss: 18, div: 22, three: 28, mul21: 45, brack: 55, missmul: 62, prec: 70, div21: 82, mul22: 95, sq: 110 };
function rnd(a, b) { a = Math.ceil(a); b = Math.floor(b); if (b < a) b = a; return a + Math.floor(Math.random() * (b - a + 1)); }
const carryAdd = (a, b) => (a % 10) + (b % 10) >= 10;
const carrySub = (a, b) => (a % 10) < (b % 10);
function genAdd(lo, M, want) {
  for (let i = 0; i < 40; i++) { const a = rnd(lo, M * .6), b = rnd(Math.max(2, lo * .6), M - a); const c = carryAdd(a, b); if (want == null || c === want) return { q: `${a} + ${b} = □`, ans: a + b, k: c ? 'plusU' : 'plus' }; }
  const a = rnd(lo, M * .5), b = rnd(2, M - a); return { q: `${a} + ${b} = □`, ans: a + b, k: carryAdd(a, b) ? 'plusU' : 'plus' };
}
function genSub(lo, M, want) {
  for (let i = 0; i < 40; i++) { const a = rnd(Math.max(lo + 3, M * .35), M), b = rnd(Math.max(2, lo * .5), a - 2); const c = carrySub(a, b); if (want == null || c === want) return { q: `${a} − ${b} = □`, ans: a - b, k: c ? 'minusU' : 'minus' }; }
  const a = rnd(M * .5, M), b = rnd(2, a - 2); return { q: `${a} − ${b} = □`, ans: a - b, k: carrySub(a, b) ? 'minusU' : 'minus' };
}
function genMiss(M) {
  const a = rnd(Math.max(2, M * .1), M * .6), b = rnd(Math.max(2, M * .1), Math.max(3, M - a)), k = Math.random();
  if (k < .4) return { q: `□ + ${b} = ${a + b}`, ans: a, k: 'miss' };
  if (k < .7) return { q: `${a} + □ = ${a + b}`, ans: b, k: 'miss' };
  return { q: `${a + b} − □ = ${a}`, ans: b, k: 'miss' };
}
function genType(ty, p) {
  const M = 50 + p * 5 + Math.max(0, p - 60) * 12, TB = p >= 100 ? 15 : p >= 40 ? 12 : 10, small = Math.min(10, 2 + Math.floor(p / 3));
  let a, b, c, d, e;
  switch (ty) {
    case 'plus': return genAdd(M * .15, M, false); case 'plusU': return genAdd(M * .15, M, true);
    case 'minus': return genSub(M * .15, M, false); case 'minusU': return genSub(M * .15, M, true);
    case 'mul': a = rnd(2, p >= 40 ? TB : small); b = rnd(2, p >= 40 ? TB : 10); return { q: `${a} × ${b} = □`, ans: a * b };
    case 'div': a = rnd(2, p >= 40 ? TB : 10); b = rnd(2, p >= 40 ? TB : 10); return { q: `${a * b} ÷ ${b} = □`, ans: a };
    case 'miss': return genMiss(Math.floor(M * .8));
    case 'three': { const m = Math.floor(M * .5); a = rnd(m * .2, m); b = rnd(5, m * .6); c = rnd(5, a + b - 2); return { q: `${a} + ${b} − ${c} = □`, ans: a + b - c }; }
    case 'mul21': a = rnd(11, Math.min(99, 15 + p)); b = rnd(2, 9); return { q: `${a} × ${b} = □`, ans: a * b };
    case 'brack': a = rnd(3, 10 + p / 6); b = rnd(2, 10 + p / 8); c = rnd(2, 9);
      if (Math.random() < .5) return { q: `(${a} + ${b}) × ${c} = □`, ans: (a + b) * c };
      if (a <= b) { const t = a; a = b + rnd(2, 9); b = t; } return { q: `(${a} − ${b}) × ${c} = □`, ans: (a - b) * c };
    case 'missmul': a = rnd(2, TB); b = rnd(2, TB); return { q: `□ × ${b} = ${a * b}`, ans: a };
    case 'prec': a = rnd(5, 20 + p / 2); b = rnd(2, TB); c = rnd(2, TB);
      if (p >= 90 && Math.random() < .4) { d = rnd(2, 9); e = rnd(2, 9); return { q: `${b} × ${c} + ${d} × ${e} = □`, ans: b * c + d * e }; }
      if (Math.random() < .5 || a <= b * c) return { q: `${a} + ${b} × ${c} = □`, ans: a + b * c };
      return { q: `${a} − ${b} × ${c} = □`, ans: a - b * c };
    case 'div21': a = rnd(11, Math.min(99, 10 + p / 2)); b = rnd(2, 9); return { q: `${a * b} ÷ ${b} = □`, ans: a };
    case 'mul22': a = rnd(11, Math.min(99, Math.max(12, Math.floor(p / 3)))); b = rnd(11, Math.min(29, 10 + Math.floor(p / 10))); return { q: `${a} × ${b} = □`, ans: a * b };
    case 'sq': a = rnd(11, Math.min(25, 5 + Math.floor(p / 8))); return { q: `${a}² = □`, ans: a * a };
  }
}
let weakCache = null;
function weakness() {
  if (weakCache) return weakCache;
  const m = {}; for (const h of S.hist.slice(-400)) { if (h.m === 'sd') continue; const x = m[h.k] || (m[h.k] = { n: 0, ok: 0 }); x.n++; x.ok += h.ok ? 1 : 0; }
  const w = {}; for (const k in m) w[k] = m[k].n >= 5 && m[k].ok / m[k].n < .7 ? 1.7 : 1; return (weakCache = w);
}
function genNormal(p) {
  const wk = weakness(), boost = k => wk[k] || 1;
  const fam = Math.max(.6, 1.6 - p / 80);
  const types = [['add', fam * Math.max(boost('plus'), boost('plusU'))], ['sub', fam * Math.max(boost('minus'), boost('minusU'))]];
  for (const [k, min, w] of [['mul', 12, 2], ['miss', 18, 1.5], ['div', 22, 1.5], ['three', 28, 1.5], ['mul21', 45, 2], ['brack', 55, 1.5], ['missmul', 62, 1], ['prec', 70, 1.5], ['div21', 82, 1.5], ['mul22', 95, 2], ['sq', 110, 1]]) if (p >= min) types.push([k, w * boost(k)]);
  let tot = types.reduce((s, x) => s + x[1], 0), r = Math.random() * tot, ty = types[0][0];
  for (const [n, w] of types) { if ((r -= w) <= 0) { ty = n; break; } }
  const M = 50 + p * 5 + Math.max(0, p - 60) * 12;
  if (ty === 'add') return genAdd(M * .15, M);
  if (ty === 'sub') return genSub(M * .15, M);
  const t = genType(ty, p); t.k = t.k || ty; return t;
}
function genStar(level, forced) {
  const M = Math.round(18 + level * 1.4), wk = weakness();
  if (forced) {
    if (forced === 'miss') return genMiss(M);
    if (forced.startsWith('plus')) return genAdd(Math.max(2, M * .12), M, forced === 'plusU');
    return genSub(Math.max(2, M * .12), M, forced === 'minusU');
  }
  const r = Math.random() * (level >= 25 ? 7.5 : 6) * 1;
  if (level >= 25 && r > 6) return genMiss(M);
  const lo = Math.max(2, M * .12);
  if (r < 3 * Math.max(wk.plus || 1, wk.plusU || 1) / 1.35) return genAdd(lo, M);
  return genSub(lo, M);
}
function makeTask(diffId, level, forced) {
  const d = diffObj(diffId);
  let t;
  if (d.star) t = genStar(level, forced);
  else if (forced) { const p = d.off + level; t = genType(forced, Math.max(p, TYPE_MIN[forced])); t.k = t.k || forced; }
  else t = genNormal(d.off + level);
  return t;
}

/* ---------------- Ton ---------------- */
let AC = null;
function tone(f, d, type = 'sine', vol = .07, when = 0) {
  if (!S.sound) return; try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + d + .05);
  } catch (e) { }
}
const sfx = {
  ok() { tone(523, .18, 'triangle'); tone(659, .18, 'triangle', .07, .09); tone(988, .3, 'triangle', .07, .18); },
  bad() { tone(240, .25, 'triangle', .08); tone(170, .35, 'triangle', .08, .15); },
  coin() { tone(1320 + Math.random() * 200, .08, 'square', .02); },
  key() { tone(700, .04, 'sine', .03); },
  world() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'triangle', .06, i * .1)); },
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .35, 'triangle', .07, i * .13)); },
  tick() { tone(1000, .05, 'square', .02); },
};

/* ---------------- DOM ---------------- */
const gameEl = $('#game'), startEl = $('#start'), wsEl = $('#ws'), dlgEl = $('#dlg'), taskEl = $('#task'), fbEl = $('#fb'), panel = $('#panel'), okKey = $('#okKey');
let world = null, preview = null;
let task = null, input = '', state = 'input', lastQ = '', tStart = 0;
let play = { mode: 'normal' };

function el(tag, attrs = {}, html = '') { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; }
let banT = 0; function banner(s, b) { const e = $('#banner'); $('#banSmall').textContent = s; $('#banBig').textContent = b; e.classList.remove('show'); void e.offsetWidth; e.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => e.classList.remove('show'), 3100); }
let toastT = 0; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }

function measure() {
  if (!world) return;
  if (gameEl.hidden || state === 'cine') { world.setView(innerWidth / 2, innerHeight * (state === 'cine' ? .45 : .42)); return; }
  const r = $('#stage').getBoundingClientRect();
  const bottom = Math.min(r.bottom, innerHeight - 8), h = bottom - r.top;
  if (r.width > 0 && h > 0) world.setView(r.left + r.width / 2, r.top + h * .6);
}
function updateHud() {
  const sd = play.mode === 'sd';
  const lv = sd ? Math.min(MAXL, 1 + play.solved) : curLevel(), z = zoneOfLevel(lv);
  $('#lvlNum').textContent = sd ? play.solved + ' gelöst' : 'Level ' + lv;
  $('#zoneName').textContent = sd ? 'Sudden Death' : play.mode === 'train' ? 'Üben' : ZONES[z] + ' · ' + diffObj().name;
  $('#coinNum').textContent = S.coins;
  [...$('#track').querySelectorAll('i')].forEach((s, i) => { s.style.background = ZONE_COL[i]; s.classList.toggle('on', i <= z); });
  $('#knob').style.left = ((lv - 1) / (MAXL - 1) * 100) + '%';
  document.documentElement.style.setProperty('--mc', S.marble.c1);
  const sb = $('#sndBtn'); sb.setAttribute('aria-pressed', String(S.sound)); sb.style.opacity = S.sound ? 1 : .5;
  gameEl.classList.toggle('sd', sd); gameEl.classList.toggle('train', play.mode === 'train');
}

/* ---------------- Startbildschirm ---------------- */
function renderStart() {
  const box = $('#diffs'); box.innerHTML = '';
  DIFFS.forEach((d, i) => {
    const b = el('button', { class: 'diff d' + i }); const lv = S.levels[d.id];
    b.innerHTML = `<strong>${d.name}</strong><span>${d.desc}</span><em>${lv > 1 ? 'Weiter bei Level ' + lv : 'Starte bei Level 1'}</em>${S.done[d.id] ? '<span class="done">Geschafft</span>' : ''}`;
    b.addEventListener('click', () => startGame(d.id)); box.appendChild(b);
  });
  const nd = DIFFS.filter(d => S.done[d.id]).length, sdb = el('button', { class: 'diff d5' + (allDone() ? '' : ' locked') });
  sdb.innerHTML = allDone() ? `<strong>Sudden Death</strong><span>Gegen die Uhr. Ein Fehler und es ist vorbei.</span><em>Rekord: ${S.sdBest}</em>`
    : `<strong>Sudden Death</strong><span>Wird frei, wenn alle 5 Stufen geschafft sind.</span><em>${nd} von 5 geschafft</em>`;
  sdb.addEventListener('click', () => { if (allDone()) startSD(); else toast('Schaffe erst Level 60 in allen 5 Stufen.'); }); box.appendChild(sdb);
  $('#startCoins').textContent = S.coins; $('#endsLbl').textContent = `Enden ${S.endings.length}/5`;
}
function showStart() {
  play = { mode: 'normal' }; gameEl.hidden = true; startEl.hidden = false; renderStart();
  world.setLevel(S.diff ? curLevel() : 1, { instant: true }); measure(); mountPreview('#startPv');
}
function startGame(id) {
  S.diff = id; save(); play = { mode: 'normal' };
  startEl.hidden = true; gameEl.hidden = false; panel.hidden = false;
  world.setLevel(curLevel(), { instant: true }); updateHud(); nextTask(); requestAnimationFrame(measure); unmountPreview();
}

/* ---------------- Aufgabenfluss ---------------- */
function renderTask() {
  const [a, b] = task.q.split('□'); taskEl.textContent = ''; taskEl.classList.toggle('long', task.q.length > 15);
  taskEl.append(a); const s = el('span', { class: 'slot' + (input ? ' filled' : ' empty') }); s.textContent = input || '?'; taskEl.append(s); taskEl.append(b || '');
}
function nextTask() {
  let tk;
  for (let i = 0; i < 8; i++) {
    if (play.mode === 'sd') tk = genNormal(Math.min(140, 10 + play.solved * 3));
    else if (play.mode === 'train') tk = makeTask(play.diff, play.level, play.key);
    else tk = makeTask(S.diff, curLevel());
    if (tk.q !== lastQ) break;
  }
  lastQ = tk.q; task = tk; input = ''; state = 'input'; tStart = performance.now();
  panel.classList.remove('ok', 'bad'); fbEl.className = 'fb'; fbEl.textContent = ''; okKey.textContent = 'Prüfen';
  $('#modeTag').textContent = play.mode === 'train' ? `Üben: ${TYPE_NAMES[play.key]} · ${play.n + 1} von ${play.total}` : '';
  renderTask();
}
function press(k) {
  if (state === 'wait' || state === 'cine') return;
  if (state === 'review') { if (k === 'ok') afterReview(); return; }
  if (k === 'del') input = input.slice(0, -1);
  else if (k === 'ok') { if (input === '') { fbEl.className = 'fb'; fbEl.textContent = 'Tippe zuerst eine Zahl ein.'; return; } return check(); }
  else if (input.length < 6) input = (input === '0' ? '' : input) + k;
  sfx.key(); renderTask();
}
function record(ok, given) {
  const lv = play.mode === 'sd' ? 1 + play.solved : play.mode === 'train' ? play.level : curLevel();
  S.hist.push({ t: Date.now(), m: play.mode === 'sd' ? 'sd' : play.mode === 'train' ? 'tr' : 'n', d: play.mode === 'sd' ? 'sd' : (play.diff || S.diff), l: lv, k: task.k, q: task.q, a: task.ans, g: given, ok: ok ? 1 : 0, ms: Math.round(performance.now() - tStart) });
  if (S.hist.length > 2500) S.hist.splice(0, S.hist.length - 2500);
  weakCache = null;
}
function check() {
  const v = parseInt(input, 10), ok = v === task.ans; record(ok, v);
  if (play.mode === 'sd') return sdAnswer(ok);
  if (play.mode === 'train') return trainAnswer(ok);
  const d = S.diff, dob = diffObj(), lv = curLevel();
  if (ok) {
    const before = bestAny(), oldZone = zoneOfLevel(lv);
    const gain = (dob.star ? 2 + Math.floor(lv / 10) : Math.round(2 + (dob.off + lv) * .22)) + Math.min(5, Math.floor(S.streak / 3));
    S.coins += gain; S.streak++;
    const nl = Math.min(MAXL, lv + 1); S.levels[d] = nl; S.best[d] = Math.max(S.best[d], nl); save();
    state = 'wait'; panel.classList.add('ok'); fbEl.className = 'fb ok';
    fbEl.textContent = (lv === MAXL ? 'Super! Bonus am Ziel: +' : 'Richtig! +') + gain + ' Münzen' + (S.streak >= 3 ? ' · ' + S.streak + ' in Folge' : '');
    sfx.ok(); flyCoins(gain);
    if (nl !== lv) world.setLevel(nl); else world.hop();
    world.setReached(S.best[d]); updateHud();
    if (zoneOfLevel(nl) > oldZone) setTimeout(() => { banner('Neue Welt', ZONE_LONG[zoneOfLevel(nl)]); sfx.world(); }, 700);
    const after = bestAny();
    MATS.filter(m => m.lvl && m.lvl > before && m.lvl <= after).forEach((m, i) => setTimeout(() => toast('Neues Material in der Werkstatt: ' + m.name), 1400 + i * 2400));
    GEAR.filter(g => g.lvl && g.lvl > before && g.lvl <= after).forEach((g, i) => setTimeout(() => toast('Neue Ausrüstung in der Werkstatt: ' + g.name), 2000 + i * 2400));
    SLOT_LV.slice(1).filter(l => l > before && l <= after).forEach(() => setTimeout(() => toast('Dein Mischtiegel hat jetzt ' + slotCount() + ' Plätze'), 2800));
    if (nl === MAXL && lv === MAXL - 1) setTimeout(reachTop, 2200);
    else setTimeout(nextTask, 1050);
  } else {
    S.streak = 0; const nl = Math.max(1, lv - 1); S.levels[d] = nl; save();
    state = 'review'; panel.classList.remove('bad'); void panel.offsetWidth; panel.classList.add('bad'); fbEl.className = 'fb bad';
    fbEl.textContent = 'Richtig ist ' + task.ans + '. ' + (nl < lv ? 'Deine Murmel rollt zurück auf Level ' + nl + '.' : 'Versuch die nächste!');
    input = String(task.ans); renderTask(); okKey.textContent = 'Weiter';
    sfx.bad(); world.shake(); if (nl !== lv) setTimeout(() => world.setLevel(nl), 350); updateHud();
  }
}
function afterReview() { if (play.mode === 'sd') return; if (play.mode === 'train' && play.n >= play.total) return trainDone(); nextTask(); }
function flyCoins(n) {
  const from = world.marbleScreen(), r = $('#coinPill').getBoundingClientRect(), tx = r.left + 24, ty = r.top + r.height / 2;
  for (let i = 0; i < Math.min(n, 12); i++) {
    const c = el('div', { class: 'flycoin' }); document.body.appendChild(c);
    const mx = from.x + (Math.random() - .5) * 200, my = from.y - 60 - Math.random() * 120;
    const a = c.animate([{ transform: `translate(${from.x}px,${from.y}px) scale(.6)` }, { transform: `translate(${mx}px,${my}px) scale(1.1)`, offset: .45 }, { transform: `translate(${tx}px,${ty}px) scale(.7)` }], { duration: 850, delay: i * 55, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'backwards' });
    a.onfinish = () => { c.remove(); sfx.coin(); const cp = $('#coinPill'); cp.classList.remove('bump'); void cp.offsetWidth; cp.classList.add('bump'); };
  }
}

/* ---------------- Ziel & Enden ---------------- */
function pickEnding() { const unseen = ENDINGS.filter(e => !S.endings.includes(e.id)); const pool = unseen.length ? unseen : ENDINGS; return pool[Math.floor(Math.random() * pool.length)].id; }
async function runEnding(id) {
  state = 'cine'; panel.hidden = true; $('#hud').style.visibility = 'hidden';
  const c = $('#cine'); c.hidden = false; measure(); $('#cineT').textContent = ''; $('#cineS').textContent = '';
  world.onText = (a, b) => { $('#cineT').textContent = a; $('#cineS').textContent = b || ''; };
  sfx.fanfare(); await world.playEnding(id);
  c.hidden = true; $('#hud').style.visibility = ''; world.onText = () => { };
}
async function reachTop() {
  const d = S.diff, dob = diffObj(), id = pickEnding();
  await runEnding(id);
  const first = !S.done[d], gifts = [];
  if (!S.endings.includes(id)) S.endings.push(id);
  const coins = first ? 500 : 100; S.coins += coins; gifts.push(coins + ' Münzen');
  if (first) {
    S.done[d] = true; const ex = dob.excl;
    if (ex.kind === 'mat' && !S.mats.includes(ex.id)) S.mats.push(ex.id);
    if (ex.kind === 'gear' && !S.gear.includes(ex.id)) S.gear.push(ex.id);
    gifts.push('Exklusiv: ' + (ex.kind === 'mat' ? MATS.find(m => m.id === ex.id).name : GEAR.find(g => g.id === ex.id).name));
    if (allDone() && !S.gear.includes('komet')) { S.gear.push('komet'); gifts.push('Exklusiv: Kometenschweif', 'Neu: Sudden Death'); }
  }
  save(); world.setReached(S.best[d]); updateHud();
  const end = ENDINGS.find(e => e.id === id);
  openDlg('Ziel erreicht!', b => {
    b.append(el('p', {}, `Ende ${S.endings.length} von 5 entdeckt: <b>${end.name}</b>.`));
    const ul = el('div', { class: 'recom' }); ul.innerHTML = gifts.map(g => '• ' + g).join('<br>'); b.append(el('h3', {}, 'Deine Belohnung'), ul);
    if (!first) b.append(el('p', { style: 'margin-top:12px' }, 'Exklusive Belohnungen gibt es nur beim ersten Mal. Probier eine andere Stufe!'));
    const row = el('div', { class: 'row' }), go = el('button', { class: 'big-btn' }, 'Weiterspielen'), wsb = el('button', { class: 'btn2' }, 'Zur Werkstatt');
    go.addEventListener('click', () => { closeDlg(); panel.hidden = false; nextTask(); });
    wsb.addEventListener('click', () => { closeDlg(); panel.hidden = false; nextTask(); openWs(first && dob.excl.kind === 'gear' ? 'gear' : first ? 'material' : 'muster'); });
    row.append(go, wsb); b.append(row);
  }, { noClose: true });
}
function endsDialog() {
  openDlg('Enden', b => {
    b.append(el('p', {}, 'Wer Level 60 schafft, erlebt eins von 5 Enden – welches, entscheidet der Zufall. Entdeckte Enden kannst du hier noch mal ansehen.'));
    const g = el('div', { class: 'endlist' });
    ENDINGS.forEach(e => {
      const seen = S.endings.includes(e.id), c = el('button', { class: 'endc' + (seen ? ' seen' : '') });
      c.innerHTML = seen ? `${e.name}<span>${e.desc}</span><span>Ansehen</span>` : `???<span>Noch nicht entdeckt</span>`;
      if (seen) c.addEventListener('click', async () => { closeDlg(); startEl.hidden = true; unmountPreview(); world.setLevel(MAXL, { instant: true }); world.setView(innerWidth / 2, innerHeight * .45); await new Promise(r => setTimeout(r, 300)); await runEnding(e.id); state = 'input'; showStart(); });
      else c.disabled = true;
      g.append(c);
    });
    b.append(g);
  });
}
$('#cineSkip').addEventListener('click', () => world.skipEnding());

/* ---------------- Sudden Death ---------------- */
function startSD() {
  play = { mode: 'sd', solved: 0, time: SD_START, running: true, lastTick: 0 };
  startEl.hidden = true; gameEl.hidden = false; panel.hidden = false; unmountPreview();
  world.setLevel(1, { instant: true }); updateHud(); nextTask(); requestAnimationFrame(measure);
  banner('Sudden Death', 'Los!'); sfx.world();
}
function sdAnswer(ok) {
  if (ok) {
    play.solved++; play.time = Math.min(99, play.time + SD_BONUS); state = 'wait'; panel.classList.add('ok'); fbEl.className = 'fb ok'; fbEl.textContent = `Richtig! +${SD_BONUS} Sekunden`;
    sfx.ok(); world.setLevel(Math.min(MAXL, 1 + play.solved)); updateHud(); setTimeout(() => { if (play.mode === 'sd' && play.running) nextTask(); }, 450);
  } else sdOver('Falsch: richtig ist ' + task.ans + '.');
}
function sdOver(reason) {
  if (!play.running) return; play.running = false; state = 'cine';
  sfx.bad(); world.shake(); panel.classList.add('bad');
  const coins = play.solved * 4, rec = play.solved > S.sdBest; S.coins += coins; if (rec) S.sdBest = play.solved; save(); updateHud();
  setTimeout(() => openDlg(rec ? 'Neuer Rekord!' : 'Vorbei!', b => {
    b.append(el('p', {}, reason));
    const st = el('div', { class: 'stats-top' }); st.innerHTML = `<div class="stat"><b>${play.solved}</b><span>gelöst</span></div><div class="stat"><b>${S.sdBest}</b><span>Rekord</span></div><div class="stat"><b>+${coins}</b><span>Münzen</span></div>`;
    b.append(st);
    const row = el('div', { class: 'row' }), again = el('button', { class: 'big-btn' }, 'Noch mal'), home = el('button', { class: 'btn2' }, 'Startbildschirm');
    again.addEventListener('click', () => { closeDlg(); startSD(); }); home.addEventListener('click', () => { closeDlg(); showStart(); });
    row.append(again, home); b.append(row);
  }, { noClose: true }), 700);
}

/* ---------------- Üben ---------------- */
function startTrain(key) {
  const starKeys = ['plus', 'plusU', 'minus', 'minusU', 'miss'];
  let d;
  if (starKeys.includes(key) && (S.diff === 'sternchen' || !DIFFS.slice(1).some(x => (S.best[x.id] || 1) > 1))) d = 'sternchen';
  else { const played = DIFFS.slice(1).filter(x => (S.best[x.id] || 1) > 1); d = (played.length ? played[played.length - 1] : DIFFS[1]).id; }
  const dob = diffObj(d);
  const lvl = dob.star ? (S.best.sternchen || 1) : Math.max(1, Math.min(MAXL, Math.max(S.best[d] || 1, (TYPE_MIN[key] || 1) - dob.off)));
  play = { mode: 'train', key, diff: d, level: lvl, n: 0, ok: 0, total: 10 };
  startEl.hidden = true; gameEl.hidden = false; panel.hidden = false; unmountPreview();
  world.setLevel(S.diff ? curLevel() : 1, { instant: true }); updateHud(); nextTask(); requestAnimationFrame(measure);
}
function trainAnswer(ok) {
  play.n++; if (ok) play.ok++;
  if (ok) { S.coins += 1; save(); state = 'wait'; panel.classList.add('ok'); fbEl.className = 'fb ok'; fbEl.textContent = 'Richtig! +1 Münze'; sfx.ok(); world.hop(); updateHud(); setTimeout(() => play.n >= play.total ? trainDone() : nextTask(), 800); }
  else { save(); state = 'review'; panel.classList.add('bad'); fbEl.className = 'fb bad'; fbEl.textContent = 'Richtig ist ' + task.ans + '.'; input = String(task.ans); renderTask(); okKey.textContent = 'Weiter'; sfx.bad(); world.shake(); }
}
function trainDone() {
  const p = play; state = 'cine';
  openDlg('Übung fertig', b => {
    b.append(el('p', {}, `${TYPE_NAMES[p.key]}: <b>${p.ok} von ${p.total}</b> richtig.`));
    b.append(el('div', { class: 'recom' }, p.ok >= 9 ? 'Stark! Das sitzt.' : p.ok >= 7 ? 'Gut! Noch eine Runde, dann sitzt es.' : 'Dranbleiben – mit jeder Runde wird es leichter.'));
    const row = el('div', { class: 'row' }), again = el('button', { class: 'big-btn' }, 'Noch eine Runde'), home = el('button', { class: 'btn2' }, 'Startbildschirm');
    again.addEventListener('click', () => { closeDlg(); startTrain(p.key); }); home.addEventListener('click', () => { closeDlg(); showStart(); });
    row.append(again, home); b.append(row);
  }, { noClose: true });
}

/* ---------------- Statistik ---------------- */
function statsDialog() {
  openDlg('Statistik', b => {
    const H = S.hist;
    if (!H.length) { b.append(el('p', {}, 'Noch keine Aufgaben gelöst. Nach den ersten Runden siehst du hier Stärken und Schwächen.')); return; }
    const now = Date.now(), wk = H.filter(h => now - h.t < 7 * 864e5);
    const acc = a => a.length ? Math.round(a.reduce((s, h) => s + h.ok, 0) / a.length * 100) : 0;
    const avgS = a => { const c = a.filter(h => h.ok); return c.length ? (c.reduce((s, h) => s + h.ms, 0) / c.length / 1000).toFixed(1) : '–'; };
    const last50 = H.slice(-50), prev50 = H.slice(-100, -50);
    const top = el('div', { class: 'stats-top' });
    top.innerHTML = `<div class="stat"><b>${H.length}</b><span>Aufgaben gesamt</span></div><div class="stat"><b>${acc(H)} %</b><span>richtig gesamt</span></div><div class="stat"><b>${wk.length}</b><span>in den letzten 7 Tagen</span></div><div class="stat"><b>${avgS(H)} s</b><span>pro richtiger Aufgabe</span></div>`;
    b.append(top);
    if (prev50.length >= 20) { const d = acc(last50) - acc(prev50); b.append(el('p', { style: 'margin-top:10px' }, `Trend: Die letzten 50 Aufgaben ${acc(last50)} % richtig, davor ${acc(prev50)} % (${d >= 0 ? '+' : ''}${d} Punkte).`)); }
    const by = {}; for (const h of H) { const x = by[h.k] || (by[h.k] = []); x.push(h); }
    const rows = Object.keys(by).map(k => { const a = by[k], rec = a.slice(-20); return { k, n: a.length, acc: acc(a), rec: acc(rec), sec: avgS(a) }; }).sort((x, y) => (TYPE_MIN[x.k] || 0) - (TYPE_MIN[y.k] || 0));
    const strong = rows.filter(r => r.n >= 8 && r.rec >= 85).map(r => TYPE_NAMES[r.k]), weak = rows.filter(r => r.n >= 5 && r.rec < 70).sort((a, b) => a.rec - b.rec);
    const rc = el('div', { class: 'recom', style: 'margin-top:12px' });
    rc.innerHTML = (strong.length ? `<b>Stärken:</b> ${strong.join(', ')}.<br>` : '') + (weak.length ? `<b>Üben lohnt sich bei:</b> ${weak.map(r => TYPE_NAMES[r.k]).join(', ')}.` : 'Keine klare Schwäche erkennbar. Weiter so!') + '<br><small>Schwächere Aufgabenarten kommen im Spiel automatisch etwas häufiger.</small>';
    b.append(el('h3', {}, 'Einschätzung'), rc);
    if (weak.length) { const row = el('div', { class: 'row' }); const btn = el('button', { class: 'big-btn' }, 'Schwächste Art üben'); btn.addEventListener('click', () => { closeDlg(); startTrain(weak[0].k); }); row.append(btn); b.append(row); }
    b.append(el('h3', {}, 'Nach Aufgabenart'), el('p', {}, 'Balken = Anteil richtig in den letzten 20 Aufgaben dieser Art.'));
    for (const r of rows) {
      const tr = el('div', { class: 'trow' }); const col = r.rec >= 85 ? '#1fc48c' : r.rec >= 70 ? '#ffc534' : '#ff5468';
      const tag = r.n < 5 ? '<span class="tag n">wenig Daten</span>' : r.rec >= 85 ? '<span class="tag s">Stärke</span>' : r.rec < 70 ? '<span class="tag w">üben</span>' : '<span class="tag n">okay</span>';
      tr.innerHTML = `<div class="nm">${TYPE_NAMES[r.k] || r.k}<small>${r.n} Aufgaben · ${r.sec} s</small></div><div class="bar"><i style="width:${r.rec}%;background:${col}"></i></div><div class="pct">${r.rec} %</div>`;
      const pb = el('button', { class: 'practice' }, 'Üben'); pb.addEventListener('click', () => { closeDlg(); startTrain(r.k); }); tr.append(pb);
      tr.children[0].insertAdjacentHTML('beforeend', ' ' + tag);
      b.append(tr);
    }
    const mis = H.filter(h => !h.ok).slice(-12).reverse();
    if (mis.length) {
      b.append(el('h3', {}, 'Letzte Fehler'));
      const g = el('div', { class: 'mistakes' }); for (const h of mis) { const m = el('div', { class: 'mistake' }); m.innerHTML = `${h.q.replace('□', h.a)}<small>eingegeben: ${h.g}</small>`; g.append(m); } b.append(g);
    }
  }, { wide: true });
}

/* ---------------- Werkstatt ---------------- */
let wsTab = 'muster', pvMount = null;
function mountPreview(sel) { const host = $(sel); if (!host) return; const px = Math.round(host.getBoundingClientRect().width) || 200; preview.setSize(px); if (preview.canvas.parentElement !== host) host.appendChild(preview.canvas); preview.configure(S.marble); pvMount = sel; }
function unmountPreview() { pvMount = null; if (preview.canvas.parentElement) preview.canvas.remove(); }
function openWs(tab) { if (tab) wsTab = tab; wsEl.hidden = false; renderWs(); requestAnimationFrame(() => mountPreview('#wsPv')); $('#wsClose').focus(); }
function closeWs() { wsEl.hidden = true; world.setMarble(S.marble); updateHud(); if (!startEl.hidden) { renderStart(); mountPreview('#startPv'); } else unmountPreview(); }
function wsHint(t, warn) { const e = $('#wsHint'); e.textContent = t; e.classList.toggle('warn', !!warn); }
const thumbCache = new Map(); let thumbQ = [], thumbBusy = false;
function thumb(cfg, img) {
  const key = JSON.stringify(cfg); if (thumbCache.has(key)) { img.src = thumbCache.get(key); return; }
  thumbQ.push({ cfg, img, key }); if (!thumbBusy) pumpThumbs();
}
function pumpThumbs() {
  const job = thumbQ.shift(); if (!job) { thumbBusy = false; if (pvMount) { mountPreview(pvMount); } return; }
  thumbBusy = true; const url = thumbCache.get(job.key) || preview.snapshot(job.cfg, 192); thumbCache.set(job.key, url); job.img.src = url; setTimeout(pumpThumbs, 16);
}
function changed() { save(); preview.configure(S.marble); world.setMarble(S.marble); renderWs(); }
function card(cfg, name, status, { sel, locked, excl } = {}, onClick) {
  const b = el('button', { class: 'item' + (sel ? ' sel' : '') + (locked ? ' locked' : '') + (excl ? ' excl' : '') });
  const th = el('div', { class: 'thumb' }), img = el('img', { alt: '' }); th.append(img); b.append(th);
  const nb = el('b'); nb.textContent = name; b.append(nb); b.append(el('small', {}, status));
  b.addEventListener('click', onClick); $('#wsList').appendChild(b); thumb(cfg, img); return b;
}
const coinTag = n => `<span class="coin"></span>${n}`;
function buy(price, what, fn) { if (S.coins < price) { wsHint('Dir fehlen noch ' + (price - S.coins) + ' Münzen für ' + what + '.', true); return false; } S.coins -= price; fn(); sfx.ok(); wsHint(what + ' gehört jetzt dir.'); return true; }
function renderWs() {
  $('#wsCoins').textContent = S.coins; thumbQ = [];
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === wsTab)));
  const list = $('#wsList'); list.innerHTML = ''; const M = S.marble, best = bestAny();
  const base = { ...M, body: null, trail: null };
  if (wsTab === 'muster') {
    wsHint('Kaufe Muster mit deinen Münzen und wähle eins für deine Murmel.');
    PATTERNS.forEach(p => {
      const own = S.owned.includes(p.id);
      card({ ...base, mix: [], pattern: p.id }, p.name, M.pattern === p.id ? 'Ausgewählt' : own ? 'Gehört dir' : coinTag(p.price), { sel: M.pattern === p.id }, () => {
        if (own) { M.pattern = p.id; return changed(); }
        buy(p.price, p.name, () => { S.owned.push(p.id); M.pattern = p.id; }) && changed();
      });
    });
  } else if (wsTab === 'farben') {
    wsHint('Farben sind kostenlos. Probier aus, was dir gefällt.');
    for (const [key, label] of [['c1', 'Glasfarbe'], ['c2', 'Musterfarbe']]) {
      const grp = el('div', { class: 'swgroup' }); grp.append(el('h4', {}, label)); const sw = el('div', { class: 'swatches' });
      COLORS.forEach(col => { const b = el('button', { class: 'sw', 'aria-label': label + ' ' + col, 'aria-pressed': String(M[key] === col) }); b.style.background = col; b.addEventListener('click', () => { M[key] = col; changed(); }); sw.appendChild(b); });
      grp.append(sw); list.appendChild(grp);
    }
  } else if (wsTab === 'material') {
    wsHint('Materialien gibt es ab bestimmten Levels. Dein bestes Level: ' + best + '.');
    const matCard = m => {
      const own = S.mats.includes(m.id), inMix = M.mix.includes(m.id), locked = !own && (m.excl || best < m.lvl);
      const st = m.excl && !own ? exclLabel(m.excl) : locked ? 'Ab Level ' + m.lvl : inMix ? 'Im Tiegel' : own ? 'In den Tiegel' : coinTag(m.price);
      card({ ...base, pattern: 'uni', mix: [m.id] }, m.name, st, { sel: inMix, locked, excl: !!m.excl }, () => {
        if (locked) return wsHint(m.excl ? m.name + ' ist exklusiv: ' + exclLabel(m.excl) + '.' : m.name + ' gibt es ab Level ' + m.lvl + '.', true);
        if (!own && !buy(m.price, m.name, () => S.mats.push(m.id))) return;
        if (inMix) M.mix = M.mix.filter(x => x !== m.id);
        else if (M.mix.length >= slotCount()) { save(); renderWs(); return wsHint('Dein Mischtiegel ist voll. Nimm links erst ein Material heraus.', true); }
        else M.mix.push(m.id);
        changed();
      });
    };
    MATS.filter(m => !m.excl).forEach(matCard);
    list.append(el('div', { class: 'subhead' }, 'Exklusiv – nur durch Level 60'));
    MATS.filter(m => m.excl).forEach(matCard);
  } else {
    wsHint('Ausrüstung sitzt außen an der Murmel. Pro Platz eine.');
    for (const [slot, title] of [['body', 'Antrieb und Flügel'], ['trail', 'Spur']]) {
      list.append(el('div', { class: 'subhead' }, title));
      GEAR.filter(g => g.slot === slot).forEach(g => {
        const own = S.gear.includes(g.id), on = M[slot] === g.id, locked = !own && (g.excl || best < g.lvl);
        const st = g.excl && !own ? exclLabel(g.excl) : locked ? 'Ab Level ' + g.lvl : on ? 'Angelegt' : own ? 'Anlegen' : coinTag(g.price);
        card({ ...base, mix: [], [slot]: g.id, body: slot === 'body' ? g.id : null }, g.name, st, { sel: on, locked, excl: !!g.excl }, () => {
          if (locked) return wsHint(g.excl ? g.name + ' ist exklusiv: ' + exclLabel(g.excl) + '.' : g.name + ' gibt es ab Level ' + g.lvl + '.', true);
          if (!own && !buy(g.price, g.name, () => S.gear.push(g.id))) return;
          M[slot] = on ? null : g.id; changed(); if (!on && slot === 'trail') wsHint('Die Spur siehst du, wenn deine Murmel rollt.');
        });
      });
    }
  }
  renderSlots();
}
function renderSlots() {
  const box = $('#slots'); box.innerHTML = ''; const n = slotCount(), M = S.marble; M.mix = M.mix.slice(0, n);
  $('#mixNote').textContent = n === 1 ? 'Ein Material passt hinein. Ab Level 12 kannst du zwei mischen.' : n === 2 ? 'Zwei Materialien passen hinein. Ab Level 30 sogar drei.' : 'Drei Materialien passen hinein.';
  SLOT_LV.forEach((lv, i) => {
    const b = el('button', { class: 'slotbtn' });
    if (i >= n) { b.classList.add('locked'); b.innerHTML = `<span>Platz ${i + 1}</span><span>ab Level ${lv}</span>`; b.disabled = true; }
    else if (M.mix[i]) { const m = MATS.find(x => x.id === M.mix[i]); b.classList.add('full'); b.innerHTML = `<span>${m.name}</span><span aria-hidden="true">✕</span>`; b.setAttribute('aria-label', m.name + ' herausnehmen'); b.addEventListener('click', () => { M.mix.splice(i, 1); changed(); }); }
    else { b.innerHTML = `<span>Platz ${i + 1}</span><span>leer</span>`; b.addEventListener('click', () => { wsTab = 'material'; renderWs(); }); }
    box.appendChild(b);
  });
}

/* ---------------- Dialoge ---------------- */
function openDlg(title, build, { wide = false, noClose = false } = {}) {
  $('#dlgTitle').textContent = title; const b = $('#dlgBody'); b.innerHTML = ''; build(b);
  dlgEl.classList.toggle('wide', wide); $('#dlgClose').hidden = noClose; dlgEl.dataset.noclose = noClose ? '1' : ''; dlgEl.hidden = false;
  const f = b.querySelector('input,textarea'); if (f) setTimeout(() => f.focus(), 40);
}
function closeDlg() { dlgEl.hidden = true; if (!startEl.hidden) renderStart(); updateHud(); }
$('#dlgClose').addEventListener('click', closeDlg);
dlgEl.addEventListener('click', e => { if (e.target === dlgEl && !dlgEl.dataset.noclose) closeDlg(); });
async function copyText(t, ta) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { if (ta) { ta.focus(); ta.select(); try { return document.execCommand('copy'); } catch (_) { } } return false; } }

/* ---------------- Freischalt-Codes ---------------- */
const SECRET = 'murmelflug·nick·2026·rostock·v2';
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const REWARDS = [
  { k: 'coins', n: 50 }, { k: 'coins', n: 100 }, { k: 'coins', n: 250 }, { k: 'coins', n: 500 }, { k: 'coins', n: 1000 },
  ...PATTERNS.slice(1).map(p => ({ k: 'pattern', id: p.id })),
  ...MATS.filter(m => !m.excl).map(m => ({ k: 'mat', id: m.id })),
  ...GEAR.filter(g => !g.excl).map(g => ({ k: 'gear', id: g.id })),
  { k: 'slots' }
];
function rewardName(r) {
  if (r.k === 'coins') return r.n + ' Münzen'; if (r.k === 'pattern') return 'Muster: ' + PATTERNS.find(p => p.id === r.id).name;
  if (r.k === 'mat') return 'Material: ' + MATS.find(m => m.id === r.id).name; if (r.k === 'gear') return 'Ausrüstung: ' + GEAR.find(g => g.id === r.id).name; return 'Alle 3 Mischplätze';
}
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function makeCode(ri) {
  const nonce = Math.floor(Math.random() * (1 << 20)), payload = ri * (1 << 20) + nonce, chk = fnv(SECRET + ':' + payload) & 0x7fff;
  let v = payload * 32768 + chk, out = ''; for (let i = 0; i < 8; i++) { out = B32[v % 32] + out; v = Math.floor(v / 32); } return out.slice(0, 4) + '-' + out.slice(4);
}
function readCode(str) {
  const c = String(str).toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1'); if (c.length !== 8) return null;
  let v = 0; for (const ch of c) { const i = B32.indexOf(ch); if (i < 0) return null; v = v * 32 + i; }
  const chk = v % 32768, payload = Math.floor(v / 32768); if ((fnv(SECRET + ':' + payload) & 0x7fff) !== chk) return null;
  const ri = Math.floor(payload / (1 << 20)); if (!REWARDS[ri]) return null; return { key: c, r: REWARDS[ri] };
}
function redeem(str) {
  const d = readCode(str); if (!d) return { ok: false, t: 'Dieser Code stimmt nicht. Prüfe jeden Buchstaben.' };
  if (S.used.includes(d.key)) return { ok: false, t: 'Diesen Code hast du schon eingelöst.' };
  const r = d.r, has = (arr, id) => arr.includes(id);
  if (r.k === 'coins') S.coins += r.n;
  else if (r.k === 'pattern') { if (has(S.owned, r.id)) return { ok: false, t: 'Das Muster gehört dir schon. Der Code bleibt gültig.' }; S.owned.push(r.id); }
  else if (r.k === 'mat') { if (has(S.mats, r.id)) return { ok: false, t: 'Das Material gehört dir schon. Der Code bleibt gültig.' }; S.mats.push(r.id); }
  else if (r.k === 'gear') { if (has(S.gear, r.id)) return { ok: false, t: 'Die Ausrüstung gehört dir schon. Der Code bleibt gültig.' }; S.gear.push(r.id); }
  else { if (S.allSlots) return { ok: false, t: 'Alle Mischplätze sind schon frei. Der Code bleibt gültig.' }; S.allSlots = true; }
  S.used.push(d.key); save(); sfx.world(); updateHud(); return { ok: true, t: 'Eingelöst: ' + rewardName(r) + '!' };
}
function codeDialog() {
  openDlg('Code einlösen', b => {
    b.append(el('p', {}, 'Gib den Code ein, den du bekommen hast.'));
    const f = el('input', { class: 'field', maxlength: '9', placeholder: 'XXXX-XXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Code' });
    const msg = el('div', { class: 'msg', 'aria-live': 'polite' }), row = el('div', { class: 'row' }), go = el('button', { class: 'big-btn' }, 'Einlösen');
    const run = () => { const r = redeem(f.value); msg.className = 'msg ' + (r.ok ? 'ok' : 'bad'); msg.textContent = r.t; if (r.ok) f.value = ''; };
    go.addEventListener('click', run); f.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    row.append(go); b.append(f, row, msg);
  });
}

/* ---------------- Elternbereich ---------------- */
const pinHash = p => String(fnv('pin:' + SECRET + ':' + p));
let parentOk = false;
function parentDialog() {
  openDlg('Elternbereich', b => {
    if (parentOk) return parentPanel(b);
    const first = !S.pin;
    b.append(el('p', {}, first ? 'Lege eine PIN fest (4 bis 6 Ziffern). Damit erstellst du Codes, die dein Kind einlösen kann.' : 'Gib deine Eltern-PIN ein.'));
    const mk = ph => el('input', { class: 'field', type: 'password', inputmode: 'numeric', maxlength: '6', autocomplete: 'off', 'aria-label': ph, placeholder: ph });
    const f = mk('PIN'), f2 = first ? mk('PIN wiederholen') : null; if (f2) f2.style.marginTop = '10px';
    const msg = el('div', { class: 'msg bad', 'aria-live': 'polite' }), go = el('button', { class: 'big-btn' }, first ? 'PIN festlegen' : 'Öffnen');
    const run = () => {
      const v = f.value.trim(); if (!/^\d{4,6}$/.test(v)) { msg.textContent = 'Die PIN braucht 4 bis 6 Ziffern.'; return; }
      if (first) { if (f2.value.trim() !== v) { msg.textContent = 'Die beiden PINs sind nicht gleich.'; return; } S.pin = pinHash(v); save(); }
      else if (pinHash(v) !== S.pin) { msg.textContent = 'Falsche PIN.'; f.value = ''; return; }
      parentOk = true; b.innerHTML = ''; parentPanel(b);
    };
    go.addEventListener('click', run); [f, f2].forEach(x => x && x.addEventListener('keydown', e => { if (e.key === 'Enter') run(); }));
    const row = el('div', { class: 'row' }); row.append(go); b.append(f); if (f2) b.append(f2); b.append(row, msg);
  });
}
function parentPanel(b) {
  b.append(el('p', {}, 'Wähle eine Belohnung. Jeder Code funktioniert auf jedem Gerät und kann einmal eingelöst werden. Exklusive Belohnungen gibt es nur durch Level 60.'));
  const grid = el('div', { class: 'rgrid' }); let sel = -1; const out = el('div');
  REWARDS.forEach((r, i) => { const btn = el('button', { class: 'rbtn', 'aria-pressed': 'false' }); btn.textContent = rewardName(r); btn.addEventListener('click', () => { sel = i; grid.querySelectorAll('.rbtn').forEach(x => x.setAttribute('aria-pressed', String(x === btn))); showCode(); }); grid.append(btn); });
  function showCode() {
    out.innerHTML = ''; const code = makeCode(sel), box = el('div', { class: 'bigcode' }); box.textContent = code;
    const row = el('div', { class: 'row' }), cp = el('button', { class: 'big-btn' }, 'Kopieren'), nw = el('button', { class: 'btn2' }, 'Neuer Code'), rd = el('button', { class: 'btn2' }, 'Hier einlösen'), msg = el('div', { class: 'msg', 'aria-live': 'polite' });
    cp.addEventListener('click', async () => { const ok = await copyText(code); msg.className = 'msg ' + (ok ? 'ok' : 'bad'); msg.textContent = ok ? 'Code kopiert.' : 'Kopieren ging nicht. Bitte abschreiben.'; });
    nw.addEventListener('click', showCode); rd.addEventListener('click', () => { const r = redeem(code); msg.className = 'msg ' + (r.ok ? 'ok' : 'bad'); msg.textContent = r.t; });
    row.append(cp, nw, rd); out.append(el('h3', {}, rewardName(REWARDS[sel])), box, row, msg);
  }
  const row2 = el('div', { class: 'row' }), st = el('button', { class: 'btn2' }, 'Statistik'), ch = el('button', { class: 'btn2' }, 'PIN ändern'), rs = el('button', { class: 'btn2' }, 'Alles zurücksetzen');
  st.addEventListener('click', statsDialog);
  ch.addEventListener('click', () => { S.pin = null; parentOk = false; save(); parentDialog(); });
  rs.addEventListener('click', () => { if (!confirm('Wirklich alles löschen? Level, Münzen, Murmeln und Statistik sind danach weg.')) return; const pin = S.pin; S = fresh(); S.pin = pin; save(); world.setMarble(S.marble); world.setReached(1); world.setLevel(1, { instant: true }); closeDlg(); showStart(); toast('Alles zurückgesetzt.'); });
  row2.append(st, ch, rs);
  b.append(el('h3', {}, 'Belohnung als Code'), grid, out, el('h3', {}, 'Verwaltung'), row2);
}

/* ---------------- Spielstand übertragen ---------------- */
function exportCode() { const d = { ...S, hist: S.hist.slice(-400) }; const b = btoa(unescape(encodeURIComponent(JSON.stringify(d)))); return 'MF2.' + fnv(SECRET + b).toString(36) + '.' + b; }
function importCode(str) {
  const m = String(str).trim().replace(/\s+/g, '').match(/^MF[12]\.([0-9a-z]+)\.(.+)$/); if (!m) return false;
  try { const d = JSON.parse(decodeURIComponent(escape(atob(m[2])))); S = normalize(d); save(); world.setMarble(S.marble); world.setReached(S.diff ? S.best[S.diff] : 1); return true; } catch (e) { return false; }
}
function saveDialog() {
  openDlg('Spielstand', b => {
    b.append(el('p', {}, 'Der Spielstand ist auf diesem Gerät gespeichert. Um auf einem anderen Gerät weiterzuspielen: Text kopieren, aufs andere Gerät schicken (z. B. per AirDrop oder Messenger) und dort einfügen.'));
    const ta = el('textarea', { class: 'field', readonly: '', 'aria-label': 'Spielstand-Text' }); ta.value = exportCode();
    const msg = el('div', { class: 'msg', 'aria-live': 'polite' }), r1 = el('div', { class: 'row' }), cp = el('button', { class: 'big-btn' }, 'Kopieren');
    cp.addEventListener('click', async () => { const ok = await copyText(ta.value, ta); msg.className = 'msg ' + (ok ? 'ok' : 'bad'); msg.textContent = ok ? 'Kopiert. Jetzt auf dem anderen Gerät einfügen.' : 'Bitte den Text markieren und kopieren.'; });
    r1.append(cp);
    const ta2 = el('textarea', { class: 'field', placeholder: 'Spielstand-Text hier einfügen', 'aria-label': 'Spielstand einfügen' }), r2 = el('div', { class: 'row' }), ld = el('button', { class: 'btn2' }, 'Spielstand laden');
    ld.addEventListener('click', () => { if (!ta2.value.trim()) return; if (!confirm('Der Spielstand auf diesem Gerät wird ersetzt. Weiter?')) return; const ok = importCode(ta2.value); msg.className = 'msg ' + (ok ? 'ok' : 'bad'); msg.textContent = ok ? 'Spielstand geladen.' : 'Der Text ist nicht vollständig. Bitte komplett kopieren.'; if (ok) { ta.value = exportCode(); ta2.value = ''; } });
    r2.append(ld);
    b.append(el('h3', {}, 'Mitnehmen'), ta, r1, el('h3', {}, 'Übernehmen'), ta2, r2, msg);
  });
}

/* ---------------- Events ---------------- */
$('#pad').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
document.addEventListener('keydown', e => {
  if (!dlgEl.hidden) { if (e.key === 'Escape' && !dlgEl.dataset.noclose) closeDlg(); return; }
  if (!wsEl.hidden) { if (e.key === 'Escape') closeWs(); return; }
  if (gameEl.hidden) return;
  let k = null; if (/^[0-9]$/.test(e.key)) k = e.key; else if (e.key === 'Backspace') k = 'del'; else if (e.key === 'Enter') k = 'ok';
  if (!k) return; e.preventDefault(); press(k);
  const b = document.querySelector(`[data-k="${k}"]`); if (b) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 110); }
});
$('#homeBtn').addEventListener('click', () => { if (play.mode === 'sd' && play.running) { play.running = false; } showStart(); });
$('#wsBtn').addEventListener('click', () => openWs());
$('#startWs').addEventListener('click', () => openWs());
$('#wsClose').addEventListener('click', closeWs);
wsEl.addEventListener('click', e => { if (e.target === wsEl) closeWs(); });
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { wsTab = t.dataset.tab; renderWs(); }));
$('#sndBtn').addEventListener('click', () => { S.sound = !S.sound; save(); updateHud(); if (S.sound) sfx.key(); });
$('#codeBtn').addEventListener('click', codeDialog);
$('#saveBtn').addEventListener('click', saveDialog);
$('#parentBtn').addEventListener('click', parentDialog);
$('#statsBtn').addEventListener('click', statsDialog);
$('#endsBtn').addEventListener('click', endsDialog);
window.addEventListener('resize', () => { world && world.resize(); measure(); if (pvMount) mountPreview(pvMount); });

/* ---------------- Start ---------------- */
let T = 0, last = performance.now(), lastMeasure = 0;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  if (play.mode === 'sd' && play.running) {
    play.time -= dt; const s = Math.max(0, Math.ceil(play.time));
    if (s !== play.lastTick && s <= 10 && s > 0) sfx.tick(); play.lastTick = s;
    $('#sdTime').textContent = s; $('#sdFill').style.width = Math.max(0, Math.min(100, play.time / SD_START * 100)) + '%';
    if (play.time <= 0) sdOver('Die Zeit ist abgelaufen.');
  }
  if (T - lastMeasure > .4) { lastMeasure = T; measure(); }
  world.update(dt, T);
  if (pvMount && !thumbBusy) preview.render(T, dt);
  requestAnimationFrame(loop);
}
async function boot() {
  try { await Promise.race([document.fonts.load('800 56px "Baloo 2"'), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  await new Promise(r => setTimeout(r, 30));
  try {
    world = new World($('#world')); preview = new Preview();
  } catch (e) {
    $('#loading').textContent = 'Dein Gerät unterstützt kein WebGL. Bitte einen aktuellen Browser verwenden.'; console.error(e); return;
  }
  world.setMarble(S.marble); world.setReached(S.diff ? S.best[S.diff] : 1);
  showStart(); updateHud();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  setTimeout(() => $('#loading').classList.add('done'), 200);
}
if (location.search.includes('debug')) window.__mf = { get S() { return S; }, set S(v) { S = v; }, get world() { return world; }, get preview() { return preview; }, startGame, showStart, reachTop, startSD, startTrain, statsDialog, openWs, runEnding, save, nextTask, get task() { return task; }, press };
boot();
