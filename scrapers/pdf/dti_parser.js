const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const DEFAULT_DIR = path.join(__dirname, '../../pdf/DTI');
const OUTPUT_PATH = path.join(__dirname, '../../output/latest_prices_dti.json');

const DATE = '2025-02-01';
const SOURCE = 'DTI';
const REGION = 'National';

// More flexible regex patterns
const LINE_PATTERNS = [
  // Pattern 1: [commodity/brand] [unit] [price]
  /^(.*?)\s+(\d+(?:g|ml|pcs|L|kg))\s+(\d+\.\d{2})$/i,
  // Pattern 2: [commodity/brand] [price] [unit]
  /^(.*?)\s+(\d+\.\d{2})\s+(\d+(?:g|ml|pcs|L|kg))$/i,
  // Pattern 3: [commodity/brand] [unit] [price] (more flexible spacing)
  /^(.*?)\s+(\d+(?:g|ml|pcs|L|kg))\s+(\d+(?:\.\d{1,2})?)$/i,
  // Pattern 4: [commodity/brand] [price] (without unit)
  /^(.*?)\s+(\d+(?:\.\d{1,2})?)$/i
];

function getLatestPDF(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => ({ file: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);
  return files.length ? path.join(dir, files[0].file) : null;
}

async function parseDTIPDF(pdfPath, debug = false) {
  let dataBuffer;
  try {
    dataBuffer = fs.readFileSync(pdfPath);
  } catch (err) {
    throw new Error('Could not read PDF file: ' + err.message);
  }

  let pdfData;
  try {
    pdfData = await pdf(dataBuffer);
  } catch (err) {
    throw new Error('Could not parse PDF: ' + err.message);
  }

  if (debug) {
    console.log('=== EXTRACTED PDF TEXT (first 500 chars) ===');
    console.log(pdfData.text.substring(0, 500));
    console.log('=== END EXTRACTED TEXT ===\n');
  }

  const lines = pdfData.text.split('\n');
  const results = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    if (debug) {
      console.log('Processing line:', trimmed);
    }

    let match = null;
    let patternIndex = -1;

    // Try each pattern
    for (let i = 0; i < LINE_PATTERNS.length; i++) {
      match = trimmed.match(LINE_PATTERNS[i]);
      if (match) {
        patternIndex = i;
        break;
      }
    }

    if (match) {
      let commodity, unit, price;

      if (patternIndex === 0) {
        // Pattern 1: [commodity] [unit] [price]
        [, commodity, unit, price] = match;
      } else if (patternIndex === 1) {
        // Pattern 2: [commodity] [price] [unit]
        [, commodity, price, unit] = match;
      } else if (patternIndex === 2) {
        // Pattern 3: [commodity] [unit] [price] (flexible)
        [, commodity, unit, price] = match;
      } else if (patternIndex === 3) {
        // Pattern 4: [commodity] [price] (no unit)
        [, commodity, price] = match;
        unit = 'unit'; // Default unit
      }

      // Clean up commodity name
      commodity = commodity.trim().replace(/\s+/g, ' ');
      
      // Skip if commodity is too short or looks like a header
      if (commodity.length < 2 || 
          commodity.toLowerCase().includes('page') ||
          commodity.toLowerCase().includes('srp') ||
          commodity.toLowerCase().includes('bulletin')) {
        continue;
      }

      results.push({
        commodity: commodity,
        unit: unit ? unit.trim() : 'unit',
        price: parseFloat(price),
        source: SOURCE,
        region: REGION,
        date: DATE
      });

      if (debug) {
        console.log('✓ Matched:', { commodity, unit, price });
      }
    }
  }

  return results;
}

(async () => {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  let pdfPath = args.find(arg => !arg.startsWith('--'));
  
  if (!pdfPath) {
    pdfPath = getLatestPDF(DEFAULT_DIR);
    if (!pdfPath) {
      console.error('No PDF file provided and no PDF found in', DEFAULT_DIR);
      console.error('Usage: node dti_parser.js <path-to-pdf> [--debug]');
      process.exit(1);
    } else {
      console.log('No PDF argument provided. Using latest PDF in', DEFAULT_DIR, '\nFile:', pdfPath);
    }
  }

  try {
    const entries = await parseDTIPDF(pdfPath, debug);
    console.log(`\nFound ${entries.length} price entries`);
    
    if (entries.length === 0) {
      console.log('No entries found. Try running with --debug to see extracted text.');
      console.log('Usage: node dti_parser.js <path-to-pdf> --debug');
    } else {
      const first10 = entries.slice(0, 10);
      console.log('\nFirst 10 entries:');
      console.log(JSON.stringify(first10, null, 2));
      
      // Save to file
      try {
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(first10, null, 2));
        console.log(`\nSaved first 10 entries to ${OUTPUT_PATH}`);
      } catch (err) {
        console.warn('Could not write output file:', err.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})(); 