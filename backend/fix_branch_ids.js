const mongoose = require('mongoose');

// Conectar a MongoDB
async function connectDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        process.exit(1);
    }
}

// Modelos
const Order = require('./src/models/Order');
const Branch = require('./src/models/Branch');

async function fixBranchIds() {
    try {
        await connectDB();
        
        console.log('🔧 Corrigiendo branchIds antiguos...');
        
        // Obtener todas las sucursales
        const branches = await Branch.find({ isActive: true });
        console.log('\n📋 Sucursales disponibles:');
        branches.forEach((branch, index) => {
            console.log(`${index + 1}. ${branch.name}`);
            console.log(`   - MongoDB ID: ${branch._id}`);
            console.log(`   - Branch ID: ${branch.branchId}`);
        });
        
        // Mapear IDs antiguos a nuevos
        const branchMapping = {};
        branches.forEach(branch => {
            branchMapping[branch._id.toString()] = branch.branchId;
        });
        
        console.log('\n🔄 Mapeo de IDs:');
        Object.entries(branchMapping).forEach(([oldId, newId]) => {
            console.log(`- ${oldId} → ${newId}`);
        });
        
        // Encontrar pedidos con branchId antiguos
        const oldBranchIds = Object.keys(branchMapping);
        const ordersToUpdate = await Order.find({
            isActive: true,
            branchId: { $in: oldBranchIds }
        });
        
        console.log(`\n📦 Pedidos a actualizar: ${ordersToUpdate.length}`);
        
        // Actualizar pedidos
        let updatedCount = 0;
        for (const order of ordersToUpdate) {
            const newBranchId = branchMapping[order.branchId];
            if (newBranchId) {
                await Order.updateOne(
                    { _id: order._id },
                    { branchId: newBranchId }
                );
                updatedCount++;
                console.log(`✅ Actualizado: ${order.orderId} → ${newBranchId}`);
            }
        }
        
        console.log(`\n🎉 ${updatedCount} pedidos actualizados exitosamente`);
        
        // Verificar el resultado
        console.log('\n🧪 Verificando resultado...');
        
        const salesByBranch = await Order.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$branchId',
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' },
                    avgOrderValue: { $avg: '$total' }
                }
            },
            {
                $lookup: {
                    from: 'branches',
                    localField: '_id',
                    foreignField: 'branchId',
                    as: 'branch'
                }
            },
            { $unwind: '$branch' },
            {
                $project: {
                    branchId: '$_id',
                    branchName: '$branch.name',
                    orders: 1,
                    revenue: 1,
                    avgOrderValue: 1
                }
            },
            { $sort: { revenue: -1 } }
        ]);
        
        console.log('\n📊 Nuevo reporte de ventas por sucursal:');
        let totalOrders = 0;
        let totalRevenue = 0;
        
        salesByBranch.forEach((branch, index) => {
            console.log(`${index + 1}. ${branch.branchName}:`);
            console.log(`   - Pedidos: ${branch.orders}`);
            console.log(`   - Ingresos: $${branch.revenue.toLocaleString()}`);
            console.log(`   - Valor promedio: $${branch.avgOrderValue.toFixed(0)}`);
            totalOrders += branch.orders;
            totalRevenue += branch.revenue;
        });
        
        console.log(`\n📈 Totales:`);
        console.log(`- Total pedidos: ${totalOrders}`);
        console.log(`- Total ingresos: $${totalRevenue.toLocaleString()}`);
        
        // Verificar pedidos sin branchId válido
        const remainingInvalidOrders = await Order.find({
            isActive: true,
            branchId: { $nin: branches.map(b => b.branchId) }
        });
        
        console.log(`\n🔍 Pedidos restantes con branchId inválido: ${remainingInvalidOrders.length}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

fixBranchIds();
