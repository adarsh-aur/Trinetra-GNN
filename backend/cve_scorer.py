#cve_scorer.py
import re
import requests
import time
from datetime import datetime, timedelta
from utils.cache import cache

# Import configuration
try:
    from config import NVD_API_KEY, NVD_API_BASE, NVD_RATE_LIMIT, NVD_RATE_WINDOW
    RATE_LIMIT_CALLS = NVD_RATE_LIMIT
    RATE_LIMIT_WINDOW = NVD_RATE_WINDOW
except ImportError:
    # Fallback if config not found
    import os
    NVD_API_KEY = os.getenv("NVD_API_KEY", "")
    NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    RATE_LIMIT_CALLS = 50 if NVD_API_KEY else 5
    RATE_LIMIT_WINDOW = 30

api_call_times = []


def rate_limit_check():
    """Enforce NVD API rate limits"""
    global api_call_times
    now = time.time()
    
    # Remove calls outside the time window
    api_call_times = [t for t in api_call_times if now - t < RATE_LIMIT_WINDOW]
    
    if len(api_call_times) >= RATE_LIMIT_CALLS:
        # Calculate wait time
        oldest_call = min(api_call_times)
        wait_time = RATE_LIMIT_WINDOW - (now - oldest_call)
        if wait_time > 0:
            print(f"⏳ Rate limit reached, waiting {wait_time:.1f}s...")
            time.sleep(wait_time + 0.1)
            api_call_times = []
    
    api_call_times.append(now)


def extract_cve_from_text(text: str):
    """
    Extract CVE IDs from log text
    Pattern: CVE-YYYY-NNNNN
    """
    cve_pattern = r'CVE-\d{4}-\d{4,7}'
    matches = re.findall(cve_pattern, text, re.IGNORECASE)
    return list(set([cve.upper() for cve in matches]))  # Normalize to uppercase


def get_cve_score_from_nvd(cve_id: str):
    """
    Get CVSS score for a CVE ID from NVD API
    Returns: dict with score, severity, description
    """
    cache_key = f"nvd_cve_{cve_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    try:
        rate_limit_check()
        
        headers = {}
        if NVD_API_KEY and NVD_API_KEY != "b924563d-868f-4022-900e-deff8c57af60":
            headers["apiKey"] = NVD_API_KEY
        
        url = f"{NVD_API_BASE}?cveId={cve_id}"
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("totalResults", 0) > 0:
                vuln = data["vulnerabilities"][0]["cve"]
                
                # Extract CVSS scores (prefer v3.1, then v3.0, then v2.0)
                cvss_data = None
                score = 0.0
                severity = "UNKNOWN"
                
                metrics = vuln.get("metrics", {})
                
                if "cvssMetricV31" in metrics:
                    cvss_data = metrics["cvssMetricV31"][0]["cvssData"]
                    score = cvss_data.get("baseScore", 0.0)
                    severity = cvss_data.get("baseSeverity", "UNKNOWN")
                elif "cvssMetricV30" in metrics:
                    cvss_data = metrics["cvssMetricV30"][0]["cvssData"]
                    score = cvss_data.get("baseScore", 0.0)
                    severity = cvss_data.get("baseSeverity", "UNKNOWN")
                elif "cvssMetricV2" in metrics:
                    cvss_data = metrics["cvssMetricV2"][0]["cvssData"]
                    score = cvss_data.get("baseScore", 0.0)
                    severity = "MEDIUM" if score >= 4.0 else "LOW"
                
                # Extract description
                descriptions = vuln.get("descriptions", [])
                description = next(
                    (d["value"] for d in descriptions if d["lang"] == "en"),
                    "No description available"
                )
                
                result = {
                    "cve_id": cve_id,
                    "score": float(score),
                    "severity": severity,
                    "description": description[:200],  # Truncate long descriptions
                    "published": vuln.get("published", ""),
                    "last_modified": vuln.get("lastModified", "")
                }
                
                # Cache for 24 hours (CVE data doesn't change often)
                cache.set(cache_key, result, ttl=86400)
                print(f"✅ Fetched {cve_id}: {severity} ({score})")
                return result
        
        elif response.status_code == 404:
            print(f"⚠️ CVE {cve_id} not found in NVD")
        else:
            print(f"⚠️ NVD API error {response.status_code} for {cve_id}")
    
    except requests.Timeout:
        print(f"⚠️ Timeout fetching {cve_id} from NVD")
    except Exception as e:
        print(f"⚠️ Error fetching {cve_id}: {e}")
    
    # Cache failed lookups for shorter time (1 hour)
    default_result = {
        "cve_id": cve_id,
        "score": 5.0,  # Default medium severity
        "severity": "MEDIUM",
        "description": "Score unavailable from NVD",
        "published": "",
        "last_modified": ""
    }
    cache.set(cache_key, default_result, ttl=3600)
    return default_result


