// scripts/mapModule.js
let map;
let clickMarker;
let resultMarkers = [];
let resultLayerGroup;

function initMap() {
  // Инициализация карты
  map = L.map('map').setView([53.3498, -6.2603], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  
  // Группа для маркеров результатов
  resultLayerGroup = L.layerGroup().addTo(map);

  // Обработчик клика
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    
    // Обновление маркера клика
    if (clickMarker) map.removeLayer(clickMarker);
    clickMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'click-marker',
        html: '<div class="marker-pulse"></div><div class="marker-center"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(map);
    
    // Показать загрузку
    showLoadingState();
    
    // Поиск
    try {
      const results = await searchNearbyEircodes(lat, lng);
      displayGeoResults(results);
      addResultMarkers(results, lat, lng);
    } catch (error) {
      showErrorState();
    }
  });
}

function showLoadingState() {
  const geoResults = document.getElementById('geoResults');
  const container = document.getElementById('geoResultsContainer');
  
  geoResults.classList.remove('visible');
  container.querySelector('.initial-state').innerHTML = `
    <i class="fas fa-spinner fa-spin"></i>
    <p>Searching for nearby tenants...</p>
  `;
}

function showErrorState() {
  const container = document.getElementById('geoResultsContainer');
  container.querySelector('.initial-state').innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <p>Failed to load results. Please try again.</p>
  `;
}

async function searchNearbyEircodes(lat, lng) {
  try {
    const url = `${SCRIPT_URL}?action=geo&lat=${lat}&lng=${lng}&callback=cb`;
    const response = await fetch(url);
    const text = await response.text();

    const match = text.match(/^cb\((.*)\);?$/s);
    if (!match) {
      throw new Error('Не удалось разобрать JSONP-ответ:\n' + text.slice(0, 300));
    }

    const data = JSON.parse(match[1]);
    return data.results || [];
  } catch (error) {
    console.error('Geo search error:', error);
    return [];
  }
}


function displayGeoResults(results) {
  const geoResults = document.getElementById('geoResults');
  const container = document.getElementById('geoResultsContainer');
  const resultsCount = document.getElementById('resultsCount');
  const initialState = container.querySelector('.initial-state');
  
  // Обновить счетчик
  resultsCount.textContent = `${results.length} ${results.length === 1 ? 'location' : 'locations'}`;
  
  // Очистить предыдущие результаты
  geoResults.innerHTML = '';
  
  if (results.length === 0) {
    initialState.innerHTML = `
      <i class="fas fa-map-marker-alt"></i>
      <p>No tenants found within 250m. Try another location.</p>
    `;
    geoResults.classList.remove('visible');
    return;
  }
  
  // Скрыть начальное состояние и показать результаты
  initialState.style.display = 'none';
  geoResults.classList.add('visible');
  
  // Добавить результаты
  results.forEach(result => {
    const li = document.createElement('li');
    li.className = 'geo-result-item';
    li.innerHTML = `
      <span class="geo-result-code">${result.eircode}</span>
      <span class="geo-result-address">${result.address}</span>
      <span class="geo-result-distance">${result.distance} km away</span>
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

function addResultMarkers(results, centerLat, centerLng) {
  // Очистить предыдущие маркеры
  resultLayerGroup.clearLayers();
  
  // Добавить маркер для центральной точки
  resultLayerGroup.addLayer(L.circleMarker([centerLat, centerLng], {
    color: '#4285F4',
    fillColor: '#4285F4',
    fillOpacity: 0.2,
    radius: 10
  }));
  
  // Добавить маркеры для результатов
  results.forEach(result => {
    const marker = L.marker([result.lat, result.lng], {
      icon: L.divIcon({
        className: 'result-marker',
        html: '<div class="marker-pin"></div><div class="marker-label">📍</div>',
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      })
    });
    
    // Всплывающая подсказка
    marker.bindPopup(`
      <div class="map-popup">
        <strong>${result.eircode}</strong><br>
        ${result.address}<br>
        <small>${result.distance} km</small>
      </div>
    `);
    
    resultLayerGroup.addLayer(marker);
  });
  
  // Автомасштабирование, чтобы показать все маркеры
  if (results.length > 0) {
    const bounds = resultLayerGroup.getBounds();
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Управление модальным окном
function openMapModal() {
  const modal = document.getElementById('mapModal');
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  // Сбросить состояние
  const container = document.getElementById('geoResultsContainer');
  const initialState = container.querySelector('.initial-state');
  const geoResults = document.getElementById('geoResults');
  const resultsCount = document.getElementById('resultsCount');
  
  resultsCount.textContent = '0 locations';
  geoResults.innerHTML = '';
  geoResults.classList.remove('visible');
  initialState.style.display = 'flex';
  initialState.innerHTML = `
    <i class="fas fa-map-marker-alt"></i>
    <p>Tap on the map to find nearby tenants</p>
  `;
  
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
  }
}

function closeMapModal() {
  document.getElementById('mapModal').style.display = 'none';
  document.body.style.overflow = '';
}

// Добавить кастомные стили маркеров
function addCustomMarkerStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .click-marker {
      position: relative;
    }
    
    .marker-pulse {
      position: absolute;
      width: 30px;
      height: 30px;
      background: #4285F4;
      border-radius: 50%;
      opacity: 0.7;
      animation: pulse 1.5s infinite;
      transform: translate(-50%, -50%);
    }
    
    .marker-center {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #fff;
      border: 2px solid #4285F4;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
    }
    
    .result-marker .marker-pin {
      position: absolute;
      width: 30px;
      height: 42px;
      background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 42"><path fill="%234285F4" d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27c0-8.3-6.7-15-15-15z"/></svg>');
      transform: translate(-50%, -100%);
    }
    
    .result-marker .marker-label {
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
    }
    
    .map-popup {
      min-width: 200px;
      font-size: 14px;
    }
    
    @keyframes pulse {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
      70% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
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