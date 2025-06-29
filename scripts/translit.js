// Transliterate Cyrillic to Latin
function transliterate(text) {
  const numbersMap = {
    'один': '1', 'два': '2', 'три': '3', 'чотири': '4', 
    'п\'ять': '5', 'шість': '6', 'сім': '7', 'вісім': '8', 
    'дев\'ять': '9', 'десять': '10', 'четыре': '4', 
    'пять': '5', 'шесть': '6', 'семь': '7', 'восемь': '8', 'девять': '9',
    'перший': '1', 'другий': '2', 'третій': '3',
    'первый': '1', 'второй': '2', 'третий': '3'
  };
  
  let result = text.toLowerCase();
  Object.entries(numbersMap).forEach(([word, digit]) => {
    const regex = new RegExp('\\b' + word + '\\b', 'g');
    result = result.replace(regex, digit);
  });
  
  const charMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
    'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y',
    'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
    'щ': 'shch', 'ю': 'yu', 'я': 'ya', 'ы': 'y', 'э': 'e',
    'ь': '', '\'': '', '`': '', '’': '', 'ъ': ''
  };

  return result.split('').map(char => charMap[char] || char).join('');
}