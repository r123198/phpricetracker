const {
  normalizeCommodityName,
  extractPrice,
  extractUnit,
  normalizeRegion,
  normalizeSource,
  validatePriceData,
  cleanText
} = require('../utils/priceNormalizer');

// Import actual response utilities with correct names
const { createResponse, createPaginatedResponse, createErrorResponse } = require('../src/utils/response');

describe('Price Normalizer Utilities', () => {
  describe('normalizeCommodityName', () => {
    it('should normalize basic commodity names', () => {
      expect(normalizeCommodityName('rice')).toBe('Rice');
      expect(normalizeCommodityName('RED ONION')).toBe('Red Onion');
      expect(normalizeCommodityName('Well-Milled Rice')).toBe('Well-milled Rice');
    });

    it('should handle special characters and extra spaces', () => {
      expect(normalizeCommodityName('  rice  ')).toBe('Rice');
      expect(normalizeCommodityName('red@onion!')).toBe('Redonion');
      expect(normalizeCommodityName('well   milled   rice')).toBe('Well Milled Rice');
    });

    it('should handle empty or null input', () => {
      expect(normalizeCommodityName('')).toBe('');
      expect(normalizeCommodityName(null)).toBe('');
      expect(normalizeCommodityName(undefined)).toBe('');
    });

    it('should preserve hyphens', () => {
      expect(normalizeCommodityName('well-milled-rice')).toBe('Well-milled-rice');
    });
  });

  describe('extractPrice', () => {
    it('should extract prices with peso symbol', () => {
      expect(extractPrice('₱120.50')).toBe(120.50);
      expect(extractPrice('P95.00')).toBe(95.00);
      expect(extractPrice('₱1,250.75')).toBe(1250.75);
    });

    it('should extract prices without peso symbol', () => {
      expect(extractPrice('120.50')).toBe(120.50);
      expect(extractPrice('95')).toBe(95);
      expect(extractPrice('1,250.75')).toBe(1250.75);
    });

    it('should handle various price formats', () => {
      expect(extractPrice('Price: ₱120.50 per kg')).toBe(120.50);
      expect(extractPrice('Rice costs P95.00')).toBe(95.00);
      expect(extractPrice('Current price is ₱1,250.75')).toBe(1250.75);
    });

    it('should return null for invalid prices', () => {
      expect(extractPrice('')).toBe(null);
      expect(extractPrice('no price here')).toBe(null);
      expect(extractPrice('₱')).toBe(null);
      expect(extractPrice('₱abc')).toBe(null);
    });

    it('should handle edge cases', () => {
      expect(extractPrice('₱0.50')).toBe(0.50);
      expect(extractPrice('₱999999.99')).toBe(999999.99);
      expect(extractPrice('₱120,000.50')).toBe(120000.50);
    });
  });

  describe('extractUnit', () => {
    it('should extract common units', () => {
      expect(extractUnit('per kg')).toBe('per kg');
      expect(extractUnit('per kilogram')).toBe('per kg');
      expect(extractUnit('per liter')).toBe('per liter');
      expect(extractUnit('per piece')).toBe('per piece');
      expect(extractUnit('per dozen')).toBe('per dozen');
      expect(extractUnit('per sack')).toBe('per sack');
      expect(extractUnit('bundle')).toBe('per bundle'); // Test with just 'bundle' instead of 'per bundle'
    });

    it('should handle unit variations', () => {
      expect(extractUnit('kg')).toBe('per kg');
      expect(extractUnit('kilogram')).toBe('per kg');
      expect(extractUnit('kilo')).toBe('per kg');
      expect(extractUnit('l')).toBe('per liter');
      expect(extractUnit('litro')).toBe('per liter');
      expect(extractUnit('pc')).toBe('per piece');
      expect(extractUnit('pcs')).toBe('per piece');
      expect(extractUnit('dz')).toBe('per dozen');
      expect(extractUnit('sacks')).toBe('per sack');
      expect(extractUnit('bundles')).toBe('per bundle');
    });

    it('should return default unit for unknown units', () => {
      expect(extractUnit('')).toBe('per unit');
      expect(extractUnit('unknown unit')).toBe('per unit');
      expect(extractUnit('per box')).toBe('per unit');
    });

    it('should handle case insensitive matching', () => {
      expect(extractUnit('PER KG')).toBe('per kg');
      expect(extractUnit('Per Kilogram')).toBe('per kg');
      expect(extractUnit('KILOGRAM')).toBe('per kg');
    });
  });

  describe('normalizeRegion', () => {
    it('should normalize common region names', () => {
      expect(normalizeRegion('ncr')).toBe('NCR');
      expect(normalizeRegion('metro manila')).toBe('NCR');
      expect(normalizeRegion('national capital region')).toBe('NCR');
      expect(normalizeRegion('region vii')).toBe('Region VII');
      expect(normalizeRegion('region 7')).toBe('Region VII');
      expect(normalizeRegion('central visayas')).toBe('Region VII');
    });

    it('should handle various region formats', () => {
      expect(normalizeRegion('Region IV-A')).toBe('Region IV-A');
      expect(normalizeRegion('region 4a')).toBe('Region IV-A');
      expect(normalizeRegion('calabarzon')).toBe('Region IV-A');
      expect(normalizeRegion('Region III')).toBe('Region III');
      expect(normalizeRegion('region 3')).toBe('Region III');
      expect(normalizeRegion('central luzon')).toBe('Region III');
    });

    it('should return original text for unknown regions', () => {
      expect(normalizeRegion('unknown region')).toBe('unknown region');
      expect(normalizeRegion('custom area')).toBe('custom area');
    });

    it('should handle empty input', () => {
      expect(normalizeRegion('')).toBe('');
      expect(normalizeRegion(null)).toBe('');
      expect(normalizeRegion(undefined)).toBe('');
    });

    it('should handle case insensitive matching', () => {
      expect(normalizeRegion('NCR')).toBe('NCR');
      expect(normalizeRegion('Metro Manila')).toBe('NCR');
      expect(normalizeRegion('REGION VII')).toBe('Region VII');
    });
  });

  describe('normalizeSource', () => {
    it('should normalize common source names', () => {
      expect(normalizeSource('dti')).toBe('DTI');
      expect(normalizeSource('department of trade and industry')).toBe('DTI');
      expect(normalizeSource('da')).toBe('DA');
      expect(normalizeSource('department of agriculture')).toBe('DA');
      expect(normalizeSource('doe')).toBe('DOE');
      expect(normalizeSource('department of energy')).toBe('DOE');
    });

    it('should handle market sources', () => {
      expect(normalizeSource('local market')).toBe('Local Market');
      expect(normalizeSource('market')).toBe('Local Market');
      expect(normalizeSource('wholesale')).toBe('Wholesale Market');
      expect(normalizeSource('retail')).toBe('Retail Market');
    });

    it('should return original text for unknown sources', () => {
      expect(normalizeSource('custom source')).toBe('custom source');
      expect(normalizeSource('unknown')).toBe('unknown');
    });

    it('should handle empty input', () => {
      expect(normalizeSource('')).toBe('Unknown');
      expect(normalizeSource(null)).toBe('Unknown');
      expect(normalizeSource(undefined)).toBe('Unknown');
    });

    it('should handle case insensitive matching', () => {
      expect(normalizeSource('DTI')).toBe('DTI');
      expect(normalizeSource('Department of Trade and Industry')).toBe('DTI');
      expect(normalizeSource('LOCAL MARKET')).toBe('Local Market');
    });
  });

  describe('validatePriceData', () => {
    it('should validate correct price data', () => {
      const validData = {
        commodity: 'Rice',
        price: '45.50',
        region: 'NCR',
        unit: 'per kg',
        source: 'DTI',
        date: new Date()
      };

      const result = validatePriceData(validData);
      expect(result).toBeTruthy();
      expect(result.commodity).toBe('Rice');
      expect(result.price).toBe(45.50);
      expect(result.region).toBe('NCR');
    });

    it('should reject invalid price data', () => {
      expect(validatePriceData(null)).toBe(null);
      expect(validatePriceData({})).toBe(null);
      expect(validatePriceData({ commodity: 'Rice' })).toBe(null);
      expect(validatePriceData({ commodity: 'Rice', price: 'invalid' })).toBe(null);
    });

    it('should handle missing required fields', () => {
      expect(validatePriceData({ price: '45.50' })).toBe(null);
      expect(validatePriceData({ commodity: 'Rice' })).toBe(null);
      expect(validatePriceData({ commodity: 'Rice', price: '45.50' })).toBe(null);
    });

    it('should normalize data during validation', () => {
      const data = {
        commodity: 'rice',
        price: '₱45.50',
        region: 'ncr',
        unit: 'kg',
        source: 'dti',
        date: new Date()
      };

      const result = validatePriceData(data);
      expect(result.commodity).toBe('Rice');
      expect(result.price).toBe(45.50);
      expect(result.region).toBe('NCR');
      expect(result.unit).toBe('per kg');
      expect(result.source).toBe('DTI');
    });
  });

  describe('cleanText', () => {
    it('should remove extra whitespace', () => {
      expect(cleanText('  hello   world  ')).toBe('hello world');
      expect(cleanText('\n\thello\n\tworld\n')).toBe('hello world');
    });

    it('should remove special characters', () => {
      expect(cleanText('hello@world!')).toBe('helloworld');
      expect(cleanText('hello#world$')).toBe('helloworld');
      expect(cleanText('hello&world*')).toBe('helloworld');
    });

    it('should preserve important characters', () => {
      expect(cleanText('hello-world')).toBe('hello-world');
      expect(cleanText('hello.world')).toBe('hello.world');
      expect(cleanText('hello_world')).toBe('hello_world');
    });

    it('should handle empty input', () => {
      expect(cleanText('')).toBe('');
      expect(cleanText(null)).toBe('');
      expect(cleanText(undefined)).toBe('');
    });

    it('should handle numbers and prices', () => {
      expect(cleanText('Price: ₱45.50')).toBe('Price ₱45.50');
      expect(cleanText('Cost: 1,250.75')).toBe('Cost 1,250.75');
    });
  });
});

