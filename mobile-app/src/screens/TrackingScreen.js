import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip } from 'react-native-paper';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function TrackingScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarDatos();
    // Actualizar cada 10 segundos
    const interval = setInterval(cargarDatos, 10000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    try {
      setRefreshing(true);
      const data = await envioService.getById(envioId);
      setEnvio(data);
      
      // Aquí podrías obtener puntos de tracking GPS reales
      // const trackingData = await envioService.getSeguimiento(envioId);
      // setTracking(trackingData);
      
    } catch (error) {
      console.error('Error al cargar tracking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const getEstadoIcono = (estado) => {
    const iconos = {
      'pendiente': 'clock-outline',
      'asignado': 'clipboard-check-outline',
      'en_transito': 'truck-fast',
      'entregado': 'check-circle',
      'cancelado': 'close-circle',
    };
    return iconos[estado] || 'help-circle';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  if (!envio) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>No se pudo cargar el envío</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Volver
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Seguimiento en Tiempo Real" />
        <Appbar.Action 
          icon="refresh" 
          onPress={cargarDatos}
          disabled={refreshing}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Información del Envío */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="headlineSmall" style={styles.codigo}>
                {envio.codigo}
              </Text>
              <Chip 
                icon={() => <Icon name={getEstadoIcono(envio.estado)} size={16} color="white" />}
                style={[styles.estadoChip, { backgroundColor: getEstadoColor(envio.estado) }]}
                textStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                {envio.estado?.replace('_', ' ').toUpperCase()}
              </Chip>
            </View>

            <View style={styles.infoRow}>
              <Icon name="warehouse" size={20} color="#666" />
              <Text style={styles.infoText}>{envio.almacen_nombre}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Mapa de Seguimiento */}
        <Card style={styles.mapCard}>
          <Card.Content>
            <View style={styles.mapPlaceholder}>
              <Icon name="map-marker-path" size={64} color="#4CAF50" />
              <Text variant="titleMedium" style={styles.mapText}>
                {envio.estado === 'en_transito' 
                  ? '🚚 Envío en camino' 
                  : envio.estado === 'entregado'
                  ? '✅ Envío entregado'
                  : '📦 Envío pendiente de inicio'}
              </Text>
              {envio.estado === 'en_transito' && (
                <Text variant="bodyMedium" style={styles.mapSubtext}>
                  Actualizando ubicación cada 10 segundos...
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Timeline de Estados */}
        <Card style={styles.card}>
          <Card.Title 
            title="Historial del Envío"
            left={(props) => <Icon name="timeline-clock" {...props} size={24} color="#4CAF50" />}
          />
          <Card.Content>
            <View style={styles.timeline}>
              {envio.fecha_creacion && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Envío Creado</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_creacion).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.fecha_asignacion && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#2196F3' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Asignado a Transportista</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_asignacion).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.fecha_inicio_transito && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#9C27B0' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">En Tránsito</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_inicio_transito).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.fecha_entrega && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Entregado</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      {new Date(envio.fecha_entrega).toLocaleString('es-ES')}
                    </Text>
                  </View>
                </View>
              )}

              {envio.estado === 'pendiente' && !envio.fecha_asignacion && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#FF9800' }]} />
                  <View style={styles.timelineContent}>
                    <Text variant="titleSmall">Esperando Asignación</Text>
                    <Text variant="bodySmall" style={styles.timelineDate}>
                      El envío será asignado pronto
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Información adicional */}
        {envio.estado === 'en_transito' && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.infoBox}>
                <Icon name="information" size={24} color="#2196F3" />
                <Text variant="bodyMedium" style={styles.infoBoxText}>
                  El transportista está en camino. Puedes ver su ubicación en tiempo real arriba.
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 20 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  estadoChip: {
    height: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  mapCard: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
  },
  mapPlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  mapText: {
    marginTop: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  mapSubtext: {
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  timeline: {
    paddingVertical: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
    marginRight: 15,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    color: '#666',
    marginTop: 3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
  },
  infoBoxText: {
    flex: 1,
    marginLeft: 10,
    color: '#1976D2',
  },
});

