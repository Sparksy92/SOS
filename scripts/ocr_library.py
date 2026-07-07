import os
import sys
import base64
import json
import urllib.request
import fitz  # PyMuPDF

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llava:7b"

# Directories to scan for manuals
SCAN_DIRS = [
    r"ATL",
    r"ENCYCLOPEDIAS AND KNOWLEDGE PART I",
    r"ENCYCLOPEDIAS AND KNOWLEDGE PART II",
    r"Great Science Textbooks DVD Library (Entire Collection 88.9 GB)",
    r"The Ark",
    r"CD3WD Extracted Manuals"
]

def check_ollama():
    try:
        req = urllib.request.Request(f"http://localhost:11434/api/tags")
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            models = [m['name'] for m in data.get('models', [])]
            if MODEL_NAME not in models and f"{MODEL_NAME}:latest" not in models:
                print(f"Error: Model '{MODEL_NAME}' is not downloaded in Ollama.")
                print(f"Please run 'ollama pull {MODEL_NAME}' first.")
                sys.exit(1)
            return True
    except Exception as e:
        print(f"Error: Cannot connect to Ollama server. Make sure Ollama is running! ({e})")
        sys.exit(1)

def is_scanned_pdf(pdf_path):
    """
    Checks if a PDF is a scanned image-only document by reading the text length of the first few pages.
    If average text content is less than 100 characters per page, it's considered scanned.
    """
    try:
        doc = fitz.open(pdf_path)
        total_text = ""
        check_pages = min(5, len(doc))
        for i in range(check_pages):
            total_text += doc.load_page(i).get_text()
        
        avg_len = len(total_text) / check_pages if check_pages > 0 else 0
        return avg_len < 100
    except Exception as e:
        print(f"Error reading PDF text info for {pdf_path}: {e}")
        return False

def ocr_page(img_b64):
    prompt = (
        "This is an image of a scanned page from a technical document. "
        "Please transcribe all the visible text on this page into clean Markdown. "
        "Preserve tables, lists, code, and math formatting. "
        "Do not write descriptions or commentary. Just return the transcribed text exactly as it is."
    )
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "images": [img_b64],
        "stream": False
    }
    
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(OLLAMA_URL, data=req_data, headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        return res_data.get('response', '')

def process_pdf(pdf_path):
    base_dir = os.path.dirname(pdf_path)
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    
    # markdown_materials folder next to the PDF
    md_dir = os.path.join(base_dir, "markdown_materials")
    md_path = os.path.join(md_dir, f"{base_name}.md")
    
    # Skip if already OCR'd
    if os.path.exists(md_path):
        return
        
    # Skip if it is not a scanned PDF (already searchable, so text loader indexes it)
    if not is_scanned_pdf(pdf_path):
        return
        
    print(f"\n[OCR ACTIVE] Scanned PDF detected: {pdf_path}")
    print(f"Rendering pages and transcribing using local {MODEL_NAME} GPU model...")
    
    os.makedirs(md_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    md_content = []
    
    for page_num in range(len(doc)):
        print(f"  -> Transcribing page {page_num + 1}/{len(doc)}...")
        try:
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=150)
            img_data = pix.tobytes("png")
            img_b64 = base64.b64encode(img_data).decode('utf-8')
            
            page_text = ocr_page(img_b64)
            md_content.append(f"<!-- PAGE {page_num + 1} -->\n{page_text}\n")
        except Exception as e:
            print(f"  ⚠ Error transcribing page {page_num + 1}: {e}")
            md_content.append(f"<!-- PAGE {page_num + 1} ERROR: {e} -->\n")
            
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(md_content))
        
    print(f"✔ Completed. Saved OCR markdown to: {md_path}")

def run_ocr(root_path):
    check_ollama()
    print("Ollama connected. Starting library scan...")
    
    for scan_sub in SCAN_DIRS:
        scan_path = os.path.join(root_path, scan_sub)
        if not os.path.exists(scan_path):
            continue
            
        print(f"Scanning directory: {scan_path}")
        for root, dirs, files in os.walk(scan_path):
            # Ignore existing markdown_materials folders
            if "markdown_materials" in dirs:
                dirs.remove("markdown_materials")
            
            for file in files:
                if file.lower().endswith('.pdf'):
                    full_path = os.path.join(root, file)
                    try:
                        process_pdf(full_path)
                    except Exception as e:
                        print(f"Failed to process {file}: {e}")

if __name__ == "__main__":
    # Root folder is the parent of the scripts directory (project root)
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Initializing OCR Pipeline on: {script_dir}")
    run_ocr(script_dir)
