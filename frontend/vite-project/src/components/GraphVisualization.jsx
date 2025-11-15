import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import axios from 'axios';

cytoscape.use(dagre);

const BASE_BG_COLOR = 'rgba(0, 0, 10, 0.98)';
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)';
const ACCENT_VIOLET = '#8A2BE2';
const TEXT_CYPHER = '#00FFFF';
const TEXT_WHITE = '#E2E8F0';

const DetailRow = ({ label, value, color }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(138, 43, 226, 0.2)'
  }}>
    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{label}:</span>
    <span style={{ 
      color: color || TEXT_WHITE, 
      fontWeight: '600',
      textShadow: color ? `0 0 5px ${color}40` : 'none',
      fontSize: '0.85rem'
    }}>{value}</span>
  </div>
);

const GraphVisualization = ({ height = '80vh' }) => {
  const containerRef = useRef(null);
  const cyInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [metadata, setMetadata] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching graph data...');
      const response = await axios.get('http://localhost:5000/api/auth/graph/data');

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to fetch data');
      }

      const { nodes, edges } = response.data.elements;
      const receivedMetadata = response.data.metadata;
      
      if (!nodes || nodes.length === 0) {
        throw new Error('No nodes found. Run: python neo4j/uploader.py');
      }

      console.log(`✅ Loaded ${nodes.length} nodes, ${edges.length} edges`);
      
      setGraphData({ nodes, edges });
      setMetadata(receivedMetadata);
      setStats({ 
        nodes: nodes.length, 
        edges: edges.length,
        anomalies: nodes.filter(n => n.data.is_anomaly).length,
        highRisk: nodes.filter(n => n.data.risk_score >= 7).length
      });
      setLoading(false);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!graphData || !containerRef.current) return;
  
    if (cyInstance.current) {
      cyInstance.current.destroy();
    }
  
    try {
      console.log('🎨 Initializing Cytoscape...');
      
      const cy = cytoscape({
        container: containerRef.current,
        elements: [...graphData.nodes, ...graphData.edges],
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(name)',
              'background-color': (ele) => {
                const d = ele.data();
                if (d.is_anomaly || d.is_detected_anomaly) return '#FF0055';
                if (d.has_critical_cve) return '#FF3300';
                if (d.has_high_cve) return '#FF6B00';
                if (d.risk_score >= 7.0) return '#FF8C00';
                if (d.risk_score >= 4.0) return '#FFD700';
                
                const platformColors = {
                  'aws': '#FF9900',
                  'azure': '#0078D7',
                  'gcp': '#34A853',
                  'generic': '#8A2BE2'
                };
                return platformColors[d.cloud_platform] || '#888';
              },
              'width': (ele) => {
                const d = ele.data();
                let size = 40;
                if (d.is_anomaly) size += 30;
                if (d.risk_score >= 7) size += 20;
                if (d.has_critical_cve) size += 15;
                if (d.total_degree > 5) size += 10;
                return size;
              },
              'height': (ele) => {
                const d = ele.data();
                let size = 40;
                if (d.is_anomaly) size += 30;
                if (d.risk_score >= 7) size += 20;
                if (d.has_critical_cve) size += 15;
                if (d.total_degree > 5) size += 10;
                return size;
              },
              'color': TEXT_WHITE,
              'text-outline-color': BASE_BG_COLOR,
              'text-outline-width': 2,
              'font-size': '11px',
              'font-weight': '600',
              'border-width': (ele) => {
                const d = ele.data();
                if (d.is_anomaly) return 6;
                if (d.has_critical_cve) return 5;
                if (d.risk_score >= 7) return 4;
                return 2;
              },
              'border-color': (ele) => {
                const d = ele.data();
                if (d.is_anomaly) return '#FF0055';
                if (d.has_critical_cve) return '#FF3300';
                if (d.risk_score >= 7) return '#FFD700';
                return '#00FFFF';
              },
              'border-style': (ele) => {
                return ele.data().is_anomaly ? 'double' : 'solid';
              },
              'text-valign': 'center',
              'text-halign': 'center'
            }
          },
          {
            selector: 'node[type="process"]',
            style: { 'shape': 'round-rectangle' }
          },
          {
            selector: 'node[type="ip"]',
            style: { 'shape': 'ellipse' }
          },
          {
            selector: 'node[type="service"]',
            style: { 'shape': 'diamond' }
          },
          {
            selector: 'edge',
            style: {
              'width': (ele) => Math.min((ele.data('weight') || 1) * 2, 5),
              'line-color': (ele) => {
                const source = ele.source().data();
                const target = ele.target().data();
                
                if (source.is_anomaly && target.is_anomaly) return '#FF0055';
                if (source.is_anomaly || target.is_anomaly) return '#FF6B00';
                if (source.risk_score >= 7 || target.risk_score >= 7) return '#FFD700';
                
                return '#00FFFF';
              },
              'target-arrow-color': (ele) => {
                const source = ele.source().data();
                const target = ele.target().data();
                return (source.is_anomaly || target.is_anomaly) ? '#FF0055' : '#00FFFF';
              },
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.9
            }
          },
          {
            selector: ':selected',
            style: {
              'border-width': 6,
              'border-color': '#FFD700',
              'overlay-color': '#FFD700',
              'overlay-padding': 10,
              'overlay-opacity': 0.3
            }
          }
        ],
        layout: {
          name: 'concentric',
          rankDir: 'TB',
          nodeSep: 100,
          rankSep: 150,
          padding: 50,
          animate: true,
          animationDuration: 800,
          fit: true
        }
      });

      cy.on('tap', 'node', (evt) => {
        const d = evt.target.data();
        console.log('🔍 Node clicked:', d);
        setSelectedNode(d);
      });
      
      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          setSelectedNode(null);
        }
      });
  
      cyInstance.current = cy;
      console.log('✅ Cytoscape initialized');
    } catch (err) {
      console.error('❌ Cytoscape error:', err);
      setError(err.message);
    }
  
    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }
    };
  }, [graphData]);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: height,
        background: BASE_BG_COLOR,
        borderRadius: '20px',
        border: `1px solid ${ACCENT_VIOLET}60`,
        padding: '3rem'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: `4px solid ${ACCENT_VIOLET}`,
          borderTop: `4px solid ${TEXT_CYPHER}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '2rem'
        }} />
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: TEXT_CYPHER,
          marginBottom: '1rem'
        }}>
          LOADING THREAT GRAPH
        </div>
        <button onClick={fetchData} style={{
          padding: '0.75rem 2rem',
          background: `linear-gradient(135deg, ${ACCENT_VIOLET}, ${TEXT_CYPHER})`,
          color: TEXT_WHITE,
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: '700',
          marginTop: '1rem'
        }}>
          RETRY
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: height,
        background: BASE_BG_COLOR,
        borderRadius: '20px',
        border: `2px solid #FF0055`,
        padding: '3rem'
      }}>
        <div style={{ fontSize: '3rem', color: '#FF0055', marginBottom: '1rem' }}>⚠</div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#FF0055',
          marginBottom: '1rem'
        }}>
          CONNECTION ERROR
        </div>
        <div style={{
          marginBottom: '2rem',
          maxWidth: '600px',
          textAlign: 'center',
          color: '#94a3b8',
          background: 'rgba(0,0,0,0.4)',
          padding: '1.5rem',
          borderRadius: '10px'
        }}>
          {error}
        </div>
        <div style={{
          fontSize: '0.85rem',
          color: '#64748b',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div>1. Backend running? (python app.py)</div>
          <div>2. Data uploaded? (python neo4j/uploader.py)</div>
          <div>3. Features computed? (python neo4j/feature_computer.py)</div>
        </div>
        <button onClick={fetchData} style={{
          padding: '0.75rem 2rem',
          background: `linear-gradient(135deg, ${ACCENT_VIOLET}, ${TEXT_CYPHER})`,
          color: TEXT_WHITE,
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: '700'
        }}>
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {/* Stats Panel */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        zIndex: 1000,
        background: BASE_BG_COLOR_HIGH_OPACITY,
        padding: '1.25rem',
        borderRadius: '15px',
        border: `1px solid ${ACCENT_VIOLET}60`,
        minWidth: '240px'
      }}>
        <div style={{
          fontWeight: '700',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: TEXT_CYPHER
        }}>
          NETWORK STATS
        </div>
        
        <DetailRow label="Nodes" value={stats.nodes} color={TEXT_CYPHER} />
        <DetailRow label="Edges" value={stats.edges} color={TEXT_CYPHER} />
        <DetailRow label="Anomalies" value={stats.anomalies} color={stats.anomalies > 0 ? '#FF0055' : '#00FF88'} />
        <DetailRow label="High Risk" value={stats.highRisk} color={stats.highRisk > 0 ? '#FF6B00' : undefined} />
        
        {metadata && (
          <>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${ACCENT_VIOLET}40` }}>
              <DetailRow label="Cloud" value={metadata.cloud_provider?.toUpperCase() || 'N/A'} />
              <DetailRow label="Attack" value={metadata.attack_type || 'Unknown'} 
                color={metadata.attack_type !== 'unknown' ? '#FF6B00' : undefined} />
              <DetailRow label="CVEs" value={metadata.total_cves_found || 0}
                color={metadata.total_cves_found > 0 ? '#FFD700' : undefined} />
              {metadata.gnn_accuracy && (
                <DetailRow label="GNN Accuracy" 
                  value={`${(metadata.gnn_accuracy * 100).toFixed(1)}%`} 
                  color={metadata.gnn_accuracy >= 0.9 ? '#00FF88' : '#FFD700'} />
              )}
            </div>
          </>
        )}
        
        <button onClick={fetchData} style={{
          width: '100%',
          padding: '0.6rem',
          background: `linear-gradient(135deg, ${ACCENT_VIOLET}, ${TEXT_CYPHER})`,
          color: TEXT_WHITE,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '700',
          fontSize: '0.75rem',
          marginTop: '1rem'
        }}>
          🔄 REFRESH
        </button>
      </div>

      {/* Node Details */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          zIndex: 1000,
          background: BASE_BG_COLOR_HIGH_OPACITY,
          padding: '1.5rem',
          borderRadius: '15px',
          border: `1px solid ${ACCENT_VIOLET}60`,
          maxWidth: '380px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: TEXT_CYPHER }}>
              NODE #{selectedNode.node_number || '?'}
            </div>
            <button onClick={() => setSelectedNode(null)} style={{
              background: 'transparent',
              border: 'none',
              color: '#FF0055',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}>×</button>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: TEXT_WHITE, marginBottom: '0.5rem' }}>
              {selectedNode.name}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                background: `${selectedNode.color}20`,
                border: `1px solid ${selectedNode.color}`,
                borderRadius: '5px',
                fontSize: '0.7rem',
                fontWeight: '700',
                color: selectedNode.color
              }}>
                {selectedNode.type?.toUpperCase()}
              </span>
              {selectedNode.is_anomaly && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: '#FF005520',
                  border: '1px solid #FF0055',
                  borderRadius: '5px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#FF0055'
                }}>
                  ANOMALY
                </span>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.85rem' }}>
            <DetailRow label="Risk Score" value={`${selectedNode.risk_score.toFixed(2)}/10`} 
              color={
                selectedNode.risk_score >= 9 ? '#FF0055' : 
                selectedNode.risk_score >= 7 ? '#FF6B00' : 
                selectedNode.risk_score >= 4 ? '#FFD700' : '#00FF88'
              } />
            <DetailRow label="CVE Count" value={selectedNode.cve_count} 
              color={selectedNode.cve_count > 0 ? '#FFD700' : undefined} />
            
            {selectedNode.cve_ids && selectedNode.cve_ids.length > 0 && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(255, 107, 0, 0.1)',
                border: '1px solid #FF6B00',
                borderRadius: '5px'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#FF6B00', fontWeight: '700', marginBottom: '0.5rem' }}>
                  CVEs:
                </div>
                {selectedNode.cve_ids.slice(0, 5).map((cve, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: TEXT_WHITE, marginBottom: '0.25rem' }}>
                    {cve}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${ACCENT_VIOLET}40` }}>
              <DetailRow label="Cloud" value={selectedNode.cloud_platform?.toUpperCase() || 'N/A'} />
              <DetailRow label="Category" value={selectedNode.category || 'N/A'} />
              {selectedNode.total_degree > 0 && (
                <DetailRow label="Connections" value={selectedNode.total_degree} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Graph Canvas */}
      <div ref={containerRef} style={{
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 5, 0.8)',
        border: `2px solid ${ACCENT_VIOLET}60`,
        borderRadius: '20px'
      }} />
    </div>
  );
};

export default GraphVisualization;