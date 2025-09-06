const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const Business = require('../src/models/Business');
const Branch = require('../src/models/Branch');
const Service = require('../src/models/Service');
const Order = require('../src/models/Order');
const WhatsAppConnection = require('../src/models/WhatsAppConnection');

// Import services
const LoggerService = require('../src/services/LoggerService');
const DatabaseService = require('../src/services/DatabaseService');

const logger = new LoggerService();
const databaseService = new DatabaseService();

// Sample data
const sampleBusinesses = [
    {
        name: 'Restaurante El Sabor',
        razonSocial: 'El Sabor S.A.S.',
        nit: '900123456-1',
        phone: '+573001234567',
        address: 'Calle 123 #45-67',
        city: 'Bogotá',
        department: 'Cundinamarca',
        country: 'Colombia',
        description: 'Restaurante especializado en comida colombiana tradicional',
        businessType: 'restaurant',
        contact: {
            email: 'info@elsabor.com',
            phone: '+573001234567'
        },
        settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            language: 'es',
            autoReply: true,
            delivery: true,
            businessHours: {
                monday: { open: '08:00', close: '22:00' },
                tuesday: { open: '08:00', close: '22:00' },
                wednesday: { open: '08:00', close: '22:00' },
                thursday: { open: '08:00', close: '22:00' },
                friday: { open: '08:00', close: '23:00' },
                saturday: { open: '09:00', close: '23:00' },
                sunday: { open: '10:00', close: '21:00' }
            }
        },
        billing: {
            serviceFee: 5.0,
            plan: 'basic'
        },
        ai: {
            enabled: true,
            provider: 'huggingface',
            model: 'deepseek-chat',
            prompt: 'Eres un asistente amigable de un restaurante. Ayuda a los clientes con información sobre el menú, precios y pedidos.'
        }
    },
    {
        name: 'Café Aroma',
        razonSocial: 'Café Aroma Ltda.',
        nit: '900234567-2',
        phone: '+573007654321',
        address: 'Carrera 78 #90-12',
        city: 'Medellín',
        department: 'Antioquia',
        country: 'Colombia',
        description: 'Café de especialidad con ambiente acogedor',
        businessType: 'cafe',
        contact: {
            email: 'contacto@cafearoma.com',
            phone: '+573007654321'
        },
        settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            language: 'es',
            autoReply: true,
            delivery: false,
            businessHours: {
                monday: { open: '07:00', close: '20:00' },
                tuesday: { open: '07:00', close: '20:00' },
                wednesday: { open: '07:00', close: '20:00' },
                thursday: { open: '07:00', close: '20:00' },
                friday: { open: '07:00', close: '21:00' },
                saturday: { open: '08:00', close: '21:00' },
                sunday: { open: '08:00', close: '19:00' }
            }
        },
        billing: {
            serviceFee: 3.0,
            plan: 'basic'
        },
        ai: {
            enabled: true,
            provider: 'huggingface',
            model: 'deepseek-chat',
            prompt: 'Eres un asistente de una cafetería. Ayuda a los clientes con información sobre bebidas, pasteles y productos de café.'
        }
    },
    {
        razonSocial: 'Farmacia Salud Total S.A.S.',
        nit: '900345678-3',
        phone: '+573001112223',
        address: 'Avenida 68 #45-23',
        city: 'Cali',
        department: 'Valle del Cauca',
        country: 'Colombia',
        description: 'Farmacia con servicio 24 horas y entrega a domicilio',
        businessType: 'pharmacy',
        contact: {
            email: 'ventas@saludtotal.com',
            phone: '+573001112223'
        },
        settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            language: 'es',
            autoReply: true,
            delivery: true,
            businessHours: {
                monday: { open: '08:00', close: '20:00' },
                tuesday: { open: '08:00', close: '20:00' },
                wednesday: { open: '08:00', close: '20:00' },
                thursday: { open: '08:00', close: '20:00' },
                friday: { open: '08:00', close: '20:00' },
                saturday: { open: '09:00', close: '18:00' },
                sunday: { open: '09:00', close: '17:00' }
            }
        },
        billing: {
            serviceFee: 4.0,
            plan: 'basic'
        },
        ai: {
            enabled: true,
            provider: 'huggingface',
            model: 'deepseek-chat',
            prompt: 'Eres un asistente de una farmacia. Ayuda a los clientes con información sobre medicamentos, productos de salud y consultas básicas.'
        }
    }
];

