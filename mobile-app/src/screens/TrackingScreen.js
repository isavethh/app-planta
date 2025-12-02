import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, Dimensions } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip, Surface } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { envioService } from '../services/api';
import socketService from '../services/socket';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0';

export default function TrackingScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rutaReal, setRutaReal] = useState([]);
  const [simulando, setSimulando] = useState(false);
  const [indicePuntoActual, setIndicePuntoActual] = useState(0);
  const [distanciaTotal, setDistanciaTotal] = useState('');
  const [duracionTotal, setDuracionTotal] = useState('');
  const [socketConectado, setSocketConectado] = useState(false);
  const mapRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    cargarDatos();
    conectarSocket();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      socketService.off('posicion-actualizada');
      socketService.off('simulacion-iniciada');
      socketService.off('envio-completado');
    };
  }, []);

  const conectarSocket = () => {
    try {
      socketService.connect();
      setSocketConectado(socketService.isConnected());
      
      // Unirse a la sala del envío
      socketService.joinEnvio(envioId);
      
      // Escuchar actualizaciones de posición (para recibir de otros clientes)
      socketService.onPosicionActualizada((data) => {
        if (data.envioId == envioId) {
          console.log(`📍 [Socket] Recibido posición: ${Math.round(data.progreso * 100)}%`);
        }
      });
      
      // Escuchar cuando otra instancia inicia simulación
      socketService.onSimulacionIniciada((data) => {
        if (data.envioId == envioId && !simulando) {
          console.log(`🚚 [Socket] Simulación iniciada remotamente`);
          // Iniciar animación local sincronizada
          if (data.rutaPuntos && data.rutaPuntos.length > 0) {
            const puntos = data.rutaPuntos.map(p => ({
              latitude: p.latitude || p.lat,
              longitude: p.longitude || p.lng
            }));
            setRutaReal(puntos);
            animarCamionSincronizado(puntos, 60000);
          }
        }
      });
      
      console.log('✅ [TrackingScreen] Socket conectado y escuchando');
    } catch (error) {
      console.warn('⚠️ [TrackingScreen] Error conectando socket:', error);
    }
  };

  const cargarDatos = async () => {
    try {
      console.log(`[TrackingScreen] Cargando datos del envío ID: ${envioId}`);
      
      if (!envioId) {
        throw new Error('ID de envío no válido');
      }
      
      const data = await envioService.getById(envioId);
      
      // Validar datos recibidos
      if (!data || !data.id) {
        throw new Error('Datos del envío inválidos');
      }
      
      // Normalizar estado_nombre
      if (data.estado && !data.estado_nombre) {
        data.estado_nombre = data.estado;
      }
      
      // Asegurar que las coordenadas sean números válidos
      data.origen_latitud = parseFloat(data.origen_latitud) || -17.7833;
      data.origen_longitud = parseFloat(data.origen_longitud) || -63.1821;
      data.destino_latitud = parseFloat(data.destino_latitud) || -17.7892;
      data.destino_longitud = parseFloat(data.destino_longitud) || -63.1751;
      
      console.log('[TrackingScreen] Envío cargado:', {
        id: data.id,
        codigo: data.codigo,
        estado: data.estado,
        estado_nombre: data.estado_nombre,
        coordenadas: {
          origen: [data.origen_latitud, data.origen_longitud],
          destino: [data.destino_latitud, data.destino_longitud]
        }
      });
      
      setEnvio(data);
    } catch (error) {
      console.error('❌ [TrackingScreen] Error al cargar envío:', error);
      Alert.alert('❌ Error', `No se pudo cargar el envío.\n\nDetalle: ${error?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const obtenerRutaReal = async (origen, destino) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen.latitude},${origen.longitude}&destination=${destino.latitude},${destino.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      
      console.log('[TrackingScreen] Obteniendo ruta real desde Google Directions API...');
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.overview_polyline.points);
        
        // Información de la ruta
        const leg = route.legs[0];
        setDistanciaTotal(leg.distance.text);
        setDuracionTotal(leg.duration.text);

        console.log(`[TrackingScreen] Ruta obtenida: ${points.length} puntos, ${leg.distance.text}, ${leg.duration.text}`);
        return points;
      } else {
        console.error('[TrackingScreen] Error en Directions API:', data.status);
        return [];
      }
    } catch (error) {
      console.error('❌ [TrackingScreen] Error al obtener ruta:', error);
      return [];
    }
  };

  // Decodificar polyline de Google
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  const handleIniciarSimulacion = async () => {
    try {
      console.log('[TrackingScreen] Iniciando simulación con ruta real...');
      setSimulando(true);

      // PRIMERO: Notificar al backend para que Laravel también muestre la simulación
      console.log('[TrackingScreen] Notificando al backend para sincronizar con Laravel...');
      try {
        await envioService.simularMovimiento(envioId);
        console.log('[TrackingScreen] ✅ Backend notificado - Laravel puede ver el tracking');
      } catch (backendError) {
        console.warn('[TrackingScreen] ⚠️ No se pudo notificar al backend:', backendError.message);
      }

      const origen = {
        latitude: parseFloat(envio.origen_latitud) || -17.7833,
        longitude: parseFloat(envio.origen_longitud) || -63.1821,
      };

      const destino = {
        latitude: parseFloat(envio.destino_latitud) || -17.7892,
        longitude: parseFloat(envio.destino_longitud) || -63.1751,
      };

      // Obtener ruta real de Google Directions
      const puntosRuta = await obtenerRutaReal(origen, destino);

      if (puntosRuta.length === 0) {
        Alert.alert('⚠️ Error', 'No se pudo obtener la ruta desde Google Maps');
        setSimulando(false);
        return;
      }

      setRutaReal(puntosRuta);
      setIndicePuntoActual(0);

      // Ajustar mapa para mostrar toda la ruta
      if (mapRef.current && puntosRuta.length > 0) {
        mapRef.current.fitToCoordinates(puntosRuta, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      }

      const duracionMs = 60000; // 1 minuto

      // ENVIAR por WebSocket para sincronizar con Laravel
      socketService.iniciarSimulacion(envioId, puntosRuta);
      console.log('[TrackingScreen] 📡 Simulación enviada por WebSocket');

      // Animar el camión siguiendo la ruta real
      animarCamionRutaReal(puntosRuta, duracionMs);
    } catch (error) {
      console.error('❌ [TrackingScreen] Error en simulación:', error);
      Alert.alert('❌ Error', `No se pudo iniciar la simulación.\n\nDetalle: ${error.message}`);
      setSimulando(false);
    }
  };

  // Animación sincronizada cuando se recibe de otro cliente
  const animarCamionSincronizado = (puntos, duracionMs) => {
    if (!puntos || puntos.length === 0) return;
    
    setSimulando(true);
    setIndicePuntoActual(0);
    
    const intervaloMs = duracionMs / puntos.length;
    let indice = 0;
    
    intervalRef.current = setInterval(() => {
      if (indice >= puntos.length - 1) {
        clearInterval(intervalRef.current);
        setSimulando(false);
        setIndicePuntoActual(puntos.length - 1);
        return;
      }
      
      setIndicePuntoActual(indice);
      indice++;
    }, intervaloMs);
  };

  const animarCamionRutaReal = (puntos, duracionMs = 60000) => {
    if (!puntos || puntos.length === 0) {
      console.warn('[TrackingScreen] No hay puntos para animar');
      setSimulando(false);
      return;
    }

    console.log(`[TrackingScreen] Iniciando animación con ${puntos.length} puntos de ruta real`);
    let indice = 0;
    
    // Calcular intervalo para que dure exactamente duracionMs
    const intervaloMs = duracionMs / puntos.length;
    console.log(`[TrackingScreen] Intervalo: ${intervaloMs.toFixed(0)}ms por punto`);

    intervalRef.current = setInterval(() => {
      try {
        if (indice >= puntos.length - 1) {
          console.log('[TrackingScreen] Animación completada');
          clearInterval(intervalRef.current);
          setSimulando(false);
          setIndicePuntoActual(puntos.length - 1);
          
          // Notificar por socket que terminó
          socketService.completarEnvio(envioId);
          
          // Auto-marcar como entregado
          marcarComoEntregado();
          return;
        }

        setIndicePuntoActual(indice);
        
        // Enviar posición por WebSocket para sincronizar con Laravel
        const punto = puntos[indice];
        const progreso = indice / puntos.length;
        socketService.enviarPosicion(envioId, { latitude: punto.latitude, longitude: punto.longitude }, progreso);

        // Centrar mapa en el punto actual
        if (mapRef.current && puntos[indice]) {
          mapRef.current.animateToRegion({
            latitude: puntos[indice].latitude,
            longitude: puntos[indice].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, intervaloMs * 0.8);
        }

        indice++;
      } catch (error) {
        console.error('[TrackingScreen] Error en animación:', error);
        clearInterval(intervalRef.current);
        setSimulando(false);
      }
    }, intervaloMs);
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
            text: 'Volver',
            onPress: () => navigation.goBack()
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
  const posicionCamion = rutaReal.length > 0 && indicePuntoActual < rutaReal.length
    ? rutaReal[indicePuntoActual]
    : origen;

  // Ruta recorrida
  const rutaRecorrida = rutaReal.length > 0 ? rutaReal.slice(0, indicePuntoActual + 1) : [];

  // Región inicial del mapa
  const regionInicial = {
    latitude: (origen.latitude + destino.latitude) / 2,
    longitude: (origen.longitude + destino.longitude) / 2,
    latitudeDelta: Math.abs(origen.latitude - destino.latitude) * 2.5 || 0.05,
    longitudeDelta: Math.abs(origen.longitude - destino.longitude) * 2.5 || 0.05,
  };

  const progreso = rutaReal.length > 0 ? Math.round((indicePuntoActual / rutaReal.length) * 100) : 0;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFF" />
        <Appbar.Content title="Tracking en Tiempo Real" titleStyle={{ color: '#FFF', fontWeight: 'bold' }} />
        <Appbar.Action 
          icon="file-document" 
          color="#FFF"
          onPress={() => navigation.navigate('EnvioDetalle', { envioId })} 
        />
      </Appbar.Header>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Información del Envío */}
        <Surface style={styles.infoCard} elevation={3}>
          <View style={styles.headerRow}>
            <Text variant="headlineSmall" style={styles.codigo}>
              {envio.codigo}
            </Text>
            <Chip 
              icon={() => <Icon name={getEstadoIcono(envio.estado)} size={18} color="white" />}
              style={[styles.estadoChip, { backgroundColor: getEstadoColor(envio.estado) }]}
              textStyle={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}
            >
              {envio.estado?.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon name="warehouse" size={22} color="#4CAF50" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Destino</Text>
              <Text style={styles.infoValue}>{envio.almacen_nombre}</Text>
            </View>
          </View>

          {envio.vehiculo_placa && (
            <View style={styles.infoRow}>
              <Icon name="truck" size={22} color="#2196F3" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehículo</Text>
                <Text style={styles.infoValue}>{envio.vehiculo_placa}</Text>
              </View>
            </View>
          )}

          {distanciaTotal && duracionTotal && (
            <>
              <View style={styles.infoRow}>
                <Icon name="map-marker-distance" size={22} color="#FF9800" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Distancia</Text>
                  <Text style={styles.infoValue}>{distanciaTotal}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="clock-outline" size={22} color="#9C27B0" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Duración Estimada</Text>
                  <Text style={styles.infoValue}>{duracionTotal}</Text>
                </View>
              </View>
            </>
          )}

          {simulando && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progreso}%` }]} />
              </View>
              <Text style={styles.progressText}>🚚 Camión en Ruta: {progreso}%</Text>
            </View>
          )}
        </Surface>

        {/* Mapa con Google Maps */}
        <Surface style={styles.mapCard} elevation={4}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={regionInicial}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsTraffic={true}
            mapType="standard"
          >
            {/* Marcador de Origen (Planta) */}
            <Marker coordinate={origen} title="Planta Principal" description="Punto de Origen">
              <View style={styles.origenMarker}>
                <Icon name="factory" size={10} color="#FFF" />
              </View>
            </Marker>

            {/* Marcador de Destino (Almacén) */}
            <Marker coordinate={destino} title={envio.almacen_nombre} description="Punto de Destino">
              <View style={styles.destinoMarker}>
                <Icon name="warehouse" size={10} color="#FFF" />
              </View>
            </Marker>

            {/* Marcador del Camión */}
            {rutaReal.length > 0 && (
              <Marker coordinate={posicionCamion} title="Transportista" anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.truckMarker}>
                  <Icon name="truck-fast" size={12} color="#FFF" />
                </View>
              </Marker>
            )}

            {/* Ruta completa (gris claro) */}
            {rutaReal.length > 0 && (
              <Polyline
                coordinates={rutaReal}
                strokeColor="#BDBDBD"
                strokeWidth={6}
              />
            )}

            {/* Ruta recorrida (verde) */}
            {rutaRecorrida.length > 1 && (
              <Polyline
                coordinates={rutaRecorrida}
                strokeColor="#4CAF50"
                strokeWidth={6}
              />
            )}
          </MapView>
        </Surface>

        {/* Botones de Acción */}
        <Surface style={styles.actionCard} elevation={2}>
          {envio.estado === 'entregado' ? (
            <View style={styles.entregadoBox}>
              <Icon name="check-circle" size={64} color="#4CAF50" />
              <Text variant="headlineSmall" style={styles.entregadoText}>
                ✅ Envío Entregado
              </Text>
              <Text variant="bodyMedium" style={styles.entregadoSubtext}>
                El envío llegó a su destino exitosamente
              </Text>
            </View>
          ) : !simulando && rutaReal.length === 0 ? (
            <>
              <Button
                mode="contained"
                icon="play-circle"
                onPress={handleIniciarSimulacion}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Iniciar Simulación de Ruta
              </Button>
              <Text variant="bodySmall" style={styles.buttonHint}>
                La simulación usará rutas reales de Google Maps y mostrará el recorrido del camión en tiempo real.
              </Text>
            </>
          ) : simulando ? (
            <View style={styles.simulandoBox}>
              <ActivityIndicator size={48} color="#4CAF50" />
              <Text variant="titleLarge" style={styles.simulandoText}>
                🚚 Camión en Ruta
              </Text>
              <Text variant="bodyLarge" style={styles.simulandoSubtext}>
                Siguiendo ruta real de Google Maps
              </Text>
            </View>
          ) : (
            <View style={styles.completadoBox}>
              <Icon name="map-check" size={48} color="#4CAF50" />
              <Text variant="titleMedium" style={styles.completadoText}>
                Simulación Completada
              </Text>
            </View>
          )}
        </Surface>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    elevation: 4,
  },
  scrollView: {
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
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFF',
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
    flex: 1,
  },
  estadoChip: {
    height: 36,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mapCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  map: {
    width: '100%',
    height: 400,
  },
  origenMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  destinoMarker: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  truckMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  actionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFF',
  },
  button: {
    marginBottom: 12,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonHint: {
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  entregadoBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  entregadoText: {
    marginTop: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  entregadoSubtext: {
    marginTop: 8,
    color: '#757575',
    textAlign: 'center',
  },
  simulandoBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  simulandoText: {
    marginTop: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  simulandoSubtext: {
    marginTop: 8,
    color: '#757575',
  },
  completadoBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completadoText: {
    marginTop: 12,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
});
