"""Doc stream 'Equation Native' tu file OLE compound (oleObjectN.bin) - la
noi Word nhung cong thuc MathType/Equation Editor kieu OLE co dien."""
from typing import Optional

import olefile


def extract_equation_native(ole_path: str) -> Optional[bytes]:
    if not olefile.isOleFile(ole_path):
        return None
    with olefile.OleFileIO(ole_path) as ole:
        for entry in ole.listdir():
            name = entry[-1]
            if name.replace("\x00", "").strip().lower() == "equation native":
                with ole.openstream(entry) as stream:
                    return stream.read()
    return None
