import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Initialize Vanta.js effect
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
            points: 8.0,
            maxDistance: 20.0,
            spacing: 15.0
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      
      if (data.success) {
        setSuccess(true);
        setEmail('');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send reset email. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Vanta.js Background */}
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
      
      {/* Fallback gradient background */}
      <div className="login-bg" style={{ zIndex: 1 }}></div>
      
      {/* Forgot Password Container */}
      <div className="login-container" style={{ 
        position: 'relative',
        zIndex: 10,
        maxWidth: '420px',
        padding: '2.5rem',
        margin: '1rem',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="logo" style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '0.5rem',
            textAlign: 'center'
          }}>
            🔐
          </div>
          <h1 style={{ 
            fontSize: '1.75rem',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em',
            textAlign: 'center'
          }}>
            Forgot Password?
          </h1>
          <p className="tagline" style={{ 
            fontSize: '0.9rem',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            {success 
              ? "Check your email for reset instructions"
              : "Enter your email to reset your password"
            }
          </p>
        </div>
        
        {error && (
          <div className="error-message" style={{
            animation: 'slideIn 0.3s ease-out',
            padding: '0.75rem',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#fca5a5'
          }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              textAlign: 'center',
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              ✉️
            </div>
            <p style={{
              color: '#86efac',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.85rem',
              textAlign: 'center'
            }}>
              Please check your inbox and follow the link to reset your password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="email" style={{ 
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                display: 'block',
                color: '#e2e8f0'
              }}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#64ffda';
                  e.target.style.boxShadow = '0 0 0 3px rgba(100, 255, 218, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#334155';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: loading ? '#475569' : 'linear-gradient(135deg, #64ffda 0%, #00aeff 100%)',
                color: loading ? '#94a3b8' : '#0a192f',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 25px rgba(100, 255, 218, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #94a3b8',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }}></div>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}
        
        <div style={{ 
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(100, 255, 218, 0.1)',
          textAlign: 'center',
          fontSize: '0.9rem',
          color: '#94a3b8'
        }}>
          {success ? (
            <>
              Didn't receive the email?{' '}
              <button
                onClick={() => setSuccess(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64ffda',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Try again
              </button>
            </>
          ) : (
            <>
              Remember your password?{' '}
              <Link to="/login" style={{
                color: '#64ffda',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}>
                Back to Login →
              </Link>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;