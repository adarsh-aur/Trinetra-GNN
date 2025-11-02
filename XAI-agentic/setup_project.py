
import os
from pathlib import Path

def create_structure():
    """Create project directory structure"""

    print("="*80)
    print("🤖 CREATING AGENTIC AI GNN MONITORING PROJECT")
    print("="*80)
    print()

    # Directories
    dirs = [
        "core",
        "models",
        "utils",
        "reports",
        "logs",
        "data/graph_snapshots"
    ]

    print("📁 Creating directories...")
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
        print(f"   ✓ {d}/")

    # __init__.py files
    init_files = [
        "core/__init__.py",
        "models/__init__.py",
        "utils/__init__.py"
    ]

    print("\\n📝 Creating __init__.py files...")
    for f in init_files:
        Path(f).touch()
        print(f"   ✓ {f}")

    # Write core/__init__.py content
    with open("core/__init__.py", "w") as f:
        f.write('"""Core agent components"""\\n')
        f.write("from .agent import GNNAgent\\n")
        f.write("from .config import Config\\n\\n")
        f.write("__all__ = ['GNNAgent', 'Config']\\n")

    # Write models/__init__.py content
    with open("models/__init__.py", "w") as f:
        f.write('"""Machine learning models"""\\n')
        f.write("from .gnn_detector import GNNAnomalyDetector\\n")
        f.write("from .zscore_detector import ZScoreAnomalyDetector\\n\\n")
        f.write("__all__ = ['GNNAnomalyDetector', 'ZScoreAnomalyDetector']\\n")

    # Write utils/__init__.py content
    with open("utils/__init__.py", "w") as f:
        f.write('"""Utility functions"""\\n')
        f.write("from .graph_analyzer import GraphAnalyzer\\n")
        f.write("from .batch_processor import BatchProcessor\\n")
        f.write("from .data_generator import generate_synthetic_graph\\n")
        f.write("from .logger import setup_logger\\n\\n")
        f.write("__all__ = ['GraphAnalyzer', 'BatchProcessor', 'generate_synthetic_graph', 'setup_logger']\\n")

    # Create .gitignore
    with open(".gitignore", "w") as f:
        f.write("__pycache__/\\n*.py[cod]\\n.Python\\nvenv/\\n.env\\nreports/\\nlogs/\\ndata/\\n")

    print()
    print("="*80)
    print("✅ PROJECT STRUCTURE CREATED!")
    print("="*80)
    print()
    print("Next steps:")
    print("1. Copy all code sections to their respective files")
    print("2. pip install -r requirements.txt")
    print("3. cp .env.example .env (and add your API keys)")
    print("4. python main.py")
    print()

if __name__ == "__main__":
    create_structure()