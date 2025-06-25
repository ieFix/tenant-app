// Конфигурация
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyp9Q0oh59Gg9FemnWq1BwT3VMvtwW0WqD-Y82S4JMPdvJYUAJNC7sicYBt-tuw8yr0ag/exec';
const CACHE_KEY = 'tenantData';
const CACHE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 дней как резервный вариант
let tenantData = [];
let currentMode = 'general'; // general, name, address
let recognition = null;

// DOM элементы
const textInput = document.getElementById('textInput');
const voiceButton = document.getElementById('voiceButton');
const loader = document.getElementById('loader');
const cardsContainer = document.getElementById('cardsContainer');
const noResults = document.getElementById('noResults');
const themeToggle = document.getElementById('themeToggle');
const modeButtons = document.querySelectorAll('.mode-btn');
const searchHint = document.getElementById('searchHint');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  // Загрузка темы
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  // Инициализация голосового ввода
  initVoiceRecognition();
  
  // Загрузка данных
  loadData();
});

// Переключение темы
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const isDarkMode = document.body.classList.contains('dark-theme');
  localStorage.setItem('darkTheme', isDarkMode);
  themeToggle.innerHTML = isDarkMode ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
});

// Инициализация голосового ввода
function initVoiceRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-IE';
    recognition.continuous = false;
    
    recognition.onstart = () => {
      voiceButton.classList.add('listening');
      searchHint.textContent = currentMode === 'name' ? 
        "Speaking... (short names mode)" : 
        "Speaking...";
    };
    
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      textInput.value = transcript;
      filterAndRender(transcript);
    };
    
    recognition.onerror = (e) => {
      // Особенная обработка для коротких имен
      if (e.error === 'no-speech' && currentMode === 'name') {
        searchHint.textContent = "Couldn't hear you. Try again, please.";
        setTimeout(() => recognition.start(), 500);
      } else {
        handleVoiceError(e.error);
        resetVoiceButton();
      }
    };
    
    recognition.onend = resetVoiceButton;
  } else {
    voiceButton.style.display = 'none';
  }
}

// Сброс кнопки голосового ввода
function resetVoiceButton() {
  voiceButton.classList.remove('listening');
  updateSearchHint();
}

// Обновление подсказки поиска
function updateSearchHint() {
  switch(currentMode) {
    case 'general':
      searchHint.textContent = "Search by any information: name, address, account, etc.";
      break;
    case 'name':
      searchHint.textContent = "Search by name. Short names supported.";
      break;
    case 'address':
      searchHint.textContent = "Search by Eircode or full address.";
      break;
  }
}

// Загрузка данных
function loadData() {
  // Проверяем кеш
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const { data, timestamp, lastModified } = JSON.parse(stored);
    
    // Проверяем актуальность данных
    getLastModified().then(serverLastModified => {
      if (serverLastModified === lastModified) {
        tenantData = data;
        return;
      }
      
      // Данные устарели - загружаем заново
      fetchData(serverLastModified);
    });
  } else {
    // Нет кеша - загружаем данные
    fetchData();
  }
}

// Получение даты последнего изменения с сервера
function getLastModified() {
  return new Promise((resolve) => {
    window.lastModifiedCb = resp => {
      cleanup('lastModifiedCb');
      resolve(resp.lastModified);
    };
    
    const s = document.createElement('script');
    s.src = `${SCRIPT_URL}?action=getLastModified&callback=lastModifiedCb`;
    document.body.appendChild(s);
  });
}

// Загрузка данных с сервера
function fetchData(lastModified) {
  loader.style.display = 'flex';
  
  window.dataCb = resp => {
    tenantData = resp.data || [];
    
    // Сохраняем в кеш с датой изменения
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: tenantData,
      timestamp: Date.now(),
      lastModified: lastModified
    }));
    
    cleanup('dataCb');
    loader.style.display = 'none';
  };
  
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?callback=dataCb`;
  document.body.appendChild(s);
}

// Фильтрация и отображение результатов
function filterAndRender(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Очистка результатов при пустом запросе
  if (!lowerQuery) {
    cardsContainer.innerHTML = '';
    noResults.style.display = 'none';
    return;
  }
  
  const rows = tenantData.filter(r => {
    // Фильтрация в зависимости от режима
    switch(currentMode) {
      case 'general':
        return checkGeneralMatch(r, lowerQuery);
      case 'name':
        return checkNameMatch(r, lowerQuery);
      case 'address':
        return checkAddressMatch(r, lowerQuery);
      default:
        return false;
    }
  });
  
  renderCards(rows);
}

// Проверка совпадения в общем режиме
function checkGeneralMatch(row, query) {
  return (
    row[1]?.toLowerCase().includes(query) || // FullName
    row[2]?.toLowerCase().includes(query) || // PPSN
    row[3]?.toLowerCase().includes(query) || // Country
    row[4]?.toLowerCase().includes(query) || // City
    row[5]?.toLowerCase().includes(query) || // Address
    row[6]?.toLowerCase().includes(query) || // Eircode
    row[8]?.toLowerCase().includes(query) || // ElectricityAccount
    (row[10] && checkSynonyms(row[10], query)) // Synonyms
  );
}

// Проверка совпадения в режиме имени
function checkNameMatch(row, query) {
  return (
    row[1]?.toLowerCase().includes(query) || // FullName
    (row[10] && checkSynonyms(row[10], query)) // Synonyms
  );
}

// Проверка совпадения в режиме адреса
function checkAddressMatch(row, query) {
  return (
    row[5]?.toLowerCase().includes(query) || // Address
    row[6]?.toLowerCase().includes(query)  // Eircode
  );
}

// Проверка синонимов
function checkSynonyms(synonyms, query) {
  const synonymList = synonyms.toLowerCase().split(',');
  return synonymList.some(syn => syn.trim() === query);
}

// Отображение карточек
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
    
    // Получаем инициалы для аватара
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

// Обработка ошибок голосового ввода
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
  }
  
  searchHint.textContent = message;
  setTimeout(() => updateSearchHint(), 3000);
}

// Переключение режимов поиска
function setSearchMode(mode) {
  currentMode = mode;
  
  // Обновляем активную кнопку
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Обновляем подсказку
  updateSearchHint();
  
  // Применяем текущий фильтр
  if (textInput.value) {
    filterAndRender(textInput.value);
  }
}

// Очистка скриптов JSONP
function cleanup(cb) {
  const el = document.querySelector(`script[src*="${cb}"]`);
  if (el) el.remove();
  delete window[cb];
}

// Обработчики событий
textInput.addEventListener('input', () => {
  filterAndRender(textInput.value);
});

voiceButton.addEventListener('click', () => {
  if (recognition) recognition.start();
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setSearchMode(btn.dataset.mode);
  });
});

// Установка общего режима по умолчанию
setSearchMode('general');