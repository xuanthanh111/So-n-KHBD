import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from docx2latex_exam.classify import classify
from docx2latex_exam.model import Paragraph, TextRun


def P(text, bold=False, num_id=None):
    return Paragraph(nodes=[TextRun(text, bold=bold)], num_id=num_id)


def tabs(*parts):
    """Tao 1 paragraph co nhieu doan cach nhau boi Tab, giong dang
    'A. 1\tB. 2\tC. 3\tD. 4' hay gap trong de thi thuc te."""
    nodes = []
    for i, part in enumerate(parts):
        if i:
            nodes.append(TextRun("\t"))
        nodes.append(TextRun(part))
    return Paragraph(nodes=nodes)


class TestClassifyWordNumbering(unittest.TestCase):
    def test_word_auto_numbering_with_tab_separated_options(self):
        paras = [
            P("PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn."),
            P("Câu hỏi thứ nhất là gì?", num_id="17"),
            tabs("A. 1", "B. 2"),
            tabs("C. 3", "D. 4"),
            P("Câu hỏi thứ hai là gì?", num_id="17"),
            tabs("A. 5", "B. 6", "C. 7", "D. 8"),
        ]
        exam = classify(paras)
        self.assertEqual(len(exam.mc4), 2)
        q1 = exam.mc4[0]
        self.assertEqual([c.label for c in q1.choices], ["A", "B", "C", "D"])
        self.assertEqual(q1.stem[0].plain_text(), "Câu hỏi thứ nhất là gì?")
        q2 = exam.mc4[1]
        self.assertEqual([c.label for c in q2.choices], ["A", "B", "C", "D"])

    def test_numbering_not_used_before_part_header(self):
        # Danh sach so (numId) truoc khi gap tieu de PHAN khong duoc coi
        # la cau hoi (vi du gach dau dong trong phan ly thuyet).
        paras = [
            P("Ghi nhớ 1", num_id="5"),
            P("Ghi nhớ 2", num_id="5"),
            P("PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn."),
            P("Câu hỏi thật sự", num_id="17"),
            tabs("A. 1", "B. 2"),
            tabs("C. 3", "D. 4"),
        ]
        exam = classify(paras)
        self.assertEqual(len(exam.mc4), 1)
        self.assertEqual(len(exam.intro), 2)

    def test_end_marker_dropped(self):
        paras = [
            P("PHẦN III. Câu trắc nghiệm trả lời ngắn"),
            P("Tính giá trị của biểu thức.", num_id="19"),
            P("-----------------HẾT-----------------"),
        ]
        exam = classify(paras)
        self.assertEqual(len(exam.short), 1)
        text = exam.short[0].stem[0].plain_text()
        self.assertNotIn("HẾT", text)


if __name__ == "__main__":
    unittest.main()
