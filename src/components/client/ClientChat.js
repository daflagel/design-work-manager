import React from 'react';
import ChatWindow from '../common/ChatWindow';
import './ClientChat.css';

const ClientChat = ({ currentUser }) => {
  return (
    <div className="client-chat-container">
      <ChatWindow
        chatId={currentUser.uid}
        currentUser={currentUser}
        recipientName="Daniel"
      />
    </div>
  );
};

export default ClientChat;
