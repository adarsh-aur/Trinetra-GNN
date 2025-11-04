import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/login';
import Register from './pages/register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import CloudConnection from './pages/CloudConnection';
import GNNDemo from './pages/GNNDemo';  // Add this import
import UserProfile from './pages/UserProfile';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import GraphDisplay from './pages/GraphDisplay';  // Graph Display Page


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/user-profile" element={<UserProfile />} />

          {/* GNN Demo Route - can be public or protected */}
          <Route path="/gnn-demo" element={<GNNDemo />} />
          
          {/* Graph Display Route - uses Graph Visulaization from components */}
          <Route 
            path="/GraphDisplay" 
            element={
              <ProtectedRoute>
                <GraphDisplay />
              </ProtectedRoute>
            } 
          />

          {/* Or make it protected: */}
          {/* <Route 
            path="/gnn-demo" 
            element={
              <ProtectedRoute>
                <GNNDemo />
              </ProtectedRoute>
            } 
          /> */}
          
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