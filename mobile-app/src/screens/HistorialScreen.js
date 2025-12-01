import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Text, Chip, Searchbar } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function HistorialScreen({ navigation }) {
  const { userInfo } = useContext(AuthContext);
  const [envios, setEnvios] = useState([]);
  const [enviosFiltrados, setEnviosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    cargarHistorial();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtrados = envios.filter(e => 
        e.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.almacen_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.direccion_nombre?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setEnviosFiltrados(filtrados);
    } else {
      setEnviosFiltrados(envios);
    }
  }, [searchQuery, envios]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      
      // Validar que userInfo existe
      if (!userInfo || !userInfo.id) {
        console.error('❌ [HistorialScreen] userInfo no válido:', userInfo);
        setEnvios([]);
        setEnviosFiltrados([]);
        return;
      }
      
      console.log('[HistorialScreen] Cargando historial para usuario ID:', userInfo.id);
      const response = await envioService.getByTransportista(userInfo.id);
      const data = Array.isArray(response) ? response : (response?.data || []);
      
      console.log('[HistorialScreen] Respuesta recibida:', data.length, 'envíos');
      
      // Filtrar entregados, cancelados Y RECHAZADOS
      const historial = data.filter(e => {
        const estado = e?.estado || '';
        return estado === 'entregado' || estado === 'cancelado' || estado === 'rechazado';
      });
      
      console.log(`[Historial] Total envíos en historial: ${historial.length}`);
      console.log('[Historial] Envíos:', JSON.stringify(historial.map(e => ({ codigo: e?.codigo, estado: e?.estado })), null, 2));
      setEnvios(historial);
      setEnviosFiltrados(historial);
    } catch (error) {
      console.error('❌ [HistorialScreen] Error al cargar historial:', error);
      console.error('❌ [HistorialScreen] Error.message:', error?.message);
      console.error('❌ [HistorialScreen] Error.stack:', error?.stack);
      setEnvios([]);
      setEnviosFiltrados([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarHistorial();
  };

  const getEstadoColor = (estado) => {
    if (estado === 'entregado') return '#4CAF50';
    if (estado === 'rechazado') return '#FF9800';
    return '#F44336';
  };

  const getEstadoIcon = (estado) => {
    if (estado === 'entregado') return 'check-circle';
    if (estado === 'rechazado') return 'close-octagon';
    return 'close-circle';
  };

  const renderEnvio = ({ item }) => (
    <Card 
      style={styles.card}
      onPress={() => navigation.navigate('EnvioDetalle', { envioId: item.id })}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.codigo}>{item.codigo}</Text>
          <Chip 
            icon={() => <Icon name={getEstadoIcon(item.estado)} size={16} color="white" />}
            style={[styles.estadoChip, { backgroundColor: getEstadoColor(item.estado) }]}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {item.estado?.toUpperCase()}
          </Chip>
        </View>

        <View style={styles.infoRow}>
          <Icon name="store" size={18} color="#666" />
          <Text style={styles.infoText}>{item.almacen_nombre || 'Sin almacén'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="map-marker" size={18} color="#666" />
          <Text style={styles.infoText} numberOfLines={2}>
            {item.direccion_completa || item.direccion_nombre || 'Sin dirección'}
          </Text>
        </View>

        {item.fecha_entrega && (
          <View style={styles.infoRow}>
            <Icon name="calendar-check" size={18} color="#666" />
            <Text style={styles.infoText}>
              Completado: {new Date(item.fecha_entrega).toLocaleDateString('es-ES')}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Buscar en historial..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <Text>Cargando historial...</Text>
          </View>
        ) : enviosFiltrados.length === 0 ? (
          <View style={styles.centerContainer}>
            <Icon name="history" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron resultados' : 'No hay envíos completados aún'}
            </Text>
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
  searchbar: {
    margin: 10,
    elevation: 2,
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
    alignItems: 'center',
    marginBottom: 10,
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
    textAlign: 'center',
  },
});

