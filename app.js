/* あかブロック脱出 — エンドレス版（出口から出すほどスコアアップ） */

const COLS = 5;
const ROWS = 6;
const EXIT = [1, 2, 3];                 // 盤の下・中央3列が出口
const COLORS = ["c-coral", "c-blue", "c-green", "c-sand"];
// 出現するブロックの形（w=横, h=縦, wt=出やすさの重み）
const SIZES = [
  { w: 1, h: 1, wt: 4 },
  { w: 1, h: 2, wt: 3 },
  { w: 2, h: 1, wt: 3 },
  { w: 2, h: 2, wt: 1 },
];

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("moves");
const timerEl = document.getElementById("timer");
const bestEl  = document.getElementById("best");

let pieces = [];
let els = {};
let uid = 0;
let score = 0;
let startTime = null;
let timerId = null;
let spawnTimer = null;
let spawnEvery = 3800;                   // 自動出現の間隔（だんだん短く）
let idleTimer = null;
let status = "playing";                  // 'playing' | 'over'
let isDragging = false;
const reduceMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 盤面ユーティリティ ---------- */

function buildGrid(exclude) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (const p of pieces) {
    if (p.id === exclude) continue;
    for (let dr = 0; dr < p.h; dr++)
      for (let dc = 0; dc < p.w; dc++)
        g[p.r + dr][p.c + dc] = true;
  }
  return g;
}

function canPlace(p, r, c, grid) {
  if (r < 0 || c < 0 || r + p.h > ROWS || c + p.w > COLS) return false;
  for (let dr = 0; dr < p.h; dr++)
    for (let dc = 0; dc < p.w; dc++)
      if (grid[r + dr][c + dc]) return false;
  return true;
}

function fitsAt(grid, r, c, w, h) {
  if (r < 0 || c < 0 || r + h > ROWS || c + w > COLS) return false;
  for (let dr = 0; dr < h; dr++)
    for (let dc = 0; dc < w; dc++)
      if (grid[r + dr][c + dc]) return false;
  return true;
}

function freeSteps(p) {
  const grid = buildGrid(p.id);
  const res = { up: 0, down: 0, left: 0, right: 0 };
  let r = p.r, c = p.c;
  while (canPlace(p, r - 1, c, grid)) { res.up++; r--; }
  r = p.r;
  while (canPlace(p, r + 1, c, grid)) { res.down++; r++; }
  r = p.r;
  while (canPlace(p, r, c - 1, grid)) { res.left++; c--; }
  c = p.c;
  while (canPlace(p, r, c + 1, grid)) { res.right++; c++; }
  return res;
}

// 出口から出せる状態か（最下段にあり、占有列がすべて出口の中）
function canExit(p) {
  if (p.r + p.h !== ROWS) return false;
  for (let dc = 0; dc < p.w; dc++) if (!EXIT.includes(p.c + dc)) return false;
  return true;
}

