// Add these variables at the top with your other DOM elements
const sendSnapForm = document.getElementById('send-snap-form');
const sendToFriendSelect = document.getElementById('send-to-friend');
const snapCaptionInput = document.getElementById('snap-caption');
const sendSnapBtn = document.getElementById('send-snap-btn');

// Add to your setupEventListeners()
sendSnapForm.addEventListener('submit', sendSnapToFriend);
captureBtn.addEventListener('click', capturePhotoForSending);
retakeBtn.addEventListener('click', retakePhotoForSending);
snapCaptionInput.addEventListener('input', updateSendSnapButtonState);

// Add these new functions
function loadFriendsForSending() {
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users[currentUser];
    
    sendToFriendSelect.innerHTML = '<option value="">Select a friend</option>';
    
    if (user && user.friends && user.friends.length > 0) {
        user.friends.forEach(friend => {
            const option = document.createElement('option');
            option.value = friend;
            option.textContent = friend;
            sendToFriendSelect.appendChild(option);
        });
    }
}

function capturePhotoForSending() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    currentImageData = canvas.toDataURL('image/jpeg', 0.8);
    capturedImage.src = currentImageData;
    
    video.classList.add('hidden');
    capturedImage.classList.remove('hidden');
    captureBtn.classList.add('hidden');
    retakeBtn.classList.remove('hidden');
    sendSnapBtn.classList.remove('hidden');
    
    stopCamera();
}

function retakePhotoForSending() {
    video.classList.remove('hidden');
    capturedImage.classList.add('hidden');
    captureBtn.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    sendSnapBtn.classList.add('hidden');
    currentImageData = null;
    
    setupCamera();
}

function updateSendSnapButtonState() {
    sendSnapBtn.disabled = !(currentImageData && sendToFriendSelect.value && snapCaptionInput.value.trim());
}

