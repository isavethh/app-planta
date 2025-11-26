# Assets de Applanta Transportista

Esta carpeta contiene los assets de la aplicación.

## 📁 Assets Necesarios

Para usar esta app con Expo, necesitas los siguientes assets:

### icon.png
- **Tamaño**: 1024x1024 px
- **Formato**: PNG con transparencia
- **Descripción**: Icono principal de la app

### splash.png
- **Tamaño**: 1242x2436 px
- **Formato**: PNG
- **Descripción**: Pantalla de carga

### adaptive-icon.png
- **Tamaño**: 1024x1024 px
- **Formato**: PNG con transparencia
- **Descripción**: Icono adaptativo para Android

### favicon.png
- **Tamaño**: 48x48 px
- **Formato**: PNG
- **Descripción**: Favicon para versión web

## 🎨 Colores de la Marca

- **Primary**: #4CAF50 (Verde)
- **Secondary**: #8BC34A (Verde claro)
- **Accent**: #66BB6A (Verde medio)

## 🚚 Tema

La app está enfocada en transporte y logística, por lo que el diseño sugiere:
- Icono con un camión o símbolo de envío
- Colores verdes (naturaleza/plantas - "Applanta")
- Estilo limpio y profesional

## 📝 Nota para Desarrollo

Si no tienes los assets aún, Expo usará placeholders por defecto. 
La app funcionará correctamente, solo se verán iconos genéricos.

Para crear assets rápidos:
1. Usa herramientas como [AppIcon.co](https://appicon.co/)
2. O genera con IA (DALL-E, Midjourney, etc.)
3. O usa [Figma](https://www.figma.com/) para diseñar

## 📐 Generador de Assets

Puedes usar el generador de Expo:

```bash
npx expo-optimize
```

O el App Icon Generator:
```bash
npx @expo/prebuild --platform android
npx @expo/prebuild --platform ios
```

