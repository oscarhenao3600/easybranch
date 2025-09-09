const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');

// Test data availability
async function testDataAvailability() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Test businesses
        console.log('\n🧪 Testing businesses...');
        const businesses = await Business.find({});
        console.log(`✅ Found ${businesses.length} businesses`);
        
        businesses.forEach((business, index) => {
            console.log(`  ${index + 1}. ${business.name || business.razonSocial}`);
            console.log(`     - ID: ${business._id}`);
            console.log(`     - NIT: ${business.nit || 'No especificado'}`);
            console.log(`     - Phone: ${business.phone || 'No especificado'}`);
            console.log(`     - Address: ${business.address || 'No especificado'}`);
            console.log(`     - City: ${business.city || 'No especificado'}`);
            console.log(`     - Department: ${business.department || 'No especificado'}`);
            console.log(`     - Country: ${business.country || 'No especificado'}`);
            console.log(`     - Created: ${business.createdAt}`);
            console.log('');
        });
        
        // Test branches
        console.log('\n🧪 Testing branches...');
        const branches = await Branch.find({});
        console.log(`✅ Found ${branches.length} branches`);
        
        branches.forEach((branch, index) => {
            console.log(`  ${index + 1}. ${branch.name || branch.razonSocial}`);
            console.log(`     - ID: ${branch._id}`);
            console.log(`     - Business ID: ${branch.businessId}`);
            console.log(`     - Manager: ${branch.manager || 'No especificado'}`);
            console.log(`     - Phone: ${branch.phone || 'No especificado'}`);
            console.log(`     - Address: ${branch.address || 'No especificado'}`);
            console.log('');
        });
        
        console.log('🎉 Data availability test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error testing data availability:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    testDataAvailability()
        .then(() => {
            console.log('🎉 Data availability test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Data availability test failed:', error);
            process.exit(1);
        });
}

module.exports = { testDataAvailability };
