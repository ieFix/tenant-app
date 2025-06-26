// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynSvt-Z9OCYBD_g_Tw1ph6WL9W_OesHPeZzGSrFSYMrQ30kypOzYqnxpkgD7AXl4mLKg/exec';
const CACHE_KEY = 'tenantData';
const CACHE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days
let tenantData = [];
let currentMode = 'general';
let recognition = null;
let recognitionLanguage = 'en-US'; // 'en-US' или 'uk-UA'

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
  // Load theme
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  // Load language preference
  const savedLanguage = localStorage.getItem('recognitionLanguage');
  if (savedLanguage) {
    recognitionLanguage = savedLanguage;
  }
  
  // Update UI based on language
  updateRecognitionLanguage();
  
  // Initialize voice recognition
  initVoiceRecognition();
  
  // Load data
  loadData();
  
  // Set up event listeners
  setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDarkMode = document.body.classList.contains('dark-theme');
    localStorage.setItem('darkTheme', isDarkMode);
    themeToggle.innerHTML = isDarkMode ? 
      '<i class="fas fa-sun"></i>' : 
      '<i class="fas fa-moon"></i>';
  });
  
  // Text input search
  textInput.addEventListener('input', () => {
    const safeQuery = sanitizeInput(textInput.value);
    filterAndRender(safeQuery);
    showSuggestions(safeQuery);
  });
  
  // Voice input
  voiceButton.addEventListener('click', startVoiceRecognition);
  
  // Language toggle
  languageButton.addEventListener('click', toggleRecognitionLanguage);
  
  // Mode switching
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setSearchMode(btn.dataset.mode);
      const safeQuery = sanitizeInput(textInput.value);
      if (safeQuery) filterAndRender(safeQuery);
      hideSuggestions();
    });
  });
  
  // Click outside to hide suggestions
  document.addEventListener('click', (e) => {
    if (!suggestionsContainer.contains(e.target)) {
      hideSuggestions();
    }
  });
  
  // Set default mode
  setSearchMode('general');
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
      const alternatives = Array.from(e.results[0])
        .map(result => result.transcript.trim())
        .filter(transcript => transcript.length > 0);
      
      // Use the best alternative
      const bestMatch = alternatives[0];
      
      // For Ukrainian mode, transliterate to Latin
      let finalText = bestMatch;
      if (recognitionLanguage === 'uk-UA') {
        finalText = transliterate(bestMatch);
      }
      
      // Sanitize and set input
      const safeInput = sanitizeInput(finalText);
      textInput.value = safeInput;
      filterAndRender(safeInput);
      logVoiceQuery(safeInput);
    };
    
    recognition.onerror = (e) => {
      let message = "Sorry, I didn't catch that. Please try typing.";
      
      switch(e.error) {
        case 'no-speech':
          message = "No speech detected. Please type instead.";
          break;
        case 'audio-capture':
          message = "Microphone not available. Please type.";
          break;
        case 'not-allowed':
          message = "Microphone access denied. Please allow access in settings.";
          break;
      }
      
      searchHint.textContent = message;
      resetVoiceButton();
      setTimeout(() => updateSearchHint(), 3000);
    };
    
    recognition.onend = resetVoiceButton;
  } else {
    voiceButton.style.display = 'none';
    searchHint.textContent = "Voice input not supported in this browser";
  }
}

// Transliterate Cyrillic to Latin
function transliterate(text) {
  const cyrillicMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
    'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y',
    'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
    'щ': 'shch', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G',
    'Д': 'D', 'Е': 'E', 'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y',
    'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
    'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
    'Щ': 'Shch', 'Ю': 'Yu', 'Я': 'Ya',
    'ь': '', '\'': '', '`': ''
  };

  return text.split('').map(char => 
    cyrillicMap[char] || char
  ).join('');
}

// Toggle recognition language
function toggleRecognitionLanguage() {
  recognitionLanguage = recognitionLanguage === 'en-US' ? 'uk-UA' : 'en-US';
  localStorage.setItem('recognitionLanguage', recognitionLanguage);
  
  // Update recognition engine
  if (recognition) {
    recognition.lang = recognitionLanguage;
  }
  
  // Update UI
  updateRecognitionLanguage();
}

// Update recognition language UI
function updateRecognitionLanguage() {
  if (recognitionLanguage === 'en-US') {
    languageButton.textContent = "UA";
    recognitionLabel.textContent = "Voice search: English names";
  } else {
    languageButton.textContent = "EN";
    recognitionLabel.textContent = "Voice search: Ukrainian names";
  }
}

// Sanitize user input
function sanitizeInput(input) {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .substring(0, 100);
}

// Reset voice button
function resetVoiceButton() {
  voiceButton.classList.remove('listening');
  updateSearchHint();
}

// Update search hint based on mode
function updateSearchHint() {
  switch(currentMode) {
    case 'general':
      searchHint.textContent = "Search by any information: name, address, account, etc.";
      break;
    case 'name':
      searchHint.textContent = "Search by name. Supports short names.";
      break;
    case 'address':
      searchHint.textContent = "Search by Eircode or address.";
      break;
  }
}

