# docx2latex-exam

Công cụ chuyển đề thi Word (`.docx`) sang LaTeX, dành riêng cho đề thi
dạng **TN THPT** (3 phần: trắc nghiệm 4 phương án, đúng/sai, trả lời ngắn),
có công thức toán (MathType / công thức Word) và hình vẽ/đồ thị.

## Tính năng

- **Công thức toán**: công thức gõ bằng trình soạn công thức của Word
  (Insert → Equation, kể cả khi bật MathType ở chế độ tương thích Office)
  được đọc từ OMML và chuyển **chính xác** sang LaTeX (`\frac`, `\sqrt`,
  chỉ số trên/dưới, `\int`, `\sum`, ma trận, hệ phương trình, ký hiệu Hy Lạp...).
  Công thức MathType kiểu OLE cổ điển (chèn qua Equation Editor 3.0 /
  MathType classic) được cố gắng đọc trực tiếp phần dữ liệu nhị phân
  (MTEF); trường hợp đơn giản (biểu thức chỉ gồm chữ/số ASCII) ra LaTeX
  thật, còn công thức phức tạp (phân số, căn, mũ, ký hiệu Hy Lạp...) sẽ
  **tự động chèn lại đúng ảnh xem trước mà MathType đã lưu sẵn trong file
  Word** — không vẽ lại, không suy đoán sai công thức.
- **Hình vẽ / đồ thị**: mọi ảnh chèn trong Word (kể cả WMF/EMF - vốn
  pdflatex/xelatex không đọc được) đều được trích xuất, chuyển sang PNG
  nếu cần (qua LibreOffice), và chèn lại **đúng vị trí** bằng
  `\includegraphics` — giữ nguyên hình gốc, không vẽ lại.
- **Nhận diện 3 dạng câu hỏi**:
  - Trắc nghiệm 4 đáp án: các dòng/đoạn bắt đầu `A.`/`B.`/`C.`/`D.` (hoặc
    `A)`...) — kể cả khi 2-4 phương án nằm chung 1 dòng, cách nhau bởi Tab
    (`A. ...\tB. ...\tC. ...\tD. ...`), rất hay gặp trong đề thi thực tế.
  - Đúng/Sai (4 ý): các dòng/đoạn bắt đầu `a)`/`b)`/`c)`/`d)` (chữ thường),
    cũng hỗ trợ nhiều ý chung 1 dòng cách nhau bởi Tab.
  - Trả lời ngắn: câu hỏi không có các nhãn trên.
  - Số thứ tự câu hỏi được nhận diện bằng CẢ HAI cách: gõ tay `Câu 1:` lẫn
    đánh số tự động của Word (list numbering) - chỉ bật cách thứ hai sau
    khi gặp tiêu đề `PHẦN I/II/III...` để không nhầm với các danh sách số
    khác trong tài liệu (ví dụ gạch đầu dòng lý thuyết).
  - Xuất thành 3 phần đúng theo cấu trúc đề thi TN THPT hiện hành, đánh
    số lại từ 1 trong mỗi phần, kèm **bảng đáp án** ở cuối file.

## Cài đặt

```bash
pip install -r requirements.txt
```

Cần cài thêm **LibreOffice** (dùng để chuyển ảnh WMF/EMF sang PNG - rất
hay gặp vì đó là định dạng ảnh xem trước mặc định của MathType/Equation
Editor):

```bash
sudo apt-get install libreoffice-writer libreoffice-draw
```

(Chỉ cài gói `libreoffice-core` mặc định trên một số máy chủ/container là
**không đủ** — nó thiếu bộ lọc đọc/ghi định dạng file, khiến việc chuyển
đổi ảnh báo lỗi "source file could not be loaded".)

## Cách dùng

```bash
python -m docx2latex_exam.cli de_thi.docx -o out
# hoặc, sau khi `pip install -e .`:
docx2latex-exam de_thi.docx -o out
```

