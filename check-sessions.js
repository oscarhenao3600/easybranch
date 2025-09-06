const fs = require('fs');
const path = require('path');

function checkSessions() {
    console.log('🔍 ===== VERIFICANDO SESIONES WHATSAPP =====');
    
    const sessionsDir = './backend/sessions';
    
    if (!fs.existsSync(sessionsDir)) {
        console.log('❌ Directorio de sesiones no existe:', sessionsDir);
        return;
    }
    
    const sessions = fs.readdirSync(sessionsDir);
    console.log('📁 Directorio de sesiones:', sessionsDir);
    console.log('📊 Total de sesiones encontradas:', sessions.length);
    
    sessions.forEach(session => {
        const sessionPath = path.join(sessionsDir, session);
        const stats = fs.statSync(sessionPath);
        
        console.log(`\n📱 Sesión: ${session}`);
        console.log(`   📅 Última modificación: ${stats.mtime}`);
        console.log(`   📏 Tamaño: ${stats.size} bytes`);
        
        // Check if session has WhatsApp data
        const whatsappDir = path.join(sessionPath, `session-whatsapp_${session}`);
        if (fs.existsSync(whatsappDir)) {
            console.log(`   ✅ Datos de WhatsApp encontrados`);
            
            // List some files
            try {
                const files = fs.readdirSync(whatsappDir);
                console.log(`   📄 Archivos: ${files.length}`);
                if (files.length > 0) {
                    console.log(`   📋 Primeros archivos: ${files.slice(0, 3).join(', ')}`);
                }
            } catch (error) {
                console.log(`   ❌ Error leyendo archivos: ${error.message}`);
            }
        } else {
            console.log(`   ⚠️ Datos de WhatsApp no encontrados`);
        }
    });
    
    console.log('\n==========================================');
}

checkSessions();
