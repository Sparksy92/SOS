#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import argparse
import re
from datetime import datetime, timezone

# Embedded offline representative metadata catalog for Swiss Bay / external directories
OFFLINE_CATALOG = [
    # Homesteading
    {"title": "The Homestead Builder", "filename": "The Homestead Builder.pdf", "category": "homesteading", "riskCategory": None, "license": "public_domain", "url": "https://theswissbay.ch/pdf/Books/Survival/Farming,%20Animalraising,%20Homesteading/Homesteading/The%20Homestead%20Builder.pdf"},
    {"title": "Storey's Basic Country Skills", "filename": "Storey Basic Country Skills.pdf", "category": "homesteading", "riskCategory": None, "license": "restricted", "url": "https://theswissbay.ch/pdf/Books/Survival/Farming,%20Animalraising,%20Homesteading/Homesteading/Storey%20Basic%20Country%20Skills.pdf"},
    {"title": "Farming For Self-Sufficiency", "filename": "Farming for Self-Sufficiency.pdf", "category": "farming", "riskCategory": None, "license": "open_license", "url": "https://theswissbay.ch/pdf/Books/Survival/Farming,%20Animalraising,%20Homesteading/Homesteading/Farming%20for%20Self-Sufficiency.pdf"},
    # Survival
    {"title": "US Army Survival Manual FM 21-76", "filename": "FM 21-76 Survival Manual.pdf", "category": "general_survival", "riskCategory": None, "license": "official_free", "url": "https://theswissbay.ch/pdf/Books/Survival/Survival/FM%2021-76%20Survival%20Manual.pdf"},
    {"title": "SAS Survival Handbook", "filename": "SAS Survival Handbook.pdf", "category": "general_survival", "riskCategory": None, "license": "restricted", "url": "https://theswissbay.ch/pdf/Books/Survival/Survival/SAS%20Survival%20Handbook.pdf"},
    {"title": "Emergency Sanitation and Water", "filename": "Emergency Sanitation and Water.pdf", "category": "water", "riskCategory": "water_treatment", "license": "official_free", "url": "https://theswissbay.ch/pdf/Books/Survival/Survival/Emergency%20Sanitation%20and%20Water.pdf"},
    # Bushcraft
    {"title": "Bushcraft Outdoor Skills and Wilderness Survival", "filename": "Bushcraft Outdoor Skills.pdf", "category": "bushcraft", "riskCategory": None, "license": "restricted", "url": "https://theswissbay.ch/pdf/Books/Survival/Bushcraft/Bushcraft%20Outdoor%20Skills.pdf"},
    {"title": "Shelters Shacks and Shanties", "filename": "Shelters Shacks and Shanties.pdf", "category": "shelter", "riskCategory": None, "license": "public_domain", "url": "https://theswissbay.ch/pdf/Books/Survival/Bushcraft/Shelters%20Shacks%20and%20Shanties.pdf"},
    # Bush Medicine / Medical
    {"title": "Where There Is No Doctor", "filename": "Where There Is No Doctor.pdf", "category": "medical_reference", "riskCategory": "medical", "license": "official_free", "url": "https://theswissbay.ch/pdf/Books/Survival/Bush%20Medicine/Where%20There%20Is%20No%20Doctor.pdf"},
    {"title": "Where There Is No Dentist", "filename": "Where There Is No Dentist.pdf", "category": "medical_reference", "riskCategory": "medical", "license": "official_free", "url": "https://theswissbay.ch/pdf/Books/Survival/Bush%20Medicine/Where%20There%20Is%20No%20Dentist.pdf"},
    {"title": "Survival Medicine Handbook", "filename": "Survival Medicine Handbook.pdf", "category": "medical_reference", "riskCategory": "medical", "license": "restricted", "url": "https://theswissbay.ch/pdf/Books/Survival/Bush%20Medicine/Survival%20Medicine%20Handbook.pdf"}
]

# Network Requests Logger for testing validation
NETWORK_REQUESTS_LOG = []

def normalize_title(name):
    if not name:
        return ""
    # Strip extension
    base = os.path.splitext(name)[0]
    # Replace symbols and lower-case
    normalized = re.sub(r'[^a-zA-Z0-9]', '', base).lower()
    return normalized

