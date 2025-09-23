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
- ✅ Gestión de sucursales con direcciones formateadas
- ✅ Asignación de usuarios a sucursales
- ✅ Dashboard administrativo centralizado
- ✅ Eliminación permanente de negocios y sucursales
- ✅ Validación completa de formularios

### 📱 **Integración WhatsApp (COMPLETAMENTE FUNCIONAL)**
- ✅ **QR codes reales** de WhatsApp Web
- ✅ **Conexión real** con WhatsApp
- ✅ **Envío de mensajes** en tiempo real
- ✅ **Recepción de mensajes** automática
- ✅ **Respuestas automáticas** con IA
- ✅ **Múltiples conexiones** simultáneas
- ✅ **Renovación automática** de QR codes
- ✅ **Gestión de sesiones** persistentes
- ✅ **Selección de sucursales** con direcciones completas
- ✅ **Creación de conexiones** sin errores

### 🤖 **IA Avanzada y Procesamiento Inteligente**
- ✅ **Sistema de recomendaciones estilo Akinator** (5 preguntas inteligentes)
- ✅ **Lectura automática de menús PDF** por sucursal
- ✅ **Tolerancia a errores de escritura** y dislexia
- ✅ **Procesamiento automático de pedidos** con cálculos
- ✅ **Análisis de intención** (saludo, pedido, consulta, etc.)
- ✅ **Contexto avanzado** con historial de conversaciones
- ✅ **Respuestas personalizadas** basadas en el menú de cada sucursal
- ✅ **Detección inteligente** de productos y cantidades
- ✅ **Cálculo automático** de totales con delivery
- ✅ **Sistema de confirmación de pedidos** con guardado automático en BD
- ✅ **Solicitud de datos de envío** para pedidos a domicilio
- ✅ **Detección de confirmaciones** múltiples ("sí", "confirmo", "ok", "perfecto")

### 🎨 **Interfaz de Usuario**
- ✅ **Diseño moderno** con paleta de colores sobria
- ✅ **Cards verticales** para mejor visualización de QR codes
- ✅ **Responsive design** para móviles y desktop
- ✅ **Bootstrap 5** con componentes personalizados

### 🗄️ **Base de Datos y Almacenamiento**
- ✅ **MongoDB** con 18 colecciones optimizadas
- ✅ **Índices compuestos** para consultas rápidas
- ✅ **Almacenamiento de pedidos** con confirmación automática
- ✅ **Sistema de recomendaciones** con sesiones persistentes
- ✅ **Memoria conversacional** por cliente
- ✅ **Base de conocimiento** empresarial
- ✅ **Estructura escalable** para múltiples sucursales
- ✅ **Sin migraciones requeridas** - Compatible con datos existentes

### ⚙️ **Sistema de Configuración Centralizada** 🆕
- ✅ **Panel de configuración del sistema** completo
- ✅ **Gestión de variables de entorno** con interfaz visual
- ✅ **Configuración de IA centralizada** y proveedores
- ✅ **Configuración de WhatsApp** y proveedores de API
- ✅ **Configuración de tipos de negocio** personalizables
- ✅ **Gestión de usuarios y roles** con permisos granulares
- ✅ **Asignación de funcionalidades** por medio de checkboxes
- ✅ **Pruebas de conexión** para base de datos y servicios
- ✅ **Interfaz de tabs** para navegación intuitiva

### 🔧 **Backend Robusto**
- ✅ **Node.js/Express.js** con arquitectura modular
- ✅ **MongoDB** con Mongoose ODM
- ✅ **Logging completo** con Winston
- ✅ **Manejo de errores** robusto
- ✅ **CORS** configurado correctamente
- ✅ **CSP (Content Security Policy)** configurado
- ✅ **Validación de datos** con express-validator
- ✅ **Autenticación JWT** robusta

## 🗄️ Base de Datos

### Estructura Actual
El sistema utiliza **MongoDB** con 18 colecciones optimizadas:

