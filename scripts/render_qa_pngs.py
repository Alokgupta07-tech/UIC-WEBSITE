import sys
from pathlib import Path
import pypdfium2 as pdfium

def convert_pdfs(pdf_dir, output_dir):
    pdf_dir = Path(pdf_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for pdf_path in pdf_dir.glob("*.pdf"):
        print(f"Rendering {pdf_path.name} to PNG...")
        pdf = pdfium.PdfDocument(pdf_path)
        page = pdf[0]
        # 150 DPI for crisp visual inspection
        image = page.render(scale=150/72).to_pil()
        out_file = output_dir / f"{pdf_path.stem}.png"
        image.save(out_file)
        print(f"Saved {out_file} ({image.size})")

if __name__ == "__main__":
    pdf_dir = sys.argv[1] if len(sys.argv) > 1 else ".tmp-certificate-qa"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else ".tmp-certificate-qa"
    convert_pdfs(pdf_dir, output_dir)

