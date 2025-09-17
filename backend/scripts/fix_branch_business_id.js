const mongoose = require('mongoose');
const Branch = require('../src/models/Branch');
const Business = require('../src/models/Business');

async function fixBranchBusinessId() {
    try {
        console.log('🔧 Corrigiendo businessId de sucursales...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Obtener todos los negocios para crear un mapa
        const businesses = await Business.find({});
        const businessMap = {};
        businesses.forEach(business => {
            businessMap[business.businessId] = business._id;
        });
        
        console.log('📊 Mapa de negocios:');
        Object.entries(businessMap).forEach(([businessId, objectId]) => {
            console.log(`   ${businessId} -> ${objectId}`);
        });
        
        // Obtener todas las sucursales
        const branches = await Branch.find({});
        console.log(`\n📊 Sucursales encontradas: ${branches.length}`);
        
        for (const branch of branches) {
            console.log(`\n🔍 Procesando sucursal: ${branch.name}`);
            console.log(`   businessId actual: ${branch.businessId} (tipo: ${typeof branch.businessId})`);
            
            // Si businessId es string, buscar el ObjectId correspondiente
            if (typeof branch.businessId === 'string') {
                const correctObjectId = businessMap[branch.businessId];
                if (correctObjectId) {
                    console.log(`   ✅ Encontrado ObjectId: ${correctObjectId}`);
                    
                    // Actualizar la sucursal
                    await Branch.findByIdAndUpdate(branch._id, {
                        businessId: correctObjectId
                    });
                    
                    console.log(`   ✅ Sucursal actualizada correctamente`);
                } else {
                    console.log(`   ❌ No se encontró ObjectId para businessId: ${branch.businessId}`);
                }
            } else {
                console.log(`   ✅ Ya es ObjectId, no necesita corrección`);
            }
        }
        
        // Verificar que las correcciones funcionaron
        console.log('\n🔍 Verificando correcciones...');
        const correctedBranches = await Branch.find({}).populate('businessId', 'name businessId');
        
        correctedBranches.forEach(branch => {
            console.log(`✅ ${branch.name} -> Negocio: ${branch.businessId?.name || 'NULL'} (${branch.businessId?.businessId || 'NULL'})`);
        });
        
        console.log('\n✅ Corrección completada');
        
    } catch (error) {
        console.error('❌ Error en la corrección:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

fixBranchBusinessId();


