# 🚀 Instrucciones para Configurar PM2 con Puppeteer

## 📋 **Paso a Paso para Raspberry Pi**

### **1. Conectarse al Raspberry Pi:**
```bash
ssh usuario@ip_del_raspberry_pi
```

### **2. Navegar al directorio del proyecto:**
```bash
cd /home/oscarhenao/easybranch
```

### **3. Crear el archivo ecosystem.config.js:**
```bash
nano ecosystem.config.js
```

### **4. Copiar y pegar este contenido:**

```javascript
module.exports = {
  apps: [
    {
      name: 'easybranch-backend',
      script: 'backend/src/server.js',
      cwd: '/home/oscarhenao/easybranch',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PLATFORM: 'raspberry',
        MONGODB_URI: 'mongodb://localhost:27017/easybranch',
        // Variables para Puppeteer
        DISPLAY: ':0',
        CHROME_BIN: '/usr/bin/chromium',
        PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium',
        // Variables de sistema
        PATH: process.env.PATH + ':/usr/bin:/usr/local/bin',
        // Configuración de WhatsApp
        WHATSAPP_PROVIDER: 'whatsapp-web',
        WHATSAPP_SESSION_PATH: './whatsapp-sessions',
        WHATSAPP_MAX_RECONNECTION_ATTEMPTS: 5,
        WHATSAPP_INITIALIZATION_TIMEOUT: 120000,
        // Configuración de IA
        HUGGINGFACE_API_KEY: 'tu_api_key_aqui',
        HUGGINGFACE_MODEL: 'microsoft/DialoGPT-medium',
        USE_HUGGINGFACE: true,
        // JWT Secret
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
        JWT_EXPIRES_IN: '24h'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Configuración específica para Puppeteer
      exec_mode: 'fork',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Logs
      log_file: './logs/backend-out.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'easybranch-frontend',
      script: 'frontend-admin/server.js',
      cwd: '/home/oscarhenao/easybranch',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      // Logs
      log_file: './logs/frontend-out.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
```

### **5. Guardar y salir:**
```bash
Ctrl+X, Y, Enter
```

### **6. Parar PM2 actual:**
```bash
pm2 stop all
pm2 delete all
```

### **7. Crear directorio de logs si no existe:**
```bash
mkdir -p logs
```

### **8. Iniciar con la nueva configuración:**
```bash
pm2 start ecosystem.config.js
```

### **9. Guardar la configuración:**
```bash
pm2 save
```

### **10. Configurar auto-start (opcional):**
```bash
pm2 startup
```

### **11. Verificar que funcione:**
```bash
pm2 status
pm2 logs --lines 20
```

## 🔍 **Verificación**

### **Para verificar WhatsApp:**
```bash
pm2 logs easybranch-backend | grep -E "(Ready|WhatsApp|QR|Error)"
```

**Deberías ver:**
```
✅ Cliente WhatsApp inicializado exitosamente
✅ ===== WHATSAPP CLIENT READY =====
```

### **Para verificar la IA:**
```bash
pm2 logs easybranch-backend | grep -E "(IA|HuggingFace|simulación)"
```

**Deberías ver:**
```
🤖 ===== IA CONFIGURADA CON HUGGINGFACE =====
```

## 🚨 **Si hay problemas:**

### **Verificar variables de entorno:**
```bash
pm2 env 0
```

### **Verificar que Chromium esté instalado:**
```bash
which chromium
/usr/bin/chromium --version
```

### **Si no está instalado:**
```bash
sudo apt update
sudo apt install chromium-browser
```

### **Verificar permisos:**
```bash
ls -la /home/oscarhenao/easybranch/backend/whatsapp-sessions/
```

### **Limpiar sesiones si es necesario:**
```bash
rm -rf /home/oscarhenao/easybranch/backend/whatsapp-sessions/*
```

## 📝 **Notas Importantes:**

1. **API Key de HuggingFace**: Cambia `tu_api_key_aqui` por tu API key real
2. **JWT Secret**: Cambia el JWT secret por uno más seguro
3. **Puertos**: Backend en 3000, Frontend en 4000
4. **Logs**: Se guardan en el directorio `logs/`

## 🎯 **Resultado Esperado:**

Después de aplicar estos pasos, deberías tener:
- ✅ WhatsApp funcionando correctamente con PM2
- ✅ IA configurada con HuggingFace
- ✅ Logs organizados
- ✅ Auto-restart en caso de fallos
- ✅ Configuración persistente

¡Con esta configuración, PM2 debería funcionar igual de bien que cuando ejecutas `npm start` directamente!
