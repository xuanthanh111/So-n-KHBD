// "Chip phím": mỗi lần bấm, một bản sao nhỏ của phím bay sang dãy phím ở bảng bên phải.
import React from "react";
import { interpolate, Easing } from "remotion";
import { keyCenter } from "./calc";
import { clamp, fadeOut } from "./anim";
import { ChipRow, KeyId, m, PRESS_HIT, TL } from "./timeline";
import { UI_FONT } from "./theme";

type RowCfg = { x: number; y: number; maxW: number; sm: boolean };
/** Vị trí từng dãy chip trên khung hình, theo cảnh. */
export const ROWS: Record<ChipRow, RowCfg> = {
  main: { x: 940, y: 350, maxW: 900, sm: false },
  A: { x: 1440, y: 222, maxW: 340, sm: true },
  B: { x: 1440, y: 488, maxW: 340, sm: true },
  E: { x: 940, y: 196, maxW: 900, sm: false },
};

type ChipKind = "white" | "black" | "blue" | "var";
const kindOf = (k: string): ChipKind =>
  /^[0-9]$|^dot$|^eq$/.test(k) ? "white" : k === "ac" ? "blue" : k === "a" || k === "b" ? "var" : "black";
const BASE_W: Record<string, number> = { log: 104, ln: 66, ac: 74, sd: 100 };
export const chipW = (k: string, sm: boolean) => (BASE_W[k] ?? 58) * (sm ? 0.76 : 1);
export const chipH = (sm: boolean) => (sm ? 44 : 58);

export const ChipFace: React.FC<{ k: string; sm: boolean; style?: React.CSSProperties }> = ({ k, sm, style }) => {
  const kind = kindOf(k);
  const look: Record<ChipKind, React.CSSProperties> = {
    white: { background: "linear-gradient(#ffffff, #dcdcd7)", color: "#141414", boxShadow: "0 4px 0 #8e8f8a" },
    black: { background: "linear-gradient(#36373b, #1d1e21)", color: "#fff", boxShadow: "0 4px 0 #060607" },
    blue: { background: "linear-gradient(#4a80d6, #2753a3)", color: "#fff", boxShadow: "0 4px 0 #173468" },
    var: { background: "#fff", color: "#1f63d6", border: "2px dashed #1f63d6", fontStyle: "italic", fontWeight: 700 },
  };
  const label =
    k === "log" ? (
      <span style={{ display: "flex", alignItems: "flex-end" }}>
        log
        <span style={{ display: "inline-block", width: "0.32em", height: "0.32em", border: "2px solid currentColor", marginLeft: 2, translate: "0px 0.12em" }} />
        <span style={{ display: "inline-block", width: "0.42em", height: "0.42em", border: "2px solid currentColor", marginLeft: 2 }} />
      </span>
    ) : (
      ({ dot: ".", eq: "=", right: "▶", ac: "AC", sd: "S⇔D" } as Record<string, string>)[k] ?? k
    );
  return (
    <div
      style={{
        position: "absolute", width: chipW(k, sm), height: chipH(sm), borderRadius: sm ? 9 : 12,
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: UI_FONT,
        fontWeight: 600, fontSize: (k === "ac" || k === "sd" ? 23 : k === "right" ? 24 : 28) * (sm ? 0.76 : 1),
        ...look[kind], ...style,
      }}
    >
      {label}
    </div>
  );
};

/** Bố cục một dãy chip có xuống dòng. */
export function layoutRow(keys: string[], cfg: RowCfg) {
  const gap = cfg.sm ? 8 : 12;
  let x = 0;
  let y = 0;
  return keys.map((k) => {
    const w = chipW(k, cfg.sm);
    if (x > 0 && x + w > cfg.maxW) {
      x = 0;
      y += chipH(cfg.sm) + gap;
    }
    const pos = { x: cfg.x + x, y: cfg.y + y };
    x += w + gap;
    return pos;
  });
}

const FLY = 14;

export const Chips: React.FC<{ f: number; scene: number }> = ({ f, scene }) => {
  const rows = (Object.keys(ROWS) as ChipRow[]).map((r) => {
    const ps = TL.presses.filter((p) => p.chip === r && p.scene === scene);
    const pos = layoutRow(ps.map((p) => p.key), ROWS[r]);
    return ps.map((p, i) => {
      const start = p.frame + PRESS_HIT;
      if (f < start) return null;
      const sm = ROWS[r].sm;
      const from = keyCenter(p.key as KeyId);
      const t = interpolate(f, [start, start + FLY], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
      const w = chipW(p.key, sm);
      const h = chipH(sm);
      const x = interpolate(t, [0, 1], [from.x - w / 2, pos[i].x]);
      const y = interpolate(t, [0, 1], [from.y - h / 2, pos[i].y]) - 90 * Math.sin(Math.PI * t);
      const scale = interpolate(t, [0, 0.55, 1], [0.55, 1.12, 1]);
      // dãy phím của cảnh 5 mờ đi cùng bảng lỗi trước khi hiện thẻ tổng kết
      const rowFade = r === "E" ? fadeOut(f, m("s5.panelOut"), 15) : 1;
      return <ChipFace key={`${r}${i}`} k={p.key} sm={sm} style={{ left: x, top: y, scale: String(scale), opacity: interpolate(t, [0, 0.3], [0.3, 1], clamp) * rowFade, zIndex: t < 1 ? 40 : 2 }} />;
    });
  });
  return <>{rows}</>;
};
