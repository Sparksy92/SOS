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
    {
        "title": "The Homestead Builder", 
        "filename": "The Homestead Builder.pdf", 
        "category": "homesteading", 
        "riskCategory": None, 
        "licenseStatus": "public_domain", 
        "licenseEvidence": "Published in 1872 by Charles P. Dwyer. Copyright expired.",
        "officialSourceUrl": "https://archive.org/details/homesteadbuilder00sher",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Farming,%20Animalraising,%20Homesteading/Homesteading/The%20Homestead%20Builder.pdf",
        "verificationStatus": "verified"
    },
    {
        "title": "Storey's Basic Country Skills", 
        "filename": "Storey Basic Country Skills.pdf", 
        "category": "homesteading", 
        "riskCategory": None, 
        "licenseStatus": "restricted", 
        "licenseEvidence": "Copyright Storey Publishing. Commercial work.",
        "officialSourceUrl": "https://www.storey.com/",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Farming,%20Animalraising,%20Homesteading/Homesteading/Storey%20Basic%20Country%20Skills.pdf",
        "verificationStatus": "verified"
    },
    {
        "title": "Farming For Self-Sufficiency", 
        "filename": "Farming for Self-Sufficiency.pdf", 
        "category": "farming", 
        "riskCategory": None, 
        "licenseStatus": "unknown", 
        "licenseEvidence": "No verifiable open license found on official source.",
        "officialSourceUrl": "",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Farming,%20Animalraising,%20Homesteading/Homesteading/Farming%20for%20Self-Sufficiency.pdf",
        "verificationStatus": "unverified"
    },
    # Survival
    {
        "title": "US Army Survival Manual FM 21-76", 
        "filename": "FM 21-76 Survival Manual.pdf", 
        "category": "general_survival", 
        "riskCategory": None, 
        "licenseStatus": "official_free", 
        "licenseEvidence": "Official US Department of the Army field manual. Public distribution.",
        "officialSourceUrl": "https://archive.org/details/FM21-76SurvivalManual",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Survival/FM%2021-76%20Survival%20Manual.pdf",
        "verificationStatus": "verified"
    },
    {
        "title": "SAS Survival Handbook", 
        "filename": "SAS Survival Handbook.pdf", 
        "category": "general_survival", 
        "riskCategory": None, 
        "licenseStatus": "restricted", 
        "licenseEvidence": "Copyright John 'Lofty' Wiseman. Commercial work.",
        "officialSourceUrl": "https://www.harpercollins.com/",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Survival/SAS%20Survival%20Handbook.pdf",
        "verificationStatus": "verified"
    },
    {
        "title": "Emergency Sanitation and Water", 
        "filename": "Emergency Sanitation and Water.pdf", 
        "category": "water", 
        "riskCategory": "water_treatment", 
        "licenseStatus": "official_free", 
        "licenseEvidence": "UNHCR / WHO guidelines. Freely distributable for educational use.",
        "officialSourceUrl": "https://www.unhcr.org/wash-resources",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Survival/Emergency%20Sanitation%20and%20Water.pdf",
        "verificationStatus": "verified"
    },
    # Bushcraft
    {
        "title": "Bushcraft Outdoor Skills and Wilderness Survival", 
        "filename": "Bushcraft Outdoor Skills.pdf", 
        "category": "bushcraft", 
        "riskCategory": None, 
        "licenseStatus": "restricted", 
        "licenseEvidence": "Copyright Mors Kochanski. Commercial work.",
        "officialSourceUrl": "https://www.lonepinepublishing.com/",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Bushcraft/Bushcraft%20Outdoor%20Skills.pdf",
        "verificationStatus": "verified"
    },
    {
        "title": "Shelters Shacks and Shanties", 
        "filename": "Shelters Shacks and Shanties.pdf", 
        "category": "shelter", 
        "riskCategory": None, 
        "licenseStatus": "public_domain", 
        "licenseEvidence": "Published in 1914 by Daniel Carter Beard. Copyright expired.",
        "officialSourceUrl": "https://archive.org/details/sheltersshackssh00bear",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Bushcraft/Shelters%20Shacks%20and%20Shanties.pdf",
        "verificationStatus": "verified"
    },
    # Bush Medicine / Medical
    {
        "title": "Where There Is No Doctor", 
        "filename": "Where There Is No Doctor.pdf", 
        "category": "medical_reference", 
        "riskCategory": "medical", 
        "licenseStatus": "official_free", 
        "licenseEvidence": "Hesperian Foundation. Open-access health book for non-commercial distribution.",
        "officialSourceUrl": "https://hesperian.org/books-and-resources/",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Bush%20Medicine/Where%20There%20Is%20No%20Doctor.pdf",
        "verificationStatus": "verified"
    },
    {
        "title": "Where There Is No Dentist", 
        "filename": "Where There Is No Dentist.pdf", 
        "category": "medical_reference", 
        "riskCategory": "medical", 
        "licenseStatus": "official_free", 
        "licenseEvidence": "Hesperian Foundation. Open-access health book for non-commercial distribution.",
        "officialSourceUrl": "https://hesperian.org/books-and-resources/",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Bush%20Medicine/Where%20There%20Is%20No%20Dentist.pdf",
        "verificationStatus": "verified"
    },
    {
        "title": "Survival Medicine Handbook", 
        "filename": "Survival Medicine Handbook.pdf", 
        "category": "medical_reference", 
        "riskCategory": "medical", 
        "licenseStatus": "restricted", 
        "licenseEvidence": "Copyright Doom and Bloom LLC. Commercial publication.",
        "officialSourceUrl": "https://www.doomandbloom.net/",
        "thirdPartyMirrorUrl": "https://theswissbay.ch/pdf/Books/Survival/Bush%20Medicine/Survival%20Medicine%20Handbook.pdf",
        "verificationStatus": "verified"
    }
]

