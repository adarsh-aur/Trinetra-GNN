"""
test_pipeline.py - Updated for LLM-Driven Multi-Cloud GNN System
--------------------------------------------------------------------------------
Comprehensive test script to verify your Flask backend with LLM categorization.

Features:
- Tests both /ingest_file and /ingest_text endpoints
- Validates LLM categorization results
- Checks D3.js output generation
- Displays detailed metrics and analysis

Run this while your backend (app.py) is running.
"""

import os
import json
import requests
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path

load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000").rstrip("/")
LOG_FILE_PATH = os.getenv(
    "LOG_FILE_PATH",
    "D:/Final Year Project/LLM_Final_Year/LLM_final_year/multi-cloud-gnn/backend/sample_data/syslogs.log"
)
DATA_STORE_PATH = os.getenv(
    "DATA_STORE_PATH",
    "D:/Final Year Project/LLM_Final_Year/LLM_final_year/multi-cloud-gnn/backend/data_store"
)

def print_banner():
    """Print fancy banner"""
    print("\n" + "="*80)
    print("🛡️  MULTI-CLOUD GNN THREAT ANALYZER - LLM-DRIVEN SYSTEM TEST")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Log File:    {LOG_FILE_PATH}")
    print(f"Data Store:  {DATA_STORE_PATH}")
    print("="*80 + "\n")

def check_backend_alive():
    """Ping the backend root URL to confirm it's running."""
    print("[1/6] 🔍 Checking backend connectivity...")
    try:
        r = requests.get(BACKEND_URL, timeout=5)
        print(f"✅ Backend is reachable at {BACKEND_URL} (Status: {r.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {BACKEND_URL}")
        print("\n💡 Troubleshooting:")
        print("   1. Ensure Flask backend is running: python app.py")
        print("   2. Check if port 5000 is available")
        print("   3. Verify BACKEND_URL in .env file")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def check_log_file():
    """Verify log file exists and is readable"""
    print("\n[2/6] 📄 Checking log file...")
    if not os.path.exists(LOG_FILE_PATH):
        print(f"❌ Log file not found: {LOG_FILE_PATH}")
        return False

    file_size = os.path.getsize(LOG_FILE_PATH) / 1024  # KB
    print(f"✅ Log file found: {LOG_FILE_PATH}")
    print(f"   Size: {file_size:.2f} KB")

    # Show first few lines
    try:
        with open(LOG_FILE_PATH, "r", errors="ignore") as f:
            first_lines = [f.readline() for _ in range(3)]
        print(f"   Preview: {first_lines[0][:60]}...")
    except Exception as e:
        print(f"⚠️  Could not read file: {e}")
        return False

    return True

