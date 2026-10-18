// Kịch bản video dưới dạng dữ liệu: mọi lần bấm phím, phụ đề, hiệu ứng âm thanh
// và các mốc hoạt hình đều được tính ra số khung hình (frame) tại đây.
// Các component chỉ đọc dữ liệu này theo useCurrentFrame().

import VOICE_DUR from "../voice/durations.json";
import VOICE_LINES from "../voice/loi-doc.json";

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

export type KeyId =
  | "log" | "ln" | "right" | "dot" | "eq" | "ac" | "sd"
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
// "swap" là thao tác minh hoạ (đổi chỗ 2 ô trên màn hình), không phải phím thật.
export type CalcOp = KeyId | "swap" | "recalc";
export type ChipRow = "main" | "A" | "B" | "E";
export type Press = { frame: number; key: CalcOp; chip: ChipRow | null; scene: number };
export type Sub = { from: number; to: number; text: string };
export type SfxKind = "click" | "ting" | "beep" | "whoosh";
export type Sfx = { frame: number; kind: SfxKind };
export type Hold = { key: KeyId; from: number; to: number };
/** Một câu lồng tiếng: file public/voice/<id>.mp3 phát từ khung hình `frame`. */
export type Voice = { frame: number; to: number; id: string };

const voiceDur: Record<string, number> = VOICE_DUR;

/** Mỗi lần bấm phím kéo dài 0,6 s: 0,2 s phóng to + 0,4 s lún/nhả. */
export const PRESS = sec(0.6);
/** Khung hình (tính từ lúc bắt đầu bấm) mà phím lún xuống và màn hình đổi. */
export const PRESS_HIT = sec(0.2);

// Thời lượng các bước làm tròn (component RoundingViz dùng cùng số này).
export const RV = { show: sec(0.5), cut: sec(0.4), mark: sec(0.5), tail: sec(0.7), roll: sec(0.75), morph: sec(0.6), final: sec(0.6) };
export const rvFinishLen = (up: boolean) => RV.tail + (up ? RV.roll : 0) + RV.morph + RV.final;

class Builder {
  t = 0;
  scene = -1;
  presses: Press[] = [];
  subs: Sub[] = [];
  sfx: Sfx[] = [];
  holds: Hold[] = [];
  voice: Voice[] = [];
  marks: Record<string, number> = {};
  scenes: { start: number; end: number }[] = [];

  begin() {
    this.scene++;
    this.scenes.push({ start: this.t, end: this.t });
  }
  end() {
    this.scenes[this.scene].end = this.t;
  }
  mark(name: string) {
    this.marks[name] = this.t;
    return this.t;
  }
  wait(s: number) {
    this.t += sec(s);
  }
  until(frame: number) {
    this.t = Math.max(this.t, frame);
  }
  /**
   * Phụ đề + lời thoại. Trả về khung hình mà câu nói kết thúc.
   * Câu thứ n khớp với mục thứ n trong voice/loi-doc.json; khi đã có file giọng đọc
   * (voice/durations.json) thì dùng đúng thời lượng file, không thì ước ≈ 17 ký tự/giây.
   */
  say(text: string) {
    const line = VOICE_LINES[this.subs.length];
    if (!line || line.subtitle !== text) throw new Error(`Câu ${this.subs.length + 1} không khớp voice/loi-doc.json: ${text}`);
    const real = voiceDur[line.id];
    const dur = real ? sec(real + 0.15) : sec(Math.max(1.2, text.length * 0.058));
    if (real) this.voice.push({ frame: this.t, to: this.t + dur, id: line.id });
    this.subs.push({ from: this.t, to: this.t + dur + sec(0.6), text });
    return this.t + dur;
  }
  fx(kind: SfxKind, at = this.t) {
    this.sfx.push({ frame: at, kind });
  }
  press(key: CalcOp, chip: ChipRow | null = "main") {
    this.presses.push({ frame: this.t, key, chip, scene: this.scene });
    if (key !== "swap" && key !== "recalc") this.fx("click", this.t + PRESS_HIT);
    this.t += PRESS;
  }
  keys(list: KeyId[], chip: ChipRow | null = "main") {
    list.forEach((k) => this.press(k, chip));
  }
  hold(key: KeyId, from: number, to: number) {
    this.holds.push({ key, from, to });
  }
  /** Các bước làm tròn trong vùng "Kết quả và làm tròn". */
  rounding(p: string, raw: string, digitSay: string, up: boolean, finalSay: string) {
    let v = this.say(`Máy hiện ${raw.replace(".", ",")}.`);
    this.mark(`${p}.rvShow`);
    this.wait(0.5);
    this.until(v);
    v = this.say(digitSay);
    this.wait(1.2);
    this.mark(`${p}.rvCut`);
    this.t += RV.cut;
    this.mark(`${p}.rvMark`);
    this.t += RV.mark;
    this.until(v);
    v = this.say(finalSay);
    this.mark(`${p}.rvFinish`);
    if (up) this.fx("click", this.t + RV.tail + sec(0.1));
    this.fx("ting", this.t + rvFinishLen(up) - RV.final);
    this.t += rvFinishLen(up);
    this.until(v);
  }
  /** Thẻ "Đến lượt em": đếm ngược 5 s rồi lật đáp án. */
  turn(p: string, q: string, a: string, hasNote: boolean) {
    this.mark(`${p}.turnIn`);
    this.fx("whoosh");
    const v = this.say(q);
    this.wait(0.7);
    this.mark(`${p}.count`);
    this.wait(5);
    this.until(v);
    this.mark(`${p}.flip`);
    this.fx("whoosh");
    this.wait(0.8);
    this.mark(`${p}.ans`);
    this.fx("ting");
    const va = this.say(a);
    if (hasNote) {
      this.wait(0.9);
      this.mark(`${p}.note`);
    }
    this.until(va);
    this.wait(1.4);
    this.mark(`${p}.turnOut`);
    this.wait(0.45);
  }
}

