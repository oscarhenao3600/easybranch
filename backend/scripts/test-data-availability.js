const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Business = require('./src/models/Business');
const Branch = require('./src/models/Branch');

// Test script to verify data availability
async function testDataAvailability() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Test businesses
        const businesses = await Business.find({});
        console.log(`📊 Found ${businesses.length} businesses:`);
        
        businesses.forEach((business, index) => {
            console.log(`  ${index + 1}. ${business.name || business.razonSocial} (ID: ${business._id})`);
            console.log(`     - NIT: ${business.nit || 'N/A'}`);
            console.log(`     - Phone: ${business.phone || business.contact?.phone || 'N/A'}`);
            console.log(`     - Address: ${business.address || 'N/A'}`);
            console.log(`     - City: ${business.city || 'N/A'}`);
            console.log('');
        });
        
        // Test branches
        const branches = await Branch.find({});
        console.log(`🏪 Found ${branches.length} branches:`);
        
        branches.forEach((branch, index) => {
            console.log(`  ${index + 1}. ${branch.name || branch.razonSocial} (ID: ${branch._id})`);
            console.log(`     - Business ID: ${branch.businessId || 'N/A'}`);
            console.log(`     - Phone: ${branch.phone || branch.contact?.phone || 'N/A'}`);
            console.log(`     - Address: ${branch.address || 'N/A'}`);
            console.log('');
        });
        
        console.log('✅ Data availability test completed');
        
    } catch (error) {
        console.error('❌ Error testing data availability:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run test if called directly
if (require.main === module) {
    testDataAvailability()
        .then(() => {
            console.log('🎉 Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testDataAvailability };
