# Philippine Market Price Tracker API

A production-grade REST API built with Express.js and PostgreSQL for tracking daily prices of commodities in the Philippines, featuring automated web scrapers for real-time data collection.

## 🚀 Features

- **Commodity Management**: Track various commodities like rice, fuel, vegetables
- **Price Tracking**: Daily price updates with regional variations
- **Automated Scrapers**: HTML and PDF scrapers for DTI and DA data sources
- **Filtering & Pagination**: Advanced querying with region, category, and date filters
- **Admin Interface**: Secure admin endpoints for price data management
- **Rate Limiting**: Built-in rate limiting for API protection
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Scheduled Scraping**: Daily automated data collection at 7:00 AM
- **Comprehensive Testing**: Full test coverage with Jest
- **Production Ready**: Deployable to Railway, Render, or Supabase

## 📋 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/commodities` | Get all commodities |
| `GET` | `/v1/prices/latest` | Get latest prices with filters |
| `GET` | `/v1/prices/:commodity_id` | Get latest price for specific commodity |
| `GET` | `/v1/prices/:commodity_id/history` | Get price history for commodity |

### DA Price Range Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/prices/da/ranges` | Get all DA price ranges |
| `GET` | `/v1/prices/da/ranges/:region` | Get DA price ranges by region |
| `GET` | `/v1/prices/da/markets/:market` | Get DA price ranges by market |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/admin/prices` | Create new price data (requires API key) |
| `POST` | `/v1/admin/scrape` | Run all scrapers manually (requires API key) |
| `GET` | `/v1/admin/scrape/status` | Get scraper status and schedule (requires API key) |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check for monitoring |
| `GET` | `/docs` | API documentation |

## 🔁 Scraper System

The application includes automated scrapers that collect price data from official sources:

### HTML Scraper (DTI)
- **File**: `scrapers/dti_scraper.js`
- **Source**: Department of Trade and Industry website
- **Technology**: Axios + Cheerio for HTML parsing
- **Features**: Table extraction, data normalization, error handling

### PDF Scraper (DA)
- **File**: `scrapers/da_scraper.js`
- **Source**: Department of Agriculture PDF reports
- **Technology**: Axios + pdf-parse for PDF extraction
- **Features**: Text parsing, regex matching, multi-line detection

### DA PDF Parser
- **File**: `scrapers/pdf/da_parser.js`
- **Source**: Department of Agriculture PDF reports from bantaypresyo
- **Features**: Multi-region support (NCR, RX, etc.), price range extraction, market-specific data
- **Output**: JSON files with price ranges and market information

### Scraper Orchestrator
- **File**: `scrapers/run_all.js`
- **Features**: Runs all scrapers, saves to database, outputs JSON files
- **Output**: `output/latest_prices.json` and timestamped files

### Scheduling
- **Automatic**: Daily at 7:00 AM Philippine time
- **Manual**: Via `/v1/admin/scrape` endpoint
- **Configuration**: Cron scheduling in `index.js`

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### 1. Clone and Install

```bash
git clone <repository-url>
cd ph-price-tracker-api
npm install
```

### 2. Environment Configuration

Copy the environment example file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/ph_price_tracker"

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
ADMIN_API_KEY="your-super-secret-admin-api-key-here"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📊 Database Schema

### Commodities Table
- `id` (string, PK)
- `name` (string, unique)
- `category` (string)
- `slug` (string, unique)
- `createdAt` (datetime)
- `updatedAt` (datetime)

### Prices Table
- `id` (string, PK)
- `commodityId` (FK → commodities)
- `price` (decimal)
- `unit` (string)
- `region` (string)
- `source` (string)
- `date` (date)
- `createdAt` (datetime)
- `updatedAt` (datetime)

**Unique Constraint**: `commodityId + region + date` to prevent duplicates

## 🔧 API Usage Examples

### Get All Commodities

```bash
curl http://localhost:3000/v1/commodities
```

### Get Latest Prices with Filters

```bash
# All latest prices
curl http://localhost:3000/v1/prices/latest

# Filter by region
curl "http://localhost:3000/v1/prices/latest?region=Region+VII"

