// scripts/mapModule.js
let map;
let marker;

function initMap() {
  // Инициализация карты
  map = L.map('map').setView([53.3498, -6.2603], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Обработчик клика
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    
    // Обновление маркера
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    
    // Поиск
    const results = await searchNearbyEircodes(lat, lng);
    displayGeoResults(results);
  });
}

async function searchNearbyEircodes(lat, lng) {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=geo&lat=${lat}&lng=${lng}`);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Geo search error:', error);
    return [];
  }
}

function displayGeoResults(results) {
  const resultsContainer = document.getElementById('geoResults');
  resultsContainer.innerHTML = '';
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<li>No Eircodes found within 250m</li>';
    return;
  }
  
  results.forEach(result => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="geo-result-code">${result.eircode}</span>
      <span class="geo-result-address">${result.address}</span>
      <span class="geo-result-distance">${result.distance} km</span>
    `;
    
    li.addEventListener('click', () => {
      document.getElementById('textInput').value = result.eircode;
      setSearchMode('address');
      filterAndRender(result.eircode);
      closeMapModal();
    });
    
    resultsContainer.appendChild(li);
  });
}

// Управление модальным окном
function openMapModal() {
  const modal = document.getElementById('mapModal');
  modal.style.display = 'flex';
  
  // Инициализация карты при первом открытии
  if (!map) {
    setTimeout(() => {
      initMap();
      map.invalidateSize(); // Важно для корректного отображения
    }, 100);
  }
}

function closeMapModal() {
  document.getElementById('mapModal').style.display = 'none';
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.close-btn').addEventListener('click', closeMapModal);
  document.getElementById('mapSearchButton').addEventListener('click', openMapModal);
});