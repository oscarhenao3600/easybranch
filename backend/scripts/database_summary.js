const mongoose = require('mongoose');

async function showDatabaseSummary() {
    try {
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
        
        console.log('\n📊 ===== RESUMEN DE BASE DE DATOS EASYBRANCH =====\n');
        
        // Obtener todas las colecciones
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        console.log(`🗄️ Total de colecciones: ${collections.length}\n`);
        
        // Mostrar estadísticas de cada colección
        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments();
            const indexes = await mongoose.connection.db.collection(collection.name).indexes();
            
            console.log(`📋 ${collection.name}:`);
            console.log(`   📄 Documentos: ${count}`);
            console.log(`   🔍 Índices: ${indexes.length}`);
            
            // Mostrar algunos índices importantes
            const importantIndexes = indexes.filter(idx => 
                idx.name !== '_id_' && 
                !idx.name.includes('_id')
            ).slice(0, 3);
            
            if (importantIndexes.length > 0) {
                console.log(`   🎯 Índices principales:`);
                importantIndexes.forEach(idx => {
                    console.log(`      - ${idx.name}: ${JSON.stringify(idx.key)}`);
                });
            }
            console.log('');
        }
        
        // Mostrar estadísticas generales
        console.log('📈 ===== ESTADÍSTICAS GENERALES =====\n');
        
        const totalDocuments = await Promise.all(
            collections.map(col => 
                mongoose.connection.db.collection(col.name).countDocuments()
            )
        );
        
        const totalCount = totalDocuments.reduce((sum, count) => sum + count, 0);
        console.log(`📊 Total de documentos: ${totalCount}`);
        
        // Mostrar colecciones más grandes
        const collectionStats = collections.map((col, i) => ({
            name: col.name,
            count: totalDocuments[i]
        })).sort((a, b) => b.count - a.count);
        
        console.log('\n🏆 Top 5 colecciones por tamaño:');
        collectionStats.slice(0, 5).forEach((stat, i) => {
            console.log(`   ${i + 1}. ${stat.name}: ${stat.count} documentos`);
        });
        
        // Verificar estado de conexiones WhatsApp
        const whatsappConnections = await mongoose.connection.db.collection('whatsappconnections').countDocuments();
        const activeConnections = await mongoose.connection.db.collection('whatsappconnections').countDocuments({ status: 'connected' });
        
        console.log('\n📱 ===== ESTADO WHATSAPP =====\n');
        console.log(`🔗 Conexiones totales: ${whatsappConnections}`);
        console.log(`✅ Conexiones activas: ${activeConnections}`);
        console.log(`❌ Conexiones inactivas: ${whatsappConnections - activeConnections}`);
        
        // Verificar pedidos
        const totalOrders = await mongoose.connection.db.collection('orders').countDocuments();
        const confirmedOrders = await mongoose.connection.db.collection('orders').countDocuments({ status: 'confirmed' });
        const pendingOrders = await mongoose.connection.db.collection('orders').countDocuments({ status: 'pending' });
        
        console.log('\n🛒 ===== ESTADO PEDIDOS =====\n');
        console.log(`📦 Total de pedidos: ${totalOrders}`);
        console.log(`✅ Pedidos confirmados: ${confirmedOrders}`);
        console.log(`⏳ Pedidos pendientes: ${pendingOrders}`);
        
        await mongoose.disconnect();
        console.log('\n✅ Desconectado de MongoDB');
        console.log('\n📄 Para ver la estructura completa, consulta: DATABASE_STRUCTURE.md');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

showDatabaseSummary();
