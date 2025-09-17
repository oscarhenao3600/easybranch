const mongoose = require('mongoose');
const BranchAIConfig = require('../src/models/BranchAIConfig');
const Branch = require('../src/models/Branch');

// Configurar conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/easybranch', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Contenido del menú estructurado para WhatsApp
const structuredMenuContent = `☕ *MENÚ CAFETERÍA EASYBRANCH CENTRO*

📍 *INFORMACIÓN DEL LOCAL*
• Dirección: Calle 123 #45-67, Bogotá
• Teléfono: +57 1 234 5678
• WhatsApp: +57 1 234 5678
• Horarios: Lunes a Domingo 6:00 AM - 10:00 PM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☕ *BEBIDAS CALIENTES*

*Café*
• Café Americano - $3,500
• Café con Leche - $4,000
• Cappuccino - $4,500
• Latte - $4,800
• Mocha - $5,200
• Macchiato - $4,700
• Café Descafeinado - $3,800
• Espresso Doble - $4,000

*Tés e Infusiones*
• Té Negro - $2,800
• Té Verde - $2,800
• Té de Hierbas - $3,000
• Té de Manzanilla - $3,000
• Té de Jengibre - $3,200
• Chocolate Caliente - $4,500
• Aromática de Canela - $3,500

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧊 *BEBIDAS FRÍAS*

*Café Frío*
• Café Helado - $4,000
• Frappé de Café - $5,500
• Cold Brew - $4,500
• Iced Latte - $5,000
• Frappé de Mocha - $6,000

*Jugos y Refrescos*
• Jugo de Naranja Natural - $4,500
• Jugo de Maracuyá - $4,800
• Jugo de Mango - $4,800
• Limonada Natural - $3,500
• Limonada de Coco - $4,000
• Agua de Panela - $2,500
• Gaseosa - $3,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🥐 *DESAYUNOS*

*Desayunos Tradicionales*
• Desayuno Ejecutivo - $12,000
  (Huevos revueltos, tostadas, café y jugo)
• Desayuno Continental - $8,500
  (Pan, mantequilla, mermelada, café)
• Desayuno Saludable - $10,000
  (Avena, frutas, yogurt y té)
• Arepa con Huevo - $6,500
• Calentado Paisa - $8,000

*Pastelería*
• Croissant Simple - $3,500
• Croissant con Jamón y Queso - $5,500
• Muffin de Arándanos - $4,000
• Muffin de Chocolate - $4,000
• Donut Glaseado - $3,000
• Brownie - $4,500
• Cheesecake - $6,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🥪 *ALMUERZOS*

*Sopas*
• Sopa de Pollo - $8,500
• Crema de Espinacas - $7,500
• Sopa de Lentejas - $8,000
• Sopa de Verduras - $7,000

*Platos Principales*
• Ensalada César - $12,000
• Ensalada de Pollo - $13,500
• Sandwich Club - $11,000
• Hamburguesa Clásica - $15,000
• Hamburguesa con Queso - $16,500
• Wrap de Pollo - $10,500
• Wrap Vegetariano - $9,500
• Pasta Alfredo - $14,000
• Pasta Bolognesa - $15,500

*Acompañamientos*
• Papas a la Francesa - $5,500
• Papas Rústicas - $6,000
• Ensalada Verde - $4,500
• Arroz Blanco - $3,500

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍰 *POSTRES*

*Postres Caseros*
• Torta de Chocolate - $6,500
• Torta de Zanahoria - $6,000
• Tiramisu - $7,500
• Flan de Caramelo - $5,500
• Helado de Vainilla - $4,000
• Helado de Chocolate - $4,000
• Helado de Fresa - $4,000

*Postres Especiales*
• Sundae de Chocolate - $8,000
• Banana Split - $9,500
• Waffle con Helado - $10,000
• Crepes de Nutella - $8,500

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚚 *SERVICIOS*

*Delivery*
• Costo de Domicilio: $2,500
• Radio de Entrega: 5 km
• Tiempo Estimado: 30-45 minutos
• Pedido Mínimo: $15,000

*Pickup*
• Tiempo de Preparación: 15-20 minutos
• Disponible: Todo el día

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 *MÉTODOS DE PAGO*
• Efectivo
• Tarjeta
• Nequi
• Daviplata

*Todos los precios incluyen IVA*`;

async function updateAIMenu() {
  try {
    console.log('🤖 ===== ACTUALIZANDO MENÚ DE IA =====');
    
    // Obtener la sucursal
    const branch = await Branch.findOne({ name: 'Sucursal Centro' });
    
    if (!branch) {
      console.error('❌ No se encontró la sucursal');
      return;
    }
    
    console.log('🏪 Sucursal encontrada:', branch.name);
    console.log('🆔 Branch ID:', branch._id);
    
    // Buscar o crear configuración de IA
    let aiConfig = await BranchAIConfig.findOne({ branchId: branch._id });
    
    if (!aiConfig) {
      console.log('📝 Creando nueva configuración de IA...');
      aiConfig = new BranchAIConfig({
        branchId: branch._id,
        isActive: true,
        createdBy: 'system'
      });
    } else {
      console.log('📝 Actualizando configuración existente de IA...');
    }
    
    // Actualizar contenido del menú
    aiConfig.menuContent = structuredMenuContent;
    aiConfig.lastUpdated = new Date();
    aiConfig.isActive = true;
    
    await aiConfig.save();
    
    console.log('✅ Configuración de IA actualizada exitosamente');
    console.log('📋 Contenido del menú actualizado');
    console.log(`📊 Longitud del contenido: ${structuredMenuContent.length} caracteres`);
    
    // Mostrar resumen del menú
    console.log('\n📋 RESUMEN DEL MENÚ ACTUALIZADO:');
    console.log('=====================================');
    
    const sections = structuredMenuContent.split('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`• Total de secciones: ${sections.length}`);
    
    const productLines = structuredMenuContent.split('\n').filter(line => 
      line.includes('•') && line.includes('$')
    );
    console.log(`• Total de productos: ${productLines.length}`);
    
    const totalValue = productLines.reduce((sum, line) => {
      const priceMatch = line.match(/\$([\d,]+)/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1].replace(/,/g, ''));
        return sum + price;
      }
      return sum;
    }, 0);
    
    console.log(`• Valor total del menú: $${totalValue.toLocaleString()}`);
    console.log(`• Precio promedio: $${Math.round(totalValue / productLines.length)}`);
    
    console.log('\n🎉 ¡Menú de IA actualizado exitosamente!');
    console.log('💬 Ahora WhatsApp mostrará el menú completo estructurado');
    
  } catch (error) {
    console.error('❌ Error actualizando menú de IA:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Ejecutar el script
updateAIMenu();





