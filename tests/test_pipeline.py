import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from docx2latex_exam.pipeline import convert
from tests.make_sample_docx import build


class TestPipelineEndToEnd(unittest.TestCase):
    def test_sample_exam_converts_cleanly(self):
        with tempfile.TemporaryDirectory() as tmp:
            docx_path = Path(tmp) / "sample.docx"
            out_dir = Path(tmp) / "out"
            build(str(docx_path))
            warnings = convert(str(docx_path), str(out_dir))

            self.assertEqual(warnings, [])

            tex = (out_dir / "de_thi.tex").read_text(encoding="utf-8")
            self.assertIn(r"\documentclass", tex)
            self.assertIn(r"\frac{x}{2}", tex)
            self.assertIn(r"\includegraphics", tex)
            self.assertIn(r"PHẦN I.", tex)
            self.assertIn(r"PHẦN II.", tex)
            self.assertIn(r"PHẦN III.", tex)
            self.assertIn(r"\textbf{2}", tex)  # dap an B cau 1 duoc in dam
            self.assertIn("BẢNG ĐÁP ÁN", tex)
            self.assertIn("1.B", tex)

            self.assertTrue((out_dir / "images").is_dir())
            self.assertTrue(any((out_dir / "images").iterdir()))


if __name__ == "__main__":
    unittest.main()
