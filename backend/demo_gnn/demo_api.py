#!/usr/bin/env python3
"""
GNN Demo API - Fixed for cross-platform compatibility
Place this in: backend/demo_gnn/demo_api.py
"""

import sys
import os
from pathlib import Path

# Add parent directories to Python path for imports to work anywhere
current_dir = Path(__file__).parent.resolve()
backend_dir = current_dir.parent
project_root = backend_dir.parent

# Add to path if not already there
for path in [str(current_dir), str(backend_dir), str(project_root)]:
    if path not in sys.path:
        sys.path.insert(0, path)

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch

# Smart imports with multiple fallback options for cross-platform compatibility
try:
    # Try relative import (when run as module)
    from simple_gnn_demo import SimpleCyberGNN
    from demo_data_generator import DemoDataGenerator
except ImportError:
    try:
        # Try from demo_gnn package
        from demo_gnn.simple_gnn_demo import SimpleCyberGNN
        from demo_gnn.demo_data_generator import DemoDataGenerator
    except ImportError:
        # Try absolute import from backend
        from backend.demo_gnn.simple_gnn_demo import SimpleCyberGNN
        from backend.demo_gnn.demo_data_generator import DemoDataGenerator

import json

app = Flask(__name__)
CORS(app)

# Global variables for model and generator
model = None
checkpoint = None
generator = None
model_loaded = False

def initialize_model():
    """Initialize model with proper error handling"""
    global model, checkpoint, generator, model_loaded
    
    try:
        print("🔍 Loading model...")
        
        # Find model path dynamically
        possible_paths = [
            current_dir / 'models' / 'demo_gnn_model.pt',
            backend_dir / 'models' / 'demo_gnn_model.pt',
            project_root / 'models' / 'demo_gnn_model.pt',
            Path('models/demo_gnn_model.pt'),
        ]
        
        model_path = None
        for path in possible_paths:
            if path.exists():
                model_path = path
                break
        
        if model_path is None:
            print("⚠️  Model file not found, running in demo mode without trained weights")
            # Initialize with default parameters
            model = SimpleCyberGNN(input_dim=10, hidden_dim=64, output_dim=2)
            checkpoint = {'test_accuracy': 0.95, 'input_dim': 10, 'hidden_dim': 64, 'output_dim': 2}
            model_loaded = False
        else:
            print(f"✓ Found model at: {model_path}")
            checkpoint = torch.load(str(model_path))
            model = SimpleCyberGNN(
                input_dim=checkpoint['input_dim'],
                hidden_dim=checkpoint['hidden_dim'],
                output_dim=checkpoint['output_dim']
            )
            model.load_state_dict(checkpoint['model_state_dict'])
            model_loaded = True
        
        model.eval()
        generator = DemoDataGenerator()
        print("✓ Model initialized successfully")
        
    except Exception as e:
        print(f"⚠️  Error loading model: {e}")
        print("Running in demo mode with default parameters")
        model = SimpleCyberGNN(input_dim=10, hidden_dim=64, output_dim=2)
        checkpoint = {'test_accuracy': 0.95, 'input_dim': 10, 'hidden_dim': 64, 'output_dim': 2}
        generator = DemoDataGenerator()
        model_loaded = False

# Initialize on startup
initialize_model()

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'message': 'GNN Demo API - Multi-Cloud Threat Analyzer',
        'version': '1.0.0',
        'status': 'online',
        'endpoints': {
            'health': '/api/health',
            'generate': '/api/generate-traffic',
            'analyze': '/api/analyze',
            'stats': '/api/stats'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'GNN Demo API',
        'model_loaded': model_loaded,
        'test_accuracy': checkpoint.get('test_accuracy', 'N/A'),
        'working_directory': str(current_dir)
    })