function sendSnapToFriend(e) {
    e.preventDefault();
    
    const friendUsername = sendToFriendSelect.value;
    const caption = snapCaptionInput.value.trim();
    
    if (!friendUsername || !currentImageData) {
        document.getElementById('send-snap-error').textContent = 'Please select a friend and capture a photo';
        document.getElementById('send-snap-error').classList.remove('hidden');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users'));
    const snapId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Add snap to recipient's received snaps
    if (!users[friendUsername].receivedSnaps) {
        users[friendUsername].receivedSnaps = [];
    }
    
    users[friendUsername].receivedSnaps.unshift({
        id: snapId,
        from: currentUser,
        imageData: currentImageData,
        caption: caption,
        sentAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        viewed: false
    });
    
    // Add notification
    if (!users[friendUsername].notifications) {
        users[friendUsername].notifications = [];
    }
    
    users[friendUsername].notifications.push({
        type: 'snap',
        from: currentUser,
        timestamp: new Date().toISOString(),
        read: false
    });
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // Reset form
    retakePhotoForSending();
    snapCaptionInput.value = '';
    sendToFriendSelect.value = '';
    
    // Show success message
    document.getElementById('send-snap-success').textContent = `Snap sent to ${friendUsername}!`;
    document.getElementById('send-snap-success').classList.remove('hidden');
    document.getElementById('send-snap-error').classList.add('hidden');
    
    setTimeout(() => {
        document.getElementById('send-snap-success').classList.add('hidden');
    }, 3000);
}

// Update your showDashboard function to load friends
function showDashboard() {
    if (!currentUser) {
        showHome();
        return;
    }

    hideAllScreens();
    dashboard.classList.remove('hidden');
    document.getElementById('welcome-message').textContent = `Welcome, ${currentUser}!`;
    loadFriendsForSending();
    updateNav();
}
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
function searchFriends() {
  // Handles searching for users to add
}

function sendFriendRequest(toUsername) {
  // Sends a friend request to another user
}

function acceptFriendRequest(fromUsername) {
  // Accepts an incoming friend request
}

function declineFriendRequest(fromUsername) {
  // Declines an incoming friend request
}

function removeFriend(friendUsername) {
  // Removes an existing friend
}
function searchFriends(e) {
    e.preventDefault();
    const searchTerm = document.getElementById('friend-search').value.trim().toLowerCase();
    
    if (!searchTerm) {
        document.getElementById('search-results').innerHTML = '';
        document.getElementById('no-search-results').classList.remove('hidden');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || {};
    const user = users[currentUser] || {};
    
    let resultsHTML = '';
    let hasResults = false;
    
    Object.keys(users).forEach(username => {
        // Skip if: current user, already friends, or already requested
        if (username.toLowerCase() === currentUser.toLowerCase()) return;
        if (user.friends && user.friends.includes(username)) return;
        if (user.sentRequests && user.sentRequests.some(req => req.to === username)) return;
        
        // Show if username matches search
        if (username.toLowerCase().includes(searchTerm)) {
            hasResults = true;
            const isAlreadyRequested = user.sentRequests && 
                                     user.sentRequests.some(req => req.to === username);
            
            resultsHTML += `
                <div class="friend-item">
                    <span>${username}</span>
                    <div class="friend-actions">
                        ${isAlreadyRequested ? 
                            '<span>Request Sent</span>' : 
                            `<button class="primary" onclick="sendFriendRequest('${username}')">Add Friend</button>`
                        }
                    </div>
                </div>
            `;
        }
    });
    
    document.getElementById('search-results').innerHTML = resultsHTML;
    document.getElementById('no-search-results').classList.toggle('hidden', hasResults);
}
// Add this function to display received snaps
function loadReceivedSnaps() {
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users[currentUser];
    const receivedSnapsContainer = document.getElementById('received-snaps');
    const noSnapsMessage = document.getElementById('no-snaps');
    
    if (!user.receivedSnaps || user.receivedSnaps.length === 0) {
        noSnapsMessage.classList.remove('hidden');
        receivedSnapsContainer.innerHTML = '';
        return;
    }
    
    noSnapsMessage.classList.add('hidden');
    
    let snapsHTML = '';
    user.receivedSnaps.forEach((snap, index) => {
        if (new Date(snap.expiresAt) < new Date()) {
            // Skip expired snaps
            return;
        }
        
        snapsHTML += `
            <div class="snap-item" data-snap-id="${snap.id}">
                <div class="snap-header">
                    <span>From: ${snap.from}</span>
                    <span>${formatDate(snap.sentAt)}</span>
                </div>
                <div class="snap-content ${snap.viewed ? '' : 'unviewed'}">
                    <img src="${snap.imageData}" alt="${snap.caption}" class="snap-image">
                    <p>${snap.caption}</p>
                    <div class="snap-status">
                        ${snap.viewed ? 
                            'Viewed' : 
                            '<button class="view-snap-btn">View Snap</button>'}
                    </div>
                </div>
            </div>
        `;
    });
    
    receivedSnapsContainer.innerHTML = snapsHTML;
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-snap-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const snapId = this.closest('.snap-item').dataset.snapId;
            viewSnap(snapId);
        });
    });
}

function viewSnap(snapId) {
    const users = JSON.parse(localStorage.getItem('users'));
    const snap = users[currentUser].receivedSnaps.find(s => s.id === snapId);
    
    if (snap) {
        // Mark as viewed
        snap.viewed = true;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Show the snap
        alert(`Showing snap from ${snap.from}: ${snap.caption}`);
        
        // Reload snaps to update UI
        loadReceivedSnaps();
    }
}

// Update showDashboard to load snaps
function showDashboard() {
    if (!currentUser) {
        showHome();
        return;
    }

    hideAllScreens();
    dashboard.classList.remove('hidden');
    document.getElementById('welcome-message').textContent = `Welcome, ${currentUser}!`;
    loadFriendsForSending();
    loadReceivedSnaps();
    updateNav();
}
