// Bảng ghi chú bên phải: 3 vùng (Yêu cầu tính / Dãy phím đã bấm / Kết quả và làm tròn)
// cho cảnh 1–3, bảng so sánh cho cảnh 4, lỗi hay gặp + tổng kết cho cảnh 5.
import React from "react";
import { interpolate, Easing } from "remotion";
import { clamp, fadeOut, fadeUp, pop, ramp, shakeX } from "./anim";
import { ChipFace, layoutRow } from "./Chips";
import { m, RV } from "./timeline";
import { COLORS, LCD_FONT, UI_FONT } from "./theme";

const B = { x: 900, y: 96, w: 980, h: 796 };
const label: React.CSSProperties = { position: "absolute", fontFamily: UI_FONT, fontWeight: 700, fontSize: 15, letterSpacing: 2.1, textTransform: "uppercase", color: COLORS.creamMuted };
const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => <sub style={{ fontSize: "0.6em", lineHeight: 0 }}>{children}</sub>;

export const BoardFrame: React.FC<{ f: number }> = ({ f }) => (
  <div
    style={{
      position: "absolute", left: B.x, top: B.y, width: B.w, height: B.h, borderRadius: 22, background: COLORS.cream,
      boxShadow: "0 18px 40px rgba(60,50,30,.18), 0 2px 0 #e9dfc7",
      opacity: interpolate(f, [m("s0.calcIn") + 10, m("s0.calcIn") + 31, m("s5.fade"), m("s5.end")], [0, 1, 1, 0], clamp),
      translate: `${(1 - ramp(f, m("s0.calcIn") + 10, 21)) * 40}px 0px`,
    }}
  />
);

/* ---------- cảnh 1–3 ---------- */
const TASKS: Record<number, { main: React.ReactNode }> = {
  1: { main: <>log 6,52</> },
  2: { main: <>ln 6,52</> },
  3: { main: <>log<Sub>14</Sub>17</> },
};

export const Zones: React.FC<{ f: number; scene: number }> = ({ f, scene }) => {
  const p = `s${scene}`;
  return (
    <>
      <div style={{ ...label, left: 940, top: 128 }}>Yêu cầu tính</div>
      <div style={{ position: "absolute", left: 940, top: 156, fontFamily: UI_FONT, color: COLORS.creamInk, ...fadeUp(f, m(`${p}.task`), 14) }}>
        <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: -0.5 }}>
          Tính <span style={{ color: COLORS.orangeDeep, fontWeight: 800 }}>{TASKS[scene].main}</span>
        </div>
        <div style={{ fontSize: 25, fontWeight: 500, color: "#6f5f45", marginTop: 6 }}>(làm tròn đến chữ số thập phân thứ tư)</div>
      </div>
      {scene === 2 ? <CompareTag f={f} /> : null}
      <div style={{ position: "absolute", left: 940, top: 296, width: 900, borderTop: "2px dashed #e3d6b8" }} />
      <div style={{ ...label, left: 940, top: 316 }}>Dãy phím đã bấm</div>
      <div style={{ position: "absolute", left: 940, top: 438, width: 900, borderTop: "2px dashed #e3d6b8" }} />
      <div style={{ ...label, left: 940, top: 458 }}>Kết quả và làm tròn</div>
      {scene === 1 ? <Rounding f={f} p="s1" raw="0.8142475957" up={false} note="< 5 → giữ nguyên" lhs={<>log 6,52</>} caption /> : null}
      {scene === 2 ? <Rounding f={f} p="s2" raw="1.874874376" up note="≥ 5 → làm tròn lên" lhs={<>ln 6,52</>} /> : null}
      {scene === 3 ? <Rounding f={f} p="s3" raw="1.073570215" up note="≥ 5 → làm tròn lên" lhs={<>log<Sub>14</Sub>17</>} /> : null}
    </>
  );
};

const CompareTag: React.FC<{ f: number }> = ({ f }) => {
  const lit = (a: number, b: number): React.CSSProperties =>
    f >= a && f < b ? { background: COLORS.orange, color: "#fff" } : { background: "transparent", color: "#5d5243" };
  return (
    <div
      style={{
        position: "absolute", right: 1880 - 1840, top: 120, fontFamily: UI_FONT, fontSize: 22, fontWeight: 600,
        background: "#fff", border: "2px solid #ead9b5", borderRadius: 12, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center",
        ...fadeUp(f, m("s2.tag")),
      }}
    >
      <span style={{ padding: "2px 8px", borderRadius: 6, ...lit(m("s2.litLog"), m("s2.litLn")) }}>log → cơ số 10</span>·
      <span style={{ padding: "2px 8px", borderRadius: 6, ...lit(m("s2.litLn"), m("s2.litOff")) }}>ln → cơ số e</span>
    </div>
  );
};

