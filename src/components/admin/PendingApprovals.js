import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getPendingUsers, 
  approveUser, 
  rejectUser 
} from '../../services/authService';
import { Check, X, Loader, UserCheck } from 'lucide-react';
import './PendingApprovals.css';

const PendingApprovals = () => {
  const { currentUser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState(null);
  const [showApprovalForm, setShowApprovalForm] = useState(null);
  const [permissions, setPermissions] = useState({
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canEditMilestones: false,
    canEditBudgets: false
  });

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const users = await getPendingUsers();
      setPendingUsers(users);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      setProcessingUserId(userId);
      await approveUser(userId, {
        ...permissions,
        approvedBy: currentUser.uid
      });
      
      // Refresh the list
      await fetchPendingUsers();
      setShowApprovalForm(null);
      setPermissions({
        currency: 'USD',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canEditMilestones: false,
        canEditBudgets: false
      });
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Error approving user. Please try again.');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this user? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingUserId(userId);
      await rejectUser(userId);
      
      // Refresh the list
      await fetchPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Error rejecting user. Please try again.');
    } finally {
      setProcessingUserId(null);
    }
  };

  const openApprovalForm = (userId) => {
    setShowApprovalForm(userId);
  };

  if (loading) {
    return (
      <div className="pending-approvals-loading">
        <Loader className="spinner" size={32} />
        <p>Loading pending approvals...</p>
      </div>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="no-pending-users">
        <UserCheck size={48} />
        <h3>No Pending Approvals</h3>
        <p>All users have been processed.</p>
      </div>
    );
  }

  return (
    <div className="pending-approvals">
      <h2>Pending Approvals</h2>
      <p className="subtitle">{pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} waiting for approval</p>

      <div className="pending-users-list">
        {pendingUsers.map((user) => (
          <div key={user.id} className="pending-user-card">
            <div className="user-info">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
              )}
              <div className="user-details">
                <h3>{user.displayName}</h3>
                <p className="user-email">{user.email}</p>
                <p className="user-date">
                  Registered: {user.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Recently'}
                </p>
              </div>
            </div>

            {showApprovalForm === user.id ? (
              <div className="approval-form">
                <h4>Set Permissions</h4>
                
                <div className="form-group">
                  <label>Currency</label>
                  <select 
                    value={permissions.currency}
                    onChange={(e) => setPermissions({...permissions, currency: e.target.value})}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Timezone</label>
                  <input 
                    type="text"
                    value={permissions.timezone}
                    onChange={(e) => setPermissions({...permissions, timezone: e.target.value})}
                    placeholder="America/New_York"
                  />
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input 
                      type="checkbox"
                      checked={permissions.canEditMilestones}
                      onChange={(e) => setPermissions({...permissions, canEditMilestones: e.target.checked})}
                    />
                    Can edit milestones (when In Progress)
                  </label>
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input 
                      type="checkbox"
                      checked={permissions.canEditBudgets}
                      onChange={(e) => setPermissions({...permissions, canEditBudgets: e.target.checked})}
                    />
                    Can create/edit budgets
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={processingUserId === user.id}
                    className="approve-button"
                  >
                    {processingUserId === user.id ? (
                      <Loader className="spinner" size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                    <span>Approve</span>
                  </button>
                  
                  <button
                    onClick={() => setShowApprovalForm(null)}
                    disabled={processingUserId === user.id}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="user-actions">
                <button
                  onClick={() => openApprovalForm(user.id)}
                  disabled={processingUserId !== null}
                  className="approve-button-small"
                >
                  <Check size={16} />
                  <span>Approve</span>
                </button>
                
                <button
                  onClick={() => handleReject(user.id)}
                  disabled={processingUserId !== null}
                  className="reject-button"
                >
                  {processingUserId === user.id ? (
                    <Loader className="spinner" size={16} />
                  ) : (
                    <X size={16} />
                  )}
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingApprovals;
