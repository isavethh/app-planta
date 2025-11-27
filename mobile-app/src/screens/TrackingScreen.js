import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Dimensions, ScrollView, Linking } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip, ProgressBar, Divider } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

// Coordenadas de la Planta
const PLANTA_COORDS = {
  latitude: -17.7833,
  longitude: -63.1821,
  nombre: 'Planta Central Applanta'
};

export default function TrackingScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeActual, setMensajeActual] = useState('');
  
  const intervaloRef = useRef(null);

  useEffect(() => {
    cargarDatos();
    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
      }
    };
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const data = await envioService.getById(envioId);
      setEnvio(data);
    } catch (error) {
      console.error('Error al cargar envío:', error);
      Alert.alert('Error', 'No se pudo cargar el envío');
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = async () => {
    try {
      const pdfUrl = `http://10.26.5.55:8000/api/envios/${envioId}/documento`;
      
      Alert.alert(
        '📄 Documento del Envío',
        'Se abrirá el PDF con todos los detalles',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Abrir', 
            onPress: async () => {
              try {
                await Linking.openURL(pdfUrl);
              } catch (err) {
                Alert.alert('Aviso', 'Asegúrate de que Laravel esté corriendo en puerto 8000');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo acceder al documento');
    }
  };

  const iniciarSimulacion = async () => {
    if (!envio || simulando) return;

    try {
      await envioService.iniciarEnvio(envioId);
      
      setSimulando(true);
      setProgreso(0);
      setMensajeActual('🚚 Saliendo de la planta...');

      const duracion = 30000;
      const pasoIntervalo = 300;
      const pasosTotales = duracion / pasoIntervalo;
      let paso = 0;
      
      intervaloRef.current = setInterval(() => {
        paso++;
        const nuevoProgreso = paso / pasosTotales;
        
        if (nuevoProgreso >= 1) {
          if (intervaloRef.current) {
            clearInterval(intervaloRef.current);
            intervaloRef.current = null;
          }
          finalizarSimulacion();
          return;
        }
        
        setProgreso(nuevoProgreso);
        
        if (nuevoProgreso < 0.3) {
          setMensajeActual('🚚 Saliendo de la planta...');
        } else if (nuevoProgreso < 0.7) {
          setMensajeActual('🛣️ En camino al almacén...');
        } else {
          setMensajeActual('🎯 Llegando al destino...');
        }
      }, pasoIntervalo);
      
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la simulación');
      setSimulando(false);
    }
  };

  const finalizarSimulacion = async () => {
    try {
      await envioService.marcarEntregado(envioId);
      setSimulando(false);
      setProgreso(1);
      
      Alert.alert(
        '🎉 ¡Envío Entregado!',
        `Entrega completada en "${envio?.almacen_nombre}"\n\n✅ Estado: ENTREGADO`,
        [{ 
          text: 'Aceptar', 
          onPress: () => {
            cargarDatos();
            navigation.goBack();
          }
        }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar como entregado');
      setSimulando(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!envio) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>No se pudo cargar el envío</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>Volver</Button>
      </View>
    );
  }

  const destino = {
    latitude: parseFloat(envio.latitud) || -17.7892,
    longitude: parseFloat(envio.longitud) || -63.1751,
  };

  // HTML para Google Maps con ruta real
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; }
        #map { width: 100%; height: 100vh; }
        .marker { 
          background: white; 
          padding: 8px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .marker.planta { color: #2196F3; border: 2px solid #2196F3; }
        .marker.almacen { color: #4CAF50; border: 2px solid #4CAF50; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        function initMap() {
          const planta = { lat: ${PLANTA_COORDS.latitude}, lng: ${PLANTA_COORDS.longitude} };
          const almacen = { lat: ${destino.latitude}, lng: ${destino.longitude} };
          
          const map = new google.maps.Map(document.getElementById('map'), {
            zoom: 13,
            center: planta,
            mapTypeId: 'roadmap',
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: false
          });
          
          // Marcador Planta
          new google.maps.Marker({
            position: planta,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 15,
              fillColor: '#2196F3',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 3
            },
            label: {
              text: '🏭',
              fontSize: '20px'
            },
            title: 'Planta Central'
          });
          
          // Marcador Almacén
          new google.maps.Marker({
            position: almacen,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 15,
              fillColor: '#4CAF50',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 3
            },
            label: {
              text: '🎯',
              fontSize: '20px'
            },
            title: '${envio.almacen_nombre}'
          });
          
          // Servicio de direcciones para ruta REAL
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#9C27B0',
              strokeWeight: 6,
              strokeOpacity: 0.8
            }
          });
          
          // Calcular ruta REAL
          directionsService.route({
            origin: planta,
            destination: almacen,
            travelMode: google.maps.TravelMode.DRIVING
          }, (result, status) => {
            if (status === 'OK') {
              directionsRenderer.setDirections(result);
            }
          });
          
          // Ajustar vista para mostrar ambos puntos
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(planta);
          bounds.extend(almacen);
          map.fitBounds(bounds);
        }
      </script>
      <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&callback=initMap" async defer></script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Seguimiento" />
        <Appbar.Action icon="refresh" onPress={cargarDatos} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Información del Envío */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="titleLarge" style={styles.codigo}>{envio.codigo}</Text>
              <Chip 
                icon={() => <Icon name="circle" size={12} color="white" />}
                style={[styles.estadoChip, { backgroundColor: getEstadoColor(envio.estado) }]}
                textStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                {simulando ? 'EN TRÁNSITO' : envio.estado?.toUpperCase().replace('_', ' ')}
              </Chip>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.infoRow}>
              <Icon name="warehouse" size={20} color="#4CAF50" />
              <Text style={styles.infoText}>{envio.almacen_nombre}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="map-marker" size={20} color="#FF5722" />
              <Text style={styles.infoText}>{envio.direccion_completa || 'Sin dirección'}</Text>
            </View>

            {envio.fecha_estimada_entrega && (
              <View style={styles.infoRow}>
                <Icon name="calendar-clock" size={20} color="#2196F3" />
                <Text style={styles.infoText}>
                  {new Date(envio.fecha_estimada_entrega).toLocaleDateString('es-ES')}
                  {envio.hora_estimada && ` • ${envio.hora_estimada}`}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* BOTÓN DE PDF - PRIMERO */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              icon="file-pdf-box"
              onPress={descargarPDF}
              buttonColor="#F44336"
              contentStyle={styles.pdfButtonContent}
              labelStyle={styles.pdfButtonLabel}
            >
              📄 VER DOCUMENTO PDF COMPLETO
            </Button>
            <Text variant="bodySmall" style={styles.hint}>
              Documento con todos los detalles del envío
            </Text>
          </Card.Content>
        </Card>

        {/* MAPA REAL DE GOOGLE MAPS CON RUTA REAL */}
        <Card style={styles.card}>
          <Card.Content style={{ padding: 0 }}>
            <View style={styles.mapHeader}>
              <Text variant="titleMedium" style={styles.mapTitle}>
                🗺️ Mapa Real con Ruta de Navegación
              </Text>
              <Text variant="bodySmall" style={styles.mapSubtitle}>
                Puedes hacer zoom y moverte por el mapa
              </Text>
            </View>
            
            <View style={styles.mapContainer}>
              <WebView
                source={{ html: mapHtml }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.mapLoading}>
                    <ActivityIndicator size="large" color="#9C27B0" />
                    <Text style={{ marginTop: 10, color: '#666' }}>Cargando mapa...</Text>
                  </View>
                )}
              />
            </View>

            {/* Tarjeta de progreso */}
            {simulando && (
              <View style={styles.progressOverlay}>
                <Card style={styles.progressCard} elevation={3}>
                  <Card.Content>
                    <Text style={styles.progressMensaje}>{mensajeActual}</Text>
                    <ProgressBar progress={progreso} color="#9C27B0" style={styles.progressBar} />
                    <View style={styles.progressStats}>
                      <Text style={styles.progressStat}>📊 {Math.round(progreso * 100)}%</Text>
                      <Text style={styles.progressStat}>⏱️ {Math.round((1 - progreso) * 30)}s</Text>
                    </View>
                  </Card.Content>
                </Card>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Productos */}
        {envio.productos && envio.productos.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                📦 Productos ({envio.productos.length})
              </Text>
              {envio.productos.map((producto, index) => (
                <View key={index}>
                  {index > 0 && <Divider style={{ marginVertical: 10 }} />}
                  <View style={styles.productoItem}>
                    <Icon name="package" size={24} color="#4CAF50" />
                    <View style={styles.productoInfo}>
                      <Text variant="titleSmall" style={styles.productoNombre}>
                        {producto.producto_nombre || 'Producto'}
                      </Text>
                      <Text variant="bodySmall" style={styles.productoDetalle}>
                        Cantidad: x{producto.cantidad}
                        {producto.peso_total && ` • ${producto.peso_total} kg`}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Información de ruta */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📍 Información de Ruta</Text>
            
            <View style={styles.rutaInfoItem}>
              <Icon name="factory" size={24} color="#2196F3" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text variant="titleSmall">Origen: Planta Central</Text>
                <Text variant="bodySmall" style={{ color: '#666' }}>
                  {PLANTA_COORDS.latitude.toFixed(4)}, {PLANTA_COORDS.longitude.toFixed(4)}
                </Text>
              </View>
            </View>

            <View style={styles.rutaDivider}>
              <Icon name="arrow-down" size={20} color="#9C27B0" />
              <Text style={{ color: '#9C27B0', fontSize: 11 }}>
                {simulando ? `${Math.round(progreso * 100)}% completado` : 'Ruta calculada por Google Maps'}
              </Text>
            </View>

            <View style={styles.rutaInfoItem}>
              <Icon name="warehouse" size={24} color="#4CAF50" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text variant="titleSmall">Destino: {envio.almacen_nombre}</Text>
                <Text variant="bodySmall" style={{ color: '#666' }}>
                  {destino.latitude.toFixed(4)}, {destino.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Resumen */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📊 Resumen</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon name="package-variant" size={28} color="#4CAF50" />
                <Text style={styles.statValue}>{envio.total_cantidad || 0}</Text>
                <Text style={styles.statLabel}>Unidades</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="weight" size={28} color="#FF9800" />
                <Text style={styles.statValue}>{parseFloat(envio.total_peso || 0).toFixed(1)}</Text>
                <Text style={styles.statLabel}>Kg</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="currency-usd" size={28} color="#2196F3" />
                <Text style={styles.statValue}>${parseFloat(envio.total_precio || 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Botón de simulación */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              icon={simulando ? "truck-fast" : "play-circle"}
              onPress={iniciarSimulacion}
              disabled={simulando}
              buttonColor={simulando ? "#4CAF50" : "#9C27B0"}
              contentStyle={styles.simularButtonContent}
              labelStyle={styles.simularButtonLabel}
            >
              {simulando ? '🚚 Simulación en Curso...' : '🚀 Iniciar Simulación'}
            </Button>
            <Text variant="bodySmall" style={styles.hint}>
              {simulando
                ? 'Duración: 30 segundos. Se marcará como entregado al finalizar.'
                : 'Simula el tránsito del envío en 30 segundos y marca como entregado.'
              }
            </Text>
          </Card.Content>
        </Card>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    margin: 15,
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
  },
  estadoChip: {
    height: 28,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  pdfButtonContent: {
    paddingVertical: 10,
  },
  pdfButtonLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  hint: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
    fontSize: 11,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  mapHeader: {
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  mapTitle: {
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  mapSubtitle: {
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  mapContainer: {
    height: 400,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  mapLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  progressOverlay: {
    padding: 15,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  progressMensaje: {
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  progressStat: {
    fontSize: 11,
    color: '#666',
    fontWeight: 'bold',
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productoInfo: {
    marginLeft: 12,
    flex: 1,
  },
  productoNombre: {
    fontWeight: 'bold',
    color: '#333',
  },
  productoDetalle: {
    color: '#666',
    marginTop: 2,
  },
  rutaInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  rutaDivider: {
    alignItems: 'center',
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  simularButtonContent: {
    paddingVertical: 10,
  },
  simularButtonLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
