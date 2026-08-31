"""Chuyen doi anh WMF/EMF (dinh dang Windows Metafile hay dung cho preview
cong thuc MathType va mot so hinh ve chen tu clipboard) sang PNG, dung
LibreOffice headless - vi pdflatex/xelatex khong doc truc tiep duoc WMF/EMF.
Anh JPG/PNG/GIF... khong can chuyen, giu nguyen (khong ve lai)."""
import shutil
import subprocess
from pathlib import Path

CONVERTIBLE = {".wmf", ".emf"}
NATIVE = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".pdf"}

_soffice = shutil.which("soffice") or shutil.which("libreoffice")


def needs_conversion(path: Path) -> bool:
    return path.suffix.lower() in CONVERTIBLE


def convert_to_png(src: Path, out_dir: Path) -> Path:
    """Tra ve duong dan PNG da chuyen. Neu khong co LibreOffice, gan lai
    duoi .png (nguoi dung tu chuyen bang cong cu khac) va bao loi ro rang."""
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / (src.stem + ".png")
    if target.exists():
        return target
    if _soffice is None:
        raise RuntimeError(
            f"Khong tim thay LibreOffice (soffice) de chuyen doi {src.name} sang PNG. "
            "Hay cai libreoffice hoac tu chuyen doi file nay bang tay."
        )
    subprocess.run(
        [_soffice, "--headless", "--convert-to", "png", "--outdir", str(out_dir), str(src)],
        check=True, capture_output=True, timeout=60,
    )
    if not target.exists():
        raise RuntimeError(f"LibreOffice khong tao duoc {target}")
    return target


def ensure_latex_compatible(src: Path, out_dir: Path) -> Path:
    """Dam bao anh dung duoc trong LaTeX (pdflatex/xelatex): chuyen WMF/EMF
    sang PNG, con lai copy nguyen ban vao out_dir."""
    suffix = src.suffix.lower()
    if suffix in CONVERTIBLE:
        return convert_to_png(src, out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / src.name
    if not target.exists():
        shutil.copyfile(src, target)
    return target
