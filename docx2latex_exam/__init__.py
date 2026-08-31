"""docx2latex_exam: chuyen de thi Word (.docx) sang LaTeX.

Ho tro cong thuc toan (OMML native + MathType OLE co dien), hinh ve/do thi
chen dung vi tri (khong ve lai), va 3 dang cau hoi TN THPT: trac nghiem 4
dap an, dung/sai, tra loi ngan.
"""
from .pipeline import convert

__all__ = ["convert"]
