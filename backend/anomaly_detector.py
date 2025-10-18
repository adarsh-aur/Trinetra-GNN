import numpy as np
from scipy import stats
# Assuming these external modules exist and function as described
from llm_processor import process_logs_with_llm
from cve_scorer import get_cve_score
from utils.data_store import append_training_example


def compute_node_risk(node):
    """
    Computes a combined risk score for a node based on base risk, CVSS scores,
    and the presence of suspicious keywords in its attributes.

    Args:
        node (dict): Dictionary representing a node, potentially containing
                     'risk_score' and 'cve' list in root or 'attrs'.

    Returns:
        float: The calculated aggregate risk score.
    """
    # 1. Base Risk
    # Use the existing risk_score or default to 0.0
    base_risk = float(node.get("risk_score", 0.0))

    # 2. CVE Total Score
    # Check for 'cve' list in root, then in 'attrs', defaulting to an empty list
    cves = node.get("cve", []) or node.get("attrs", {}).get("cve", [])
    cve_total = 0.0
    for cve_id in cves:
        try:
            # Safely attempt to get and sum the CVE score
            cve_score = get_cve_score(cve_id)
            if cve_score is not None:
                cve_total += float(cve_score)
        except (ValueError, TypeError, Exception) as e:
            # Handle cases where a single CVE score lookup fails (e.g., bad ID, API error)
            print(f"Warning: Failed to process CVE score for {cve_id}. Error: {e}")
            pass

    # 3. Keyword Heuristic Boost (Signal from attributes/logs)
    keyword_boost = 0.0
    # Combine all string attributes for keyword searching
    all_text = " ".join([
        str(v) for v in node.get("attrs", {}).values() if isinstance(v, (str, bytes))
    ])
    suspicious_keywords = ["failed", "unauthorized", "error", "segfault", "attack", "vulnerability", "exploit"]

    for k in suspicious_keywords:
        if k in all_text.lower():
            # Apply a boost for each keyword found
            keyword_boost += 1.0

    # Final Risk Calculation: Sum of components
    risk = base_risk + cve_total + keyword_boost
    return risk


# alterable for z_score_threshold = infinity
def zscore_anomaly_detection(nodes):
    """
    Performs Z-score based anomaly detection on the 'risk' scores of the nodes.
    An anomaly is defined as a node whose absolute Z-score exceeds an adaptive threshold.

    Args:
        nodes (list): List of node dictionaries, each expected to have a 'risk' key.

    Returns:
        tuple: (list of anomalous nodes, the calculated universal threshold)
    """
    # Extract risk scores, defaulting to 0.0 if 'risk' is missing
    risks = np.array([n.get("risk", 0.0) for n in nodes])

    if len(risks) < 2:
        # Cannot compute meaningful statistics with less than two data points
        return [], float('inf')

    # Calculate standard deviation
    std_dev = np.std(risks)

    if std_dev == 0:
        # If standard deviation is 0, all risk scores are identical.
        # No deviation (and thus no anomaly) can be detected. Return inf threshold.
        return [], 2.0

    # Calculate absolute Z-scores
    z_scores = np.abs(stats.zscore(risks))

    # Adaptive threshold calculation: Mean(Z-scores) + 2 * StdDev(Z-scores)
    # This adapts the threshold based on the current data distribution.
    mean_z = np.mean(z_scores)
    std_z = np.std(z_scores)
    threshold = mean_z + 2 * std_z

    # Identify anomalies: where Z-score is greater than the adaptive threshold
    anomalies = [nodes[i] for i, v in enumerate(z_scores) if v > threshold]

    return anomalies, threshold


def llm_consensus_check(raw_logs, candidates):
    """
    Uses an external LLM to confirm or refine candidate anomalies based on raw log data.
    The function is wrapped in error handling to manage unpredictable LLM output.
    Records the LLM's decision (label) for reinforcement learning/training.

    Args:
        raw_logs (str): The raw logs that generated the candidates (for LLM context).
        candidates (list): List of node dictionaries statistically identified as potential anomalies.

    Returns:
        list: List of nodes confirmed as anomalous by the LLM.
    """
    # Truncate logs to stay within typical LLM context windows (e.g., 4000 chars)
    log_context = raw_logs[:4000]
    candidate_ids = [c.get("id", "UNKNOWN") for c in candidates]

    # Construct the prompt explicitly asking for a JSON list of confirmed anomaly IDs
    prompt = (
        "From the following log excerpt, please confirm which of these entities are "
        "likely security incidents or serious anomalies. Return ONLY a JSON list of "
        "the confirmed entity IDs.\n\n"
        f"Logs:\n{log_context}\n\n"
        f"Candidate Entity IDs:\n{candidate_ids}\n\n"
        "Return JSON list, e.g., [\"id123\", \"id456\"]."
    )

    confirmed_ids = []
    parsed = {}

    try:
        # 1. Call LLM for consensus
        parsed = process_logs_with_llm(prompt)

        # 2. Robustly extract confirmed IDs from the LLM's potentially varied response formats.
        if isinstance(parsed, list):
            confirmed_ids = parsed
        elif isinstance(parsed, dict):
            # Check for common expected keys like 'confirmed' or 'nodes'
            if 'confirmed' in parsed and isinstance(parsed['confirmed'], list):
                confirmed_ids = parsed['confirmed']
            elif 'nodes' in parsed and isinstance(parsed['nodes'], list):
                # Extract IDs if the LLM returned a list of node dictionaries
                confirmed_ids = [n.get("id") for n in parsed["nodes"] if n.get("id")]

        # Ensure all extracted IDs are valid strings
        confirmed_ids = [str(id) for id in confirmed_ids if id is not None]

    except Exception as e:
        # Crucial error handling: If LLM call fails or returns malformed/non-JSON data,
        # we log the error and continue, treating confirmed_ids as empty.
        print(f"Error during LLM consensus check: {e}. Skipping consensus for this batch.")
        # confirmed_ids remains empty, ensuring no false positives are confirmed on failure.
        pass

    # 3. Record Examples for Training/Reinforcement
    # Record the LLM's decision (1=confirmed, 0=rejected) for later model training
    for c in candidates:
        node_id = c.get("id")
        if node_id:
            label = 1 if node_id in confirmed_ids else 0
            append_training_example({"node": c, "label": label})

    # 4. Return the list of nodes confirmed by the LLM
    confirmed = [c for c in candidates if c.get("id") in confirmed_ids]
    return confirmed