/** Hiệu ứng làm tròn: vạch đỏ cắt sau chữ số thứ tư, tô vàng chữ số thứ năm, mờ phần đuôi, lăn số, đổi "." thành ",". */
const Rounding: React.FC<{ f: number; p: string; raw: string; up: boolean; note: string; lhs: React.ReactNode; caption?: boolean }> = ({ f, p, raw, up, note, lhs, caption }) => {
  const show = m(`${p}.rvShow`);
  if (f < show) return null;
  const cut = m(`${p}.rvCut`);
  const mark = m(`${p}.rvMark`);
  const fin = m(`${p}.rvFinish`);
  const roll = fin + RV.tail;
  const morph = roll + (up ? RV.roll : 0);
  const finalAt = morph + RV.morph;
  const di = raw.indexOf(".");
  const cutAt = di + 5;
  const tailOpacity = fadeOut(f, fin, RV.tail);
  const keptColor = f >= morph + 9 ? COLORS.green : COLORS.creamInk;
  const kept = raw.slice(0, cutAt);
  const finalVal = (up ? kept.slice(0, -1) + String(+kept.slice(-1) + 1) : kept).replace(".", ",");
  // Chỉ cuộn chữ số cuối lên khi làm tròn lên; giữ nguyên thì đứng yên.
  const rollT = up ? interpolate(f, [roll, roll + RV.roll], [0, 1], { ...clamp, easing: Easing.bezier(0.5, -0.3, 0.4, 1.4) }) : 0;
  const morphT = ramp(f, morph, 12);

  return (
    <>
      <div style={{ position: "absolute", left: 940, top: 488, fontFamily: UI_FONT, fontSize: 22, color: "#6f5f45", ...fadeUp(f, show, RV.show) }}>Máy hiện</div>
      <div
        style={{
          position: "absolute", left: 940, top: 520, height: 104, display: "flex", alignItems: "flex-end",
          fontFamily: UI_FONT, fontWeight: 700, fontSize: 88, lineHeight: 1.05, fontVariantNumeric: "tabular-nums", color: COLORS.creamInk,
          ...fadeUp(f, show, RV.show),
        }}
      >
        {[...raw].map((ch, i) => {
          const isTail = i >= cutAt;
          const st: React.CSSProperties = { position: "relative", display: "inline-block", borderRadius: 8, color: isTail ? COLORS.creamInk : keptColor, opacity: isTail ? tailOpacity : 1 };
          const out: React.ReactNode[] = [];
          if (i === cutAt && f >= cut) {
            out.push(
              <span
                key="cut"
                style={{ display: "inline-block", width: 6, height: 106, background: COLORS.red, borderRadius: 3, margin: "0 8px", alignSelf: "center", scale: `1 ${ramp(f, cut, RV.cut)}`, transformOrigin: "50% 100%", opacity: tailOpacity }}
              />,
            );
          }
          if (ch === ".") {
            out.push(
              <span key={i} style={{ ...st, width: "0.3em", height: "1em" }}>
                <span style={{ position: "absolute", left: 0, bottom: 0, opacity: 1 - morphT, translate: `0px ${-10 * morphT}px` }}>.</span>
                <span style={{ position: "absolute", left: 0, bottom: 0, opacity: morphT, translate: `0px ${12 * (1 - morphT)}px` }}>,</span>
              </span>,
            );
          } else if (i === cutAt - 1) {
            out.push(
              <span key={i} style={{ ...st, height: "1.05em", overflow: "hidden" }}>
                <span style={{ display: "flex", flexDirection: "column", translate: `0px ${-1.05 * rollT}em` }}>
                  <span style={{ height: "1.05em" }}>{ch}</span>
                  <span style={{ height: "1.05em" }}>{(+ch + 1) % 10}</span>
                </span>
              </span>,
            );
          } else if (i === cutAt) {
            const hl = f >= mark;
            out.push(
              <span key={i} style={{ ...st, background: hl ? COLORS.yellow : "transparent", boxShadow: hl ? `0 0 0 4px ${COLORS.yellow}` : "none", scale: hl ? String(interpolate(f, [mark, mark + 7, mark + 12], [1, 1.15, 1], clamp)) : "1" }}>
                {ch}
                {hl ? (
                  <span
                    style={{
                      position: "absolute", left: -10, top: 112, fontSize: 26, fontWeight: 700, color: "#7a5600", background: "#fff3c2",
                      border: "2px solid #f1d36a", borderRadius: 10, padding: "6px 12px", whiteSpace: "nowrap", lineHeight: 1.2, ...fadeUp(f, mark, 12),
                    }}
                  >
                    {note}
                  </span>
                ) : null}
              </span>,
            );
          } else out.push(<span key={i} style={st}>{ch}</span>);
          return out;
        })}
      </div>
      {f >= finalAt ? (
        <div style={{ position: "absolute", left: 940, top: 700, fontFamily: UI_FONT, fontWeight: 700, fontSize: 56, color: COLORS.creamInk, ...fadeUp(f, finalAt, 12) }}>
          {lhs} ≈ <span style={{ display: "inline-block", color: COLORS.green, ...pop(f, finalAt, 14) }}>{finalVal}</span>
        </div>
      ) : null}
      {caption && f >= morph ? (
        <div style={{ position: "absolute", left: 940, top: 800, fontFamily: UI_FONT, fontSize: 23, color: "#6f5f45", display: "flex", alignItems: "center", gap: 10, ...fadeUp(f, morph, 12) }}>
          Máy dùng dấu chấm, ta viết dấu phẩy:
          <span style={{ fontWeight: 800, fontSize: 28, background: "#fff", border: "2px solid #ead9b5", borderRadius: 8, padding: "0 12px" }}>.</span>→
          <span style={{ fontWeight: 800, fontSize: 28, background: "#fff", border: "2px solid #ead9b5", borderRadius: 8, padding: "0 12px" }}>,</span>
        </div>
      ) : null}
    </>
  );
};

