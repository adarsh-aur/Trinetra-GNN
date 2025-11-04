import os
from pathlib import Path
from dotenv import load_dotenv

# Get the backend directory (parent of neo4j_graph_integration)
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / '.env'

print(f"🔍 Looking for .env at: {env_path}")
print(f"   File exists: {env_path.exists()}")

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Neo4j Aura Credentials
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

print(f"\n📋 Loaded values:")
print(f"   NEO4J_URI: {NEO4J_URI[:50] if NEO4J_URI else 'NOT FOUND'}...")
print(f"   NEO4J_USER: {NEO4J_USER if NEO4J_USER else 'NOT FOUND'}")
print(f"   NEO4J_PASSWORD: {'*' * len(NEO4J_PASSWORD) if NEO4J_PASSWORD else 'NOT FOUND'}")

# Validate credentials
if not NEO4J_URI or not NEO4J_USER or not NEO4J_PASSWORD:
    print("\n" + "="*60)
    print("❌ ERROR: Neo4j credentials not found!")
    print("="*60)
    print(f"\n📂 .env file location: {env_path}")
    print(f"   Exists: {env_path.exists()}")
    
    if env_path.exists():
        print("\n📄 .env file contents:")
        with open(env_path, 'r') as f:
            content = f.read()
            # Mask password for security
            lines = content.split('\n')
            for line in lines:
                if 'PASSWORD' in line and '=' in line:
                    key, _ = line.split('=', 1)
                    print(f"   {key}=*****")
                else:
                    print(f"   {line}")
    
    print("\n⚠️  Make sure your .env file contains:")
    print("   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io")
    print("   NEO4J_USER=neo4j")
    print("   NEO4J_PASSWORD=your-password")
    print("\n   (No spaces around '=' signs!)")
    print("="*60)
    raise ValueError("Neo4j credentials not configured properly")

# Configuration
BATCH_SIZE = 1000

print(f"\n✅ Config loaded successfully!")