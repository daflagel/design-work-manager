import React, { useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import { uploadFile, validateFile, formatFileSize } from '../../services/storageService';
import '../admin/StorageUpload.css';

const ClientStorageUpload = ({ currentUser, activeProject, milestones, onClose, onSuccess }) => {
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  const handleFileSelect = (selectedFile) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) { alert(validation.error); return; }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) { alert('Browse Files'); return; }

    const milestone = milestones.find(m => m.id === selectedMilestone);

    setUploading(true);
    try {
      const metadata = {
        clientId: currentUser.uid,
        clientName: currentUser.displayName || currentUser.email,
        projectId: activeProject?.id || null,
        projectName: activeProject?.name || null,
        projectStatus: activeProject?.status || null,
        category: 'client',
        uploadedBy: currentUser.uid,
        uploadedByName: currentUser.displayName || currentUser.email,
        milestoneId: milestone?.id || null,
        milestoneName: milestone?.title || null,
      };

      const result = await uploadFile(file, metadata, (progress) => setUploadProgress(progress));

      if (result.success) {
        onSuccess();
      } else {
        alert('Error uploading: ' + result.error);
        setUploading(false);
      }
    } catch (error) {
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
          {/* Project info — read only */}
          <div className="form-group">
            <label>Project</label>
            <select disabled>
              <option>{activeProject ? activeProject.name : 'No active project (General)'}</option>
            </select>
          </div>

          {/* Milestone — optional, only if active project has milestones */}
          {activeProject && milestones.length > 0 && (
            <div className="form-group">
              <label>
                Milestone
                <span className="form-optional" style={{ color: '#9e9e9e', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>(optional)</span>
              </label>
              <select
                value={selectedMilestone}
                onChange={(e) => setSelectedMilestone(e.target.value)}
                disabled={uploading}
              >
                <option value="">No milestone</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.urgent ? '🔥 ' : ''}{m.title}{m.status === 'completed' ? ' ✅' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Upload Area */}
          <div className="form-group">
            <label>File <span className="required">*</span></label>
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
                    <button onClick={() => setFile(null)} className="btn-remove-file">Remove</button>
                  )}
                </div>
              ) : (
                <>
                  <Upload size={48} />
                  <p>Drag & drop here</p>
                  <p className="upload-hint">o</p>
                  <label className="btn-browse">
                    Browse Files
                    <input type="file" onChange={handleFileInput} disabled={uploading} hidden />
                  </label>
                  <p className="upload-limits">Max 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className="progress-text">{Math.round(uploadProgress)}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button onClick={onClose} className="btn-cancel" disabled={uploading}>Cancel</button>
            <button
              onClick={handleUpload}
              className="btn-upload-submit"
              disabled={!file || uploading}
            >
              {uploading ? (
                <><Loader size={16} className="spinner" />Uploading...</>
              ) : (
                <><Upload size={16} />Upload File</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientStorageUpload;
