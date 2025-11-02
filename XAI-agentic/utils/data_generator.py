# import torch
# import networkx as nx
# import numpy as np
# from torch_geometric.data import Data


# def generate_synthetic_graph(num_nodes=100, num_features=16, anomaly_rate=0.05):
#     """Generate synthetic graph with injected anomalies"""

#     # Generate Barabasi-Albert graph
#     G = nx.barabasi_albert_graph(num_nodes, 3)
#     edge_index = torch.tensor(list(G.edges())).t().contiguous()
#     edge_index = torch.cat([edge_index, edge_index.flip(0)], dim=1)

#     # Normal features
#     x = torch.randn(num_nodes, num_features)

#     # Inject anomalies
#     num_anomalies = max(1, int(num_nodes * anomaly_rate))
#     anomaly_nodes = np.random.choice(num_nodes, num_anomalies, replace=False)

#     for node in anomaly_nodes:
#         x[node] = x[node] * 3 + torch.randn(num_features) * 2

#     return Data(x=x, edge_index=edge_index)


"""
utils/data_generator.py - Integrated Syslog-Based GNN Graph Generator
Converts real-time syslog data into graph structure for GNN analysis
"""

import torch
import networkx as nx
import numpy as np
from torch_geometric.data import Data
import re
from datetime import datetime
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class SyslogToGraphConverter:
    """
    Converts syslog entries into graph structure for GNN analysis.

    Architecture:
    - Nodes: Represent entities (IPs, processes, services, users)
    - Edges: Represent interactions (connections, authentications, process spawns)
    - Features: Behavioral patterns extracted from logs
    """

    def __init__(self):
        self.node_mapping = {}  # entity_id -> node_index
        self.node_features = []  # List of feature vectors
        self.edges = []  # List of (source, target) tuples
        self.node_types = {}  # node_index -> type (IP, process, service, etc.)
        self.malicious_nodes = set()  # Track known malicious nodes

    def extract_entities_from_syslog(self, log_line):
        """
        Extract entities from a syslog line.
        Returns: dict of entities found
        """
        entities = {
            'ips': [],
            'processes': [],
            'services': [],
            'users': [],
            'ports': [],
            'files': []
        }

        # Extract IPs (IPv4)
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        entities['ips'] = re.findall(ip_pattern, log_line)

        # Extract processes (word[number] pattern)
        process_pattern = r'(\w+)\[(\d+)\]'
        processes = re.findall(process_pattern, log_line)
        entities['processes'] = [f"{p[0]}:{p[1]}" for p in processes]

        # Extract services (.service pattern)
        service_pattern = r'([\w-]+\.service)'
        entities['services'] = re.findall(service_pattern, log_line)

        # Extract users
        user_pattern = r'user (\w+)|for (\w+) from'
        users = re.findall(user_pattern, log_line)
        entities['users'] = [u for t in users for u in t if u]

        # Extract ports
        port_pattern = r'port (\d+)'
        entities['ports'] = re.findall(port_pattern, log_line)

        # Extract file paths
        file_pattern = r'/[\w/.-]+'
        entities['files'] = re.findall(file_pattern, log_line)

        return entities

    def detect_malicious_patterns(self, log_line):
        """
        Detect malicious patterns in log line.
        Returns: (is_malicious, severity_score, attack_type)
        """
        malicious_keywords = {
            'CRITICAL': ['rootkit', 'unauthorized', 'intrusion', 'exploit', 'backdoor'],
            'HIGH': ['failed password', 'denied', 'blocked', 'suspicious', 'AVC denied', 'privilege escalation'],
            'MEDIUM': ['warning', 'alert', 'anomaly', 'unusual'],
            'LOW': ['notice', 'info']
        }

        log_lower = log_line.lower()

        for severity, keywords in malicious_keywords.items():
            for keyword in keywords:
                if keyword in log_lower:
                    severity_map = {'CRITICAL': 1.0, 'HIGH': 0.75, 'MEDIUM': 0.5, 'LOW': 0.25}
                    return True, severity_map[severity], keyword

        return False, 0.0, None

    def add_node(self, entity_id, entity_type, is_malicious=False):
        """Add a node to the graph"""
        if entity_id not in self.node_mapping:
            node_idx = len(self.node_mapping)
            self.node_mapping[entity_id] = node_idx
            self.node_types[node_idx] = entity_type

            if is_malicious:
                self.malicious_nodes.add(node_idx)

            # Initialize node features (will be computed later)
            self.node_features.append(None)

            return node_idx
        return self.node_mapping[entity_id]

    def add_edge(self, source_entity, target_entity):
        """Add an edge between two entities"""
        source_idx = self.node_mapping.get(source_entity)
        target_idx = self.node_mapping.get(target_entity)

        if source_idx is not None and target_idx is not None:
            self.edges.append((source_idx, target_idx))

    def process_syslog_batch(self, syslog_lines):
        """
        Process a batch of syslog lines and build graph structure.

        Args:
            syslog_lines: List of syslog entries

        Returns:
            PyTorch Geometric Data object
        """
        # Reset graph
        self.node_mapping.clear()
        self.node_features.clear()
        self.edges.clear()
        self.node_types.clear()
        self.malicious_nodes.clear()

        # Track node statistics for feature generation
        node_stats = defaultdict(lambda: {
            'frequency': 0,
            'malicious_interactions': 0,
            'total_interactions': 0,
            'first_seen': None,
            'last_seen': None,
            'severity_sum': 0.0
        })

        logger.info(f"Processing {len(syslog_lines)} syslog entries...")

        # First pass: Extract entities and build node list
        for idx, log_line in enumerate(syslog_lines):
            timestamp = datetime.now()

            # Check if malicious
            is_malicious, severity, attack_type = self.detect_malicious_patterns(log_line)

            # Extract entities
            entities = self.extract_entities_from_syslog(log_line)

            # Add nodes for each entity
            all_entities = []

            for ip in entities['ips']:
                node_id = f"IP:{ip}"
                self.add_node(node_id, 'ip', is_malicious)
                all_entities.append(node_id)
                node_stats[node_id]['frequency'] += 1
                node_stats[node_id]['severity_sum'] += severity

            for process in entities['processes']:
                node_id = f"PROC:{process}"
                self.add_node(node_id, 'process', is_malicious)
                all_entities.append(node_id)
                node_stats[node_id]['frequency'] += 1
                node_stats[node_id]['severity_sum'] += severity

            for service in entities['services']:
                node_id = f"SVC:{service}"
                self.add_node(node_id, 'service', is_malicious)
                all_entities.append(node_id)
                node_stats[node_id]['frequency'] += 1
                node_stats[node_id]['severity_sum'] += severity

            for user in entities['users']:
                node_id = f"USER:{user}"
                self.add_node(node_id, 'user', is_malicious)
                all_entities.append(node_id)
                node_stats[node_id]['frequency'] += 1
                node_stats[node_id]['severity_sum'] += severity

            # Create edges between entities in the same log line
            for i in range(len(all_entities)):
                for j in range(i + 1, len(all_entities)):
                    self.add_edge(all_entities[i], all_entities[j])

                    node_stats[all_entities[i]]['total_interactions'] += 1
                    node_stats[all_entities[j]]['total_interactions'] += 1

                    if is_malicious:
                        node_stats[all_entities[i]]['malicious_interactions'] += 1
                        node_stats[all_entities[j]]['malicious_interactions'] += 1

        # Generate node features (16 dimensions)
        num_nodes = len(self.node_mapping)
        feature_dim = 16

        logger.info(f"Generated graph: {num_nodes} nodes, {len(self.edges)} edges")

        for entity_id, node_idx in self.node_mapping.items():
            stats = node_stats[entity_id]

            features = [
                # Basic statistics
                stats['frequency'] / max(1, len(syslog_lines)),  # Normalized frequency
                stats['total_interactions'] / max(1, num_nodes),  # Interaction ratio
                stats['malicious_interactions'] / max(1, stats['total_interactions']),  # Malicious ratio
                stats['severity_sum'] / max(1, stats['frequency']),  # Average severity

                # Node type one-hot encoding (5 types)
                1.0 if self.node_types[node_idx] == 'ip' else 0.0,
                1.0 if self.node_types[node_idx] == 'process' else 0.0,
                1.0 if self.node_types[node_idx] == 'service' else 0.0,
                1.0 if self.node_types[node_idx] == 'user' else 0.0,
                1.0 if self.node_types[node_idx] == 'other' else 0.0,

                # Behavioral features
                1.0 if node_idx in self.malicious_nodes else 0.0,  # Known malicious
                float(len([e for e in self.edges if e[0] == node_idx])),  # Out-degree
                float(len([e for e in self.edges if e[1] == node_idx])),  # In-degree

                # Random features for noise (helps GNN learn patterns)
                np.random.randn(),
                np.random.randn(),
                np.random.randn(),
                np.random.randn(),
            ]

            self.node_features[node_idx] = features

        # Convert to PyTorch tensors
        x = torch.tensor(self.node_features, dtype=torch.float)

        if len(self.edges) > 0:
            edge_index = torch.tensor(self.edges, dtype=torch.long).t().contiguous()
            # Make edges bidirectional
            edge_index = torch.cat([edge_index, edge_index.flip(0)], dim=1)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)

        # Create PyG Data object
        data = Data(x=x, edge_index=edge_index)

        logger.info(f"Created graph data: {data.num_nodes} nodes, {data.num_edges} edges")

        return data


