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
  if (isLoadingData) {
    console.log('fetchData already in progress, skipping');
    return;
  }
  
  window.dataCb = resp => {
    tenantData = resp.data || [];
    initCleanData();
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: tenantData,
      lastModified: lastModified.toISOString()
    }));
    
    console.log('Saved to cache:', {
      dataLength: tenantData.length,
      lastModified: lastModified.toISOString()
    });
    
    cleanup('dataCb');
    loader.parentElement.classList.remove('active');
    isLoadingData = false;
    
    searchHint.textContent = 'Данные обновлены';
    searchHint.style.color = 'var(--success)';
    setTimeout(() => {
      updateSearchHint();
      searchHint.style.color = 'var(--text-secondary)';
    }, 3000);
    
    if (textInput.value) filterAndRender(textInput.value);
  };
  
  const s = document.createElement('script');
  s.src = `${SCRIPT_URL}?callback=dataCb`;
  s.onerror = () => {
    console.error('Failed to fetch data');
    loader.parentElement.classList.remove('active');
    isLoadingData = false;
    searchHint.innerHTML = `
      <div class="error-message" style="color: var(--error); display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-exclamation-triangle"></i>
        Не удалось загрузить данные. <a href="#" style="color: var(--primary);" onclick="loadData()">Попробовать снова</a>
      </div>`;
  };
  document.body.appendChild(s);
}

// Initialize clean data for searching
function initCleanData() {
  cleanTenantData = tenantData.map(row => 
    row.map(cell => cell ? cleanString(cell) : '')
  );
}

// Clean string for searching
function cleanString(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Clean input text
function cleanInputText(text) {
  return text.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
}