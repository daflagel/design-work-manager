import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  Filter, 
  Search,
  FileText,
  Image,
  File,
  Loader,
  FolderOpen,
  HardDrive,
  Eye,
  X
} from 'lucide-react';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { ref, getBlob } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { deleteFile, formatFileSize } from '../../services/storageService';
import StorageUpload from './StorageUpload';
import './StorageManager.css';

const StorageManager = ({ currentUser }) => {
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  
  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stats
  const [totalSize, setTotalSize] = useState(0);
  const [clientStats, setClientStats] = useState({});

  useEffect(() => {
    loadClients();

    const filesQuery = query(
      collection(db, 'files'),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const filesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFiles(filesList);

      let total = 0;
      const stats = {};
      filesList.forEach(file => {
        total += file.fileSize || 0;
        if (!stats[file.clientId]) {
          stats[file.clientId] = {
            totalSize: 0,
            fileCount: 0,
            clientName: file.clientName
          };
        }
        stats[file.clientId].totalSize += file.fileSize || 0;
        stats[file.clientId].fileCount += 1;
      });
      setTotalSize(total);
      setClientStats(stats);
      setLoading(false);
    }, (error) => {
      console.error('Error subscribing to files:', error);
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, filterClient, filterProject, filterCategory, searchTerm]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const loadClients = async () => {
    try {
      const usersRef = collection(db, 'users');
      const clientsQuery = query(
        usersRef,
        where('role', '==', 'client'),
        where('status', '==', 'approved')
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      setClients(clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...files];
    if (filterClient) filtered = filtered.filter(f => f.clientId === filterClient);
    if (filterProject) filtered = filtered.filter(f => f.projectName === filterProject);
    if (filterCategory) filtered = filtered.filter(f => f.category === filterCategory);
    if (searchTerm) filtered = filtered.filter(f => 
      f.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFiles(filtered);
  };

  const handleDownload = async (url, fileName, storagePath) => {
    try {
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
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    const result = await deleteFile(fileId);
    if (!result.success) {
      alert('Error deleting file: ' + result.error);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <Image size={16} />;
    if (fileType?.includes('pdf')) return <FileText size={16} />;
    return <File size={16} />;
  };

  const isViewable = (fileType) => {
    return fileType?.startsWith('image/') || fileType?.includes('pdf');
  };

  const getCategoryLabel = (category) => {
    const labels = { 
      draft: 'Draft', 
      final: 'Final', 
      client: 'From Client',
      general: 'General'
    };
    return labels[category] || category;
  };

  const getCategoryClass = (category) => `category-badge category-${category}`;

  const uniqueProjects = [...new Set(files.map(f => f.projectName))].filter(Boolean);

  if (loading) {
    return (
      <div className="storage-loading">
        <Loader className="spinner" size={32} />
        <p>Loading storage data...</p>
      </div>
    );
  }

  return (
    <div className="storage-manager">
      {/* Header */}
      <div className="storage-header">
        <div>
          <h1>Storage Manager</h1>
          <p>Manage all client files and storage</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn-upload">
          <Upload size={18} />
          Upload File
        </button>
      </div>

      {/* Stats */}
      <div className="storage-stats">
        <div className="stat-card">
          <HardDrive size={24} />
          <div className="stat-info">
            <span className="stat-value">{formatFileSize(totalSize)}</span>
            <span className="stat-label">Total Storage Used</span>
          </div>
        </div>
        <div className="stat-card">
          <FolderOpen size={24} />
          <div className="stat-info">
            <span className="stat-value">{files.length}</span>
            <span className="stat-label">Total Files</span>
          </div>
        </div>
        <div className="stat-card">
          <FileText size={24} />
          <div className="stat-info">
            <span className="stat-value">{Object.keys(clientStats).length}</span>
            <span className="stat-label">Active Clients</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="storage-filters">
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.displayName || client.email}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {uniqueProjects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
            <option value="client">From Client</option>
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

      {/* Files Table */}
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
                <th>Client</th>
                <th>Project</th>
                <th>Milestone</th>
                <th>Category</th>
                <th>Size</th>
                <th>Uploaded</th>
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
                  <td>{file.clientName}</td>
                  <td>{file.projectName || <span className="no-milestone">—</span>}</td>
                  <td>
                    {file.milestoneName ? (
                      <span className="milestone-badge">{file.milestoneName}</span>
                    ) : (
                      <span className="no-milestone">—</span>
                    )}
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
                      <button
                        onClick={() => handleView(file)}
                        className="btn-action btn-view"
                        title="View"
                      >
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
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="btn-action btn-delete"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <StorageUpload
          clients={clients}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => setShowUploadModal(false)}
          currentUser={currentUser}
        />
      )}

      {/* Image Preview Modal */}
      {previewFile && (
        <div className="preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <span className="preview-filename">{previewFile.fileName}</span>
              <div className="preview-header-actions">
                <button
                  className="preview-download-btn"
                  onClick={() => handleDownload(previewFile.downloadURL, previewFile.fileName, previewFile.storagePath)}
                  title="Download"
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  className="preview-close-btn"
                  onClick={() => setPreviewFile(null)}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="preview-modal-body">
              <img
                src={previewFile.downloadURL}
                alt={previewFile.fileName}
                className="preview-image"
              />
            </div>
            <div className="preview-modal-footer">
              <span>{previewFile.clientName}</span>
              <span>·</span>
              <span>{previewFile.projectName || '—'}</span>
              {previewFile.milestoneName && (
                <>
                  <span>·</span>
                  <span className="milestone-badge">{previewFile.milestoneName}</span>
                </>
              )}
              <span>·</span>
              <span className={`category-badge category-${previewFile.category}`}>
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

export default StorageManager;
