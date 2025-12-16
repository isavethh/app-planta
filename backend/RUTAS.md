# 📋 Documentación de Rutas del Backend Node.js

Base URL: `http://localhost:3000/api` (o la URL configurada en tu entorno)

---

## 🔐 Autenticación (`/api/auth`)

### Públicas
- `POST /api/auth/login` - Login de usuario
- `GET /api/auth/profile` - Obtener perfil del usuario (requiere token)
- `PUT /api/auth/change-password` - Cambiar contraseña (requiere token)

---

## 👥 Usuarios (`/api/usuarios`)

**Todas requieren autenticación y rol admin**

- `GET /api/usuarios` - Listar todos los usuarios
- `GET /api/usuarios/roles` - Obtener roles disponibles
- `GET /api/usuarios/:id` - Obtener usuario por ID
- `POST /api/usuarios` - Crear nuevo usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

---

## 📦 Envíos (`/api/envios`)

### Públicas (sin autenticación)
- `GET /api/envios` - Listar todos los envíos
- `GET /api/envios/codigo/:codigo` - Obtener envío por código
- `GET /api/envios/transportista/:transportistaId` - Envíos de un transportista
- `GET /api/envios/:id` - Obtener envío por ID
- `GET /api/envios/:id/documento` - Generar documento HTML del envío
- `GET /api/envios/:id/nota-venta` - Generar nota de venta HTML
- `POST /api/envios/:id/aceptar` - Aceptar asignación de envío
- `POST /api/envios/:id/rechazar` - Rechazar asignación de envío
- `POST /api/envios/sync` - Sincronizar envío desde Laravel (sin auth)

### Con autenticación
- `GET /api/envios/estados` - Obtener estados disponibles
- `GET /api/envios/:id/seguimiento` - Obtener seguimiento del envío
- `PUT /api/envios/:id/estado` - Actualizar estado del envío
- `POST /api/envios/:id/iniciar` - Iniciar envío
- `POST /api/envios/:id/entregar` - Marcar envío como entregado
- `POST /api/envios/:id/simular-movimiento` - Simular movimiento (demo)

---

## 🚚 Transportistas (`/api/transportistas`)

**Todas requieren autenticación**

- `GET /api/transportistas` - Listar todos los transportistas
- `GET /api/transportistas/disponibles` - Listar transportistas disponibles
- `GET /api/transportistas/:id` - Obtener transportista por ID
- `GET /api/transportistas/:id/envios` - Obtener envíos asignados a un transportista
- `POST /api/transportistas` - Crear nuevo transportista
- `PUT /api/transportistas/:id` - Actualizar transportista
- `PUT /api/transportistas/:id/disponibilidad` - Cambiar disponibilidad
- `DELETE /api/transportistas/:id` - Eliminar transportista

---

## 🏪 Almacenes (`/api/almacenes`)

**Todas requieren autenticación**

- `GET /api/almacenes` - Listar todos los almacenes
- `GET /api/almacenes/:id` - Obtener almacén por ID
- `GET /api/almacenes/:id/inventario` - Obtener inventario del almacén
- `GET /api/almacenes/:id/inventario/resumen` - Resumen del inventario
- `GET /api/almacenes/:id/envios` - Obtener envíos del almacén

**Solo admin:**
- `POST /api/almacenes` - Crear nuevo almacén
- `PUT /api/almacenes/:id` - Actualizar almacén
- `DELETE /api/almacenes/:id` - Eliminar almacén

---

## 📚 Catálogos (`/api/catalogos`)

**Todas requieren autenticación**

### Productos
- `GET /api/catalogos/productos` - Listar productos
- `GET /api/catalogos/productos/:id` - Obtener producto por ID
- `POST /api/catalogos/productos` - Crear producto
- `PUT /api/catalogos/productos/:id` - Actualizar producto
- `DELETE /api/catalogos/productos/:id` - Eliminar producto

### Categorías
- `GET /api/catalogos/categorias` - Listar categorías
- `POST /api/catalogos/categorias` - Crear categoría

