const axios = require('axios');
const pdfParse = require('pdf-parse');
const { validatePriceData, cleanText, extractPrice, extractUnit } = require('../utils/priceNormalizer');
const prisma = require('../src/config/database');

/**
 * DA (Department of Agriculture) PDF Scraper
 * Scrapes price data from DA PDF reports
 */
class DAScraper {
  constructor() {
    this.name = 'DA Scraper';
    this.baseUrl = 'https://www.da.gov.ph';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  /**
   * Scrape price data from DA PDF reports
   * @returns {Promise<Array>} Array of scraped price data
   */
  async scrape() {
    try {
      console.log(`🔄 Starting ${this.name}...`);
      
      // For demo purposes, we'll use a mock PDF content
      // In production, you would download and parse actual PDF files
      const mockPdfContent = this.getMockPDFContent();
      
      const prices = this.parsePDFContent(mockPdfContent);
      console.log(`✅ ${this.name} completed. Found ${prices.length} price records.`);
      
      return prices;
    } catch (error) {
      console.error(`❌ ${this.name} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Download PDF from URL
   * @param {string} url - PDF URL to download
   * @returns {Promise<Buffer>} PDF buffer
   */
  async downloadPDF(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 30000
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download PDF from ${url}: ${error.message}`);
    }
  }

  /**
   * Parse PDF content and extract price data
   * @param {string} pdfContent - PDF text content
   * @returns {Array} Array of parsed price data
   */
  parsePDFContent(pdfContent) {
    const prices = [];
    const lines = pdfContent.split('\n').map(line => cleanText(line));
    
    // Define commodity patterns to look for
    const commodityPatterns = [
      /rice/i,
      /onion/i,
      /tomato/i,
      /pork/i,
      /chicken/i,
      /diesel/i,
      /gasoline/i
    ];

    // Define region patterns
    const regionPatterns = [
      /ncr|metro manila|national capital region/i,
      /region vii|region 7|central visayas/i,
      /region iv-a|region 4a|calabarzon/i,
      /region iii|region 3|central luzon/i
    ];

    let currentRegion = 'NCR'; // Default region
    let currentDate = new Date();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check if line contains region information
      for (const pattern of regionPatterns) {
        if (pattern.test(line)) {
          currentRegion = this.extractRegion(line);
          break;
        }
      }

      // Check if line contains date information
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
      if (dateMatch) {
        currentDate = new Date(dateMatch[0]);
      }

      // Look for commodity and price patterns
      for (const pattern of commodityPatterns) {
        if (pattern.test(line)) {
          const priceData = this.extractPriceFromLine(line, currentRegion, currentDate);
          if (priceData) {
            prices.push(priceData);
          }
        }
      }

      // Look for multi-line patterns (commodity on one line, price on next)
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        for (const pattern of commodityPatterns) {
          if (pattern.test(line) && this.containsPrice(nextLine)) {
            const priceData = this.extractPriceFromMultiLine(line, nextLine, currentRegion, currentDate);
            if (priceData) {
              prices.push(priceData);
            }
          }
        }
      }
    }

