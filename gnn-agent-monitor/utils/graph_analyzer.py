"""
utils/graph_analyzer.py - Graph Structure Analysis
"""

import networkx as nx
import torch
import numpy as np
import logging


class GraphAnalyzer:
    """Analyze graph structure for vulnerabilities"""

    def __init__(self):
        self.G = None
        self.logger = logging.getLogger(__name__)

    def update_graph(self, edge_index, num_nodes):
        """Update NetworkX graph"""
        self.G = nx.Graph()
        self.G.add_nodes_from(range(num_nodes))

        if torch.is_tensor(edge_index):
            edges = edge_index.t().cpu().numpy()
        else:
            edges = edge_index.T

        self.G.add_edges_from(edges)

    def find_vulnerable_paths(self, anomalous_nodes, top_k=5):
        """Find critical paths between anomalous nodes"""
        if self.G is None or len(anomalous_nodes) < 2:
            return []

        paths = []

        # Convert all nodes to Python int
        anomalous_nodes_list = [int(n) for n in anomalous_nodes[:top_k]]

        for i, n1 in enumerate(anomalous_nodes_list):
            for n2 in anomalous_nodes_list[i + 1:]:
                try:
                    if nx.has_path(self.G, n1, n2):
                        path = nx.shortest_path(self.G, n1, n2)
                        if len(path) > 2:
                            paths.append({
                                'path': [int(n) for n in path],
                                'length': len(path),
                                'source': int(n1),
                                'target': int(n2)
                            })
                except Exception as e:
                    self.logger.debug(f"Path finding failed for {n1}->{n2}: {e}")
                    continue

        paths.sort(key=lambda x: x['length'])
        return paths[:top_k]

    def analyze_node_importance(self, node_id):
        """Analyze node metrics"""
        # ✅ FIX: Convert numpy.int64 to Python int
        node_id = int(node_id)

        if self.G is None:
            return {
                'degree': 0,
                'betweenness': 0.0,
                'clustering': 0.0,
                'neighbors': []
            }

        # Check if node exists in graph
        if node_id not in self.G:
            self.logger.warning(f"Node {node_id} not in graph")
            return {
                'degree': 0,
                'betweenness': 0.0,
                'clustering': 0.0,
                'neighbors': []
            }

        metrics = {
            'degree': self.G.degree(node_id),
            'betweenness': 0.0,
            'clustering': 0.0,
            'neighbors': list(self.G.neighbors(node_id))
        }

        try:
            # Calculate betweenness centrality for all nodes
            betweenness_dict = nx.betweenness_centrality(self.G)
            metrics['betweenness'] = float(betweenness_dict.get(node_id, 0.0))
        except Exception as e:
            self.logger.debug(f"Betweenness calculation failed: {e}")
            metrics['betweenness'] = 0.0

        try:
            # Calculate clustering coefficient
            metrics['clustering'] = float(nx.clustering(self.G, node_id))
        except Exception as e:
            self.logger.debug(f"Clustering calculation failed: {e}")
            metrics['clustering'] = 0.0

        return metrics