import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { almacenService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AlmacenEnviosScreen({ navigation }) {
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    cargarEnvios();
  }, []);

  const cargarEnvios = async () => {
    try {
      console.log('📦 [AlmacenEnvios] Cargando envíos para almacén:', userInfo?.id);
      setLoading(true);
      const data = await almacenService.getEnviosAlmacen(userInfo.id);
      console.log('✅ [AlmacenEnvios] Envíos cargados:', data?.length || 0);
      setEnvios(data || []);
    } catch (error) {
      console.error('❌ [AlmacenEnvios] Error al cargar envíos:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarEnvios();
    setRefreshing(false);
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return '#FFA726';
      case 'en_camino': return '#42A5F5';
      case 'entregado': return '#66BB6A';
      case 'rechazado': return '#EF5350';
      default: return '#9E9E9E';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'Pendiente';
      case 'en_camino': return 'En Camino';
      case 'entregado': return 'Entregado';
      case 'rechazado': return 'Rechazado';
      default: return estado || 'Desconocido';
    }
  };

  const renderEnvio = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        const documentURL = `http://10.26.14.34:3001/api/envios/${item.id}/documento`;
        navigation.navigate('DocumentoEnvio', { 
          documentURL: documentURL,
          codigo: item.codigo
        });
      }}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.codigo}>📦 {item.codigo}</Text>
            <Chip 
              mode="flat" 
              style={{ backgroundColor: getEstadoColor(item.estado) }}
              textStyle={{ color: 'white', fontWeight: 'bold' }}
            >
              {getEstadoTexto(item.estado)}
            </Chip>
          </View>

          {item.transportista_nombre && (
            <View style={styles.infoRow}>
              <Icon name="truck" size={16} color="#666" />
              <Text style={styles.infoText}>
                {item.transportista_nombre}
              </Text>
            </View>
          )}

          {item.fecha_aceptacion && (
            <View style={styles.infoRow}>
              <Icon name="calendar-check" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>
                Aceptado: {new Date(item.fecha_aceptacion).toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}

          {item.firma_transportista && (
            <View style={styles.infoRow}>
              <Icon name="check-decagram" size={16} color="#4CAF50" />
              <Text style={[styles.infoText, { color: '#4CAF50', fontWeight: 'bold' }]}>
                ✍️ Firmado digitalmente
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.documentButton}
              onPress={() => {
                const documentURL = `http://10.26.14.34:3001/api/envios/${item.id}/documento`;
                navigation.navigate('DocumentoEnvio', { 
                  documentURL: documentURL,
                  codigo: item.codigo
                });
              }}
            >
              <Icon name="file-document" size={20} color="#1976D2" />
              <Text style={styles.documentButtonText}>Ver Documento</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando envíos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={envios}
        renderItem={renderEnvio}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="package-variant" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No hay envíos asignados</Text>
            <Text style={styles.emptySubtext}>
              Los envíos aparecerán aquí cuando sean asignados a tu almacén
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codigo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  documentButtonText: {
    marginLeft: 8,
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 10,
    textAlign: 'center',
  },
});
