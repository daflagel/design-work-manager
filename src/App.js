import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/common/Login';
import PendingApproval from './components/common/PendingApproval';
import AdminDashboard from './components/admin/AdminDashboard';
import ClientDashboard from './components/client/ClientDashboard';
import './App.css';

// Protected route wrapper
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (userProfile?.status === 'pending') {
    return <Navigate to="/pending" />;
  }

  if (requireAdmin && userProfile?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  // FIX: Prevent admin from accessing client dashboard
  if (!requireAdmin && userProfile?.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  return children;
};

// Main app routes
const AppRoutes = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          currentUser ? (
            userProfile?.status === 'pending' ? (
              <Navigate to="/pending" />
            ) : userProfile?.role === 'admin' ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/" />
            )
          ) : (
            <Login />
          )
        } 
      />

      <Route 
        path="/pending" 
        element={
          currentUser && userProfile?.status === 'pending' ? (
            <PendingApproval />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