// Load data
function loadData() {
  const stored = localStorage.getItem(CACHE_KEY);
  
  getLastModified().then(serverLastModified => {
    // Всегда загружать данные, если кеш устарел
    if (!stored || serverLastModified > new Date(JSON.parse(stored).lastModified)) {
      fetchData(serverLastModified);
    } else {
      // Использовать кеш, если данные свежие
    }
  }).catch(err => {
    console.error('Cache check error:', err);
    fetchData(new Date(0));
  });
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
  loader.style.display = 'flex';
  
  window.dataCb = resp => {
    tenantData = resp.data || [];
    
    // Save to cache with last modified date
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: tenantData,
      timestamp: Date.now(),
      lastModified: lastModified
    }));
    
    cleanup('dataCb');
    loader.style.display = 'none';
    
    // Apply current search if any
    const safeQuery = sanitizeInput(textInput.value);
    if (safeQuery) filterAndRender(safeQuery);
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
  const cleanQuery = query.toLowerCase().trim();
  
  // Clear results on empty query
  if (!cleanQuery) {
    cardsContainer.innerHTML = '';
    noResults.style.display = 'none';
    hideSuggestions();
    return;
  }
  
  const rows = tenantData.filter(row => {
    // Filter based on current mode
    switch(currentMode) {
      case 'general':
        return checkGeneralMatch(row, cleanQuery);
      case 'name':
        return checkNameMatch(row, cleanQuery);
      case 'address':
        return checkAddressMatch(row, cleanQuery);
      default:
        return false;
    }
  });
  
  renderCards(rows);
}

// Check match in general mode
function checkGeneralMatch(row, query) {
  return (
    safeIncludes(row[1], query) || // FullName
    safeIncludes(row[2], query) || // PPSN
    safeIncludes(row[3], query) || // Country
    safeIncludes(row[4], query) || // City
    safeIncludes(row[5], query) || // Address
    safeIncludes(row[6], query) || // Eircode
    safeIncludes(row[7], query) || // Phone
    safeIncludes(row[8], query) || // ElectricityAccount
    (row[10] && checkSynonyms(row[10], query)) // Synonyms
  );
}

// Safe includes check
function safeIncludes(value, query) {
  return value && value.toString().toLowerCase().includes(query);
}

// Check synonyms
function checkSynonyms(synonyms, query) {
  if (!synonyms) return false;
  
  const synonymList = synonyms.toString().toLowerCase().split(',');
  const cleanQuery = query.replace(/[^a-z0-9]/gi, '');
  
  return synonymList.some(syn => {
    const cleanSyn = syn.trim().replace(/[^a-z0-9]/gi, '');
    return cleanSyn === cleanQuery || cleanSyn.includes(cleanQuery);
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
    
    // Get initials for avatar
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
          <div class="info-value">${formatPhone(row[7] || 'Unknown')}</div>
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

// Format phone numbers
function formatPhone(phone) {
  if (!phone || typeof phone !== 'string') return 'Unknown';
  return phone.replace(/(\+\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
}

// Show suggestions
function showSuggestions(query) {
  suggestionsContainer.innerHTML = '';
  
  if (query.length < 2) {
    hideSuggestions();
    return;
  }
  
  let suggestions = [];
  
  // Depending on mode, suggest different things
  switch(currentMode) {
    case 'general':
      suggestions = [
        ...tenantData.map(row => row[1]), // names
        ...tenantData.map(row => row[5]), // addresses
        ...tenantData.map(row => row[6])  // eircodes
      ].filter(Boolean);
      break;
    case 'name':
      suggestions = tenantData.map(row => row[1]).filter(Boolean); // names
      break;
    case 'address':
      suggestions = [
        ...tenantData.map(row => row[5]), // addresses
        ...tenantData.map(row => row[6])  // eircodes
      ].filter(Boolean);
      break;
  }
  
  // Remove duplicates and filter by query
  const uniqueSuggestions = [...new Set(suggestions)];
  const matches = uniqueSuggestions.filter(s => 
    s.toLowerCase().includes(query.toLowerCase())
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
  
  window.logCb = function() {
    cleanup('logCb');
  };
  
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?action=log&query=${encodeURIComponent(query)}&callback=logCb`;
  document.body.appendChild(s);
}

// Start voice recognition
function startVoiceRecognition() {
  if (!recognition) return;
  
  // For iOS, request permission
  if (isIOS() && !window.voicePermissionRequested) {
    requestIOSPermission();
    return;
  }
  
  recognition.start();
}

// Request iOS permission
function requestIOSPermission() {
  alert('For voice input, microphone access is required.');
  
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        window.voicePermissionRequested = true;
        if (permissionState === 'granted') {
          recognition.start();
        }
      });
  }
}

// Check if iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Set search mode
function setSearchMode(mode) {
  currentMode = mode;
  
  // Update active button
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Update hint
  updateSearchHint();
}

// Cleanup JSONP scripts
function cleanup(cb) {
  const el = document.querySelector(`script[src*="${cb}"]`);
  if (el) el.remove();
  delete window[cb];
}