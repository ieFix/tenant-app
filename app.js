// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx06_E1Qw3oQaBWOKILl7PDVpqcvjypdu6d7ZNBGpNQKM7cSq0JzRMGViieB1v-7Mdz5Q/exec';
const CACHE_KEY = 'tenantData';
const CACHE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days
let tenantData = [];
let currentMode = 'general';
let recognition = null;

// DOM elements
const textInput = document.getElementById('textInput');
const voiceButton = document.getElementById('voiceButton');
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
    filterAndRender(textInput.value);
    showSuggestions(textInput.value);
  });
  
  // Voice input
  voiceButton.addEventListener('click', startVoiceRecognition);
  
  // Mode switching
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setSearchMode(btn.dataset.mode);
      if (textInput.value) filterAndRender(textInput.value);
      hideSuggestions();
    });
  });
  
  // Click outside to hide suggestions
  document.addEventListener('click', (e) => {
    if (!suggestionsContainer.contains(e.target) && e.target !== textInput) {
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
    
    // Try to find best language support
    const supportedLangs = [
      'ru-RU', 'uk-UA', 'en-US', 'en-IE'
    ];
    
    // Set first supported language
    recognition.lang = supportedLangs.find(lang => {
      try {
        recognition.lang = lang;
        return true;
      } catch (e) {
        return false;
      }
    }) || 'en-US';
    
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      voiceButton.classList.add('listening');
      searchHint.textContent = "Listening... Speak now";
    };
    
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const latinText = transliterate(transcript);
      
      console.log(`Voice: ${transcript} → ${latinText}`);
      
      textInput.value = latinText;
      filterAndRender(latinText);
      logVoiceQuery(latinText);
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
    'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G',
    'Д': 'D', 'Е': 'E', 'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y',
    'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
    'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
    'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return text.split('').map(char => 
    cyrillicMap[char] || char
  ).join('');
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
    if (textInput.value) filterAndRender(textInput.value);
  };
  
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?callback=dataCb`;
  document.body.appendChild(s);
}

// Filter and render results
function filterAndRender(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Clear results on empty query
  if (!lowerQuery) {
    cardsContainer.innerHTML = '';
    noResults.style.display = 'none';
    hideSuggestions();
    return;
  }
  
  const rows = tenantData.filter(row => {
    // Filter based on current mode
    switch(currentMode) {
      case 'general':
        return checkGeneralMatch(row, lowerQuery);
      case 'name':
        return checkNameMatch(row, lowerQuery);
      case 'address':
        return checkAddressMatch(row, lowerQuery);
      default:
        return false;
    }
  });
  
  renderCards(rows);
}

// Check match in general mode
function checkGeneralMatch(row, query) {
  return (
    (row[1] && row[1].toString().toLowerCase().includes(query)) || // FullName
    (row[2] && row[2].toString().toLowerCase().includes(query)) || // PPSN
    (row[3] && row[3].toString().toLowerCase().includes(query)) || // Country
    (row[4] && row[4].toString().toLowerCase().includes(query)) || // City
    (row[5] && row[5].toString().toLowerCase().includes(query)) || // Address
    (row[6] && row[6].toString().toLowerCase().includes(query)) || // Eircode
    (row[7] && row[7].toString().toLowerCase().includes(query)) || // Phone
    (row[8] && row[8].toString().toLowerCase().includes(query)) || // ElectricityAccount
    (row[10] && checkSynonyms(row[10], query)) // Synonyms
  );
}

// Check match in name mode
function checkNameMatch(row, query) {
  return (
    (row[1] && row[1].toString().toLowerCase().includes(query)) || // FullName
    (row[10] && checkSynonyms(row[10], query)) // Synonyms
  );
}

// Check match in address mode
function checkAddressMatch(row, query) {
  return (
    (row[5] && row[5].toString().toLowerCase().includes(query)) || // Address
    (row[6] && row[6].toString().toLowerCase().includes(query)) // Eircode
  );
}

// Check synonyms
function checkSynonyms(synonyms, query) {
  if (!synonyms) return false;
  const synonymList = synonyms.toString().toLowerCase().split(',');
  return synonymList.some(syn => syn.trim() === query);
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
          <div class="info-value">${row[7] || 'Unknown'}</div>
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
      // For general, we suggest names and addresses
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