import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Animated } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function TrackingScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState([]);
  const [simulando, setSimulando] = useState(false);
  const [indicePuntoActual, setIndicePuntoActual] = useState(0);
  const mapRef = useRef(null);
  const markerPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      console.log(`[TrackingScreen] Cargando datos del envío ID: ${envioId}`);
      const data = await envioService.getById(envioId);
      console.log('[TrackingScreen] Envío cargado:', data);
      setEnvio(data);
    } catch (error) {
      console.error('❌ [TrackingScreen] Error al cargar envío:', error);
      Alert.alert('❌ Error', `No se pudo cargar el envío.\n\nDetalle: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarSimulacion = async () => {
    try {
      console.log('[TrackingScreen] Iniciando simulación de ruta...');
      setSimulando(true);

      // Llamar al backend para generar la ruta
      const response = await envioService.simularMovimiento(envioId);
      console.log('[TrackingScreen] Respuesta de simulación:', response);

      if (response && response.puntos && response.puntos.length > 0) {
        console.log(`[TrackingScreen] Puntos de ruta recibidos: ${response.puntos.length}`);
        
        // Convertir puntos a formato correcto
        const puntosFormateados = response.puntos.map(p => ({
          latitude: parseFloat(p.latitud),
          longitude: parseFloat(p.longitud),
        }));

        setTracking(puntosFormateados);
        setIndicePuntoActual(0);

        // Animar el camión a través de todos los puntos
        animarCamion(puntosFormateados);
      } else {
        Alert.alert('⚠️ Error', 'No se generaron puntos de ruta');
      }
    } catch (error) {
      console.error('❌ [TrackingScreen] Error en simulación:', error);
      Alert.alert('❌ Error', `No se pudo iniciar la simulación.\n\nDetalle: ${error.message}`);
      setSimulando(false);
    }
  };

  const animarCamion = (puntos) => {
    if (puntos.length === 0) return;

    console.log(`[TrackingScreen] Iniciando animación con ${puntos.length} puntos`);
    let indice = 0;

    const intervalo = setInterval(() => {
      if (indice >= puntos.length) {
        console.log('[TrackingScreen] Animación completada');
        clearInterval(intervalo);
        setSimulando(false);
        
        // Auto-marcar como entregado
        marcarComoEntregado();
        return;
      }

      console.log(`[TrackingScreen] Moviendo camión a punto ${indice + 1}/${puntos.length}`);
      setIndicePuntoActual(indice);

      // Centrar mapa en el punto actual
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: puntos[indice].latitude,
          longitude: puntos[indice].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 1000);
      }

      indice++;
    }, 2000); // Cada 2 segundos avanza un punto (30 segundos total para 15 puntos)
  };

  const marcarComoEntregado = async () => {
    try {
      console.log('[TrackingScreen] Marcando envío como entregado...');
      await envioService.marcarEntregado(envioId);
      
      Alert.alert(
        '✅ Envío Entregado',
        'El camión ha llegado a su destino. El envío fue marcado como entregado automáticamente.',
        [
          {
            text: 'Ver Historial',
            onPress: () => navigation.navigate('Main', { screen: 'Historial' })
          },
          {
            text: 'Volver a Envíos',
            onPress: () => navigation.navigate('Main', { screen: 'MisEnvios' })
          }
        ]
      );

      // Actualizar datos
      cargarDatos();
    } catch (error) {
      console.error('❌ [TrackingScreen] Error al marcar como entregado:', error);
      Alert.alert('❌ Error', `No se pudo marcar como entregado.\n\nDetalle: ${error.message}`);
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': '#FF9800',
      'asignado': '#2196F3',
      'aceptado': '#00BCD4',
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
      'aceptado': 'hand-okay',
      'en_transito': 'truck-fast',
      'entregado': 'check-circle',
      'cancelado': 'close-circle',
    };
    return iconos[estado] || 'help-circle';
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

  // Coordenadas origen y destino
  const origen = {
    latitude: parseFloat(envio.origen_latitud) || -17.7833,
    longitude: parseFloat(envio.origen_longitud) || -63.1821,
  };

  const destino = {
    latitude: parseFloat(envio.destino_latitud) || -17.7892,
    longitude: parseFloat(envio.destino_longitud) || -63.1751,
  };

  // Posición actual del camión
  const posicionCamion = tracking.length > 0 && indicePuntoActual < tracking.length
    ? tracking[indicePuntoActual]
    : origen;

  // Región inicial del mapa (centrada entre origen y destino)
  const regionInicial = {
    latitude: (origen.latitude + destino.latitude) / 2,
    longitude: (origen.longitude + destino.longitude) / 2,
    latitudeDelta: Math.abs(origen.latitude - destino.latitude) * 2 || 0.05,
    longitudeDelta: Math.abs(origen.longitude - destino.longitude) * 2 || 0.05,
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Tracking en Tiempo Real" />
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
              <Text style={styles.infoText}>Destino: {envio.almacen_nombre}</Text>
            </View>

            {envio.vehiculo_placa && (
              <View style={styles.infoRow}>
                <Icon name="truck" size={20} color="#666" />
                <Text style={styles.infoText}>Vehículo: {envio.vehiculo_placa}</Text>
              </View>
            )}

            {simulando && (
              <View style={[styles.infoRow, { marginTop: 10 }]}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={[styles.infoText, { color: '#4CAF50', marginLeft: 10 }]}>
                  Camión en camino... ({indicePuntoActual + 1}/{tracking.length} puntos)
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Mapa con Google Maps */}
        <Card style={styles.mapCard}>
          <Card.Content style={{ padding: 0 }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={regionInicial}
              showsUserLocation={false}
              showsMyLocationButton={false}
              zoomEnabled={true}
              scrollEnabled={true}
            >
              {/* Marcador de Origen (Planta) */}
              <Marker
                coordinate={origen}
                title="Planta Principal"
                description="Punto de Origen"
                pinColor="#4CAF50"
              >
                <View style={styles.origenMarker}>
                  <Text style={styles.markerEmoji}>🏭</Text>
                </View>
              </Marker>

              {/* Marcador de Destino (Almacén) */}
              <Marker
                coordinate={destino}
                title={envio.almacen_nombre}
                description="Punto de Destino"
                pinColor="#F44336"
              >
                <View style={styles.destinoMarker}>
                  <Text style={styles.markerEmoji}>📦</Text>
                </View>
              </Marker>

              {/* Marcador del Camión (animado) */}
              {tracking.length > 0 && (
                <Marker
                  coordinate={posicionCamion}
                  title="Transportista"
                  description={`En camino (${indicePuntoActual + 1}/${tracking.length})`}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.truckMarker}>
                    <Text style={styles.truckEmoji}>🚚</Text>
                  </View>
                </Marker>
              )}

              {/* Línea de ruta */}
              {tracking.length > 0 && (
                <>
                  {/* Ruta completa (línea punteada) */}
                  <Polyline
                    coordinates={tracking}
                    strokeColor="#2196F3"
                    strokeWidth={3}
                    lineDashPattern={[10, 10]}
                  />
                  
                  {/* Ruta recorrida (línea sólida) */}
                  {indicePuntoActual > 0 && (
                    <Polyline
                      coordinates={tracking.slice(0, indicePuntoActual + 1)}
                      strokeColor="#4CAF50"
                      strokeWidth={4}
                    />
                  )}
                </>
              )}
            </MapView>
          </Card.Content>
        </Card>

        {/* Botones de Acción */}
        <Card style={styles.card}>
          <Card.Content>
            {envio.estado === 'entregado' ? (
              <View style={styles.entregadoBox}>
                <Icon name="check-circle" size={48} color="#4CAF50" />
                <Text variant="titleLarge" style={styles.entregadoText}>
                  ✅ Envío Entregado
                </Text>
                <Text variant="bodyMedium" style={styles.entregadoSubtext}>
                  El envío llegó a su destino exitosamente
                </Text>
              </View>
            ) : tracking.length === 0 ? (
              <>
                <Button
                  mode="contained"
                  icon="play"
                  onPress={handleIniciarSimulacion}
                  disabled={simulando}
                  style={styles.button}
                >
                  {simulando ? 'Simulando...' : 'Iniciar Simulación de Ruta'}
                </Button>
                <Text variant="bodySmall" style={styles.buttonHint}>
                  La simulación mostrará el camión viajando desde la planta hasta el almacén destino en tiempo real.
                  Al finalizar, el envío será marcado automáticamente como entregado.
                </Text>
              </>
            ) : (
              <View style={styles.simulandoBox}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text variant="titleMedium" style={styles.simulandoText}>
                  🚚 Camión en Ruta
                </Text>
                <Text variant="bodyMedium" style={styles.simulandoSubtext}>
                  Punto {indicePuntoActual + 1} de {tracking.length}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
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
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
  },
  estadoChip: {
    height: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  mapCard: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 350,
  },
  origenMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 8,
    borderWidth: 3,
    borderColor: '#4CAF50',
    elevation: 5,
  },
  destinoMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 8,
    borderWidth: 3,
    borderColor: '#F44336',
    elevation: 5,
  },
  truckMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 8,
    borderWidth: 3,
    borderColor: '#2196F3',
    elevation: 5,
  },
  markerEmoji: {
    fontSize: 28,
  },
  truckEmoji: {
    fontSize: 28,
  },
  button: {
    marginBottom: 10,
  },
  buttonHint: {
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  entregadoBox: {
    alignItems: 'center',
    padding: 20,
  },
  entregadoText: {
    marginTop: 15,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  entregadoSubtext: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  simulandoBox: {
    alignItems: 'center',
    padding: 20,
  },
  simulandoText: {
    marginTop: 15,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  simulandoSubtext: {
    marginTop: 8,
    color: '#666',
  },
});
