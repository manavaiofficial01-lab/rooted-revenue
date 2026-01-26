import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import Summary from './components/Summary'
import Tracking from './components/Tracking'
import PolicySheet from './components/PolicySheet'
import ClientAccess from './components/ClientAccess'
import EMICalculator from './components/EMICalculator'

import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    const savedAdmin = localStorage.getItem('admin_user');

    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) { localStorage.removeItem('app_user'); }
    }
    if (savedAdmin) {
      try { setAdminUser(JSON.parse(savedAdmin)); } catch (e) { localStorage.removeItem('admin_user'); }
    }

    setLoading(false);
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    localStorage.setItem('app_user', JSON.stringify(userData))
  }

  const handleAdminLoginSuccess = (adminData) => {
    setAdminUser(adminData)
    localStorage.setItem('admin_user', JSON.stringify(adminData))
  }

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    navigate('/');
  }

  const handleAdminLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('admin_user');
    navigate('/admin');
  }

  if (loading) {
    return (
      <div className="app-loader">
        <div className="spinner"></div>
      </div>
    )
  }

  const ProtectedAgentRoute = ({ children }) => {
    return user ? <Dashboard onLogout={handleLogout} user={user}>{children}</Dashboard> : <Navigate to="/" replace />;
  };

  const ProtectedAdminRoute = ({ children }) => {
    return adminUser ? children : <Navigate to="/admin" replace />;
  };

  return (
    <div className="app-container">
      <Routes>
        {/* Admin Portal Routes */}
        <Route path="/admin" element={!adminUser ? <AdminLogin onLoginSuccess={handleAdminLoginSuccess} /> : <Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard onLogout={handleAdminLogout} /></ProtectedAdminRoute>} />

        {/* Agent Portal Routes */}
        <Route path="/" element={!user ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/summary" replace />} />

        <Route path="/summary" element={<ProtectedAgentRoute><Summary /></ProtectedAgentRoute>} />
        <Route path="/client-login" element={<ProtectedAgentRoute><ClientAccess /></ProtectedAgentRoute>} />
        <Route path="/client-tracking" element={<ProtectedAgentRoute><Tracking /></ProtectedAgentRoute>} />
        <Route path="/policy-sheet" element={<ProtectedAgentRoute><PolicySheet /></ProtectedAgentRoute>} />
        <Route path="/emi-calculator" element={<ProtectedAgentRoute><EMICalculator /></ProtectedAgentRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
