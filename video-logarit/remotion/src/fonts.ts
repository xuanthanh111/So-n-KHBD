// Nạp phông chữ từ public/fonts (đã tải sẵn từ Google Fonts) để render không cần mạng.
import { continueRender, delayRender, staticFile } from "remotion";
import faces from "./fontFaces.json";

let started = false;
export function loadFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Đang nạp phông chữ");
  Promise.all(
    faces.map((f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)}) format("woff2")`, {
        weight: f.weight,
        unicodeRange: f.unicodeRange,
      });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}
