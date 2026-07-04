#!/usr/bin/env python3
import unittest
from unittest import mock
import os
import json
from compare_offline_references import (
    normalize_title,
    sanitize_path,
    query_network_metadata,
    NETWORK_FETCH_LOG,
    BLOCKED_FETCH_LOG,
    OFFLINE_CATALOG
)

class TestReferenceAudit(unittest.TestCase):
    
    def setUp(self):
        NETWORK_FETCH_LOG.clear()
        BLOCKED_FETCH_LOG.clear()

    def test_normalize_title(self):
        self.assertEqual(normalize_title("SAS Survival Handbook.pdf"), "sassurvivalhandbook")
        self.assertEqual(normalize_title("FM-21_76.TXT"), "fm2176")
        self.assertEqual(normalize_title(""), "")

    def test_sanitize_path(self):
        materials_root = "C:\\Users\\Blair\\Downloads\\survival\\sos-materials"
        raw_path = "C:\\Users\\Blair\\Downloads\\survival\\sos-materials\\farming\\soil.pdf"
        sanitized = sanitize_path(raw_path, materials_root)
        self.assertTrue("[MATERIALS_ROOT]" in sanitized)
        self.assertFalse("Blair" in sanitized)

        user_home_path = "C:\\Users\\john_doe\\secret_file.pdf"
        sanitized_home = sanitize_path(user_home_path, materials_root)
        self.assertTrue("[USER_HOME]" in sanitized_home)
        self.assertFalse("john_doe" in sanitized_home)

    def test_offline_mode_no_network_requests(self):
        self.assertTrue(len(OFFLINE_CATALOG) > 0)
        # Check that we separated officialSourceUrl and thirdPartyMirrorUrl
        for item in OFFLINE_CATALOG:
            self.assertTrue("officialSourceUrl" in item)
            self.assertTrue("thirdPartyMirrorUrl" in item)
            
        self.assertEqual(len(NETWORK_FETCH_LOG), 0)
        self.assertEqual(len(BLOCKED_FETCH_LOG), 0)

    def test_binary_urls_blocked_and_logged(self):
        blocked_test_urls = [
            "https://example.com/file.rar",
            "https://example.com/archive.7z",
            "https://example.com/book.mobi",
            "https://example.com/doc.djvu",
            "https://example.com/disk.iso",
            "https://example.com/payload.exe",
            "https://example.com/installer.msi",
            "https://example.com/app.dmg"
        ]
        
        for url in blocked_test_urls:
            results = query_network_metadata(url, max_depth=1, max_pages=5, fetch_state={"pages_fetched": 0})
            self.assertEqual(len(results), 0)
            
        self.assertEqual(len(NETWORK_FETCH_LOG), 0)
        self.assertEqual(len(BLOCKED_FETCH_LOG), len(blocked_test_urls))
        for url in blocked_test_urls:
            self.assertIn(url, BLOCKED_FETCH_LOG)

    def test_unknown_license_default(self):
        # Farming For Self-Sufficiency should be unknown licenseStatus, unverified verificationStatus
        target = None
        for item in OFFLINE_CATALOG:
            if item["title"] == "Farming For Self-Sufficiency":
                target = item
                break
        self.assertIsNotNone(target)
        self.assertEqual(target["licenseStatus"], "unknown")
        self.assertEqual(target["verificationStatus"], "unverified")

    def test_max_pages_caps_fetched_pages(self):
        # Run network crawling simulation (we expect it stops after reaching max_pages)
        fetch_state = {"pages_fetched": 0}
        
        # Call query_network_metadata with max_pages=0 over a mock crawl
        # to prove it immediately skips fetching
        results = query_network_metadata("https://example.com/survival-index/", max_depth=2, max_pages=0, fetch_state=fetch_state)
        self.assertEqual(len(results), 0)
        self.assertEqual(len(NETWORK_FETCH_LOG), 0)

    @mock.patch("urllib.request.urlopen")
    def test_multi_page_cap_blocks_subsequent_pages(self, mock_urlopen):
        import io
        # Mock response returning links to subdirectories
        mock_response = mock.MagicMock()
        mock_response.read.return_value = b'<a href="subdir1/"></a><a href="subdir2/"></a>'
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # We allow max_pages=1 page to be crawled
        fetch_state = {"pages_fetched": 0}
        query_network_metadata("https://example.com/root/", max_depth=3, max_pages=1, fetch_state=fetch_state)
        
        # We expect only the root page was fetched (pages_fetched = 1)
        self.assertEqual(fetch_state["pages_fetched"], 1)
        # Even though depth=3 and there are subdirectories, it should not crawl subdir1/ or subdir2/
        # because the cap of 1 was hit after the first root fetch.
        self.assertEqual(len(NETWORK_FETCH_LOG), 1)
        self.assertIn("https://example.com/root/", NETWORK_FETCH_LOG)

if __name__ == "__main__":
    unittest.main()
