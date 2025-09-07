const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const Business = require('../src/models/Business');

// Test authentication script
async function testAuthentication() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Find super admin user
        const superAdmin = await User.findOne({ role: 'super_admin' });
        
        if (!superAdmin) {
            console.log('❌ No super admin user found');
            return;
        }
        
        console.log('✅ Super admin user found:', superAdmin.email);
        
        // Generate token
        const token = jwt.sign(
            { 
                userId: superAdmin._id, 
                email: superAdmin.email, 
                role: superAdmin.role 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        console.log('✅ Token generated:', token.substring(0, 50) + '...');
        
        // Test business endpoint
        const businesses = await Business.find({});
        console.log(`✅ Found ${businesses.length} businesses in database`);
        
        businesses.forEach((business, index) => {
            console.log(`  ${index + 1}. ${business.name || business.razonSocial} (ID: ${business._id})`);
        });
        
        console.log('\n🔑 Test Token for frontend:');
        console.log(token);
        console.log('\n📋 Instructions:');
        console.log('1. Open browser DevTools (F12)');
        console.log('2. Go to Console tab');
        console.log('3. Run: localStorage.setItem("token", "' + token + '")');
        console.log('4. Refresh the page');
        
    } catch (error) {
        console.error('❌ Error testing authentication:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run test if called directly
if (require.main === module) {
    testAuthentication()
        .then(() => {
            console.log('🎉 Authentication test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Authentication test failed:', error);
            process.exit(1);
        });
}

module.exports = { testAuthentication };
