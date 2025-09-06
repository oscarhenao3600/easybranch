const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import services
const TokenService = require('../src/services/TokenService');
const User = require('../src/models/User');
const Business = require('../src/models/Business');

// Test API response
async function testAPIResponse() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Initialize TokenService
        const tokenService = new TokenService();
        
        // Find super admin user
        const superAdmin = await User.findOne({ role: 'super_admin' });
        
        if (!superAdmin) {
            console.log('❌ No super admin user found');
            return;
        }
        
        console.log('✅ Super admin user found:', superAdmin.email);
        
        // Generate fresh token
        const token = tokenService.generateFreshToken(superAdmin);
        console.log('✅ Token generated:', token.substring(0, 50) + '...');
        
        // Test business query directly
        console.log('\n🧪 Testing business query...');
        const businesses = await Business.find({});
        console.log(`✅ Found ${businesses.length} businesses in database`);
        
        // Simulate API response
        const apiResponse = {
            success: true,
            data: businesses,
            pagination: {
                page: 1,
                limit: 10,
                total: businesses.length,
                pages: 1
            }
        };
        
        console.log('\n📋 API Response simulation:');
        console.log(JSON.stringify(apiResponse, null, 2));
        
        // Test individual business data
        console.log('\n🧪 Testing individual business data...');
        businesses.forEach((business, index) => {
            console.log(`\nBusiness ${index + 1}:`);
            console.log(`  Name: ${business.name || business.razonSocial || 'No name'}`);
            console.log(`  Razon Social: ${business.razonSocial || 'No especificado'}`);
            console.log(`  NIT: ${business.nit || 'No especificado'}`);
            console.log(`  Phone: ${business.phone || 'No especificado'}`);
            console.log(`  Address: ${business.address || 'No especificado'}`);
            console.log(`  City: ${business.city || 'No especificado'}`);
            console.log(`  Department: ${business.department || 'No especificado'}`);
            console.log(`  Country: ${business.country || 'No especificado'}`);
            console.log(`  Description: ${business.description || 'No especificado'}`);
            console.log(`  Created: ${business.createdAt}`);
        });
        
        console.log('\n🔑 Token for frontend testing:');
        console.log(token);
        
    } catch (error) {
        console.error('❌ Error testing API response:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    testAPIResponse()
        .then(() => {
            console.log('🎉 API response test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 API response test failed:', error);
            process.exit(1);
        });
}

module.exports = { testAPIResponse };