# Filter by category
curl "http://localhost:3000/v1/prices/latest?category=Vegetables"

# Limit results
curl "http://localhost:3000/v1/prices/latest?limit=10"
```

### Get Price History

```bash
curl "http://localhost:3000/v1/prices/{commodity_id}/history?region=Region+VII&limit=30"
```

### Create New Price (Admin)

```bash
curl -X POST http://localhost:3000/v1/admin/prices \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{
    "commodityId": "commodity_id_here",
    "price": 45.50,
    "unit": "per kg",
    "region": "Region VII",
    "source": "DTI",
    "date": "2024-01-15"
  }'
```

### Run Scrapers Manually (Admin)

```bash
curl -X POST http://localhost:3000/v1/admin/scrape \
  -H "x-api-key: your-admin-api-key"
```

### Get Scraper Status (Admin)

```bash
curl http://localhost:3000/v1/admin/scrape/status \
  -H "x-api-key: your-admin-api-key"
```

### DA Price Range API Endpoints

The DA price range endpoints provide access to parsed price range data from Department of Agriculture PDF reports, including market-specific pricing and regional variations.

**1. Get All DA Price Ranges**
```
GET http://localhost:3000/v1/prices/da/ranges?limit=10&page=1
```

**2. Get DA Price Ranges by Region**
```
GET http://localhost:3000/v1/prices/da/ranges/NCR?limit=20
GET http://localhost:3000/v1/prices/da/ranges/RX?limit=15
```

**3. Get DA Price Ranges by Market**
```
GET http://localhost:3000/v1/prices/da/markets/Balintawak?limit=5
GET http://localhost:3000/v1/prices/da/markets/Cartimar?limit=10
```

### DA Price Range Response Format

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "commodity": "Rice at Balintawak (Cloverleaf) Market",
      "unit": "per kg",
      "minPrice": 45,
      "maxPrice": 48,
      "averagePrice": 46.5,
      "source": "DA",
      "region": "NCR",
      "date": "2025-06-26",
      "category": "rice",
      "hasRange": true,
      "filename": "Price-Monitoring-June-26-2025.pdf",
      "market": "Balintawak (Cloverleaf) Market"
    }
  ],
  "meta": {
    "timestamp": "2025-06-28T06:35:47.252Z",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 434,
      "totalPages": 44,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Available DA Data

- **NCR Region**: 434 price range entries from various markets
- **RX Region**: 86 price range entries with commodity categories
- **Markets**: Balintawak, Cartimar, Bicutan, Commonwealth, Guadalupe, etc.
- **Categories**: Rice, Meat, Vegetables, Fruits, etc.
- **Features**: Price ranges (min/max/average), market-specific data, regional variations

### Query Parameters for DA Endpoints

- `limit`: Number of results (default: 50, max: 100)
- `page`: Page number for pagination (default: 1)

### Postman Collection for DA Price Ranges

Create a new collection in Postman with these requests:

**Collection: "PH Price Tracker - DA Ranges"**

1. **All DA Ranges**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/ranges`
   - Headers: `Content-Type: application/json`

2. **NCR Ranges**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/ranges/NCR`
   - Headers: `Content-Type: application/json`

3. **RX Ranges**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/ranges/RX`
   - Headers: `Content-Type: application/json`

4. **Market Search**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/markets/Balintawak`
   - Headers: `Content-Type: application/json`

### Query Parameters for Filtering

- `limit`: Number of results (default: 20, max: 100)
- `page`: Page number for pagination
- `region`: Filter by region (e.g., "Region VII", "NCR")
- `category`: Filter by commodity category (e.g., "Vegetables", "Fuel")
- `source`: Filter by data source (e.g., "DTI", "DA")
- `date`: Filter by specific date (YYYY-MM-DD format)

## 📊 How to Get Data

This section explains how to retrieve data from the API and how to parse PDF files for new data.

### 🚀 Getting Data via API (Postman/curl)

#### **Base Configuration**
- **Base URL**: `http://localhost:3000`
- **API Documentation**: `http://localhost:3000/docs/`
- **Health Check**: `http://localhost:3000/health`

