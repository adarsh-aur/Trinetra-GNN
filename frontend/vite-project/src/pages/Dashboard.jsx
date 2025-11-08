import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, TrendingUp, Users, Brain, ChevronRight, BarChart3, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

// --- COLOR CONSTANTS (Matching Landing.jsx) ---
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)';
const ACCENT_VIOLET = '#8A2BE2';
const TEXT_CYPHER = '#00FFFF';
const TEXT_WHITE = '#E2E8F0';

export default function Dashboard() {
  const navigate = useNavigate();
  const recentActivities = [];
  const [isMobile, setIsMobile] = useState(false);
  const mountRef = useRef(null);
  const animationFrameRef = useRef();

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const mount = mountRef.current;
    if (!mount) return;

    let renderer, camera, stars, particles;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.005);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 30;

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
      return new THREE.Points(geometry, new THREE.PointsMaterial({
        size, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
      }));
    };

    stars = new THREE.Group();
    stars.add(createStarLayer(isMobile ? 800 : 2000, 50, 0.8, 0xFFFFFF));
    stars.add(createStarLayer(isMobile ? 400 : 1000, 70, 0.5, 0x8A2BE2));
    stars.add(createStarLayer(isMobile ? 400 : 1000, 90, 0.3, 0x00FFFF));
    scene.add(stars);

    const particleCount = isMobile ? 100 : 300;
    const particleGeometry = new THREE.BufferGeometry();
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
    particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
      size: 2, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
    }));
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
      if (renderer.domElement) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [isMobile, checkMobile]);

  const handleGNNDemoClick = () => {
    navigate('/gnn-demo');
  };

  const handleUserProfileClick = () => {
    navigate('/user-profile');
  };

  const handleGraphVisualizationClick = () => {
    navigate('/GraphDisplay');
  };

  const handleLogout = () => {
    // Clear authentication data
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    
    // Navigate to landing page
    navigate('/');
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#000000' }}>
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

      {/* Logout Button - Fixed Position */}
      <button
        onClick={handleLogout}
        style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.5rem',
          background: BASE_BG_COLOR_HIGH_OPACITY,
          border: `2px solid #FF0064`,
          color: '#FF0064',
          borderRadius: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          fontSize: '1rem',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 20px rgba(255, 0, 100, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 0, 100, 0.1)';
          e.target.style.boxShadow = '0 0 40px rgba(255, 0, 100, 0.6)';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = BASE_BG_COLOR_HIGH_OPACITY;
          e.target.style.boxShadow = '0 0 20px rgba(255, 0, 100, 0.3)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>

      {recentActivities.length === 0 ? (
        /* Hero Section - Empty State */
        <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'slideUp 0.8s ease-out' }}>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: '800',
              color: ACCENT_VIOLET,
              marginBottom: '1rem',
              textShadow: `0 0 30px ${ACCENT_VIOLET}`,
              animation: 'glow 5s ease-in-out infinite'
            }}>
              Welcome to Your Dashboard
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
              color: TEXT_WHITE,
              maxWidth: '900px',
              margin: '0 auto 3rem',
              lineHeight: '1.8',
              textShadow: '0 0 10px rgba(0, 0, 0, 0.8)'
            }}>
              Your intelligent command center for monitoring, analyzing, and optimizing your data. 
              Start exploring features to unlock powerful insights and visualizations.
            </p>

            {/* Feature Badges */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              marginBottom: '3rem',
              flexWrap: 'wrap'
            }}>
              {[
                { icon: '🧠', text: 'AI-Powered Analytics' },
                { icon: '📊', text: 'Real-time Insights' },
                { icon: '🔒', text: 'Secure & Private' }
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: BASE_BG_COLOR_HIGH_OPACITY,
                    border: `2px solid ${TEXT_CYPHER}`,
                    borderRadius: '50px',
                    padding: '1rem 2rem',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                    e.currentTarget.style.boxShadow = `0 10px 40px ${TEXT_CYPHER}60`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{feature.icon}</span>
                  <span style={{ color: TEXT_WHITE, fontWeight: '600', fontSize: '1.1rem' }}>{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleGNNDemoClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.25rem 2.5rem',
                  background: `linear-gradient(135deg, ${ACCENT_VIOLET} 0%, ${TEXT_CYPHER} 100%)`,
                  border: 'none',
                  color: TEXT_WHITE,
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  boxShadow: `0 10px 40px ${ACCENT_VIOLET}60`,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = `0 15px 50px ${ACCENT_VIOLET}80`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = `0 10px 40px ${ACCENT_VIOLET}60`;
                }}
              >
                <Brain size={20} />
                <span>Try GNN Demo</span>
                <ChevronRight size={18} />
              </button>
              
              <button 
                onClick={handleUserProfileClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.25rem 2.5rem',
                  background: BASE_BG_COLOR_HIGH_OPACITY,
                  border: `2px solid ${TEXT_CYPHER}`,
                  color: TEXT_CYPHER,
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 0 20px ${TEXT_CYPHER}30`
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0, 255, 255, 0.1)';
                  e.target.style.boxShadow = `0 0 40px ${TEXT_CYPHER}60`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = BASE_BG_COLOR_HIGH_OPACITY;
                  e.target.style.boxShadow = `0 0 20px ${TEXT_CYPHER}30`;
                }}
              >
                <User size={20} />
                <span>View Profile</span>
              </button>

              <button 
                onClick={handleGraphVisualizationClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.25rem 2.5rem',
                  background: BASE_BG_COLOR_HIGH_OPACITY,
                  border: `2px solid ${ACCENT_VIOLET}`,
                  color: ACCENT_VIOLET,
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(138, 43, 226, 0.1)';
                  e.target.style.boxShadow = `0 0 40px ${ACCENT_VIOLET}60`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = BASE_BG_COLOR_HIGH_OPACITY;
                  e.target.style.boxShadow = 'none';
                }}
              >
                <BarChart3 size={20} />
                <span>Graph Visualization</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Dashboard Content */
        <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', padding: '2rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem', animation: 'slideUp 0.6s ease-out' }}>
              <h1 style={{ 
                fontSize: '3rem', 
                fontWeight: 'bold', 
                color: ACCENT_VIOLET, 
                marginBottom: '0.5rem',
                textShadow: `0 0 20px ${ACCENT_VIOLET}`
              }}>
                Dashboard
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Welcome back! Here's your overview</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Stat Card 1 */}
              <div style={{ 
                background: BASE_BG_COLOR_HIGH_OPACITY,
                border: `1px solid ${ACCENT_VIOLET}60`,
                borderRadius: '20px',
                padding: '2rem',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animation: 'slideUp 0.7s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 10px 40px ${ACCENT_VIOLET}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(168, 85, 247, 0.2)',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    border: '1px solid rgba(168, 85, 247, 0.5)'
                  }}>
                    <TrendingUp color="#c084fc" size={24} />
                  </div>
                  <span style={{ color: '#10b981', fontSize: '1rem', fontWeight: '700' }}>+12.5%</span>
                </div>
                <h3 style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Growth</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: TEXT_WHITE }}>2,847</p>
              </div>

              {/* Stat Card 2 */}
              <div style={{ 
                background: BASE_BG_COLOR_HIGH_OPACITY,
                border: `1px solid ${TEXT_CYPHER}60`,
                borderRadius: '20px',
                padding: '2rem',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animation: 'slideUp 0.8s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 10px 40px ${TEXT_CYPHER}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(236, 72, 153, 0.2)',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    border: '1px solid rgba(236, 72, 153, 0.5)'
                  }}>
                    <Users color="#f9a8d4" size={24} />
                  </div>
                  <span style={{ color: '#10b981', fontSize: '1rem', fontWeight: '700' }}>+8.2%</span>
                </div>
                <h3 style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Users</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: TEXT_WHITE }}>1,429</p>
              </div>

              {/* Stat Card 3 */}
              <div style={{ 
                background: BASE_BG_COLOR_HIGH_OPACITY,
                border: `1px solid ${ACCENT_VIOLET}60`,
                borderRadius: '20px',
                padding: '2rem',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animation: 'slideUp 0.9s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 10px 40px ${ACCENT_VIOLET}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    border: '1px solid rgba(59, 130, 246, 0.5)'
                  }}>
                    <Activity color="#60a5fa" size={24} />
                  </div>
                  <span style={{ color: '#10b981', fontSize: '1rem', fontWeight: '700' }}>+15.3%</span>
                </div>
                <h3 style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sessions</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: TEXT_WHITE }}>8,392</p>
              </div>
            </div>

            {/* Quick Access Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* GNN Demo Card */}
              <div 
                onClick={handleGNNDemoClick}
                style={{
                  background: `linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.2))`,
                  border: `2px solid ${TEXT_CYPHER}`,
                  borderRadius: '20px',
                  padding: '2rem',
                  cursor: 'pointer',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                  animation: 'slideUp 1s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 15px 50px ${TEXT_CYPHER}60`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'rgba(100, 255, 218, 0.2)',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      border: `1px solid ${TEXT_CYPHER}`
                    }}>
                      <Brain color={TEXT_CYPHER} size={32} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: TEXT_WHITE, marginBottom: '0.25rem' }}>
                        GNN Demo
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Explore neural networks</p>
                    </div>
                  </div>
                  <ChevronRight color={TEXT_CYPHER} size={24} />
                </div>
              </div>

              {/* User Profile Card */}
              <div 
                onClick={handleUserProfileClick}
                style={{
                  background: `linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2))`,
                  border: `2px solid ${ACCENT_VIOLET}`,
                  borderRadius: '20px',
                  padding: '2rem',
                  cursor: 'pointer',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                  animation: 'slideUp 1.1s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 15px 50px ${ACCENT_VIOLET}60`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'rgba(138, 43, 226, 0.2)',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      border: `1px solid ${ACCENT_VIOLET}`
                    }}>
                      <User color={ACCENT_VIOLET} size={32} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: TEXT_WHITE, marginBottom: '0.25rem' }}>
                        User Profile
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Manage your account</p>
                    </div>
                  </div>
                  <ChevronRight color={ACCENT_VIOLET} size={24} />
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div style={{
              background: BASE_BG_COLOR_HIGH_OPACITY,
              border: `1px solid ${TEXT_CYPHER}60`,
              borderRadius: '20px',
              padding: '2rem',
              backdropFilter: 'blur(20px)',
              animation: 'slideUp 1.2s ease-out'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: TEXT_WHITE, marginBottom: '1.5rem' }}>
                Recent Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentActivities.map((activity, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'rgba(100, 255, 218, 0.05)',
                    borderRadius: '10px',
                    border: `1px solid ${TEXT_CYPHER}20`
                  }}>
                    <div style={{ width: '8px', height: '8px', background: TEXT_CYPHER, borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite' }}></div>
                    <span style={{ color: '#94a3b8', fontSize: '1rem' }}>{activity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}