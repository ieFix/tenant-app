// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyInNQjDjuDOnzKVE0j7eZisaRr-2D55Tad2T-yakBZiDtltL-NPwuS7i4cnTv4igpQqg/exec';
const CACHE_KEY = 'tenantData';
let tenantData = [];
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
  
  // Set focus to search input
  textInput.focus();
  
  // Load data
  loadData();
  
  // Set up event listeners
  setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Text input search
  textInput.addEventListener('input', handleSearchInput);
  
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
  themeToggle.innerHTML = isDarkMode ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
}

// Handle search input
function handleSearchInput() {
  const safeQuery = sanitizeInput(textInput.value);
  filterAndRender(safeQuery);
  
  // Показываем подсказки только в режимах Name и Address
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
      
      // Transliterate for Ukrainian
      if (recognitionLanguage === 'uk-UA') {
        finalText = transliterate(transcript);
      }
      
      // Удаляем знаки препинания и лишние пробелы
      finalText = finalText.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
      
      // Sanitize and set input
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
  const cyrillicMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
    'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y',
    'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
    'щ': 'shch', 'ю': 'yu', 'я': 'ya',
    'ь': '', '\'': '', '`': '', '’': ''
  };

  return text.split('').map(char => 
    cyrillicMap[char] || char
  ).join('');
}

// Toggle recognition language
function toggleRecognitionLanguage() {
  recognitionLanguage = recognitionLanguage === 'en-US' ? 'uk-UA' : 'en-US';
  localStorage.setItem('recognitionLanguage', recognitionLanguage);
  
  if (recognition) {
    recognition.lang = recognitionLanguage;
  }
  
  updateRecognitionLanguage();
}

// Update recognition language UI
function updateRecognitionLanguage() {
  if (recognitionLanguage === 'en-US') {
    languageButton.textContent = "UA";
    languageButton.title = "Switch to Ukrainian";
    recognitionLabel.textContent = "Voice search: English names";
  } else {
    languageButton.textContent = "EN";
    languageButton.title = "Switch to English";
    recognitionLabel.textContent = "Voice search: Ukrainian names";
  }
  updateSearchHint();
}

// Handle recognition errors
function handleRecognitionError(error) {
  let message = "Sorry, I didn't catch that. Please try typing.";
  
  switch(error) {
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
  setTimeout(updateSearchHint, 3000);
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
  loader.style.display = 'flex';
  
  getLastModified()
    .then(serverLastModified => {
      const stored = localStorage.getItem(CACHE_KEY);
      const cacheData = stored ? JSON.parse(stored) : null;
      
      // Check if cache is valid
      if (cacheData && cacheData.lastModified) {
        const cacheTime = new Date(cacheData.lastModified).getTime();
        const serverTime = new Date(serverLastModified).getTime();
        
        if (serverTime <= cacheTime) {
          tenantData = cacheData.data || [];
          loader.style.display = 'none';
          if (textInput.value) filterAndRender(textInput.value);
          return;
        }
      }
      
      // Fetch new data
      fetchData(serverLastModified);
    })
    .catch(err => {
      console.error('Cache check error:', err);
      // Try to use cache anyway if available
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const cacheData = JSON.parse(stored);
        tenantData = cacheData.data || [];
        loader.style.display = 'none';
        if (textInput.value) filterAndRender(textInput.value);
      } else {
        searchHint.textContent = "Failed to load data. Please refresh the page.";
      }
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
  window.dataCb = resp => {
    tenantData = resp.data || [];
    
    // Save to cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: tenantData,
      lastModified: lastModified
    }));
    
    cleanup('dataCb');
    loader.style.display = 'none';
    
    // Apply current search
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
  const cleanQuery = query.toLowerCase().trim();
  
  if (!cleanQuery) {
    cardsContainer.innerHTML = '';
    noResults.style.display = 'none';
    hideSuggestions();
    return;
  }
  
  const rows = tenantData.filter(row => {
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

// Check match in name mode
function checkNameMatch(row, query) {
  return (
    safeIncludes(row[1], query) || 
    (row[10] && checkSynonyms(row[10], query))
  );
}

// Check match in address mode
function checkAddressMatch(row, query) {
  return (
    safeIncludes(row[5], query) || 
    safeIncludes(row[6], query)
  );
}

// Safe includes check
function safeIncludes(value, query) {
  if (!value) return false;
  const cleanValue = value.toString().toLowerCase().replace(/[^\w\s]|_/g, "");
  return cleanValue.includes(query);
}

// Check synonyms - теперь только полное совпадение
function checkSynonyms(synonyms, query) {
  if (!synonyms) return false;
  
  const synonymList = synonyms.toString().toLowerCase().replace(/[^\w\s]|_/g, "").split(',');
  
  return synonymList.some(syn => {
    const cleanSyn = syn.trim();
    // ТОЛЬКО ПОЛНОЕ СОВПАДЕНИЕ
    return cleanSyn === query;
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

// Format phone numbers - исправленная версия
function formatPhone(phone) {
  // Проверяем на null/undefined/пустую строку
  if (phone == null || phone === '') return 'Unknown';
  
  // Преобразуем в строку
  const phoneStr = phone.toString();
  
  // Удаляем все нецифровые символы, кроме плюса в начале
  const cleaned = phoneStr.replace(/(?!^\+)[^\d]/g, '');
  
  // Форматируем номер телефона
  const match = cleaned.match(/^(\+\d{2})(\d{3})(\d{3})(\d{3})$/);
  
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  
  // Возвращаем оригинал, если формат не распознан
  return phoneStr;
}

// Show suggestions
function showSuggestions(query) {
  suggestionsContainer.innerHTML = '';
  
  // Не показываем подсказки в общем режиме
  if (currentMode === 'general') {
    hideSuggestions();
    return;
  }
  
  if (query.length < 2) {
    hideSuggestions();
    return;
  }
  
  let suggestions = [];
  
  switch(currentMode) {
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
  
  // Filter and deduplicate
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
  recognition.start();
}

// Set search mode
function setSearchMode(mode) {
  currentMode = mode;
  
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  updateSearchHint();
  
  // Обновляем подсказки при смене режима
  const safeQuery = sanitizeInput(textInput.value);
  if (safeQuery) {
    filterAndRender(safeQuery);
    if (mode !== 'general') {
      showSuggestions(safeQuery);
    }
  }
}

// Cleanup JSONP scripts
function cleanup(cb) {
  const el = document.querySelector(`script[src*="${cb}"]`);
  if (el) el.remove();
  delete window[cb];
}