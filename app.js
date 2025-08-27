// Keystone Chatbot App - Kingdom of Valoria
// Beginner-friendly JS with comments!

// --- API Key Setup ---
// 1. Replace 'YOUR_GEMINI_API_KEY_HERE' below with your actual Gemini API key.
// 2. Your API key is private: DO NOT share it publicly or commit it to GitHub in a public repo.
// 3. For local testing, keep your API key in this file. For deployment, use secrets/environment settings if possible.

// --- Models ---
const MODELS = {
  flash: 'gemini-1.5-flash',
  pro: 'gemini-1.5-pro'
};

// Default model (Gemini 1.5 Flash)
let currentModel = MODELS.flash;

// --- API Key (Replace this for your deployment!) ---
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

// --- DOM Elements ---
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const welcomeMsg = document.getElementById('welcome');
const spinner = document.getElementById('thinking-spinner');
const modelToggle = document.getElementById('model-toggle');
const modelName = document.getElementById('model-name');
const newChatBtn = document.getElementById('new-chat-btn');
const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu');
const aboutBtn = document.getElementById('about-valoria-btn');
const aboutModal = document.getElementById('about-modal');
const closeModalBtn = document.getElementById('close-modal');
const loreContent = document.getElementById('lore-content');

// --- Local Storage Key ---
const CHAT_STORAGE_KEY = 'keystone-current-chat';

// --- Load Valoria Lore from JSON ---
let valoriaLore = {};
fetch('lore.json')
  .then(res => res.json())
  .then(data => { valoriaLore = data; });

// --- Utility: Detect Mizo Language ---
function isMizo(text) {
  // Simple detection: returns true if message includes common Mizo words/characters
  const mizoWords = ['chhiar', 'chuan', 'chu', 'a', 'loh', 'loh', 'pawisa', 'thil', 'hriat'];
  return mizoWords.some(word => text.toLowerCase().includes(word));
}

// --- Utility: Save & Restore Chat from localStorage ---
function saveChat() {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(getChatMessages()));
}
function loadChat() {
  const data = localStorage.getItem(CHAT_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}
function clearChat() {
  localStorage.removeItem(CHAT_STORAGE_KEY);
}

// --- Render Chat Messages ---
function renderChat(messages) {
  chatWindow.innerHTML = '';
  messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (msg.role === 'user' ? 'user' : 'ai');
    bubble.innerHTML = msg.text;
    if (msg.role === 'ai') {
      // Add TTS button for AI bubbles
      const ttsBtn = document.createElement('button');
      ttsBtn.className = 'tts-btn';
      ttsBtn.innerHTML = '🔊';
      ttsBtn.title = 'Read aloud';
      ttsBtn.onclick = () => speakText(msg.text, isMizo(msg.text));
      bubble.appendChild(ttsBtn);
    }
    chatWindow.appendChild(bubble);
  });
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- Get Current Chat from DOM ---
function getChatMessages() {
  // Returns the chat as an array of {role, text}
  return Array.from(chatWindow.children).map(bubble => ({
    role: bubble.classList.contains('user') ? 'user' : 'ai',
    text: bubble.childNodes[0].textContent
  }));
}

// --- TTS: Speak AI Response ---
function speakText(text, isMizoLang) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  // Voice: Use English (for Mizo/English text)
  const voices = window.speechSynthesis.getVoices();
  utter.voice = voices.find(v => v.lang.startsWith('en')) || null;
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

// --- Show/Hide Spinner ---
function showSpinner() { spinner.classList.remove('hidden'); }
function hideSpinner() { spinner.classList.add('hidden'); }