#### **Testing with Postman**

1. **Open Postman** and create a new collection
2. **Set the base URL** to `http://localhost:3000`
3. **For admin endpoints**, add this header:
   ```
   x-api-key: dev-admin-api-key-12345
   ```

#### **Essential API Endpoints**

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/v1/commodities` | GET | Get all commodities | No |
| `/v1/prices/latest` | GET | Get latest prices | No |
| `/v1/prices/{id}` | GET | Get specific commodity price | No |
| `/v1/prices/{id}/history` | GET | Get price history | No |
| `/v1/admin/prices` | POST | Add new price data | Yes |
| `/health` | GET | Health check | No |
| `/docs/` | GET | API documentation | No |

#### **Example Postman Requests**

**1. Get All Commodities**
```
GET http://localhost:3000/v1/commodities
```

**2. Get Latest Prices (with filters)**
```
GET http://localhost:3000/v1/prices/latest?limit=10&region=Region+VII
```

**3. Add New Price Data (Admin)**
```
POST http://localhost:3000/v1/admin/prices
Headers:
  x-api-key: dev-admin-api-key-12345
  Content-Type: application/json

Body:
{
  "commodityId": "cmcefmket0000k40xu0lpc2mk",
  "price": 45.50,
  "unit": "per kg",
  "region": "National",
  "source": "DTI",
  "date": "2025-02-01"
}
```

#### **DA Price Range API Endpoints**

The DA price range endpoints provide access to parsed price range data from Department of Agriculture PDF reports, including market-specific pricing and regional variations.

**1. Get All DA Price Ranges**
```
GET http://localhost:3000/v1/prices/da/ranges?limit=10&page=1
```

**2. Get DA Price Ranges by Region**
```
GET http://localhost:3000/v1/prices/da/ranges/NCR?limit=20
GET http://localhost:3000/v1/prices/da/ranges/RX?limit=15
```

**3. Get DA Price Ranges by Market**
```
GET http://localhost:3000/v1/prices/da/markets/Balintawak?limit=5
GET http://localhost:3000/v1/prices/da/markets/Cartimar?limit=10
```

#### **DA Price Range Response Format**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "commodity": "Rice at Balintawak (Cloverleaf) Market",
      "unit": "per kg",
      "minPrice": 45,
      "maxPrice": 48,
      "averagePrice": 46.5,
      "source": "DA",
      "region": "NCR",
      "date": "2025-06-26",
      "category": "rice",
      "hasRange": true,
      "filename": "Price-Monitoring-June-26-2025.pdf",
      "market": "Balintawak (Cloverleaf) Market"
    }
  ],
  "meta": {
    "timestamp": "2025-06-28T06:35:47.252Z",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 434,
      "totalPages": 44,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### **Available DA Data**

- **NCR Region**: 434 price range entries from various markets
- **RX Region**: 86 price range entries with commodity categories
- **Markets**: Balintawak, Cartimar, Bicutan, Commonwealth, Guadalupe, etc.
- **Categories**: Rice, Meat, Vegetables, Fruits, etc.
- **Features**: Price ranges (min/max/average), market-specific data, regional variations

#### **Query Parameters for DA Endpoints**

- `limit`: Number of results (default: 50, max: 100)
- `page`: Page number for pagination (default: 1)

#### **Postman Collection for DA Price Ranges**

Create a new collection in Postman with these requests:

**Collection: "PH Price Tracker - DA Ranges"**

1. **All DA Ranges**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/ranges`
   - Headers: `Content-Type: application/json`

2. **NCR Ranges**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/ranges/NCR`
   - Headers: `Content-Type: application/json`

3. **RX Ranges**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/ranges/RX`
   - Headers: `Content-Type: application/json`

4. **Market Search**
   - Method: `GET`
   - URL: `http://localhost:3000/v1/prices/da/markets/Balintawak`
   - Headers: `Content-Type: application/json`

#### **Query Parameters for Filtering**

