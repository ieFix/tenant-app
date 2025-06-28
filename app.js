// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTRWFPeErTSXQGeMItevRfACV6AeGxNui0c0N8CbzR3x4iGGBmZwVayw_npoAZCbnu1w/exec';
const CACHE_KEY = 'tenantData';
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
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  const savedLanguage = localStorage.getItem('recognitionLanguage');
  if (savedLanguage) recognitionLanguage = savedLanguage;
  
  updateRecognitionLanguage();
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
      
      finalText = finalText.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
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

// Transliterate Cyrillic to Latin
function transliterate(text) {
  const numbersMap = {
    'один': '1', 'два': '2', 'три': '3', 'чотири': '4', 
    'п\'ять': '5', 'шість': '6', 'сім': '7', 'вісім': '8', 
    'дев\'ять': '9', 'десять': '10', 'четыре': '4', 
    'пять': '5', 'шесть': '6', 'семь': '7', 'восемь': '8', 'девять': '9',
    'перший': '1', 'другий': '2', 'третій': '3',
    'первый': '1', 'второй': '2', 'третий': '3'
  };
  
  let result = text.toLowerCase();
  Object.entries(numbersMap).forEach(([word, digit]) => {
    const regex = new RegExp('\\b' + word + '\\b', 'g');
    result = result.replace(regex, digit);
  });
  
  const charMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
    'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y',
    'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
    'щ': 'shch', 'ю': 'yu', 'я': 'ya', 'ы': 'y', 'э': 'e',
    'ь': '', '\'': '', '`': '', '’': '', 'ъ': ''
  };

  return result.split('').map(char => charMap[char] || char).join('');
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

