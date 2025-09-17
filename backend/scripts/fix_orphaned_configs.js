const mongoose = require('mongoose');
const BranchAIConfig = require('../src/models/BranchAIConfig');
const Branch = require('../src/models/Branch');

async function fixOrphanedConfigs() {
    try {
        console.log('🔧 Corrigiendo configuraciones huérfanas...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Obtener todas las configuraciones
        const configs = await BranchAIConfig.find({});
        console.log(`📊 Configuraciones encontradas: ${configs.length}`);
        
        // Obtener todas las sucursales existentes
        const branches = await Branch.find({});
        const branchIds = branches.map(b => b._id.toString());
        console.log(`📊 Sucursales existentes: ${branchIds.length}`);
        
        // Verificar cada configuración
        for (const config of configs) {
            const configBranchId = config.branchId.toString();
            const branchExists = branchIds.includes(configBranchId);
            
            console.log(`\n🔍 Configuración: ${config._id}`);
            console.log(`   Branch ID: ${configBranchId}`);
            console.log(`   Existe sucursal: ${branchExists ? 'Sí' : 'No'}`);
            
            if (!branchExists) {
                console.log(`   ❌ Configuración huérfana encontrada`);
                
                // Buscar una sucursal similar para reasignar
                const similarBranch = branches.find(b => 
                    b.name.toLowerCase().includes('wings') || 
                    b.name.toLowerCase().includes('alitas')
                );
                
                if (similarBranch) {
                    console.log(`   ✅ Reasignando a sucursal similar: ${similarBranch.name}`);
                    config.branchId = similarBranch._id;
                    await config.save();
                    console.log(`   ✅ Configuración actualizada`);
                } else {
                    console.log(`   🗑️ Eliminando configuración huérfana`);
                    await BranchAIConfig.findByIdAndDelete(config._id);
                    console.log(`   ✅ Configuración eliminada`);
                }
            } else {
                console.log(`   ✅ Configuración válida`);
            }
        }
        
        // Verificar el resultado
        console.log('\n🔍 Verificando resultado...');
        const finalConfigs = await BranchAIConfig.find({}).populate('branchId', 'name');
        
        finalConfigs.forEach((config, index) => {
            console.log(`✅ Config ${index + 1}: ${config.branchId?.name || 'Sin sucursal'} (${config.branchId ? 'Válida' : 'Huérfana'})`);
        });
        
        console.log('\n✅ Corrección completada');
        
    } catch (error) {
        console.error('❌ Error en la corrección:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

fixOrphanedConfigs();


