#!/usr/bin/env python3
"""
Test NVD API integration
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cve_scorer import (
    get_cve_score_from_nvd,
    search_cves_by_keyword,
    extract_cve_from_text,
    enrich_node_with_cves
)

def test_nvd_api_key():
    """Test if NVD API key is configured"""
    try:
        from config import NVD_API_KEY
        if NVD_API_KEY and NVD_API_KEY != "your_nvd_api_key_here":
            print("✅ NVD API Key configured")
            print(f"   Key: {NVD_API_KEY[:8]}...{NVD_API_KEY[-4:]}")
            return True
        else:
            print("⚠️  NVD API Key not configured")
            print("   Set NVD_API_KEY in .env file")
            print("   Get your key: https://nvd.nist.gov/developers/request-an-api-key")
            return False
    except ImportError:
        print("⚠️  config.py not found")
        return False


def test_cve_extraction():
    """Test CVE extraction from text"""
    print("\n" + "="*70)
    print("TEST 1: CVE Extraction from Text")
    print("="*70)
    
    test_log = """
    <86>Nov 01 10:30:15 server sshd[12345]: Failed login attempt
    Vulnerability: CVE-2024-6387 (OpenSSH RCE)
    Also affected by CVE-2023-48795
    """
    
    cves = extract_cve_from_text(test_log)
    print(f"Input: {test_log[:100]}...")
    print(f"Extracted CVEs: {cves}")
    
    if cves:
        print("✅ CVE extraction working")
    else:
        print("❌ CVE extraction failed")
    
    return len(cves) > 0


def test_nvd_lookup():
    """Test NVD API lookup"""
    print("\n" + "="*70)
    print("TEST 2: NVD API Lookup")
    print("="*70)
    
    test_cve = "CVE-2024-6387"  # Recent OpenSSH vulnerability
    
    print(f"Looking up: {test_cve}")
    result = get_cve_score_from_nvd(test_cve)
    
    print(f"\nResults:")
    print(f"  CVE ID:      {result.get('cve_id')}")
    print(f"  Score:       {result.get('score')}")
    print(f"  Severity:    {result.get('severity')}")
    print(f"  Description: {result.get('description')[:100]}...")
    print(f"  Published:   {result.get('published')}")
    
    if result.get('score', 0) > 0:
        print("✅ NVD lookup working")
        return True
    else:
        print("⚠️  NVD lookup returned no score")
        return False


def test_keyword_search():
    """Test NVD keyword search"""
    print("\n" + "="*70)
    print("TEST 3: NVD Keyword Search")
    print("="*70)
    
    keyword = "openssh"
    print(f"Searching for: '{keyword}'")
    
    cves = search_cves_by_keyword(keyword, max_results=3)
    
    print(f"\nFound {len(cves)} high-severity CVEs:")
    for cve in cves:
        print(f"  - {cve}")
    
    if cves:
        print("✅ Keyword search working")
        return True
    else:
        print("⚠️  No CVEs found for keyword")
        return False


def test_node_enrichment():
    """Test node enrichment with CVEs"""
    print("\n" + "="*70)
    print("TEST 4: Node Enrichment")
    print("="*70)
    
    # Simulate a malicious SSH node
    node = {
        "id": "sshd",
        "type": "process",
        "attrs": {}
    }
    
    log_excerpt = """
    <86>Nov 01 10:30:15 server sshd[12345]: Failed password for root from 203.0.113.45
    <86>Nov 01 10:30:16 server sshd[12345]: Accepted password for root from 203.0.113.45
    Exploiting CVE-2024-6387 technique=T1078.004 tactic=Initial_Access status=BREACH
    """
    
    print("Node:", node)
    print("Log excerpt:", log_excerpt[:100], "...")
    
    cves = enrich_node_with_cves(node, log_excerpt)
    
    print(f"\nEnriched CVEs: {cves}")
    
    if "cve_details" in node.get("attrs", {}):
        print("\nCVE Details:")
        for cve_id, details in node["attrs"]["cve_details"].items():
            print(f"  {cve_id}:")
            print(f"    Score: {details.get('score')}")
            print(f"    Severity: {details.get('severity')}")
    
    if cves:
        print("✅ Node enrichment working")
        return True
    else:
        print("⚠️  No CVEs enriched")
        return False


def main():
    print("\n" + "="*70)
    print("🛡️  NVD API INTEGRATION TEST SUITE")
    print("="*70)
    
    results = {
        "API Key": test_nvd_api_key(),
        "CVE Extraction": test_cve_extraction(),
        "NVD Lookup": test_nvd_lookup(),
        "Keyword Search": test_keyword_search(),
        "Node Enrichment": test_node_enrichment()
    }
    
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:20s} {status}")
    
    total = len(results)
    passed = sum(results.values())
    
    print("="*70)
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed! NVD integration is working correctly.")
    elif passed >= total - 1:
        print("⚠️  Most tests passed. Check warnings above.")
    else:
        print("❌ Multiple tests failed. Check configuration.")
    
    print("="*70)


if __name__ == "__main__":
    main()