Kết quả:
- `out/de_thi.tex` — file LaTeX hoàn chỉnh, biên dịch bằng **XeLaTeX**
  (để hỗ trợ tiếng Việt + font Times New Roman):
  ```bash
  cd out && xelatex de_thi.tex
  ```
  Cần bộ gói: `fontspec`, `polyglossia`, `amsmath`, `graphicx`, `ulem`,
  `xcolor`, `geometry`, `enumitem` (có sẵn trong TeX Live / MiKTeX bản đầy đủ).
- `out/images/` — toàn bộ hình vẽ/đồ thị/ảnh xem trước công thức đã trích xuất.
- Cảnh báo (nếu có) được in ra màn hình — ví dụ câu chưa xác định được đáp
  án đúng, hoặc công thức MathType quá phức tạp phải chèn ảnh thay vì LaTeX.

## Quy ước khi soạn đề trong Word (để công cụ nhận đáp án đúng)

- Mỗi câu hỏi bắt đầu bằng `Câu <số>:` (hoặc `Câu <số>.`).
- **Trắc nghiệm 4 đáp án**: đáp án đúng được **in đậm** hoặc **tô màu
  (highlight)**, hoặc thêm dòng riêng `Đáp án: B` ngay sau 4 phương án.
- **Đúng/Sai**: ghi `(Đúng)` hoặc `(Sai)` ở cuối mỗi ý a)/b)/c)/d), hoặc
  thêm dòng `Đáp án: aĐ bS cĐ dS` sau các ý.
- **Trả lời ngắn**: thêm dòng `Đáp án: <giá trị>` ngay sau câu hỏi.
- Những phần đánh dấu đáp án (`(Đúng)`, `Đáp án: ...`) sẽ **không** xuất
  hiện trong đề in ra — chỉ xuất hiện ở bảng đáp án cuối file.

## Giới hạn hiện tại

- Công thức MathType OLE cổ điển: chỉ giải mã trực tiếp được biểu thức
  đơn giản gồm ký tự ASCII liên tiếp; công thức có phân số/căn/mũ/ký hiệu
  đặc biệt sẽ dùng ảnh xem trước (không sai, nhưng không phải LaTeX gõ
  được), chèn **ngay trong dòng** để giữ mạch văn. Vì kích thước hiển thị
  dựa trên khung ảnh đã cắt gọn (không có thông tin cỡ chữ gốc trong
  Word), một vài công thức có thể to/nhỏ hơn văn bản xung quanh một chút -
  không sai nội dung, chỉ lệch nhẹ về mặt trình bày. Khuyến khích dùng chế
  độ "Insert Equation" gốc của Word (hoặc để MathType chèn ở chế độ tương
  thích Office) để có LaTeX chính xác 100%.
- Bảng (table) trong Word được đọc theo từng ô nối tiếp nhau, chưa dựng
  lại thành bảng LaTeX.
- Nếu tài liệu có nhiều đề/nhiều lần lặp lại tiêu đề "PHẦN I/II/III" (ví
  dụ 1 file chứa nhiều đề luyện tập), công cụ hiện gộp tất cả câu cùng
  dạng vào chung 1 danh sách (không tách thành các đề riêng).
- Cần kiểm tra lại các câu công cụ báo "chưa xác định được đáp án" (rất
  hay gặp với các bản đề dành cho học sinh - không có sẵn đáp án).

## Cấu trúc mã nguồn

```
docx2latex_exam/
  docx_parse.py   # doc file .docx: text, dinh dang, OMML, OLE, anh
  omml2latex.py   # OMML (cong thuc Word) -> LaTeX
  mtef.py         # MTEF (MathType OLE) -> LaTeX (best-effort) hoac bao loi de fallback anh
  ole.py          # doc stream "Equation Native" tu file OLE
  media.py        # chuyen WMF/EMF -> PNG bang LibreOffice
  classify.py     # nhan dien 3 dang cau hoi + dap an dung
  render_tex.py   # sinh ma nguon LaTeX
  pipeline.py     # noi cac buoc tren lai, cli.py la dau vao dong lenh
tests/
  make_sample_docx.py  # sinh file .docx mau de kiem thu
  test_mtef.py, test_classify.py, test_pipeline.py
```

Chạy kiểm thử:

```bash
python -m unittest discover -s tests -v
```
