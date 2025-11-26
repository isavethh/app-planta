import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Text, Chip, Searchbar } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { transportistaService } from '../services/api';
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
      const data = await transportistaService.getEnviosAsignados(userInfo.transportista_id);
      // Filtrar solo entregados y cancelados
      const historial = data.filter(e => 
        e.estado_nombre === 'entregado' || e.estado_nombre === 'cancelado'
      );
      setEnvios(historial);
      setEnviosFiltrados(historial);
    } catch (error) {
      console.error('Error al cargar historial:', error);
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
    return estado === 'entregado' ? '#4CAF50' : '#F44336';
  };

  const getEstadoIcon = (estado) => {
    return estado === 'entregado' ? 'check-circle' : 'close-circle';
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
            icon={() => <Icon name={getEstadoIcon(item.estado_nombre)} size={16} color="white" />}
            style={[styles.estadoChip, { backgroundColor: getEstadoColor(item.estado_nombre) }]}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {item.estado_nombre?.toUpperCase()}
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

