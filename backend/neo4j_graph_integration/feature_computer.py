"""
feature_computer.py - Graph Feature Computation for AuraDB Free
Author: Trinetra-GNN Team
Description:
    Computes graph-based metrics for nodes in Neo4j AuraDB
    without requiring the Graph Data Science (GDS) plugin.
"""

from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from pathlib import Path
from datetime import datetime, timezone, timedelta
import sys
import re

# Ensure parent folder is visible to import config
sys.path.append(str(Path(__file__).parent))
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD


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
            print("✅ Connected to Neo4j successfully!\n")
        except (AuthError, ServiceUnavailable) as e:
            print(f"❌ Connection error: {str(e)}")
            sys.exit(1)

    def close(self):
        if self.driver:
            self.driver.close()
            print("\n🔌 Connection closed")

    # ──────────────────────────────────────────────
    # Utility: Ensure timestamps are ISO8601-compliant
    # ──────────────────────────────────────────────
    @staticmethod
    def normalize_timestamp(ts_str: str) -> str:
        """
        Convert common local-time formats (like '2025-11-03 19:17:26 IST')
        into ISO 8601 strings (like '2025-11-03T19:17:26+05:30')
        """
        if ts_str is None:
            return None

        # Handle known timezone abbreviations
        tz_map = {
            "IST": "+05:30",  # India Standard Time
            "UTC": "+00:00",
            "PST": "-08:00",
            "PDT": "-07:00",
            "CST": "-06:00",
            "CDT": "-05:00",
            "EST": "-05:00",
            "EDT": "-04:00"
        }

        for abbr, offset in tz_map.items():
            if abbr in ts_str:
                ts_str = ts_str.replace(abbr, "").strip()
                try:
                    dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                    return dt.isoformat() + offset
                except ValueError:
                    # fallback: if already ISO format, just append offset
                    return ts_str.replace(" ", "T") + offset

        # Already looks like ISO
        if re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", ts_str):
            return ts_str

        # Fallback: assume local IST time
        try:
            dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
            india_tz = timezone(timedelta(hours=5, minutes=30))
            return dt.replace(tzinfo=india_tz).isoformat()
        except ValueError:
            return ts_str  # leave as-is if unrecognized

    # ──────────────────────────────────────────────
    # Core Feature Computations
    # ──────────────────────────────────────────────

    def compute_degree_centrality(self):
        print("📊 Computing degree centrality...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            OPTIONAL MATCH (n)-[r_out]->()
            OPTIONAL MATCH ()-[r_in]->(n)
            WITH n, count(DISTINCT r_out) as out_degree, count(DISTINCT r_in) as in_degree
            SET n.out_degree = out_degree,
                n.in_degree = in_degree,
                n.total_degree = out_degree + in_degree
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed degree centrality for {count} nodes\n")

    def compute_betweenness_centrality(self):
        print("📈 Computing betweenness centrality...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            OPTIONAL MATCH path = (a)-[*1..3]-(n)-[*1..3]-(b)
            WHERE elementId(a) < elementId(b)
            WITH n, count(DISTINCT path) as paths_through_node
            SET n.betweenness_score = paths_through_node * 1.0
            RETURN count(n) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed betweenness scores for {count} nodes\n")

    def compute_risk_propagation(self):
        print("🔥 Computing risk propagation...")
        with self.driver.session() as session:
            query = """
            MATCH (n)-[r:CONNECTED_TO]->(m)
            WHERE n.risk_score > 0
            WITH m, sum(n.risk_score * 0.3) as inherited_risk
            SET m.inherited_risk_score = inherited_risk
            RETURN count(m) as updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed risk propagation for {count} nodes\n")

    def identify_anomaly_clusters(self):
        print("🧩 Identifying anomaly clusters...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            WHERE n.anomaly_probability > 0.35
            SET n.anomaly_cluster = true
            RETURN count(n) as anomaly_nodes
            """
            count = session.run(query).single()['anomaly_nodes']
            print(f"✅ Identified {count} anomaly cluster nodes\n")

    def compute_category_scores(self):
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

    # ──────────────────────────────────────────────
    # Advanced AuraDB-Free Metrics
    # ──────────────────────────────────────────────

    def compute_clustering_coefficient(self):
        print("🔄 Computing clustering coefficient...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            OPTIONAL MATCH (n)--(neighbor1)--(neighbor2)
            WHERE neighbor1 <> neighbor2 AND (neighbor1)--(neighbor2)
            WITH n, count(DISTINCT neighbor1) AS degree, count(DISTINCT neighbor2) AS triangles
            WITH n,
                 CASE WHEN degree > 1 THEN (2.0 * triangles) / (degree * (degree - 1))
                      ELSE 0.0 END AS clustering_coeff
            SET n.clustering_coeff = clustering_coeff
            RETURN count(n) AS updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed clustering coefficients for {count} nodes\n")

    def compute_neighborhood_risk_density(self):
        print("💣 Computing neighborhood risk density...")
        with self.driver.session() as session:
            query = """
            MATCH (n)-[:CONNECTED_TO]-(m)
            WITH n, avg(m.risk_score) AS neighbor_risk
            SET n.neighbor_risk_density = coalesce(neighbor_risk, 0)
            RETURN count(n) AS updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed neighborhood risk density for {count} nodes\n")

    def compute_isolation_score(self):
        print("🕸️  Computing isolation scores...")
        with self.driver.session() as session:
            query = """
            MATCH (n)
            WITH n, coalesce(n.total_degree, 0) AS deg
            SET n.isolation_score = CASE WHEN deg = 0 THEN 1.0 ELSE 1.0 / (deg + 1) END
            RETURN count(n) AS updated_count
            """
            count = session.run(query).single()['updated_count']
            print(f"✅ Computed isolation scores for {count} nodes\n")

    def compute_temporal_risk_trend(self):
        """
        Compute simple time-weighted risk trend.
        Ensures timestamps are normalized to ISO8601 before Neo4j conversion.
        """
        print("⏱️  Computing temporal risk trends...")

        with self.driver.session() as session:
            try:
                # Pull timestamps and reformat them
                records = session.run("MATCH (n) WHERE n.last_seen IS NOT NULL RETURN elementId(n) AS id, n.last_seen AS ts")
                updates = []
                for record in records:
                    clean_ts = self.normalize_timestamp(record["ts"])
                    updates.append({"id": record["id"], "ts": clean_ts})

                # Push normalized timestamps back
                for u in updates:
                    session.run("""
                        MATCH (n)
                        WHERE elementId(n) = $id
                        SET n.last_seen = $ts
                    """, u)

                # Now safely compute the trend
                query = """
                MATCH (n)
                WHERE n.last_seen IS NOT NULL
                WITH n, datetime(n.last_seen) AS t
                SET n.risk_trend = duration.between(t, datetime()).hours * coalesce(n.risk_score,0) * 0.01
                RETURN count(n) AS updated_count
                """
                count = session.run(query).single()['updated_count']
                print(f"✅ Computed temporal risk trends for {count} nodes\n")
        
            except Exception as e:
                print(f"⚠️  Temporal risk computation skipped (timestamp format issue): {e}\n")

    # ──────────────────────────────────────────────
    # Orchestrator
    # ──────────────────────────────────────────────

    def compute_all_features(self):
        print("=" * 50)
        print("🧮 COMPUTING GRAPH FEATURES")
        print("=" * 50)
        print()

        # Base features
        self.compute_degree_centrality()
        self.compute_betweenness_centrality()
        self.compute_risk_propagation()
        self.identify_anomaly_clusters()
        self.compute_category_scores()

        # Advanced features
        self.compute_clustering_coefficient()
        self.compute_neighborhood_risk_density()
        self.compute_isolation_score()
        self.compute_temporal_risk_trend()

        print("=" * 50)
        print("✅ FEATURE COMPUTATION COMPLETE!")
        print("=" * 50)


# ──────────────────────────────────────────────
# Main Execution
# ──────────────────────────────────────────────
if __name__ == "__main__":
    computer = None
    try:
        computer = FeatureComputer()
        computer.compute_all_features()
    except KeyboardInterrupt:
        print("\n⚠️  Computation interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        if computer:
            computer.close()
