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

async function createTestOrdersWithBranchId() {
    try {
        await connectDB();
        
        console.log('🔍 Obteniendo sucursales...');
        const branches = await Branch.find({ isActive: true });
        console.log('📋 Sucursales encontradas:', branches.map(b => ({ name: b.name, branchId: b.branchId })));
        
        if (branches.length === 0) {
            console.log('❌ No hay sucursales disponibles');
            return;
        }
        
        // Crear pedidos de prueba con branchId correcto
        const testOrders = [
            {
                orderId: `ORD${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
                businessId: branches[0].businessId,
                branchId: branches[0].branchId,
                customer: {
                    name: 'Cliente Test Alitas',
                    phone: '3001234567',
                    address: {
                        street: 'Calle 23 #45-67',
                        city: 'Armenia',
                        state: 'Quindio'
                    }
                },
                items: [{
                    serviceId: 'SVC_TEST_001',
                    name: 'Combo 1: 5 alitas + acompañante',
                    quantity: 1,
                    unitPrice: 21900,
                    totalPrice: 21900
                }],
                delivery: {
                    type: 'pickup',
                    fee: 0,
                    estimatedTime: 20
                },
                payment: {
                    method: 'cash',
                    status: 'paid',
                    paidAt: new Date()
                },
                status: 'delivered',
                total: 21900,
                subtotal: 21900,
                tax: 0,
                serviceFee: 0,
                source: 'whatsapp',
                statusHistory: [{
                    status: 'pending',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 horas atrás
                }, {
                    status: 'confirmed',
                    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000) // 1.5 horas atrás
                }, {
                    status: 'delivered',
                    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hora atrás
                }],
                isActive: true
            },
            {
                orderId: `ORD${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
                businessId: branches[0].businessId,
                branchId: branches[0].branchId,
                customer: {
                    name: 'Cliente Test Centro',
                    phone: '3001234568',
                    address: {
                        street: 'Calle 15 #30-45',
                        city: 'Armenia',
                        state: 'Quindio'
                    }
                },
                items: [{
                    serviceId: 'SVC_TEST_002',
                    name: 'Combo 2: 7 alitas + acompañante',
                    quantity: 1,
                    unitPrice: 26900,
                    totalPrice: 26900
                }],
                delivery: {
                    type: 'delivery',
                    fee: 3000,
                    estimatedTime: 25
                },
                payment: {
                    method: 'card',
                    status: 'paid',
                    paidAt: new Date()
                },
                status: 'delivered',
                total: 29900,
                subtotal: 26900,
                tax: 0,
                serviceFee: 0,
                source: 'whatsapp',
                statusHistory: [{
                    status: 'pending',
                    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
                }, {
                    status: 'confirmed',
                    timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000)
                }, {
                    status: 'delivered',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
                }],
                isActive: true
            }
        ];
        
        // Si hay más de una sucursal, crear pedidos para la segunda también
        if (branches.length > 1) {
            testOrders.push({
                orderId: `ORD${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
                businessId: branches[1].businessId,
                branchId: branches[1].branchId,
                customer: {
                    name: 'Cliente Test Sucursal 2',
                    phone: '3001234569',
                    address: {
                        street: 'Calle 10 #20-30',
                        city: 'Armenia',
                        state: 'Quindio'
                    }
                },
                items: [{
                    serviceId: 'SVC_TEST_003',
                    name: 'Familiar 1: 20 alitas + acompañante + gaseosa',
                    quantity: 1,
                    unitPrice: 65900,
                    totalPrice: 65900
                }],
                delivery: {
                    type: 'pickup',
                    fee: 0,
                    estimatedTime: 30
                },
                payment: {
                    method: 'cash',
                    status: 'paid',
                    paidAt: new Date()
                },
                status: 'delivered',
                total: 65900,
                subtotal: 65900,
                tax: 0,
                serviceFee: 0,
                source: 'whatsapp',
                statusHistory: [{
                    status: 'pending',
                    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
                }, {
                    status: 'confirmed',
                    timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000)
                }, {
                    status: 'delivered',
                    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
                }],
                isActive: true
            });
        }
        
        console.log('📦 Creando pedidos de prueba...');
        
        for (let i = 0; i < testOrders.length; i++) {
            const order = testOrders[i];
            
            try {
                const newOrder = new Order(order);
                await newOrder.save();
                console.log(`✅ Pedido ${i + 1} creado: ${order.orderId} para sucursal ${order.branchId}`);
            } catch (error) {
                console.log(`❌ Error creando pedido ${i + 1}:`, error.message);
            }
        }
        
        console.log('\n🧪 Verificando reporte de ventas...');
        
        // Verificar que los pedidos se crearon correctamente
        const ordersCount = await Order.countDocuments({ isActive: true });
        console.log('📊 Total de pedidos en la base de datos:', ordersCount);
        
        // Verificar pedidos por sucursal
        const ordersByBranch = await Order.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$branchId',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$total' }
                }
            }
        ]);
        
        console.log('🏪 Pedidos por sucursal:');
        ordersByBranch.forEach(branch => {
            console.log(`- Sucursal ${branch._id}: ${branch.count} pedidos, $${branch.totalRevenue.toLocaleString()} ingresos`);
        });
        
        console.log('\n🎉 ¡Pedidos de prueba creados exitosamente!');
        console.log('💡 Ahora puedes probar el reporte de ventas en el frontend');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

createTestOrdersWithBranchId();
