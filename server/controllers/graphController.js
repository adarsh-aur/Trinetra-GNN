import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

// Neo4j connection
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER || process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

let driver;

// Initialize driver
const getDriver = () => {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
  }
  return driver;
};

// Test connection
export const testConnection = async (req, res) => {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    res.json({ 
      success: true, 
      message: 'Connected to Neo4j successfully!' 
    });
  } catch (error) {
    console.error('Neo4j connection error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get graph data
export const getGraphData = async (req, res) => {
  const driver = getDriver();
  const session = driver.session();

  try {
    console.log('📊 Fetching graph data from Neo4j...');

    const testResult = await session.run('MATCH (n) RETURN count(n) as total');
    const totalNodes = testResult.records[0].get('total').toNumber();
    console.log(`   Total nodes in database: ${totalNodes}`);

    // Fetch nodes
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
             n.color as color,
             n.categorization_reasoning as reasoning
      LIMIT 100
    `);

    // Fetch edges
    const edgesResult = await session.run(`
      MATCH (a)-[r:CONNECTED_TO]->(b)
      WHERE (a:IP OR a:PROCESS) AND (b:IP OR b:PROCESS)
      RETURN elementId(a) as source, 
             elementId(b) as target,
             r.type as type,
             r.weight as weight,
             r.count as count
      LIMIT 200
    `);

    // Format nodes
    const nodes = nodesResult.records.map(record => ({  
      data: {
        id: record.get('id').toString(),
        label: record.get('label'),
        name: record.get('name') || 'Unknown',
        type: record.get('type'),
        risk_score: parseFloat(record.get('risk_score')) || 0,
        anomaly_probability: parseFloat(record.get('anomaly_probability')) || 0,
        is_anomaly: record.get('is_anomaly') || false,
        cloud_platform: record.get('cloud_platform'),
        category: record.get('category'),
        last_seen: record.get('last_seen'),
        size: parseFloat(record.get('size')) || 30,
        color: record.get('color') || '#8A2BE2',
        reasoning: record.get('reasoning')
      }
    }));

    // Format edges
    const edges = edgesResult.records.map(record => ({
      data: {
        id: `${record.get('source')}-${record.get('target')}`,
        source: record.get('source'),
        target: record.get('target'),
        type: record.get('type'),
        weight: parseFloat(record.get('weight')) || 1,
        count: parseInt(record.get('count')) || 1
      }
    }));

    console.log(`✅ Fetched ${nodes.length} nodes and ${edges.length} edges`);

    res.json({
      success: true,
      elements: {
        nodes,
        edges
      },
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching graph data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    await session.close();
  }
};

// Get stats
export const getGraphStats = async (req, res) => {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (n)
      OPTIONAL MATCH (m:Metadata {id: 'analysis_metadata'})
      RETURN 
        count(DISTINCT n) as total_nodes,
        count(DISTINCT CASE WHEN n.risk_score >= 9 THEN n END) as high_risk_nodes,
        count(DISTINCT CASE WHEN n.is_anomaly = true THEN n END) as anomaly_nodes,
        m.gnn_accuracy as gnn_accuracy,
        m.avg_risk_score as avg_risk_score
    `);

    const record = result.records[0];
    
    res.json({
      success: true,
      stats: {
        totalNodes: record.get('total_nodes').toNumber(),
        highRiskNodes: record.get('high_risk_nodes').toNumber(),
        anomalyNodes: record.get('anomaly_nodes').toNumber(),
        gnnAccuracy: parseFloat(record.get('gnn_accuracy')) || 0,
        avgRiskScore: parseFloat(record.get('avg_risk_score')) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    await session.close();
  }
};

// Close driver on shutdown
export const closeDriver = async () => {
  if (driver) {
    await driver.close();
    console.log('Neo4j driver closed');
  }
};