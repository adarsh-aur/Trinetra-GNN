import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/login';
import Register from './pages/register';
import ForgotPassword from './pages/ForgotPassword';      // Add this
import ResetPassword from './pages/ResetPassword';        // Add this
import Dashboard from './pages/Dashboard';
import CloudConnection from './pages/CloudConnection';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />           {/* Add */}
          <Route path="/reset-password/:token" element={<ResetPassword />} />     {/* Add */}
          <Route 
            path="/cloud-connection" 
            element={
              <ProtectedRoute>
                <CloudConnection />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;