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
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Milestone Service
 * Handles all milestone-related operations
 */

// Create a new milestone
export const createMilestone = async (milestoneData) => {
  try {
    const milestone = {
      ...milestoneData,
      status: milestoneData.status || 'pending',
      urgent: milestoneData.urgent || false,
      files: milestoneData.files || [],
      order: milestoneData.order || 0,
      completedAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'milestones'), milestone);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating milestone:', error);
    return { success: false, error: error.message };
  }
};

// Update a milestone
export const updateMilestone = async (milestoneId, updates) => {
  try {
    const milestoneRef = doc(db, 'milestones', milestoneId);
    
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    // If marking as completed, add completedAt timestamp
    if (updates.status === 'completed' && !updates.completedAt) {
      updateData.completedAt = Timestamp.now();
    }

    // If changing from completed to other status, remove completedAt
    if (updates.status && updates.status !== 'completed') {
      updateData.completedAt = null;
    }

    await updateDoc(milestoneRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating milestone:', error);
    return { success: false, error: error.message };
  }
};

// Delete a milestone
export const deleteMilestone = async (milestoneId) => {
  try {
    await deleteDoc(doc(db, 'milestones', milestoneId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return { success: false, error: error.message };
  }
};

// Get all milestones for a client
export const getClientMilestones = async (clientId) => {
  try {
    const q = query(
      collection(db, 'milestones'),
      where('clientId', '==', clientId),
      orderBy('order', 'asc')
    );

    const snapshot = await getDocs(q);
    const milestones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return milestones;
  } catch (error) {
    console.error('Error getting client milestones:', error);
    return [];
  }
};

// Get milestones for a specific project
export const getProjectMilestones = async (projectId) => {
  try {
    const q = query(
      collection(db, 'milestones'),
      where('projectId', '==', projectId),
      orderBy('order', 'asc')
    );

    const snapshot = await getDocs(q);
    const milestones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return milestones;
  } catch (error) {
    console.error('Error getting project milestones:', error);
    return [];
  }
};

// Subscribe to client milestones (real-time)
export const subscribeToClientMilestones = (clientId, callback) => {
  const q = query(
    collection(db, 'milestones'),
    where('clientId', '==', clientId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const milestones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(milestones);
  }, (error) => {
    console.error('Error subscribing to milestones:', error);
    callback([]);
  });
};

// Subscribe to project milestones (real-time)
export const subscribeToProjectMilestones = (projectId, callback) => {
  const q = query(
    collection(db, 'milestones'),
    where('projectId', '==', projectId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const milestones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(milestones);
  }, (error) => {
    console.error('Error subscribing to project milestones:', error);
    callback([]);
  });
};

// Get all milestones (admin)
export const getAllMilestones = async () => {
  try {
    const q = query(
      collection(db, 'milestones'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const milestones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return milestones;
  } catch (error) {
    console.error('Error getting all milestones:', error);
    return [];
  }
};

// Add file to milestone
export const addFileToMilestone = async (milestoneId, fileData) => {
  try {
    const milestoneRef = doc(db, 'milestones', milestoneId);
    
    // Get current milestone
    const milestoneSnap = await getDocs(query(collection(db, 'milestones'), where('__name__', '==', milestoneId)));
    
    if (milestoneSnap.empty) {
      throw new Error('Milestone not found');
    }

    const currentMilestone = milestoneSnap.docs[0].data();
    const currentFiles = currentMilestone.files || [];

    const newFile = {
      ...fileData,
      uploadedAt: Timestamp.now()
    };

    await updateDoc(milestoneRef, {
      files: [...currentFiles, newFile],
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding file to milestone:', error);
    return { success: false, error: error.message };
  }
};

// Remove file from milestone
export const removeFileFromMilestone = async (milestoneId, fileUrl) => {
  try {
    const milestoneRef = doc(db, 'milestones', milestoneId);
    
    // Get current milestone
    const milestoneSnap = await getDocs(query(collection(db, 'milestones'), where('__name__', '==', milestoneId)));
    
    if (milestoneSnap.empty) {
      throw new Error('Milestone not found');
    }

    const currentMilestone = milestoneSnap.docs[0].data();
    const currentFiles = currentMilestone.files || [];

    // Filter out the file to remove
    const updatedFiles = currentFiles.filter(file => file.url !== fileUrl);

    await updateDoc(milestoneRef, {
      files: updatedFiles,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing file from milestone:', error);
    return { success: false, error: error.message };
  }
};

// Calculate project progress
export const calculateProgress = (milestones) => {
  if (!milestones || milestones.length === 0) return 0;
  
  const completed = milestones.filter(m => m.status === 'completed').length;
  return Math.round((completed / milestones.length) * 100);
};

const milestoneService = {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getClientMilestones,
  getProjectMilestones,
  subscribeToClientMilestones,
  subscribeToProjectMilestones,
  getAllMilestones,
  addFileToMilestone,
  removeFileFromMilestone,
  calculateProgress
};

export default milestoneService;
