"""
feature_computer.py - Graph Feature Computation for Unified Schema
------------------------------------------------------------------
Works with unified results.json schema
Computes graph metrics without GDS plugin (AuraDB Free compatible)
"""

from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from pathlib import Path
from datetime import datetime, timezone, timedelta
import sys
import re

sys.path.append(str(Path(__file__).parent))


# Load from .env
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent 
load_dotenv(BACKEND_DIR / ".env")

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER") or os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")


class FeatureComputer:
    def __init__(self):
        try:
            print("🔌 Connecting to Neo4j...")
            self.driver = GraphDatabase.driver(
                NEO4J_URI,
                auth=(NEO4J_USER, NEO4J_PASSWORD),
                max_connection_lifetime=3600
            )
            self.driver.verify_connectivity()
            print("✅ Connected successfully!\n")
        except (AuthError, ServiceUnavailable) as e:
            print(f"❌ Connection error: {e}")
            sys.exit(1)

    def close(self):
        if self.driver:
            self.driver.close()
            print("\n🔌 Connection closed")

    
    # BASIC GRAPH METRICS
      

    def compute_degree_centrality(self):
        """Compute in/out/total degree for all nodes"""
        print("📊 Computing degree centrality...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            OPTIONAL MATCH (n)-[r_out:CONNECTED_TO]->()
            OPTIONAL MATCH ()-[r_in:CONNECTED_TO]->(n)
            WITH n, 
                 count(DISTINCT r_out) as out_degree, 
                 count(DISTINCT r_in) as in_degree
            SET n.out_degree = out_degree,
                n.in_degree = in_degree,
                n.total_degree = out_degree + in_degree
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed degree centrality for {count} nodes\n")

    def compute_betweenness_centrality(self):
        """Estimate betweenness using path counting"""
        print("📈 Computing betweenness centrality...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            OPTIONAL MATCH path = (a)-[:CONNECTED_TO*1..3]-(n)-[:CONNECTED_TO*1..3]-(b)
            WHERE elementId(a) < elementId(b)
            WITH n, count(DISTINCT path) as paths_through_node
            SET n.betweenness_score = toFloat(paths_through_node)
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed betweenness scores for {count} nodes\n")

    def compute_clustering_coefficient(self):
        """Compute local clustering coefficient"""
        print("🔄 Computing clustering coefficient...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            OPTIONAL MATCH (n)-[:CONNECTED_TO]-(neighbor1)-[:CONNECTED_TO]-(neighbor2)-[:CONNECTED_TO]-(n)
            WHERE neighbor1 <> neighbor2
            WITH n, 
                 count(DISTINCT neighbor1) AS neighbors,
                 count(DISTINCT neighbor2) AS triangles
            WITH n,
                 CASE 
                   WHEN neighbors > 1 
                   THEN toFloat(triangles) / (toFloat(neighbors) * (toFloat(neighbors) - 1))
                   ELSE 0.0 
                 END AS clustering_coeff
            SET n.clustering_coeff = clustering_coeff
            RETURN count(n) AS updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed clustering coefficients for {count} nodes\n")

      
    # RISK & SECURITY METRICS
      

    def compute_risk_propagation(self):
        """Compute inherited risk from neighbors"""
        print("🔥 Computing risk propagation...")
        with self.driver.session() as session:
            query = """
            MATCH (n)-[:CONNECTED_TO]-(m)
            WHERE m.risk_score > 0
            WITH n, sum(m.risk_score * 0.3) as inherited_risk
            SET n.inherited_risk_score = inherited_risk
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed risk propagation for {count} nodes\n")

    def compute_neighborhood_risk_density(self):
        """Average risk score of neighbors"""
        print("💣 Computing neighborhood risk density...")
        with self.driver.session() as session:
            query = """
            MATCH (n)-[:CONNECTED_TO]-(m)
            WITH n, avg(m.risk_score) AS neighbor_risk
            SET n.neighbor_risk_density = coalesce(neighbor_risk, 0.0)
            RETURN count(n) AS updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed neighborhood risk density for {count} nodes\n")

    def compute_cve_neighborhood_score(self):
        """Count CVEs in 1-hop neighborhood"""
        print("🛡️ Computing CVE neighborhood scores...")
        with self.driver.session() as session:
            query = """
            MATCH (n)-[:CONNECTED_TO]-(m)
            WITH n, sum(m.cve_count) as neighbor_cves
            SET n.neighbor_cve_count = neighbor_cves
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed CVE neighborhood scores for {count} nodes\n")

      
    # ANOMALY & THREAT METRICS
      

    def identify_anomaly_clusters(self):
        """Mark nodes in anomaly-dense regions"""
        print("🧩 Identifying anomaly clusters...")
        with self.driver.session() as session:
            # Mark high-probability anomaly nodes
            query1 = """
            MATCH (n)
            WHERE n.anomaly_probability > 0.35 OR n.is_anomaly = true
            SET n.anomaly_cluster = true
            RETURN count(n) as anomaly_nodes
            """
            count1 = session.run(query1).single()['anomaly_nodes']
            
            # Mark neighbors of anomaly clusters
            query2 = """
            MATCH (n)-[:CONNECTED_TO]-(m)
            WHERE m.anomaly_cluster = true
            SET n.near_anomaly = true
            RETURN count(n) as near_anomaly_nodes
            """
            count2 = session.run(query2).single()['near_anomaly_nodes']
            
            print(f"✅ Identified {count1} anomaly cluster nodes")
            print(f"✅ Marked {count2} nodes near anomalies\n")

    def compute_threat_propagation_score(self):
        """Estimate threat spread potential"""
        print("⚠️ Computing threat propagation scores...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            WITH n,
                 n.anomaly_probability * 0.4 +
                 n.risk_score * 0.03 +
                 toFloat(n.total_degree) * 0.05 +
                 CASE WHEN n.has_high_cve THEN 2.0 ELSE 0.0 END as threat_score
            SET n.threat_propagation_score = threat_score
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed threat propagation for {count} nodes\n")

      
    # ISOLATION & CONNECTIVITY METRICS
      

    def compute_isolation_score(self):
        """Measure node isolation (inverse of connectivity)"""
        print("🕸️ Computing isolation scores...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            WITH n, coalesce(n.total_degree, 0) AS deg
            SET n.isolation_score = CASE 
                WHEN deg = 0 THEN 1.0 
                ELSE 1.0 / toFloat(deg + 1) 
            END
            RETURN count(n) AS updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed isolation scores for {count} nodes\n")

    def compute_bridge_score(self):
        """Identify bridge nodes connecting different components"""
        print("🌉 Computing bridge scores...")
        with self.driver.session() as session:
            query = """
            MATCH (n)-[:CONNECTED_TO]-(m1), (n)-[:CONNECTED_TO]-(m2)
            WHERE m1 <> m2 AND NOT (m1)-[:CONNECTED_TO]-(m2)
            WITH n, count(DISTINCT m1) as disconnected_neighbors
            SET n.bridge_score = toFloat(disconnected_neighbors) / toFloat(n.total_degree + 1)
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed bridge scores for {count} nodes\n")

      
    # CATEGORY & PLATFORM METRICS
      

    def compute_category_scores(self):
        """Category-level risk aggregation"""
        print("📚 Computing category-level scores...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            WITH n.category as category, 
                 avg(n.risk_score) as avg_risk,
                 count(n) as node_count
            MATCH (n2)
            WHERE n2.category = category
            SET n2.category_avg_risk = avg_risk,
                n2.category_node_count = node_count
            RETURN count(DISTINCT category) as categories_processed
            """
            count = session.run(query).single()['categories_processed']
            print(f"✅ Computed category scores for {count} categories\n")

    def compute_platform_risk_distribution(self):
        """Cloud platform risk distribution"""
        print("☁️ Computing platform risk distribution...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            WITH n.cloud_platform as platform,
                 avg(n.risk_score) as avg_risk,
                 sum(CASE WHEN n.is_anomaly THEN 1 ELSE 0 END) as anomaly_count
            MATCH (n2)
            WHERE n2.cloud_platform = platform
            SET n2.platform_avg_risk = avg_risk,
                n2.platform_anomaly_count = anomaly_count
            RETURN count(DISTINCT platform) as platforms_processed
            """
            count = session.run(query).single()['platforms_processed']
            print(f"✅ Computed platform risk for {count} platforms\n")

      
    # TEMPORAL METRICS (if timestamps available)
      

    def normalize_timestamp(self, ts_str):
        """Normalize timestamp to ISO8601"""
        if not ts_str:
            return None
        
        tz_map = {
            "IST": "+05:30",
            "UTC": "+00:00",
            "PST": "-08:00",
            "EST": "-05:00"
        }
        
        for abbr, offset in tz_map.items():
            if abbr in ts_str:
                ts_str = ts_str.replace(abbr, "").strip()
                try:
                    dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                    return dt.isoformat() + offset
                except ValueError:
                    return ts_str.replace(" ", "T") + offset
        
        return ts_str

    def compute_temporal_risk_trend(self):
        """Time-weighted risk trends"""
        print("⏱️ Computing temporal risk trends...")
        with self.driver.session() as session:
            try:
                # Normalize timestamps first
                records = session.run(
                    "MATCH (n) WHERE n.last_seen IS NOT NULL "
                    "RETURN elementId(n) AS id, n.last_seen AS ts"
                )
                
                for record in records:
                    clean_ts = self.normalize_timestamp(record["ts"])
                    if clean_ts:
                        session.run(
                            "MATCH (n) WHERE elementId(n) = $id SET n.last_seen = $ts",
                            {"id": record["id"], "ts": clean_ts}
                        )
                
                # Compute risk trend
                query = """
                MATCH (n)
                WHERE n.last_seen IS NOT NULL
                WITH n, datetime(n.last_seen) AS t
                SET n.risk_trend = duration.between(t, datetime()).hours * 
                                   coalesce(n.risk_score, 0.0) * 0.01
                RETURN count(n) AS updated_count
                """
                count = session.run(query).single()['updated_count']
                print(f"✅ Computed temporal risk trends for {count} nodes\n")
            
            except Exception as e:
                print(f"⚠️ Temporal computation skipped: {e}\n")

      
    # GNN FEATURE PREPARATION
      

    def prepare_gnn_features(self):
        """Create combined feature vector for GNN"""
        print("🤖 Preparing GNN feature vectors...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            SET n.gnn_feature_vector = [
                coalesce(n.risk_score, 0.0),
                coalesce(n.cve_risk, 0.0),
                coalesce(n.behavioral_risk, 0.0),
                toFloat(coalesce(n.cve_count, 0)),
                toFloat(coalesce(n.total_degree, 0)),
                coalesce(n.anomaly_probability, 0.0),
                coalesce(n.clustering_coeff, 0.0),
                coalesce(n.betweenness_score, 0.0),
                coalesce(n.neighbor_risk_density, 0.0),
                coalesce(n.isolation_score, 0.0)
            ]
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Prepared GNN features for {count} nodes\n")

      
    # MAIN ORCHESTRATOR
      

    def compute_all_features(self):
        """Run all feature computations"""
        print("=" * 60)
        print("🧮 COMPUTING GRAPH FEATURES")
        print("=" * 60)
        print()

        # Basic graph metrics
        self.compute_degree_centrality()
        self.compute_betweenness_centrality()
        self.compute_clustering_coefficient()

        # Risk & security metrics
        self.compute_risk_propagation()
        self.compute_neighborhood_risk_density()
        self.compute_cve_neighborhood_score()

        # Anomaly & threat metrics
        self.identify_anomaly_clusters()
        self.compute_threat_propagation_score()

        # Isolation & connectivity
        self.compute_isolation_score()
        self.compute_bridge_score()

        # Category & platform
        self.compute_category_scores()
        self.compute_platform_risk_distribution()

        # Temporal (if available)
        self.compute_temporal_risk_trend()

        # GNN preparation
        self.prepare_gnn_features()

        print("=" * 60)
        print("✅ FEATURE COMPUTATION COMPLETE!")
        print("=" * 60)
        print("\n📊 Computed features:")
        print("   • Degree centrality (in/out/total)")
        print("   • Betweenness centrality")
        print("   • Clustering coefficient")
        print("   • Risk propagation")
        print("   • Neighborhood risk density")
        print("   • CVE neighborhood scores")
        print("   • Anomaly clusters")
        print("   • Threat propagation")
        print("   • Isolation scores")
        print("   • Bridge scores")
        print("   • Category aggregations")
        print("   • Platform risk distribution")
        print("   • Temporal risk trends")
        print("   • GNN feature vectors")
        print("=" * 60)


  
# MAIN EXECUTION
  
if __name__ == "__main__":
    computer = None
    try:
        computer = FeatureComputer()
        computer.compute_all_features()
    except KeyboardInterrupt:
        print("\n⚠️ Computation interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if computer:
            computer.close()