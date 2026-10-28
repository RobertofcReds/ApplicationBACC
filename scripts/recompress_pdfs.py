#!/usr/bin/env python
"""
recompress_pdfs.py — Recomprime les PDF scannés de assets/pdfs.

Pour chaque PDF > seuil (defaut 600 Ko) : re-rendu des pages en JPEG
(150 dpi, qualite 60) puis reassemblage en PDF avec PyMuPDF.
Ecrit dans un miroir assets/pdfs_opt/ et affiche le gain.

Usage : python recompress_pdfs.py [seuil_ko] [dpi] [qualite_jpeg]
"""
import sys
from pathlib import Path
import fitz  # PyMuPDF

SRC = Path("assets/pdfs")
DST = Path("assets/pdfs_opt")
SEUIL_KO = int(sys.argv[1]) if len(sys.argv) > 1 else 600
DPI = int(sys.argv[2]) if len(sys.argv) > 2 else 150
QUALITE = int(sys.argv[3]) if len(sys.argv) > 3 else 60

ZOOM = DPI / 72.0
MAT = fitz.Matrix(ZOOM, ZOOM)


def compress_pdf(src: Path, dst: Path) -> tuple[int, int]:
    doc = fitz.open(src)
    out = fitz.open()
    for page in doc:
        pix = page.get_pixmap(matrix=MAT, alpha=False)
        jpeg = pix.tobytes("jpeg", jpg_quality=QUALITE)
        img = out.new_page(width=page.rect.width, height=page.rect.height)
        img.insert_image(img.rect, stream=jpeg)
    tmp = dst.with_suffix(".tmp.pdf")
    out.save(tmp, garbage=4, deflate=True)
    out.close()
    doc.close()
    # garde le plus petit des deux (les PDF vectoriels peuvent grossir)
    if tmp.stat().st_size < src.stat().st_size:
        tmp.replace(dst)
    else:
        tmp.unlink()
        dst.write_bytes(src.read_bytes())
    return src.stat().st_size, dst.stat().st_size


def main() -> None:
    total_avant = total_apres = 0
    n = 0
    pdfs = sorted(SRC.rglob("*.pdf"))
    print(f"{len(pdfs)} PDF, seuil {SEUIL_KO} Ko, {DPI} dpi, q{QUALITE}\n")
    for src in pdfs:
        rel = src.relative_to(SRC)
        dst = DST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        avant = src.stat().st_size
        if avant <= SEUIL_KO * 1024:
            # copie telle quelle (deja compact)
            dst.write_bytes(src.read_bytes())
            total_avant += avant
            total_apres += avant
            continue
        try:
            a, b = compress_pdf(src, dst)
        except Exception as e:
            print(f"  !! ECHEC {rel} : {e} -> copie brute")
            dst.write_bytes(src.read_bytes())
            total_avant += avant
            total_apres += avant
            continue
        total_avant += avant
        total_apres += dst.stat().st_size
        n += 1
        gagne = 100 - 100 * dst.stat().st_size // max(1, avant)
        print(f"  {rel.name}: {avant // 1024} -> {dst.stat().st_size // 1024} Ko (-{max(0, gagne)}%)")
    print(
        f"\nTOTAL: {total_avant // 1048576} Mo -> {total_apres // 1048576} Mo "
        f"(-{100 - 100 * total_apres // max(1, total_avant)}%), {n} recompresses"
    )


if __name__ == "__main__":
    main()