const LcdVal: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontFamily: LCD_FONT, fontSize: 46, background: COLORS.lcd, color: COLORS.lcdInk, borderRadius: 8, padding: "0 12px", display: "inline-flex", alignItems: "center", ...style }}>{children}</span>
);

/* ---------- cảnh 5: lỗi hay gặp + tổng kết ---------- */
const Mark: React.FC<{ ok: boolean; style?: React.CSSProperties }> = ({ ok, style }) => (
  <span style={{ width: 50, height: 50, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: UI_FONT, fontWeight: 800, fontSize: 28, color: "#fff", background: ok ? COLORS.green : COLORS.red, flex: "none", ...style }}>
    {ok ? "✔" : "✘"}
  </span>
);
const ErrHead: React.FC<{ n: string; children: React.ReactNode; style: React.CSSProperties }> = ({ n, children, style }) => (
  <div style={{ position: "absolute", left: 940, display: "flex", alignItems: "center", gap: 14, fontFamily: UI_FONT, fontWeight: 800, fontSize: 32, color: COLORS.creamInk, ...style }}>
    <span style={{ background: COLORS.red, color: "#fff", borderRadius: 10, padding: "2px 14px", fontSize: 24 }}>{n}</span>
    {children}
  </div>
);
const box: React.CSSProperties = { background: "#fff", border: "2px solid #ecdfc3", borderRadius: 14, padding: "10px 20px", fontFamily: UI_FONT, fontWeight: 700, fontSize: 38, display: "flex", alignItems: "center", gap: 14, color: COLORS.creamInk };

