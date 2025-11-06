import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER || process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

let driver;

const getDriver = () => {
  if (!driver) {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  }
  return driver;
};

export const testConnection = async (req, res) => {
  try {
    await getDriver().verifyConnectivity();
    res.json({success: true, message: 'Connected to Neo4j!'});
  } catch (error) {
    res.status(500).json({success: false, error: error.message});
  }
};

export const getGraphData = async (req, res) => {
  const session = getDriver().session();

  try {
    console.log('📊 Fetching graph data...');

    const nodesResult = await session.run(`
      MATCH (n)
      WHERE n:IP OR n:PROCESS
      RETURN elementId(n) as id, 
             labels(n)[0] as label,
             n.name as name,
             n.type as type,
             n.risk_score as risk_score,
             n.anomaly_probability as anomaly_probability,
             n.is_anomaly as is_anomaly,
             n.cloud_platform as cloud_platform,
             n.category as category,
             n.last_seen as last_seen,
             n.size as size,
             n.color as color
      LIMIT 100
    `);

    const edgesResult = await session.run(`
      MATCH (a)-[r:CONNECTED_TO]->(b)
      WHERE (a:IP OR a:PROCESS) AND (b:IP OR b:PROCESS)
      RETURN elementId(a) as source, 
             elementId(b) as target,
             r.type as type,
             r.weight as weight
      LIMIT 200
    `);

    const nodes = nodesResult.records.map(r => ({
      data: {
        id: r.get('id'),
        label: r.get('label'),
        name: r.get('name') || 'Unknown',
        type: r.get('type'),
        risk_score: parseFloat(r.get('risk_score')) || 0,
        anomaly_probability: parseFloat(r.get('anomaly_probability')) || 0,
        is_anomaly: r.get('is_anomaly') || false,
        cloud_platform: r.get('cloud_platform'),
        category: r.get('category'),
        last_seen: r.get('last_seen'),
        size: parseFloat(r.get('size')) || 30,
        color: r.get('color') || '#8A2BE2'
      }
    }));

    const edges = edgesResult.records.map(r => ({
      data: {
        id: `${r.get('source')}-${r.get('target')}`,
        source: r.get('source'),
        target: r.get('target'),
        type: r.get('type'),
        weight: parseFloat(r.get('weight')) || 1
      }
    }));

    console.log(`✅ Fetched ${nodes.length} nodes, ${edges.length} edges`);

    res.json({
      success: true,
      elements: {nodes, edges},
      stats: {nodeCount: nodes.length, edgeCount: edges.length}
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({success: false, error: error.message});
  } finally {
    await session.close();
  }
};

export const getGraphStats = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (n)
      RETURN count(n) as total
    `);
    res.json({success: true, stats: {totalNodes: result.records[0].get('total').toNumber()}});
  } catch (error) {
    res.status(500).json({success: false, error: error.message});
  } finally {
    await session.close();
  }
};

export const closeDriver = async () => {
  if (driver) {
    await driver.close();
    console.log('Neo4j driver closed');
  }
};