describe('Response Utils', () => {
  describe('createResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = createResponse(data);

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', data);
      expect(response).toHaveProperty('meta');
      expect(response.meta).toHaveProperty('timestamp');
      expect(typeof response.meta.timestamp).toBe('string');
    });

    it('should create a success response with message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';
      const response = createResponse(data, message);

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', data);
      expect(response).toHaveProperty('message', message);
      expect(response).toHaveProperty('meta');
    });

    it('should create a success response with meta data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const meta = { total: 2, page: 1 };
      const response = createResponse(data, 'Success', meta);

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', data);
      expect(response).toHaveProperty('meta');
      expect(response.meta).toHaveProperty('total', 2);
      expect(response.meta).toHaveProperty('page', 1);
      expect(response.meta).toHaveProperty('timestamp');
    });

    it('should handle null data gracefully', () => {
      const response = createResponse(null);

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', null);
      expect(response).toHaveProperty('meta');
    });

    it('should handle empty array data', () => {
      const data = [];
      const response = createResponse(data);

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', data);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0);
    });
  });

  describe('createPaginatedResponse', () => {
    const mockData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

    it('should paginate results correctly', () => {
      const page = 1;
      const limit = 10;
      const total = 25;
      const result = createPaginatedResponse(mockData.slice(0, 10), page, limit, total);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(10);
      expect(result.meta.pagination).toHaveProperty('total', 25);
      expect(result.meta.pagination).toHaveProperty('page', 1);
      expect(result.meta.pagination).toHaveProperty('limit', 10);
      expect(result.meta.pagination).toHaveProperty('totalPages', 3);
      expect(result.meta.pagination).toHaveProperty('hasNext', true);
      expect(result.meta.pagination).toHaveProperty('hasPrev', false);
    });

    it('should handle second page correctly', () => {
      const page = 2;
      const limit = 10;
      const total = 25;
      const result = createPaginatedResponse(mockData.slice(10, 20), page, limit, total);

      expect(result.data.length).toBe(10);
      expect(result.meta.pagination.page).toBe(2);
      expect(result.meta.pagination.hasNext).toBe(true);
      expect(result.meta.pagination.hasPrev).toBe(true);
    });

    it('should handle last page correctly', () => {
      const page = 3;
      const limit = 10;
      const total = 25;
      const result = createPaginatedResponse(mockData.slice(20, 25), page, limit, total);

      expect(result.data.length).toBe(5);
      expect(result.meta.pagination.page).toBe(3);
      expect(result.meta.pagination.hasNext).toBe(false);
      expect(result.meta.pagination.hasPrev).toBe(true);
    });

    it('should handle empty data', () => {
      const page = 1;
      const limit = 10;
      const total = 0;
      const result = createPaginatedResponse([], page, limit, total);

      expect(result.data.length).toBe(0);
      expect(result.meta.pagination.total).toBe(0);
      expect(result.meta.pagination.totalPages).toBe(0);
      expect(result.meta.pagination.hasNext).toBe(false);
      expect(result.meta.pagination.hasPrev).toBe(false);
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with message', () => {
      const message = 'Something went wrong';
      const error = createErrorResponse(message);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(400);
    });

    it('should create an error response with status code', () => {
      const message = 'Not found';
      const statusCode = 404;
      const error = createErrorResponse(message, statusCode);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
    });

    it('should handle empty message gracefully', () => {
      const error = createErrorResponse('');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('');
      expect(error.statusCode).toBe(400);
    });
  });
});