const b = new Builder();

/* ---------- Cảnh 0: Mở đầu ---------- */
b.begin();
{
  let v = b.say("Các em đã tính được log 100, log 0,001 vì đưa được về lũy thừa của 10.");
  b.wait(0.3);
  b.mark("s0.ex1");
  b.wait(1.3);
  b.mark("s0.ex2");
  b.until(v);
  b.mark("s0.shrink");
  v = b.say("Nhưng còn log 6,52 thì sao? Không đưa được về lũy thừa của 10 nữa.");
  b.wait(0.3);
  b.mark("s0.q");
  b.wait(1.7);
  b.mark("s0.shake1");
  b.fx("beep");
  b.wait(0.6);
  b.mark("s0.shake2");
  b.wait(0.5);
  b.mark("s0.nope");
  b.until(v);
  v = b.say("Lúc này, ta nhờ đến máy tính cầm tay.");
  b.mark("s0.out");
  b.wait(0.3);
  b.mark("s0.calcIn");
  b.fx("whoosh");
  b.until(v);
  b.wait(0.4);
}
b.end();

/* ---------- Cảnh 1: log 6,52 ---------- */
b.begin();
{
  b.mark("s1.task");
  b.wait(0.9);
  let v = b.say("Bấm phím log. Trên màn hình hiện khuôn có hai ô: ô nhỏ bên dưới là cơ số.");
  b.wait(0.3);
  b.press("log");
  b.until(v);
  v = b.say("Với log thập phân, cơ số là 10, nên ta bấm 1, 0.");
  b.wait(1.6);
  b.keys(["1", "0"]);
  b.until(v);
  v = b.say("Bấm mũi tên sang phải để chuyển sang ô thứ hai, nhập 6 chấm 5 2.");
  b.wait(0.5);
  b.press("right");
  b.wait(0.7);
  b.keys(["6", "dot", "5", "2"]);
  b.until(v);
  v = b.say("Bấm bằng.");
  b.press("eq");
  b.until(v);
  b.rounding("s1", "0.8142475957", "Chữ số thập phân thứ năm là 4, nhỏ hơn 5, nên ta giữ nguyên.", false, "Vậy log 6,52 xấp xỉ 0,8142.");
  b.wait(1.2);
  b.turn("s1", "Đến lượt các em: tính log 3,7.", "Đáp án: xấp xỉ 0,5682.", false);
}
b.end();

/* ---------- Cảnh 2: ln 6,52 ---------- */
b.begin();
{
  b.mark("s2.task");
  b.wait(0.5);
  b.press("ac");
  b.wait(0.3);
  b.mark("s2.tag");
  let v = b.say("Với lôgarit tự nhiên, cơ số e, ta có phím riêng là ln.");
  b.wait(0.5);
  b.mark("s2.litLog");
  b.wait(1.1);
  b.mark("s2.litLn");
  const h = b.t;
  b.until(v);
  b.hold("ln", h, b.t);
  v = b.say("Bấm ln, nhập 6 chấm 5 2, bấm bằng.");
  b.keys(["ln", "6", "dot", "5", "2", "eq"]);
  b.mark("s2.litOff");
  b.until(v);
  b.rounding("s2", "1.874874376", "Chữ số thập phân thứ năm là 7, lớn hơn 5, nên làm tròn lên.", true, "Vậy ln 6,52 xấp xỉ 1,8749.");
  b.wait(1);
  b.turn("s2", "Đến lượt các em: tính ln 0,45.", "Đáp án: xấp xỉ −0,7985. Số dưới dấu ln nhỏ hơn 1 nên kết quả âm.", true);
}
b.end();

