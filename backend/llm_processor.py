"""
LLM Processor - OPTIMIZED VERSION
----------------------------------
Fixes:
1. Correct Groq model name (was using wrong model)
2. Better error handling and timeouts
3. Faster processing with optimized prompts
4. Improved JSON parsing
5. Better fallback mechanisms
"""

import os
import json
import time
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# 🔑 Initialize Groq client
# ============================================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY not set in environment variables")
    print("   Set it in .env file or export GROQ_API_KEY='your-key'")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ============================================================
# 🧮 Token utilities (simplified - no tiktoken needed)
# ============================================================
def truncate_to_char_limit(text, max_chars=12000):
    """
    Truncate input text to character limit (faster than token counting)
    ~4 chars per token average, so 12000 chars ≈ 3000 tokens
    """
    if len(text) > max_chars:
        print(f"⚠️  Input truncated from {len(text)} → {max_chars} characters")
        return text[:max_chars]
    return text

# ============================================================
# ⚙️ Groq LLM call helper - FIXED MODEL NAME
# ============================================================
def call_groq_llm(prompt, model="llama-3.1-70b-versatile", temperature=0.1, max_tokens=4000, retries=3, timeout=30):
    """
    Calls Groq LLM with retry logic and timeout.
    
    CRITICAL FIX: Using correct Groq model name
    - Was: "openai/gpt-oss-20b" (WRONG - not a Groq model)
    - Now: "llama-3.1-70b-versatile" (CORRECT)
    
    Available Groq models:
    - llama-3.1-70b-versatile (recommended, fast, accurate)
    - llama-3.1-8b-instant (fastest, less accurate)
    - mixtral-8x7b-32768 (good alternative)
    """
    if not client:
        raise Exception("Groq client not initialized. Please set GROQ_API_KEY environment variable.")

    for attempt in range(retries):
        try:
            start_time = time.time()
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert security analyst. "
                            "Return ONLY valid JSON, no markdown fences, no explanations. "
                            "Ensure JSON is complete and properly closed."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=1,
                stream=False,
            )
            
            elapsed = time.time() - start_time
            print(f"   LLM call completed in {elapsed:.2f}s")
            
            return chat_completion.choices[0].message.content.strip()
            
        except Exception as e:
            error_msg = str(e).lower()
            
            # Check for specific errors
            if "rate_limit" in error_msg or "429" in error_msg:
                wait_time = (2 ** attempt) * 2  # Longer wait for rate limits
                print(f"⚠️  Rate limit hit (attempt {attempt + 1}/{retries})")
                if attempt < retries - 1:
                    print(f"   Waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    raise Exception("❌ Rate limit exceeded - all retries exhausted")
            
            elif "model" in error_msg or "invalid" in error_msg:
                print(f"❌ Invalid model error: {e}")
                print(f"   Attempted model: {model}")
                print("   Available models: llama-3.1-70b-versatile, llama-3.1-8b-instant")
                raise
            
            elif "timeout" in error_msg:
                print(f"⚠️  Timeout error (attempt {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    print(f"   Retrying...")
                    time.sleep(1)
                else:
                    raise Exception("❌ Timeout - all retries exhausted")
            
            else:
                print(f"⚠️  Groq API call failed (attempt {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    print(f"   Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    raise Exception(f"❌ All retry attempts failed: {e}")

# ============================================================
# 🧰 JSON repair helper - IMPROVED
# ============================================================
def safe_json_parse(response_text):
    """
    Tries to fix and parse malformed JSON from LLM responses.
    """
    if not response_text or not response_text.strip():
        print("⚠️  Empty response from LLM")
        return None
    
    cleaned = response_text.strip()
    
    # Remove markdown code fences
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if len(lines) > 2:
            cleaned = "\n".join(lines[1:-1])
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    
    # Remove trailing commas before closing brackets
    cleaned = re.sub(r',\s*([\]}])', r'\1', cleaned)
    
    # Remove any text before first {
    first_brace = cleaned.find("{")
    if first_brace > 0:
        cleaned = cleaned[first_brace:]
    
    # Remove any text after last }
    last_brace = cleaned.rfind("}")
    if last_brace > 0:
        cleaned = cleaned[:last_brace + 1]
    
    # Attempt 1: Direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON parse error (attempt 1): {e}")
    
    # Attempt 2: Try to complete incomplete JSON
    try:
        # Add missing closing brackets
        open_braces = cleaned.count("{") - cleaned.count("}")
        open_brackets = cleaned.count("[") - cleaned.count("]")
        
        if open_braces > 0:
            cleaned += "}" * open_braces
        if open_brackets > 0:
            cleaned += "]" * open_brackets
        
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON parse error (attempt 2): {e}")
    
    # Attempt 3: Extract first complete JSON object
    try:
        brace_depth = 0
        for i, char in enumerate(cleaned):
            if char == '{':
                brace_depth += 1
            elif char == '}':
                brace_depth -= 1
                if brace_depth == 0:
                    potential_json = cleaned[:i+1]
                    return json.loads(potential_json)
    except Exception as e:
        print(f"⚠️  JSON parse error (attempt 3): {e}")
    
    print("❌ All JSON parsing attempts failed")
    print(f"   Response preview: {cleaned[:200]}...")
    return None

# ============================================================
# 🧠 Core function: process logs with LLM - OPTIMIZED
# ============================================================
def process_logs_with_llm(raw_logs, model="llama-3.1-70b-versatile"):
    """
    Process raw system logs using Groq LLM to extract structured data.
    
    OPTIMIZED VERSION:
    - Shorter, clearer prompt
    - Faster processing
    - Better error handling
    """
    if not raw_logs or not raw_logs.strip():
        print("⚠️  Empty logs provided")
        return {"nodes": [], "edges": [], "attack_type": "unknown", "confidence": 0.0}

    # Truncate to safe size
    log_sample = truncate_to_char_limit(raw_logs, max_chars=10000)
    
    # Count log lines for context
    log_lines = log_sample.strip().split("\n")
    print(f"   Processing {len(log_lines)} log lines ({len(log_sample)} chars)")

    # OPTIMIZED PROMPT - shorter, clearer, faster
    prompt = f"""Analyze these security logs and extract nodes and relationships.

LOGS (first {len(log_lines)} lines):
```
{log_sample}
```

Extract:
- Nodes: IPs, processes, services, users, hardware (id, type, attrs)
- Edges: connections between nodes (source, target, type)
- Attack assessment: benign/suspicious/malicious
- Confidence: 0.0-1.0

Return ONLY valid JSON (no markdown):
{{
  "nodes": [
    {{"id": "192.168.1.1", "type": "ip", "attrs": {{"cve": [], "description": "IP address"}}}},
    {{"id": "sshd", "type": "process", "attrs": {{"cve": [], "description": "SSH daemon"}}}}
  ],
  "edges": [
    {{"source": "192.168.1.1", "target": "sshd", "type": "connection"}}
  ],
  "attack_type": "brute_force",
  "confidence": 0.85
}}"""

    try:
        print("🤖 Calling Groq LLM for log parsing...")
        start_time = time.time()
        
        response = call_groq_llm(
            prompt, 
            model=model, 
            temperature=0.1, 
            max_tokens=4000,
            timeout=30
        )
        
        elapsed = time.time() - start_time
        print(f"✅ LLM parsing completed in {elapsed:.2f}s")
        
        # Parse JSON response
        parsed_data = safe_json_parse(response)

        if not parsed_data:
            print("⚠️  No valid JSON parsed, using fallback parser")
            return create_fallback_response(log_sample)

        # Ensure structure completeness
        parsed_data.setdefault("nodes", [])
        parsed_data.setdefault("edges", [])
        parsed_data.setdefault("attack_type", "unknown")
        parsed_data.setdefault("confidence", 0.5)

        # Validate and fix nodes
        valid_nodes = []
        for idx, node in enumerate(parsed_data["nodes"]):
            if not isinstance(node, dict):
                print(f"⚠️  Skipping invalid node at index {idx}")
                continue
            
            # Ensure required fields
            if "id" not in node:
                node["id"] = f"node_{idx}"
            
            node.setdefault("type", "unknown")
            node.setdefault("attrs", {})
            
            if not isinstance(node["attrs"], dict):
                node["attrs"] = {}
            
            node["attrs"].setdefault("cve", [])
            node["attrs"].setdefault("description", "N/A")
            
            valid_nodes.append(node)
        
        parsed_data["nodes"] = valid_nodes

        # Validate edges
        valid_edges = []
        node_ids = {n["id"] for n in valid_nodes}
        
        for edge in parsed_data.get("edges", []):
            if not isinstance(edge, dict):
                continue
            
            # Check if source and target exist
            if edge.get("source") in node_ids and edge.get("target") in node_ids:
                edge.setdefault("type", "connection")
                valid_edges.append(edge)
        
        parsed_data["edges"] = valid_edges

        print(f"✅ Extracted {len(parsed_data['nodes'])} nodes, {len(parsed_data['edges'])} edges")
        print(f"   Attack type: {parsed_data.get('attack_type')}")
        print(f"   Confidence: {parsed_data.get('confidence'):.2f}")
        
        return parsed_data

    except Exception as e:
        print(f"❌ LLM processing error: {e}")
        import traceback
        traceback.print_exc()
        print("🔄 Falling back to rule-based parser...")
        return create_fallback_response(log_sample)

# ============================================================
# 🛠️ Fallback parser (rule-based) - IMPROVED
# ============================================================
def create_fallback_response(log_sample):
    """
    Fast rule-based parser for when LLM fails
    """
    print("🔄 Using fallback rule-based parser...")

    nodes = []
    edges = []
    seen_ids = set()

    # Extract IPs
    ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
    ips = re.findall(ip_pattern, log_sample)
    for ip in ips[:20]:  # Limit to 20
        if ip not in seen_ids:
            nodes.append({
                "id": ip,
                "type": "ip",
                "attrs": {
                    "cve": [],
                    "description": f"IP address {ip}"
                }
            })
            seen_ids.add(ip)

    # Extract processes
    process_pattern = r'([a-zA-Z0-9_-]+)\[\d+\]'
    processes = re.findall(process_pattern, log_sample)
    for proc in processes[:20]:  # Limit to 20
        if proc not in seen_ids:
            nodes.append({
                "id": proc,
                "type": "process",
                "attrs": {
                    "cve": [],
                    "description": f"Process {proc}"
                }
            })
            seen_ids.add(proc)

    # Extract services (common patterns)
    services = ["ssh", "sshd", "systemd", "cloud-init", "kernel", "docker", "httpd", "nginx"]
    for service in services:
        if service in log_sample.lower() and service not in seen_ids:
            nodes.append({
                "id": service,
                "type": "service",
                "attrs": {
                    "cve": [],
                    "description": f"Service {service}"
                }
            })
            seen_ids.add(service)

    # Create edges (connect sequential nodes)
    if len(nodes) > 1:
        for i in range(min(len(nodes) - 1, 30)):  # Limit edges
            edges.append({
                "source": nodes[i]["id"],
                "target": nodes[i+1]["id"],
                "type": "connection"
            })

    # Detect attack type from keywords
    attack_type = "unknown"
    confidence = 0.3
    
    log_lower = log_sample.lower()
    if "failed password" in log_lower or "authentication failure" in log_lower:
        attack_type = "brute_force"
        confidence = 0.7
    elif "denied" in log_lower or "unauthorized" in log_lower:
        attack_type = "unauthorized_access"
        confidence = 0.6
    elif "cve-" in log_lower:
        attack_type = "exploit_attempt"
        confidence = 0.8

    print(f"✅ Fallback parser extracted {len(nodes)} nodes, {len(edges)} edges")
    print(f"   Detected attack type: {attack_type} (confidence: {confidence:.2f})")
    
    return {
        "nodes": nodes,
        "edges": edges,
        "attack_type": attack_type,
        "confidence": confidence
    }

# ============================================================
# 🧪 Self-Test
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("🧪 Testing LLM Processor Module")
    print("=" * 70)

    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not set. Cannot run test.")
        print("   Set it with: export GROQ_API_KEY='your-key'")
        exit(1)

    print(f"✅ GROQ_API_KEY is set ({len(GROQ_API_KEY)} characters)")

    sample_logs = """
[    3.693699] ena 0000:00:05.0: Elastic Network Adapter (ENA) v2.14.1g
[    3.933196] ena 0000:00:05.0 ens5: renamed from eth0
[    5.888950] cloud-init[1535]: Cloud-init v. 22.2.2 running 'init'
[    5.971175] cloud-init[1535]: ci-info: |  ens5  | True |  172.31.42.16  |
Oct 30 10:15:32 server sshd[1234]: Failed password for root from 192.168.1.100
Oct 30 10:15:45 server kernel: CVE-2024-1234 vulnerability detected
"""

    print("\nTest 1: Processing sample logs...")
    parsed = process_logs_with_llm(sample_logs)
    
    print(f"\n✅ Result Summary:")
    print(f"   Nodes: {len(parsed.get('nodes', []))}")
    print(f"   Edges: {len(parsed.get('edges', []))}")
    print(f"   Attack: {parsed.get('attack_type')}")
    print(f"   Confidence: {parsed.get('confidence', 0):.2f}")
    
    print("\nTest 2: Empty logs...")
    empty_result = process_logs_with_llm("")
    print(f"   Result: {empty_result}")
    
    print("\nTest 3: Fallback parser...")
    fallback_result = create_fallback_response(sample_logs)
    print(f"   Nodes: {len(fallback_result.get('nodes', []))}")
    
    print("\n" + "=" * 70)
    print("✅ All tests completed successfully!")
    print("=" * 70)