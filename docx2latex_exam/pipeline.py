import tempfile
from pathlib import Path
from typing import List

from . import media
from .classify import classify
from .docx_parse import DocxDocument
from .model import ImageNode
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

        image_nodes = [n for p in paragraphs for n in p.nodes if isinstance(n, ImageNode)]
        to_convert = [Path(n.path) for n in image_nodes if media.needs_conversion(Path(n.path))]
        to_copy = [Path(n.path) for n in image_nodes if not media.needs_conversion(Path(n.path))]

        converted = media.convert_batch(to_convert, images_dir)
        copied = media.copy_plain(to_copy, images_dir)

        warnings = list(doc.warnings)
        if to_convert and not media.soffice_available():
            warnings.append(
                f"Khong tim thay LibreOffice de chuyen {len(to_convert)} anh WMF/EMF sang PNG "
                "- cac anh nay se bi thieu trong file .tex. Hay cai libreoffice roi chay lai."
            )

        for n in image_nodes:
            src = n.path
            final = converted.get(src) or copied.get(src)
            if final is None:
                warnings.append(f"Khong the chuyen doi anh: {src}")
                n.path = ""
            else:
                n.path = f"images/{final.name}"

        exam = classify(paragraphs)
        tex = render_document(exam)

        tex_path = output_dir / tex_filename
        tex_path.write_text(tex, encoding="utf-8")

        warnings.extend(exam.warnings)
        return warnings