const sampleBranches = [
    {
        name: 'Sucursal Centro',
        razonSocial: 'El Sabor Centro S.A.S.',
        nit: '900123456-1-1',
        phone: '+573001234567',
        address: 'Calle 15 #23-45',
        city: 'Bogotá',
        department: 'Cundinamarca',
        country: 'Colombia',
        description: 'Sucursal principal en el centro de Bogotá',
        manager: 'María González',
        contact: {
            phone: '+573001234567',
            email: 'centro@elsabor.com'
        },
        whatsapp: {
            provider: 'whatsapp-web.js',
            phoneNumber: '+573001234567',
            connectionStatus: 'disconnected'
        },
        kitchen: {
            phone: '+573001234568'
        },
        settings: {
            autoReply: true,
            businessHours: {
                monday: { open: '08:00', close: '22:00' },
                tuesday: { open: '08:00', close: '22:00' },
                wednesday: { open: '08:00', close: '22:00' },
                thursday: { open: '08:00', close: '22:00' },
                friday: { open: '08:00', close: '23:00' },
                saturday: { open: '09:00', close: '23:00' },
                sunday: { open: '10:00', close: '21:00' }
            },
            delivery: {
                enabled: true,
                radius: 5.0,
                fee: 3000
            },
            pickup: {
                enabled: true,
                estimatedTime: 20
            }
        },
        ai: {
            enabled: true,
            provider: 'huggingface',
            model: 'deepseek-chat',
            prompt: 'Eres un asistente amigable del restaurante El Sabor. Ayuda a los clientes con información sobre el menú, precios y pedidos.',
            useBusinessSettings: false
        }
    },
    {
        name: 'Sucursal Norte',
        address: {
            street: 'Calle 127 #45-67',
            city: 'Bogotá',
            state: 'Cundinamarca',
            country: 'Colombia',
            zipCode: '110111'
        },
        contact: {
            phone: '+573001234569',
            email: 'norte@elsabor.com'
        },
        whatsapp: {
            provider: 'whatsapp-web.js',
            phoneNumber: '+573001234569',
            connectionStatus: 'disconnected'
        },
        kitchen: {
            phone: '+573001234570'
        },
        settings: {
            autoReply: true,
            businessHours: {
                monday: { open: '08:00', close: '22:00' },
                tuesday: { open: '08:00', close: '22:00' },
                wednesday: { open: '08:00', close: '22:00' },
                thursday: { open: '08:00', close: '22:00' },
                friday: { open: '08:00', close: '23:00' },
                saturday: { open: '09:00', close: '23:00' },
                sunday: { open: '10:00', close: '21:00' }
            },
            delivery: {
                enabled: true,
                radius: 4.0,
                fee: 2500
            },
            pickup: {
                enabled: true,
                estimatedTime: 25
            }
        },
        ai: {
            enabled: true,
            provider: 'huggingface',
            model: 'deepseek-chat',
            prompt: 'Eres un asistente amigable del restaurante El Sabor. Ayuda a los clientes con información sobre el menú, precios y pedidos.',
            useBusinessSettings: false
        }
    },
    {
        name: 'Café Aroma - Zona Rosa',
        address: {
            street: 'Calle 10 #45-23',
            city: 'Medellín',
            state: 'Antioquia',
            country: 'Colombia',
            zipCode: '050034'
        },
        contact: {
            phone: '+573007654321',
            email: 'zonarosa@cafearoma.com'
        },
        whatsapp: {
            provider: 'whatsapp-web.js',
            phoneNumber: '+573007654321',
            connectionStatus: 'disconnected'
        },
        kitchen: {
            phone: '+573007654322'
        },
        settings: {
            autoReply: true,
            businessHours: {
                monday: { open: '07:00', close: '20:00' },
                tuesday: { open: '07:00', close: '20:00' },
                wednesday: { open: '07:00', close: '20:00' },
                thursday: { open: '07:00', close: '20:00' },
                friday: { open: '07:00', close: '21:00' },
                saturday: { open: '08:00', close: '21:00' },
                sunday: { open: '08:00', close: '19:00' }
            },
            delivery: {
                enabled: false,
                radius: 0,
                fee: 0
            },
            pickup: {
                enabled: true,
                estimatedTime: 15
            }
        },
        ai: {
            enabled: true,
            provider: 'huggingface',
            model: 'deepseek-chat',
            prompt: 'Eres un asistente de la cafetería Aroma. Ayuda a los clientes con información sobre bebidas, pasteles y productos de café.',
            useBusinessSettings: false
        }
    }
];