    return prices;
  }

  /**
   * Extract price data from a single line
   * @param {string} line - Line containing commodity and price
   * @param {string} region - Current region
   * @param {Date} date - Current date
   * @returns {Object|null} Price data object or null
   */
  extractPriceFromLine(line, region, date) {
    const commodity = this.extractCommodity(line);
    const price = extractPrice(line);
    const unit = extractUnit(line);

    if (!commodity || !price) return null;

    const priceData = {
      commodity,
      price: price.toString(),
      region,
      unit: unit || 'per kg',
      source: 'DA',
      date
    };

    return validatePriceData(priceData);
  }

  /**
   * Extract price data from multi-line pattern
   * @param {string} commodityLine - Line containing commodity
   * @param {string} priceLine - Line containing price
   * @param {string} region - Current region
   * @param {Date} date - Current date
   * @returns {Object|null} Price data object or null
   */
  extractPriceFromMultiLine(commodityLine, priceLine, region, date) {
    const commodity = this.extractCommodity(commodityLine);
    const price = extractPrice(priceLine);
    const unit = extractUnit(priceLine);

    if (!commodity || !price) return null;

    const priceData = {
      commodity,
      price: price.toString(),
      region,
      unit: unit || 'per kg',
      source: 'DA',
      date
    };

    return validatePriceData(priceData);
  }

  /**
   * Extract commodity name from text
   * @param {string} text - Text containing commodity name
   * @returns {string|null} Commodity name or null
   */
  extractCommodity(text) {
    const commodityMap = {
      'rice': 'Well-Milled Rice',
      'onion': 'Red Onion',
      'tomato': 'Tomato',
      'pork': 'Pork',
      'chicken': 'Chicken',
      'diesel': 'Diesel',
      'gasoline': 'Gasoline'
    };

    const lowerText = text.toLowerCase();
    
    for (const [key, value] of Object.entries(commodityMap)) {
      if (lowerText.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Extract region from text
   * @param {string} text - Text containing region information
   * @returns {string} Normalized region name
   */
  extractRegion(text) {
    const regionMap = {
      'ncr': 'NCR',
      'metro manila': 'NCR',
      'national capital region': 'NCR',
      'region vii': 'Region VII',
      'region 7': 'Region VII',
      'central visayas': 'Region VII',
      'region iv-a': 'Region IV-A',
      'region 4a': 'Region IV-A',
      'calabarzon': 'Region IV-A',
      'region iii': 'Region III',
      'region 3': 'Region III',
      'central luzon': 'Region III'
    };

    const lowerText = text.toLowerCase();
    
    for (const [key, value] of Object.entries(regionMap)) {
      if (lowerText.includes(key)) {
        return value;
      }
    }

    return 'NCR'; // Default
  }

  /**
   * Check if text contains price information
   * @param {string} text - Text to check
   * @returns {boolean} True if contains price
   */
  containsPrice(text) {
    return /[₱P]?\s*[\d,]+\.?\d*/.test(text);
  }

  /**
   * Get mock PDF content for demonstration purposes
   * In production, this would be replaced with actual PDF parsing
   * @returns {string} Mock PDF text content
   */
  getMockPDFContent() {
    return `
      DEPARTMENT OF AGRICULTURE
      Price Monitoring Report
      Date: 2024-01-15
      
      NATIONAL CAPITAL REGION (NCR)
      Well-Milled Rice: ₱45.50 per kg
      Red Onion: ₱95.00 per kg
      Tomato: ₱55.25 per kg
      Pork: ₱285.00 per kg
      Chicken: ₱175.50 per kg
      Diesel: ₱62.50 per liter
      
      REGION VII (Central Visayas)
      Well-Milled Rice: ₱47.25 per kg
      Red Onion: ₱88.75 per kg
      Tomato: ₱52.00 per kg
      Pork: ₱290.00 per kg
      Chicken: ₱180.25 per kg
      Diesel: ₱61.25 per liter
      
      REGION IV-A (CALABARZON)
      Well-Milled Rice: ₱46.75 per kg
      Red Onion: ₱92.50 per kg
      Tomato: ₱58.00 per kg
      Pork: ₱288.50 per kg
      Chicken: ₱178.75 per kg
      Diesel: ₱63.00 per liter
      
      REGION III (Central Luzon)
      Well-Milled Rice: ₱46.00 per kg
      Red Onion: ₱90.25 per kg
      Tomato: ₱54.50 per kg
      Pork: ₱287.00 per kg
      Chicken: ₱176.50 per kg
      Diesel: ₱62.00 per liter
    `;
  }

  /**
   * Save scraped data to database
   * @param {Array} prices - Array of price data to save
   * @returns {Promise<number>} Number of new records saved
   */
  async saveToDatabase(prices) {
    if (!prices || prices.length === 0) return 0;

    let savedCount = 0;
    const errors = [];

    for (const priceData of prices) {
      try {
        // Check if commodity exists, create if not
        let commodity = await prisma.commodity.findFirst({
          where: { name: priceData.commodity }
        });

        if (!commodity) {
          commodity = await prisma.commodity.create({
            data: {
              name: priceData.commodity,
              category: this.getCommodityCategory(priceData.commodity),
              slug: this.generateSlug(priceData.commodity)
            }
          });
        }

        // Create price record
        await prisma.price.create({
          data: {
            commodityId: commodity.id,
            price: priceData.price,
            unit: priceData.unit,
            region: priceData.region,
            source: priceData.source,
            date: priceData.date
          }
        });

        savedCount++;
      } catch (error) {
        if (error.code === 'P2002') {
          // Duplicate record, skip
          continue;
        }
        errors.push(`Failed to save ${priceData.commodity}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️  ${this.name} had ${errors.length} errors:`, errors);
    }

    return savedCount;
  }

  /**
   * Get commodity category based on name
   * @param {string} commodityName - Name of the commodity
   * @returns {string} Category
   */
  getCommodityCategory(commodityName) {
    const name = commodityName.toLowerCase();
    
    if (name.includes('rice') || name.includes('corn') || name.includes('wheat')) {
      return 'Grains';
    }
    if (name.includes('onion') || name.includes('tomato') || name.includes('vegetable')) {
      return 'Vegetables';
    }
    if (name.includes('diesel') || name.includes('gasoline') || name.includes('fuel')) {
      return 'Fuel';
    }
    if (name.includes('pork') || name.includes('chicken') || name.includes('beef')) {
      return 'Meat';
    }
    
    return 'Other';
  }

  /**
   * Generate slug from commodity name
   * @param {string} name - Commodity name
   * @returns {string} Slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
}

module.exports = DAScraper; 