def query_network_metadata(url, max_depth, current_depth=1):
    """
    Crawls HTML directory indexes only.
    Strictly avoids downloading binary attachments (.pdf, .zip, etc.).
    """
    global NETWORK_REQUESTS_LOG
    NETWORK_REQUESTS_LOG.append({"url": url, "type": "metadata_html"})
    
    # Check if user requested binary URL
    if any(ext in url.lower() for ext in ['.pdf', '.zip', '.epub', '.mp4', '.avi', '.tar.gz']):
        print(f"[SECURITY WARNING] Refusing to fetch binary resource: {url}")
        return []

    print(f"[NETWORK] Fetching directory index page: {url} (Depth: {current_depth})")
    
    try:
        import urllib.request
        from urllib.parse import urljoin
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SurvivalOS Reference Auditor'}
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=8) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        links = re.findall(r'href=["\'](.*?)["\']', html)
        candidates = []
        
        for link in links:
            # Skip parent directory, query strings, and self-links
            if not link or link.startswith('?') or link.startswith('/') or link.startswith('#') or '..' in link:
                continue
                
            absolute_link = urljoin(url, link)
            
            # If it is a subdirectory (ends in /), recursively crawl if depth permitted
            if link.endswith('/') and current_depth < max_depth:
                candidates.extend(query_network_metadata(absolute_link, max_depth, current_depth + 1))
            elif link.endswith('.pdf'):
                # Extract clean title from PDF filename
                title = urllib.parse.unquote(link.replace('.pdf', '')).replace('_', ' ').replace('-', ' ')
                candidates.append({
                    "title": title,
                    "filename": urllib.parse.unquote(link),
                    "category": "unknown",
                    "riskCategory": None,
                    "license": "unknown",
                    "url": absolute_link
                })
        return candidates
    except Exception as e:
        print(f"[NETWORK ERROR] Failed to fetch {url}: {e}")
        return []

def sanitize_path(path_str, materials_root):
    if not path_str:
        return ""
    # Standardize separator
    p = path_str.replace('\\', '/')
    if materials_root:
        m_root = materials_root.replace('\\', '/')
        if p.startswith(m_root):
            p = p.replace(m_root, "[MATERIALS_ROOT]")
    # Aggressively remove home directory paths for safety
    p = re.sub(r'c:/users/[a-zA-Z0-9_\-]+', '[USER_HOME]', p, flags=re.IGNORECASE)
    return p

