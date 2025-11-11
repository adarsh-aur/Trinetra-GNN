# anomaly_detector.py - Adaptive Anomaly Detection with LLM Integration
# FIXED VERSION with proper imports and error handling

import numpy as np
import json

# ============================================================================
# IMPORT FIX: Handle optional LLM processor import
# ============================================================================
try:
    from llm_processor import call_groq_llm
    HAS_LLM_PROCESSOR = True
except ImportError:
    print("⚠️ llm_processor not available, using fallback methods")
    HAS_LLM_PROCESSOR = False
    
    def call_groq_llm(prompt):
        """Fallback function when LLM processor is not available"""
        raise Exception("LLM processor not available")


def compute_node_risk(node_dict):
    """
    Compute base risk score for a node based on attributes
    
    Args:
        node_dict: Node dictionary with attrs
    
    Returns:
        float: Base risk score (0.0 to 10.0)
    """
    attrs = node_dict.get("attrs", {})
    risk = 0.0
    
    # Check for suspicious attributes
    if attrs.get("suspicious_process"):
        risk += 3.0
    
    if attrs.get("privilege_escalation"):
        risk += 4.0
    
    if attrs.get("network_anomaly"):
        risk += 2.5
    
    if attrs.get("unauthorized_access"):
        risk += 3.5
    
    # Check connection count
    conn_count = attrs.get("connection_count", 0)
    if conn_count > 100:
        risk += 2.0
    elif conn_count > 50:
        risk += 1.0
    
    # Check for known malicious IPs
    if attrs.get("known_malicious_ip"):
        risk += 5.0
    
    # Check for failed login attempts
    failed_logins = attrs.get("failed_login_attempts", 0)
    if failed_logins > 10:
        risk += 3.0
    elif failed_logins > 5:
        risk += 1.5
    
    return min(10.0, risk)


def adaptive_zscore_anomaly_detection(nodes, custom_threshold=None):
    """
    Adaptive Z-score based anomaly detection
    
    Args:
        nodes: List of node dictionaries with risk scores
        custom_threshold: Optional custom Z-score threshold
    
    Returns:
        tuple: (anomalies list, threshold used)
    """
    if not nodes:
        return [], 2.0
    
    risks = [n.get("risk", 0.0) for n in nodes]
    
    if not risks or len(risks) < 3:
        return [], 2.0
    
    mean_risk = np.mean(risks)
    std_risk = np.std(risks)
    
    # Use custom threshold if provided, otherwise use adaptive calculation
    if custom_threshold:
        threshold = custom_threshold
    else:
        # Adaptive threshold based on data distribution
        if std_risk > 0:
            # If high variance, use lower threshold
            if std_risk > mean_risk * 0.5:
                threshold = 1.8
            # If low variance, use higher threshold
            elif std_risk < mean_risk * 0.2:
                threshold = 2.5
            else:
                threshold = 2.0
        else:
            threshold = 2.0
    
    anomalies = []
    
    if std_risk > 0:
        for node in nodes:
            risk = node.get("risk", 0.0)
            z_score = (risk - mean_risk) / std_risk
            
            if abs(z_score) > threshold:
                node["z_score"] = z_score
                anomalies.append(node)
    
    return anomalies, threshold


def zscore_anomaly_detection(nodes):
    """
    Standard Z-score anomaly detection (backward compatibility)
    
    Args:
        nodes: List of node dictionaries with risk scores
    
    Returns:
        tuple: (anomalies list, threshold used)
    """
    return adaptive_zscore_anomaly_detection(nodes, custom_threshold=2.0)


