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

async function analyzeOrdersByBranch() {
    try {
        await connectDB();
        
        console.log('🔍 Analizando todos los pedidos por sucursal...');
        
        // Obtener todas las sucursales
        const branches = await Branch.find({ isActive: true });
        console.log('\n📋 Sucursales disponibles:');
        branches.forEach((branch, index) => {
            console.log(`${index + 1}. ${branch.name} (ID: ${branch.branchId})`);
        });
        
        // Obtener todos los pedidos activos
        const allOrders = await Order.find({ isActive: true });
        console.log(`\n📊 Total de pedidos activos: ${allOrders.length}`);
        
        // Analizar pedidos por sucursal
        console.log('\n🏪 Análisis detallado por sucursal:');
        
        for (const branch of branches) {
            const ordersInBranch = await Order.find({ 
                isActive: true, 
                branchId: branch.branchId 
            });
            
            const totalRevenue = ordersInBranch.reduce((sum, order) => sum + order.total, 0);
            const avgOrderValue = ordersInBranch.length > 0 ? totalRevenue / ordersInBranch.length : 0;
            
            console.log(`\n📍 ${branch.name} (${branch.branchId}):`);
            console.log(`   - Pedidos: ${ordersInBranch.length}`);
            console.log(`   - Ingresos: $${totalRevenue.toLocaleString()}`);
            console.log(`   - Valor promedio: $${avgOrderValue.toFixed(0)}`);
            
            // Mostrar algunos pedidos de ejemplo
            if (ordersInBranch.length > 0) {
                console.log(`   - Ejemplos de pedidos:`);
                ordersInBranch.slice(0, 3).forEach((order, index) => {
                    console.log(`     ${index + 1}. ${order.orderId}: $${order.total.toLocaleString()} (${order.status})`);
                });
                if (ordersInBranch.length > 3) {
                    console.log(`     ... y ${ordersInBranch.length - 3} más`);
                }
            }
        }
        
        // Verificar pedidos sin branchId válido
        console.log('\n🔍 Verificando pedidos con branchId inválido:');
        
        const ordersWithInvalidBranchId = await Order.find({ 
            isActive: true,
            branchId: { $nin: branches.map(b => b.branchId) }
        });
        
        console.log(`- Pedidos con branchId inválido: ${ordersWithInvalidBranchId.length}`);
        
        if (ordersWithInvalidBranchId.length > 0) {
            console.log('- BranchIds encontrados:');
            const uniqueBranchIds = [...new Set(ordersWithInvalidBranchId.map(o => o.branchId))];
            uniqueBranchIds.forEach(branchId => {
                const count = ordersWithInvalidBranchId.filter(o => o.branchId === branchId).length;
                console.log(`  - ${branchId}: ${count} pedidos`);
            });
        }
        
        // Verificar pedidos sin branchId
        const ordersWithoutBranchId = await Order.find({ 
            isActive: true,
            $or: [
                { branchId: { $exists: false } },
                { branchId: null },
                { branchId: '' }
            ]
        });
        
        console.log(`- Pedidos sin branchId: ${ordersWithoutBranchId.length}`);
        
        // Resumen total
        console.log('\n📈 Resumen total:');
        const totalOrders = await Order.countDocuments({ isActive: true });
        const totalRevenue = await Order.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        
        console.log(`- Total pedidos: ${totalOrders}`);
        console.log(`- Total ingresos: $${totalRevenue[0]?.total?.toLocaleString() || 0}`);
        
        // Verificar qué está pasando con el reporte
        console.log('\n🧪 Simulando el reporte de ventas...');
        
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
        
        console.log('- Resultado del agregado por sucursal:');
        salesByBranch.forEach((branch, index) => {
            console.log(`  ${index + 1}. ${branch.branchName}: ${branch.orders} pedidos, $${branch.revenue.toLocaleString()}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

analyzeOrdersByBranch();
