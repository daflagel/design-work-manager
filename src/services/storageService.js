import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  where, 
  orderBy,
  getDocs,
  getDoc,
  Timestamp,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { storage, db } from '../firebase';
import { sendMessage } from './chatService';

/**
 * Storage Service
 * Handles all file storage operations with Firebase Storage and Firestore
 */

// Storage limits in bytes
export const STORAGE_LIMITS = {
  '500MB': 524288000,
  '1GB': 1073741824,
  '2GB': 2147483648,
  '5GB': 5368709120
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10485760;

// Allowed file types
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  documents: ['application/pdf', 'text/plain'],
  design: [
    'application/postscript', // AI
    'image/vnd.adobe.photoshop', // PSD
    'application/x-photoshop', // PSD alternative
    'image/x-photoshop', // PSD alternative
    'application/photoshop', // PSD alternative
    'application/illustrator', // AI alternative
    'application/x-indesign', // INDD
    'image/x-xcf', // GIMP
    'application/x-sketch', // Sketch
    'application/figma' // Figma (exported)
  ],
  office: [
    // PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  compressed: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ],
  video: [
    'video/mp4',
    'video/quicktime', // MOV
    'video/x-msvideo' // AVI
  ]
};

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_TYPES.images,
  ...ALLOWED_TYPES.documents,
  ...ALLOWED_TYPES.design,
  ...ALLOWED_TYPES.office,
  ...ALLOWED_TYPES.compressed,
  ...ALLOWED_TYPES.video
];

/**
 * Validate file before upload
 */
export const validateFile = (file) => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit. File size: ${(file.size / 1048576).toFixed(2)}MB`
    };
  }

  // Check file type
  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed: ${file.type}`
    };
  }

  return { valid: true };
};

/**
 * Check if client has enough storage space
 */
export const checkStorageLimit = async (clientId, fileSize) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', clientId));
    if (!userDoc.exists()) {
      return { allowed: false, error: 'Client not found' };
    }

    const userData = userDoc.data();
    const storageLimit = userData.storageLimit || STORAGE_LIMITS['1GB'];
    const storageUsed = userData.storageUsed || 0;

    if (storageUsed + fileSize > storageLimit) {
      const available = ((storageLimit - storageUsed) / 1048576).toFixed(2);
      const needed = (fileSize / 1048576).toFixed(2);
      return {
        allowed: false,
        error: `Not enough storage. Available: ${available}MB, Needed: ${needed}MB`
      };
    }

    return { allowed: true, storageUsed, storageLimit };
  } catch (error) {
    console.error('Error checking storage limit:', error);
    return { allowed: false, error: error.message };
  }
};

/**
 * Upload file to Firebase Storage
 * Returns upload task for progress tracking
 */
