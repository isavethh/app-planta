import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Appbar, Chip } from 'react-native-paper';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

export default function MapaEnvioScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iniciando, setIniciando] = useState(false);

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
      Alert.alert('Error', 'No se pudo cargar la información del envío');
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarViaje = async () => {
    Alert.alert(
      '🚚 Iniciar Viaje',
      '¿Estás listo para iniciar el viaje? Se activará el seguimiento en tiempo real y la simulación en el sistema.',
      [
        { text: 'Todavía no', style: 'cancel' },
        {
          text: 'Iniciar Ahora',
          onPress: async () => {
            try {
              setIniciando(true);
              await envioService.iniciarEnvio(envioId);
              Alert.alert(
                '✅ Viaje Iniciado',
                'El seguimiento en tiempo real está activo. ¡Buen viaje!',
                [
                  {
                    text: 'Ver Seguimiento',
                    onPress: () => navigation.replace('Tracking', { envioId })
                  }
                ]
              );
            } catch (error) {
              console.error('Error al iniciar viaje:', error);
              Alert.alert('Error', 'No se pudo iniciar el viaje. Intenta nuevamente.');
            } finally {
              setIniciando(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando ubicación...</Text>
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
        <Appbar.Content title="Ubicación del Destino" />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Información del Envío */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="headlineSmall" style={styles.codigo}>
                {envio.codigo}
              </Text>
              <Chip 
                icon={() => <Icon name="check-circle" size={16} color="white" />}
                style={[styles.estadoChip, { backgroundColor: '#00BCD4' }]}
                textStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                ACEPTADO
              </Chip>
            </View>

            <View style={styles.infoRow}>
              <Icon name="warehouse" size={20} color="#666" />
              <Text style={styles.infoText}>{envio.almacen_nombre}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="map-marker" size={20} color="#666" />
              <Text style={styles.infoText}>
                {envio.direccion_completa || 'Dirección no disponible'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="calendar" size={20} color="#666" />
              <Text style={styles.infoText}>
                {envio.fecha_estimada_entrega 
                  ? new Date(envio.fecha_estimada_entrega).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Fecha no especificada'}
              </Text>
            </View>

            {envio.hora_estimada && (
              <View style={styles.infoRow}>
                <Icon name="clock-outline" size={20} color="#666" />
                <Text style={styles.infoText}>
                  Hora estimada: {envio.hora_estimada}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Mapa del Destino */}
        <Card style={styles.mapCard}>
          <Card.Content>
            <View style={styles.mapHeader}>
              <Icon name="map-marker-radius" size={28} color="#4CAF50" />
              <Text variant="titleLarge" style={styles.mapTitle}>
                Ubicación del Destino
              </Text>
            </View>

            <View style={styles.mapPlaceholder}>
              {/* Aquí irá el mapa real con integración de Google Maps o OpenStreetMap */}
              <Icon name="map" size={80} color="#4CAF50" />
              <Text variant="titleMedium" style={styles.mapText}>
                📍 {envio.almacen_nombre}
              </Text>
              <Text variant="bodyMedium" style={styles.mapSubtext}>
                {envio.direccion_completa || 'Ver ubicación en mapa'}
              </Text>
              
              {/* Placeholder para coordenadas */}
              <View style={styles.coordinatesBox}>
                <Text variant="bodySmall" style={styles.coordinatesText}>
                  🌍 Lat: -17.783333, Lng: -63.182778
                </Text>
                <Text variant="bodySmall" style={styles.coordinatesSubtext}>
                  (Coordenadas aproximadas - Santa Cruz)
                </Text>
              </View>

              <Text variant="bodySmall" style={styles.mapNote}>
                💡 Integración con Google Maps próximamente
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Información de productos */}
        <Card style={styles.productosCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.productosTitle}>
              📦 Detalles del Envío
            </Text>
            <View style={styles.productosRow}>
              <View style={styles.productoItem}>
                <Icon name="package-variant" size={24} color="#4CAF50" />
                <Text variant="bodyLarge" style={styles.productoValue}>
                  {envio.total_cantidad || 0}
                </Text>
                <Text variant="bodySmall" style={styles.productoLabel}>
                  Unidades
                </Text>
              </View>
              <View style={styles.productoDivider} />
              <View style={styles.productoItem}>
                <Icon name="weight" size={24} color="#FF9800" />
                <Text variant="bodyLarge" style={styles.productoValue}>
                  {parseFloat(envio.total_peso || 0).toFixed(2)}
                </Text>
                <Text variant="bodySmall" style={styles.productoLabel}>
                  Kilogramos
                </Text>
              </View>
              <View style={styles.productoDivider} />
              <View style={styles.productoItem}>
                <Icon name="currency-usd" size={24} color="#2196F3" />
                <Text variant="bodyLarge" style={styles.productoValue}>
                  ${parseFloat(envio.total_precio || 0).toFixed(2)}
                </Text>
                <Text variant="bodySmall" style={styles.productoLabel}>
                  Valor Total
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Botón Iniciar Viaje */}
        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            onPress={handleIniciarViaje}
            icon="truck-fast"
            style={styles.iniciarButton}
            buttonColor="#9C27B0"
            contentStyle={styles.iniciarButtonContent}
            labelStyle={styles.iniciarButtonLabel}
            loading={iniciando}
            disabled={iniciando}
          >
            🚚 Iniciar Viaje
          </Button>
          <Text variant="bodySmall" style={styles.buttonHint}>
            Al iniciar, se activará el seguimiento en tiempo real
          </Text>
        </View>

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
  infoCard: {
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
    marginTop: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  mapCard: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 3,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  mapTitle: {
    marginLeft: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  mapPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    padding: 20,
  },
  mapText: {
    marginTop: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  mapSubtext: {
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  coordinatesBox: {
    marginTop: 15,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  coordinatesText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  coordinatesSubtext: {
    color: '#666',
    marginTop: 3,
  },
  mapNote: {
    marginTop: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  productosCard: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
  },
  productosTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  productosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  productoItem: {
    alignItems: 'center',
    flex: 1,
  },
  productoDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
  },
  productoValue: {
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 20,
    color: '#333',
  },
  productoLabel: {
    marginTop: 3,
    color: '#666',
  },
  buttonContainer: {
    marginHorizontal: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  iniciarButton: {
    width: '100%',
    borderRadius: 12,
    elevation: 4,
  },
  iniciarButtonContent: {
    paddingVertical: 8,
  },
  iniciarButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonHint: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

