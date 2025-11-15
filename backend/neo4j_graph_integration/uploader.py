"""
uploader.py — Neo4j Aura Data Uploader (FIXED VERSION)
-------------------------------------------------------
✅ Proper Neo4j labels (IP not Ip, PROCESS not Process)
✅ All fields from unified results.json
✅ Compatible with GraphBuilder and FeatureComputer
✅ No ID prefixing - uses original IDs
"""

import os
import sys
import json
from pathlib import Path
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError, ConfigurationError
from dotenv import load_dotenv

# Load environment
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent
load_dotenv(BACKEND_DIR / ".env")

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER") or os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
    print("❌ Missing Neo4j credentials in .env file.")
    sys.exit(1)

print(f"📋 Configuration:")
print(f"   URI: {NEO4J_URI[:40]}...")
print(f"   User: {NEO4J_USER}\n")


class Neo4jUploader:
    def __init__(self, uri, user, password):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        self._connect()

    def _connect(self):
        """Connect to Neo4j with fallback"""
        try:
            print(f"🔌 Connecting to Neo4j...")
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            print("✅ Connected successfully!\n")

        except (ServiceUnavailable, ConfigurationError) as e:
            if "routing" in str(e).lower():
                print("⚠️ Routing failed — trying bolt+s://...\n")
                host = self.uri.split("://")[1]
                fallback_uri = f"bolt+s://{host}"
                try:
                    self.driver = GraphDatabase.driver(fallback_uri, auth=(self.user, self.password))
                    self.driver.verify_connectivity()
                    print("✅ Connected with fallback!\n")
                except Exception as inner_e:
                    self._connection_error(inner_e)
            else:
                self._connection_error(e)
        except AuthError:
            print("❌ Authentication failed! Check credentials.")
            sys.exit(1)
        except Exception as e:
            self._connection_error(e)

    def _connection_error(self, e):
        print(f"❌ Cannot connect to Neo4j!\n   Error: {e}")
        sys.exit(1)

    def close(self):
        if self.driver:
            self.driver.close()
            print("🔌 Connection closed.\n")

    def clear_database(self):
        """⚠️ Clear entire database"""
        print("⚠️ Clearing database...")
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("✅ Database cleared.\n")

    def create_indexes(self):
        """Create indexes for performance"""
        print("📇 Creating indexes...")
        with self.driver.session() as session:
            # Using proper uppercase labels
            indexes = [
                "CREATE INDEX node_id IF NOT EXISTS FOR (n:NODE) ON (n.id)",
                "CREATE INDEX ip_id IF NOT EXISTS FOR (n:IP) ON (n.id)",
                "CREATE INDEX process_id IF NOT EXISTS FOR (n:PROCESS) ON (n.id)",
                "CREATE INDEX service_id IF NOT EXISTS FOR (n:SERVICE) ON (n.id)",
                "CREATE INDEX risk_score IF NOT EXISTS FOR (n:NODE) ON (n.risk_score)",
                "CREATE INDEX anomaly IF NOT EXISTS FOR (n:NODE) ON (n.is_anomaly)",
                "CREATE INDEX node_number IF NOT EXISTS FOR (n:NODE) ON (n.node_number)"
            ]
            
            for idx_query in indexes:
                try:
                    session.run(idx_query)
                except Exception:
                    pass  # Already exists
            
        print("✅ Indexes created.\n")

    def normalize_label(self, label):
        """Convert label to proper Neo4j convention (UPPERCASE)"""
        label_map = {
            "Ip": "IP",
            "Process": "PROCESS",
            "Service": "SERVICE",
            "Node": "NODE",
            "Unknown": "NODE"
        }
        return label_map.get(label, label.upper())

    def upload_nodes(self, nodes):
        """Upload nodes with ALL properties"""
        if not nodes:
            print("⚠️ No nodes to upload.")
            return

        print(f"📤 Uploading {len(nodes)} nodes...")
        
        with self.driver.session() as session:
            for i, node in enumerate(nodes, 1):
                # Get and normalize label
                raw_labels = node.get("labels", ["NODE"])
                label = self.normalize_label(raw_labels[0])
                
                # Extract CVE IDs
                cve_ids = node.get("cve_ids", [])
                
                # Comprehensive property mapping
                query = f"""
                MERGE (n:{label} {{id: $id}})
                SET n.node_number = $node_number,
                    n.name = $name,
                    n.type = $type,
                    n.description = $description,
                    n.cloud_platform = $cloud_platform,
                    n.category = $category,
                    n.categorization_method = $categorization_method,
                    n.categorization_reasoning = $categorization_reasoning,
                    n.risk_score = $risk_score,
                    n.cve_risk = $cve_risk,
                    n.behavioral_risk = $behavioral_risk,
                    n.cve_ids = $cve_ids,
                    n.cve_count = $cve_count,
                    n.has_critical_cve = $has_critical_cve,
                    n.has_high_cve = $has_high_cve,
                    n.is_anomaly = $is_anomaly,
                    n.is_detected_anomaly = $is_detected_anomaly,
                    n.is_confirmed_anomaly = $is_confirmed_anomaly,
                    n.anomaly_probability = $anomaly_probability,
                    n.anomaly_confidence = $anomaly_confidence,
                    n.anomaly_threat_type = $anomaly_threat_type,
                    n.anomaly_reason = $anomaly_reason,
                    n.anomaly_severity = $anomaly_severity,
                    n.enhanced_anomaly_score = $enhanced_anomaly_score,
                    n.gnn_predicted_label = $gnn_predicted_label,
                    n.gnn_actual_label = $gnn_actual_label,
                    n.last_seen = $last_seen,
                    n.color = $color,
                    n.size = $size,
                    n.group = $group
                RETURN n.id as id
                """

                session.run(
                    query,
                    id=node.get("id"),
                    node_number=int(node.get("node_number", 0)),
                    name=node.get("id"),  # Use ID as name for display
                    type=node.get("type"),
                    description=node.get("description"),
                    cloud_platform=node.get("cloud_platform"),
                    category=node.get("category"),
                    categorization_method=node.get("categorization_method"),
                    categorization_reasoning=node.get("categorization_reasoning"),
                    risk_score=float(node.get("risk_score", 0)),
                    cve_risk=float(node.get("cve_risk", 0)),
                    behavioral_risk=float(node.get("behavioral_risk", 0)),
                    cve_ids=cve_ids,
                    cve_count=int(node.get("cve_count", 0)),
                    has_critical_cve=bool(node.get("has_critical_cve", False)),
                    has_high_cve=bool(node.get("has_high_cve", False)),
                    is_anomaly=bool(node.get("is_anomaly", False)),
                    is_detected_anomaly=bool(node.get("is_detected_anomaly", False)),
                    is_confirmed_anomaly=bool(node.get("is_confirmed_anomaly", False)),
                    anomaly_probability=float(node.get("anomaly_probability", 0)),
                    anomaly_confidence=node.get("anomaly_confidence", "none"),
                    anomaly_threat_type=node.get("anomaly_threat_type", "none"),
                    anomaly_reason=node.get("anomaly_reason", "N/A"),
                    anomaly_severity=node.get("anomaly_severity", "none"),
                    enhanced_anomaly_score=float(node.get("enhanced_anomaly_score", 0)),
                    gnn_predicted_label=int(node.get("gnn_predicted_label", 0)),
                    gnn_actual_label=int(node.get("gnn_actual_label", 0)),
                    last_seen=node.get("last_seen"),
                    color=node.get("color", "#888"),
                    size=float(node.get("size", 10)),
                    group=int(node.get("group", 0))
                )

                if i % 50 == 0 or i == len(nodes):
                    print(f"   Uploaded {i}/{len(nodes)} nodes...")

        print(f"✅ All {len(nodes)} nodes uploaded.\n")

    def upload_relationships(self, relationships):
        """Upload relationships"""
        if not relationships:
            print("⚠️ No relationships to upload.")
            return

        print(f"🔗 Uploading {len(relationships)} relationships...")
        
        query = """
        MATCH (a {id: $source})
        MATCH (b {id: $target})
        MERGE (a)-[r:CONNECTED_TO]->(b)
        SET r.id = $rel_id,
            r.type = $type,
            r.connection_type = $connection_type,
            r.weight = $weight,
            r.count = $count
        RETURN r
        """

        with self.driver.session() as session:
            successful = 0
            failed = 0
            
            for i, rel in enumerate(relationships, 1):
                try:
                    result = session.run(
                        query,
                        rel_id=rel.get("id"),
                        source=rel.get("source"),
                        target=rel.get("target"),
                        type=rel.get("type", "CONNECTION"),
                        connection_type=rel.get("connection_type", "connection"),
                        weight=float(rel.get("weight", 1.0)),
                        count=int(rel.get("count", 1))
                    )
                    
                    if result.single():
                        successful += 1
                    else:
                        failed += 1
                    
                except Exception as e:
                    failed += 1
                    if failed <= 5:  # Only print first 5 errors
                        print(f"   ⚠️ Error on relationship {i}: {e}")

                if i % 50 == 0 or i == len(relationships):
                    print(f"   Processed {i}/{len(relationships)} relationships...")

        print(f"✅ Relationships: {successful} successful, {failed} failed.\n")

    def upload_metadata(self, metadata):
        """Upload metadata as summary node"""
        print("📋 Uploading metadata...")
        
        query = """
        MERGE (m:METADATA {id: 'analysis_metadata'})
        SET m.schema_version = $schema_version,
            m.generated_at = $generated_at,
            m.generated_at_ist = $generated_at_ist,
            m.cloud_provider = $cloud_provider,
            m.cloud_confidence = $cloud_confidence,
            m.attack_type = $attack_type,
            m.attack_confidence = $attack_confidence,
            m.total_nodes = $total_nodes,
            m.total_relationships = $total_relationships,
            m.anomalies_detected = $anomalies_detected,
            m.anomalies_confirmed = $anomalies_confirmed,
            m.total_cves_found = $total_cves_found,
            m.nodes_with_cves = $nodes_with_cves,
            m.gnn_accuracy = $gnn_accuracy,
            m.gnn_precision = $gnn_precision,
            m.gnn_recall = $gnn_recall,
            m.gnn_f1_score = $gnn_f1_score
        RETURN m
        """

        with self.driver.session() as session:
            session.run(
                query,
                schema_version=metadata.get("schema_version"),
                generated_at=metadata.get("generated_at"),
                generated_at_ist=metadata.get("generated_at_ist"),
                cloud_provider=metadata.get("cloud_platform", {}).get("provider"),
                cloud_confidence=int(metadata.get("cloud_platform", {}).get("confidence", 0)),
                attack_type=metadata.get("attack_summary", {}).get("type"),
                attack_confidence=float(metadata.get("attack_summary", {}).get("confidence", 0)),
                total_nodes=int(metadata.get("statistics", {}).get("total_nodes", 0)),
                total_relationships=int(metadata.get("statistics", {}).get("total_relationships", 0)),
                anomalies_detected=int(metadata.get("statistics", {}).get("anomalies_detected", 0)),
                anomalies_confirmed=int(metadata.get("statistics", {}).get("anomalies_confirmed", 0)),
                total_cves_found=int(metadata.get("cve_summary", {}).get("total_cves_found", 0)),
                nodes_with_cves=int(metadata.get("cve_summary", {}).get("nodes_with_cves", 0)),
                gnn_accuracy=float(metadata.get("gnn_performance", {}).get("accuracy", 0)),
                gnn_precision=float(metadata.get("gnn_performance", {}).get("precision", 0)),
                gnn_recall=float(metadata.get("gnn_performance", {}).get("recall", 0)),
                gnn_f1_score=float(metadata.get("gnn_performance", {}).get("f1_score", 0))
            )
        
        print("✅ Metadata uploaded.\n")

    def upload_from_unified_json(self, json_file_path):
        """Main upload pipeline"""
        file_path = Path(json_file_path)
        if not file_path.is_absolute():
            file_path = BASE_DIR / json_file_path

        print(f"📂 Reading: {file_path}")
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            return

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            nodes = data.get("nodes", [])
            relationships = data.get("relationships", [])
            metadata = data.get("metadata", {})

            print(f"\n📊 Data loaded:")
            print(f"   Nodes: {len(nodes)}")
            print(f"   Relationships: {len(relationships)}")
            print(f"   Schema: {metadata.get('schema_version', 'unknown')}")
            print("\n🚀 Starting upload...\n")

            self.create_indexes()
            self.upload_nodes(nodes)
            self.upload_relationships(relationships)
            self.upload_metadata(metadata)

            print("=" * 60)
            print("✅ UPLOAD COMPLETE")
            print("=" * 60)
            print(f"📊 Summary:")
            print(f"   Nodes: {len(nodes)}")
            print(f"   Relationships: {len(relationships)}")
            print(f"   Cloud: {metadata.get('cloud_platform', {}).get('provider', 'unknown').upper()}")
            print(f"   CVEs: {metadata.get('cve_summary', {}).get('total_cves_found', 0)}")
            print("=" * 60)

        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
        except Exception as e:
            print(f"❌ Upload failed: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    uploader = None
    try:
        uploader = Neo4jUploader(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
        
        clear = input("\n⚠️  Clear existing database? (yes/no): ").strip().lower()
        if clear == "yes":
            uploader.clear_database()

        uploader.upload_from_unified_json("../data_store/results.json")

    except KeyboardInterrupt:
        print("\n⚠️ Upload interrupted.")
    finally:
        if uploader:
            uploader.close()