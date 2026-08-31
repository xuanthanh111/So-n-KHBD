import shutil
import tempfile
from pathlib import Path
from typing import List

from .classify import classify
from .docx_parse import DocxDocument
from .render_tex import render_document


def convert(docx_path: str, output_dir: str, tex_filename: str = "de_thi.tex") -> List[str]:
    """Chuyen 1 file .docx sang thu muc output_dir chua file .tex + images/.
    Tra ve danh sach canh bao (neu co, vd cong thuc/dap an chua nhan dien duoc)."""
    docx_path = Path(docx_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = output_dir / "images"
    images_dir.mkdir(exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="docx2latex_") as tmp:
        doc = DocxDocument(docx_path, tmp)
        paragraphs = doc.paragraphs()

        # Chuyen anh sang thu muc dich va sua duong dan trong cac ImageNode
        # thanh duong dan tuong doi (dung trong \includegraphics).
        from .model import ImageNode
        for p in paragraphs:
            for n in p.nodes:
                if isinstance(n, ImageNode):
                    src = Path(n.path)
                    dst = images_dir / src.name
                    if src.resolve() != dst.resolve():
                        shutil.copyfile(src, dst)
                    n.path = f"images/{dst.name}"

        exam = classify(paragraphs)
        tex = render_document(exam)

        tex_path = output_dir / tex_filename
        tex_path.write_text(tex, encoding="utf-8")

        warnings = list(doc.warnings) + list(exam.warnings)
        return warnings
