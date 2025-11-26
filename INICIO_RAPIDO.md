# ⚡ Inicio Rápido - Applanta Transportista

Guía ultra-rápida para desarrolladores experimentados.

## 🚀 Setup en 5 minutos

### 1. Backend
```bash
cd backend
npm install
cp env.example .env
# Editar .env con tus credenciales de PostgreSQL
npm run db:init
npm run dev
```

### 2. Mobile App
```bash
# Nueva terminal
cd mobile-app
npm install
# Editar src/services/api.js con tu IP local
npm start
```

### 3. Escanear QR con Expo Go

## 🔑 Login
```
Email: transportista@applanta.com
Password: password123
```

## 📍 Endpoints Clave

- `POST /api/auth/login` - Login
- `GET /api/transportistas/:id/envios` - Envíos del transportista
- `PUT /api/envios/:id/estado` - Cambiar estado
- `PUT /api/transportistas/:id/disponibilidad` - Cambiar disponibilidad

## 🗄️ Base de Datos

```sql
CREATE DATABASE applanta_db;
```

Luego: `npm run db:init`

## 📱 Estructura App Móvil

- `LoginScreen` → Login con JWT
- `EnviosScreen` → Lista de envíos con filtros
- `EnvioDetalleScreen` → Detalle + acciones (iniciar/entregar)
- `HistorialScreen` → Envíos completados
- `PerfilScreen` → Perfil y disponibilidad

## 🎨 Stack

**Backend**: Express + PostgreSQL + JWT  
**Mobile**: React Native + Expo + Paper + Navigation

## ⚙️ Variables Importantes

Backend `.env`:
```env
PORT=3000
DB_NAME=applanta_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=secreto123
```

Mobile `src/services/api.js`:
```javascript
const API_URL = 'http://TU_IP:3000/api';
```

## 🔥 Flujo Principal

1. Login como transportista
2. Ver envíos asignados
3. Iniciar envío → estado "en_transito"
4. Marcar entregado → estado "entregado"
5. Ver en historial

## 🐛 Debug

- Backend logs: Terminal donde corre `npm run dev`
- Mobile logs: Terminal de Expo + DevTools
- Network: Verifica que estés en la misma WiFi

¡Listo! 🎉