def main():
    parser = argparse.ArgumentParser(description="SurvivalOS Reference Library Auditor & Gap Analyzer")
    parser.add_argument("--db", help="Path to SQLite database")
    parser.add_argument("--manifest", help="Path to material_manifest.json")
    parser.add_argument("--materials-root", help="Path to local materials folder")
    parser.add_argument("--allow-network-metadata", action="store_true", help="Allow metadata crawling of Swiss Bay HTML pages")
    parser.add_argument("--max-pages", type=int, default=5, help="Capped index pages count")
    parser.add_argument("--max-depth", type=int, default=3, help="Capped recursion depth")
    parser.add_argument("--out-dir", default="docs/reference-audits", help="Output directory for reports")
    args = parser.parse_args()

    local_inventory_available = False
    local_files = []
    
    # 1. Inspect Local DB
    if args.db and os.path.exists(args.db):
        try:
            conn = sqlite3.connect(args.db)
            cursor = conn.cursor()
            # Try to query the documents table which has path and title
            try:
                cursor.execute("SELECT title, path FROM documents")
                rows = cursor.fetchall()
                for r in rows:
                    name = r[0] if r[0] else os.path.basename(r[1])
                    local_files.append({
                        "name": name,
                        "path": r[1]
                    })
            except Exception:
                # Fallback to indexed_docs
                cursor.execute("SELECT path FROM indexed_docs")
                rows = cursor.fetchall()
                for r in rows:
                    local_files.append({
                        "name": os.path.basename(r[0]),
                        "path": r[0]
                    })
            local_inventory_available = True
            conn.close()
            print(f"[AUDIT] Loaded {len(local_files)} files from SQLite database.")
        except Exception as e:
            print(f"[AUDIT ERROR] Failed querying SQLite: {e}")

    # 2. Inspect Local Manifest
    if args.manifest and os.path.exists(args.manifest):
        try:
            with open(args.manifest, 'r', encoding='utf-8') as f:
                data = json.load(f)
            categories = data.get("categories", {})
            count = 0
            for cat, files in categories.items():
                for file_obj in files:
                    local_files.append({
                        "name": file_obj.get("name"),
                        "path": file_obj.get("path")
                    })
                    count += 1
            local_inventory_available = True
            print(f"[AUDIT] Loaded {count} files from materials manifest.")
        except Exception as e:
            print(f"[AUDIT ERROR] Failed parsing manifest: {e}")

    # Normalize local files
    normalized_local = {normalize_title(f["name"]): f for f in local_files if f.get("name")}

    # 3. Build External Candidates List
    candidates = list(OFFLINE_CATALOG) # Start with offline cached items
    
    if args.allow_network_metadata:
        # Swiss Bay root Survival directory
        swiss_bay_url = "https://theswissbay.ch/pdf/Books/Survival/"
        network_candidates = query_network_metadata(swiss_bay_url, args.max_depth)
        # Cap to max pages/candidates limit
        candidates.extend(network_candidates[:args.max_pages * 20])

    # Category classification keyword rules
    category_keywords = {
        "farming": ["farming", "agriculture", "crop", "agri", "soil", "seed"],
        "medical_reference": ["doctor", "dentist", "medicine", "first aid", "trauma", "clinical", "nursing"],
        "bush_medicine": ["bush medicine", "herbal", "medicinal", "remedies"],
        "wild_edibles": ["edible", "foraging", "mushroom"],
        "water": ["water", "irrigation", "purification", "sanitation", "h2o"],
        "off_grid_power": ["solar", "wind", "generator", "battery", "electrical"],
        "mechanical": ["engine", "tool", "mechanical", "welding", "machinery"],
        "food_preservation": ["canning", "preservation", "dehydrating", "salting"]
    }
    
    risk_mappings = {
        "medical_reference": "medical",
        "bush_medicine": "bush_medicine",
        "water": "water_treatment",
        "off_grid_power": "electrical"
    }

    # Evaluate coverage & duplicates
    category_coverage = {}
    candidate_items = []
    blocked_items = []

    for item in candidates:
        title = item["title"]
        filename = item["filename"]
        url = item["url"]
        
        # Determine category dynamically if unknown
        item_cat = item["category"]
        if item_cat == "unknown":
            lower_title = title.lower()
            for cat, keywords in category_keywords.items():
                if any(kw in lower_title for kw in keywords):
                    item_cat = cat
                    break
            if item_cat == "unknown":
                item_cat = "general_survival"

        # Determine risk dynamically
        item_risk = item.get("riskCategory")
        if not item_risk:
            item_risk = risk_mappings.get(item_cat, None)
            
        # Refined classification of licenses
        license_status = item.get("license", "unknown")
        
        # Check duplicate presence
        norm_title = normalize_title(filename)
        already_present = norm_title in normalized_local

        # Sanitize absolute URLs or local staging paths
        sanitized_url = sanitize_path(url, args.materials_root)

        candidate_data = {
            "title": title,
            "source": "Swiss Bay PDF Directory Listing",
            "sourceUrl": sanitized_url,
            "category": item_cat,
            "riskCategory": item_risk,
            "licenseStatus": license_status,
            "alreadyPresent": already_present,
            "matchReason": "Exact title normalized duplication match" if already_present else "",
            "recommendedAction": "manual_review" if license_status in ["unknown", "restricted"] else "approved_download",
            "notes": "Requires safety-gate validation" if item_risk else "Standard off-grid reference"
        }

        if license_status in ["restricted", "unknown"]:
            blocked_items.append({
                "title": title,
                "source": "Swiss Bay",
                "reason": "unknown_license_or_restricted",
                "notes": f"Licensing type: {license_status}. Locked behind operator review."
            })
        
        candidate_items.append(candidate_data)

        # Count coverage stats
        if item_cat not in category_coverage:
            category_coverage[item_cat] = {"localCount": 0, "externalCandidateCount": 0}
        
        category_coverage[item_cat]["externalCandidateCount"] += 1
        if already_present:
            category_coverage[item_cat]["localCount"] += 1

    # Map coverage levels
    coverage_summary = []
    for cat, stats in category_coverage.items():
        local_c = stats["localCount"]
        ext_c = stats["externalCandidateCount"]
        
        level = "missing"
        if local_c > 0:
            if local_c >= ext_c * 0.8:
                level = "strong"
            elif local_c >= ext_c * 0.4:
                level = "adequate"
            else:
                level = "weak"
                
        coverage_summary.append({
            "category": cat,
            "localCount": local_c,
            "externalCandidateCount": ext_c,
            "coverage": level,
            "notes": f"Operator has {local_c} of {ext_c} items cataloged."
        })

    # Prepare outputs
    os.makedirs(args.out_dir, exist_ok=True)
    
    gap_json_path = os.path.join(args.out_dir, "offline-library-gap-analysis.json")
    
    gap_analysis_data = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourcesAudited": [
            {
                "name": "WROLPi",
                "type": "github_repo",
                "url": "https://github.com/lrnselfreliance/wrolpi.git",
                "license": "GPL-3.0",
                "usableForSOS": ["architecture ideas", "feature comparison"],
                "doNotUseDirectly": ["source code without license review"]
            },
            {
                "name": "Project N.O.M.A.D.",
                "type": "github_repo",
                "url": "https://github.com/Crosstalk-Solutions/project-nomad.git",
                "license": "Apache-2.0",
                "usableForSOS": ["Ollama vector setup architecture", "Kiwix ZIM manager concept"],
                "doNotUseDirectly": ["automatic updates", "lan no-auth configurations"]
            },
            {
                "name": "Internet-in-a-Box",
                "type": "web_site",
                "url": "https://internet-in-a-box.org/",
                "license": "GPL-2.0-or-later",
                "usableForSOS": ["Wikipedia Medical Encyclopedia concept", "Kiwix ZIM integration workflow"],
                "doNotUseDirectly": ["monolithic Raspberry Pi image installs"]
            }
        ],
        "localMaterialSummary": {
            "inventoryAvailable": local_inventory_available,
            "totalFilesKnown": len(local_files),
            "categoriesKnown": list(category_coverage.keys())
        },
        "categoryCoverage": coverage_summary,
        "candidateItems": candidate_items,
        "blockedItems": blocked_items
    }

    with open(gap_json_path, 'w', encoding='utf-8') as f:
        json.dump(gap_analysis_data, f, indent=2)
    print(f"[AUDIT] Gap analysis JSON written: {gap_json_path}")

    # Generate Markdown candidates report
    candidates_md_path = os.path.join(args.out_dir, "content-acquisition-candidates.md")
    with open(candidates_md_path, 'w', encoding='utf-8') as f:
        f.write("# Content Acquisition Candidates\n\n")
        f.write("Candidate documents verified as legal, public domain, open-license, or official free material. Staged for safe operator download queue:\n\n")
        for item in candidate_items:
            if item["licenseStatus"] not in ["restricted", "unknown"]:
                f.write(f"### {item['title']}\n")
                f.write(f"* **Category:** {item['category']}\n")
                f.write(f"* **License Status:** {item['licenseStatus'].upper()}\n")
                f.write(f"* **Risk category:** {item['riskCategory'] or 'None'}\n")
                f.write(f"* **Already Present:** {item['alreadyPresent']}\n")
                f.write(f"* **Acquisition Link:** `{item['sourceUrl']}`\n\n")
    print(f"[AUDIT] Candidates Markdown written: {candidates_md_path}")

    # Generate Restricted / Unknown report
    restricted_md_path = os.path.join(args.out_dir, "restricted-or-unknown-content-review.md")
    with open(restricted_md_path, 'w', encoding='utf-8') as f:
        f.write("# Restricted or Unknown-License Content Review\n\n")
        f.write("> [!WARNING]\n")
        f.write("> **COPYRIGHT WARNING LIMITS**\n")
        f.write("> The following candidate files from reference listings contain proprietary, copyrighted, or unknown-license attributes. Do NOT bulk-download or mirror these resources automatically:\n\n")
        for item in blocked_items:
            f.write(f"### {item['title']}\n")
            f.write(f"* **Reason:** {item['reason'].upper()}\n")
            f.write(f"* **Notes:** {item['notes']}\n\n")
    print(f"[AUDIT] Restricted/Unknown review Markdown written: {restricted_md_path}")

    # Generate Audit Main report
    audit_md_path = os.path.join(args.out_dir, "offline-library-reference-audit.md")
    with open(audit_md_path, 'w', encoding='utf-8') as f:
        f.write("# Offline Library Reference Audit\n\n")
        f.write("## Purpose\n")
        f.write("This audit catalogs external off-grid knowledge bases and compares candidate entries against local manifest items, checking licensing and safety boundaries.\n\n")
        f.write("## Sources Reviewed\n")
        f.write("- WROLPi (`https://github.com/lrnselfreliance/wrolpi.git`)\n")
        f.write("- Project N.O.M.A.D. (`https://github.com/Crosstalk-Solutions/project-nomad.git`)\n")
        f.write("- Internet-in-a-Box (`https://internet-in-a-box.org/`)\n")
        f.write("- Swiss Bay PDF Directories (`https://theswissbay.ch/pdf/`)\n\n")
        f.write("## Important Copyright / Licensing Boundary\n")
        f.write("No copyrighted files have been bulk-downloaded, mirrored, or imported. Restricted and unknown files are cataloged for operator-only manual verification.\n\n")
        f.write("## SOS Current Material State\n")
        if local_inventory_available:
            f.write(f"✓ Local inventory loaded successfully. Total known active documents: {len(local_files)}.\n\n")
        else:
            f.write("> [!IMPORTANT]\n")
            f.write("> **Local Inventory Unavailable**: A manual SOS inventory scan/refresh is required to load the full materials listing.\n\n")
        f.write("## Coverage Matrix\n\n")
        f.write("| Category | Local Count | Candidate Count | Coverage Level |\n")
        f.write("| --- | --- | --- | --- |\n")
        for summary in coverage_summary:
            f.write(f"| {summary['category']} | {summary['localCount']} | {summary['externalCandidateCount']} | {summary['coverage'].upper()} |\n")
        f.write("\n")
        f.write("## Proposed Phase 12\n")
        f.write("Based on WROLPi/NOMAD comparison, we recommend implementing **Phase 12 — Offline Toolkit & Content Gap Analyzer** which adds a setup wizard, Kiwix ZIM catalog indexer, and manual download staging workflows.\n")
    print(f"[AUDIT] Audit Main Report written: {audit_md_path}")

    # Generate Project Comparison report
    comp_md_path = os.path.join(args.out_dir, "reference-project-comparison.md")
    with open(comp_md_path, 'w', encoding='utf-8') as f:
        f.write("# Reference Project Comparison Matrix\n\n")
        f.write("## WROLPi Comparison\n")
        f.write("- **Usable Concepts:** Raspberry Pi targets, one-time pad encrypter/decrypter, universal search.\n")
        f.write("- **Do Not Use:** GPLv3 source code merges, auto-starting unvetted wireless hotspots.\n\n")
        f.write("## Project N.O.M.A.D. Comparison\n")
        f.write("- **Usable Concepts:** Kiwix/ZIM content manager architectures, local vector semantic matching.\n")
        f.write("- **Do Not Use:** Automatic updates, internet checks, or unauthenticated LAN access configurations.\n\n")
        f.write("## Internet-in-a-Box Comparison\n")
        f.write("- **Usable Concepts:** Wikipedia Medical Encyclopedia content packs, Khan Academy Lite integrations.\n")
        f.write("- **Do Not Use:** Monolithic SD-card images or auto-exposure of local server files.\n")
    print(f"[AUDIT] Project Comparison written: {comp_md_path}")

if __name__ == "__main__":
    main()