export const ErrorsPanel: React.FC<{ f: number }> = ({ f }) => {
  const outT = fadeOut(f, m("s5.panelOut"), 15);
  const wrong = m("s5.wrong");
  const strike = m("s5.strike");
  const right = m("s5.right");
  const e2 = m("s5.e2");
  const opts: [string, string, boolean][] = [
    ["1,07", "thiếu chữ số", false],
    ["1,0735", "cắt bỏ, không làm tròn", false],
    ["1,0736", "đúng: 4 chữ số, làm tròn lên", true],
  ];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: outT }}>
      <ErrHead n="Lỗi 1" style={{ top: 126, ...fadeUp(f, m("s5.in")) }}>Nhập ngược thứ tự cơ số và biểu thức</ErrHead>
      {f >= wrong ? (
        <div style={{ position: "absolute", left: 940, top: 290, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ ...box, position: "relative", ...fadeUp(f, wrong) }}>
            <LcdVal>0.9314…</LcdVal>
            <span>
              = log<Sub>17</Sub>14
            </span>
            <span style={{ position: "absolute", left: 10, right: 10, top: "50%", height: 6, background: COLORS.red, borderRadius: 3, transformOrigin: "0 50%", rotate: "-8deg", scale: `${ramp(f, strike, 10)} 1` }} />
          </div>
          {f >= strike ? <Mark ok={false} style={{ ...pop(f, strike), translate: `${shakeX(f, strike)}px 0px` }} /> : null}
          {f >= strike ? <span style={{ fontFamily: UI_FONT, fontSize: 22, color: "#7d6c50", ...fadeUp(f, strike) }}>nhập 17 trước nên máy tính log<Sub>17</Sub>14</span> : null}
        </div>
      ) : null}
      {f >= right ? (
        <div style={{ position: "absolute", left: 940, top: 380, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ ...box, ...fadeUp(f, right) }}>
            <span>
              log<Sub>14</Sub>17 ≈ <span style={{ color: COLORS.green }}>1,0736</span>
            </span>
          </div>
          <Mark ok style={pop(f, right)} />
          <span style={{ fontFamily: UI_FONT, fontSize: 22, color: "#7d6c50", ...fadeUp(f, right) }}>cơ số 14 nhập trước</span>
        </div>
      ) : null}
      {f >= e2 ? (
        <ErrHead n="Lỗi 2" style={{ top: 500, ...fadeUp(f, e2) }}>
          Làm tròn sai yêu cầu
          <span style={{ fontSize: 22, fontWeight: 500, color: "#7d6c50" }}>(log₁₄17, 4 chữ số thập phân)</span>
        </ErrHead>
      ) : null}
      <div style={{ position: "absolute", left: 940, top: 572, display: "flex", gap: 16 }}>
        {opts.map(([val, why, ok], i) => {
          const at = m(`s5.opt${i}`);
          if (f < at) return null;
          const mk = at + 13;
          return (
            <div key={val} style={{ ...box, border: `2px solid ${ok ? "#9bd4b2" : "#f0b4ad"}`, padding: "12px 16px", fontSize: 40, ...fadeUp(f, at, 10) }}>
              <div>
                {val}
                <div style={{ fontSize: 18, fontWeight: 500, color: "#7d6c50" }}>{why}</div>
              </div>
              {f >= mk ? <Mark ok={ok} style={{ ...pop(f, mk), translate: ok ? "0px 0px" : `${shakeX(f, mk)}px 0px` }} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SUM: [React.ReactNode, string[]][] = [
  [<>log <i>a</i></>, ["log", "1", "0", "right", "a", "eq"]],
  [<>ln <i>a</i></>, ["ln", "a", "eq"]],
  [<>log<Sub><i>a</i></Sub><i>b</i></>, ["log", "a", "right", "b", "eq"]],
];

export const Summary: React.FC<{ f: number }> = ({ f }) => {
  const at = m("s5.sum");
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", left: 940, top: 250, width: 900, height: 360, background: "#fff", border: `3px solid ${COLORS.orange}`, borderRadius: 22, ...fadeUp(f, at, 10), opacity: ramp(f, at, 10) * fadeOut(f, m("s5.fade"), 30) }}>
      <div style={{ position: "absolute", left: 34, top: 26, fontFamily: UI_FONT, fontWeight: 800, fontSize: 34, color: COLORS.orangeDeep }}>Tóm tắt cách bấm</div>
      {SUM.map(([lhs, keys], i) => {
        const t = at + 9 * (i + 1);
        const y = 100 + i * 82;
        const pos = layoutRow(keys, { x: 290, y, maxW: 600, sm: true });
        return (
          <div key={i} style={{ position: "absolute", inset: 0, opacity: ramp(f, t, 12), translate: `${(1 - ramp(f, t, 12)) * -20}px 0px` }}>
            <div style={{ position: "absolute", left: 34, top: y - 4, fontFamily: UI_FONT, fontWeight: 700, fontSize: 42, color: COLORS.creamInk }}>{lhs}</div>
            <div style={{ position: "absolute", left: 220, top: y, fontFamily: UI_FONT, fontWeight: 700, fontSize: 32, color: COLORS.creamMuted }}>→</div>
            {keys.map((k, j) => (
              <ChipFace key={j} k={k} sm style={{ left: pos[j].x, top: pos[j].y }} />
            ))}
          </div>
        );
      })}
    </div>
  );
};
