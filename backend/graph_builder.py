# graph_builder.py
import networkx as nx
from networkx.readwrite import json_graph
import time

def build_graph(parsed: dict):
    """
    Input parsed JSON from llm_processor.process_logs_with_llm
    Adds computed weights and returns node_link JSON for frontend.
    """
    G = nx.DiGraph()
    # Add nodes
    for n in parsed.get("nodes", []):
        nid = n.get("id")
        attrs = n.get("attrs", {})
        attrs["type"] = n.get("type")
        attrs["cve"] = n.get("cve", [])
        # base risk: sum(cve scores) will be filled later
        attrs.setdefault("risk_score", 0.0)
        attrs.setdefault("last_seen", time.time())
        G.add_node(nid, **attrs)

    # Add edges
    for e in parsed.get("edges", []):
        src = e.get("source")
        tgt = e.get("target")
        attrs = e.get("attrs", {})
        attrs["type"] = e.get("type", "connection")
        attrs.setdefault("weight", 1.0)  # will be updated
        attrs.setdefault("count", 1)
        if G.has_edge(src, tgt):
            G[src][tgt]["count"] += 1
            G[src][tgt]["weight"] += attrs["weight"]
        else:
            G.add_edge(src, tgt, **attrs)

    # Convert to node-link JSON for D3/Cytoscape
    data = json_graph.node_link_data(G)
    return {"graph": data, "meta": {"generated_at": time.time(), "attack_type": parsed.get("attack_type", "unknown"), "confidence": parsed.get("confidence", 0)}}
