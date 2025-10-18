# 🛡️ Multi-Cloud GNN Threat Analyzer

**Universal Graph Neural Network-based security threat detection system for multi-cloud environments**

Supports: **AWS** | **GCP** | **Azure** | **Oracle Cloud** | **On-Premise**

---

## 🌟 Features

### ✅ Universal & Dynamic
- **Zero Hardcoding**: Automatically adapts to any cloud platform or log format
- **Dynamic Feature Extraction**: Automatically discovers node types, features, and relationships
- **Multi-Cloud Support**: Works seamlessly across AWS, GCP, Azure, Oracle, and generic infrastructure

### 🤖 Advanced AI/ML
- **Graph Neural Networks (GNN)**: Deep learning on graph-structured security data
- **Adaptive Architecture**: Auto-adjusts to input dimensions and graph structures
- **LLM-Powered Parsing**: Uses Large Language Models for intelligent log parsing
- **Statistical Anomaly Detection**: Z-score based anomaly identification

### 📊 Visualization Ready
- **D3.js Compatible Output**: Generates `results.json` for force-directed graph visualization
- **Rich Metadata**: Includes risk scores, CVE data, anomaly probabilities
- **Color-Coded Nodes**: Visual distinction by category and risk level

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Raw Syslogs   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Processor  │ ◄── Parses logs dynamically
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Graph Builder  │ ◄── Constructs network graph
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Risk Calculator │ ◄── CVE scoring + heuristics
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Anomaly Detector│ ◄── Z-score + LLM consensus
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GNN Training   │ ◄── Deep learning on graph
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Results Export  │ ◄── D3.js JSON + Reports
└─────────────────┘
```

---

## 📁 File Structure

```
multi-cloud-gnn/
├── backend/
│   ├── app.py                      # Main Flask application
│   ├── gnn_trainer.py              # Universal GNN training module
│   ├── llm_processor.py            # LLM-based log parser
│   ├── graph_builder.py            # Graph construction
│   ├── anomaly_detector.py         # Anomaly detection logic
│   ├── cve_scorer.py               # CVE/NVD integration
│   ├── sample_data/
│   │   └── syslogs.log            # Sample AWS syslog data
│   ├── data_store/                # Output directory
│   │   ├── report_*.json          # Comprehensive analysis reports
│   │   └── results.json           # D3.js visualization data
│   └── utils/
│       └── data_store.py          # Report saving utilities
└── frontend/
    └── d3_visualization.html       # D3.js graph visualizer
```

---

## 🚀 Installation

### Prerequisites
```bash
Python 3.8+
pip
```

### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Key Dependencies:**
- `flask` - Web server
- `flask-socketio` - Real-time updates
- `torch` - PyTorch for GNN
- `networkx` - Graph operations
- `scikit-learn` - ML utilities
- `numpy` - Numerical computing

---

## 🎯 Usage

### 1. Start the Server

```bash
cd backend
python app.py
```

Server starts on `http://localhost:5000`

### 2. Send Logs for Analysis

#### Option A: Using Sample File
```bash
curl -X POST http://localhost:5000/ingest_file
```

#### Option B: Send Custom Logs
```bash
curl -X POST http://localhost:5000/ingest_text \
  -H "Content-Type: application/json" \
  -d '{"logs": "your log content here"}'
```

#### Option C: Using Python Test Script
```python
import requests

# Read your log file
with open('path/to/your/logs.log', 'r') as f:
    logs = f.read()

# Send to analyzer
response = requests.post(
    'http://localhost:5000/ingest_text',
    json={'logs': logs}
)

print(response.json())
```

### 3. View Results

**JSON Reports:**
- `data_store/report_<timestamp>.json` - Full analysis report
- `data_store/results.json` - D3.js visualization data

**Visualize with D3.js:**
Open `frontend/d3_visualization.html` in a browser (loads `results.json`)

---

## 📊 Output Format

### Report JSON Structure
```json
{
  "status": "ok",
  "timestamp": "2025-10-07 13:02:04 IST",
  "attack_analysis": {
    "attack_type": "benign|suspicious|malicious",
    "confidence": 0.85
  },
  "statistical_analysis": {
    "zscore_threshold": 2.5,
    "total_nodes": 10,
    "total_edges": 15,
    "anomalies_detected_count": 2,
    "anomalies_confirmed_count": 1
  },
  "nodes_information": [
    {
      "id": "node_identifier",
      "type": "compute|network|storage|...",
      "risk_score": 7.5,
      "cve": ["CVE-2023-12345"],
      "last_seen": "2025-10-07 13:02:04 IST"
    }
  ],
  "edges_information": [...],
  "gnn_analysis": {
    "accuracy": 0.95,
    "precision": 0.92,
    "recall": 0.88,
    "f1_score": 0.90,
    "predictions": [...]
  },
  "graph": { ... }
}
```

