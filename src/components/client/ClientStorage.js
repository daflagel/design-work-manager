import React, { useState, useEffect } from 'react';
import { 
  Upload, Download, Trash2, Filter, Search,
  FileText, Image, File, Loader, FolderOpen,
  HardDrive, Eye, X
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, getBlob } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { deleteFile, formatFileSize } from '../../services/storageService';
import { getProjectMilestones } from '../../services/milestoneService';
import { getActiveProject } from '../../services/projectService';
import ClientStorageUpload from './ClientStorageUpload';
import '../admin/StorageManager.css';

const ClientStorage = ({ currentUser }) => {
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [milestones, setMilestones] = useState([]);

  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) return;

    loadActiveProject();

    const filesQuery = query(
      collection(db, 'files'),
      where('clientId', '==', currentUser.uid),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const filesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFiles(filesList);
      setTotalSize(filesList.reduce((acc, f) => acc + (f.fileSize || 0), 0));
      setLoading(false);
    }, (error) => {
      console.error('Error subscribing to files:', error);
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (!activeProject?.id) return;

    const milestonesQuery = query(
      collection(db, 'milestones'),
      where('projectId', '==', activeProject.id),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(milestonesQuery, (snapshot) => {
      setMilestones(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [activeProject]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, filterProject, filterCategory, searchTerm]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setPreviewFile(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const loadActiveProject = async () => {
    try {
      const project = await getActiveProject(currentUser.uid);
      setActiveProject(project);
      if (project?.id) {
        const ms = await getProjectMilestones(project.id);
        setMilestones(ms);
      }
    } catch (error) {
      console.error('Error loading active project:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...files];
    if (filterProject) filtered = filtered.filter(f => f.projectName === filterProject);
    if (filterCategory) filtered = filtered.filter(f => f.category === filterCategory);
    if (searchTerm) filtered = filtered.filter(f =>
      f.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFiles(filtered);
  };

  const handleDownload = async (url, fileName, storagePath) => {
    try {
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        const blob = await getBlob(fileRef);
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
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
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(url, '_blank');
    }
  };

  const handleView = (file) => {
    if (file.fileType?.startsWith('image/')) {
      setPreviewFile(file);
    } else {
      window.open(file.downloadURL, '_blank');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    const result = await deleteFile(fileId);
    if (!result.success) alert('Error deleting: ' + result.error);
  };

  const canDelete = (file) => file.category === 'client' && file.uploadedBy === currentUser.uid;

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <Image size={16} />;
    if (fileType?.includes('pdf')) return <FileText size={16} />;
    return <File size={16} />;
  };

  const isViewable = (fileType) =>
    fileType?.startsWith('image/') || fileType?.includes('pdf');

  const getCategoryLabel = (category) => {
    const labels = { draft: 'Draft', final: 'Final', client: 'Mine', general: 'General' };
    return labels[category] || category;
  };

  const getCategoryClass = (category) => `category-badge category-${category}`;

  const uniqueProjects = [...new Set(files.map(f => f.projectName))].filter(Boolean);

  if (loading) {
    return (
      <div className="storage-loading">
        <Loader className="spinner" size={32} />
        <p>Cargando archivos...</p>
      </div>
    );
  }

  return (
    <div className="storage-manager">
      <div className="storage-header">
        <div>
          <h1>My Files</h1>
          <p>All your project files</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn-upload" disabled={!activeProject}>
          <Upload size={18} />
          Upload File
        </button>
      </div>

      <div className="storage-stats">
        <div className="stat-card">
          <HardDrive size={24} />
          <div className="stat-info">
            <span className="stat-value">{formatFileSize(totalSize)}</span>
            <span className="stat-label">Storage used</span>
          </div>
        </div>
        <div className="stat-card">
          <FolderOpen size={24} />
          <div className="stat-info">
            <span className="stat-value">{files.length}</span>
            <span className="stat-label">Total files</span>
          </div>
        </div>
        <div className="stat-card">
          <FileText size={24} />
          <div className="stat-info">
            <span className="stat-value">{uniqueProjects.length}</span>
            <span className="stat-label">Projects</span>
          </div>
        </div>
      </div>

      <div className="storage-filters">
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All projects</option>
            {uniqueProjects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
            <option value="client">Mine</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="search-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="storage-table-container">
        {filteredFiles.length === 0 ? (
          <div className="no-files">
            <FolderOpen size={48} />
            <p>No files found</p>
          </div>
        ) : (
          <table className="storage-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Project</th>
                <th>Milestone</th>
                <th>Category</th>
                <th>Size</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map(file => (
                <tr key={file.id}>
                  <td className="file-name-cell">
                    {getFileIcon(file.fileType)}
                    <span>{file.fileName}</span>
                  </td>
                  <td>{file.projectName || <span className="no-milestone">—</span>}</td>
                  <td>
                    {file.milestoneName
                      ? <span className="milestone-badge">{file.milestoneName}</span>
                      : <span className="no-milestone">—</span>
                    }
                  </td>
                  <td>
                    <span className={getCategoryClass(file.category)}>
                      {getCategoryLabel(file.category)}
                    </span>
                  </td>
                  <td>{formatFileSize(file.fileSize)}</td>
                  <td>
                    {file.uploadedAt?.toDate().toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="actions-cell">
                    {isViewable(file.fileType) && (
                      <button onClick={() => handleView(file)} className="btn-action btn-view" title="View">
                        <Eye size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(file.downloadURL, file.fileName, file.storagePath)}
                      className="btn-action btn-download"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    {canDelete(file) && (
                      <button onClick={() => handleDelete(file.id)} className="btn-action btn-delete" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUploadModal && (
        <ClientStorageUpload
          currentUser={currentUser}
          activeProject={activeProject}
          milestones={milestones}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => setShowUploadModal(false)}
        />
      )}

      {previewFile && (
        <div className="preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <span className="preview-filename">{previewFile.fileName}</span>
              <div className="preview-header-actions">
                <button
                  className="preview-download-btn"
                  onClick={() => handleDownload(previewFile.downloadURL, previewFile.fileName, previewFile.storagePath)}
                >
                  <Download size={16} />
                  Download
                </button>
                <button className="preview-close-btn" onClick={() => setPreviewFile(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="preview-modal-body">
              <img src={previewFile.downloadURL} alt={previewFile.fileName} className="preview-image" />
            </div>
            <div className="preview-modal-footer">
              <span>{previewFile.projectName || '—'}</span>
              {previewFile.milestoneName && (
                <><span>·</span><span className="milestone-badge">{previewFile.milestoneName}</span></>
              )}
              <span>·</span>
              <span className={getCategoryClass(previewFile.category)}>
                {getCategoryLabel(previewFile.category)}
              </span>
              <span>·</span>
              <span>{formatFileSize(previewFile.fileSize)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientStorage;
