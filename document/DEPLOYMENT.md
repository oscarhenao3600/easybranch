# ===== EASYBRANCH - DEPLOYMENT GUIDE =====

## 🚀 Guía de Despliegue

### 📋 Prerrequisitos para Producción

1. **Servidor VPS/Cloud**
   - Ubuntu 20.04+ o CentOS 8+
   - 2GB RAM mínimo (4GB recomendado)
   - 20GB almacenamiento
   - Node.js 18+
   - MongoDB 5+

2. **Dominio y SSL**
   - Dominio configurado
   - Certificado SSL (Let's Encrypt recomendado)
   - DNS configurado

### 🔧 Configuración del Servidor

#### 1. Instalar Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

#### 2. Instalar MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# CentOS/RHEL
sudo yum install -y mongodb-org
```

#### 3. Instalar PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 📁 Despliegue de la Aplicación

#### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd EasyBranch
```

#### 2. Instalar Dependencias
```bash
npm run install:all
```

#### 3. Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp backend/env.example backend/.env

# Editar configuración de producción
nano backend/.env
```

**Configuración de Producción (.env):**
```bash
# Base de datos
MONGODB_URI=mongodb://localhost:27017/easybranch
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/easybranch

# Servidor
PORT=4000
NODE_ENV=production

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# WhatsApp
WHATSAPP_PROVIDER=whatsapp-web

# CORS (configurar con tu dominio)
CORS_ORIGIN=https://tu-dominio.com,https://www.tu-dominio.com

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Seguridad
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 4. Inicializar Base de Datos
```bash
npm run seed
```

#### 5. Configurar PM2
```bash
# Crear archivo de configuración PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'easybranch-backend',
    script: './backend/src/server.js',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }, {
    name: 'easybranch-frontend',
    script: './frontend-admin/frontend-server.js',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/frontend-err.log',
    out_file: './logs/frontend-out.log',
    log_file: './logs/frontend-combined.log',
    time: true
  }]
};
EOF
```

#### 6. Iniciar con PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 🌐 Configuración de Nginx

#### 1. Instalar Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### 2. Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/easybranch
```

**Configuración Nginx:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend (puerto 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API (puerto 4000)
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. Habilitar el Sitio
```bash
sudo ln -s /etc/nginx/sites-available/easybranch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 🔒 Configuración SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Configurar renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 📊 Monitoreo y Mantenimiento

#### 1. Comandos PM2 Útiles
```bash
pm2 status              # Ver estado de aplicaciones
pm2 logs                # Ver logs en tiempo real
pm2 restart all         # Reiniciar todas las aplicaciones
pm2 stop all            # Detener todas las aplicaciones
pm2 monit               # Monitor interactivo
```

#### 2. Backup de Base de Datos
```bash
# Crear script de backup
cat > backup.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db easybranch --out /backups/easybranch_$DATE
tar -czf /backups/easybranch_$DATE.tar.gz /backups/easybranch_$DATE
rm -rf /backups/easybranch_$DATE
find /backups -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Programar backup diario
crontab -e
# Agregar: 0 2 * * * /ruta/al/backup.sh
```

#### 3. Logs y Monitoreo
```bash
# Ver logs de la aplicación
pm2 logs easybranch-backend
pm2 logs easybranch-frontend

# Ver logs del sistema
sudo journalctl -u nginx
sudo journalctl -u mongod
```

### 🔧 Comandos de Mantenimiento

```bash
# Actualizar aplicación
git pull origin main
npm run install:all
pm2 restart all

# Limpiar sesiones de WhatsApp
npm run clean:sessions

# Verificar salud de la aplicación
curl https://tu-dominio.com/api/health

# Reiniciar servicios
sudo systemctl restart nginx
sudo systemctl restart mongod
pm2 restart all
```

### 🚨 Solución de Problemas Comunes

#### 1. Puerto en Uso
```bash
sudo lsof -i :3000
sudo lsof -i :4000
sudo kill -9 <PID>
```

#### 2. Problemas de Permisos
```bash
sudo chown -R $USER:$USER /ruta/a/EasyBranch
chmod -R 755 /ruta/a/EasyBranch
```

#### 3. Problemas de Memoria
```bash
# Aumentar límite de memoria para Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 4. WhatsApp no Conecta
```bash
# Verificar sesiones
ls -la backend/sessions/
# Limpiar sesiones si es necesario
rm -rf backend/sessions/*
```

### 📈 Optimizaciones de Rendimiento

#### 1. Configuración de MongoDB
```bash
# Editar configuración de MongoDB
sudo nano /etc/mongod.conf

# Optimizaciones recomendadas:
# - Aumentar cache size
# - Configurar índices
# - Habilitar compresión
```

#### 2. Configuración de Nginx
```bash
# Optimizaciones en nginx.conf
# - Habilitar gzip
# - Configurar cache
# - Optimizar buffers
```

#### 3. Monitoreo de Recursos
```bash
# Instalar herramientas de monitoreo
sudo apt install htop iotop nethogs

# Monitorear uso de recursos
htop
iotop
nethogs
```

---

## ✅ Checklist de Despliegue

- [ ] Servidor configurado con Node.js 18+
- [ ] MongoDB instalado y ejecutándose
- [ ] Dominio configurado con DNS
- [ ] SSL configurado con Let's Encrypt
- [ ] Variables de entorno configuradas
- [ ] Base de datos inicializada con datos de prueba
- [ ] PM2 configurado y ejecutándose
- [ ] Nginx configurado como proxy reverso
- [ ] Backup automático configurado
- [ ] Monitoreo configurado
- [ ] Logs configurados
- [ ] WhatsApp funcionando correctamente

---

**¡EasyBranch está listo para producción! 🚀**

*Guía de despliegue v2.0.0 - WhatsApp Integration Complete*
