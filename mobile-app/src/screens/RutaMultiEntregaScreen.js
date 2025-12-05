import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  ProgressBar,
  Divider,
  Badge,
  Surface,
  IconButton,
  Portal,
  Modal,
  ActivityIndicator,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { AuthContext } from '../context/AuthContext';
import { rutasMultiService } from '../services/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const { width, height } = Dimensions.get('window');

// Coordenadas de la Planta Principal (origen)
const ORIGEN = {
  latitude: -17.7833,
  longitude: -63.1821,
  nombre: 'Planta Principal'
};

export default function RutaMultiEntregaScreen({ route, navigation }) {
  const { rutaId } = route.params || {};
  const { userInfo } = useContext(AuthContext);
  const mapRef = useRef(null);
  
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checklistModalVisible, setChecklistModalVisible] = useState(false);
  const [selectedParada, setSelectedParada] = useState(null);
  const [procesando, setProcesando] = useState(false);
  
  // Estados para simulación
  const [simulando, setSimulando] = useState(false);
  const [posicionActual, setPosicionActual] = useState(null);
  const [velocidadSimulacion, setVelocidadSimulacion] = useState(1);
  const [paradaActualIndex, setParadaActualIndex] = useState(-1);
  const simulacionRef = useRef(null);
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [simulacionExpandida, setSimulacionExpandida] = useState(false);

  const cargarRuta = async () => {
    try {
      if (!rutaId) {
        console.error('[RutaMultiEntregaScreen] rutaId no proporcionado');
        setLoading(false);
        return;
      }

      console.log(`[RutaMultiEntregaScreen] Cargando ruta ID: ${rutaId}`);
      const response = await rutasMultiService.obtenerRuta(rutaId);
      
      if (response.success) {
        console.log('[RutaMultiEntregaScreen] Ruta cargada:', response.ruta.codigo);
        console.log('[RutaMultiEntregaScreen] Paradas:', response.ruta.paradas?.length);
        setRuta(response.ruta);
        
        // Inicializar posición en origen
        setPosicionActual({
          latitude: ORIGEN.latitude,
          longitude: ORIGEN.longitude,
        });
      } else {
        Alert.alert('Error', response.message || 'No se pudo cargar la ruta');
      }
    } catch (error) {
      console.error('[RutaMultiEntregaScreen] Error:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarRuta();
      return () => {
        // Limpiar simulación al salir
        if (simulacionRef.current) {
          clearInterval(simulacionRef.current);
        }
      };
    }, [rutaId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarRuta();
  };

  const handleIniciarRuta = () => {
    Alert.alert(
      '🚚 Iniciar Ruta',
      'Antes de iniciar, debes completar el checklist de salida. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar Checklist',
          onPress: () => {
            navigation.navigate('ChecklistSalida', {
              rutaId: ruta.id,
              rutaCodigo: ruta.codigo,
            });
          },
        },
      ]
    );
  };

  const handleRegistrarLlegada = async (parada) => {
    Alert.alert(
      '📍 Registrar Llegada',
      `¿Confirmar llegada a ${parada.almacen_nombre || 'esta parada'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setProcesando(true);
              const response = await rutasMultiService.registrarLlegada(parada.id, {
                lat: posicionActual?.latitude,
                lng: posicionActual?.longitude,
              });
              
              if (response.success) {
                Alert.alert('✅ Éxito', 'Llegada registrada correctamente');
                cargarRuta();
              } else {
                Alert.alert('Error', response.message);
              }
            } catch (error) {
              console.error('[RutaMultiEntregaScreen] Error registrar llegada:', error);
              Alert.alert('Error', 'No se pudo registrar la llegada');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  const handleCompletarEntrega = (parada) => {
    navigation.navigate('ChecklistEntrega', {
      rutaId: ruta.id,
      paradaId: parada.id,
      paradaNombre: parada.almacen_nombre,
      envioId: parada.envio_id,
    });
  };

  const handleAbrirNavegador = (parada) => {
    const lat = parada.latitud || parada.almacen_latitud;
    const lng = parada.longitud || parada.almacen_longitud;
    
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${parada.almacen_nombre || 'Destino'})`,
      });
      Linking.openURL(url);
    } else {
      Alert.alert('Sin ubicación', 'Este destino no tiene coordenadas GPS registradas');
    }
  };

  // ===================== SIMULACIÓN =====================
  const iniciarSimulacion = () => {
    if (!ruta?.paradas?.length) {
      Alert.alert('Error', 'No hay paradas para simular');
      return;
    }

    setSimulando(true);
    setParadaActualIndex(0);
    
    // Construir ruta: Origen -> Parada 1 -> Parada 2 -> ...
    const puntosRuta = [
      { lat: ORIGEN.latitude, lng: ORIGEN.longitude, nombre: 'Planta Principal' },
      ...ruta.paradas.sort((a, b) => a.orden - b.orden).map(p => ({
        lat: parseFloat(p.latitud),
        lng: parseFloat(p.longitud),
        nombre: p.almacen_nombre || `Parada ${p.orden}`,
        paradaId: p.id
      }))
    ];

    let puntoActual = 0;
    let progreso = 0;

    simulacionRef.current = setInterval(() => {
      if (puntoActual >= puntosRuta.length - 1) {
        clearInterval(simulacionRef.current);
        setSimulando(false);
        Alert.alert('✅ Simulación Completada', 'Has llegado a todas las paradas');
        return;
      }

      const desde = puntosRuta[puntoActual];
      const hasta = puntosRuta[puntoActual + 1];
      
      progreso += 0.02 * velocidadSimulacion;

      if (progreso >= 1) {
        puntoActual++;
        progreso = 0;
        setParadaActualIndex(puntoActual);
        
        if (puntoActual < puntosRuta.length) {
          const llegada = puntosRuta[puntoActual];
          Alert.alert(`📍 Parada ${puntoActual}`, `Llegada a: ${llegada.nombre}`);
        }
      }

      const lat = desde.lat + (hasta.lat - desde.lat) * progreso;
      const lng = desde.lng + (hasta.lng - desde.lng) * progreso;

      setPosicionActual({ latitude: lat, longitude: lng });
      
    }, 100);
  };

  const detenerSimulacion = () => {
    if (simulacionRef.current) {
      clearInterval(simulacionRef.current);
    }
    setSimulando(false);
  };

  const resetearSimulacion = () => {
    detenerSimulacion();
    setPosicionActual({
      latitude: ORIGEN.latitude,
      longitude: ORIGEN.longitude,
    });
    setParadaActualIndex(-1);
  };

  const centrarMapa = () => {
    if (!mapRef.current || !ruta?.paradas?.length) return;
    
    const coordenadas = [
      { latitude: ORIGEN.latitude, longitude: ORIGEN.longitude },
      ...ruta.paradas.map(p => ({
        latitude: parseFloat(p.latitud),
        longitude: parseFloat(p.longitud),
      }))
    ];
    
    mapRef.current.fitToCoordinates(coordenadas, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  };

  const construirRutaPolyline = () => {
    if (!ruta?.paradas?.length) return [];
    
    return [
      { latitude: ORIGEN.latitude, longitude: ORIGEN.longitude },
      ...ruta.paradas
        .sort((a, b) => a.orden - b.orden)
        .map(p => ({
          latitude: parseFloat(p.latitud),
          longitude: parseFloat(p.longitud),
        }))
    ];
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'programada': '#9E9E9E',
      'aceptada': '#2196F3',
      'en_transito': '#9C27B0',
      'completada': '#4CAF50',
      'cancelada': '#F44336',
    };
    return colores[estado] || '#757575';
  };

  const getEstadoParadaColor = (estado) => {
    const colores = {
      'pendiente': '#FF9800',
      'en_camino': '#2196F3',
      'en_destino': '#9C27B0',
      'entregado': '#4CAF50',
    };
    return colores[estado] || '#757575';
  };

  const getEstadoParadaIcon = (estado) => {
    const iconos = {
      'pendiente': 'clock-outline',
      'en_camino': 'truck-fast',
      'en_destino': 'map-marker-check',
      'entregado': 'check-circle',
    };
    return iconos[estado] || 'help-circle';
  };

  const calcularProgreso = () => {
    if (!ruta?.paradas?.length) return 0;
    const completadas = ruta.paradas.filter(p => p.estado === 'entregado').length;
    return completadas / ruta.paradas.length;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando ruta...</Text>
      </View>
    );
  }

  if (!ruta) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={60} color="#F44336" />
        <Text style={styles.errorText}>No se encontró la ruta</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Volver
        </Button>
      </View>
    );
  }

  const progreso = calcularProgreso();
  const paradasPendientes = ruta.paradas?.filter(p => p.estado !== 'entregado').length || 0;
  const paradasCompletadas = ruta.paradas?.filter(p => p.estado === 'entregado').length || 0;
  const rutaPolyline = construirRutaPolyline();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      
      {/* Header */}
      <Surface style={styles.header} elevation={4}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{ruta.codigo}</Text>
            <Chip 
              style={[styles.estadoChip, { backgroundColor: getEstadoColor(ruta.estado) }]}
              textStyle={styles.estadoChipText}
            >
              {ruta.estado?.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>
          
          <View style={styles.headerButtons}>
            <IconButton
              icon="crosshairs-gps"
              iconColor="#fff"
              size={22}
              onPress={centrarMapa}
            />
            <IconButton
              icon="refresh"
              iconColor="#fff"
              size={22}
              onPress={onRefresh}
            />
          </View>
        </View>
      </Surface>

      {/* Mapa con paradas */}
      {mostrarMapa && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: ORIGEN.latitude,
              longitude: ORIGEN.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            onMapReady={centrarMapa}
          >
            {/* Marcador del Origen - Planta */}
            <Marker
              coordinate={{ latitude: ORIGEN.latitude, longitude: ORIGEN.longitude }}
              title="Planta Principal"
              description="Punto de partida"
            >
              <View style={styles.markerOrigen}>
                <Icon name="factory" size={24} color="#4CAF50" />
              </View>
            </Marker>

            {/* Marcadores de Paradas */}
            {ruta.paradas?.map((parada, index) => {
              const lat = parseFloat(parada.latitud);
              const lng = parseFloat(parada.longitud);
              
              if (isNaN(lat) || isNaN(lng)) return null;
              
              return (
                <Marker
                  key={parada.id}
                  coordinate={{ latitude: lat, longitude: lng }}
                  title={`Parada ${parada.orden}: ${parada.almacen_nombre || 'Almacén'}`}
                  description={`Envío: ${parada.envio_codigo}`}
                >
                  <View style={[
                    styles.markerParada,
                    parada.estado === 'entregado' && styles.markerEntregado,
                    paradaActualIndex === index + 1 && styles.markerActivo
                  ]}>
                    <Text style={styles.markerNumero}>{parada.orden}</Text>
                  </View>
                </Marker>
              );
            })}

            {/* Marcador de Posición Actual (simulación) */}
            {posicionActual && (
              <Marker
                coordinate={posicionActual}
                title="Tu ubicación"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.markerTransportista}>
                  <Icon name="truck" size={18} color="#fff" />
                </View>
              </Marker>
            )}

            {/* Polyline de la ruta */}
            {rutaPolyline.length > 1 && (
              <Polyline
                coordinates={rutaPolyline}
                strokeWidth={4}
                strokeColor="#2196F3"
                lineDashPattern={[1]}
              />
            )}
          </MapView>

          {/* Control de Simulación plegable */}
          <View style={[styles.simulacionControl, !simulacionExpandida && styles.simulacionColapsada]}>
            <TouchableOpacity 
              style={styles.simulacionHeader}
              onPress={() => setSimulacionExpandida(!simulacionExpandida)}
            >
              <Text style={styles.simulacionTitulo}>🎮 Simulación</Text>
              <Icon 
                name={simulacionExpandida ? "chevron-down" : "chevron-up"} 
                size={20} 
                color="#333" 
              />
            </TouchableOpacity>
            
            {simulacionExpandida && (
              <>
                <View style={styles.velocidadContainer}>
                  <Text style={styles.velocidadLabel}>Velocidad: {velocidadSimulacion.toFixed(1)}x</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0.5}
                    maximumValue={10}
                    step={0.5}
                    value={velocidadSimulacion}
                    onValueChange={setVelocidadSimulacion}
                    minimumTrackTintColor="#4CAF50"
                    maximumTrackTintColor="#ccc"
                    thumbTintColor="#4CAF50"
                  />
                </View>

                <View style={styles.simulacionBotones}>
                  {!simulando ? (
                    <Button 
                      mode="contained" 
                      icon="play" 
                      onPress={iniciarSimulacion}
                      compact
                      buttonColor="#4CAF50"
                      style={styles.botonSimular}
                    >
                      Iniciar
                    </Button>
                  ) : (
                    <Button 
                      mode="contained" 
                      icon="pause" 
                      onPress={detenerSimulacion}
                      compact
                      buttonColor="#FF9800"
                      style={styles.botonSimular}
                    >
                      Pausar
                    </Button>
                  )}
                  
                  <IconButton
                    icon="refresh"
                    mode="contained"
                    iconColor="#fff"
                    containerColor="#9E9E9E"
                    size={20}
                    onPress={resetearSimulacion}
                  />
                </View>
              </>
            )}
            
            {simulando && (
              <Text style={styles.simulacionInfo}>
                🚚 En camino a parada {paradaActualIndex + 1}/{ruta.paradas?.length}
              </Text>
            )}
          </View>

          {/* Botón minimizar mapa */}
          <TouchableOpacity 
            style={styles.minimizarBtn}
            onPress={() => setMostrarMapa(false)}
          >
            <Icon name="chevron-up" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Botón para mostrar mapa si está oculto */}
      {!mostrarMapa && (
        <TouchableOpacity 
          style={styles.mostrarMapaBtn}
          onPress={() => setMostrarMapa(true)}
        >
          <Icon name="map" size={20} color="#fff" />
          <Text style={styles.mostrarMapaText}>Ver Mapa</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Resumen de la ruta */}
        <Card style={styles.resumenCard} elevation={3}>
          <Card.Content>
            <View style={styles.resumenRow}>
              <View style={styles.resumenItem}>
                <Icon name="package-variant" size={28} color="#4CAF50" />
                <Text style={styles.resumenNumero}>{ruta.total_envios || 0}</Text>
                <Text style={styles.resumenLabel}>Envíos</Text>
              </View>
              
              <View style={styles.resumenDivider} />
              
              <View style={styles.resumenItem}>
                <Icon name="map-marker-path" size={28} color="#2196F3" />
                <Text style={styles.resumenNumero}>{ruta.paradas?.length || 0}</Text>
                <Text style={styles.resumenLabel}>Paradas</Text>
              </View>
              
              <View style={styles.resumenDivider} />
              
              <View style={styles.resumenItem}>
                <Icon name="check-circle" size={28} color="#4CAF50" />
                <Text style={styles.resumenNumero}>{paradasCompletadas}</Text>
                <Text style={styles.resumenLabel}>Completadas</Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Barra de progreso */}
            <View style={styles.progresoContainer}>
              <View style={styles.progresoHeader}>
                <Text style={styles.progresoLabel}>Progreso de entregas</Text>
                <Text style={styles.progresoPercent}>{Math.round(progreso * 100)}%</Text>
              </View>
              <ProgressBar 
                progress={progreso} 
                color="#4CAF50" 
                style={styles.progressBar}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Botón iniciar ruta (si está programada o aceptada) */}
        {(ruta.estado === 'programada' || ruta.estado === 'aceptada') && (
          <Button
            mode="contained"
            icon="truck-fast"
            onPress={handleIniciarRuta}
            style={styles.iniciarButton}
            contentStyle={styles.iniciarButtonContent}
            labelStyle={styles.iniciarButtonLabel}
          >
            Iniciar Ruta
          </Button>
        )}

        {/* Lista de paradas */}
        <Text style={styles.sectionTitle}>📍 Paradas ({ruta.paradas?.length || 0})</Text>
        
        {ruta.paradas?.sort((a, b) => a.orden - b.orden).map((parada, index) => (
          <Card 
            key={parada.id} 
            style={[
              styles.paradaCard,
              parada.estado === 'entregado' && styles.paradaCompletada,
              parada.estado === 'en_destino' && styles.paradaActiva,
              paradaActualIndex === index + 1 && styles.paradaSimulando,
            ]} 
            elevation={2}
          >
            <Card.Content>
              <View style={styles.paradaHeader}>
                <View style={styles.paradaOrden}>
                  <Badge 
                    size={28}
                    style={[
                      styles.ordenBadge,
                      { backgroundColor: getEstadoParadaColor(parada.estado) }
                    ]}
                  >
                    {parada.orden}
                  </Badge>
                </View>
                
                <View style={styles.paradaInfo}>
                  <Text style={styles.paradaNombre}>{parada.almacen_nombre}</Text>
                  <Text style={styles.paradaDireccion} numberOfLines={2}>
                    📍 {parada.almacen_direccion || 'Sin dirección'}
                  </Text>
                  
                  <View style={styles.paradaEstadoRow}>
                    <Icon 
                      name={getEstadoParadaIcon(parada.estado)} 
                      size={16} 
                      color={getEstadoParadaColor(parada.estado)} 
                    />
                    <Text style={[styles.paradaEstado, { color: getEstadoParadaColor(parada.estado) }]}>
                      {parada.estado?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <IconButton
                  icon="navigation-variant"
                  iconColor="#2196F3"
                  size={24}
                  onPress={() => handleAbrirNavegador(parada)}
                />
              </View>
              
              {/* Detalles del envío */}
              <View style={styles.paradaDetalles}>
                <Chip icon="package-variant" style={styles.detalleChip} textStyle={styles.detalleChipText}>
                  {parada.envio_codigo}
                </Chip>
                <Chip icon="weight" style={styles.detalleChip} textStyle={styles.detalleChipText}>
                  {parseFloat(parada.total_peso || 0).toFixed(1)} kg
                </Chip>
                <Chip icon="cube-outline" style={styles.detalleChip} textStyle={styles.detalleChipText}>
                  {parada.total_cantidad || 0} items
                </Chip>
              </View>
              
              {/* Horarios */}
              {(parada.hora_llegada || parada.hora_entrega) && (
                <View style={styles.horariosRow}>
                  {parada.hora_llegada && (
                    <Text style={styles.horarioText}>
                      🕐 Llegada: {new Date(parada.hora_llegada).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                  {parada.hora_entrega && (
                    <Text style={styles.horarioText}>
                      ✅ Entrega: {new Date(parada.hora_entrega).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              )}
              
              {/* Botones de acción */}
              {ruta.estado === 'en_transito' && parada.estado !== 'entregado' && (
                <View style={styles.paradaActions}>
                  {parada.estado === 'pendiente' || parada.estado === 'en_camino' ? (
                    <Button
                      mode="contained"
                      icon="map-marker-check"
                      onPress={() => handleRegistrarLlegada(parada)}
                      style={styles.actionButton}
                      buttonColor="#9C27B0"
                      loading={procesando}
                    >
                      Llegué al destino
                    </Button>
                  ) : parada.estado === 'en_destino' ? (
                    <Button
                      mode="contained"
                      icon="clipboard-check"
                      onPress={() => handleCompletarEntrega(parada)}
                      style={styles.actionButton}
                      buttonColor="#4CAF50"
                    >
                      Completar Entrega
                    </Button>
                  ) : null}
                </View>
              )}
              
              {/* Firma y receptor (si está entregado) */}
              {parada.estado === 'entregado' && parada.nombre_receptor && (
                <View style={styles.receptorInfo}>
                  <Icon name="account-check" size={18} color="#4CAF50" />
                  <Text style={styles.receptorText}>
                    Recibido por: {parada.nombre_receptor}
                    {parada.cargo_receptor && ` (${parada.cargo_receptor})`}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        ))}

        {/* Botón ver resumen (solo si completada) */}
        {ruta.estado === 'completada' && (
          <Button
            mode="outlined"
            icon="file-document"
            onPress={() => navigation.navigate('ResumenRuta', { rutaId: ruta.id })}
            style={styles.resumenButton}
          >
            Ver Resumen de Entregas
          </Button>
        )}
        
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    marginTop: 15,
    marginBottom: 20,
    fontSize: 18,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: STATUSBAR_HEIGHT,
    paddingBottom: 15,
    paddingHorizontal: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  estadoChip: {
    height: 26,
  },
  estadoChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 15,
  },
  resumenCard: {
    marginBottom: 15,
    borderRadius: 16,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  resumenItem: {
    alignItems: 'center',
    flex: 1,
  },
  resumenDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
  },
  resumenNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  resumenLabel: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    marginVertical: 15,
  },
  progresoContainer: {
    marginTop: 5,
  },
  progresoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progresoLabel: {
    fontSize: 14,
    color: '#666',
  },
  progresoPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
  },
  iniciarButton: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  iniciarButtonContent: {
    paddingVertical: 8,
  },
  iniciarButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 5,
  },
  paradaCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  paradaCompletada: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    opacity: 0.85,
  },
  paradaActiva: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
    backgroundColor: '#F3E5F5',
  },
  paradaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  paradaOrden: {
    marginRight: 12,
  },
  ordenBadge: {
    alignSelf: 'flex-start',
  },
  paradaInfo: {
    flex: 1,
  },
  paradaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  paradaDireccion: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  paradaEstadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paradaEstado: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  paradaDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  detalleChip: {
    backgroundColor: '#E3F2FD',
    height: 28,
  },
  detalleChipText: {
    fontSize: 11,
  },
  horariosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  horarioText: {
    fontSize: 12,
    color: '#666',
  },
  paradaActions: {
    marginTop: 15,
  },
  actionButton: {
    borderRadius: 8,
  },
  receptorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  receptorText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  resumenButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  // Estilos del mapa
  mapContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerOrigen: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 3,
  },
  markerParada: {
    backgroundColor: '#2196F3',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
  },
  markerEntregado: {
    backgroundColor: '#4CAF50',
  },
  markerActivo: {
    backgroundColor: '#FF9800',
    transform: [{ scale: 1.2 }],
  },
  markerNumero: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  markerTransportista: {
    backgroundColor: '#9C27B0',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
  },
  simulacionControl: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    elevation: 5,
  },
  simulacionColapsada: {
    padding: 0,
  },
  simulacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  simulacionTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  velocidadContainer: {
    marginBottom: 6,
  },
  velocidadLabel: {
    fontSize: 12,
    color: '#666',
  },
  slider: {
    width: '100%',
    height: 30,
  },
  simulacionBotones: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botonSimular: {
    flex: 1,
    marginRight: 8,
  },
  simulacionInfo: {
    marginTop: 6,
    fontSize: 12,
    color: '#9C27B0',
    fontWeight: '500',
  },
  minimizarBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  mostrarMapaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 10,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
  },
  mostrarMapaText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  paradaSimulando: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
});
