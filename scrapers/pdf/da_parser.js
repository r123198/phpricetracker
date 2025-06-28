const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const DA_DIR = path.join(__dirname, '../../pdf/DA');
const OUTPUT_DIR = path.join(__dirname, '../../output');

const SOURCE = 'DA';
const DATE = '2025-06-26'; // Default date, will be extracted from filename

// Regional mappings - will auto-detect from directory names
const REGIONS = {
  'ncr': 'NCR',
  'rx': 'RX',
  // Add more regions as they come
  'region-i': 'Region I',
  'region-ii': 'Region II',
  'region-iii': 'Region III',
  'region-iv-a': 'Region IV-A',
  'region-iv-b': 'Region IV-B',
  'region-v': 'Region V',
  'region-vi': 'Region VI',
  'region-vii': 'Region VII',
  'region-viii': 'Region VIII',
  'region-ix': 'Region IX',
  'region-x': 'Region X',
  'region-xi': 'Region XI',
  'region-xii': 'Region XII',
  'car': 'CAR',
  'caraga': 'CARAGA',
  'barmm': 'BARMM'
};

// Commodity categories and their variations
const COMMODITY_CATEGORIES = {
  'rice': ['rice', 'bigas', 'palay', 'white rice', 'brown rice', 'special', 'premium', 'well milled', 'regular milled'],
  'vegetables': ['vegetables', 'gulay', 'tomato', 'onion', 'garlic', 'potato', 'cabbage', 'carrot'],
  'fruits': ['fruits', 'prutas', 'banana', 'apple', 'orange', 'mango', 'papaya'],
  'meat': ['meat', 'karne', 'pork', 'beef', 'chicken', 'fish', 'bangus', 'tilapia', 'galunggong'],
  'dairy': ['dairy', 'milk', 'cheese', 'butter', 'eggs'],
  'grains': ['grains', 'corn', 'wheat', 'flour'],
  'sugar': ['sugar', 'asukal'],
  'oil': ['oil', 'cooking oil', 'vegetable oil']
};

// Market names for NCR format
const MARKET_NAMES = [
  'Agora Public Market', 'Balintawak', 'Bicutan Market', 'Cartimar Market',
  'Commonwealth Market', 'Dagonoy Market', 'Guadalupe Public Market',
  'Kamuning Public Market', 'La Huerta Market', 'New Las Piñas City Public Market',
  'Malabon Central Market', 'Mandaluyong Public Market', 'Marikina Public Market',
  'Maypajo Public Market', 'Mega Q-mart', 'Navotas Fish Port', 'Pasig City Market',
  'Quiapo Market', 'San Andres Market', 'Sta. Ana Market', 'Taguig Market',
  'Valenzuela Market', 'Vitas Market'
];

function extractDateFromFilename(filename) {
  // Try to extract date from filename patterns
  const datePatterns = [
    /(\d{2})(\d{2})(\d{4})/, // MMDDYYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // M/D/YYYY
    /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{2})/, // MM/DD/YY
    /April\s+(\d{1,2}),?\s+(\d{4})/, // April 7, 2025
    /June\s+(\d{1,2}),?\s+(\d{4})/ // June 26, 2025
  ];
  
  for (const pattern of datePatterns) {
    const match = filename.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        // YYYY-MM-DD or YYYYMMDD format
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (match[1].length === 2) {
        // MM-DD-YYYY or MMDDYYYY format
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      } else if (match[1] === 'April' || match[1] === 'June') {
        // Month DD, YYYY format
        const month = match[1] === 'April' ? '04' : '06';
        return `${match[2]}-${month}-${match[1] === 'April' ? '07' : '26'}`;
      }
    }
  }
  
  return DATE; // Default date if no pattern matches
}

function normalizeCommodityType(commodity) {
  const lowerCommodity = commodity.toLowerCase();
  
  for (const [category, variations] of Object.entries(COMMODITY_CATEGORIES)) {
    if (variations.some(v => lowerCommodity.includes(v))) {
      return category;
    }
  }
  
  return 'other';
}

