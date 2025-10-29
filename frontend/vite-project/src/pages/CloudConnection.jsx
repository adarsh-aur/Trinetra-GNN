import { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import * as THREE from 'three';

// --- COLOR CONSTANTS ---
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)';
const ACCENT_VIOLET = '#8A2BE2';
const TEXT_CYPHER = '#00FFFF';
const TEXT_WHITE = '#E2E8F0';

const CloudConnection = () => {
  const [providers, setProviders] = useState({
    aws: { accountId: '', region: '', connected: false },
    azure: { subscriptionId: '', tenantId: '', connected: false },
    gcp: { projectId: '', organizationId: '', connected: false }
  });
  const [isMobile, setIsMobile] = useState(false);

  const { updateCloudProvider, logout } = useContext(AuthContext);
  const navigate = useNavigate();
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
    scene.add(stars);

    const particleCount = isMobile ? 100 : 300;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i3 + 2] = radius * Math.cos(phi);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
      size: 2, color: 0x00FFFF, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
    }));
    scene.add(particles);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      stars.rotation.x += 0.0003;
      stars.rotation.y += 0.0005;
      particles.rotation.y += 0.002;
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

  const validationPatterns = {
    aws: { accountId: /^\d{12}$/ },
    azure: { 
      subscriptionId: /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      tenantId: /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i
    },
    gcp: { 
      projectId: /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/,
      organizationId: /^\d{10,12}$/
    }
  };

  const validateProvider = (provider) => {
    if (provider === 'aws') {
      return validationPatterns.aws.accountId.test(providers.aws.accountId) && providers.aws.region !== '';
    } else if (provider === 'azure') {
      return validationPatterns.azure.subscriptionId.test(providers.azure.subscriptionId) &&
             validationPatterns.azure.tenantId.test(providers.azure.tenantId);
    } else if (provider === 'gcp') {
      return validationPatterns.gcp.projectId.test(providers.gcp.projectId) &&
             (providers.gcp.organizationId === '' || validationPatterns.gcp.organizationId.test(providers.gcp.organizationId));
    }
    return false;
  };

  const handleInputChange = (provider, field, value) => {
    setProviders({
      ...providers,
      [provider]: { ...providers[provider], [field]: value }
    });
  };

  const handleConnect = async (provider) => {
    if (!validateProvider(provider)) {
      alert('Please enter valid credentials');
      return;
    }

    const credentials = providers[provider];
    const result = await updateCloudProvider(provider, credentials);

    if (result.success) {
      setProviders({
        ...providers,
        [provider]: { ...providers[provider], connected: true }
      });
    } else {
      alert(result.message || 'Failed to connect provider');
    }
  };

  const hasConnectedProvider = Object.values(providers).some(p => p.connected);

  const handleContinue = () => {
    if (!hasConnectedProvider) {
      alert('Please connect at least one cloud provider to continue');
      return;
    }
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const cloudProviders = [
    { 
      key: 'aws', 
      name: 'Amazon Web Services', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
      color: '#FF9900'
    },
    { 
      key: 'azure', 
      name: 'Microsoft Azure', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Microsoft_Azure_Logo.svg',
      color: '#0078D4'
    },
    { 
      key: 'gcp', 
      name: 'Google Cloud Platform', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg',
      color: '#4285F4'
    }
  ];

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: `2px solid ${ACCENT_VIOLET}60`,
    background: 'rgba(10, 5, 20, 0.5)',
    color: TEXT_WHITE,
    outline: 'none',
    transition: 'all 0.3s ease',
    fontSize: '0.95rem',
    fontWeight: '500'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: TEXT_WHITE,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'auto',
      background: '#000000'
    }}>
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

      {/* Logout Button */}
      <div style={{
        position: 'fixed',
        top: '2rem',
        right: '2rem',
        zIndex: 100
      }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid #ef4444',
            color: '#ef4444',
            borderRadius: '10px',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#ef4444';
            e.target.style.color = TEXT_WHITE;
            e.target.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
            e.target.style.color = '#ef4444';
            e.target.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.3)';
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '3rem 2rem'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '4rem',
          animation: 'slideUp 0.6s ease-out'
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: '800',
            marginBottom: '1rem',
            color: ACCENT_VIOLET,
            textShadow: `0 0 30px ${ACCENT_VIOLET}`,
            animation: 'glow 2s ease-in-out infinite'
          }}>
            Connect Your Cloud Services
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: '#94a3b8',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: '1.8'
          }}>
            Secure all your cloud assets by integrating with TRINETRA. We'll guide you through the setup process for each service.
          </p>
        </div>

        {/* Cloud Provider Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {cloudProviders.map((provider) => (
            <div
              key={provider.key}
              style={{
                background: BASE_BG_COLOR_HIGH_OPACITY,
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '2rem',
                border: providers[provider.key].connected 
                  ? `2px solid #10b981` 
                  : `1px solid ${ACCENT_VIOLET}`,
                boxShadow: providers[provider.key].connected
                  ? '0 0 40px rgba(16, 185, 129, 0.4)'
                  : `0 10px 40px rgba(0, 0, 0, 0.5)`,
                transition: 'all 0.3s ease',
                animation: 'slideUp 0.6s ease-out'
              }}
              onMouseEnter={(e) => {
                if (!providers[provider.key].connected) {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 15px 50px ${ACCENT_VIOLET}40`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = providers[provider.key].connected
                  ? '0 0 40px rgba(16, 185, 129, 0.4)'
                  : `0 10px 40px rgba(0, 0, 0, 0.5)`;
              }}
            >
              {/* Provider Logo */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1rem',
                  border: `2px solid ${provider.color}40`,
                  boxShadow: `0 0 20px ${provider.color}40`
                }}>
                  <img 
                    src={provider.logo} 
                    alt={provider.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>

              {/* Provider Name */}
              <h3 style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: TEXT_WHITE,
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}>
                {provider.name}
              </h3>

              {!providers[provider.key].connected ? (
                <>
                  {/* AWS Form */}
                  {provider.key === 'aws' && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>AWS Account ID</label>
                        <input
                          type="text"
                          placeholder="123456789012"
                          maxLength="12"
                          value={providers.aws.accountId}
                          onChange={(e) => handleInputChange('aws', 'accountId', e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => {
                            e.target.style.borderColor = TEXT_CYPHER;
                            e.target.style.boxShadow = `0 0 15px ${TEXT_CYPHER}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = `${ACCENT_VIOLET}60`;
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={labelStyle}>Primary Region</label>
                        <select
                          value={providers.aws.region}
                          onChange={(e) => handleInputChange('aws', 'region', e.target.value)}
                          style={{...inputStyle, cursor: 'pointer'}}
                          onFocus={(e) => {
                            e.target.style.borderColor = TEXT_CYPHER;
                            e.target.style.boxShadow = `0 0 15px ${TEXT_CYPHER}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = `${ACCENT_VIOLET}60`;
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          <option value="" style={{background: '#1a1a2e', color: TEXT_WHITE}}>Select Region</option>
                          <option value="us-east-1" style={{background: '#1a1a2e', color: TEXT_WHITE}}>US East (N. Virginia)</option>
                          <option value="us-west-2" style={{background: '#1a1a2e', color: TEXT_WHITE}}>US West (Oregon)</option>
                          <option value="eu-west-1" style={{background: '#1a1a2e', color: TEXT_WHITE}}>Europe (Ireland)</option>
                          <option value="ap-southeast-1" style={{background: '#1a1a2e', color: TEXT_WHITE}}>Asia Pacific (Singapore)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Azure Form */}
                  {provider.key === 'azure' && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Subscription ID</label>
                        <input
                          type="text"
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          value={providers.azure.subscriptionId}
                          onChange={(e) => handleInputChange('azure', 'subscriptionId', e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => {
                            e.target.style.borderColor = TEXT_CYPHER;
                            e.target.style.boxShadow = `0 0 15px ${TEXT_CYPHER}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = `${ACCENT_VIOLET}60`;
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={labelStyle}>Tenant ID</label>
                        <input
                          type="text"
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          value={providers.azure.tenantId}
                          onChange={(e) => handleInputChange('azure', 'tenantId', e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => {
                            e.target.style.borderColor = TEXT_CYPHER;
                            e.target.style.boxShadow = `0 0 15px ${TEXT_CYPHER}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = `${ACCENT_VIOLET}60`;
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* GCP Form */}
                  {provider.key === 'gcp' && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Project ID</label>
                        <input
                          type="text"
                          placeholder="my-project-123456"
                          value={providers.gcp.projectId}
                          onChange={(e) => handleInputChange('gcp', 'projectId', e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => {
                            e.target.style.borderColor = TEXT_CYPHER;
                            e.target.style.boxShadow = `0 0 15px ${TEXT_CYPHER}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = `${ACCENT_VIOLET}60`;
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={labelStyle}>Organization ID (Optional)</label>
                        <input
                          type="text"
                          placeholder="123456789012"
                          value={providers.gcp.organizationId}
                          onChange={(e) => handleInputChange('gcp', 'organizationId', e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => {
                            e.target.style.borderColor = TEXT_CYPHER;
                            e.target.style.boxShadow = `0 0 15px ${TEXT_CYPHER}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = `${ACCENT_VIOLET}60`;
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* Connect Button */}
                  <button
                    onClick={() => handleConnect(provider.key)}
                    disabled={!validateProvider(provider.key)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: 'none',
                      borderRadius: '10px',
                      background: validateProvider(provider.key)
                        ? `linear-gradient(135deg, ${ACCENT_VIOLET} 0%, ${TEXT_CYPHER} 100%)`
                        : 'rgba(100, 100, 100, 0.3)',
                      color: validateProvider(provider.key) ? TEXT_WHITE : '#64748b',
                      cursor: validateProvider(provider.key) ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s ease',
                      fontSize: '1rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxShadow: validateProvider(provider.key) ? `0 10px 30px ${ACCENT_VIOLET}40` : 'none',
                      opacity: validateProvider(provider.key) ? 1 : 0.5
                    }}
                    onMouseEnter={(e) => {
                      if (validateProvider(provider.key)) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = `0 15px 40px ${ACCENT_VIOLET}60`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = validateProvider(provider.key) ? `0 10px 30px ${ACCENT_VIOLET}40` : 'none';
                    }}
                  >
                    Verify & Connect
                  </button>
                </>
              ) : (
                <div style={{
                  padding: '1.5rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid #10b981',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#86efac',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  <span style={{fontSize: '1.5rem'}}>✓</span>
                  Connected Successfully
                </div>
              )}

              {/* Info Footer */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(100, 255, 218, 0.05)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: '#94a3b8'
              }}>
                <span style={{color: TEXT_CYPHER}}>ℹnfo</span>
                {provider.key === 'aws' && 'Requires IAM role creation'}
                {provider.key === 'azure' && 'Requires Service Principal'}
                {provider.key === 'gcp' && 'Requires Service Account'}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div style={{
          textAlign: 'center',
          animation: 'slideUp 0.8s ease-out'
        }}>
          <button
            onClick={handleContinue}
            style={{
              padding: '1.25rem 3rem',
              border: 'none',
              borderRadius: '12px',
              background: hasConnectedProvider
                ? `linear-gradient(135deg, ${ACCENT_VIOLET} 0%, ${TEXT_CYPHER} 100%)`
                : 'rgba(100, 100, 100, 0.3)',
              color: hasConnectedProvider ? TEXT_WHITE : '#64748b',
              cursor: hasConnectedProvider ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              fontSize: '1.2rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: hasConnectedProvider ? `0 15px 40px ${ACCENT_VIOLET}60` : 'none',
              opacity: hasConnectedProvider ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (hasConnectedProvider) {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = `0 20px 50px ${ACCENT_VIOLET}80`;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = hasConnectedProvider ? `0 15px 40px ${ACCENT_VIOLET}60` : 'none';
            }}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
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
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        input::placeholder, select option {
          color: #64748b;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default CloudConnection;