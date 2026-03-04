import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, UserCheck, HardDrive, Settings, LogOut, MessageSquare, FolderOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PendingApprovals from './PendingApprovals';
import ChatList from './ChatList';
import ProjectsManager from './ProjectsManager';
import StorageManager from './StorageManager';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { signOut, currentUser } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const tabs = [
    { path: '/admin/chat', label: 'Chat', icon: MessageSquare },
    { path: '/admin/projects', label: 'Projects', icon: FolderOpen },
    { path: '/admin/clients', label: 'Clients', icon: Users },
    { path: '/admin/pending', label: 'Pending Approvals', icon: UserCheck },
    { path: '/admin/storage', label: 'Storage', icon: HardDrive },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <div className="nav-header">
          <div className="logo">
            <span className="logo-text">ZDG</span>
          </div>
          <h1>Admin Dashboard</h1>
        </div>

        <div className="nav-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`nav-tab ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="nav-footer">
          <div className="user-info">
            {currentUser?.photoURL && (
              <img src={currentUser.photoURL} alt="Admin" className="user-avatar" />
            )}
            <span className="user-name">{currentUser?.displayName}</span>
          </div>
        </div>
      </nav>

      <main className="admin-content">
        <Routes>
          <Route path="/" element={<div className="placeholder">Welcome to Admin Dashboard</div>} />
          <Route path="/chat" element={<ChatList currentUser={currentUser} />} />
          <Route path="/projects" element={<ProjectsManager />} />
          <Route path="/clients" element={<div className="placeholder">Clients List (Coming in Phase 8)</div>} />
          <Route path="/pending" element={<PendingApprovals />} />
          <Route path="/storage" element={<StorageManager currentUser={currentUser} />} />
          <Route path="/settings" element={
            <div className="settings-placeholder">
              <h2>Settings</h2>
              <button onClick={handleSignOut} className="signout-button">
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
