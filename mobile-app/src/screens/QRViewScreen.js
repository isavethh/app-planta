import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, Image } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Divider, Chip, DataTable } from 'react-native-paper';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function QRViewScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [loading, setLoading] = useState(true);
  const [envio, setEnvio] = useState(null);
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    cargarEnvio();
  }, []);

  const cargarEnvio = async () => {
    try {
      setLoading(true);
      const data = await envioService.getById(envioId);
      console.log('Envío cargado:', data);
      console.log('QR Code length:', data.qr_code ? data.qr_code.length : 0);
      
      setEnvio(data);
      
      // Validar que el QR sea válido antes de settearlo
      if (data.qr_code && data.qr_code.startsWith('data:image')) {
        setQrCode(data.qr_code);
      } else {
        console.warn('QR code inválido o vacío');
        setQrCode(null);
      }
    } catch (error) {
      console.error('Error al cargar envío:', error);
      Alert.alert('Error', 'No se pudo cargar el envío');
    } finally {
      setLoading(false);
    }
  };

  const compartirQR = async () => {
    try {
      if (!envio) return;

      let mensaje = `📦 ENVÍO: ${envio.codigo}\n\n`;
      mensaje += `🏢 Destino: ${envio.almacen_nombre}\n`;
      mensaje += `📅 Fecha: ${new Date(envio.fecha_creacion).toLocaleDateString('es-ES')}\n`;
      mensaje += `📊 Estado: ${envio.estado.toUpperCase()}\n`;
      mensaje += `💰 Total: $${parseFloat(envio.total_precio || 0).toFixed(2)}\n\n`;
      
      if (envio.productos && envio.productos.length > 0) {
        mensaje += `📦 PRODUCTOS:\n`;
        envio.productos.forEach((p, i) => {
          mensaje += `${i+1}. ${p.producto_nombre || 'Producto'} - ${p.cantidad} unidades\n`;
        });
      }

      await Share.share({
        message: mensaje,
        title: `Envío ${envio.codigo}`,
      });
    } catch (error) {
      console.error('Error al compartir:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando información del envío...</Text>
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
        <Appbar.Content title="Detalle del Envío" />
        <Appbar.Action icon="share-variant" onPress={compartirQR} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Código QR */}
        <Card style={styles.qrCard}>
          <Card.Content style={styles.qrCardContent}>
            <Text variant="headlineSmall" style={styles.codigo}>
              {envio.codigo}
            </Text>
            
            <Chip 
              icon={() => <Icon name="circle" size={12} color="white" />}
              style={[styles.estadoChip, { backgroundColor: getEstadoColor(envio.estado) }]}
              textStyle={{ color: 'white', fontWeight: 'bold' }}
            >
              {envio.estado?.replace('_', ' ').toUpperCase()}
            </Chip>

            {qrCode ? (
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: qrCode }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  onError={(e) => {
                    console.error('Error al cargar QR:', e.nativeEvent.error);
                  }}
                />
              </View>
            ) : !loading ? (
              <View style={styles.qrContainer}>
                <Icon name="qrcode-remove" size={64} color="#999" />
                <Text style={styles.qrInstructionText}>No se pudo generar el código QR</Text>
              </View>
            ) : (
              <View style={styles.qrContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.qrInstructionText}>Generando código QR...</Text>
              </View>
            )}

            <Text variant="bodySmall" style={styles.qrInstructionText}>
              Escanea este código para acceder a la información del envío
            </Text>
          </Card.Content>
        </Card>

        {/* Información General */}
        <Card style={styles.card}>
          <Card.Title 
            title="Información del Envío"
            left={(props) => <Icon name="information" {...props} size={24} color="#4CAF50" />}
          />
          <Card.Content>
            <View style={styles.infoRow}>
              <Icon name="warehouse" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>Almacén Destino</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {envio.almacen_nombre || 'No especificado'}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Icon name="calendar" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text variant="bodySmall" style={styles.infoLabel}>Fecha de Creación</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>
                  {new Date(envio.fecha_creacion).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>

            {envio.fecha_estimada_entrega && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Icon name="clock-outline" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text variant="bodySmall" style={styles.infoLabel}>Fecha Estimada de Entrega</Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>
                      {new Date(envio.fecha_estimada_entrega).toLocaleDateString('es-ES')}
                      {envio.hora_estimada && ` a las ${envio.hora_estimada}`}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {envio.categoria && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.infoRow}>
                  <Icon name="tag" size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text variant="bodySmall" style={styles.infoLabel}>Categoría</Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>{envio.categoria}</Text>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Productos */}
        {envio.productos && envio.productos.length > 0 && (
          <Card style={styles.card}>
            <Card.Title 
              title="Productos del Envío"
              left={(props) => <Icon name="package-variant-closed" {...props} size={24} color="#4CAF50" />}
            />
            <Card.Content>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Producto</DataTable.Title>
                  <DataTable.Title numeric>Cant.</DataTable.Title>
                  <DataTable.Title numeric>Peso</DataTable.Title>
                  <DataTable.Title numeric>Precio</DataTable.Title>
                </DataTable.Header>

                {envio.productos.map((producto, index) => (
                  <DataTable.Row key={index}>
                    <DataTable.Cell>{producto.producto_nombre || 'Producto'}</DataTable.Cell>
                    <DataTable.Cell numeric>{producto.cantidad}</DataTable.Cell>
                    <DataTable.Cell numeric>{parseFloat(producto.peso_kg || 0).toFixed(2)}kg</DataTable.Cell>
                    <DataTable.Cell numeric>${parseFloat(producto.total_precio || 0).toFixed(2)}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>

              <Divider style={styles.totalDivider} />
              
              {/* Totales */}
              <View style={styles.totalesContainer}>
                <View style={styles.totalRow}>
                  <Text variant="titleSmall" style={styles.totalLabel}>Total Cantidad:</Text>
                  <Text variant="titleSmall" style={styles.totalValue}>
                    {envio.total_cantidad || 0} unidades
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text variant="titleSmall" style={styles.totalLabel}>Total Peso:</Text>
                  <Text variant="titleSmall" style={styles.totalValue}>
                    {parseFloat(envio.total_peso || 0).toFixed(2)} kg
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text variant="titleMedium" style={styles.totalLabelBold}>TOTAL:</Text>
                  <Text variant="titleMedium" style={styles.totalValueBold}>
                    ${parseFloat(envio.total_precio || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Observaciones */}
        {envio.observaciones && (
          <Card style={styles.card}>
            <Card.Title 
              title="Observaciones"
              left={(props) => <Icon name="note-text" {...props} size={24} color="#4CAF50" />}
            />
            <Card.Content>
              <Text>{envio.observaciones}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Botones de acción */}
        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            icon="share-variant"
            onPress={compartirQR}
            style={styles.actionButton}
          >
            Compartir Información
          </Button>

          <Button
            mode="outlined"
            icon="arrow-left"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          >
            Volver a Envíos
          </Button>
        </View>

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
  qrCard: {
    margin: 15,
    borderRadius: 12,
    elevation: 4,
  },
  qrCardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  codigo: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  estadoChip: {
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrInstructionText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  card: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
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
    marginBottom: 3,
  },
  infoValue: {
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    marginVertical: 10,
  },
  totalDivider: {
    marginVertical: 15,
    height: 2,
    backgroundColor: '#4CAF50',
  },
  totalesContainer: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    color: '#666',
  },
  totalValue: {
    color: '#333',
    fontWeight: '600',
  },
  totalLabelBold: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  totalValueBold: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  actionButton: {
    marginBottom: 10,
  },
});
