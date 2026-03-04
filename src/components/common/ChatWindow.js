import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, X, Loader, Trash2 } from 'lucide-react';
import { subscribeToChat, sendMessage, markMessagesAsRead, deleteMessage } from '../../services/chatService';
import { uploadChatFile, validateFile, getFileIcon, formatFileSize, deleteFile } from '../../services/fileService';
import { getActiveProject } from '../../services/projectService';
import { ref, getBlob } from 'firebase/storage';
import { storage } from '../../firebase';
import ImageModal from './ImageModal';
import './ChatWindow.css';

const ChatWindow = ({ chatId, currentUser, recipientName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;

    setLoading(true);
    let isFirstLoad = true;
    const unsubscribe = subscribeToChat(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      
      // Mark messages as read
      if (currentUser?.uid) {
        markMessagesAsRead(chatId, currentUser.uid);
      }

      // Scroll to bottom instantly on first load
      if (isFirstLoad) {
        isFirstLoad = false;
        setTimeout(() => scrollToBottom('instant'), 50);
      }
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  // Load active project for the client
  useEffect(() => {
    const loadActiveProject = async () => {
      try {
        const project = await getActiveProject(chatId); // chatId = clientId
        setActiveProject(project);
      } catch (error) {
        console.error('Error loading active project:', error);
      }
    };

    if (chatId) {
      loadActiveProject();
    }
  }, [chatId]);

  // Auto-scroll to bottom only if user is already near the bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 120; // px from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedImage]);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    try {
      let fileData = null;

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        fileData = await uploadChatFile(
          selectedFile,
          chatId,
          (progress) => setUploadProgress(progress)
        );
        setUploading(false);
      }

      // Determine user role
      const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
      const userRole = currentUser.email === adminEmail ? 'admin' : 'client';

      // Send message
     const clientInfo = {
  clientId: chatId,
  clientName: recipientName,
  projectId: activeProject?.id || null,
  projectName: activeProject?.name || null,
  projectStatus: activeProject?.status || null
};
      await sendMessage(
        chatId,
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        userRole,
        newMessage.trim(),
        fileData,
        clientInfo
      );

      // Clear input
      setNewMessage('');
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje');
      setUploading(false);
    }
  };

  const handleDeleteMessage = async (messageId, fileURL) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
      return;
    }

    try {
      setDeletingMessageId(messageId);

      // Delete file from Storage if exists
      if (fileURL) {
        await deleteFile(fileURL);
      }

      // Delete message from Firestore
      await deleteMessage(messageId);

      setDeletingMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Error al eliminar el mensaje');
      setDeletingMessageId(null);
    }
  };

  const canDeleteMessage = (message) => {
    // Only sender can delete
    if (message.senderId !== currentUser.uid) return false;

    // Check if within 10 minutes for text messages
    if (!message.fileURL) {
      const messageTime = message.createdAt?.toDate();
      const now = new Date();
      const diffMinutes = (now - messageTime) / 1000 / 60;
      return diffMinutes <= 10;
    }

    // Images can always be deleted
    return true;
  };

  const handleFileDownload = async (url, fileName, storagePath) => {
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
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(url, '_blank');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSelectedFile(file);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageClick = (imageUrl, fileName, storagePath) => {
    setSelectedImage({ url: imageUrl, name: fileName, storagePath });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Ahora';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} min`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    // More than 24 hours
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const isImage = (fileType) => {
    return fileType && fileType.startsWith('image/');
  };

  if (loading) {
    return (
      <div className="chat-window-loading">
        <Loader className="spinner" />
        <p>Cargando chat...</p>
      </div>
    );
  }

  return (
    <>
      <div className="chat-window">
        {/* Header */}
        <div className="chat-header">
          <div>
            <h3>{recipientName}</h3>
            
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <p>No hay mensajes aún</p>
              <p className="chat-empty-subtitle">Envía un mensaje para comenzar</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSystemMessage = msg.senderId === 'system' || msg.senderRole === 'system';
              const messageClass = isSystemMessage 
                ? 'message message-system' 
                : `message ${msg.senderId === currentUser.uid ? 'message-sent' : 'message-received'}`;
              
              return (
                <div
                  key={msg.id}
                  className={messageClass}
                >
                  <div className="message-bubble">
                    {msg.fileURL && (
                      <div className="message-file">
                        {isImage(msg.fileType) ? (
                          <div className="message-image-container">
                            <img
                              src={msg.fileURL}
                              alt={msg.fileName}
                              className="message-image"
                              onClick={() => handleImageClick(msg.fileURL, msg.fileName, msg.storagePath)}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'message-image-error';
                                errorDiv.textContent = `${msg.fileName} - Image no longer available`;
                                e.target.parentElement.appendChild(errorDiv);
                              }}
                            />
                            {canDeleteMessage(msg) && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id, msg.fileURL)}
                                className="delete-image-btn"
                                disabled={deletingMessageId === msg.id}
                                title="Eliminar imagen"
                              >
                                {deletingMessageId === msg.id ? (
                                  <Loader size={16} className="spinner" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleFileDownload(msg.fileURL, msg.fileName, msg.storagePath)}
                            className="message-file-link"
                          >
                            <span className="file-icon">{getFileIcon(msg.fileType)}</span>
                            <div className="file-info">
                              <span className="file-name">{msg.fileName}</span>
                              <span className="file-size">{formatFileSize(msg.fileSize)}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                    {msg.content && (
                      <div className="message-text-container">
                        <p className="message-text">{msg.content}</p>
                        {canDeleteMessage(msg) && !msg.fileURL && !isSystemMessage && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="delete-message-btn"
                            disabled={deletingMessageId === msg.id}
                            title="Eliminar mensaje"
                          >
                            {deletingMessageId === msg.id ? (
                              <Loader size={14} className="spinner" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                    {!isSystemMessage && (
                      <span className="message-time">{formatTimestamp(msg.createdAt)}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-container">
          {selectedFile && (
            <div className="selected-file-preview">
              <span className="file-icon">{getFileIcon(selectedFile.type)}</span>
              <span className="file-name">{selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                className="remove-file-btn"
                disabled={uploading}
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
          )}

          <div className="chat-input">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="attach-btn"
              disabled={uploading}
              title="Adjuntar archivo"
            >
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              disabled={uploading}
              className="message-input"
            />

            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || uploading}
              className="send-btn"
              title="Enviar mensaje"
            >
              {uploading ? <Loader className="spinner" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage.url}
          imageName={selectedImage.name}
          storagePath={selectedImage.storagePath}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
};

export default ChatWindow;
