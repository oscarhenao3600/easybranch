// CONFIGURACIÓN OPTIMIZADA PARA RASPBERRY PI
// Reemplaza la configuración de puppeteer en WhatsAppServiceSimple.js

// PRIMERA FUNCIÓN (línea ~102):
const puppeteerConfig = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
    ],
    timeout: 60000, // 60 segundos timeout
    protocolTimeout: 60000
};

// Solo en Raspberry Pi (producción) usar executablePath y configuración optimizada
if (process.env.PLATFORM === 'raspberry') {
    puppeteerConfig.executablePath = '/usr/bin/chromium';
    // Configuración adicional para Raspberry Pi
    puppeteerConfig.args.push(
        '--disable-software-rasterizer',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript-harmony-shipping',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-ipc-flooding-protection'
    );
}

// INSTRUCCIONES DE INSTALACIÓN:
// 1. Conectarse al Raspberry Pi: ssh usuario@ip_del_raspberry_pi
// 2. Navegar al directorio: cd /home/oscarhenao/easybranch
// 3. Parar PM2: pm2 stop all
// 4. Editar el archivo: nano backend/src/services/WhatsAppServiceSimple.js
// 5. Buscar las dos funciones que tienen "Configurar puppeteer" (líneas ~102 y ~217)
// 6. Reemplazar la configuración con la de arriba
// 7. Guardar y salir: Ctrl+X, Y, Enter
// 8. Reiniciar PM2: pm2 restart all
// 9. Verificar logs: pm2 logs --lines 20
