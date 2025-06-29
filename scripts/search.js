// Check match in general mode
function checkGeneralMatch(row, cleanRow, query) {
  return (
    cleanRow[1].includes(query) || // FullName
    cleanRow[2].includes(query) || // PPSN
    cleanRow[3].includes(query) || // Country
    cleanRow[4].includes(query) || // City
    cleanRow[5].includes(query) || // Address
    cleanRow[6].includes(query) || // Eircode
    cleanRow[7].includes(query) || // Phone
    cleanRow[8].includes(query) || // ElectricityAccount
    (row[10] && checkSynonyms(row[10], query)) // Synonyms
  );
}

// Check match in name mode
function checkNameMatch(row, cleanRow, query) {
  return (
    cleanRow[1].includes(query) || 
    (row[10] && checkSynonyms(row[10], query))
  );
}

// Check match in address mode
function checkAddressMatch(row, cleanRow, query) {
  return (
    cleanRow[5].includes(query) || 
    cleanRow[6].includes(query)
  );
}

// Check synonyms (case-insensitive)
function checkSynonyms(synonyms, query) {
  if (!synonyms) return false;
  
  const synonymList = synonyms.toString().split(',');
  
  return synonymList.some(syn => {
    const cleanSyn = cleanString(syn);
    return cleanSyn.includes(query) || query.includes(cleanSyn);
  });
}