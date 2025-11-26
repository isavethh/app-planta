# 🌿 Applanta - Sistema de Gestión de Envíos para Transportistas

Sistema completo de gestión de envíos con aplicación móvil para transportistas. Permite crear, asignar, seguir y gestionar envíos de productos desde la planta hasta los almacenes de destino.

## 📱 Componentes del Sistema

### 1. Backend (API REST)
- Node.js + Express
- PostgreSQL
- JWT Authentication
- QR Code Generation
- Real-time tracking

### 2. Mobile App (Transportista)
- React Native + Expo
- React Navigation
- React Native Paper (Material Design)
- Gestión de envíos en tiempo real

## 🚀 Inicio Rápido

### Requisitos
- Node.js v16+
- PostgreSQL 12+
- npm o yarn
- Expo CLI (para la app móvil)

### 1. Configurar el Backend

```bash
# Ir al directorio del backend
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Crear base de datos en PostgreSQL
createdb applanta_db

# Inicializar base de datos (crear tablas y datos de prueba)
npm run db:init

# Iniciar servidor
npm run dev
```

El servidor estará corriendo en `http://localhost:3000`

### 2. Configurar la App Móvil

```bash
# Ir al directorio de la app móvil
cd mobile-app

# Instalar dependencias
npm install

# Configurar URL del backend
# Editar src/services/api.js y cambiar API_URL a la IP de tu servidor

# Iniciar la aplicación
npm start
```

Luego:
- Escanea el QR con Expo Go en tu dispositivo móvil
- O presiona `a` para Android / `i` para iOS (requiere emulador)

## 📋 Funcionalidades Principales

### Para Transportistas (App Móvil)

✅ **Gestión de Envíos**
- Ver envíos asignados
- Filtrar por estado (asignado, en tránsito, entregado)
- Buscar envíos por código, almacén o dirección
- Ver detalles completos de cada envío

✅ **Operaciones de Envío**
- Aceptar envíos asignados
- Iniciar envío (cambiar a "en tránsito")
- Marcar como entregado
- Ver productos y cantidades

✅ **Perfil y Configuración**
- Ver información personal y del vehículo
- Cambiar disponibilidad (disponible/no disponible)
- Ver historial de entregas
- Gestionar notificaciones

✅ **Tracking**
- Seguimiento en tiempo real
- Coordenadas GPS
- Estimación de tiempo de llegada

### Backend (API)

✅ **Gestión de Envíos**
- Crear envíos con múltiples productos
- Asignar transportistas
- Cambiar estados
- Generar códigos QR
- Tracking en tiempo real

✅ **Gestión de Usuarios**
- Múltiples roles (admin, transportista)
- Autenticación JWT
- Perfiles personalizados

✅ **Catálogos**
- Productos
- Vehículos
- Almacenes
- Direcciones
- Tipos de empaque

## 🗄️ Modelo de Datos

### Estados de Envío
1. **Pendiente** - Envío creado, esperando asignación
2. **Asignado** - Asignado a transportista
3. **En Tránsito** - Transportista en camino
4. **Entregado** - Completado exitosamente
5. **Cancelado** - Envío cancelado

### Roles de Usuario
- **Admin** - Acceso completo al sistema
- **Transportista** - Solo sus envíos asignados

## 📱 Capturas de Pantalla

### Login
- Autenticación segura
- Solo para transportistas

### Lista de Envíos
- Vista de todos los envíos asignados
- Filtros por estado
- Búsqueda rápida
- Toggle de disponibilidad

### Detalle de Envío
- Información completa del envío
- Datos del destino
- Lista de productos
- Información del vehículo
- Botones de acción (Iniciar/Entregar)

### Perfil
- Datos personales
- Información del vehículo
- Licencia de conducir
- Estadísticas
- Configuración

## 🔐 Seguridad

- ✅ Autenticación JWT
- ✅ Passwords hasheados con bcryptjs
- ✅ Middleware de autenticación en todas las rutas protegidas
- ✅ Validación de roles
- ✅ Tokens almacenados de forma segura (AsyncStorage)

## 🛠️ Tecnologías Utilizadas

### Backend
- Express.js
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- QRCode
- CORS
- dotenv

### Mobile App
- React Native
- Expo
- React Navigation
- React Native Paper
- Axios
- AsyncStorage
- Vector Icons

## 📝 Scripts Disponibles

### Backend
```bash
npm start          # Iniciar en producción
npm run dev        # Desarrollo con nodemon
npm run db:init    # Inicializar base de datos
```

### Mobile App
```bash
npm start          # Iniciar Expo
npm run android    # Correr en Android
npm run ios        # Correr en iOS
npm run web        # Correr en web
```

## 🔧 Configuración Avanzada

### Variables de Entorno Backend (.env)
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=applanta_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=tu_secreto_seguro
JWT_EXPIRES_IN=7d
```

### Configuración API Mobile (src/services/api.js)
```javascript
const API_URL = 'http://TU_IP:3000/api';
```

## 📦 Estructura del Proyecto

```
applanta/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuración BD
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── middlewares/     # Auth y otros
│   │   ├── routes/          # Rutas de la API
│   │   └── index.js         # Punto de entrada
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── mobile-app/
│   ├── src/
│   │   ├── context/         # React Context
│   │   ├── services/        # API calls
│   │   └── screens/         # Pantallas
│   ├── App.js
│   ├── package.json
│   └── README.md
└── README.md (este archivo)
```

## 🐛 Troubleshooting

### Backend no inicia
- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en `.env`
- Ejecuta `npm run db:init`

### App móvil no se conecta
- Verifica que el backend esté corriendo
- Asegúrate de usar la IP correcta (no localhost)
- En Android físico, usa la misma red Wi-Fi

### Error de autenticación
- Verifica que el token JWT sea válido
- Verifica que el usuario tenga rol "transportista"

## 🚀 Próximas Funcionalidades

- [ ] Notificaciones push
- [ ] Chat con administrador
- [ ] Firma digital de entrega
- [ ] Fotos de evidencia
- [ ] Reportes de incidencias
- [ ] Mapa con ruta optimizada
- [ ] Estadísticas detalladas

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/NuevaFuncionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/NuevaFuncionalidad`)
5. Abre un Pull Request

## 👨‍💻 Autor

Desarrollado como parte del proyecto Applanta

## 📄 Licencia

ISC

---

**Nota**: Este es un sistema funcional completo listo para desarrollo y pruebas. Para uso en producción, considera agregar más medidas de seguridad, monitoreo y optimizaciones.

