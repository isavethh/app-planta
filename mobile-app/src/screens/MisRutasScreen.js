import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  Button,
  SegmentedButtons,
  Searchbar,
  FAB,
  Badge,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../context/AuthContext';
import { rutasMultiService } from '../services/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function MisRutasScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  
  const [rutas, setRutas] = useState([]);
  const [rutasFiltradas, setRutasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('activas');
  const [searchQuery, setSearchQuery] = useState('');

  const cargarRutas = async () => {
    try {
      if (!userInfo?.id) {
        console.warn('[MisRutasScreen] userInfo.id no disponible');
        setLoading(false);
        return;
      }

      console.log(`[MisRutasScreen] Cargando rutas para transportista ID: ${userInfo.id}`);
      const response = await rutasMultiService.listarPorTransportista(userInfo.id);
      
      if (response.success) {
        console.log(`[MisRutasScreen] Rutas cargadas: ${response.rutas.length}`);
        setRutas(response.rutas || []);
        aplicarFiltros(response.rutas || [], filtroEstado, searchQuery);
      } else {
        console.warn('[MisRutasScreen] Error en respuesta:', response.message);
        setRutas([]);
        setRutasFiltradas([]);
      }
    } catch (error) {
      console.error('[MisRutasScreen] Error:', error);
      setRutas([]);
      setRutasFiltradas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const aplicarFiltros = (rutasData, estado, busqueda) => {
    let filtradas = [...rutasData];

    // Filtrar por estado
    if (estado === 'activas') {
      filtradas = filtradas.filter(r => 
        ['programada', 'en_transito'].includes(r.estado)
      );
    } else if (estado === 'completadas') {
      filtradas = filtradas.filter(r => r.estado === 'completada');
    }
    // 'todas' no filtra

    // Filtrar por búsqueda
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      filtradas = filtradas.filter(r => 
        r.codigo?.toLowerCase().includes(busquedaLower) ||
        r.vehiculo_placa?.toLowerCase().includes(busquedaLower)
      );
    }

    setRutasFiltradas(filtradas);
  };

  useEffect(() => {
    aplicarFiltros(rutas, filtroEstado, searchQuery);
  }, [filtroEstado, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (userInfo?.id) {
        cargarRutas();
      }
    }, [userInfo])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarRutas();
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'programada': '#FF9800',
      'en_transito': '#2196F3',
      'completada': '#4CAF50',
      'cancelada': '#F44336',
    };
    return colores[estado] || '#757575';
  };

  const getEstadoIcon = (estado) => {
    const iconos = {
      'programada': 'calendar-clock',
      'en_transito': 'truck-fast',
      'completada': 'check-circle',
      'cancelada': 'close-circle',
    };
    return iconos[estado] || 'help-circle';
  };

  const calcularProgreso = (ruta) => {
    if (!ruta.paradas_completadas || !ruta.total_paradas) return 0;
    return (ruta.paradas_completadas / ruta.total_paradas) * 100;
  };

  const renderRuta = ({ item: ruta }) => {
    const progreso = calcularProgreso(ruta);
    
    return (
      <Card 
        style={styles.card} 
        elevation={3}
        onPress={() => navigation.navigate('RutaMultiEntrega', { rutaId: ruta.id })}
      >
        <Card.Content>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.codigoContainer}>
              <Text style={styles.codigo}>{ruta.codigo}</Text>
              <View style={styles.estadoRow}>
                <Icon 
                  name={getEstadoIcon(ruta.estado)} 
                  size={16} 
                  color={getEstadoColor(ruta.estado)} 
                />
                <Text style={[styles.estadoText, { color: getEstadoColor(ruta.estado) }]}>
                  {ruta.estado?.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
            
            <Badge 
              size={28}
              style={[styles.enviosBadge, { backgroundColor: '#4CAF50' }]}
            >
              {ruta.total_envios || 0}
            </Badge>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Icon name="truck" size={18} color="#666" />
              <Text style={styles.infoText}>{ruta.vehiculo_placa || 'Sin vehículo'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="calendar" size={18} color="#666" />
              <Text style={styles.infoText}>
                {ruta.fecha ? new Date(ruta.fecha).toLocaleDateString('es-BO') : '-'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="map-marker-multiple" size={18} color="#666" />
              <Text style={styles.infoText}>
                {ruta.paradas_completadas || 0} / {ruta.total_paradas || 0} paradas
              </Text>
            </View>
          </View>

          {/* Barra de progreso */}
          {ruta.estado !== 'programada' && (
            <View style={styles.progresoContainer}>
              <View style={styles.progresoBar}>
                <View 
                  style={[
                    styles.progresoFill, 
                    { 
                      width: `${progreso}%`,
                      backgroundColor: progreso === 100 ? '#4CAF50' : '#2196F3' 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progresoText}>{Math.round(progreso)}%</Text>
            </View>
          )}

          {/* Botón de acción */}
          <Button
            mode={ruta.estado === 'en_transito' ? 'contained' : 'outlined'}
            icon={ruta.estado === 'en_transito' ? 'map-marker-path' : 'eye'}
            onPress={() => navigation.navigate('RutaMultiEntrega', { rutaId: ruta.id })}
            style={styles.actionButton}
            buttonColor={ruta.estado === 'en_transito' ? '#4CAF50' : undefined}
            compact
          >
            {ruta.estado === 'en_transito' ? 'Continuar Ruta' : 'Ver Detalles'}
          </Button>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando rutas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      
      {/* Barra de búsqueda */}
      <Searchbar
        placeholder="Buscar por código o placa"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Filtros */}
      <SegmentedButtons
        value={filtroEstado}
        onValueChange={setFiltroEstado}
        buttons={[
          { value: 'activas', label: 'Activas' },
          { value: 'completadas', label: 'Completadas' },
          { value: 'todas', label: 'Todas' },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Estadísticas rápidas */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Icon name="truck-fast" size={24} color="#2196F3" />
          <Text style={styles.statNumber}>
            {rutas.filter(r => r.estado === 'en_transito').length}
          </Text>
          <Text style={styles.statLabel}>En tránsito</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Icon name="calendar-clock" size={24} color="#FF9800" />
          <Text style={styles.statNumber}>
            {rutas.filter(r => r.estado === 'programada').length}
          </Text>
          <Text style={styles.statLabel}>Programadas</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Icon name="check-circle" size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>
            {rutas.filter(r => r.estado === 'completada').length}
          </Text>
          <Text style={styles.statLabel}>Completadas</Text>
        </View>
      </View>

      {/* Lista de rutas */}
      <FlatList
        data={rutasFiltradas}
        renderItem={renderRuta}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#4CAF50']} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="route" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {filtroEstado === 'activas' 
                ? 'No tienes rutas activas' 
                : filtroEstado === 'completadas'
                  ? 'No tienes rutas completadas'
                  : 'No hay rutas disponibles'}
            </Text>
            <Text style={styles.emptySubtext}>
              Las rutas asignadas aparecerán aquí
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
    paddingTop: STATUSBAR_HEIGHT,
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
  searchbar: {
    margin: 10,
    marginBottom: 8,
    elevation: 2,
  },
  segmentedButtons: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
  },
  listContent: {
    padding: 10,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  codigoContainer: {
    flex: 1,
  },
  codigo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estadoText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  enviosBadge: {
    alignSelf: 'flex-start',
  },
  infoContainer: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  progresoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progresoBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progresoFill: {
    height: '100%',
    borderRadius: 4,
  },
  progresoText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 45,
    textAlign: 'right',
  },
  actionButton: {
    marginTop: 5,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
});
