// game-screens.jsx
// あかブロック脱出 — 3つのデザイン案 (静止モック)
// Anthropic(Claude)風の生成り+コーラル配色。
// GameScreen({variant}) を window に公開。variant: 'minimal' | 'face' | 'wood'

const { useState } = React;

// 5列 × 6行 のスライドパズル盤面。出口は下中央(列3)。
// 列3の下段(行3〜6)は脱出レーンとして空けてある。
const BLOCKS = [
  { c: 1, r: 1, w: 1, h: 3, t: "blue" },
  { c: 2, r: 1, w: 1, h: 2, t: "blue" },
  { c: 3, r: 1, w: 1, h: 2, t: "coral", hero: true },
  { c: 4, r: 1, w: 1, h: 2, t: "blue" },
  { c: 5, r: 1, w: 1, h: 3, t: "blue" },
  { c: 2, r: 3, w: 1, h: 1, t: "sand" },
  { c: 4, r: 3, w: 1, h: 1, t: "sand" },
  { c: 1, r: 4, w: 2, h: 1, t: "green" },
  { c: 4, r: 4, w: 1, h: 1, t: "sand" },
  { c: 5, r: 4, w: 1, h: 2, t: "blue" },
];

// 各案の色は同じパレットを共有し、表現(角丸/影/顔)だけ変える。
const TILE = {
  coral: { fill: "#D9774F", edge: "#BC5A36", face: "#7A2E16" },
  blue:  { fill: "#8DA9C0", edge: "#6E8AA3", face: "#39495A" },
  green: { fill: "#92B58E", edge: "#739872", face: "#33493A" },
  sand:  { fill: "#E6C275", edge: "#C9A152", face: "#7A5A1E" },
};

// ----- 顔パーツ (案B) -----
function Face({ hero, t }) {
  const ink = TILE[t].face;
  const eye = { width: hero ? 11 : 8, height: hero ? 14 : 10, borderRadius: "50%", background: ink };
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: hero ? 7 : 5, pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: hero ? 16 : 12, alignItems: "center" }}>
        <span style={eye} />
        <span style={eye} />
      </div>
      {hero ? (
        <div style={{ width: 22, height: 11, borderBottom: `4px solid ${ink}`,
          borderRadius: "0 0 22px 22px" }} />
      ) : (
        <div style={{ width: 12, height: 6, borderBottom: `3px solid ${ink}`,
          borderRadius: "0 0 12px 12px", opacity: 0.85 }} />
      )}
      {hero && (
        <>
          <span style={{ position: "absolute", left: 8, top: "54%", width: 9, height: 9,
            borderRadius: "50%", background: "#F4A77F", opacity: 0.75 }} />
          <span style={{ position: "absolute", right: 8, top: "54%", width: 9, height: 9,
            borderRadius: "50%", background: "#F4A77F", opacity: 0.75 }} />
        </>
      )}
    </div>
  );
}

