#!/usr/bin/env python3
import unittest
import os
import shutil
import tempfile
import json
from compare_offline_references import (
    normalize_title,
    sanitize_path,
    query_network_metadata,
    NETWORK_REQUESTS_LOG,
    OFFLINE_CATALOG
)

class TestReferenceAudit(unittest.TestCase):
    
    def test_normalize_title(self):
        self.assertEqual(normalize_title("SAS Survival Handbook.pdf"), "sassurvivalhandbook")
        self.assertEqual(normalize_title("FM-21_76.TXT"), "fm2176")
        self.assertEqual(normalize_title(""), "")

    def test_sanitize_path(self):
        materials_root = "C:\\Users\\Blair\\Downloads\\survival\\sos-materials"
        
        # Test sanitizing absolute materials root path
        raw_path = "C:\\Users\\Blair\\Downloads\\survival\\sos-materials\\farming\\soil.pdf"
        sanitized = sanitize_path(raw_path, materials_root)
        self.assertTrue("[MATERIALS_ROOT]" in sanitized)
        self.assertFalse("Blair" in sanitized)

        # Test sanitizing other absolute user directory patterns
        user_home_path = "C:\\Users\\john_doe\\secret_file.pdf"
        sanitized_home = sanitize_path(user_home_path, materials_root)
        self.assertTrue("[USER_HOME]" in sanitized_home)
        self.assertFalse("john_doe" in sanitized_home)

    def test_offline_mode_no_network_requests(self):
        # Clear log
        NETWORK_REQUESTS_LOG.clear()
        
        # In default offline mode, the catalog uses embedded metadata.
        # Run some simple tests over the embedded catalog list
        self.assertTrue(len(OFFLINE_CATALOG) > 0)
        for item in OFFLINE_CATALOG:
            self.assertTrue(item["url"].startswith("https://"))
            
        # Assert that zero network crawls were logged
        self.assertEqual(len(NETWORK_REQUESTS_LOG), 0)

    def test_binary_urls_blocked_from_network(self):
        # Assert that attempting to fetch a PDF URL directly raises warnings / returns empty
        binary_url = "https://theswissbay.ch/pdf/Books/Survival/Survival/SAS%20Survival%20Handbook.pdf"
        
        # Clear log
        NETWORK_REQUESTS_LOG.clear()
        
        results = query_network_metadata(binary_url, max_depth=1)
        
        # Assert that it refused to crawl and returned empty candidates list
        self.assertEqual(len(results), 0)
        
        # Verify it logged the attempt in the security check log but didn't execute urllib GET
        self.assertEqual(len(NETWORK_REQUESTS_LOG), 1)
        self.assertEqual(NETWORK_REQUESTS_LOG[0]["url"], binary_url)

if __name__ == "__main__":
    unittest.main()
