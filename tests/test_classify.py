import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from docx2latex_exam.classify import classify
from docx2latex_exam.model import Paragraph, TextRun


def P(text, bold=False):
    return Paragraph(nodes=[TextRun(text, bold=bold)])


class TestClassify(unittest.TestCase):
    def test_mc4_bold_answer(self):
        paras = [
            P("Câu 1: 1 + 1 bằng mấy?"),
            P("A. 1"),
            P("B. 2", bold=True),
            P("C. 3"),
            P("D. 4"),
        ]
        exam = classify(paras)
        self.assertEqual(len(exam.mc4), 1)
        q = exam.mc4[0]
        self.assertEqual([c.label for c in q.choices], ["A", "B", "C", "D"])
        correct = [c.label for c in q.choices if c.correct]
        self.assertEqual(correct, ["B"])

    def test_mc4_answer_key_line(self):
        paras = [
            P("Câu 1: Hỏi gì đó?"),
            P("A. 1"), P("B. 2"), P("C. 3"), P("D. 4"),
            P("Đáp án: C"),
        ]
        exam = classify(paras)
        q = exam.mc4[0]
        correct = [c.label for c in q.choices if c.correct]
        self.assertEqual(correct, ["C"])

    def test_truefalse_inline_markers(self):
        paras = [
            P("Câu 1: Xét các mệnh đề sau"),
            P("a) Mệnh đề 1 (Đúng)"),
            P("b) Mệnh đề 2 (Sai)"),
            P("c) Mệnh đề 3 (Đúng)"),
            P("d) Mệnh đề 4 (Sai)"),
        ]
        exam = classify(paras)
        self.assertEqual(len(exam.truefalse), 1)
        q = exam.truefalse[0]
        self.assertEqual([c.correct for c in q.choices], [True, False, True, False])
        # dam bao marker (Dung)/(Sai) da duoc tach khoi noi dung hien thi
        self.assertNotIn("Đúng", q.choices[0].nodes[0].text)

    def test_short_answer(self):
        paras = [
            P("Câu 1: Tính 2 + 2."),
            P("Đáp án: 4"),
        ]
        exam = classify(paras)
        self.assertEqual(len(exam.short), 1)
        self.assertEqual(exam.short[0].short_answer, "4")

    def test_intro_before_first_question(self):
        paras = [
            P("ĐỀ THI THỬ"),
            P("Câu 1: A hay B?"),
            P("A. A"), P("B. B"), P("C. C"), P("D. D"),
        ]
        exam = classify(paras)
        self.assertEqual(len(exam.intro), 1)
        self.assertEqual(exam.intro[0].plain_text(), "ĐỀ THI THỬ")

    def test_missing_answer_generates_warning(self):
        paras = [P("Câu 1: Không có đáp án?"), P("A. 1"), P("B. 2"), P("C. 3"), P("D. 4")]
        exam = classify(paras)
        self.assertTrue(any("chua xac dinh" in w for w in exam.warnings))


if __name__ == "__main__":
    unittest.main()
