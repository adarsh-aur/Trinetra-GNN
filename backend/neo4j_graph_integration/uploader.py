"""
uploader.py — Neo4j Aura Data Uploader with Auto-Fallback
"""

import os
import json
import sys
from pathlib import Path
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError, ConfigurationError
from dotenv import load_dotenv


# ---------------------------------------------------------------------
# 1️⃣  ENVIRONMENT LOADING
# ---------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
dotenv_path = BASE_DIR / ".env"

print(f"🔍 Looking for .env at: {dotenv_path}")
if dotenv_path.exists():
    load_dotenv(dotenv_path)
    print("   File exists: True\n")
else:
    print("❌ .env file not found! Please create it at backend/.env")
    sys.exit(1)

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER") or os.getenv("NEO4J_USERNAME")  # ✅ Support both
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
    print("❌ Missing Neo4j credentials in .env file.")
    sys.exit(1)

print("📋 Loaded values:")
print(f"   NEO4J_URI: {NEO4J_URI[:40]}...")
print(f"   NEO4J_USER: {NEO4J_USER}")
print(f"   NEO4J_PASSWORD: {'*' * len(NEO4J_PASSWORD)}\n")
print("✅ Config loaded successfully!\n")


# ---------------------------------------------------------------------
# 2️⃣  NEO4J UPLOADER CLASS
# ---------------------------------------------------------------------
class Neo4jUploader:
    def __init__(self, uri, user, password):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        self._connect()

    def _connect(self):
        """Try connecting to Neo4j, fallback to bolt+s:// if routing fails"""
        try:
            print(f"🔌 Connecting to Neo4j Aura using URI: {self.uri}")
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            print("✅ Connected to Neo4j Aura successfully!\n")

        except (ServiceUnavailable, ConfigurationError) as e:
            if "routing" in str(e).lower():
                print("⚠️ Routing failed — retrying with direct bolt+s:// protocol...\n")
                host = self.uri.split("://")[1]
                fallback_uri = f"bolt+s://{host}"
                try:
                    self.driver = GraphDatabase.driver(fallback_uri, auth=(self.user, self.password))
                    self.driver.verify_connectivity()
                    print("✅ Connected successfully using fallback (bolt+s://)\n")
                except Exception as inner_e:
                    self._connection_error(inner_e)
            else:
                self._connection_error(e)
        except AuthError:
            print("❌ Authentication failed! Check NEO4J_USER and NEO4J_PASSWORD.")
            sys.exit(1)
        except Exception as e:
            self._connection_error(e)

    def _connection_error(self, e):
        print(f"❌ Cannot connect to Neo4j Aura!\n   Error: {e}")
        sys.exit(1)

    def close(self):
        if self.driver:
            self.driver.close()
            print("🔌 Connection closed.\n")

    def clear_database(self):
        """⚠️ Clears the database (use carefully)"""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("✅ Database cleared.\n")

    def upload_nodes(self, nodes):
        """Upload nodes with proper labels (IP or PROCESS)"""
        if not nodes:
            print("⚠️ No nodes to upload.")
            return
        
        with self.driver.session() as session:
            for i, node in enumerate(nodes, 1):
                # ✅ FIX: Use type field to determine label
                node_type = node.get("type", "unknown").upper()
                
                # Debug first node
                if i == 1:
                    print(f"\n🔍 First node debug:")
                    print(f"   ID: {node['id']}")
                    print(f"   Type: {node.get('type')}")
                    print(f"   Label: {node_type}")
                    print(f"   Name: {node.get('name')}\n")
                
                # ✅ FIX: Create dynamic label based on type
                query = f"""
                MERGE (n:{node_type} {{id: $id}})
                SET n.name = $name,
                    n.type = $type,
                    n.cloud_platform = $cloud_platform,
                    n.category = $category,
                    n.categorization_reasoning = $categorization_reasoning,
                    n.risk_score = $risk_score,
                    n.anomaly_probability = $anomaly_probability,
                    n.is_anomaly = $is_anomaly,
                    n.cve_count = $cve_count,
                    n.last_seen = $last_seen,
                    n.group = $group,
                    n.size = $size,
                    n.color = $color
                """
                
                session.run(
                    query,
                    id=node["id"],
                    name=node.get("name"),
                    type=node.get("type"),
                    cloud_platform=node.get("cloud_platform"),
                    category=node.get("category"),
                    categorization_reasoning=node.get("categorization_reasoning"),
                    risk_score=float(node.get("risk_score", 0)),
                    anomaly_probability=float(node.get("anomaly_probability", 0)),
                    is_anomaly=bool(node.get("is_anomaly", False)),
                    cve_count=int(node.get("cve_count", 0)),
                    last_seen=node.get("last_seen"),
                    group=int(node.get("group", 0)),
                    size=float(node.get("size", 1)),
                    color=node.get("color")
                )
                
                if i % 20 == 0:
                    print(f"   Uploaded {i}/{len(nodes)} nodes...")
            
            print(f"✅ Uploaded {len(nodes)} nodes.\n")

    def upload_links(self, links):
        """Upload relationships"""
        if not links:
            print("⚠️ No links to upload.")
            return
        
        query = """
        MATCH (a {id: $source}), (b {id: $target})
        MERGE (a)-[r:CONNECTED_TO]->(b)
        SET r.type = $type, r.weight = $weight, r.count = $count, r.value = $value
        """
        
        with self.driver.session() as session:
            for i, link in enumerate(links, 1):
                session.run(
                    query,
                    source=link["source"],
                    target=link["target"],
                    type=link.get("type", "generic"),
                    weight=float(link.get("weight", 1)),
                    count=int(link.get("count", 1)),
                    value=float(link.get("value", 0)),
                )
                if i % 20 == 0:
                    print(f"   Uploaded {i}/{len(links)} links...")
            
            print(f"✅ Uploaded {len(links)} relationships.\n")

    def upload_metadata(self, metadata):
        """Upload metadata summary"""
        query = """
        MERGE (m:Metadata {id: 'analysis_metadata'})
        SET m.generated_at = $generated_at,
            m.total_nodes = $total_nodes,
            m.total_links = $total_links,
            m.attack_type = $attack_type,
            m.confidence = $confidence,
            m.anomalies_detected = $anomalies_detected,
            m.gnn_accuracy = $gnn_accuracy,
            m.avg_risk_score = $avg_risk_score,
            m.max_risk_score = $max_risk_score,
            m.high_risk_nodes = $high_risk_nodes
        """
        
        with self.driver.session() as session:
            session.run(
                query,
                generated_at=metadata.get("generated_at"),
                total_nodes=int(metadata["analysis_summary"].get("total_nodes", 0)),
                total_links=int(metadata["analysis_summary"].get("total_links", 0)),
                attack_type=metadata["analysis_summary"].get("attack_type"),
                confidence=float(metadata["analysis_summary"].get("confidence", 0)),
                anomalies_detected=int(metadata["analysis_summary"].get("anomalies_detected", 0)),
                gnn_accuracy=float(metadata["analysis_summary"].get("gnn_accuracy", 0)),
                avg_risk_score=float(metadata["risk_statistics"].get("avg_risk_score", 0)),
                max_risk_score=float(metadata["risk_statistics"].get("max_risk_score", 0)),
                high_risk_nodes=int(metadata["risk_statistics"].get("high_risk_nodes", 0)),
            )
            print("✅ Uploaded metadata.\n")

    def upload_from_json(self, json_file_path):
        """Main upload pipeline"""
        file_path = Path(json_file_path)
        if not file_path.is_absolute():
            file_path = Path(__file__).resolve().parent.parent / json_file_path

        print(f"📂 Reading data from: {file_path}")
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            return

        try:
            with open(file_path, "r") as f:
                data = json.load(f)

            print(f"📊 Data loaded: {len(data['nodes'])} nodes, {len(data['links'])} links")
            print("🚀 Starting upload...\n")

            self.upload_nodes(data["nodes"])
            self.upload_links(data["links"])
            self.upload_metadata(data["metadata"])

            print("=" * 60)
            print("✅ UPLOAD COMPLETE — Data successfully pushed to Neo4j Aura.")
            print("=" * 60)

        except Exception as e:
            print(f"❌ Upload failed: {e}")
            import traceback
            traceback.print_exc()


# ---------------------------------------------------------------------
# 3️⃣  MAIN EXECUTION
# ---------------------------------------------------------------------
if __name__ == "__main__":
    uploader = None
    try:
        uploader = Neo4jUploader(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
        
        # Ask user before clearing
        clear = input("\n⚠️  Clear existing database? (yes/no): ").strip().lower()
        if clear == "yes":
            uploader.clear_database()
        
        uploader.upload_from_json("data_store/results.json")
    except KeyboardInterrupt:
        print("\n⚠️ Upload interrupted by user.")
    finally:
        if uploader:
            uploader.close()