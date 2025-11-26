import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text, Button, Chip, Divider, Surface, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { envioService } from '../services/api';

export default function EnvioDetalleScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);

  useEffect(() => {
    cargarEnvio();
  }, []);

  const cargarEnvio = async () => {
    try {
      setLoading(true);
      const data = await envioService.getById(envioId);
      setEnvio(data);
    } catch (error) {
      console.error('Error al cargar envío:', error);
      Alert.alert('Error', 'No se pudo cargar el envío');
    } finally {
      setLoading(false);
    }
  };

  const confirmarAccion = (accion) => {
    setAccionPendiente(accion);
    setDialogVisible(true);
  };

  const ejecutarAccion = async () => {
    setDialogVisible(false);
    setActionLoading(true);

    try {
      if (accionPendiente === 'iniciar') {
        // Usar el nuevo servicio iniciarEnvio que también inicia la simulación
        await envioService.iniciarEnvio(envioId);
        Alert.alert(
          'Éxito', 
          'Envío iniciado correctamente. La simulación del recorrido está activa y se puede ver en el sistema web.',
          [
            { text: 'OK', onPress: () => cargarEnvio() }
          ]
        );
      } else if (accionPendiente === 'entregar') {
        await envioService.updateEstado(envioId, 'entregado');
        Alert.alert('Éxito', 'Envío marcado como entregado');
        cargarEnvio();
      }
    } catch (error) {
      console.error('Error al actualizar envío:', error);
      Alert.alert('Error', 'No se pudo actualizar el envío');
    } finally {
      setActionLoading(false);
      setAccionPendiente(null);
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

  const getMensajeConfirmacion = () => {
    if (accionPendiente === 'iniciar') {
      return '¿Estás seguro de iniciar este envío? Se activará el seguimiento en tiempo real.';
    } else if (accionPendiente === 'entregar') {
      return '¿Confirmas que has entregado este envío? Esta acción no se puede deshacer.';
    }
    return '';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!envio) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={{ marginTop: 10 }}>No se pudo cargar el envío</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Código y Estado */}
        <Surface style={styles.headerCard} elevation={2}>
          <View style={styles.headerContent}>
            <View>
              <Text variant="titleSmall" style={styles.label}>Código de Envío</Text>
              <Text variant="headlineSmall" style={styles.codigo}>{envio.codigo}</Text>
            </View>
            <Chip 
              icon={() => <Icon name={getEstadoIcon(envio.estado_nombre)} size={18} color="white" />}
              style={[styles.estadoChip, { backgroundColor: getEstadoColor(envio.estado_nombre) }]}
              textStyle={{ color: 'white', fontWeight: 'bold' }}
            >
              {envio.estado_nombre?.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>
        </Surface>

        {/* Información de Destino */}
        <Card style={styles.card}>
          <Card.Title 
            title="Información de Destino"
            left={(props) => <Icon name="map-marker" {...props} size={24} color="#4CAF50" />}
          />
          <Card.Content>
            <InfoRow icon="store" label="Almacén" value={envio.almacen_nombre || 'No especificado'} />
            <InfoRow icon="map-marker-radius" label="Dirección" value={envio.direccion_completa || envio.direccion_nombre || 'No especificada'} />
            {envio.fecha_programada && (
              <InfoRow 
                icon="calendar" 
                label="Fecha programada" 
                value={new Date(envio.fecha_programada).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
            )}
            {envio.hora_estimada_llegada && (
              <InfoRow icon="clock-outline" label="Hora estimada" value={envio.hora_estimada_llegada} />
            )}
          </Card.Content>
        </Card>

        {/* Detalles de Productos */}
        {envio.detalles && envio.detalles.length > 0 && (
          <Card style={styles.card}>
            <Card.Title 
              title="Productos"
              left={(props) => <Icon name="package-variant" {...props} size={24} color="#4CAF50" />}
            />
            <Card.Content>
              {envio.detalles.map((detalle, index) => (
                <View key={index}>
                  {index > 0 && <Divider style={styles.divider} />}
                  <View style={styles.productoItem}>
                    <View style={styles.productoHeader}>
                      <Text variant="titleMedium" style={styles.productoNombre}>
                        {detalle.producto_nombre}
                      </Text>
                      <Text variant="titleMedium" style={styles.productoCantidad}>
                        x{detalle.cantidad}
                      </Text>
                    </View>
                    {detalle.producto_codigo && (
                      <Text variant="bodySmall" style={styles.productoCodigo}>
                        Código: {detalle.producto_codigo}
                      </Text>
                    )}
                    {detalle.peso_total && (
                      <Text variant="bodySmall" style={styles.productoInfo}>
                        Peso: {detalle.peso_total} kg
                      </Text>
                    )}
                    {detalle.tipo_empaque_nombre && (
                      <Text variant="bodySmall" style={styles.productoInfo}>
                        Empaque: {detalle.tipo_empaque_nombre}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Información del Vehículo */}
        {envio.asignacion && (
          <Card style={styles.card}>
            <Card.Title 
              title="Vehículo Asignado"
              left={(props) => <Icon name="truck" {...props} size={24} color="#4CAF50" />}
            />
            <Card.Content>
              <InfoRow icon="card-text" label="Placa" value={envio.asignacion.placa || 'No asignado'} />
              <InfoRow icon="car-info" label="Vehículo" value={`${envio.asignacion.marca || ''} ${envio.asignacion.modelo || ''}`.trim() || 'No especificado'} />
              <InfoRow icon="truck-cargo-container" label="Tipo" value={envio.asignacion.tipo_vehiculo_nombre || 'No especificado'} />
            </Card.Content>
          </Card>
        )}

        {/* Notas */}
        {envio.notas && (
          <Card style={styles.card}>
            <Card.Title 
              title="Notas"
              left={(props) => <Icon name="note-text" {...props} size={24} color="#4CAF50" />}
            />
            <Card.Content>
              <Text>{envio.notas}</Text>
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botones de acción */}
      <Surface style={styles.actionBar} elevation={4}>
        {/* Botón para ver QR (siempre visible) */}
        <Button
          mode="outlined"
          icon="qrcode"
          onPress={() => navigation.navigate('QRView', { envioId })}
          style={[styles.actionButton, { marginBottom: 10 }]}
        >
          Ver Código QR
        </Button>

        {envio.estado_nombre === 'asignado' && (
          <Button
            mode="contained"
            icon="play-circle"
            onPress={() => confirmarAccion('iniciar')}
            style={styles.actionButton}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Iniciar Envío
          </Button>
        )}

        {envio.estado_nombre === 'en_transito' && (
          <Button
            mode="contained"
            icon="check-circle"
            onPress={() => confirmarAccion('entregar')}
            style={styles.actionButton}
            buttonColor="#4CAF50"
            loading={actionLoading}
            disabled={actionLoading}
          >
            Marcar como Entregado
          </Button>
        )}

        {(envio.estado_nombre === 'entregado' || envio.estado_nombre === 'cancelado') && (
          <View style={styles.completedContainer}>
            <Icon 
              name={envio.estado_nombre === 'entregado' ? 'check-circle' : 'close-circle'} 
              size={32} 
              color={envio.estado_nombre === 'entregado' ? '#4CAF50' : '#F44336'} 
            />
            <Text variant="titleMedium" style={{ marginLeft: 10 }}>
              {envio.estado_nombre === 'entregado' ? 'Envío Completado' : 'Envío Cancelado'}
            </Text>
          </View>
        )}
      </Surface>

      {/* Diálogo de confirmación */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Confirmar Acción</Dialog.Title>
          <Dialog.Content>
            <Text>{getMensajeConfirmacion()}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={ejecutarAccion}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// Componente auxiliar para filas de información
function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={20} color="#666" />
      <View style={styles.infoContent}>
        <Text variant="bodySmall" style={styles.infoLabel}>{label}</Text>
        <Text variant="bodyMedium" style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#666',
    marginBottom: 5,
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  estadoChip: {
    height: 36,
  },
  card: {
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 10,
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    color: '#333',
  },
  divider: {
    marginVertical: 10,
  },
  productoItem: {
    marginBottom: 5,
  },
  productoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  productoNombre: {
    fontWeight: 'bold',
    flex: 1,
  },
  productoCantidad: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  productoCodigo: {
    color: '#666',
    marginBottom: 3,
  },
  productoInfo: {
    color: '#666',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'white',
  },
  actionButton: {
    borderRadius: 8,
  },
  completedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
});

