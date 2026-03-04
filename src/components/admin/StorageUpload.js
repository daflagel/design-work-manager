import React, { useState, useEffect } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadFile, validateFile, formatFileSize } from '../../services/storageService';
import './StorageUpload.css';

const StorageUpload = ({ clients, onClose, onSuccess, currentUser }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [category, setCategory] = useState('draft');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadClientProjects(selectedClient);
    } else {
      setProjects([]);
      setSelectedProject('');
      setMilestones([]);
      setSelectedMilestone('');
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectMilestones(selectedProject);
    } else {
      setMilestones([]);
      setSelectedMilestone('');
    }
  }, [selectedProject]);

  const loadClientProjects = async (clientId) => {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('clientId', '==', clientId),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(projectsQuery);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
      if (projectsList.length === 1) {
        setSelectedProject(projectsList[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadProjectMilestones = async (projectId) => {
    try {
      const q = query(
        collection(db, 'milestones'),
        where('projectId', '==', projectId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMilestones(list);
      setSelectedMilestone('');
    } catch (error) {
      console.error('Error loading milestones:', error);
      setMilestones([]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!selectedClient || !selectedProject || !category || !file) {
      alert('Please fill all fields and select a file');
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    const project = projects.find(p => p.id === selectedProject);
    const milestone = milestones.find(m => m.id === selectedMilestone);

    if (!client || !project) {
      alert('Invalid client or project');
      return;
    }

    setUploading(true);

    try {
      const metadata = {
        clientId: selectedClient,
        clientName: client.displayName || client.email,
        projectId: selectedProject,
        projectName: project.name,
        projectStatus: project.status,
        category: category,
        uploadedBy: currentUser.uid,
        uploadedByName: currentUser.displayName || currentUser.email,
        // Optional milestone association
        milestoneId: milestone?.id || null,
        milestoneName: milestone?.title || null
      };

      const result = await uploadFile(file, metadata, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        onSuccess();
      } else {
        alert('Error uploading file: ' + result.error);
        setUploading(false);
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error uploading file');
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content storage-upload-modal">
        <div className="modal-header">
          <h2>Upload File</h2>
          <button onClick={onClose} className="btn-close" disabled={uploading}>
            <X size={20} />
          </button>
        </div>

        <div className="upload-form">
          {/* Client Selection */}
          <div className="form-group">
            <label htmlFor="client">
              Client <span className="required">*</span>
            </label>
            <select
              id="client"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={uploading}
              required
            >
              <option value="">Select client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.displayName || client.email}
                </option>
              ))}
            </select>
          </div>

          {/* Project Selection */}
          <div className="form-group">
            <label htmlFor="project">
              Project <span className="required">*</span>
            </label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={!selectedClient || uploading}
              required
            >
              <option value="">
                {!selectedClient ? 'Select client first...' : 'Select project...'}
              </option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedClient && projects.length === 0 && (
              <span className="form-hint">This client has no active projects</span>
            )}
          </div>

          {/* Milestone Selection — optional */}
          {selectedProject && (
            <div className="form-group">
              <label htmlFor="milestone">
                Milestone
                <span className="form-optional"> (optional)</span>
              </label>
              <select
                id="milestone"
                value={selectedMilestone}
                onChange={(e) => setSelectedMilestone(e.target.value)}
                disabled={uploading}
              >
                <option value="">No milestone</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.urgent ? '🔴 ' : ''}{m.title}
                    {m.status === 'completed' ? ' ✅' : ''}
                  </option>
                ))}
              </select>
              {selectedProject && milestones.length === 0 && (
                <span className="form-hint">This project has no milestones yet</span>
              )}
            </div>
          )}

          {/* Category Selection */}
          <div className="form-group">
            <label htmlFor="category">
              Category <span className="required">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={uploading}
              required
            >
              <option value="draft">Draft (Work in Progress)</option>
              <option value="final">Final (Delivered Work)</option>
            </select>
          </div>

          {/* File Upload Area */}
          <div className="form-group">
            <label>
              File <span className="required">*</span>
            </label>
            <div
              className={`upload-area ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="file-preview">
                  <Upload size={32} />
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                  {!uploading && (
                    <button onClick={() => setFile(null)} className="btn-remove-file">
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Upload size={48} />
                  <p>Drag & drop file here</p>
                  <p className="upload-hint">or</p>
                  <label className="btn-browse">
                    Browse Files
                    <input
                      type="file"
                      onChange={handleFileInput}
                      disabled={uploading}
                      hidden
                    />
                  </label>
                  <p className="upload-limits">Max file size: 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(uploadProgress)}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button onClick={onClose} className="btn-cancel" disabled={uploading}>
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="btn-upload-submit"
              disabled={!selectedClient || !selectedProject || !file || uploading}
            >
              {uploading ? (
                <>
                  <Loader size={16} className="spinner" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageUpload;
