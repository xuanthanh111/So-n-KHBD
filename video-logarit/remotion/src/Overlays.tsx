import React from "react";
import { interpolate, Easing } from "remotion";
import { clamp, fadeOut, fadeUp, pop, ramp, shakeX } from "./anim";
import { slotRects } from "./Calculator";
import { CALC } from "./calc";
import { m, TL } from "./timeline";
import { COLORS, LCD_FONT, UI_FONT } from "./theme";

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => <sub style={{ fontSize: "0.6em", lineHeight: 0 }}>{children}</sub>;

export const TopBar: React.FC<{ f: number; scene: number }> = ({ f, scene }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 84, display: "flex", alignItems: "center", gap: 22, padding: "0 48px", fontFamily: UI_FONT, opacity: fadeOut(f, m("s5.fade"), 30) }}>
    <div style={{ width: 44, height: 44, borderRadius: 11, background: COLORS.orange, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 }}>log</div>
    <div style={{ fontWeight: 700, fontSize: 30, color: COLORS.orangeDeep }}>Tính lôgarit bằng máy tính cầm tay</div>
    <div style={{ display: "flex", gap: 10, marginLeft: 8 }}>
      {[1, 2, 3].map((n) => {
        const on = scene === n;
        const done = scene > n;
        return (
          <span
            key={n}
            style={{
              width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20,
              border: `3px solid ${on || done ? COLORS.orange : "#c5ccd3"}`, background: on ? COLORS.orange : "#fff",
              color: on ? "#fff" : done ? COLORS.orangeDeep : "#8a96a1", scale: on ? "1.12" : "1",
            }}
          >
            {n}
          </span>
        );
      })}
    </div>
    <div style={{ marginLeft: "auto", fontWeight: 500, fontSize: 20, color: "#6c7882" }}>Toán 11 · Hàm số mũ và hàm số lôgarit</div>
  </div>
);

/* ---------- cảnh 0 ---------- */
const exBox: React.CSSProperties = { display: "flex", alignItems: "center", gap: 36, fontFamily: UI_FONT, fontWeight: 700, fontSize: 70, background: "#fff", padding: "18px 40px", borderRadius: 20, boxShadow: "0 10px 24px rgba(40,50,60,.12)", color: COLORS.creamInk };

export const Intro: React.FC<{ f: number }> = ({ f }) => {
  const out = m("s0.out");
  if (f > out + 20) return null;
  const shrink = m("s0.shrink");
  const sh = ramp(f, shrink, 18);
  const exStyle = (a: number): React.CSSProperties => ({
    ...exBox,
    opacity: ramp(f, a, 18) * (1 - 0.72 * sh),
    translate: `0px ${(1 - ramp(f, a, 18)) * 20}px`,
    scale: String(1 - 0.4 * sh),
  });
  const q = m("s0.q");
  const qm2Shake = shakeX(f, m("s0.shake1")) + shakeX(f, m("s0.shake2"));
  return (
    <div style={{ position: "absolute", left: 0, top: 84, width: 1920, height: 996, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, opacity: fadeOut(f, out, 18), scale: String(1 - 0.06 * ramp(f, out, 18)) }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 - 40 * sh }}>
        <div style={exStyle(m("s0.ex1"))}>
          <span>log 100 = 2</span>
          <span style={{ color: COLORS.orange, fontSize: 64 }}>→</span>
          <span style={{ color: COLORS.orangeDeep }}>
            100 = 10<sup style={{ fontSize: "0.6em" }}>2</sup>
          </span>
        </div>
        <div style={exStyle(m("s0.ex2"))}>
          <span>log 0,001 = −3</span>
          <span style={{ color: COLORS.orange, fontSize: 64 }}>→</span>
          <span style={{ color: COLORS.orangeDeep }}>
            0,001 = 10<sup style={{ fontSize: "0.6em" }}>−3</sup>
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 22, background: "#fff", padding: "30px 60px", borderRadius: 24,
          border: `3px solid ${COLORS.orange}`, boxShadow: "0 14px 30px rgba(40,50,60,.16)", fontFamily: UI_FONT, color: COLORS.creamInk,
          opacity: ramp(f, q, 15), scale: String(0.9 + 0.1 * ramp(f, q, 15)),
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 96 }}>
          log 6,52 = <span style={{ color: "#fff", background: COLORS.orange, borderRadius: 14, padding: "0 18px" }}>?</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 64, display: "flex", alignItems: "flex-start" }}>
          6,52 = 10
          <span style={{ display: "inline-block", color: "#fff", background: COLORS.red, borderRadius: 10, padding: "0 10px", fontSize: 40, marginLeft: 4, translate: `${qm2Shake}px 0px` }}>?</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 30, color: COLORS.red, ...fadeUp(f, m("s0.nope"), 12) }}>Không đưa được về lũy thừa của 10</div>
      </div>
    </div>
  );
};

