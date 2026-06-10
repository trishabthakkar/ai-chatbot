// Application State Management
let chats = [];
let activeChatId = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const chatsList = document.getElementById('chats-list');
const newChatBtn = document.getElementById('new-chat-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const chatSearch = document.getElementById('chat-search');

const chatWindow = document.getElementById('chat-window');
const emptyState = document.getElementById('empty-state');
const messagesList = document.getElementById('messages-list');
const activeChatTitle = document.getElementById('active-chat-title');
const typingIndicator = document.getElementById('typing-indicator');

const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const charCounter = document.getElementById('char-counter');

// Configure marked.js for markdown rendering with custom code block syntax
if (typeof marked !== 'undefined') {
    const renderer = {
        code(code, infostring, escaped) {
            const language = infostring || 'text';
            const escapedCode = code
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            
            return `
                <div class="code-container">
                    <div class="code-header">
                        <span class="code-lang">${language}</span>
                        <button class="copy-btn" onclick="copyCode(this)">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Copy</span>
                        </button>
                    </div>
                    <pre><code class="language-${language}">${escapedCode}</code></pre>
                </div>
            `;
        }
    };
    marked.use({ renderer });
}

// Copy Code Helper
window.copyCode = function(button) {
    const container = button.closest('.code-container');
    const codeEl = container.querySelector('code');
    const codeText = codeEl.textContent;
    
    navigator.clipboard.writeText(codeText).then(() => {
        const textSpan = button.querySelector('span');
        const originalText = textSpan.textContent;
        textSpan.textContent = 'Copied!';
        button.style.color = '#10b981';
        
        setTimeout(() => {
            textSpan.textContent = originalText;
            button.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
    });
};

// Initialize Application
function init() {
    loadState();
    renderSidebar();
    
    if (activeChatId) {
        loadChat(activeChatId);
    } else {
        showEmptyState();
    }
    
    setupEventListeners();
}

// Load chats from LocalStorage
function loadState() {
    try {
        const savedChats = localStorage.getItem('aether_chats');
        const savedActiveChatId = localStorage.getItem('aether_active_chat_id');
        
        chats = savedChats ? JSON.parse(savedChats) : [];
        activeChatId = savedActiveChatId;
    } catch (e) {
        console.error('Failed to load state from localStorage: ', e);
        chats = [];
        activeChatId = null;
    }
}

// Save chats to LocalStorage
function saveState() {
    try {
        localStorage.setItem('aether_chats', JSON.stringify(chats));
        localStorage.setItem('aether_active_chat_id', activeChatId);
    } catch (e) {
        console.error('Failed to save state to localStorage: ', e);
    }
}

// Set up Event Listeners
function setupEventListeners() {
    // Sidebar Mobile Toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // New Chat Button
    newChatBtn.addEventListener('click', () => {
        createNewChat();
        if (window.innerWidth <= 820) {
            sidebar.classList.remove('open');
        }
    });
    
    // Clear All Chats
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
            chats = [];
            activeChatId = null;
            saveState();
            renderSidebar();
            showEmptyState();
        }
    });
    
    // Search conversations
    chatSearch.addEventListener('input', (e) => {
        renderSidebar(e.target.value.trim());
    });
    
    // Suggestion Cards (Intro screen)
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            userInput.value = prompt;
            userInput.focus();
            userInput.dispatchEvent(new Event('input')); // trigger auto-resize
            
            // Auto submit
            submitMessage();
        });
    });
    
    // Textarea Auto-resize & Character Counter
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${userInput.scrollHeight}px`;
        
        const length = userInput.value.length;
        charCounter.textContent = `${length} / 4000`;
    });
    
    // Handle Enter to Submit
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitMessage();
        }
    });
    
    // Form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitMessage();
    });
}

// Create a New Chat
function createNewChat() {
    const newChat = {
        id: 'chat_' + Date.now(),
        title: 'New Conversation',
        messages: [],
        timestamp: Date.now()
    };
    
    chats.unshift(newChat);
    activeChatId = newChat.id;
    saveState();
    
    renderSidebar();
    loadChat(newChat.id);
}

// Load Selected Chat
function loadChat(chatId) {
    activeChatId = chatId;
    saveState();
    
    const activeChat = chats.find(c => c.id === chatId);
    if (!activeChat) {
        showEmptyState();
        return;
    }
    
    activeChatTitle.textContent = activeChat.title;
    
    // Highlight active sidebar item
    document.querySelectorAll('.chat-item').forEach(item => {
        if (item.getAttribute('data-id') === chatId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    if (activeChat.messages.length === 0) {
        showEmptyState();
    } else {
        emptyState.style.display = 'none';
        messagesList.style.display = 'flex';
        
        messagesList.innerHTML = '';
        activeChat.messages.forEach(msg => {
            appendMessageToDOM(msg.role, msg.content);
        });
        
        scrollToBottom();
    }
}

// Render the Conversations list in sidebar
function renderSidebar(filterQuery = '') {
    chatsList.innerHTML = '';
    
    const filteredChats = chats.filter(chat => 
        chat.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
        chat.messages.some(m => m.content.toLowerCase().includes(filterQuery.toLowerCase()))
    );
    
    if (filteredChats.length === 0) {
        chatsList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                ${filterQuery ? 'No results found' : 'No conversations yet'}
            </div>
        `;
        return;
    }
    
    filteredChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
        item.setAttribute('data-id', chat.id);
        
        item.innerHTML = `
            <div class="chat-item-details" onclick="loadChat('${chat.id}')">
                <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span class="chat-item-title">${escapeHTML(chat.title)}</span>
            </div>
            <div class="chat-item-actions">
                <button class="chat-action-btn rename-btn" onclick="renameChat('${chat.id}', event)" title="Rename chat">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="chat-action-btn delete-btn" onclick="deleteChat('${chat.id}', event)" title="Delete chat">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        
        chatsList.appendChild(item);
    });
}

// Rename Conversation
window.renameChat = function(chatId, event) {
    event.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const newTitle = prompt('Rename this conversation:', chat.title);
    if (newTitle && newTitle.trim()) {
        chat.title = newTitle.trim();
        saveState();
        renderSidebar();
        if (activeChatId === chatId) {
            activeChatTitle.textContent = chat.title;
        }
    }
};

// Delete Conversation
window.deleteChat = function(chatId, event) {
    event.stopPropagation();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return;
    
    if (confirm('Delete this conversation?')) {
        chats.splice(chatIndex, 1);
        
        if (activeChatId === chatId) {
            activeChatId = chats.length > 0 ? chats[0].id : null;
        }
        
        saveState();
        renderSidebar();
        
        if (activeChatId) {
            loadChat(activeChatId);
        } else {
            showEmptyState();
        }
    }
};

// Show Empty State (Reset window UI)
function showEmptyState() {
    activeChatTitle.textContent = 'New Conversation';
    emptyState.style.display = 'flex';
    messagesList.style.display = 'none';
    messagesList.innerHTML = '';
}

// Append Message Node to Chat Viewport
function appendMessageToDOM(role, content) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${role === 'user' ? 'user-avatar' : 'assistant-avatar'}`;
    avatar.textContent = role === 'user' ? 'U' : 'AI';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (role === 'user') {
        bubble.textContent = content;
    } else {
        bubble.innerHTML = renderMarkdown(content);
    }
    
    contentWrapper.appendChild(bubble);
    wrapper.appendChild(avatar);
    wrapper.appendChild(contentWrapper);
    messagesList.appendChild(wrapper);
    
    // Trigger syntax highlighting for code blocks in this newly appended element
    if (role === 'model' && typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(bubble);
    }
    
    return bubble;
}

