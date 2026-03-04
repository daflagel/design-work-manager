import React from 'react';
import { X, Download } from 'lucide-react';
import { ref, getBlob } from 'firebase/storage';
import { storage } from '../../firebase';
import './ImageModal.css';

const ImageModal = ({ imageUrl, imageName, storagePath, onClose }) => {
  if (!imageUrl) return null;

  const handleDownload = async () => {
    try {
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        const blob = await getBlob(fileRef);
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = imageName || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // Fallback: fetch as blob (CORS is configured)
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = imageName || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      window.open(imageUrl, '_blank');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-modal-backdrop" onClick={handleBackdropClick}>
      <div className="image-modal-content">
        <div className="image-modal-header">
          <span className="image-modal-title">{imageName || 'Imagen'}</span>
          <div className="image-modal-actions">
            <button
              onClick={handleDownload}
              className="image-modal-btn"
              title="Descargar"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="image-modal-btn"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="image-modal-body">
          <img
            src={imageUrl}
            alt={imageName || 'Preview'}
            className="image-modal-img"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