def generate_synthetic_graph(num_nodes=100, num_features=16, anomaly_rate=0.05):
    """
    LEGACY: Generate synthetic graph (fallback when no syslog data available)
    This is used for testing without syslog integration
    """
    logger.info(f"Generating synthetic graph: {num_nodes} nodes, {anomaly_rate * 100}% anomalies")

    # Generate Barabasi-Albert graph (scale-free network)
    G = nx.barabasi_albert_graph(num_nodes, 3)
    edge_index = torch.tensor(list(G.edges())).t().contiguous()
    edge_index = torch.cat([edge_index, edge_index.flip(0)], dim=1)

    # Normal node features
    x = torch.randn(num_nodes, num_features)

    # Inject anomalies
    num_anomalies = max(1, int(num_nodes * anomaly_rate))
    anomaly_nodes = np.random.choice(num_nodes, num_anomalies, replace=False)

    # Make anomalies stand out (higher magnitude features)
    for node in anomaly_nodes:
        x[node] = x[node] * 3 + torch.randn(num_features) * 2

    return Data(x=x, edge_index=edge_index)


def load_syslog_and_generate_graph(syslog_file="syslogs.log", max_lines=1000):
    """
    Load syslog file and convert to graph.
    This is the MAIN function that integrates with your syslog generator.

    Args:
        syslog_file: Path to syslog file
        max_lines: Maximum number of recent lines to process

    Returns:
        PyTorch Geometric Data object
    """
    try:
        # Read recent syslog entries
        with open(syslog_file, 'r', encoding='utf-8', errors='ignore') as f:
            # Read last max_lines
            lines = f.readlines()[-max_lines:]

        if not lines:
            logger.warning("No syslog data found, using synthetic data")
            return generate_synthetic_graph()

        logger.info(f"Loaded {len(lines)} syslog entries from {syslog_file}")

        # Convert to graph
        converter = SyslogToGraphConverter()
        graph_data = converter.process_syslog_batch(lines)

        return graph_data

    except FileNotFoundError:
        logger.warning(f"Syslog file {syslog_file} not found, using synthetic data")
        return generate_synthetic_graph()
    except Exception as e:
        logger.error(f"Error processing syslog: {e}")
        return generate_synthetic_graph()


# For backward compatibility
__all__ = [
    'generate_synthetic_graph',
    'load_syslog_and_generate_graph',
    'SyslogToGraphConverter'
] 