import React, { useState, useEffect } from 'react';
import { AlertCircle, Shield, Activity, Zap, TrendingUp, Network } from 'lucide-react';
import { useNavigate } from "react-router-dom";


const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
    color: 'white',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  maxWidth: {
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    background: 'linear-gradient(to right, #22d3ee, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px'
  },
  statsHeader: {
    display: 'flex',
    gap: '16px',
    marginTop: '16px'
  },
  statCard: {
    background: '#1e293b',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #334155'
  },
  statLabel: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#22d3ee'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px'
  },
  gridLg: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '24px'
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #334155',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#cbd5e1'
  },
  select: {
    width: '100%',
    background: '#334155',
    border: '1px solid #475569',
    borderRadius: '8px',
    padding: '10px 16px',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer'
  },
  button: {
    width: '100%',
    background: 'linear-gradient(to right, #06b6d4, #2563eb)',
    color: 'white',
    fontWeight: '600',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  buttonDisabled: {
    background: 'linear-gradient(to right, #475569, #64748b)',
    cursor: 'not-allowed'
  },
  resultCard: {
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid'
  },
  threatHigh: {
    background: '#fee2e2',
    borderColor: '#ef4444'
  },
  threatLow: {
    background: '#dcfce7',
    borderColor: '#22c55e'
  },
  progressBar: {
    width: '100%',
    background: '#e2e8f0',
    borderRadius: '9999px',
    height: '8px',
    overflow: 'hidden',
    marginTop: '8px'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.5s ease'
  },
  graphContainer: {
    background: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
    height: '600px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  suspiciousNode: {
    background: '#334155',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #475569',
    marginBottom: '8px'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid white',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

const GNNDemo = () => {
  const [graphData, setGraphData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  const [selectedTraffic, setSelectedTraffic] = useState('normal');
  const [selectedAttack, setSelectedAttack] = useState('ddos');


  const API_URL = 'http://localhost:5001';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateTraffic = async () => {
    setLoading(true);
    setAnalysis(null);
    
    try {
      const response = await fetch(`${API_URL}/api/generate-traffic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedTraffic,
          attack_type: selectedAttack
        })
      });
      
      const data = await response.json();
      setGraphData(data);
      
      setTimeout(() => analyzeTraffic(data), 500);
    } catch (error) {
      console.error('Error generating traffic:', error);
      alert('Error: Make sure backend is running on port 5001');
    } finally {
      setLoading(false);
    }
  };

  const analyzeTraffic = async (data = graphData) => {
    if (!data) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing traffic:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatColor = (probability) => {
    if (probability > 0.8) return '#dc2626';
    if (probability > 0.5) return '#f97316';
    return '#22c55e';
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        select:hover { background: #475569; }
        button:hover:not(:disabled) { 
          transform: translateY(-2px);
          boxShadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* ..........................back to dashboard navigation...................... */}
      <button
          onClick={() => navigate("/dashboard")}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            background: "#ef4444",
            color: "white",
            transition: "all 0.2s",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#dc2626")}
          onMouseLeave={(e) => (e.target.style.background = "#ef4444")}
        >
          Return to Dashboard
      </button>
      {/* .......................................................................... */}

      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Network size={40} color="#22d3ee" />
            <div>
              <h1 style={styles.title}>GNN Threat Detection System</h1>
              <p style={styles.subtitle}>Graph Neural Networks for Cybersecurity</p>
            </div>
          </div>
          
          {stats && (
            <div style={styles.statsHeader}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Model Accuracy</div>
                <div style={styles.statValue}>{(stats.model_accuracy * 100).toFixed(1)}%</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Parameters</div>
                <div style={{...styles.statValue, color: '#3b82f6'}}>{(stats.total_parameters / 1000).toFixed(1)}K</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div style={window.innerWidth > 1024 ? styles.gridLg : styles.grid}>
          {/* Control Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <Zap size={20} color="#facc15" />
                Traffic Generator
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={styles.label}>Traffic Type</label>
                  <select
                    style={styles.select}
                    value={selectedTraffic}
                    onChange={(e) => setSelectedTraffic(e.target.value)}
                  >
                    <option value="normal">Normal Traffic</option>
                    <option value="attack">Attack Traffic</option>
                  </select>
                </div>

                {selectedTraffic === 'attack' && (
                  <div>
                    <label style={styles.label}>Attack Type</label>
                    <select
                      style={styles.select}
                      value={selectedAttack}
                      onChange={(e) => setSelectedAttack(e.target.value)}
                    >
                      <option value="ddos">DDoS Attack</option>
                      <option value="port_scan">Port Scan</option>
                      <option value="data_exfiltration">Data Exfiltration</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={generateTraffic}
                  disabled={loading}
                  style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}
                >
                  {loading ? (
                    <>
                      <div style={styles.spinner} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Activity size={20} />
                      Generate & Analyze
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div style={{
                ...styles.resultCard,
                ...(analysis.threat_probability > 0.5 ? styles.threatHigh : styles.threatLow)
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: getThreatColor(analysis.threat_probability)
                }}>
                  {analysis.threat_probability > 0.5 ? <AlertCircle size={24} /> : <Shield size={24} />}
                  {analysis.prediction}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Threat Probability</span>
                      <span style={{ fontWeight: 'bold', color: getThreatColor(analysis.threat_probability) }}>
                        {(analysis.threat_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${analysis.threat_probability * 100}%`,
                        background: getThreatColor(analysis.threat_probability)
                      }} />
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Confidence</span>
                      <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
                        {(analysis.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${analysis.confidence * 100}%`,
                        background: '#2563eb'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Nodes</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{analysis.total_nodes}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Edges</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{analysis.total_edges}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Suspicious Nodes */}
            {analysis && analysis.suspicious_nodes && analysis.suspicious_nodes.length > 0 && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <TrendingUp size={20} color="#fb923c" />
                  Suspicious Nodes
                </h2>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {analysis.suspicious_nodes.map((node, idx) => (
                    <div key={idx} style={styles.suspiciousNode}>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Node {node.node_id}</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'white', wordBreak: 'break-all', marginTop: '4px' }}>
                        {node.label}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Activation</span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fb923c' }}>
                          {node.activation.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Graph Visualization */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <Network size={20} color="#22d3ee" />
              Network Graph Visualization
            </h2>

            <div style={styles.graphContainer}>
              {graphData ? (
                <GraphVisualization graphData={graphData} analysis={analysis} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Network size={64} color="#475569" style={{ margin: '0 auto 16px' }} />
                  <p style={{ color: '#94a3b8' }}>Generate traffic to visualize network graph</p>
                </div>
              )}
            </div>

            {graphData && (
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: '#334155', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Graph Type</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22d3ee' }}>
                    {graphData.attack_type}
                  </div>
                </div>
                <div style={{ background: '#334155', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Nodes</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {graphData.nodes.length}
                  </div>
                </div>
                <div style={{ background: '#334155', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Connections</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7' }}>
                    {graphData.edges.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const GraphVisualization = ({ graphData, analysis }) => {
  const containerRef = React.useRef(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width || 800, height: height || 600 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [graphData]);

  if (!graphData) return null;

  const { width, height } = dimensions;
  const nodes = graphData.nodes;
  const edges = graphData.edges;
  const suspiciousIds = analysis?.suspicious_nodes?.map(n => n.node_id) || [];

  // Circular layout
  const nodePositions = nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    const radius = Math.min(width, height) * 0.35;
    return {
      id: node.id,
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
      label: node.label
    };
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg style={{ width: '100%', height: '100%' }}>
        {/* Edges */}
        <g>
          {edges.map((edge, i) => {
            const source = nodePositions.find(n => n.id === edge.source);
            const target = nodePositions.find(n => n.id === edge.target);
            if (!source || !target) return null;

            return (
              <line
                key={`edge-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#475569"
                strokeWidth="2"
                opacity="0.6"
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodePositions.map((node, i) => {
            const isSuspicious = suspiciousIds.includes(node.id);
            const isVictim = node.label.includes('[VICTIM]');
            const isAttacker = node.label.includes('[ATTACKER]') || node.label.includes('[SCANNER]') || 
                             node.label.includes('[C2 SERVER]') || node.label.includes('[COMPROMISED]');

            let nodeColor = '#3b82f6';
            let nodeSize = 8;

            if (isVictim) { nodeColor = '#ef4444'; nodeSize = 16; }
            else if (isAttacker) { nodeColor = '#f97316'; nodeSize = 12; }
            else if (isSuspicious) { nodeColor = '#eab308'; nodeSize = 10; }

            return (
              <g key={`node-${i}`}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeSize}
                  fill={nodeColor}
                  stroke="#fff"
                  strokeWidth="2"
                  opacity="0.9"
                />
                {(isVictim || isAttacker || isSuspicious) && (
                  <text
                    x={node.x}
                    y={node.y + nodeSize + 15}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {node.label.split(' ')[0].substring(0, 15)}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect width="180" height="120" fill="#1e293b" opacity="0.9" rx="8" />
          <text x="10" y="20" fill="#fff" fontSize="12" fontWeight="bold">Legend</text>
          
          <circle cx="20" cy="40" r="6" fill="#3b82f6" />
          <text x="35" y="45" fill="#94a3b8" fontSize="11">Normal Node</text>
          
          <circle cx="20" cy="60" r="6" fill="#eab308" />
          <text x="35" y="65" fill="#94a3b8" fontSize="11">Suspicious</text>
          
          <circle cx="20" cy="80" r="8" fill="#f97316" />
          <text x="35" y="85" fill="#94a3b8" fontSize="11">Attacker</text>
          
          <circle cx="20" cy="100" r="8" fill="#ef4444" />
          <text x="35" y="105" fill="#94a3b8" fontSize="11">Victim</text>
        </g>
      </svg>
    </div>
  );
};

export default GNNDemo;