### Tipos de Empaque
- `GET /api/catalogos/tipos-empaque` - Listar tipos de empaque
- `POST /api/catalogos/tipos-empaque` - Crear tipo de empaque

### Unidades de Medida
- `GET /api/catalogos/unidades-medida` - Listar unidades de medida
- `POST /api/catalogos/unidades-medida` - Crear unidad de medida

### Tipos de Vehículo
- `GET /api/catalogos/tipos-vehiculo` - Listar tipos de vehículo
- `POST /api/catalogos/tipos-vehiculo` - Crear tipo de vehículo

### Vehículos
- `GET /api/catalogos/vehiculos` - Listar vehículos
- `GET /api/catalogos/vehiculos/:id` - Obtener vehículo por ID
- `POST /api/catalogos/vehiculos` - Crear vehículo
- `PUT /api/catalogos/vehiculos/:id` - Actualizar vehículo
- `DELETE /api/catalogos/vehiculos/:id` - Eliminar vehículo

### Direcciones
- `GET /api/catalogos/direcciones` - Listar direcciones
- `GET /api/catalogos/direcciones/:id` - Obtener dirección por ID
- `POST /api/catalogos/direcciones` - Crear dirección
- `PUT /api/catalogos/direcciones/:id` - Actualizar dirección
- `DELETE /api/catalogos/direcciones/:id` - Eliminar dirección

---

## ✅ Checklists (`/api/checklist`)

**Todas requieren autenticación**

- `GET /api/checklist` - Listar todos los checklists
- `GET /api/checklist/:id` - Obtener checklist por ID
- `POST /api/checklist` - Crear checklist
- `PUT /api/checklist/:id` - Actualizar checklist
- `DELETE /api/checklist/:id` - Eliminar checklist

---

## 🛣️ Rutas de Entrega (`/api/rutas-entrega`)

### Rutas principales
- `POST /api/rutas-entrega` - Crear nueva ruta multi-entrega
- `GET /api/rutas-entrega` - Listar todas las rutas
- `GET /api/rutas-entrega/estadisticas` - Estadísticas generales de rutas
- `GET /api/rutas-entrega/:id` - Obtener ruta por ID con detalles completos
- `GET /api/rutas-entrega/:id/resumen` - Obtener resumen de ruta (para PDF)
- `GET /api/rutas-entrega/transportista/:transportista_id` - Listar rutas por transportista

### Checklists de rutas
- `GET /api/rutas-entrega/checklists/template/:tipo` - Obtener template de checklist (salida/entrega)
- `GET /api/rutas-entrega/checklists/firma` - Obtener firma de un checklist específico
- `GET /api/rutas-entrega/checklists` - Obtener checklists (por ruta o parada)
- `POST /api/rutas-entrega/checklists` - Guardar checklist completado

### Evidencias de rutas
- `GET /api/rutas-entrega/evidencias` - Obtener evidencias
- `POST /api/rutas-entrega/evidencias/upload` - Subir evidencia (foto)
- `POST /api/rutas-entrega/evidencias/base64` - Guardar evidencia en base64

### Acciones de rutas
- `POST /api/rutas-entrega/:id/iniciar` - Iniciar ruta (con checklist de salida)

### Paradas
- `POST /api/rutas-entrega/paradas/:parada_id/llegada` - Registrar llegada a parada
- `POST /api/rutas-entrega/paradas/:parada_id/entregar` - Completar entrega en parada
- `PUT /api/rutas-entrega/:ruta_id/paradas/reordenar` - Reordenar paradas de una ruta
- `POST /api/rutas-entrega/:ruta_id/paradas/:parada_id/evidencias` - Subir evidencia por parada

---

## 📄 Notas de Venta (`/api/notas-venta`)

**Públicas (para Laravel)**

- `GET /api/notas-venta/:id/html` - Generar nota de venta HTML
- `POST /api/notas-venta/generar` - Generar nota de venta desde Laravel (webhook)