function parseNCRFormat(lines, region, date, debug = false) {
  const results = [];
  const priceRanges = [];
  let currentMarket = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;
    
    if (debug && i < 50) {
      console.log(`Line ${i}: ${line}`);
    }
    
    // Check if this is a market name
    const isMarketName = MARKET_NAMES.some(market => 
      line.toLowerCase().includes(market.toLowerCase())
    );
    
    if (isMarketName) {
      currentMarket = line;
      if (debug) console.log(`🏪 Found market: ${currentMarket}`);
      continue;
    }
    
    // Look for price patterns in the line
    const pricePatterns = [
      // Pattern: 45.00-48.00 (single range)
      /(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)/g,
      // Pattern: 45.00-48.007.00-8.00 (multiple ranges)
      /(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)/g,
      // Pattern: 37.00-45.00140.00-150.00180.00-200.007.00-7.80 (multiple ranges)
      /(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)/g
    ];
    
    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (match.length >= 3) {
          const minPrice = parseFloat(match[1]);
          const maxPrice = parseFloat(match[2]);
          
          if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice > 0 && maxPrice > 0 && maxPrice >= minPrice) {
            // Try to determine commodity from context or use generic name
            const commodity = currentMarket ? `Rice at ${currentMarket}` : 'Rice';
            
            const rangeEntry = {
              commodity: commodity,
              unit: 'per kg',
              minPrice: minPrice,
              maxPrice: maxPrice,
              averagePrice: (minPrice + maxPrice) / 2,
              source: SOURCE,
              region: region,
              date: date,
              category: 'rice',
              hasRange: true,
              filename: null,
              market: currentMarket
            };
            
            priceRanges.push(rangeEntry);
            
            if (debug) {
              console.log(`📊 Range: ${commodity} - ${minPrice}-${maxPrice} PHP/kg at ${currentMarket}`);
            }
          }
        }
      }
    }
  }
  
  return { results, priceRanges };
}

function parseRXFormat(lines, region, date, debug = false) {
  const results = [];
  const priceRanges = [];
  let currentCategory = '';
  let currentCommodity = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;
    
    if (debug && i < 50) {
      console.log(`Line ${i}: ${line}`);
    }
    
    // Check for category headers
    if (line.includes('IMPORTED COMMERCIAL RICE') || 
        line.includes('LOCAL COMMERCIAL RICE') ||
        line.includes('FISH') ||
        line.includes('MEAT') ||
        line.includes('VEGETABLES') ||
        line.includes('FRUITS')) {
      currentCategory = line;
      if (debug) console.log(`📂 Found category: ${currentCategory}`);
      continue;
    }
    
    // Check for commodity types (Special, Premium, Well milled, etc.)
    if (line.includes('Special') || line.includes('Premium') || 
        line.includes('Well milled') || line.includes('Regular milled') ||
        line.includes('Bangus') || line.includes('Tilapia') || line.includes('Galunggong')) {
      currentCommodity = line;
      if (debug) console.log(`🌾 Found commodity: ${currentCommodity}`);
      continue;
    }
    
    // Look for price patterns
    const pricePatterns = [
      // Pattern: Blue tag48.0050.0048.0046.0050.0046.00
      /(\w+\s+tag)?(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)/g,
      // Pattern: med(3-4pcs/kg)n/an/an/a200.00200.00200.00
      /(\w+\([^)]+\))?n\/an\/an\/a(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)/g,
      // Pattern: med(5-6pcs/kg)200.00200.00200.00n/an/an/a
      /(\w+\([^)]+\))?(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)n\/an\/an\/a/g,
      // Pattern: 160.00160.00160.00160.00160.00160.00
      /(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)(\d+(?:\.\d{1,2})?)/g
    ];
    
    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (match.length >= 4) {
          // Extract prices (skip the first match group if it's a tag or size)
          const prices = match.slice(1).filter(p => p && !isNaN(parseFloat(p))).map(p => parseFloat(p));
          
          if (prices.length >= 2) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            if (minPrice > 0 && maxPrice > 0 && maxPrice >= minPrice) {
              const commodity = currentCommodity || 'Rice';
              const unit = line.includes('pcs/kg') ? 'per kg' : 'per kg';
              
              // Create price range entry
              const rangeEntry = {
                commodity: commodity,
                unit: unit,
                minPrice: minPrice,
                maxPrice: maxPrice,
                averagePrice: avgPrice,
                source: SOURCE,
                region: region,
                date: date,
                category: normalizeCommodityType(commodity),
                hasRange: true,
                filename: null,
                category_header: currentCategory
              };
              
              priceRanges.push(rangeEntry);
              
              if (debug) {
                console.log(`📊 Range: ${commodity} - ${minPrice}-${maxPrice} PHP/${unit} (avg: ${avgPrice.toFixed(2)})`);
              }
            }
          }
        }
      }
    }
  }
  
  return { results, priceRanges };
}

