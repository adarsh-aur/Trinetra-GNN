import numpy as np
import torch
from collections import deque


class ZScoreAnomalyDetector:
    """Rolling Z-score based anomaly detection"""

    def __init__(self, threshold=3.0, window_size=100):
        self.threshold = threshold
        self.window = deque(maxlen=window_size)

    def update(self, scores):
        """Update with new scores"""
        scores_np = scores.cpu().numpy() if torch.is_tensor(scores) else scores
        self.window.extend(scores_np)

    def detect_anomalies(self, scores):
        """Detect anomalies using Z-score"""
        scores_np = scores.cpu().numpy() if torch.is_tensor(scores) else scores

        if len(self.window) < 10:
            return np.zeros(len(scores_np), dtype=bool), scores_np

        mean = np.mean(self.window)
        std = np.std(self.window)
        std = std if std > 0 else 1e-6

        z_scores = np.abs((scores_np - mean) / std)
        anomalies = z_scores > self.threshold

        return anomalies, z_scores