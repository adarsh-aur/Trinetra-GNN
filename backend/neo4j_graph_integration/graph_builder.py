from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent))

from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

class GraphBuilder:
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
    
    def create_indexes(self):
        """Create indexes for faster querying on IP and PROCESS nodes"""
        print("Creating indexes...")
        with self.driver.session() as session:
            indexes = [
                "CREATE INDEX ip_id_index IF NOT EXISTS FOR (n:IP) ON (n.id)",
                "CREATE INDEX ip_name_index IF NOT EXISTS FOR (n:IP) ON (n.name)",
                "CREATE INDEX process_id_index IF NOT EXISTS FOR (n:PROCESS) ON (n.id)",
                "CREATE INDEX process_name_index IF NOT EXISTS FOR (n:PROCESS) ON (n.name)",
                "CREATE INDEX risk_score_index IF NOT EXISTS FOR (n:IP) ON (n.risk_score)",
                "CREATE INDEX risk_score_process_index IF NOT EXISTS FOR (n:PROCESS) ON (n.risk_score)"
            ]
            
            for idx_query in indexes:
                try:
                    session.run(idx_query)
                except Exception:
                    pass  # Index already exists
            
            print("✅ Indexes created\n")
    
    def create_constraints(self):
        """Create uniqueness constraints for node IDs"""
        print("Creating constraints...")
        with self.driver.session() as session:
            constraints = [
                "CREATE CONSTRAINT ip_id_unique IF NOT EXISTS FOR (n:IP) REQUIRE n.id IS UNIQUE",
                "CREATE CONSTRAINT process_id_unique IF NOT EXISTS FOR (n:PROCESS) REQUIRE n.id IS UNIQUE"
            ]
            
            for const_query in constraints:
                try:
                    session.run(const_query)
                except Exception:
                    pass  # Constraint already exists
            
            print("✅ Constraints created\n")
    
    def create_derived_relationships(self):
        """Create additional relationships based on analysis"""
        print("Creating derived relationships...")
        with self.driver.session() as session:
            query = """
            MATCH (a)
            WHERE a.risk_score >= 9.0
            MATCH (b)
            WHERE b.risk_score >= 9.0 AND elementId(a) < elementId(b)
            MERGE (a)-[r:HIGH_RISK_CLUSTER]->(b)
            SET r.created_at = timestamp()
            RETURN count(r) as relationships_created
            """
            
            result = session.run(query)
            record = result.single()
            count = record['relationships_created'] if record else 0
            
            if count > 0:
                print(f"✅ Created {count} high-risk cluster relationships\n")
            else:
                print("ℹ️  No high-risk clusters to create\n")
    
    def build_graph(self):
        """Main function to build graph structure"""
        print("=" * 50)
        print("🏗️  BUILDING GRAPH STRUCTURE")
        print("=" * 50)
        print()
        
        self.create_indexes()
        self.create_constraints()
        self.create_derived_relationships()
        
        print("=" * 50)
        print("✅ GRAPH CONSTRUCTION COMPLETE!")
        print("=" * 50)

# Usage
if __name__ == "__main__":
    builder = None
    try:
        builder = GraphBuilder()
        builder.build_graph()
    except KeyboardInterrupt:
        print("\n⚠️  Build interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        if builder:
            builder.close()