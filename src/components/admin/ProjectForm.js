import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, DollarSign, Loader } from 'lucide-react';
import './ProjectForm.css';

const ProjectForm = ({ project, clients, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    name: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: ''
  });
  // FIX: Track submission state to prevent double-click creating duplicate projects
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        clientId: project.clientId,
        clientName: project.clientName,
        name: project.name,
        description: project.description || '',
        budget: project.budget || '',
        startDate: project.startDate ? formatDateForInput(project.startDate.toDate()) : '',
        endDate: project.endDate ? formatDateForInput(project.endDate.toDate()) : ''
      });
    }
  }, [project]);

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
      setFormData(prev => ({
        ...prev,
        clientId: value,
        clientName: selectedClient ? selectedClient.displayName || selectedClient.email : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.clientId || !formData.name) {
      alert('Please complete the required fields');
      return;
    }

    // FIX: Prevent double submission
    if (submitting) return;
    setSubmitting(true);

    try {
      const projectData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null
      };

      await onSave(projectData);
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      // FIX: Always re-enable button, even if onSave throws
      setSubmitting(false);
    }
  };

  return (
    <div className="project-form-overlay">
      <div className="project-form-container">
        <div className="project-form-header">
          <h2>{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onCancel} className="close-btn" disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
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
              disabled={!!project || submitting}
            >
              <option value="">Select a client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.displayName || client.email}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="name">
              <FileText size={16} />
              Project Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Personal Brand Redesign"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the project scope..."
              rows={4}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="budget">
              <DollarSign size={16} />
              Budget (€)
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              placeholder="5000"
              min="0"
              step="0.01"
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">
                <Calendar size={16} />
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">
                <Calendar size={16} />
                Estimated End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn-cancel"
              disabled={submitting}
            >
              Cancel
            </button>
            {/* FIX: Disabled during submission to prevent double-click */}
            <button
              type="submit"
              className="btn-save"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader size={16} className="spinner" />
                  {project ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                project ? 'Save Changes' : 'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
