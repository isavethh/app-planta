import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Surface,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { rutasMultiService } from '../services/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function ResumenRutaScreen({ route, navigation }) {
  const rutaId = route?.params?.rutaId;
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (rutaId) {
      cargarResumen();
    } else {
      setLoading(false);
      setError('No se especificó una ruta');
    }
  }, [rutaId]);

  const cargarResumen = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await rutasMultiService.obtenerRuta(rutaId);
      if (response.success) {
        setRuta(response.ruta);
      } else {
        setError(response.message || 'Error al cargar la ruta');
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarResumen();
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearHora = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>Cargando resumen...</Text>
      </View>
    );
  }

  if (error || !ruta) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="alert-circle" size={60} color="#F44336" />
        <Text style={{ marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
          {error || 'No se pudo cargar el resumen'}
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          Volver
        </Button>
      </View>
    );
  }

  const paradasCompletadas = ruta.paradas?.filter(p => p.estado === 'entregado').length || 0;
  const totalParadas = ruta.paradas?.length || 0;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      
      {/* Header */}
      <Surface style={styles.header} elevation={4}>
        <View style={styles.headerContent}>
          <Button
            icon="arrow-left"
            mode="text"
            textColor="#fff"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Volver
          </Button>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>📋 Resumen de Ruta</Text>
            <Text style={styles.headerSubtitle}>{ruta.codigo}</Text>
          </View>
        </View>
      </Surface>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Estado de la ruta */}
        <Card style={[styles.card, { backgroundColor: ruta.estado === 'completada' ? '#E8F5E9' : '#FFF3E0' }]}>
          <Card.Content>
            <View style={styles.estadoRow}>
              <Icon 
                name={ruta.estado === 'completada' ? 'check-circle' : 'truck-delivery'} 
                size={40} 
                color={ruta.estado === 'completada' ? '#4CAF50' : '#FF9800'} 
              />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.estadoText}>
                  {ruta.estado === 'completada' ? '✅ Ruta Completada' : '🚚 En Tránsito'}
                </Text>
                <Text style={styles.estadoSubtext}>
                  {paradasCompletadas} de {totalParadas} entregas realizadas
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Información general */}
        <Card style={styles.card}>
          <Card.Title title="📊 Información General" />
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{formatearFecha(ruta.fecha)}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hora Salida:</Text>
              <Text style={styles.infoValue}>{formatearHora(ruta.hora_salida)}</Text>
            </View>
            {ruta.hora_fin && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hora Fin:</Text>
                  <Text style={styles.infoValue}>{formatearHora(ruta.hora_fin)}</Text>
                </View>
              </>
            )}
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Envíos:</Text>
              <Text style={styles.infoValue}>{ruta.total_envios || 0}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Peso Total:</Text>
              <Text style={styles.infoValue}>{parseFloat(ruta.total_peso || 0).toFixed(2)} kg</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Lista de entregas */}
        <Card style={styles.card}>
          <Card.Title title="📦 Detalle de Entregas" />
          <Card.Content>
            {ruta.paradas?.map((parada, index) => (
              <View key={parada.id} style={styles.paradaItem}>
                <View style={styles.paradaHeader}>
                  <View style={[
                    styles.paradaNumero,
                    { backgroundColor: parada.estado === 'entregado' ? '#4CAF50' : '#FF9800' }
                  ]}>
                    <Text style={styles.paradaNumeroText}>{index + 1}</Text>
                  </View>
                  <View style={styles.paradaInfo}>
                    <Text style={styles.paradaNombre}>
                      {parada.almacen_nombre || parada.destino_nombre || 'Destino'}
                    </Text>
                    <Text style={styles.paradaDireccion}>
                      {parada.almacen_direccion || parada.destino_direccion || ''}
                    </Text>
                  </View>
                  <Icon 
                    name={parada.estado === 'entregado' ? 'check-circle' : 'clock-outline'} 
                    size={24} 
                    color={parada.estado === 'entregado' ? '#4CAF50' : '#FF9800'} 
                  />
                </View>
                
                {parada.estado === 'entregado' && (
                  <View style={styles.entregaDetalles}>
                    <View style={styles.detalleRow}>
                      <Icon name="account" size={16} color="#666" />
                      <Text style={styles.detalleText}>
                        Receptor: {parada.nombre_receptor || 'N/A'}
                      </Text>
                    </View>
                    {parada.cargo_receptor && (
                      <View style={styles.detalleRow}>
                        <Icon name="briefcase" size={16} color="#666" />
                        <Text style={styles.detalleText}>
                          Cargo: {parada.cargo_receptor}
                        </Text>
                      </View>
                    )}
                    {parada.hora_entrega && (
                      <View style={styles.detalleRow}>
                        <Icon name="clock-check" size={16} color="#666" />
                        <Text style={styles.detalleText}>
                          Entregado: {formatearHora(parada.hora_entrega)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                
                {index < ruta.paradas.length - 1 && <Divider style={{ marginTop: 10 }} />}
              </View>
            ))}
          </Card.Content>
        </Card>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: STATUSBAR_HEIGHT,
    paddingBottom: 15,
    paddingHorizontal: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  scrollContent: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
    borderRadius: 12,
  },
  estadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estadoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  paradaItem: {
    paddingVertical: 10,
  },
  paradaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paradaNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paradaNumeroText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  paradaInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paradaNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  paradaDireccion: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  entregaDetalles: {
    marginLeft: 44,
    marginTop: 8,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
  },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detalleText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#555',
  },
});