function ArrowDown({ color = "#FBF4EC", size = 26 }) {
  return (
    <div style={{ width: 0, height: 0, borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`, borderTop: `${size * 0.72}px solid ${color}`,
      borderRadius: 4, opacity: 0.95 }} />
  );
}

// ----- ブロック -----
function Block({ b, variant }) {
  const c = TILE[b.t];
  const radius = variant === "wood" ? 14 : 18;
  const base = {
    gridColumn: `${b.c} / span ${b.w}`,
    gridRow: `${b.r} / span ${b.h}`,
    borderRadius: radius,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: c.fill,
    margin: 2,
  };

  // 案ごとの立体感
  if (variant === "minimal") {
    base.boxShadow = `0 3px 0 ${c.edge}, 0 6px 12px rgba(60,46,32,0.12)`;
  } else if (variant === "face") {
    base.boxShadow = `0 4px 0 ${c.edge}, 0 8px 14px rgba(60,46,32,0.14)`;
    base.borderRadius = 22;
  } else {
    // wood: フラット気味 + 細い内側ハイライト
    base.boxShadow = `inset 0 2px 0 rgba(255,255,255,0.28), 0 3px 0 ${c.edge}, 0 5px 9px rgba(70,48,28,0.18)`;
  }

  const showFaces = variant === "face";

  return (
    <div style={base}>
      {/* 上面のやわらかいハイライト */}
      <div style={{ position: "absolute", left: 6, right: 6, top: 5, height: "32%",
        borderRadius: radius, background: "linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0))",
        pointerEvents: "none" }} />
      {showFaces && <Face hero={b.hero} t={b.t} />}
      {b.hero && variant === "wood" && <ArrowDown />}
      {b.hero && showFaces && (
        <div style={{ position: "absolute", bottom: 6 }}><ArrowDown size={16} color="rgba(251,244,236,0.9)" /></div>
      )}
    </div>
  );
}

// ----- 盤面 -----
function Board({ variant }) {
  const boardStyles = {
    minimal: {
      background: "#FBF9F3",
      border: "1px solid #ECE6D9",
      boxShadow: "0 10px 30px rgba(60,46,32,0.08)",
      padding: 12,
    },
    face: {
      background: "#FBF7EE",
      border: "2px solid #EFE7D6",
      boxShadow: "0 14px 32px rgba(60,46,32,0.12)",
      padding: 12,
    },
    wood: {
      background: "linear-gradient(#EAD8B6, #E2CBA1)",
      border: "3px solid #CDB184",
      boxShadow: "inset 0 2px 6px rgba(255,255,255,0.4), 0 12px 28px rgba(70,48,28,0.16)",
      padding: 14,
    },
  }[variant];

  return (
    <div style={{ position: "relative" }}>
      <div style={{ borderRadius: 26, position: "relative", ...boardStyles }}>
        {variant === "wood" && (
          <div style={{ position: "absolute", inset: 14, borderRadius: 16, pointerEvents: "none",
            background: "repeating-linear-gradient(90deg, rgba(180,140,90,0.10) 0 2px, transparent 2px 26px)" }} />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)",
          gridTemplateRows: "repeat(6,1fr)", aspectRatio: "5 / 6", gap: 0, position: "relative" }}>
          {BLOCKS.map((b, i) => <Block key={i} b={b} variant={variant} />)}
        </div>
      </div>
      {/* 出口 (下中央, 列3) */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: -3 }}>
        <div style={{ width: "20%", marginLeft: "0%", display: "flex", flexDirection: "column",
          alignItems: "center" }}>
          <div style={{ width: "100%", height: 8,
            background: variant === "wood" ? "#EAD8B6" : "#FBF8F0",
            borderRadius: "0 0 8px 8px",
            borderLeft: "2px solid " + (variant === "wood" ? "#CDB184" : "#ECE6D9"),
            borderRight: "2px solid " + (variant === "wood" ? "#CDB184" : "#ECE6D9"),
            borderBottom: "2px solid " + (variant === "wood" ? "#CDB184" : "#ECE6D9") }} />
          <span style={{ marginTop: 6, fontSize: 12, letterSpacing: 4, color: "#A89B82",
            fontWeight: 700 }}>出口</span>
        </div>
      </div>
    </div>
  );
}

// ----- 上部スタッツ -----
function Stat({ label, value, accent, variant }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "10px 6px 11px",
      borderRadius: 16,
      background: variant === "wood" ? "rgba(255,255,255,0.55)" : "#FFFFFF",
      border: "1px solid #EDE7DA" }}>
      <div style={{ fontSize: 11, color: "#A89B82", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? "#C2603C" : "#3A352C",
        fontFamily: "'Zen Maru Gothic', sans-serif", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ----- 画面全体 -----
function GameScreen({ variant }) {
  return (
    <div style={{ width: "100%", height: "100%", boxSizing: "border-box",
      background: "#F4F1E9", padding: "20px 18px 16px",
      display: "flex", flexDirection: "column", gap: 14,
      fontFamily: "'M PLUS Rounded 1c', sans-serif", color: "#3A352C" }}>

      {/* ステータスバー(簡易) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12.5, color: "#8B8270", fontWeight: 800, padding: "0 4px" }}>
        <span>7:40</span>
        <span style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 11 }}>
          <span style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
            {[5, 7, 9, 11].map((h, i) => (
              <span key={i} style={{ width: 3, height: h, borderRadius: 1, background: "#8B8270" }} />
            ))}
          </span>
          <span style={{ width: 24, height: 11, border: "1.5px solid #8B8270", borderRadius: 3,
            position: "relative", display: "inline-block" }}>
            <span style={{ position: "absolute", inset: 1.5, right: 7, background: "#8B8270",
              borderRadius: 1 }} />
          </span>
        </span>
      </div>

      {/* タイトル */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontFamily: "'Zen Maru Gothic', sans-serif", fontWeight: 700,
          fontSize: 30, letterSpacing: 1, color: "#2F2A22",
          display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 18, height: 18, borderRadius: 6, background: "#D9774F",
            boxShadow: "0 2px 0 #BC5A36", display: "inline-block" }} />
          あかブロック脱出
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#8B8270", lineHeight: 1.5 }}>
          赤いブロックを下の出口からスライドさせよう
        </p>
      </div>

      {/* スタッツ */}
      <div style={{ display: "flex", gap: 9 }}>
        <Stat label="手数" value="0" accent variant={variant} />
        <Stat label="タイム" value="00:00" variant={variant} />
        <Stat label="ベスト" value="--" variant={variant} />
      </div>

      {/* 盤面 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Board variant={variant} />
      </div>

      {/* ボタン */}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ flex: 1, padding: "14px 0", border: "none", borderRadius: 16,
          background: "#D9774F", color: "#FFF8F1", fontSize: 15.5, fontWeight: 800,
          fontFamily: "'M PLUS Rounded 1c', sans-serif", cursor: "pointer",
          boxShadow: "0 3px 0 #BC5A36" }}>最初から</button>
        <button style={{ flex: 1, padding: "14px 0", borderRadius: 16,
          background: "#FFFFFF", color: "#6E6557", fontSize: 15.5, fontWeight: 800,
          fontFamily: "'M PLUS Rounded 1c', sans-serif", cursor: "pointer",
          border: "1px solid #E6DFD0", boxShadow: "0 3px 0 #ECE5D6" }}>遊び方</button>
      </div>

      <p style={{ margin: 0, textAlign: "center", fontSize: 11.5, color: "#A89B82" }}>
        指でブロックをスライドして動かせます
      </p>
    </div>
  );
}

Object.assign(window, { GameScreen });
