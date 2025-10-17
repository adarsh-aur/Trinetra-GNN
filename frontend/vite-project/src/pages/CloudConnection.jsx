import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const CloudConnection = () => {
  const [providers, setProviders] = useState({
    aws: { accountId: '', region: '', connected: false },
    azure: { subscriptionId: '', tenantId: '', connected: false },
    gcp: { projectId: '', organizationId: '', connected: false }
  });

  const { updateCloudProvider, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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

  return (
    <div className="connection-page">
      {/* Header with Logout Button */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        zIndex: 100
      }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '2px solid #ef4444',
            color: '#ef4444',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#ef4444';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(30, 41, 59, 0.8)';
            e.target.style.color = '#ef4444';
          }}
        >
          Logout
        </button>
      </div>

      <div className="connection-container">
        <div className="connection-header">
          <h2>Connect Your Multi-Cloud Environment</h2>
          <p className="connection-text">
            Begin by ingesting security telemetry from your cloud providers. Our system unifies logs from AWS, Azure, and GCP into a comprehensive security graph.
          </p>
        </div>

        <div className="provider-cards">
          {/* AWS Card */}
          <div className={`provider-card ${providers.aws.connected ? 'connected' : ''}`}>
            <div className="provider-logo">🟠</div>
            <div className="provider-name">Amazon Web Services</div>
            
            {!providers.aws.connected && (
              <div className="provider-form">
                <div className="form-group">
                  <label>AWS Account ID</label>
                  <input
                    type="text"
                    placeholder="123456789012"
                    maxLength="12"
                    value={providers.aws.accountId}
                    onChange={(e) => handleInputChange('aws', 'accountId', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Primary Region</label>
                  <select
                    value={providers.aws.region}
                    onChange={(e) => handleInputChange('aws', 'region', e.target.value)}
                  >
                    <option value="">Select Region</option>
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">Europe (Ireland)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  </select>
                </div>
              </div>
            )}

            {!providers.aws.connected ? (
              <button 
                className="connect-btn" 
                onClick={() => handleConnect('aws')}
                disabled={!validateProvider('aws')}
              >
                Verify & Connect
              </button>
            ) : (
              <div className="connected-status">
                <span>✓</span> Connected
              </div>
            )}
          </div>

          {/* Azure Card */}
          <div className={`provider-card ${providers.azure.connected ? 'connected' : ''}`}>
            <div className="provider-logo">🔵</div>
            <div className="provider-name">Microsoft Azure</div>
            
            {!providers.azure.connected && (
              <div className="provider-form">
                <div className="form-group">
                  <label>Subscription ID</label>
                  <input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={providers.azure.subscriptionId}
                    onChange={(e) => handleInputChange('azure', 'subscriptionId', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Tenant ID</label>
                  <input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={providers.azure.tenantId}
                    onChange={(e) => handleInputChange('azure', 'tenantId', e.target.value)}
                  />
                </div>
              </div>
            )}

            {!providers.azure.connected ? (
              <button 
                className="connect-btn" 
                onClick={() => handleConnect('azure')}
                disabled={!validateProvider('azure')}
              >
                Verify & Connect
              </button>
            ) : (
              <div className="connected-status">
                <span>✓</span> Connected
              </div>
            )}
          </div>

          {/* GCP Card */}
          <div className={`provider-card ${providers.gcp.connected ? 'connected' : ''}`}>
            <div className="provider-logo">🔴</div>
            <div className="provider-name">Google Cloud Platform</div>
            
            {!providers.gcp.connected && (
              <div className="provider-form">
                <div className="form-group">
                  <label>Project ID</label>
                  <input
                    type="text"
                    placeholder="my-project-123456"
                    value={providers.gcp.projectId}
                    onChange={(e) => handleInputChange('gcp', 'projectId', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Organization ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="123456789012"
                    value={providers.gcp.organizationId}
                    onChange={(e) => handleInputChange('gcp', 'organizationId', e.target.value)}
                  />
                </div>
              </div>
            )}

            {!providers.gcp.connected ? (
              <button 
                className="connect-btn" 
                onClick={() => handleConnect('gcp')}
                disabled={!validateProvider('gcp')}
              >
                Verify & Connect
              </button>
            ) : (
              <div className="connected-status">
                <span>✓</span> Connected
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            className="btn-primary" 
            onClick={handleContinue}
            style={{ padding: '1rem 2rem', width: 'auto' }}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudConnection;