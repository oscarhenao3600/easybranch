#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Función para actualizar URLs hardcodeadas en archivos HTML
function updateHTMLFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Solo procesar si no tiene config.js ya incluido
        if (!content.includes('config.js')) {
            // Agregar config.js después de bootstrap
            content = content.replace(
                /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^"]*"><\/script>/,
                '$&\n    <script src="config.js"></script>'
            );
        }
        
        // Reemplazar URLs hardcodeadas con variables dinámicas
        content = content.replace(
            /this\.baseURL = 'http:\/\/localhost:3000\/api';/g,
            'this.baseURL = window.appConfig.getBaseURL();'
        );
        
        content = content.replace(
            /'http:\/\/localhost:3000\/api'/g,
            'window.appConfig.getBaseURL()'
        );
        
        content = content.replace(
            /`http:\/\/localhost:3000\/api\//g,
            '`${this.baseURL}/'
        );
        
        content = content.replace(
            /http:\/\/localhost:3000\/api\//g,
            '${this.baseURL}/'
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Actualizado: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error actualizando ${filePath}:`, error.message);
    }
}

// Función principal
function main() {
    const frontendDir = path.join(__dirname, 'frontend-admin');
    
    if (!fs.existsSync(frontendDir)) {
        console.error('❌ Directorio frontend-admin no encontrado');
        process.exit(1);
    }
    
    console.log('🔧 Actualizando archivos HTML del frontend...');
    
    const files = fs.readdirSync(frontendDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    htmlFiles.forEach(file => {
        const filePath = path.join(frontendDir, file);
        updateHTMLFile(filePath);
    });
    
    console.log(`✅ Procesados ${htmlFiles.length} archivos HTML`);
    console.log('📝 Recuerda:');
    console.log('   1. Copiar config.js a tu servidor');
    console.log('   2. Configurar ALLOWED_ORIGINS en .env del backend');
    console.log('   3. Reiniciar el backend');
}

if (require.main === module) {
    main();
}

module.exports = { updateHTMLFile };
