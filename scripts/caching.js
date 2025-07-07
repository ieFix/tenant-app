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