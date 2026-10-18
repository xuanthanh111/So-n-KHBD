// Máy tính Casio fx-580VN X vẽ phẳng, nhìn thẳng (thân đen, viền xám bạc,
// phím số trắng, DEL/AC xanh dương, màn hình ma trận điểm xám xanh).
import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { BIG, CALC, CalcState, calcAt, fmt, inputLayout, KEYS, KeyDef, LCD, SMALL } from "./calc";
import { m, PRESS, PRESS_HIT, TL } from "./timeline";
import { COLORS, LCD_FONT, UI_FONT } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Hệ số phóng / độ lún / độ sáng viền của phím tại khung hình f. */
function keyAnim(def: KeyDef, f: number) {
  let scale = 1;
  let sink = 0;
  let ring = 0;
  if (def.id) {
    for (const p of TL.presses) {
      if (p.key !== def.id || f < p.frame || f >= p.frame + PRESS) continue;
      const t = f - p.frame;
      scale = interpolate(t, [0, PRESS_HIT, PRESS - 6, PRESS], [1, 1.15, 1.15, 1], { ...clamp, easing: Easing.out(Easing.quad) });
      sink = interpolate(t, [PRESS_HIT, PRESS_HIT + 2, PRESS_HIT + 7, PRESS_HIT + 11], [0, 2, 2, 0], clamp);
      ring = interpolate(t, [0, 3, PRESS - 3, PRESS], [0, 1, 1, 0], clamp);
    }
    for (const h of TL.holds) {
      if (h.key === def.id && f >= h.from && f < h.to) ring = Math.max(ring, 0.55 + 0.45 * Math.sin((f - h.from) / 5));
    }
  }
  return { scale, sink, ring };
}

const Key: React.FC<{ def: KeyDef; f: number }> = ({ def, f }) => {
  const { scale, sink, ring } = keyAnim(def, f);
  const left = def.cx - def.w / 2;
  const top = def.cy - def.h / 2;
  const ringShadow = ring > 0 ? `0 0 0 ${4 * ring}px ${COLORS.orange}, 0 0 ${22 * ring}px ${6 * ring}px rgba(243,146,0,${0.6 * ring})` : "";

  if (def.kind === "pad") {
    // phần ▶ của cụm phím điều hướng
    return (
      <div
        style={{
          position: "absolute", left, top, width: def.w, height: def.h, borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#f2f3f5", fontSize: 20, scale: String(scale), translate: `0px ${sink}px`,
          background: ring > 0 ? `rgba(243,146,0,${0.25 * ring})` : "transparent",
          boxShadow: ringShadow, zIndex: ring > 0 ? 5 : 1,
        }}
      >
        ▶
      </div>
    );
  }

  const base: React.CSSProperties = {
    position: "absolute", left, top, width: def.w, height: def.h,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: UI_FONT, scale: String(scale), translate: `0px ${sink}px`, zIndex: ring > 0 ? 5 : 1,
  };
  let look: React.CSSProperties;
  if (def.kind === "pill") {
    look = {
      borderRadius: 15, background: "linear-gradient(#2c2d31, #17181a)", color: def.pillColor ?? "#eceef0",
      fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5, boxShadow: `0 3px 0 #050506, inset 0 1px 0 rgba(255,255,255,.12)${ringShadow ? ", " + ringShadow : ""}`,
    };
  } else if (def.kind === "fn") {
    look = {
      borderRadius: 9, background: "linear-gradient(#36373b, #1d1e21)", color: "#f4f5f6",
      fontSize: def.label.length > 4 ? 14.5 : 17, fontWeight: 600,
      boxShadow: `0 4px 0 #060607, inset 0 1px 0 rgba(255,255,255,.14)${ringShadow ? ", " + ringShadow : ""}`,
    };
  } else if (def.kind === "blue") {
    look = {
      borderRadius: 10, background: "linear-gradient(#4a80d6, #2753a3)", color: "#fff", fontSize: 19, fontWeight: 700,
      boxShadow: `0 5px 0 #173468, inset 0 1px 0 rgba(255,255,255,.3)${ringShadow ? ", " + ringShadow : ""}`,
    };
  } else {
    look = {
      borderRadius: 10, background: "linear-gradient(#ffffff, #dcdcd7)", color: "#141414",
      fontSize: def.label.length > 2 ? 17 : 26, fontWeight: 600,
      boxShadow: `0 5px 0 #8e8f8a, inset 0 -2px 0 rgba(0,0,0,.06)${ringShadow ? ", " + ringShadow : ""}`,
    };
  }
  return (
    <>
      {def.shift || def.alpha ? (
        <div
          style={{
            position: "absolute", left: def.cx - 40, width: 80, top: top - 16, height: 14,
            display: "flex", justifyContent: "center", gap: 6, fontFamily: UI_FONT, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.2,
          }}
        >
          {def.shift ? <span style={{ color: "#e9c94b" }}>{def.shift}</span> : null}
          {def.alpha ? <span style={{ color: "#ef6d62" }}>{def.alpha}</span> : null}
        </div>
      ) : null}
      <div style={{ ...base, ...look }}>
        <KeyLabel label={def.label} />
      </div>
    </>
  );
};

