const mongoose = require('mongoose');
const BranchAIConfig = require('./src/models/BranchAIConfig');
const Branch = require('./src/models/Branch');

async function checkAlitasMenu() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Buscar la configuración de IA de Wings Master
        const branch = await Branch.findOne({ name: 'Sucursal Centro' });
        if (!branch) {
            console.log('❌ No se encontró la sucursal');
            return;
        }

        console.log('🏪 Branch encontrada:', branch.name);
        console.log('🆔 Branch ID:', branch._id);

        const config = await BranchAIConfig.findOne({ branchId: branch._id });
        if (!config) {
            console.log('❌ No se encontró configuración de IA');
            return;
        }

        console.log('✅ Configuración encontrada');
        console.log('📋 Menu Content disponible:', config.menuContent ? 'Sí' : 'No');
        console.log('🤖 Custom Prompt disponible:', config.customPrompt ? 'Sí' : 'No');

        if (config.menuContent) {
            console.log('\n📄 ===== CONTENIDO DEL MENÚ =====');
            console.log(config.menuContent);
            console.log('================================\n');
        }

        if (config.customPrompt) {
            console.log('\n🤖 ===== PROMPT PERSONALIZADO =====');
            console.log(config.customPrompt);
            console.log('==================================\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

checkAlitasMenu();