- `limit`: Number of results (default: 20, max: 100)
- `page`: Page number for pagination
- `region`: Filter by region (e.g., "Region VII", "NCR")
- `category`: Filter by commodity category (e.g., "Vegetables", "Fuel")
- `source`: Filter by data source (e.g., "DTI", "DA")
- `date`: Filter by specific date (YYYY-MM-DD format)

### 📄 Getting Data via PDF Parser

The PDF parser extracts structured price data from government bulletins and outputs JSON format.

#### **PDF Directory Structure**
```
pdf/
├── DA/     # Department of Agriculture PDFs
├── DOE/    # Department of Energy PDFs
└── DTI/    # Department of Trade and Industry PDFs
```

#### **How to Use the PDF Parser**

**1. Place PDF Files**
- Put your PDF files in the appropriate department folder
- Example: `pdf/DTI/BNPC_SRP_BULLETIN_01_FEBRUARY_2025.pdf`

**2. Run the Parser**
```bash
# Parse the latest DTI PDF automatically
node scrapers/pdf/dti_parser.js

# Parse a specific PDF file
node scrapers/pdf/dti_parser.js pdf/DTI/your_file.pdf

# Run with debug mode to see extraction details
node scrapers/pdf/dti_parser.js --debug
```

**3. Check the Output**
- **Console**: Shows the first 10 extracted entries
- **File**: `output/latest_prices_dti.json` contains the parsed data

#### **DA PDF Parser Usage**

The DA PDF parser extracts price ranges from Department of Agriculture bantaypresyo reports, supporting multiple regions and market-specific data.

**1. Directory Structure**
```
pdf/DA/bantaypresyo/
├── ncr/     # NCR region PDFs
├── rx/      # RX region PDFs
└── [future regions]/
```

**2. Run the DA Parser**
```bash
# Parse all DA PDFs from all regions
node scrapers/pdf/da_parser.js

# Parse a specific PDF file
node scrapers/pdf/da_parser.js pdf/DA/bantaypresyo/ncr/Price-Monitoring-June-26-2025.pdf

# Run with debug mode to see extraction details
node scrapers/pdf/da_parser.js --debug
```

**3. Check the Output**
- **Console**: Shows extraction summary and sample data
- **Files**: 
  - `output/latest_price_ranges_da.json` - All DA price ranges
  - `output/latest_price_ranges_da_ncr.json` - NCR region only
  - `output/latest_price_ranges_da_rx.json` - RX region only

**4. DA Parser Features**
- **Multi-region support**: Automatically detects and processes different regions
- **Price range extraction**: Extracts min/max/average prices
- **Market association**: Links prices to specific markets
- **Commodity categorization**: Categorizes commodities (rice, meat, etc.)
- **Date extraction**: Extracts dates from filenames
- **Flexible parsing**: Handles different PDF formats per region

#### **Parser Output Format**
```json
[
  {
    "commodity": "Argentina Sardines",
    "unit": "150g",
    "price": 23.75,
    "source": "DTI",
    "region": "National",
    "date": "2025-02-01"
  }
]
```

**DA Parser Output Format**
```json
[
  {
    "commodity": "Rice at Balintawak (Cloverleaf) Market",
    "unit": "per kg",
    "minPrice": 45,
    "maxPrice": 48,
    "averagePrice": 46.5,
    "source": "DA",
    "region": "NCR",
    "date": "2025-06-26",
    "category": "rice",
    "hasRange": true,
    "filename": "Price-Monitoring-June-26-2025.pdf",
    "market": "Balintawak (Cloverleaf) Market"
  }
]
```

#### **Troubleshooting the Parser**

**If no entries are found:**
1. Run with debug mode: `node scrapers/pdf/dti_parser.js --debug`
2. Check the extracted text to see if the PDF format is different
3. The parser uses regex patterns to match: `[commodity] [unit] [price]`

**Common PDF Format Issues:**
- Text extraction problems (try a different PDF)
- Different date formats (update the DATE constant in parser)
- Different unit formats (update regex patterns)

#### **Troubleshooting the DA Parser**

**If no entries are found:**
1. Run with debug mode: `node scrapers/pdf/da_parser.js --debug`
2. Check if PDFs are in the correct directory structure: `pdf/DA/bantaypresyo/{region}/`
3. Verify PDF contains price range data (some PDFs may not have ranges)

