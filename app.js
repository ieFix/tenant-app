// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzY83pfKvOlPgaee6HAKqMqmZ8flsWDbgu9__veAnDGncCm77xGseSMhIVbGJegaiqSYQ/exec';
const CACHE_KEY = 'tenantData';
const CACHE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days
let tenantData = [];
let currentMode = 'general';
let recognition = null;
let currentLanguage = 'en-US'; // Default language

// DOM elements
const textInput = document.getElementById('textInput');
const voiceButton = document.getElementById('voiceButton');
const languageButton = document.getElementById('languageButton');
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
  const savedLanguage = localStorage.getItem('voiceLanguage');
  if (savedLanguage) {
    currentLanguage = savedLanguage;
    updateLanguageButton();
  }
  
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
  languageButton.addEventListener('click', toggleLanguage);
  
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
    recognition.lang = currentLanguage;
    recognition.continuous = false;
    recognition.maxAlternatives = 5; // Get multiple alternatives
    
    recognition.onstart = () => {
      voiceButton.classList.add('listening');
      searchHint.textContent = currentLanguage === 'uk-UA' 
        ? "Listening for Ukrainian names..." 
        : "Listening for English names...";
    };
    
    recognition.onresult = (e) => {
      const alternatives = Array.from(e.results[0])
        .map(result => result.transcript.trim())
        .filter(transcript => transcript.length > 0);
      
      // Use the shortest alternative (usually most accurate)
      const bestMatch = alternatives.reduce((shortest, current) => 
        current.length < shortest.length ? current : shortest, alternatives[0]
      );
      
      // For Ukrainian, transliterate to Latin
      let finalText = bestMatch;
      if (currentLanguage === 'uk-UA') {
        finalText = transliterate(bestMatch);
      }
      
      // Sanitize and set input
      const safeInput = sanitizeInput(finalText);
      textInput.value = safeInput;
      filterAndRender(safeInput);
      logVoiceQuery(safeInput);
    };
    
    recognition.onerror = (e) => {
      let message = "Sorry, I didn't catch that. Please type instead.";
      
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
    'ь': '', '\'': '', '`': '', ' ': ' '
  };

  return text.split('').map(char => 
    cyrillicMap[char] || char
  ).join('');
}

// Toggle recognition language
function toggleLanguage() {
  currentLanguage = currentLanguage === 'en-US' ? 'uk-UA' : 'en-US';
  localStorage.setItem('voiceLanguage', currentLanguage);
  updateLanguageButton();
  
  if (recognition) {
    recognition.lang = currentLanguage;
  }
  
  searchHint.textContent = currentLanguage === 'uk-UA' 
    ? "Ukrainian recognition enabled" 
    : "English recognition enabled";
  setTimeout(() => updateSearchHint(), 2000);
}

// Update language button
function updateLanguageButton() {
  languageButton.textContent = currentLanguage === 'uk-UA' ? 'UA' : 'EN';
}

// Sanitize user input
function sanitizeInput(input) {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .substring(0, 100); // Limit input length
}

// Reset voice button
function resetVoiceButton() {
  voiceButton.classList.remove('listening');
  updateSearchHint();
}

// Update search hint based on mode
function updateSearchHint() {
  if (currentLanguage === 'uk-UA') {
    switch(currentMode) {
      case 'general':
        searchHint.textContent = "earch by any information: name, address, account, etc.";
        break;
      case 'name':
        searchHint.textContent = "Search by name. Supports short names.";
        break;
      case 'address':
        searchHint.textContent = "earch by Eircode or address.";
        break;
    }
  } else {
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
}

// Load data
function loadData() {
  const stored = localStorage.getItem(CACHE_KEY);
  
  // Check data freshness
  getLastModified().then(serverLastModified => {
    if (stored) {
      const { data, timestamp, lastModified } = JSON.parse(stored);
      
      // Use cache if data is fresh
      if (lastModified === serverLastModified && Date.now() - timestamp < CACHE_TIME) {
        tenantData = data;
        return;
      }
    }
    
    // Fetch new data
    fetchData(serverLastModified);
  });
}

// Get last modified date from server
function getLastModified() {
  return new Promise((resolve) => {
    window.lastModifiedCb = resp => {
      cleanup('lastModifiedCb');
      resolve(resp.lastModified);
    };
    
    const s = document.createElement('script');
    s.src = `${SCRIPT_URL}?action=lastmodified&callback=lastModifiedCb`;
    document.body.appendChild(s);
  });
}

// Fetch data from server
function fetchData(lastModified) {
  loader.style.display = 'flex';
  
  window.dataCb = resp => {
    // Validate and sanitize response
    if (!Array.isArray(resp.data)) {
      console.error('Invalid data format received');
      tenantData = [];
    } else {
      tenantData = resp.data.map(row => 
        row.map(cell => typeof cell === 'string' ? sanitizeInput(cell) : cell)
      );
    }
    
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
    return cleanSyn === cleanQuery;
  });
}

// Render cards safely
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
    
    // Safe content creation
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = initials;
    
    const tenantInfo = document.createElement('div');
    tenantInfo.className = 'tenant-info';
    
    const tenantName = document.createElement('div');
    tenantName.className = 'tenant-name';
    tenantName.textContent = row[1] || 'Unknown';
    
    const tenantLocation = document.createElement('div');
    tenantLocation.className = 'tenant-location';
    
    const locationIcon = document.createElement('i');
    locationIcon.className = 'fas fa-map-marker-alt';
    
    const locationText = document.createTextNode(` ${row[4] || 'Unknown'}, ${row[3] || 'Unknown'}`);
    
    tenantLocation.appendChild(locationIcon);
    tenantLocation.appendChild(locationText);
    
    tenantInfo.appendChild(tenantName);
    tenantInfo.appendChild(tenantLocation);
    
    header.appendChild(avatar);
    header.appendChild(tenantInfo);
    
    const body = document.createElement('div');
    body.className = 'card-body';
    
    // Create info groups safely
    const fields = [
      { label: 'Address', value: row[5] },
      { label: 'Eircode', value: row[6] },
      { label: 'Phone', value: formatPhone(row[7]) },
      { label: 'PPSN', value: row[2] },
      { label: 'Electricity Account', value: row[8] },
      { label: 'Account Holder', value: row[9] }
    ];
    
    fields.forEach(field => {
      const group = document.createElement('div');
      group.className = 'info-group';
      
      const label = document.createElement('div');
      label.className = 'info-label';
      label.textContent = field.label;
      
      const value = document.createElement('div');
      value.className = 'info-value';
      value.textContent = field.value || 'Unknown';
      
      group.appendChild(label);
      group.appendChild(value);
      body.appendChild(group);
    });
    
    card.appendChild(header);
    card.appendChild(body);
    cardsContainer.appendChild(card);
  });
}

// Format phone numbers safely
function formatPhone(phone) {
  if (!phone) return 'Unknown';
  return phone.toString().replace(/(\+\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
}

// Show suggestions safely
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
  const message = currentLanguage === 'uk-UA' 
    ? "Для використання голосового вводу потрібен доступ до мікрофона." 
    : "For voice input, microphone access is required.";
  
  alert(message);
  
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