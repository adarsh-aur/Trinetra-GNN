from neo4j import GraphDatabase

uri = "neo4j+s://513547c7.databases.neo4j.io"
user = "neo4j"
password = "BFBCoo7KIN34bdgIjNe32gMGNuPWJlkij7L9C9QsQkc"

driver = GraphDatabase.driver(uri, auth=(user, password))
driver.verify_connectivity()
print("✅ Connected to Neo4j Aura securely!")
driver.close()