/** Nhãn phím: "▫" vẽ thành ô vuông nhỏ như in trên máy. */
const KeyLabel: React.FC<{ label: string }> = ({ label }) => {
  if (label === "log▫▫")
    return (
      <span style={{ display: "flex", alignItems: "flex-end" }}>
        log
        <Box size={7} drop={4} />
        <Box size={9} drop={0} />
      </span>
    );
  if (!label.includes("▫")) return <span>{label}</span>;
  const parts = label.split("▫");
  return (
    <span style={{ display: "flex", alignItems: "center" }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          {i < parts.length - 1 ? <Box size={9} drop={0} /> : null}
        </React.Fragment>
      ))}
    </span>
  );
};
const Box: React.FC<{ size: number; drop: number }> = ({ size, drop }) => (
  <span style={{ display: "inline-block", width: size, height: size, border: "1.5px solid currentColor", borderRadius: 1, marginLeft: 1.5, translate: `0px ${drop}px` }} />
);

/* ---------- màn hình ---------- */
const STATUS = ["S", "A", "M", "STO", "RCL", "STAT", "CMPLX", "MAT", "VCT", "D", "R", "G", "FIX", "SCI", "Math", "▲", "▼", "Disp"];

export const lcdOrigin = () => ({ x: CALC.x + LCD.x + 14, y: CALC.y + LCD.y + 30 });

const Chars: React.FC<{ text: string; cw: number; size: number }> = ({ text, cw, size }) => (
  <>
    {[...text].map((c, i) => (
      <span key={i} style={{ display: "inline-block", width: cw, textAlign: "center", fontSize: size }}>
        {c}
      </span>
    ))}
  </>
);