def llm_consensus_check(raw_logs, candidate_anomalies):
    """
    Use LLM to confirm anomalies and provide reasoning
    
    Args:
        raw_logs: Raw log text for context
        candidate_anomalies: List of potential anomalies from statistical analysis
    
    Returns:
        list: Confirmed anomalies with reasoning
    """
    if not candidate_anomalies:
        return []
    
    if not HAS_LLM_PROCESSOR:
        print("⚠️ LLM processor not available, returning high-risk anomalies")
        return [a for a in candidate_anomalies if a.get("risk", 0.0) > 7.0]
    
    # Prepare anomaly summary for LLM
    anomaly_summary = []
    for idx, anom in enumerate(candidate_anomalies[:20]):  # Limit to top 20
        anomaly_summary.append({
            "index": idx,
            "id": anom.get("id"),
            "type": anom.get("type"),
            "risk_score": round(anom.get("risk", 0.0), 2),
            "z_score": round(anom.get("z_score", 0.0), 2) if isinstance(anom.get("z_score"), (int, float)) else "N/A",
            "cve": anom.get("attrs", {}).get("cve", [])[:3]
        })
    
    prompt = f"""You are a cybersecurity expert analyzing potential security anomalies detected in system logs.

**Context from Logs:**
```
{raw_logs[:3000]}
```

**Candidate Anomalies (detected by statistical analysis):**
```json
{json.dumps(anomaly_summary, indent=2)}
```

**Task:**
Review each candidate anomaly and determine:
1. Is it a TRUE anomaly (security concern)?
2. What is the specific threat/issue?
3. What is the confidence level (high/medium/low)?

**Criteria for TRUE Anomalies:**
- Privilege escalation attempts
- Suspicious process execution
- Unauthorized access patterns
- Network anomalies (unusual connections, port scans)
- Malicious activity indicators
- CVE exploitation attempts
- Abnormal resource usage
- Failed authentication spikes

**FALSE POSITIVES to filter out:**
- Normal system maintenance
- Legitimate high-traffic periods
- Standard service behaviors
- Scheduled tasks

**Output Format (JSON only):**
{{
  "confirmed_anomalies": [
    {{
      "index": 0,
      "id": "node_id",
      "is_anomaly": true,
      "confidence": "high",
      "threat_type": "privilege_escalation",
      "reason": "Detected sudo command execution with unusual parameters",
      "severity": "high"
    }}
  ]
}}

Return ONLY valid JSON. Only include nodes you confirm as true anomalies."""

    try:
        print("🤖 Calling LLM for anomaly consensus check...")
        response = call_groq_llm(prompt)
        
        # Parse response
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        result = json.loads(response_text)
        confirmed_list = result.get("confirmed_anomalies", [])
        
        # Map back to original nodes
        confirmed_anomalies = []
        for conf in confirmed_list:
            idx = conf.get("index")
            if idx is not None and idx < len(candidate_anomalies):
                original_node = candidate_anomalies[idx].copy()
                original_node["llm_confirmed"] = True
                original_node["confidence"] = conf.get("confidence", "medium")
                original_node["threat_type"] = conf.get("threat_type", "unknown")
                original_node["reason"] = conf.get("reason", "LLM confirmed anomaly")
                original_node["severity"] = conf.get("severity", "medium")
                confirmed_anomalies.append(original_node)
        
        print(f"✅ LLM confirmed {len(confirmed_anomalies)} out of {len(candidate_anomalies)} anomalies")
        
        return confirmed_anomalies
        
    except json.JSONDecodeError as e:
        print(f"⚠️ Failed to parse LLM consensus response: {e}")
        print(f"Response was: {response[:500]}...")
        
        # Fallback: return high-risk anomalies
        fallback = []
        for anom in candidate_anomalies:
            if anom.get("risk", 0.0) > 7.0:
                anom["reason"] = "High risk score (LLM consensus failed)"
                fallback.append(anom)
        return fallback
        
    except Exception as e:
        print(f"⚠️ LLM consensus check error: {e}")
        
        # Fallback: return high-risk anomalies
        fallback = []
        for anom in candidate_anomalies:
            if anom.get("risk", 0.0) > 7.0:
                anom["reason"] = "High risk score (LLM consensus failed)"
                fallback.append(anom)
        return fallback


