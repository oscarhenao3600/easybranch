const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const User = require('../src/models/User');

// Generate fresh token script
async function generateFreshToken() {
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
        
        // Generate fresh token with unique JTI
        const payload = {
            userId: superAdmin.userId,
            email: superAdmin.email,
            role: superAdmin.role,
            businessId: superAdmin.businessId,
            branchId: superAdmin.branchId,
            iat: Math.floor(Date.now() / 1000),
            jti: `fresh_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || '1357',
            { expiresIn: '24h' }
        );
        
        console.log('✅ Fresh token generated:', token.substring(0, 50) + '...');
        console.log('📅 Token expires in: 24 hours');
        console.log('🆔 JTI (JWT ID):', payload.jti);
        
        console.log('\n🔑 Fresh Token for frontend:');
        console.log(token);
        
        console.log('\n📋 Instructions:');
        console.log('1. Open browser DevTools (F12)');
        console.log('2. Go to Console tab');
        console.log('3. Run: localStorage.setItem("token", "' + token + '")');
        console.log('4. Refresh the page');
        console.log('5. Click "Mi Negocio"');
        
    } catch (error) {
        console.error('❌ Error generating fresh token:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    generateFreshToken()
        .then(() => {
            console.log('🎉 Fresh token generation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Fresh token generation failed:', error);
            process.exit(1);
        });
}

module.exports = { generateFreshToken };