const Screen: React.FC<{ s: CalcState; f: number }> = ({ s, f }) => {
  const blinkOn = Math.floor(f / 14) % 2 === 0;
  const glyphs = inputLayout(s);
  const swapAt = m("s5.swap");
  const swapping = f >= swapAt && f < swapAt + PRESS;
  const swapDone = f >= swapAt + PRESS && f < m("s5.right") + 30;
  const pre = swapping ? inputLayout(calcAt(swapAt - 1)) : null;
  const lastX = glyphs.length ? glyphs[glyphs.length - 1].x + glyphs[glyphs.length - 1].w : 0;

  return (
    <div
      style={{
        position: "absolute", left: LCD.x, top: LCD.y, width: LCD.w, height: LCD.h, borderRadius: 4, overflow: "hidden",
        background: "linear-gradient(180deg, #d2d7cb 0%, #c4cabc 55%, #b7bdaf 100%)",
        boxShadow: "inset 0 3px 8px rgba(0,0,0,.28)", color: COLORS.lcdInk, fontFamily: LCD_FONT,
      }}
    >
      {/* hàng biểu tượng trạng thái */}
      <div style={{ position: "absolute", left: 8, top: 4, right: 8, display: "flex", justifyContent: "space-between", fontSize: 13, letterSpacing: 0 }}>
        {STATUS.map((t) => (
          <span key={t} style={{ opacity: t === "D" || t === "Math" || t === "▲" ? 0.85 : 0.13 }}>
            {t}
          </span>
        ))}
      </div>
      {/* dòng nhập */}
      <div style={{ position: "absolute", left: 14, top: 30, height: 60, width: LCD.w - 28 }}>
        {glyphs.map((g, i) => {
          const active = s.slot === g.slot && g.slot !== undefined;
          const hideForSwap = swapping && g.slot;
          const outline = g.slot
            ? swapDone
              ? `3px solid ${COLORS.green}`
              : swapping
                ? `3px solid ${COLORS.red}`
                : active
                  ? `3px solid ${blinkOn ? COLORS.orange : "rgba(243,146,0,.3)"}`
                  : !g.text
                    ? "2px dashed rgba(27,34,25,.55)"
                    : "none"
            : "none";
          return (
            <div
              key={i}
              style={{
                position: "absolute", left: g.x, top: g.small ? 24 : 4, width: g.w, height: g.small ? 30 : 44,
                display: "flex", alignItems: "center", justifyContent: g.slot ? "center" : "flex-start",
                outline, outlineOffset: -1, borderRadius: 3, lineHeight: 1,
              }}
            >
              {hideForSwap ? null : <Chars text={g.text} cw={g.small ? SMALL : BIG} size={g.small ? 30 : 44} />}
              {active && blinkOn ? <span style={{ width: 3, height: g.small ? 22 : 32, background: COLORS.lcdInk, marginLeft: 1 }} /> : null}
            </div>
          );
        })}
        {s.kind === "ln" && s.slot && blinkOn ? (
          <div style={{ position: "absolute", left: lastX + 1, top: 10, width: 3, height: 32, background: COLORS.lcdInk }} />
        ) : null}
        {s.slot === "idle" && blinkOn ? <div style={{ position: "absolute", left: 0, top: 10, width: 3, height: 32, background: COLORS.lcdInk }} /> : null}
        {pre
          ? (() => {
              const pb = pre.find((g) => g.slot === "base")!;
              const pa = pre.find((g) => g.slot === "arg")!;
              const p = interpolate(f - swapAt, [0, PRESS], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
              const arc = Math.sin(p * Math.PI);
              return (
                <>
                  <div style={{ position: "absolute", left: interpolate(p, [0, 1], [pb.x, pa.x]), top: interpolate(p, [0, 1], [24, 4]) - 30 * arc, fontSize: interpolate(p, [0, 1], [30, 44]), color: COLORS.red }}>
                    {pb.text}
                  </div>
                  <div style={{ position: "absolute", left: interpolate(p, [0, 1], [pa.x, pb.x]), top: interpolate(p, [0, 1], [4, 24]) + 30 * arc, fontSize: interpolate(p, [0, 1], [44, 30]), color: COLORS.red }}>
                    {pa.text}
                  </div>
                </>
              );
            })()
          : null}
      </div>
      {/* dòng kết quả */}
      <div style={{ position: "absolute", right: 16, bottom: 10, fontSize: 60, lineHeight: 1, display: "flex", alignItems: "center" }}>
        {s.result === null ? null : s.frac && !s.dec ? (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 46, lineHeight: 0.95 }}>
            <span style={{ borderBottom: `3px solid ${COLORS.lcdInk}`, padding: "0 6px 2px" }}>{s.frac[0]}</span>
            <span style={{ paddingTop: 4 }}>{s.frac[1]}</span>
          </span>
        ) : (
          <Chars text={fmt(s.result)} cw={27} size={60} />
        )}
      </div>
    </div>
  );
};