const sampleServices = [
    // Restaurante El Sabor - Sucursal Centro
    {
        name: 'Hamburguesa Clásica',
        description: 'Hamburguesa con carne de res, lechuga, tomate, cebolla y queso',
        category: 'Platos Principales',
        subcategory: 'Hamburguesas',
        price: 25000,
        currency: 'COP',
        images: [{
            url: 'hamburguesa-clasica.jpg',
            alt: 'Hamburguesa Clásica',
            isPrimary: true
        }],
        options: [
            {
                name: 'Tipo de carne',
                choices: [
                    { name: 'Res', price: 0 },
                    { name: 'Pollo', price: 0 },
                    { name: 'Cerdo', price: 0 }
                ],
                required: true,
                multiple: false
            },
            {
                name: 'Extras',
                choices: [
                    { name: 'Queso extra', price: 3000 },
                    { name: 'Bacon', price: 2000 },
                    { name: 'Cebolla caramelizada', price: 1500 }
                ],
                required: false,
                multiple: true
            }
        ],
        availability: {
            isAvailable: true,
            stock: 50,
            preparationTime: 15
        },
        tags: ['hamburguesa', 'carne', 'clásico']
    },
    {
        name: 'Pizza Margherita',
        description: 'Pizza tradicional con tomate, mozzarella y albahaca',
        category: 'Platos Principales',
        subcategory: 'Pizzas',
        price: 30000,
        currency: 'COP',
        images: [{
            url: 'pizza-margherita.jpg',
            alt: 'Pizza Margherita',
            isPrimary: true
        }],
        options: [
            {
                name: 'Tamaño',
                choices: [
                    { name: 'Personal', price: 0 },
                    { name: 'Mediana', price: 5000 },
                    { name: 'Familiar', price: 10000 }
                ],
                required: true,
                multiple: false
            },
            {
                name: 'Ingredientes extra',
                choices: [
                    { name: 'Pepperoni', price: 2000 },
                    { name: 'Champiñones', price: 1500 },
                    { name: 'Aceitunas', price: 1000 }
                ],
                required: false,
                multiple: true
            }
        ],
        availability: {
            isAvailable: true,
            stock: 30,
            preparationTime: 20
        },
        tags: ['pizza', 'italiana', 'margherita']
    },
    // Café Aroma
    {
        name: 'Cappuccino',
        description: 'Cappuccino tradicional con espuma de leche cremosa',
        category: 'Bebidas Calientes',
        subcategory: 'Café',
        price: 8000,
        currency: 'COP',
        images: [{
            url: 'cappuccino.jpg',
            alt: 'Cappuccino',
            isPrimary: true
        }],
        options: [
            {
                name: 'Tamaño',
                choices: [
                    { name: 'Pequeño', price: 0 },
                    { name: 'Mediano', price: 1000 },
                    { name: 'Grande', price: 2000 }
                ],
                required: true,
                multiple: false
            },
            {
                name: 'Leche',
                choices: [
                    { name: 'Entera', price: 0 },
                    { name: 'Deslactosada', price: 500 },
                    { name: 'Almendra', price: 1000 }
                ],
                required: true,
                multiple: false
            }
        ],
        availability: {
            isAvailable: true,
            stock: 100,
            preparationTime: 5
        },
        tags: ['café', 'cappuccino', 'leche']
    },
    {
        name: 'Croissant de Chocolate',
        description: 'Croissant relleno de chocolate negro belga',
        category: 'Pastelería',
        subcategory: 'Croissants',
        price: 5000,
        currency: 'COP',
        images: [{
            url: 'croissant-chocolate.jpg',
            alt: 'Croissant de Chocolate',
            isPrimary: true
        }],
        options: [],
        availability: {
            isAvailable: true,
            stock: 25,
            preparationTime: 2
        },
        tags: ['croissant', 'chocolate', 'pastelería']
    }
];

