"""
GNN Trainer - Universal Multi-Cloud Version
Dynamically adapts to any graph structure from any cloud platform
No hardcoded values or assumptions about data
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import networkx as nx
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import json
import os
from typing import Dict, Tuple, Optional

# Detect device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =====================================================================
# 1️⃣ ADAPTIVE GRAPH CONVOLUTION NETWORK
# =====================================================================
class AdaptiveGCN(nn.Module):
    """
    Adaptive GCN that automatically adjusts to input dimensions
    Works with any feature size and graph structure
    """
    def __init__(self, in_dim: int, hid_dim: int = 64, out_dim: int = 32):
        super(AdaptiveGCN, self).__init__()
        self.in_dim = in_dim
        self.hid_dim = hid_dim
        self.out_dim = out_dim

        # Adaptive layers
        self.fc1 = nn.Linear(in_dim, hid_dim)
        self.fc2 = nn.Linear(hid_dim, out_dim)
        self.classifier = nn.Linear(out_dim, 1)

        # Batch normalization for stability
        self.bn1 = nn.BatchNorm1d(hid_dim)
        self.bn2 = nn.BatchNorm1d(out_dim)

        # Activation and dropout
        self.activation = nn.ReLU()
        self.dropout = nn.Dropout(0.3)

    def forward(self, x, adj):
        """
        Forward pass with graph convolution

        Args:
            x: Node features [N, F]
            adj: Normalized adjacency matrix [N, N]

        Returns:
            logits: Binary classification logits [N]
            embeddings: Node embeddings [N, out_dim]
        """
        # First graph convolution layer
        h = torch.matmul(adj, x)
        h = self.fc1(h)
        if h.shape[0] > 1:  # Only apply batch norm if more than 1 sample
            h = self.bn1(h)
        h = self.activation(h)
        h = self.dropout(h)

        # Second graph convolution layer
        h = torch.matmul(adj, h)
        h = self.fc2(h)
        if h.shape[0] > 1:
            h = self.bn2(h)
        embeddings = self.activation(h)

        # Classification
        logits = self.classifier(embeddings).squeeze(-1)

        return logits, embeddings


# =====================================================================
# 2️⃣ DYNAMIC GRAPH TO TENSOR CONVERTER
# =====================================================================
def graph_to_tensors(G: nx.Graph, verbose: bool = True) -> Tuple:
    """
    Universal converter: NetworkX Graph → PyTorch Tensors
    Automatically extracts all node features and builds type encodings

    Args:
        G: NetworkX graph with any structure
        verbose: Print conversion details

    Returns:
        Tuple of (X, A, id_to_index, type_map, feature_names)
    """
    nodes = list(G.nodes(data=True))

    if not nodes:
        raise ValueError("Graph is empty — no nodes to process.")

    if verbose:
        print(f"📊 Converting graph with {len(nodes)} nodes and {G.number_of_edges()} edges")

    # ================================================================
    # STEP 1: Extract all unique node types dynamically
    # ================================================================
    node_types = set()
    for _, attrs in nodes:
        node_type = attrs.get("type", "unknown")
        node_types.add(node_type)

    type_map = {t: i for i, t in enumerate(sorted(node_types))}

    if verbose:
        print(f"🏷️  Detected {len(type_map)} node types: {list(type_map.keys())}")

    # ================================================================
    # STEP 2: Identify all numeric features dynamically
    # ================================================================
    numeric_features = set()
    for _, attrs in nodes:
        for key, value in attrs.items():
            if key not in ["type", "id", "cve", "last_seen"]:  # Skip non-numeric
                if isinstance(value, (int, float)):
                    numeric_features.add(key)

    numeric_features = sorted(numeric_features)

    if verbose:
        print(f"📈 Detected {len(numeric_features)} numeric features: {numeric_features}")

    # ================================================================
    # STEP 3: Build feature matrix
    # ================================================================
    N = len(nodes)
    F = len(numeric_features) + len(type_map)  # numeric features + one-hot type
    X = np.zeros((N, F), dtype=np.float32)
    id_to_index = {}

    for i, (nid, attrs) in enumerate(nodes):
        id_to_index[nid] = i

        # Add numeric features
        for j, feature_name in enumerate(numeric_features):
            value = attrs.get(feature_name, 0.0)
            X[i, j] = float(value)

        # Add one-hot type encoding
        node_type = attrs.get("type", "unknown")
        if node_type in type_map:
            type_idx = len(numeric_features) + type_map[node_type]
            X[i, type_idx] = 1.0

    # ================================================================
    # STEP 4: Build and normalize adjacency matrix
    # ================================================================
    A = np.zeros((N, N), dtype=np.float32)

    for u, v, data in G.edges(data=True):
        if u in id_to_index and v in id_to_index:
            weight = float(data.get("weight", 1.0))
            i, j = id_to_index[u], id_to_index[v]
            A[i, j] = weight
            A[j, i] = weight  # Symmetric for undirected

    # Add self-loops
    A += np.eye(N, dtype=np.float32)

    # Degree normalization: D^(-1/2) * A * D^(-1/2)
    row_sums = A.sum(axis=1)
    d_inv_sqrt = np.power(row_sums, -0.5)
    d_inv_sqrt[np.isinf(d_inv_sqrt)] = 0.0
    D_inv_sqrt = np.diag(d_inv_sqrt)
    A = D_inv_sqrt @ A @ D_inv_sqrt

    if verbose:
        print(f"✅ Feature matrix shape: {X.shape}")
        print(f"✅ Adjacency matrix shape: {A.shape}")

    feature_names = numeric_features + [f"type_{t}" for t in sorted(type_map.keys())]

    return (
        torch.tensor(X, dtype=torch.float32, device=device),
        torch.tensor(A, dtype=torch.float32, device=device),
        id_to_index,
        type_map,
        feature_names
    )


# =====================================================================
# 3️⃣ UNIVERSAL TRAINING FUNCTION
# =====================================================================
def train_on_examples(
    G: nx.Graph,
    labels_dict: Dict[str, int],
    epochs: int = 50,
    lr: float = 1e-3,
    verbose: bool = True
) -> Dict:
    """
    Universal GNN training function - works with any graph structure

    Args:
        G: NetworkX graph (any cloud platform)
        labels_dict: Dict mapping node_id → label (0=normal, 1=anomaly)
        epochs: Number of training epochs
        lr: Learning rate
        verbose: Print training progress

    Returns:
        Dictionary with model, metrics, embeddings, and predictions
    """

    # ================================================================
    # STEP 1: Convert graph to tensors
    # ================================================================
    try:
        X, A, id_map, type_map, feature_names = graph_to_tensors(G, verbose=verbose)
    except ValueError as e:
        if verbose:
            print(f"⚠️ {e}")
        return {
            "model": None,
            "accuracy": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "f1_score": 0.0,
            "embeddings": np.zeros((0, 0)),
            "probs": np.zeros(0),
            "id_map": {},
            "type_map": {},
            "feature_names": [],
            "training_losses": [],
            "final_loss": 0.0,
            "training_epochs": epochs
        }

    # ================================================================
    # STEP 2: Initialize model
    # ================================================================
    if verbose:
        print(f"\n🔧 Initializing Adaptive GNN")
        print(f"   Input dimension: {X.shape[1]}")
        print(f"   Training nodes: {X.shape[0]}")
        print(f"   Labeled examples: {len(labels_dict)}")
        print(f"   Device: {device}")

    model = AdaptiveGCN(in_dim=X.shape[1]).to(device)
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    criterion = nn.BCEWithLogitsLoss()

    # ================================================================
    # STEP 3: Build label vector
    # ================================================================
    y = torch.zeros(X.shape[0], dtype=torch.float32, device=device)
    labeled_indices = []

    for nid, label in labels_dict.items():
        if nid in id_map:
            idx = id_map[nid]
            y[idx] = float(label)
            labeled_indices.append(idx)

    if not labeled_indices:
        if verbose:
            print("⚠️ No labeled nodes found in graph!")
        y = torch.zeros_like(y)  # Default to all zeros if no labels

    # ================================================================
    # STEP 4: Training loop
    # ================================================================
    training_losses = []
    best_loss = float('inf')
    patience_counter = 0
    patience = 10

    if verbose:
        print(f"\n🚀 Starting training for {epochs} epochs...")

    for epoch in range(epochs):
        model.train()

        # Forward pass
        logits, _ = model(X, A)
        loss = criterion(logits, y)

        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        training_losses.append(float(loss.item()))

        # Early stopping check
        if loss.item() < best_loss:
            best_loss = loss.item()
            patience_counter = 0
        else:
            patience_counter += 1

        # Print progress
        if verbose and (epoch + 1) % 10 == 0:
            print(f"   Epoch {epoch + 1}/{epochs} - Loss: {loss.item():.4f}")

        # Early stopping
        if patience_counter >= patience and epoch > 20:
            if verbose:
                print(f"   Early stopping at epoch {epoch + 1}")
            break

    final_loss = training_losses[-1] if training_losses else 0.0

    if verbose:
        print(f"✅ Training complete! Final loss: {final_loss:.4f}\n")

    # ================================================================
    # STEP 5: Evaluation
    # ================================================================
    model.eval()
    with torch.no_grad():
        logits, embeddings = model(X, A)
        probs = torch.sigmoid(logits).cpu().numpy()

    # Calculate metrics on labeled nodes only
    y_true, y_pred = [], []
    for nid, label in labels_dict.items():
        if nid in id_map:
            idx = id_map[nid]
            y_true.append(int(label))
            y_pred.append(int(probs[idx] > 0.5))

    # Compute metrics
    if y_true:
        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred, zero_division=0)
        rec = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
    else:
        acc = prec = rec = f1 = 0.0

    if verbose:
        print(f"📈 Model Performance:")
        print(f"   Accuracy:  {acc:.2%}")
        print(f"   Precision: {prec:.2%}")
        print(f"   Recall:    {rec:.2%}")
        print(f"   F1 Score:  {f1:.2%}")
        print(f"🧮 Embedding dimension: {embeddings.shape}")

    return {
        "model": model,
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1_score": float(f1),
        "embeddings": embeddings.cpu().numpy(),
        "probs": probs,
        "id_map": id_map,
        "type_map": type_map,
        "feature_names": feature_names,
        "training_losses": training_losses,
        "final_loss": final_loss,
        "training_epochs": len(training_losses)
    }


# =====================================================================
# 4️⃣ TESTING WITH REAL SYSLOG DATA
# =====================================================================
if __name__ == "__main__":
    print("="*70)
    print("🔍 Testing Universal GNN Trainer")
    print("="*70)

    # Create a sample graph (simulating parsed syslog data)
    G = nx.Graph()

    # Add nodes with dynamic attributes (like from real syslogs)
    G.add_node("ens5", type="interface", risk_score=2.5, connection_count=4)
    G.add_node("172.31.42.16", type="ip", risk_score=3.2, connection_count=3)
    G.add_node("02:bc:42:58:f5:e7", type="mac", risk_score=1.8, connection_count=1)
    G.add_node("cloud-init", type="process", risk_score=4.1, connection_count=2)
    G.add_node("systemd", type="process", risk_score=2.0, connection_count=1)
    G.add_node("ena", type="driver", risk_score=1.5, connection_count=1)

    # Add edges with weights
    G.add_edge("ens5", "172.31.42.16", weight=2.5)
    G.add_edge("ens5", "02:bc:42:58:f5:e7", weight=1.5)
    G.add_edge("cloud-init", "ens5", weight=3.0)
    G.add_edge("systemd", "cloud-init", weight=2.0)
    G.add_edge("ena", "ens5", weight=1.0)

    # Labels (0=normal, 1=anomaly)
    labels = {
        "ens5": 0,
        "172.31.42.16": 0,
        "02:bc:42:58:f5:e7": 0,
        "cloud-init": 0,
        "systemd": 0,
        "ena": 0
    }

    # Train the model
    result = train_on_examples(G, labels, epochs=50, verbose=True)

    print("\n" + "="*70)
    print("📋 FINAL RESULTS:")
    print("="*70)
    print(f"Accuracy:  {result['accuracy']:.2%}")
    print(f"Precision: {result['precision']:.2%}")
    print(f"Recall:    {result['recall']:.2%}")
    print(f"F1 Score:  {result['f1_score']:.2%}")
    print(f"Embeddings shape: {result['embeddings'].shape}")
    print(f"Final training loss: {result['final_loss']:.4f}")
    print(f"Feature names: {result['feature_names']}")
    print("="*70)