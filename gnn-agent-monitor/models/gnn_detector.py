import torch
import torch.nn.functional as F
from torch_geometric.nn import GraphSAGE


class GNNAnomalyDetector(torch.nn.Module):
    """GraphSAGE-based anomaly detector"""

    def __init__(self, config):
        super().__init__()
        self.config = config
        self.sage = None
        self.reconstruction = None
        self.initialized = False

    def _initialize(self, in_channels):
        """Lazy initialization"""
        self.sage = GraphSAGE(
            in_channels=in_channels,
            hidden_channels=self.config.HIDDEN_CHANNELS,
            num_layers=self.config.NUM_LAYERS,
            out_channels=self.config.HIDDEN_CHANNELS
        )
        self.reconstruction = torch.nn.Linear(self.config.HIDDEN_CHANNELS, in_channels)
        self.initialized = True

    def forward(self, x, edge_index):
        if not self.initialized:
            self._initialize(x.shape[1])
        z = self.sage(x, edge_index)
        x_recon = self.reconstruction(z)
        return z, x_recon

    def compute_anomaly_scores(self, x, x_recon):
        return torch.mean((x - x_recon) ** 2, dim=1)