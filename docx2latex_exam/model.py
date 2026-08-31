"""Cac cau truc du lieu trung gian dung xuyen suot pipeline."""
from dataclasses import dataclass, field
from typing import List, Optional, Union


@dataclass
class TextRun:
    text: str
    bold: bool = False
    italic: bool = False
    underline: bool = False
    highlight: bool = False
    strike: bool = False


@dataclass
class MathNode:
    latex: str
    display: bool = False
    is_image_fallback: bool = False


@dataclass
class ImageNode:
    path: str
    caption: Optional[str] = None


@dataclass
class LineBreak:
    pass


Node = Union[TextRun, MathNode, ImageNode, LineBreak]


@dataclass
class Paragraph:
    nodes: List[Node] = field(default_factory=list)
    style: Optional[str] = None
    num_id: Optional[str] = None
    ilvl: Optional[str] = None

    def plain_text(self) -> str:
        return "".join(n.text for n in self.nodes if isinstance(n, TextRun))

    def is_empty(self) -> bool:
        for n in self.nodes:
            if isinstance(n, TextRun) and n.text.strip():
                return False
            if isinstance(n, (MathNode, ImageNode)):
                return False
        return True


@dataclass
class Choice:
    label: str
    nodes: List[Node] = field(default_factory=list)
    correct: Optional[bool] = None


@dataclass
class Question:
    kind: str  # "mc4" | "truefalse" | "short"
    stem: List[Paragraph] = field(default_factory=list)
    choices: List[Choice] = field(default_factory=list)
    short_answer: Optional[str] = None
    original_number: Optional[str] = None
    warnings: List[str] = field(default_factory=list)


@dataclass
class ExamDocument:
    intro: List[Paragraph] = field(default_factory=list)
    mc4: List[Question] = field(default_factory=list)
    truefalse: List[Question] = field(default_factory=list)
    short: List[Question] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
