function sendMessage() {
    const messageText = chatInput.value.trim();
    
    if (!messageText || !currentChatFriend) {
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users'));
    const timestamp = new Date().toISOString();
    
    // Add message to sender's chat
    users[currentUser].chats[currentChatFriend].push({
        sender: currentUser,
        text: messageText,
        timestamp: timestamp,
        status: 'sent'
    });
    
    // Add message to recipient's chat
    users[currentChatFriend].chats[currentUser].push({
        sender: currentUser,
        text: messageText,
        timestamp: timestamp,
        status: 'sent'
    });
    
    // Mark as unread if recipient isn't currently viewing the chat
    if (!users[currentChatFriend].unreadMessages) {
        users[currentChatFriend].unreadMessages = {};
    }
    
    if (localStorage.getItem('currentUser') !== currentChatFriend) {
        if (!users[currentChatFriend].unreadMessages[currentUser]) {
            users[currentChatFriend].unreadMessages[currentUser] = 0;
        }
        users[currentChatFriend].unreadMessages[currentUser]++;
    }
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // Update UI
    chatInput.value = '';
    loadChat(currentChatFriend);
    
    // Update notification badges for recipient
    updateNotificationBadges();
    
    // Update status to delivered for recipient
    setTimeout(() => {
        const users = JSON.parse(localStorage.getItem('users'));
        let updated = false;
        
        users[currentChatFriend].chats[currentUser].forEach(msg => {
            if (msg.sender === currentUser && msg.status === 'sent') {
                msg.status = 'delivered';
                updated = true;
            }
        });
        
        if (updated) {
            localStorage.setItem('users', JSON.stringify(users));
            
            // If we're the sender and viewing this chat, update the UI
            if (currentChatFriend === chatFriendSelect.value) {
                loadChat(currentChatFriend);
            }
        }
    }, 1000);
}

function handleChatFriendSelect(e) {
    currentChatFriend = e.target.value;
    
    if (currentChatFriend) {
        loadChat(currentChatFriend);
        chatInput.disabled = false;
        sendMessageBtn.disabled = false;
        chatHeader.textContent = `Chat with ${currentChatFriend}`;
        
        // Mark messages as read
        const users = JSON.parse(localStorage.getItem('users'));
        let updated = false;
        
        users[currentUser].chats[currentChatFriend].forEach(msg => {
            if (msg.sender === currentChatFriend && msg.status !== 'read') {
                msg.status = 'read';
                updated = true;
                
                // Also update in sender's chat
                const senderChat = users[currentChatFriend].chats[currentUser];
                const senderMsg = senderChat.find(m => 
                    m.timestamp === msg.timestamp && m.text === msg.text
                );
                if (senderMsg) senderMsg.status = 'read';
            }
        });
        
        if (updated) {
            localStorage.setItem('users', JSON.stringify(users));
            
            // If we're the sender and viewing this chat, update the UI
            if (currentChatFriend === chatFriendSelect.value) {
                loadChat(currentChatFriend);
            }
        }
        
        // Clear unread count
        if (users[currentUser].unreadMessages[currentChatFriend]) {
            delete users[currentUser].unreadMessages[currentChatFriend];
            localStorage.setItem('users', JSON.stringify(users));
            updateNotificationBadges();
        }
    } else {
        chatMessages.innerHTML = '';
        chatInput.disabled = true;
        sendMessageBtn.disabled = true;
        chatHeader.textContent = 'Select a friend to start chatting';
    }
}

function loadChat(friendUsername) {
    const users = JSON.parse(localStorage.getItem('users'));
    const chat = users[currentUser].chats[friendUsername] || [];
    
    chatMessages.innerHTML = '';
    
    if (chat.length === 0) {
        chatMessages.innerHTML = '<p>No messages yet. Start the conversation!</p>';
        return;
    }
    
    chat.forEach(message => {
        const isCurrentUser = message.sender === currentUser;
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        
        let statusIndicator = '';
        if (isCurrentUser) {
            statusIndicator = `<span class="message-status ${message.status}"></span>`;
        }
        
        messageElement.innerHTML = `
            <div class="message-content">${message.text}</div>
            <div class="message-info">
                ${formatChatTime(message.timestamp)}
                ${isCurrentUser ? '' : `• ${message.sender}`}
                ${statusIndicator}
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
