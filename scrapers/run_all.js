const fs = require('fs-extra');
const path = require('path');
const DTIScraper = require('./dti_scraper');
const DAScraper = require('./da_scraper');

/**
 * Run all scrapers and collect price data
 * @param {boolean} saveToDb - Whether to save data to database
 * @param {boolean} outputToFile - Whether to output to JSON file
 * @returns {Promise<Object>} Results summary
 */
async function runAllScrapers(saveToDb = true, outputToFile = true) {
  const startTime = Date.now();
  const results = {
    scrapersRun: 0,
    newPrices: 0,
    errors: [],
    scrapers: {}
  };

  // Initialize scrapers
  const scrapers = [
    new DTIScraper(),
    new DAScraper()
  ];

  console.log('🚀 Starting all scrapers...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔧 Scrapers to run: ${scrapers.length}`);
  console.log('');

  // Run each scraper
  for (const scraper of scrapers) {
    try {
      console.log(`🔄 Running ${scraper.name}...`);
      
      // Run the scraper
      const prices = await scraper.scrape();
      
      if (!prices || prices.length === 0) {
        console.log(`⚠️  ${scraper.name} returned no data`);
        results.scrapers[scraper.name] = {
          success: true,
          pricesFound: 0,
          pricesSaved: 0,
          errors: []
        };
        continue;
      }

      console.log(`✅ ${scraper.name} found ${prices.length} price records`);

      // Save to database if requested
      let savedCount = 0;
      if (saveToDb) {
        savedCount = await scraper.saveToDatabase(prices);
        console.log(`💾 ${scraper.name} saved ${savedCount} new records to database`);
      }

      // Store results
      results.scrapersRun++;
      results.newPrices += savedCount;
      results.scrapers[scraper.name] = {
        success: true,
        pricesFound: prices.length,
        pricesSaved: savedCount,
        errors: []
      };

      // Output to file if requested
      if (outputToFile) {
        await outputToJsonFile(scraper.name, prices);
      }

    } catch (error) {
      console.error(`❌ ${scraper.name} failed:`, error.message);
      
      results.errors.push(`${scraper.name}: ${error.message}`);
      results.scrapers[scraper.name] = {
        success: false,
        pricesFound: 0,
        pricesSaved: 0,
        errors: [error.message]
      };
    }

    console.log('');
  }

  // Generate combined output
  if (outputToFile) {
    await generateCombinedOutput(results);
  }

  const duration = Date.now() - startTime;
  
  console.log('📊 Scraping Summary:');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`🔧 Scrapers Run: ${results.scrapersRun}/${scrapers.length}`);
  console.log(`💰 New Prices: ${results.newPrices}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n🎉 Scraping completed!');

  return results;
}

/**
 * Output scraper results to JSON file
 * @param {string} scraperName - Name of the scraper
 * @param {Array} prices - Price data array
 */
async function outputToJsonFile(scraperName, prices) {
  try {
    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'output');
    await fs.ensureDir(outputDir);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${scraperName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Prepare output data
    const outputData = {
      scraper: scraperName,
      timestamp: new Date().toISOString(),
      totalRecords: prices.length,
      data: prices
    };

    // Write to file
    await fs.writeJson(filepath, outputData, { spaces: 2 });
    console.log(`📄 Output saved to: ${filename}`);

  } catch (error) {
    console.error(`❌ Failed to save output for ${scraperName}:`, error.message);
  }
}

/**
 * Generate combined output with all scraped data
 * @param {Object} results - Scraping results
 */
async function generateCombinedOutput(results) {
  try {
    const outputDir = path.join(__dirname, '..', 'output');
    await fs.ensureDir(outputDir);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `latest_prices_${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Collect all prices from successful scrapers
    const allPrices = [];
    for (const [scraperName, result] of Object.entries(results.scrapers)) {
      if (result.success && result.pricesFound > 0) {
        // In a real implementation, you would collect the actual prices here
        // For now, we'll create a summary
        allPrices.push({
          scraper: scraperName,
          pricesFound: result.pricesFound,
          pricesSaved: result.pricesSaved
        });
      }
    }

    const outputData = {
      timestamp: new Date().toISOString(),
      summary: {
        scrapersRun: results.scrapersRun,
        newPrices: results.newPrices,
        errors: results.errors
      },
      scrapers: results.scrapers,
      data: allPrices
    };

    await fs.writeJson(filepath, outputData, { spaces: 2 });
    console.log(`📄 Combined output saved to: ${filename}`);

    // Also create a latest_prices.json file (without timestamp)
    const latestFilepath = path.join(outputDir, 'latest_prices.json');
    await fs.writeJson(latestFilepath, outputData, { spaces: 2 });

  } catch (error) {
    console.error('❌ Failed to generate combined output:', error.message);
  }
}

/**
 * Main function for command line execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isManual = args.includes('--manual');
  const saveToDb = !args.includes('--no-db');
  const outputToFile = !args.includes('--no-file');

  if (isManual) {
    console.log('🔄 Manual scraper execution...');
  }

  try {
    const results = await runAllScrapers(saveToDb, outputToFile);
    
    // Exit with error code if there were failures
    if (results.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error during scraping:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { runAllScrapers }; 