import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Calendar, CheckCircle, TrendingUp, Loader, Clock } from 'lucide-react';
import { subscribeToProjectMilestones, createMilestone, updateMilestone, deleteMilestone } from '../../services/milestoneService';
import { getProjectById, updateProject, calculateProjectStats, getAllProjects } from '../../services/projectService';
import { 
  notifyProjectCompleted, 
  notifyProjectReopened,
  notifyMilestoneCreated,
  notifyMilestoneStatusChanged,
  notifyMilestoneUpdated,
  notifyMilestoneDeleted
} from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import MilestoneCard from '../common/MilestoneCard';
import MilestoneForm from './MilestoneForm';
import './ProjectDetail.css';

const ProjectDetail = ({ projectId, onBack }) => {
  const { currentUser } = useAuth();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [stats, setStats] = useState({ totalMilestones: 0, completedMilestones: 0, progress: 0, isComplete: false });

  useEffect(() => {
    loadProject();
    
    const unsubscribe = subscribeToProjectMilestones(projectId, (data) => {
      // Sort by urgent first, then by createdAt (oldest first)
      const sorted = data.sort((a, b) => {
        // Urgent milestones first
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        // Then by creation date (oldest first)
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
      setMilestones(sorted);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (project && milestones) {
      const projectStats = calculateProjectStats(project, milestones);
      setStats(projectStats);
    }
  }, [project, milestones]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const projectData = await getProjectById(projectId);
      setProject(projectData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading project:', error);
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (milestoneData) => {
    console.log('Creating milestone...', { project, milestoneData, projectId });
    
    // Ensure project is loaded
    if (!project || !project.clientId) {
      alert('Project data not loaded. Please try again.');
      console.error('Project not loaded:', project);
      return;
    }

    // Ensure projectId, clientId, and clientName are set
    const fullMilestoneData = {
      ...milestoneData,
      projectId: projectId,
      clientId: project.clientId,
      clientName: project.clientName
    };
    
    console.log('Full milestone data:', fullMilestoneData);
    
    const result = await createMilestone(fullMilestoneData);
    
    console.log('Create milestone result:', result);

    if (result.success) {
      setShowMilestoneForm(false);
      
      // Send notification to client
      await notifyMilestoneCreated(
        project.clientId,
        milestoneData.title,
        project.name,
        currentUser.displayName || 'Admin'
      );
    } else {
      alert('Error creating milestone: ' + result.error);
    }
  };

  const handleUpdateMilestone = async (milestoneData) => {
    const result = await updateMilestone(editingMilestone.id, milestoneData);
    if (result.success) {
      setShowMilestoneForm(false);
      setEditingMilestone(null);
      
      // Send notification to client
      await notifyMilestoneUpdated(
        project.clientId,
        milestoneData.title || editingMilestone.title,
        currentUser.displayName || 'Admin'
      );
    } else {
      alert('Error updating milestone: ' + result.error);
    }
  };

  const handleEdit = (milestone) => {
    setEditingMilestone(milestone);
    setShowMilestoneForm(true);
  };

  const handleDelete = async (milestoneId) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    
    if (!window.confirm('Are you sure you want to delete this milestone?')) {
      return;
    }

    const result = await deleteMilestone(milestoneId);
    if (!result.success) {
      alert('Error deleting milestone: ' + result.error);
    } else {
      // Send notification to client
      await notifyMilestoneDeleted(
        project.clientId,
        milestone.title,
        currentUser.displayName || 'Admin'
      );
    }
  };

  const handleUpdateStatus = async (milestoneId, newStatus) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    
    const oldStatus = milestone.status;
    
    // Confirmation for both completing and reopening
    if (newStatus === 'completed') {
      if (!window.confirm('Mark this milestone as completed?')) {
        return;
      }
    } else {
      if (!window.confirm('Are you sure you want to reopen this milestone?')) {
        return;
      }
    }

    const result = await updateMilestone(milestoneId, { status: newStatus });
    if (!result.success) {
      alert('Error updating status: ' + result.error);
    } else {
      // Send notification to client
      await notifyMilestoneStatusChanged(
        project.clientId,
        milestone.title,
        oldStatus,
        newStatus,
        currentUser.displayName || 'Admin'
      );
    }
  };

  const handleCompleteProject = async () => {
    if (!window.confirm('Mark this project as completed? This will notify the client for payment.')) {
      return;
    }

    const result = await updateProject(projectId, { status: 'completed' });
    if (result.success) {
      loadProject();
      
      // Send notification to client
      await notifyProjectCompleted(
        project.clientId,
        project.name,
        currentUser.displayName || 'Admin'
      );
    } else {
      alert('Error completing project: ' + result.error);
    }
  };

  const handleReopenProject = async () => {
    // Check if client already has an active project
    try {
      const allProjects = await getAllProjects();
      const hasActiveProject = allProjects.some(p => 
        p.clientId === project.clientId && 
        p.status === 'active' && 
        p.id !== projectId
      );

      if (hasActiveProject) {
        alert('This client already has an active project. Please complete it before reopening this one.');
        return;
      }
    } catch (error) {
      console.error('Error checking active projects:', error);
    }

    if (!window.confirm('Reopen this project? It will be set back to active status.')) {
      return;
    }

    const result = await updateProject(projectId, { 
      status: 'active', 
      completedAt: null 
    });
    
    if (result.success) {
      loadProject();
      
      // Send notification to client
      await notifyProjectReopened(
        project.clientId,
        project.name,
        currentUser.displayName || 'Admin'
      );
    } else {
      alert('Error reopening project: ' + result.error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="project-detail-loading">
        <Loader className="spinner" size={32} />
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-error">
        <p>Project not found</p>
        <button onClick={onBack} className="btn-back">Go Back</button>
      </div>
    );
  }

  // Prepare initial form data with pre-filled values
  const initialFormData = editingMilestone ? editingMilestone : (project ? {
    clientId: project.clientId,
    clientName: project.clientName,
    projectId: projectId
  } : {});

  return (
    <div className="project-detail">
      {/* Header */}
      <div className="project-detail-header">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={20} />
          Back to Projects
        </button>
      </div>

      {/* Project Info Card */}
      <div className="project-info-card">
        <div className="project-info-header">
          <div>
            <h1>{project.name}</h1>
            <p className="project-client">{project.clientName}</p>
          </div>
          <span className={`project-status-badge ${project.status}`}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>

        {project.description && (
          <p className="project-description">{project.description}</p>
        )}

        <div className="project-metadata">
         {project.budget && (
            <div className="metadata-item">
          <span>{formatCurrency(project.budget)}</span>
          </div>
          )}
           {project.startDate && (
            <div className="metadata-item">
              <Calendar size={16} />
              <span>Started: {formatDate(project.startDate)}</span>
            </div>
          )}
          {project.endDate && (
            <div className="metadata-item">
              <Calendar size={16} />
              <span>Est. End: {formatDate(project.endDate)}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="project-progress-section">
          <div className="progress-header">
            <div className="progress-info">
              <TrendingUp size={20} />
              <span>Progress</span>
            </div>
            <span className="progress-percentage">{stats.progress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <p className="progress-text">
            {stats.completedMilestones} of {stats.totalMilestones} milestones completed
          </p>
        </div>

        {/* Actions */}
        {stats.isComplete && project.status === 'active' && (
          <div className="project-actions">
            <button onClick={handleCompleteProject} className="btn-complete-project">
              <CheckCircle size={18} />
              Mark Project as Completed
            </button>
          </div>
        )}

        {project.status === 'completed' && (
          <div className="project-actions">
            <button onClick={handleReopenProject} className="btn-reopen-project">
              <Clock size={18} />
              Reopen Project
            </button>
          </div>
        )}
      </div>

      {/* Milestones Section */}
      <div className="milestones-section">
        <div className="milestones-header">
          <h2>Milestones ({milestones.length})</h2>
          {project.status === 'active' && (
            <button onClick={() => setShowMilestoneForm(true)} className="btn-add-milestone">
              <Plus size={18} />
              Add Milestone
            </button>
          )}
        </div>

        {project.status !== 'active' && (
          <div className="project-locked-notice">
            <p>
              This project is <strong>{project.status}</strong>. 
              {project.status === 'completed' && ' Reopen the project to edit milestones.'}
              {project.status === 'paid' && ' This project is archived.'}
            </p>
          </div>
        )}

        <div className="milestones-list">
          {milestones.length === 0 ? (
            <div className="milestones-empty">
              <p>No milestones yet</p>
              {project.status === 'active' && (
                <button onClick={() => setShowMilestoneForm(true)} className="btn-add-first">
                  <Plus size={18} />
                  Create First Milestone
                </button>
              )}
            </div>
          ) : (
            <>
              {/* In Progress */}
              {milestones.filter(m => m.status === 'in_progress').length > 0 && (
                <div className="milestone-group">
                  <h3 className="group-title in-progress">
                    <Clock size={18} />
                    Milestones In Progress ({milestones.filter(m => m.status === 'in_progress').length})
                  </h3>
                  <div className="group-list">
                    {milestones
                      .filter(m => m.status === 'in_progress')
                      .map(milestone => (
                        <MilestoneCard
                          key={milestone.id}
                          milestone={milestone}
                          onEdit={project.status === 'active' ? handleEdit : null}
                          onDelete={project.status === 'active' ? handleDelete : null}
                          onUpdateStatus={project.status === 'active' ? handleUpdateStatus : null}
                          isAdmin={true}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Pending */}
              {milestones.filter(m => m.status === 'pending').length > 0 && (
                <div className="milestone-group">
                  <h3 className="group-title pending">
                    <CheckCircle size={18} />
                    Milestones Pending ({milestones.filter(m => m.status === 'pending').length})
                  </h3>
                  <div className="group-list">
                    {milestones
                      .filter(m => m.status === 'pending')
                      .map(milestone => (
                        <MilestoneCard
                          key={milestone.id}
                          milestone={milestone}
                          onEdit={project.status === 'active' ? handleEdit : null}
                          onDelete={project.status === 'active' ? handleDelete : null}
                          onUpdateStatus={project.status === 'active' ? handleUpdateStatus : null}
                          isAdmin={true}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {milestones.filter(m => m.status === 'completed').length > 0 && (
                <div className="milestone-group">
                  <h3 className="group-title completed">
                    <CheckCircle size={18} />
                    Milestones Completed ({milestones.filter(m => m.status === 'completed').length})
                  </h3>
                  <div className="group-list">
                    {milestones
                      .filter(m => m.status === 'completed')
                      .map(milestone => (
                        <MilestoneCard
                          key={milestone.id}
                          milestone={milestone}
                          onEdit={null}
                          onDelete={null}
                          onUpdateStatus={project.status === 'active' ? handleUpdateStatus : null}
                          isAdmin={true}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <MilestoneForm
          milestone={editingMilestone || initialFormData}
          clients={[]}
          projects={[]}
          onSave={editingMilestone ? handleUpdateMilestone : handleCreateMilestone}
          onCancel={() => {
            setShowMilestoneForm(false);
            setEditingMilestone(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
