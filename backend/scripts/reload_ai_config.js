const mongoose = require('mongoose');
const BranchAIConfig = require('../src/models/BranchAIConfig');
const Branch = require('../src/models/Branch');

// Configurar conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/easybranch', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function reloadAIConfig() {
  try {
    console.log('🔄 ===== RECARGANDO CONFIGURACIÓN DE IA =====');
    
    // Obtener la configuración de IA actualizada
    const branch = await Branch.findOne({ name: 'Sucursal Centro' });
    
    if (!branch) {
      console.error('❌ No se encontró la sucursal');
      return;
    }
    
    const aiConfig = await BranchAIConfig.findOne({ branchId: branch._id });
    
    if (!aiConfig) {
      console.error('❌ No se encontró configuración de IA');
      return;
    }
    
    console.log('📋 Configuración encontrada:');
    console.log(`   - Branch ID: ${aiConfig.branchId}`);
    console.log(`   - Menú configurado: ${aiConfig.menuContent ? 'Sí' : 'No'}`);
    console.log(`   - Prompt configurado: ${aiConfig.customPrompt ? 'Sí' : 'No'}`);
    console.log(`   - Última actualización: ${aiConfig.lastUpdated}`);
    
    // Hacer una petición HTTP para recargar la configuración
    const fetch = require('node-fetch');
    
    try {
      // Obtener token de autenticación
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'admin@easybranch.com',
          password: 'admin123'
        })
      });
      
      const loginData = await loginResponse.json();
      
      if (!loginData.token) {
        throw new Error('No se pudo obtener token de autenticación');
      }
      
      console.log('🔑 Token obtenido exitosamente');
      
      // Recargar configuración de IA
      const reloadResponse = await fetch('http://localhost:3000/api/whatsapp/reload-ai-configs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const reloadData = await reloadResponse.json();
      
      if (reloadData.success) {
        console.log('✅ Configuración de IA recargada exitosamente');
        console.log('💬 WhatsApp ahora debería mostrar el menú actualizado');
      } else {
        console.log('⚠️ Respuesta del servidor:', reloadData.message || 'Sin mensaje');
      }
      
    } catch (httpError) {
      console.log('⚠️ No se pudo recargar via HTTP, pero la configuración está actualizada');
      console.log('💡 El servidor cargará la nueva configuración en el próximo reinicio');
    }
    
    console.log('\n📊 RESUMEN DE LA CONFIGURACIÓN:');
    console.log('=====================================');
    
    if (aiConfig.menuContent) {
      const sections = aiConfig.menuContent.split('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const products = aiConfig.menuContent.split('\n').filter(line => 
        line.includes('•') && line.includes('$')
      );
      
      console.log(`• Secciones del menú: ${sections.length}`);
      console.log(`• Productos en el menú: ${products.length}`);
      console.log(`• Longitud del contenido: ${aiConfig.menuContent.length} caracteres`);
      
      // Mostrar algunas líneas del menú
      console.log('\n📋 MUESTRA DEL MENÚ:');
      const menuLines = aiConfig.menuContent.split('\n').slice(0, 10);
      menuLines.forEach(line => {
        if (line.trim()) {
          console.log(`   ${line}`);
        }
      });
      console.log('   ...');
    }
    
    console.log('\n🎉 ¡Configuración de IA lista!');
    console.log('💬 Prueba enviando "menu" o "menú" a WhatsApp');
    
  } catch (error) {
    console.error('❌ Error recargando configuración de IA:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Ejecutar el script
reloadAIConfig();





