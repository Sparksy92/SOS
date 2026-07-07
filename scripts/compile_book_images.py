#!/usr/bin/env python3
import os
import sys
import re
import glob
import fitz  # PyMuPDF

def natural_keys(text):
    """
    Key function for natural sorting of alphanumeric strings.
    E.g., "page_2.png" will sort before "page_10.png".
    """
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', text)]

def compile_images_to_pdf(book_folder, output_pdf_path):
    """
    Compiles all images inside book_folder into a single PDF at output_pdf_path.
    """
    # Supported image extensions
    valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.gif')
    
    # Get all image files in the directory
    all_files = os.listdir(book_folder)
    img_files = [f for f in all_files if f.lower().endswith(valid_exts)]
    
    if not img_files:
        print(f"  ⚠ No images found in: {book_folder}")
        return False
    
    # Sort files naturally
    img_files.sort(key=natural_keys)
    
    print(f"  -> Found {len(img_files)} images. Compiling...")
    
    doc = fitz.open()  # Create a new empty PDF document
    
    for idx, img_name in enumerate(img_files):
        img_path = os.path.join(book_folder, img_name)
        try:
            # Open the image file
            img_doc = fitz.open(img_path)
            # Convert image to PDF page stream
            pdf_bytes = img_doc.convert_to_pdf()
            img_doc.close()
            
            # Insert the page
            img_page = fitz.open("pdf", pdf_bytes)
            doc.insert_pdf(img_page)
            img_page.close()
            
            if (idx + 1) % 10 == 0 or (idx + 1) == len(img_files):
                print(f"     Processed {idx + 1}/{len(img_files)} pages...")
        except Exception as e:
            print(f"  ⚠ Error adding image {img_name}: {e}")
            
    # Save the compiled PDF
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
    doc.save(output_pdf_path)
    doc.close()
    
    print(f"  ✔ Saved PDF to: {output_pdf_path}")
    return True

def main():
    print("==========================================================")
    print("      SURVIVAL OS BOOK IMAGE COMPILER & ORGANIZER")
    print("==========================================================")
    
    # Get paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.abspath(os.path.join(script_dir, ".."))
    
    # Default directories
    default_input = os.path.join(workspace_root, "import-staging", "book-images-staging")
    default_output = os.path.join(workspace_root, "CD3WD Extracted Manuals")
    
    input_dir = input(f"Enter folder containing book image subdirectories\n[default: {default_input}]: ").strip()
    if not input_dir:
        input_dir = default_input
        
    output_dir = input(f"Enter target library folder for compiled PDFs\n[default: {output_dir}]: ").strip()
    if not output_dir:
        output_dir = default_output
        
    if not os.path.exists(input_dir):
        print(f"\nCreating staging directory: {input_dir}")
        print("Please copy your folders of book images there and run this script again.")
        os.makedirs(input_dir, exist_ok=True)
        return
        
    # Scan subdirectories
    subdirs = [d for d in os.listdir(input_dir) if os.path.isdir(os.path.join(input_dir, d))]
    
    if not subdirs:
        print(f"\nNo book folders found in {input_dir}.")
        print("Create a folder for each book (e.g. 'Water Purification Manual') containing its page images, then re-run.")
        return
        
    print(f"\nFound {len(subdirs)} book folder(s) to process.")
    
    success_count = 0
    for subdir in subdirs:
        book_folder = os.path.join(input_dir, subdir)
        pdf_filename = f"{subdir}.pdf"
        output_pdf_path = os.path.join(output_dir, pdf_filename)
        
        print(f"\nProcessing book: {subdir}")
        if compile_images_to_pdf(book_folder, output_pdf_path):
            success_count += 1
            
    print("\n==========================================================")
    print(f"Compilation finished! Successfully compiled {success_count}/{len(subdirs)} books.")
    print(f"Location: {output_dir}")
    print("Next step: Run 'run_ocr.bat' to transcribe them for J.A.R.V.I.S.")
    print("==========================================================")

if __name__ == "__main__":
    main()
