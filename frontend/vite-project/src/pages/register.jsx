import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import '../styles/auth.css';
import axios from 'axios';  

const backendurl = import.meta.env.VITE_BACKEND_URL;

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    const { fullName, email, company, password, confirmPassword } = formData;
  
    if (!fullName || !email || !company || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
  
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
  
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
  
    try {
      setLoading(true);
      const result = await register(fullName, email, company, password);
  
      setLoading(false);
  
      if (result.success) {
        navigate('/cloud-connection'); // ✅ Redirect after success
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Server error, try again later');
    }
  };
  

  return (
    <div className="login-page">
      <div className="login-bg"></div>
      <div className="login-container" style={{ 
        maxWidth: '680px',
        padding: '2.5rem',
        margin: '1rem'
      }}>
        <div className="logo" style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '2rem', 
            marginBottom: '0.25rem',
            background: 'linear-gradient(135deg, #64ffda 0%, #00aeff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            
          </div>
          <h1 style={{ 
            fontSize: '1.5rem',
            marginBottom: '0.25rem',
            letterSpacing: '-0.025em'
          }}>
            CloudGraph Sentinel
          </h1>
          <p className="tagline" style={{ 
            fontSize: '0.85rem',
            color: '#94a3b8'
          }}>
            Create Your Account
          </p>
        </div>
        
        {error && (
          <div className="error-message" style={{
            animation: 'slideIn 0.3s ease-out',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            <span style={{ marginRight: '0.5rem' }}>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label htmlFor="fullName" style={{ 
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ color: '#64ffda' }}></span>
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                required
                style={{
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label htmlFor="email" style={{ 
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ color: '#64ffda' }}></span>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
                style={{
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="company" style={{ 
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ color: '#64ffda' }}></span>
              Company
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your company name"
              required
              style={{
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="password" style={{ 
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ color: '#64ffda' }}></span>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              required
              style={{
                transition: 'all 0.3s ease'
              }}
            />
            {formData.password && formData.password.length < 6 && (
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#fca5a5', 
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>⚠️</span>
                Password must be at least 6 characters
              </p>
            )}
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label htmlFor="confirmPassword" style={{ 
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ color: '#64ffda' }}></span>
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              style={{
                transition: 'all 0.3s ease'
              }}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#fca5a5', 
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span></span>
                Passwords do not match
              </p>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#86efac', 
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>✓</span>
                Passwords match
              </p>
            )}
          </div>
          
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="btn-primary" 
            disabled={loading}
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #0a192f',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }}></div>
                Creating Account...
              </>
            ) : (
              <>
                <span></span>
                Create Account
              </>
            )}
          </button>
        </form>
        
        <div className="signup-link" style={{ 
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(100, 255, 218, 0.1)'
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}>
            Log In →
          </Link>
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
        
        .form-group input:focus {
          transform: translateY(-1px);
        }
        
        .signup-link a:hover {
          letter-spacing: 0.025em;
        }
        
        @media (max-width: 640px) {
          .login-container {
            padding: 2rem !important;
            margin: 1rem !important;
          }
          
          form > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
export default Register;