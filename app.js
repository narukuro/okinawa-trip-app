/* あかブロック脱出 — 箱入り娘（クロツキ）型スライドパズル */

const COLS = 4;
const ROWS = 5;

// 初期配置（左上を r=0, c=0 とする）
// w,h はマス数。cls は見た目クラス。
// ミニマル配色（生成り＋コーラル）。色だけで主役を示す（漢字・記号なし）。
// 主役＝コーラルの大ブロック(2×2)を下の出口から脱出させるのが目的。
const INITIAL = [
  { id: "red",   cls: "king", r: 0, c: 1, w: 2, h: 2 },
  { id: "blue1", cls: "tall", r: 0, c: 0, w: 1, h: 2 },
  { id: "blue2", cls: "tall", r: 0, c: 3, w: 1, h: 2 },
  { id: "blue3", cls: "tall", r: 2, c: 0, w: 1, h: 2 },
  { id: "blue4", cls: "tall", r: 2, c: 3, w: 1, h: 2 },
  { id: "green", cls: "wide", r: 2, c: 1, w: 2, h: 1 },
  { id: "y1",    cls: "small", r: 3, c: 1, w: 1, h: 1 },
  { id: "y2",    cls: "small", r: 3, c: 2, w: 1, h: 1 },
  { id: "y3",    cls: "small", r: 4, c: 0, w: 1, h: 1 },
  { id: "y4",    cls: "small", r: 4, c: 3, w: 1, h: 1 },
];

// 勝利条件：主役（2×2）が下中央に到達（r=3, c=1 で行3-4・列1-2を占有）
const WIN = { r: 3, c: 1 };

const boardEl = document.getElementById("board");
const movesEl = document.getElementById("moves");
const timerEl = document.getElementById("timer");
const bestEl  = document.getElementById("best");

let pieces = [];
let els = {};        // id -> element
let moveCount = 0;
let startTime = null;
let timerId = null;
let solved = false;

/* ---------- 盤面ユーティリティ ---------- */