function weightedSize() {
  const pool = [];
  SIZES.forEach((s) => { for (let i = 0; i < s.wt; i++) pool.push(s); });
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- 描画 ---------- */

function fitBoard() {
  const wrap = boardEl.parentElement;
  if (!wrap) return;
  const availW = wrap.clientWidth;
  const availH = wrap.clientHeight;
  if (availW === 0 || availH === 0) return;
  const reserve = 24;
  const usableH = Math.max(0, availH - reserve);
  let w = Math.min(availW, usableH * (COLS / ROWS));
  boardEl.style.width = Math.floor(w) + "px";
}

function cellSize() {
  const styles = getComputedStyle(boardEl);
  const pad = parseFloat(styles.paddingLeft);
  const gap = parseFloat(styles.getPropertyValue("--gap")) || 4;
  const innerW = boardEl.clientWidth - pad * 2;
  const cell = (innerW - gap * (COLS - 1)) / COLS;
  return { cell, gap, pad };
}

function place(p, animate) {
  const el = els[p.id];
  if (!el) return;
  const { cell, gap, pad } = cellSize();
  el.style.width = p.w * cell + (p.w - 1) * gap + "px";
  el.style.height = p.h * cell + (p.h - 1) * gap + "px";
  el.classList.toggle("snap", !!animate);
  el.style.left = pad + p.c * (cell + gap) + "px";
  el.style.top = pad + p.r * (cell + gap) + "px";
}

function renderAll(animate) {
  fitBoard();
  for (const p of pieces) place(p, animate);
}

function addPieceEl(p, spawning) {
  const el = document.createElement("div");
  el.className = "piece " + p.color + (spawning && !reduceMotion ? " spawning" : "");
  el.dataset.id = p.id;
  boardEl.appendChild(el);
  els[p.id] = el;
  attachDrag(el, p);
  if (spawning) setTimeout(() => el.classList.remove("spawning"), 240);
}

/* ---------- 出現・脱出 ---------- */

// 上段（row 0）に新しいブロックを1つ出す。置けなければ false（＝ゲームオーバー条件）
function spawnAttempt() {
  const grid = buildGrid();
  const pool = [];
  SIZES.forEach((s) => { for (let i = 0; i < s.wt; i++) pool.push(s); });
  pool.sort(() => Math.random() - 0.5);
  for (const s of pool) {
    const cands = [];
    for (let c = 0; c + s.w <= COLS; c++) if (fitsAt(grid, 0, c, s.w, s.h)) cands.push(c);
    if (cands.length) {
      const c = cands[Math.floor(Math.random() * cands.length)];
      const p = {
        id: "b" + uid++, c, r: 0, w: s.w, h: s.h,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      pieces.push(p);
      addPieceEl(p, true);
      place(p, false);
      return true;
    }
  }
  return false;
}

function seedInitial(n) {
  for (let k = 0; k < n; k++) {
    const grid = buildGrid();
    const s = weightedSize();
    const cands = [];
    for (let r = 1; r + s.h <= ROWS; r++)
      for (let c = 0; c + s.w <= COLS; c++)
        if (fitsAt(grid, r, c, s.w, s.h)) cands.push({ r, c });
    if (!cands.length) continue;
    const { r, c } = cands[Math.floor(Math.random() * cands.length)];
    const p = {
      id: "b" + uid++, c, r, w: s.w, h: s.h,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    pieces.push(p);
    addPieceEl(p, false);
    place(p, false);
  }
}

function eject(p) {
  const el = els[p.id];
  pieces = pieces.filter((x) => x.id !== p.id);
  if (el) {
    el.classList.add("exiting");
    setTimeout(() => { el.remove(); }, 280);
  }
  delete els[p.id];

  score++;
  scoreEl.textContent = score;
  replay(scoreEl, "pop", 260);

  // 出すたびに新しいブロックが生まれる
  if (!spawnAttempt()) gameOver();
}

/* ---------- ドラッグ操作 ---------- */

function attachDrag(el, p) {
  let active = false;
  let axis = null;
  let startX = 0, startY = 0;
  let baseLeft = 0, baseTop = 0;
  let limits = null, exitable = false;
  let cell = 0, gap = 0;
  let pointerId = null;

  const onDown = (e) => {
    if (status !== "playing") return;
    active = true; isDragging = true; axis = null;
    pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    el.classList.add("dragging");
    el.classList.remove("snap", "wiggle", "settled");
    const cs = cellSize();
    cell = cs.cell; gap = cs.gap;
    startX = e.clientX; startY = e.clientY;
    baseLeft = parseFloat(el.style.left);
    baseTop = parseFloat(el.style.top);
    limits = freeSteps(p);
    exitable = canExit(p);
  };

  const onMove = (e) => {
    if (!active) return;
    e.preventDefault();
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    if (!axis) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    const step = cell + gap;
    if (axis === "x") {
      dx = Math.max(-limits.left * step, Math.min(limits.right * step, dx));
      el.style.left = baseLeft + dx + "px";
      el.style.top = baseTop + "px";
    } else {
      let max = limits.down * step;
      if (exitable) max += step * 1.15;          // 出口へ引き出す余地
      dy = Math.max(-limits.up * step, Math.min(max, dy));
      el.style.top = baseTop + dy + "px";
      el.style.left = baseLeft + "px";
    }
  };

  const onUp = () => {
    if (!active) return;
    active = false; isDragging = false;
    el.classList.remove("dragging");
    if (pointerId !== null) {
      try { el.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
    }

    const step = cell + gap;
    // 出口から引き出した？
    if (exitable && axis === "y") {
      const dyNow = parseFloat(el.style.top) - baseTop;
      if (dyNow > step * 0.5) {
        if (startTime === null) startTimer();
        eject(p);
        return;
      }
    }

    const { pad } = cellSize();
    let newC = Math.round((parseFloat(el.style.left) - pad) / step);
    let newR = Math.round((parseFloat(el.style.top) - pad) / step);
    newC = Math.max(0, Math.min(COLS - p.w, newC));
    newR = Math.max(0, Math.min(ROWS - p.h, newR));
    const moved = newR !== p.r || newC !== p.c;
    p.r = newR; p.c = newC;
    place(p, true);
    if (moved) {
      bounce(el);
      if (startTime === null) startTimer();
    }
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
}

/* ---------- 遊び心アニメーション ---------- */

function replay(el, cls, ms) {
  if (!el || reduceMotion) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function bounce(el) { replay(el, "settled", 220); }

function idleWiggle() {
  if (reduceMotion || status !== "playing" || isDragging) return;
  if (!overlay.hidden || !howOverlay.hidden) return;
  if (document.hidden || pieces.length === 0) return;
  const scored = pieces.map((p) => {
    const f = freeSteps(p);
    return { id: p.id, free: f.up + f.down + f.left + f.right };
  });
  const minFree = Math.min(...scored.map((s) => s.free));
  const stuck = scored.filter((s) => s.free === minFree);
  const pick = stuck[Math.floor(Math.random() * stuck.length)];
  replay(els[pick.id], "wiggle", 520);
  if (stuck.length > 1 && Math.random() < 0.45) {
    let other;
    do { other = stuck[Math.floor(Math.random() * stuck.length)]; }
    while (other.id === pick.id);
    setTimeout(() => replay(els[other.id], "wiggle", 520), 90);
  }
}

function scheduleIdle() {
  if (reduceMotion) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { idleWiggle(); scheduleIdle(); },
    1400 + Math.random() * 1500);
}

/* ---------- 自動出現タイマー ---------- */

function scheduleSpawn() {
  clearTimeout(spawnTimer);
  spawnTimer = setTimeout(() => {
    if (status !== "playing") return;
    if (!spawnAttempt()) { gameOver(); return; }
    spawnEvery = Math.max(1700, spawnEvery - 120);
    scheduleSpawn();
  }, spawnEvery);
}

/* ---------- タイマー ---------- */

function fmt(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function startTimer() {
  startTime = Date.now();
  timerId = setInterval(() => {
    timerEl.textContent = fmt(Math.floor((Date.now() - startTime) / 1000));
  }, 250);
}
function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }
function elapsedSec() { return startTime ? Math.floor((Date.now() - startTime) / 1000) : 0; }

/* ---------- ベストスコア ---------- */

const BEST_KEY = "akablock_best_score";
function loadBest() {
  const v = localStorage.getItem(BEST_KEY);
  bestEl.textContent = v ? v : "--";
  return v ? parseInt(v, 10) : null;
}
function saveBest() {
  const prev = loadBest();
  if (prev === null || score > prev) {
    localStorage.setItem(BEST_KEY, String(score));
    bestEl.textContent = score;
    return true;
  }
  return false;
}

/* ---------- ゲームオーバー ---------- */

const overlay = document.getElementById("winOverlay");
const howOverlay = document.getElementById("howOverlay");

function gameOver() {
  if (status === "over") return;
  status = "over";
  stopTimer();
  clearTimeout(spawnTimer);
  clearTimeout(idleTimer);
  const isBest = saveBest();
  document.getElementById("winMoves").textContent = score;
  document.getElementById("winTime").textContent = fmt(elapsedSec());
  document.getElementById("winNote").textContent =
    isBest ? "🏆 自己ベスト更新！" : "ナイスプレイ！もう一度挑戦しよう。";
  overlay.hidden = false;
}

/* ---------- 新規ゲーム ---------- */

function newGame() {
  stopTimer();
  clearTimeout(spawnTimer);
  clearTimeout(idleTimer);
  boardEl.querySelectorAll(".piece").forEach((n) => n.remove());
  pieces = []; els = {}; uid = 0;
  score = 0; startTime = null;
  spawnEvery = 3800;
  status = "playing";
  scoreEl.textContent = "0";
  timerEl.textContent = "00:00";
  overlay.hidden = true;
  fitBoard();
  seedInitial(7);
  startTimer();
  scheduleSpawn();
  scheduleIdle();
}

/* ---------- 初期化 ---------- */

document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("playAgain").addEventListener("click", newGame);
document.getElementById("howto").addEventListener("click", () => { howOverlay.hidden = false; });
document.getElementById("howClose").addEventListener("click", () => { howOverlay.hidden = true; });

window.addEventListener("resize", () => renderAll(false));
window.addEventListener("orientationchange", () => setTimeout(() => renderAll(false), 200));
window.addEventListener("load", () => renderAll(false));

loadBest();
newGame();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