**Common DA Parser Issues:**
- **No markets detected**: Check if market names are in the MARKET_NAMES array
- **Date extraction fails**: Update date patterns in `extractDateFromFilename()`
- **Price range parsing issues**: Different PDF formats may need pattern updates
- **Region not recognized**: Add new regions to the REGIONS mapping

**DA Parser Debug Output:**
```bash
# Shows extracted text and parsing process
node scrapers/pdf/da_parser.js --debug

# Shows first 500 characters of extracted text
# Shows line-by-line parsing process
# Shows detected markets and price ranges
```

#### **Creating Parsers for Other Departments**

**For DA (Department of Agriculture):**
```bash
# Create a new parser
cp scrapers/pdf/dti_parser.js scrapers/pdf/da_parser.js
# Edit the parser to match DA PDF format
```

**For DOE (Department of Energy):**
```bash
# Create a new parser
cp scrapers/pdf/dti_parser.js scrapers/pdf/doe_parser.js
# Edit the parser to match DOE PDF format
```

### 🔄 Integrating Parser Data with API

**Option 1: Manual Import**
1. Run the parser: `node scrapers/pdf/dti_parser.js`
2. Review the output in `output/latest_prices_dti.json`
3. Use Postman to POST each entry to `/v1/admin/prices`

**Option 2: Automated Import (Future Enhancement)**
- Create a script that reads parser output and automatically inserts into database
- Add a new API endpoint for bulk import

### 📋 Data Flow Summary

```
PDF Files → Parser → JSON Output → API → Database → Frontend/Mobile Apps
    ↓           ↓           ↓         ↓         ↓
  Manual    Command    Review    Postman    HTTP
  Upload    Line      Output    Requests   Endpoints
```

### 🧪 Testing Your Data Retrieval

**1. Test API Health**
```bash
curl http://localhost:3000/health
```

**2. Test Commodities Endpoint**
```bash
curl http://localhost:3000/v1/commodities
```

**3. Test Parser**
```bash
node scrapers/pdf/dti_parser.js --debug
```

**4. Test Complete Flow**
1. Run parser on a PDF
2. Check output file
3. Use Postman to add data to API
4. Verify data appears in API responses

**5. Test DA Price Range Endpoints**
```bash
# Test all DA price ranges
curl http://localhost:3000/v1/prices/da/ranges?limit=5

# Test NCR region
curl http://localhost:3000/v1/prices/da/ranges/NCR?limit=3

# Test RX region
curl http://localhost:3000/v1/prices/da/ranges/RX?limit=3

# Test market search
curl http://localhost:3000/v1/prices/da/markets/Balintawak?limit=2
```

**6. Test DA Parser**
```bash
# Test DA parser
node scrapers/pdf/da_parser.js --debug

# Check output files
ls -la output/latest_price_ranges_da*.json
```

### 📚 Additional Resources

- **API Documentation**: Visit `http://localhost:3000/docs/` for interactive API docs
- **Database Management**: Use `npm run db:studio` to view/edit database directly
- **Logs**: Check console output for detailed error messages
- **Tests**: Run `npm test` to verify all functionality works correctly

## 🧪 Testing

The application includes comprehensive test coverage:

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Test Categories

- **API Tests** (`tests/api.test.js`): Endpoint testing with Supertest
- **Utility Tests** (`tests/utils.test.js`): Price normalization and data cleaning
- **Scraper Tests** (`tests/scrapers.test.js`): HTML/PDF parsing and data extraction

### Test Features

- ✅ All API endpoints tested
- ✅ Error cases and edge conditions
- ✅ Authentication and authorization
- ✅ Rate limiting validation
- ✅ Data validation and normalization
- ✅ Scraper functionality with mocks
- ✅ Database operations with test isolation

## 🔁 Scraper Commands

### Run Scrapers

