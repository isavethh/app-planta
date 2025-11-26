# Applanta - App Transportista

Aplicación móvil para transportistas del sistema Applanta. Permite gestionar envíos, aceptar asignaciones y realizar seguimiento en tiempo real.

## 🚀 Características

- **Autenticación**: Login seguro para transportistas
- **Gestión de Envíos**: 
  - Ver envíos asignados
  - Iniciar envíos (cambiar a estado "en tránsito")
  - Marcar como entregado
  - Filtrar por estado
  - Buscar envíos
- **Perfil**: 
  - Ver información personal y del vehículo
  - Cambiar disponibilidad
  - Ver estadísticas
- **Historial**: Ver envíos completados y cancelados

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Expo CLI
- Backend de Applanta ejecutándose

## 🔧 Instalación

1. Instalar dependencias:
```bash
cd mobile-app
npm install
```

2. Configurar la URL del backend:
   - Abrir `src/services/api.js`
   - Modificar `API_URL` con la IP de tu servidor backend

3. Iniciar la aplicación:
```bash
npm start
```

## 📱 Ejecutar en Dispositivo

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

### Web
```bash
npm run web
```

## 🔐 Credenciales de Prueba

Para probar la aplicación, necesitas un usuario con rol "transportista" en el backend.

## 📂 Estructura del Proyecto

```
mobile-app/
├── src/
│   ├── context/
│   │   └── AuthContext.js      # Contexto de autenticación
│   ├── services/
│   │   └── api.js              # Servicios de API
│   └── screens/
│       ├── LoginScreen.js      # Pantalla de login
│       ├── EnviosScreen.js     # Lista de envíos
│       ├── EnvioDetalleScreen.js  # Detalle del envío
│       ├── HistorialScreen.js  # Historial de envíos
│       └── PerfilScreen.js     # Perfil del transportista
├── App.js                      # Componente principal
├── app.json                    # Configuración de Expo
└── package.json
```

## 🎨 Tecnologías

- **React Native** con Expo
- **React Navigation**: Navegación entre pantallas
- **React Native Paper**: Componentes UI Material Design
- **Axios**: Cliente HTTP
- **AsyncStorage**: Almacenamiento local

## 🔄 Estados de Envío

- **Pendiente**: Envío creado pero no asignado
- **Asignado**: Envío asignado al transportista (puede iniciar)
- **En Tránsito**: Envío en camino (puede marcar como entregado)
- **Entregado**: Envío completado
- **Cancelado**: Envío cancelado

## 📝 Notas

- La aplicación requiere conexión a internet
- Asegúrate de que el backend esté ejecutándose
- Para testing en dispositivo Android físico, usa la misma red Wi-Fi
- La geolocalización requiere permisos del dispositivo

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

