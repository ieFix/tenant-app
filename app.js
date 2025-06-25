// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQmJN2WeHak4cMicIoF0t_YUuSeheq-XL3QOE7HLOzIPKHog4pV_WLGBPXj5aKkNMgOg/exec';
const CACHE_KEY = 'tenantDataCache';
const CACHE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days cache

// DOM Elements
const textInput = document.getElementById('textInput');
const voiceButton = document.getElementById('voiceButton');
const loader = document.getElementById('loader');
const cardsContainer = document.getElementById('cardsContainer');
const noResults = document.getElementById('noResults');
const resultsCount = document.getElementById('resultsCount');
const themeToggle = document.getElementById('themeToggle');
const cacheIndicator = document.getElementById('cacheIndicator');

// Global variables
let tenantData = [];
let isCachedData = false;
let recognition = null;
let voicePermissionRequested = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Load theme preference
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  // Load cached data if available
  loadCachedData();
  
  // Load fresh data from server
  loadDataFromServer();
  
  // Initialize voice recognition if supported
  initVoiceRecognition();
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
      voiceButton.classList.add('listening');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      textInput.value = transcript;
      filterTenants(transcript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      showVoiceError(event.error);
      resetVoiceButton();
    };
    
    recognition.onend = () => {
      resetVoiceButton();
    };
  }
}

// Load cached data
function loadCachedData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return;
  
  const { timestamp, data } = JSON.parse(cached);
  const cacheAge = Date.now() - timestamp;
  
  // Use cache if it's less than 7 days old
  if (cacheAge < CACHE_TIME) {
    tenantData = data;
    isCachedData = true;
    renderResults(tenantData);
    cacheIndicator.style.display = 'flex';
    resultsCount.textContent = `Loaded ${tenantData.length} tenants from cache`;
  } else {
    // Remove expired cache
    localStorage.removeItem(CACHE_KEY);
  }
}

// Load data from server
function loadDataFromServer() {
  loader.style.display = 'flex';
  resultsCount.textContent = 'Loading tenant data...';
  cacheIndicator.style.display = 'none';
  
  // Create a callback function for JSONP
  window.handleServerResponse = function(data) {
    tenantData = data.data || [];
    
    // Cache the new data
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: tenantData
    }));
    
    isCachedData = false;
    renderResults(tenantData);
    loader.style.display = 'none';
    cacheIndicator.style.display = 'none';
    resultsCount.textContent = `Loaded ${tenantData.length} tenants`;
    
    // Cleanup
    delete window.handleServerResponse;
  };
  
  // Create script element for JSONP
  const script = document.createElement('script');
  script.src = `${SCRIPT_URL}?callback=handleServerResponse`;
  document.body.appendChild(script);
}

// Render tenant cards
function renderResults(tenants) {
  cardsContainer.innerHTML = '';
  
  if (!tenants.length) {
    noResults.style.display = 'block';
    resultsCount.textContent = 'No tenants found';
    return;
  }
  
  noResults.style.display = 'none';
  resultsCount.textContent = `Showing ${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}`;
  
  tenants.forEach(tenant => {
    const card = document.createElement('div');
    card.className = 'tenant-card';
    
    // Get initials for avatar
    const names = tenant[1] ? tenant[1].split(' ') : ['?'];
    const firstName = names[0] || '';
    const lastName = names.length > 1 ? names[names.length - 1] : firstName;
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    
    card.innerHTML = `
      <div class="card-header">
        <div class="avatar">${initials}</div>
        <div class="tenant-info">
          <div class="tenant-name">${tenant[1] || 'Unknown'}</div>
          <div class="tenant-location">
            <i class="fas fa-map-marker-alt"></i> ${tenant[4] || 'Unknown'}, ${tenant[3] || 'Unknown'}
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="info-group">
          <div class="info-label">Address</div>
          <div class="info-value">${tenant[5] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Eircode</div>
          <div class="info-value">${tenant[6] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Phone</div>
          <div class="info-value">${tenant[7] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">PPSN</div>
          <div class="info-value">${tenant[2] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Electricity Account</div>
          <div class="info-value">${tenant[8] || 'Unknown'}</div>
        </div>
        <div class="info-group">
          <div class="info-label">Account Holder</div>
          <div class="info-value">${tenant[9] || 'Unknown'}</div>
        </div>
      </div>
    `;
    
    cardsContainer.appendChild(card);
  });
}

// Filter tenant data
function filterTenants(query) {
  if (!query) {
    renderResults(tenantData);
    resultsCount.textContent = `Showing all ${tenantData.length} tenants`;
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  const filtered = tenantData.filter(tenant => {
    return (
      (tenant[1] && tenant[1].toString().toLowerCase().includes(lowerQuery)) ||
      (tenant[2] && tenant[2].toString().toLowerCase().includes(lowerQuery)) ||
      (tenant[5] && tenant[5].toString().toLowerCase().includes(lowerQuery)) ||
      (tenant[6] && tenant[6].toString().toLowerCase().includes(lowerQuery)) ||
      (tenant[7] && tenant[7].toString().toLowerCase().includes(lowerQuery))
    );
  });
  
  renderResults(filtered);
  resultsCount.textContent = filtered.length === 0 ? 
    'No tenants found' : 
    `Found ${filtered.length} matching tenant${filtered.length !== 1 ? 's' : ''}`;
}

// Voice search
function startVoice() {
  if (!recognition) {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. Please use Chrome or Safari on iOS 14.5+.');
      return;
    }
    
    initVoiceRecognition();
  }
  
  // Request permission on iOS
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          startRecognition();
        } else {
          alert('Permission to use microphone was denied.');
        }
      })
      .catch(console.error);
  } else {
    startRecognition();
  }
}

// Start recognition
function startRecognition() {
  try {
    recognition.start();
  } catch (error) {
    console.error('Error starting recognition:', error);
    showVoiceError(error);
  }
}

// Reset voice button state
function resetVoiceButton() {
  voiceButton.classList.remove('listening');
}

// Show voice error
function showVoiceError(error) {
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
  filterTenants(textInput.value.trim());
});

voiceButton.addEventListener('click', startVoice);

// Add keyboard shortcut for voice search (v key)
document.addEventListener('keydown', (e) => {
  if (e.key === 'v' && document.activeElement !== textInput) {
    startVoice();
  }
});

// Handle enter key in search
textInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    filterTenants(textInput.value.trim());
  }
});