- **orders** - Pedidos con confirmación automática (14 pedidos almacenados)
- **businesses** - Negocios y empresas
- **branches** - Sucursales por negocio
- **whatsappconnections** - Conexiones WhatsApp activas
- **users** - Usuarios del sistema con roles
- **services** - Productos y servicios
- **branchaiconfigs** - Configuración IA por sucursal
- **recommendationsessions** - Sesiones de recomendación
- **conversationmemories** - Memoria conversacional
- **businessknowledgebases** - Base de conocimiento
- **conversations** - Historial de conversaciones
- **messageanalytics** - Análisis de mensajes
- **clientstats** - Estadísticas de clientes
- **branchpdfs** - PDFs de menús por sucursal
- **advanced_context** - Contexto avanzado
- **conversationorders** - Órdenes de conversación
- **branchprompts** - Prompts personalizados
- **devicelinkings** - Vinculaciones de dispositivos

### Índices Optimizados
- **Índices únicos**: orderId, businessId, branchId
- **Índices compuestos**: clientId + branchId
- **Índices de consulta**: status, createdAt, customer.phone
- **Sin migraciones requeridas** - Compatible con datos existentes

📄 **Ver estructura completa:** [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md)

## 🛒 Flujo de Confirmación de Pedidos

### Proceso Automático
1. **Cliente hace pedido** → Bot genera resumen con totales
2. **Bot pregunta confirmación** → "¿Confirmas este pedido?"
3. **Cliente confirma** → Detecta "sí", "confirmo", "ok", "perfecto", "dale"
4. **Para recoger** → Guarda directamente en BD con estado "confirmed"
5. **Para domicilio** → Solicita datos de envío (dirección, teléfono, nombre)

### Datos Guardados
- **orderId**: ID único del pedido (ORD1234567890ABCD)
- **businessId**: ID del negocio
- **branchId**: ID de la sucursal  
- **customer**: Teléfono y nombre del cliente
- **items**: Productos con cantidades y precios
- **delivery**: Tipo de entrega y dirección
- **status**: "confirmed" (confirmado)
- **source**: "whatsapp"
- **total**: Precio total del pedido

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
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:4000

# IA Configuration
HUGGINGFACE_API_KEY=your-huggingface-api-key
HUGGINGFACE_MODEL=microsoft/DialoGPT-medium
USE_HUGGINGFACE=false
```

## ⚙️ Sistema de Configuración

### Acceder a la Configuración del Sistema

1. **Accede** a `http://localhost:4000`
2. **Haz login** con `admin@easybranch.com` / `admin123`
3. **Ve a "Configuración"** en el menú lateral
4. **Explora las 5 pestañas** disponibles:
   - **Sistema**: Variables de entorno, base de datos, puertos
   - **IA & Proveedores**: Configuración de IA, modelos, temperatura
   - **WhatsApp**: Configuración de conexiones y auto-reconexión
   - **Tipos de Negocio**: Gestión de categorías de negocios
   - **Usuarios & Roles**: Permisos granulares por rol

### Funcionalidades de Configuración

#### 🔧 **Panel del Sistema**
- ✅ **Gestión visual** de variables de entorno
- ✅ **Pruebas de conexión** a base de datos
- ✅ **Configuración de puertos** backend/frontend
- ✅ **Estado del sistema** en tiempo real

#### 🤖 **Configuración de IA**
- ✅ **Selección de proveedores** (Hugging Face, OpenAI, Anthropic)
- ✅ **Configuración de modelos** y parámetros
- ✅ **Pruebas de conectividad** de APIs
- ✅ **Modo de aprendizaje** automático

#### 📱 **Configuración de WhatsApp**
- ✅ **Gestión de proveedores** (WhatsApp Web, Twilio, Meta)
- ✅ **Auto-reconexión** configurable
- ✅ **Intervalos de reconexión** personalizables
- ✅ **Estado del servicio** en tiempo real

#### 🏢 **Tipos de Negocio**
- ✅ **Gestión de categorías** (Restaurante, Café, Farmacia, etc.)
- ✅ **Configuración por tipo** de negocio
- ✅ **Iconos personalizados** para cada categoría
- ✅ **Estados de configuración** visuales

#### 👥 **Usuarios y Roles**
- ✅ **4 roles predefinidos**: Super Admin, Business Admin, Branch Admin, Usuario
- ✅ **Permisos granulares** con checkboxes
- ✅ **Asignación visual** de funcionalidades
- ✅ **Gestión de accesos** por rol

