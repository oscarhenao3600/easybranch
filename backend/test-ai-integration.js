const mongoose = require('mongoose');
const BranchAIConfig = require('./src/models/BranchAIConfig');
const Branch = require('./src/models/Branch');
const AIService = require('./src/services/AIService');

async function testAIIntegration() {
    try {
        console.log('🤖 ===== PROBANDO INTEGRACIÓN DE IA =====');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
        
        // Crear servicio de IA
        const aiService = new AIService();
        
        // Buscar configuraciones de IA existentes
        const configs = await BranchAIConfig.find({ isActive: true }).populate('branchId');
        console.log(`📊 Configuraciones encontradas: ${configs.length}`);
        
        if (configs.length === 0) {
            console.log('⚠️ No hay configuraciones de IA para probar');
            return;
        }
        
        // Probar cada configuración
        for (const config of configs) {
            const branchId = config.branchId._id.toString();
            const branchName = config.branchId.name;
            
            console.log(`\n🏪 Probando sucursal: ${branchName} (${branchId})`);
            
            // Cargar configuración en el servicio de IA
            if (config.menuContent) {
                aiService.setMenuContent(branchId, config.menuContent);
                console.log('✅ Menú cargado');
            }
            
            if (config.customPrompt) {
                aiService.setAIPrompt(branchId, config.customPrompt);
                console.log('✅ Prompt personalizado cargado');
            }
            
            // Probar respuestas
            const testMessages = [
                'Hola, ¿qué tal?',
                '¿Tienen menú?',
                '¿Qué precios tienen?',
                '¿Hacen delivery?',
                '¿Cuáles son sus horarios?'
            ];
            
            for (const message of testMessages) {
                console.log(`\n💬 Mensaje: "${message}"`);
                
                try {
                    const response = await aiService.generateResponse(
                        branchId,
                        message,
                        'test-client',
                        config.businessSettings?.businessType || 'restaurant',
                        config
                    );
                    
                    console.log(`🤖 Respuesta: "${response}"`);
                    
                } catch (error) {
                    console.error(`❌ Error: ${error.message}`);
                }
            }
            
            console.log('✅ Prueba completada para esta sucursal');
        }
        
        console.log('\n🎉 Prueba de integración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

// Ejecutar prueba
testAIIntegration();
