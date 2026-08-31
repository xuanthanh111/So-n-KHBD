"""Parser 'best effort' cho dinh dang nhi phan MTEF (MathType Equation Format).

MathType (kieu OLE co dien, khac voi cong thuc Word/OMML) luu cong thuc trong
mot stream nhi phan rieng ("Equation Native") ben trong doi tuong OLE. Dinh
dang nay (MTEF) rat phuc tap va khong co tai lieu day du/chinh thuc mien phi.

De tranh sinh ra LaTeX SAI (nguy hiem hon la khong chuyen duoc), module nay
CHI xu ly truong hop don gian va chac chan: mot day ky tu ASCII lien tiep
(khong co phan so, can, mu, chi so...). Bat ky cau truc phuc tap hon deu
khien ham parse nem MTEFUnsupported, va noi goi (docx_parse) se fallback
sang chen anh xem truoc cua chinh cong thuc do (anh nay Word/MathType da
luu san trong file docx - dung "nguyen ban", khong ve lai).
"""
from dataclasses import dataclass
from typing import List, Optional

END, LINE, CHAR, TMPL, PILE, MATRIX = 0, 1, 2, 3, 4, 5

OPT_NUDGE = 0x08
CHAR_OPT_EMBELL = 0x01
CHAR_OPT_ENC_CHAR_8 = 0x04
CHAR_OPT_ENC_CHAR_16 = 0x10
CHAR_OPT_ENC_NO_MTCODE = 0x20


class MTEFUnsupported(Exception):
    pass


@dataclass
class _Cursor:
    buf: bytes
    pos: int = 0

    def u8(self) -> int:
        if self.pos >= len(self.buf):
            raise MTEFUnsupported("het du lieu")
        b = self.buf[self.pos]
        self.pos += 1
        return b

    def u16(self) -> int:
        lo = self.u8()
        hi = self.u8()
        return lo | (hi << 8)

    def uint(self) -> int:
        b = self.u8()
        if b < 255:
            return b
        return self.u16()

    def sint(self) -> int:
        b = self.u8()
        if b != 255:
            return b - 128
        raw = self.u16()
        return raw - 32768

    def skip(self, n: int):
        if self.pos + n > len(self.buf):
            raise MTEFUnsupported("het du lieu")
        self.pos += n


def _find_header(buf: bytes) -> int:
    """Do offset header MTEF co the lech tuy phien ban EQNOLEFILEHDR,
    quet vai chuc byte dau de tim day (version, platform, product) hop le."""
    limit = min(len(buf) - 5, 96)
    for off in range(0, max(limit, 0)):
        version, platform, product, vmaj = buf[off], buf[off + 1], buf[off + 2], buf[off + 3]
        if version in (2, 3, 4, 5) and platform in (0, 1) and product in (0, 1) and vmaj < 30:
            return off
    raise MTEFUnsupported("khong tim thay header MTEF")


def _parse_char_only(cur: _Cursor) -> str:
    """Doc mot day record CHAR lien tiep cho den END. Bat ky record khac
    (TMPL/LINE/PILE/MATRIX/...) deu bao Unsupported."""
    chars: List[str] = []
    while True:
        tag = cur.u8()
        if tag == END:
            break
        if tag != CHAR:
            raise MTEFUnsupported(f"record khong ho tro (tag={tag})")
        opts = cur.u8()
        if opts & OPT_NUDGE:
            cur.sint()
            cur.sint()
        if opts & CHAR_OPT_EMBELL:
            raise MTEFUnsupported("ky tu co embellishment (dau mu/cham...)")
        cur.sint()  # typeface
        code: Optional[int] = None
        if not (opts & CHAR_OPT_ENC_NO_MTCODE):
            code = cur.u16()
        if opts & CHAR_OPT_ENC_CHAR_8:
            cur.u8()
        if opts & CHAR_OPT_ENC_CHAR_16:
            cur.u16()
        if code is None or not (0x20 <= code <= 0x7E):
            raise MTEFUnsupported("ky tu ngoai vung ASCII co ban")
        chars.append(chr(code))
    return "".join(chars)


_LATEX_ESCAPE = {"&": r"\&", "%": r"\%", "#": r"\#", "_": r"\_", "$": r"\$",
                  "{": r"\{", "}": r"\}", "~": r"\sim ", "^": r"\hat{}"}


def mtef_to_latex(stream_bytes: bytes) -> str:
    """Tra ve chuoi LaTeX neu day la mot cong thuc ASCII don gian.
    Nem MTEFUnsupported voi cac truong hop khac (se duoc fallback sang anh)."""
    off = _find_header(stream_bytes)
    cur = _Cursor(stream_bytes, off)
    cur.u8()  # version
    cur.u8()  # platform
    cur.u8()  # product
    cur.u8()  # version major
    cur.u8()  # version minor
    key_len = cur.u8()
    if key_len:
        cur.skip(key_len)
    cur.u8()  # equation options (inline flag...)
    text = _parse_char_only(cur)
    if not text.strip():
        raise MTEFUnsupported("cong thuc rong")
    escaped = "".join(_LATEX_ESCAPE.get(c, c) for c in text)
    return escaped