---

## 🔄 Sincronización (`/api/sync`)

**Públicas (para Laravel)**

- `POST /api/sync/envio` - Sincronizar envío desde Laravel
- `PUT /api/sync/envio-estado/:codigo` - Actualizar estado de envío desde Laravel

---

## 🌐 Rutas Públicas (`/api/public`)

**Sin autenticación**

- `GET /api/public/almacenes-login` - Obtener lista de almacenes para dropdown de login
- `GET /api/public/transportistas-login` - Obtener lista de transportistas para dropdown de login
- `POST /api/public/login-almacen` - Login simplificado con almacén
- `POST /api/public/login-transportista` - Login simplificado con transportista
- `GET /api/public/almacenes` - Obtener almacenes
- `GET /api/public/usuarios-laravel` - Obtener usuarios desde Laravel
- `GET /api/public/envios-laravel` - Obtener envíos desde Laravel

---

## 📱 App Móvil de Almacén (`/api/almacen-app`)

**Sin autenticación (para app móvil)**

- `GET /api/almacen-app/:id/envios` - Obtener envíos de un almacén
- `GET /api/almacen-app/:id/notas-venta` - Obtener notas de venta de un almacén
- `GET /api/almacen-app/:id/estadisticas` - Obtener estadísticas del almacén
- `GET /api/almacen-app/nota-venta/:id` - Obtener detalles de una nota de venta específica

---

## 🚨 Incidentes (`/api/incidentes`)

**Públicas (para app móvil)**

- `POST /api/incidentes` - Crear nuevo incidente (con foto opcional)
- `GET /api/incidentes` - Listar todos los incidentes
- `GET /api/incidentes/envio/:envioId` - Incidentes de un envío específico
- `PUT /api/incidentes/:id/resolver` - Marcar incidente como resuelto

---

## 🤖 Inteligencia Artificial (`/api/ia`)

**Públicas (proxy a servicio de IA)**

- `GET /api/ia/prediccion-demanda` - Predicción de demanda
- `POST /api/ia/transportista-optimo` - Obtener transportista óptimo
- `GET /api/ia/detectar-anomalias` - Detectar anomalías
- `GET /api/ia/insights-almacen/:id` - Insights de almacén

---

## 🏥 Health Check

**Sin autenticación**

- `GET /health` - Verificar estado del servidor

---

## 📝 Notas Importantes

### Autenticación
- Las rutas marcadas como "requieren autenticación" necesitan el header:
  ```
  Authorization: Bearer <token>
  ```
- El token se obtiene mediante `POST /api/auth/login`

### Roles
- Algunas rutas requieren roles específicos (admin, almacen, transportista)
- El rol se verifica automáticamente en el middleware

### Formato de Respuesta
Todas las respuestas siguen este formato:
```json
{
  "success": true,
  "data": { ... },
  "message": "Mensaje opcional"
}
```

En caso de error:
```json
{
  "success": false,
  "error": "Mensaje de error"
}
```

### Códigos de Estado HTTP
- `200` - Éxito
- `201` - Creado
- `400` - Solicitud incorrecta
- `401` - No autenticado
- `403` - No autorizado
- `404` - No encontrado
- `500` - Error del servidor

---

## 🔗 WebSocket

El backend también expone WebSocket para tracking en tiempo real:

- **Namespace principal:** `/tracking`
- **Eventos:**
  - `join` - Unirse a una sala de envío
  - `join-envio` - Seguir un envío específico
  - `leave-envio` - Dejar de seguir un envío
  - `iniciar-simulacion` - Iniciar simulación de movimiento
  - `posicion-update` - Actualizar posición
  - `envio-completado` - Notificar envío completado

**Eventos emitidos:**
- `simulacion-iniciada` - Cuando se inicia una simulación
- `posicion-actualizada` - Cuando se actualiza la posición
- `envio-completado` - Cuando se completa un envío

---

**Última actualización:** Diciembre 2025

