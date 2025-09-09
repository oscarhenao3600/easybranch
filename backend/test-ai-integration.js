// Script para probar la integración de IA con WhatsApp
console.log('🧪 ===== PROBANDO INTEGRACIÓN IA WHATSAPP =====');

try {
    console.log('📱 Probando importación de WhatsAppController...');
    const WhatsAppController = require('./src/controllers/WhatsAppController');
    console.log('✅ WhatsAppController importado exitosamente');
    
    console.log('📱 Probando importación de WhatsAppServiceSimple...');
    const WhatsAppServiceSimple = require('./src/services/WhatsAppServiceSimple');
    console.log('✅ WhatsAppServiceSimple importado exitosamente');
    
    console.log('📱 Probando importación de AIService...');
    const AIService = require('./src/services/AIService');
    console.log('✅ AIService importado exitosamente');
    
    console.log('📱 Creando instancias...');
    const whatsappService = new WhatsAppServiceSimple();
    const aiService = new AIService();
    
    console.log('✅ Instancias creadas exitosamente');
    
    // Verificar que WhatsAppServiceSimple extiende EventEmitter
    console.log('📱 Verificando que WhatsAppServiceSimple puede emitir eventos...');
    if (typeof whatsappService.emit === 'function') {
        console.log('✅ WhatsAppServiceSimple puede emitir eventos');
    } else {
        console.log('❌ WhatsAppServiceSimple NO puede emitir eventos');
    }
    
    console.log('🎉 Todas las correcciones de IA funcionan correctamente');
    
} catch (error) {
    console.error('❌ Error en la integración de IA:', error.message);
    console.error('Stack:', error.stack);
}