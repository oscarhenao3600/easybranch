const mongoose = require('mongoose');

async function checkOrderIndexes() {
    try {
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
        
        const indexes = await mongoose.connection.db.collection('orders').indexes();
        console.log('📊 Índices en colección orders:');
        indexes.forEach((idx, i) => {
            console.log(`${i+1}. ${JSON.stringify(idx.key)} - ${idx.name}`);
        });
        
        // Verificar si hay documentos en la colección
        const count = await mongoose.connection.db.collection('orders').countDocuments();
        console.log(`\n📄 Total de pedidos en BD: ${count}`);
        
        // Mostrar un ejemplo de pedido si existe
        if (count > 0) {
            const sampleOrder = await mongoose.connection.db.collection('orders').findOne();
            console.log('\n📋 Ejemplo de pedido:');
            console.log(JSON.stringify(sampleOrder, null, 2));
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Desconectado de MongoDB');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkOrderIndexes();
