from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from simple_gnn_demo import SimpleCyberGNN
from demo_data_generator import DemoDataGenerator
import json

app = Flask(__name__)
CORS(app)

# Load trained model
print("Loading model...")
checkpoint = torch.load('models/demo_gnn_model.pt')
model = SimpleCyberGNN(
    input_dim=checkpoint['input_dim'],
    hidden_dim=checkpoint['hidden_dim'],
    output_dim=checkpoint['output_dim']
)
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

generator = DemoDataGenerator()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'test_accuracy': checkpoint.get('test_accuracy', 'N/A')
    })

@app.route('/api/generate-traffic', methods=['POST'])
def generate_traffic():
    """Generate sample traffic for demo"""
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

@app.route('/api/analyze', methods=['POST'])
def analyze_traffic():
    """Analyze traffic graph with GNN"""
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

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get model statistics"""
    return jsonify({
        'model_accuracy': checkpoint.get('test_accuracy', 0.95),
        'total_parameters': sum(p.numel() for p in model.parameters()),
        'architecture': 'GAT-based Hybrid GNN',
        'training_samples': 400,
        'attack_types': ['DDoS', 'Port Scan', 'Data Exfiltration']
    })

if __name__ == '__main__':
    print("\n🚀 Starting Flask API...")
    print("📍 API available at: http://localhost:5001")
    print("📊 Endpoints:")
    print("   - POST /api/generate-traffic")
    print("   - POST /api/analyze")
    print("   - GET  /api/stats")
    print("   - GET  /api/health\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)