/* ---------- Đến lượt em ---------- */
type TurnProps = { p: string; q: React.ReactNode; lcd: string; ans: React.ReactNode; note?: React.ReactNode };
export const TURNS: TurnProps[] = [
  { p: "s1", q: <>tính log 3,7</>, lcd: "0.5682017241", ans: <>log 3,7 ≈ <b style={{ color: COLORS.green }}>0,5682</b></> },
  {
    p: "s2", q: <>tính ln 0,45</>, lcd: "−0.7985076962", ans: <>ln 0,45 ≈ <b style={{ color: COLORS.green }}>−0,7985</b></>,
    note: <>Số dưới dấu log nhỏ hơn 1 (cơ số 10 hoặc e) thì kết quả âm.</>,
  },
  {
    p: "s3", q: <>tính log<Sub>5</Sub>12</>, lcd: "1.543959311",
    ans: <>log<Sub>5</Sub>12 ≈ <b style={{ color: COLORS.green }}>1,544<span style={{ background: COLORS.yellow, borderRadius: 8, boxShadow: `0 0 0 4px ${COLORS.yellow}` }}>0</span></b></>,
    note: <>Làm tròn đến chữ số thứ tư → vẫn phải viết đủ số 0.</>,
  },
];

export const Turn: React.FC<{ f: number; t: TurnProps }> = ({ f, t }) => {
  const a = m(`${t.p}.turnIn`);
  const out = m(`${t.p}.turnOut`);
  if (f < a || f > out + 14) return null;
  const count = m(`${t.p}.count`);
  const flip = m(`${t.p}.flip`);
  const ans = m(`${t.p}.ans`);
  const noteAt = t.note ? m(`${t.p}.note`) : 0;
  const secLeft = Math.max(0, 5 - Math.floor(Math.max(0, f - count) / 30));
  const C = 326.7;
  const rot = interpolate(f, [flip, flip + 22], [0, 180], { ...clamp, easing: Easing.bezier(0.45, 0.05, 0.3, 1) });
  const face: React.CSSProperties = { position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 28, background: "#fff", boxShadow: "0 30px 70px rgba(10,30,80,.4)", padding: "46px 56px", display: "flex", flexDirection: "column", gap: 22, color: "#142033", fontFamily: UI_FONT };
  const chip = (txt: string) => (
    <span style={{ alignSelf: "flex-start", background: COLORS.blue, color: "#fff", fontWeight: 800, fontSize: 26, letterSpacing: 2, textTransform: "uppercase", padding: "8px 18px", borderRadius: 10 }}>{txt}</span>
  );
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,99,214,.55)", opacity: ramp(f, a, 10) * fadeOut(f, out, 13), perspective: 1800 }}>
      <div style={{ position: "relative", width: 1040, height: 600, transformStyle: "preserve-3d", transform: `rotateY(${rot}deg)`, opacity: ramp(f, a, 15), scale: String(0.85 + 0.15 * ramp(f, a, 15)) }}>
        <div style={face}>
          {chip("Đến lượt em")}
          <div style={{ fontWeight: 800, fontSize: 84, lineHeight: 1.1, color: COLORS.blue }}>
            {t.q}
            <div style={{ fontWeight: 500, fontSize: 28, color: "#4c5d77", marginTop: 10 }}>(làm tròn đến chữ số thập phân thứ tư)</div>
          </div>
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 74, height: 74, borderRadius: "50%", background: "#e8f0fd", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 10, height: 32, background: COLORS.blue, borderRadius: 3 }} />
              <span style={{ width: 10, height: 32, background: COLORS.blue, borderRadius: 3 }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 32, color: "#23324a" }}>
              Thầy/cô dừng video, các em bấm máy
              <div style={{ fontSize: 24, color: COLORS.blue, marginTop: 6 }}>Đếm ngược…</div>
            </div>
            <div style={{ marginLeft: "auto", position: "relative", width: 120, height: 120 }}>
              <svg viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, rotate: "-90deg" }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e1e9f7" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={COLORS.blue} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={interpolate(f, [count, count + 150], [0, C], clamp)} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 48, color: COLORS.blue }}>{secLeft}</div>
            </div>
          </div>
        </div>
        <div style={{ ...face, transform: "rotateY(180deg)" }}>
          {chip("Đáp án")}
          <div style={{ alignSelf: "flex-start", fontFamily: LCD_FONT, fontSize: 72, background: COLORS.lcd, color: COLORS.lcdInk, padding: "6px 26px", borderRadius: 12, boxShadow: "inset 0 3px 8px rgba(0,0,0,.2)" }}>{t.lcd}</div>
          <div style={{ fontWeight: 800, fontSize: 80, color: "#142033", transformOrigin: "0% 50%", scale: String(f >= ans ? interpolate(f, [ans, ans + 9, ans + 15], [1, 1.06, 1], clamp) : 1) }}>{t.ans}</div>
          {t.note ? (
            <div style={{ fontWeight: 600, fontSize: 28, color: "#23324a", background: "#eef4ff", borderLeft: `6px solid ${COLORS.blue}`, padding: "12px 18px", borderRadius: 8, ...fadeUp(f, noteAt) }}>{t.note}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ---------- chú thích ô cơ số / biểu thức (cảnh 3) ---------- */
export const Callouts: React.FC<{ f: number }> = ({ f }) => {
  const a = m("s3.callIn");
  const b = m("s3.callOut");
  if (f < a || f > b + 10) return null;
  const r = slotRects(f);
  if (!r) return null;
  const op = fadeOut(f, b, 9);
  const bx = CALC.x - 150;
  const by = r.base.y + 86;
  const ax = CALC.x + CALC.w + 22;
  const ay = r.arg.y - 76;
  const tag = (bg: string): React.CSSProperties => ({ position: "absolute", fontFamily: UI_FONT, fontWeight: 700, fontSize: 26, color: "#fff", background: bg, padding: "6px 14px", borderRadius: 10, lineHeight: 1.2, boxShadow: "0 6px 14px rgba(0,0,0,.25)" });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op, zIndex: 30 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={`M${bx + 96} ${by + 22} Q ${r.base.x + r.base.w / 2} ${by + 22} ${r.base.x + r.base.w / 2} ${r.base.y + r.base.h + 4}`} stroke={COLORS.orange} strokeWidth={4} fill="none" strokeLinecap="round" opacity={ramp(f, a, 10)} />
        <path d={`M${ax} ${ay + 34} Q ${r.arg.x + r.arg.w / 2} ${ay + 34} ${r.arg.x + r.arg.w / 2} ${r.arg.y - 4}`} stroke={COLORS.blue} strokeWidth={4} fill="none" strokeLinecap="round" opacity={ramp(f, a + 8, 10)} />
      </svg>
      <div style={{ ...tag(COLORS.orange), left: bx, top: by, ...fadeUp(f, a, 10) }}>cơ số</div>
      <div style={{ ...tag(COLORS.blue), left: ax, top: ay, ...fadeUp(f, a + 8, 10) }}>
        biểu thức
        <br />
        dưới dấu log
      </div>
    </div>
  );
};

export const Subtitles: React.FC<{ f: number }> = ({ f }) => {
  let cur: string | null = null;
  for (const s of TL.subs) if (f >= s.from && f < s.to) cur = s.text;
  if (!cur) return null;
  return (
    <div style={{ position: "absolute", left: 900, top: 908, width: 980, display: "flex", justifyContent: "center" }}>
      <span style={{ background: "rgba(22,27,32,.86)", color: "#fff", fontFamily: UI_FONT, fontWeight: 500, fontSize: 32, lineHeight: 1.35, padding: "12px 22px", borderRadius: 14, textAlign: "center", maxWidth: 980 }}>{cur}</span>
    </div>
  );
};

export const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const a = m("s5.end");
  if (f < a) return null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, fontFamily: UI_FONT }}>
      <div style={{ fontWeight: 800, fontSize: 76, color: COLORS.orangeDeep, ...fadeUp(f, a, 18) }}>Tính lôgarit bằng máy tính cầm tay</div>
      <div style={{ fontWeight: 500, fontSize: 32, color: "#46525c", ...fadeUp(f, a + 8, 18) }}>Nhớ: nhập cơ số trước · làm tròn đúng yêu cầu</div>
      <div style={{ ...pop(f, a + 18, 16), width: 120, height: 8, borderRadius: 4, background: COLORS.orange }} />
    </div>
  );
};
