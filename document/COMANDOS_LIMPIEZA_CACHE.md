# 🧹 COMANDOS PARA LIMPIAR COMPLETAMENTE LA CACHE DEL SISTEMA

## 📋 **Comandos Ejecutados:**

### 1. **Limpiar Cache de npm**
```powershell
npm cache clean --force
```

### 2. **Eliminar node_modules (Raíz)**
```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
```

### 3. **Eliminar node_modules (Backend)**
```powershell
cd backend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
```

### 4. **Eliminar node_modules (Frontend)**
```powershell
cd ../frontend-admin
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
```

### 5. **Reinstalar Dependencias**
```powershell
cd ..
npm install
cd backend
npm install
cd ../frontend-admin
npm install
```

## 🌐 **Limpiar Cache del Navegador:**

### **Chrome/Edge:**
- `Ctrl + Shift + R` (Hard Refresh)
- O `F12` → Click derecho en refresh → "Empty Cache and Hard Reload"

### **Firefox:**
- `Ctrl + F5`
- O `F12` → Click derecho en refresh → "Empty Cache and Hard Reload"

### **Safari:**
- `Cmd + Shift + R`
- O `Cmd + Option + E` (Empty Cache)

### **Modo Incógnito:**
- Abrir nueva ventana privada/incógnita
- Navegar a `http://localhost:3000`

## 🚀 **Reiniciar Sistema:**

```powershell
# Desde la raíz del proyecto
npm start
```

## ✅ **Verificación:**

1. **Servidor Backend**: `http://localhost:4000/api/health`
2. **Frontend**: `http://localhost:3000`
3. **Login**: `admin@easybranch.com` / `admin123`
4. **Menú**: Debería mostrar "Mi Negocio" unificado

---

**¡Cache completamente limpiada!** 🎉
