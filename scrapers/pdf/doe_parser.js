const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const DOE_DIR = path.join(__dirname, '../../pdf/DOE');
const OUTPUT_DIR = path.join(__dirname, '../../output');

// Regional mappings
const REGIONS = {
  'luzon': 'Luzon',
  'visayas': 'Visayas', 
  'mindanao': 'Mindanao'
};

const SOURCE = 'DOE';
const DATE = '2025-06-17'; // Default date, will be extracted from filename

// Fuel types and their variations
const FUEL_TYPES = {
  'gasoline': ['gasoline', 'gas', 'unleaded', 'premium', 'regular'],
  'diesel': ['diesel', 'diesel fuel'],
  'lpg': ['lpg', 'liquefied petroleum gas', 'cooking gas'],
  'kerosene': ['kerosene', 'kero'],
  'biodiesel': ['biodiesel', 'bio-diesel'],
  'ethanol': ['ethanol', 'e10', 'e85']
};

// Price patterns for different fuel types
const PRICE_PATTERNS = [
  // Pattern 1: [Fuel Type] [Price] (e.g., "Gasoline 65.50")
  /^(gasoline|diesel|lpg|kerosene|biodiesel|ethanol|unleaded|premium|regular)\s+(\d+(?:\.\d{1,2})?)/i,
  
  // Pattern 2: [Fuel Type] [Unit] [Price] (e.g., "Gasoline per liter 65.50")
  /^(gasoline|diesel|lpg|kerosene|biodiesel|ethanol|unleaded|premium|regular)\s+(?:per\s+)?(liter|kg|gallon)\s+(\d+(?:\.\d{1,2})?)/i,
  
  // Pattern 3: [Price] [Fuel Type] (e.g., "65.50 Gasoline")
  /^(\d+(?:\.\d{1,2})?)\s+(gasoline|diesel|lpg|kerosene|biodiesel|ethanol|unleaded|premium|regular)/i,
  
  // Pattern 4: [Brand] [Fuel Type] [Price] (e.g., "Shell Gasoline 65.50")
  /^([a-zA-Z\s]+)\s+(gasoline|diesel|lpg|kerosene|biodiesel|ethanol|unleaded|premium|regular)\s+(\d+(?:\.\d{1,2})?)/i,
  
  // Pattern 5: [Fuel Type] [Brand] [Price] (e.g., "Gasoline Shell 65.50")
  /^(gasoline|diesel|lpg|kerosene|biodiesel|ethanol|unleaded|premium|regular)\s+([a-zA-Z\s]+)\s+(\d+(?:\.\d{1,2})?)/i,
  
  // Pattern 6: DOE specific - RON types (e.g., "RON 95", "RON 91")
  /^(RON\s+\d+)\s*$/i,
  
  // Pattern 7: DOE specific - DIESEL variants
  /^(DIESEL(?:\s+PLUS)?)\s*$/i,
  
  // Pattern 8: DOE specific - KEROSENE
  /^(KEROSENE)\s*$/i,
  
  // Pattern 9: Price ranges (e.g., "56.49 - 56.50", "58.49 - 61.00")
  /^(\d+\.\d{2})\s*-\s*(\d+\.\d{2})/,
  
  // Pattern 10: Single prices (e.g., "56.49", "58.49")
  /^(\d+\.\d{2})$/,
  
  // Pattern 11: Multiple prices on one line (e.g., "56.4958.4961.00")
  /(\d+\.\d{2})/g
];

function extractDateFromFilename(filename) {
  // Try to extract date from filename patterns
  const datePatterns = [
    /(\d{2})(\d{2})(\d{4})/, // MMDDYYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // M/D/YYYY
    /(\d{4})(\d{2})(\d{2})/ // YYYYMMDD
  ];
  
  for (const pattern of datePatterns) {
    const match = filename.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        // YYYY-MM-DD or YYYYMMDD format
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        // MM-DD-YYYY or MMDDYYYY format
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      }
    }
  }
  
  return DATE; // Default date if no pattern matches
}

function normalizeFuelType(fuelType) {
  const lowerFuel = fuelType.toLowerCase();
  
  for (const [standardType, variations] of Object.entries(FUEL_TYPES)) {
    if (variations.some(v => lowerFuel.includes(v))) {
      return standardType;
    }
  }
  
  return fuelType.toLowerCase();
}

