import React, { useState } from 'react';
import { X } from 'lucide-react';
import './ClientProjectForm.css';

const ClientProjectForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    deadline: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a project name');
      return;
    }

    onSave({
      name: formData.name,
      description: formData.description,
      budget: formData.budget ? parseFloat(formData.budget) : 0,
      deadline: formData.deadline ? new Date(formData.deadline) : null
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content client-project-form">
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button onClick={onCancel} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">
              Project Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Brand Redesign, Website Development"
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
              placeholder="Describe what you need for this project..."
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="budget">Budget (€)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="deadline">Deadline</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientProjectForm;
