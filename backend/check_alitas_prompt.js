const mongoose = require('mongoose');
const BranchAIConfig = require('./src/models/BranchAIConfig');
const Branch = require('./src/models/Branch');

async function checkAlitasPrompt() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Buscar la configuración de IA de alitas
        const branch = await Branch.findOne({ name: 'alitas mix' });
        if (!branch) {
            console.log('❌ No se encontró la sucursal alitas mix');
            return;
        }

        const config = await BranchAIConfig.findOne({ branchId: branch._id });
        if (!config) {
            console.log('❌ No se encontró configuración de IA');
            return;
        }

        console.log('🤖 ===== PROMPT PERSONALIZADO ACTUAL =====');
        console.log(config.customPrompt);
        console.log('==========================================');

        console.log('\n📄 ===== MENÚ ACTUAL =====');
        console.log(config.menuContent);
        console.log('===========================');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

checkAlitasPrompt();
