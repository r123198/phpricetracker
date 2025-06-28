/**
 * Utility functions for normalizing and cleaning price data
 */

/**
 * Normalize commodity names to standard format
 * @param {string} name - Raw commodity name
 * @returns {string} - Normalized commodity name
 */
const normalizeCommodityName = (name) => {
  if (!name) return '';
  
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
    .join(' ');
};

/**
 * Extract and normalize price from text
 * @param {string} text - Text containing price information
 * @returns {number|null} - Normalized price or null if not found
 */
const extractPrice = (text) => {
  if (!text) return null;
  
  // Match various price formats: ₱120.50, P120.50, 120.50, 120,50
  const priceRegex = /[₱P]?\s*([\d,]+\.?\d*)/g;
  const matches = [...text.matchAll(priceRegex)];
  
  if (matches.length === 0) return null;
  
  // Take the first match and clean it
  const priceStr = matches[0][1].replace(/,/g, '');
  const price = parseFloat(priceStr);
  
  return isNaN(price) ? null : price;
};

/**
 * Extract and normalize unit from text
 * @param {string} text - Text containing unit information
 * @returns {string} - Normalized unit
 */
const extractUnit = (text) => {
  if (!text) return 'per unit';
  
  const unitMap = {
    'per kg': ['per kg', 'per kilogram', 'kg', 'kilogram', 'kilo'],
    'per liter': ['per liter', 'per l', 'liter', 'litro', 'l'],
    'per piece': ['per piece', 'per pc', 'piece', 'pc', 'pcs'],
    'per dozen': ['per dozen', 'per dz', 'dozen', 'dz'],
    'per sack': ['per sack', 'sack', 'sacks'],
    'per bundle': ['per bundle', 'bundle', 'bundles']
  };
  
  const lowerText = text.toLowerCase().trim();
  
  // Check for exact matches first (more specific patterns)
  for (const [standardUnit, variations] of Object.entries(unitMap)) {
    if (variations.some(variant => {
      // Use word boundaries for single letter matches to avoid false positives
      if (variant === 'l') {
        return lowerText === 'l' || lowerText === 'per l';
      }
      return lowerText.includes(variant);
    })) {
      return standardUnit;
    }
  }
  
  return 'per unit';
};

/**
 * Normalize region names to standard format
 * @param {string} region - Raw region name
 * @returns {string} - Normalized region name
 */
const normalizeRegion = (region) => {
  if (!region) return '';
  
  const regionMap = {
    'ncr': 'NCR',
    'national capital region': 'NCR',
    'metro manila': 'NCR',
    'region vii': 'Region VII',
    'region 7': 'Region VII',
    'central visayas': 'Region VII',
    'region iv-a': 'Region IV-A',
    'region 4a': 'Region IV-A',
    'calabarzon': 'Region IV-A',
    'region iii': 'Region III',
    'region 3': 'Region III',
    'central luzon': 'Region III',
    'region vi': 'Region VI',
    'region 6': 'Region VI',
    'western visayas': 'Region VI',
    'region v': 'Region V',
    'region 5': 'Region V',
    'bicol region': 'Region V',
    'region viii': 'Region VIII',
    'region 8': 'Region VIII',
    'eastern visayas': 'Region VIII',
    'region ix': 'Region IX',
    'region 9': 'Region IX',
    'zamboanga peninsula': 'Region IX',
    'region x': 'Region X',
    'region 10': 'Region X',
    'northern mindanao': 'Region X',
    'region xi': 'Region XI',
    'region 11': 'Region XI',
    'davao region': 'Region XI',
    'region xii': 'Region XII',
    'region 12': 'Region XII',
    'soccsksargen': 'Region XII',
    'region xiii': 'Region XIII',
    'region 13': 'Region XIII',
    'caraga': 'Region XIII',
    'car': 'CAR',
    'cordillera administrative region': 'CAR',
    'barmm': 'BARMM',
    'bangsamoro autonomous region': 'BARMM'
  };
  
  const normalized = region.trim().toLowerCase();
  return regionMap[normalized] || region.trim();
};

/**
 * Normalize source names to standard format
 * @param {string} source - Raw source name
 * @returns {string} - Normalized source name
 */
const normalizeSource = (source) => {
  if (!source) return 'Unknown';
  
  const sourceMap = {
    'dti': 'DTI',
    'department of trade and industry': 'DTI',
    'da': 'DA',
    'department of agriculture': 'DA',
    'doe': 'DOE',
    'department of energy': 'DOE',
    'local market': 'Local Market',
    'market': 'Local Market',
    'wholesale': 'Wholesale Market',
    'retail': 'Retail Market'
  };
  
  const normalized = source.trim().toLowerCase();
  return sourceMap[normalized] || source.trim();
};

/**
 * Validate and clean price data object
 * @param {Object} priceData - Raw price data
 * @returns {Object|null} - Cleaned price data or null if invalid
 */
const validatePriceData = (priceData) => {
  if (!priceData || typeof priceData !== 'object') {
    return null;
  }
  
  const { commodity, price, region, unit, source, date } = priceData;
  
  // Validate required fields
  if (!commodity || !price || !region) {
    return null;
  }
  
  // Validate price is a positive number
  const normalizedPrice = extractPrice(price.toString());
  if (!normalizedPrice || normalizedPrice <= 0) {
    return null;
  }
  
  // Validate date
  const normalizedDate = new Date(date);
  if (isNaN(normalizedDate.getTime())) {
    return null;
  }
  
  return {
    commodity: normalizeCommodityName(commodity),
    price: normalizedPrice,
    region: normalizeRegion(region),
    unit: extractUnit(unit || ''),
    source: normalizeSource(source || ''),
    date: normalizedDate
  };
};

/**
 * Clean and normalize text input
 * @param {string} text - Raw text input
 * @returns {string} - Cleaned text
 */
const cleanText = (text) => {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
    .replace(/[^\w\s\-.,₱P]/g, '') // Keep only alphanumeric, spaces, hyphens, commas, dots, and peso symbols
    .trim();
};

module.exports = {
  normalizeCommodityName,
  extractPrice,
  extractUnit,
  normalizeRegion,
  normalizeSource,
  validatePriceData,
  cleanText
}; 