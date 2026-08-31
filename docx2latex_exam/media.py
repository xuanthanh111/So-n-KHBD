"""Chuyen doi anh WMF/EMF (dinh dang Windows Metafile hay dung cho preview
cong thuc MathType va mot so hinh ve chen tu clipboard) sang PNG, dung
LibreOffice headless - vi pdflatex/xelatex khong doc truc tiep duoc WMF/EMF.
Anh JPG/PNG/GIF... khong can chuyen, giu nguyen (khong ve lai).

Mot de thi thuc te co the co hang nghin cong thuc MathType (moi cong thuc =
1 anh WMF preview). Goi soffice rieng cho tung file se rat cham (moi lan
khoi dong LibreOffice ton 1-2s). Vi vay ham convert_batch() gom nhieu file
vao MOT (hoac vai) lan goi soffice duy nhat."""
import shutil
import struct
import subprocess
import zlib
from pathlib import Path
from typing import Dict, Iterable, List

CONVERTIBLE = {".wmf", ".emf"}

_soffice = shutil.which("soffice") or shutil.which("libreoffice")


def needs_conversion(path: Path) -> bool:
    return path.suffix.lower() in CONVERTIBLE


def _is_valid_png(path: Path) -> bool:
    """Kiem tra CRC cua tung chunk PNG. Chuyen doi hang loat qua LibreOffice
    hiem khi tao ra file PNG bi hong (VD 1/1484 anh trong 1 lan chay thuc
    te) - can phat hien de convert lai, khong de xelatex bao loi kho hieu
    hoac thoat dot ngot khi doc phai anh hong."""
    try:
        data = path.read_bytes()
    except OSError:
        return False
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return False
    pos = 8
    while pos + 8 <= len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk_data = data[pos + 8:pos + 8 + length]
        crc_field = data[pos + 8 + length:pos + 8 + length + 4]
        if len(chunk_data) != length or len(crc_field) != 4:
            return False
        if zlib.crc32(ctype + chunk_data) & 0xFFFFFFFF != struct.unpack(">I", crc_field)[0]:
            return False
        pos += 8 + length + 4
        if ctype == b"IEND":
            return True
    return False


def _run_soffice(files: List[Path], out_dir: Path, timeout: int):
    subprocess.run(
        [_soffice, "--headless", "--convert-to", "png", "--outdir", str(out_dir)]
        + [str(p) for p in files],
        check=False, capture_output=True, timeout=timeout,
    )


def _autocrop(path: Path) -> None:
    """LibreOffice xuat WMF/EMF sang PNG bang ca 1 trang A4 (~794x1123px)
    voi hinh ve/cong thuc thuc su chi chiem 1 vung nho o giua - neu khong
    cat bo phan trang trong/trang thua, khi thu nho cong thuc ve co chu
    (vi du chen inline) no gan nhu bien mat. Cat theo vung khac nen
    (trong suot hoac trang)."""
    try:
        from PIL import Image, ImageChops
    except ImportError:
        return
    try:
        im = Image.open(path).convert("RGBA")
    except Exception:
        return
    bbox = im.split()[-1].getbbox()  # vung khong trong suot
    if bbox is None:
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bbox = ImageChops.difference(im.convert("RGB").convert("RGBA"), bg).getbbox()
    if not bbox or bbox == (0, 0, im.width, im.height):
        return
    pad = 3
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(im.width, right + pad)
    bottom = min(im.height, bottom + pad)
    im.crop((left, top, right, bottom)).save(path)


def convert_batch(paths: Iterable[Path], out_dir: Path, chunk_size: int = 150,
                   timeout: int = 900) -> Dict[str, Path]:
    """Chuyen mot loat file WMF/EMF sang PNG trong out_dir. Tra ve dict
    {duong_dan_goc (str): duong_dan_png}. Bo qua (khong loi) neu khong
    tim thay LibreOffice - goi sau se tu phat hien anh chua duoc chuyen."""
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = list(dict.fromkeys(paths))  # bo trung, giu thu tu
    result: Dict[str, Path] = {}
    todo: List[Path] = []
    for p in paths:
        target = out_dir / (p.stem + ".png")
        if target.exists() and _is_valid_png(target):
            result[str(p)] = target
        else:
            todo.append(p)
    if not todo or _soffice is None:
        return result

    for i in range(0, len(todo), chunk_size):
        chunk = todo[i:i + chunk_size]
        _run_soffice(chunk, out_dir, timeout)

    retry: List[Path] = []
    for p in todo:
        target = out_dir / (p.stem + ".png")
        if target.exists() and _is_valid_png(target):
            _autocrop(target)
            result[str(p)] = target
        else:
            retry.append(p)

    # Convert hang loat hiem khi lam hong 1 vai file (VD ghi de bi ngat
    # giua chung) - thu lai TUNG FILE MOT (it rui ro hon) cho nhung anh
    # bi thieu hoac bi hong.
    for p in retry:
        target = out_dir / (p.stem + ".png")
        if target.exists():
            target.unlink()
        _run_soffice([p], out_dir, timeout=60)
        if target.exists() and _is_valid_png(target):
            _autocrop(target)
            result[str(p)] = target
    return result


def copy_plain(paths: Iterable[Path], out_dir: Path) -> Dict[str, Path]:
    """Copy nguyen ban cac anh khong can chuyen doi (png/jpg/...) vao out_dir.

    File .docx thuc te doi khi da chua san 1 anh PNG bi hong tu truoc (loi
    khi luu/paste trong Word, khong lien quan gi den cong cu nay) - PNG hong
    se khien xelatex/libpng THOAT DOT NGOT khi bien dich, nen can kiem tra
    va thu "sua" bang cach cho LibreOffice doc lai roi xuat PNG moi; neu
    khong sua duoc thi bo qua anh do (khong chen vao .tex) thay vi lam
    hong ca file bien dich."""
    out_dir.mkdir(parents=True, exist_ok=True)
    result: Dict[str, Path] = {}
    for p in dict.fromkeys(paths):
        target = out_dir / p.name
        if not target.exists():
            shutil.copyfile(p, target)
        if target.suffix.lower() == ".png" and not _is_valid_png(target):
            if _soffice is not None:
                target.unlink()
                _run_soffice([p], out_dir, timeout=60)
            if not target.exists() or not _is_valid_png(target):
                if target.exists():
                    target.unlink()
                continue  # khong sua duoc - bo qua, khong dua anh hong vao .tex
        result[str(p)] = target
    return result


def soffice_available() -> bool:
    return _soffice is not None