def search_cves_by_keyword(keyword: str, max_results=5):
    """
    Search NVD for CVEs related to a keyword
    Used for LLM-identified vulnerabilities without explicit CVE IDs
    """
    cache_key = f"nvd_search_{keyword.lower()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    try:
        rate_limit_check()
        
        headers = {}
        if NVD_API_KEY and NVD_API_KEY != "b924563d-868f-4022-900e-deff8c57af60":
            headers["apiKey"] = NVD_API_KEY
        
        # Search for recent critical/high CVEs
        url = f"{NVD_API_BASE}?keywordSearch={keyword}&resultsPerPage={max_results}"
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            cve_list = []
            for vuln_wrapper in data.get("vulnerabilities", [])[:max_results]:
                vuln = vuln_wrapper["cve"]
                cve_id = vuln["id"]
                
                # Get score
                metrics = vuln.get("metrics", {})
                score = 0.0
                
                if "cvssMetricV31" in metrics:
                    score = metrics["cvssMetricV31"][0]["cvssData"].get("baseScore", 0.0)
                elif "cvssMetricV30" in metrics:
                    score = metrics["cvssMetricV30"][0]["cvssData"].get("baseScore", 0.0)
                elif "cvssMetricV2" in metrics:
                    score = metrics["cvssMetricV2"][0]["cvssData"].get("baseScore", 0.0)
                
                # Only include high/critical CVEs (score >= 7.0)
                if score >= 7.0:
                    cve_list.append(cve_id)
            
            # Cache for 12 hours
            cache.set(cache_key, cve_list, ttl=43200)
            print(f"🔍 Found {len(cve_list)} high-severity CVEs for '{keyword}'")
            return cve_list
    
    except Exception as e:
        print(f"⚠️ Error searching CVEs for '{keyword}': {e}")
    
    cache.set(cache_key, [], ttl=3600)
    return []


def llm_identify_vulnerabilities(log_excerpt: str, node_id: str, node_type: str):
    """
    Use LLM to identify potential vulnerabilities in logs
    Returns: list of keywords to search NVD
    """
    from llm_processor import call_groq_llm
    
    # Don't call LLM for every node - too expensive
    # Only call for suspicious patterns
    suspicious_keywords = [
        "failed", "denied", "unauthorized", "breach", "attack", "exploit",
        "malicious", "suspicious", "anomaly", "error", "critical", "warning"
    ]
    
    if not any(kw in log_excerpt.lower() for kw in suspicious_keywords):
        return []
    
    cache_key = f"llm_vuln_{hash(log_excerpt[:500])}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    prompt = f"""Analyze this security log excerpt and identify potential software vulnerabilities or attack vectors.

Node: {node_id} (type: {node_type})
Log excerpt:
```
{log_excerpt[:1000]}
```

Task: Identify specific software, services, or protocols that may be vulnerable. Return ONLY a JSON list of 1-3 specific search keywords for finding relevant CVEs in the NVD database.

Examples of good keywords:
- "openssh"
- "apache httpd"
- "mysql"
- "kubernetes"
- "docker runc"

Return format (JSON only, no markdown):
["keyword1", "keyword2"]

