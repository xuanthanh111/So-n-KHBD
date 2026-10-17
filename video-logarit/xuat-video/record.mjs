// Ghi video từ index.html: chạy trang ở chế độ #record trong Chromium headless,
// chụp khung hình bằng CDP screencast, lưu kèm mốc thời gian và nhật ký hiệu ứng âm thanh.
// Dùng: node record.mjs <thư-mục-ra>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || 'out');
fs.mkdirSync(path.join(out, 'frames'), { recursive: true });

// index.html được viết dạng "thân trang"; bọc lại thành tài liệu đầy đủ để chạy cục bộ.
const body = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const page_html = path.join(out, 'page.html');
fs.writeFileSync(page_html, '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('pageerror', e));
await page.goto('file://' + page_html + '#record');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const cdp = await page.context().newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  const name = `f${String(frames.length).padStart(5, '0')}.jpg`;
  fs.writeFileSync(path.join(out, 'frames', name), Buffer.from(f.data, 'base64'));
  frames.push({ name, t: f.metadata.timestamp * 1000 });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {}
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await page.waitForTimeout(500);

const start = await page.evaluate(() => { const t = performance.timeOrigin + performance.now(); window.__startRec(); return t; });
await page.waitForFunction(() => window.__done, null, { timeout: 600000, polling: 500 });
await page.waitForTimeout(1500);
await cdp.send('Page.stopScreencast');
const sfx = await page.evaluate(() => window.__sfx.map(([t, k]) => [performance.timeOrigin + t, k]));
await browser.close();

fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify({ start, frames, sfx }, null, 1));
console.log(`frames: ${frames.length}, length: ${((frames.at(-1).t - start) / 1000).toFixed(1)} s, sfx: ${sfx.length}`);
