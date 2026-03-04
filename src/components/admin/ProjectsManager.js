import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader, CheckCircle, Clock } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  createProject,
  updateProject,
  deleteProject,
  subscribeToAllProjects,
  getActiveProject
} from '../../services/projectService';
import { getProjectMilestones } from '../../services/milestoneService';
import { notifyProjectCreated, notifyProjectReopened } from '../../services/notificationService';
import ProjectForm from './ProjectForm';
import ProjectDetail from './ProjectDetail';
import './ProjectsManager.css';

const ProjectsManager = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectStats, setProjectStats] = useState({});

  useEffect(() => {
    loadClients();
        // Subscribe to projects in real-time
    const unsubscribe = subscribeToAllProjects((projectsList) => {
      setProjects(projectsList);
      loadProjectStats(projectsList);
    });
    
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, filterClient, filterStatus, searchTerm]);

  const loadClients = async () => {
    try {
      const usersRef = collection(db, 'users');
      const clientsQuery = query(
        usersRef,
        where('role', '==', 'client'),
        where('status', '==', 'approved')
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsList = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsList);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProjectStats = async (projectsList) => {
    try {
      const stats = {};
      for (const project of projectsList) {
        const milestones = await getProjectMilestones(project.id);
        const total = milestones.length;
        const completed = milestones.filter(m => m.status === 'completed').length;
        stats[project.id] = {
          total,
          completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0
        };
      }
      setProjectStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading project stats:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...projects];

    // Filter by client
    if (filterClient !== 'all') {
      filtered = filtered.filter(p => p.clientId === filterClient);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.clientName.toLowerCase().includes(term)
      );
    }

    setFilteredProjects(filtered);
  };

  const handleCreateProject = async (projectData) => {
    // First check: local state (fast)
    const clientProjects = projects.filter(p => p.clientId === projectData.clientId);
    const hasActive = clientProjects.some(p => p.status === 'active');
    
    if (hasActive) {
      alert('This client already has an active project. Please complete it before creating a new one.');
      return;
    }

    // Second check: database (authoritative, handles race conditions)
    const activeProject = await getActiveProject(projectData.clientId);
    if (activeProject) {
      alert('This client already has an active project. Please refresh and try again.');
      return;
    }

    // Create project (server-side will also validate as final check)
    const result = await createProject(projectData);
    if (result.success) {
      setShowForm(false);
      // No need to loadData() - subscription will auto-update
      
      // Send notification to client
      await notifyProjectCreated(
        projectData.clientId,
        projectData.name,
        currentUser.displayName || 'Admin'
      );
    } else {
      // Server validation failed (e.g. race condition)
      alert('Error creating project: ' + result.error);
    }
  };

  const handleUpdateProject = async (projectData) => {
    const result = await updateProject(editingProject.id, projectData);
    if (result.success) {
      setShowForm(false);
      setEditingProject(null);
      // No need to loadData() - subscription will auto-update
    } else {
      alert('Error updating project: ' + result.error);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all its milestones.')) {
      return;
    }

    const result = await deleteProject(projectId);
    if (result.success) {
      // No need to loadData() - subscription will auto-update
    } else {
      alert('Error deleting project: ' + result.error);
    }
  };

  const handleReopenProject = async (projectId) => {
    // Get the project to reopen
    const projectToReopen = projects.find(p => p.id === projectId);
    if (!projectToReopen) {
      alert('Project not found');
      return;
    }

    // Check if client already has an active project
    const hasActiveProject = projects.some(p => 
      p.clientId === projectToReopen.clientId && 
      p.status === 'active' && 
      p.id !== projectId
    );

    if (hasActiveProject) {
      alert('This client already has an active project. Please complete it before reopening this one.');
      return;
    }

    if (!window.confirm('Reopen this project? It will be set back to active status.')) {
      return;
    }

    const result = await updateProject(projectId, { status: 'active', paid: false, paidAt: null, completedAt: null });
    if (result.success) {
      // No need to loadData() - subscription will auto-update
      
      // Send notification to client
      await notifyProjectReopened(
        projectToReopen.clientId,
        projectToReopen.name,
        currentUser.displayName || 'Admin'
      );
    } else {
      alert('Error reopening project: ' + result.error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Active', className: 'status-active' },
      completed: { label: 'Completed', className: 'status-completed' },
      paid: { label: 'Paid', className: 'status-paid' },
      archived: { label: 'Archived', className: 'status-archived' }
    };
    return badges[status] || badges.active;
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

  const getOverallStats = () => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const paid = projects.filter(p => p.status === 'paid').length;

    return { total, active, completed, paid };
  };

  const stats = getOverallStats();

  // If a project is selected, show ProjectDetail
  if (selectedProjectId) {
    return (
      <ProjectDetail 
        projectId={selectedProjectId} 
        onBack={() => {
          setSelectedProjectId(null);
          // No need to loadData() - subscription will auto-update
        }} 
      />
    );
  }

  if (loading) {
    return (
      <div className="projects-loading">
        <Loader className="spinner" size={32} />
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="projects-manager">
      <div className="projects-header">
        <div>
          <h1>Project Management</h1>
          <p>Manage your client projects</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-create">
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* Compact Stats */}
      <div className="projects-stats-compact">
        <span className="stat-text">Total projects: {stats.total}</span>
        {stats.active > 0 && (
          <>
            <span className="stat-separator">|</span>
            <span className="stat-active">Active project</span>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="projects-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={18} />
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="all">All clients</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.displayName || client.email}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      <div className="projects-list">
        {filteredProjects.length === 0 ? (
          <div className="projects-empty">
            <p>No projects match the filters</p>
            {projects.length === 0 && (
              <button onClick={() => setShowForm(true)} className="btn-create-empty">
                <Plus size={20} />
                Create first project
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map(project => {
            const stats = projectStats[project.id] || { total: 0, completed: 0, progress: 0 };
            const statusBadge = getStatusBadge(project.status);
            
            return (
              <div 
                key={project.id} 
                className="project-row"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="project-main-info">
                  <div className="project-title-row">
                    <h3>{project.name}</h3>
                    <span className={`status-badge ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  <div className="project-meta-row">
                    <span className="project-client">{project.clientName}</span>
                    {project.description && <span className="project-description">{project.description}</span>}
                  </div>
                </div>

                <div className="project-stats-row">
                  <div className="progress-compact">
                    <span className="progress-label">Progress:</span>
                    <div className="progress-bar-small">
                      <div 
                        className="progress-fill-small" 
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <span className="progress-text-small">{stats.completed}/{stats.total}</span>
                    <span className="progress-percentage-small">{stats.progress}%</span>
                  </div>

                  <div className="project-details-compact">
                    {project.budget && (
                      <span className="detail-compact">
    {/*                   <DollarSign size={14} />*/}
{/* , DollarSign*/}
                        {formatCurrency(project.budget)}
                      </span>
                    )}
                    {project.startDate && (
                      <span className="detail-compact">
                        <Clock size={14} />
                        {formatDate(project.startDate)}
                      </span>
                    )}
                    {project.paid && project.paidAt && (
                      <span className="detail-compact paid">
                        <CheckCircle size={14} />
                        Paid {formatDate(project.paidAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="project-actions-row" onClick={(e) => e.stopPropagation()}>
                  {(project.status === 'completed' || project.status === 'paid') && (
                    <button
                      onClick={() => handleReopenProject(project.id)}
                      className="action-btn-small reopen"
                    >
                      <Clock size={14} />
                      Reopen
                    </button>
                  )}
                  {project.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleEdit(project)}
                        className="action-btn-small edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="action-btn-small delete"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <ProjectForm
          project={editingProject}
          clients={clients}
          onSave={editingProject ? handleUpdateProject : handleCreateProject}
          onCancel={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectsManager;
