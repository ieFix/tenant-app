// scripts/mapModule.js
let map;
let clickMarker;
let resultLayerGroup;

function initMap() {
  // Инициализация карты
  map = L.map('map').setView([53.943675, -8.950022], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  
  // Добавляем слой для начального состояния
  const mapContainer = document.getElementById('map');
  const initialState = document.createElement('div');
  initialState.className = 'map-initial-state';
  initialState.innerHTML = `
    <i class="fas fa-map-marker-alt"></i>
    <p>Tap anywhere on the map to find tenants within 250m</p>
  `;
  mapContainer.appendChild(initialState);

  // Группа для маркеров результатов
  resultLayerGroup = L.layerGroup().addTo(map);

  // Обработчик клика
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    
    // Показываем прелоадер
    showMapPreloader(true);
    
    // Скрываем начальное состояние
    document.querySelector('.map-initial-state').classList.add('hidden');
    
    // Обновление центрального маркера
    if (clickMarker) map.removeLayer(clickMarker);
    clickMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'center-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    
    // Поиск
    try {
      const results = await searchNearbyEircodes(lat, lng);
      displayGeoResults(results);
      addResultMarkers(results);
    } catch (error) {
      console.error('Search error:', error);
      showErrorState();
    } finally {
      showMapPreloader(false);
    }
  });
}

function showMapPreloader(show) {
  const preloader = document.querySelector('.map-preloader');
  if (!preloader) {
    const preloaderDiv = document.createElement('div');
    preloaderDiv.className = 'map-preloader';
    preloaderDiv.innerHTML = '<div class="loader"></div>';
    document.querySelector('.modal-body').appendChild(preloaderDiv);
  }
  
  if (show) {
    document.querySelector('.map-preloader').classList.add('active');
  } else {
    document.querySelector('.map-preloader').classList.remove('active');
  }
}

function showErrorState() {
  const geoResults = document.getElementById('geoResults');
  const resultsSection = document.querySelector('.results-section');
  
  geoResults.innerHTML = `
    <div class="no-geo-results">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Failed to load results. Please try again.</p>
    </div>
  `;
  
  resultsSection.classList.add('visible');
}

async function searchNearbyEircodes(lat, lng) {
  try {
    const url = `${SCRIPT_URL}?action=geo&lat=${lat}&lng=${lng}&callback=cb`;
    const response = await fetch(url);
    const text = await response.text();

    const match = text.match(/^cb\((.*)\);?$/s);
    if (!match) {
      throw new Error('Failed to parse JSONP response');
    }

    const data = JSON.parse(match[1]);
    return data.results || [];
  } catch (error) {
    console.error('Geo search error:', error);
    throw error;
  }
}

function addResultMarkers(results) {
  // Очистить предыдущие маркеры
  resultLayerGroup.clearLayers();
  
  // Добавить маркеры для результатов
  results.forEach(result => {
    const marker = L.marker([result.lat, result.lng], {
      icon: L.divIcon({
        className: 'eircode-marker',
        html: `<div>${result.eircode}</div>`,
        iconSize: [100, 40],
        iconAnchor: [50, 40]
      })
    });
    
    resultLayerGroup.addLayer(marker);
  });
  
  // Автомасштабирование, чтобы показать все маркеры
  if (results.length > 0) {
    const bounds = resultLayerGroup.getBounds();
    map.fitBounds(bounds, { padding: [100, 100] });
  }
}

function displayGeoResults(results) {
  const geoResults = document.getElementById('geoResults');
  const resultsCount = document.getElementById('resultsCount');
  const resultsSection = document.querySelector('.results-section');
  
  // Обновить счетчик
  resultsCount.textContent = `${results.length} ${results.length === 1 ? 'location' : 'locations'}`;
  
  // Очистить предыдущие результаты
  geoResults.innerHTML = '';
  
  if (results.length === 0) {
    geoResults.innerHTML = `
      <div class="no-geo-results">
        <i class="fas fa-search"></i>
        <p>No tenants found within 250m. Try another location.</p>
      </div>
    `;
  } else {
    // Добавить результаты в оригинальном формате
    results.forEach(result => {
      const li = document.createElement('div');
      li.className = 'geo-result-item';
      
      li.innerHTML = `
        <span class="geo-result-code">${result.eircode}</span>
        <div class="geo-result-address">${result.address}</div>
        <div class="geo-result-distance">
          <i class="fas fa-route"></i> ${result.distance} km away
        </div>
      `;
      
      li.addEventListener('click', () => {
        document.getElementById('textInput').value = result.eircode;
        setSearchMode('address');
        filterAndRender(result.eircode);
        closeMapModal();
      });
      
      geoResults.appendChild(li);
    });
  }
  
  // Показать секцию результатов
  resultsSection.classList.add('visible');
}

function openMapModal() {
  const modal = document.getElementById('mapModal');
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  // Сбросить состояние
  const resultsSection = document.querySelector('.results-section');
  if (resultsSection) {
    resultsSection.classList.remove('visible');
    document.getElementById('geoResults').innerHTML = '';
  }
  
  // Показать начальное состояние
  const initialState = document.querySelector('.map-initial-state');
  if (initialState) initialState.classList.remove('hidden');

  // Инициализация карты при первом открытии
  if (!map) {
    setTimeout(() => {
      initMap();
      map.invalidateSize();
      addCustomMarkerStyles();
    }, 100);
  } else {
    // Сбросить вид карты
    map.setView([53.3498, -6.2603], 13);
    resultLayerGroup.clearLayers();
    if (clickMarker) map.removeLayer(clickMarker);
    clickMarker = null;
    map.invalidateSize();
    
    // Показать начальное состояние
    if (initialState) initialState.classList.remove('hidden');
  }
}

function closeMapModal() {
  document.getElementById('mapModal').style.display = 'none';
  document.body.style.overflow = '';
}

function addCustomMarkerStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .center-marker {
      width: 24px;
      height: 24px;
      background: #ea4335;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 8px rgba(234, 67, 53, 0.4);
      position: relative;
      z-index: 1000;
      animation: pulse 2s infinite;
    }
    
    .eircode-marker {
      background: var(--primary);
      color: white;
      border-radius: 20px;
      padding: 6px 12px;
      font-weight: bold;
      font-size: 13px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      border: 2px solid white;
      text-align: center;
      min-width: 80px;
      transform: translate(-50%, -100%);
      position: relative;
      z-index: 500;
      transition: all 0.2s ease;
    }
    
    .eircode-marker::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid var(--primary);
    }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.6); }
      70% { box-shadow: 0 0 0 16px rgba(234, 67, 53, 0); }
      100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); }
    }
  `;
  document.head.appendChild(style);
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.close-btn').addEventListener('click', closeMapModal);
  document.getElementById('mapSearchButton').addEventListener('click', openMapModal);
  
  // Закрытие модального окна при клике вне его
  document.getElementById('mapModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('mapModal')) {
      closeMapModal();
    }
  });
});