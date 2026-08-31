"""Sinh ma nguon LaTeX hoan chinh tu ExamDocument (model.py)."""
from typing import List

from .model import ExamDocument, ImageNode, LineBreak, MathNode, Paragraph, Question, TextRun

_ESCAPE_MAP = {
    "\\": r"\textbackslash{}",
    "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
    "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
}

# Mot so ky tu toan hoc nguoi soan de hay go truc tiep nhu van ban thuong
# (khong qua trinh soan cong thuc) - vi du go thang "∞", "≤" tu ban phim Unicode.
# Nhung ky tu nay khong doi bang escape_text ma phai nam trong che do toan ($...$).
_PLAIN_REPLACE = {"−": "-", "–": "-", "—": "--", "′": "'", "″": "''"}
_MATH_REPLACE = {
    "×": r"\times", "÷": r"\div", "≤": r"\le", "≥": r"\ge", "≠": r"\ne",
    "≈": r"\approx", "≡": r"\equiv", "∝": r"\propto", "±": r"\pm", "∓": r"\mp",
    "∞": r"\infty", "∅": r"\varnothing", "→": r"\to", "←": r"\leftarrow",
    "↔": r"\leftrightarrow", "⇒": r"\Rightarrow", "⇐": r"\Leftarrow",
    "⇔": r"\Leftrightarrow", "∈": r"\in", "∉": r"\notin", "∋": r"\ni",
    "⊂": r"\subset", "⊆": r"\subseteq", "⊃": r"\supset", "∪": r"\cup",
    "∩": r"\cap", "∀": r"\forall", "∃": r"\exists", "·": r"\cdot",
    "…": r"\ldots", "⋯": r"\cdots", "√": r"\sqrt", "°": r"^{\circ}",
    "α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "δ": r"\delta",
    "θ": r"\theta", "λ": r"\lambda", "μ": r"\mu", "π": r"\pi",
    "σ": r"\sigma", "φ": r"\varphi", "ω": r"\omega",
    "∫": r"\int", "∑": r"\sum", "∏": r"\prod", "∂": r"\partial", "∇": r"\nabla",
}


def escape_text(s: str) -> str:
    return "".join(_ESCAPE_MAP.get(c, c) for c in s)


def _render_text_with_symbols(s: str) -> str:
    """Escape van ban thuong, dong thoi tu dong boc cac ky hieu toan go
    truc tiep (khong qua trinh soan cong thuc) vao che do toan $...$."""
    out = []
    buf = []

    def flush():
        if buf:
            out.append(escape_text("".join(buf)))
            buf.clear()

    for ch in s:
        if ch in _PLAIN_REPLACE:
            buf.append(_PLAIN_REPLACE[ch])
        elif ch in _MATH_REPLACE:
            flush()
            out.append("$%s$" % _MATH_REPLACE[ch])
        else:
            buf.append(ch)
    flush()
    return "".join(out)


def _render_run(n: TextRun) -> str:
    if n.text == "\t":
        return r"\quad "
    text = _render_text_with_symbols(n.text)
    if n.bold:
        text = r"\textbf{%s}" % text
    if n.italic:
        text = r"\textit{%s}" % text
    if n.underline:
        text = r"\underline{%s}" % text
    if n.strike:
        text = r"\sout{%s}" % text
    if n.highlight:
        text = r"\colorbox{yellow!40}{%s}" % text
    return text


def _render_math(n: MathNode) -> str:
    if n.display:
        return "\\[\n%s\n\\]\n" % n.latex
    return "$%s$" % n.latex


def render_nodes(nodes: List) -> str:
    """Render mot day node lien tuc thanh LaTeX; anh chen dang khoi rieng
    (giu dung vi tri nhung ngat dong van ban, giong the hien thuc te trong
    tai lieu Word ban dau)."""
    out = []
    for n in nodes:
        if isinstance(n, TextRun):
            out.append(_render_run(n))
        elif isinstance(n, MathNode):
            out.append(_render_math(n))
        elif isinstance(n, ImageNode):
            if n.path:
                out.append(
                    "\n\\begin{center}\n\\includegraphics[width=0.45\\linewidth]{%s}\n\\end{center}\n"
                    % n.path
                )
            else:
                out.append(r"\textit{[khong doc duoc hinh/cong thuc goc]}")
        elif isinstance(n, LineBreak):
            out.append("\\\\\n")
    return "".join(out)


def render_paragraphs(paragraphs: List[Paragraph]) -> str:
    return "\n\n".join(render_nodes(p.nodes) for p in paragraphs if not p.is_empty())


def _render_mc4(q: Question, idx: int) -> str:
    lines = [r"\item %s" % render_paragraphs(q.stem)]
    lines.append(r"\begin{itemize}[label=,leftmargin=1.5em]")
    for c in q.choices:
        lines.append(r"\item[%s.] %s" % (c.label, render_nodes(c.nodes)))
    lines.append(r"\end{itemize}")
    return "\n".join(lines)