function extractPricesFromText(text, region, date, debug = false) {
  const lines = text.split('\n');
  
  if (debug) {
    console.log(`\n=== Processing ${region} region ===`);
    console.log(`Date: ${date}`);
    console.log(`Total lines: ${lines.length}`);
  }
  
  // Determine format based on region or content
  if (region === 'NCR') {
    return parseNCRFormat(lines, region, date, debug);
  } else if (region === 'RX') {
    return parseRXFormat(lines, region, date, debug);
  } else {
    // Generic parsing for other regions
    return parseGenericFormat(lines, region, date, debug);
  }
}

function parseGenericFormat(lines, region, date, debug = false) {
  const results = [];
  const priceRanges = [];
  
  // Generic price patterns for other regions
  const PRICE_PATTERNS = [
    // Pattern 1: [Commodity] [Price] (e.g., "Rice 45.50")
    /^([a-zA-Z\s]+)\s+(\d+(?:\.\d{1,2})?)/i,
    
    // Pattern 2: [Commodity] [Unit] [Price] (e.g., "Rice per kg 45.50")
    /^([a-zA-Z\s]+)\s+(?:per\s+)?(kg|g|liter|l|piece|pc|pcs)\s+(\d+(?:\.\d{1,2})?)/i,
    
    // Pattern 3: [Price] [Commodity] (e.g., "45.50 Rice")
    /^(\d+(?:\.\d{1,2})?)\s+([a-zA-Z\s]+)/i,
    
    // Pattern 4: Price range [Commodity] [Min-Max] (e.g., "Rice 45.50-55.75")
    /^([a-zA-Z\s]+)\s+(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)/i,
    
    // Pattern 5: [Commodity] [Min] [Max] (e.g., "Rice 45.50 55.75")
    /^([a-zA-Z\s]+)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)/i
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;
    
    if (debug && i < 30) {
      console.log(`Line ${i}: ${line}`);
    }
    
    let match = null;
    let patternIndex = -1;
    
    // Try each pattern
    for (let j = 0; j < PRICE_PATTERNS.length; j++) {
      match = line.match(PRICE_PATTERNS[j]);
      if (match) {
        patternIndex = j;
        break;
      }
    }
    
    if (match) {
      let commodity, price, unit = 'per kg', minPrice, maxPrice;
      
      switch (patternIndex) {
        case 0: // [Commodity] [Price]
          [, commodity, price] = match;
          break;
        case 1: // [Commodity] [Unit] [Price]
          [, commodity, unit, price] = match;
          break;
        case 2: // [Price] [Commodity]
          [, price, commodity] = match;
          break;
        case 3: // Price range [Commodity] [Min-Max]
          [, commodity, minPrice, maxPrice] = match;
          break;
        case 4: // [Commodity] [Min] [Max]
          [, commodity, minPrice, maxPrice] = match;
          break;
      }
      
      // Clean up commodity name
      commodity = commodity ? commodity.trim().replace(/\s+/g, ' ') : '';
      
      // Skip if commodity is too short or looks like a header
      if (commodity.length < 2 || 
          commodity.toLowerCase().includes('page') ||
          commodity.toLowerCase().includes('monitoring') ||
          commodity.toLowerCase().includes('price') ||
          commodity.toLowerCase().includes('date') ||
          commodity.toLowerCase().includes('region') ||
          commodity.toLowerCase().includes('province')) {
        continue;
      }
      
      // Handle price ranges
      if (minPrice && maxPrice) {
        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);
        
        if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0 && max >= min) {
          const rangeEntry = {
            commodity: commodity,
            unit: unit,
            minPrice: min,
            maxPrice: max,
            averagePrice: (min + max) / 2,
            source: SOURCE,
            region: region,
            date: date,
            category: normalizeCommodityType(commodity),
            hasRange: true,
            filename: null
          };
          
          priceRanges.push(rangeEntry);
          
          if (debug) {
            console.log(`📊 Range: ${commodity} - ${min}-${max} PHP/${unit}`);
          }
        }
      }
      
      // Handle single price
      if (price) {
        const singlePrice = parseFloat(price);
        
        if (!isNaN(singlePrice) && singlePrice > 0 && singlePrice < 10000) {
          const result = {
            commodity: commodity,
            unit: unit,
            price: singlePrice,
            source: SOURCE,
            region: region,
            date: date,
            category: normalizeCommodityType(commodity),
            hasRange: false,
            filename: null
          };
          
          results.push(result);
          
          if (debug) {
            console.log(`✓ Single: ${commodity} - ${singlePrice} PHP/${unit}`);
          }
        }
      }
    }
  }
  
  return { results, priceRanges };
}

