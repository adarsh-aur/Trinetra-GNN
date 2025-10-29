import torch
import torch.nn.functional as F
from torch_geometric.nn import GATConv, global_mean_pool
from torch_geometric.data import Data, Batch
import numpy as np

class SimpleCyberGNN(torch.nn.Module):
    """
    Simple but effective GNN for demo
    - Uses GAT for attention visualization
    - Binary classification: Normal vs Threat
    """
    def __init__(self, input_dim=8, hidden_dim=32, output_dim=2):
        super().__init__()
        
        # Two GAT layers
        self.conv1 = GATConv(input_dim, hidden_dim, heads=4, dropout=0.3)
        self.conv2 = GATConv(hidden_dim * 4, hidden_dim, heads=1, dropout=0.3)
        
        # Classifier
        self.classifier = torch.nn.Sequential(
            torch.nn.Linear(hidden_dim, 16),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.3),
            torch.nn.Linear(16, output_dim)
        )
    
    def forward(self, data):
        x, edge_index, batch = data.x, data.edge_index, data.batch
        
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.elu(x)
        
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.elu(x)
        
        # Graph-level pooling
        x = global_mean_pool(x, batch)
        
        # Classification
        x = self.classifier(x)
        return F.log_softmax(x, dim=1)
    
    def get_node_embeddings(self, data):
        """For visualization"""
        x, edge_index = data.x, data.edge_index
        
        x = self.conv1(x, edge_index)
        x = F.elu(x)
        x = self.conv2(x, edge_index)
        
        return x.detach().cpu().numpy()