const sampleUsers = [
    {
        email: 'admin@easybranch.com',
        password: 'admin123',
        name: 'Super Administrador',
        role: 'super_admin',
        profile: {
            phone: '+573001234567',
            timezone: 'America/Bogota',
            language: 'es'
        }
    },
    {
        email: 'gerente@elsabor.com',
        password: 'gerente123',
        name: 'Gerente El Sabor',
        role: 'business_admin',
        profile: {
            phone: '+573001234568',
            timezone: 'America/Bogota',
            language: 'es'
        }
    },
    {
        email: 'sucursal@elsabor.com',
        password: 'sucursal123',
        name: 'Admin Sucursal Centro',
        role: 'branch_admin',
        profile: {
            phone: '+573001234569',
            timezone: 'America/Bogota',
            language: 'es'
        }
    },
    {
        email: 'cocina@elsabor.com',
        password: 'cocina123',
        name: 'Chef Principal',
        role: 'staff',
        profile: {
            phone: '+573001234570',
            timezone: 'America/Bogota',
            language: 'es'
        }
    }
];

async function seedDatabase() {
    try {
        // Connect to database
        await databaseService.connect();
        logger.info('Connected to database');

        // Clear existing data
        await User.deleteMany({});
        await Business.deleteMany({});
        await Branch.deleteMany({});
        await Service.deleteMany({});
        await Order.deleteMany({});
        await WhatsAppConnection.deleteMany({});
        logger.info('Cleared existing data');

        // Create businesses
        const createdBusinesses = [];
        for (const businessData of sampleBusinesses) {
            const business = new Business({
                ...businessData,
                businessId: `BUS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                status: 'active',
                isActive: true
            });
            await business.save();
            createdBusinesses.push(business);
            logger.info(`Created business: ${business.name} (${business.businessId})`);
        }

        // Create branches
        const createdBranches = [];
        for (let i = 0; i < sampleBranches.length; i++) {
            const branchData = sampleBranches[i];
            const businessIndex = Math.floor(i / 2); // First 2 branches for first business, next for second
            const business = createdBusinesses[businessIndex];

            const branch = new Branch({
                ...branchData,
                businessId: business._id,
                branchId: `BR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                status: 'active',
                isActive: true
            });
            await branch.save();
            createdBranches.push(branch);
            logger.info(`Created branch: ${branch.name} (${branch.branchId}) for ${business.name}`);
        }

        // Create services
        for (let i = 0; i < sampleServices.length; i++) {
            const serviceData = sampleServices[i];
            let branchIndex = 0;
            
            // Assign services to branches based on business type
            if (i < 2) {
                // First 2 services for restaurant branches
                branchIndex = i % 2;
            } else {
                // Last 2 services for coffee branch
                branchIndex = 2;
            }

            const branch = createdBranches[branchIndex];
            const business = createdBusinesses[Math.floor(branchIndex / 2)];

            const service = new Service({
                ...serviceData,
                businessId: business._id,
                branchId: branch._id,
                serviceId: `SVC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                isActive: true
            });
            await service.save();
            logger.info(`Created service: ${service.name} for ${branch.name}`);
        }

        // Create users
        const createdUsers = [];
        for (const userData of sampleUsers) {
            // Create user - password will be hashed by User model pre('save') middleware
            const user = new User({
                ...userData,
                userId: `USR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                isActive: true
            });

            // Assign business and branch IDs
            if (userData.role === 'business_admin') {
                user.businessId = createdBusinesses[0]._id; // El Sabor
            } else if (userData.role === 'branch_admin') {
                user.businessId = createdBusinesses[0]._id; // El Sabor
                user.branchId = createdBranches[0]._id; // Sucursal Centro
            } else if (userData.role === 'staff') {
                user.businessId = createdBusinesses[0]._id; // El Sabor
                user.branchId = createdBranches[0]._id; // Sucursal Centro
            }

            await user.save();
            createdUsers.push(user);
            logger.info(`Created user: ${user.name} (${user.email}) - Role: ${user.role}`);
        }

        // Create super admin if not exists
        const superAdmin = await User.findOne({ role: 'super_admin' });
        if (!superAdmin) {
            const adminUser = new User({
                email: 'admin@easybranch.com',
                password: 'admin123', // Will be hashed by pre('save') middleware
                name: 'Super Administrador',
                role: 'super_admin',
                userId: `USR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                isActive: true,
                profile: {
                    phone: '+573001234567',
                    timezone: 'America/Bogota',
                    language: 'es'
                }
            });
            await adminUser.save();
            logger.info('Created super admin user');
        }

        // Create WhatsApp connections
        await createWhatsAppConnections(createdBusinesses, createdBranches, createdUsers);

        logger.info('Database seeded successfully!');
        logger.info(`Created ${createdBusinesses.length} businesses`);
        logger.info(`Created ${createdBranches.length} branches`);
        logger.info(`Created ${sampleServices.length} services`);
        logger.info(`Created ${createdUsers.length} users`);

        // Display login credentials
        console.log('\n=== CREDENCIALES DE ACCESO ===');
        console.log('Super Admin:');
        console.log('  Email: admin@easybranch.com');
        console.log('  Password: admin123');
        console.log('\nBusiness Admin:');
        console.log('  Email: gerente@elsabor.com');
        console.log('  Password: gerente123');
        console.log('\nBranch Admin:');
        console.log('  Email: sucursal@elsabor.com');
        console.log('  Password: sucursal123');
        console.log('\nStaff:');
        console.log('  Email: cocina@elsabor.com');
        console.log('  Password: cocina123');
        console.log('\n==============================');

    } catch (error) {
        logger.error('Error seeding database:', error);
        console.error('Error seeding database:', error);
    } finally {
        await databaseService.disconnect();
        process.exit(0);
    }
}

// Function to create WhatsApp connections
async function createWhatsAppConnections(businesses, branches, users) {
    logger.info('Creating WhatsApp connections...');
    
    const whatsappConnections = [
        {
            businessId: businesses[0]._id, // El Sabor
            branchId: branches[0]._id, // Sucursal Centro
            phoneNumber: '+573001234567',
            connectionName: 'WhatsApp Sucursal Centro',
            status: 'connected',
            autoReply: true,
            aiIntegration: true,
            businessHours: { start: '08:00', end: '22:00' },
            offHoursMessage: '¡Hola! 👋 Bienvenido a El Sabor - Sucursal Centro. Nuestro horario de atención es de 8:00 AM a 10:00 PM. ¿En qué puedo ayudarte?',
            messagesToday: 25,
            totalMessages: 450,
            responseRate: 95,
            createdBy: users[0]._id,
            customerServiceNumber: '+573001112233', // Added for demo
            connectionId: `WC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}1`
        },
        {
            businessId: businesses[0]._id, // El Sabor
            branchId: branches[1]._id, // Sucursal Norte
            phoneNumber: '+573007654321',
            connectionName: 'WhatsApp Sucursal Norte',
            status: 'disconnected',
            autoReply: true,
            aiIntegration: true,
            businessHours: { start: '09:00', end: '21:00' },
            offHoursMessage: '¡Hola! 👋 Bienvenido a El Sabor - Sucursal Norte. Estamos cerrados en este momento. Te responderemos mañana.',
            messagesToday: 0,
            totalMessages: 120,
            responseRate: 88,
            createdBy: users[0]._id,
            customerServiceNumber: '+573004445566', // Added for demo
            connectionId: `WC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}2`
        },
        {
            businessId: businesses[1]._id, // TechHub
            branchId: branches[2]._id, // TechHub Principal
            phoneNumber: '+573009876543',
            connectionName: 'WhatsApp TechHub',
            status: 'connecting',
            autoReply: true,
            aiIntegration: true,
            businessHours: { start: '08:00', end: '18:00' },
            offHoursMessage: '¡Hola! 👋 Gracias por contactar TechHub. Nuestro horario es de 8:00 AM a 6:00 PM. ¿En qué podemos ayudarte?',
            messagesToday: 12,
            totalMessages: 89,
            responseRate: 92,
            createdBy: users[0]._id,
            customerServiceNumber: '+573007778899', // Added for demo
            connectionId: `WC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}3`
        }
    ];

    for (const connectionData of whatsappConnections) {
        const connection = new WhatsAppConnection(connectionData);
        await connection.save();
        logger.info(`Created WhatsApp connection: ${connection.connectionName} (${connection.phoneNumber})`);
    }
}

// Run seed
seedDatabase();
