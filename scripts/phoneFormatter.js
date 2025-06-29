// Format phone numbers correctly
function formatPhone(phone) {
  if (!phone || phone === 'Unknown') return 'Unknown';
  
  // Remove all non-digit characters
  const digits = phone.toString().replace(/\D/g, '');
  
  // Format Irish international numbers: +353 XX XXX XXXX
  if (digits.startsWith('353') && digits.length === 11) {
    const prefix = digits.substring(3, 5);
    const rest = digits.substring(5);
    return `+353 ${prefix} ${rest.substring(0, 3)} ${rest.substring(3)}`;
  }
  
  // Format Ukrainian international numbers: +380 XX XXX XXXX
  if (digits.startsWith('380') && digits.length === 12) {
    const prefix = digits.substring(3, 5);
    const rest = digits.substring(5);
    return `+380 ${prefix} ${rest.substring(0, 3)} ${rest.substring(3)}`;
  }
  
  // Format Irish national numbers: 083 XXX XXXX
  if (digits.length === 9 && (digits.startsWith('08') || digits.startsWith('83'))) {
    // Handle numbers with or without leading zero
    const cleanDigits = digits.startsWith('0') ? digits : `0${digits}`;
    return `${cleanDigits.substring(0, 3)} ${cleanDigits.substring(3, 6)} ${cleanDigits.substring(6)}`;
  }
  
  // Default formatting for other numbers
  return phone;
}