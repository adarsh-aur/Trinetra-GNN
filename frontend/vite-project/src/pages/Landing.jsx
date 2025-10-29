import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// --- COLOR CONSTANTS ---
const BASE_BG_COLOR = 'rgba(0, 0, 10, 0.98)';
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)'; 
const ACCENT_VIOLET = '#8A2BE2'; // Quantum Violet (Purple)
const TEXT_CYPHER = '#00FFFF'; // Neon Cypher Cyan (Accent)
const SHADOW_CYAN = '0 0 50px rgba(0, 255, 255, 0.9)'; 
const BORDER_CYPHER = '2px solid #00FFFF';
const TEXT_WHITE = '#E2E8F0';
const TEXT_NEON_GREEN = '#00FF00';

const Landing = () => {
    const navigate = useNavigate();
    const mountRef = useRef(null);
    const animationFrameRef = useRef();
    const mouseRef = useRef(new THREE.Vector2());
    const raycaster = useRef(new THREE.Raycaster());
    
    const [isMobile, setIsMobile] = useState(false);

    // --- Memoized Handlers ---
    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }, []);

    const targetRotation = useRef({ x: 0, y: 0 });
    
    const handleMouseMove = useCallback((event) => {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        mouseRef.current.x = mouseX;
        mouseRef.current.y = mouseY;
        
        targetRotation.current.x = mouseY * 0.15; 
        targetRotation.current.y = mouseX * 0.15;
    }, []);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // --- DECLARE Three.js VARIABLES IN INNER SCOPE ---
        let renderer, camera;
        let nodes = [];
        let lines = [];
        let lineGeometries = [];
        let lineMaterials = [];
        let starGeometry, pointMaterial, particleGeometry, particleMaterial;
        let nodeGeometry, nodeMaterial, lineBaseMaterial;
        let nebulaGeometry, nebulaMaterial, nebulaParticles;
        let stars, particles;
        let dataPackets = []; 
        let clouds = [];
        let gridLines = [];
        const highlightedNodes = new Set();
        
        // --- BASE GEOMETRIES AND MATERIALS (Fixed for Disposal) ---
        const packetGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const packetMaterial = new THREE.MeshPhongMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.8, emissive: 0x00FFFF, emissiveIntensity: 0.5 });
        const cloudGeometry = new THREE.SphereGeometry(3, 8, 8); 
        const gridMaterialBase = new THREE.LineBasicMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending });
        const cloudMaterialBase = new THREE.MeshPhongMaterial({ color: 0x8A2BE2, transparent: true, opacity: 0.15, emissive: 0x8A2BE2, emissiveIntensity: 0.2 });

        // --- SETUP ---
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.003);

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
        camera.position.set(0, 0, 50);

        renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        // --- LIGHTS ---
        const ambientLight = new THREE.AmbientLight(0x8A2BE2, 0.3);
        scene.add(ambientLight);
        const pointLight1 = new THREE.PointLight(0x00FFFF, 2, 100);
        pointLight1.position.set(100, 100, 100);
        scene.add(pointLight1);
        const pointLight2 = new THREE.PointLight(0x8A2BE2, 2, 100);
        pointLight2.position.set(-20, -20, 20);
        scene.add(pointLight2);

        // ENHANCED STARFIELD
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
            const material = new THREE.PointsMaterial({ size, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
            return new THREE.Points(geometry, material);
        };

        stars = new THREE.Group();
        stars.add(createStarLayer(isMobile ? 1000 : 3000, 80, 0.8, 0xFFFFFF));
        stars.add(createStarLayer(isMobile ? 500 : 1500, 100, 0.5, 0x8A2BE2));
        stars.add(createStarLayer(isMobile ? 500 : 1500, 120, 0.3, 0x00FFFF));
        starGeometry = stars.children[0].geometry; 
        pointMaterial = stars.children[0].material; 
        scene.add(stars);

        // NEBULA PARTICLES
        const nebulaCount = isMobile ? 200 : 600;
        nebulaGeometry = new THREE.BufferGeometry();
        const nebulaPositions = new Float32Array(nebulaCount * 3);
        const nebulaColors = new Float32Array(nebulaCount * 3);
        for (let i = 0; i < nebulaCount; i++) {
            const i3 = i * 3;
            const radius = 40 + Math.random() * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            nebulaPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            nebulaPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            nebulaPositions[i3 + 2] = radius * Math.cos(phi);
            const useViolet = Math.random() > 0.5;
            nebulaColors[i3] = useViolet ? 0.54 : 0;
            nebulaColors[i3 + 1] = useViolet ? 0.17 : 1;
            nebulaColors[i3 + 2] = useViolet ? 0.89 : 1;
        }
        nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
        nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
        nebulaMaterial = new THREE.PointsMaterial({ size: 4, vertexColors: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
        nebulaParticles = new THREE.Points(nebulaGeometry, nebulaMaterial);
        scene.add(nebulaParticles);

        // 3D NETWORK NODES
        const nodeCount = isMobile ? 60 : 150;
        nodeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        nodeMaterial = new THREE.MeshPhongMaterial({ color: 0x8A2BE2, transparent: true, opacity: 0.9, emissive: 0x8A2BE2, emissiveIntensity: 0.5, shininess: 100 });
        
        for (let i = 0; i < nodeCount; i++) {
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
            const radius = 15 + Math.random() * 25;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            node.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
            node.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.015, (Math.random() - 0.5) * 0.015, (Math.random() - 0.5) * 0.015);
            node.userData.baseScale = 1 + Math.random() * 0.3;
            node.userData.pulsePhase = Math.random() * Math.PI * 2;
            nodes.push(node);
            scene.add(node);
        }

        // INTERACTIVE CONNECTION LINES
        lineBaseMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00FFFF, transparent: true, opacity: 0.4, linewidth: 2, blending: THREE.AdditiveBlending 
        });

        // GLOWING PARTICLES
        const particleCount = isMobile ? 150 : 400;
        particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = 30 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[i3 + 2] = radius * Math.cos(phi);
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleMaterial = new THREE.PointsMaterial({ size: 2, color: 0x8A2BE2, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);

        // DATA PACKETS
        const packetCount = isMobile ? 10 : 25;
        for (let i = 0; i < packetCount; i++) {
            const packet = new THREE.Mesh(packetGeometry, packetMaterial.clone());
            const radius = 20 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            packet.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
            packet.userData.targetIndex = Math.floor(Math.random() * nodeCount);
            packet.userData.speed = 0.02 + Math.random() * 0.03;
            dataPackets.push(packet);
            scene.add(packet);
        }

        // CLOUD STRUCTURES
        const cloudCount = isMobile ? 15 : 30;
        for (let i = 0; i < cloudCount; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterialBase.clone());
            const radius = 40 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            cloud.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
            cloud.userData.rotationSpeed = { x: (Math.random() - 0.5) * 0.005, y: (Math.random() - 0.5) * 0.005, z: (Math.random() - 0.5) * 0.005 };
            clouds.push(cloud);
            scene.add(cloud);
        }

        // SECURITY GRID
        const gridCount = isMobile ? 3 : 6;
        for (let i = 0; i < gridCount; i++) {
            const radius = 15 + i * 8;
            const segments = 64;
            const gridGeometry = new THREE.BufferGeometry();
            const gridPositions = [];
            for (let j = 0; j <= segments; j++) {
                const theta = (j / segments) * Math.PI * 2;
                gridPositions.push(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
            }
            gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
            const gridMaterial = gridMaterialBase.clone();
            const gridLine = new THREE.Line(gridGeometry, gridMaterial);
            gridLine.rotation.x = Math.PI / 2;
            gridLines.push(gridLine);
            scene.add(gridLine);
        }

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);
        window.addEventListener('resize', checkMobile);

        // ANIMATION LOOP
        let time = 0;
        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);
            time += 0.003;

            // Smooth camera rotation following mouse
            scene.rotation.x += (targetRotation.current.x - scene.rotation.x) * 0.05;
            scene.rotation.y += (targetRotation.current.y - scene.rotation.y) * 0.05;
            
            stars.rotation.x += 0.0003;
            stars.rotation.y += 0.0005;
            
            nebulaParticles.rotation.y += 0.0002;
            nebulaParticles.rotation.z += 0.0001;
            
            particles.rotation.y += 0.003;
            particles.rotation.z += 0.001;

            // Animate data packets moving between nodes
            dataPackets.forEach((packet, i) => {
                const targetNode = nodes[packet.userData.targetIndex];
                if (targetNode) {
                    const direction = new THREE.Vector3().subVectors(targetNode.position, packet.position).normalize();
                    packet.position.add(direction.multiplyScalar(packet.userData.speed));
                    
                    packet.rotation.x += 0.05;
                    packet.rotation.y += 0.05;
                    
                    if (packet.position.distanceTo(targetNode.position) < 1) {
                        packet.userData.targetIndex = Math.floor(Math.random() * nodes.length);
                        targetNode.scale.setScalar(targetNode.userData.baseScale * 1.3);
                    }
                }
                packet.material.emissiveIntensity = 0.5 + Math.sin(time * 5 + i) * 0.3;
            });

            // Animate clouds
            clouds.forEach(cloud => {
                cloud.rotation.x += cloud.userData.rotationSpeed.x;
                cloud.rotation.y += cloud.userData.rotationSpeed.y;
                cloud.rotation.z += cloud.userData.rotationSpeed.z;
                const scale = 1 + Math.sin(time + cloud.position.x) * 0.05;
                cloud.scale.setScalar(scale);
            });

            // Animate grid lines
            gridLines.forEach((grid, i) => {
                grid.rotation.z += 0.0005 * (i % 2 === 0 ? 1 : -1);
                grid.material.opacity = 0.05 + Math.sin(time * 2 + i) * 0.05;
            });

            // Raycasting for mouse interaction
            raycaster.current.setFromCamera(mouseRef.current, camera);
            const intersects = raycaster.current.intersectObjects(nodes);
            highlightedNodes.clear();
            
            if (intersects.length > 0) {
                const hoveredNode = intersects[0].object;
                highlightedNodes.add(hoveredNode);
                hoveredNode.material.color.setHex(0x00FFFF);
                hoveredNode.material.emissive.setHex(0x00FFFF);
                hoveredNode.material.emissiveIntensity = 1.5;
                
                nodes.forEach(node => {
                    if (node !== hoveredNode) {
                        const distance = hoveredNode.position.distanceTo(node.position);
                        if (distance < 12) {
                            highlightedNodes.add(node);
                            node.material.color.setHex(0x00FFFF);
                            node.material.emissive.setHex(0x00FFFF);
                            node.material.emissiveIntensity = 0.8;
                        }
                    }
                });
            }
            
            // Animate nodes with realistic 3D movement
            nodes.forEach((node, i) => {
                node.position.add(node.userData.velocity);
                
                ['x', 'y', 'z'].forEach(axis => { if (Math.abs(node.position[axis]) > 30) { node.userData.velocity[axis] *= -1; } });
                
                const pulseScale = node.userData.baseScale + Math.sin(time * 3 + node.userData.pulsePhase) * 0.15;
                node.scale.setScalar(pulseScale);
                
                // Reset non-highlighted nodes
                if (!highlightedNodes.has(node)) {
                    node.material.color.setHex(0x8A2BE2);
                    node.material.emissive.setHex(0x8A2BE2);
                    node.material.emissiveIntensity = 0.5;
                    node.material.opacity = 0.7 + Math.sin(time * 2 + i) * 0.2;
                }
            });

            // Update interactive connections
            lines.forEach(line => scene.remove(line));
            lines.length = 0;
            lineGeometries.forEach(g => g.dispose());
            lineGeometries = [];
            lineMaterials.forEach(m => m.dispose());
            lineMaterials = [];

            if (!isMobile) {
                const connectionDistanceThreshold = 12;
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        const distance = nodes[i].position.distanceTo(nodes[j].position);
                        if (distance < connectionDistanceThreshold) {
                            const opacity = (connectionDistanceThreshold - distance) / connectionDistanceThreshold;
                            const tempMaterial = lineBaseMaterial.clone();
                            
                            if (highlightedNodes.has(nodes[i]) || highlightedNodes.has(nodes[j])) {
                                tempMaterial.opacity = opacity * 1.2;
                                tempMaterial.color.setHex(0x00FFFF);
                                tempMaterial.linewidth = 3;
                            } else {
                                tempMaterial.opacity = opacity * 0.5;
                                tempMaterial.color.setHex(0x8A2BE2); 
                                tempMaterial.linewidth = 2;
                            }
                            
                            const lineGeometry = new THREE.BufferGeometry().setFromPoints([ nodes[i].position, nodes[j].position ]);
                            
                            lineGeometries.push(lineGeometry);
                            lineMaterials.push(tempMaterial);
                            
                            const line = new THREE.Line(lineGeometry, tempMaterial);
                            scene.add(line);
                            lines.push(line);
                        }
                    }
                }
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('resize', checkMobile);

            if (renderer.domElement) { mount.removeChild(renderer.domElement); }
            
            renderer.dispose();
            
            // Dispose of base resources
            starGeometry?.dispose();
            pointMaterial?.dispose();
            nodeGeometry.dispose();
            nodeMaterial.dispose();
            lineBaseMaterial.dispose();
            packetGeometry.dispose();
            packetMaterial.dispose();
            nebulaMaterial.dispose();
            nebulaGeometry.dispose();
            cloudGeometry.dispose();
            cloudMaterialBase.dispose();

            // Dispose of dynamic resources
            lineGeometries.forEach(g => g.dispose());
            lineMaterials.forEach(m => m.dispose());
            nodes.forEach(node => { node.geometry?.dispose(); node.material?.dispose(); });
            dataPackets.forEach(packet => { packet.geometry?.dispose(); packet.material?.dispose(); });
            clouds.forEach(cloud => { cloud.geometry?.dispose(); cloud.material?.dispose(); });
            gridLines.forEach(grid => { grid.geometry?.dispose(); grid.material?.dispose(); });
        };
    }, [isMobile, handleMouseMove, checkMobile]);

    // Function to handle smooth scrolling
    const smoothScroll = (id) => (e) => {
        e.preventDefault();
        document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#000000' }}> 
            
            {/* Three.js Background Container (Fixed to cover entire viewport) */}
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
            
            {/* Gradient Overlay for stability */}
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
            
            {/* Content Container (z-index 10 is on all main content) */}
            <div style={{ position: 'relative', zIndex: 10 }}> 
                
                {/* Navigation (Sticky Nav with Full Links) */}
                <nav style={{
                    padding: '1.5rem 2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: BASE_BG_COLOR_HIGH_OPACITY,
                    backdropFilter: 'blur(25px)',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.8)',
                    position: 'sticky', 
                    top: 0,
                    zIndex: 20
                }}>
                    {/* LOGO */}
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: ACCENT_VIOLET,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        textShadow: '0 0 15px #8A2BE2',
                        cursor: 'pointer'
                    }} onClick={smoothScroll('hero-top')}>
                        TRINETRA
                    </div>

                    {/* --- FULL NAVIGATION LINKS (ALL EQUAL SIZE) --- */}
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        
                        {/* 1. SOLUTIONS (Redirects to CTA/Footer Area) */}
                        <a 
                            href="#cta-section" 
                            onClick={smoothScroll('cta-section')}
                            style={{ 
                                color: TEXT_WHITE, 
                                textShadow: '0 0 5px #8A2BE2', 
                                transition: 'color 0.3s', 
                                cursor: 'pointer', 
                                fontWeight: 600,
                                textDecoration: 'none' // Ensure no underline
                            }}
                            onMouseEnter={e => { e.target.style.color = TEXT_CYPHER; }}
                            onMouseLeave={e => { e.target.style.color = TEXT_WHITE; }}
                        >
                            Solutions
                        </a>
                        
                        {/* 2. DOCUMENTATION (Redirects to Features) */}
                        <a 
                            href="#features" 
                            onClick={smoothScroll('features')}
                            style={{ 
                                color: TEXT_WHITE, 
                                textShadow: '0 0 5px #8A2BE2', 
                                transition: 'color 0.3s', 
                                cursor: 'pointer', 
                                fontWeight: 600,
                                textDecoration: 'none'
                            }}
                            onMouseEnter={e => { e.target.style.color = TEXT_CYPHER; }}
                            onMouseLeave={e => { e.target.style.color = TEXT_WHITE; }}
                        >
                            Documentation
                        </a>
                        
                        {/* 3. ABOUT (Now an <a> link for consistent sizing) */}
                        <a
                            onClick={() => navigate('/about')} 
                            style={{ 
                                color: TEXT_WHITE, 
                                textShadow: '0 0 5px #8A2BE2', 
                                transition: 'color 0.3s', 
                                cursor: 'pointer', 
                                fontWeight: 600,
                                background: 'none',
                                border: 'none',
                                textDecoration: 'none'
                            }}
                            onMouseEnter={e => { e.target.style.color = TEXT_CYPHER; }}
                            onMouseLeave={e => { e.target.style.color = TEXT_WHITE; }}
                        >
                            About
                        </a>
                    </div>
                    
                    {/* AUTH BUTTONS */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* LOGIN BUTTON */}
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: ACCENT_VIOLET, 
                                border: `2px solid ${ACCENT_VIOLET}`,
                                color: TEXT_WHITE,
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontSize: '1rem',
                                boxShadow: '0 0 15px rgba(138, 43, 226, 0.5)' 
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(138, 43, 226, 0.8)';
                                e.target.style.boxShadow = '0 0 30px rgba(138, 43, 226, 1)'; 
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = ACCENT_VIOLET;
                                e.target.style.boxShadow = '0 0 15px rgba(138, 43, 226, 0.5)';
                            }}
                        >
                            Login
                        </button>
                        {/* REGISTER BUTTON (Unified Login/Register) */}
                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: TEXT_CYPHER, 
                                border: `2px solid ${TEXT_CYPHER}`,
                                color: BASE_BG_COLOR,
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontSize: '1rem',
                                boxShadow: '0 4px 20px rgba(0, 255, 255, 0.9)' 
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 40px rgba(0, 255, 255, 1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 20px rgba(0, 255, 255, 0.9)';
                            }}
                        >
                            Register
                        </button>
                    </div>
                </nav>
                
                {/* Hero Section */}
                <div id="hero-top" style={{ 
                    minHeight: 'calc(100vh - 100px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 6vw, 4rem)',
                            fontWeight: '800',
                            color: TEXT_WHITE,
                            marginBottom: '1.5rem',
                            lineHeight: '1.2',
                            textShadow: '0 0 10px #8A2BE2' 
                        }}>
                            Unified Threat Intelligence for
                            <span style={{
                                display: 'block',
                                color: TEXT_CYPHER,
                                textShadow: SHADOW_CYAN 
                            }}>
                                Cypher-Secure Environments
                            </span>
                        </h1>
                        <p style={{
                            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                            color: TEXT_WHITE,
                            maxWidth: '800px',
                            margin: '0 auto 3rem',
                            lineHeight: '1.8',
                            textShadow: '0 0 5px rgba(0, 0, 0, 1)'
                        }}>
                            Transform fragmented security data from AWS, Azure, and GCP and other cloud platforms into actionable insights, prediction, visualised graph using advanced Graph Neural Networks and AI-powered threat detection and solution.
                        </p>
                        {/* CTA Buttons (Vibrant, Full Color) */}
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
                                    background: ACCENT_VIOLET,
                                    border: `2px solid ${ACCENT_VIOLET}`,
                                    color: TEXT_WHITE,
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    boxShadow: '0 10px 40px rgba(138, 43, 226, 0.6)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-3px)';
                                    e.target.style.boxShadow = '0 15px 50px rgba(138, 43, 226, 0.9)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 10px 40px rgba(138, 43, 226, 0.6)';
                                }}
                            >
                                Start Free Trial →
                            </button>
                            <button
                                onClick={smoothScroll('features')}
                                style={{
                                    padding: '1.25rem 2.5rem',
                                    background: BASE_BG_COLOR_HIGH_OPACITY, 
                                    border: BORDER_CYPHER,
                                    color: TEXT_CYPHER,
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    backdropFilter: 'blur(10px)',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(0, 255, 255, 0.1)';
                                    e.target.style.boxShadow = '0 0 40px rgba(0, 255, 255, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = BASE_BG_COLOR_HIGH_OPACITY;
                                    e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
                                }}
                            >
                                Deep Dive
                            </button>
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: '1.5rem',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {[
                                { icon: '🌐', text: 'Unified Graph Visualization' },
                                { icon: '🤖', text: 'AI-Powered Detection' },
                                { icon: '☁️', text: 'Multi-Cloud Support' },
                                { icon: '📊', text: 'Real-time Analytics' },
                                { icon: '🔒', text: 'Enterprise Security Solutions' }
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        background: BASE_BG_COLOR_HIGH_OPACITY, 
                                        border: BORDER_CYPHER,
                                        borderRadius: '50px',
                                        padding: '0.75rem 1.5rem',
                                        backdropFilter: 'blur(10px)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 0 10px rgba(0, 0, 10, 0.5)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = TEXT_CYPHER;
                                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                                        e.currentTarget.style.boxShadow = '0 5px 30px rgba(0, 255, 255, 0.5)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = BORDER_CYPHER;
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 0, 10, 0.5)';
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem', color: TEXT_CYPHER }}>{feature.icon}</span>
                                    <span style={{ color: TEXT_WHITE, fontWeight: '500' }}>{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Features Section (Seamless, HIGH OPACITY BACKGROUND) */}
                <div id="features" style={{
                    background: BASE_BG_COLOR_HIGH_OPACITY, 
                    padding: '5rem 2rem',
                    backdropFilter: 'blur(15px)',
                    position: 'relative', 
                    zIndex: 10 
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            color: ACCENT_VIOLET,
                            textAlign: 'center',
                            marginBottom: '3rem',
                            textShadow: SHADOW_CYAN
                        }}>
                            The Core of Trinetra Defense 
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '2rem'
                        }}>
                            {[
                                { icon: '🔍', title: 'GNN Threat Hunting', description: 'Advanced Graph Neural Networks analyze complex relationships between security events to detect sophisticated threats.' },
                                { icon: '🌐', title: 'Cypher-Secure Unification', description: 'Seamlessly integrate security data from AWS, Azure, and GCP into a single, comprehensive view.' },
                                { icon: '⚡', title: 'Real-Time Detection', description: 'Continuous monitoring and instant alerts for critical security incidents across all your cloud infrastructure.' },
                                { icon: '📈', title: 'Actionable Insights', description: 'Transform raw security data into clear, prioritized recommendations with context-aware analysis.' },
                                { icon: '🔐', title: 'Zero Trust Architecture', description: 'Built on enterprise-grade security principles with end-to-end encryption and compliance support.' },
                                { icon: '🎯', title: 'Automated Response', description: 'AI-driven playbooks automatically respond to common threats, reducing response time from hours to seconds.' }
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: BASE_BG_COLOR_HIGH_OPACITY, 
                                        border: BORDER_CYPHER,
                                        borderRadius: '16px',
                                        padding: '2rem',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(10px)',
                                        boxShadow: '0 0 10px rgba(0, 0, 10, 0.5)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = TEXT_CYPHER;
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 255, 255, 0.5)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = BORDER_CYPHER;
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 0, 10, 0.5)';
                                    }}
                                >
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem', color: TEXT_CYPHER }}>{feature.icon}</div>
                                    <h3 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '600',
                                        color: TEXT_WHITE,
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
                
                {/* CTA Section (Seamless, HIGH OPACITY BACKGROUND) */}
                <div id="cta-section" style={{
                    background: BASE_BG_COLOR_HIGH_OPACITY,
                    padding: '5rem 2rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(15px)',
                    position: 'relative', 
                    zIndex: 10
                }}>
                    <h2 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: ACCENT_VIOLET,
                        marginBottom: '1.5rem',
                        textShadow: SHADOW_CYAN
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
                            background: ACCENT_VIOLET,
                            border: `2px solid ${ACCENT_VIOLET}`,
                            color: TEXT_WHITE,
                            borderRadius: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            boxShadow: '0 10px 40px rgba(138, 43, 226, 0.6)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-3px)';
                            e.target.style.boxShadow = '0 15px 50px rgba(138, 43, 226, 0.9)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 10px 40px rgba(138, 43, 226, 0.6)';
                        }}
                    >
                        Initiate Security Quantum Protocol →
                    </button>
                </div>
                
                {/* Footer (Seamless, HIGH OPACITY BACKGROUND) */}
                <footer style={{
                    background: BASE_BG_COLOR_HIGH_OPACITY,
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    backdropFilter: 'blur(15px)',
                    position: 'relative', 
                    zIndex: 10
                }}>
                    <p style={{ color: TEXT_NEON_GREEN, textShadow: '0 0 15px #00FF00' }}>© 2025 TRINETRA. All rights reserved</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Enterprise Cybersecurity Platform for Multi-Cloud Environments
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Landing;