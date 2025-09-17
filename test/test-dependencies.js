console.log('🔍 Verificando dependencias...');

try {
    console.log('✅ Express:', require('express'));
    console.log('✅ Mongoose:', require('mongoose'));
    console.log('✅ CORS:', require('cors'));
    console.log('✅ Dotenv:', require('dotenv'));
    console.log('✅ Helmet:', require('helmet'));
    console.log('✅ Rate Limit:', require('express-rate-limit'));
    
    console.log('\n🔍 Verificando archivos principales...');
    console.log('✅ App:', require('../backend/src/app.js'));
    console.log('✅ Server:', require('../backend/src/server.js'));
    
    console.log('\n✅ Todas las dependencias están disponibles');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}


