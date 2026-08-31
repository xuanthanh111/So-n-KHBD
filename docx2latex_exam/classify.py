"""Nhan dien cau truc de thi TN THPT tu danh sach Paragraph da parse:
- Trac nghiem 4 dap an (nhan A/B/C/D hoa)
- Dung/Sai 4 y (nhan a/b/c/d thuong)
- Tra loi ngan (khong co nhan lua chon)

Cau hoi duoc nhan dien bang MOT trong hai cach (tuy tai lieu):
1. Danh so thu cong ngay trong van ban: 'Cau 1:', 'Cau 2:'...
2. Danh so tu dong cua Word (numbering/list) - rat pho bien trong de thi
   thuc te: so thu tu '1.', '2.'... duoc Word ve ra tu dinh nghia danh
   sach (numId), KHONG nam trong noi dung van ban. Cach nay chi duoc bat
   SAU KHI da gap tieu de 'PHAN I/II/III...' de tranh nham voi cac danh
   sach so khac (vi du gach dau dong trong phan ly thuyet).

Lua chon (A./B./C./D. hoac a)/b)/c)/d)) co the nam MOI Y MOT DONG, hoac
nhieu y tren CUNG MOT DONG cach nhau boi Tab (rat hay gap: 'A. ...\tB. ...').

Quy uoc nhan dien dap an dung (theo cach giao vien hay soan de):
- MC: dap an dung duoc TO DAM (bold) hoac TO MAU (highlight) trong file Word,
  hoac co dong 'Dap an: X' ngay sau cau hoi.
- Dung/Sai: moi y a/b/c/d co the ghi kem '(Dung)'/'(Sai)' cuoi dong, hoac
  dong 'Dap an: aD bS cD dS' sau cau hoi.
- Tra loi ngan: dong 'Dap an: <gia tri>' sau cau hoi.
"""
import copy
import re
from typing import List, Optional, Tuple

from .model import Choice, ExamDocument, Paragraph, Question, TextRun

RE_QUESTION_START = re.compile(r"^\s*C[aâ]u\s*(\d+)\s*[:.\)]\s*(.*)$", re.IGNORECASE)
RE_MC_LABEL = re.compile(r"^\s*([A-D])\s*[\.\)]\s*(.*)$")
RE_TF_LABEL = re.compile(r"^\s*([a-d])\s*[\.\)]\s*(.*)$")
RE_ANSWER_KEY = re.compile(r"^\s*(?:Đáp\s*án|ĐA)\s*[:\.]?\s*(.+?)\s*$", re.IGNORECASE)
RE_TRAILING_DS = re.compile(r"\(?\s*(Đúng|Sai)\s*\)?\.?\s*$", re.IGNORECASE)
RE_PART_HEADER = re.compile(r"^\s*Ph[aầ]n\s*(I{1,3}|[123])\b", re.IGNORECASE)
RE_END_MARKER = re.compile(r"^[\s\-–—_]*H[ẾE]T[\s\-–—_]*$", re.IGNORECASE)


def _split_by_tabs(nodes: List) -> List[List]:
    """Tach mot day node thanh nhieu doan theo dau Tab (\\t la node rieng,
    xem docx_parse._parse_run). Dung khi nhieu lua chon nam chung 1 dong,
    vi du 'A. 1\\tB. 2\\tC. 3\\tD. 4'."""
    segments: List[List] = []
    current: List = []
    for n in nodes:
        if isinstance(n, TextRun) and n.text == "\t":
            if current:
                segments.append(current)
                current = []
        else:
            current.append(n)
    if current:
        segments.append(current)
    return segments or [nodes]


def _strip_prefix(nodes, regex) -> Tuple[Optional[str], List]:
    """Neu node dau tien la TextRun khop regex o dau chuoi, tach nhan ra
    khoi noi dung va tra ve (nhan, danh_sach_node_con_lai)."""
    if not nodes or not isinstance(nodes[0], TextRun):
        return None, nodes
    m = regex.match(nodes[0].text)
    if not m:
        return None, nodes
    label = m.group(1)
    rest_text = m.group(2) if m.lastindex and m.lastindex >= 2 else nodes[0].text[m.end():]
    new_nodes = list(nodes)
    first = copy.copy(new_nodes[0])
    first.text = rest_text
    new_nodes[0] = first
    if not first.text:
        new_nodes = new_nodes[1:]
    return label, new_nodes


def _strip_trailing_true_false(nodes) -> Tuple[Optional[bool], List]:
    if not nodes or not isinstance(nodes[-1], TextRun):
        return None, nodes
    m = RE_TRAILING_DS.search(nodes[-1].text)
    if not m:
        return None, nodes
    word = m.group(1).lower()
    correct = word == "đúng" or word == "dung"
    new_nodes = list(nodes)
    last = copy.copy(new_nodes[-1])
    last.text = nodes[-1].text[: m.start()].rstrip()
    if last.text:
        new_nodes[-1] = last
    else:
        new_nodes = new_nodes[:-1]
    return correct, new_nodes


def _has_strong_mark(nodes) -> bool:
    return any(isinstance(n, TextRun) and (n.bold or n.highlight) for n in nodes)


def _plain(nodes) -> str:
    return "".join(n.text for n in nodes if isinstance(n, TextRun))