def _render_tf(q: Question, idx: int) -> str:
    lines = [r"\item %s" % render_paragraphs(q.stem)]
    lines.append(r"\begin{itemize}[label=,leftmargin=1.5em]")
    for c in q.choices:
        lines.append(r"\item[%s)] %s" % (c.label, render_nodes(c.nodes)))
    lines.append(r"\end{itemize}")
    return "\n".join(lines)


def _render_short(q: Question, idx: int) -> str:
    return r"\item %s" % render_paragraphs(q.stem)


def _answer_key_mc4(qs: List[Question]) -> str:
    parts = []
    for i, q in enumerate(qs, 1):
        letter = next((c.label for c in q.choices if c.correct), "?")
        parts.append("%d.%s" % (i, letter))
    return "  ".join(parts)


def _answer_key_tf(qs: List[Question]) -> str:
    lines = []
    for i, q in enumerate(qs, 1):
        items = []
        for c in q.choices:
            mark = "?" if c.correct is None else ("Đ" if c.correct else "S")
            items.append("%s-%s" % (c.label, mark))
        lines.append("Câu %d: %s" % (i, "  ".join(items)))
    return " \\\\\n".join(lines)


def _answer_key_short(qs: List[Question]) -> str:
    parts = []
    for i, q in enumerate(qs, 1):
        val = escape_text(q.short_answer) if q.short_answer else "?"
        parts.append("%d. %s" % (i, val))
    return "  ".join(parts)


PREAMBLE = r"""\documentclass[12pt,a4paper]{article}
\usepackage{fontspec}
\usepackage{polyglossia}
\setmainlanguage{vietnamese}
\setmainfont{Times New Roman}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{ulem}
\usepackage[dvipsnames]{xcolor}
\usepackage[a4paper,margin=2cm]{geometry}
\usepackage{enumitem}
\setlist{nosep}

% File nay duoc sinh tu dong boi cong cu docx2latex-exam.
% Bien dich bang XeLaTeX (hoac LuaLaTeX) de ho tro tieng Viet + Times New Roman:
%   xelatex ten-file.tex
% Neu may khong co font Times New Roman, doi \\setmainfont ben tren sang
% mot font ho tro Unicode Vietnamese khac, vi du: \\setmainfont{DejaVu Serif}
"""


def render_document(exam: ExamDocument) -> str:
    out = [PREAMBLE, r"\begin{document}", ""]

    intro_content = [p for p in exam.intro if not p.is_empty()]
    if intro_content:
        if len(intro_content) <= 6:
            # De thi ngan gon: vai dong tieu de -> in dam, can giua (quoc
            # hieu, ten truong, ten de thi...).
            out.append(r"\begin{center}")
            out.append(" \\\\\n".join(r"{\bfseries %s}" % render_nodes(p.nodes) for p in intro_content))
            out.append(r"\end{center}")
        else:
            # Tai lieu co nhieu noi dung truoc cau hoi dau tien (vi du bai
            # giang ly thuyet kem cong thuc) -> giu nguyen dang van ban
            # thuong, khong in dam/can giua toan bo.
            out.append(render_paragraphs(intro_content))
        out.append(r"\vspace{1em}")
        out.append("")

    if exam.mc4:
        out.append(r"\textbf{PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.}")
        out.append(r"\textit{Thí sinh trả lời từ câu 1 đến câu %d. "
                    r"Mỗi câu hỏi thí sinh chỉ chọn một phương án.}" % len(exam.mc4))
        out.append(r"\begin{enumerate}")
        for i, q in enumerate(exam.mc4, 1):
            out.append(_render_mc4(q, i))
        out.append(r"\end{enumerate}")
        out.append("")

    if exam.truefalse:
        out.append(r"\textbf{PHẦN II. Câu trắc nghiệm đúng sai.}")
        out.append(r"\textit{Thí sinh trả lời từ câu 1 đến câu %d. "
                    r"Trong mỗi ý a), b), c), d), thí sinh chọn đúng hoặc sai.}" % len(exam.truefalse))
        out.append(r"\begin{enumerate}")
        for i, q in enumerate(exam.truefalse, 1):
            out.append(_render_tf(q, i))
        out.append(r"\end{enumerate}")
        out.append("")

    if exam.short:
        out.append(r"\textbf{PHẦN III. Câu trắc nghiệm trả lời ngắn.}")
        out.append(r"\textit{Thí sinh trả lời từ câu 1 đến câu %d.}" % len(exam.short))
        out.append(r"\begin{enumerate}")
        for i, q in enumerate(exam.short, 1):
            out.append(_render_short(q, i))
        out.append(r"\end{enumerate}")
        out.append("")

    out.append(r"\newpage")
    out.append(r"\begin{center}\textbf{BẢNG ĐÁP ÁN}\end{center}")
    if exam.mc4:
        out.append(r"\textbf{Phần I:} " + _answer_key_mc4(exam.mc4) + r"\\")
    if exam.truefalse:
        out.append(r"\textbf{Phần II:}\\")
        out.append(_answer_key_tf(exam.truefalse) + r"\\")
    if exam.short:
        out.append(r"\textbf{Phần III:} " + _answer_key_short(exam.short))

    out.append(r"\end{document}")
    return "\n".join(out)
