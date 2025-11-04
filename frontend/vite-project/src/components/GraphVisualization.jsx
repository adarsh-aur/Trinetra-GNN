import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import axios from 'axios';

cytoscape.use(dagre);

const GraphVisualization = ({ height = '80vh', apiEndpoint = '/api/graph/data' }) => {
  const cyRef = useRef(null);
  const cyInstanceRef = useRef(null);  // ✅ Store cytoscape instance
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  const fetchAndRenderGraph = useCallback(async () => {
    try {
      console.log('🎬 START: fetchAndRenderGraph called');
      setLoading(true);
      setError(null);

      console.log('📡 Fetching from:', `http://localhost:5000${apiEndpoint}`);
      const response = await axios.get(`http://localhost:5000${apiEndpoint}`);

      console.log('✅ Response received:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Backend returned success: false');
      }

      const graphData = response.data.elements;
      
      if (!graphData || !Array.isArray(graphData.nodes)) {
        throw new Error('Invalid graph data structure');
      }
      
      if (graphData.nodes.length === 0) {
        throw new Error('No nodes found. Please upload data to Neo4j.');
      }

      console.log(`📊 Received ${graphData.nodes.length} nodes and ${graphData.edges.length} edges`);

      setStats({
        nodes: graphData.nodes.length,
        edges: graphData.edges?.length || 0
      });

      if (!cyRef.current) {
        throw new Error('Cytoscape container not ready');
      }

      // ✅ Destroy existing instance before creating new one
      if (cyInstanceRef.current) {
        console.log('🗑️ Destroying previous cytoscape instance');
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
      }

      console.log('🎨 Initializing Cytoscape with', graphData.nodes.length, 'nodes');

      const cy = cytoscape({
        container: cyRef.current,
        elements: graphData,
        
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(name)',
              'color': '#00FFFF',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '10px',
              'width': 'data(size)',
              'height': 'data(size)',
              'border-width': 2,
              'border-color': '#00FFFF',
              'text-outline-width': 2,
              'text-outline-color': '#000',
              'background-color': 'data(color)'
            }
          },
          {
            selector: 'node[type = "ip"]',
            style: {
              'shape': 'ellipse',
              'background-color': '#4ECDC4'
            }
          },
          {
            selector: 'node[type = "process"]',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#FF6B6B'
            }
          },
          {
            selector: 'node[risk_score >= 9]',
            style: {
              'border-width': 4,
              'border-color': '#FF0000',
              'background-color': '#e74c3c'
            }
          },
          {
            selector: 'node[is_anomaly = true]',
            style: {
              'border-style': 'dashed',
              'border-width': 3
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#00FFFF',
              'target-arrow-color': '#00FFFF',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.6
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 5,
              'border-color': '#FFD700'
            }
          }
        ],
        
        layout: {
          name: 'cose',
          fit: true,
          padding: 50,
          animate: true,
          animationDuration: 500
        }
      });

      // ✅ Store instance for cleanup
      cyInstanceRef.current = cy;

      cy.ready(() => {
        console.log('✅ Cytoscape ready with', cy.nodes().length, 'nodes &', cy.edges().length, 'edges');
        cy.fit();
      });

      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        const data = node.data();
        
        alert(`
🔍 Node Details:
━━━━━━━━━━━━━━━━━━━━━━
Name: ${data.name}
Type: ${data.type?.toUpperCase() || 'N/A'}
Category: ${data.category}
━━━━━━━━━━━━━━━━━━━━━━
Risk Score: ${data.risk_score}/10
Anomaly Prob: ${(data.anomaly_probability * 100).toFixed(1)}%
Is Anomaly: ${data.is_anomaly ? 'YES ⚠️' : 'NO'}
━━━━━━━━━━━━━━━━━━━━━━
Cloud: ${data.cloud_platform}
Last Seen: ${data.last_seen}
        `.trim());
      });

      setLoading(false);
      console.log('✅ Graph rendered successfully');
      
    } catch (err) {
      console.error('❌ ERROR in fetchAndRenderGraph:', err);
      setError(err.response?.data?.error || err.message || String(err));
      setLoading(false);
    }
  }, [apiEndpoint]);

  // ✅ Fetch data when component mounts
  useEffect(() => {
  if (!cyRef.current) return;
  fetchAndRenderGraph();
  return () => {
    if (cyInstanceRef.current) cyInstanceRef.current.destroy();
  };
}, [fetchAndRenderGraph]);

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '50px',
        color: '#00FFFF',
        background: '#0a0a1a',
        borderRadius: '10px',
        minHeight: height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '20px', marginBottom: '20px' }}>🔄 Loading graph...</div>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
          Fetching data from Neo4j
        </div>
        
        {/* ✅ FIXED: Call the function, don't pass the component */}
        <button
          onClick={fetchAndRenderGraph}
          style={{
            padding: '10px 18px',
            background: '#8A2BE2',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          ▶️ Retry Loading
        </button>

        <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
          If the graph doesn't load automatically, click "Retry Loading"
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '50px',
        color: '#FF6B6B',
        background: '#0a0a1a',
        borderRadius: '10px',
        border: '2px solid #FF6B6B',
        minHeight: height
      }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>❌ Error</div>
        <div style={{ fontSize: '16px', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
        
        <button 
          onClick={fetchAndRenderGraph}
          style={{
            padding: '10px 20px',
            background: '#8A2BE2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}
        >
          🔄 Retry
        </button>
        
        <div style={{ fontSize: '12px', color: '#888' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Make sure:</div>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>Backend server is running: <code>cd server && npm run dev</code></li>
            <li>Upload data: <code>cd backend && python neo4j_graph_integration/uploader.py</code></li>
            <li>
              Test backend: 
              <a 
                href="http://localhost:5000/api/graph/test" 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: '#00FFFF', marginLeft: '5px' }}
              >
                Click here
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // ✅ SUCCESS STATE - SHOW GRAPH
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {/* Stats Panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '8px',
        color: '#00FFFF',
        fontSize: '12px',
        minWidth: '150px',
        border: '1px solid #8A2BE2'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>📊 Graph Stats</div>
        <div>Nodes: {stats.nodes}</div>
        <div>Edges: {stats.edges}</div>
        
        <button 
          onClick={fetchAndRenderGraph}
          style={{
            marginTop: '15px',
            padding: '8px 12px',
            background: '#8A2BE2',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%',
            fontWeight: 'bold'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Cytoscape Container */}
      <div 
        ref={cyRef} 
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          border: '4px solid #8A2BE2',
          borderRadius: '10px'
        }} 
      />
    </div>
  );
};

export default GraphVisualization;