async function parseDAPDF(pdfPath, region, debug = false) {
  let dataBuffer;
  try {
    dataBuffer = fs.readFileSync(pdfPath);
  } catch (err) {
    throw new Error(`Could not read PDF file: ${err.message}`);
  }

  let pdfData;
  try {
    pdfData = await pdf(dataBuffer);
  } catch (err) {
    throw new Error(`Could not parse PDF: ${err.message}`);
  }

  if (debug) {
    console.log(`\n=== EXTRACTED PDF TEXT (first 500 chars) ===`);
    console.log(pdfData.text.substring(0, 500));
    console.log('=== END EXTRACTED TEXT ===');
  }

  const filename = path.basename(pdfPath);
  const date = extractDateFromFilename(filename);
  
  return extractPricesFromText(pdfData.text, region, date, debug);
}

function getAllPDFs() {
  const pdfs = [];
  const bantayPresyoPath = path.join(DA_DIR, 'bantaypresyo');
  
  if (!fs.existsSync(bantayPresyoPath)) {
    return pdfs;
  }
  
  const regionDirs = fs.readdirSync(bantayPresyoPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const regionDir of regionDirs) {
    const regionPath = path.join(bantayPresyoPath, regionDir);
    const regionName = REGIONS[regionDir.toLowerCase()] || regionDir.toUpperCase();
    
    const files = fs.readdirSync(regionPath)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => ({
        path: path.join(regionPath, f),
        filename: f,
        region: regionName,
        regionDir: regionDir
      }));
    
    pdfs.push(...files);
  }
  
  return pdfs;
}

async function parseAllDAPDFs(debug = false) {
  const pdfs = getAllPDFs();
  const allResults = [];
  const allPriceRanges = [];
  
  console.log(`\n🚀 Starting DA PDF parsing...`);
  console.log(`Found ${pdfs.length} PDF files to process`);
  
  for (const pdf of pdfs) {
    console.log(`\n📄 Processing: ${pdf.filename} (${pdf.region})`);
    
    try {
      const { results, priceRanges } = await parseDAPDF(pdf.path, pdf.region, debug);
      console.log(`✅ Extracted ${results.length} price entries`);
      console.log(`📊 Extracted ${priceRanges.length} price range entries`);
      
      // Add filename info to results
      results.forEach(result => {
        result.filename = pdf.filename;
      });
      
      priceRanges.forEach(range => {
        range.filename = pdf.filename;
      });
      
      allResults.push(...results);
      allPriceRanges.push(...priceRanges);
      
    } catch (err) {
      console.error(`❌ Error processing ${pdf.filename}: ${err.message}`);
    }
  }
  
  return { allResults, allPriceRanges };
}

