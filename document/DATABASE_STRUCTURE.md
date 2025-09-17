# 📊 Estructura de Base de Datos - EasyBranch

## 🗄️ Colecciones Existentes

### 1. **orders** - Pedidos
```json
{
  "_id": "ObjectId",
  "orderId": "ORD1757614950769QPGK4", // ID único del pedido
  "clientId": "test_client_advanced", // ID del cliente (estructura antigua)
  "branchId": "68c30abfe53cbd0d740e8c4e", // ID de la sucursal
  "products": [ // Array de productos (estructura antigua)
    {
      "name": "cappuccino",
      "quantity": 2,
      "price": 4000,
      "total": 8000,
      "category": "café"
    }
  ],
  "subtotal": 13300, // Subtotal del pedido
  "deliveryFee": 3000, // Costo de delivery
  "total": 16300, // Total del pedido
  "status": "pending", // Estado: pending, confirmed, preparing, ready, delivered, cancelled
  "createdAt": "2025-09-11T18:22:30.769Z",
  "updatedAt": "2025-09-12T03:18:24.776Z",
  "isActive": true,
  "customer": { // Información del cliente
    "name": "Cliente WhatsApp",
    "phone": "+573000000000"
  }
}
```

**Índices:**
- `_id` (primario)
- `orderId` (único)
- `businessId`
- `branchId`
- `customer.phone`
- `status`
- `createdAt` (descendente)
- `clientId`
- `clientId + branchId` (compuesto)

---

### 2. **businesses** - Negocios
```json
{
  "_id": "ObjectId",
  "name": "Cafetería EasyBranch",
  "type": "cafeteria",
  "description": "Cafetería especializada en café y desayunos",
  "phone": "+57 1 234 5678",
  "email": "info@easybranch.com",
  "address": {
    "street": "Calle 123 #45-67",
    "city": "Bogotá",
    "state": "Cundinamarca",
    "zipCode": "110111"
  },
  "isActive": true,
  "createdAt": "2025-09-11T18:22:30.769Z",
  "updatedAt": "2025-09-12T03:18:24.776Z"
}
```

---

### 3. **branches** - Sucursales
```json
{
  "_id": "ObjectId",
  "businessId": "ObjectId", // Referencia al negocio
  "name": "Centro",
  "address": {
    "street": "Calle 123 #45-67",
    "city": "Bogotá",
    "state": "Cundinamarca",
    "zipCode": "110111"
  },
  "phone": "+57 1 234 5678",
  "email": "centro@easybranch.com",
  "hours": {
    "monday": "6:00 AM - 10:00 PM",
    "tuesday": "6:00 AM - 10:00 PM",
    "wednesday": "6:00 AM - 10:00 PM",
    "thursday": "6:00 AM - 10:00 PM",
    "friday": "6:00 AM - 10:00 PM",
    "saturday": "6:00 AM - 10:00 PM",
    "sunday": "6:00 AM - 10:00 PM"
  },
  "isActive": true,
  "createdAt": "2025-09-11T18:22:30.769Z",
  "updatedAt": "2025-09-12T03:18:24.776Z"
}
```

---

### 4. **whatsappconnections** - Conexiones WhatsApp
```json
{
  "_id": "ObjectId",
  "businessId": "ObjectId",
  "branchId": "ObjectId",
  "phoneNumber": "+573001234567",
  "status": "connected", // connected, disconnected, connecting
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "lastSeen": "2025-09-15T17:26:33.000Z",
  "aiIntegration": true,
  "isActive": true,
  "createdAt": "2025-09-11T18:22:30.769Z",
  "updatedAt": "2025-09-12T03:18:24.776Z"
}
```

---

### 5. **users** - Usuarios del Sistema
```json
{
  "_id": "ObjectId",
  "username": "admin",
  "email": "admin@easybranch.com",
  "password": "hashed_password",
  "role": "super_admin", // super_admin, admin, manager, employee
  "permissions": [
    "read_orders",
    "write_orders",
    "read_users",
    "write_users",
    "read_businesses",
    "write_businesses"
  ],
  "businessId": "ObjectId",
  "branchId": "ObjectId",
  "isActive": true,
  "lastLogin": "2025-09-15T17:26:33.000Z",
  "createdAt": "2025-09-11T18:22:30.769Z",
  "updatedAt": "2025-09-12T03:18:24.776Z"
}
```

---

### 6. **services** - Servicios/Productos
```json
{
  "_id": "ObjectId",
  "businessId": "ObjectId",
  "branchId": "ObjectId",
  "name": "Café Americano",
  "description": "Café negro americano",
  "price": 3500,
  "category": "café",
  "isAvailable": true,
  "isActive": true,
  "createdAt": "2025-09-11T18:22:30.769Z",
  "updatedAt": "2025-09-12T03:18:24.776Z"
}
```

---