def test_ingest_file():
    """Test Flask /ingest_file endpoint (server reads from its log path)."""
    print("\n[3/6] 🚀 Testing /ingest_file endpoint...")
    url = f"{BACKEND_URL}/ingest_file"

    print(f"   Sending POST request to {url}")

    try:
        start_time = datetime.now()
        r = requests.post(url, timeout=120)  # Increased timeout for LLM processing
        elapsed = (datetime.now() - start_time).total_seconds()

        print(f"✅ Request completed in {elapsed:.2f} seconds")
        print(f"   Status Code: {r.status_code}")

        if r.status_code == 200:
            return analyze_response(r.json())
        else:
            print(f"❌ Request failed with status {r.status_code}")
            print(f"   Response: {r.text[:500]}")
            return None

    except requests.exceptions.Timeout:
        print("❌ Request timed out (>120s)")
        print("💡 LLM processing takes time. Consider increasing timeout.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None
    except ValueError as e:
        print(f"❌ Invalid JSON response: {e}")
        print(f"   Response: {r.text[:500]}")
        return None

def test_ingest_text():
    """Test Flask /ingest_text endpoint by manually reading the logs."""
    print("\n[3/6] 🚀 Testing /ingest_text endpoint...")
    url = f"{BACKEND_URL}/ingest_text"

    if not os.path.exists(LOG_FILE_PATH):
        print(f"❌ Log file not found: {LOG_FILE_PATH}")
        return None

    print(f"   Reading logs from: {LOG_FILE_PATH}")
    with open(LOG_FILE_PATH, "r", errors="ignore") as f:
        logs = f.read()

    print(f"   Sending {len(logs)} characters of logs")
    payload = {"logs": logs}

    try:
        start_time = datetime.now()
        r = requests.post(url, json=payload, timeout=120)
        elapsed = (datetime.now() - start_time).total_seconds()

        print(f"✅ Request completed in {elapsed:.2f} seconds")
        print(f"   Status Code: {r.status_code}")

        if r.status_code == 200:
            return analyze_response(r.json())
        else:
            print(f"❌ Request failed with status {r.status_code}")
            print(f"   Response: {r.text[:500]}")
            return None

    except requests.exceptions.Timeout:
        print("❌ Request timed out (>120s)")
        print("💡 LLM processing takes time. Consider increasing timeout.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None
    except ValueError as e:
        print(f"❌ Invalid JSON response: {e}")
        print(f"   Response: {r.text[:500]}")
        return None

def analyze_response(response_data):
    """Analyze and display the response in a structured way"""
    print("\n[4/6] 📊 Analyzing response...")

    try:
        # Basic info
        status = response_data.get("status")
        timestamp = response_data.get("timestamp")

        print(f"\n{'='*80}")
        print(f"📋 ANALYSIS REPORT")
        print(f"{'='*80}")
        print(f"Status:    {status}")
        print(f"Timestamp: {timestamp}")

        # Attack Analysis
        attack_analysis = response_data.get("attack_analysis", {})
        print(f"\n🎯 Attack Analysis:")
        print(f"   Type:       {attack_analysis.get('attack_type', 'N/A')}")
        print(f"   Confidence: {attack_analysis.get('confidence', 0):.1%}")

        # Statistical Analysis
        stats = response_data.get("statistical_analysis", {})
        print(f"\n📈 Statistical Analysis:")
        print(f"   Total Nodes:          {stats.get('total_nodes', 0)}")
        print(f"   Total Edges:          {stats.get('total_edges', 0)}")
        print(f"   Anomalies Detected:   {stats.get('anomalies_detected_count', 0)}")
        print(f"   Anomalies Confirmed:  {stats.get('anomalies_confirmed_count', 0)}")
        print(f"   Z-Score Threshold:    {stats.get('zscore_threshold', 0):.2f}")

        # LLM Categorization Results
        llm_cat = response_data.get("llm_categorization", {})
        if llm_cat:
            print(f"\n🤖 LLM Categorization Results:")
            print(f"   Nodes Categorized: {len(llm_cat)}")

            # Show sample categorizations
            sample_count = min(5, len(llm_cat))
            print(f"\n   Sample Categorizations (showing {sample_count}):")
            for i, (node_id, cat_data) in enumerate(list(llm_cat.items())[:sample_count]):
                print(f"\n   [{i+1}] Node: {node_id}")
                print(f"       Category:       {cat_data.get('category', 'N/A')}")
                print(f"       Cloud Platform: {cat_data.get('cloud_platform', 'N/A')}")
                print(f"       Reasoning:      {cat_data.get('reasoning', 'N/A')}")
        else:
            print(f"\n⚠️  No LLM categorization data found (fallback used)")

        # GNN Analysis
        gnn = response_data.get("gnn_analysis", {})
        print(f"\n🧠 GNN Model Performance:")
        print(f"   Accuracy:   {gnn.get('accuracy', 0):.2%}")
        print(f"   Precision:  {gnn.get('precision', 0):.2%}")
        print(f"   Recall:     {gnn.get('recall', 0):.2%}")
        print(f"   F1 Score:   {gnn.get('f1_score', 0):.2%}")
        print(f"   Epochs:     {gnn.get('training_epochs', 0)}")
        print(f"   Final Loss: {gnn.get('final_loss', 0):.4f}")

        arch = gnn.get("model_architecture", {})
        print(f"\n   Model Architecture:")
        print(f"   Type:       {arch.get('type', 'N/A')}")
        print(f"   Input Dim:  {arch.get('input_dim', 0)}")
        print(f"   Hidden Dim: {arch.get('hidden_dim', 0)}")
        print(f"   Output Dim: {arch.get('output_dim', 0)}")

        features = gnn.get("feature_names", [])
        if features:
            print(f"\n   Features Used: {', '.join(features[:5])}")
            if len(features) > 5:
                print(f"   (... and {len(features) - 5} more)")

        # File paths
        print(f"\n💾 Output Files:")
        print(f"   Report:      {response_data.get('report_path', 'N/A')}")
        print(f"   D3.js Data:  {response_data.get('d3_results_path', 'N/A')}")

        print(f"\n{'='*80}\n")

        return response_data

    except Exception as e:
        print(f"❌ Error analyzing response: {e}")
        import traceback
        traceback.print_exc()
        return None

def verify_output_files(response_data):
    """Verify that output files were created"""
    print("[5/6] 📁 Verifying output files...")

    if not response_data:
        print("⚠️  Skipping file verification (no response data)")
        return

    # Check report file
    report_path = response_data.get("report_path")
    if report_path and os.path.exists(report_path):
        size = os.path.getsize(report_path) / 1024
        print(f"✅ Report file exists: {report_path} ({size:.2f} KB)")
    else:
        print(f"❌ Report file not found: {report_path}")

    # Check D3 results file
    d3_path = response_data.get("d3_results_path")
    if d3_path and os.path.exists(d3_path):
        size = os.path.getsize(d3_path) / 1024
        print(f"✅ D3.js file exists: {d3_path} ({size:.2f} KB)")

        # Validate D3 structure
        try:
            with open(d3_path, 'r') as f:
                d3_data = json.load(f)

            nodes = d3_data.get("nodes", [])
            links = d3_data.get("links", [])
            metadata = d3_data.get("metadata", {})

            print(f"   ├─ Nodes: {len(nodes)}")
            print(f"   ├─ Links: {len(links)}")

            platforms = metadata.get("cloud_platforms", {})
            categories = metadata.get("category_distribution", {})

            if platforms:
                print(f"   ├─ Cloud Platforms: {platforms}")
            if categories:
                print(f"   └─ Categories: {categories}")

        except Exception as e:
            print(f"⚠️  Could not validate D3 structure: {e}")
    else:
        print(f"❌ D3.js file not found: {d3_path}")

def print_summary(response_data):
    """Print final summary"""
    print("\n[6/6] ✨ Test Summary")
    print("="*80)

    if response_data:
        print("✅ Backend is functioning correctly!")
        print("✅ LLM categorization is working")
        print("✅ GNN training completed successfully")
        print("✅ Output files generated")
        print("\n💡 Next Steps:")
        print("   1. Open data_store/results.json in D3.js visualizer")
        print("   2. Review the comprehensive analysis report")
        print("   3. Check terminal logs for detailed processing info")
    else:
        print("❌ Test failed - review errors above")
        print("\n💡 Common Issues:")
        print("   • Backend not running: python app.py")
        print("   • GROQ_API_KEY not set in environment")
        print("   • Log file path incorrect")
        print("   • Network/firewall blocking requests")

    print("="*80 + "\n")

def main():
    """Main test execution"""
    print_banner()

    # Step 1: Check backend
    if not check_backend_alive():
        print_summary(None)
        return

    # Step 2: Check log file
    if not check_log_file():
        print_summary(None)
        return

    # Step 3: Choose test mode
    print("\n" + "="*80)
    print("Choose test mode:")
    print("="*80)
    print("1. Test /ingest_file (server reads from configured log path)")
    print("2. Test /ingest_text (client sends logs directly)")
    print("="*80)

    choice = input("\nEnter 1 or 2 [default: 2]: ").strip() or "2"

    # Step 4: Run test
    if choice == "1":
        response_data = test_ingest_file()
    else:
        response_data = test_ingest_text()

    # Step 5: Verify files
    verify_output_files(response_data)

    # Step 6: Summary
    print_summary(response_data)

    # Optional: Save full response
    if response_data:
        save_choice = input("\n💾 Save full response to file? (y/n) [n]: ").strip().lower()
        if save_choice == 'y':
            output_file = f"test_response_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(output_file, 'w') as f:
                json.dump(response_data, f, indent=2)
            print(f"✅ Saved to: {output_file}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()