```bash
# Run all scrapers and save to database
npm run scrape

# Run scrapers manually (same as above)
npm run scrape:manual

# Run scrapers without saving to database
node scrapers/run_all.js --no-db

# Run scrapers without output files
node scrapers/run_all.js --no-file

# Run DA PDF parser specifically
node scrapers/pdf/da_parser.js

# Run DA parser with debug mode
node scrapers/pdf/da_parser.js --debug

# Run DA parser on specific file
node scrapers/pdf/da_parser.js pdf/DA/bantaypresyo/ncr/your_file.pdf
```

### Scraper Output

Scrapers generate JSON files in the `output/` directory:

- `latest_prices.json` - Most recent scraping results
- `dti_scraper_YYYY-MM-DD.json` - DTI scraper results by date
- `da_scraper_YYYY-MM-DD.json` - DA scraper results by date
- `latest_prices_YYYY-MM-DD.json` - Combined results by date

**DA Parser Output Files:**
- `latest_price_ranges_da.json` - All DA price ranges
- `latest_price_ranges_da_ncr.json` - NCR region price ranges
- `latest_price_ranges_da_rx.json` - RX region price ranges
- `latest_prices_da_ncr.json` - NCR region single prices
- `latest_prices_da_rx.json` - RX region single prices

## 🚀 **Quick Deploy**

### **DigitalOcean (Recommended - Most Cost-Effective)**
```bash
# Automated deployment script
npm run deploy:digitalocean
```
**Cost:** $6-27/month | **Setup:** 5 minutes

### **Docker (Alternative)**
```bash
# One-command deployment
npm run deploy:docker
```

### **Other Platforms**
- **Railway**: `npm run deploy:railway` ($5-20/month)
- **Render**: Connect GitHub repo ($7-25/month)
- **Heroku**: `npm run deploy:heroku` ($7-25/month)

📖 **Full deployment guide**: [docs/deployment.md](docs/deployment.md)  
⚡ **Quick reference**: [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔒 Security Features

- **Rate Limiting**: Configurable rate limits for public and admin routes
- **API Key Authentication**: Required for admin endpoints
- **CORS Protection**: Configurable allowed origins
- **Helmet Security**: HTTP security headers
- **Input Validation**: Request validation using express-validator
- **Error Handling**: Comprehensive error handling with proper HTTP status codes

## 📈 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "scrapers": {
    "lastRun": "2024-01-15T07:00:00.000Z",
    "nextRun": "2024-01-16T07:00:00.000Z"
  }
}
```

### Logging

The API logs all requests with timestamps for monitoring and debugging.

## 🧪 Development

### Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with nodemon
npm test               # Run all tests
npm run test:coverage  # Run tests with coverage report
npm run test:watch     # Run tests in watch mode
npm run scrape         # Run all scrapers
npm run scrape:manual  # Run scrapers manually
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes to database
npm run db:seed        # Seed database with sample data
npm run db:studio      # Open Prisma Studio for database management
npm run setup          # Run setup script
```

### Database Management

```bash
# View database in browser
npm run db:studio

# Reset and reseed database
npm run db:push
npm run db:seed
```

### Scraper Development

```bash
# Test individual scrapers
node scrapers/dti_scraper.js
node scrapers/da_scraper.js

# Run scrapers with different options
node scrapers/run_all.js --no-db --no-file
```

## 📚 API Documentation

Interactive API documentation is available at `/docs` when the server is running. This provides:

- Complete endpoint documentation
- Request/response examples
- Interactive testing interface
- OpenAPI specification

## 📁 Project Structure

```
ph-price-tracker-api/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # API controllers
│   ├── database/        # Database seed files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   └── utils/           # Utility functions
├── scrapers/            # Web scraping modules
│   ├── dti_scraper.js   # DTI HTML scraper
│   ├── da_scraper.js    # DA PDF scraper
│   └── run_all.js       # Scraper orchestrator
├── tests/               # Test files
│   ├── api.test.js      # API endpoint tests
│   ├── utils.test.js    # Utility function tests
│   └── scrapers.test.js # Scraper tests
├── output/              # Scraper output files
├── prisma/              # Database schema
├── index.js             # Main application entry
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and ensure they pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the API documentation at `/docs`
- Review the health endpoint at `/health`
- Check server logs for error details
- Run tests to verify functionality: `npm test` 