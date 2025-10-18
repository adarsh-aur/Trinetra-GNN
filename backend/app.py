# app.py - Flask Universal Multi-Cloud Entry Point with LLM-Driven Categorization
import os
import json
from datetime import datetime, timezone, timedelta
from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO
from llm_processor import process_logs_with_llm, call_groq_llm
from cve_scorer import get_cve_score
from graph_builder import build_graph
from anomaly_detector import compute_node_risk, zscore_anomaly_detection, llm_consensus_check
from gnn_trainer import train_on_examples
from utils.data_store import save_report

app = Flask(__name__)

# Enable pretty-printed JSON responses
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True
app.json.sort_keys = False

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Dynamic path configuration
SAMPLE_LOG_PATH = os.path.join("sample_data", "syslogs.log")
DATA_STORE_DIR = "data_store"
RESULTS_OUTPUT_PATH = os.path.join(DATA_STORE_DIR, "results.json")

# Ensure directories exist
os.makedirs(DATA_STORE_DIR, exist_ok=True)


def convert_to_ist(timestamp):
    """Convert Unix timestamp to IST format"""
    if timestamp is None:
        return None

    try:
        utc_time = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        ist_offset = timedelta(hours=5, minutes=30)
        ist_time = utc_time + ist_offset
        return ist_time.strftime("%Y-%m-%d %H:%M:%S IST")
    except (ValueError, OSError, OverflowError):
        return None


def llm_categorize_nodes(nodes_data, raw_logs):
    """
    Use Groq LLM to intelligently categorize nodes and detect cloud platforms

    Args:
        nodes_data: List of node dictionaries with id, type, cve info
        raw_logs: Original log text for context

    Returns:
        Dict mapping node_id to {category, cloud_platform, reasoning}
    """
    # Prepare node summary for LLM
    node_summary = []
    for node in nodes_data[:50]:  # Limit to 50 nodes to avoid token limits
        node_summary.append({
            "id": node.get("id"),
            "type": node.get("type"),
            "cve": node.get("cve", [])[:3],  # First 3 CVEs
            "risk_score": node.get("risk_score", 0)
        })

    prompt = f"""You are an expert cloud infrastructure and security analyst. Analyze the following nodes extracted from system logs and categorize each one.

**Log Context (excerpt):**
```
{raw_logs[:2000]}
```

**Nodes to Categorize:**
```json
{json.dumps(node_summary, indent=2)}
```

**Task:**
For each node, determine:
1. **Category**: Choose from: compute, network, storage, database, security, identity, monitoring, hardware, other
2. **Cloud Platform**: Choose from: aws, gcp, azure, oracle, generic (for on-premise/unknown)
3. **Reasoning**: Brief explanation (10-20 words)

**Category Definitions:**
- compute: VMs, containers, functions, processes, compute instances
- network: VPCs, subnets, interfaces, IPs, MACs, network devices
- storage: Buckets, disks, volumes, file systems, blob storage
- database: SQL/NoSQL databases, data stores, caches
- security: IAM, firewalls, WAF, security groups, auth systems
- identity: Users, roles, service accounts, identity management
- monitoring: Logging, metrics, monitoring services, observability
- hardware: Physical hardware, drivers, CPUs, GPUs, devices
- other: Anything that doesn't fit above categories

**Cloud Platform Detection:**
- Look for AWS indicators: EC2, S3, Lambda, VPC, CloudWatch, amazon, aws
- Look for GCP indicators: GCE, GCS, GKE, Cloud Functions, google, gcp
- Look for Azure indicators: VMs, Blob, AKS, Azure Functions, microsoft
- Look for Oracle indicators: OCI, Autonomous Database, oracle
- Use "generic" for standard Linux/Unix infrastructure without cloud specifics

**Output Format (JSON only, no markdown):**
{{
  "node_id_1": {{
    "category": "category_name",
    "cloud_platform": "platform_name",
    "reasoning": "brief explanation"
  }},
  "node_id_2": {{ ... }}
}}

Return ONLY valid JSON, no additional text or markdown.
"""

    try:
        print("🤖 Calling Groq LLM for intelligent node categorization...")
        response = call_groq_llm(prompt)

        # Try to extract JSON from response
        response_text = response.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace("```json", "").replace("```", "").strip()

        # Parse JSON
        categorization = json.loads(response_text)

        print(f"✅ LLM categorized {len(categorization)} nodes")
        return categorization

    except json.JSONDecodeError as e:
        print(f"⚠️ Failed to parse LLM categorization response: {e}")
        print(f"Response was: {response[:500]}...")
        return {}
    except Exception as e:
        print(f"⚠️ LLM categorization error: {e}")
        return {}


