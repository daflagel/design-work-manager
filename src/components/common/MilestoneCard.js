import React from 'react';
import { CheckCircle, Clock, Circle, Calendar, Paperclip, Download, Loader } from 'lucide-react';
import './MilestoneCard.css';

const MilestoneCard = ({ milestone, onEdit, onDelete, onUpdateStatus, isAdmin }) => {
  const getStatusIcon = () => {
    switch (milestone.status) {
      case 'completed':
        return <CheckCircle className="status-icon completed" />;
      case 'in_progress':
        return <Loader className="status-icon in-progress spinning" />;
      default:
        return <Circle className="status-icon pending" />;
    }
  };

  const getStatusText = () => {
    switch (milestone.status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Pending';
    }
  };

  const getStatusClass = () => {
    return `milestone-card ${milestone.status}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const isOverdue = () => {
    if (!milestone.deadline || milestone.status === 'completed') return false;
    const deadline = milestone.deadline.toDate();
    return deadline < new Date();
  };

  return (
    <div className={getStatusClass()}>
      <div className="milestone-header">
        <div className="milestone-status">
          {getStatusIcon()}
          <span className="status-text">{getStatusText()}</span>
          {milestone.urgent && (
            <span className="urgent-badge">🔥 Urgent</span>
          )}
        </div>
      </div>

      <div className="milestone-body">
        <h3 className="milestone-title">{milestone.title}</h3>
        {milestone.description && (
          <p className="milestone-description">{milestone.description}</p>
        )}

        {milestone.deadline && (
          <div className={`milestone-deadline ${isOverdue() ? 'overdue' : ''}`}>
            <Calendar size={16} />
            <span>Deadline: {formatDate(milestone.deadline)}</span>
            {isOverdue() && <span className="overdue-badge">Overdue</span>}
          </div>
        )}

        {milestone.files && milestone.files.length > 0 && (
          <div className="milestone-files">
            <div className="files-header">
              <Paperclip size={16} />
              <span>{milestone.files.length} file{milestone.files.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="files-list">
              {milestone.files.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-item"
                >
                  <span className="file-name">{file.name}</span>
                  <Download size={14} />
                </a>
              ))}
            </div>
          </div>
        )}

        {milestone.completedAt && (
          <div className="milestone-completed">
            <CheckCircle size={14} />
            <span>Completed on {formatDate(milestone.completedAt)}</span>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="milestone-actions">
          {milestone.status !== 'completed' && onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(milestone.id, 'completed')}
              className="action-btn complete"
            >
              <CheckCircle size={16} />
              Mark Completed
            </button>
          )}
          {milestone.status === 'completed' && onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(milestone.id, 'in_progress')}
              className="action-btn reopen"
            >
              <Clock size={16} />
              Reopen
            </button>
          )}
          {milestone.status !== 'completed' && onEdit && (
            <button
              onClick={() => onEdit(milestone)}
              className="action-btn edit"
            >
              Edit
            </button>
          )}
          {milestone.status !== 'completed' && onDelete && (
            <button
              onClick={() => onDelete(milestone.id)}
              className="action-btn delete"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MilestoneCard;