export const uploadFile = async (file, metadata, onProgress) => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check storage limit
    const storageCheck = await checkStorageLimit(metadata.clientId, file.size);
    if (!storageCheck.allowed) {
      throw new Error(storageCheck.error);
    }

    // Create storage path
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `clients/${metadata.clientId}/projects/${metadata.projectId}/${metadata.category}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Create file metadata in Firestore
            const fileDoc = {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              storagePath,
              downloadURL,
              
              clientId: metadata.clientId,
              clientName: metadata.clientName,
              
              projectId: metadata.projectId,
              projectName: metadata.projectName,
              projectStatus: metadata.projectStatus,
              
              category: metadata.category,
              
              uploadedBy: metadata.uploadedBy,
              uploadedByName: metadata.uploadedByName,
              uploadedAt: Timestamp.now(),
              
              milestoneId: metadata.milestoneId || null,
              milestoneName: metadata.milestoneName || null
            };

            const docRef = await addDoc(collection(db, 'files'), fileDoc);

            // Update client storage used
            await updateDoc(doc(db, 'users', metadata.clientId), {
              storageUsed: increment(file.size)
            });

            // Send message to chat with file
            const categoryLabels = {
              draft: 'Draft',
              final: 'Final',
              client: 'From You'
            };
            const categoryLabel = categoryLabels[metadata.category] || metadata.category;
            
            await sendMessage(
              metadata.clientId, // chatId
              metadata.uploadedBy, // senderId
              metadata.uploadedByName, // senderName
              metadata.uploadedBy === metadata.clientId ? 'client' : 'admin', // senderRole
              `Uploaded to ${categoryLabel}`, // content
              null  // <-- null en lugar del objeto fileData
);

            resolve({
              success: true,
              fileId: docRef.id,
              downloadURL,
              ...fileDoc
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete file from Storage and Firestore
 */
export const deleteFile = async (fileId) => {
  try {
    // Get file metadata
    const fileDoc = await getDoc(doc(db, 'files', fileId));
    if (!fileDoc.exists()) {
      return { success: false, error: 'File not found' };
    }

    const fileData = fileDoc.data();

    // Delete from Storage
    const storageRef = ref(storage, fileData.storagePath);
    await deleteObject(storageRef);

    // Delete from Firestore
    await deleteDoc(doc(db, 'files', fileId));

    // Update client storage used
    await updateDoc(doc(db, 'users', fileData.clientId), {
      storageUsed: increment(-fileData.fileSize)
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Move file between categories (draft <-> final only)
 */
export const moveFileCategory = async (fileId, newCategory) => {
  try {
    // Validate category move
    if (newCategory !== 'draft' && newCategory !== 'final') {
      return { success: false, error: 'Can only move between draft and final' };
    }

    // Get current file data
    const fileDoc = await getDoc(doc(db, 'files', fileId));
    if (!fileDoc.exists()) {
      return { success: false, error: 'File not found' };
    }

    const fileData = fileDoc.data();

    // Cannot move client files
    if (fileData.category === 'client') {
      return { success: false, error: 'Cannot move client files' };
    }

    // Update category in Firestore only (no need to move in Storage)
    await updateDoc(doc(db, 'files', fileId), {
      category: newCategory
    });

    return { success: true };
  } catch (error) {
    console.error('Error moving file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Attach file to milestone
 */
export const attachToMilestone = async (fileId, milestoneId, milestoneName) => {
  try {
    await updateDoc(doc(db, 'files', fileId), {
      milestoneId,
      milestoneName
    });
    return { success: true };
  } catch (error) {
    console.error('Error attaching to milestone:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Detach file from milestone
 */
export const detachFromMilestone = async (fileId) => {
  try {
    await updateDoc(doc(db, 'files', fileId), {
      milestoneId: null,
      milestoneName: null
    });
    return { success: true };
  } catch (error) {
    console.error('Error detaching from milestone:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all files for a project
 */
export const getProjectFiles = async (projectId) => {
  try {
    const q = query(
      collection(db, 'files'),
      where('projectId', '==', projectId),
      orderBy('uploadedAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting project files:', error);
    return [];
  }
};

/**
 * Get all files for a client
 */
export const getClientFiles = async (clientId) => {
  try {
    const q = query(
      collection(db, 'files'),
      where('clientId', '==', clientId),
      orderBy('uploadedAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting client files:', error);
    return [];
  }
};

/**
 * Subscribe to client files (real-time)
 */
export const subscribeToClientFiles = (clientId, callback) => {
  const q = query(
    collection(db, 'files'),
    where('clientId', '==', clientId),
    orderBy('uploadedAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(files);
  });
};

/**
 * Get storage usage for client
 */
export const getClientStorageInfo = async (clientId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', clientId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const storageLimit = userData.storageLimit || STORAGE_LIMITS['1GB'];
    const storageUsed = userData.storageUsed || 0;
    const storagePercent = ((storageUsed / storageLimit) * 100).toFixed(1);

    return {
      storageUsed,
      storageLimit,
      storagePercent,
      storageUsedMB: (storageUsed / 1048576).toFixed(2),
      storageLimitMB: (storageLimit / 1048576).toFixed(2),
      storageAvailable: storageLimit - storageUsed,
      storageAvailableMB: ((storageLimit - storageUsed) / 1048576).toFixed(2)
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
};

/**
 * Update client storage limit (admin only)
 */
export const updateClientStorageLimit = async (clientId, limitKey) => {
  try {
    const limit = STORAGE_LIMITS[limitKey];
    if (!limit) {
      return { success: false, error: 'Invalid storage limit' };
    }

    await updateDoc(doc(db, 'users', clientId), {
      storageLimit: limit
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating storage limit:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file is an image
 */
export const isImage = (fileType) => {
  return ALLOWED_TYPES.images.includes(fileType);
};
