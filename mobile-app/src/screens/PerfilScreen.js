import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { Card, Text, Button, Avatar, Divider, List, ActivityIndicator } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function PerfilScreen() {
  console.log('👤 [PerfilScreen] Componente iniciando...');
  
  const authContext = useContext(AuthContext);
  const userInfo = authContext?.userInfo;
  const signOut = authContext?.signOut;
  
  const [stats, setStats] = useState({ total: 0, enTransito: 0, completados: 0 });
  const [loading, setLoading] = useState(true);

  // Protección temprana
  if (!userInfo) {
    console.log('⏳ [PerfilScreen] Esperando userInfo...');
    return (
      <View style={styles.container}>
        <Text>Cargando perfil...</Text>
      </View>
    );
  }

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const envios = await envioService.getAll();
      
      // Filtrar por usuario
      const misEnvios = envios.filter(e => 
        (userInfo.almacen_id && e.almacen_destino_id == userInfo.almacen_id) ||
        (userInfo.transportista_id && e.transportista_id == userInfo.transportista_id)
      );

      const total = misEnvios.length;
      const enTransito = misEnvios.filter(e => e.estado === 'en_transito' || e.estado === 'asignado').length;
      const completados = misEnvios.filter(e => e.estado === 'entregado').length;

      setStats({ total, enTransito, completados });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDireccionEnMapa = () => {
    if (!userInfo) return;

    const lat = userInfo.latitud;
    const lng = userInfo.longitud;
    const nombre = encodeURIComponent(userInfo.nombre || 'Ubicación');

    let url;

    if (lat && lng) {
      if (Platform.OS === 'ios') {
        url = `http://maps.apple.com/?ll=${lat},${lng}&q=${nombre}`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      }
    } else if (userInfo.direccion) {
      const query = encodeURIComponent(userInfo.direccion);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    } else {
      Alert.alert(
        'Mapa no disponible',
        'No hay dirección configurada para este usuario.'
      );
      return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Error',
        'No se pudo abrir la aplicación de mapas en este dispositivo.'
      );
    });
  };

  if (!userInfo) {
    return (
      <View style={styles.container}>
        <Text>No hay información de usuario</Text>
      </View>
    );
  }

  const esAlmacen = userInfo.rol_nombre === 'almacen';
  const esTransportista = userInfo.rol_nombre === 'transportista';

  return (
    <ScrollView style={styles.container}>
      {/* Header con avatar */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Icon 
            size={80} 
            icon={esAlmacen ? 'warehouse' : 'account-tie'} 
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.nombre}>
            {userInfo.nombre}
          </Text>
          <Text variant="bodyMedium" style={styles.tipo}>
            {esAlmacen ? 'Encargado de Almacén' : 'Transportista'}
          </Text>
        </Card.Content>
      </Card>

      {/* Información */}
      <Card style={styles.card}>
        <Card.Title 
          title="Información Personal" 
          left={(props) => <Icon name="account-details" {...props} size={24} color="#4CAF50" />}
        />
        <Card.Content>
          {esAlmacen && (
            <>
              <List.Item
                title="Almacén"
                description={userInfo.nombre}
                left={props => <List.Icon {...props} icon="warehouse" color="#4CAF50" />}
              />
              {userInfo.direccion && (
                <List.Item
                  title="Dirección"
                  description={userInfo.direccion}
                  left={props => <List.Icon {...props} icon="map-marker" color="#4CAF50" />}
                  onPress={abrirDireccionEnMapa}
                />
              )}
              {userInfo.latitud && userInfo.longitud && (
                <List.Item
                  title="Coordenadas"
                  description={`${userInfo.latitud}, ${userInfo.longitud}`}
                  left={props => <List.Icon {...props} icon="crosshairs-gps" color="#4CAF50" />}
                  onPress={abrirDireccionEnMapa}
                />
              )}
            </>
          )}

          {esTransportista && (
            <>
              <List.Item
                title="Nombre"
                description={userInfo.nombre}
                left={props => <List.Icon {...props} icon="account" color="#4CAF50" />}
              />
              {userInfo.email && (
                <List.Item
                  title="Email"
                  description={userInfo.email}
                  left={props => <List.Icon {...props} icon="email" color="#4CAF50" />}
                />
              )}
              {userInfo.telefono && (
                <List.Item
                  title="Teléfono"
                  description={userInfo.telefono}
                  left={props => <List.Icon {...props} icon="phone" color="#4CAF50" />}
                />
              )}
              {userInfo.licencia && (
                <List.Item
                  title="Licencia"
                  description={userInfo.licencia}
                  left={props => <List.Icon {...props} icon="card-account-details" color="#4CAF50" />}
                />
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {/* Estadísticas */}
      <Card style={styles.card}>
        <Card.Title 
          title="Estadísticas" 
          left={(props) => <Icon name="chart-bar" {...props} size={24} color="#4CAF50" />}
        />
        <Card.Content>
          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Icon name="package-variant" size={40} color="#4CAF50" />
                <Text variant="headlineMedium" style={styles.statNumber}>{stats.total}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Envíos Totales</Text>
              </View>
              <Divider style={styles.statDivider} />
              <View style={styles.statItem}>
                <Icon name="truck-fast" size={40} color="#2196F3" />
                <Text variant="headlineMedium" style={styles.statNumber}>{stats.enTransito}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>En Tránsito</Text>
              </View>
              <Divider style={styles.statDivider} />
              <View style={styles.statItem}>
                <Icon name="check-circle" size={40} color="#4CAF50" />
                <Text variant="headlineMedium" style={styles.statNumber}>{stats.completados}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Completados</Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Acciones */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={signOut}
            icon="logout"
            style={styles.logoutButton}
            buttonColor="#F44336"
          >
            Cerrar Sesión
          </Button>
        </Card.Content>
      </Card>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerCard: {
    margin: 15,
    borderRadius: 12,
    elevation: 4,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    backgroundColor: '#4CAF50',
    marginBottom: 15,
  },
  nombre: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  tipo: {
    color: '#666',
  },
  card: {
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 5,
  },
  statLabel: {
    color: '#666',
    textAlign: 'center',
    marginTop: 3,
  },
  logoutButton: {
    marginTop: 10,
  },
});
