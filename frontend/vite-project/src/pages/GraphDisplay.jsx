import React from 'react';
import GraphVisualization from '../components/GraphVisualization.jsx';

const GraphDisplay = () => {
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>🔥 Cloud Security Graph</h1>
        <p style={styles.subtitle}>
          Real-time visualization of cloud security threats and anomalies
        </p>
      </header>

      {/* Main Graph */}
      <main style={styles.main}>
        <GraphVisualization height="calc(100vh - 250px)" />
      </main>

      {/* Legend */}
      <aside style={styles.legend}>
        <h3 style={{ marginTop: 0 }}>🎨 Legend</h3>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Node Types</div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#4ECDC4', borderRadius: '50%' }} />
            IP Address
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#FF6B6B', borderRadius: '5px' }} />
            Process
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Risk Levels</div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#e74c3c', border: '3px solid #FF0000' }} />
            High Risk (≥9)
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#f39c12' }} />
            Medium Risk
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#2ecc71' }} />
            Low Risk
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Special Indicators</div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#8A2BE2', borderStyle: 'dashed', borderWidth: '3px' }} />
            Anomaly Detected
          </div>
        </div>
      </aside>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    background: '#0a0a1a',
    padding: '20px',
    color: '#00FFFF'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '36px',
    margin: '0',
    background: 'linear-gradient(90deg, #8A2BE2, #00FFFF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginTop: '10px'
  },
  main: {
    marginBottom: '20px'
  },
  legend: {
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid #8A2BE2',
    borderRadius: '10px',
    padding: '20px',
    maxWidth: '300px',
    margin: '20px auto'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#8A2BE2',
    fontWeight: 'bold',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    margin: '8px 0',
    fontSize: '13px'
  },
  dot: {
    width: '20px',
    height: '20px',
    marginRight: '10px',
    border: '2px solid #00FFFF',
    boxSizing: 'border-box'
  }
};

export default GraphDisplay;