function extractPricesFromText(text, region, date, debug = false) {
  const lines = text.split('\n');
  const results = [];
  let currentFuelType = null;
  
  if (debug) {
    console.log(`\n=== Processing ${region} region ===`);
    console.log(`Date: ${date}`);
    console.log(`Total lines: ${lines.length}`);
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 2) continue;
    
    if (debug && i < 30) {
      console.log(`Line ${i}: ${line}`);
    }
    
    // Check if this line contains a fuel type
    const fuelTypeMatch = line.match(/^(RON\s+\d+|DIESEL(?:\s+PLUS)?|KEROSENE)\s*$/i);
    if (fuelTypeMatch) {
      currentFuelType = fuelTypeMatch[1].toUpperCase();
      if (debug) {
        console.log(`🔍 Found fuel type: ${currentFuelType}`);
      }
      continue;
    }
    
    // If we have a current fuel type, look for prices
    if (currentFuelType) {
      // Extract all prices from this line
      const priceMatches = line.match(/\d+\.\d{2}/g);
      
      if (priceMatches && priceMatches.length > 0) {
        for (const priceStr of priceMatches) {
          const price = parseFloat(priceStr);
          
          // Validate price
          if (isNaN(price) || price <= 0 || price > 200) {
            continue;
          }
          
          // Skip if it looks like a page number or other non-price data
          if (line.toLowerCase().includes('page') || 
              line.toLowerCase().includes('none') ||
              line.toLowerCase().includes('monitoring')) {
            continue;
          }
          
          // Determine fuel category
          let fuelCategory = 'gasoline';
          if (currentFuelType.includes('DIESEL')) {
            fuelCategory = 'diesel';
          } else if (currentFuelType.includes('KEROSENE')) {
            fuelCategory = 'kerosene';
          }
          
          // Create result entry
          const result = {
            commodity: currentFuelType,
            unit: 'per liter',
            price: price,
            source: SOURCE,
            region: region,
            date: date,
            fuelType: fuelCategory,
            brand: null,
            filename: null
          };
          
          results.push(result);
          
          if (debug) {
            console.log(`✓ Extracted: ${currentFuelType} - ${price} PHP/L`);
          }
        }
      }
      
      // Check if this line indicates the end of current fuel type data
      // (usually when we see another fuel type or empty line)
      if (line.match(/^(RON\s+\d+|DIESEL(?:\s+PLUS)?|KEROSENE|PROVINCE|CITY|MUNICIPALITY|PRODUCT)\s*$/i)) {
        currentFuelType = null;
      }
    }
  }
  
  return results;
}

async function parseDOEPDF(pdfPath, region, debug = false) {
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
  
  for (const [regionKey, regionName] of Object.entries(REGIONS)) {
    const regionPath = path.join(DOE_DIR, regionKey);
    
    if (fs.existsSync(regionPath)) {
      const files = fs.readdirSync(regionPath)
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .map(f => ({
          path: path.join(regionPath, f),
          filename: f,
          region: regionName
        }));
      
      pdfs.push(...files);
    }
  }
  
  return pdfs;
}

async function parseAllDOEPDFs(debug = false) {
  const pdfs = getAllPDFs();
  const allResults = [];
  
  console.log(`\n🚀 Starting DOE PDF parsing...`);
  console.log(`Found ${pdfs.length} PDF files to process`);
  
  for (const pdf of pdfs) {
    console.log(`\n📄 Processing: ${pdf.filename} (${pdf.region})`);
    
    try {
      const results = await parseDOEPDF(pdf.path, pdf.region, debug);
      console.log(`✅ Extracted ${results.length} price entries`);
      
      // Add filename info to results
      results.forEach(result => {
        result.filename = pdf.filename;
      });
      
      allResults.push(...results);
      
    } catch (err) {
      console.error(`❌ Error processing ${pdf.filename}: ${err.message}`);
    }
  }
  
  return allResults;
}

// Main execution
(async () => {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const specificFile = args.find(arg => !arg.startsWith('--'));
  
  try {
    let results;
    
    if (specificFile) {
      // Parse specific file
      const region = path.basename(path.dirname(specificFile));
      const regionName = REGIONS[region] || region;
      console.log(`\n📄 Processing specific file: ${specificFile}`);
      results = await parseDOEPDF(specificFile, regionName, debug);
    } else {
      // Parse all PDFs
      results = await parseAllDOEPDFs(debug);
    }
    
    console.log(`\n🎉 Parsing completed!`);
    console.log(`📊 Total entries found: ${results.length}`);
    
    if (results.length > 0) {
      // Group by region
      const byRegion = {};
      results.forEach(result => {
        if (!byRegion[result.region]) {
          byRegion[result.region] = [];
        }
        byRegion[result.region].push(result);
      });
      
      console.log(`\n📈 Results by region:`);
      for (const [region, entries] of Object.entries(byRegion)) {
        console.log(`  ${region}: ${entries.length} entries`);
      }
      
      // Show first 10 entries
      const first10 = results.slice(0, 10);
      console.log(`\n📋 First 10 entries:`);
      console.log(JSON.stringify(first10, null, 2));
      
      // Save to file
      const outputPath = path.join(OUTPUT_DIR, 'latest_prices_doe.json');
      try {
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`\n💾 Saved all ${results.length} entries to ${outputPath}`);
      } catch (err) {
        console.warn('Could not write output file:', err.message);
      }
      
      // Save by region
      for (const [region, entries] of Object.entries(byRegion)) {
        const regionOutputPath = path.join(OUTPUT_DIR, `latest_prices_doe_${region.toLowerCase()}.json`);
        try {
          fs.writeFileSync(regionOutputPath, JSON.stringify(entries, null, 2));
          console.log(`💾 Saved ${entries.length} entries for ${region} to ${regionOutputPath}`);
        } catch (err) {
          console.warn(`Could not write ${region} output file:`, err.message);
        }
      }
      
    } else {
      console.log('No entries found. Try running with --debug to see extraction details.');
      console.log('Usage: node doe_parser.js [path-to-pdf] [--debug]');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})(); 