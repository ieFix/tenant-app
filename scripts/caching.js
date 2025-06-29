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
    initCleanData();
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: tenantData,
      lastModified: lastModified
    }));
    
    cleanup('dataCb');
    loader.style.display = 'none';
    
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