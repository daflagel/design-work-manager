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
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { ref, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from '../firebase';

/**
 * Project Service
 * Handles all project-related operations
 */

// Create a new project
export const createProject = async (projectData) => {
  try {
    // Check if client already has an active project
    const activeProject = await getActiveProject(projectData.clientId);
    if (activeProject) {
      return { 
        success: false, 
        error: 'This client already has an active project. Complete it before creating a new one.' 
      };
    }

    const project = {
      ...projectData,
      status: 'active',
      paid: false,
      paidAt: null,
      completedAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'projects'), project);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }
};

// Update a project
export const updateProject = async (projectId, updates) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    if (updates.status === 'completed' && !updates.completedAt) {
      updateData.completedAt = Timestamp.now();
    }

    if (updates.paid === true && !updates.paidAt) {
      updateData.paidAt = Timestamp.now();
    }

    await updateDoc(projectRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper: safely delete a Storage file, ignoring "not found" errors
 */
const safeDeleteStorageFile = async (storagePath) => {
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    console.log(`Deleted from Storage: ${storagePath}`);
  } catch (error) {
    // object-not-found is expected for already-deleted files — ignore it
    if (error.code !== 'storage/object-not-found') {
      console.error(`Error deleting from Storage: ${storagePath}`, error.code);
    }
  }
};

/**
 * Helper: recursively delete all files inside a Storage folder
 */
const deleteStorageFolder = async (folderPath) => {
  try {
    const folderRef = ref(storage, folderPath);
    const contents = await listAll(folderRef);

    const deletions = [];

    // Delete files in current level
    contents.items.forEach(itemRef => {
      deletions.push(safeDeleteStorageFile(itemRef.fullPath));
    });

    // Recurse into subfolders
    for (const subfolderRef of contents.prefixes) {
      const subContents = await listAll(subfolderRef);
      subContents.items.forEach(itemRef => {
        deletions.push(safeDeleteStorageFile(itemRef.fullPath));
      });
    }

    await Promise.all(deletions);
    console.log(`Deleted Storage folder: ${folderPath}`);
  } catch (error) {
    // Folder may not exist — that's fine
    console.log(`Storage folder not found or already empty: ${folderPath}`);
  }
};

// Delete a project and ALL related data
export const deleteProject = async (projectId) => {
  try {
    // Get project info first to know clientId
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      return { success: false, error: 'Project not found' };
    }
    const projectData = projectDoc.data();
    const clientId = projectData.clientId;

    // 1. Delete all milestones
    const milestonesQuery = query(
      collection(db, 'milestones'),
      where('projectId', '==', projectId)
    );
    const milestonesSnapshot = await getDocs(milestonesQuery);
    await Promise.all(milestonesSnapshot.docs.map(d => deleteDoc(d.ref)));
    console.log(`Deleted ${milestonesSnapshot.size} milestones`);

    // 2. Delete Firestore file records + their Storage files
    const filesQuery = query(
      collection(db, 'files'),
      where('projectId', '==', projectId)
    );
    const filesSnapshot = await getDocs(filesQuery);

    // Delete each file from Storage using storagePath
    await Promise.all(
      filesSnapshot.docs.map(async (fileDoc) => {
        const fileData = fileDoc.data();
        if (fileData.storagePath) {
          await safeDeleteStorageFile(fileData.storagePath);
        }
      })
    );

    // Delete file records from Firestore
    await Promise.all(filesSnapshot.docs.map(d => deleteDoc(d.ref)));
    console.log(`Deleted ${filesSnapshot.size} file records from Firestore`);

    // 3. Delete the entire project folder from Storage (catches any files not in Firestore)
    await deleteStorageFolder(`clients/${clientId}/projects/${projectId}`);

    // 4. Chat files uploaded via ChatWindow land in chats/{clientId}/ in Storage.
    // These are already swept by the deleteStorageFolder call in step 3 (project folder).
    // Files in chats/ are scoped to the client, not the project, so we leave them
    // intact to preserve chat history for other projects.
    // For a complete client cleanup, delete the client user document separately.

    // 5. Delete the project document itself
    await deleteDoc(doc(db, 'projects', projectId));

    console.log(`Project ${projectId} and all related data deleted successfully`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
};

// Get all projects for a client
export const getClientProjects = async (clientId) => {
  try {
    const q = query(
      collection(db, 'projects'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting client projects:', error);
    return [];
  }
};

// Get active project for a client
export const getActiveProject = async (clientId) => {
  try {
    const q = query(
      collection(db, 'projects'),
      where('clientId', '==', clientId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const projectDoc = snapshot.docs[0];
    return { id: projectDoc.id, ...projectDoc.data() };
  } catch (error) {
    console.error('Error getting active project:', error);
    return null;
  }
};

// Subscribe to active project (real-time)
export const subscribeToActiveProject = (clientId, callback) => {
  const q = query(
    collection(db, 'projects'),
    where('clientId', '==', clientId),
    where('status', '==', 'active')
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const projectDoc = snapshot.docs[0];
    callback({ id: projectDoc.id, ...projectDoc.data() });
  }, (error) => {
    console.error('Error subscribing to active project:', error);
    callback(null);
  });
};

// Get all projects (admin)
export const getAllProjects = async () => {
  try {
    const q = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all projects:', error);
    return [];
  }
};

// Subscribe to all projects (real-time)
export const subscribeToAllProjects = (callback) => {
  const q = query(
    collection(db, 'projects'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(projects);
  }, (error) => {
    console.error('Error subscribing to projects:', error);
    callback([]);
  });
};

// Get project by ID
export const getProjectById = async (projectId) => {
  try {
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) return null;
    return { id: projectDoc.id, ...projectDoc.data() };
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
};

// Mark project as completed
export const completeProject = async (projectId) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error completing project:', error);
    return { success: false, error: error.message };
  }
};

// Mark project as paid
export const markProjectAsPaid = async (projectId) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      paid: true,
      paidAt: Timestamp.now(),
      status: 'paid',
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking project as paid:', error);
    return { success: false, error: error.message };
  }
};

// Archive project
export const archiveProject = async (projectId) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'archived',
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error archiving project:', error);
    return { success: false, error: error.message };
  }
};

// Calculate project statistics
export const calculateProjectStats = (project, milestones) => {
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const isComplete = totalMilestones > 0 && completedMilestones === totalMilestones;

  return { totalMilestones, completedMilestones, progress, isComplete };
};

const projectService = {
  createProject,
  updateProject,
  deleteProject,
  getClientProjects,
  getActiveProject,
  subscribeToActiveProject,
  subscribeToAllProjects,
  getAllProjects,
  getProjectById,
  completeProject,
  markProjectAsPaid,
  archiveProject,
  calculateProjectStats
};

export default projectService;
