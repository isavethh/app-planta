# Configuración de Google Maps

## API Key Proporcionada
```
AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0
```

## Configuración para Android

1. Editar `android/app/src/main/AndroidManifest.xml`:
```xml
<application>
  <!-- Agregar dentro de <application> -->
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0"/>
</application>
```

## Configuración para iOS

1. Editar `ios/Planta/AppDelegate.m`:
```objc
#import <GoogleMaps/GoogleMaps.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [GMSServices provideAPIKey:@"AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0"];
  // ... resto del código
}
```

## Alternativa: Usar variables de entorno

En `app.json`:
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0"
      }
    }
  }
}
```

## Nota
La implementación actual usa OpenStreetMap (Leaflet) via WebView como fallback que no requiere API key.
Para migrar completamente a Google Maps, se requiere usar `react-native-maps` correctamente configurado.