/* ---------- Cảnh 3: log₁₄17 ---------- */
b.begin();
{
  b.mark("s3.task");
  b.wait(0.5);
  b.press("ac");
  b.wait(0.3);
  let v = b.say("Với cơ số bất kỳ, ta dùng lại phím log có hai ô.");
  b.wait(0.6);
  b.press("log");
  b.mark("s3.callIn");
  b.until(v);
  v = b.say("Ô thứ nhất, cơ số: 1, 4.");
  b.wait(0.9);
  b.keys(["1", "4"]);
  b.until(v);
  v = b.say("Bấm mũi tên sang phải. Ô thứ hai, số cần lấy lôgarit: 1, 7.");
  b.press("right");
  b.wait(1.7);
  b.keys(["1", "7"]);
  b.until(v);
  v = b.say("Bấm bằng.");
  b.wait(0.3);
  b.mark("s3.callOut");
  b.press("eq");
  b.until(v);
  b.rounding("s3", "1.073570215", "Chữ số thứ năm là 7, ta làm tròn lên.", true, "Log cơ số 14 của 17 xấp xỉ 1,0736.");
  b.wait(1);
  b.turn("s3", "Đến lượt các em: tính log₅12.", "Đáp án: xấp xỉ 1,5440. Chú ý vẫn phải viết đủ chữ số 0 ở cuối.", true);
}
b.end();

/* ---------- Cảnh 4: Kiểm chứng ---------- */
b.begin();
{
  b.mark("s4.in");
  let v = b.say("Hãy dùng máy kiểm tra lại các kết quả đã tính tay.");
  b.wait(0.7);
  b.press("ac", null);
  b.until(v);
  v = b.say("ln 2 xấp xỉ 0,693, đúng như Ví dụ 7.");
  b.keys(["ln", "2", "eq"], "A");
  b.mark("s4.outA");
  b.wait(0.5);
  b.mark("s4.matchA");
  b.fx("ting", b.t + sec(0.25));
  b.wait(0.75);
  b.until(v);
  v = b.say("Còn log cơ số 4 của 8: máy hiện dạng phân số 3 phần 2.");
  b.press("ac", null);
  b.keys(["log", "4", "right", "8", "eq"], "B");
  b.mark("s4.outB");
  b.until(v);
  v = b.say("Bấm S đổi D để chuyển sang số thập phân, được 1,5.");
  b.mark("s4.tip");
  b.hold("sd", b.t, b.t + sec(1.8));
  b.wait(1.8);
  b.press("sd", "B");
  b.mark("s4.dec");
  b.wait(0.4);
  b.mark("s4.matchB");
  b.fx("ting", b.t + sec(0.25));
  b.wait(0.75);
  b.until(v);
  b.mark("s4.tipOut");
  v = b.say("Khớp với kết quả ta đã tính bằng công thức đổi cơ số.");
  b.until(v);
  b.wait(0.8);
}
b.end();

/* ---------- Cảnh 5: Hai lỗi hay gặp + tổng kết ---------- */
b.begin();
{
  b.mark("s5.in");
  let v = b.say("Hai lỗi các em hay gặp.");
  b.press("ac", null);
  b.until(v);
  v = b.say("Một: nhập ngược thứ tự.");
  b.keys(["log", "1", "7", "right", "1", "4", "eq"], "E");
  b.until(v);
  b.mark("s5.wrong");
  b.wait(0.5);
  b.mark("s5.strike");
  b.fx("beep");
  v = b.say("Phải nhập cơ số trước, rồi mới nhập số dưới dấu log.");
  b.wait(0.7);
  b.mark("s5.swap");
  b.fx("whoosh");
  b.press("swap", null);
  b.wait(0.75);
  b.press("recalc", null);
  b.mark("s5.right");
  b.fx("ting");
  b.until(v);
  v = b.say("Hai: làm tròn sai, như lấy thiếu chữ số hoặc chỉ cắt bỏ mà không làm tròn.");
  b.mark("s5.e2");
  for (let i = 0; i < 3; i++) {
    b.mark(`s5.opt${i}`);
    b.wait(0.45);
    b.fx(i === 2 ? "ting" : "beep");
    b.wait(0.8);
  }
  b.until(v);
  v = b.say("Đọc kỹ đề yêu cầu làm tròn đến chữ số nào nhé!");
  b.wait(0.4);
  b.mark("s5.panelOut");
  b.wait(0.5);
  b.mark("s5.sum");
  b.wait(1.4);
  b.until(v);
  b.wait(3.6);
  b.mark("s5.fade");
  b.wait(1);
  b.mark("s5.end");
  b.wait(3);
}
b.end();

export const TL = {
  presses: b.presses,
  subs: b.subs,
  sfx: b.sfx,
  holds: b.holds,
  voice: b.voice,
  marks: b.marks,
  scenes: b.scenes,
  duration: b.t,
};

export const m = (name: string) => {
  const v = TL.marks[name];
  if (v === undefined) throw new Error(`Unknown mark ${name}`);
  return v;
};
