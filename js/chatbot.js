import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
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
const db = getDatabase(app);
const chatbotResponsesRef = ref(db, 'AR_shoe_users/chatbot/responses');

// DOM Elements
let messages = [];
const inputField = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const quickQuestionsContainer = document.querySelector('.quick-questions .question-categories');

let faqResponses = {};
let responseKeys = {};

function createDefaultResponse() {
    return `<div class="troubleshooting-section">
        I'm sorry, I couldn't find an answer to that question. Here are some topics I can help with:<br><br>
        <strong>Features:</strong> AR try-on, Customization, Products<br>
        <strong>Orders:</strong> Shipping, Returns, Payments<br>
        <strong>Help:</strong> Issues, Problems, Troubleshooting<br><br>
        Try asking about one of these topics or click any quick question above!
        </div>`;
}

function loadResponsesFromFirebase() {
    onValue(chatbotResponsesRef, (snapshot) => {
        const responses = snapshot.val() || {};

        responseKeys = responses;
        faqResponses = Object.entries(responses).reduce((acc, [key, response]) => {
            if (response.keyword && response.responses) {
                const keyword = response.keyword.toLowerCase();
                acc[keyword] = {
                    response: Array.isArray(response.responses)
                        ? response.responses.join('<br>')
                        : response.responses,
                    firebaseKey: key,
                    popularity: response.popularity || 0,
                    lastQuestionSentence: response.lastQuestionSentence || response.keyword,
                    category: response.category || 'general'
                };
            }
            return acc;
        }, {});

        faqResponses.default = {
            response: createDefaultResponse(),
            firebaseKey: null,
            popularity: 0,
            lastQuestionSentence: "Help topics",
            category: 'general'
        };

        updateQuickQuestions();

    }, (error) => {
        console.error("Error loading responses:", error);
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        get(ref(db, `AR_shoe_users/customer/${user.uid}`))
            .then((snapshot) => {
                if (!snapshot.exists()) {
                    alert("Account does not exist");
                    auth.signOut();
                }
            });
    } else {
        // window.location.href = "/user_login.html";
    }
});

function updateQuickQuestions() {
    quickQuestionsContainer.innerHTML = '';

    const allResponses = Object.values(faqResponses)
        .filter(response => response.lastQuestionSentence && response.popularity > 0);

    const popularQuestions = [...allResponses]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3);

    const featuresQuestions = allResponses
        .filter(response => response.category === 'feature')
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3);

    const ordersQuestions = allResponses
        .filter(response => response.category === 'orders')
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3);

    const helpQuestions = allResponses
        .filter(response => response.category === 'help')
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3);

    const popularDiv = createQuestionCategory('Popular Questions', popularQuestions);
    const featuresDiv = createQuestionCategory('Features', featuresQuestions);
    const ordersDiv = createQuestionCategory('Orders', ordersQuestions);
    const helpDiv = createQuestionCategory('Help', helpQuestions);

    if (popularQuestions.length === 0) {
        popularDiv.appendChild(createQuestionButton("How does the AR try-on work?"));
        popularDiv.appendChild(createQuestionButton("What are my shipping options?"));
        popularDiv.appendChild(createQuestionButton("How do returns work?"));
    }

    if (featuresQuestions.length === 0) {
        featuresDiv.appendChild(createQuestionButton("How does the AR try-on work?"));
        featuresDiv.appendChild(createQuestionButton("Can I customize my shoes?"));
        featuresDiv.appendChild(createQuestionButton("What products do you offer?"));
    }

    if (ordersQuestions.length === 0) {
        ordersDiv.appendChild(createQuestionButton("What are my shipping options?"));
        ordersDiv.appendChild(createQuestionButton("How do returns work?"));
        ordersDiv.appendChild(createQuestionButton("What payment methods do you accept?"));
    }

    if (helpQuestions.length === 0) {
        helpDiv.appendChild(createQuestionButton("I have an issue with my order"));
        helpDiv.appendChild(createQuestionButton("My product has a problem"));
        helpDiv.appendChild(createQuestionButton("I need sizing help"));
    }

    quickQuestionsContainer.appendChild(popularDiv);
    quickQuestionsContainer.appendChild(featuresDiv);
    quickQuestionsContainer.appendChild(ordersDiv);
    quickQuestionsContainer.appendChild(helpDiv);
}

function createQuestionCategory(title, questions) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';

    const header = document.createElement('h4');
    header.textContent = title;
    categoryDiv.appendChild(header);

    questions.forEach(response => {
        const button = createQuestionButton(response.lastQuestionSentence);
        categoryDiv.appendChild(button);
    });

    return categoryDiv;
}

function createQuestionButton(question) {
    const button = document.createElement('button');
    button.textContent = question;
    button.addEventListener('click', () => {
        askQuestion(question);
    });
    return button;
}

function getBestResponse(input) {
    const lowerInput = input.toLowerCase().trim();

    if (faqResponses[lowerInput]) {
        updateResponseUsage(faqResponses[lowerInput].firebaseKey, input);
        return faqResponses[lowerInput].response;
    }

    const matchingKey = Object.keys(faqResponses).find(key =>
        key !== 'default' && lowerInput.includes(key)
    );

    if (matchingKey) {
        updateResponseUsage(faqResponses[matchingKey].firebaseKey, input);
        return faqResponses[matchingKey].response;
    }

    return faqResponses.default.response;
}

function updateResponseUsage(responseKey, question) {
    if (!responseKey) return;

    const responseRef = ref(db, `AR_shoe_users/chatbot/responses/${responseKey}`);
    get(responseRef).then((snapshot) => {
        const response = snapshot.val();
        if (response) {
            const currentPopularity = response.popularity || 0;
            update(responseRef, {
                popularity: currentPopularity + 1,
                lastQuestionSentence: question
            }).then(() => {
                loadResponsesFromFirebase();
            }).catch(error => {
                console.error("Error updating response usage:", error);
            });
        }
    });
}

function sendMessage() {
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    addMessageToChat("user", userMessage);
    inputField.value = '';

    const typingIndicator = document.createElement('div');
    typingIndicator.textContent = "Assistant is typing...";
    typingIndicator.id = "typing-indicator";
    typingIndicator.style.fontStyle = "italic";
    typingIndicator.style.color = "#666";
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setTimeout(() => {
        chatMessages.removeChild(typingIndicator);
        const response = getBestResponse(userMessage);
        addMessageToChat("assistant", response);
    }, 1000);
}

function askQuestion(question) {
    addMessageToChat('user', question);

    setTimeout(() => {
        const response = getBestResponse(question);
        addMessageToChat('assistant', response);
    }, 500);
}

function setupEventListeners() {
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    sendButton.addEventListener('click', sendMessage);
}

function initChatbot() {
    loadResponsesFromFirebase();
    setupEventListeners();

    setTimeout(() => {
        addMessageToChat('assistant', `Welcome to SmartFit's Help Center! 👟<br><br>
            How can I assist you today? Try asking about:<br>
            - AR shoe try-on<br>
            - Order status<br>
            - Returns policy<br>
            - Product customization`);
    }, 1000);
}

document.getElementById('logout_btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
});

function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    const formattedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');
    contentWrapper.innerHTML = formattedContent;
    
    messageDiv.appendChild(contentWrapper);
    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

window.askQuestion = askQuestion;
document.addEventListener('DOMContentLoaded', initChatbot);