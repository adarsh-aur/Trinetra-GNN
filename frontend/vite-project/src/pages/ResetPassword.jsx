import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { token } = useParams();
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, {
        password
      });
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reset password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div ref={vantaRef} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }} />
      
      <div className="login-bg" style={{ zIndex: 1 }}></div>
      
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
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            🔑
          </div>
          <h1 style={{ 
            fontSize: '1.75rem',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em',
            textAlign: 'center'
          }}>
            Reset Password
          </h1>
          <p className="tagline" style={{ 
            fontSize: '0.9rem',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            {success ? "Password reset successful!" : "Enter your new password"}
          </p>
        </div>
        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            color: '#fca5a5',
            fontSize: '0.9rem'
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
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: '#86efac', marginBottom: '1rem' }}>
              Your password has been reset successfully!
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Redirecting to login page...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ 
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                display: 'block',
                color: '#e2e8f0'
              }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '1rem'
                }}
              />
              {password && password.length < 6 && (
                <p style={{ 
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  marginTop: '0.25rem'
                }}>
                  Password must be at least 6 characters
                </p>
              )}
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                display: 'block',
                color: '#e2e8f0'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '1rem'
                }}
              />
              {confirmPassword && password !== confirmPassword && (
                <p style={{ 
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  marginTop: '0.25rem'
                }}>
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && password.length >= 6 && (
                <p style={{ 
                  fontSize: '0.75rem',
                  color: '#86efac',
                  marginTop: '0.25rem'
                }}>
                  ✓ Passwords match
                </p>
              )}
            </div>
            
            <button 
              type="submit" 
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
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
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
          <Link to="/login" style={{
            color: '#64ffda',
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;