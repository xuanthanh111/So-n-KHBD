// Mô hình máy tính: bố cục phím (toạ độ cố định, theo máy Casio fx-580VN X thật)
// và trạng thái màn hình tại một khung hình bất kỳ.
import { CalcOp, KeyId, PRESS_HIT, TL } from "./timeline";

/** Vị trí thân máy trên khung hình 1920×1080. */
export const CALC = { x: 214, y: 88, w: 452, h: 972 };

export type KeyKind = "pill" | "fn" | "num" | "blue" | "pad";
export type KeyDef = {
  id?: KeyId;
  label: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  kind: KeyKind;
  shift?: string;
  alpha?: string;
  pillColor?: string;
};

const FN_X = (i: number) => 60 + i * 66.4;
const FN_Y = [470, 532, 594];
const NUM_X = (i: number) => 66 + i * 80;
const NUM_Y = [682, 758, 834, 910];

const fnRows: [string, string, string, KeyId | undefined][][] = [
  [
    ["▫/▫", "▫▫/▫", "", undefined],
    ["√▫", "∛▫", "", undefined],
    ["x²", "x³", "", undefined],
    ["x▫", "▫√▫", "", undefined],
    ["log▫▫", "10▫", "", "log"],
    ["ln", "e▫", "", "ln"],
  ],
  [
    ["(−)", "∠", "A", undefined],
    ["°′″", "FACT", "B", undefined],
    ["x⁻¹", "x!", "C", undefined],
    ["sin", "sin⁻¹", "D", undefined],
    ["cos", "cos⁻¹", "E", undefined],
    ["tan", "tan⁻¹", "F", undefined],
  ],
  [
    ["STO", "RECALL", "", undefined],
    ["ENG", "←", "", undefined],
    ["(", "%", "", undefined],
    [")", ",", "X", undefined],
    ["S⇔D", "a b/c⇔d/c", "Y", "sd"],
    ["M+", "M−", "M", undefined],
  ],
];

const numRows: [string, string, KeyKind, KeyId | undefined][][] = [
  [["7", "CONST", "num", "7"], ["8", "CONV", "num", "8"], ["9", "RESET", "num", "9"], ["DEL", "INS", "blue", undefined], ["AC", "OFF", "blue", "ac"]],
  [["4", "MATRIX", "num", "4"], ["5", "VECTOR", "num", "5"], ["6", "", "num", "6"], ["×", "nPr", "num", undefined], ["÷", "nCr", "num", undefined]],
  [["1", "", "num", "1"], ["2", "", "num", "2"], ["3", "", "num", "3"], ["+", "Pol", "num", undefined], ["−", "Rec", "num", undefined]],
  [["0", "Rnd", "num", "0"], [".", "Ran#", "num", "dot"], ["×10ˣ", "π", "num", undefined], ["Ans", "DRG▸", "num", undefined], ["=", "≈", "num", "eq"]],
];

export const KEYS: KeyDef[] = [
  { label: "SHIFT", cx: 66, cy: 326, w: 64, h: 30, kind: "pill", pillColor: "#e9c94b" },
  { label: "ALPHA", cx: 140, cy: 326, w: 64, h: 30, kind: "pill", pillColor: "#e86a5f" },
  { label: "MENU", cx: 312, cy: 326, w: 64, h: 30, kind: "pill", shift: "SETUP" },
  { label: "ON", cx: 386, cy: 326, w: 64, h: 30, kind: "pill" },
  { label: "OPTN", cx: 66, cy: 392, w: 64, h: 30, kind: "pill" },
  { label: "CALC", cx: 140, cy: 392, w: 64, h: 30, kind: "pill", shift: "SOLVE" },
  { label: "∫▫", cx: 312, cy: 392, w: 64, h: 30, kind: "pill", shift: "d/dx" },
  { label: "x", cx: 386, cy: 392, w: 64, h: 30, kind: "pill" },
  { id: "right", label: "▶", cx: 272, cy: 359, w: 34, h: 52, kind: "pad" },
  ...fnRows.flatMap((row, r) =>
    row.map(([label, shift, alpha, id], i): KeyDef => ({ id, label, shift, alpha, cx: FN_X(i), cy: FN_Y[r], w: 52, h: 34, kind: "fn" })),
  ),
  ...numRows.flatMap((row, r) =>
    row.map(([label, shift, kind, id], i): KeyDef => ({ id, label, shift, cx: NUM_X(i), cy: NUM_Y[r], w: 64, h: 48, kind })),
  ),
];