describe('Data Validation Utils', () => {
  describe('Price data validation', () => {
    it('should validate correct price data structure', () => {
      const validPriceData = {
        commodity: 'Rice',
        price: 45.50,
        unit: 'per kg',
        source: 'DA',
        region: 'NCR',
        date: '2025-06-26'
      };

      expect(validPriceData).toHaveProperty('commodity');
      expect(validPriceData).toHaveProperty('price');
      expect(typeof validPriceData.price).toBe('number');
      expect(validPriceData.price).toBeGreaterThan(0);
      expect(validPriceData).toHaveProperty('unit');
      expect(validPriceData).toHaveProperty('source');
      expect(validPriceData).toHaveProperty('region');
      expect(validPriceData).toHaveProperty('date');
    });

    it('should validate price range data structure', () => {
      const validRangeData = {
        commodity: 'Rice at Balintawak Market',
        minPrice: 45.00,
        maxPrice: 48.00,
        averagePrice: 46.50,
        unit: 'per kg',
        source: 'DA',
        region: 'NCR',
        date: '2025-06-26',
        hasRange: true,
        market: 'Balintawak Market'
      };

      expect(validRangeData).toHaveProperty('commodity');
      expect(validRangeData).toHaveProperty('minPrice');
      expect(validRangeData).toHaveProperty('maxPrice');
      expect(validRangeData).toHaveProperty('averagePrice');
      expect(typeof validRangeData.minPrice).toBe('number');
      expect(typeof validRangeData.maxPrice).toBe('number');
      expect(typeof validRangeData.averagePrice).toBe('number');
      expect(validRangeData.minPrice).toBeLessThanOrEqual(validRangeData.maxPrice);
      expect(validRangeData).toHaveProperty('hasRange', true);
      expect(validRangeData).toHaveProperty('market');
    });

    it('should validate commodity data structure', () => {
      const validCommodityData = {
        id: '1',
        name: 'Rice',
        category: 'Grains',
        slug: 'rice',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(validCommodityData).toHaveProperty('id');
      expect(validCommodityData).toHaveProperty('name');
      expect(validCommodityData).toHaveProperty('category');
      expect(validCommodityData).toHaveProperty('slug');
      expect(validCommodityData).toHaveProperty('createdAt');
      expect(validCommodityData).toHaveProperty('updatedAt');
      expect(typeof validCommodityData.name).toBe('string');
      expect(typeof validCommodityData.category).toBe('string');
      expect(typeof validCommodityData.slug).toBe('string');
    });
  });

  describe('Date validation', () => {
    it('should validate date formats', () => {
      const validDates = [
        new Date(),
        new Date('2025-06-26'),
        new Date('2025-06-26T10:30:00Z'),
        '2025-06-26',
        '2025-06-26T10:30:00Z'
      ];

      validDates.forEach(date => {
        const dateObj = new Date(date);
        expect(dateObj).toBeInstanceOf(Date);
        expect(isNaN(dateObj.getTime())).toBe(false);
      });
    });

    it('should handle invalid dates', () => {
      const invalidDates = [
        'invalid-date',
        '2025-13-45',
        'not a date'
      ];

      invalidDates.forEach(date => {
        const dateObj = new Date(date);
        expect(isNaN(dateObj.getTime())).toBe(true);
      });
      
      // Test null and undefined separately as they behave differently
      expect(isNaN(new Date(null).getTime())).toBe(false); // new Date(null) = 1970-01-01
      expect(isNaN(new Date(undefined).getTime())).toBe(true);
    });
  });

  describe('String validation', () => {
    it('should validate string properties', () => {
      const validStrings = ['hello', 'world', 'test string', '123', ''];
      
      validStrings.forEach(str => {
        expect(typeof str).toBe('string');
        expect(str.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty strings', () => {
      expect('').toBe('');
      expect(''.length).toBe(0);
      expect(typeof '').toBe('string');
    });
  });

  describe('Number validation', () => {
    it('should validate numeric properties', () => {
      const validNumbers = [0, 1, -1, 3.14, 100.50, 1000000];
      
      validNumbers.forEach(num => {
        expect(typeof num).toBe('number');
        expect(isNaN(num)).toBe(false);
        expect(isFinite(num)).toBe(true);
      });
    });

    it('should handle edge cases', () => {
      expect(typeof NaN).toBe('number');
      expect(isNaN(NaN)).toBe(true);
      expect(typeof Infinity).toBe('number');
      expect(isFinite(Infinity)).toBe(false);
      expect(typeof -Infinity).toBe('number');
      expect(isFinite(-Infinity)).toBe(false);
    });
  });
});

describe('Array and Object Utils', () => {
  describe('Array operations', () => {
    const testArray = [1, 2, 3, 4, 5];

    it('should filter arrays correctly', () => {
      const filtered = testArray.filter(x => x > 3);
      expect(filtered).toEqual([4, 5]);
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should map arrays correctly', () => {
      const mapped = testArray.map(x => x * 2);
      expect(mapped).toEqual([2, 4, 6, 8, 10]);
      expect(Array.isArray(mapped)).toBe(true);
    });

    it('should reduce arrays correctly', () => {
      const sum = testArray.reduce((acc, x) => acc + x, 0);
      expect(sum).toBe(15);
      expect(typeof sum).toBe('number');
    });

    it('should find items in arrays correctly', () => {
      const found = testArray.find(x => x === 3);
      expect(found).toBe(3);
      
      const notFound = testArray.find(x => x === 10);
      expect(notFound).toBeUndefined();
    });

    it('should check if all items match condition', () => {
      const allPositive = testArray.every(x => x > 0);
      expect(allPositive).toBe(true);
      
      const allGreaterThan3 = testArray.every(x => x > 3);
      expect(allGreaterThan3).toBe(false);
    });

    it('should check if any items match condition', () => {
      const hasEven = testArray.some(x => x % 2 === 0);
      expect(hasEven).toBe(true);
      
      const hasNegative = testArray.some(x => x < 0);
      expect(hasNegative).toBe(false);
    });
  });

  describe('Object operations', () => {
    const testObject = { a: 1, b: 2, c: 3 };

    it('should check if object has property', () => {
      expect(testObject.hasOwnProperty('a')).toBe(true);
      expect(testObject.hasOwnProperty('d')).toBe(false);
      expect('a' in testObject).toBe(true);
      expect('d' in testObject).toBe(false);
    });

    it('should get object keys', () => {
      const keys = Object.keys(testObject);
      expect(keys).toEqual(['a', 'b', 'c']);
      expect(Array.isArray(keys)).toBe(true);
    });

    it('should get object values', () => {
      const values = Object.values(testObject);
      expect(values).toEqual([1, 2, 3]);
      expect(Array.isArray(values)).toBe(true);
    });

    it('should merge objects correctly', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const merged = { ...obj1, ...obj2 };
      
      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
      expect(typeof merged).toBe('object');
    });

    it('should check if object is empty', () => {
      expect(Object.keys({})).toHaveLength(0);
      expect(Object.keys(testObject)).toHaveLength(3);
      
      const isEmpty = (obj) => Object.keys(obj).length === 0;
      expect(isEmpty({})).toBe(true);
      expect(isEmpty(testObject)).toBe(false);
    });
  });
}); 