import torch
import numpy as np
import time
from typing import Dict, Any
import logging


class BatchProcessor:
    """Process graph nodes in batches"""

    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.batch_size = config.BATCH_SIZE

    async def process_graph(self, graph_data: Dict, gnn_model, zscore_detector) -> Dict:
        """Process entire graph in batches"""
        start_time = time.time()

        x = graph_data['x']
        edge_index = graph_data['edge_index']
        num_nodes = graph_data['num_nodes']

        all_scores = []
        batch_count = 0

        for batch_idx in range(0, num_nodes, self.batch_size):
            batch_end = min(batch_idx + self.batch_size, num_nodes)
            batch_nodes = torch.arange(batch_idx, batch_end)

            batch_x, batch_edge_index = self._extract_subgraph(x, edge_index, batch_nodes)

            with torch.no_grad():
                z, x_recon = gnn_model(batch_x, batch_edge_index)
                batch_scores = gnn_model.compute_anomaly_scores(batch_x, x_recon)

            all_scores.append(batch_scores)
            batch_count += 1

        scores = torch.cat(all_scores)
        zscore_detector.update(scores)
        anomalies, z_scores = zscore_detector.detect_anomalies(scores)
        anomalous_nodes = np.where(anomalies)[0]

        processing_time = time.time() - start_time

        return {
            'scores': scores,
            'z_scores': z_scores,
            'anomalies': anomalies,
            'anomalous_nodes': anomalous_nodes,
            'batch_count': batch_count,
            'processing_time': processing_time
        }

    def _extract_subgraph(self, x, edge_index, nodes):
        """Extract subgraph (simplified - using full graph)"""
        return x, edge_index