def fallback_categorize_node(node_type, node_id):
    """Fallback rule-based categorization if LLM fails"""
    identifier = f"{node_type}_{node_id}".lower()

    if any(x in identifier for x in ["network", "vpc", "subnet", "ip", "interface", "mac", "ens", "eth"]):
        return "network"
    elif any(x in identifier for x in ["compute", "vm", "instance", "process", "lambda", "function"]):
        return "compute"
    elif any(x in identifier for x in ["storage", "s3", "blob", "disk", "volume", "bucket"]):
        return "storage"
    elif any(x in identifier for x in ["database", "db", "sql", "nosql", "rds"]):
        return "database"
    elif any(x in identifier for x in ["iam", "user", "role", "identity", "auth", "security"]):
        return "security"
    elif any(x in identifier for x in ["hardware", "cpu", "gpu", "driver", "device"]):
        return "hardware"
    elif any(x in identifier for x in ["monitor", "log", "metric", "cloudwatch"]):
        return "monitoring"
    return "other"


def fallback_detect_platform(node_type, node_id, cve_list):
    """Fallback rule-based platform detection if LLM fails"""
    node_str = f"{node_type}_{node_id}".lower()
    cve_str = " ".join(cve_list).lower() if cve_list else ""

    if any(x in node_str or x in cve_str for x in ["ec2", "s3", "lambda", "aws", "amazon"]):
        return "aws"
    elif any(x in node_str or x in cve_str for x in ["gce", "gcs", "gke", "gcp", "google"]):
        return "gcp"
    elif any(x in node_str or x in cve_str for x in ["azure", "blob", "aks", "microsoft"]):
        return "azure"
    elif any(x in node_str or x in cve_str for x in ["oci", "oracle", "autonomous"]):
        return "oracle"
    return "generic"


