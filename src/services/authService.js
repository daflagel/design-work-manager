import { 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Approve a pending user and set their permissions
 */
export const approveUser = async (userId, permissions) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: permissions.approvedBy,
      currency: permissions.currency || 'USD',
      timezone: permissions.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      permissions: {
        canEditMilestones: permissions.canEditMilestones || false,
        canEditBudgets: permissions.canEditBudgets || false
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error approving user:', error);
    throw error;
  }
};

/**
 * Reject and delete a pending user
 */
export const rejectUser = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return { success: true };
  } catch (error) {
    console.error('Error rejecting user:', error);
    throw error;
  }
};

/**
 * Get all pending users
 */
export const getPendingUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    
    const pendingUsers = [];
    querySnapshot.forEach((doc) => {
      pendingUsers.push({ id: doc.id, ...doc.data() });
    });
    
    return pendingUsers;
  } catch (error) {
    console.error('Error fetching pending users:', error);
    throw error;
  }
};

/**
 * Update user permissions
 */
export const updateUserPermissions = async (userId, permissions) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      permissions: {
        canEditMilestones: permissions.canEditMilestones,
        canEditBudgets: permissions.canEditBudgets
      },
      currency: permissions.currency,
      timezone: permissions.timezone,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user permissions:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Get all approved clients
 */
export const getApprovedClients = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('status', '==', 'approved'),
      where('role', '==', 'client')
    );
    const querySnapshot = await getDocs(q);
    
    const clients = [];
    querySnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    return clients;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};
