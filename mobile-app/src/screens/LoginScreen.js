import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Surface, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoginScreen() {
  const [tipoUsuario, setTipoUsuario] = useState('almacen'); // 'almacen' o 'transportista'
  const [almacenes, setAlmacenes] = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { signIn } = useContext(AuthContext);

  useEffect(() => {
    cargarDatos();
  }, [tipoUsuario]);

  const cargarDatos = async () => {
    try {
      setLoadingData(true);
      setSelectedId('');
      
      if (tipoUsuario === 'almacen') {
        const response = await authService.getAlmacenesLogin();
        if (response.success) {
          setAlmacenes(response.data);
        }
      } else {
        const response = await authService.getTransportistas();
        if (response.success) {
          setTransportistas(response.data);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos. Verifica que el backend esté corriendo.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedId) {
      Alert.alert('Error', `Por favor selecciona ${tipoUsuario === 'almacen' ? 'un almacén' : 'un transportista'}`);
      return;
    }

    try {
      setLoading(true);
      
      if (tipoUsuario === 'almacen') {
        const response = await authService.loginAlmacen(selectedId);
        if (response.success) {
          const { almacen, token } = response.data;
          await signIn(token, { ...almacen, tipo: 'almacen' });
        } else {
          Alert.alert('Error', response.error || 'Error al iniciar sesión');
        }
      } else {
        const response = await authService.loginTransportista(selectedId);
        if (response.success) {
          const { transportista, token } = response.data;
          await signIn(token, { ...transportista, tipo: 'transportista' });
        } else {
          Alert.alert('Error', response.error || 'Error al iniciar sesión');
        }
      }
    } catch (error) {
      console.error('Error en login:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión. Verifica que el backend esté corriendo en puerto 3000.');
    } finally {
      setLoading(false);
    }
  };

  const listaActual = tipoUsuario === 'almacen' ? almacenes : transportistas;
  const itemSeleccionado = listaActual.find(item => item.id.toString() === selectedId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.card} elevation={4}>
        <View style={styles.header}>
          <Icon name="leaf" size={60} color="#4CAF50" />
          <Text variant="headlineMedium" style={styles.title}>
            Sistema Planta
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Gestión de Envíos e Inventarios
          </Text>
        </View>

        <View style={styles.form}>
          <Text variant="titleMedium" style={styles.label}>
            ¿Cómo deseas ingresar?
          </Text>
          
          <SegmentedButtons
            value={tipoUsuario}
            onValueChange={setTipoUsuario}
            buttons={[
              {
                value: 'almacen',
                label: 'Almacén',
                icon: 'warehouse',
              },
              {
                value: 'transportista',
                label: 'Transportista',
                icon: 'truck',
              },
            ]}
            style={styles.segmentedButtons}
          />

          {loadingData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          ) : (
            <>
              <Text variant="titleSmall" style={styles.selectLabel}>
                {tipoUsuario === 'almacen' ? 'Seleccionar Almacén' : 'Seleccionar Transportista'}
              </Text>
              
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedId}
                  onValueChange={(itemValue) => setSelectedId(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item 
                    label={`-- Selecciona ${tipoUsuario === 'almacen' ? 'un almacén' : 'un transportista'} --`} 
                    value="" 
                  />
                  {listaActual.map((item) => (
                    <Picker.Item
                      key={item.id}
                      label={item.nombre}
                      value={item.id.toString()}
                    />
                  ))}
                </Picker>
              </View>

              {selectedId && itemSeleccionado && (
                <View style={styles.selectedInfo}>
                  <Icon 
                    name={tipoUsuario === 'almacen' ? 'warehouse' : 'account-tie'} 
                    size={24} 
                    color="#4CAF50" 
                  />
                  <View style={styles.selectedTextContainer}>
                    <Text style={styles.selectedTitle}>{itemSeleccionado.nombre}</Text>
                    {itemSeleccionado.direccion && (
                      <Text style={styles.selectedSubtitle}>
                        {itemSeleccionado.direccion}
                      </Text>
                    )}
                    {itemSeleccionado.licencia && (
                      <Text style={styles.selectedSubtitle}>
                        Licencia: {itemSeleccionado.licencia}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || !selectedId}
                style={styles.button}
                icon="login"
              >
                Iniciar Sesión
              </Button>
            </>
          )}

          <View style={styles.infoBox}>
            <Icon name="information-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {tipoUsuario === 'almacen' 
                ? 'Selecciona tu almacén para ver los envíos destinados a él' 
                : 'Selecciona tu usuario transportista para gestionar tus envíos'}
            </Text>
          </View>
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    marginTop: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  subtitle: {
    color: '#666',
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  label: {
    marginBottom: 15,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentedButtons: {
    marginBottom: 20,
  },
  selectLabel: {
    marginBottom: 10,
    color: '#2E7D32',
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
  },
  picker: {
    height: 50,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  selectedTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  selectedTitle: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  selectedSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  infoText: {
    marginLeft: 10,
    flex: 1,
    color: '#666',
    fontSize: 13,
  },
});
