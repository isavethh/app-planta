import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Surface, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoginScreen() {
  const [transportistas, setTransportistas] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { signIn } = useContext(AuthContext);

  // Log para debug
  console.log('[LoginScreen] Componente montado - Solo transportistas');

  useEffect(() => {
    cargarTransportistas();
  }, []);

  const cargarTransportistas = async () => {
    try {
      setLoadingData(true);
      setSelectedId('');
      
      const response = await authService.getTransportistas();
      if (response.success && response.data) {
        setTransportistas(response.data);
        if (response.data.length === 0) {
          Alert.alert('Sin Transportistas', 'No hay transportistas disponibles en el sistema.');
        }
      } else {
        Alert.alert('Error', response.error || 'No se pudieron cargar los transportistas.');
        setTransportistas([]);
      }
    } catch (error) {
      console.error('Error al cargar transportistas:', error);
      const mensaje = error?.response?.data?.error || error.message || 'Error desconocido';
      Alert.alert('Error de Conexión', `No se pudieron cargar los transportistas.\n\n${mensaje}\n\nVerifica que el backend esté corriendo.`);
      setTransportistas([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedId) {
      Alert.alert('Selección Requerida', 'Por favor selecciona un transportista');
      return;
    }

    try {
      setLoading(true);
      
      const itemSeleccionado = transportistas.find(item => item.id.toString() === selectedId);
      
      if (!itemSeleccionado) {
        Alert.alert('Error', 'No se encontró el transportista seleccionado');
        return;
      }

      // Crear userInfo solo para transportista
      const userInfo = {
        id: itemSeleccionado.id,
        nombre: itemSeleccionado.nombre || 'Usuario',
        email: itemSeleccionado.email || '',
        rol_nombre: 'transportista',
        tipo: 'transportista',
        transportista_id: itemSeleccionado.id,
      };

      console.log('[LoginScreen] UserInfo creado:', JSON.stringify(userInfo, null, 2));
      
      try {
        await signIn('dummy_token', userInfo);
        console.log('[LoginScreen] SignIn completado exitosamente');
      } catch (signInError) {
        console.error('[LoginScreen] Error en signIn:', signInError);
        throw signInError;
      }
    } catch (error) {
      console.error('[LoginScreen] Error en login:', error);
      console.error('[LoginScreen] Error.message:', error?.message);
      console.error('[LoginScreen] Error.stack:', error?.stack);
      Alert.alert('Error', `No se pudo iniciar sesión.\n\nDetalle: ${error?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <Icon name="truck-fast" size={80} color="white" />
        <Text variant="displaySmall" style={styles.title}>
          Planta
        </Text>
        <Text variant="titleMedium" style={styles.subtitle}>
          Sistema de Gestión Logística
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formulario}>
          <Surface style={styles.seleccionCard} elevation={2}>
            <View style={styles.iconContainer}>
              <Icon 
                name="truck-fast" 
                size={50} 
                color="#2196F3" 
              />
            </View>

            <Text variant="titleLarge" style={styles.seleccionTitulo}>
              Selecciona tu Usuario
            </Text>

            {loadingData ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Cargando transportistas...</Text>
              </View>
            ) : transportistas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="alert-circle-outline" size={48} color="#FF9800" />
                <Text style={styles.emptyText}>
                  No hay transportistas disponibles
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedId}
                    onValueChange={(itemValue) => setSelectedId(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item 
                      label="-- Selecciona un transportista --" 
                      value="" 
                    />
                    {transportistas.map((item, index) => (
                      <Picker.Item
                        key={`transportista-${item.id}-${index}`}
                        label={`${item.nombre}${item.email ? ' (' + item.email + ')' : ''}`}
                        value={item.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>

                {selectedId && (
                  <View style={styles.seleccionadoInfo}>
                    <Icon name="check-circle" size={24} color="#2196F3" />
                    <Text variant="bodyLarge" style={styles.seleccionadoTexto}>
                      {transportistas.find(t => t.id.toString() === selectedId)?.nombre}
                    </Text>
                  </View>
                )}

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading || !selectedId}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                  icon="login"
                  buttonColor="#2196F3"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </>
            )}
          </Surface>
        </View>

        <Text variant="bodySmall" style={styles.footer}>
          Versión 3.0.0 - Sistema Planta
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  headerGradient: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 15,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  formulario: {
    marginTop: 20,
  },
  seleccionCard: {
    borderRadius: 16,
    padding: 25,
    backgroundColor: 'white',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  seleccionTitulo: {
    textAlign: 'center',
    marginBottom: 25,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 15,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 15,
    color: '#666',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  seleccionadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  seleccionadoTexto: {
    marginLeft: 10,
    color: '#1976D2',
    fontWeight: '600',
    flex: 1,
  },
  loginButton: {
    borderRadius: 12,
    marginTop: 10,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#666',
    marginTop: 30,
  },
});

