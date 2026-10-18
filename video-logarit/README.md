# Video: Tính lôgarit bằng máy tính cầm tay

Video minh hoạ (2 phút 50 giây) cách bấm máy Casio fx‑580VN X để tính
log 6,52, ln 6,52, log₁₄17 và hai lỗi hay gặp, dựng theo kịch bản 6 cảnh
(cảnh 0 – cảnh 5). Cảnh 4 (kiểm chứng kết quả tính tay: ln 2, log₄8) đã được bỏ
khỏi video; `timeline.ts` giữ nó là cảnh rỗng nên số thứ tự các cảnh không đổi.

| Tệp | Dùng để |
| --- | --- |
| `remotion/` | Mã nguồn video (Remotion + React). Máy tính vẽ theo máy Casio fx‑580VN X thật: thân đen viền bạc, màn hình ma trận điểm, cụm phím điều hướng tròn, phím số trắng, DEL/AC xanh, nhãn SHIFT vàng / ALPHA đỏ phía trên phím. |
| `tinh-logarit.mp4` | Video 1920×1080, 30 fps, 2 phút 50 giây, render từ `remotion/`: có phụ đề, âm hiệu ứng (tách, ting, bíp, vút) và **lồng tiếng giọng nữ miền Nam**. Phần “Đến lượt em” đếm ngược 5 giây; thầy/cô bấm dừng video khi cần thêm thời gian. |
| `index.html` | Bản chiếu tương tác trên trình duyệt (tự dừng ở “Đến lượt em”, có thể đọc lời thoại). |

## Sửa và render lại video

Cần Node.js ≥ 20.

```bash
cd video-logarit/remotion
npm i
npm run dev        # mở Remotion Studio để xem/chỉnh
npm run render     # xuất ra out/tinh-logarit.mp4
```

Máy không tải được Chrome Headless Shell của Remotion thì chỉ định trình duyệt có sẵn:
`npx remotion render TinhLogarit out/tinh-logarit.mp4 --browser-executable=/đường/dẫn/chrome`.

Lồng tiếng: đặt file giọng đọc từng câu vào `remotion/public/voice/<id>.mp3`
(`<id>` theo `remotion/voice/loi-doc.json`: 01 … 28 và 34 … 38), chạy `node voice/durations.mjs` trong
`remotion/` rồi render lại. Mỗi câu tự kéo dài theo thời lượng file, hiệu ứng âm
thanh nhỏ lại khi đang đọc. Câu nào chưa có file thì vẫn dùng thời lượng ước tính.

Giọng đọc hiện tại: giọng nữ Sài Gòn thiết kế bằng Creative Claw (ElevenLabs Voice Design,
lưu thành Character “Cô giáo Sài Gòn”), đọc toàn bộ cột `spoken` trong một lần bằng
ElevenLabs v4 cho giọng đồng nhất, rồi cắt thành từng file theo khoảng lặng giữa các câu.

Cấu trúc mã:

- `src/timeline.ts`: toàn bộ kịch bản (phụ đề, từng lần bấm phím, âm hiệu ứng, các mốc hoạt hình) quy ra số khung hình. Sửa lời thoại hoặc thứ tự phím ở đây, thời lượng các cảnh tự tính lại.
- `src/calc.ts`: bố cục phím và trạng thái màn hình tại mỗi khung hình (tính log/ln thật, hiện 3/2 ở chế độ MathI/O).
- `src/Calculator.tsx`: hình vẽ máy tính và màn hình.
- `src/Board.tsx`, `src/Chips.tsx`, `src/Overlays.tsx`: bảng ghi chú, chip phím bay sang, thẻ “Đến lượt em”, phụ đề, mở đầu/kết thúc.
- `public/fonts`, `public/sfx`: phông Be Vietnam Pro, VT323 và âm hiệu ứng, để render không cần mạng.

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
