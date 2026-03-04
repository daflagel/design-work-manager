import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { MessageSquare, FolderOpen, FileText, History, User } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import ClientChat from './ClientChat';
import ProjectMilestones from './ProjectMilestones';
import ClientStorage from './ClientStorage';
import ProjectHistory from './ProjectHistory';
import ClientProfile from './ClientProfile';
import OnboardingForm from './OnboardingForm';
import './ClientDashboard.css';

const ClientDashboard = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Check if client needs onboarding (first login)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const checkOnboarding = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          // Show onboarding if not completed yet
          if (!data.onboardingComplete) {
            setShowOnboarding(true);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkOnboarding();
  }, [currentUser]);

  const tabs = [
    { path: '/', label: 'Chat', icon: MessageSquare },
    { path: '/project', label: 'Current Project', icon: FolderOpen },
    { path: '/storage', label: 'Files', icon: FileText },
    { path: '/history', label: 'Project History', icon: History },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="client-dashboard">
      {/* Onboarding modal — shown only on first login */}
      {onboardingChecked && showOnboarding && (
        <OnboardingForm
          currentUser={currentUser}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <nav className="client-nav">
        <div className="nav-header">
          <div className="logo">
            <span className="logo-text">ZDG</span>
          </div>
          <h1>Zeppelindg App</h1>
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
              <img src={currentUser.photoURL} alt="User" className="user-avatar" />
            )}
            <span className="user-name">{currentUser?.displayName}</span>
          </div>
        </div>
      </nav>

      <main className="client-content">
        <Routes>
          <Route path="/" element={<ClientChat currentUser={currentUser} />} />
          <Route path="/project" element={<ProjectMilestones currentUser={currentUser} />} />
          <Route path="/storage" element={<ClientStorage currentUser={currentUser} />} />
          <Route path="/history" element={<ProjectHistory currentUser={currentUser} />} />
          <Route path="/profile" element={<ClientProfile currentUser={currentUser} />} />
        </Routes>
      </main>
    </div>
  );
};

export default ClientDashboard;
