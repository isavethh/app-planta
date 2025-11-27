import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, Image, Linking } from 'react-native';
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

  const confirmarEntrega = () => {
    Alert.alert(
      'Confirmar Recepción',
      '¿Recibiste el pedido en buen estado?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí, Todo Correcto',
          onPress: async () => {
            try {
              await envioService.updateEstado(envioId, 'entregado');
              Alert.alert('¡Perfecto!', 'Pedido confirmado como entregado');
              cargarEnvio(); // Recargar para ver el estado actualizado
            } catch (error) {
              Alert.alert('Error', 'No se pudo confirmar la entrega');
            }
          }
        }
      ]
    );
  };

  const reportarProblema = () => {
    Alert.alert(
      'Reportar Problema',
      'Selecciona el tipo de problema:',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Productos Dañados',
          onPress: () => enviarReporte('Productos dañados')
        },
        {
          text: 'Faltan Productos',
          onPress: () => enviarReporte('Productos faltantes')
        },
        {
          text: 'Cantidad Incorrecta',
          onPress: () => enviarReporte('Cantidad incorrecta')
        },
        {
          text: 'Otro Problema',
          onPress: () => {
            Alert.prompt(
              'Describe el problema',
              'Ingresa los detalles:',
              (texto) => enviarReporte(texto)
            );
          }
        }
      ]
    );
  };

  const enviarReporte = async (problema) => {
    try {
      // Aquí podrías guardar el reporte en la BD
      Alert.alert(
        '✅ Reporte Enviado',
        `Se ha reportado: "${problema}"\n\nNos contactaremos contigo pronto.`
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el reporte');
    }
  };

  const verDocumentoCompleto = () => {
    // URL del documento completo generado por Laravel
    const documentoUrl = `http://10.26.5.55:8000/api/envios/${envioId}/documento`;
    
    Linking.openURL(documentoUrl).catch(err => {
      Alert.alert('Error', 'No se pudo abrir el documento.\n\nAsegúrate que el backend esté corriendo.');
    });
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

        {/* Direcciones de Origen y Destino */}
        <Card style={styles.card}>
          <Card.Title 
            title="Direcciones del Envío"
            left={(props) => <Icon name="map-marker-multiple" {...props} size={24} color="#4CAF50" />}
          />
          <Card.Content>
            {/* Dirección de Origen (Planta) */}
            <View style={styles.direccionContainer}>
              <View style={styles.direccionHeader}>
                <Icon name="factory" size={24} color="#2196F3" />
                <Text variant="titleSmall" style={styles.direccionTitulo}>Origen (Planta)</Text>
              </View>
              <Text variant="bodyMedium" style={styles.direccionTexto}>
                {envio.origen_direccion || 'Planta Principal'}
              </Text>
              {envio.origen_lat && envio.origen_lng && (
                <Text variant="bodySmall" style={styles.coordenadas}>
                  📍 {envio.origen_lat}, {envio.origen_lng}
                </Text>
              )}
              <Button
                mode="outlined"
                icon="map-marker"
                onPress={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${envio.origen_lat || -17.7833},${envio.origen_lng || -63.1821}`;
                  Linking.openURL(url);
                }}
                style={styles.mapButton}
                compact
              >
                Ver en Mapa
              </Button>
            </View>

            <Divider style={styles.direccionDivider} />

            {/* Dirección de Destino (Almacén) */}
            <View style={styles.direccionContainer}>
              <View style={styles.direccionHeader}>
                <Icon name="warehouse" size={24} color="#4CAF50" />
                <Text variant="titleSmall" style={styles.direccionTitulo}>Destino (Almacén)</Text>
              </View>
              <Text variant="bodyMedium" style={styles.direccionTexto}>
                {envio.direccion_completa || envio.almacen_nombre || 'Almacén de destino'}
              </Text>
              {envio.latitud && envio.longitud && (
                <Text variant="bodySmall" style={styles.coordenadas}>
                  📍 {envio.latitud}, {envio.longitud}
                </Text>
              )}
              <Button
                mode="outlined"
                icon="map-marker"
                onPress={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${envio.latitud || -17.7892},${envio.longitud || -63.1751}`;
                  Linking.openURL(url);
                }}
                style={styles.mapButton}
                compact
              >
                Ver en Mapa
              </Button>
            </View>
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
                    <DataTable.Cell numeric>{parseFloat(producto.total_peso || producto.peso_unitario || 0).toFixed(2)}kg</DataTable.Cell>
                    <DataTable.Cell numeric>${parseFloat(producto.total_precio || producto.precio_unitario || 0).toFixed(2)}</DataTable.Cell>
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

        {/* Acciones de entrega (solo si está en tránsito o entregado) */}
        {(envio.estado === 'en_transito' || envio.estado === 'entregado') && (
          <Card style={styles.card}>
            <Card.Title 
              title="Acciones de Entrega"
              left={(props) => <Icon name="clipboard-check" {...props} size={24} color="#4CAF50" />}
            />
            <Card.Content>
              {envio.estado === 'entregado' ? (
                <View>
                  <Text variant="bodyMedium" style={styles.entregadoText}>
                    ✅ Pedido entregado el {envio.fecha_entrega ? new Date(envio.fecha_entrega).toLocaleDateString('es-ES') : 'N/A'}
                  </Text>
                  <Button
                    mode="outlined"
                    icon="alert-circle"
                    onPress={() => reportarProblema()}
                    style={[styles.actionButton, { marginTop: 10 }]}
                    buttonColor="#FFF3E0"
                    textColor="#F57C00"
                  >
                    Reportar un Problema
                  </Button>
                </View>
              ) : (
                <View>
                  <Text variant="bodyMedium" style={{ marginBottom: 15, color: '#666' }}>
                    El pedido está en camino. Una vez recibido:
                  </Text>
                  <Button
                    mode="contained"
                    icon="check-circle"
                    onPress={() => confirmarEntrega()}
                    style={styles.actionButton}
                    buttonColor="#4CAF50"
                  >
                    Confirmar Recepción
                  </Button>
                  <Button
                    mode="outlined"
                    icon="alert"
                    onPress={() => reportarProblema()}
                    style={[styles.actionButton, { marginTop: 10 }]}
                    buttonColor="#FFF"
                    textColor="#F44336"
                  >
                    Reportar Problema
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* BOTÓN INICIAR RUTA - MUY VISIBLE */}
        {(envio.estado === 'aceptado' || envio.estado === 'asignado') && (
          <Card style={[styles.card, { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4CAF50' }]}>
            <Card.Content>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Icon name="map-marker-path" size={48} color="#4CAF50" />
                <Text variant="titleLarge" style={{ color: '#4CAF50', fontWeight: 'bold', marginTop: 10 }}>
                  ¿Listo para iniciar?
                </Text>
                <Text variant="bodyMedium" style={{ color: '#666', textAlign: 'center', marginTop: 5 }}>
                  Inicia la ruta para activar el seguimiento en tiempo real
                </Text>
              </View>
              <Button
                mode="contained"
                icon="play-circle"
                onPress={async () => {
                  Alert.alert(
                    'Iniciar Ruta en Tiempo Real',
                    '¿Deseas iniciar la ruta ahora? Se activará el seguimiento GPS y la simulación.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Sí, Iniciar',
                        onPress: async () => {
                          try {
                            await envioService.iniciarEnvio(envio.id);
                            Alert.alert('✅ ¡Ruta Iniciada!', 'El seguimiento en tiempo real está activo.');
                            cargarEnvio();
                            navigation.navigate('Tracking', { envioId: envio.id });
                          } catch (error) {
                            console.error('Error al iniciar ruta:', error);
                            Alert.alert('Error', 'No se pudo iniciar la ruta: ' + (error.response?.data?.error || error.message));
                          }
                        }
                      }
                    ]
                  );
                }}
                style={[styles.actionButton, { backgroundColor: '#4CAF50', marginTop: 15 }]}
                labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
              >
                🚀 INICIAR RUTA EN TIEMPO REAL
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Botón para VER SEGUIMIENTO (solo si está en tránsito) */}
        {envio.estado === 'en_transito' && (
          <Card style={[styles.card, { backgroundColor: '#F3E5F5', borderWidth: 2, borderColor: '#9C27B0' }]}>
            <Card.Content>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Icon name="truck-fast" size={48} color="#9C27B0" />
                <Text variant="titleLarge" style={{ color: '#9C27B0', fontWeight: 'bold', marginTop: 10 }}>
                  Envío en Tránsito
                </Text>
              </View>
              <Button
                mode="contained"
                icon="map-marker-path"
                onPress={() => navigation.navigate('Tracking', { envioId: envio.id })}
                style={[styles.actionButton, { backgroundColor: '#9C27B0', marginTop: 15 }]}
                labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
              >
                Ver Seguimiento en Tiempo Real
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Documento Completo */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.documentoBox}>
              <Icon name="file-document" size={48} color="#2196F3" />
              <View style={styles.documentoTextContainer}>
                <Text variant="titleMedium" style={styles.documentoTitle}>
                  Documento Oficial del Envío
                </Text>
                <Text variant="bodySmall" style={styles.documentoSubtitle}>
                  Incluye timeline completo, productos, transportista y más
                </Text>
              </View>
            </View>
            <Button
              mode="contained"
              icon="file-download"
              onPress={verDocumentoCompleto}
              style={[styles.actionButton, { marginTop: 15, backgroundColor: '#2196F3' }]}
            >
              Ver/Descargar Documento Completo
            </Button>
          </Card.Content>
        </Card>

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
  direccionContainer: {
    marginVertical: 10,
  },
  direccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  direccionTitulo: {
    marginLeft: 8,
    fontWeight: 'bold',
    color: '#333',
  },
  direccionTexto: {
    marginLeft: 32,
    marginBottom: 5,
    color: '#555',
  },
  coordenadas: {
    marginLeft: 32,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  mapButton: {
    marginLeft: 32,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  direccionDivider: {
    marginVertical: 15,
    backgroundColor: '#E0E0E0',
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
  entregadoText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 10,
  },
  documentoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
  },
  documentoTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  documentoTitle: {
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 5,
  },
  documentoSubtitle: {
    color: '#1565C0',
  },
});
