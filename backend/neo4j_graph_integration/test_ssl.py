from neo4j import GraphDatabase

uri = "neo4j+s://your-neo4j-aura-instance.databases.neo4j.io"
user = "neo4j"
password = "YOUR_PASSWORD_HERE"

driver = GraphDatabase.driver(uri, auth=(user, password))
driver.verify_connectivity()
print("✅ Connected to Neo4j Aura securely!")
driver.close()
