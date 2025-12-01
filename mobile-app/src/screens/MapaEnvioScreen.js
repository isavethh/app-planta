import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { Button, Text, Card, ActivityIndicator } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { envioService } from '../services/api';

export default function MapaEnvioScreen({ route, navigation }) {
  const { envioId } = route.params;
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleIniciarRuta = async () => {
    Alert.alert(
      'Iniciar Ruta',
      '¿Deseas iniciar el trayecto ahora? Se activará el seguimiento en tiempo real.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            try {
              await envioService.iniciarEnvio(envioId);
              Alert.alert('Ruta Iniciada', 'El seguimiento en tiempo real está activo. ¡Buen viaje!');
              navigation.navigate('Tracking', { envioId });
            } catch (error) {
              console.error('Error al iniciar ruta:', error);
              Alert.alert('Error', 'No se pudo iniciar la ruta');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando ubicación...</Text>
      </View>
    );
  }

  if (!envio || !envio.latitud || !envio.longitud) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="map-marker-off" size={60} color="#999" />
        <Text style={styles.emptyText}>No hay ubicación disponible para este envío</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.backButton}>
          Volver
        </Button>
      </View>
    );
  }

  const region = {
    latitude: parseFloat(envio.latitud),
    longitude: parseFloat(envio.longitud),
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Marker
          coordinate={{
            latitude: parseFloat(envio.latitud),
            longitude: parseFloat(envio.longitud),
          }}
          title={envio.almacen_nombre || 'Destino'}
          description={envio.direccion_completa || 'Ubicación del envío'}
        >
          <Icon name="warehouse" size={40} color="#4CAF50" />
        </Marker>
      </MapView>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            {envio.codigo}
          </Text>
          <View style={styles.infoRow}>
            <Icon name="warehouse" size={20} color="#666" />
            <Text style={styles.infoText}>{envio.almacen_nombre || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={20} color="#666" />
            <Text style={styles.infoText}>{envio.direccion_completa || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="calendar" size={20} color="#666" />
            <Text style={styles.infoText}>
              {envio.fecha_estimada_entrega 
                ? new Date(envio.fecha_estimada_entrega).toLocaleDateString() 
                : 'N/A'}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleIniciarRuta}
            icon="navigation"
            style={styles.startButton}
            buttonColor="#4CAF50"
          >
            Iniciar Ruta
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    color: '#666',
  },
  emptyText: {
    marginTop: 15,
    color: '#666',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    elevation: 8,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  cardTitle: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  startButton: {
    marginTop: 20,
  },
});

