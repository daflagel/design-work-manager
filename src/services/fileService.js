import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * File Service
 * Handles file uploads to Firebase Storage
 */

// Upload file to Firebase Storage
export const uploadChatFile = (file, chatId, onProgress) => {
  return new Promise((resolve, reject) => {
    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    
    // Create storage reference
    const storageRef = ref(storage, `chats/${chatId}/${fileName}`);
    
    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Monitor upload progress
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Error uploading file:', error);
        reject(error);
      },
      async () => {
        // Upload completed successfully
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            name: file.name,
            type: file.type,
            size: file.size,
            storagePath: `chats/${chatId}/${fileName}`
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

// Validate file before upload
export const validateFile = (file, maxSizeMB = 10) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido. Solo imágenes, PDFs y documentos.'
    };
  }

  // Check file size
  const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `El archivo es demasiado grande. Máximo ${maxSizeMB}MB.`
    };
  }

  return { valid: true };
};

// Get file icon based on type
export const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
  if (fileType === 'text/plain') return '📃';
  return '📎';
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Delete file from Storage
export const deleteFile = async (fileURL) => {
  try {
    // Extract file path from URL
    const url = new URL(fileURL);
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
    
    if (!pathMatch) {
      throw new Error('Invalid file URL');
    }
    
    const filePath = decodeURIComponent(pathMatch[1]);
    const fileRef = ref(storage, filePath);
    
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
};

const fileService = {
  uploadChatFile,
  validateFile,
  getFileIcon,
  formatFileSize,
  deleteFile
};

export default fileService;
