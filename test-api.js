const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'your-super-secret-admin-api-key-here';

const testAPI = async () => {
  console.log('🧪 Testing Philippine Market Price Tracker API\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data.status);
    console.log('   Uptime:', Math.round(healthResponse.data.uptime), 'seconds');
    console.log('   Environment:', healthResponse.data.environment);
    console.log('');

    // Test 2: Get All Commodities
    console.log('2. Testing Get All Commodities...');
    const commoditiesResponse = await axios.get(`${BASE_URL}/v1/commodities`);
    console.log('✅ Commodities Retrieved:', commoditiesResponse.data.data.length, 'commodities');
    console.log('   Categories:', [...new Set(commoditiesResponse.data.data.map(c => c.category))].join(', '));
    console.log('');

    // Test 3: Get Latest Prices
    console.log('3. Testing Get Latest Prices...');
    const pricesResponse = await axios.get(`${BASE_URL}/v1/prices/latest?limit=5`);
    console.log('✅ Latest Prices Retrieved:', pricesResponse.data.data.length, 'prices');
    console.log('   Total Available:', pricesResponse.data.meta.pagination.total);
    console.log('');

    // Test 4: Get Latest Prices with Region Filter
    console.log('4. Testing Get Latest Prices with Region Filter...');
    const regionPricesResponse = await axios.get(`${BASE_URL}/v1/prices/latest?region=Region+VII&limit=3`);
    console.log('✅ Region VII Prices Retrieved:', regionPricesResponse.data.data.length, 'prices');
    console.log('');

    // Test 5: Get Latest Prices with Category Filter
    console.log('5. Testing Get Latest Prices with Category Filter...');
    const categoryPricesResponse = await axios.get(`${BASE_URL}/v1/prices/latest?category=Vegetables&limit=3`);
    console.log('✅ Vegetable Prices Retrieved:', categoryPricesResponse.data.data.length, 'prices');
    console.log('');

    // Test 6: Get Specific Commodity Price (if commodities exist)
    if (commoditiesResponse.data.data.length > 0) {
      const firstCommodity = commoditiesResponse.data.data[0];
      console.log(`6. Testing Get Commodity Price for ${firstCommodity.name}...`);
      const commodityPriceResponse = await axios.get(`${BASE_URL}/v1/prices/${firstCommodity.id}`);
      console.log('✅ Commodity Price Retrieved:', commodityPriceResponse.data.data.price, commodityPriceResponse.data.data.unit);
      console.log('   Region:', commodityPriceResponse.data.data.region);
      console.log('   Date:', new Date(commodityPriceResponse.data.data.date).toLocaleDateString());
      console.log('');

      // Test 7: Get Price History
      console.log(`7. Testing Get Price History for ${firstCommodity.name}...`);
      const historyResponse = await axios.get(`${BASE_URL}/v1/prices/${firstCommodity.id}/history?limit=5`);
      console.log('✅ Price History Retrieved:', historyResponse.data.data.length, 'records');
      console.log('   Total History Records:', historyResponse.data.meta.pagination.total);
      console.log('');
    }

    // Test 8: Test Pagination
    console.log('8. Testing Pagination...');
    const paginationResponse = await axios.get(`${BASE_URL}/v1/prices/latest?limit=2&page=1`);
    console.log('✅ Pagination Test:');
    console.log('   Page:', paginationResponse.data.meta.pagination.page);
    console.log('   Limit:', paginationResponse.data.meta.pagination.limit);
    console.log('   Total Pages:', paginationResponse.data.meta.pagination.totalPages);
    console.log('   Has Next:', paginationResponse.data.meta.pagination.hasNext);
    console.log('   Has Prev:', paginationResponse.data.meta.pagination.hasPrev);
    console.log('');

    // Test 9: Test API Documentation
    console.log('9. Testing API Documentation...');
    try {
      const docsResponse = await axios.get(`${BASE_URL}/docs`);
      console.log('✅ API Documentation Available at:', `${BASE_URL}/docs`);
    } catch (error) {
      console.log('⚠️  API Documentation not accessible (this is normal if Swagger UI is not configured)');
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log(`📚 API Documentation: ${BASE_URL}/docs`);
    console.log(`🏥 Health Check: ${BASE_URL}/health`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 