import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, LogOut } from 'lucide-react';
import './PendingApproval.css';

const PendingApproval = () => {
  const { signOut, currentUser } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="pending-icon">
          <Clock size={48} />
        </div>
        
        <h1>Account Pending Approval</h1>
        
        <div className="pending-message">
          <p>
            Thank you for registering, <strong>{currentUser?.displayName}</strong>.
          </p>
          <p>
            Your account is currently pending approval. You'll receive access once 
            the administrator reviews and approves your account.
          </p>
          <p className="email-info">
            Registered email: <strong>{currentUser?.email}</strong>
          </p>
        </div>

        <button onClick={handleSignOut} className="signout-button">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
