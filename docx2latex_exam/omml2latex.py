"""Chuyen doi cong thuc Office Math (OMML, m:oMath) sang LaTeX.

Day la duong chinh cho cong thuc: cong thuc go bang Word Equation Editor
(kieu OOXML native) hoac MathType khi da duoc Word chuyen thanh OMML deu
di qua module nay va cho ket qua LaTeX chinh xac (khong phai anh).
"""
import re

M = "{http://schemas.openxmlformats.org/officeDocument/2006/math}"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Anh xa mot so ky tu Unicode (thuong gap trong font Cambria Math) sang lenh LaTeX.
CHAR_MAP = {
    "−": "-", "–": "-", "—": "--",
    "×": r"\times ", "÷": r"\div ",
    "≤": r"\le ", "≥": r"\ge ", "≠": r"\ne ",
    "≈": r"\approx ", "≡": r"\equiv ", "∝": r"\propto ",
    "±": r"\pm ", "∓": r"\mp ",
    "∞": r"\infty ", "∅": r"\varnothing ",
    "→": r"\to ", "←": r"\leftarrow ", "↔": r"\leftrightarrow ",
    "⇒": r"\Rightarrow ", "⇐": r"\Leftarrow ", "⇔": r"\Leftrightarrow ",
    "∈": r"\in ", "∉": r"\notin ", "∋": r"\ni ",
    "⊂": r"\subset ", "⊆": r"\subseteq ", "⊃": r"\supset ",
    "∪": r"\cup ", "∩": r"\cap ", "∖": r"\setminus ",
    "∀": r"\forall ", "∃": r"\exists ",
    "·": r"\cdot ", "…": r"\ldots ", "⋯": r"\cdots ",
    "√": r"\sqrt ", "′": r"'", "″": r"''",
    "°": r"^{\circ}",
    "α": r"\alpha ", "β": r"\beta ", "γ": r"\gamma ", "δ": r"\delta ",
    "ε": r"\varepsilon ", "ζ": r"\zeta ", "η": r"\eta ", "θ": r"\theta ",
    "ι": r"\iota ", "κ": r"\kappa ", "λ": r"\lambda ", "μ": r"\mu ",
    "ν": r"\nu ", "ξ": r"\xi ", "π": r"\pi ", "ρ": r"\rho ",
    "σ": r"\sigma ", "τ": r"\tau ", "υ": r"\upsilon ", "φ": r"\varphi ",
    "χ": r"\chi ", "ψ": r"\psi ", "ω": r"\omega ",
    "Α": r"A", "Β": r"B", "Γ": r"\Gamma ", "Δ": r"\Delta ",
    "Θ": r"\Theta ", "Λ": r"\Lambda ", "Ξ": r"\Xi ", "Π": r"\Pi ",
    "Σ": r"\Sigma ", "Φ": r"\Phi ", "Ψ": r"\Psi ", "Ω": r"\Omega ",
    "∫": r"\int ", "∬": r"\iint ", "∭": r"\iiint ", "∮": r"\oint ",
    "∑": r"\sum ", "∏": r"\prod ",
    "∂": r"\partial ", "∇": r"\nabla ",
    "|": r"|",
}

SPECIAL = {"&": r"\&", "%": r"\%", "#": r"\#", "_": r"\_", "$": r"\$", "{": r"\{", "}": r"\}"}


def _esc(ch: str) -> str:
    if ch in CHAR_MAP:
        return CHAR_MAP[ch]
    if ch in SPECIAL:
        return SPECIAL[ch]
    return ch


def _wrap(latex: str) -> str:
    latex = latex.strip()
    if len(latex) == 1:
        return latex
    return "{" + latex + "}"


def _text_of(el) -> str:
    parts = []
    for t in el.iter(f"{M}t"):
        parts.append(t.text or "")
    return "".join(parts)


def _val(el, tag):
    node = el.find(f"{M}{tag}/{M}val")
    if node is not None:
        return node.get(f"{M}val")
    return None


