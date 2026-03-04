import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import './MilestoneForm.css';

const MilestoneForm = ({ milestone, clients, projects, onSave, onCancel, isAdmin = true }) => {
  const [formData, setFormData] = useState({
    clientId: milestone?.clientId || '',
    clientName: milestone?.clientName || '',
    projectId: milestone?.projectId || '',
    title: milestone?.title || '',
    description: milestone?.description || '',
    deadline: '',
    urgent: milestone?.urgent || false,
    status: milestone?.status || 'pending'
  });
  
  const [clientProjects, setClientProjects] = useState([]);

  useEffect(() => {
    if (milestone) {
      setFormData({
        clientId: milestone.clientId || '',
        clientName: milestone.clientName || '',
        projectId: milestone.projectId || '',
        title: milestone.title || '',
        description: milestone.description || '',
        deadline: milestone.deadline ? formatDateForInput(milestone.deadline.toDate()) : '',
        urgent: milestone.urgent || false,
        status: milestone.status || 'pending'
      });
      
      // Filter projects for this client if needed
      if (milestone.clientId && projects && projects.length > 0) {
        const filtered = projects.filter(p => p.clientId === milestone.clientId && p.status === 'active');
        setClientProjects(filtered);
      }
    }
  }, [milestone, projects]);

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'clientId') {
      const selectedClient = clients.find(c => c.id === value);
      const filtered = projects ? projects.filter(p => p.clientId === value && p.status === 'active') : [];
      
      setFormData(prev => ({
        ...prev,
        clientId: value,
        clientName: selectedClient ? selectedClient.displayName || selectedClient.email : '',
        projectId: '' // Reset project when client changes
      }));
      setClientProjects(filtered);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.title) {
      alert('Please complete the required fields');
      return;
    }

    if (!formData.projectId) {
      alert('Please select a project');
      return;
    }

    const milestoneData = {
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline) : null,
      urgent: Boolean(formData.urgent)
    };

    onSave(milestoneData);
  };

  return (
    <div className="milestone-form-overlay">
      <div className="milestone-form-container">
        <div className="milestone-form-header">
          <h2>{milestone ? 'Edit Milestone' : 'New Milestone'}</h2>
          <button onClick={onCancel} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="milestone-form">
          {/* Only show client/project selectors if not pre-defined */}
          {!formData.clientId && (
            <div className="form-group">
              <label htmlFor="clientId">
                Client <span className="required">*</span>
              </label>
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                required
                disabled={!!milestone}
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.displayName || client.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!formData.projectId && formData.clientId && (
            <div className="form-group">
              <label htmlFor="projectId">
                Project <span className="required">*</span>
              </label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                required
                disabled={!formData.clientId}
              >
                <option value="">Select a project</option>
                {clientProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {formData.clientId && clientProjects.length === 0 && (
                <small style={{ color: '#e74c3c', fontSize: '12px' }}>
                  This client has no active projects. Create one first.
                </small>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">
              <FileText size={16} />
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Logo Design"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the milestone details..."
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deadline">
                <Calendar size={16} />
                Deadline
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="urgent" className="checkbox-label">
                <input
                  type="checkbox"
                  id="urgent"
                  name="urgent"
                  checked={formData.urgent}
                  onChange={(e) => setFormData(prev => ({ ...prev, urgent: e.target.checked }))}
                />
                <span>Mark as Urgent</span>
              </label>
              <small style={{ color: '#757575', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Urgent milestones appear first
              </small>
            </div>
          </div>

          {isAdmin && (
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-save">
              {milestone ? 'Save Changes' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MilestoneForm;