## 📱 Uso de WhatsApp

### Conectar WhatsApp a una Sucursal

1. **Accede** a `http://localhost:3000`
2. **Haz login** con `admin@easybranch.com` / `admin123`
3. **Ve a WhatsApp** en el menú lateral
4. **Haz clic en "Nueva Conexión"**
5. **Selecciona la sucursal** (con dirección completa)
6. **Llena los campos** requeridos
7. **Haz clic en "Crear Conexión"**
8. **El QR code aparecerá** en la tarjeta de conexión
9. **Escanea el QR code** con tu WhatsApp
10. **¡Listo!** La conexión estará activa

### Funcionalidades de WhatsApp

- ✅ **QR codes reales** que funcionan con WhatsApp
- ✅ **Renovación automática** cada minuto
- ✅ **Respuestas automáticas** con IA avanzada
- ✅ **Envío de mensajes** programáticos
- ✅ **Recepción de mensajes** en tiempo real
- ✅ **Múltiples conexiones** por negocio
- ✅ **Selección de sucursales** con direcciones formateadas
- ✅ **Creación sin errores** de conexiones
- ✅ **QR codes en tarjetas** (no en modales)

### 🤖 Sistema de IA Inteligente

#### **Recomendaciones Estilo Akinator**
1. **Envía**: `recomendación`
2. **Responde** 5 preguntas sobre tus preferencias
3. **Recibe** recomendaciones personalizadas del menú PDF

#### **Procesamiento Inteligente de Pedidos**
- **Detección automática** de productos y cantidades
- **Cálculo de totales** con delivery incluido
- **Tolerancia a errores** de escritura y dislexia
- **Respuestas contextuales** basadas en el menú de la sucursal

