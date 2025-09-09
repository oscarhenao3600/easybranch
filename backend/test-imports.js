// Script para probar las correcciones de WhatsApp
console.log('🧪 ===== PROBANDO CORRECCIONES WHATSAPP =====');

try {
    console.log('📱 Probando importación de WhatsAppConnectionMonitor...');
    const WhatsAppConnectionMonitor = require('./src/services/WhatsAppConnectionMonitor');
    console.log('✅ WhatsAppConnectionMonitor importado exitosamente');
    
    console.log('📱 Probando importación de WhatsAppQRManager...');
    const WhatsAppQRManager = require('./src/services/WhatsAppQRManager');
    console.log('✅ WhatsAppQRManager importado exitosamente');
    
    console.log('📱 Probando importación de WhatsAppController...');
    const WhatsAppController = require('./src/controllers/WhatsAppController');
    console.log('✅ WhatsAppController importado exitosamente');
    
    console.log('🎉 Todas las importaciones funcionan correctamente');
    
} catch (error) {
    console.error('❌ Error en las importaciones:', error.message);
    console.error('Stack:', error.stack);
}

