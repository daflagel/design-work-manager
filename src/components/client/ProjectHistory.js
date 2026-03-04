import React, { useState, useEffect } from 'react';
import { 
  History, ChevronDown, ChevronUp, CheckCircle, 
  Calendar, DollarSign, Download, FileText, 
  Loader, FolderOpen, Clock
} from 'lucide-react';
import { getClientProjects } from '../../services/projectService';
import { getProjectMilestones } from '../../services/milestoneService';
import { getProjectFiles } from '../../services/storageService';
import { formatFileSize } from '../../services/storageService';
import './ProjectHistory.css';

const ProjectHistory = ({ currentUser }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState({}); // { projectId: { milestones, files } }
  const [loadingDetails, setLoadingDetails] = useState({});

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadHistory = async () => {
    try {
      const all = await getClientProjects(currentUser.uid);
      // Only show completed/paid projects
      const history = all.filter(p => p.status === 'completed' || p.status === 'paid');
      // Sort newest first
      history.sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0));
      setProjects(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = async (projectId) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      return;
    }

    setExpandedProject(projectId);

    // Load details if not already loaded
    if (!projectDetails[projectId]) {
      setLoadingDetails(prev => ({ ...prev, [projectId]: true }));
      try {
        const [milestones, files] = await Promise.all([
          getProjectMilestones(projectId),
          getProjectFiles(projectId)
        ]);
        setProjectDetails(prev => ({
          ...prev,
          [projectId]: { milestones, files }
        }));
      } catch (error) {
        console.error('Error loading project details:', error);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [projectId]: false }));
      }
    }
  };

  const handleDownload = async (url, fileName) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    return timestamp.toDate().toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getCategoryLabel = (category) => {
    const labels = { draft: '📝 Borrador', final: '✅ Final', client: '👤 Tuyo' };
    return labels[category] || category;
  };

  const getMilestoneStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle size={14} className="status-icon completed" />;
    if (status === 'in_progress') return <Clock size={14} className="status-icon in-progress" />;
    return <Clock size={14} className="status-icon pending" />;
  };

  if (loading) {
    return (
      <div className="history-loading">
        <Loader className="spinner" size={32} />
        <p>Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="project-history">
      <div className="history-header">
        <div>
          <h1>
            <History size={24} />
            Historial de Proyectos
          </h1>
          <p>Todos tus proyectos completados y su documentación</p>
        </div>
        <div className="history-count">
          {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="history-empty">
          <FolderOpen size={56} />
          <h3>Sin historial aún</h3>
          <p>Aquí aparecerán tus proyectos completados</p>
        </div>
      ) : (
        <div className="history-list">
          {projects.map(project => {
            const isExpanded = expandedProject === project.id;
            const details = projectDetails[project.id];
            const isLoadingDetails = loadingDetails[project.id];
            const completedMilestones = details?.milestones?.filter(m => m.status === 'completed').length || 0;
            const totalMilestones = details?.milestones?.length || 0;

            return (
              <div
                key={project.id}
                className={`history-card ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Card Header — always visible */}
                <div
                  className="history-card-header"
                  onClick={() => toggleProject(project.id)}
                >
                  <div className="history-card-main">
                    <div className="history-card-title">
                      <h3>{project.name}</h3>
                      <span className={`status-badge ${project.status}`}>
                        {project.status === 'paid' ? '💳 Pagado' : '✅ Completado'}
                      </span>
                    </div>

                    {project.description && (
                      <p className="history-description">{project.description}</p>
                    )}

                    <div className="history-card-meta">
                      {project.completedAt && (
                        <span className="meta-item">
                          <Calendar size={14} />
                          Completado: {formatDate(project.completedAt)}
                        </span>
                      )}
                      {project.paidAt && (
                        <span className="meta-item paid">
                          <DollarSign size={14} />
                          Pagado: {formatDate(project.paidAt)}
                        </span>
                      )}
                      {project.budget && (
                        <span className="meta-item budget">
                          <DollarSign size={14} />
                          {formatCurrency(project.budget)}
                        </span>
                      )}
                      {project.startDate && (
                        <span className="meta-item">
                          <Calendar size={14} />
                          Inicio: {formatDate(project.startDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button className="expand-btn">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="history-card-body">
                    {isLoadingDetails ? (
                      <div className="details-loading">
                        <Loader className="spinner" size={20} />
                        <p>Cargando detalles...</p>
                      </div>
                    ) : (
                      <>
                        {/* Milestones */}
                        <div className="details-section">
                          <h4>
                            <CheckCircle size={16} />
                            Milestones
                            {details?.milestones?.length > 0 && (
                              <span className="section-count">
                                {completedMilestones}/{totalMilestones} completados
                              </span>
                            )}
                          </h4>

                          {!details?.milestones?.length ? (
                            <p className="details-empty">Sin milestones registrados</p>
                          ) : (
                            <div className="milestones-list">
                              {details.milestones.map(milestone => (
                                <div key={milestone.id} className={`milestone-row ${milestone.status}`}>
                                  {getMilestoneStatusIcon(milestone.status)}
                                  <div className="milestone-info">
                                    <span className="milestone-title">{milestone.title}</span>
                                    {milestone.description && (
                                      <span className="milestone-desc">{milestone.description}</span>
                                    )}
                                  </div>
                                  {milestone.completedAt && (
                                    <span className="milestone-date">
                                      {formatDate(milestone.completedAt)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Files */}
                        <div className="details-section">
                          <h4>
                            <FileText size={16} />
                            Archivos del proyecto
                            {details?.files?.length > 0 && (
                              <span className="section-count">{details.files.length} archivos</span>
                            )}
                          </h4>

                          {!details?.files?.length ? (
                            <p className="details-empty">Sin archivos en este proyecto</p>
                          ) : (
                            <div className="files-list">
                              {details.files.map(file => (
                                <div key={file.id} className="file-row">
                                  <div className="file-row-info">
                                    <span className="file-row-name">{file.fileName}</span>
                                    <div className="file-row-meta">
                                      <span className="file-category-badge">
                                        {getCategoryLabel(file.category)}
                                      </span>
                                      <span className="file-row-size">
                                        {formatFileSize(file.fileSize)}
                                      </span>
                                      <span className="file-row-date">
                                        {formatDate(file.uploadedAt)}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    className="download-btn"
                                    onClick={() => handleDownload(file.downloadURL, file.fileName)}
                                    title="Descargar"
                                  >
                                    <Download size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectHistory;
