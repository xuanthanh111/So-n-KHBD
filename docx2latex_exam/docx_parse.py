"""Doc file .docx va tach thanh danh sach Paragraph (model.py):
text co dinh dang, cong thuc (OMML hoac MathType OLE), va anh/hinh ve.
Moi thu duoc doc THEO DUNG THU TU xuat hien trong tai lieu goc."""
import zipfile
from pathlib import Path
from typing import Dict, List, Optional

from lxml import etree

from . import mtef, ole
from .model import ImageNode, LineBreak, MathNode, Paragraph, TextRun
from .omml2latex import omml_to_latex

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
M = "{http://schemas.openxmlformats.org/officeDocument/2006/math}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
V = "{urn:schemas-microsoft-com:vml}"
O = "{urn:schemas-microsoft-com:office:office}"


class DocxDocument:
    def __init__(self, docx_path, workdir):
        self.docx_path = Path(docx_path)
        self.workdir = Path(workdir)
        self.media_dir = self.workdir / "_raw_media"
        self.embed_dir = self.workdir / "_embeddings"
        self.images_dir = self.workdir / "images"
        self.warnings: List[str] = []

        with zipfile.ZipFile(self.docx_path) as zf:
            self.rels = self._load_rels(zf, "word/_rels/document.xml.rels")
            self.doc_xml = etree.fromstring(zf.read("word/document.xml"))
            self._extract_parts(zf)

    def _load_rels(self, zf, path) -> Dict[str, str]:
        try:
            data = zf.read(path)
        except KeyError:
            return {}
        root = etree.fromstring(data)
        return {rel.get("Id"): rel.get("Target") for rel in root}

    def _extract_parts(self, zf):
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.embed_dir.mkdir(parents=True, exist_ok=True)
        for name in zf.namelist():
            if name.startswith("word/media/"):
                target = self.media_dir / Path(name).name
                target.write_bytes(zf.read(name))
            elif name.startswith("word/embeddings/"):
                target = self.embed_dir / Path(name).name
                target.write_bytes(zf.read(name))

    def _rel_target(self, rid: Optional[str]) -> Optional[str]:
        if not rid:
            return None
        return self.rels.get(rid)

    def _media_file(self, rid: Optional[str]) -> Optional[Path]:
        target = self._rel_target(rid)
        if not target:
            return None
        p = self.media_dir / Path(target).name
        return p if p.exists() else None

    def _embed_file(self, rid: Optional[str]) -> Optional[Path]:
        target = self._rel_target(rid)
        if not target:
            return None
        p = self.embed_dir / Path(target).name
        return p if p.exists() else None

    def _image_node(self, src: Path) -> ImageNode:
        """Chi luu duong dan GOC o day; viec chuyen WMF/EMF -> PNG duoc
        gom lai va lam theo lo (batch) o pipeline.py de nhanh hon nhieu
        khi tai lieu co hang tram/nghin cong thuc (moi cong thuc la 1 anh)."""
        return ImageNode(path=str(src))

    # ------------------------------------------------------------------
    def paragraphs(self):
        body = self.doc_xml.find(f"{W}body")
        return list(self._iter_block(body))

    def _iter_block(self, container):
        out = []
        for child in container:
            tag = child.tag
            if tag == f"{W}p":
                out.append(self._parse_paragraph(child))
            elif tag == f"{W}tbl":
                for row in child.findall(f"{W}tr"):
                    for cell in row.findall(f"{W}tc"):
                        for p in cell.findall(f"{W}p"):
                            out.append(self._parse_paragraph(p))
        return out

    def _parse_paragraph(self, p) -> Paragraph:
        style = None
        num_id = ilvl = None
        pPr = p.find(f"{W}pPr")
        if pPr is not None:
            sty = pPr.find(f"{W}pStyle")
            if sty is not None:
                style = sty.get(f"{W}val")
            numPr = pPr.find(f"{W}numPr")
            if numPr is not None:
                nid = numPr.find(f"{W}numId")
                lvl = numPr.find(f"{W}ilvl")
                num_id = nid.get(f"{W}val") if nid is not None else None
                ilvl = lvl.get(f"{W}val") if lvl is not None else None
        nodes = []
        self._walk_inline(p, nodes)
        return Paragraph(nodes=nodes, style=style, num_id=num_id, ilvl=ilvl)

    def _walk_inline(self, container, nodes):
        for child in container:
            tag = child.tag
            if tag == f"{W}r":
                nodes.extend(self._parse_run(child))
            elif tag in (f"{M}oMath", f"{M}oMathPara"):
                try:
                    latex = omml_to_latex(child)
                except Exception as exc:
                    self.warnings.append(f"Loi doc cong thuc OMML: {exc}")
                    latex = ""
                if latex:
                    nodes.append(MathNode(latex=latex, display=(tag == f"{M}oMathPara")))
            elif tag == f"{W}hyperlink":
                self._walk_inline(child, nodes)
            elif tag == f"{W}ins":
                self._walk_inline(child, nodes)
            elif tag == f"{W}del":
                continue  # noi dung da bi xoa, khong dua vao ban chuyen doi
            elif tag == f"{W}smartTag":
                self._walk_inline(child, nodes)
            else:
                continue

    def _run_format(self, r):
        rPr = r.find(f"{W}rPr")
        bold = italic = underline = highlight = strike = False
        if rPr is not None:
            b = rPr.find(f"{W}b")
            bold = b is not None and b.get(f"{W}val") not in ("0", "false")
            i = rPr.find(f"{W}i")
            italic = i is not None and i.get(f"{W}val") not in ("0", "false")
            u = rPr.find(f"{W}u")
            underline = u is not None and u.get(f"{W}val") not in (None, "none")
            hl = rPr.find(f"{W}highlight")
            shd = rPr.find(f"{W}shd")
            highlight = (hl is not None and hl.get(f"{W}val") not in (None, "none", "clear")) or (
                shd is not None and shd.get(f"{W}fill") not in (None, "auto", "FFFFFF", "ffffff")
            )
            st = rPr.find(f"{W}strike")
            strike = st is not None and st.get(f"{W}val") not in ("0", "false")
        return bold, italic, underline, highlight, strike

    def _parse_run(self, r):
        bold, italic, underline, highlight, strike = self._run_format(r)
        out = []
        for child in r:
            tag = child.tag
            if tag == f"{W}t":
                text = child.text or ""
                if text:
                    out.append(TextRun(text, bold, italic, underline, highlight, strike))
            elif tag == f"{W}tab":
                out.append(TextRun("\t", bold, italic, underline, highlight, strike))
            elif tag in (f"{W}br", f"{W}cr"):
                out.append(LineBreak())
            elif tag == f"{W}drawing":
                node = self._parse_drawing(child)
                if node:
                    out.append(node)
            elif tag == f"{W}object":
                node = self._parse_object(child)
                if node:
                    out.append(node)
            elif tag == f"{W}pict":
                node = self._parse_pict(child)
                if node:
                    out.append(node)
        return out

    def _parse_drawing(self, drawing) -> Optional[ImageNode]:
        blip = drawing.find(f".//{A}blip")
        if blip is None:
            return None
        rid = blip.get(f"{R}embed")
        src = self._media_file(rid)
        if src is None:
            return None
        return self._image_node(src)

    def _parse_pict(self, pict) -> Optional[ImageNode]:
        imagedata = pict.find(f".//{V}imagedata")
        if imagedata is None:
            return None
        rid = imagedata.get(f"{R}id")
        src = self._media_file(rid)
        if src is None:
            return None
        return self._image_node(src)

    def _parse_object(self, obj):
        """w:object thuong chua ca preview (v:shape/v:imagedata) va
        lien ket toi OLE goc (o:OLEObject, vi du cong thuc MathType)."""
        ole_el = obj.find(f"{O}OLEObject")
        preview = obj.find(f".//{V}imagedata")
        preview_path = None
        if preview is not None:
            rid = preview.get(f"{R}id")
            src = self._media_file(rid)
            if src is not None:
                preview_path = src

        prog_id = ole_el.get("ProgID", "") if ole_el is not None else ""
        is_equation = "Equation" in prog_id or "MathType" in prog_id

        if ole_el is not None and is_equation:
            rid = ole_el.get(f"{R}id")
            bin_path = self._embed_file(rid)
            if bin_path is not None:
                try:
                    native = ole.extract_equation_native(str(bin_path))
                    if native is None:
                        raise mtef.MTEFUnsupported("khong co stream Equation Native")
                    latex = mtef.mtef_to_latex(native)
                    return MathNode(latex=latex, display=False)
                except mtef.MTEFUnsupported as exc:
                    self.warnings.append(
                        f"Cong thuc MathType phuc tap ({exc}) -> chen anh preview thay vi LaTeX."
                    )
                except Exception as exc:
                    self.warnings.append(f"Loi doc OLE MathType: {exc}")
            if preview_path is not None:
                node = self._image_node(preview_path)
                node.caption = "cong-thuc-mathtype"
                return node
            return None

        if preview_path is not None:
            return self._image_node(preview_path)
        return None