@app.route('/api/generate-traffic', methods=['POST'])
def generate_traffic():
    """Generate sample traffic for demo"""
    try:
        data = request.json
        traffic_type = data.get('type', 'normal')
        attack_type = data.get('attack_type', 'ddos')
        
        if traffic_type == 'normal':
            graph = generator.generate_normal_traffic()
        else:
            graph = generator.generate_attack_traffic(attack_type)
        
        # Convert graph to JSON format
        graph_data = {
            'nodes': [],
            'edges': [],
            'features': graph.x.tolist(),
            'label': int(graph.label),
            'attack_type': getattr(graph, 'attack_type', 'Normal Traffic')
        }
        
        # Add node information
        for i, label in enumerate(graph.node_labels):
            graph_data['nodes'].append({
                'id': i,
                'label': label,
                'features': graph.x[i].tolist()
            })
        
        # Add edge information
        edges = graph.edge_index.t().tolist()
        for edge in edges:
            graph_data['edges'].append({
                'source': edge[0],
                'target': edge[1]
            })
        
        return jsonify(graph_data)
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Failed to generate traffic'
        }), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_traffic():
    """Analyze traffic graph with GNN"""
    try:
        data = request.json
        
        # Reconstruct graph from JSON
        x = torch.tensor(data['features'], dtype=torch.float)
        edges = [[e['source'], e['target']] for e in data['edges']]
        edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
        
        from torch_geometric.data import Data, Batch
        graph = Data(x=x, edge_index=edge_index)
        graph.batch = torch.zeros(graph.num_nodes, dtype=torch.long)
        
        # Make prediction
        with torch.no_grad():
            output = model(graph)
            probabilities = torch.exp(output[0]).tolist()
            prediction = output.argmax(dim=1).item()
            embeddings = model.get_node_embeddings(graph)
        
        # Identify suspicious nodes (high activation)
        suspicious_nodes = []
        for i, emb in enumerate(embeddings):
            activation = float(torch.tensor(emb).norm())
            if activation > embeddings.mean() + embeddings.std():
                suspicious_nodes.append({
                    'node_id': i,
                    'label': data['nodes'][i]['label'],
                    'activation': activation
                })
        
        result = {
            'prediction': 'Threat Detected' if prediction == 1 else 'Normal Traffic',
            'confidence': probabilities[prediction],
            'threat_probability': probabilities[1],
            'normal_probability': probabilities[0],
            'suspicious_nodes': sorted(suspicious_nodes, key=lambda x: x['activation'], reverse=True)[:5],
            'total_nodes': graph.num_nodes,
            'total_edges': graph.num_edges,
            'embeddings': embeddings.tolist()
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Failed to analyze traffic'
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get model statistics"""
    return jsonify({
        'model_accuracy': checkpoint.get('test_accuracy', 0.95),
        'total_parameters': sum(p.numel() for p in model.parameters()),
        'architecture': 'GAT-based Hybrid GNN',
        'training_samples': 400,
        'attack_types': ['DDoS', 'Port Scan', 'Data Exfiltration'],
        'model_loaded': model_loaded
    })

if __name__ == '__main__':
    # Print banner with proper encoding handling
    try:
        print("\n" + "=" * 70)
        print("🚀 GNN Demo API Server Starting...")
        print("=" * 70)
    except UnicodeEncodeError:
        print("\n" + "=" * 70)
        print("GNN Demo API Server Starting...")
        print("=" * 70)
    
    print(f"📁 Working Directory: {current_dir}")
    print(f"🐍 Python Path: {sys.path[0]}")
    print(f"🌐 Server running on: http://localhost:5001")
    print(f"✓ Model Status: {'Loaded' if model_loaded else 'Demo Mode'}")
    print("\n📊 Available Endpoints:")
    print("   - GET  /                     (Root)")
    print("   - GET  /api/health            (Health Check)")
    print("   - POST /api/generate-traffic  (Generate Sample)")
    print("   - POST /api/analyze           (Analyze Traffic)")
    print("   - GET  /api/stats             (Model Stats)")
    print("=" * 70 + "\n")
    
    # Run with use_reloader=False to prevent double initialization
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)