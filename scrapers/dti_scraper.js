const axios = require('axios');
const cheerio = require('cheerio');
const { validatePriceData, cleanText } = require('../utils/priceNormalizer');
const prisma = require('../src/config/database');

/**
 * DTI Price Scraper
 * Scrapes price data from DTI website
 */
class DTIScraper {
  constructor() {
    this.name = 'DTI Scraper';
    this.baseUrl = 'https://www.dti.gov.ph';
    this.priceUrl = 'https://www.dti.gov.ph/price-monitoring';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  /**
   * Scrape price data from DTI website
   * @returns {Promise<Array>} Array of scraped price data
   */
  async scrape() {
    try {
      console.log(`🔄 Starting ${this.name}...`);
      
      // For demo purposes, we'll use a mock HTML structure
      // In production, you would fetch from the actual DTI website
      const mockHtml = this.getMockDTIHTML();
      
      const prices = this.parseHTML(mockHtml);
      console.log(`✅ ${this.name} completed. Found ${prices.length} price records.`);
      
      return prices;
    } catch (error) {
      console.error(`❌ ${this.name} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Parse HTML content and extract price data
   * @param {string} html - HTML content to parse
   * @returns {Array} Array of parsed price data
   */
  parseHTML(html) {
    const $ = cheerio.load(html);
    const prices = [];

    // Look for price tables
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      
      // Find table headers to understand structure
      const headers = [];
      $table.find('thead tr th, tr:first-child th, tr:first-child td').each((i, th) => {
        headers.push(cleanText($(th).text()));
      });

      // If no headers found, skip this table
      if (headers.length === 0) return;

      // Find commodity column index
      const commodityIndex = headers.findIndex(h => 
        h.toLowerCase().includes('commodity') || 
        h.toLowerCase().includes('item') || 
        h.toLowerCase().includes('product')
      );

      // Find price column index
      const priceIndex = headers.findIndex(h => 
        h.toLowerCase().includes('price') || 
        h.toLowerCase().includes('cost') || 
        h.toLowerCase().includes('₱') ||
        h.toLowerCase().includes('php')
      );

      // Find region column index
      const regionIndex = headers.findIndex(h => 
        h.toLowerCase().includes('region') || 
        h.toLowerCase().includes('area') || 
        h.toLowerCase().includes('location')
      );

      // If we can't find essential columns, skip this table
      if (commodityIndex === -1 || priceIndex === -1) return;

      // Parse table rows
      $table.find('tbody tr, tr:not(:first-child)').each((rowIndex, row) => {
        const $row = $(row);
        const cells = [];

        $row.find('td, th').each((cellIndex, cell) => {
          cells.push(cleanText($(cell).text()));
        });

        if (cells.length < Math.max(commodityIndex, priceIndex) + 1) return;

        const commodity = cells[commodityIndex] || '';
        const priceText = cells[priceIndex] || '';
        const region = regionIndex !== -1 ? (cells[regionIndex] || 'NCR') : 'NCR';

        // Skip if no commodity or price
        if (!commodity || !priceText) return;

        // Create price data object
        const priceData = {
          commodity,
          price: priceText,
          region,
          unit: 'per kg', // Default unit
          source: 'DTI',
          date: new Date()
        };

        // Validate and normalize the data
        const validatedData = validatePriceData(priceData);
        if (validatedData) {
          prices.push(validatedData);
        }
      });
    });

    return prices;
  }

  /**
   * Get mock HTML for demonstration purposes
   * In production, this would be replaced with actual HTTP requests
   * @returns {string} Mock HTML content
   */
  getMockDTIHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DTI Price Monitoring</title>
      </head>
      <body>
        <h1>DTI Price Monitoring</h1>
        <table>
          <thead>
            <tr>
              <th>Commodity</th>
              <th>Region</th>
              <th>Price (₱)</th>
              <th>Unit</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Well-Milled Rice</td>
              <td>NCR</td>
              <td>₱45.50</td>
              <td>per kg</td>
              <td>2024-01-15</td>
            </tr>
            <tr>
              <td>Well-Milled Rice</td>
              <td>Region VII</td>
              <td>₱47.25</td>
              <td>per kg</td>
              <td>2024-01-15</td>
            </tr>
            <tr>
              <td>Red Onion</td>
              <td>NCR</td>
              <td>₱95.00</td>
              <td>per kg</td>
              <td>2024-01-15</td>
            </tr>
            <tr>
              <td>Red Onion</td>
              <td>Region VII</td>
              <td>₱88.75</td>
              <td>per kg</td>
              <td>2024-01-15</td>
            </tr>
            <tr>
              <td>Diesel</td>
              <td>NCR</td>
              <td>₱62.50</td>
              <td>per liter</td>
              <td>2024-01-15</td>
            </tr>
            <tr>
              <td>Diesel</td>
              <td>Region VII</td>
              <td>₱61.25</td>
              <td>per liter</td>
              <td>2024-01-15</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
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

module.exports = DTIScraper; 