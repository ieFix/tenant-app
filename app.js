// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQmJN2WeHak4cMicIoF0t_YUuSeheq-XL3QOE7HLOzIPKHog4pV_WLGBPXj5aKkNMgOg/exec';
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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Load theme preference
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
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
    filterAndRender('');
  };
  
  // Load data via JSONP
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?callback=cacheCb`;
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
  const rows = lowerQuery
    ? tenantData.filter(r => 
        (r[1] && r[1].toString().toLowerCase().includes(lowerQuery)) || // FullName
        (r[2] && r[2].toString().toLowerCase().includes(lowerQuery)) || // PPSN
        (r[5] && r[5].toString().toLowerCase().includes(lowerQuery)) || // Address
        (r[6] && r[6].toString().toLowerCase().includes(lowerQuery)) || // Eircode
        (r[7] && r[7].toString().toLowerCase().includes(lowerQuery))    // Phone
      )
    : [];
  
  renderCards(rows);
}

// Render tenant cards
function renderCards(rows) {
  cardsContainer.innerHTML = '';
  
  if (!rows.length) {
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
  if (!('webkitSpeechRecognition' in window)) {
    alert('Voice recognition is not supported in your browser. Please use Chrome or Safari.');
    return;
  }
  
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-IE';
  recognition.onresult = e => {
    const transcript = e.results[0][0].transcript;
    textInput.value = transcript;
    filterAndRender(transcript);
  };
  recognition.start();
  
  // Visual feedback
  voiceButton.classList.add('listening');
  setTimeout(() => voiceButton.classList.remove('listening'), 3000);
}

// Event Listeners
textInput.addEventListener('input', () => {
  filterAndRender(textInput.value);
});

voiceButton.addEventListener('click', startVoice);