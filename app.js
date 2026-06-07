/* あかブロック脱出 — レベル制（赤い2x2を出口へ。クリアごとに難しく） */

const COLS = 4, ROWS = 5;
const GOAL = { r: 3, c: 1 };

const boardEl = document.getElementById("board");
const movesEl = document.getElementById("moves");
const levelEl = document.getElementById("level");
const bestEl  = document.getElementById("best");
const subtitleEl = document.getElementById("subtitle");

let pieces = [];          // {id,w,h,r,c,hero,color}
let els = {};
let initialPieces = null; // 現在レベルの初期配置（やりなおし用）
let level = 1;
let par = 0;
let moves = 0;
let busy = false;         // 脱出演出中など操作ロック
let isDragging = false;
let idleTimer = null;
const reduceMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- レベル生成（Worker＋先読みキャッシュ） ---------- */

let worker = null;
let reqId = 0;
const cache = {};          // level -> {pieces,par}
const waiters = {};        // reqId -> callback
let waitingLevel = null;   // 表示待ちのレベル

try { worker = new Worker("solver.js"); } catch (_) { worker = null; }
if (worker) {
  worker.onmessage = (e) => {
    const d = e.data;
    if (d && d.type === "level") {
      if (d.data) cache[d.level] = d.data;
      const cb = waiters[d.reqId];
      if (cb) { delete waiters[d.reqId]; cb(d.data); }
    }
  };
}

function computeLevel(lv, cb) {
  if (cache[lv]) { cb(cache[lv]); return; }
  if (worker) {
    const id = ++reqId;
    waiters[id] = cb;
    worker.postMessage({ type: "gen", level: lv, reqId: id });
  } else {
    // フォールバック：メインスレッドで生成（solver.js を <script> で読込済み）
    setTimeout(() => { const r = window.generateKlotskiLevel(lv); cache[lv] = r; cb(r); }, 10);
  }
}

function prefetch(lv) { if (!cache[lv]) computeLevel(lv, () => {}); }

/* ---------- 盤面ユーティリティ ---------- */

