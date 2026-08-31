import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from docx2latex_exam import mtef


def encode_sint(v: int) -> bytes:
    if -128 <= v <= 126:
        return bytes([v + 128])
    raw = v + 32768
    return bytes([255, raw & 0xFF, (raw >> 8) & 0xFF])


def char_record(ch: str) -> bytes:
    code = ord(ch)
    return bytes([2, 0]) + encode_sint(1) + bytes([code & 0xFF, (code >> 8) & 0xFF])


def make_stream(char_records: bytes, leading_junk: int = 0) -> bytes:
    header = bytes([5, 1, 1, 4, 0, 0, 0])  # version,platform,product,vmaj,vmin,keylen,eqnopts
    return bytes(leading_junk) + header + char_records + bytes([0])  # END


class TestMTEF(unittest.TestCase):
    def test_simple_ascii_expression(self):
        data = make_stream(char_record("x") + char_record("+") + char_record("1"))
        self.assertEqual(mtef.mtef_to_latex(data), "x+1")

    def test_header_with_leading_ole_padding(self):
        data = make_stream(char_record("y"), leading_junk=28)
        self.assertEqual(mtef.mtef_to_latex(data), "y")

    def test_template_record_falls_back(self):
        # tag=3 (TMPL) ngay sau header -> khong ho tro, phai nem MTEFUnsupported
        data = make_stream(bytes([3, 0, 11, 1, 0]))
        with self.assertRaises(mtef.MTEFUnsupported):
            mtef.mtef_to_latex(data)

    def test_non_ascii_char_falls_back(self):
        data = make_stream(char_record("α"))
        with self.assertRaises(mtef.MTEFUnsupported):
            mtef.mtef_to_latex(data)

    def test_latex_special_char_escaped(self):
        data = make_stream(char_record("5") + char_record("%"))
        self.assertEqual(mtef.mtef_to_latex(data), r"5\%")


if __name__ == "__main__":
    unittest.main()
