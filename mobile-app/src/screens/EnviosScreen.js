import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, Alert } from 'react-native';
import { Card, Text, Chip, FAB, Button, Searchbar, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function EnviosScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  const [envios, setEnvios] = useState([]);
  const [enviosFiltrados, setEnviosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const esTransportista = userInfo?.tipo === 'transportista' || userInfo?.rol_nombre === 'transportista';

  const cargarEnvios = async () => {
    try {
      setLoading(true);
      
      // Validar que userInfo existe
      if (!userInfo || !userInfo.id) {
        console.error('❌ [EnviosScreen] userInfo no válido:', userInfo);
        throw new Error('Sesión inválida. Por favor, inicia sesión nuevamente.');
      }
      
      console.log('[EnviosScreen] UserInfo completo:', JSON.stringify(userInfo, null, 2));
      console.log(`[EnviosScreen] Cargando envíos para ${esTransportista ? 'transportista' : 'almacén'} ID: ${userInfo.id}`);
      let data;
      
      if (esTransportista) {
        // Cargar envíos asignados al transportista
        console.log(`[EnviosScreen] Llamando getByTransportista(${userInfo.id})`);
        const response = await envioService.getByTransportista(userInfo.id);
        console.log('[EnviosScreen] Respuesta recibida:', JSON.stringify(response, null, 2));
        data = response?.success ? response.data : (response || []);
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
      console.error('❌ [EnviosScreen] Error.stack:', error?.stack);
      console.error('❌ [EnviosScreen] Error completo:', JSON.stringify(error, null, 2));
      setEnvios([]);
      setEnviosFiltrados([]);
      Alert.alert(
        '❌ Error al Cargar Envíos', 
        `No se pudieron cargar los envíos.\n\nDetalle: ${error?.message || 'Error desconocido'}\n\nVerifica tu conexión e intenta nuevamente.`,
        [{ text: 'Reintentar', onPress: () => cargarEnvios() }, { text: 'Cerrar' }]
      );
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
      cargarEnvios();
    }, [])
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
    // Validación de datos
    if (!item || !item.id) {
      console.warn('[EnviosScreen] Item inválido:', item);
      return null;
    }

    return (
      <Card style={styles.card} elevation={4}>
        <Card.Content>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.codigoContainer}>
              <Text variant="titleLarge" style={styles.codigo}>{item.codigo || 'Sin código'}</Text>
              <View style={styles.estadoRow}>
                <Icon 
                  name={getEstadoIcon(item.estado || 'pendiente')} 
                  size={18} 
                  color={getEstadoColor(item.estado || 'pendiente')} 
                />
                <Text style={[styles.estadoText, { color: getEstadoColor(item.estado || 'pendiente') }]}>
                  {getEstadoTexto(item.estado || 'pendiente').toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.qrIconContainer}>
              <Icon 
                name="file-document-outline" 
                size={28} 
                color="#4CAF50" 
                onPress={() => verDetalles(item.id)}
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
            
            <View style={styles.precioContainer}>
              <Text style={styles.precioLabel}>Total:</Text>
              <Text style={styles.precioValue}>${parseFloat(item.total_precio || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Botones de acción para TRANSPORTISTA */}
        {esTransportista && (
          <View style={styles.actionsContainer}>
            {item.estado === 'asignado' && (
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('EnvioDetalle', { envioId: item.id })}
                icon="file-document-outline"
                style={styles.actionButton}
                textColor="#2196F3"
              >
                Ver Detalles
              </Button>
            )}

            {(item.estado === 'aceptado' || item.estado === 'en_transito') && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => navigation.navigate('EnvioDetalle', { envioId: item.id })}
                  icon="file-document-outline"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  textColor="#2196F3"
                  compact
                >
                  Ver Detalles
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('Tracking', { envioId: item.id })}
                  icon="map-marker-path"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  buttonColor="#9C27B0"
                  compact
                >
                  Ver Ruta
                </Button>
              </View>
            )}

            {item.estado === 'entregado' && (
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => navigation.navigate('EnvioDetalle', { envioId: item.id })}
                  icon="file-document-outline"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  textColor="#2196F3"
                  compact
                >
                  Ver Detalles
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('Tracking', { envioId: item.id })}
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

        {/* Botones para ver detalles (usuarios no transportistas) */}
        {!esTransportista && (
          <View style={styles.twoButtonsRow}>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('EnvioDetalle', { envioId: item.id })}
              icon="file-document-outline"
              style={[styles.actionButton, { flex: 1, marginRight: 5, marginTop: 10 }]}
              compact
            >
              Ver Detalles
            </Button>
            {(item.estado === 'en_transito' || item.estado === 'entregado') && (
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('Tracking', { envioId: item.id })}
                icon="map-marker-path"
                style={[styles.actionButton, { flex: 1, marginLeft: 5, marginTop: 10 }]}
                buttonColor="#9C27B0"
                compact
              >
                Ver Ruta
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
            return item?.id?.toString() || `envio-${index}`;
          } catch (e) {
            console.error('[EnviosScreen] Error en keyExtractor:', e);
            return `fallback-${index}`;
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

