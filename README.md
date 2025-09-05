# 🚀 EasyBranch - Sistema de Gestión de Negocios Multi-Sucursal

## 📋 Descripción

EasyBranch es una plataforma completa de gestión empresarial diseñada para negocios con múltiples sucursales. Incluye gestión de usuarios, negocios, sucursales, y **integración completa con WhatsApp** para automatización de pedidos y atención al cliente.

## ✨ Funcionalidades Implementadas

### 🔐 **Sistema de Autenticación**
- ✅ Login seguro con JWT
- ✅ Roles de usuario (Super Admin, Admin, Usuario)
- ✅ Gestión de sesiones
- ✅ Middleware de autenticación

### 🏢 **Gestión de Negocios**
- ✅ CRUD completo de negocios
- ✅ Gestión de sucursales
- ✅ Asignación de usuarios a sucursales
- ✅ Dashboard administrativo

### 📱 **Integración WhatsApp (COMPLETAMENTE FUNCIONAL)**
- ✅ **QR codes reales** de WhatsApp Web
- ✅ **Conexión real** con WhatsApp
- ✅ **Envío de mensajes** en tiempo real
- ✅ **Recepción de mensajes** automática
- ✅ **Respuestas automáticas** con IA
- ✅ **Múltiples conexiones** simultáneas
- ✅ **Renovación automática** de QR codes
- ✅ **Gestión de sesiones** persistentes

### 🎨 **Interfaz de Usuario**
- ✅ **Diseño moderno** con paleta de colores sobria
- ✅ **Cards verticales** para mejor visualización de QR codes
- ✅ **Responsive design** para móviles y desktop
- ✅ **Bootstrap 5** con componentes personalizados

### 🔧 **Backend Robusto**
- ✅ **Node.js/Express.js** con arquitectura modular
- ✅ **MongoDB** con Mongoose ODM
- ✅ **Logging completo** con Winston
- ✅ **Manejo de errores** robusto
- ✅ **CORS** configurado correctamente

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- MongoDB 5+
- npm o yarn

### Instalación Rápida

```bash
# Clonar el repositorio
git clone <repository-url>
cd EasyBranch

# Instalar dependencias
npm run install:all

# Configurar variables de entorno
cp backend/env.example backend/.env
# Editar backend/.env con tus configuraciones

# Inicializar base de datos
npm run seed

# Ejecutar en modo desarrollo
npm run dev
```

### Variables de Entorno Importantes

```bash
# Base de datos
MONGODB_URI=mongodb://localhost:27017/easybranch

# Servidor
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# WhatsApp
WHATSAPP_PROVIDER=whatsapp-web

# CORS
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

## 📱 Uso de WhatsApp

### Conectar WhatsApp a una Sucursal

1. **Accede** a `http://localhost:3000`
2. **Haz login** con `admin@easybranch.com` / `admin123`
3. **Ve a WhatsApp** en el menú lateral
4. **Haz clic en "Conectar"** en la sucursal deseada
5. **Escanea el QR code** con tu WhatsApp
6. **¡Listo!** La conexión estará activa

### Funcionalidades de WhatsApp

- ✅ **QR codes reales** que funcionan con WhatsApp
- ✅ **Renovación automática** cada minuto
- ✅ **Respuestas automáticas** a "Hola"
- ✅ **Envío de mensajes** programáticos
- ✅ **Recepción de mensajes** en tiempo real
- ✅ **Múltiples conexiones** por negocio

## 🏗️ Arquitectura del Proyecto

```
EasyBranch/
├── backend/                 # API Node.js/Express
│   ├── src/
│   │   ├── controllers/     # Controladores de rutas
│   │   ├── models/         # Modelos de MongoDB
│   │   ├── routes/         # Definición de rutas
│   │   ├── services/       # Servicios de negocio
│   │   ├── middleware/     # Middleware personalizado
│   │   └── logs/          # Archivos de log
│   ├── sessions/          # Sesiones de WhatsApp Web
│   └── uploads/           # Archivos subidos
├── frontend-admin/         # Interfaz administrativa
│   ├── index.html         # Página de login
│   ├── super.html         # Dashboard principal
│   ├── styles.css         # Estilos personalizados
│   └── frontend-server.js # Servidor frontend
└── README.md              # Este archivo
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Ejecuta frontend y backend
npm run dev:frontend     # Solo frontend
npm run dev:backend      # Solo backend

# Producción
npm run start            # Ejecuta en modo producción
npm run install:all      # Instala todas las dependencias

# Base de datos
npm run seed             # Pobla la base de datos con datos de prueba
```

## 📊 APIs Disponibles

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/logout` - Logout de usuario

### Negocios
- `GET /api/business` - Listar negocios
- `POST /api/business` - Crear negocio
- `PUT /api/business/:id` - Actualizar negocio
- `DELETE /api/business/:id` - Eliminar negocio

### Sucursales
- `GET /api/branch` - Listar sucursales
- `POST /api/branch` - Crear sucursal
- `PUT /api/branch/:id` - Actualizar sucursal
- `DELETE /api/branch/:id` - Eliminar sucursal

### WhatsApp
- `GET /api/whatsapp/connections` - Listar conexiones
- `POST /api/whatsapp/connections` - Crear conexión
- `GET /api/whatsapp/connections/:id/qr` - Obtener QR code
- `POST /api/whatsapp/connections/:id/toggle` - Conectar/Desconectar
- `POST /api/whatsapp/send-message` - Enviar mensaje
- `POST /api/whatsapp/webhook` - Webhook para mensajes entrantes

## 🎯 Próximas Funcionalidades

### 📋 **Gestión de Pedidos**
- [ ] Sistema de pedidos por WhatsApp
- [ ] Catálogo de productos
- [ ] Gestión de inventario
- [ ] Procesamiento de pagos

### 🤖 **IA Avanzada**
- [ ] Respuestas automáticas más inteligentes
- [ ] Análisis de sentimientos
- [ ] Recomendaciones de productos
- [ ] Chatbot conversacional

### 📊 **Analytics y Reportes**
- [ ] Dashboard de métricas
- [ ] Reportes de ventas
- [ ] Análisis de conversaciones
- [ ] KPIs de WhatsApp

### 🔔 **Notificaciones**
- [ ] Notificaciones push
- [ ] Alertas de pedidos
- [ ] Recordatorios automáticos
- [ ] Integración con email

## 🐛 Solución de Problemas

### WhatsApp no se conecta
1. Verifica que el puerto 4000 esté libre
2. Revisa los logs en `backend/src/logs/`
3. Asegúrate de que MongoDB esté ejecutándose
4. Verifica las variables de entorno

### QR Code no se genera
1. Revisa que `whatsapp-web.js` esté instalado
2. Verifica permisos de escritura en `./sessions/`
3. Revisa los logs del backend

### CORS Errors
1. Verifica que `CORS_ORIGIN` esté configurado correctamente
2. Asegúrate de que el frontend esté en el puerto 3000

## 📞 Soporte

Para problemas técnicos:
1. Revisa los logs en `backend/src/logs/`
2. Verifica la configuración de variables de entorno
3. Consulta la documentación de APIs

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

**¡EasyBranch está listo para producción! 🚀**

*Versión actual: 2.0.0 - WhatsApp Integration Complete*