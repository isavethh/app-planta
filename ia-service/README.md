# 🤖 Servicio de IA - Planta Logística

Sistema de inteligencia artificial para optimización y predicciones en la plataforma de logística.

## 🚀 Funcionalidades

### 1. Predicción de Demanda
Predice qué productos tendrán mayor demanda basándose en histórico de 90 días.

**Endpoint:** `GET /api/ia/prediccion-demanda`

**Respuesta:**
```json
{
  "predicciones": [
    {
      "producto": "Lechuga",
      "demanda_semanal_estimada": 45.5,
      "demanda_mensual_estimada": 182.0,
      "tendencia": "creciente",
      "prioridad": "alta"
    }
  ]
}
```

### 2. Transportista Óptimo
Recomienda el mejor transportista basándose en desempeño histórico.

**Endpoint:** `POST /api/ia/transportista-optimo`

**Body:**
```json
{
  "almacen_id": 5
}
```

**Respuesta:**
```json
{
  "mejor_opcion": {
    "nombre": "Juan Pérez",
    "score": 87.5,
    "estadisticas": {
      "tasa_exito": 95.5,
      "tiempo_promedio_horas": 12.3
    }
  }
}
```

### 3. Detección de Anomalías
Detecta envíos con comportamiento sospechoso.

**Endpoint:** `GET /api/ia/detectar-anomalias`

**Respuesta:**
```json
{
  "anomalias": [
    {
      "codigo": "ENV-123",
      "tipo_anomalia": ["precio_alto", "tiempo_excesivo"],
      "severidad": "alta"
    }
  ]
}
```

### 4. Insights de Almacén
Genera análisis inteligente personalizado para cada almacén.

**Endpoint:** `GET /api/ia/insights-almacen/<almacen_id>`

**Respuesta:**
```json
{
  "insights": {
    "top_productos": [...],
    "mejor_dia_semana": "Lunes",
    "recomendacion": "📈 Tus ventas están creciendo!"
  }
}
```

## 📦 Instalación

1. Crear entorno virtual:
```bash
python -m venv venv
```

2. Activar entorno:
```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

5. Iniciar servicio:
```bash
python app.py
```

El servicio estará disponible en: `http://localhost:5000`

## 🔧 Configuración

Edita el archivo `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Plantalogistica
DB_USER=postgres
DB_PASSWORD=tu_password
FLASK_PORT=5000
```

## 📊 Integración con Backend Node.js

En tu backend Node.js, puedes consumir estos endpoints:

```javascript
const axios = require('axios');

// Obtener predicción de demanda
const prediccion = await axios.get('http://localhost:5000/api/ia/prediccion-demanda');

// Recomendar transportista
const recomendacion = await axios.post('http://localhost:5000/api/ia/transportista-optimo', {
  almacen_id: 5
});
```

## 🎯 Casos de Uso

1. **Dashboard de Almacén**: Mostrar predicciones y recomendaciones
2. **Asignación Automática**: Usar IA para asignar transportistas óptimos
3. **Alertas**: Notificar sobre anomalías detectadas
4. **Reportes**: Generar insights para toma de decisiones

## 🧪 Testing

Probar endpoints:

```bash
# Health check
curl http://localhost:5000/health

# Predicción de demanda
curl http://localhost:5000/api/ia/prediccion-demanda

# Detectar anomalías
curl http://localhost:5000/api/ia/detectar-anomalias
```

## 🔮 Mejoras Futuras

- [ ] Machine Learning con scikit-learn para predicciones más precisas
- [ ] Análisis de sentimiento en observaciones
- [ ] Optimización de rutas con algoritmos genéticos
- [ ] Clustering de clientes por comportamiento
- [ ] Predicción de cancelaciones
- [ ] Recomendaciones de precios dinámicos

## 📝 Notas

- El servicio requiere datos históricos de al menos 30 días para mejores resultados
- Los modelos de IA se entrenan automáticamente con cada consulta
- Las predicciones mejoran con más datos históricos