# Network Requests Loggers for testing validation
NETWORK_FETCH_LOG = []
BLOCKED_FETCH_LOG = []

BLOCKED_EXTENSIONS = [
    '.pdf', '.zip', '.epub', '.mobi', '.djvu', '.mp4', '.avi',
    '.mkv', '.mov', '.rar', '.7z', '.tar', '.tar.gz', '.tgz',
    '.iso', '.exe', '.msi', '.dmg'
]

def normalize_title(name):
    if not name:
        return ""
    # Strip extension
    base = os.path.splitext(name)[0]
    # Replace symbols and lower-case
    normalized = re.sub(r'[^a-zA-Z0-9]', '', base).lower()
    return normalized

def check_duplicate(candidate_filename, local_files):
    cand_norm = normalize_title(candidate_filename)
    if not cand_norm:
        return False, ""
        
    for f in local_files:
        local_name = f.get("name")
        if not local_name:
            continue
        local_norm = normalize_title(local_name)
        
        # 1. Exact match
        if cand_norm == local_norm:
            return True, "Exact title normalized match"
            
        # 2. Substring match
        if cand_norm in local_norm:
            return True, f"Candidate substring matched local file: {local_name}"
            
        # 3. Reverse substring match for cleaned names
        if len(local_norm) > 6 and local_norm in cand_norm:
            return True, f"Local file substring matched candidate: {local_name}"
            
        # 4. Token-based word match
        cand_words = set(re.findall(r'[a-z0-9]+', candidate_filename.lower()))
        local_words = set(re.findall(r'[a-z0-9]+', local_name.lower()))
        stopwords = {'pdf', 'en', 'lp', 'jf', 'co', 'ag', 'mc', 'em', 'ec', 'and', 'the', 'for', 'with', 'of', 'in', 'on', 'at', 'by', 'an', 'a', 'to', 'is'}
        cand_sig_words = {w for w in cand_words if w not in stopwords and not w.isdigit()}
        local_sig_words = {w for w in local_words if w not in stopwords and not w.isdigit()}
        
        if cand_sig_words and cand_sig_words.issubset(local_sig_words):
            return True, f"Significant keywords matched local file: {local_name}"
            
        # 5. FM specific match
        if "21" in cand_words and "76" in cand_words:
            if "21" in local_words and "76" in local_words:
                return True, f"FM 21-76 keyword match: {local_name}"
                
    return False, ""

