import React, { useState } from 'react';
import { Activity, TrendingUp, Users, Brain, ChevronRight, Sparkles, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const recentActivities = [];

  const handleGNNDemoClick = () => {
    navigate('/gnn-demo');
  };

  const handleUserProfileClick = () => {
    navigate('/user-profile');
  };

  const handleExploreClick = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <div className="dashboard-page">
      {recentActivities.length === 0 ? (
        /* Hero Section - Empty State */
        <div className="hero-section">
          {/* Background Elements */}
          <div className="hero-bg-elements">
            <div className="hero-grid"></div>
            
            {/* Floating Icons */}
            <div className="floating-icon">🧠</div>
            <div className="floating-icon">📊</div>
            <div className="floating-icon">🔒</div>
            <div className="floating-icon">⚡</div>
            <div className="floating-icon">🎯</div>
            <div className="floating-icon">💡</div>
            <div className="floating-icon">🚀</div>
            <div className="floating-icon">🔍</div>
            <div className="floating-icon">📈</div>
            <div className="floating-icon">🛡️</div>
            <div className="floating-icon">⭐</div>
            <div className="floating-icon">🎨</div>
            
            {/* Floating Shapes */}
            <div className="floating-shape shape-circle"></div>
            <div className="floating-shape shape-square"></div>
            <div className="floating-shape shape-triangle"></div>
            <div className="floating-shape shape-circle"></div>
            <div className="floating-shape shape-square"></div>
            
            {/* Data Streams */}
            <div className="data-stream"></div>
            <div className="data-stream"></div>
            <div className="data-stream"></div>
            <div className="data-stream"></div>
            <div className="data-stream"></div>
            
            {/* Pulse Dots */}
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
          </div>

          {/* Hero Content */}
          <div className="hero-content">
            <h1>Welcome to Your Dashboard</h1>
            <p>
              Your intelligent command center for monitoring, analyzing, and optimizing your data. 
              Start exploring features to unlock powerful insights and visualizations.
            </p>

            {/* Feature Badges */}
            <div className="hero-features">
              <div className="feature-badge">
                <span className="feature-icon">🧠</span>
                <span>AI-Powered Analytics</span>
              </div>
              <div className="feature-badge">
                <span className="feature-icon">📊</span>
                <span>Real-time Insights</span>
              </div>
              <div className="feature-badge">
                <span className="feature-icon">🔒</span>
                <span>Secure & Private</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleGNNDemoClick}
                className="primary-cta-button"
              >
                <Brain size={20} />
                <span>Try GNN Demo</span>
                <ChevronRight size={18} />
              </button>
              
              <button 
                onClick={handleUserProfileClick}
                className="secondary-cta-button"
              >
                <User size={20} />
                <span>View Profile</span>
              </button>

              <button 
                onClick={handleExploreClick}
                className="secondary-cta-button"
              >
                <Sparkles size={20} />
                <span>Explore Features</span>
              </button>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="scroll-indicator" onClick={handleExploreClick}>
            <div className="scroll-arrow"></div>
          </div>
        </div>
      ) : (
        /* Active Dashboard Content */
        <div className="dashboard-main" style={{ minHeight: '100vh', padding: '2rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#64ffda', marginBottom: '0.5rem' }}>
                Dashboard
              </h1>
              <p style={{ color: '#94a3b8' }}>Welcome back! Here's your overview</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Stat Card 1 */}
              <div className="glow-card" style={{ 
                background: 'rgba(30, 41, 59, 0.8)', 
                border: '1px solid rgba(100, 255, 218, 0.2)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(168, 85, 247, 0.2)',
                    borderRadius: '8px',
                    display: 'inline-flex'
                  }}>
                    <TrendingUp color="#c084fc" size={24} />
                  </div>
                  <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>+12.5%</span>
                </div>
                <h3 style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Growth</h3>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#e2e8f0' }}>2,847</p>
              </div>

              {/* Stat Card 2 */}
              <div className="glow-card" style={{ 
                background: 'rgba(30, 41, 59, 0.8)', 
                border: '1px solid rgba(100, 255, 218, 0.2)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(236, 72, 153, 0.2)',
                    borderRadius: '8px',
                    display: 'inline-flex'
                  }}>
                    <Users color="#f9a8d4" size={24} />
                  </div>
                  <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>+8.2%</span>
                </div>
                <h3 style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Active Users</h3>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#e2e8f0' }}>1,429</p>
              </div>

              {/* Stat Card 3 */}
              <div className="glow-card" style={{ 
                background: 'rgba(30, 41, 59, 0.8)', 
                border: '1px solid rgba(100, 255, 218, 0.2)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    display: 'inline-flex'
                  }}>
                    <Activity color="#60a5fa" size={24} />
                  </div>
                  <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>+15.3%</span>
                </div>
                <h3 style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Sessions</h3>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#e2e8f0' }}>8,392</p>
              </div>
            </div>

            {/* Quick Access Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* GNN Demo Card */}
              <div 
                onClick={handleGNNDemoClick}
                className="glow-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.2))',
                  border: '1px solid rgba(100, 255, 218, 0.3)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'rgba(100, 255, 218, 0.1)',
                      borderRadius: '12px',
                      display: 'inline-flex'
                    }}>
                      <Brain color="#64ffda" size={32} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.25rem' }}>
                        GNN Demo
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Explore neural networks</p>
                    </div>
                  </div>
                  <ChevronRight color="#64ffda" size={24} />
                </div>
              </div>

              {/* User Profile Card */}
              <div 
                onClick={handleUserProfileClick}
                className="glow-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2))',
                  border: '1px solid rgba(100, 255, 218, 0.3)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      padding: '1rem', 
                      background: 'rgba(100, 255, 218, 0.1)',
                      borderRadius: '12px',
                      display: 'inline-flex'
                    }}>
                      <User color="#64ffda" size={32} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.25rem' }}>
                        User Profile
                      </h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Manage your account</p>
                    </div>
                  </div>
                  <ChevronRight color="#64ffda" size={24} />
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="glow-card" style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(100, 255, 218, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '1rem' }}>
                Recent Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentActivities.map((activity, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(100, 255, 218, 0.05)',
                    borderRadius: '8px'
                  }}>
                    <div className="pulse-dot" style={{ position: 'relative', width: '8px', height: '8px' }}></div>
                    <span style={{ color: '#94a3b8' }}>{activity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}