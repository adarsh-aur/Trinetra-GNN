import torch
from torch_geometric.loader import DataLoader
from backend.demo_gnn.simple_gnn_demo import SimpleCyberGNN
from backend.demo_gnn.demo_data_generator import DemoDataGenerator
import os

def train_demo_model():
    """Train model on synthetic data for demo"""
    print("🚀 Generating training data...")
    generator = DemoDataGenerator()
    graphs, labels = generator.generate_dataset(num_normal=200, num_attacks=200)
    
    # Add labels to graphs
    print("   Adding labels to graphs...")
    for i, graph in enumerate(graphs):
        graph.y = torch.tensor([labels[i]], dtype=torch.long)
    
    # Split data
    print("   Splitting into train/test sets...")
    train_size = int(0.8 * len(graphs))
    train_graphs = graphs[:train_size]
    test_graphs = graphs[train_size:]
    
    train_loader = DataLoader(train_graphs, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_graphs, batch_size=32, shuffle=False)
    
    # Initialize model
    print("\n🏗️ Initializing model...")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"   Using device: {device}")
    
    model = SimpleCyberGNN(input_dim=8, hidden_dim=32, output_dim=2).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=5e-4)
    criterion = torch.nn.NLLLoss()
    
    # Training loop
    print("\n🎯 Training model...\n")
    model.train()
    epochs = 50
    
    for epoch in range(epochs):
        total_loss = 0
        correct = 0
        total = 0
        
        for batch in train_loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            
            out = model(batch)
            loss = criterion(out, batch.y)
            
            loss.backward()
            optimizer.step()
            
            # Calculate accuracy
            pred = out.argmax(dim=1)
            correct += (pred == batch.y).sum().item()
            total += batch.y.size(0)
            total_loss += loss.item()
        
        accuracy = correct / total
        avg_loss = total_loss / len(train_loader)
        
        if epoch % 10 == 0:
            print(f"Epoch {epoch:03d} | Loss: {avg_loss:.4f} | Acc: {accuracy:.4f}")
    
    # Evaluate
    print("\n📊 Evaluating model...")
    model.eval()
    correct = 0
    total = 0
    
    with torch.no_grad():
        for batch in test_loader:
            batch = batch.to(device)
            out = model(batch)
            pred = out.argmax(dim=1)
            correct += (pred == batch.y).sum().item()
            total += batch.y.size(0)
    
    test_accuracy = correct / total
    print(f"✅ Test Accuracy: {test_accuracy:.4f}")
    
    # Save model
    os.makedirs('models', exist_ok=True)
    torch.save({
        'model_state_dict': model.state_dict(),
        'input_dim': 8,
        'hidden_dim': 32,
        'output_dim': 2,
        'test_accuracy': test_accuracy
    }, 'models/demo_gnn_model.pt')
    
    print("💾 Model saved to models/demo_gnn_model.pt")
    print(f"\n🎉 Training complete! Accuracy: {test_accuracy*100:.2f}%")
    return model

if __name__ == "__main__":
    train_demo_model()