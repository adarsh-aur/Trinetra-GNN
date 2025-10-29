import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Shield, Activity, Zap, TrendingUp, Network } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import * as THREE from 'three';

// COLOR CONSTANTS (Matching Landing.jsx)
const BASE_BG_COLOR = 'rgba(0, 0, 10, 0.98)';
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)';
const ACCENT_VIOLET = '#8A2BE2';
const TEXT_CYPHER = '#00FFFF';
const SHADOW_CYAN = '0 0 50px rgba(0, 255, 255, 0.9)';
const BORDER_CYPHER = '2px solid #00FFFF';
const TEXT_WHITE = '#E2E8F0';

const GNNDemo = () => {
  const [graphData, setGraphData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  const [selectedTraffic, setSelectedTraffic] = useState('normal');
  const [selectedAttack, setSelectedAttack] = useState('ddos');
  const mountRef = useRef(null);
  const animationFrameRef = useRef();

  const API_URL = 'http://localhost:5001';

  // Three.js Background Setup
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.003);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x8A2BE2, 0.3);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0x00FFFF, 2, 100);
    pointLight1.position.set(100, 100, 100);
    scene.add(pointLight1);

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000 * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 80 + Math.random() * 40;
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ size: 0.8, color: 0xFFFFFF, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Particles
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(400 * 3);
    for (let i = 0; i < 400 * 3; i += 3) {
      const radius = 30 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i + 2] = radius * Math.cos(phi);
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({ size: 2, color: 0x8A2BE2, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.003;
      
      stars.rotation.x += 0.0003;
      stars.rotation.y += 0.0005;
      particles.rotation.y += 0.003;
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, []);

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
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#000000' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Three.js Background */}
      <div 
        ref={mountRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          background: 'linear-gradient(135deg, #000005 0%, #150520 50%, #000005 100%)'
        }}
      />

      {/* Gradient Overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 10, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        
        {/* Back to Dashboard Button */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 24px",
            borderRadius: "12px",
            border: BORDER_CYPHER,
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            background: BASE_BG_COLOR_HIGH_OPACITY,
            color: TEXT_CYPHER,
            transition: "all 0.3s",
            backdropFilter: "blur(15px)",
            boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
            zIndex: 100
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(0, 255, 255, 0.1)";
            e.target.style.boxShadow = "0 0 40px rgba(0, 255, 255, 0.6)";
            e.target.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = BASE_BG_COLOR_HIGH_OPACITY;
            e.target.style.boxShadow = "0 0 20px rgba(0, 255, 255, 0.3)";
            e.target.style.transform = "translateY(0)";
          }}
        >
          ← Return to Dashboard
        </button>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          
          {/* Header */}
          <div style={{
            marginBottom: '32px',
            paddingTop: '60px',
            background: BASE_BG_COLOR_HIGH_OPACITY,
            backdropFilter: 'blur(15px)',
            borderRadius: '16px',
            padding: '32px',
            border: BORDER_CYPHER,
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Network size={40} color={TEXT_CYPHER} style={{ filter: 'drop-shadow(0 0 10px #00FFFF)' }} />
              <div>
                <h1 style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: ACCENT_VIOLET,
                  textShadow: '0 0 20px #8A2BE2',
                  marginBottom: '8px'
                }}>
                  GNN Threat Detection System
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Graph Neural Networks for Cybersecurity
                </p>
              </div>
            </div>
            
            {stats && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <div style={{
                  background: BASE_BG_COLOR,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${ACCENT_VIOLET}`,
                  boxShadow: '0 0 20px rgba(138, 43, 226, 0.3)'
                }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Model Accuracy</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: TEXT_CYPHER }}>
                    {(stats.model_accuracy * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{
                  background: BASE_BG_COLOR,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${ACCENT_VIOLET}`,
                  boxShadow: '0 0 20px rgba(138, 43, 226, 0.3)'
                }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Parameters</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: ACCENT_VIOLET }}>
                    {(stats.total_parameters / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth > 1024 ? '350px 1fr' : '1fr',
            gap: '24px'
          }}>
            
            {/* Control Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Traffic Generator */}
              <div style={{
                background: BASE_BG_COLOR_HIGH_OPACITY,
                borderRadius: '16px',
                padding: '24px',
                border: BORDER_CYPHER,
                backdropFilter: 'blur(15px)',
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.2)'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: TEXT_CYPHER,
                  textShadow: SHADOW_CYAN
                }}>
                  <Zap size={20} color="#facc15" />
                  Traffic Generator
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      color: '#cbd5e1'
                    }}>
                      Traffic Type
                    </label>
                    <select
                      style={{
                        width: '100%',
                        background: BASE_BG_COLOR,
                        border: `1px solid ${ACCENT_VIOLET}`,
                        borderRadius: '8px',
                        padding: '10px 16px',
                        color: 'white',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      value={selectedTraffic}
                      onChange={(e) => setSelectedTraffic(e.target.value)}
                      onMouseEnter={(e) => e.target.style.borderColor = TEXT_CYPHER}
                      onMouseLeave={(e) => e.target.style.borderColor = ACCENT_VIOLET}
                    >
                      <option value="normal">Normal Traffic</option>
                      <option value="attack">Attack Traffic</option>
                    </select>
                  </div>

                  {selectedTraffic === 'attack' && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        color: '#cbd5e1'
                      }}>
                        Attack Type
                      </label>
                      <select
                        style={{
                          width: '100%',
                          background: BASE_BG_COLOR,
                          border: `1px solid ${ACCENT_VIOLET}`,
                          borderRadius: '8px',
                          padding: '10px 16px',
                          color: 'white',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                        value={selectedAttack}
                        onChange={(e) => setSelectedAttack(e.target.value)}
                        onMouseEnter={(e) => e.target.style.borderColor = TEXT_CYPHER}
                        onMouseLeave={(e) => e.target.style.borderColor = ACCENT_VIOLET}
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
                    style={{
                      width: '100%',
                      background: loading ? 'rgba(138, 43, 226, 0.5)' : ACCENT_VIOLET,
                      color: 'white',
                      fontWeight: '600',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      boxShadow: loading ? 'none' : '0 0 30px rgba(138, 43, 226, 0.6)'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 0 40px rgba(138, 43, 226, 0.9)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 0 30px rgba(138, 43, 226, 0.6)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid white',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
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
                  borderRadius: '16px',
                  padding: '24px',
                  border: '2px solid',
                  borderColor: analysis.threat_probability > 0.5 ? '#ef4444' : '#22c55e',
                  background: analysis.threat_probability > 0.5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  backdropFilter: 'blur(15px)',
                  boxShadow: `0 0 40px ${analysis.threat_probability > 0.5 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: getThreatColor(analysis.threat_probability),
                    textShadow: `0 0 10px ${getThreatColor(analysis.threat_probability)}`
                  }}>
                    {analysis.threat_probability > 0.5 ? <AlertCircle size={24} /> : <Shield size={24} />}
                    {analysis.prediction}
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: '12px',
                      padding: '12px',
                      border: `1px solid ${getThreatColor(analysis.threat_probability)}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Threat Probability</span>
                        <span style={{ fontWeight: 'bold', color: getThreatColor(analysis.threat_probability) }}>
                          {(analysis.threat_probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        background: '#e2e8f0',
                        borderRadius: '9999px',
                        height: '8px',
                        overflow: 'hidden',
                        marginTop: '8px'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${analysis.threat_probability * 100}%`,
                          background: getThreatColor(analysis.threat_probability),
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: '12px',
                      padding: '12px',
                      border: `1px solid ${ACCENT_VIOLET}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Confidence</span>
                        <span style={{ fontWeight: 'bold', color: ACCENT_VIOLET }}>
                          {(analysis.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        background: '#e2e8f0',
                        borderRadius: '9999px',
                        height: '8px',
                        overflow: 'hidden',
                        marginTop: '8px'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${analysis.confidence * 100}%`,
                          background: ACCENT_VIOLET,
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        border: `1px solid ${TEXT_CYPHER}`
                      }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Nodes</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: TEXT_CYPHER }}>
                          {analysis.total_nodes}
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        border: `1px solid ${TEXT_CYPHER}`
                      }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Edges</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: TEXT_CYPHER }}>
                          {analysis.total_edges}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Suspicious Nodes */}
              {analysis && analysis.suspicious_nodes && analysis.suspicious_nodes.length > 0 && (
                <div style={{
                  background: BASE_BG_COLOR_HIGH_OPACITY,
                  borderRadius: '16px',
                  padding: '24px',
                  border: BORDER_CYPHER,
                  backdropFilter: 'blur(15px)',
                  boxShadow: '0 0 30px rgba(0, 255, 255, 0.2)'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fb923c',
                    textShadow: '0 0 10px #fb923c'
                  }}>
                    <TrendingUp size={20} color="#fb923c" />
                    Suspicious Nodes
                  </h2>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {analysis.suspicious_nodes.map((node, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: BASE_BG_COLOR,
                          borderRadius: '12px',
                          padding: '12px',
                          border: `1px solid ${ACCENT_VIOLET}`,
                          marginBottom: '8px',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = TEXT_CYPHER;
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = ACCENT_VIOLET;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Node {node.node_id}</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'white',
                          wordBreak: 'break-all',
                          marginTop: '4px'
                        }}>
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
            <div style={{
              background: BASE_BG_COLOR_HIGH_OPACITY,
              borderRadius: '16px',
              padding: '24px',
              border: BORDER_CYPHER,
              backdropFilter: 'blur(15px)',
              boxShadow: '0 0 30px rgba(0, 255, 255, 0.2)'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: TEXT_CYPHER,
                textShadow: SHADOW_CYAN
              }}>
                <Network size={20} color={TEXT_CYPHER} />
                Network Graph Visualization
              </h2>

              <div style={{
                background: BASE_BG_COLOR,
                borderRadius: '12px',
                border: `1px solid ${ACCENT_VIOLET}`,
                height: '600px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 40px rgba(138, 43, 226, 0.3)'
              }}>
                {graphData ? (
                  <GraphVisualization graphData={graphData} analysis={analysis} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Network size={64} color="#475569" style={{ margin: '0 auto 16px', animation: 'pulse 2s infinite' }} />
                    <p style={{ color: '#94a3b8' }}>Generate traffic to visualize network graph</p>
                  </div>
                )}
              </div>

              {graphData && (
                <div style={{
                  marginTop: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px'
                }}>
                  <div style={{
                    background: BASE_BG_COLOR,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `1px solid ${ACCENT_VIOLET}`,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = TEXT_CYPHER;
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = ACCENT_VIOLET;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Graph Type</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: TEXT_CYPHER }}>
                      {graphData.attack_type}
                    </div>
                  </div>
                  <div style={{
                    background: BASE_BG_COLOR,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `1px solid ${ACCENT_VIOLET}`,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = TEXT_CYPHER;
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = ACCENT_VIOLET;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Nodes</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: ACCENT_VIOLET }}>
                      {graphData.nodes.length}
                    </div>
                  </div>
                  <div style={{
                    background: BASE_BG_COLOR,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `1px solid ${ACCENT_VIOLET}`,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = TEXT_CYPHER;
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = ACCENT_VIOLET;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
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
                stroke="#8A2BE2"
                strokeWidth="2"
                opacity="0.4"
                style={{ filter: 'drop-shadow(0 0 3px #8A2BE2)' }}
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

            let nodeColor = '#00FFFF';
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
                  style={{ filter: `drop-shadow(0 0 8px ${nodeColor})` }}
                />
                {(isVictim || isAttacker || isSuspicious) && (
                  <text
                    x={node.x}
                    y={node.y + nodeSize + 15}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="10"
                    fontWeight="bold"
                    style={{ textShadow: '0 0 5px #000' }}
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
          <rect width="180" height="120" fill={BASE_BG_COLOR_HIGH_OPACITY} opacity="0.95" rx="8" stroke={TEXT_CYPHER} strokeWidth="1" />
          <text x="10" y="20" fill={TEXT_CYPHER} fontSize="12" fontWeight="bold">Legend</text>
          
          <circle cx="20" cy="40" r="6" fill="#00FFFF" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }} />
          <text x="35" y="45" fill="#94a3b8" fontSize="11">Normal Node</text>
          
          <circle cx="20" cy="60" r="6" fill="#eab308" style={{ filter: 'drop-shadow(0 0 5px #eab308)' }} />
          <text x="35" y="65" fill="#94a3b8" fontSize="11">Suspicious</text>
          
          <circle cx="20" cy="80" r="8" fill="#f97316" style={{ filter: 'drop-shadow(0 0 5px #f97316)' }} />
          <text x="35" y="85" fill="#94a3b8" fontSize="11">Attacker</text>
          
          <circle cx="20" cy="100" r="8" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 5px #ef4444)' }} />
          <text x="35" y="105" fill="#94a3b8" fontSize="11">Victim</text>
        </g>
      </svg>
    </div>
  );
};

export default GNNDemo;