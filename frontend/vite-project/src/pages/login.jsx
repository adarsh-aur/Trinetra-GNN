import { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import '../styles/auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Vanta.js refs
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  // Initialize Vanta.js effect
  useEffect(() => {
    // Dynamically import THREE and Vanta
    const loadVanta = async () => {
      try {
        // Import THREE.js
        const THREE = await import('three');
        
        // Import Vanta NET effect
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
        // Fallback: Use CSS gradient if Vanta fails to load
      }
    };

    loadVanta();

    // Cleanup function
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
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/cloud-connection');
    } else {
      setError(result.message);
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
      
      {/* Fallback gradient background (in case Vanta doesn't load) */}
      <div className="login-bg" style={{ zIndex: 1 }}></div>
      
      {/* Login Container */}
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
          <h1 style={{ 
            fontSize: '1.75rem',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em'
          }}>
            CloudGraph Sentinel
          </h1>
          <p className="tagline" style={{ 
            fontSize: '0.9rem',
            color: '#94a3b8'
          }}>
            Intelligent Threat Hunting for Multi-Cloud Environments
          </p>
        </div>
        
        {error && (
          <div className="error-message" style={{
            animation: 'slideIn 0.3s ease-out',
            padding: '0.75rem',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email" style={{ 
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              display: 'block'
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
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ 
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              display: 'block'
            }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
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
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>
        
        <div className="signup-link" style={{ 
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(100, 255, 218, 0.1)',
          fontSize: '0.9rem'
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}>
            Sign Up →
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
      `}</style>
    </div>
  );
};

export default Login;


// import { useState, useContext } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import AuthContext from '../context/AuthContext';
// import '../styles/auth.css';

// const Login = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
  
//   const { login } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
    
//     if (!email || !password) {
//       setError('Please enter both email and password');
//       return;
//     }

//     setLoading(true);
//     const result = await login(email, password);
//     setLoading(false);

//     if (result.success) {
//       navigate('/cloud-connection');
//     } else {
//       setError(result.message);
//     }
//   };

//   return (
//     <div className="login-page">
//       <div className="login-bg"></div>
//       <div className="login-container">
//         <div className="logo">
//           <h1>CloudGraph Sentinel</h1>
//           <p className="tagline">Intelligent Threat Hunting for Multi-Cloud Environments</p>
//         </div>
        
//         {error && (
//           <div className="error-message">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleSubmit}>
//           <div className="form-group">
//             <label htmlFor="email">Email Address</label>
//             <input
//               type="email"
//               id="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </div>
          
//           <div className="form-group">
//             <label htmlFor="password">Password</label>
//             <input
//               type="password"
//               id="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//           </div>
          
//           <button type="submit" className="btn-primary" disabled={loading}>
//             {loading ? 'Logging in...' : 'Log In'}
//           </button>
//         </form>
        
//         <div className="signup-link">
//           Don't have an account? <Link to="/register">Sign Up</Link>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;