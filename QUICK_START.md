# 🚀 Quick Start - EasyBranch

## Inicio Rápido (5 minutos)

### 1. Preparar el Backend
```bash
cd EasyBranch/backend
npm install
copy env.example .env
```

### 2. Configurar Base de Datos
```bash
# Asegúrate de que MongoDB esté ejecutándose
mongod

# En otra terminal, crear datos iniciales
npm run seed
```

### 3. Iniciar Backend
```bash
npm run dev
```

**✅ Backend listo en:** `http://localhost:4001`

### 4. Acceder al Frontend
Abrir en el navegador:
```
http://localhost:4001/frontend-admin/
```

### 5. Iniciar Sesión
- **Email:** `admin@easybranch.com`
- **Password:** `admin123`

## 🔧 Verificación Rápida

### Backend OK?
```bash
curl http://localhost:4001/api/health
```
Debería responder: `{"status":"OK","database":"connected"}`

### Frontend OK?
- Abrir `http://localhost:4001/frontend-admin/`
- Debería mostrar la página de login

### Base de Datos OK?
```bash
mongosh mongodb://localhost:27017/easybranch
db.businesses.find().count()  # Debería ser 3
```

## 🆘 Problemas Comunes

### Puerto ocupado
```bash
# Cambiar puerto en .env
PORT=4002
```

### MongoDB no conecta
```bash
# Verificar que esté ejecutándose
mongod --version
```

### Frontend no carga
- Verificar que el backend esté ejecutándose
- Revisar la consola del navegador para errores

## 📞 Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | admin@easybranch.com | admin123 |
| Business Admin | gerente@elsabor.com | gerente123 |
| Branch Admin | sucursal@elsabor.com | sucursal123 |
| Staff | cocina@elsabor.com | cocina123 |

---

**¡Listo! Ya puedes probar EasyBranch** 🎉
