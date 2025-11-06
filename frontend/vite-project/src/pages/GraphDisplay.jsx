import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import GraphVisualization from '../components/GraphVisualization';
import * as THREE from 'three';

// Color constants matching Login.jsx
const BASE_BG_COLOR = 'rgba(0, 0, 10, 0.98)';
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)';
const ACCENT_VIOLET = '#8A2BE2';
const TEXT_CYPHER = '#00FFFF';
const TEXT_WHITE = '#E2E8F0';

const GraphDisplay = () => {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const mountRef = useRef(null);
  const animationFrameRef = useRef();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const mount = mountRef.current;
    if (!mount) return;

    // Three.js Cosmic Background Setup
    let renderer, camera;
    let stars, particles;
    let starGeometry, pointMaterial, particleGeometry, particleMaterial;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.005);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 35;

    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x8A2BE2, 0.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00FFFF, 1.5, 100);
    pointLight1.position.set(20, 20, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8A2BE2, 1.5, 100);
    pointLight2.position.set(-20, -20, 20);
    scene.add(pointLight2);

    const createStarLayer = (count, distance, size, color) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = distance + (Math.random() - 0.5) * 20;
        positions[i] = r * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = r * Math.cos(phi);
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        size, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
      });
      return new THREE.Points(geometry, material);
    };

    stars = new THREE.Group();
    stars.add(createStarLayer(isMobile ? 800 : 2000, 50, 0.8, 0xFFFFFF));
    stars.add(createStarLayer(isMobile ? 400 : 1000, 70, 0.5, 0x8A2BE2));
    stars.add(createStarLayer(isMobile ? 400 : 1000, 90, 0.3, 0x00FFFF));
    starGeometry = stars.children[0].geometry;
    pointMaterial = stars.children[0].material;
    scene.add(stars);

    const particleCount = isMobile ? 100 : 300;
    particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i3 + 2] = radius * Math.cos(phi);
      
      const useViolet = Math.random() > 0.5;
      particleColors[i3] = useViolet ? 0.54 : 0;
      particleColors[i3 + 1] = useViolet ? 0.17 : 1;
      particleColors[i3 + 2] = useViolet ? 0.89 : 1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleMaterial = new THREE.PointsMaterial({
      size: 2, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
    });
    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.002;

      stars.rotation.x += 0.0003;
      stars.rotation.y += 0.0005;

      particles.rotation.y += 0.002;
      particles.rotation.z += 0.001;

      pointLight1.position.x = Math.sin(time * 0.5) * 25;
      pointLight1.position.y = Math.cos(time * 0.5) * 25;
      pointLight2.position.x = Math.cos(time * 0.3) * 25;
      pointLight2.position.y = Math.sin(time * 0.3) * 25;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', checkMobile);

      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      starGeometry?.dispose();
      pointMaterial?.dispose();
      particleGeometry?.dispose();
      particleMaterial?.dispose();
    };
  }, [isMobile]);

  const legendItems = {
    nodeTypes: [
      { id: 'ip', label: 'IP Address', color: '#00D9FF', shape: 'circle', description: 'Network endpoints and connections' },
      { id: 'process', label: 'Process', color: '#FF6B9D', shape: 'square', description: 'Active system processes' }
    ],
    riskLevels: [
      { id: 'critical', label: 'Critical', color: '#FF0055', glow: true, range: '≥ 9.0', icon: '▲' },
      { id: 'high', label: 'High', color: '#FF6B00', glow: false, range: '7.0 - 8.9', icon: '●' },
      { id: 'medium', label: 'Medium', color: '#FFD700', glow: false, range: '4.0 - 6.9', icon: '■' },
      { id: 'low', label: 'Low', color: '#00FF88', glow: false, range: '< 4.0', icon: '◆' }
    ]
  };

  const renderShape = (shape, color, isHovered) => {
    const baseStyle = {
      width: '24px',
      height: '24px',
      background: color,
      marginRight: '12px',
      transition: 'all 0.3s ease',
      boxShadow: isHovered ? `0 0 20px ${color}, 0 0 40px ${color}60` : `0 0 8px ${color}40`,
      transform: isHovered ? 'scale(1.2) rotate(5deg)' : 'scale(1)',
      border: `2px solid ${color}`
    };

    switch(shape) {
      case 'circle':
        return <div style={{...baseStyle, borderRadius: '50%'}} />;
      case 'square':
        return <div style={{...baseStyle, borderRadius: '4px'}} />;
      default:
        return <div style={baseStyle} />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: '#000000'
    }}>
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
        background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 10, 0.5) 100%)',
        backdropFilter: 'blur(2px)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '2rem',
        maxWidth: '1920px',
        margin: '0 auto'
      }}>
        {/* Back to Dashboard Button */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            position: 'fixed',
            top: '2rem',
            left: '2rem',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: BASE_BG_COLOR_HIGH_OPACITY,
            backdropFilter: 'blur(20px)',
            border: `2px solid ${TEXT_CYPHER}`,
            borderRadius: '12px',
            color: TEXT_CYPHER,
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: `0 5px 20px ${TEXT_CYPHER}40`,
            animation: 'slideUp 0.5s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-5px)';
            e.currentTarget.style.boxShadow = `0 10px 30px ${TEXT_CYPHER}60`;
            e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = `0 5px 20px ${TEXT_CYPHER}40`;
            e.currentTarget.style.background = BASE_BG_COLOR_HIGH_OPACITY;
          }}
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem',
          animation: 'slideUp 0.6s ease-out'
        }}>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 2rem',
            background: BASE_BG_COLOR_HIGH_OPACITY,
            backdropFilter: 'blur(20px)',
            borderRadius: '15px',
            border: `1px solid ${ACCENT_VIOLET}`,
            boxShadow: `0 10px 40px ${ACCENT_VIOLET}40`,
            marginBottom: '1rem'
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              margin: '0.5rem 0',
              letterSpacing: '0.15em',
              color: ACCENT_VIOLET,
              textShadow: `0 0 20px ${ACCENT_VIOLET}`,
              animation: 'glow 2s ease-in-out infinite'
            }}>
              THREAT GRAPH
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#94a3b8',
              margin: '0.5rem 0',
              fontWeight: '500',
              letterSpacing: '0.05em'
            }}>
              Real-Time Security Topology Visualization
            </p>
          </div>
        </div>

        {/* Graph Visualization - BIGGER */}
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          borderRadius: '20px',
          background: BASE_BG_COLOR,
          backdropFilter: 'blur(20px)',
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${ACCENT_VIOLET}20`,
          border: `1px solid ${ACCENT_VIOLET}60`,
          animation: 'slideUp 0.8s ease-out',
          position: 'relative'
        }}>
          {/* Glowing corners */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40px',
            height: '40px',
            borderTop: `2px solid ${TEXT_CYPHER}`,
            borderLeft: `2px solid ${TEXT_CYPHER}`,
            borderRadius: '20px 0 0 0',
            boxShadow: `0 0 15px ${TEXT_CYPHER}`
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40px',
            height: '40px',
            borderTop: `2px solid ${TEXT_CYPHER}`,
            borderRight: `2px solid ${TEXT_CYPHER}`,
            borderRadius: '0 20px 0 0',
            boxShadow: `0 0 15px ${TEXT_CYPHER}`
          }} />
          
          <GraphVisualization height="calc(100vh - 300px)" />
        </div>

        {/* Legend */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '1.5rem',
          animation: 'slideUp 1s ease-out'
        }}>
          {/* Node Types Legend */}
          <div style={{
            padding: '2rem',
            borderRadius: '20px',
            background: BASE_BG_COLOR,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${ACCENT_VIOLET}20`,
            border: `1px solid ${ACCENT_VIOLET}60`,
            position: 'relative'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '700',
              color: TEXT_CYPHER,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '1.5rem',
              textShadow: `0 0 10px ${TEXT_CYPHER}60`
            }}>
              Node Classifications
            </h3>
            
            {legendItems.nodeTypes.map((item) => (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  borderRadius: '10px',
                  background: hoveredItem === item.id ? 'rgba(138, 43, 226, 0.1)' : 'transparent',
                  border: `1px solid ${hoveredItem === item.id ? item.color : 'transparent'}`,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  transform: hoveredItem === item.id ? 'translateX(5px)' : 'translateX(0)',
                  boxShadow: hoveredItem === item.id ? `0 0 20px ${item.color}40` : 'none'
                }}
              >
                {renderShape(item.shape, item.color, hoveredItem === item.id)}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: TEXT_WHITE,
                    marginBottom: '0.25rem'
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    opacity: hoveredItem === item.id ? 1 : 0.7,
                    transition: 'opacity 0.3s ease'
                  }}>
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Risk Levels Legend */}
          <div style={{
            padding: '2rem',
            borderRadius: '20px',
            background: BASE_BG_COLOR,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${ACCENT_VIOLET}20`,
            border: `1px solid ${ACCENT_VIOLET}60`,
            position: 'relative'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '700',
              color: TEXT_CYPHER,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '1.5rem',
              textShadow: `0 0 10px ${TEXT_CYPHER}60`
            }}>
              Threat Severity
            </h3>
            
            {legendItems.riskLevels.map((item) => (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  borderRadius: '10px',
                  background: hoveredItem === item.id ? `${item.color}10` : 'transparent',
                  border: `1px solid ${hoveredItem === item.id ? item.color : 'transparent'}`,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  transform: hoveredItem === item.id ? 'translateX(5px)' : 'translateX(0)',
                  boxShadow: hoveredItem === item.id ? `0 0 20px ${item.color}40` : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: item.color,
                  marginRight: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease',
                  boxShadow: hoveredItem === item.id && item.glow ? `0 0 25px ${item.color}, 0 0 50px ${item.color}60` : `0 0 8px ${item.color}40`,
                  transform: hoveredItem === item.id ? 'scale(1.2) rotate(5deg)' : 'scale(1)',
                  border: item.glow ? `2px solid ${item.color}` : 'none'
                }}>
                  <span style={{ color: '#000', fontWeight: 'bold' }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: TEXT_WHITE,
                    marginBottom: '0.25rem'
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    opacity: hoveredItem === item.id ? 1 : 0.7,
                    transition: 'opacity 0.3s ease'
                  }}>
                    Score: {item.range}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 20px ${ACCENT_VIOLET}, 0 0 40px ${ACCENT_VIOLET};
          }
          50% {
            text-shadow: 0 0 30px ${TEXT_CYPHER}, 0 0 60px ${TEXT_CYPHER};
          }
        }
      `}</style>
    </div>
  );
};

export default GraphDisplay;