def generate_d3_results_inline(gnn_report, llm_categorization):
    """
    Universal D3.js results generator using LLM categorization
    """
    node_registry = {}
    node_id_counter = 0

    def get_d3_node_id(original_id):
        nonlocal node_id_counter
        if original_id not in node_registry:
            node_registry[original_id] = node_id_counter
            node_id_counter += 1
        return node_registry[original_id]

    def get_node_color(category, anomaly_prob, risk_score):
        """Dynamic color based on category, anomaly probability, and risk"""
        if anomaly_prob > 0.7:
            return "#c0392b"  # Dark red
        elif anomaly_prob > 0.5:
            return "#e67e22"  # Orange
        elif risk_score > 7.0:
            return "#e74c3c"  # Red for high risk

        category_colors = {
            "compute": "#3498db",  # Blue
            "network": "#2ecc71",  # Green
            "storage": "#9b59b6",  # Purple
            "database": "#e67e22",  # Orange
            "security": "#e74c3c",  # Red
            "identity": "#f39c12",  # Yellow
            "hardware": "#34495e",  # Dark gray
            "monitoring": "#1abc9c",  # Turquoise
            "other": "#95a5a6"  # Gray
        }
        return category_colors.get(category, "#95a5a6")

    # Extract data from report
    graph_nodes = gnn_report.get("graph", {}).get("nodes", [])
    gnn_predictions = gnn_report.get("gnn_analysis", {}).get("predictions", [])
    pred_lookup = {p["node_id"]: p for p in gnn_predictions}

    # Build D3 nodes using LLM categorization
    d3_nodes = []
    group_mapping = {}
    current_group = 0
    platform_count = {}
    category_dist = {}

    for node in graph_nodes:
        original_id = node.get("id")
        node_type = node.get("type", "unknown")
        cve_list = node.get("cve", [])
        risk_score = float(node.get("risk_score", 0.0))

        # Get LLM categorization or fallback
        llm_cat = llm_categorization.get(original_id, {})

        if llm_cat:
            category = llm_cat.get("category", "other")
            cloud = llm_cat.get("cloud_platform", "generic")
            reasoning = llm_cat.get("reasoning", "")
        else:
            # Fallback to rule-based
            category = fallback_categorize_node(node_type, original_id)
            cloud = fallback_detect_platform(node_type, original_id, cve_list)
            reasoning = "Fallback categorization"

        platform_count[cloud] = platform_count.get(cloud, 0) + 1
        category_dist[category] = category_dist.get(category, 0) + 1

        # Assign group ID
        if category not in group_mapping:
            group_mapping[category] = current_group
            current_group += 1

        # Get GNN prediction
        pred = pred_lookup.get(original_id, {})
        anomaly_prob = float(pred.get("anomaly_probability", 0.0))

        # Get numeric ID
        numeric_id = get_d3_node_id(original_id)

        d3_node = {
            "id": numeric_id,
            "name": original_id,
            "type": node_type,
            "cloud_platform": cloud,
            "category": category,
            "categorization_reasoning": reasoning,
            "risk_score": risk_score,
            "anomaly_probability": anomaly_prob,
            "is_anomaly": bool(pred.get("predicted_label", 0)),
            "cve": cve_list,
            "cve_count": len(cve_list),
            "last_seen": node.get("last_seen"),
            "group": group_mapping[category],
            "size": max(5, 5 + (risk_score * 2)),
            "color": get_node_color(category, anomaly_prob, risk_score)
        }

        d3_nodes.append(d3_node)

    # Build D3 links
    graph_links = gnn_report.get("graph", {}).get("links", [])
    d3_links = []

    for link in graph_links:
        source_id = get_d3_node_id(link.get("source"))
        target_id = get_d3_node_id(link.get("target"))

        d3_link = {
            "source": source_id,
            "target": target_id,
            "type": link.get("type", "connection"),
            "weight": float(link.get("weight", 1.0)),
            "count": int(link.get("count", 1)),
            "value": float(link.get("weight", 1.0))
        }

        d3_links.append(d3_link)

    # Calculate statistics
    risks = [n["risk_score"] for n in d3_nodes]
    anomaly_probs = [n["anomaly_probability"] for n in d3_nodes]
    cve_counts = [n["cve_count"] for n in d3_nodes]

    # Build metadata
    metadata = {
        "timestamp": gnn_report.get("timestamp"),
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "analysis_summary": {
            "total_nodes": len(d3_nodes),
            "total_links": len(d3_links),
            "attack_type": gnn_report.get("attack_analysis", {}).get("attack_type"),
            "confidence": gnn_report.get("attack_analysis", {}).get("confidence"),
            "anomalies_detected": gnn_report.get("statistical_analysis", {}).get("anomalies_detected_count", 0),
            "anomalies_confirmed": gnn_report.get("statistical_analysis", {}).get("anomalies_confirmed_count", 0),
            "gnn_accuracy": gnn_report.get("gnn_analysis", {}).get("accuracy", 0.0),
            "gnn_precision": gnn_report.get("gnn_analysis", {}).get("precision", 0.0),
            "gnn_recall": gnn_report.get("gnn_analysis", {}).get("recall", 0.0),
            "gnn_f1_score": gnn_report.get("gnn_analysis", {}).get("f1_score", 0.0)
        },
        "cloud_platforms": platform_count,
        "category_distribution": category_dist,
        "risk_statistics": {
            "avg_risk_score": round(sum(risks) / len(risks), 2) if risks else 0.0,
            "max_risk_score": round(max(risks), 2) if risks else 0.0,
            "min_risk_score": round(min(risks), 2) if risks else 0.0,
            "avg_anomaly_probability": round(sum(anomaly_probs) / len(anomaly_probs), 2) if anomaly_probs else 0.0,
            "high_risk_nodes": len([r for r in risks if r > 7.0]),
            "anomalous_nodes": len([p for p in anomaly_probs if p > 0.5]),
            "total_cves": sum(cve_counts),
            "nodes_with_cves": len([c for c in cve_counts if c > 0])
        },
        "categorization_method": "llm_driven",
        "d3_config": {
            "force_strength": -300,
            "link_distance": 100,
            "charge_strength": -200,
            "collision_radius": 30,
            "center_force": 0.1
        }
    }

    return {
        "nodes": d3_nodes,
        "links": d3_links,
        "metadata": metadata
    }