#### **Ejemplos de Uso**
```
Usuario: "quiero un capuchino" (mal escrito)
IA: Detecta como "cappuccino" y procesa el pedido

Usuario: "recomendación"
IA: Te hace 5 preguntas inteligentes y recomienda productos del menú PDF

Usuario: "quiero un Frappé de Vainilla 2 Café Helado y Brownie de Chocolate"
IA: Calcula automáticamente: Subtotal + Delivery = Total
```

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
│   ├── super.html         # Dashboard principal centralizado
│   ├── ai-management.html  # Gestión de IA y PDFs
│   ├── styles.css         # Estilos personalizados
│   └── frontend-server.js # Servidor frontend
├── DATABASE_STRUCTURE.md   # Estructura completa de BD
└── README.md              # Este archivo
```

## 📚 Documentación

- **[README.md](./README.md)** - Documentación principal del proyecto
- **[DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md)** - Estructura completa de la base de datos
- **Scripts de prueba** - Disponibles en `backend/scripts/` para testing

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
- `POST /api/whatsapp/connections` - Crear conexión (con validación completa)
- `GET /api/whatsapp/connections/:id/qr` - Obtener QR code
- `POST /api/whatsapp/connections/:id/toggle` - Conectar/Desconectar
- `DELETE /api/whatsapp/connections/:id` - Eliminar conexión
- `POST /api/whatsapp/send-message` - Enviar mensaje
- `POST /api/whatsapp/webhook` - Webhook para mensajes entrantes

### IA y Configuración
- `GET /api/branch-ai-config` - Listar configuraciones de IA
- `POST /api/branch-ai-config` - Crear configuración de IA
- `PUT /api/branch-ai-config/:id` - Actualizar configuración
- `POST /api/ai/:branchId/upload-catalog` - Subir catálogo PDF
- `POST /api/ai/:branchId/query` - Consultar IA

### Sistema de Configuración 🆕
- `GET /api/system/config` - Obtener configuración del sistema
- `POST /api/system/config` - Guardar configuración del sistema
- `POST /api/system/test-db` - Probar conexión a base de datos
- `GET /api/ai/config` - Obtener configuración de IA
- `POST /api/ai/config` - Guardar configuración de IA
- `GET /api/whatsapp/config` - Obtener configuración de WhatsApp
- `POST /api/whatsapp/config` - Guardar configuración de WhatsApp
- `GET /api/business-types` - Listar tipos de negocio
- `POST /api/business-types` - Crear tipo de negocio
- `GET /api/roles` - Listar roles de usuario
- `PUT /api/roles/:role/permissions` - Actualizar permisos de rol

## 🎯 Próximas Funcionalidades

### 📋 **Gestión de Pedidos**
- [ ] Sistema de pedidos por WhatsApp
- [ ] Catálogo de productos
- [ ] Gestión de inventario
- [ ] Procesamiento de pagos

### 🤖 **IA Avanzada** ✅ COMPLETADO
- ✅ Respuestas automáticas inteligentes
- ✅ Análisis de sentimientos
- ✅ Recomendaciones de productos (Akinator)
- ✅ Chatbot conversacional
- ✅ Procesamiento automático de pedidos
- ✅ Lectura de menús PDF
- ✅ Tolerancia a errores de escritura

### ⚙️ **Sistema de Configuración** ✅ COMPLETADO
- ✅ Panel de configuración del sistema
- ✅ Gestión de variables de entorno
- ✅ Configuración de IA centralizada
- ✅ Configuración de WhatsApp
- ✅ Gestión de tipos de negocio
- ✅ Sistema de roles y permisos

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
1. Verifica que `ALLOWED_ORIGINS` esté configurado correctamente
2. Asegúrate de que el frontend esté en el puerto 4000
3. Verifica que el backend esté en el puerto 3000

### Error "this.setupConfigTabs is not a function"
1. **Verifica** que el sistema esté ejecutándose correctamente
2. **Reinicia** el servidor con `npm run dev`
3. **Limpia** la caché del navegador (Ctrl+F5)
4. **Verifica** que no haya errores en la consola del navegador

### La sección de Configuración no carga
1. **Verifica** que el archivo `config-section.html` existe en `frontend-admin/`
2. **Comprueba** que todos los métodos están dentro de la clase `SuperAdminDashboard`
3. **Revisa** los logs del navegador para errores de JavaScript
4. **Asegúrate** de estar logueado como Super Admin

## 📞 Soporte

Para problemas técnicos:
1. Revisa los logs en `backend/src/logs/`
2. Verifica la configuración de variables de entorno
3. Consulta la documentación de APIs

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

**¡EasyBranch está listo para producción! 🚀**

*Versión actual: 2.3.0 - Sistema de Configuración Centralizada Complete*

## 🎉 **NUEVAS FUNCIONALIDADES v2.3.0**

### ⚙️ **Sistema de Configuración Centralizada** 🆕
- **Panel de configuración completo** con 5 secciones especializadas
- **Gestión visual de variables de entorno** con interfaz intuitiva
- **Configuración de IA centralizada** con múltiples proveedores
- **Gestión de WhatsApp** con auto-reconexión configurable
- **Tipos de negocio personalizables** con iconos y configuraciones
- **Sistema de roles y permisos granulares** con checkboxes
- **Pruebas de conectividad** en tiempo real
- **Interfaz de tabs** para navegación intuitiva

### 🔧 **Mejoras en la Arquitectura**
- **Métodos de configuración** integrados en la clase principal
- **Eliminación de código duplicado** y optimización
- **Manejo de errores** mejorado en configuración
- **Interfaz responsive** para todas las secciones de configuración

## 🎉 **FUNCIONALIDADES v2.2.0**

### 🤖 **Sistema de IA Avanzado**
- **Recomendaciones estilo Akinator** con 5 preguntas inteligentes
- **Lectura automática de menús PDF** por sucursal
- **Tolerancia a errores de escritura** y dislexia
- **Procesamiento automático de pedidos** con cálculos
- **Análisis de intención** avanzado
- **Contexto de conversación** persistente

### 📱 **WhatsApp Inteligente**
- **Respuestas automáticas** basadas en el menú de cada sucursal
- **Detección inteligente** de productos y cantidades
- **Cálculo automático** de totales con delivery
- **Manejo de errores** de escritura comunes
- **Recomendaciones personalizadas** del menú PDF

### 🧹 **Optimizaciones**
- **Código limpio** sin logs innecesarios
- **Archivos de test** eliminados
- **Proyecto optimizado** para producción