If no vulnerabilities detected, return: []
"""

    try:
        response = call_groq_llm(prompt)
        response_text = response.strip()
        
        # Remove markdown if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        import json
        keywords = json.loads(response_text)
        
        # Validate and limit
        keywords = [k for k in keywords if isinstance(k, str) and len(k) > 2][:3]
        
        # Cache for 1 hour
        cache.set(cache_key, keywords, ttl=3600)
        return keywords
    
    except Exception as e:
        print(f"⚠️ LLM vulnerability identification failed: {e}")
        cache.set(cache_key, [], ttl=3600)
        return []


def map_mitre_to_cve(technique_id: str):
    """
    Search NVD for CVEs associated with MITRE ATT&CK technique
    """
    # Common technique to keyword mapping for NVD search
    technique_keywords = {
        "T1078": "authentication bypass",
        "T1110": "brute force",
        "T1190": "remote code execution",
        "T1059": "command injection",
        "T1053": "privilege escalation",
        "T1136": "account creation",
        "T1068": "privilege escalation",
        "T1611": "container escape",
    }
    
    # Extract base technique (remove sub-technique)
    base_technique = technique_id.split(".")[0]
    keyword = technique_keywords.get(base_technique)
    
    if keyword:
        return search_cves_by_keyword(keyword, max_results=3)
    
    return []


def enrich_node_with_cves(node: dict, raw_log_excerpt: str = ""):
    """
    Enrich a node with CVE information using multiple methods:
    1. Direct CVE extraction from logs
    2. MITRE technique mapping to NVD
    3. LLM-identified vulnerabilities + NVD search
    4. Service-specific CVE lookup
    
    Args:
        node: Node dictionary with id, type, attrs
        raw_log_excerpt: Relevant log lines for this node
    
    Returns:
        List of CVE IDs with enriched data
    """
    cves = []
    cve_details = {}
    
    node_id = node.get("id", "").lower()
    node_type = node.get("type", "").lower()
    
    # Method 1: Extract CVEs directly from logs
    if raw_log_excerpt:
        direct_cves = extract_cve_from_text(raw_log_excerpt)
        for cve_id in direct_cves:
            if cve_id not in cves:
                cves.append(cve_id)
                cve_details[cve_id] = get_cve_score_from_nvd(cve_id)
    
    # Method 2: Map MITRE techniques to CVEs
    if raw_log_excerpt:
        technique_pattern = r'technique=(T\d{4}(?:\.\d{3})?)'
        techniques = re.findall(technique_pattern, raw_log_excerpt, re.IGNORECASE)
        
        for technique in techniques[:2]:  # Limit to 2 techniques to avoid too many API calls
            mapped_cves = map_mitre_to_cve(technique)
            for cve_id in mapped_cves:
                if cve_id not in cves:
                    cves.append(cve_id)
                    cve_details[cve_id] = get_cve_score_from_nvd(cve_id)
    
    # Method 3: LLM-identified vulnerabilities + NVD search
    if raw_log_excerpt and len(cves) < 3:  # Only if we haven't found many CVEs yet
        # Check for malicious indicators
        if any(word in raw_log_excerpt.lower() for word in 
               ["failed", "breach", "attack", "exploit", "unauthorized", "malicious"]):
            
            keywords = llm_identify_vulnerabilities(raw_log_excerpt, node.get("id"), node_type)
            
            for keyword in keywords:
                found_cves = search_cves_by_keyword(keyword, max_results=2)
                for cve_id in found_cves:
                    if cve_id not in cves:
                        cves.append(cve_id)
                        cve_details[cve_id] = get_cve_score_from_nvd(cve_id)
    
    # Method 4: Service-specific keyword search
    if len(cves) == 0 and node_type in ["process", "service"]:
        # Check if this is a known vulnerable service
        service_keywords = {
            "ssh": "openssh",
            "sshd": "openssh",
            "httpd": "apache httpd",
            "nginx": "nginx",
            "mysql": "mysql",
            "postgres": "postgresql",
            "docker": "docker",
            "kubernetes": "kubernetes",
        }
        
        keyword = service_keywords.get(node_id)
        if keyword and "malicious" in raw_log_excerpt.lower():
            found_cves = search_cves_by_keyword(keyword, max_results=2)
            for cve_id in found_cves:
                if cve_id not in cves:
                    cves.append(cve_id)
                    cve_details[cve_id] = get_cve_score_from_nvd(cve_id)
    
    # Store CVE details in node attributes
    if cves:
        node.setdefault("attrs", {})["cve_details"] = cve_details
    
    return cves


def compute_cve_risk_score(cve_list: list):
    """
    Compute aggregate risk score from list of CVEs
    Uses CVSS scores from NVD database
    """
    if not cve_list:
        return 0.0
    
    scores = []
    for cve_id in cve_list:
        cve_data = get_cve_score_from_nvd(cve_id)
        score = cve_data.get("score", 5.0)
        if score > 0:
            scores.append(score)
    
    if not scores:
        return 0.0
    
    # Return weighted average (higher scores weighted more)
    # Critical CVEs (9.0+) have more impact
    weighted_sum = sum(s * (1.5 if s >= 9.0 else 1.0) for s in scores)
    weight_count = sum(1.5 if s >= 9.0 else 1.0 for s in scores)
    
    return min(10.0, weighted_sum / weight_count)


def get_cve_score(cve_id: str):
    """
    Legacy function - returns just the score
    """
    cve_data = get_cve_score_from_nvd(cve_id)
    return cve_data.get("score", 0.0)