### D3.js Results JSON Structure
```json
{
  "nodes": [
    {
      "id": 0,
      "name": "original_node_id",
      "type": "compute",
      "cloud_platform": "aws|gcp|azure|oracle|generic",
      "category": "compute|network|storage|...",
      "risk_score": 5.5,
      "anomaly_probability": 0.75,
      "is_anomaly": true,
      "cve": ["CVE-2023-12345"],
      "group": 1,
      "size": 15,
      "color": "#e74c3c"
    }
  ],
  "links": [
    {
      "source": 0,
      "target": 1,
      "type": "connection",
      "weight": 2.5,
      "count": 10,
      "value": 2.5
    }
  ],
  "metadata": { ... }
}
```

---

## 🎨 Node Categorization

The system automatically categorizes nodes into:

| Category | Examples | Color |
|----------|----------|-------|
| **Compute** | EC2, VM, Lambda, Process | 🔵 Blue |
| **Network** | VPC, Interface, IP, MAC | 🟢 Green |
| **Storage** | S3, Blob, Disk, Volume | 🟣 Purple |
| **Database** | RDS, SQL, NoSQL, Cosmos | 🟠 Orange |
| **Security** | IAM, Firewall, WAF | 🔴 Red |
| **Hardware** | CPU, GPU, Driver | ⚫ Dark Gray |
| **Monitoring** | CloudWatch, Logs | 🔵 Turquoise |
| **Other** | Unknown types | ⚪ Gray |

---

## 🔍 Cloud Platform Detection

The system auto-detects cloud platforms from:

### AWS Indicators
- Node names: `ec2`, `s3`, `lambda`, `vpc`, `rds`, `iam`
- Processes: `cloud-init`, `amazon`, `aws`

### GCP Indicators
- Node names: `gce`, `gcs`, `gke`, `cloudfunction`
- Processes: `google`, `compute-engine`

### Azure Indicators  
- Node names: `azurevm`, `blob`, `aks`, `cosmosdb`
- Processes: `microsoft`, `azure`

### Oracle Indicators
- Node names: `oci`, `oracle`, `autonomous`, `exadata`

### Generic/On-Premise
- Standard infrastructure: `ens`, `eth`, `systemd`, `fuse`

---

## 🤖 GNN Model Details

### Architecture: Adaptive GCN
- **Input Layer**: Dynamic dimension (auto-detected features + one-hot type encoding)
- **Hidden Layer**: 64 neurons with BatchNorm + ReLU + Dropout(0.3)
- **Output Layer**: 32-dimensional embeddings
- **Classifier**: Binary (normal vs anomaly)

### Training
- **Optimizer**: Adam with weight decay
- **Loss Function**: Binary Cross-Entropy with Logits
- **Early Stopping**: Patience of 10 epochs
- **Learning Rate**: 0.001 (configurable)

### Features Extracted
- `risk_score` - Calculated from CVE + heuristics
- `connection_count` - Number of connections
- One-hot encoded node types
- Any other numeric attributes found in logs

---

## 📈 Performance Metrics

The system calculates:
- **Accuracy**: Overall correct predictions
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)
- **F1 Score**: Harmonic mean of precision and recall

---

## 🔧 Configuration

### Update Log Path
Edit `app.py`:
```python
SAMPLE_LOG_PATH = "path/to/your/syslogs.log"
```

### Adjust GNN Parameters
```python
train_result = train_on_examples(
    G, labels,
    epochs=50,      # Number of training epochs
    lr=1e-3,        # Learning rate
    verbose=True    # Print training progress
)
```

### Modify D3 Visualization
Edit `d3_config` in `generate_d3_results_inline()`:
```python
"d3_config": {
    "force_strength": -300,
    "link_distance": 100,
    "charge_strength": -200,
    "collision_radius": 30
}
```

---

## 🐛 Troubleshooting

### Issue: "Graph is empty"
**Solution**: Ensure LLM processor is correctly parsing your logs. Check `llm_processor.py` configuration.

### Issue: Low GNN accuracy
**Solution**: 
- Increase training epochs
- Ensure sufficient labeled data
- Check if anomalies are correctly identified

### Issue: D3 visualization not showing
**Solution**:
- Verify `results.json` exists in `data_store/`
- Check browser console for errors
- Ensure D3.js library is loaded

---

## 📝 Example Workflow

1. **AWS EC2 Instance Logs** → System detects AWS platform
2. **Parses**: Extracts network interfaces, IPs, processes
3. **Builds Graph**: Connects related entities
4. **Risk Assessment**: Checks CVE database, calculates scores
5. **Anomaly Detection**: Z-score analysis + LLM validation
6. **GNN Training**: Learns patterns from labeled data
7. **Exports**: Generates D3.js visualization + comprehensive report

---

## 🤝 Contributing

This is a universal, production-ready system. Contributions welcome for:
- Additional cloud platform indicators
- Enhanced feature extraction
- Improved anomaly detection algorithms
- New visualization formats

---

## 📜 License

MIT License - See LICENSE file for details

---

## 👥 Authors

Multi-Cloud GNN Team

---

## 🙏 Acknowledgments

- PyTorch Team
- NetworkX Community
- D3.js Contributors
- Flask & SocketIO Developers

---

**Built with ❤️ for securing multi-cloud infrastructure**
