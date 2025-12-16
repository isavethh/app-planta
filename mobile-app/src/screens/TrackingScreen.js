import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, Dimensions, StatusBar, Platform, TouchableOpacity } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip, Surface, Checkbox, Modal, Portal, TextInput } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { envioService, rutasMultiService } from '../services/api';
import socketService from '../services/socket';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import SignatureCanvas from 'react-native-signature-canvas';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAIwhMeAvxLiKqRu3KMtwN1iT1jJBtioG0';
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

// Template de checklist de salida
const CHECKLIST_ITEMS = [
  { id: 'documentos_carga', label: 'Documentos de carga completos', categoria: 'documentos' },
  { id: 'guias_remision', label: 'Guías de remisión disponibles', categoria: 'documentos' },
  { id: 'carga_verificada', label: 'Carga verificada y contada', categoria: 'carga' },
  { id: 'carga_asegurada', label: 'Carga asegurada correctamente', categoria: 'carga' },
  { id: 'embalaje_correcto', label: 'Embalaje en buen estado', categoria: 'carga' },
  { id: 'combustible_ok', label: 'Combustible suficiente', categoria: 'vehiculo' },
  { id: 'llantas_ok', label: 'Llantas en buen estado', categoria: 'vehiculo' },
  { id: 'luces_ok', label: 'Luces funcionando', categoria: 'vehiculo' },
  { id: 'frenos_ok', label: 'Frenos funcionando', categoria: 'vehiculo' },
  { id: 'documentos_vehiculo', label: 'Documentos del vehículo', categoria: 'vehiculo' },
  { id: 'licencia_conductor', label: 'Licencia de conducir vigente', categoria: 'conductor' },
  { id: 'epp_completo', label: 'EPP completo (si aplica)', categoria: 'conductor' },
];

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
  const [checklistModalVisible, setChecklistModalVisible] = useState(false);
  const [checklistData, setChecklistData] = useState({});
  const [checklistCompletado, setChecklistCompletado] = useState(false);
  const [checklistFotos, setChecklistFotos] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);
  const [firma, setFirma] = useState(null);
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const signatureRef = useRef(null);
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  const simulandoRef = useRef(false); // Ref para evitar stale closure
  // Estados para modal de incidente
  const [incidenteModalVisible, setIncidenteModalVisible] = useState(false);
  const [tipoIncidente, setTipoIncidente] = useState('');
  const [descripcionIncidente, setDescripcionIncidente] = useState('');
  const [accionIncidente, setAccionIncidente] = useState('continuar'); // 'cancelar' o 'continuar'
  const [fotoIncidente, setFotoIncidente] = useState(null);
  const [reportandoIncidente, setReportandoIncidente] = useState(false);

  // Inicializar checklist
  useEffect(() => {
    const initialData = {};
    CHECKLIST_ITEMS.forEach(item => {
      initialData[item.id] = false;
    });
    setChecklistData(initialData);
  }, []);

  // Verificar si checklist está completo
  useEffect(() => {
    const itemsMarcados = Object.values(checklistData).filter(v => v === true).length;
    setChecklistCompletado(itemsMarcados === CHECKLIST_ITEMS.length);
  }, [checklistData]);

  // Manejar firma
  const handleOK = (signature) => {
    setFirma(signature);
    setMostrarFirma(false);
    console.log('[TrackingScreen] Firma capturada');
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const handleEmpty = () => {
    Alert.alert('Firma requerida', 'Por favor, firma el checklist antes de continuar');
  };

  useEffect(() => {
    cargarDatos();
    
    // Conectar socket con delay para evitar errores
    const socketTimer = setTimeout(() => {
      conectarSocket();
    }, 500);
    
    return () => {
      clearTimeout(socketTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        socketService.off('posicion-actualizada');
        socketService.off('simulacion-iniciada');
        socketService.off('envio-completado');
      } catch (e) {
        console.warn('[TrackingScreen] Error limpiando listeners:', e);
      }
    };
  }, []);

  const conectarSocket = () => {
    try {
      socketService.connect();
      
      // Esperar un momento para que se conecte
      setTimeout(() => {
        setSocketConectado(socketService.isConnected());
        
        // Unirse a la sala del envío
        if (envioId) {
          socketService.joinEnvio(envioId);
        }
        
        // Escuchar actualizaciones de posición
        socketService.onPosicionActualizada((data) => {
          try {
            if (data && data.envioId == envioId) {
              console.log(`📍 [Socket] Recibido posición: ${Math.round((data.progreso || 0) * 100)}%`);
            }
          } catch (e) {
            console.warn('[Socket] Error procesando posición:', e);
          }
        });
        
        // Escuchar cuando otra instancia inicia simulación
        socketService.onSimulacionIniciada((data) => {
          try {
            if (data && data.envioId == envioId && !simulandoRef.current) {
              console.log(`🚚 [Socket] Simulación iniciada remotamente`);
              if (data.rutaPuntos && data.rutaPuntos.length > 0) {
                const puntos = data.rutaPuntos.map(p => ({
                  latitude: p.latitude || p.lat || 0,
                  longitude: p.longitude || p.lng || 0
                }));
                setRutaReal(puntos);
                animarCamionSincronizado(puntos, 60000);
              }
            }
          } catch (e) {
            console.warn('[Socket] Error procesando simulación:', e);
          }
        });
        
        console.log('✅ [TrackingScreen] Socket configurado');
      }, 1000);
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
      
      const response = await envioService.getById(envioId);
      
      // La API devuelve {success: true, data: {...}, estado: ..., estado_nombre: ...}
      const data = response?.data || response;
      
      // Validar datos recibidos
      if (!data || !data.id) {
        throw new Error('Datos del envío inválidos');
      }
      
      // Normalizar estado_nombre - usar el que viene de la API o el del objeto data
      if (!data.estado_nombre && response?.estado_nombre) {
        data.estado_nombre = response.estado_nombre;
      }
      if (data.estado && !data.estado_nombre) {
        data.estado_nombre = data.estado;
      }
      
      // Asegurar que estado esté presente
      if (!data.estado && response?.estado) {
        data.estado = response.estado;
      }
      
      // Asegurar que las coordenadas sean números válidos - usar múltiples campos posibles
      data.origen_latitud = parseFloat(data.origen_latitud || data.origen_lat || data.almacenDestino?.latitud) || -17.7833;
      data.origen_longitud = parseFloat(data.origen_longitud || data.origen_lng || data.almacenDestino?.longitud) || -63.1821;
      data.destino_latitud = parseFloat(data.destino_latitud || data.latitud || data.almacenDestino?.latitud) || -17.7892;
      data.destino_longitud = parseFloat(data.destino_longitud || data.longitud || data.almacenDestino?.longitud) || -63.1751;
      
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

  // Interpolar puntos adicionales entre dos puntos para suavizar la ruta
  const interpolarPuntos = (p1, p2, numPuntos = 5) => {
    const puntos = [];
    for (let i = 0; i <= numPuntos; i++) {
      const t = i / numPuntos;
      puntos.push({
        latitude: p1.latitude + (p2.latitude - p1.latitude) * t,
        longitude: p1.longitude + (p2.longitude - p1.longitude) * t,
      });
    }
    return puntos;
  };

  // Suavizar ruta agregando puntos intermedios
  const suavizarRuta = (puntos, densidad = 10) => {
    if (puntos.length < 2) return puntos;
    
    const puntosSuavizados = [puntos[0]]; // Primer punto
    
    for (let i = 0; i < puntos.length - 1; i++) {
      const p1 = puntos[i];
      const p2 = puntos[i + 1];
      
      // Calcular distancia entre puntos (en grados)
      const distancia = Math.sqrt(
        Math.pow(p2.latitude - p1.latitude, 2) + 
        Math.pow(p2.longitude - p1.longitude, 2)
      );
      
      // Si la distancia es grande, agregar más puntos intermedios
      // Aproximadamente 1 grado = 111 km, así que multiplicamos por 111000 para obtener metros
      const distanciaMetros = distancia * 111000;
      // Agregar más puntos: 1 punto cada 20 metros (más denso)
      const numPuntosIntermedios = Math.max(3, Math.min(densidad, Math.floor(distanciaMetros / 20)));
      
      const puntosIntermedios = interpolarPuntos(p1, p2, numPuntosIntermedios);
      // Agregar puntos intermedios (sin el primero que ya está)
      puntosSuavizados.push(...puntosIntermedios.slice(1));
    }
    
    console.log(`[TrackingScreen] 🔄 Ruta suavizada: ${puntos.length} puntos originales -> ${puntosSuavizados.length} puntos suavizados`);
    return puntosSuavizados;
  };

  const obtenerRutaReal = async (origen, destino) => {
    try {
      // PRIMERO: Intentar con Google Directions API (más preciso y suave)
      console.log('[TrackingScreen] Intentando obtener ruta desde Google Directions API...');
      
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen.latitude},${origen.longitude}&destination=${destino.latitude},${destino.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
        const googleResponse = await fetch(googleUrl);
        const googleData = await googleResponse.json();
        
        if (googleData.status === 'OK' && googleData.routes && googleData.routes.length > 0) {
          const route = googleData.routes[0];
          let allPoints = [];
          
          // Obtener puntos de todos los steps
          if (route.legs && route.legs.length > 0) {
            route.legs.forEach(leg => {
              if (leg.steps && leg.steps.length > 0) {
                leg.steps.forEach(step => {
                  if (step.start_location) {
                    allPoints.push({
                      latitude: step.start_location.lat,
                      longitude: step.start_location.lng,
                    });
                  }
                  if (step.end_location) {
                    allPoints.push({
                      latitude: step.end_location.lat,
                      longitude: step.end_location.lng,
                    });
                  }
                });
              }
            });
          }
          
          // Si hay overview_polyline, decodificarlo para más puntos
          if (route.overview_polyline && route.overview_polyline.points) {
            const decodedPoints = decodePolyline(route.overview_polyline.points);
            if (decodedPoints && decodedPoints.length > allPoints.length) {
              // Asegurar que los puntos decodificados tengan el formato correcto
              const formattedPoints = decodedPoints.map(p => ({
                latitude: typeof p.latitude === 'number' ? p.latitude : p.lat,
                longitude: typeof p.longitude === 'number' ? p.longitude : p.lng
              })).filter(p => p.latitude && p.longitude);
              if (formattedPoints.length > allPoints.length) {
                allPoints = formattedPoints;
              }
            }
          }
          
          // Eliminar duplicados consecutivos
          const uniquePoints = [];
          let lastPoint = null;
          allPoints.forEach(point => {
            if (!lastPoint || 
                Math.abs(point.latitude - lastPoint.latitude) > 0.0001 || 
                Math.abs(point.longitude - lastPoint.longitude) > 0.0001) {
              uniquePoints.push(point);
              lastPoint = point;
            }
          });
          
          // Suavizar la ruta agregando puntos intermedios
          const puntosSuavizados = suavizarRuta(uniquePoints, 5);
          
          console.log(`[TrackingScreen] ✅ Ruta obtenida de Google: ${uniquePoints.length} puntos originales, ${puntosSuavizados.length} puntos suavizados`);
          
          // Información estimada
          if (route.legs && route.legs[0]) {
            setDistanciaTotal(route.legs[0].distance.text);
            setDuracionTotal(route.legs[0].duration.text);
          }
          
          return puntosSuavizados;
        }
      } catch (googleError) {
        console.warn('[TrackingScreen] Google Directions falló, intentando OSRM...', googleError.message);
      }
      
      // FALLBACK: Usar OSRM (Open Source Routing Machine) - GRATIS y sin API key
      console.log('[TrackingScreen] Obteniendo ruta desde OSRM...');
      
      // OSRM usa formato [lng, lat] para las coordenadas
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origen.longitude},${origen.latitude};${destino.longitude},${destino.latitude}?overview=full&geometries=geojson&steps=true&alternatives=false`;
      
      const response = await fetch(osrmUrl);
      const osrmData = await response.json();
      
      if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
        const osrmRoute = osrmData.routes[0];
        const coordinates = osrmRoute.geometry.coordinates;
        
        if (!coordinates || coordinates.length === 0) {
          console.error('[TrackingScreen] OSRM devolvió ruta sin coordenadas');
          return [];
        }
        
        // Convertir coordenadas GeoJSON [lng, lat] a formato {latitude, longitude}
        const points = coordinates
          .map(coord => {
            if (Array.isArray(coord) && coord.length >= 2 && 
                typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
                !isNaN(coord[0]) && !isNaN(coord[1]) &&
                coord[0] !== 0 && coord[1] !== 0) {
              return {
                latitude: coord[1],
                longitude: coord[0]
              };
            }
            return null;
          })
          .filter(p => p !== null);
        
        console.log(`[TrackingScreen] ✅ Ruta obtenida de OSRM: ${points.length} puntos válidos (de ${coordinates.length} coordenadas)`);
        
        // SUAVIZAR la ruta agregando puntos intermedios (aumentar densidad a 10)
        const puntosSuavizados = suavizarRuta(points, 10);
        
        console.log(`[TrackingScreen] ✅ Ruta suavizada: ${puntosSuavizados.length} puntos (de ${points.length} originales)`);
        
        // Información estimada
        if (osrmRoute.distance && osrmRoute.duration) {
          const distKm = (osrmRoute.distance / 1000).toFixed(1);
          const durMin = Math.round(osrmRoute.duration / 60);
          setDistanciaTotal(`${distKm} km`);
          setDuracionTotal(`~${durMin} min`);
          console.log(`[TrackingScreen] 📊 Distancia: ${distKm} km, Duración: ~${durMin} min`);
        }
        
        if (puntosSuavizados.length === 0) {
          console.error('[TrackingScreen] No se pudieron convertir coordenadas de OSRM');
          return [];
        }
        
        return puntosSuavizados;
      } else {
        const errorMsg = osrmData.code || osrmData.message || 'unknown';
        console.error('[TrackingScreen] Error en OSRM:', errorMsg);
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

  // Funciones para manejar checklist
  const toggleItem = (itemId) => {
    setChecklistData(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const tomarFotoParaItem = async (itemId) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de cámara para tomar fotos de evidencia');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const fotoBase64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setChecklistFotos(prev => ({
          ...prev,
          [itemId]: fotoBase64
        }));

        // Guardar evidencia en backend
        try {
          await rutasMultiService.guardarEvidenciaBase64({
            envio_id: envioId,
            item_id: itemId,
            tipo: 'checklist_salida',
            nombre: `Evidencia ${CHECKLIST_ITEMS.find(i => i.id === itemId)?.label || itemId}`,
            base64: result.assets[0].base64
          });
        } catch (error) {
          console.warn('[TrackingScreen] Error guardando evidencia:', error);
        }
      }
    } catch (error) {
      console.error('[TrackingScreen] Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const guardarChecklistEIniciar = async () => {
    try {
      // Validar que la firma esté presente
      if (!firma) {
        Alert.alert(
          '⚠️ Firma Requerida',
          'Debes firmar el checklist antes de iniciar el envío.',
          [{ text: 'Entendido' }]
        );
        return;
      }

      setGuardandoChecklist(true);

      // Preparar datos del checklist
      const datos = {
        ...checklistData,
        observaciones,
        verificado_por: 'Transportista',
        fecha_hora: new Date().toISOString(),
      };

      // Guardar checklist con firma
      console.log('[TrackingScreen] Guardando checklist con firma...');
      await rutasMultiService.guardarChecklist(null, {
        envio_id: envioId,
        tipo: 'salida',
        datos,
        firma_base64: firma
      });

      console.log('[TrackingScreen] ✅ Checklist guardado con firma');
      setChecklistModalVisible(false);
      setGuardandoChecklist(false);

      // Ahora iniciar la simulación
      iniciarSimulacionReal();
    } catch (error) {
      console.error('[TrackingScreen] Error guardando checklist:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el checklist');
      setGuardandoChecklist(false);
    }
  };

  const iniciarSimulacionReal = async () => {
    try {
      console.log('[TrackingScreen] Iniciando simulación...');
      setSimulando(true);
      simulandoRef.current = true;

      // Validar que tenemos datos del envío
      if (!envio) {
        Alert.alert('⚠️ Error', 'No hay datos del envío');
        setSimulando(false);
        simulandoRef.current = false;
        return;
      }

      // SIEMPRE obtener ruta real de OSRM/Google (NO usar puntos del backend que pueden ser línea recta)
      console.log('[TrackingScreen] Obteniendo ruta real que sigue calles (OSRM/Google)...');
      
      const origen = {
        latitude: parseFloat(envio.origen_latitud) || parseFloat(envio.origen_lat) || -17.7833,
        longitude: parseFloat(envio.origen_longitud) || parseFloat(envio.origen_lng) || -63.1821,
      };
      const destino = {
        latitude: parseFloat(envio.destino_latitud) || parseFloat(envio.latitud) || -17.7892,
        longitude: parseFloat(envio.destino_longitud) || parseFloat(envio.longitud) || -63.1751,
      };
      
      console.log(`[TrackingScreen] Origen: (${origen.latitude}, ${origen.longitude})`);
      console.log(`[TrackingScreen] Destino: (${destino.latitude}, ${destino.longitude})`);
      
      // Obtener ruta real de OSRM/Google (sigue calles reales, NO línea recta)
      console.log('[TrackingScreen] 🔄 Llamando a obtenerRutaReal...');
      let puntosBackend = await obtenerRutaReal(origen, destino);
      
      console.log(`[TrackingScreen] 📊 Puntos obtenidos: ${puntosBackend.length}`);
      
      // Validar que tenemos suficientes puntos (más de 50 para una ruta real)
      if (puntosBackend.length < 50) {
        console.warn(`[TrackingScreen] ⚠️ Ruta tiene pocos puntos (${puntosBackend.length}), esto puede verse como línea recta`);
        console.warn(`[TrackingScreen] 🔄 Intentando obtener más puntos...`);
        
        // Intentar una vez más con más densidad
        puntosBackend = await obtenerRutaReal(origen, destino);
        console.log(`[TrackingScreen] 📊 Segunda intento: ${puntosBackend.length} puntos`);
      }
      
      if (puntosBackend.length === 0) {
        console.error('[TrackingScreen] ❌ No se pudo obtener ruta real');
        Alert.alert('⚠️ Error', 'No se pudo obtener la ruta. Verifica tu conexión a internet.');
        setSimulando(false);
        simulandoRef.current = false;
        return;
      } else if (puntosBackend.length < 50) {
        console.warn(`[TrackingScreen] ⚠️ Solo ${puntosBackend.length} puntos - la ruta puede verse como línea recta`);
        console.warn(`[TrackingScreen] 💡 Esto puede deberse a que OSRM no está devolviendo suficientes puntos`);
      } else {
        console.log(`[TrackingScreen] ✅ Ruta real obtenida: ${puntosBackend.length} puntos (sigue calles reales)`);
      }
      
      // Llamar al backend para iniciar la simulación (pero NO usar sus puntos)
      try {
        await envioService.simularMovimiento(envioId);
        console.log('[TrackingScreen] ✅ Simulación iniciada en backend');
      } catch (backendError) {
        console.warn('[TrackingScreen] ⚠️ Error iniciando simulación en backend:', backendError.message);
      }

      // Validar que tenemos suficientes puntos para una ruta real (no línea recta)
      if (puntosBackend.length === 0) {
        Alert.alert('⚠️ Error', 'No se pudo obtener una ruta válida. Intenta nuevamente.');
        setSimulando(false);
        simulandoRef.current = false;
        return;
      }
      
      if (puntosBackend.length < 3) {
        console.warn(`[TrackingScreen] ⚠️ Solo ${puntosBackend.length} puntos - puede verse como línea recta`);
      } else {
        console.log(`[TrackingScreen] ✅ Ruta configurada con ${puntosBackend.length} puntos - debería seguir calles reales`);
      }
      
      setRutaReal(puntosBackend);
      setIndicePuntoActual(0);

      // Ajustar mapa para mostrar toda la ruta
      if (mapRef.current && puntosBackend.length > 0) {
        try {
          // Usar fitToCoordinates con todos los puntos para que se vea la ruta completa
          mapRef.current.fitToCoordinates(puntosBackend, {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
          console.log(`[TrackingScreen] ✅ Mapa ajustado para mostrar ${puntosBackend.length} puntos de ruta`);
        } catch (e) {
          console.warn('[TrackingScreen] Error ajustando mapa:', e);
        }
      }

      const duracionMs = 60000; // 1 minuto

      // ENVIAR por WebSocket para sincronizar con Laravel
      try {
        socketService.iniciarSimulacion(envioId, puntosBackend);
        console.log('[TrackingScreen] 📡 Simulación enviada por WebSocket');
      } catch (socketError) {
        console.warn('[TrackingScreen] ⚠️ No se pudo enviar por WebSocket:', socketError);
      }

      // Animar el camión siguiendo la ruta
      animarCamionRutaReal(puntosBackend, duracionMs);
    } catch (error) {
      console.error('❌ [TrackingScreen] Error en simulación:', error);
      Alert.alert('❌ Error', `No se pudo iniciar la simulación.\n\nDetalle: ${error?.message || 'Error desconocido'}`);
      setSimulando(false);
      simulandoRef.current = false;
    }
  };

  const handleIniciarSimulacion = () => {
    // PRIMERO: Mostrar checklist si no está completo
    if (!checklistCompletado) {
      setChecklistModalVisible(true);
      return;
    }

    // Si está completo, iniciar directamente
    iniciarSimulacionReal();
  };

  // Calcular distancia entre dos puntos (fórmula Haversine simplificada)
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Crear ruta interpolada cuando Google Directions falla
  const crearRutaInterpolada = (origen, destino, numPuntos) => {
    const puntos = [];
    for (let i = 0; i <= numPuntos; i++) {
      const t = i / numPuntos;
      puntos.push({
        latitude: origen.latitude + (destino.latitude - origen.latitude) * t,
        longitude: origen.longitude + (destino.longitude - origen.longitude) * t,
      });
    }
    return puntos;
  };

  // Animación sincronizada cuando se recibe de otro cliente
  const animarCamionSincronizado = (puntos, duracionMs) => {
    if (!puntos || puntos.length === 0) return;
    
    setSimulando(true);
    simulandoRef.current = true;
    setIndicePuntoActual(0);
    
    const intervaloMs = duracionMs / puntos.length;
    let indice = 0;
    
    intervalRef.current = setInterval(() => {
      if (indice >= puntos.length - 1) {
        clearInterval(intervalRef.current);
        setSimulando(false);
        simulandoRef.current = false;
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
      simulandoRef.current = false;
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
          simulandoRef.current = false;
          setIndicePuntoActual(puntos.length - 1);
          
          // Notificar por socket que terminó (con try-catch)
          try {
            socketService.completarEnvio(envioId);
          } catch (e) {
            console.warn('[TrackingScreen] Error notificando completado:', e);
          }
          
          // Auto-marcar como entregado
          marcarComoEntregado();
          return;
        }

        setIndicePuntoActual(indice);
        
        // Enviar posición por WebSocket para sincronizar con Laravel y la web
        const punto = puntos[indice];
        if (punto && punto.latitude && punto.longitude) {
          const progreso = indice / puntos.length;
          try {
            // Asegurar que el socket esté conectado antes de enviar
            if (!socketService.isConnected()) {
              socketService.connect();
              // Esperar un poco para que se conecte
              setTimeout(() => {
                socketService.enviarPosicion(envioId, { latitude: punto.latitude, longitude: punto.longitude }, progreso);
              }, 500);
            } else {
              socketService.enviarPosicion(envioId, { latitude: punto.latitude, longitude: punto.longitude }, progreso);
            }
            console.log(`[TrackingScreen] 📡 Posición enviada: ${Math.round(progreso * 100)}%`);
          } catch (e) {
            console.warn('[TrackingScreen] ⚠️ Error enviando posición:', e);
          }
        }

        // Centrar mapa en el punto actual
        if (mapRef.current && punto) {
          try {
            mapRef.current.animateToRegion({
              latitude: punto.latitude,
              longitude: punto.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, Math.min(intervaloMs * 0.8, 500));
          } catch (e) {
            // Ignorar errores de animación del mapa
          }
        }

        indice++;
      } catch (error) {
        console.error('[TrackingScreen] Error en animación:', error);
        clearInterval(intervalRef.current);
        setSimulando(false);
        simulandoRef.current = false;
      }
    }, intervaloMs);
  };

  const marcarComoEntregado = async () => {
    try {
      console.log('[TrackingScreen] Marcando envío como entregado...');
      
      // Mostrar indicador de carga
      setLoading(true);
      
      const resultado = await envioService.marcarEntregado(envioId);
      
      setLoading(false);
      
      if (resultado?.success) {
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
      } else {
        throw new Error(resultado?.error || resultado?.message || 'Error desconocido');
      }
    } catch (error) {
      setLoading(false);
      console.error('❌ [TrackingScreen] Error al marcar como entregado:', error);
      
      let mensajeError = error.message || 'Error desconocido';
      
      // Mensajes más amigables para errores comunes
      if (mensajeError.includes('Network') || mensajeError.includes('conectar')) {
        mensajeError = 'No se puede conectar al servidor.\n\nVerifica:\n• Laravel corriendo en 0.0.0.0:8001\n• Misma red WiFi\n• Firewall puerto 8001 abierto';
      } else if (mensajeError.includes('Timeout') || mensajeError.includes('timeout')) {
        mensajeError = 'El servidor no respondió a tiempo.\n\nIntenta nuevamente o verifica tu conexión.';
      }
      
      Alert.alert('❌ Error', `No se pudo marcar como entregado.\n\n${mensajeError}`);
    }
  };

  const tomarFotoIncidente = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de cámara para tomar foto del incidente');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFotoIncidente(result.assets[0].base64);
      }
    } catch (error) {
      console.error('[TrackingScreen] Error tomando foto de incidente:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const reportarIncidente = async () => {
    if (!tipoIncidente.trim() || !descripcionIncidente.trim()) {
      Alert.alert('⚠️ Campos Requeridos', 'Por favor completa el tipo y descripción del incidente');
      return;
    }

    try {
      setReportandoIncidente(true);

      // Obtener ubicación actual si está disponible
      let ubicacionLat = null;
      let ubicacionLng = null;
      if (rutaReal.length > 0 && indicePuntoActual < rutaReal.length) {
        const puntoActual = rutaReal[indicePuntoActual];
        ubicacionLat = puntoActual.latitude;
        ubicacionLng = puntoActual.longitude;
      }

      const datos = {
        tipo_incidente: tipoIncidente,
        descripcion: descripcionIncidente,
        accion: accionIncidente,
        foto_base64: null, // Imágenes deshabilitadas
        ubicacion_lat: ubicacionLat,
        ubicacion_lng: ubicacionLng,
      };

      const resultado = await envioService.reportarIncidente(envioId, datos);

      if (resultado?.success) {
        Alert.alert(
          '✅ Incidente Reportado',
          accionIncidente === 'cancelar'
            ? 'El incidente ha sido reportado y el envío ha sido cancelado. Se notificó al administrador y al almacén.'
            : 'El incidente ha sido reportado pero el envío continúa. Se notificó al administrador y al almacén.',
          [
            {
              text: 'OK',
              onPress: () => {
                setIncidenteModalVisible(false);
                setTipoIncidente('');
                setDescripcionIncidente('');
                setAccionIncidente('continuar');
                setFotoIncidente(null);
                // Si se canceló, volver atrás
                if (accionIncidente === 'cancelar') {
                  navigation.goBack();
                } else {
                  cargarDatos();
                }
              }
            }
          ]
        );
      } else {
        throw new Error(resultado?.error || resultado?.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ [TrackingScreen] Error al reportar incidente:', error);
      Alert.alert('❌ Error', `No se pudo reportar el incidente.\n\n${error.message || 'Error desconocido'}`);
    } finally {
      setReportandoIncidente(false);
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

            {/* Ruta completa (gris claro) - RUTA REAL POR CALLES - SUAVIZADA */}
            {rutaReal.length > 0 && (
              <Polyline
                coordinates={rutaReal}
                strokeColor="#BDBDBD"
                strokeWidth={7}
                lineCap="round"
                lineJoin="round"
                miterLimit={10}
                geodesic={false}
                tappable={false}
                lineDashPattern={[1]}
              />
            )}

            {/* Ruta recorrida (verde) - PARTE COMPLETADA - SUAVIZADA */}
            {rutaRecorrida.length > 1 && (
              <Polyline
                coordinates={rutaRecorrida}
                strokeColor="#4CAF50"
                strokeWidth={8}
                lineCap="round"
                lineJoin="round"
                miterLimit={10}
                geodesic={false}
                tappable={false}
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
                La simulación usa la misma ruta que ve el panel web y mostrará el recorrido del camión en tiempo real.
              </Text>
            </>
          ) : simulando ? (
            <>
              <View style={styles.simulandoBox}>
                <ActivityIndicator size={48} color="#4CAF50" />
                <Text variant="titleLarge" style={styles.simulandoText}>
                  🚚 Camión en Ruta
                </Text>
                <Text variant="bodyLarge" style={styles.simulandoSubtext}>
                  Siguiendo ruta real de Google Maps
                </Text>
              </View>
              {/* Botón Reportar Incidente - Cuando está simulando (en ruta) */}
              <Button
                mode="outlined"
                icon="alert-circle"
                onPress={() => {
                  // Detener la simulación cuando se abre el modal
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                  }
                  setSimulando(false);
                  simulandoRef.current = false;
                  setIncidenteModalVisible(true);
                }}
                style={[styles.button, styles.incidenteButton]}
                contentStyle={styles.buttonContent}
                labelStyle={[styles.buttonLabel, { color: '#F44336' }]}
                buttonColor="#FFF"
                textColor="#F44336"
              >
                Reportar Incidente
              </Button>
            </>
          ) : (
            <>
              <View style={styles.completadoBox}>
                <Icon name="map-check" size={48} color="#4CAF50" />
                <Text variant="titleMedium" style={styles.completadoText}>
                  Simulación Completada
                </Text>
              </View>
              {/* Botón Reportar Incidente - También cuando la simulación terminó pero sigue en tránsito */}
              {envio.estado === 'en_transito' && (
                <Button
                  mode="outlined"
                  icon="alert-circle"
                  onPress={() => setIncidenteModalVisible(true)}
                  style={[styles.button, styles.incidenteButton]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: '#F44336' }]}
                  buttonColor="#FFF"
                  textColor="#F44336"
                >
                  Reportar Incidente
                </Button>
              )}
            </>
          )}
        </Surface>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal de Checklist */}
      <Portal>
        <Modal
          visible={checklistModalVisible}
          onDismiss={() => setChecklistModalVisible(false)}
          contentContainerStyle={styles.checklistModalContainer}
          dismissable={true}
        >
          <View style={styles.checklistModalInner}>
            <ScrollView 
              style={styles.checklistModalContent}
              contentContainerStyle={styles.checklistModalScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
            <View style={styles.checklistModalHeader}>
              <Icon name="clipboard-check" size={32} color="#4CAF50" />
              <Text variant="headlineSmall" style={styles.checklistModalTitle}>
                Checklist de Salida
              </Text>
              <Text variant="bodySmall" style={styles.checklistModalSubtitle}>
                Verifica cada punto antes de iniciar el envío
              </Text>
            </View>

            {/* Progreso */}
            <View style={styles.checklistProgresoContainer}>
              <View style={styles.checklistProgresoBar}>
                <View style={[styles.checklistProgresoFill, { 
                  width: `${Math.round((Object.values(checklistData).filter(v => v === true).length / CHECKLIST_ITEMS.length) * 100)}%` 
                }]} />
              </View>
              <Text variant="bodySmall" style={styles.checklistProgresoText}>
                {Object.values(checklistData).filter(v => v === true).length} de {CHECKLIST_ITEMS.length} verificados
              </Text>
            </View>

            {/* Items del checklist */}
            {CHECKLIST_ITEMS.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.checklistItem,
                  !checklistData[item.id] && styles.checklistItemNoMarcado
                ]}
                onPress={() => toggleItem(item.id)}
                activeOpacity={0.7}
              >
                <Checkbox
                  status={checklistData[item.id] ? 'checked' : 'unchecked'}
                  onPress={() => toggleItem(item.id)}
                  color="#4CAF50"
                />
                <Text style={[
                  styles.checklistItemLabel,
                  checklistData[item.id] && styles.checklistItemLabelChecked
                ]}>
                  {item.label}
                </Text>
                {!checklistData[item.id] && (
                  <TouchableOpacity
                    onPress={() => tomarFotoParaItem(item.id)}
                    style={styles.fotoBtn}
                  >
                    <Icon name="camera" size={20} color="#FF9800" />
                  </TouchableOpacity>
                )}
                {checklistData[item.id] && (
                  <Icon name="check-circle" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}

            {/* Observaciones */}
            <TextInput
              mode="outlined"
              label="Observaciones (opcional)"
              placeholder="Escribe cualquier observación adicional..."
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={3}
              style={styles.checklistObservaciones}
            />

            {/* Sección de Firma */}
            <View style={styles.checklistFirmaSection}>
              <Text variant="titleSmall" style={styles.checklistFirmaTitle}>
                Firma del Transportista
              </Text>
              {!firma ? (
                <>
                  <Button
                    mode="outlined"
                    icon="pencil"
                    onPress={() => setMostrarFirma(true)}
                    style={styles.checklistFirmaBtn}
                  >
                    Firmar Checklist
                  </Button>
                </>
              ) : (
                <View style={styles.checklistFirmaPreview}>
                  <Text variant="bodySmall" style={styles.checklistFirmaTexto}>
                    ✓ Firma registrada
                  </Text>
                  <Button
                    mode="text"
                    icon="pencil"
                    onPress={() => {
                      setFirma(null);
                      setMostrarFirma(true);
                    }}
                    style={styles.checklistFirmaCambiarBtn}
                  >
                    Cambiar Firma
                  </Button>
                </View>
              )}
            </View>

            {/* Botones */}
            <View style={styles.checklistModalBotones}>
              <Button
                mode="outlined"
                onPress={() => setChecklistModalVisible(false)}
                style={styles.checklistCancelarBtn}
                contentStyle={styles.checklistButtonContent}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                icon="check-circle"
                onPress={guardarChecklistEIniciar}
                style={styles.checklistConfirmarBtn}
                buttonColor="#4CAF50"
                loading={guardandoChecklist}
                disabled={guardandoChecklist || !checklistCompletado || !firma}
                contentStyle={styles.checklistButtonContent}
              >
                {guardandoChecklist ? 'Guardando...' : 'Confirmar e Iniciar'}
              </Button>
            </View>
            </ScrollView>
          </View>
        </Modal>
      </Portal>

        {/* Modal de Firma */}
        <Portal>
          <Modal
            visible={mostrarFirma}
            onDismiss={() => setMostrarFirma(false)}
            contentContainerStyle={styles.firmaModalContainer}
          >
            <View style={styles.firmaModalInner}>
              <View style={styles.firmaModalHeader}>
                <Text variant="headlineSmall" style={styles.firmaModalTitle}>
                  Firma del Transportista
                </Text>
                <Text variant="bodySmall" style={styles.firmaModalSubtitle}>
                  Firma en el área de abajo para confirmar el checklist
                </Text>
              </View>
              
              <View style={styles.firmaCanvasContainer}>
                <SignatureCanvas
                  ref={signatureRef}
                  onOK={handleOK}
                  onEmpty={handleEmpty}
                  descriptionText="Firma aquí"
                  clearText="Limpiar"
                  confirmText="Confirmar"
                  webStyle={`
                    .m-signature-pad {
                      box-shadow: none;
                      border: 2px solid #ddd;
                      border-radius: 8px;
                    }
                    .m-signature-pad--body {
                      border: none;
                    }
                    .m-signature-pad--body canvas {
                      border-radius: 8px;
                    }
                  `}
                  androidStyle={{
                    backgroundColor: 'white',
                    borderWidth: 2,
                    borderColor: '#ddd',
                    borderRadius: 8,
                  }}
                />
              </View>

              <View style={styles.firmaModalBotones}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setMostrarFirma(false);
                    handleClear();
                  }}
                  style={styles.firmaCancelarBtn}
                >
                  Cancelar
                </Button>
                <Button
                  mode="outlined"
                  icon="eraser"
                  onPress={handleClear}
                  style={styles.firmaLimpiarBtn}
                >
                  Limpiar
                </Button>
                <Button
                  mode="contained"
                  icon="check"
                  onPress={handleConfirm}
                  style={styles.firmaConfirmarBtn}
                  buttonColor="#4CAF50"
                >
                  Confirmar
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>

        {/* Modal de Reportar Incidente */}
        <Portal>
          <Modal
            visible={incidenteModalVisible}
            onDismiss={() => {
              setIncidenteModalVisible(false);
              // Limpiar campos al cerrar
              setTipoIncidente('');
              setDescripcionIncidente('');
              setAccionIncidente('continuar');
              setFotoIncidente(null);
            }}
            contentContainerStyle={styles.incidenteModalContainer}
            dismissable={true}
          >
          <View style={styles.incidenteModalInner}>
              <ScrollView 
                style={styles.incidenteModalContent}
                contentContainerStyle={styles.incidenteModalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.incidenteModalHeader}>
                  <Icon name="alert-circle" size={32} color="#F44336" />
                  <Text variant="headlineSmall" style={styles.incidenteModalTitle}>
                    Reportar Incidente
                  </Text>
                  <Text variant="bodySmall" style={styles.incidenteModalSubtitle}>
                    Reporta cualquier incidente durante el trayecto
                  </Text>
                </View>

                {/* Tipo de Incidente */}
                <TextInput
                  mode="outlined"
                  label="Tipo de Incidente *"
                  placeholder="Ej: Accidente, Avería, Robo, etc."
                  value={tipoIncidente}
                  onChangeText={setTipoIncidente}
                  style={styles.incidenteInput}
                />

                {/* Descripción */}
                <TextInput
                  mode="outlined"
                  label="Descripción del Incidente *"
                  placeholder="Describe detalladamente lo que ocurrió..."
                  value={descripcionIncidente}
                  onChangeText={setDescripcionIncidente}
                  multiline
                  numberOfLines={4}
                  style={styles.incidenteInput}
                />


                {/* Acción */}
                <View style={styles.incidenteAccionSection}>
                  <Text variant="titleSmall" style={styles.incidenteAccionTitle}>
                    ¿Qué deseas hacer? *
                  </Text>
                  <View style={styles.incidenteAccionButtons}>
                    <Button
                      mode={accionIncidente === 'continuar' ? 'contained' : 'outlined'}
                      icon="arrow-right-circle"
                      onPress={() => setAccionIncidente('continuar')}
                      style={styles.incidenteAccionBtn}
                      buttonColor={accionIncidente === 'continuar' ? '#4CAF50' : undefined}
                    >
                      Continuar Envío
                    </Button>
                    <Button
                      mode={accionIncidente === 'cancelar' ? 'contained' : 'outlined'}
                      icon="cancel"
                      onPress={() => setAccionIncidente('cancelar')}
                      style={styles.incidenteAccionBtn}
                      buttonColor={accionIncidente === 'cancelar' ? '#F44336' : undefined}
                    >
                      Cancelar Envío
                    </Button>
                  </View>
                  <Text variant="bodySmall" style={styles.incidenteAccionHint}>
                    {accionIncidente === 'continuar'
                      ? 'El envío continuará pero se registrará el incidente'
                      : 'El envío será cancelado y se notificará al almacén'}
                  </Text>
                </View>

                {/* Botones */}
                <View style={styles.incidenteModalBotones}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setIncidenteModalVisible(false);
                      setTipoIncidente('');
                      setDescripcionIncidente('');
                      setAccionIncidente('continuar');
                      setFotoIncidente(null);
                    }}
                    style={styles.incidenteCancelarBtn}
                    contentStyle={styles.incidenteButtonContent}
                    disabled={reportandoIncidente}
                  >
                    Cancelar
                  </Button>
                  <Button
                    mode="contained"
                    icon="alert-circle"
                    onPress={reportarIncidente}
                    style={styles.incidenteConfirmarBtn}
                    buttonColor="#F44336"
                    loading={reportandoIncidente}
                    disabled={reportandoIncidente || !tipoIncidente.trim() || !descripcionIncidente.trim()}
                    contentStyle={styles.incidenteButtonContent}
                  >
                    {reportandoIncidente ? 'Reportando...' : 'Reportar Incidente'}
                  </Button>
                </View>
              </ScrollView>
            </View>
          </Modal>
        </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: STATUSBAR_HEIGHT,
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
  checklistModalWrapper: {
    margin: 0,
  },
  checklistModalContainer: {
    backgroundColor: 'white',
    margin: 0,
    borderRadius: 0,
    height: '100%',
    width: '100%',
    alignSelf: 'center',
  },
  checklistModalInner: {
    flex: 1,
    backgroundColor: 'white',
  },
  checklistModalContent: {
    flex: 1,
  },
  checklistModalScrollContent: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 20,
    flexGrow: 1,
  },
  checklistModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checklistModalTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  checklistModalSubtitle: {
    color: '#666',
    marginTop: 5,
  },
  checklistProgresoContainer: {
    marginBottom: 20,
  },
  checklistProgresoBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  checklistProgresoFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  checklistProgresoText: {
    textAlign: 'center',
    color: '#666',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    minHeight: 50,
  },
  checklistItemNoMarcado: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  checklistItemLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    flexWrap: 'wrap',
  },
  checklistItemLabelChecked: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  fotoBtn: {
    marginLeft: 8,
    padding: 4,
  },
  checklistObservaciones: {
    marginTop: 10,
    marginBottom: 10,
    minHeight: 80,
  },
  checklistModalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    gap: 10,
  },
  checklistCancelarBtn: {
    flex: 1,
  },
  checklistConfirmarBtn: {
    flex: 1,
  },
  checklistButtonContent: {
    paddingVertical: 8,
    minHeight: 48,
  },
  checklistFirmaSection: {
    marginTop: 20,
    marginBottom: 10,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  checklistFirmaTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  checklistFirmaBtn: {
    marginTop: 5,
  },
  checklistFirmaPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  checklistFirmaTexto: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  checklistFirmaCambiarBtn: {
    marginLeft: 10,
  },
  firmaModalContainer: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 12,
    maxHeight: '90%',
    width: '95%',
    alignSelf: 'center',
  },
  firmaModalInner: {
    padding: 20,
  },
  firmaModalHeader: {
    marginBottom: 20,
  },
  firmaModalTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  firmaModalSubtitle: {
    color: '#666',
  },
  firmaCanvasContainer: {
    height: 300,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  firmaModalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  firmaCancelarBtn: {
    flex: 1,
  },
  firmaLimpiarBtn: {
    flex: 1,
  },
  firmaConfirmarBtn: {
    flex: 1,
  },
  incidenteButton: {
    marginTop: 12,
    borderColor: '#F44336',
  },
  incidenteModalContainer: {
    backgroundColor: 'white',
    margin: 0,
    borderRadius: 0,
    height: '100%',
    width: '100%',
    alignSelf: 'center',
    padding: 0,
  },
  incidenteModalInner: {
    flex: 1,
    backgroundColor: 'white',
  },
  incidenteModalContent: {
    flex: 1,
  },
  incidenteModalScrollContent: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  incidenteModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  incidenteModalTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  incidenteModalSubtitle: {
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  incidenteInput: {
    marginBottom: 15,
  },
  incidenteFotoSection: {
    marginTop: 10,
    marginBottom: 15,
  },
  incidenteFotoTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  incidenteFotoBtn: {
    marginTop: 5,
  },
  incidenteFotoPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  incidenteFotoTexto: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  incidenteFotoCambiarBtn: {
    marginLeft: 10,
  },
  incidenteAccionSection: {
    marginTop: 10,
    marginBottom: 15,
  },
  incidenteAccionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  incidenteAccionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  incidenteAccionBtn: {
    flex: 1,
  },
  incidenteAccionHint: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  incidenteModalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    gap: 10,
  },
  incidenteCancelarBtn: {
    flex: 1,
  },
  incidenteConfirmarBtn: {
    flex: 1,
  },
  incidenteButtonContent: {
    paddingVertical: 8,
    minHeight: 48,
  },
});
