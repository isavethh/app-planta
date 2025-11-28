import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Dimensions, ScrollView, Linking, Platform, AppState } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip, ProgressBar, Divider } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Componente para capturar errores
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Error capturado:', error, errorInfo);
    Alert.alert('Error', `Se produjo un error: ${error.toString()}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Icon name="alert-circle" size={64} color="#F44336" />
          <Text style={{ fontSize: 18, marginTop: 20, textAlign: 'center' }}>
            Algo salió mal
          </Text>
          <Text style={{ marginTop: 10, textAlign: 'center', color: '#666' }}>
            {this.state.error?.toString()}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const { width } = Dimensions.get('window');

// Coordenadas de la Planta
const PLANTA_COORDS = {
  latitude: -17.7833,
  longitude: -63.1821,
  nombre: 'Planta Central Applanta'
};

function TrackingScreenContent({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeActual, setMensajeActual] = useState('');
  
  const intervaloRef = useRef(null);
  const webViewRef = useRef(null);
  const simulandoRef = useRef(false); // Ref para verificar en el intervalo

  useEffect(() => {
    console.log('📱 TrackingScreen montado');
    cargarDatos();
    
    // Listener para detectar cuando la app va al background
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      console.log('📱 AppState cambió a:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('⚠️ App en background - pausando simulación');
        if (intervaloRef.current && simulando) {
          console.log('⏸️ Pausando intervalo temporalmente');
          clearInterval(intervaloRef.current);
          intervaloRef.current = null;
        }
      }
    });
    
    return () => {
      console.log('📴 TrackingScreen desmontado - limpiando recursos');
      if (intervaloRef.current) {
        console.log('🛑 Deteniendo intervalo de simulación');
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
      setSimulando(false);
      simulandoRef.current = false;
      appStateSubscription.remove();
    };
  }, []);

  const cargarDatos = async () => {
    try {
      console.log('📥 Cargando datos del envío ID:', envioId);
      setLoading(true);
      const data = await envioService.getById(envioId);
      console.log('✅ Datos del envío cargados:', {
        codigo: data.codigo,
        estado: data.estado,
        almacen: data.almacen_nombre,
        latitud: data.latitud,
        longitud: data.longitud
      });
      setEnvio(data);
    } catch (error) {
      console.error('❌ Error al cargar envío:', error);
      Alert.alert('Error', 'No se pudo cargar el envío: ' + error.message);
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 INICIO DE SIMULACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      console.log('✅ Paso 1: Verificando estado inicial');
      console.log('   - envio:', envio ? 'OK' : 'NULL');
      console.log('   - simulando:', simulando);
      console.log('   - envioId:', envioId);
      
      if (!envio) {
        Alert.alert('Error', 'No hay datos del envío');
        return;
      }
      
      if (simulando) {
        Alert.alert('Aviso', 'La simulación ya está en curso');
        return;
      }

      console.log('✅ Paso 2: Llamando a API iniciarEnvio');
      const respuesta = await envioService.iniciarEnvio(envioId);
      console.log('   - Respuesta API:', respuesta);
      
      console.log('✅ Paso 3: Actualizando estados');
      setSimulando(true);
      simulandoRef.current = true; // Actualizar la ref también
      setProgreso(0);
      setMensajeActual('🚚 Saliendo de la planta...');
      
      console.log('✅ Paso 4: Esperando WebView (500ms)');
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✅ Paso 5: Configurando intervalo');
      const duracion = 30000;
      const pasoIntervalo = 1000; // Aumentado de 300ms a 1000ms para evitar sobrecarga
      const pasosTotales = duracion / pasoIntervalo;
      let paso = 0;
      let ultimoLogPaso = 0;
      
      console.log('   - Duración:', duracion, 'ms');
      console.log('   - Intervalo:', pasoIntervalo, 'ms');
      console.log('   - Pasos totales:', pasosTotales);
      
      intervaloRef.current = setInterval(() => {
        try {
          paso++;
          const nuevoProgreso = paso / pasosTotales;
          
          // Log solo cada 5 pasos para no saturar
          if (paso % 5 === 0 || paso !== ultimoLogPaso) {
            console.log(`🔄 Progreso: ${(nuevoProgreso * 100).toFixed(1)}% (Paso ${paso}/${pasosTotales})`);
            ultimoLogPaso = paso;
          }
          
          if (nuevoProgreso >= 1) {
            console.log('🏁 Simulación completada');
            if (intervaloRef.current) {
              clearInterval(intervaloRef.current);
              intervaloRef.current = null;
            }
            try {
              finalizarSimulacion();
            } catch (finalError) {
              console.error('❌ Error al llamar finalizarSimulacion:', finalError);
              console.error('Stack:', finalError.stack);
              Alert.alert('Error', 'Error al finalizar: ' + finalError.message);
            }
            return;
          }
          
          // Verificar que aún estamos en estado de simulación (usar ref para evitar closure)
          if (!simulandoRef.current) {
            console.log('⚠️ Simulación cancelada, deteniendo intervalo');
            if (intervaloRef.current) {
              clearInterval(intervaloRef.current);
              intervaloRef.current = null;
            }
            return;
          }
          
          setProgreso(nuevoProgreso);
          
          // Actualizar posición del camión en el mapa
          if (webViewRef.current) {
            try {
              // Verificar que el webView sigue montado
              const mensaje = JSON.stringify({
                type: 'updateProgress',
                progress: nuevoProgreso
              });
              webViewRef.current.postMessage(mensaje);
            } catch (webViewError) {
              console.warn(`⚠️ Error al enviar mensaje al WebView (paso ${paso}):`, webViewError.message);
              // Si hay muchos errores consecutivos, detener
              if (paso > 5 && webViewError.message.includes('null')) {
                console.error('❌ WebView parece estar destruido, deteniendo simulación');
                if (intervaloRef.current) {
                  clearInterval(intervaloRef.current);
                  intervaloRef.current = null;
                }
                Alert.alert('Error', 'El mapa dejó de responder. Por favor, intenta de nuevo.');
                setSimulando(false);
                simulandoRef.current = false;
                return;
              }
            }
          } else {
            console.warn(`⚠️ WebView no disponible en paso ${paso}`);
          }
          
          if (nuevoProgreso < 0.3) {
            setMensajeActual('🚚 Saliendo de la planta...');
          } else if (nuevoProgreso < 0.7) {
            setMensajeActual('🛣️ En camino al almacén...');
          } else {
            setMensajeActual('🎯 Llegando al destino...');
          }
        } catch (intervalError) {
          console.error(`❌ Error crítico en intervalo (paso ${paso}):`, intervalError);
          console.error('Stack:', intervalError.stack);
          
          // Detener la simulación si hay un error crítico
          if (intervaloRef.current) {
            clearInterval(intervaloRef.current);
            intervaloRef.current = null;
          }
          setSimulando(false);
          simulandoRef.current = false;
          
          Alert.alert(
            '❌ Error en Simulación', 
            `Ocurrió un error en el paso ${paso}: ${intervalError.message}\n\nRevisa la consola para más detalles.`
          );
        }
      }, pasoIntervalo);
      
      console.log('✅ Simulación iniciada correctamente');
      
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ERROR EN SIMULACIÓN');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Tipo:', error.name);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      Alert.alert(
        '❌ Error al Iniciar Simulación', 
        `${error.name}: ${error.message}\n\nRevisa la consola para más detalles.`,
        [{ text: 'OK' }]
      );
      setSimulando(false);
      simulandoRef.current = false;
    }
  };

  const finalizarSimulacion = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏁 FINALIZANDO SIMULACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      console.log('✅ Paso 1: Deteniendo estados de simulación');
      setSimulando(false);
      simulandoRef.current = false;
      setProgreso(1);
      
      console.log('✅ Paso 2: Moviendo camión a posición final');
      // Mover el camión a la posición final
      if (webViewRef.current) {
        try {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'updateProgress',
            progress: 1
          }));
          console.log('✅ Mensaje enviado al WebView');
        } catch (webViewError) {
          console.warn('⚠️ Error al enviar mensaje final al WebView:', webViewError);
        }
      }
      
      console.log('✅ Paso 3: Llamando API marcarEntregado para envío ID:', envioId);
      const resultado = await envioService.marcarEntregado(envioId);
      console.log('✅ Respuesta de API marcarEntregado:', resultado);
      
      console.log('✅ Paso 4: Mostrando alerta de éxito');
      
      // Usar setTimeout para asegurar que la alerta se muestra después de que todo esté estable
      setTimeout(() => {
        Alert.alert(
          '🎉 ¡Envío Entregado!',
          `Entrega completada en "${envio?.almacen_nombre}"\n\n✅ Estado: ENTREGADO`,
          [{ 
            text: 'Aceptar', 
            onPress: () => {
              try {
                console.log('✅ Usuario presionó Aceptar');
                console.log('✅ Navegando hacia atrás...');
                // No recargar datos aquí, la pantalla anterior se actualizará sola
                navigation.goBack();
                console.log('✅ Navegación completada');
              } catch (navError) {
                console.error('❌ Error al navegar:', navError);
                console.error('Stack:', navError.stack);
              }
            }
          }]
        );
        console.log('✅ Alerta mostrada correctamente');
      }, 300);
      
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ERROR AL FINALIZAR SIMULACIÓN');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Tipo:', error.name);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      Alert.alert(
        '❌ Error al Finalizar', 
        `No se pudo marcar como entregado: ${error.message}\n\nRevisa la consola.`,
        [{ text: 'OK' }]
      );
      setSimulando(false);
      simulandoRef.current = false;
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

  // HTML para Google Maps con ruta real y camión animado
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Función para enviar logs a React Native
        function logToReactNative(message) {
          try {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'log', message }));
          } catch(e) {
            console.log(message);
          }
        }
        
        // Override console para capturar errores
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          const errorMsg = 'Error: ' + msg + ' en ' + url + ':' + lineNo + ':' + columnNo;
          logToReactNative(errorMsg);
          return false;
        };
        
        let map, truckMarker, routePath = [];
        let isInitialized = false;
        
        function initMap() {
          try {
            logToReactNative('🗺️ Iniciando mapa...');
            const planta = { lat: ${PLANTA_COORDS.latitude}, lng: ${PLANTA_COORDS.longitude} };
            const almacen = { lat: ${destino.latitude}, lng: ${destino.longitude} };
            logToReactNative('Coordenadas - Planta: ' + JSON.stringify(planta) + ', Almacén: ' + JSON.stringify(almacen));
            
            logToReactNative('Creando mapa...');
            map = new google.maps.Map(document.getElementById('map'), {
              zoom: 13,
              center: planta,
              mapTypeId: 'roadmap',
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false
            });
            logToReactNative('✅ Mapa creado');
            
            // Marcador Planta
            logToReactNative('Agregando marcador Planta...');
            new google.maps.Marker({
              position: planta,
              map: map,
              label: '🏭',
              title: 'Planta Central'
            });
            logToReactNative('✅ Marcador Planta agregado');
            
            // Marcador Almacén
            logToReactNative('Agregando marcador Almacén...');
            new google.maps.Marker({
              position: almacen,
              map: map,
              label: '🎯',
              title: '${envio.almacen_nombre || 'Destino'}'
            });
            logToReactNative('✅ Marcador Almacén agregado');
            
            // Marcador del Camión
            logToReactNative('Agregando marcador Camión...');
            truckMarker = new google.maps.Marker({
              position: planta,
              map: map,
              label: '🚚',
              title: 'Camión en tránsito',
              zIndex: 1000
            });
            logToReactNative('✅ Marcador Camión agregado');
            
            // Ruta simple con línea
            logToReactNative('Configurando Directions Service...');
            const directionsService = new google.maps.DirectionsService();
            const directionsRenderer = new google.maps.DirectionsRenderer({
              map: map,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#9C27B0',
                strokeWeight: 4,
                strokeOpacity: 0.7
              }
            });
            logToReactNative('✅ Directions configurado');
            
            // Calcular ruta
            logToReactNative('Calculando ruta...');
            directionsService.route({
              origin: planta,
              destination: almacen,
              travelMode: 'DRIVING'
            }, function(result, status) {
              logToReactNative('Respuesta de Directions: ' + status);
              if (status === 'OK') {
                try {
                  directionsRenderer.setDirections(result);
                  const route = result.routes[0];
                  routePath = [];
                  for (let i = 0; i < route.overview_path.length; i++) {
                    routePath.push({
                      lat: route.overview_path[i].lat(),
                      lng: route.overview_path[i].lng()
                    });
                  }
                  isInitialized = true;
                  logToReactNative('✅ Ruta calculada con ' + routePath.length + ' puntos');
                } catch (e) {
                  logToReactNative('❌ Error procesando ruta: ' + e.message);
                }
              } else {
                logToReactNative('❌ Error calculando ruta: ' + status);
              }
            });
            
            // Ajustar vista
            logToReactNative('Ajustando vista del mapa...');
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(planta);
            bounds.extend(almacen);
            map.fitBounds(bounds);
            logToReactNative('✅ Mapa inicializado completamente');
            
          } catch (error) {
            const errorMsg = '❌ Error en initMap: ' + error.message;
            logToReactNative(errorMsg);
            document.getElementById('map').innerHTML = '<div style="padding: 20px; text-align: center; color: red;">Error: ' + error.message + '</div>';
          }
        }
        
        // Actualizar posición del camión
        let lastLoggedProgress = -1;
        function updateTruck(progress) {
          try {
            if (!isInitialized) {
              if (progress === 0) logToReactNative('⚠️ Mapa no inicializado aún');
              return;
            }
            if (!truckMarker) {
              if (progress === 0) logToReactNative('⚠️ Marcador de camión no existe');
              return;
            }
            if (routePath.length === 0) {
              if (progress === 0) logToReactNative('⚠️ Ruta vacía');
              return;
            }
            
            const index = Math.floor(progress * (routePath.length - 1));
            if (routePath[index]) {
              truckMarker.setPosition(routePath[index]);
              
              // Log solo cada 20% para no saturar
              const progressPercent = Math.floor(progress * 100);
              if (progressPercent % 20 === 0 && progressPercent !== lastLoggedProgress) {
                logToReactNative('🚚 Camión al ' + progressPercent + '% (pos ' + index + '/' + routePath.length + ')');
                lastLoggedProgress = progressPercent;
              }
            }
          } catch (e) {
            logToReactNative('❌ Error moviendo camión: ' + e.message);
          }
        }
        
        // Mensajes desde React Native
        let messageCount = 0;
        document.addEventListener('message', function(e) {
          try {
            const data = JSON.parse(e.data);
            // Log solo el primer mensaje para confirmar que funciona
            if (messageCount === 0) {
              logToReactNative('📨 Primer mensaje recibido (document), listener funcionando');
            }
            messageCount++;
            if (data.type === 'updateProgress') {
              updateTruck(data.progress);
            }
          } catch(err) {
            logToReactNative('❌ Error parseando mensaje (document): ' + err.message);
          }
        });
        
        window.addEventListener('message', function(e) {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'updateProgress') {
              updateTruck(data.progress);
            }
          } catch(err) {
            logToReactNative('❌ Error parseando mensaje (window): ' + err.message);
          }
        });
        
        logToReactNative('🎬 Script completamente cargado y listeners registrados');
      </script>
      <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0&callback=initMap"></script>
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
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                androidHardwareAccelerationDisabled={false}
                androidLayerType="hardware"
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('❌ Error en WebView:', nativeEvent);
                  Alert.alert('Error en Mapa', `No se pudo cargar el mapa: ${nativeEvent.description}`);
                }}
                onRenderProcessGone={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('💥 WebView proceso terminado:', nativeEvent);
                  Alert.alert(
                    'El mapa dejó de funcionar',
                    'El proceso del mapa se cerró inesperadamente. Esto puede ocurrir por falta de memoria.',
                    [
                      {
                        text: 'Continuar sin mapa',
                        onPress: () => {
                          // Continuar la simulación sin el mapa
                          console.log('Continuando sin WebView');
                        }
                      },
                      {
                        text: 'Volver',
                        onPress: () => {
                          if (intervaloRef.current) {
                            clearInterval(intervaloRef.current);
                          }
                          navigation.goBack();
                        }
                      }
                    ]
                  );
                }}
                onLoadEnd={() => {
                  console.log('✅ WebView cargado correctamente');
                }}
                onMessage={(event) => {
                  console.log('📨 Mensaje desde WebView:', event.nativeEvent.data);
                }}
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

// Exportar con ErrorBoundary
export default function TrackingScreen(props) {
  return (
    <ErrorBoundary>
      <TrackingScreenContent {...props} />
    </ErrorBoundary>
  );
}
