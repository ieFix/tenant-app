// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwEuKhdIZRVzsQZSIP_WCyEfF1rI9mLnb47efx3EUKNDRGk05EOhi-hCTwGv5KEpzAD5w/exec';
const CACHE_KEY = 'tenantData';
const CACHE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
let tenantData = [];

// DOM Elements
const textInput = document.getElementById('textInput');
const voiceButton = document.getElementById('voiceButton');
const loader = document.getElementById('loader');
const cardsContainer = document.getElementById('cardsContainer');
const noResults = document.getElementById('noResults');
const themeToggle = document.getElementById('themeToggle');

// Global variables
let recognition = null;
let isListening = false;
let permissionRequested = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Load theme preference
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  // Initialize voice recognition
  initVoiceRecognition();
  
  // Load cached data
  loadCache();
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const isDarkMode = document.body.classList.contains('dark-theme');
  localStorage.setItem('darkTheme', isDarkMode);
  themeToggle.innerHTML = isDarkMode ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
});

// Initialize voice recognition
function initVoiceRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IE';
    
    recognition.onstart = () => {
      isListening = true;
      voiceButton.classList.add('listening');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      textInput.value = transcript;
      filterAndRender(transcript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      handleVoiceError(event.error);
      resetVoiceButton();
    };
    
    recognition.onend = () => {
      resetVoiceButton();
    };
  } else {
    voiceButton.style.display = 'none';
  }
}

// Load cached data
function loadCache() {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const { ts, data } = JSON.parse(stored);
    if (Date.now() - ts < CACHE_TIME) {
      tenantData = data;
      return;
    }
  }
  
  loader.style.display = 'flex';
  
  // Create callback for JSONP
  window.cacheCb = resp => {
    tenantData = resp.data;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: tenantData }));
    cleanup('cacheCb');
    loader.style.display = 'none';
    // Don't render anything on initial load
  };
  
  // Load data via JSONP
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?callback=cacheCb`;
  s.onerror = () => {
    loader.style.display = 'none';
    alert('Failed to load data. Please check your connection.');
  };
  document.body.appendChild(s);
}

// Cleanup JSONP script
function cleanup(cb) {
  const el = document.querySelector(`script[src*="${cb}"]`);
  if (el) el.remove();
  delete window[cb];
}

// Filter and render results
function filterAndRender(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Clear results if query is empty
  if (!lowerQuery) {
    cardsContainer.innerHTML = '';
    noResults.style.display = 'none';
    return;
  }
  
  const rows = tenantData.filter(r => 
    (r[1] && r[1].toString().toLowerCase().includes(lowerQuery)) || // FullName
    (r[2] && r[2].toString().toLowerCase().includes(lowerQuery)) || // PPSN
    (r[5] && r[5].toString().toLowerCase().includes(lowerQuery)) || // Address
    (r[6] && r[6].toString().toLowerCase().includes(lowerQuery)) || // Eircode
    (r[7] && r[7].toString().toLowerCase().includes(lowerQuery))    // Phone
  );
  
  renderCards(rows);
}

// Render tenant cards
function renderCards(rows) {
  cardsContainer.innerHTML = '';
  
  if (rows.length === 0) {
    noResults.style.display = 'block';
    return;
  }
  
  noResults.style.display = 'none';
  
  rows.forEach(r => {
    const card = document.createElement('div');
    card.className = 'tenant-card';
    
    // Get initials for avatar
    const names = r[1] ? r[1].split(' ') : ['?'];
    const firstName = names[0] || '';
    const lastName = names.length > 1 ? names[names.length - 1] : firstName;
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    
    card.innerHTML = `
      <div class="card-header">
        <div class="avatar">${initials}</div>
        <div class="tenant-info">
          <div class="tenant-name">${r[1] || 'Unknown'}</div>
          <div class="tenant-location">
            <i class="fas fa-map-marker-alt"></i> ${r[4] || 'Unknown'}, ${r[3] || 'Unknown'}
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="info-group">
          <div class="info-label">Address</div>
          <div class="info-value">${r[5] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Eircode</div>
          <div class="info-value">${r[6] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Phone</div>
          <div class="info-value">${r[7] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">PPSN</div>
          <div class="info-value">${r[2] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Electricity Account</div>
          <div class="info-value">${r[8] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Account Holder</div>
          <div class="info-value">${r[9] || 'Unknown'}</div>
        </div>
      </div>
    `;
    
    cardsContainer.appendChild(card);
  });
}

// Voice search
function startVoice() {
  if (!recognition) {
    alert('Voice recognition is not supported in your browser. Please use Chrome or Safari on iOS 14.5+.');
    return;
  }
  
  // Request permission on iOS
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' && !permissionRequested) {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        permissionRequested = true;
        if (permissionState === 'granted') {
          startRecognition();
        } else {
          alert('Permission to use microphone was denied. Please enable in browser settings.');
        }
      })
      .catch(console.error);
  } else {
    startRecognition();
  }
}

// Start recognition
function startRecognition() {
  if (isListening) return;
  
  try {
    recognition.start();
  } catch (error) {
    console.error('Error starting recognition:', error);
    handleVoiceError(error);
  }
}

// Reset voice button state
function resetVoiceButton() {
  isListening = false;
  voiceButton.classList.remove('listening');
}

// Handle voice errors
function handleVoiceError(error) {
  let message = 'Voice recognition failed. Please try again.';
  
  switch(error) {
    case 'no-speech':
      message = 'No speech detected. Please speak clearly.';
      break;
    case 'audio-capture':
      message = 'Microphone not available. Please check your device settings.';
      break;
    case 'not-allowed':
      message = 'Microphone permission denied. Please enable in browser settings.';
      break;
    case 'network':
      message = 'Network error occurred. Please check your connection.';
      break;
  }
  
  alert(message);
}

// Event Listeners
textInput.addEventListener('input', () => {
  filterAndRender(textInput.value);
});

voiceButton.addEventListener('click', startVoice);

// Add keyboard shortcut for voice search (v key)
document.addEventListener('keydown', (e) => {
  if (e.key === 'v' && document.activeElement !== textInput) {
    startVoice();
  }
});

// Clear input when user starts typing
textInput.addEventListener('focus', () => {
  textInput.value = '';
  filterAndRender('');
});
