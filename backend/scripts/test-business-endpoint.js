const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import services
const TokenService = require('../src/services/TokenService');
const User = require('../src/models/User');

// Test authentication with business endpoint
async function testBusinessEndpoint() {
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
        console.log('👤 User role:', superAdmin.role);
        console.log('🆔 User ID:', superAdmin.userId);
        
        // Generate fresh token
        console.log('\n🧪 Generating fresh token...');
        const token = tokenService.generateFreshToken(superAdmin);
        console.log('✅ Token generated:', token.substring(0, 50) + '...');
        
        // Decode token to verify payload
        const decoded = jwt.decode(token);
        console.log('📋 Token payload:', {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            jti: decoded.jti
        });
        
        // Test token verification
        console.log('\n🧪 Testing token verification...');
        const verification = tokenService.verifyToken(token);
        if (verification.success) {
            console.log('✅ Token verification successful');
            console.log('👤 Verified user role:', verification.payload.role);
        } else {
            console.log('❌ Token verification failed:', verification.error);
        }
        
        console.log('\n🔑 Final Token for testing:');
        console.log(token);
        
        console.log('\n📋 Test with curl:');
        console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:4000/api/business`);
        
    } catch (error) {
        console.error('❌ Error testing business endpoint:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    testBusinessEndpoint()
        .then(() => {
            console.log('🎉 Business endpoint test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Business endpoint test failed:', error);
            process.exit(1);
        });
}

module.exports = { testBusinessEndpoint };
