import { sendMessage } from './chatService';

/**
 * Notification Service
 * Sends automatic notifications to client chat when important events occur
 */

/**
 * Send a system notification to client chat
 * @param {string} chatId - Client's user ID (used as chatId)
 * @param {string} message - Notification message
 */
const sendSystemNotification = async (chatId, message) => {
  try {
    await sendMessage(
      chatId,
      'system', // senderId
      'System', // senderName
      'system', // senderRole
      message, // content
      null // no file
    );
    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Project Notifications
 */

export const notifyProjectCreated = async (clientId, projectName, adminName) => {
  const message = `🎉 ${adminName} created a new project: "${projectName}"`;
  return sendSystemNotification(clientId, message);
};

export const notifyProjectCompleted = async (clientId, projectName, adminName) => {
  const message = `✅ ${adminName} marked the project "${projectName}" as completed`;
  return sendSystemNotification(clientId, message);
};

export const notifyProjectReopened = async (clientId, projectName, adminName) => {
  const message = `🔄 ${adminName} reopened the project "${projectName}"`;
  return sendSystemNotification(clientId, message);
};

/**
 * Milestone Notifications
 */

export const notifyMilestoneCreated = async (clientId, milestoneName, projectName, creatorName) => {
  const message = `📌 ${creatorName} created a new milestone: "${milestoneName}" in project "${projectName}"`;
  return sendSystemNotification(clientId, message);
};

export const notifyMilestoneStatusChanged = async (clientId, milestoneName, oldStatus, newStatus, changerName) => {
  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed'
  };
  
  const statusEmojis = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅'
  };
  
  const emoji = statusEmojis[newStatus] || '🔔';
  const oldLabel = statusLabels[oldStatus] || oldStatus;
  const newLabel = statusLabels[newStatus] || newStatus;
  
  const message = `${emoji} ${changerName} changed milestone "${milestoneName}" status from ${oldLabel} to ${newLabel}`;
  return sendSystemNotification(clientId, message);
};

export const notifyMilestoneUpdated = async (clientId, milestoneName, updaterName) => {
  const message = `📝 ${updaterName} updated milestone "${milestoneName}"`;
  return sendSystemNotification(clientId, message);
};

export const notifyMilestoneDeleted = async (clientId, milestoneName, deleterName) => {
  const message = `🗑️ ${deleterName} deleted milestone "${milestoneName}"`;
  return sendSystemNotification(clientId, message);
};

export const notifyMilestoneReopened = async (clientId, milestoneName, reopenerName) => {
  const message = `🔄 ${reopenerName} reopened milestone "${milestoneName}"`;
  return sendSystemNotification(clientId, message);
};

/**
 * File Notifications (optional - for future use)
 */

export const notifyFileUploaded = async (clientId, fileName, uploaderName, category) => {
  const categoryLabels = {
    draft: 'Draft',
    final: 'Final',
    client: 'Client Files'
  };
  
  const categoryLabel = categoryLabels[category] || category;
  const message = `📎 ${uploaderName} uploaded "${fileName}" to ${categoryLabel}`;
  return sendSystemNotification(clientId, message);
};

export const notifyFileDeleted = async (clientId, fileName, deleterName) => {
  const message = `🗑️ ${deleterName} deleted file "${fileName}"`;
  return sendSystemNotification(clientId, message);
};