class _Block:
    """Mot cau hoi tho: dong bat dau cau hoi (so thu cong hoac tu dong)
    + cac paragraph tiep theo cho den truoc cau hoi ke tiep."""

    def __init__(self, number: Optional[str], paragraphs: List[Paragraph]):
        self.number = number
        self.paragraphs = paragraphs


def _split_blocks(paragraphs: List[Paragraph]) -> Tuple[List[Paragraph], List[_Block]]:
    intro: List[Paragraph] = []
    blocks: List[_Block] = []
    current: Optional[_Block] = None
    numbering_enabled = False  # chi bat sau khi gap tieu de 'Phan I/II/III'

    for p in paragraphs:
        if p.is_empty():
            if current is not None:
                current.paragraphs.append(p)
            continue

        text = p.plain_text()

        if RE_PART_HEADER.match(text):
            numbering_enabled = True
            continue  # dong tieu de 'PHAN I/II/III...' khong phai noi dung cau hoi

        if RE_END_MARKER.match(text):
            continue  # dong '-----HET-----' cuoi de

        starts_with_text = bool(p.nodes) and isinstance(p.nodes[0], TextRun)
        m = RE_QUESTION_START.match(text) if starts_with_text else None
        is_auto_numbered = numbering_enabled and p.num_id is not None

        if m or is_auto_numbered:
            if current is not None:
                blocks.append(current)
            if m:
                label, rest_nodes = _strip_prefix(p.nodes, RE_QUESTION_START)
                first_para = Paragraph(nodes=rest_nodes, style=p.style) if rest_nodes else None
                current = _Block(number=label, paragraphs=[first_para] if first_para else [])
            else:
                current = _Block(number=None, paragraphs=[p])
            continue

        if current is None:
            intro.append(p)
        else:
            current.paragraphs.append(p)

    if current is not None:
        blocks.append(current)
    return intro, blocks


def _classify_block(block: _Block, fallback_number: int) -> Question:
    mc_choices: List[Tuple[str, List]] = []
    tf_choices: List[Tuple[str, List]] = []
    stem_paras: List[Paragraph] = []
    answer_key_text: Optional[str] = None
    warnings: List[str] = []
    label = block.number or str(fallback_number)

    for p in block.paragraphs:
        if p.is_empty():
            continue
        text = p.plain_text()

        m_key = RE_ANSWER_KEY.match(text)
        if m_key:
            answer_key_text = m_key.group(1).strip()
            continue

        leftover: List = []
        found_any_label = False
        for seg in _split_by_tabs(p.nodes):
            lbl, rest = _strip_prefix(seg, RE_MC_LABEL)
            if lbl:
                mc_choices.append((lbl, rest))
                found_any_label = True
                continue
            lbl, rest = _strip_prefix(seg, RE_TF_LABEL)
            if lbl:
                tf_choices.append((lbl, rest))
                found_any_label = True
                continue
            leftover.extend(seg)

        if found_any_label:
            if leftover and _plain(leftover).strip():
                stem_paras.append(Paragraph(nodes=leftover))
        else:
            stem_paras.append(p)

    if mc_choices:
        choices = []
        correct_letter = None
        if answer_key_text:
            mk = re.match(r"^\s*([A-D])\b", answer_key_text, re.IGNORECASE)
            if mk:
                correct_letter = mk.group(1).upper()
        for lbl, nodes in mc_choices:
            correct = None
            if correct_letter:
                correct = lbl.upper() == correct_letter
            elif _has_strong_mark(nodes):
                correct = True
            choices.append(Choice(label=lbl.upper(), nodes=nodes, correct=correct))
        if correct_letter is None and not any(c.correct for c in choices):
            warnings.append(f"Cau {label}: chua xac dinh duoc dap an dung (A/B/C/D).")
        return Question(kind="mc4", stem=stem_paras, choices=choices,
                         original_number=label, warnings=warnings)

    if tf_choices:
        choices = []
        key_map = {}
        if answer_key_text:
            for lbl_m, val in re.findall(r"([a-dA-D])\s*[-:=]?\s*(Đ|S|Đúng|Sai)", answer_key_text, re.IGNORECASE):
                key_map[lbl_m.lower()] = val.lower().startswith("đ") or val.lower().startswith("d")
        for lbl, nodes in tf_choices:
            correct, nodes2 = _strip_trailing_true_false(nodes)
            if correct is None and lbl.lower() in key_map:
                correct = key_map[lbl.lower()]
            if correct is None:
                warnings.append(f"Cau {label}, y {lbl}) chua xac dinh Dung/Sai.")
            choices.append(Choice(label=lbl.lower(), nodes=nodes2, correct=correct))
        return Question(kind="truefalse", stem=stem_paras, choices=choices,
                         original_number=label, warnings=warnings)

    # tra loi ngan
    if not answer_key_text:
        warnings.append(f"Cau {label}: khong tim thay dap an (dong 'Dap an: ...').")
    return Question(kind="short", stem=stem_paras, short_answer=answer_key_text,
                     original_number=label, warnings=warnings)


def classify(paragraphs: List[Paragraph]) -> ExamDocument:
    intro, blocks = _split_blocks(paragraphs)
    doc = ExamDocument(intro=intro)
    for i, block in enumerate(blocks, 1):
        q = _classify_block(block, fallback_number=i)
        doc.warnings.extend(q.warnings)
        if q.kind == "mc4":
            doc.mc4.append(q)
        elif q.kind == "truefalse":
            doc.truefalse.append(q)
        else:
            doc.short.append(q)
    return doc
