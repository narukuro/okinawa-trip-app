/* レベル生成＆最短手数ソルバー（メイン/Worker両対応）
   4x5盤・赤2x2のみが下中央の出口から脱出。BFSで最短手数を実測して難易度を管理。 */
(function (global) {
  const COLS = 4, ROWS = 5;
  const GOAL = { r: 3, c: 1 }; // 赤2x2の脱出位置（下中央）

  function occ(pieces) {
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    for (const p of pieces)
      for (let dr = 0; dr < p.h; dr++)
        for (let dc = 0; dc < p.w; dc++) g[p.r + dr][p.c + dc] = true;
    return g;
  }
  function freeAt(g, r, c, w, h, self) {
    if (r < 0 || c < 0 || r + h > ROWS || c + w > COLS) return false;
    for (let dr = 0; dr < h; dr++)
      for (let dc = 0; dc < w; dc++) {
        const rr = r + dr, cc = c + dc;
        let isSelf = false;
        for (let er = 0; er < self.h; er++)
          for (let ec = 0; ec < self.w; ec++)
            if (self.r + er === rr && self.c + ec === cc) isSelf = true;
        if (!isSelf && g[rr][cc]) return false;
      }
    return true;
  }
  function clone(pieces) { return pieces.map((p) => ({ ...p })); }

  // 空き判定（設置用）：その範囲が盤内かつ全セル空きか
  function isEmptyArea(g, r, c, w, h) {
    if (r < 0 || c < 0 || r + h > ROWS || c + w > COLS) return false;
    for (let dr = 0; dr < h; dr++)
      for (let dc = 0; dc < w; dc++)
        if (g[r + dr][c + dc]) return false;
    return true;
  }

  function genMoves(pieces) {
    const out = [];
    const g = occ(pieces);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      for (const [dr, dc] of dirs) {
        let t = 1;
        while (true) {
          const nr = p.r + dr * t, nc = p.c + dc * t;
          if (!freeAt(g, nr, nc, p.w, p.h, p)) break;
          const np = clone(pieces);
          np[i] = { ...p, r: nr, c: nc };
          out.push(np);
          t++;
        }
      }
    }
    return out;
  }
  function hash(pieces) {
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
    for (const p of pieces) {
      const ch = p.hero ? 'H'
        : (p.w === 1 && p.h === 2) ? 'V'
        : (p.w === 2 && p.h === 1) ? 'W' : 'S';
      for (let dr = 0; dr < p.h; dr++)
        for (let dc = 0; dc < p.w; dc++) g[p.r + dr][p.c + dc] = ch;
    }
    return g.map((r) => r.join('')).join('');
  }
  function isGoal(pieces) {
    const h = pieces.find((p) => p.hero);
    return h.r === GOAL.r && h.c === GOAL.c;
  }
  function bfsMin(start, cap = 120000) {
    if (isGoal(start)) return 0;
    const seen = new Set([hash(start)]);
    let frontier = [start], depth = 0;
    while (frontier.length) {
      const next = [];
      for (const st of frontier) {
        for (const nx of genMoves(st)) {
          const k = hash(nx);
          if (seen.has(k)) continue;
          seen.add(k);
          if (isGoal(nx)) return depth + 1;
          next.push(nx);
          if (seen.size > cap) return Infinity;
        }
      }
      frontier = next;
      depth++;
      if (depth > 200) return Infinity;
    }
    return Infinity;
  }

  // 大きい駒を優先して詰めると難しくなりやすい
  // 最短手順（各手後の状態の配列）を返す。解けなければ null。
  function solvePath(start, cap = 200000) {
    if (isGoal(start)) return [];
    const startKey = hash(start);
    const seen = new Set([startKey]);
    const parent = new Map();
    let frontier = [start], goalKey = null;
    outer:
    for (let d = 0; d < 200 && frontier.length; d++) {
      const next = [];
      for (const st of frontier) {
        for (const m of genMoves(st)) {
          const k = hash(m);
          if (seen.has(k)) continue;
          seen.add(k);
          parent.set(k, { prev: hash(st), state: m });
          if (isGoal(m)) { goalKey = k; break outer; }
          next.push(m);
          if (seen.size > cap) return null;
        }
      }
      frontier = next;
    }
    if (!goalKey) return null;
    const path = [];
    let k = goalKey;
    while (k !== startKey) { const n = parent.get(k); path.push(n.state); k = n.prev; }
    path.reverse();
    return path;
  }

  const SHAPES = [{ w: 1, h: 2 }, { w: 2, h: 1 }, { w: 1, h: 2 }, { w: 2, h: 1 }, { w: 1, h: 1 }];
  function rnd(n) { return Math.floor(Math.random() * n); }

  // 空きセルが emptyTarget 以下になるまで駒を詰めた「解けた状態」を作る
  function buildSolved(emptyTarget) {
    const pieces = [{ w: 2, h: 2, r: GOAL.r, c: GOAL.c, hero: true }];
    const cap = 400;
    for (let tries = 0; tries < cap; tries++) {
      const area = pieces.reduce((a, p) => a + p.w * p.h, 0);
      if (ROWS * COLS - area <= emptyTarget) break;
      const s = SHAPES[rnd(SHAPES.length)];
      const r = rnd(ROWS - s.h + 1), c = rnd(COLS - s.w + 1);
      if (isEmptyArea(occ(pieces), r, c, s.w, s.h)) pieces.push({ ...s, r, c, hero: false });
    }
    const area = pieces.reduce((a, p) => a + p.w * p.h, 0);
    if (ROWS * COLS - area < 2) return null; // 動かす余地が無い
    return pieces;
  }
  function reverseShuffle(start, depth) {
    let cur = start, prev = null;
    for (let i = 0; i < depth; i++) {
      const moves = genMoves(cur).filter((m) => hash(m) !== prev);
      if (!moves.length) break;
      prev = hash(cur);
      cur = moves[rnd(moves.length)];
    }
    return cur;
  }
  // 目標手数の「目安」：レベルが上がるほど大きく（上限で頭打ち）。
  // ぴったりでなくてOK。実際の最短手数は生成後にBFSで確定して表示する。
  // par はこの値を超えない（floor が暴走しないための上限）。4×5盤で「ぴったり」を
  // 安定再現できる範囲に設定 → 据え置き(plateau)が持続でき、絶対に減少しない。
  const MAX_PAR = 13;
  function targetForLevel(level) {
    return Math.min(MAX_PAR, 2 + level);
  }

  // 【絶対条件】
  //  ① レベルが上がると難しくなる … par は floor（前レベルの手数）以上、かつ MAX_PAR 以下。
  //     上限を超える盤は採らない（floor暴走防止）→ 減少が起きない。
  //  ② 表示手数で本当に解ける    … 返す par は bfsMin（実測の最短手数）そのもの。
  function generateLevel(aim, floor) {
    floor = floor || 0;
    const target = Math.min(MAX_PAR, Math.max(aim, floor));
    const emptyTarget = Math.max(2, Math.min(11, 12 - target)); // 手数が多いほど盤を詰める
    const depth = 24 + target * 4;
    const t0 = Date.now();
    let bestValid = null, bvDiff = Infinity;  // floor<=par<=MAX_PAR で target に最も近い
    let bestLE = null, blDiff = Infinity;     // par<=MAX_PAR（保険：floor未満も可）
    for (let a = 0; a < 1000 && Date.now() - t0 < 1500; a++) {
      const solved = buildSolved(emptyTarget);
      if (!solved) continue;
      const cand = reverseShuffle(solved, depth);
      if (isGoal(cand)) continue;
      const min = bfsMin(cand);
      if (!isFinite(min)) continue;
      if (min > MAX_PAR) continue;            // 上限超は捨てる（floor暴走防止）
      const d = Math.abs(min - target);
      if (d < blDiff) { blDiff = d; bestLE = { pieces: cand, par: min }; }
      if (min < floor) continue;              // ① 前レベル未満は不採用
      if (min === target) return { pieces: cand, par: min };
      if (d < bvDiff) { bvDiff = d; bestValid = { pieces: cand, par: min }; }
    }
    // floor<=par<=MAX_PAR を最優先。極稀に無ければ最も近いもの（最終保険）。
    return bestValid || bestLE;
  }

  // レベル番号＋前レベルの手数(floor)から生成。少なくとも floor+1 を狙いつつ floor は死守。
  function generateForLevel(level, floor) {
    floor = floor || 0;
    const aim = Math.max(targetForLevel(level), Math.min(MAX_PAR, floor + 1));
    return generateLevel(aim, floor);
  }

  global.COLS_KL = COLS;
  global.ROWS_KL = ROWS;
  global.GOAL_KL = GOAL;
  global.generateKlotskiLevel = generateForLevel;
  // テスト/デバッグ用に最小限のヘルパーを公開
  global.KL = { genMoves, hash, isGoal, bfsMin, solvePath, GOAL, COLS, ROWS };

  // Worker として動いている場合はメッセージ対応
  if (typeof window === 'undefined' && typeof global.postMessage === 'function') {
    global.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === 'gen') {
        const res = generateForLevel(d.level, d.floor || 0);
        global.postMessage({ type: 'level', level: d.level, reqId: d.reqId, data: res });
      }
    };
  }
})(self);
