const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor EasyBranch...');

// Ejecutar el servidor
const server = spawn('node', ['src/server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
});

server.on('error', (error) => {
    console.error('❌ Error iniciando servidor:', error);
});

server.on('close', (code) => {
    console.log(`🛑 Servidor cerrado con código: ${code}`);
});

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.kill('SIGTERM');
    process.exit(0);
});

console.log('✅ Servidor iniciado. Presiona Ctrl+C para detener.');
