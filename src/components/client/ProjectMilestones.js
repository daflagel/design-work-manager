import { 
  notifyMilestoneCreated, 
  notifyMilestoneUpdated, 
  notifyMilestoneDeleted 
} from '../../services/notificationService';
import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, TrendingUp, Plus, Clock } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  subscribeToProjectMilestones,
  calculateProgress,
  createMilestone,
  updateMilestone,
  deleteMilestone
} from '../../services/milestoneService';
import { subscribeToActiveProject, createProject } from '../../services/projectService';
import MilestoneCard from '../common/MilestoneCard';
import MilestoneForm from '../admin/MilestoneForm';
import ClientProjectForm from './ClientProjectForm';
import './ProjectMilestones.css';

const ProjectMilestones = ({ currentUser }) => {
  const [activeProject, setActiveProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Check permissions
    const checkPermissions = async () => {
      try {
        const userDoc = await getDocs(
          query(collection(db, 'users'), where('__name__', '==', currentUser.uid))
        );
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setCanEdit(userData.permissions?.canEditMilestones || false);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };

    checkPermissions();

    // Subscribe to active project
    const unsubscribeProject = subscribeToActiveProject(currentUser.uid, (project) => {
      setActiveProject(project);
      setLoading(false);
    });

    return () => unsubscribeProject();
  }, [currentUser]);

  useEffect(() => {
    if (!activeProject) {
      setMilestones([]);
      return;
    }

    // Subscribe to milestones of active project only
    const unsubscribeMilestones = subscribeToProjectMilestones(activeProject.id, (data) => {
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

    return () => unsubscribeMilestones();
  }, [activeProject]);

  const handleCreateMilestone = async (milestoneData) => {
    if (!activeProject) return;

    const result = await createMilestone({
      ...milestoneData,
      projectId: activeProject.id,
      clientId: currentUser.uid,
      clientName: currentUser.displayName || currentUser.email
    });
    
    if (result.success) {
      setShowForm(false);
      await notifyMilestoneCreated(
  currentUser.uid,
  milestoneData.title,
  activeProject.name,
  currentUser.displayName || currentUser.email
);
    } else {
      alert('Error creating milestone: ' + result.error);
    }
  };

  const handleUpdateMilestone = async (milestoneData) => {
    const result = await updateMilestone(editingMilestone.id, milestoneData);
    if (result.success) {
      setShowForm(false);
      setEditingMilestone(null);
      await notifyMilestoneUpdated(
  currentUser.uid,
  milestoneData.title,
  currentUser.displayName || currentUser.email
);
    } else {
      alert('Error updating milestone: ' + result.error);
    }
  };

  const handleEdit = (milestone) => {
    setEditingMilestone(milestone);
    setShowForm(true);
  };

const handleDelete = async (milestoneId) => {
  if (!window.confirm('Are you sure you want to delete this milestone?')) {
    return;
  }

  const milestoneToDelete = milestones.find(m => m.id === milestoneId);
  const result = await deleteMilestone(milestoneId);
  
  if (result.success) {
    await notifyMilestoneDeleted(
      currentUser.uid,
      milestoneToDelete?.title || 'Unknown',
      currentUser.displayName || currentUser.email
    );
  } else {
    alert('Error deleting milestone: ' + result.error);
  }
};

  const handleCreateProject = async (projectData) => {
    // Extra validation: check if active project exists right now
    if (activeProject) {
      alert('You already have an active project. Please wait for it to be completed before creating a new one.');
      setShowProjectForm(false);
      return;
    }

    const result = await createProject({
      ...projectData,
      clientId: currentUser.uid,
      clientName: currentUser.displayName || currentUser.email
    });

    if (result.success) {
      setShowProjectForm(false);
      alert('Project created successfully! Your designer will be notified.');
      
      // Force page reload to show new project
      window.location.reload();
    } else {
      alert('Error creating project: ' + result.error);
    }
  };

  const progress = calculateProgress(milestones);
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const totalCount = milestones.length;

  // Create form data for milestone form
  const initialFormData = editingMilestone || (activeProject ? {
    clientId: currentUser.uid,
    clientName: currentUser.displayName || currentUser.email,
    projectId: activeProject.id
  } : {});

  if (loading) {
    return (
      <div className="project-milestones-loading">
        <Loader className="spinner" size={32} />
        <p>Loading your project...</p>
      </div>
    );
  }

  // No active project
  if (!activeProject) {
    return (
      <div className="project-milestones">
        <div className="project-header">
          <div>
            <h1>Your Current Project</h1>
            <p>Track the progress of your project milestones</p>
          </div>
        </div>

        <div className="no-active-project">
          <p>You don't have an active project at the moment</p>
          {canEdit ? (
            <button 
              onClick={() => setShowProjectForm(true)} 
              className="btn-new-project"
              disabled={loading || activeProject}
            >
              <Plus size={18} />
              Create New Project
            </button>
          ) : (
            <p className="no-active-subtitle">Your designer will create a new project for you soon</p>
          )}
        </div>

        {/* Project Form Modal */}
        {showProjectForm && (
          <ClientProjectForm
            onSave={handleCreateProject}
            onCancel={() => setShowProjectForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="project-milestones">
      <div className="project-header">
        <div>
          <h1>Your Current Project</h1>
          <p>Track the progress of your project milestones</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-create">
            <Plus size={20} />
            New Milestone
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="project-progress-card">
        <div className="progress-header">
          <div className="progress-info">
            <TrendingUp size={24} className="progress-icon" />
            <div>
              <h3>Overall Progress</h3>
              <p>{completedCount} of {totalCount} milestones completed</p>
            </div>
          </div>
          <div className="progress-percentage">{progress}%</div>
        </div>
        
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {progress === 100 && (
          <div className="project-completed">
            <CheckCircle size={20} />
            <span>Project completed! 🎉</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="project-timeline">
        {milestones.length === 0 ? (
          <div className="timeline-empty">
            <p>No milestones yet</p>
            {canEdit ? (
              <button onClick={() => setShowForm(true)} className="btn-create-empty">
                <Plus size={20} />
                Create first milestone
              </button>
            ) : (
              <p className="timeline-empty-subtitle">
                Your designer will create project milestones soon
              </p>
            )}
          </div>
        ) : (
          <div className="timeline-grouped">
            {/* In Progress */}
            {milestones.filter(m => m.status === 'in_progress').length > 0 && (
              <div className="milestone-group">
                <h3 className="group-title in-progress">
                  <Clock size={18} />
                  Milestones In Progress ({milestones.filter(m => m.status === 'in_progress').length})
                </h3>
                <div className="timeline-list">
                  {milestones
                    .filter(m => m.status === 'in_progress')
                    .map((milestone, index, arr) => (
                      <div key={milestone.id} className="timeline-item">
                        <div className="timeline-connector">
                          <div className={`timeline-dot ${milestone.status}`} />
                          {index < arr.length - 1 && (
                            <div className="timeline-line" />
                          )}
                        </div>
                        <div className="timeline-content">
                          <MilestoneCard
                            milestone={milestone}
                            onEdit={canEdit ? handleEdit : null}
                            onDelete={canEdit ? handleDelete : null}
                            onUpdateStatus={null}
                            isAdmin={canEdit}
                          />
                        </div>
                      </div>
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
                <div className="timeline-list">
                  {milestones
                    .filter(m => m.status === 'pending')
                    .map((milestone, index, arr) => (
                      <div key={milestone.id} className="timeline-item">
                        <div className="timeline-connector">
                          <div className={`timeline-dot ${milestone.status}`} />
                          {index < arr.length - 1 && (
                            <div className="timeline-line" />
                          )}
                        </div>
                        <div className="timeline-content">
                          <MilestoneCard
                            milestone={milestone}
                            onEdit={canEdit ? handleEdit : null}
                            onDelete={canEdit ? handleDelete : null}
                            onUpdateStatus={null}
                            isAdmin={canEdit}
                          />
                        </div>
                      </div>
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
                <div className="timeline-list">
                  {milestones
                    .filter(m => m.status === 'completed')
                    .map((milestone, index, arr) => (
                      <div key={milestone.id} className="timeline-item">
                        <div className="timeline-connector">
                          <div className={`timeline-dot ${milestone.status}`} />
                          {index < arr.length - 1 && (
                            <div className="timeline-line" />
                          )}
                        </div>
                        <div className="timeline-content">
                          <MilestoneCard
                            milestone={milestone}
                            onEdit={canEdit ? handleEdit : null}
                            onDelete={canEdit ? handleDelete : null}
                            onUpdateStatus={null}
                            isAdmin={canEdit}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <MilestoneForm
          milestone={initialFormData}
          clients={[]}
          projects={[]}
          isAdmin={false}
          onSave={editingMilestone ? handleUpdateMilestone : handleCreateMilestone}
          onCancel={() => {
            setShowForm(false);
            setEditingMilestone(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectMilestones;
