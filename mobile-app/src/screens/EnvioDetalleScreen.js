import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
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
      
      if (!data) {
        throw new Error('No se recibió data del envío');
      }
      
      // Normalizar campo estado - IMPORTANTE
      if (data.estado && !data.estado_nombre) {
        data.estado_nombre = data.estado;
      } else if (!data.estado && data.estado_nombre) {
        data.estado = data.estado_nombre;
      }
      
      console.log('🔍 [EnvioDetalle] Envío cargado completo:', {
        id: data.id,
        codigo: data.codigo,
        estado: data.estado,
        estado_nombre: data.estado_nombre,
        'Condición asignado': data.estado_nombre === 'asignado',
        'typeof estado_nombre': typeof data.estado_nombre,
        'Keys del objeto': Object.keys(data).filter(k => k.includes('estado'))
      });
      
      setEnvio(data);
    } catch (error) {
      console.error('❌ [EnvioDetalle] Error al cargar envío:', error);
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
      if (accionPendiente === 'aceptar') {
        // Aceptar envío y generar nota de venta automáticamente
        console.log('[EnvioDetalle] Aceptando envío y generando nota de venta...');
        const result = await envioService.aceptarAsignacion(envioId, {
          nombre: 'Transportista', // TODO: obtener de userInfo
          email: 'transportista@example.com' // TODO: obtener de userInfo
        });
        
        console.log('[EnvioDetalle] Envío aceptado:', result);
        
        Alert.alert(
          '✅ Envío Aceptado', 
          'Has aceptado el envío exitosamente. Tu firma digital ha sido registrada y se generó una nota de venta automáticamente.',
          [{ text: 'OK', onPress: () => {
            cargarEnvio();
            navigation.goBack();
          }}]
        );
      } else if (accionPendiente === 'rechazar') {
        // Mostrar opciones de motivo de rechazo
        Alert.alert(
          '❌ Motivo del Rechazo',
          'Selecciona el motivo:',
          [
            {
              text: 'No tengo disponibilidad',
              onPress: () => rechazarConMotivo('No tengo disponibilidad en este momento')
            },
            {
              text: 'Vehículo en mantenimiento',
              onPress: () => rechazarConMotivo('Mi vehículo está en mantenimiento')
            },
            {
              text: 'Otro motivo',
              onPress: () => rechazarConMotivo('Motivo personal')
            },
            { text: 'Cancelar', style: 'cancel' }
          ],
          { cancelable: true }
        );
      } else if (accionPendiente === 'iniciar') {
        // Usar el nuevo servicio iniciarEnvio que también inicia la simulación
        await envioService.iniciarEnvio(envioId);

        // Intentar iniciar simulación automáticamente
        try {
          await envioService.simularMovimiento(envioId);
        } catch (simError) {
          console.warn('No se pudo iniciar la simulación automática:', simError?.message || simError);
        }

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

  const rechazarConMotivo = async (motivo) => {
    try {
      setActionLoading(true);
      console.log('[EnvioDetalle] Rechazando envío con motivo:', motivo);
      await envioService.rechazarAsignacion(envioId, motivo);
      
      Alert.alert(
        '✅ Envío Rechazado',
        'El envío fue rechazado y quedará registrado en tu historial. El administrador será notificado.',
        [{ text: 'OK', onPress: () => {
          navigation.goBack();
        }}]
      );
    } catch (error) {
      console.error('[EnvioDetalle] Error al rechazar:', error);
      Alert.alert('Error', `No se pudo rechazar el envío: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimularRuta = async () => {
    try {
      setActionLoading(true);
      const resp = await envioService.simularMovimiento(envioId);

      // Navegar al tracking para ver la simulación inmediatamente
      Alert.alert('Simulación iniciada', 'Se generó una ruta de ejemplo. Abriendo seguimiento...');
      navigation.navigate('Tracking', { envioId });
    } catch (error) {
      console.error('Error al simular ruta desde detalle:', error);
      Alert.alert('Error', 'No se pudo generar la simulación. Verifica el backend.');
    } finally {
      setActionLoading(false);
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
    if (accionPendiente === 'aceptar') {
      return '¿Aceptar este envío? Se generará tu firma digital y una nota de venta automáticamente.';
    } else if (accionPendiente === 'rechazar') {
      return '¿Rechazar este envío? Deberás especificar el motivo del rechazo.';
    } else if (accionPendiente === 'iniciar') {
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

        {/* Código QR integrado */}
        {envio.qr_code && (
          <Card style={styles.card}>
            <Card.Title 
              title="Código QR del Envío"
              left={(props) => <Icon name="qrcode" {...props} size={24} color="#4CAF50" />}
            />
            <Card.Content style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Image
                source={{ uri: envio.qr_code }}
                style={{ width: 200, height: 200 }}
                resizeMode="contain"
              />
              <Text variant="bodySmall" style={{ marginTop: 10, color: '#666', textAlign: 'center' }}>
                Escanea este código para ver el envío
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botones de acción */}
      <Surface style={styles.actionBar} elevation={4}>
        {/* DEBUG INFO */}
        <Text style={{ fontSize: 10, color: 'red', marginBottom: 5 }}>
          DEBUG: estado={envio.estado} | estado_nombre={envio.estado_nombre}
        </Text>
        
        {/* Botón para ver documento del envío */}
        <Button
          mode="outlined"
          icon="file-document"
          onPress={() => {
            const documentURL = `http://192.168.0.129:3001/api/envios/${envioId}/documento`;
            navigation.navigate('DocumentoEnvio', { documentURL, codigo: envio.codigo });
          }}
          style={[styles.actionButton, { marginBottom: 10 }]}
        >
          Ver Documento
        </Button>

        {/* Botones ACEPTAR y RECHAZAR para envíos ASIGNADOS */}
        {(envio.estado_nombre === 'asignado' || envio.estado === 'asignado' || true) && (
          <View style={styles.twoButtonsRow}>
            <Button
              mode="contained"
              icon="check-circle"
              onPress={() => confirmarAccion('aceptar')}
              style={[styles.actionButton, { flex: 1, marginRight: 5 }]}
              buttonColor="#4CAF50"
              loading={actionLoading}
              disabled={actionLoading}
            >
              Aceptar Envío
            </Button>
            <Button
              mode="outlined"
              icon="close-circle"
              onPress={() => confirmarAccion('rechazar')}
              style={[styles.actionButton, { flex: 1, marginLeft: 5 }]}
              textColor="#F44336"
              loading={actionLoading}
              disabled={actionLoading}
            >
              Rechazar
            </Button>
          </View>
        )}

        {(envio.estado_nombre === 'aceptado' || envio.estado === 'aceptado') && (
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

        {(envio.estado_nombre === 'en_transito' || envio.estado === 'en_transito') && (
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
        {/* Botón adicional para simular ruta (útil para pruebas/demo) */}
        {envio.estado_nombre !== 'entregado' && (
          <Button
            mode="outlined"
            icon="routes"
            onPress={handleSimularRuta}
            style={[styles.actionButton, { marginTop: 8 }]}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Simular Ruta (Demo)
          </Button>
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
  twoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  completedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
});

