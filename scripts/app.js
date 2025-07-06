// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLJF_0E2elH6viFfohLMWb7uWkHouwxG-mgAWEhd1JXh9mrdw8Gu7YnbVHE_iNEgoFTw/exec';
const CACHE_KEY = 'tenantData';

// Global state
let tenantData = [];
let cleanTenantData = [];
let currentMode = 'general';
let recognition = null;
let recognitionLanguage = 'en-US';

// DOM elements
const textInput = document.getElementById('textInput');
const voiceButton = document.getElementById('voiceButton');
const languageButton = document.getElementById('languageButton');
const recognitionLabel = document.getElementById('recognitionLabel');
const loader = document.getElementById('loader');
const cardsContainer = document.getElementById('cardsContainer');
const noResults = document.getElementById('noResults');
const themeToggle = document.getElementById('themeToggle');
const modeButtons = document.querySelectorAll('.mode-btn');
const searchHint = document.getElementById('searchHint');
const suggestionsContainer = document.getElementById('suggestionsContainer');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLanguage();
  initVoiceRecognition();
  textInput.focus();
  loadData();
  setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
  themeToggle.addEventListener('click', toggleTheme);
  textInput.addEventListener('input', handleSearchInput);
  voiceButton.addEventListener('click', startVoiceRecognition);
  languageButton.addEventListener('click', toggleRecognitionLanguage);
  
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setSearchMode(btn.dataset.mode);
      const safeQuery = sanitizeInput(textInput.value);
      if (safeQuery) filterAndRender(safeQuery);
      hideSuggestions();
    });
  });
  
  document.addEventListener('click', (e) => {
    if (!suggestionsContainer.contains(e.target) && !e.target.closest('.search-container')) {
      hideSuggestions();
    }
  });
}

// Initialize theme
function initTheme() {
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

// Initialize language
function initLanguage() {
  const savedLanguage = localStorage.getItem('recognitionLanguage');
  if (savedLanguage) recognitionLanguage = savedLanguage;
  updateRecognitionLanguage();
}

// Toggle theme
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDarkMode = document.body.classList.contains('dark-theme');
  localStorage.setItem('darkTheme', isDarkMode);
  themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Handle search input
function handleSearchInput() {
  const safeQuery = sanitizeInput(textInput.value);
  filterAndRender(safeQuery);
  
  if (currentMode !== 'general') {
    showSuggestions(safeQuery);
  } else {
    hideSuggestions();
  }
}

// Initialize voice recognition
function initVoiceRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = recognitionLanguage;
    recognition.continuous = false;
    recognition.maxAlternatives = 5;
    
    recognition.onstart = () => {
      voiceButton.classList.add('listening');
      searchHint.textContent = "Listening... Speak now";
    };
    
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      let finalText = transcript;
      
      if (recognitionLanguage === 'uk-UA') {
        finalText = transliterate(transcript);
      }
      
      finalText = cleanInputText(finalText);
      const safeInput = sanitizeInput(finalText);
      textInput.value = safeInput;
      filterAndRender(safeInput);
      logVoiceQuery(safeInput);
    };
    
    recognition.onerror = (e) => {
      handleRecognitionError(e.error);
    };
    
    recognition.onend = resetVoiceButton;
  } else {
    voiceButton.style.display = 'none';
    searchHint.textContent = "Voice input not supported in this browser";
  }
}

// Handle recognition errors
function handleRecognitionError(error) {
  let message = "Sorry, I didn't catch that. Please try typing.";
  
  switch(error) {
    case 'no-speech': message = "No speech detected. Please type instead."; break;
    case 'audio-capture': message = "Microphone not available. Please type."; break;
    case 'not-allowed': message = "Microphone access denied. Please allow access in settings."; break;
  }
  
  searchHint.textContent = message;
  resetVoiceButton();
  setTimeout(updateSearchHint, 3000);
}

// Toggle recognition language
function toggleRecognitionLanguage() {
  recognitionLanguage = recognitionLanguage === 'en-US' ? 'uk-UA' : 'en-US';
  localStorage.setItem('recognitionLanguage', recognitionLanguage);
  if (recognition) recognition.lang = recognitionLanguage;
  updateRecognitionLanguage();
}

// Update recognition language UI
function updateRecognitionLanguage() {
  if (recognitionLanguage === 'en-US') {
    languageButton.textContent = "EN";
    recognitionLabel.textContent = "Voice search: English names";
  } else {
    languageButton.textContent = "UA";
    recognitionLabel.textContent = "Voice search: Ukrainian names";
  }
  updateSearchHint();
}

// Sanitize user input
function sanitizeInput(input) {
  return input.substring(0, 100);
}

// Reset voice button
function resetVoiceButton() {
  voiceButton.classList.remove('listening');
  updateSearchHint();
}

// Update search hint based on mode
function updateSearchHint() {
  switch(currentMode) {
    case 'general': searchHint.textContent = "Search by any information: name, address, account, etc."; break;
    case 'name': searchHint.textContent = "Search by name. Supports short names."; break;
    case 'address': searchHint.textContent = "Search by Eircode or address."; break;
  }
}

// Load data
function loadData() {
  loader.style.display = 'flex';
  
  getLastModified().then(serverLastModified => {
    const stored = localStorage.getItem(CACHE_KEY);
    const cacheData = stored ? JSON.parse(stored) : null;
    
    if (cacheData && cacheData.data && cacheData.lastModified) {
      const cacheTime = new Date(cacheData.lastModified).getTime();
      const serverTime = serverLastModified.getTime();
      
      if (serverTime <= cacheTime + 432000000) {
        tenantData = cacheData.data;
        initCleanData();
        loader.style.display = 'none';
        if (textInput.value) filterAndRender(textInput.value);
        return;
      }
    }
    
    fetchData(serverLastModified);
  }).catch(err => {
    console.error('Cache check error:', err);
    fetchData(new Date(0));
  });
}

// Filter and render results
function filterAndRender(query) {
  const cleanQuery = cleanString(query);
  
  if (!cleanQuery) {
    cardsContainer.innerHTML = '';
    noResults.style.display = 'none';
    hideSuggestions();
    return;
  }
  
  const rows = tenantData.filter((row, index) => {
    const cleanRow = cleanTenantData[index];
    
    switch(currentMode) {
      case 'general': return checkGeneralMatch(row, cleanRow, cleanQuery);
      case 'name': return checkNameMatch(row, cleanRow, cleanQuery);
      case 'address': return checkAddressMatch(row, cleanRow, cleanQuery);
      default: return false;
    }
  });
  
  renderCards(rows);
}

// Show suggestions
function showSuggestions(query) {
  renderSuggestions(query, tenantData, currentMode, suggestionsContainer, textInput);
}

// Hide suggestions
function hideSuggestions() {
  suggestionsContainer.style.display = 'none';
}

// Log voice query
function logVoiceQuery(query) {
  if (!query) return;
  
  window.logCb = function() { cleanup('logCb'); };
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?action=log&query=${encodeURIComponent(query)}&callback=logCb`;
  document.body.appendChild(s);
}

// Start voice recognition
function startVoiceRecognition() {
  if (recognition) recognition.start();
}

// Set search mode
function setSearchMode(mode) {
  currentMode = mode;
  
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  updateSearchHint();
  
  const safeQuery = sanitizeInput(textInput.value);
  if (safeQuery) {
    filterAndRender(safeQuery);
    if (mode !== 'general') showSuggestions(safeQuery);
  }
}

// Cleanup JSONP scripts
function cleanup(cb) {
  const el = document.querySelector(`script[src*="${cb}"]`);
  if (el) el.remove();
  delete window[cb];
}