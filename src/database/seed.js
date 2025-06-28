const prisma = require('../config/database');

const commodities = [
  {
    name: 'Rice',
    category: 'Grains',
    slug: 'rice'
  },
  {
    name: 'Red Onion',
    category: 'Vegetables',
    slug: 'red-onion'
  },
  {
    name: 'Diesel',
    category: 'Fuel',
    slug: 'diesel'
  },
  {
    name: 'Tomato',
    category: 'Vegetables',
    slug: 'tomato'
  },
  {
    name: 'Pork',
    category: 'Meat',
    slug: 'pork'
  },
  {
    name: 'Chicken',
    category: 'Meat',
    slug: 'chicken'
  },
  {
    name: 'Gasoline',
    category: 'Fuel',
    slug: 'gasoline'
  }
];

const regions = ['Region VII', 'NCR', 'Region IV-A', 'Region III'];

const sources = ['DTI', 'DA', 'DOE', 'Local Market'];

const generatePriceData = (createdCommodities) => {
  const prices = [];
  const today = new Date();
  
  createdCommodities.forEach(commodity => {
    regions.forEach(region => {
      // Generate price data for the last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate realistic price variations
        let basePrice;
        let unit;
        
        switch (commodity.name) {
          case 'Rice':
            basePrice = 45 + Math.random() * 10; // 45-55 PHP per kg
            unit = 'per kg';
            break;
          case 'Red Onion':
            basePrice = 80 + Math.random() * 40; // 80-120 PHP per kg
            unit = 'per kg';
            break;
          case 'Diesel':
            basePrice = 60 + Math.random() * 5; // 60-65 PHP per liter
            unit = 'per liter';
            break;
          case 'Tomato':
            basePrice = 40 + Math.random() * 30; // 40-70 PHP per kg
            unit = 'per kg';
            break;
          case 'Pork':
            basePrice = 280 + Math.random() * 40; // 280-320 PHP per kg
            unit = 'per kg';
            break;
          case 'Chicken':
            basePrice = 160 + Math.random() * 30; // 160-190 PHP per kg
            unit = 'per kg';
            break;
          case 'Gasoline':
            basePrice = 65 + Math.random() * 5; // 65-70 PHP per liter
            unit = 'per liter';
            break;
          default:
            basePrice = 50 + Math.random() * 20;
            unit = 'per unit';
        }
        
        // Add some regional variation
        const regionalMultiplier = 0.9 + (Math.random() * 0.2); // ±10% variation
        const finalPrice = Math.round((basePrice * regionalMultiplier) * 100) / 100;
        
        prices.push({
          commodityId: commodity.id, // Now using the actual commodity ID from database
          price: finalPrice,
          unit,
          region,
          source: sources[Math.floor(Math.random() * sources.length)],
          date
        });
      }
    });
  });
  
  return prices;
};

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.price.deleteMany();
    await prisma.commodity.deleteMany();
    
    // Create commodities
    console.log('📦 Creating commodities...');
    const createdCommodities = [];
    for (const commodity of commodities) {
      const created = await prisma.commodity.create({
        data: commodity
      });
      createdCommodities.push(created);
      console.log(`✅ Created commodity: ${created.name} (ID: ${created.id})`);
    }
    
    // Generate and create price data using the created commodities
    console.log('💰 Generating price data...');
    const priceData = generatePriceData(createdCommodities);
    
    // Create prices in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < priceData.length; i += batchSize) {
      const batch = priceData.slice(i, i + batchSize);
      await prisma.price.createMany({
        data: batch,
        skipDuplicates: true
      });
      console.log(`✅ Created batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(priceData.length / batchSize)}`);
    }
    
    console.log('🎉 Database seeding completed successfully!');
    console.log(`📊 Created ${createdCommodities.length} commodities`);
    console.log(`💰 Created ${priceData.length} price records`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = { seed }; 