// scripts/mapModule.js
let map;
let clickMarker;
let resultLayerGroup = null;

// Ваши кастомные координаты
const DEFAULT_LAT = 53.943675;
const DEFAULT_LNG = -8.950022;
const DEFAULT_ZOOM = 13;

function initMap() {
  // Инициализация карты с вашими координатами
  map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  
  // Создаем новую группу слоев
  resultLayerGroup = L.layerGroup();
  resultLayerGroup.addTo(map);
  
  // Добавляем слой для начального состояния
  const mapContainer = document.getElementById('map');
  const initialState = document.createElement('div');
  initialState.className = 'map-initial-state';
  initialState.innerHTML = `
    <i class="fas fa-map-marker-alt"></i>
    <p>Tap anywhere on the map to find tenants within 250m</p>
  `;
  mapContainer.appendChild(initialState);

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
      
      // Обновляем маркеры и список
      updateMarkersAndList(results);
    } catch (error) {
      console.error('Search error:', error);
      showErrorState();
    } finally {
      showMapPreloader(false);
    }
  });
}

function showMapPreloader(show) {
  let preloader = document.querySelector('.map-preloader');
  
  if (!preloader) {
    preloader = document.createElement('div');
    preloader.className = 'map-preloader';
    preloader.innerHTML = '<div class="loader"></div>';
    document.querySelector('.modal-body').appendChild(preloader);
  }
  
  if (show) {
    preloader.classList.add('active');
  } else {
    preloader.classList.remove('active');
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

    return JSON.parse(match[1]).results || [];
  } catch (error) {
    console.error('Geo search error:', error);
    throw error;
  }
}

function updateMarkersAndList(results) {
  // Очищаем предыдущие маркеры
  if (resultLayerGroup) {
    resultLayerGroup.clearLayers();
  } else {
    // Если группа слоев не создана, создаем новую
    resultLayerGroup = L.layerGroup().addTo(map);
  }
  
  // Создаем границы для масштабирования
  let bounds = L.latLngBounds();
  
  // Добавляем новые маркеры с всплывающими подсказками
  results.forEach(result => {
    const latLng = L.latLng(result.lat, result.lng);
    bounds.extend(latLng);
    
    const marker = L.marker(latLng, {
      icon: L.divIcon({
        className: 'eircode-marker',
        html: `<div>${result.eircode}</div>`,
        iconSize: [100, 40],
        iconAnchor: [50, 40]
      })
    }).bindPopup(`
      <div class="map-popup">
        <strong>${result.eircode}</strong><br>
        ${result.address}<br>
        <small>${result.distance} km away</small>
      </div>
    `);
    
    resultLayerGroup.addLayer(marker);
  });
  
  // Обновляем список результатов
  displayGeoResults(results);
  
  // Автомасштабирование только если есть результаты
  if (results.length > 0 && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50] });
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
    // Добавить результаты
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
    document.getElementById('resultsCount').textContent = '0 locations';
  }
  
  // Показать начальное состояние
  const initialState = document.querySelector('.map-initial-state');
  if (initialState) initialState.classList.remove('hidden');

  // Инициализация карты при первом открытии
  if (!map) {
    initMap();
    addCustomMarkerStyles();
    
    // Даем время на инициализацию карты
    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  } else {
    // Сбросить вид карты на ваши координаты
    map.setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
    
    // Очистить маркеры
    if (resultLayerGroup) {
      resultLayerGroup.clearLayers();
    }
    
    if (clickMarker) map.removeLayer(clickMarker);
    clickMarker = null;
    
    // Гарантируем правильное отображение
    setTimeout(() => {
      map.invalidateSize();
      map.setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
    }, 50);
    
    // Показать начальное состояние
    if (initialState) initialState.classList.remove('hidden');
  }
}

function closeMapModal() {
  document.getElementById('mapModal').style.display = 'none';
  document.body.style.overflow = '';
}

function addCustomMarkerStyles() {
  // Проверяем, не добавлены ли стили уже
  if (document.getElementById('leaflet-custom-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'leaflet-custom-styles';
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
    
    .map-popup {
      min-width: 200px;
      font-size: 14px;
      padding: 8px;
      z-index: 2001; /* Поверх модального окна */
    }
    
    .leaflet-popup-content-wrapper {
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    }
  `;
  document.head.appendChild(style);
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  // Закрытие модального окна
  document.querySelector('.close-btn').addEventListener('click', closeMapModal);
  
  // Открытие модального окна карты
  document.getElementById('mapSearchButton').addEventListener('click', openMapModal);
  
  // Закрытие модального окна при клике вне его
  document.getElementById('mapModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('mapModal')) {
      closeMapModal();
    }
  });
});