export const Calculator: React.FC = () => {
  const f = useCurrentFrame();
  const s = calcAt(f);
  const inAt = m("s0.calcIn");
  return (
    <div
      style={{
        position: "absolute", left: CALC.x, top: CALC.y, width: CALC.w, height: CALC.h,
        translate: `${interpolate(f, [inAt, inAt + 27], [-880, 0], { ...clamp, easing: Easing.bezier(0.2, 0.9, 0.25, 1) })}px 0px`,
        opacity: interpolate(f, [m("s5.fade"), m("s5.end")], [1, 0], clamp),
      }}
    >
      {/* vỏ: viền xám bạc + mặt đen */}
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: "40px 40px 46px 46px",
          background: "linear-gradient(90deg, #8d9096, #c9ccd0 8%, #a5a8ad 50%, #c9ccd0 92%, #8d9096)",
          boxShadow: "0 34px 60px rgba(20,30,40,.38), 0 8px 16px rgba(20,30,40,.25)",
        }}
      />
      <div style={{ position: "absolute", left: 7, top: 7, right: 7, bottom: 14, borderRadius: "34px 34px 40px 40px", background: "linear-gradient(180deg, #232427 0%, #141517 30%, #101113 100%)" }} />
      {/* đáy trắng xám như máy thật */}
      <div style={{ position: "absolute", left: 18, right: 18, bottom: 4, height: 14, borderRadius: "0 0 30px 30px", background: "linear-gradient(#e8e9eb, #b9bbbf)" }} />

      {/* thương hiệu */}
      <div style={{ position: "absolute", left: 32, top: 26, fontFamily: UI_FONT, fontWeight: 800, fontSize: 25, letterSpacing: 4, color: "#f1f2f4" }}>CASIO</div>
      <div style={{ position: "absolute", right: 32, top: 33, fontFamily: UI_FONT, fontWeight: 600, fontSize: 14, color: "#e3e5e8", letterSpacing: 0.3 }}>fx-580VN X</div>

      {/* khung màn hình */}
      <div style={{ position: "absolute", left: 26, top: 74, width: 400, height: 200, borderRadius: 14, background: "linear-gradient(#3a3c41, #26272b)", boxShadow: "inset 0 0 0 2px #5a5d63, inset 0 2px 8px rgba(0,0,0,.6)" }} />
      <Screen s={s} f={f} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 268, textAlign: "center", fontFamily: UI_FONT, fontSize: 11, fontWeight: 700, letterSpacing: 6, color: "#8a8d92" }}>
        CLASSWIZ
      </div>

      {/* cụm phím điều hướng (REPLAY) */}
      <div
        style={{
          position: "absolute", left: 226 - 64, top: 359 - 60, width: 128, height: 120, borderRadius: "50%",
          background: "radial-gradient(circle at 50% 35%, #eef0f2, #a9adb2 70%, #7f8388)", boxShadow: "0 4px 0 #050506",
        }}
      />
      <div style={{ position: "absolute", left: 226 - 54, top: 359 - 50, width: 108, height: 100, borderRadius: "50%", background: "radial-gradient(circle at 50% 40%, #34363a, #1a1b1e)" }} />
      <div style={{ position: "absolute", left: 226 - 18, top: 359 - 16, width: 36, height: 32, borderRadius: "50%", background: "#0d0e10", boxShadow: "inset 0 1px 3px rgba(0,0,0,.7)" }} />
      {[
        ["▲", 226, 323],
        ["▼", 226, 395],
        ["◀", 182, 359],
      ].map(([t, x, y]) => (
        <div key={t as string} style={{ position: "absolute", left: (x as number) - 12, top: (y as number) - 12, width: 24, height: 24, color: "#d9dbde", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {t}
        </div>
      ))}

      {KEYS.map((k, i) => (
        <Key key={i} def={k} f={f} />
      ))}
    </div>
  );
};

/** Toạ độ ô cơ số / ô biểu thức trên khung hình (để vẽ chú thích ở cảnh 3). */
export function slotRects(f: number) {
  const s = calcAt(f);
  const o = lcdOrigin();
  const g = inputLayout(s);
  const b = g.find((x) => x.slot === "base");
  const a = g.find((x) => x.slot === "arg");
  if (!b || !a) return null;
  return {
    base: { x: o.x + b.x, y: o.y + 24, w: b.w, h: 30 },
    arg: { x: o.x + a.x, y: o.y + 4, w: a.w, h: 44 },
  };
}