export const keyDef = (id: KeyId) => {
  const k = KEYS.find((d) => d.id === id);
  if (!k) throw new Error(`no key ${id}`);
  return k;
};
/** Tâm phím trên khung hình. */
export const keyCenter = (id: KeyId) => {
  const k = keyDef(id);
  return { x: CALC.x + k.cx, y: CALC.y + k.cy };
};

/* ---------- trạng thái màn hình ---------- */
export type CalcState = {
  kind: null | "log" | "ln";
  base: string;
  arg: string;
  slot: null | "idle" | "base" | "arg";
  result: number | null;
  frac: [number, number] | null;
  dec: boolean;
};
const blank = (): CalcState => ({ kind: null, base: "", arg: "", slot: "idle", result: null, frac: null, dec: false });

function compute(s: CalcState) {
  const v = s.kind === "log" ? Math.log(+s.arg) / Math.log(+s.base) : Math.log(+s.arg);
  s.result = v;
  s.slot = null;
  s.frac = null;
  s.dec = false;
  if (Math.abs(v - Math.round(v)) > 1e-9) {
    for (let d = 2; d <= 9; d++) {
      const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        s.frac = [Math.round(n), d];
        break;
      }
    }
  }
}

function apply(s: CalcState, k: CalcOp): CalcState {
  if (k === "ac") return blank();
  if (k === "log") return { ...blank(), kind: "log", slot: "base" };
  if (k === "ln") return { ...blank(), kind: "ln", slot: "arg" };
  const n = { ...s };
  if (k === "right") {
    if (n.kind === "log" && n.slot === "base") n.slot = "arg";
  } else if (k === "sd") n.dec = !n.dec;
  else if (k === "eq" || k === "recalc") compute(n);
  else if (k === "swap") {
    n.base = s.arg;
    n.arg = s.base;
  } else {
    const ch = k === "dot" ? "." : k;
    if (n.slot === "base") n.base += ch;
    else if (n.slot) n.arg += ch;
  }
  return n;
}

/** Trạng thái màn hình tại khung hình `frame` (phím có tác dụng lúc lún xuống). */
export function calcAt(frame: number): CalcState {
  let s: CalcState = { ...blank(), slot: null };
  for (const p of TL.presses) {
    if (p.frame + PRESS_HIT > frame) break;
    s = apply(s, p.key);
  }
  return s;
}

/** Số hiển thị kiểu máy: 10 chữ số có nghĩa, dấu chấm thập phân. */
export function fmt(v: number) {
  let s = v.toPrecision(10);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s.replace("-", "−");
}

/* ---------- bố cục dòng nhập (ô lưới cố định như màn hình ma trận điểm) ---------- */
export const LCD = { x: 42, y: 92, w: 368, h: 164 }; // trong thân máy
export const BIG = 21; // bề rộng một ký tự cỡ lớn
export const SMALL = 15; // bề rộng một ký tự trong ô cơ số
export type Glyph = { text: string; x: number; w: number; small?: boolean; slot?: "base" | "arg" };

export function inputLayout(s: CalcState): Glyph[] {
  const g: Glyph[] = [];
  let x = 0;
  const put = (text: string, small = false, slot?: "base" | "arg") => {
    const cw = small ? SMALL : BIG;
    const w = slot ? Math.max(1, text.length) * cw + 8 : text.length * cw;
    g.push({ text, x, w, small, slot });
    x += w + (slot ? 3 : 0);
  };
  if (s.kind === "log") {
    put("log");
    put(s.base, true, "base");
    put("(");
    put(s.arg, false, "arg");
    put(")");
  } else if (s.kind === "ln") {
    put("ln(");
    put(s.arg);
    if (!s.slot) put(")");
  }
  return g;
}
