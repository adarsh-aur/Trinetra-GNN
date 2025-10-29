import { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import * as THREE from 'three';

// --- COLOR CONSTANTS (Matching Login.jsx) ---
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)';
const ACCENT_VIOLET = '#8A2BE2';
const TEXT_CYPHER = '#00FFFF';
const TEXT_WHITE = '#E2E8F0';

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
    const [isMobile, setIsMobile] = useState(false);
    
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const mountRef = useRef(null);
    const animationFrameRef = useRef();

    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
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
                navigate('/cloud-connection');
            } else {
                setError(result.message || 'Registration failed');
            }
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || 'Server error, try again later');
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.9rem 1.2rem',
        borderRadius: '10px',
        border: `2px solid ${ACCENT_VIOLET}80`,
        background: 'rgba(10, 5, 20, 0.6)',
        color: TEXT_WHITE,
        outline: 'none',
        transition: 'all 0.3s ease',
        fontSize: '1rem',
        fontWeight: '500',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: TEXT_WHITE,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    };

    return (
        <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100vw',
            position: 'relative',
            overflow: 'hidden',
            background: '#000000',
            padding: '2rem 1rem'
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
            
            <div style={{
                maxWidth: '720px',
                width: '100%',
                padding: '3rem 2.5rem',
                borderRadius: '20px',
                background: BASE_BG_COLOR_HIGH_OPACITY,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${ACCENT_VIOLET}40`,
                border: `1px solid ${ACCENT_VIOLET}`,
                position: 'relative',
                zIndex: 10,
                animation: 'slideUp 0.6s ease-out'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '60px',
                    height: '60px',
                    borderTop: `3px solid ${TEXT_CYPHER}`,
                    borderLeft: `3px solid ${TEXT_CYPHER}`,
                    borderRadius: '20px 0 0 0',
                    boxShadow: `0 0 20px ${TEXT_CYPHER}`
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '60px',
                    height: '60px',
                    borderBottom: `3px solid ${TEXT_CYPHER}`,
                    borderRight: `3px solid ${TEXT_CYPHER}`,
                    borderRadius: '0 0 20px 0',
                    boxShadow: `0 0 20px ${TEXT_CYPHER}`
                }} />

                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        marginBottom: '0.5rem',
                        letterSpacing: '0.1em',
                        color: ACCENT_VIOLET,
                        textShadow: `0 0 20px ${ACCENT_VIOLET}`,
                        animation: 'glow 2s ease-in-out infinite'
                    }}>
                         TRINETRA
                    </h1>
                    <p style={{
                        fontSize: '0.95rem',
                        color: '#94a3b8',
                        fontWeight: '500',
                        textShadow: '0 0 10px rgba(0, 0, 0, 0.8)'
                    }}>
                        Create Your Trinetra Account
                    </p>
                </div>
                
                {error && (
                    <div style={{
                        padding: '1rem',
                        fontSize: '0.9rem',
                        marginBottom: '1.5rem',
                        border: `1px solid ${TEXT_CYPHER}`,
                        background: 'rgba(0, 255, 255, 0.05)',
                        color: TEXT_CYPHER,
                        borderRadius: '10px',
                        animation: 'slideIn 0.3s ease-out',
                        boxShadow: `0 0 15px ${TEXT_CYPHER}40`,
                        textAlign: 'center',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                        <span>⚠️</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                        gap: '1.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div>
                            <label htmlFor="fullName" style={labelStyle}>
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
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = TEXT_CYPHER;
                                    e.target.style.boxShadow = `0 0 20px ${TEXT_CYPHER}60`;
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = `${ACCENT_VIOLET}80`;
                                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="email" style={labelStyle}>
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
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = TEXT_CYPHER;
                                    e.target.style.boxShadow = `0 0 20px ${TEXT_CYPHER}60`;
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = `${ACCENT_VIOLET}80`;
                                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            />
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="company" style={labelStyle}>
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
                            style={inputStyle}
                            onFocus={(e) => {
                                e.target.style.borderColor = TEXT_CYPHER;
                                e.target.style.boxShadow = `0 0 20px ${TEXT_CYPHER}60`;
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = `${ACCENT_VIOLET}80`;
                                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        />
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="password" style={labelStyle}>
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
                            style={inputStyle}
                            onFocus={(e) => {
                                e.target.style.borderColor = TEXT_CYPHER;
                                e.target.style.boxShadow = `0 0 20px ${TEXT_CYPHER}60`;
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = `${ACCENT_VIOLET}80`;
                                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        />
                        {formData.password && formData.password.length < 6 && (
                            <p style={{ 
                                fontSize: '0.8rem', 
                                color: '#fca5a5', 
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: '600'
                            }}>
                                <span>⚠️</span>
                                Password must be at least 6 characters
                            </p>
                        )}
                    </div>
                    
                    <div style={{ marginBottom: '2rem' }}>
                        <label htmlFor="confirmPassword" style={labelStyle}>
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
                            style={inputStyle}
                            onFocus={(e) => {
                                e.target.style.borderColor = TEXT_CYPHER;
                                e.target.style.boxShadow = `0 0 20px ${TEXT_CYPHER}60`;
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = `${ACCENT_VIOLET}80`;
                                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        />
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p style={{ 
                                fontSize: '0.8rem', 
                                color: '#fca5a5', 
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: '600'
                            }}>
                                <span>❌</span>
                                Passwords do not match
                            </p>
                        )}
                        {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                            <p style={{ 
                                fontSize: '0.8rem', 
                                color: '#86efac', 
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: '600'
                            }}>
                                <span>✅</span>
                                Passwords match
                            </p>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            border: 'none',
                            borderRadius: '10px',
                            background: `linear-gradient(135deg, ${ACCENT_VIOLET} 0%, ${TEXT_CYPHER} 100%)`,
                            color: TEXT_WHITE,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            boxShadow: `0 10px 30px ${ACCENT_VIOLET}60`,
                            opacity: loading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = `0 15px 40px ${ACCENT_VIOLET}80`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = `0 10px 30px ${ACCENT_VIOLET}60`;
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    border: `3px solid ${TEXT_WHITE}`,
                                    borderTop: '3px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.6s linear infinite'
                                }} />
                                Creating Account...
                            </>
                        ) : (
                            <>
                                Create Account
                            </>
                        )}
                    </button>
                </form>
                
                <div style={{
                    marginTop: '2rem',
                    paddingTop: '2rem',
                    borderTop: `1px solid ${ACCENT_VIOLET}40`,
                    textAlign: 'center',
                    fontSize: '0.95rem',
                    color: '#94a3b8'
                }}>
                    Already have an account?{' '}
                    <Link 
                        to="/login"
                        style={{
                            color: TEXT_CYPHER,
                            textDecoration: 'none',
                            fontWeight: '700',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.color = ACCENT_VIOLET;
                            e.target.style.textShadow = `0 0 15px ${ACCENT_VIOLET}`;
                            e.target.style.letterSpacing = '0.05em';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = TEXT_CYPHER;
                            e.target.style.textShadow = 'none';
                            e.target.style.letterSpacing = 'normal';
                        }}
                    >
                        Log In →
                    </Link>
                </div>
            </div>
            
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @keyframes glow {
                    0%, 100% {
                        text-shadow: 0 0 20px ${ACCENT_VIOLET}, 0 0 40px ${ACCENT_VIOLET};
                    }
                    50% {
                        text-shadow: 0 0 30px ${TEXT_CYPHER}, 0 0 60px ${TEXT_CYPHER};
                    }
                }
                
                input::placeholder {
                    color: #64748b;
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
}

export default Register;