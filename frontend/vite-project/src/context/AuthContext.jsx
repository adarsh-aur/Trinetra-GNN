import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get backend URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

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

  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { 
        email, 
        password 
      });

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

  const register = async (fullName, email, company, password) => {
    try {
      setError(null);
      
      // Send request to backend
      const { data } = await axios.post(`${API_URL}/api/auth/register`, {
        fullName,  // Backend expects fullName
        email,
        company,
        password
      });

      // Store token and set user
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

  const logout = () => {
    sessionStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateCloudProvider = async (provider, credentials) => {
    try {
      const { data } = await axios.put(`${API_URL}/api/auth/cloud-provider`, {
        provider,
        credentials
      });
      setUser(data.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update cloud provider';
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateCloudProvider
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