def llm_explain_anomaly_cluster(anomalies, raw_logs):
    """
    Use LLM to analyze a cluster of related anomalies and explain the attack pattern
    
    Args:
        anomalies: List of confirmed anomalies
        raw_logs: Raw log context
    
    Returns:
        dict: Attack pattern analysis
    """
    if not anomalies:
        return {
            "attack_pattern": "No anomalies detected",
            "description": "System appears normal",
            "recommendations": []
        }
    
    if not HAS_LLM_PROCESSOR:
        return {
            "attack_pattern": "Unknown",
            "description": "LLM processor not available for pattern analysis",
            "recommendations": ["Review logs manually"]
        }
    
    anomaly_summary = []
    for anom in anomalies[:10]:
        anomaly_summary.append({
            "id": anom.get("id"),
            "type": anom.get("type"),
            "threat_type": anom.get("threat_type", "unknown"),
            "risk_score": anom.get("risk", 0.0),
            "cve": anom.get("attrs", {}).get("cve", [])
        })
    
    prompt = f"""You are a cybersecurity incident response expert. Analyze this cluster of anomalies to identify the attack pattern.

**Confirmed Anomalies:**
```json
{json.dumps(anomaly_summary, indent=2)}
```

**Log Context:**
```
{raw_logs[:2000]}
```

**Task:**
Identify the overall attack pattern and provide actionable insights.

**Output Format (JSON only):**
{{
  "attack_pattern": "APT/Ransomware/DDoS/Brute Force/etc",
  "attack_stage": "reconnaissance/initial_access/execution/persistence/privilege_escalation/defense_evasion/credential_access/discovery/lateral_movement/collection/exfiltration/impact",
  "confidence": "high",
  "description": "2-3 sentence description of the attack",
  "indicators": ["indicator1", "indicator2"],
  "affected_assets": ["asset1", "asset2"],
  "recommendations": [
    "Immediate action 1",
    "Immediate action 2",
    "Long-term mitigation 1"
  ],
  "severity": "critical|high|medium|low"
}}

Return ONLY valid JSON."""

    try:
        response = call_groq_llm(prompt)
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        analysis = json.loads(response_text)
        return analysis
        
    except Exception as e:
        print(f"⚠️ LLM attack pattern analysis failed: {e}")
        return {
            "attack_pattern": "Unknown",
            "description": "Unable to determine attack pattern",
            "recommendations": ["Review logs manually", "Monitor for additional suspicious activity"]
        }


def calculate_anomaly_score(node, z_score, llm_confidence):
    """
    Calculate comprehensive anomaly score combining statistical and LLM analysis
    
    Args:
        node: Node dictionary
        z_score: Statistical Z-score
        llm_confidence: LLM confidence level (high/medium/low)
    
    Returns:
        float: Anomaly score (0.0 to 10.0)
    """
    # Base score from Z-score
    z_score_component = min(5.0, abs(z_score))
    
    # Risk score component
    risk_component = min(3.0, node.get("risk", 0.0) * 0.3)
    
    # LLM confidence component
    confidence_map = {
        "high": 2.0,
        "medium": 1.0,
        "low": 0.5
    }
    llm_component = confidence_map.get(llm_confidence, 0.5)
    
    # CVE component
    cve_count = len(node.get("attrs", {}).get("cve", []))
    cve_component = min(1.0, cve_count * 0.2)
    
    total_score = z_score_component + risk_component + llm_component + cve_component
    
    return min(10.0, total_score)


def filter_false_positives_with_llm(anomalies, raw_logs):
    """
    Use LLM to filter out false positives from anomaly list
    
    Args:
        anomalies: List of detected anomalies
        raw_logs: Raw log context
    
    Returns:
        list: Filtered anomalies with false positives removed
    """
    if not anomalies:
        return []
    
    if not HAS_LLM_PROCESSOR:
        print("⚠️ LLM processor not available, returning high-risk anomalies only")
        return [a for a in anomalies if a.get("risk", 0.0) > 7.0]
    
    # For small lists, use consensus check
    if len(anomalies) <= 20:
        return llm_consensus_check(raw_logs, anomalies)
    
    # For large lists, use batch filtering
    anomaly_summary = []
    for idx, anom in enumerate(anomalies[:50]):
        anomaly_summary.append({
            "index": idx,
            "id": anom.get("id"),
            "type": anom.get("type"),
            "risk_score": anom.get("risk", 0.0),
            "z_score": anom.get("z_score", 0.0)
        })
    
    prompt = f"""You are filtering false positives from anomaly detection results.

**Anomalies to Review:**
```json
{json.dumps(anomaly_summary, indent=2)}
```

**Log Sample:**
```
{raw_logs[:2000]}
```

Identify which are FALSE POSITIVES (normal behavior) vs TRUE ANOMALIES (security concerns).

**Output Format (JSON only):**
{{
  "true_anomalies": [0, 2, 5, 7],
  "false_positives": [1, 3, 4, 6],
  "reasoning": "Brief explanation"
}}

Return ONLY valid JSON with indices."""

    try:
        response = call_groq_llm(prompt)
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        result = json.loads(response_text)
        true_indices = result.get("true_anomalies", [])
        
        filtered = []
        for idx in true_indices:
            if idx < len(anomalies):
                filtered.append(anomalies[idx])
        
        print(f"✅ Filtered {len(anomalies)} anomalies down to {len(filtered)} true anomalies")
        
        return filtered
        
    except Exception as e:
        print(f"⚠️ False positive filtering failed: {e}")
        # Return high-confidence anomalies as fallback
        return [a for a in anomalies if a.get("risk", 0.0) > 7.0]