@app.route("/ingest_file", methods=["POST"])
def ingest_file():
    """Ingest logs from the default syslogs.log file"""
    if not os.path.exists(SAMPLE_LOG_PATH):
        return jsonify({
            "status": "error",
            "message": f"Log file not found: {SAMPLE_LOG_PATH}"
        }), 404

    with open(SAMPLE_LOG_PATH, "r", errors="ignore") as f:
        raw = f.read()

    return process_and_emit(raw)


@app.route("/ingest_text", methods=["POST"])
def ingest_text():
    """Ingest logs from HTTP request body"""
    raw = request.json.get("logs", "")
    if not raw:
        return jsonify({
            "status": "error",
            "message": "No logs provided in request body"
        }), 400

    return process_and_emit(raw)


def process_and_emit(raw_logs):
    """
    Universal log processing pipeline with LLM-driven categorization
    """
    print(f"\n{'=' * 70}")
    print(f"🚀 Processing {len(raw_logs)} characters of log data")
    print(f"{'=' * 70}\n")

    # ================================================================
    # STEP 1: Parse logs with LLM
    # ================================================================
    parsed = process_logs_with_llm(raw_logs)

    if not parsed or not parsed.get("nodes"):
        print("⚠️ No nodes returned by LLM.")
        return jsonify({
            "status": "error",
            "message": "Failed to parse logs - no nodes extracted"
        }), 400

    print(f"✅ LLM extracted {len(parsed.get('nodes', []))} nodes")

    # ================================================================
    # STEP 2: Compute risk scores
    # ================================================================
    nodes_with_risk = []

    for n in parsed.get("nodes", []):
        attrs = n.get("attrs", {})
        n["attrs"] = attrs
        n["risk"] = compute_node_risk(n)

        nodes_with_risk.append({
            "id": n.get("id"),
            "type": n.get("type"),
            "risk_score": n.get("risk", 0.0),
            "cve": attrs.get("cve", []),
            "last_seen": convert_to_ist(attrs.get("last_seen"))
        })

    print(f"✅ Computed risk scores for {len(nodes_with_risk)} nodes")

    # ================================================================
    # STEP 2.5: LLM-Driven Node Categorization & Cloud Detection
    # ================================================================
    print(f"\n🤖 Using Groq LLM for intelligent categorization...")
    llm_categorization = llm_categorize_nodes(nodes_with_risk, raw_logs)

    # ================================================================
    # STEP 3: Statistical anomaly detection
    # ================================================================
    node_list = []
    for n in parsed.get("nodes", []):
        node_list.append({
            "id": n.get("id"),
            "risk": n.get("risk"),
            "attrs": n.get("attrs"),
            "type": n.get("type")
        })

    anomalies, threshold = zscore_anomaly_detection(node_list)
    confirmed = llm_consensus_check(raw_logs, anomalies)

    print(f"✅ Z-score analysis: {len(anomalies)} anomalies detected")
    print(f"✅ LLM consensus: {len(confirmed)} anomalies confirmed")

    # Store detailed anomaly information
    anomalies_detailed = []
    for a in anomalies:
        anomalies_detailed.append({
            "id": a.get("id"),
            "risk_score": a.get("risk"),
            "type": a.get("type"),
            "z_score": a.get("z_score", None)
        })

    confirmed_detailed = []
    for c in confirmed:
        confirmed_detailed.append({
            "id": c.get("id"),
            "risk_score": c.get("risk"),
            "type": c.get("type"),
            "reason": c.get("reason", "LLM confirmed")
        })

    # ================================================================
    # STEP 4: Build graph structure
    # ================================================================
    for n in parsed.get("nodes", []):
        n_attrs = n.get("attrs", {})
        n_attrs["risk_score"] = n.get("risk", 0.0)
        n["attrs"] = n_attrs

    graph_payload = build_graph(parsed)

    # Convert timestamps to IST
    for node in graph_payload["graph"].get("nodes", []):
        if "last_seen" in node:
            node["last_seen"] = convert_to_ist(node["last_seen"])

    main_timestamp = graph_payload.get("meta", {}).get("timestamp")
    ist_timestamp = convert_to_ist(main_timestamp) if main_timestamp else None

    # Store edges information
    edges_info = []
    for link in graph_payload["graph"].get("links", []):
        edges_info.append({
            "source": link.get("source"),
            "target": link.get("target"),
            "type": link.get("type"),
            "weight": link.get("weight", 1.0),
            "count": link.get("count", 1)
        })

    print(f"✅ Built graph: {len(graph_payload['graph'].get('nodes', []))} nodes, {len(edges_info)} edges")

    # ================================================================
    # STEP 5: Train GNN model
    # ================================================================
    labels = {}
    for c in confirmed:
        labels[c["id"]] = 1

    for n in parsed.get("nodes", []):
        if n["id"] not in labels:
            labels[n["id"]] = 0

    import networkx as nx
    G = nx.node_link_graph(graph_payload["graph"], edges="links")

    print(f"\n🤖 Training GNN model with {len(labels)} labeled nodes...")
    train_result = train_on_examples(G, labels, epochs=50, lr=1e-3, verbose=True)

    # Extract GNN predictions
    gnn_predictions = []
    if train_result.get("probs") is not None and train_result.get("id_map"):
        id_map = train_result.get("id_map")
        probs = train_result.get("probs")

        for node_id, idx in id_map.items():
            gnn_predictions.append({
                "node_id": node_id,
                "anomaly_probability": float(probs[idx]),
                "predicted_label": int(probs[idx] > 0.5),
                "actual_label": labels.get(node_id, 0)
            })

    # ================================================================
    # STEP 6: Build comprehensive report
    # ================================================================
    report = {
        "status": "ok",
        "timestamp": ist_timestamp,
        "attack_analysis": {
            "attack_type": parsed.get("attack_type"),
            "confidence": parsed.get("confidence", 0),
        },
        "statistical_analysis": {
            "zscore_threshold": float(threshold),
            "total_nodes": len(nodes_with_risk),
            "total_edges": len(edges_info),
            "anomalies_detected_count": len(anomalies),
            "anomalies_confirmed_count": len(confirmed),
        },
        "nodes_information": nodes_with_risk,
        "edges_information": edges_info,
        "anomalies_detected": anomalies_detailed,
        "anomalies_confirmed": confirmed_detailed,
        "llm_categorization": llm_categorization,
        "gnn_analysis": {
            "training_epochs": train_result.get("training_epochs", 0),
            "learning_rate": 1e-3,
            "accuracy": train_result.get("accuracy", 0.0),
            "precision": train_result.get("precision", 0.0),
            "recall": train_result.get("recall", 0.0),
            "f1_score": train_result.get("f1_score", 0.0),
            "model_architecture": {
                "type": "AdaptiveGCN",
                "input_dim": train_result.get("embeddings").shape[1] if train_result.get(
                    "embeddings") is not None else 0,
                "hidden_dim": 64,
                "output_dim": 32
            },
            "feature_names": train_result.get("feature_names", []),
            "predictions": gnn_predictions,
            "final_loss": train_result.get("final_loss", 0.0)
        },
        "embeddings_shape": list(train_result.get("embeddings").shape) if train_result.get(
            "embeddings") is not None else [0, 0],
        "device_used": "cuda" if train_result.get("model") and next(
            train_result.get("model").parameters()).is_cuda else "cpu",
        "graph": graph_payload["graph"]
    }

    # ================================================================
    # STEP 7: Save report
    # ================================================================
    report_path = save_report(report)
    report["report_path"] = report_path

    print(f"\n📄 Report saved to: {report_path}")

    # ================================================================
    # STEP 8: Generate D3.js results with LLM categorization
    # ================================================================
    try:
        d3_results = generate_d3_results_inline(report, llm_categorization)

        with open(RESULTS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(d3_results, f, indent=2, ensure_ascii=False)

        report["d3_results_path"] = RESULTS_OUTPUT_PATH

        print(f"📊 D3.js results saved to: {RESULTS_OUTPUT_PATH}")
        print(f"   - Nodes: {len(d3_results['nodes'])}")
        print(f"   - Links: {len(d3_results['links'])}")
        print(f"   - Platforms: {d3_results['metadata']['cloud_platforms']}")
        print(f"   - Categories: {d3_results['metadata']['category_distribution']}")

    except Exception as e:
        print(f"⚠️ Error generating D3 results: {e}")
        import traceback
        traceback.print_exc()
        report["d3_results_path"] = None

    # ================================================================
    # STEP 9: Print summary
    # ================================================================
    print(f"\n{'=' * 70}")
    print(f"✅ Processing complete!")
    print(f"{'=' * 70}")
    print(f"   Total nodes:          {len(nodes_with_risk)}")
    print(f"   Total edges:          {len(edges_info)}")
    print(f"   Anomalies detected:   {len(anomalies)}")
    print(f"   Anomalies confirmed:  {len(confirmed)}")
    print(f"   GNN Accuracy:         {train_result.get('accuracy', 0.0):.2%}")
    print(f"   GNN Precision:        {train_result.get('precision', 0.0):.2%}")
    print(f"   GNN Recall:           {train_result.get('recall', 0.0):.2%}")
    print(f"   GNN F1 Score:         {train_result.get('f1_score', 0.0):.2%}")
    print(f"{'=' * 70}\n")

    # ================================================================
    # STEP 10: Emit via WebSocket
    # ================================================================
    payload = {
        "graph": graph_payload["graph"],
        "meta": graph_payload.get("meta", {}),
        "report": report,
        "embeddings": train_result.get("embeddings").tolist() if train_result.get("embeddings") is not None else None,
        "probs": train_result.get("probs").tolist() if train_result.get("probs") is not None else None
    }
    socketio.emit("graph_update", payload)

    return jsonify(report), 200


@socketio.on("connect")
def on_connect():
    print("✅ Client connected via WebSocket")


@socketio.on("disconnect")
def on_disconnect():
    print("❌ Client disconnected from WebSocket")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🛡️  Multi-Cloud GNN Threat Analyzer - LLM-Driven Edition")
    print("=" * 70)
    print(f"📂 Sample log path: {os.path.abspath(SAMPLE_LOG_PATH)}")
    print(f"💾 Data store path: {os.path.abspath(DATA_STORE_DIR)}")
    print(f"🤖 Categorization: Groq LLM-Driven (Intelligent)")
    print(f"🌐 Starting server on http://0.0.0.0:5000")
    print("=" * 70 + "\n")

    socketio.run(app, host="0.0.0.0", port=5000)