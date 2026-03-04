import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Loader } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { getLastMessage, getUnreadCount } from '../../services/chatService';
import ChatWindow from '../common/ChatWindow';
import './ChatList.css';

const ChatList = ({ currentUser }) => {
  const [clients, setClients] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  // FIX: Use initialLoading (only true on first load) instead of loading
  // The original bug: setLoading(true) on every 30s refresh caused ChatWindow to unmount
  const [initialLoading, setInitialLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    // FIX: Use onSnapshot on the users collection for real-time client list
    // This replaces the 30s polling interval that was destroying ChatWindow
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', '==', 'client'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      await enrichAndSetClients(snapshot.docs);
      setInitialLoading(false);
    }, (error) => {
      console.error('Error subscribing to clients:', error);
      setInitialLoading(false);
    });

    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh last message + unread counts when chat selection changes
  // FIX: Does NOT set loading=true, so ChatWindow stays mounted
  useEffect(() => {
    if (!selectedChat) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshClientMeta();
    }, 1000);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  const enrichAndSetClients = async (docs) => {
    try {
      const clientsList = await Promise.all(
        docs.map(async (doc) => {
          const clientData = { id: doc.id, ...doc.data() };
          const lastMessage = await getLastMessage(doc.id);
          const unreadCount = await getUnreadCount(doc.id, currentUser.uid);
          return { ...clientData, lastMessage, unreadCount };
        })
      );

      clientsList.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return (b.lastMessage.createdAt?.seconds || 0) - (a.lastMessage.createdAt?.seconds || 0);
      });

      setClients(clientsList);
    } catch (error) {
      console.error('Error enriching clients:', error);
    }
  };

  // FIX: Refresh only last message + unread WITHOUT touching initialLoading
  // Safe to call at any time — ChatWindow will never unmount because of this
  const refreshClientMeta = async () => {
    try {
      const updated = await Promise.all(
        clients.map(async (client) => {
          const lastMessage = await getLastMessage(client.id);
          const unreadCount = await getUnreadCount(client.id, currentUser.uid);
          return { ...client, lastMessage, unreadCount };
        })
      );

      updated.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return (b.lastMessage.createdAt?.seconds || 0) - (a.lastMessage.createdAt?.seconds || 0);
      });

      setClients(updated);
    } catch (error) {
      console.error('Error refreshing client meta:', error);
    }
  };

  const handleSelectChat = (client) => {
    setSelectedChat(client);
    // Refresh unread counts after brief delay to let markMessagesAsRead run
    setTimeout(() => refreshClientMeta(), 1500);
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m`;
    }
    if (diff < 86400000) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d`;
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const getLastMessagePreview = (message) => {
    if (!message) return 'Sin mensajes';
    if (message.fileURL && !message.content) {
      return message.fileName ? `📎 ${message.fileName}` : '📎 Archivo';
    }
    if (message.content && message.content.length > 50) {
      return message.content.substring(0, 50) + '...';
    }
    return message.content || 'Sin mensajes';
  };

  // FIX: Only block render on FIRST load, never on subsequent refreshes
  if (initialLoading) {
    return (
      <div className="chat-list-loading">
        <Loader className="spinner" size={32} />
        <p>Cargando chats...</p>
      </div>
    );
  }

  return (
    <div className="chat-list-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Chats</h2>
          <span className="chat-count">{clients.length}</span>
        </div>

        <div className="chat-list">
          {clients.length === 0 ? (
            <div className="chat-list-empty">
              <MessageSquare size={48} />
              <p>No hay chats aún</p>
              <p className="chat-list-empty-subtitle">
                Los chats aparecerán cuando los clientes envíen mensajes
              </p>
            </div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className={`chat-list-item ${selectedChat?.id === client.id ? 'active' : ''}`}
                onClick={() => handleSelectChat(client)}
              >
                <div className="chat-avatar">
                  {client.displayName?.charAt(0).toUpperCase() ||
                   client.email?.charAt(0).toUpperCase() || '?'}
                </div>

                <div className="chat-info">
                  <div className="chat-info-header">
                    <span className="chat-name">
                      {client.displayName || client.email}
                    </span>
                    {client.lastMessage && (
                      <span className="chat-time">
                        {formatLastMessageTime(client.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="chat-info-footer">
                    <span className="chat-preview">
                      {getLastMessagePreview(client.lastMessage)}
                    </span>
                    {client.unreadCount > 0 && (
                      <span className="chat-unread-badge">
                        {client.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat window — FIX: stays mounted permanently, never destroyed by loading state */}
      <div className="chat-main">
        {selectedChat ? (
          <ChatWindow
            chatId={selectedChat.id}
            currentUser={currentUser}
            recipientName={selectedChat.displayName || selectedChat.email}
          />
        ) : (
          <div className="chat-placeholder">
            <MessageSquare size={64} />
            <h3>Selecciona un chat</h3>
            <p>Elige un cliente de la lista para ver la conversación</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
