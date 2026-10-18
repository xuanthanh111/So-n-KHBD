// Đo thời lượng các file public/voice/<id>.mp3 và ghi ra voice/durations.json
// để timeline.ts kéo dài mỗi câu đúng bằng lời đọc. Cần ffprobe.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const lines = JSON.parse(readFileSync(new URL("./loi-doc.json", import.meta.url)));
const out = {};
for (const { id } of lines) {
  const file = new URL(`../public/voice/${id}.mp3`, import.meta.url).pathname;
  if (!existsSync(file)) continue;
  const s = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  out[id] = Math.round(parseFloat(s) * 1000) / 1000;
}
writeFileSync(new URL("./durations.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out).length}/${lines.length} câu có giọng đọc`);
