const mongoose = require('mongoose');
const BranchAIConfig = require('../src/models/BranchAIConfig');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function checkMenuContent() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const branchAIConfig = await BranchAIConfig.findOne({ branchId: '68c30abfe53cbd0d740e8c4e' });
        
        if (!branchAIConfig) {
            console.log('❌ No se encontró configuración de IA para la sucursal');
            return;
        }

        console.log('📋 Contenido del menú:');
        console.log('='.repeat(50));
        console.log(branchAIConfig.menuContent);
        console.log('='.repeat(50));

        // Parsear productos del menú
        const products = parseMenuContent(branchAIConfig.menuContent);
        console.log(`\n🍽️ Productos encontrados: ${products.length}`);
        
        products.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - $${product.price} (${product.category})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

function parseMenuContent(menuContent) {
    const products = [];
    const lines = menuContent.split('\n');
    
    let currentSection = '';
    let currentCategory = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Detectar secciones
        if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*')) {
            currentSection = trimmedLine.replace(/\*/g, '').trim();
            continue;
        }

        if (trimmedLine.match(/^[🌮🍽️☕🧊🥐🥪🍰🚚💳]/)) {
            currentSection = trimmedLine.replace(/^[🌮🍽️☕🧊🥐🥪🍰🚚💳]\s*/, '').trim();
            continue;
        }

        // Detectar categorías
        if (trimmedLine.includes(':') && !trimmedLine.includes('$')) {
            currentCategory = trimmedLine.replace(':', '').trim();
            continue;
        }

        // Detectar productos con precios
        let priceMatch = trimmedLine.match(/^(.+?)\s*-\s*\$([\d,]+)/);
        if (!priceMatch) {
            priceMatch = trimmedLine.match(/^(.+?)\s*\$\s*([\d,]+)/);
        }
        if (!priceMatch) {
            priceMatch = trimmedLine.match(/^(.+?)\s*\$([\d,]+)/);
        }

        if (priceMatch) {
            const productName = priceMatch[1].trim();
            const priceStr = priceMatch[2].replace(/,/g, '');
            const price = parseInt(priceStr);

            if (productName && !isNaN(price) && price > 0) {
                products.push({
                    name: productName.toLowerCase(),
                    price: price,
                    category: currentCategory || currentSection || 'general'
                });
            }
        }
    }

    return products;
}

checkMenuContent();