class OMML2LaTeX:
    def convert(self, oMath) -> str:
        return self._seq(oMath)

    # ---- sequence of siblings inside a container (oMath, e/num/den/...) ----
    def _seq(self, container) -> str:
        out = []
        for child in container:
            tag = child.tag
            if tag == f"{M}r":
                out.append(self._run(child))
            elif tag == f"{M}f":
                out.append(self._frac(child))
            elif tag == f"{M}rad":
                out.append(self._rad(child))
            elif tag in (f"{M}sSub",):
                out.append(self._sub(child))
            elif tag == f"{M}sSup":
                out.append(self._sup(child))
            elif tag == f"{M}sSubSup":
                out.append(self._subsup(child))
            elif tag == f"{M}nary":
                out.append(self._nary(child))
            elif tag == f"{M}d":
                out.append(self._delim(child))
            elif tag == f"{M}func":
                out.append(self._func(child))
            elif tag == f"{M}limLow":
                out.append(self._lim(child, low=True))
            elif tag == f"{M}limUpp":
                out.append(self._lim(child, low=False))
            elif tag == f"{M}m":
                out.append(self._matrix(child))
            elif tag == f"{M}eqArr":
                out.append(self._eqarr(child))
            elif tag == f"{M}acc":
                out.append(self._acc(child))
            elif tag == f"{M}bar":
                out.append(self._bar(child))
            elif tag == f"{M}groupChr":
                out.append(self._groupchr(child))
            elif tag == f"{M}box":
                e = child.find(f"{M}e")
                out.append(self._seq(e) if e is not None else "")
            elif tag in (f"{M}oMathPara", f"{M}oMath"):
                out.append(self._seq(child))
            else:
                # noProof, ctrlPr va cac tag khong anh huong noi dung -> bo qua
                continue
        return "".join(out)

    def _run(self, r) -> str:
        text = _text_of(r)
        style = r.find(f"{M}rPr/{M}sty")
        is_literal = style is not None and style.get(f"{M}val") == "p"
        out = []
        for ch in text:
            out.append(_esc(ch))
        s = "".join(out)
        if is_literal:
            return r"\mathrm{" + s + "}" if s.strip() else s
        return s

    def _frac(self, f) -> str:
        num = f.find(f"{M}num")
        den = f.find(f"{M}den")
        n = self._seq(num) if num is not None else ""
        d = self._seq(den) if den is not None else ""
        return r"\frac{%s}{%s}" % (n, d)

    def _rad(self, rad) -> str:
        deg = rad.find(f"{M}deg")
        e = rad.find(f"{M}e")
        hide = rad.find(f"{M}radPr/{M}degHide")
        body = self._seq(e) if e is not None else ""
        deg_txt = self._seq(deg) if deg is not None else ""
        if hide is not None or not deg_txt.strip():
            return r"\sqrt{%s}" % body
        return r"\sqrt[%s]{%s}" % (deg_txt, body)

    def _sub(self, node) -> str:
        e = node.find(f"{M}e")
        sub = node.find(f"{M}sub")
        base = self._seq(e) if e is not None else ""
        s = self._seq(sub) if sub is not None else ""
        return "%s_%s" % (_wrap(base), _wrap(s))

    def _sup(self, node) -> str:
        e = node.find(f"{M}e")
        sup = node.find(f"{M}sup")
        base = self._seq(e) if e is not None else ""
        s = self._seq(sup) if sup is not None else ""
        return "%s^%s" % (_wrap(base), _wrap(s))

    def _subsup(self, node) -> str:
        e = node.find(f"{M}e")
        sub = node.find(f"{M}sub")
        sup = node.find(f"{M}sup")
        base = self._seq(e) if e is not None else ""
        sb = self._seq(sub) if sub is not None else ""
        sp = self._seq(sup) if sup is not None else ""
        return "%s_%s^%s" % (_wrap(base), _wrap(sb), _wrap(sp))

    def _nary(self, node) -> str:
        chr_el = node.find(f"{M}naryPr/{M}chr")
        op = chr_el.get(f"{M}val") if chr_el is not None else "∑"
        cmd = CHAR_MAP.get(op, op).strip()
        if not cmd.startswith("\\"):
            cmd = _esc(op).strip() or r"\sum"
        sub = node.find(f"{M}sub")
        sup = node.find(f"{M}sup")
        e = node.find(f"{M}e")
        body = self._seq(e) if e is not None else ""
        out = cmd
        if sub is not None and not self._is_empty(sub):
            out += "_%s" % _wrap(self._seq(sub))
        if sup is not None and not self._is_empty(sup):
            out += "^%s" % _wrap(self._seq(sup))
        return out + " " + body

    def _is_empty(self, container) -> bool:
        return not _text_of(container).strip() and len(list(container)) == 0

    DELIM_MAP = {
        "(": "(", ")": ")", "[": "[", "]": "]", "{": r"\{", "}": r"\}",
        "|": "|", "‖": r"\|", "": ".",
    }

    def _delim(self, node) -> str:
        beg = node.find(f"{M}dPr/{M}begChr")
        end = node.find(f"{M}dPr/{M}endChr")
        b = beg.get(f"{M}val") if beg is not None else "("
        e = end.get(f"{M}val") if end is not None else ")"
        b = self.DELIM_MAP.get(b, b if b else ".")
        e = self.DELIM_MAP.get(e, e if e else ".")
        parts = [self._seq(x) for x in node.findall(f"{M}e")]
        sep = node.find(f"{M}dPr/{M}sepChr")
        sep_c = sep.get(f"{M}val") if sep is not None else "|"
        joined = (" %s " % _esc(sep_c)).join(parts)
        return r"\left%s %s \right%s" % (b, joined, e)

    def _func(self, node) -> str:
        name_el = node.find(f"{M}fName")
        e = node.find(f"{M}e")
        name = self._seq(name_el) if name_el is not None else ""
        body = self._seq(e) if e is not None else ""
        name = name.strip()
        known = {"sin", "cos", "tan", "cot", "sec", "csc", "ln", "log", "lim",
                 "max", "min", "exp", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh"}
        base = name.rstrip("(")
        if base in known:
            return r"\%s %s" % (base, body)
        return r"\operatorname{%s}%s" % (name, body)

    def _lim(self, node, low: bool) -> str:
        e = node.find(f"{M}e")
        lim = node.find(f"{M}lim")
        base = self._seq(e) if e is not None else ""
        under = self._seq(lim) if lim is not None else ""
        if low:
            return "%s_{%s}" % (_wrap(base), under)
        return "%s^{%s}" % (_wrap(base), under)

    def _matrix(self, node) -> str:
        rows = []
        for mr in node.findall(f"{M}mr"):
            cells = [self._seq(e) for e in mr.findall(f"{M}e")]
            rows.append(" & ".join(cells))
        body = r" \\ ".join(rows)
        return r"\begin{pmatrix}%s\end{pmatrix}" % body

    def _eqarr(self, node) -> str:
        rows = [self._seq(e) for e in node.findall(f"{M}e")]
        body = r" \\ ".join(rows)
        return r"\begin{cases}%s\end{cases}" % body

    ACCENT_MAP = {
        "̂": r"\hat", "̃": r"\tilde", "̄": r"\bar",
        "→": r"\vec", "̇": r"\dot", "̈": r"\ddot",
        "̌": r"\check", "́": r"\acute", "̀": r"\grave",
    }

    def _acc(self, node) -> str:
        pr = node.find(f"{M}accPr/{M}chr")
        ch = pr.get(f"{M}val") if pr is not None else "̂"
        cmd = self.ACCENT_MAP.get(ch, r"\hat")
        e = node.find(f"{M}e")
        body = self._seq(e) if e is not None else ""
        return r"%s{%s}" % (cmd, body)

    def _bar(self, node) -> str:
        pr = node.find(f"{M}barPr/{M}pos")
        pos = pr.get(f"{M}val") if pr is not None else "top"
        e = node.find(f"{M}e")
        body = self._seq(e) if e is not None else ""
        cmd = r"\overline" if pos == "top" else r"\underline"
        return r"%s{%s}" % (cmd, body)

    def _groupchr(self, node) -> str:
        pr = node.find(f"{M}groupChrPr/{M}chr")
        ch = pr.get(f"{M}val") if pr is not None else "⏟"
        e = node.find(f"{M}e")
        body = self._seq(e) if e is not None else ""
        if ch in ("⏟", "_"):
            return r"\underbrace{%s}" % body
        return r"\overbrace{%s}" % body


def omml_to_latex(oMath_element) -> str:
    conv = OMML2LaTeX()
    latex = conv.convert(oMath_element)
    latex = re.sub(r"\s+", " ", latex).strip()
    return latex
