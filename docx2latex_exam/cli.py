import argparse
import sys

from .pipeline import convert


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="docx2latex-exam",
        description="Chuyen de thi Word (.docx, cong thuc MathType/OMML, dang TN THPT) sang LaTeX.",
    )
    parser.add_argument("input", help="File .docx dau vao")
    parser.add_argument("-o", "--output", default="out", help="Thu muc dau ra (mac dinh: out)")
    parser.add_argument("--name", default="de_thi.tex", help="Ten file .tex dau ra")
    args = parser.parse_args(argv)

    warnings = convert(args.input, args.output, args.name)

    print(f"Da tao: {args.output}/{args.name}")
    print(f"Anh (neu co) trong: {args.output}/images/")
    if warnings:
        print(f"\nCo {len(warnings)} canh bao can kiem tra lai bang tay:")
        for w in warnings:
            print(f"  - {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
