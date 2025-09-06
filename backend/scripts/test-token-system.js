const mongoose = require('mongoose');
require('dotenv').config();

// Import services
const TokenService = require('../src/services/TokenService');
const User = require('../src/models/User');

// Test the new token system
async function testTokenSystem() {
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
        
        // Test 1: Generate fresh token
        console.log('\n🧪 Test 1: Generating fresh token...');
        const freshToken = tokenService.generateFreshToken(superAdmin);
        console.log('✅ Fresh token generated:', freshToken.substring(0, 50) + '...');
        
        // Test 2: Verify token
        console.log('\n🧪 Test 2: Verifying token...');
        const verification = tokenService.verifyToken(freshToken);
        if (verification.success) {
            console.log('✅ Token verification successful');
            console.log('📋 Token payload:', verification.payload);
        } else {
            console.log('❌ Token verification failed:', verification.error);
        }
        
        // Test 3: Process login
        console.log('\n🧪 Test 3: Processing login...');
        const loginResult = await tokenService.processLogin(superAdmin.email, 'admin123');
        if (loginResult.success) {
            console.log('✅ Login processed successfully');
            console.log('🔑 New token:', loginResult.token.substring(0, 50) + '...');
            console.log('👤 User:', loginResult.user.email);
        } else {
            console.log('❌ Login failed:', loginResult.error);
        }
        
        // Test 4: Refresh token
        console.log('\n🧪 Test 4: Refreshing token...');
        const refreshResult = await tokenService.refreshToken(freshToken);
        if (refreshResult.success) {
            console.log('✅ Token refreshed successfully');
            console.log('🔑 New token:', refreshResult.token.substring(0, 50) + '...');
        } else {
            console.log('❌ Token refresh failed:', refreshResult.error);
        }
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n🔑 Latest Token for frontend:');
        console.log(loginResult.token);
        
        console.log('\n📋 Instructions:');
        console.log('1. Open browser DevTools (F12)');
        console.log('2. Go to Console tab');
        console.log('3. Run: localStorage.setItem("token", "' + loginResult.token + '")');
        console.log('4. Refresh the page');
        console.log('5. Click "Mi Negocio"');
        
    } catch (error) {
        console.error('❌ Error testing token system:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    testTokenSystem()
        .then(() => {
            console.log('🎉 Token system test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Token system test failed:', error);
            process.exit(1);
        });
}

module.exports = { testTokenSystem };