// Main execution
(async () => {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const specificFile = args.find(arg => !arg.startsWith('--'));
  
  try {
    let results, priceRanges;
    
    if (specificFile) {
      // Parse specific file
      const region = path.basename(path.dirname(specificFile));
      const regionName = REGIONS[region.toLowerCase()] || region.toUpperCase();
      console.log(`\n📄 Processing specific file: ${specificFile}`);
      const parsed = await parseDAPDF(specificFile, regionName, debug);
      results = parsed.results;
      priceRanges = parsed.priceRanges;
    } else {
      // Parse all PDFs
      const parsed = await parseAllDAPDFs(debug);
      results = parsed.allResults;
      priceRanges = parsed.allPriceRanges;
    }
    
    console.log(`\n🎉 Parsing completed!`);
    console.log(`📊 Total price entries found: ${results.length}`);
    console.log(`📈 Total price range entries found: ${priceRanges.length}`);
    
    if (results.length > 0 || priceRanges.length > 0) {
      // Group by region
      const byRegion = {};
      results.forEach(result => {
        if (!byRegion[result.region]) {
          byRegion[result.region] = { prices: [], ranges: [] };
        }
        byRegion[result.region].prices.push(result);
      });
      
      priceRanges.forEach(range => {
        if (!byRegion[range.region]) {
          byRegion[range.region] = { prices: [], ranges: [] };
        }
        byRegion[range.region].ranges.push(range);
      });
      
      console.log(`\n📈 Results by region:`);
      for (const [region, data] of Object.entries(byRegion)) {
        console.log(`  ${region}: ${data.prices.length} prices, ${data.ranges.length} ranges`);
      }
      
      // Show first 10 entries
      const first10 = results.slice(0, 10);
      console.log(`\n📋 First 10 price entries:`);
      console.log(JSON.stringify(first10, null, 2));
      
      if (priceRanges.length > 0) {
        const first5Ranges = priceRanges.slice(0, 5);
        console.log(`\n📊 First 5 price range entries:`);
        console.log(JSON.stringify(first5Ranges, null, 2));
      }
      
      // Save to files
      const outputPath = path.join(OUTPUT_DIR, 'latest_prices_da.json');
      const rangesOutputPath = path.join(OUTPUT_DIR, 'latest_price_ranges_da.json');
      
      try {
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`\n💾 Saved all ${results.length} price entries to ${outputPath}`);
      } catch (err) {
        console.warn('Could not write price output file:', err.message);
      }
      
      if (priceRanges.length > 0) {
        try {
          fs.writeFileSync(rangesOutputPath, JSON.stringify(priceRanges, null, 2));
          console.log(`💾 Saved all ${priceRanges.length} price range entries to ${rangesOutputPath}`);
        } catch (err) {
          console.warn('Could not write price ranges output file:', err.message);
        }
      }
      
      // Save by region
      for (const [region, data] of Object.entries(byRegion)) {
        const regionOutputPath = path.join(OUTPUT_DIR, `latest_prices_da_${region.toLowerCase().replace(/\s+/g, '_')}.json`);
        const regionRangesPath = path.join(OUTPUT_DIR, `latest_price_ranges_da_${region.toLowerCase().replace(/\s+/g, '_')}.json`);
        
        try {
          fs.writeFileSync(regionOutputPath, JSON.stringify(data.prices, null, 2));
          console.log(`💾 Saved ${data.prices.length} price entries for ${region} to ${regionOutputPath}`);
        } catch (err) {
          console.warn(`Could not write ${region} price output file:`, err.message);
        }
        
        if (data.ranges.length > 0) {
          try {
            fs.writeFileSync(regionRangesPath, JSON.stringify(data.ranges, null, 2));
            console.log(`💾 Saved ${data.ranges.length} price range entries for ${region} to ${regionRangesPath}`);
          } catch (err) {
            console.warn(`Could not write ${region} price ranges output file:`, err.message);
          }
        }
      }
      
    } else {
      console.log('No entries found. Try running with --debug to see extraction details.');
      console.log('Usage: node da_parser.js [path-to-pdf] [--debug]');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})(); 