def query_network_metadata(url, max_depth, max_pages, fetch_state, current_depth=1):
    """
    Crawls HTML directory indexes only.
    Strictly avoids downloading binary attachments.
    """
    global NETWORK_FETCH_LOG, BLOCKED_FETCH_LOG
    
    # Check if URL matches blocked extensions
    lower_url = url.lower()
    if any(lower_url.endswith(ext) or (ext + '/') in lower_url for ext in BLOCKED_EXTENSIONS):
        BLOCKED_FETCH_LOG.append(url)
        print(f"[SECURITY WARNING] Refusing to fetch binary resource: {url}")
        return []

    # Check max pages cap
    if fetch_state["pages_fetched"] >= max_pages:
        print(f"[CRAWLER LIMIT] Reached max-pages cap ({max_pages}). Skipping: {url}")
        return []

    # We are about to fetch this HTML page
    NETWORK_FETCH_LOG.append(url)
    fetch_state["pages_fetched"] += 1
    print(f"[NETWORK] Fetching directory index page: {url} (Depth: {current_depth}, Total Fetched: {fetch_state['pages_fetched']})")
    
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
            if not link or link.startswith('?') or link.startswith('/') or link.startswith('#') or '..' in link:
                continue
                
            absolute_link = urljoin(url, link)
            
            # If link is a directory (ends in /) and we haven't reached limits
            if link.endswith('/') and current_depth < max_depth:
                candidates.extend(query_network_metadata(absolute_link, max_depth, max_pages, fetch_state, current_depth + 1))
            elif link.endswith('.pdf'):
                # Extract clean title
                title = urllib.parse.unquote(link.replace('.pdf', '')).replace('_', ' ').replace('-', ' ')
                candidates.append({
                    "title": title,
                    "filename": urllib.parse.unquote(link),
                    "category": "unknown",
                    "riskCategory": None,
                    "licenseStatus": "unknown",
                    "licenseEvidence": "Discovered via directory indexing. No official licensing evidence.",
                    "officialSourceUrl": "",
                    "thirdPartyMirrorUrl": absolute_link,
                    "verificationStatus": "unverified"
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
        fetch_state = {"pages_fetched": 0}
        network_candidates = query_network_metadata(swiss_bay_url, args.max_depth, args.max_pages, fetch_state)
        candidates.extend(network_candidates)

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
        license_status = item.get("licenseStatus", "unknown")
        
        # Check duplicate presence
        already_present, match_reason = check_duplicate(filename, local_files)

        # Sanitize absolute URLs or local staging paths
        sanitized_official = sanitize_path(item.get("officialSourceUrl", ""), args.materials_root)
        sanitized_mirror = sanitize_path(item.get("thirdPartyMirrorUrl", ""), args.materials_root)

        candidate_data = {
            "title": title,
            "source": "Swiss Bay PDF Directory Listing",
            "officialSourceUrl": sanitized_official,
            "thirdPartyMirrorUrl": sanitized_mirror,
            "category": item_cat,
            "riskCategory": item_risk,
            "licenseStatus": license_status,
            "licenseEvidence": item.get("licenseEvidence", "No verifiable licensing evidence."),
            "verificationStatus": item.get("verificationStatus", "unverified"),
            "alreadyPresent": already_present,
            "matchReason": match_reason,
            "recommendedAction": "manual_review" if license_status in ["unknown", "restricted"] else "approved_download",
            "notes": "Requires safety-gate validation" if item_risk else "Standard off-grid reference"
        }

        if license_status in ["restricted", "unknown"] or item.get("verificationStatus") == "unverified":
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
        f.write("Candidate items that may be suitable for acquisition after license verification. Only items with official source evidence should be moved to an approved allowlist.\n\n")
        for item in candidate_items:
            if item["licenseStatus"] not in ["restricted", "unknown"] and item["verificationStatus"] == "verified":
                f.write(f"### {item['title']}\n")
                f.write(f"* **Category:** {item['category']}\n")
                f.write(f"* **License Status:** {item['licenseStatus'].upper()}\n")
                f.write(f"* **License Evidence:** {item['licenseEvidence']}\n")
                f.write(f"* **Risk Category:** {item['riskCategory'] or 'None'}\n")
                f.write(f"* **Already Present:** {item['alreadyPresent']}\n")
                if item["officialSourceUrl"]:
                    f.write(f"* **Official Source Link:** `{item['officialSourceUrl']}`\n")
                if item["thirdPartyMirrorUrl"]:
                    f.write(f"* **Third-Party Mirror Link:** `{item['thirdPartyMirrorUrl']}`\n")
                f.write("\n")
    print(f"[AUDIT] Candidates Markdown written: {candidates_md_path}")

    # Generate Restricted / Unknown report
    restricted_md_path = os.path.join(args.out_dir, "restricted-or-unknown-content-review.md")
    with open(restricted_md_path, 'w', encoding='utf-8') as f:
        f.write("# Restricted or Unknown-License Content Review\n\n")
        f.write("> [!WARNING]\n")
        f.write("> **COPYRIGHT WARNING LIMITS**\n")
        f.write("> The following candidate files from reference listings contain proprietary, copyrighted, unverified, or unknown-license attributes. Do NOT bulk-download or mirror these resources automatically:\n\n")
        
        f.write("## Restricted (Commercial / Proprietary Works)\n\n")
        for item in candidate_items:
            if item["licenseStatus"] == "restricted":
                f.write(f"### {item['title']}\n")
                f.write(f"* **Category:** {item['category']}\n")
                f.write(f"* **Official Source:** `{item['officialSourceUrl']}`\n")
                f.write(f"* **Notes:** {item['licenseEvidence']}\n\n")
                
        f.write("## Needs License Evidence (Unverified or Unknown status)\n\n")
        for item in candidate_items:
            if item["licenseStatus"] == "unknown" or item["verificationStatus"] == "unverified":
                f.write(f"### {item['title']}\n")
                f.write(f"* **Category:** {item['category']}\n")
                f.write(f"* **Mirror URL:** `{item['thirdPartyMirrorUrl']}`\n")
                f.write(f"* **Notes:** {item['licenseEvidence']}\n\n")
    print(f"[AUDIT] Restricted/Unknown review Markdown written: {restricted_md_path}")

    # Generate Audit Main report
    audit_md_path = os.path.join(args.out_dir, "offline-library-reference-audit.md")
    with open(audit_md_path, 'w', encoding='utf-8') as f:
        f.write("# Offline Library Reference Audit\n\n")
        f.write("## Purpose\n")
        f.write("This audit catalogs external off-grid knowledge bases and compares candidate entries against local manifest items, checking licensing and safety boundaries.\n\n")
        f.write("> [!IMPORTANT]\n")
        f.write("> **This audit does not prove copyright clearance. It separates likely-safe, evidence-backed, unknown, and restricted material for manual operator review.**\n\n")
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
