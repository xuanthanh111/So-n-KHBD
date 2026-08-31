"""Nhan dien cau truc de thi TN THPT tu danh sach Paragraph da parse:
- Trac nghiem 4 dap an (nhan A/B/C/D hoa)
- Dung/Sai 4 y (nhan a/b/c/d thuong)
- Tra loi ngan (khong co nhan lua chon)

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

from .model import Choice, ExamDocument, LineBreak, Paragraph, Question, TextRun

RE_QUESTION_START = re.compile(r"^\s*C[aâ]u\s*(\d+)\s*[:.\)]\s*(.*)$", re.IGNORECASE)
RE_MC_LABEL = re.compile(r"^\s*([A-D])\s*[\.\)]\s*(.*)$")
RE_TF_LABEL = re.compile(r"^\s*([a-d])\s*[\.\)]\s*(.*)$")
RE_ANSWER_KEY = re.compile(r"^\s*(?:Đáp\s*án|ĐA)\s*[:\.]?\s*(.+?)\s*$", re.IGNORECASE)
RE_TRAILING_DS = re.compile(r"\(?\s*(Đúng|Sai)\s*\)?\.?\s*$", re.IGNORECASE)


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
    if rest_text.strip() or rest_text == "":
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
    """Mot cau hoi tho: dong 'Cau N' + cac paragraph tiep theo cho den
    truoc dong 'Cau N+1' ke tiep (hoac het tai lieu)."""

    def __init__(self, number: str, first_nodes: List, paragraphs: List[Paragraph]):
        self.number = number
        self.first_nodes = first_nodes
        self.paragraphs = paragraphs


def _split_blocks(paragraphs: List[Paragraph]) -> Tuple[List[Paragraph], List[_Block]]:
    intro: List[Paragraph] = []
    blocks: List[_Block] = []
    current: Optional[_Block] = None
    for p in paragraphs:
        if p.is_empty():
            continue
        text = p.plain_text()
        m = RE_QUESTION_START.match(text)
        if m and isinstance(p.nodes[0], TextRun):
            label, rest_nodes = _strip_prefix(p.nodes, RE_QUESTION_START)
            if current is not None:
                blocks.append(current)
            current = _Block(number=label, first_nodes=rest_nodes, paragraphs=[])
            if rest_nodes:
                current.paragraphs.append(Paragraph(nodes=rest_nodes, style=p.style))
            continue
        if current is None:
            intro.append(p)
        else:
            current.paragraphs.append(p)
    if current is not None:
        blocks.append(current)
    return intro, blocks


def _classify_block(block: _Block) -> Question:
    mc_choices: List[Tuple[str, List]] = []
    tf_choices: List[Tuple[str, List]] = []
    stem_paras: List[Paragraph] = []
    answer_key_text: Optional[str] = None
    warnings: List[str] = []

    for p in block.paragraphs:
        if p.is_empty():
            continue
        text = p.plain_text()

        m_key = RE_ANSWER_KEY.match(text)
        if m_key:
            answer_key_text = m_key.group(1).strip()
            continue

        label, rest = _strip_prefix(p.nodes, RE_MC_LABEL)
        if label:
            mc_choices.append((label, rest))
            continue

        label, rest = _strip_prefix(p.nodes, RE_TF_LABEL)
        if label:
            tf_choices.append((label, rest))
            continue

        stem_paras.append(p)

    if mc_choices:
        kind = "mc4"
        choices = []
        correct_letter = None
        if answer_key_text:
            mk = re.match(r"^\s*([A-D])\b", answer_key_text, re.IGNORECASE)
            if mk:
                correct_letter = mk.group(1).upper()
        for label, nodes in mc_choices:
            correct = None
            if correct_letter:
                correct = label.upper() == correct_letter
            elif _has_strong_mark(nodes):
                correct = True
            choices.append(Choice(label=label.upper(), nodes=nodes, correct=correct))
        if correct_letter is None and not any(c.correct for c in choices):
            warnings.append(f"Cau {block.number}: chua xac dinh duoc dap an dung (A/B/C/D).")
        q = Question(kind=kind, stem=stem_paras, choices=choices,
                     original_number=block.number, warnings=warnings)
        return q

    if tf_choices:
        kind = "truefalse"
        choices = []
        key_map = {}
        if answer_key_text:
            for part in re.findall(r"([a-dA-D])\s*[-:=]?\s*(Đ|S|Đúng|Sai)", answer_key_text, re.IGNORECASE):
                lbl, val = part
                key_map[lbl.lower()] = val.lower().startswith("đ") or val.lower().startswith("d")
        for label, nodes in tf_choices:
            correct, nodes2 = _strip_trailing_true_false(nodes)
            if correct is None and label.lower() in key_map:
                correct = key_map[label.lower()]
            if correct is None:
                warnings.append(f"Cau {block.number}, y {label}) chua xac dinh Dung/Sai.")
            choices.append(Choice(label=label.lower(), nodes=nodes2, correct=correct))
        q = Question(kind=kind, stem=stem_paras, choices=choices,
                     original_number=block.number, warnings=warnings)
        return q

    # tra loi ngan
    if not answer_key_text:
        warnings.append(f"Cau {block.number}: khong tim thay dap an (dong 'Dap an: ...').")
    q = Question(kind="short", stem=stem_paras, short_answer=answer_key_text,
                 original_number=block.number, warnings=warnings)
    return q


def classify(paragraphs: List[Paragraph]) -> ExamDocument:
    intro, blocks = _split_blocks(paragraphs)
    doc = ExamDocument(intro=intro)
    for block in blocks:
        q = _classify_block(block)
        doc.warnings.extend(q.warnings)
        if q.kind == "mc4":
            doc.mc4.append(q)
        elif q.kind == "truefalse":
            doc.truefalse.append(q)
        else:
            doc.short.append(q)
    return doc
