import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAuPALylh11cTArigeGJZmLwrFwoAsNPSI",
    authDomain: "opportunity-9d3bf.firebaseapp.com",
    databaseURL: "https://opportunity-9d3bf-default-rtdb.firebaseio.com",
    projectId: "opportunity-9d3bf",
    storageBucket: "opportunity-9d3bf.appspot.com",
    messagingSenderId: "57906230058",
    appId: "1:57906230058:web:2d7cd9cc68354722536453",
    measurementId: "G-QC2JSR1FJW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();

// DOM Elements
const inputField = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const quickQuestionsContainer = document.querySelector('.quick-questions .question-categories');

// Chat messages array
let messages = [
    { 
        role: "system", 
        content: "You are a helpful assistant for SmartFit Shoes. Help customers with:" +
                "\n- AR shoe try-on features" +
                "\n- Product customization options" +
                "\n- Order status and shipping" +
                "\n- Returns and exchanges" +
                "\n- Product information and sizing" +
                "\n\nAlways be polite, helpful, and provide detailed answers."
    }
];

// Initialize quick questions
const quickQuestions = {
    "Features": [
        "How does the AR try-on work?",
        "Can I customize my shoes?",
        "What products do you offer?"
    ],
    "Orders": [
        "What are my shipping options?",
        "How do returns work?",
        "What payment methods do you accept?"
    ],
    "Help": [
        "I have an issue with my order",
        "My product has a problem",
        "I need sizing help"
    ]
};

function updateQuickQuestions() {
    quickQuestionsContainer.innerHTML = '';

    for (const [category, questions] of Object.entries(quickQuestions)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        const header = document.createElement('h4');
        header.textContent = category;
        categoryDiv.appendChild(header);

        questions.forEach(question => {
            const button = document.createElement('button');
            button.textContent = question;
            button.addEventListener('click', () => askQuestion(question));
            categoryDiv.appendChild(button);
        });

        quickQuestionsContainer.appendChild(categoryDiv);
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("User signed in:", user.uid);
    } else {
        // User is signed out
        console.log("User signed out");
    }
});

function formatMessageText(text) {
    // First escape HTML to prevent XSS
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');
    contentWrapper.innerHTML = formatMessageText(content);
    
    messageDiv.appendChild(contentWrapper);
    chatMessages.appendChild(messageDiv);
    
    // Smooth scroll to bottom with animation
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    messageDiv.style.transition = 'all 0.3s ease-out';
    
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }, 10);
}

async function sendMessage() {
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    // Add user message to chat
    addMessageToChat("user", userMessage);
    messages.push({ role: "user", content: userMessage });
    inputField.value = '';

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.id = "typing-indicator";
    typingIndicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
            <span>Assistant is typing</span>
            <div class="typing-dots">
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch('https://github-chat-backend.onrender.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        chatMessages.removeChild(typingIndicator);
        
        // Add assistant response
        addMessageToChat("assistant", data.response);
        messages.push({ role: "assistant", content: data.response });
        
    } catch (error) {
        console.error("Error:", error);
        chatMessages.removeChild(typingIndicator);
        addMessageToChat("assistant", 
            "Sorry, I'm having trouble connecting to the assistant. Please try again later.\n\n" +
            "For immediate help, you can:\n" +
            "1. Email support@smartfitshoes.com\n" +
            "2. Call our helpline at (800) 555-0199");
    }
}

function askQuestion(question) {
    inputField.value = question;
    sendMessage();
}

function setupEventListeners() {
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    sendButton.addEventListener('click', sendMessage);

    document.getElementById('logout_btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            console.log("User signed out");
        }).catch((error) => {
            console.error("Error signing out: ", error);
        });
    });
}

function initChatbot() {
    setupEventListeners();
    updateQuickQuestions();

    // Show welcome message after a short delay
    setTimeout(() => {
        addMessageToChat('assistant', `Welcome to SmartFit's Help Center! 👟<br><br>
            How can I assist you today? Try asking about:<br>
            - AR shoe try-on<br>
            - Order status<br>
            - Returns policy<br>
            - Product customization`);
    }, 1000);
}

window.askQuestion = askQuestion;
document.addEventListener('DOMContentLoaded', initChatbot);