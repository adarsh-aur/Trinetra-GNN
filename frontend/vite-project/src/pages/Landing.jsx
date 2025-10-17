import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const Landing = () => {
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    const loadVanta = async () => {
      try {
        const THREE = await import('three');
        const VANTA = await import('vanta/dist/vanta.net.min');
        const NET = VANTA.default || VANTA;

        if (!vantaEffect.current && vantaRef.current) {
          vantaEffect.current = NET({
            el: vantaRef.current,
            THREE: THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0x64ffda,
            backgroundColor: 0x0a192f,
            points: 10.0,
            maxDistance: 23.0,
            spacing: 17.0
          });
        }
      } catch (error) {
        console.error('Error loading Vanta:', error);
      }
    };

    loadVanta();

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Vanta Background */}
      <div 
        ref={vantaRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      />

      {/* Navigation */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(10, 25, 47, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(100, 255, 218, 0.1)'
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#64ffda',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          🛡️ CloudGraph Sentinel
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '2px solid #64ffda',
              color: '#64ffda',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#64ffda';
              e.target.style.color = '#0a192f';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#64ffda';
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #64ffda 0%, #00aeff 100%)',
              border: 'none',
              color: '#0a192f',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(100, 255, 218, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(100, 255, 218, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(100, 255, 218, 0.3)';
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Main Heading */}
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '800',
            color: '#e2e8f0',
            marginBottom: '1.5rem',
            lineHeight: '1.2',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            Unified Threat Intelligence for
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg, #64ffda 0%, #00aeff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Multi-Cloud Environments
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.3rem',
            color: '#94a3b8',
            maxWidth: '800px',
            margin: '0 auto 3rem',
            lineHeight: '1.8'
          }}>
            Transform fragmented security data from AWS, Azure, and GCP into actionable insights using advanced Graph Neural Networks and AI-powered threat detection.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            marginBottom: '4rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '1.25rem 2.5rem',
                background: 'linear-gradient(135deg, #64ffda 0%, #00aeff 100%)',
                border: 'none',
                color: '#0a192f',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '1.1rem',
                boxShadow: '0 10px 30px rgba(100, 255, 218, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 15px 40px rgba(100, 255, 218, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(100, 255, 218, 0.3)';
              }}
            >
              Start Free Trial →
            </button>
            <button
              onClick={() => {
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                padding: '1.25rem 2.5rem',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '2px solid #64ffda',
                color: '#64ffda',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '1.1rem',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#64ffda';
                e.target.style.color = '#0a192f';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(30, 41, 59, 0.8)';
                e.target.style.color = '#64ffda';
              }}
            >
              Learn More
            </button>
          </div>

          {/* Feature Badges */}
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {[
              { icon: '🤖', text: 'AI-Powered Detection' },
              { icon: '☁️', text: 'Multi-Cloud Support' },
              { icon: '📊', text: 'Real-time Analytics' },
              { icon: '🔒', text: 'Enterprise Security' }
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(100, 255, 218, 0.2)',
                  borderRadius: '50px',
                  padding: '0.75rem 1.5rem',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(100, 255, 218, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(100, 255, 218, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{feature.icon}</span>
                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(10, 25, 47, 0.95)',
        padding: '5rem 2rem',
        borderTop: '1px solid rgba(100, 255, 218, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#e2e8f0',
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            Why CloudGraph Sentinel?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {[
              {
                icon: '🔍',
                title: 'Intelligent Threat Hunting',
                description: 'Advanced Graph Neural Networks analyze complex relationships between security events to detect sophisticated threats.'
              },
              {
                icon: '🌐',
                title: 'Multi-Cloud Unification',
                description: 'Seamlessly integrate security data from AWS, Azure, and GCP into a single, comprehensive view.'
              },
              {
                icon: '⚡',
                title: 'Real-Time Detection',
                description: 'Continuous monitoring and instant alerts for critical security incidents across all your cloud infrastructure.'
              },
              {
                icon: '📈',
                title: 'Actionable Insights',
                description: 'Transform raw security data into clear, prioritized recommendations with context-aware analysis.'
              },
              {
                icon: '🔐',
                title: 'Zero Trust Architecture',
                description: 'Built on enterprise-grade security principles with end-to-end encryption and compliance support.'
              },
              {
                icon: '🎯',
                title: 'Automated Response',
                description: 'AI-driven playbooks automatically respond to common threats, reducing response time from hours to seconds.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(100, 255, 218, 0.1)',
                  borderRadius: '16px',
                  padding: '2rem',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(100, 255, 218, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(100, 255, 218, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#e2e8f0',
                  marginBottom: '1rem'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '1rem',
                  color: '#94a3b8',
                  lineHeight: '1.6'
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(10, 25, 47, 0.95)',
        padding: '5rem 2rem',
        textAlign: 'center',
        borderTop: '1px solid rgba(100, 255, 218, 0.1)'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#e2e8f0',
          marginBottom: '1.5rem'
        }}>
          Ready to Secure Your Cloud?
        </h2>
        <p style={{
          fontSize: '1.2rem',
          color: '#94a3b8',
          maxWidth: '600px',
          margin: '0 auto 2.5rem',
          lineHeight: '1.6'
        }}>
          Join leading enterprises in protecting their multi-cloud infrastructure with AI-powered threat intelligence.
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            padding: '1.25rem 3rem',
            background: 'linear-gradient(135deg, #64ffda 0%, #00aeff 100%)',
            border: 'none',
            color: '#0a192f',
            borderRadius: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '1.2rem',
            boxShadow: '0 10px 30px rgba(100, 255, 218, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 15px 40px rgba(100, 255, 218, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 10px 30px rgba(100, 255, 218, 0.3)';
          }}
        >
          Get Started Free →
        </button>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(10, 25, 47, 0.98)',
        padding: '2rem',
        textAlign: 'center',
        borderTop: '1px solid rgba(100, 255, 218, 0.1)',
        color: '#94a3b8'
      }}>
        <p>© 2025 CloudGraph Sentinel. All rights reserved.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Enterprise Cybersecurity Platform for Multi-Cloud Environments
        </p>
      </footer>
    </div>
  );
};

export default Landing;