function buildGrid(exclude) {
  // 占有グリッド（true=埋まっている）。exclude のIDは無視。
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

// ある駒が各方向へ何マス自由に動けるか
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

function cellSize() {
  const styles = getComputedStyle(boardEl);
  const pad = parseFloat(styles.paddingLeft);
  const gap = parseFloat(styles.getPropertyValue("--gap")) || 6;
  const innerW = boardEl.clientWidth - pad * 2;
  const cell = (innerW - gap * (COLS - 1)) / COLS;
  return { cell, gap, pad };
}

function place(p, animate) {
  const el = els[p.id];
  const { cell, gap, pad } = cellSize();
  const x = pad + p.c * (cell + gap);
  const y = pad + p.r * (cell + gap);
  const w = p.w * cell + (p.w - 1) * gap;
  const h = p.h * cell + (p.h - 1) * gap;
  el.style.width = w + "px";
  el.style.height = h + "px";
  el.classList.toggle("snap", !!animate);
  el.style.left = x + "px";
  el.style.top = y + "px";
}

function renderAll(animate) {
  for (const p of pieces) place(p, animate);
}

function buildPieces() {
  // 既存の駒要素を消す
  boardEl.querySelectorAll(".piece").forEach((n) => n.remove());
  els = {};
  pieces = INITIAL.map((p) => ({ ...p }));
  for (const p of pieces) {
    const el = document.createElement("div");
    el.className = "piece " + p.cls;
    el.dataset.id = p.id;
    // 色だけで区別（漢字・記号なし）。上部の淡いハイライトはCSS ::before で描画。
    boardEl.appendChild(el);
    els[p.id] = el;
    attachDrag(el, p);
  }
  renderAll(false);
}

/* ---------- ドラッグ操作 ---------- */

function attachDrag(el, p) {
  let active = false;
  let axis = null;          // 'x' | 'y'
  let startX = 0, startY = 0;
  let baseLeft = 0, baseTop = 0;
  let limits = null;
  let cell = 0, gap = 0;
  let pointerId = null;

  const onDown = (e) => {
    if (solved) return;
    active = true;
    axis = null;
    pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    el.classList.add("dragging");
    el.classList.remove("snap");
    const cs = cellSize();
    cell = cs.cell; gap = cs.gap;
    startX = e.clientX;
    startY = e.clientY;
    baseLeft = parseFloat(el.style.left);
    baseTop = parseFloat(el.style.top);
    limits = freeSteps(p);
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
      const min = -limits.left * step;
      const max = limits.right * step;
      dx = Math.max(min, Math.min(max, dx));
      el.style.left = baseLeft + dx + "px";
      el.style.top = baseTop + "px";
    } else {
      const min = -limits.up * step;
      const max = limits.down * step;
      dy = Math.max(min, Math.min(max, dy));
      el.style.top = baseTop + dy + "px";
      el.style.left = baseLeft + "px";
    }
  };

  const onUp = () => {
    if (!active) return;
    active = false;
    el.classList.remove("dragging");
    if (pointerId !== null) {
      try { el.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
    }

    const step = cell + gap;
    const curLeft = parseFloat(el.style.left);
    const curTop = parseFloat(el.style.top);
    const { pad } = cellSize();
    const newC = Math.round((curLeft - pad) / step);
    const newR = Math.round((curTop - pad) / step);

    const moved = newR !== p.r || newC !== p.c;
    p.r = newR;
    p.c = newC;
    place(p, true);

    if (moved) {
      if (startTime === null) startTimer();
      moveCount++;
      movesEl.textContent = moveCount;
      checkWin();
    }
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
}

/* ---------- タイマー・勝敗 ---------- */

function fmt(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  startTime = Date.now();
  timerId = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = fmt(sec);
  }, 250);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function elapsedSec() {
  return startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
}

function checkWin() {
  const king = pieces.find((p) => p.id === "red");
  if (king.r === WIN.r && king.c === WIN.c) {
    solved = true;
    stopTimer();
    saveBest();
    showWin();
  }
}

/* ---------- ベスト記録 ---------- */

const BEST_KEY = "oushou_best_moves";

function loadBest() {
  const v = localStorage.getItem(BEST_KEY);
  bestEl.textContent = v ? v : "--";
  return v ? parseInt(v, 10) : null;
}

function saveBest() {
  const prev = loadBest();
  if (prev === null || moveCount < prev) {
    localStorage.setItem(BEST_KEY, String(moveCount));
    bestEl.textContent = moveCount;
    return true;
  }
  return false;
}

/* ---------- オーバーレイ ---------- */

const winOverlay = document.getElementById("winOverlay");
const howOverlay = document.getElementById("howOverlay");

function showWin() {
  document.getElementById("winMoves").textContent = moveCount;
  document.getElementById("winTime").textContent = fmt(elapsedSec());
  const best = loadBest();
  const note = (best !== null && moveCount <= best)
    ? "🏆 自己ベスト更新！"
    : "お見事！ブロックが脱出しました。";
  document.getElementById("winNote").textContent = note;
  winOverlay.hidden = false;
}

/* ---------- リセット ---------- */

function reset() {
  stopTimer();
  startTime = null;
  moveCount = 0;
  solved = false;
  movesEl.textContent = "0";
  timerEl.textContent = "00:00";
  winOverlay.hidden = true;
  buildPieces();
}

/* ---------- 初期化 ---------- */

document.getElementById("reset").addEventListener("click", reset);
document.getElementById("playAgain").addEventListener("click", reset);
document.getElementById("howto").addEventListener("click", () => {
  howOverlay.hidden = false;
});
document.getElementById("howClose").addEventListener("click", () => {
  howOverlay.hidden = true;
});

window.addEventListener("resize", () => renderAll(false));
window.addEventListener("orientationchange", () => setTimeout(() => renderAll(false), 200));

loadBest();
buildPieces();

// Service Worker（オフライン対応）
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