// Render Markdown Helper
function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }
    // Fallback if marked is missing
    return escapeHTML(text).replace(/\n/g, '<br>');
}

// Escape HTML entities to prevent XSS in user messages or raw text rendering
function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Scroll chat window to bottom
function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Submit user message and fetch stream
async function submitMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    
    // If we don't have an active chat, create one automatically
    if (!activeChatId) {
        createNewChat();
    }
    
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;
    
    // Clear Input UI
    userInput.value = '';
    userInput.style.height = 'auto';
    charCounter.textContent = '0 / 4000';
    sendBtn.disabled = true;
    
    // Append user message to state & DOM
    activeChat.messages.push({ role: 'user', content: text, timestamp: Date.now() });
    
    // If it's the first message, rename chat title based on user prompt snippet
    if (activeChat.title === 'New Conversation' && activeChat.messages.length === 1) {
        const titleSnippet = text.length > 25 ? text.substring(0, 25) + '...' : text;
        activeChat.title = titleSnippet;
        activeChatTitle.textContent = titleSnippet;
    }
    
    saveState();
    renderSidebar();
    
    emptyState.style.display = 'none';
    messagesList.style.display = 'flex';
    appendMessageToDOM('user', text);
    scrollToBottom();
    
    // Show Typing indicator
    typingIndicator.style.display = 'flex';
    scrollToBottom();
    
    // Prepare API history payloads
    // Backend expects: [{"role": "user"|"model", "content": "..."}]
    const historyPayload = activeChat.messages.map(m => ({
        role: m.role,
        content: m.content
    }));
    
    // Create streaming bubble placeholder
    let assistantBubble = null;
    let accumulatedResponse = '';
    
    try {
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ history: historyPayload })
        });
        
        // Hide typing indicator once connection starts yielding
        typingIndicator.style.display = 'none';
        
        if (!response.ok) {
            const errDetails = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
            throw new Error(errDetails.detail || `Server returned status ${response.status}`);
        }
        
        // Create the placeholder bubble for streaming response
        assistantBubble = appendMessageToDOM('model', '');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Hold incomplete line
            
            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine.startsWith('data: ')) continue;
                
                const dataVal = cleanLine.substring(6);
                if (dataVal === '[DONE]') {
                    break;
                }
                
                try {
                    const parsed = JSON.parse(dataVal);
                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }
                    if (parsed.text) {
                        accumulatedResponse += parsed.text;
                        assistantBubble.innerHTML = renderMarkdown(accumulatedResponse);
                        if (typeof Prism !== 'undefined') {
                            Prism.highlightAllUnder(assistantBubble);
                        }
                        scrollToBottom();
                    }
                } catch (jsonErr) {
                    console.error('SSE JSON parse error:', jsonErr, dataVal);
                }
            }
        }
        
        // Add full streamed response to state and save
        activeChat.messages.push({ role: 'model', content: accumulatedResponse, timestamp: Date.now() });
        saveState();
        
    } catch (error) {
        console.error('Chat streaming failed:', error);
        typingIndicator.style.display = 'none';
        
        // If bubble doesn't exist, create one to show the error
        if (!assistantBubble) {
            assistantBubble = appendMessageToDOM('model', '');
        }
        
        assistantBubble.innerHTML = `<div style="color: #ef4444; font-weight: 500;">Connection Error: ${error.message}</div>`;
        scrollToBottom();
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// Start app
window.addEventListener('DOMContentLoaded', init);
