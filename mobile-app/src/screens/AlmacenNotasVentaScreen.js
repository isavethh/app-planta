import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { almacenService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AlmacenNotasVentaScreen({ navigation }) {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    cargarNotasVenta();
  }, []);

  const cargarNotasVenta = async () => {
    try {
      console.log('📄 [AlmacenNotasVenta] Cargando notas de venta para almacén:', userInfo?.id);
      setLoading(true);
      const data = await almacenService.getNotasVentaAlmacen(userInfo.id);
      console.log('✅ [AlmacenNotasVenta] Notas cargadas:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📊 Primera nota (debug):', JSON.stringify(data[0], null, 2));
      }
      setNotas(data || []);
    } catch (error) {
      console.error('❌ [AlmacenNotasVenta] Error al cargar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarNotasVenta();
    setRefreshing(false);
  };

  const formatearMonto = (monto) => {
    if (!monto && monto !== 0) return '0.00';
    const numero = parseFloat(monto);
    if (isNaN(numero)) return '0.00';
    return numero.toFixed(2);
  };

  const calcularTotal = (nota) => {
    // Intentar obtener el total de diferentes campos posibles
    const total = nota.total || nota.total_precio || nota.monto_total || 0;
    
    // Si no hay total, calcular desde subtotal + IVA
    if (!total || total === 0) {
      const subtotal = parseFloat(nota.subtotal || 0);
      const iva = parseFloat(nota.iva || 0);
      return subtotal + iva;
    }
    
    return parseFloat(total);
  };

  const renderNota = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        {/* Header compacto */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Icon name="receipt" size={20} color="#1976D2" />
            <Text style={styles.numeroNota} numberOfLines={1}>
              {item.numero_nota}
            </Text>
          </View>
          <Chip 
            mode="flat" 
            style={styles.totalChip}
            textStyle={styles.totalChipText}
          >
            Bs. {formatearMonto(calcularTotal(item))}
          </Chip>
        </View>

        {/* Info compacta */}
        <View style={styles.infoCompacta}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Envío:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.envio_codigo}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Text style={[styles.infoValue, styles.estadoText]}>
              {(item.envio_estado || 'pendiente').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Fecha */}
        <View style={styles.fechaRow}>
          <Icon name="calendar-clock" size={14} color="#666" />
          <Text style={styles.fechaText}>
            {new Date(item.fecha_emision || item.created_at).toLocaleDateString('es-BO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {/* Botón de ver */}
        <TouchableOpacity
          style={styles.verButton}
          onPress={() => {
            const notaUrl = `http://192.168.0.129:3001/api/envios/${item.envio_id}/nota-venta`;
            navigation.navigate('DocumentoEnvio', { 
              documentURL: notaUrl,
              codigo: item.numero_nota
            });
          }}
        >
          <Icon name="file-document-outline" size={18} color="white" />
          <Text style={styles.verButtonText}>Ver Detalle</Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando notas de venta...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notas}
        renderItem={renderNota}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No hay notas de venta</Text>
            <Text style={styles.emptySubtext}>
              Las notas de venta aparecerán aquí cuando se generen automáticamente
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
    padding: 12,
  },
  card: {
    marginBottom: 10,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  numeroNota: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginLeft: 6,
    flex: 1,
  },
  totalChip: {
    backgroundColor: '#4CAF50',
    height: 28,
  },
  totalChipText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  infoCompacta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  estadoText: {
    color: '#4CAF50',
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fechaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  verButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#1976D2',
    borderRadius: 8,
  },
  verButtonText: {
    marginLeft: 6,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
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