function buildGrid(exclude) {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (const p of pieces) {
    if (p.id === exclude) continue;
    for (let dr = 0; dr < p.h; dr++)
      for (let dc = 0; dc < p.w; dc++) g[p.r + dr][p.c + dc] = true;
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

/* ---------- 描画 ---------- */

function fitBoard() {
  const wrap = boardEl.parentElement;
  if (!wrap) return;
  const availW = wrap.clientWidth, availH = wrap.clientHeight;
  if (availW === 0 || availH === 0) return;
  const usableH = Math.max(0, availH - 24);
  const w = Math.min(availW, usableH * (COLS / ROWS));
  boardEl.style.width = Math.floor(w) + "px";
}
function cellSize() {
  const styles = getComputedStyle(boardEl);
  const pad = parseFloat(styles.paddingLeft);
  const gap = parseFloat(styles.getPropertyValue("--gap")) || 4;
  const innerW = boardEl.clientWidth - pad * 2;
  return { cell: (innerW - gap * (COLS - 1)) / COLS, gap, pad };
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
function colorFor(p) {
  if (p.hero) return "c-coral";
  if (p.w === 1 && p.h === 2) return "c-blue";
  if (p.w === 2 && p.h === 1) return "c-green";
  return "c-sand";
}
function addPieceEl(p) {
  const el = document.createElement("div");
  el.className = "piece " + p.color + (p.hero ? " hero" : "");
  el.dataset.id = p.id;
  boardEl.appendChild(el);
  els[p.id] = el;
  attachDrag(el, p);
}

/* ---------- ドラッグ操作 ---------- */

function attachDrag(el, p) {
  let active = false, axis = null;
  let startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
  let limits = null, cell = 0, gap = 0, pointerId = null;

  const onDown = (e) => {
    if (busy) return;
    active = true; isDragging = true; axis = null;
    pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    el.classList.add("dragging");
    el.classList.remove("snap", "wiggle", "settled");
    const cs = cellSize(); cell = cs.cell; gap = cs.gap;
    startX = e.clientX; startY = e.clientY;
    baseLeft = parseFloat(el.style.left);
    baseTop = parseFloat(el.style.top);
    limits = freeSteps(p);
  };
  const onMove = (e) => {
    if (!active) return;
    e.preventDefault();
    let dx = e.clientX - startX, dy = e.clientY - startY;
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
      dy = Math.max(-limits.up * step, Math.min(limits.down * step, dy));
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
    const { pad } = cellSize();
    const step = cell + gap;
    let newC = Math.round((parseFloat(el.style.left) - pad) / step);
    let newR = Math.round((parseFloat(el.style.top) - pad) / step);
    newC = Math.max(0, Math.min(COLS - p.w, newC));
    newR = Math.max(0, Math.min(ROWS - p.h, newR));
    const moved = newR !== p.r || newC !== p.c;
    p.r = newR; p.c = newC;
    place(p, true);
    if (moved) {
      moves++;
      movesEl.textContent = moves;
      bounce(el);
      if (p.hero && p.r === GOAL.r && p.c === GOAL.c) winLevel();
    }
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
}

/* ---------- アニメーション ---------- */

function replay(el, cls, ms) {
  if (!el || reduceMotion) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
function bounce(el) { replay(el, "settled", 220); }

function idleWiggle() {
  if (reduceMotion || busy || isDragging) return;
  if (!overlay.hidden || !howOverlay.hidden || document.hidden) return;
  const hero = pieces.find((p) => p.hero);
  if (hero) replay(els[hero.id], "wiggle", 520); // 主役をそっと主張
}
function scheduleIdle() {
  if (reduceMotion) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { idleWiggle(); scheduleIdle(); }, 2600 + Math.random() * 1800);
}

/* ---------- クリア ---------- */

const overlay = document.getElementById("winOverlay");
const howOverlay = document.getElementById("howOverlay");

function starCount() {
  if (moves <= par) return 3;
  if (moves <= Math.round(par * 1.6)) return 2;
  return 1;
}
function winLevel() {
  busy = true;
  clearTimeout(idleTimer);
  const hero = pieces.find((p) => p.hero);
  const el = els[hero.id];
  if (el) el.classList.add("exiting"); // 出口へスーッと
  const stars = starCount();
  if (level >= loadBest()) saveBest(level);
  setTimeout(() => {
    document.getElementById("winTitle").textContent = "レベル " + level + " クリア！";
    document.getElementById("winStars").textContent = "★★★☆☆☆".slice(3 - stars, 6 - stars);
    document.getElementById("winInfo").textContent =
      moves + " 手でクリア（最少 " + par + " 手）";
    document.getElementById("winNote").textContent =
      stars === 3 ? "パーフェクト！🎉" : stars === 2 ? "ナイス！もっと少なく狙える？" : "クリア！次はもっとスマートに。";
    overlay.hidden = false;
  }, reduceMotion ? 0 : 360);
}

/* ---------- ベスト（最高到達レベル） ---------- */

const BEST_KEY = "akablock_best_level";
function loadBest() {
  const v = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = v > 0 ? v : "--";
  return v;
}
function saveBest(lv) {
  localStorage.setItem(BEST_KEY, String(lv));
  bestEl.textContent = lv;
}

/* ---------- レベル開始 ---------- */

function showLoading(on) {
  let l = document.getElementById("loading");
  if (on) {
    if (!l) {
      l = document.createElement("div");
      l.id = "loading";
      l.className = "loading";
      l.textContent = "パズルを準備中…";
      boardEl.appendChild(l);
    }
  } else if (l) l.remove();
}

function applyLevel(data, lv) {
  boardEl.querySelectorAll(".piece").forEach((n) => n.remove());
  pieces = []; els = {};
  level = lv; par = data.par; moves = 0;
  let i = 0;
  for (const sp of data.pieces) {
    const p = { id: "p" + (i++), w: sp.w, h: sp.h, r: sp.r, c: sp.c, hero: !!sp.hero };
    p.color = colorFor(p);
    pieces.push(p);
    addPieceEl(p);
  }
  initialPieces = data.pieces.map((p) => ({ ...p })); // やりなおし用
  busy = false;
  movesEl.textContent = "0";
  levelEl.textContent = lv;
  subtitleEl.textContent = "レベル " + lv + " ・ 目標 " + par + " 手で脱出！";
  overlay.hidden = true;
  renderAll(false);
  scheduleIdle();
  prefetch(lv + 1); // 次レベルを裏で先読み
}

function startLevel(lv) {
  overlay.hidden = true;
  if (cache[lv]) { applyLevel(cache[lv], lv); return; }
  showLoading(true);
  busy = true;
  computeLevel(lv, (data) => {
    showLoading(false);
    if (data) applyLevel(data, lv);
  });
}

function retryLevel() {
  if (!initialPieces || busy) return;
  applyLevel({ pieces: initialPieces.map((p) => ({ ...p })), par }, level);
}

function nextLevel() { startLevel(level + 1); }

/* ---------- 入力 ---------- */

document.getElementById("reset").addEventListener("click", retryLevel);
document.getElementById("playAgain").addEventListener("click", nextLevel);
document.getElementById("howto").addEventListener("click", () => { howOverlay.hidden = false; });
document.getElementById("howClose").addEventListener("click", () => { howOverlay.hidden = true; });

window.addEventListener("resize", () => renderAll(false));
window.addEventListener("orientationchange", () => setTimeout(() => renderAll(false), 200));
window.addEventListener("load", () => renderAll(false));

loadBest();
startLevel(1);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
