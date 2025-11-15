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
    console.log('📊 Fetching graph data from Neo4j...');

    // Fetch nodes with ALL required properties
    const nodesResult = await session.run(`
      MATCH (n)
      WHERE n:IP OR n:PROCESS OR n:SERVICE
      RETURN elementId(n) as id, 
             labels(n)[0] as label,
             n.id as original_id,
             n.name as name,
             n.node_number as node_number,
             n.type as type,
             n.description as description,
             n.risk_score as risk_score,
             n.cve_risk as cve_risk,
             n.behavioral_risk as behavioral_risk,
             n.cve_count as cve_count,
             n.cve_ids as cve_ids,
             n.has_critical_cve as has_critical_cve,
             n.has_high_cve as has_high_cve,
             n.anomaly_probability as anomaly_probability,
             n.is_anomaly as is_anomaly,
             n.is_detected_anomaly as is_detected_anomaly,
             n.is_confirmed_anomaly as is_confirmed_anomaly,
             n.anomaly_confidence as anomaly_confidence,
             n.anomaly_threat_type as anomaly_threat_type,
             n.anomaly_reason as anomaly_reason,
             n.anomaly_severity as anomaly_severity,
             n.cloud_platform as cloud_platform,
             n.category as category,
             n.last_seen as last_seen,
             n.size as size,
             n.color as color,
             n.total_degree as total_degree,
             n.betweenness_score as betweenness_score,
             n.clustering_coeff as clustering_coeff,
             n.neighbor_risk_density as neighbor_risk_density
      ORDER BY n.node_number
      LIMIT 500
    `);

    // Fetch relationships
    const edgesResult = await session.run(`
      MATCH (a)-[r:CONNECTED_TO]->(b)
      WHERE (a:IP OR a:PROCESS OR a:SERVICE) AND (b:IP OR b:PROCESS OR b:SERVICE)
      RETURN elementId(a) as source, 
             elementId(b) as target,
             r.type as type,
             r.weight as weight,
             r.count as count
      LIMIT 1000
    `);

    // Fetch metadata
    const metadataResult = await session.run(`
      MATCH (m:METADATA {id: 'analysis_metadata'})
      RETURN m.cloud_provider as cloud_provider,
             m.cloud_confidence as cloud_confidence,
             m.attack_type as attack_type,
             m.attack_confidence as attack_confidence,
             m.total_nodes as total_nodes,
             m.total_relationships as total_relationships,
             m.anomalies_detected as anomalies_detected,
             m.anomalies_confirmed as anomalies_confirmed,
             m.total_cves_found as total_cves_found,
             m.gnn_accuracy as gnn_accuracy
      LIMIT 1
    `);

    // Process nodes
    const nodes = nodesResult.records.map(r => ({
      data: {
        id: r.get('id'),
        original_id: r.get('original_id'),
        label: r.get('label'),
        name: r.get('name') || r.get('original_id') || 'Unknown',
        node_number: r.get('node_number') ? parseInt(r.get('node_number').toString()) : 0,
        type: r.get('type'),
        description: r.get('description'),
        
        // Risk scores
        risk_score: r.get('risk_score') ? parseFloat(r.get('risk_score').toString()) : 0,
        cve_risk: r.get('cve_risk') ? parseFloat(r.get('cve_risk').toString()) : 0,
        behavioral_risk: r.get('behavioral_risk') ? parseFloat(r.get('behavioral_risk').toString()) : 0,
        
        // CVE info
        cve_count: r.get('cve_count') ? parseInt(r.get('cve_count').toString()) : 0,
        cve_ids: r.get('cve_ids') || [],
        has_critical_cve: r.get('has_critical_cve') || false,
        has_high_cve: r.get('has_high_cve') || false,
        
        // Anomaly detection
        anomaly_probability: r.get('anomaly_probability') ? parseFloat(r.get('anomaly_probability').toString()) : 0,
        is_anomaly: r.get('is_anomaly') || false,
        is_detected_anomaly: r.get('is_detected_anomaly') || false,
        is_confirmed_anomaly: r.get('is_confirmed_anomaly') || false,
        anomaly_confidence: r.get('anomaly_confidence') || 'none',
        anomaly_threat_type: r.get('anomaly_threat_type') || 'none',
        anomaly_reason: r.get('anomaly_reason') || 'N/A',
        anomaly_severity: r.get('anomaly_severity') || 'none',
        
        // Infrastructure
        cloud_platform: r.get('cloud_platform'),
        category: r.get('category'),
        last_seen: r.get('last_seen'),
        
        // Visualization
        size: r.get('size') ? parseFloat(r.get('size').toString()) : 30,
        color: r.get('color') || '#8A2BE2',
        
        // Graph metrics (computed by feature_computer)
        total_degree: r.get('total_degree') ? parseInt(r.get('total_degree').toString()) : 0,
        betweenness_score: r.get('betweenness_score') ? parseFloat(r.get('betweenness_score').toString()) : 0,
        clustering_coeff: r.get('clustering_coeff') ? parseFloat(r.get('clustering_coeff').toString()) : 0,
        neighbor_risk_density: r.get('neighbor_risk_density') ? parseFloat(r.get('neighbor_risk_density').toString()) : 0
      }
    }));

    // Process edges
    const edges = edgesResult.records.map(r => ({
      data: {
        id: `${r.get('source')}-${r.get('target')}`,
        source: r.get('source'),
        target: r.get('target'),
        type: r.get('type') || 'CONNECTION',
        weight: r.get('weight') ? parseFloat(r.get('weight').toString()) : 1,
        count: r.get('count') ? parseInt(r.get('count').toString()) : 1
      }
    }));

    // Process metadata
    let metadata = null;
    if (metadataResult.records.length > 0) {
      const m = metadataResult.records[0];
      metadata = {
        cloud_provider: m.get('cloud_provider'),
        cloud_confidence: m.get('cloud_confidence') ? parseInt(m.get('cloud_confidence').toString()) : 0,
        attack_type: m.get('attack_type'),
        attack_confidence: m.get('attack_confidence') ? parseFloat(m.get('attack_confidence').toString()) : 0,
        total_nodes: m.get('total_nodes') ? parseInt(m.get('total_nodes').toString()) : 0,
        total_relationships: m.get('total_relationships') ? parseInt(m.get('total_relationships').toString()) : 0,
        anomalies_detected: m.get('anomalies_detected') ? parseInt(m.get('anomalies_detected').toString()) : 0,
        anomalies_confirmed: m.get('anomalies_confirmed') ? parseInt(m.get('anomalies_confirmed').toString()) : 0,
        total_cves_found: m.get('total_cves_found') ? parseInt(m.get('total_cves_found').toString()) : 0,
        gnn_accuracy: m.get('gnn_accuracy') ? parseFloat(m.get('gnn_accuracy').toString()) : 0
      };
    }

    console.log(`✅ Fetched ${nodes.length} nodes, ${edges.length} edges`);

    res.json({
      success: true,
      elements: {nodes, edges},
      metadata: metadata,
      stats: {
        nodeCount: nodes.length, 
        edgeCount: edges.length,
        anomalyCount: nodes.filter(n => n.data.is_anomaly).length,
        highRiskCount: nodes.filter(n => n.data.risk_score >= 7).length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching graph data:', error);
    res.status(500).json({
      success: false, 
      error: error.message,
      details: 'Make sure data has been uploaded using: python neo4j/uploader.py'
    });
  } finally {
    await session.close();
  }
};

export const getGraphStats = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (n)
      RETURN count(n) as total,
             sum(CASE WHEN n.is_anomaly = true THEN 1 ELSE 0 END) as anomalies,
             sum(CASE WHEN n.risk_score >= 7.0 THEN 1 ELSE 0 END) as high_risk
    `);
    
    const record = result.records[0];
    res.json({
      success: true, 
      stats: {
        totalNodes: record.get('total').toNumber(),
        anomalies: record.get('anomalies').toNumber(),
        highRisk: record.get('high_risk').toNumber()
      }
    });
  } catch (error) {
    res.status(500).json({success: false, error: error.message});
  } finally {
    await session.close();
  }
};

export const getMetadata = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (m:METADATA {id: 'analysis_metadata'})
      RETURN m
      LIMIT 1
    `);

    if (result.records.length === 0) {
      return res.json({
        success: false,
        message: 'No metadata found. Run analysis first.'
      });
    }

    const metadata = result.records[0].get('m').properties;
    res.json({success: true, metadata});
  } catch (error) {
    res.status(500).json({success: false, error: error.message});
  } finally {
    await session.close();
  }
};

export const closeDriver = async () => {
  if (driver) {
    await driver.close();
    console.log('🔌 Neo4j driver closed');
  }
};