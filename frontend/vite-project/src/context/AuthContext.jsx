import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);

  // 🧩 Backend URLs
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';   // Node / Express (Auth)

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // 🔐 Fetch current user
  const fetchUser = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/auth/me`);
      setUser(data.data);
    } catch (err) {
      console.error('Error fetching user:', err);
      sessionStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  // 🔑 Login user
  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password });

      sessionStorage.setItem('token', data.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
      setUser(data.data);

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, message };
    }
  };

  // 🧾 Register new user
  const register = async (fullName, email, company, password) => {
    try {
      setError(null);
      const { data } = await axios.post(`${API_URL}/api/auth/register`, {
        fullName,
        email,
        company,
        password,
      });

      sessionStorage.setItem('token', data.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
      setUser(data.data);

      return { success: true };
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    }
  };

  // 🚪 Logout
  const logout = () => {
    sessionStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // ☁️ Update connected cloud provider credentials
  const updateCloudProvider = async (provider, credentials) => {
    try {
      const { data } = await axios.put(`${API_URL}/api/auth/cloud-provider`, {
        provider,
        credentials,
      });
      setUser(data.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update cloud provider';
      return { success: false, message };
    }
  };

  // 🌐 Fetch graph data from Flask backend
  const getGraphData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/graph/data`) || console.log('Nehi ho raha hai!!');
      setGraphData(data.elements || data);
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching graph data:', err);
      const message = err.response?.data?.message || 'Failed to fetch graph data';
      return { success: false, message };
    }
  };

  // Provide all context values
  const value = {
    user,
    loading,
    error,
    graphData,
    login,
    register,
    logout,
    updateCloudProvider,
    getGraphData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for easier usage
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