// --- Gemini API Call ---
async function askGemini(messages, isMizoLang) {
  // Compose prompt with system/context
  let systemPrompt = '';
  if (isMizoLang) {
    systemPrompt += 'Respond in Mizo. ';
  }
  // Embed Valoria lore in system prompt for context
  systemPrompt += `Keystone is the official AI of the Kingdom of Valoria. Use embedded lore to answer questions about Valoria.`;

  // Gemini API expects {role, parts:[{text}]} objects
  let promptMessages = [
    { role: 'system', parts: [{ text: systemPrompt }] }
  ];
  // User/ai messages
  messages.forEach(msg => {
    promptMessages.push({
      role: msg.role,
      parts: [{ text: msg.text }]
    });
  });

  // API docs: https://ai.google.dev/gemini-api/docs/send-chat-requests
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: promptMessages
  };

  try {
    showSpinner();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    hideSpinner();

    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return 'Sorry, Keystone could not get a response. Check your API key.';
    }
  } catch (err) {
    hideSpinner();
    return 'Error connecting to Gemini API.';
  }
}

// --- Handle Chat Form Submission ---
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Hide welcome after first message
  if (!welcomeMsg.classList.contains('hidden')) welcomeMsg.classList.add('hidden');

  // Add user's message
  const messages = loadChat();
  messages.push({ role: 'user', text });

  renderChat(messages);
  saveChat();

  // Detect Mizo language
  const isMizoLang = isMizo(text);

  // Show spinner and get AI response
  const aiText = await askGemini(messages, isMizoLang);

  messages.push({ role: 'ai', text: aiText });
  renderChat(messages);
  saveChat();

  userInput.value = '';
});

// --- "New Chat" Button ---
newChatBtn.addEventListener('click', () => {
  clearChat();
  chatWindow.innerHTML = '';
  welcomeMsg.classList.remove('hidden');
  userInput.value = '';
});

// --- Restore chat on page load ---
window.addEventListener('DOMContentLoaded', () => {
  const messages = loadChat();
  if (messages.length > 0) {
    welcomeMsg.classList.add('hidden');
    renderChat(messages);
  }
});

// --- Model Toggle ---
modelToggle.addEventListener('change', () => {
  currentModel = modelToggle.checked ? MODELS.pro : MODELS.flash;
  modelName.textContent = modelToggle.checked ? '1.5 Pro' : '1.5 Flash';
});

// --- Hamburger Menu ---
menuBtn.addEventListener('click', () => {
  sideMenu.classList.add('open');
});
closeMenuBtn.addEventListener('click', () => {
  sideMenu.classList.remove('open');
});

// --- About Valoria Modal ---
aboutBtn.addEventListener('click', () => {
  // Load lore from valoriaLore object
  loreContent.innerHTML = `
    <p><strong>Overview:</strong> ${valoriaLore.overview}</p>
    <p><strong>Founders and Great Lords:</strong> ${valoriaLore.founders}</p>
    <p><strong>Tribes and Structure:</strong> ${valoriaLore.tribes}</p>
    <p><strong>History:</strong> ${valoriaLore.history}</p>
    <p><strong>Territories and Capital:</strong> ${valoriaLore.territories}</p>
    <p><strong>Military and Units:</strong> ${valoriaLore.military}</p>
    <p><strong>Church and Culture:</strong> ${valoriaLore.church}</p>
  `;
  aboutModal.classList.add('open');
});
closeModalBtn.addEventListener('click', () => {
  aboutModal.classList.remove('open');
});

// --- Click outside modal to close ---
aboutModal.addEventListener('click', (e) => {
  if (e.target === aboutModal) aboutModal.classList.remove('open');
});

// --- Mobile: Close menu when clicking outside ---
document.addEventListener('click', (e) => {
  if (sideMenu.classList.contains('open') &&
      !sideMenu.contains(e.target) &&
      e.target !== menuBtn) {
    sideMenu.classList.remove('open');
  }
});

// --- Keyboard shortcuts for accessibility ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    aboutModal.classList.remove('open');
    sideMenu.classList.remove('open');
  }
});

// --- END ---
// For beginners: All logic is in this file. UI auto-updates with each action.
