import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import { Card, Text, Chip, FAB, Appbar, Switch, Searchbar, SegmentedButtons } from 'react-native-paper';
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
  const [disponible, setDisponible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const cargarEnvios = async () => {
    try {
      setLoading(true);
      // Obtener envíos del almacén logueado
      const data = await envioService.getAll(userInfo.id);
      setEnvios(data);
      aplicarFiltros(data, filtroEstado, searchQuery);
    } catch (error) {
      console.error('Error al cargar envíos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const aplicarFiltros = (enviosData, estado, busqueda) => {
    let filtrados = [...enviosData];

    // Filtrar por estado
    if (estado !== 'todos') {
      filtrados = filtrados.filter(e => e.estado_nombre === estado);
    }

    // Filtrar por búsqueda
    if (busqueda) {
      filtrados = filtrados.filter(e => 
        e.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.almacen_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.direccion_nombre?.toLowerCase().includes(busqueda.toLowerCase())
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

  const toggleDisponibilidad = async () => {
    setDisponible(!disponible);
    // Por ahora solo cambio visual, sin backend
  };

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

  const getEstadoIcon = (estado) => {
    const iconos = {
      'pendiente': 'clock-outline',
      'asignado': 'clipboard-check-outline',
      'en_transito': 'truck-fast',
      'entregado': 'check-circle',
      'cancelado': 'close-circle',
    };
    return iconos[estado] || 'help-circle';
  };

  const verQR = (envioId) => {
    navigation.navigate('QRView', { envioId });
  };

  const renderEnvio = ({ item }) => (
    <Card 
      style={styles.card}
      onPress={() => navigation.navigate('QRView', { envioId: item.id })}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.codigoContainer}>
            <Text variant="titleLarge" style={styles.codigo}>{item.codigo}</Text>
            <View style={styles.estadoRow}>
              <Icon name={getEstadoIcon(item.estado)} size={16} color={getEstadoColor(item.estado)} />
              <Text style={[styles.estadoText, { color: getEstadoColor(item.estado) }]}>
                {item.estado?.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.qrIconContainer}>
            <Icon name="qrcode" size={40} color="#4CAF50" />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Icon name="warehouse" size={20} color="#4CAF50" />
          <Text style={styles.infoText}>{item.almacen_nombre || 'Sin almacén'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="calendar" size={20} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.fecha_creacion).toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="package-variant" size={18} color="#666" />
              <Text style={styles.statText}>{item.total_cantidad || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="weight-kilogram" size={18} color="#666" />
              <Text style={styles.statText}>{parseFloat(item.total_peso || 0).toFixed(1)}kg</Text>
            </View>
            <View style={styles.precioContainer}>
              <Text style={styles.precioLabel}>Total:</Text>
              <Text style={styles.precioValue}>${parseFloat(item.total_precio || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={`Envíos - ${userInfo.nombre || 'Almacén'}`} />
        <Appbar.Action 
          icon="qrcode-scan" 
          onPress={() => navigation.navigate('QRScanner')} 
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Buscar envíos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <SegmentedButtons
          value={filtroEstado}
          onValueChange={setFiltroEstado}
          buttons={[
            { value: 'todos', label: 'Todos' },
            { value: 'asignado', label: 'Asignados' },
            { value: 'en_transito', label: 'En tránsito' },
            { value: 'entregado', label: 'Entregados' },
          ]}
          style={styles.segmentedButtons}
        />

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <Text>Cargando envíos...</Text>
          </View>
        ) : enviosFiltrados.length === 0 ? (
          <View style={styles.centerContainer}>
            <Icon name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay envíos para mostrar</Text>
          </View>
        ) : (
          <FlatList
            data={enviosFiltrados}
            renderItem={renderEnvio}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Botón flotante para escanear QR */}
      <FAB
        icon="qrcode-scan"
        style={styles.fab}
        onPress={() => navigation.navigate('QRScanner')}
        label="Escanear QR"
      />
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
  disponibilidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  disponibilidadText: {
    marginRight: 8,
    fontSize: 14,
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
    marginBottom: 10,
    borderRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  codigoContainer: {
    flex: 1,
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  estadoChip: {
    height: 28,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
});

