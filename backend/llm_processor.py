"""
LLM Processor (Groq + Token Safe + Robust JSON Recovery)
--------------------------------------------------------
Drop this file into your backend project.
"""

import os
import json
import time
import re
from groq import Groq
from dotenv import load_dotenv
import tiktoken

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
# 🧮 Token utilities
# ============================================================
def truncate_to_token_limit(text, model="openai/gpt-oss-20b", max_tokens=3000):
    """
    Truncate input text to avoid token limit exhaustion.
    """
    try:
        enc = tiktoken.encoding_for_model("gpt-4")
    except Exception:
        enc = tiktoken.get_encoding("cl100k_base")

    tokens = enc.encode(text)
    if len(tokens) > max_tokens:
        print(f"⚠️  Input truncated from {len(tokens)} → {max_tokens} tokens")
        tokens = tokens[:max_tokens]
    return enc.decode(tokens)

# ============================================================
# ⚙️ Groq LLM call helper
# ============================================================
def call_groq_llm(prompt, model="openai/gpt-oss-20b", temperature=0.1, max_tokens=4000, retries=3):
    """
    Calls Groq LLM with retry logic.
    """
    if not client:
        raise Exception("Groq client not initialized. Please set GROQ_API_KEY environment variable.")

    for attempt in range(retries):
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert cloud infrastructure and security analyst. "
                            "Always return valid JSON, no markdown, no explanations."
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
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"⚠️  Groq API call failed (attempt {attempt + 1}/{retries}): {e}")
            if attempt < retries - 1:
                wait_time = 2 ** attempt
                print(f"   Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise Exception("❌ All retry attempts failed.")

# ============================================================
# 🧰 JSON repair helper
# ============================================================
def safe_json_parse(response_text):
    """
    Tries to fix and parse malformed JSON from LLM responses.
    """
    cleaned = response_text.strip()
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    cleaned = re.sub(r',\s*([\]}])', r'\1', cleaned)  # remove trailing commas

    # Attempt parsing
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        last_brace = max(cleaned.rfind("}"), cleaned.rfind("]"))
        if last_brace > 0:
            try:
                return json.loads(cleaned[:last_brace + 1])
            except Exception:
                pass
        print("⚠️  Still invalid JSON, fallback engaged.")
        return None

# ============================================================
# 🧠 Core function: process logs with LLM
# ============================================================
def process_logs_with_llm(raw_logs, model="openai/gpt-oss-20b"):
    """
    Process raw system logs using Groq LLM to extract structured data.
    """
    if not raw_logs.strip():
        return {"nodes": [], "edges": [], "attack_type": "unknown", "confidence": 0.0}

    log_sample = truncate_to_token_limit(raw_logs, model=model, max_tokens=3000)

    prompt = f"""
Analyze the following system logs and extract security-relevant entities and relationships.

Logs:
{log_sample}

Extract:
1. Nodes (IP addresses, processes, interfaces, hardware, users, services)
2. Edges (connections or relationships)
3. Attack assessment (benign/suspicious/malicious)
4. Confidence (0.0 to 1.0)

Return ONLY valid JSON that ends with a closing curly brace (no markdown).

JSON Format:
{{
  "nodes": [
    {{
      "id": "172.31.42.16",
      "type": "ip",
      "attrs": {{
        "cve": [],
        "description": "IP address"
      }}
    }}
  ],
  "edges": [
    {{
      "source": "cloud-init",
      "target": "172.31.42.16",
      "type": "connection"
    }}
  ],
  "attack_type": "benign",
  "confidence": 0.8
}}
"""

    try:
        print("🤖 Calling Groq LLM...")
        response = call_groq_llm(prompt, model=model, temperature=0.1, max_tokens=3500)
        parsed_data = safe_json_parse(response)

        if not parsed_data:
            print("⚠️  No valid JSON parsed, using fallback.")
            return create_fallback_response(log_sample)

        # Ensure structure completeness
        parsed_data.setdefault("nodes", [])
        parsed_data.setdefault("edges", [])
        parsed_data.setdefault("attack_type", "unknown")
        parsed_data.setdefault("confidence", 0.5)

        for node in parsed_data["nodes"]:
            node.setdefault("attrs", {"cve": [], "description": "N/A"})
            node.setdefault("type", "unknown")

        print(f"✅ Parsed {len(parsed_data['nodes'])} nodes, {len(parsed_data['edges'])} edges")
        return parsed_data

    except Exception as e:
        print(f"❌ LLM processing error: {e}")
        import traceback; traceback.print_exc()
        return create_fallback_response(log_sample)

# ============================================================
# 🛠️ Fallback parser (rule-based)
# ============================================================
def create_fallback_response(log_sample):
    print("🔄 Using fallback parser...")

    nodes, edges = [], []

    ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
    ips = set(re.findall(ip_pattern, log_sample))
    for ip in list(ips)[:10]:
        nodes.append({
            "id": ip,
            "type": "ip",
            "attrs": {"cve": [], "description": "IP address"}
        })

    process_pattern = r'([a-zA-Z0-9_-]+)\[\d+\]'
    processes = set(re.findall(process_pattern, log_sample))
    for proc in list(processes)[:10]:
        nodes.append({
            "id": proc,
            "type": "process",
            "attrs": {"cve": [], "description": f"Process {proc}"}
        })

    if len(nodes) > 1:
        for i in range(len(nodes) - 1):
            edges.append({
                "source": nodes[i]["id"],
                "target": nodes[i+1]["id"],
                "type": "connection"
            })

    print(f"✅ Fallback extracted {len(nodes)} nodes, {len(edges)} edges")
    return {"nodes": nodes, "edges": edges, "attack_type": "unknown", "confidence": 0.3}

# ============================================================
# 🧪 Self-Test
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("🧪 Testing LLM Processor Module")
    print("=" * 70)

    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not set. Cannot run test.")
        exit(1)

    sample_logs = """
[    3.693699] ena 0000:00:05.0: Elastic Network Adapter (ENA) v2.14.1g
[    3.933196] ena 0000:00:05.0 ens5: renamed from eth0
[    5.888950] cloud-init[1535]: Cloud-init v. 22.2.2 running 'init'
[    5.971175] cloud-init[1535]: ci-info: |  ens5  | True |  172.31.42.16  |
"""

    parsed = process_logs_with_llm(sample_logs)
    print(f"\n✅ Result Summary:")
    print(json.dumps(parsed, indent=2))
    print("=" * 70)
