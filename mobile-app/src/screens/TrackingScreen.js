import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, Dimensions, Linking, ScrollView } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip } from 'react-native-paper';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';

export default function TrackingScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarDatos();
    // Actualizar cada 10 segundos
    const interval = setInterval(cargarDatos, 10000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    try {
      setRefreshing(true);
      const data = await envioService.getById(envioId);
      setEnvio(data);

      // Obtener puntos de tracking GPS reales desde el backend
      const trackingData = await envioService.getSeguimiento(envioId);
      setTracking(trackingData || []);
    } catch (error) {
      console.error('Error al cargar tracking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSimularRuta = async () => {
    try {
      await envioService.simularMovimiento(envioId);
      Alert.alert(
        'Simulación iniciada',
        'Se generó una ruta de ejemplo. El mapa se actualizará automáticamente.'
      );
      cargarDatos();
    } catch (error) {
      console.error('Error al simular ruta:', error?.response?.data || error.message || error);

      let mensaje = 'No se pudo iniciar la simulación de ruta.';

      if (error?.response?.data?.error) {
        mensaje += `\n\n${error.response.data.error}`;
      } else {
        mensaje += '\n\nVerifica que el backend esté corriendo y que el celular esté en la misma red.';
      }

      Alert.alert('Error', mensaje);
    }
  };

  const puntosRuta = useMemo(() => {
    if (!tracking || tracking.length === 0) return [];

    return tracking
      .map((p) => ({
        latitude: parseFloat(p.latitud),
        longitude: parseFloat(p.longitud),
      }))
      .filter((p) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));
  }, [tracking]);

  const puntoActual = puntosRuta.length > 0 ? puntosRuta[0] : null; // el más reciente viene primero

  const destino = envio && envio.latitud && envio.longitud
    ? {
        latitude: parseFloat(envio.latitud),
        longitude: parseFloat(envio.longitud),
      }
    : null;

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': '#FF9800',
      'asignado': '#2196F3',
      'en_transito': '#9C27B0',
      'entregado': '#4CAF50',
      'cancelado': '#F44336',
    };
    return colores[estado] || '#757575';
  };

  const getEstadoIcono = (estado) => {
    const iconos = {
      'pendiente': 'clock-outline',
      'asignado': 'clipboard-check-outline',
      'en_transito': 'truck-fast',
      'entregado': 'check-circle',
      'cancelado': 'close-circle',
    };
    return iconos[estado] || 'help-circle';
  };

  // Generar URL de Google Maps que muestra la ruta
  const generarURLMapa = (puntoActual, puntosRuta, destino) => {
    if (puntosRuta.length > 1) {
      // Si hay ruta, mostrar todos los puntos
      const waypoints = puntosRuta.slice(1, -1).map(p => `${p.latitude},${p.longitude}`).join('/');
      const inicio = `${puntosRuta[puntosRuta.length - 1].latitude},${puntosRuta[puntosRuta.length - 1].longitude}`;
      const fin = `${puntoActual.latitude},${puntoActual.longitude}`;
      return `https://www.google.com/maps/dir/${inicio}/${fin}${waypoints ? '/' + waypoints : ''}`;
    } else if (destino) {
      // Si hay destino, mostrar ruta desde punto actual al destino
      return `https://www.google.com/maps/dir/${puntoActual.latitude},${puntoActual.longitude}/${destino.latitude},${destino.longitude}`;
    } else {
      // Solo mostrar punto actual
      return `https://www.google.com/maps?q=${puntoActual.latitude},${puntoActual.longitude}`;
    }
  };

  // Generar HTML del mapa con OpenStreetMap (no requiere API key)
  const generarHTMLMapa = (puntoActual, puntosRuta, destino) => {
    const origen = puntoActual;
    const destinoCoords = destino || puntoActual;
    
    // Calcular centro del mapa
    let centerLat = origen.latitude;
    let centerLng = origen.longitude;
    if (destino) {
      centerLat = (origen.latitude + destinoCoords.latitude) / 2;
      centerLng = (origen.longitude + destinoCoords.longitude) / 2;
    }

    // Crear puntos para la ruta en formato Leaflet
    const rutaPoints = puntosRuta.length > 1 
      ? puntosRuta.map(p => `[${p.latitude}, ${p.longitude}]`).join(',\n                    ')
      : `[${origen.latitude}, ${origen.longitude}]`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 260px; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Marcador del camión (posición actual)
            const truckIcon = L.divIcon({
              className: 'truck-marker',
              html: '<div style="font-size: 30px; text-align: center;">🚚</div>',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
            
            L.marker([${origen.latitude}, ${origen.longitude}], { icon: truckIcon })
              .addTo(map)
              .bindPopup('Transportista');

            ${destino ? `
            // Marcador del destino
            const destinoIcon = L.divIcon({
              className: 'destino-marker',
              html: '<div style="font-size: 30px; text-align: center;">📦</div>',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
            
            L.marker([${destinoCoords.latitude}, ${destinoCoords.longitude}], { icon: destinoIcon })
              .addTo(map)
              .bindPopup('Destino');
            ` : ''}

            ${puntosRuta.length > 1 ? `
            // Dibujar ruta recorrida
            const rutaPoints = [
              ${rutaPoints}
            ];
            
            const polyline = L.polyline(rutaPoints, {
              color: '#007bff',
              weight: 4,
              opacity: 0.8
            }).addTo(map);
            
            // Ajustar vista para mostrar toda la ruta
            map.fitBounds(polyline.getBounds());
            ` : `
            // Solo ajustar zoom al punto actual
            map.setZoom(15);
            `}
          </script>
        </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  if (!envio) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>No se pudo cargar el envío</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Volver
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Seguimiento en Tiempo Real" />
        <Appbar.Action 
          icon="refresh" 
          onPress={cargarDatos}
          disabled={refreshing}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Información del Envío */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="headlineSmall" style={styles.codigo}>
                {envio.codigo}
              </Text>
              <Chip 
                icon={() => <Icon name={getEstadoIcono(envio.estado)} size={16} color="white" />}
                style={[styles.estadoChip, { backgroundColor: getEstadoColor(envio.estado) }]}
                textStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                {envio.estado?.replace('_', ' ').toUpperCase()}
              </Chip>
            </View>

            <View style={styles.infoRow}>
              <Icon name="warehouse" size={20} color="#666" />
              <Text style={styles.infoText}>{envio.almacen_nombre}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Mapa de Seguimiento */}
        <Card style={styles.mapCard}>
          <Card.Content>
            {puntoActual ? (
              <View style={styles.mapContainer}>
                <WebView
                  style={styles.map}
                  source={{
                    html: generarHTMLMapa(puntoActual, puntosRuta, destino)
                  }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Icon name="map-marker-path" size={64} color="#4CAF50" />
                <Text variant="titleMedium" style={styles.mapText}>
                  {envio.estado === 'en_transito' 
                    ? '🚚 Envío en camino (esperando primeros puntos de ruta...)' 
                    : envio.estado === 'entregado'
                    ? '✅ Envío entregado'
                    : '📦 Envío pendiente de inicio'}
                </Text>
                {envio.estado === 'en_transito' && (
                  <Text variant="bodyMedium" style={styles.mapSubtext}>
                    Actualizando ubicación cada 10 segundos...
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Botón para simular ruta (útil en pruebas y demo) */}
        {envio.estado !== 'entregado' && (
          <Card style={styles.card}>
            <Card.Content>
              <Button
                mode="contained"
                icon="routes"
                onPress={handleSimularRuta}
                style={{ marginBottom: 5 }}
              >
                Iniciar Simulación de Ruta
              </Button>
              <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>
                Esto genera una ruta de ejemplo desde la planta hasta el almacén destino y actualiza el mapa en tiempo real.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Timeline de Estados */}
        <Card style={styles.card}>
          <Card.Title 
            title="Historial del Envío"
            left={(props) => <Icon name="timeline-clock" {...props} size={24} color="#4CAF50" />}
          />
          <Card.Content>
            <View style={styles.timeline}>
              {envio.fecha_creacion && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Envío Creado</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_creacion).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.fecha_asignacion && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#2196F3' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Asignado a Transportista</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_asignacion).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.fecha_inicio_transito && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#9C27B0' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">En Tránsito</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_inicio_transito).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.fecha_entrega && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Entregado</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_entrega).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.estado === 'pendiente' && !envio.fecha_asignacion && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#FF9800' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Esperando Asignación</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      El envío será asignado pronto
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Información adicional */}
        {envio.estado === 'en_transito' && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.infoBox}>
                <Icon name="information" size={24} color="#2196F3" />
                <Text variant="bodyMedium" style={styles.infoBoxText}>
                  El transportista está en camino. Puedes ver su ubicación en tiempo real arriba.
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 20 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  estadoChip: {
    height: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  mapCard: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
  },
  mapContainer: {
    height: 260,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    height: 260,
    width: '100%',
  },
  mapPlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  mapText: {
    marginTop: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  mapSubtext: {
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  timeline: {
    paddingVertical: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
    marginRight: 15,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    color: '#666',
    marginTop: 3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
  },
  infoBoxText: {
    flex: 1,
    marginLeft: 10,
    color: '#1976D2',
  },
  truckMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  truckEmoji: {
    fontSize: 18,
  },
  destinoMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  destinoEmoji: {
    fontSize: 18,
  },
});

