# Applanta Backend

API REST para el sistema de gestión de envíos Applanta.

## 🚀 Características

- **Autenticación JWT**: Login seguro con tokens
- **Gestión de Usuarios**: CRUD completo con roles (admin, transportista)
- **Envíos**: Crear, asignar, seguir y completar envíos
- **Transportistas**: Gestión de transportistas y disponibilidad
- **Vehículos**: Catálogo de vehículos y tipos
- **Almacenes**: Gestión de almacenes e inventario
- **Tracking**: Seguimiento en tiempo real de envíos
- **QR Codes**: Generación de códigos QR para envíos

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

## 🔧 Instalación

### 🐳 Opción 1: Usando Docker (Recomendado)

Este proyecto está dockerizado y comparte la misma base de datos PostgreSQL con el proyecto Laravel.

**Requisitos:**
- Docker y Docker Compose instalados
- El proyecto Laravel debe estar ejecutándose primero (para crear la red `org2-net` y la base de datos)

**Pasos:**

1. Asegúrate de que el proyecto Laravel esté corriendo:
```bash
cd ../Planta/plantaCruds
docker compose up -d
```

2. Construir y ejecutar el backend:
```bash
cd backend
docker compose up --build -d
```

3. Ver logs:
```bash
docker logs org2-backend -f
```

4. Acceder al API:
```
http://localhost:3000/api
http://localhost:3000/health
```

**Nota importante:** El backend usa la misma base de datos (`org2_db`) y red Docker (`org2-net`) que Laravel.

### 💻 Opción 2: Instalación Local (Sin Docker)

1. Clonar el repositorio e instalar dependencias:
```bash
cd backend
npm install
```

2. Configurar variables de entorno:
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

3. Crear la base de datos PostgreSQL:
```sql
CREATE DATABASE org2_db;
```

4. Inicializar la base de datos (crear tablas y datos de prueba):
```bash
npm run db:init
```

5. Iniciar el servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js         # Configuración de PostgreSQL
│   │   └── initDb.js          # Script de inicialización de BD
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── enviosController.js
│   │   ├── transportistasController.js
│   │   ├── almacenesController.js
│   │   ├── catalogosController.js
│   │   ├── checklistController.js
│   │   └── usuariosController.js
│   ├── middlewares/
│   │   └── auth.js            # Middleware de autenticación JWT
│   ├── routes/
│   │   ├── index.js           # Enrutador principal
│   │   ├── auth.js
│   │   ├── envios.js
│   │   ├── transportistas.js
│   │   ├── almacenes.js
│   │   ├── catalogos.js
│   │   ├── checklist.js
│   │   └── usuarios.js
│   └── index.js               # Punto de entrada de la aplicación
├── .env.example               # Variables de entorno de ejemplo
├── package.json
└── README.md
```

## 🔑 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `GET /api/auth/me` - Obtener usuario actual

### Envíos
- `GET /api/envios` - Listar todos los envíos
- `GET /api/envios/:id` - Obtener envío por ID
- `GET /api/envios/codigo/:codigo` - Obtener envío por código
- `POST /api/envios` - Crear envío
- `PUT /api/envios/:id` - Actualizar envío
- `PUT /api/envios/:id/estado` - Cambiar estado del envío
- `GET /api/envios/:id/seguimiento` - Obtener seguimiento
- `POST /api/envios/:id/simular-movimiento` - Simular movimiento (demo)
- `POST /api/envios/asignacion-multiple` - Asignar múltiples envíos
- `GET /api/envios/estados` - Obtener estados disponibles

### Transportistas
- `GET /api/transportistas` - Listar transportistas
- `GET /api/transportistas/:id` - Obtener transportista por ID
- `GET /api/transportistas/:id/envios` - Obtener envíos del transportista
- `POST /api/transportistas` - Crear transportista
- `PUT /api/transportistas/:id` - Actualizar transportista
- `PUT /api/transportistas/:id/disponibilidad` - Cambiar disponibilidad
- `GET /api/transportistas/disponibles` - Listar disponibles
- `DELETE /api/transportistas/:id` - Eliminar transportista

### Almacenes
- `GET /api/almacenes` - Listar almacenes
- `GET /api/almacenes/:id` - Obtener almacén por ID
- `GET /api/almacenes/:id/inventario` - Obtener inventario
- `POST /api/almacenes` - Crear almacén
- `PUT /api/almacenes/:id` - Actualizar almacén

### Catálogos
- `GET /api/catalogos/productos` - Listar productos
- `GET /api/catalogos/categorias` - Listar categorías
- `GET /api/catalogos/tipos-empaque` - Listar tipos de empaque
- `GET /api/catalogos/unidades-medida` - Listar unidades
- `GET /api/catalogos/tipos-vehiculo` - Listar tipos de vehículo
- `GET /api/catalogos/vehiculos` - Listar vehículos
- `GET /api/catalogos/direcciones` - Listar direcciones

### Usuarios
- `GET /api/usuarios` - Listar usuarios
- `GET /api/usuarios/:id` - Obtener usuario por ID
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

## 🔒 Autenticación

Todas las rutas (excepto `/api/auth/login`) requieren autenticación mediante JWT.

Incluir el token en el header:
```
Authorization: Bearer <token>
```

## 🗄️ Base de Datos

El sistema utiliza PostgreSQL con las siguientes tablas principales:

- `usuarios` - Usuarios del sistema
- `roles` - Roles de usuario
- `transportistas` - Información de transportistas
- `vehiculos` - Vehículos disponibles
- `tipos_vehiculo` - Tipos de vehículo
- `envios` - Envíos
- `detalle_envios` - Productos de cada envío
- `estados_envio` - Estados de envío
- `asignaciones_envio` - Asignación transportista-envío
- `seguimiento_envio` - Tracking de ubicación
- `almacenes` - Almacenes
- `inventario_almacen` - Inventario por almacén
- `productos` - Catálogo de productos
- `categorias` - Categorías de productos
- `direcciones` - Direcciones de entrega
- `planta` - Información de la planta

## 🛠️ Scripts Disponibles

- `npm start` - Iniciar servidor en producción
- `npm run dev` - Iniciar en modo desarrollo con nodemon
- `npm run db:init` - Inicializar base de datos

## 📝 Notas de Desarrollo

- El servidor corre por defecto en el puerto 3000
- Los logs incluyen timestamp y método HTTP
- CORS habilitado para permitir peticiones desde cualquier origen
- Los passwords se hashean con bcryptjs
- Los códigos QR se generan automáticamente para cada envío

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

ISC

