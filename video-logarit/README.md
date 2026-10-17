# Video: Tính lôgarit bằng máy tính cầm tay

Video minh hoạ (~2 phút 20 giây) cách bấm máy Casio fx‑580VN X để tính
log 6,52, ln 6,52, log₁₄17, kiểm chứng kết quả tính tay (ln 2, log₄8) và hai
lỗi hay gặp, dựng theo kịch bản 6 cảnh (cảnh 0 – cảnh 5).

| Tệp | Dùng để |
| --- | --- |
| `index.html` | Bản chiếu trên lớp: mở bằng trình duyệt, có nút phát/dừng, chuyển cảnh, tự dừng ở “Đến lượt em”, phụ đề, âm hiệu ứng, đọc lời thoại (nếu máy có giọng tiếng Việt). |
| `tinh-logarit.mp4` | Bản video 1920×1080 xuất sẵn: có phụ đề và âm hiệu ứng (tách, ting, bíp), **chưa lồng tiếng** — thầy/cô có thể thu giọng đè lên theo phụ đề. Phần “Đến lượt em” chỉ đếm ngược 5 giây, thầy/cô bấm dừng video khi cần. |
| `xuat-video/` | Script xuất lại MP4 sau khi sửa `index.html`. |

## Chiếu trên lớp

Mở `index.html` (cần Internet để tải phông Be Vietnam Pro / VT323; không có
mạng thì trình duyệt dùng phông thay thế). Phím tắt: `Space` phát/dừng,
`←` `→` chuyển cảnh, `F` toàn màn hình.

## Xuất lại MP4

Cần Node.js + Playwright (Chromium), Python 3 + numpy, ffmpeg.

```bash
cd video-logarit/xuat-video
npm i playwright            # nếu chưa có
node record.mjs out         # ghi khung hình + mốc âm thanh vào out/
python3 build.py out ../tinh-logarit.mp4
```

## Số liệu đã kiểm tra

| Phép tính | Máy hiện | Làm tròn 4 chữ số |
| --- | --- | --- |
| log 6,52 | 0.8142475957 | 0,8142 |
| log 3,7 | 0.5682017241 | 0,5682 |
| ln 6,52 | 1.874874376 | 1,8749 (chữ số thứ năm là **7**) |
| ln 0,45 | −0.7985076962 | −0,7985 |
| log₁₄17 | 1.073570215 | 1,0736 |
| log₅12 | 1.543959311 | 1,5440 |
| log₁₇14 (nhập ngược) | 0.9314714457 | — |
| ln 2 | 0.6931471806 | — |
| log₄8 | 3/2 → S⇔D → 1.5 | — |