### 7. **branchaiconfigs** - Configuración IA por Sucursal
```json
{
  "_id": "ObjectId",
  "branchId": "ObjectId",
  "businessType": "restaurant",
  "personality": "friendly",
  "menuContent": "☕ MENÚ CAFETERÍA EASYBRANCH CENTRO...",
  "prompt": "Eres un asistente virtual especializado...",
  "isActive": true,
  "createdAt": "2025-09-11T18:22:30.769Z",
  "updatedAt": "2025-09-12T03:18:24.776Z"
}
```

---

### 8. **recommendationsessions** - Sesiones de Recomendación
```json
{
  "_id": "ObjectId",
  "sessionId": "REC1234567890ABCD",
  "phoneNumber": "573113414361",
  "branchId": "ObjectId",
  "businessId": "ObjectId",
  "status": "active", // active, completed, cancelled
  "currentStep": 3,
  "maxSteps": 5,
  "peopleCount": 2,
  "responses": [
    { "questionId": 1, "answer": "2", "timestamp": "2025-09-15T17:26:33.000Z" }
  ],
  "preferences": {
    "budget": "medium",
    "mealType": "salty",
    "dietaryRestrictions": "none"
  },
  "finalRecommendation": "cappuccino",
  "recommendations": [
    {
      "product": "cappuccino",
      "confidence": 0.85,
      "reason": "Se ajusta a tu presupuesto"
    }
  ],
  "createdAt": "2025-09-15T17:26:33.000Z",
  "updatedAt": "2025-09-15T17:26:33.000Z",
  "completedAt": "2025-09-15T17:26:33.000Z"
}
```

---

### 9. **conversationmemories** - Memoria Conversacional
```json
{
  "_id": "ObjectId",
  "phoneNumber": "573113414361",
  "branchId": "ObjectId",
  "businessId": "ObjectId",
  "clientInfo": {
    "name": "María",
    "preferences": ["café", "desayunos"],
    "lastOrder": "cappuccino"
  },
  "conversationHistory": [
    {
      "message": "Hola, quiero un café",
      "response": "¡Hola! ¿Qué tipo de café prefieres?",
      "timestamp": "2025-09-15T17:26:33.000Z",
      "intent": "hacer_pedido"
    }
  ],
  "currentContext": {
    "lastIntent": "hacer_pedido",
    "pendingOrder": true,
    "emotionalState": "positive"
  },
  "emotionalState": "positive",
  "lastInteraction": "2025-09-15T17:26:33.000Z",
  "createdAt": "2025-09-15T17:26:33.000Z",
  "updatedAt": "2025-09-15T17:26:33.000Z"
}
```

---

### 10. **businessknowledgebases** - Base de Conocimiento
```json
{
  "_id": "ObjectId",
  "businessId": "ObjectId",
  "branchId": "ObjectId",
  "businessInfo": {
    "name": "Cafetería EasyBranch",
    "type": "cafeteria",
    "description": "Cafetería especializada en café y desayunos",
    "specialties": ["café", "desayunos", "pastelería"],
    "atmosphere": "acogedor",
    "targetAudience": "ejecutivos, estudiantes"
  },
  "products": [
    {
      "name": "Café Americano",
      "price": 3500,
      "category": "café",
      "description": "Café negro americano"
    }
  ],
  "faqs": [
    {
      "question": "¿Cuáles son sus horarios?",
      "answer": "Lunes a Domingo de 6:00 AM a 10:00 PM"
    }
  ],
  "scenarios": [
    {
      "situation": "cliente pregunta por recomendaciones",
      "response": "Te recomiendo nuestro cappuccino especial"
    }
  ],
  "lastUpdated": "2025-09-15T17:26:33.000Z",
  "createdAt": "2025-09-15T17:26:33.000Z",
  "updatedAt": "2025-09-15T17:26:33.000Z"
}
```

---

## 📈 Estadísticas de la Base de Datos

- **Total de colecciones:** 18
- **Pedidos almacenados:** 14
- **Conexiones WhatsApp:** Activas
- **Usuarios del sistema:** Configurados
- **Sucursales:** 1 (Centro)
- **Negocios:** 1 (Cafetería EasyBranch)

---

## 🔄 Flujo de Datos

1. **Cliente hace pedido** → Se guarda en `orders`
2. **Cliente confirma** → Se actualiza estado a "confirmed"
3. **Para domicilio** → Se solicita dirección y se guarda en `delivery.address`
4. **Recomendaciones** → Se crean sesiones en `recommendationsessions`
5. **Memoria conversacional** → Se almacena en `conversationmemories`
6. **Configuración IA** → Se maneja en `branchaiconfigs`

---

## 🎯 Próximas Mejoras

- [ ] Migrar estructura antigua de pedidos a nueva estructura
- [ ] Implementar índices compuestos adicionales
- [ ] Agregar validaciones de integridad referencial
- [ ] Implementar archivo de respaldo automático
- [ ] Crear vistas materializadas para reportes
