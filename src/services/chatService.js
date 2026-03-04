import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

/**
 * Chat Service
 * Handles all chat-related operations
 */

// Send a new message
export const sendMessage = async (chatId, senderId, senderName, senderRole, content, fileData = null, projectData = null) => {
  try {
    const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
    const role = senderRole || (senderName === adminEmail ? 'admin' : 'client');
    
    const messageData = {
      chatId,
      senderId,
      senderName,
      senderRole: role,
      content: content || '',
      fileURL: fileData?.url || null,
      fileName: fileData?.name || null,
      fileType: fileData?.type || null,
      fileSize: fileData?.size || null,
      storagePath: fileData?.storagePath || null,
      createdAt: Timestamp.now(),
      read: false
    };

    const docRef = await addDoc(collection(db, 'messages'), messageData);
    
    // If file is attached, save to files collection
    // If no projectData, save as general file
    if (fileData) {
      try {
        const fileDoc = {
          fileName: fileData.name,
          fileSize: fileData.size,
          fileType: fileData.type,
          storagePath: fileData.storagePath || 'chats/' + chatId + '/' + fileData.name,
          downloadURL: fileData.url,
          
          clientId: projectData?.clientId || chatId,
          clientName: projectData?.clientName || senderName,
          
          projectId: projectData?.projectId || null,
          projectName: projectData?.projectName || null,
          projectStatus: projectData?.projectStatus || null,
          
          // No project = general category
          category: !projectData ? 'general' : (role === 'admin' ? 'draft' : 'client'),
          
          uploadedBy: senderId,
          uploadedByName: senderName,
          uploadedAt: Timestamp.now(),
          
          milestoneId: null,
          milestoneName: null,
          
          source: 'chat'
        };
        
        await addDoc(collection(db, 'files'), fileDoc);
      } catch (fileError) {
        console.error('Error saving file to storage collection:', fileError);
      }
    }
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

// Subscribe to messages in a chat (real-time)
export const subscribeToChat = (chatId, callback) => {
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to chat:', error);
    callback([]);
  });
};

// Mark messages as read
export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(document => 
      updateDoc(doc(db, 'messages', document.id), { read: true })
    );
    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { success: false, error: error.message };
  }
};

// Get unread message count for a chat
export const getUnreadCount = async (chatId, userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Get all chats for admin
export const getAdminChats = async () => {
  try {
    const messagesRef = collection(db, 'messages');
    const snapshot = await getDocs(messagesRef);
    const chatIds = [...new Set(snapshot.docs.map(doc => doc.data().chatId))];
    return chatIds;
  } catch (error) {
    console.error('Error getting admin chats:', error);
    return [];
  }
};

// Get last message in a chat
export const getLastMessage = async (chatId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const lastDoc = snapshot.docs[0];
    return { id: lastDoc.id, ...lastDoc.data() };
  } catch (error) {
    console.error('Error getting last message:', error);
    return null;
  }
};

// Delete a message
export const deleteMessage = async (messageId) => {
  try {
    const messageDoc = await getDoc(doc(db, 'messages', messageId));
    
    if (messageDoc.exists()) {
      const messageData = messageDoc.data();
      if (messageData.fileURL) {
        try {
          const urlParts = messageData.fileURL.split('/o/')[1];
          if (urlParts) {
            const filePath = decodeURIComponent(urlParts.split('?')[0]);
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
          }
        } catch (storageError) {
          console.error('Error deleting file from Storage:', storageError);
        }
      }
    }
    
    await deleteDoc(doc(db, 'messages', messageId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message };
  }
};

const chatService = {
  sendMessage,
  subscribeToChat,
  markMessagesAsRead,
  getUnreadCount,
  getAdminChats,
  getLastMessage,
  deleteMessage
};

export default chatService;