// Clean string for searching
function cleanString(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
      
      if (serverTime <= cacheTime + 5000) {
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

// Initialize clean data for searching
function initCleanData() {
  cleanTenantData = tenantData.map(row => 
    row.map(cell => cell ? cleanString(cell) : '')
  );
}

// Get last modified date from server
function getLastModified() {
  return new Promise((resolve, reject) => {
    window.lastModifiedCb = resp => {
      cleanup('lastModifiedCb');
      resolve(new Date(resp.lastModified));
    };
    
    const s = document.createElement('script');
    s.src = `${SCRIPT_URL}?action=lastmodified&callback=lastModifiedCb`;
    s.onerror = () => reject(new Error('Failed to load last modified'));
    document.body.appendChild(s);
  });
}

// Fetch data from server
function fetchData(lastModified) {
  window.dataCb = resp => {
    tenantData = resp.data || [];
    initCleanData();
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: tenantData,
      lastModified: lastModified
    }));
    
    cleanup('dataCb');
    loader.style.display = 'none';
    
    if (textInput.value) filterAndRender(textInput.value);
  };
  
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?callback=dataCb`;
  s.onerror = () => {
    loader.style.display = 'none';
    searchHint.textContent = "Failed to load data. Please refresh the page.";
  };
  document.body.appendChild(s);
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

// Check match in general mode
function checkGeneralMatch(row, cleanRow, query) {
  return (
    cleanRow[1].includes(query) || // FullName
    cleanRow[2].includes(query) || // PPSN
    cleanRow[3].includes(query) || // Country
    cleanRow[4].includes(query) || // City
    cleanRow[5].includes(query) || // Address
    cleanRow[6].includes(query) || // Eircode
    cleanRow[7].includes(query) || // Phone
    cleanRow[8].includes(query) || // ElectricityAccount
    (row[10] && checkSynonyms(row[10], query)) // Synonyms
  );
}

// Check match in name mode
function checkNameMatch(row, cleanRow, query) {
  return (
    cleanRow[1].includes(query) || 
    (row[10] && checkSynonyms(row[10], query))
  );
}

// Check match in address mode
function checkAddressMatch(row, cleanRow, query) {
  return (
    cleanRow[5].includes(query) || 
    cleanRow[6].includes(query)
  );
}

// Check synonyms (case-insensitive)
function checkSynonyms(synonyms, query) {
  if (!synonyms) return false;
  
  const synonymList = synonyms.toString().split(',');
  
  return synonymList.some(syn => {
    const cleanSyn = cleanString(syn);
    return cleanSyn.includes(query) || query.includes(cleanSyn);
  });
}

// Render cards
function renderCards(rows) {
  cardsContainer.innerHTML = '';
  
  if (rows.length === 0) {
    noResults.style.display = 'block';
    return;
  }
  
  noResults.style.display = 'none';
  
  rows.forEach(row => {
    const card = document.createElement('div');
    card.className = 'tenant-card';
    
    const names = row[1] ? row[1].split(' ') : ['?'];
    const firstName = names[0] || '';
    const lastName = names.length > 1 ? names[names.length - 1] : firstName;
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    
    card.innerHTML = `
      <div class="card-header">
        <div class="avatar">${initials}</div>
        <div class="tenant-info">
          <div class="tenant-name">${row[1] || 'Unknown'}</div>
          <div class="tenant-location">
            <i class="fas fa-map-marker-alt"></i> ${row[4] || 'Unknown'}, ${row[3] || 'Unknown'}
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="info-group">
          <div class="info-label">Address</div>
          <div class="info-value">${row[5] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Eircode</div>
          <div class="info-value">${row[6] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Phone</div>
          <div class="info-value">${formatPhone(row[7])}</div>
        </div>
        <div class="info-group">
          <div class="info-label">PPSN</div>
          <div class="info-value">${row[2] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Electricity Account</div>
          <div class="info-value">${row[8] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Account Holder</div>
          <div class="info-value">${row[9] || 'Unknown'}</div>
        </div>
      </div>
    `;
    
    cardsContainer.appendChild(card);
  });
}

// Format phone numbers correctly
function formatPhone(phone) {
  if (!phone || phone === 'Unknown') return 'Unknown';
  
  // Remove all non-digit characters
  const digits = phone.toString().replace(/\D/g, '');
  
  // Format Irish international numbers: +353 XX XXX XXXX
  if (digits.startsWith('353') && digits.length === 11) {
    const prefix = digits.substring(3, 5);
    const rest = digits.substring(5);
    return `+353 ${prefix} ${rest.substring(0, 3)} ${rest.substring(3)}`;
  }
  
  // Format Ukrainian international numbers: +380 XX XXX XXXX
  if (digits.startsWith('380') && digits.length === 12) {
    const prefix = digits.substring(3, 5);
    const rest = digits.substring(5);
    return `+380 ${prefix} ${rest.substring(0, 3)} ${rest.substring(3)}`;
  }
  
  // Format Irish national numbers: 083 XXX XXXX
  if (digits.length === 9 && (digits.startsWith('08') || digits.startsWith('83')) {
    // Handle numbers with or without leading zero
    const cleanDigits = digits.startsWith('0') ? digits : `0${digits}`;
    return `${cleanDigits.substring(0, 3)} ${cleanDigits.substring(3, 6)} ${cleanDigits.substring(6)}`;
  }
  
  // Format Irish national numbers: 083 XXX XXXX (alternative format)
  if (digits.length === 9 && digits.startsWith('83')) {
    return `0${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
  }
  
  // Default formatting for other numbers
  return phone;
}

// Show suggestions
function showSuggestions(query) {
  suggestionsContainer.innerHTML = '';
  
  if (currentMode === 'general' || query.length < 2) {
    hideSuggestions();
    return;
  }
  
  const cleanQuery = cleanString(query);
  let suggestions = [];
  
  switch(currentMode) {
    case 'name': suggestions = tenantData.map(row => row[1]).filter(Boolean); break;
    case 'address': 
      suggestions = [
        ...tenantData.map(row => row[5]),
        ...tenantData.map(row => row[6])
      ].filter(Boolean);
      break;
  }
  
  const uniqueSuggestions = [...new Set(suggestions)];
  const matches = uniqueSuggestions.filter(s => 
    cleanString(s).includes(cleanQuery)
  ).slice(0, 5);
  
  if (matches.length > 0) {
    matches.forEach(text => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = text;
      div.addEventListener('click', () => {
        textInput.value = text;
        filterAndRender(text);
        hideSuggestions();
      });
      suggestionsContainer.appendChild(div);
    });
    suggestionsContainer.style.display = 'block';
  } else {
    hideSuggestions();
  }
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