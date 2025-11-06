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
    <span style={{ color: '#94a3b8' }}>{label}:</span>
    <span style={{ 
      color: color || TEXT_WHITE, 
      fontWeight: '600',
      textShadow: color ? `0 0 5px ${color}40` : 'none'
    }}>{value}</span>
  </div>
);

const GraphVisualization = ({ height = '80vh' }) => {
  const containerRef = useRef(null);
  const cyInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:5000/api/auth/graph/data');

      if (!response.data?.success || !response.data?.elements) {
        throw new Error('Invalid response');
      }

      const { nodes, edges } = response.data.elements;
      if (!nodes || nodes.length === 0) {
        throw new Error('No nodes found. Upload data to Neo4j first.');
      }

      setGraphData({ nodes, edges });
      setStats({ nodes: nodes.length, edges: edges.length });
      setLoading(false);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!graphData || !containerRef.current) return;
  
    if (cyInstance.current) {
      cyInstance.current.destroy();
    }
  
    try {
      const cy = cytoscape({
        container: containerRef.current,
        elements: graphData,
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(name)',
              'background-color': (ele) => {
                switch (ele.data('cloud_platform')) {
                  case 'aws': return '#FF9900';
                  case 'azure': return '#0078D7';
                  case 'gcp': return '#34A853';
                  case 'on-premise': return '#6B7280';
                  case 'generic': return '#8A2BE2';
                  case 'alibaba': return '#FF6A00';
                  case 'ibm': return '#054ADA';
                  case 'oracle': return '#F80000';
                  default: return '#888';
                }
              },
              'width': 100,
              'height': 100,
              'color': TEXT_WHITE,
              'text-outline-color': BASE_BG_COLOR,
              'text-outline-width': 2,
              'font-size': '13px',
              'font-weight': '500',
              'border-width': 3,
              'border-color': '#FFD700',
              'text-valign': 'center',
              'text-halign': 'center'
            }
          },
          {
            selector: 'node[type="process"]',
            style: {
              'shape': 'round-rectangle'
            }
          },
          {
            selector: 'node[risk_score >= 9]',
            style: {
              'border-width': 5,
              'border-color': '#FF0055',
              'background-color': '#FF0055',
              'border-style': 'double'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2.5,
              'line-color': '#FFFF33',
              'target-arrow-color': TEXT_CYPHER,
              'target-arrow-shape': 'triangle',
              'curve-style': 'straight', // ensures straight lines
              'opacity': 1
            }
          }
        ],
        layout: {
          name: 'dagre',          // linear layout engine
          rankDir: 'LR',          // left-to-right
          nodeSep: 120,           // horizontal spacing
          rankSep: 150,           // vertical spacing between layers
          edgeSep: 80,
          fit: true,
          padding: 50,
          animate: true
        }
      });
  
      // Add click handler for node info
      cy.on('tap', 'node', (evt) => {
        const d = evt.target.data();
        setSelectedNode(d);
      });
  
      cyInstance.current = cy;
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
        padding: '3rem',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: `4px solid ${ACCENT_VIOLET}`,
          borderTop: `4px solid ${TEXT_CYPHER}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '2rem',
          boxShadow: `0 0 30px ${ACCENT_VIOLET}60`
        }} />
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: TEXT_CYPHER,
          marginBottom: '1rem',
          letterSpacing: '0.1em',
          textShadow: `0 0 10px ${TEXT_CYPHER}60`
        }}>
          INITIALIZING THREAT GRAPH
        </div>
        <div style={{
          fontSize: '0.9rem',
          color: '#94a3b8',
          marginBottom: '2rem'
        }}>
          Fetching data from Neo4j database...
        </div>
        <button onClick={fetchData} style={{
          padding: '0.75rem 2rem',
          background: `linear-gradient(135deg, ${ACCENT_VIOLET}, ${TEXT_CYPHER})`,
          color: TEXT_WHITE,
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: '700',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'all 0.3s ease',
          boxShadow: `0 5px 20px ${ACCENT_VIOLET}60`
        }}>
          RETRY CONNECTION
        </button>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
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
        padding: '3rem',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          fontSize: '3rem',
          color: '#FF0055',
          marginBottom: '1rem'
        }}>⚠</div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#FF0055',
          marginBottom: '1rem',
          textShadow: `0 0 10px #FF005560`
        }}>
          CONNECTION ERROR
        </div>
        <div style={{
          marginBottom: '2rem',
          maxWidth: '500px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.95rem',
          lineHeight: '1.6'
        }}>
          {error}
        </div>
        <button onClick={fetchData} style={{
          padding: '0.75rem 2rem',
          background: `linear-gradient(135deg, ${ACCENT_VIOLET}, ${TEXT_CYPHER})`,
          color: TEXT_WHITE,
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: '700',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'all 0.3s ease',
          boxShadow: `0 5px 20px ${ACCENT_VIOLET}60`,
          marginBottom: '2rem'
        }}>
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        zIndex: 1000,
        background: BASE_BG_COLOR_HIGH_OPACITY,
        backdropFilter: 'blur(20px)',
        padding: '1.25rem',
        borderRadius: '15px',
        border: `1px solid ${ACCENT_VIOLET}60`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.6), 0 0 20px ${ACCENT_VIOLET}20`,
        minWidth: '200px'
      }}>
        <div style={{
          fontWeight: '700',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: TEXT_CYPHER,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          textShadow: `0 0 10px ${TEXT_CYPHER}40`
        }}>
          NETWORK STATS
        </div>
        <div style={{
          marginTop: '0.5rem',
          paddingTop: '0.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.9rem'
          }}>
            <span style={{ color: '#94a3b8' }}>Nodes:</span>
            <span style={{ color: TEXT_CYPHER, fontWeight: '700' }}>{stats.nodes}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.9rem'
          }}>
            <span style={{ color: '#94a3b8' }}>Edges:</span>
            <span style={{ color: TEXT_CYPHER, fontWeight: '700' }}>{stats.edges}</span>
          </div>
        </div>
        <button onClick={fetchData} style={{
          width: '100%',
          padding: '0.6rem',
          background: `linear-gradient(135deg, ${ACCENT_VIOLET}, ${TEXT_CYPHER})`,
          color: TEXT_WHITE,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '700',
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'all 0.3s ease',
          marginTop: '1rem'
        }}>
          REFRESH
        </button>
      </div>

      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          zIndex: 1000,
          background: BASE_BG_COLOR_HIGH_OPACITY,
          backdropFilter: 'blur(20px)',
          padding: '1.5rem',
          borderRadius: '15px',
          border: `1px solid ${ACCENT_VIOLET}60`,
          boxShadow: `0 10px 30px rgba(0,0,0,0.6), 0 0 20px ${ACCENT_VIOLET}20`,
          maxWidth: '350px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: TEXT_CYPHER
            }}>
              NODE DETAILS
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
            marginBottom: '1rem',
            border: `1px solid ${ACCENT_VIOLET}40`
          }}>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: '700',
              color: TEXT_WHITE,
              marginBottom: '0.5rem',
              wordBreak: 'break-word'
            }}>
              {selectedNode.name}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: `${selectedNode.color}20`,
              border: `1px solid ${selectedNode.color}`,
              borderRadius: '5px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: selectedNode.color,
              textTransform: 'uppercase'
            }}>
              {selectedNode.type}
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', lineHeight: '1.8' }}>
            <DetailRow label="Risk Score" value={`${selectedNode.risk_score}/10`} 
              color={selectedNode.risk_score >= 9 ? '#FF0055' : selectedNode.risk_score >= 7 ? '#FF6B00' : selectedNode.risk_score >= 4 ? '#FFD700' : '#00FF88'} />
            <DetailRow label="Anomaly" value={selectedNode.is_anomaly ? 'DETECTED' : 'NORMAL'} 
              color={selectedNode.is_anomaly ? '#FF0055' : '#00FF88'} />
            <DetailRow label="Cloud Platform" value={selectedNode.cloud_platform || 'N/A'} />
            <DetailRow label="Category" value={selectedNode.category || 'N/A'} />
            {selectedNode.port && <DetailRow label="Port" value={selectedNode.port} />}
            {selectedNode.protocol && <DetailRow label="Protocol" value={selectedNode.protocol} />}
            {selectedNode.cpu_usage && <DetailRow label="CPU Usage" value={`${selectedNode.cpu_usage}%`} />}
            {selectedNode.memory_usage && <DetailRow label="Memory Usage" value={`${selectedNode.memory_usage}%`} />}
            {selectedNode.network_traffic && <DetailRow label="Network Traffic" value={selectedNode.network_traffic} />}
          </div>
        </div>
      )}

      <div ref={containerRef} style={{
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 5, 0.8)',
        border: `2px solid ${ACCENT_VIOLET}60`,
        borderRadius: '20px',
        boxShadow: `inset 0 0 50px rgba(0,0,0,0.8), 0 0 30px ${ACCENT_VIOLET}20`
      }} />
    </div>
  );
};

export default GraphVisualization;
