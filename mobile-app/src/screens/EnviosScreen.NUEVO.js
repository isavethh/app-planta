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

  const esTransportista = userInfo.tipo === 'transportista';

  const cargarEnvios = async () => {
    try {
      setLoading(true);
      let data;
      
      if (esTransportista) {
        // Cargar envíos asignados al transportista
        data = await envioService.getByTransportista(userInfo.id);
      } else {
        // Cargar envíos del almacén
        data = await envioService.getAll(userInfo.id);
      }
      
      setEnvios(data);
      aplicarFiltros(data, filtroEstado, searchQuery);
    } catch (error) {
      console.error('Error al cargar envíos:', error);
      Alert.alert('Error', 'No se pudieron cargar los envíos');
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

  const onRefresh = () => {
    setRefreshing(true);
    cargarEnvios();
  };

  const handleAceptarAsignacion = async (envioId) => {
    Alert.alert(
      'Aceptar Asignación',
      '¿Deseas aceptar este envío? Podrás iniciarlo cuando estés listo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            try {
              await envioService.aceptarAsignacion(envioId);
              Alert.alert('Éxito', 'Envío aceptado. Ya puedes iniciarlo.');
              cargarEnvios();
            } catch (error) {
              console.error('Error al aceptar:', error);
              Alert.alert('Error', 'No se pudo aceptar el envío');
            }
          },
        },
      ]
    );
  };

  const handleRechazarAsignacion = async (envioId) => {
    Alert.alert(
      'Rechazar Asignación',
      '¿Estás seguro de rechazar este envío?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await envioService.rechazarAsignacion(envioId, 'No disponible');
              Alert.alert('Rechazado', 'El envío fue rechazado.');
              cargarEnvios();
            } catch (error) {
              console.error('Error al rechazar:', error);
              Alert.alert('Error', 'No se pudo rechazar el envío');
            }
          },
        },
      ]
    );
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
              await envioService.iniciarEnvio(envioId);
              Alert.alert('Ruta Iniciada', 'El seguimiento en tiempo real está activo. ¡Buen viaje!');
              cargarEnvios();
            } catch (error) {
              console.error('Error al iniciar:', error);
              Alert.alert('Error', 'No se pudo iniciar la ruta');
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

  const verQR = (envioId) => {
    navigation.navigate('QRView', { envioId });
  };

  const renderEnvio = ({ item }) => (
    <Card style={styles.card} elevation={4}>
      <Card.Content>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.codigoContainer}>
            <Text variant="titleLarge" style={styles.codigo}>{item.codigo}</Text>
            <View style={styles.estadoRow}>
              <Icon 
                name={getEstadoIcon(item.estado)} 
                size={18} 
                color={getEstadoColor(item.estado)} 
              />
              <Text style={[styles.estadoText, { color: getEstadoColor(item.estado) }]}>
                {getEstadoTexto(item.estado).toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.qrIconContainer}>
            <Icon 
              name="qrcode-scan" 
              size={28} 
              color="#4CAF50" 
              onPress={() => verQR(item.id)}
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
              <View style={styles.twoButtonsRow}>
                <Button 
                  mode="contained" 
                  onPress={() => handleAceptarAsignacion(item.id)}
                  icon="check"
                  style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
                  buttonColor="#4CAF50"
                >
                  Aceptar
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => handleRechazarAsignacion(item.id)}
                  icon="close"
                  style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
                  textColor="#F44336"
                >
                  Rechazar
                </Button>
              </View>
            )}

            {item.estado === 'aceptado' && (
              <Button 
                mode="contained" 
                onPress={() => handleIniciarRuta(item.id)}
                icon="truck-fast"
                style={styles.actionButton}
                buttonColor="#9C27B0"
              >
                Iniciar Ruta
              </Button>
            )}

            {item.estado === 'en_transito' && (
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('Tracking', { envioId: item.id })}
                icon="map-marker-path"
                style={styles.actionButton}
                textColor="#9C27B0"
              >
                Ver Seguimiento
              </Button>
            )}
          </View>
        )}

        {/* Botón para ver detalles (todos los usuarios) */}
        {!esTransportista && (
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('QRView', { envioId: item.id })}
            icon="eye"
            style={[styles.actionButton, { marginTop: 10 }]}
          >
            Ver Detalles
          </Button>
        )}
      </Card.Content>
    </Card>
  );

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
          ...(esTransportista 
            ? [
                { value: 'asignado', label: 'Asignados' },
                { value: 'aceptado', label: 'Aceptados' },
                { value: 'en_transito', label: 'En Ruta' },
              ]
            : [
                { value: 'pendiente', label: 'Pendientes' },
                { value: 'en_transito', label: 'En Tránsito' },
                { value: 'entregado', label: 'Entregados' },
              ]
          ),
        ]}
        style={styles.segmentedButtons}
      />

      {/* Lista de envíos */}
      <FlatList
        data={enviosFiltrados}
        renderItem={renderEnvio}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
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




