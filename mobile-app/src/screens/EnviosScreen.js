import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, Alert, StatusBar, Platform } from 'react-native';
import { Card, Text, Chip, FAB, Button, Searchbar, SegmentedButtons, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { envioService, rutasMultiService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function EnviosScreen({ navigation }) {
  console.log('🎬 [EnviosScreen] Componente iniciando...');
  
  const authContext = useContext(AuthContext);
  const userInfo = authContext?.userInfo;
  
  console.log('👤 [EnviosScreen] UserInfo recibido:', userInfo ? `ID: ${userInfo.id}` : 'NULL');
  
  const [envios, setEnvios] = useState([]);
  const [enviosFiltrados, setEnviosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const esTransportista = userInfo?.tipo === 'transportista' || userInfo?.rol_nombre === 'transportista';
  
  // Si no hay userInfo, mostrar pantalla de carga
  if (!userInfo) {
    console.log('⏳ [EnviosScreen] Esperando userInfo...');
    return (
      <View style={styles.container}>
        <Text>Cargando información de usuario...</Text>
      </View>
    );
  }

  const cargarEnvios = async () => {
    try {
      setLoading(true);
      
      // Validar que userInfo existe antes de hacer nada
      if (!userInfo) {
        console.warn('⚠️ [EnviosScreen] userInfo es null/undefined, esperando...');
        setLoading(false);
        return;
      }
      
      if (!userInfo.id) {
        console.error('❌ [EnviosScreen] userInfo.id faltante:', userInfo);
        setLoading(false);
        return;
      }
      
      console.log(`[EnviosScreen] Cargando envíos para ${esTransportista ? 'transportista' : 'almacén'} ID: ${userInfo.id}`);
      let data = [];
      
      // Cargar envíos (el timeout ya está configurado en api.js: 3 segundos)
      if (esTransportista) {
        // Cargar envíos asignados al transportista
        console.log(`[EnviosScreen] Llamando getByTransportista(${userInfo.id})`);
        data = await envioService.getByTransportista(userInfo.id);
        console.log('[EnviosScreen] Respuesta recibida:', typeof data);
        data = Array.isArray(data) ? data : (data?.data || data || []);
      } else {
        // Cargar envíos del almacén
        console.log(`[EnviosScreen] Llamando getAll(${userInfo.id})`);
        data = await envioService.getAll(userInfo.id);
      }
      
      console.log(`[EnviosScreen] Total envíos recibidos: ${Array.isArray(data) ? data.length : 0}`);
      const enviosArray = Array.isArray(data) ? data : [];
      setEnvios(enviosArray);
      aplicarFiltros(enviosArray, filtroEstado, searchQuery);
    } catch (error) {
      console.error('❌ [EnviosScreen] ERROR al cargar envíos:', error);
      console.error('❌ [EnviosScreen] Error.message:', error?.message);
      setEnvios([]);
      setEnviosFiltrados([]);
      // No mostrar alerta para evitar molestos popups
      console.warn('⚠️ [EnviosScreen] No se pudieron cargar envíos, mostrando lista vacía');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const aplicarFiltros = (enviosData, estado, busqueda) => {
    let filtrados = [...enviosData];

    // Filtrar por estado
    if (estado !== 'todos') {
      filtrados = filtrados.filter(e => e.estado === estado);
    }

    // Filtrar por búsqueda
    if (busqueda) {
      filtrados = filtrados.filter(e => 
        e.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.almacen_nombre?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    setEnviosFiltrados(filtrados);
  };

  useEffect(() => {
    aplicarFiltros(envios, filtroEstado, searchQuery);
  }, [filtroEstado, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (userInfo && userInfo.id) {
        cargarEnvios();
      }
    }, [userInfo])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarEnvios();
    setRefreshing(false);
  };

  const handleAceptarAsignacion = async (envioId) => {
    Alert.alert(
      'Aceptar Asignación',
      '¿Deseas aceptar este envío? Tu firma digital quedará registrada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar y Firmar',
          onPress: async () => {
            try {
              console.log(`[EnviosScreen] Aceptando envío ID: ${envioId}`);
              console.log(`[EnviosScreen] Transportista: ${userInfo.name} (${userInfo.email})`);
              const result = await envioService.aceptarAsignacion(envioId, {
                nombre: userInfo.name || 'Transportista',
                email: userInfo.email || 'sin@email.com'
              });
              console.log('[EnviosScreen] Envío aceptado con firma:', result);
              Alert.alert('✅ Éxito', 'Envío aceptado. Tu firma digital ha sido registrada. Ya puedes iniciar la ruta.');
              cargarEnvios();
            } catch (error) {
              console.error('❌ [EnviosScreen] Error al aceptar:', error);
              Alert.alert('❌ Error', `No se pudo aceptar el envío.\n\nDetalle: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleRechazarAsignacion = async (envioId) => {
    Alert.alert(
      '❌ Rechazar Asignación',
      'Selecciona el motivo del rechazo:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'No tengo disponibilidad',
          onPress: () => rechazarConMotivo(envioId, 'No tengo disponibilidad en este momento')
        },
        {
          text: 'Vehículo en mantenimiento',
          onPress: () => rechazarConMotivo(envioId, 'Mi vehículo está en mantenimiento')
        },
        {
          text: 'Otro motivo',
          onPress: () => rechazarConMotivo(envioId, 'Motivo personal - No puedo realizar este envío')
        },
      ],
      { cancelable: true }
    );
  };

  const rechazarConMotivo = async (envioId, motivo) => {
    try {
      console.log(`[EnviosScreen] Rechazando envío ID: ${envioId} - Motivo: ${motivo}`);
      await envioService.rechazarAsignacion(envioId, motivo);
      console.log('[EnviosScreen] Envío rechazado exitosamente');
      Alert.alert(
        '✅ Envío Rechazado', 
        'El envío fue rechazado y quedará registrado en tu historial. El administrador será notificado.'
      );
      cargarEnvios();
    } catch (error) {
      console.error('❌ [EnviosScreen] Error al rechazar:', error);
      Alert.alert('❌ Error', `No se pudo rechazar el envío.\n\nDetalle: ${error.message}`);
    }
  };

  // ========== FUNCIONES PARA RUTAS MULTI-ENTREGA ==========
  const handleAceptarRutaMultiple = async (rutaId) => {
    Alert.alert(
      '🛣️ Aceptar Ruta Multi-Entrega',
      '¿Deseas aceptar esta ruta con múltiples entregas? Se generarán las notas de venta para todos los envíos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar Ruta',
          onPress: async () => {
            try {
              console.log(`[EnviosScreen] Aceptando ruta multi-entrega ID: ${rutaId}`);
              const result = await rutasMultiService.aceptarRuta(rutaId, {
                nombre: userInfo.name || 'Transportista',
                email: userInfo.email || 'sin@email.com'
              });
              console.log('[EnviosScreen] Ruta aceptada:', result);
              Alert.alert(
                '✅ Ruta Aceptada', 
                `La ruta multi-entrega fue aceptada.\nTotal envíos: ${result.total_envios || 'N/A'}\nTotal paradas: ${result.total_paradas || 'N/A'}\n\n¡Ya puedes iniciar la ruta!`
              );
              cargarEnvios();
            } catch (error) {
              console.error('❌ [EnviosScreen] Error al aceptar ruta:', error);
              Alert.alert('❌ Error', `No se pudo aceptar la ruta.\n\nDetalle: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleRechazarRutaMultiple = async (rutaId) => {
    Alert.alert(
      '❌ Rechazar Ruta Multi-Entrega',
      'Selecciona el motivo del rechazo:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'No tengo disponibilidad',
          onPress: () => rechazarRutaConMotivo(rutaId, 'No tengo disponibilidad en este momento')
        },
        {
          text: 'Muchas paradas',
          onPress: () => rechazarRutaConMotivo(rutaId, 'La ruta tiene demasiadas paradas para mi vehículo')
        },
        {
          text: 'Vehículo en mantenimiento',
          onPress: () => rechazarRutaConMotivo(rutaId, 'Mi vehículo está en mantenimiento')
        },
        {
          text: 'Otro motivo',
          onPress: () => rechazarRutaConMotivo(rutaId, 'Motivo personal - No puedo realizar esta ruta')
        },
      ],
      { cancelable: true }
    );
  };

  const rechazarRutaConMotivo = async (rutaId, motivo) => {
    try {
      console.log(`[EnviosScreen] Rechazando ruta multi-entrega ID: ${rutaId} - Motivo: ${motivo}`);
      await rutasMultiService.rechazarRuta(rutaId, motivo);
      console.log('[EnviosScreen] Ruta rechazada exitosamente');
      Alert.alert(
        '✅ Ruta Rechazada', 
        'La ruta multi-entrega fue rechazada. El administrador será notificado para reasignarla.'
      );
      cargarEnvios();
    } catch (error) {
      console.error('❌ [EnviosScreen] Error al rechazar ruta:', error);
      Alert.alert('❌ Error', `No se pudo rechazar la ruta.\n\nDetalle: ${error.message}`);
    }
  };
  // =========================================================

  const handleIniciarRuta = async (envioId) => {
    Alert.alert(
      'Iniciar Ruta',
      '¿Iniciar el trayecto ahora? Se activará el seguimiento en tiempo real.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            try {
              console.log(`[EnviosScreen] Iniciando ruta para envío ID: ${envioId}`);
              const result = await envioService.iniciarEnvio(envioId);
              console.log('[EnviosScreen] Ruta iniciada:', result);
              Alert.alert('🚚 Ruta Iniciada', 'El seguimiento en tiempo real está activo. ¡Buen viaje!');
              cargarEnvios();
            } catch (error) {
              console.error('❌ [EnviosScreen] Error al iniciar ruta:', error);
              Alert.alert('❌ Error', `No se pudo iniciar la ruta.\n\nDetalle: ${error.message}`);
            }
          },
        },
      ]
    );
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

  const getEstadoIcon = (estado) => {
    const iconos = {
      'pendiente': 'clock-outline',
      'asignado': 'clipboard-check-outline',
      'aceptado': 'checkbox-marked-circle-outline',
      'en_transito': 'truck-fast',
      'entregado': 'check-circle',
      'cancelado': 'close-circle',
    };
    return iconos[estado] || 'help-circle';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      'pendiente': 'Pendiente',
      'asignado': 'Asignado',
      'aceptado': 'Aceptado',
      'en_transito': 'En Tránsito',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado',
    };
    return textos[estado] || estado;
  };

  const verDetalles = (envioId) => {
    navigation.navigate('EnvioDetalle', { envioId });
  };

  const renderEnvio = ({ item }) => {
    // Validación de datos - para rutas multi-entrega el ID puede venir como ruta_id
    const itemId = item?.id || item?.ruta_id;
    if (!item || !itemId) {
      console.warn('[EnviosScreen] Item inválido:', item);
      return null;
    }

    // Detectar si es una ruta multi-entrega (puede venir como es_multi_entrega o es_ruta_multiple)
    const esRutaMultiple = item.es_multi_entrega === true || item.es_ruta_multiple === true || item.tipo === 'RUTA_MULTIPLE' || item.codigo?.startsWith('RUTA-');
    const totalEnviosRuta = item.total_envios_ruta || item.total_envios || 0;
    
    // Detectar si es asignación múltiple (no es ruta multi-entrega, pero fue asignado junto con otros envíos)
    const esAsignacionMultiple = !esRutaMultiple && (item.es_asignacion_multiple === true || item.tipo_asignacion === 'multiple');
    const totalEnviosAsignacion = item.total_envios_asignacion || 0;

    // Debug para ver qué está llegando
    if (esRutaMultiple) {
      console.log('🛣️ [EnviosScreen] Ruta Multi-Entrega detectada:', {
        id: itemId,
        codigo: item.codigo,
        estado: item.estado,
        es_multi_entrega: item.es_multi_entrega,
        total_envios: totalEnviosRuta,
        esTransportista: esTransportista,
        userTipo: userInfo?.tipo,
        userRolNombre: userInfo?.rol_nombre
      });
    }

    return (
      <Card style={[
        styles.card, 
        esRutaMultiple && styles.cardMultiEntrega,
        esAsignacionMultiple && styles.cardAsignacionMultiple
      ]} elevation={4}>
        <Card.Content>
          {/* Badge de Multi-Entrega */}
          {esRutaMultiple && (
            <View style={styles.multiEntregaBadge}>
              <Icon name="routes" size={18} color="#FFF" />
              <Text style={styles.multiEntregaText}>
                🛣️ RUTA MULTI-ENTREGA ({totalEnviosRuta} envíos)
              </Text>
            </View>
          )}
          
          {/* Badge de Asignación Múltiple */}
          {esAsignacionMultiple && (
            <View style={styles.asignacionMultipleBadge}>
              <Icon name="truck-delivery" size={18} color="#FFF" />
              <Text style={styles.asignacionMultipleText}>
                📦 ASIGNACIÓN MÚLTIPLE ({totalEnviosAsignacion} envíos)
              </Text>
            </View>
          )}

          {/* DEBUG: Mostrar si es transportista para ver por qué no aparecen botones */}
          {esRutaMultiple && !esTransportista && (
            <View style={{backgroundColor: '#FFEBEE', padding: 8, borderRadius: 4, marginBottom: 8}}>
              <Text style={{color: '#C62828', fontSize: 12}}>
                ⚠️ DEBUG: esTransportista={String(esTransportista)} | tipo={userInfo?.tipo} | rol={userInfo?.rol_nombre}
              </Text>
            </View>
          )}

          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.codigoContainer}>
              <Text variant="titleLarge" style={[
                styles.codigo, 
                esRutaMultiple && styles.codigoMulti,
                esAsignacionMultiple && styles.codigoAsignacionMultiple
              ]}>
                {item.codigo || 'Sin código'}
              </Text>
              <View style={styles.estadoRow}>
                <Icon 
                  name={
                    esRutaMultiple ? 'truck-delivery' : 
                    esAsignacionMultiple ? 'truck-delivery' : 
                    getEstadoIcon(item.estado || 'pendiente')
                  } 
                  size={18} 
                  color={
                    esRutaMultiple ? '#7B1FA2' : 
                    esAsignacionMultiple ? '#FF9800' : 
                    getEstadoColor(item.estado || 'pendiente')
                  } 
                />
                <Text style={[
                  styles.estadoText, 
                  { 
                    color: esRutaMultiple ? '#7B1FA2' : 
                           esAsignacionMultiple ? '#FF9800' : 
                           getEstadoColor(item.estado || 'pendiente') 
                  }
                ]}>
                  {esRutaMultiple 
                    ? (item.estado === 'programada' ? 'PENDIENTE ACEPTAR' : item.estado?.toUpperCase())
                    : esAsignacionMultiple
                    ? 'ASIGNACIÓN MÚLTIPLE'
                    : getEstadoTexto(item.estado || 'pendiente').toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={[
              styles.qrIconContainer, 
              esRutaMultiple && styles.qrIconMulti,
              esAsignacionMultiple && styles.qrIconAsignacionMultiple
            ]}>
              <Icon 
                name={
                  esRutaMultiple ? "map-marker-multiple" : 
                  esAsignacionMultiple ? "truck-delivery" : 
                  "file-document-outline"
                } 
                size={28} 
                color={
                  esRutaMultiple ? "#7B1FA2" : 
                  esAsignacionMultiple ? "#FF9800" : 
                  "#4CAF50"
                } 
                onPress={() => esRutaMultiple 
                  ? navigation.navigate('RutaMultiDetalle', { rutaId: itemId })
                  : verDetalles(itemId)}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Info del envío */}
          <View style={styles.infoRow}>
            <Icon name="warehouse" size={20} color="#666" />
            <Text style={styles.infoText}>{item.almacen_nombre || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="calendar" size={20} color="#666" />
            <Text style={styles.infoText}>
            {item.fecha_estimada_entrega ? new Date(item.fecha_estimada_entrega).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        {/* Info adicional para rutas multi-entrega */}
        {esRutaMultiple && (
          <>
            <View style={styles.infoRow}>
              <Icon name="map-marker-path" size={20} color="#7B1FA2" />
              <Text style={[styles.infoText, {color: '#7B1FA2', fontWeight: '600'}]}>
                {item.total_paradas || totalEnviosRuta} paradas en esta ruta
              </Text>
            </View>
            {item.distancia_total_km && (
              <View style={styles.infoRow}>
                <Icon name="road-variant" size={20} color="#7B1FA2" />
                <Text style={[styles.infoText, {color: '#7B1FA2'}]}>
                  Distancia estimada: {parseFloat(item.distancia_total_km).toFixed(1)} km
                </Text>
              </View>
            )}
          </>
        )}
        
        {/* Info adicional para asignación múltiple */}
        {esAsignacionMultiple && (
          <View style={styles.infoRow}>
            <Icon name="truck-multiple" size={20} color="#FF9800" />
            <Text style={[styles.infoText, {color: '#FF9800', fontWeight: '600'}]}>
              Este envío fue asignado junto con {totalEnviosAsignacion - 1} otro(s) envío(s) al mismo vehículo
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Footer con stats */}
        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="package-variant" size={18} color="#666" />
              <Text style={styles.statText}>{item.total_cantidad || 0}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="weight" size={18} color="#666" />
              <Text style={styles.statText}>{parseFloat(item.total_peso || 0).toFixed(2)}kg</Text>
            </View>
            
            <View style={[
              styles.precioContainer, 
              esRutaMultiple && styles.precioMulti,
              esAsignacionMultiple && styles.precioAsignacionMultiple
            ]}>
              <Text style={[
                styles.precioLabel, 
                esRutaMultiple && {color: '#7B1FA2'},
                esAsignacionMultiple && {color: '#FF9800'}
              ]}>Total:</Text>
              <Text style={[
                styles.precioValue, 
                esRutaMultiple && {color: '#7B1FA2'},
                esAsignacionMultiple && {color: '#FF9800'}
              ]}>
                Bs {parseFloat(item.total_precio || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Botones de acción para TRANSPORTISTA */}
        {esTransportista && (
          <View style={styles.actionsContainer}>
            {/* Botones para RUTA MULTI-ENTREGA */}
            {esRutaMultiple && (item.estado === 'programada' || item.estado === 'asignado') && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="contained" 
                  onPress={() => handleAceptarRutaMultiple(itemId)}
                  icon="check-circle"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  buttonColor="#7B1FA2"
                  compact
                >
                  Aceptar Ruta
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => handleRechazarRutaMultiple(itemId)}
                  icon="close-circle"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  textColor="#F44336"
                  compact
                >
                  Rechazar
                </Button>
              </View>
            )}

            {esRutaMultiple && item.estado === 'aceptada' && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => navigation.navigate('RutaMultiDetalle', { rutaId: itemId })}
                  icon="map-marker-multiple"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  textColor="#7B1FA2"
                  compact
                >
                  Ver Paradas
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('ChecklistSalida', { rutaId: itemId })}
                  icon="clipboard-check"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  buttonColor="#4CAF50"
                  compact
                >
                  Checklist Salida
                </Button>
              </View>
            )}

            {esRutaMultiple && (item.estado === 'en_transito' || item.estado === 'en_progreso') && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => navigation.navigate('RutaMultiDetalle', { rutaId: itemId })}
                  icon="map-marker-multiple"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  textColor="#7B1FA2"
                  compact
                >
                  Ver Paradas
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('RutaMultiEntrega', { rutaId: itemId })}
                  icon="navigation"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  buttonColor="#9C27B0"
                  compact
                >
                  Seguimiento
                </Button>
              </View>
            )}

            {/* Botones para ENVÍO NORMAL (no multi-entrega) */}
            {!esRutaMultiple && item.estado === 'asignado' && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="contained" 
                  onPress={() => handleAceptarAsignacion(itemId)}
                  icon="check-circle"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  buttonColor="#4CAF50"
                  compact
                >
                  Aceptar
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => handleRechazarAsignacion(itemId)}
                  icon="close-circle"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  textColor="#F44336"
                  compact
                >
                  Rechazar
                </Button>
              </View>
            )}

            {!esRutaMultiple && (item.estado === 'aceptado' || item.estado === 'en_transito') && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => navigation.navigate('EnvioDetalle', { envioId: itemId })}
                  icon="file-document-outline"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  textColor="#2196F3"
                  compact
                >
                  Ver Detalles
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('Tracking', { envioId: itemId })}
                  icon="map-marker-path"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  buttonColor="#9C27B0"
                  compact
                >
                  Ver Ruta
                </Button>
              </View>
            )}

            {!esRutaMultiple && item.estado === 'entregado' && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => navigation.navigate('EnvioDetalle', { envioId: itemId })}
                  icon="file-document-outline"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  textColor="#2196F3"
                  compact
                >
                  Ver Detalles
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('Tracking', { envioId: itemId })}
                  icon="map-check"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  buttonColor="#4CAF50"
                  compact
                >
                  Ver Ruta
                </Button>
              </View>
            )}
          </View>
        )}

        {/* BOTONES PARA RUTA MULTI-ENTREGA - SIEMPRE VISIBLES SI NO ES TRANSPORTISTA DETECTADO */}
        {!esTransportista && esRutaMultiple && (item.estado === 'programada' || item.estado === 'asignado') && (
          <View style={styles.actionsContainer}>
            <View style={styles.twoButtonsRow}>
              <Button 
                mode="contained" 
                onPress={() => handleAceptarRutaMultiple(itemId)}
                icon="check-circle"
                style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                buttonColor="#7B1FA2"
                compact
              >
                Aceptar Ruta
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => handleRechazarRutaMultiple(itemId)}
                icon="close-circle"
                style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                textColor="#F44336"
                compact
              >
                Rechazar
              </Button>
            </View>
          </View>
        )}

        {/* Botones para ver detalles (usuarios no transportistas - ALMACÉN) */}
        {!esTransportista && (
          <View style={styles.actionsContainer}>
            <View style={styles.twoButtonsRow}>
              <Button 
                mode="outlined" 
                onPress={() => esRutaMultiple 
                  ? navigation.navigate('RutaMultiDetalle', { rutaId: itemId })
                  : navigation.navigate('EnvioDetalle', { envioId: itemId })}
                icon={esRutaMultiple ? "map-marker-multiple" : "file-document-outline"}
                style={[styles.actionButton, { flex: 1, marginRight: 5, marginTop: 10 }]}
                compact
              >
                {esRutaMultiple ? 'Ver Paradas' : 'Ver Detalles'}
              </Button>
              {(item.estado === 'en_transito' || item.estado === 'entregado' || item.estado === 'en_progreso') && (
                <Button 
                  mode="contained" 
                  onPress={() => esRutaMultiple 
                    ? navigation.navigate('RutaMultiTracking', { rutaId: itemId })
                    : navigation.navigate('Tracking', { envioId: itemId })}
                  icon="map-marker-path"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5, marginTop: 10 }]}
                  buttonColor={esRutaMultiple ? "#7B1FA2" : "#9C27B0"}
                  compact
                >
                  Ver Ruta
                </Button>
              )}
            </View>
            
            {/* Botón para reportar incidente en pedidos entregados */}
            {!esRutaMultiple && item.estado === 'entregado' && (
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('ReportarIncidente', { 
                  envioId: itemId, 
                  envioCode: item.codigo 
                })}
                icon="alert-circle"
                style={[styles.actionButton, { marginTop: 8 }]}
                textColor="#F44336"
                compact
              >
                Reportar un Incidente
              </Button>
            )}
          </View>
        )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <Searchbar
        placeholder="Buscar por código o almacén"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Filtros por estado */}
      <SegmentedButtons
        value={filtroEstado}
        onValueChange={setFiltroEstado}
        buttons={[
          { value: 'todos', label: 'Todos' },
          { value: 'asignado', label: 'Asignados' },
          { value: 'entregado', label: 'Entregados' },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Lista de envíos */}
      <FlatList
        data={enviosFiltrados || []}
        renderItem={renderEnvio}
        keyExtractor={(item, index) => {
          try {
            // Generar key único combinando tipo, id e índice
            const tipo = item?.ruta_id ? 'ruta' : 'envio';
            const itemId = item?.id || item?.ruta_id || index;
            return `${tipo}-${itemId}-${index}`;
          } catch (e) {
            console.error('[EnviosScreen] Error en keyExtractor:', e);
            return `fallback-${Date.now()}-${index}`;
          }
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Icon name="inbox" size={60} color="#999" />
            <Text style={styles.emptyText}>
              {loading ? 'Cargando envíos...' : 'No hay envíos disponibles'}
            </Text>
          </View>
        }
        onError={(error) => {
          console.error('[EnviosScreen] Error en FlatList:', error);
        }}
      />

      {/* FAB para escanear QR */}
      <FAB
        icon="qrcode-scan"
        style={styles.fab}
        onPress={() => navigation.navigate('QRScanner')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: STATUSBAR_HEIGHT,
  },
  searchbar: {
    margin: 10,
    elevation: 2,
  },
  segmentedButtons: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  listContent: {
    padding: 10,
  },
  card: {
    marginBottom: 15,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: 'white',
  },
  cardMultiEntrega: {
    borderWidth: 2,
    borderColor: '#7B1FA2',
    backgroundColor: '#FDFAFF',
  },
  cardAsignacionMultiple: {
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  multiEntregaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B1FA2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  multiEntregaText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  asignacionMultipleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  asignacionMultipleText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  codigoContainer: {
    flex: 1,
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  codigoMulti: {
    color: '#7B1FA2',
  },
  codigoAsignacionMultiple: {
    color: '#FF9800',
  },
  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estadoText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 13,
  },
  qrIconContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 10,
  },
  qrIconMulti: {
    backgroundColor: '#F3E5F5',
  },
  qrIconAsignacionMultiple: {
    backgroundColor: '#FFF3E0',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  precioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  precioMulti: {
    backgroundColor: '#F3E5F5',
  },
  precioAsignacionMultiple: {
    backgroundColor: '#FFF3E0',
  },
  precioLabel: {
    fontSize: 13,
    color: '#2E7D32',
    marginRight: 5,
  },
  precioValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionsContainer: {
    marginTop: 15,
  },
  twoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    marginTop: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100,
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
});

