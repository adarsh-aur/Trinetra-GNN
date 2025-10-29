import torch
import networkx as nx
import numpy as np
from torch_geometric.data import Data


def generate_synthetic_graph(num_nodes=100, num_features=16, anomaly_rate=0.05):
    """Generate synthetic graph with injected anomalies"""

    # Generate Barabasi-Albert graph
    G = nx.barabasi_albert_graph(num_nodes, 3)
    edge_index = torch.tensor(list(G.edges())).t().contiguous()
    edge_index = torch.cat([edge_index, edge_index.flip(0)], dim=1)

    # Normal features
    x = torch.randn(num_nodes, num_features)

    # Inject anomalies
    num_anomalies = max(1, int(num_nodes * anomaly_rate))
    anomaly_nodes = np.random.choice(num_nodes, num_anomalies, replace=False)

    for node in anomaly_nodes:
        x[node] = x[node] * 3 + torch.randn(num_features) * 2

    return Data(x=x, edge_index=edge_index)