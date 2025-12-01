import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Surface, ActivityIndicator, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoginScreen() {
  const [tipoUsuario, setTipoUsuario] = useState(null); // null, 'almacen' o 'transportista'
  const [almacenes, setAlmacenes] = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { signIn } = useContext(AuthContext);

  useEffect(() => {
    if (tipoUsuario) {
      cargarDatos();
    }
  }, [tipoUsuario]);

  const cargarDatos = async () => {
    try {
      setLoadingData(true);
      setSelectedId('');
      
      if (tipoUsuario === 'almacen') {
        const response = await authService.getAlmacenesLogin();
        if (response.success && response.data) {
          setAlmacenes(response.data);
          if (response.data.length === 0) {
            Alert.alert('Sin Almacenes', 'No hay almacenes disponibles en el sistema.');
          }
        } else {
          Alert.alert('Error', response.error || 'No se pudieron cargar los almacenes.');
          setAlmacenes([]);
        }
      } else {
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
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      const mensaje = error?.response?.data?.error || error.message || 'Error desconocido';
      Alert.alert('Error de Conexión', `No se pudieron cargar los datos.\n\n${mensaje}\n\nVerifica que el backend esté corriendo.`);
      if (tipoUsuario === 'almacen') {
        setAlmacenes([]);
      } else {
        setTransportistas([]);
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedId) {
      Alert.alert('Selección Requerida', `Por favor selecciona ${tipoUsuario === 'almacen' ? 'un almacén' : 'un transportista'}`);
      return;
    }

    try {
      setLoading(true);
      
      const lista = tipoUsuario === 'almacen' ? almacenes : transportistas;
      const itemSeleccionado = lista.find(item => item.id.toString() === selectedId);
      
      if (!itemSeleccionado) {
        Alert.alert('Error', 'No se encontró el usuario seleccionado');
        return;
      }

      // Crear userInfo dependiendo del tipo
      const userInfo = {
        id: itemSeleccionado.id,
        nombre: itemSeleccionado.nombre || 'Usuario',
        email: itemSeleccionado.email || '',
        rol_nombre: tipoUsuario,
        tipo: tipoUsuario, // IMPORTANTE: Agregar tipo para que funcione el filtrado
        almacen_id: tipoUsuario === 'almacen' ? itemSeleccionado.id : null,
        transportista_id: tipoUsuario === 'transportista' ? itemSeleccionado.id : null,
      };

      console.log('[LoginScreen] UserInfo creado:', JSON.stringify(userInfo, null, 2));
      await signIn('dummy_token', userInfo);
      console.log('[LoginScreen] SignIn completado exitosamente');
    } catch (error) {
      console.error('Error en login:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const listaActual = tipoUsuario === 'almacen' ? almacenes : transportistas;

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <Icon name="leaf" size={80} color="white" />
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
        {!tipoUsuario ? (
          /* Selección de tipo de usuario */
          <View style={styles.tipoSeleccion}>
            <Text variant="headlineSmall" style={styles.pregunta}>
              ¿Cómo deseas ingresar?
            </Text>

            <Card 
              style={styles.opcionCard}
              onPress={() => setTipoUsuario('almacen')}
            >
              <Card.Content style={styles.opcionContent}>
                <Icon name="warehouse" size={60} color="#4CAF50" />
                <Text variant="titleLarge" style={styles.opcionTitulo}>
                  Almacén
                </Text>
                <Text variant="bodyMedium" style={styles.opcionDescripcion}>
                  Gestionar recepción de envíos
                </Text>
              </Card.Content>
            </Card>

            <Card 
              style={styles.opcionCard}
              onPress={() => setTipoUsuario('transportista')}
            >
              <Card.Content style={styles.opcionContent}>
                <Icon name="truck-fast" size={60} color="#2196F3" />
                <Text variant="titleLarge" style={styles.opcionTitulo}>
                  Transportista
                </Text>
                <Text variant="bodyMedium" style={styles.opcionDescripcion}>
                  Ver y gestionar envíos asignados
                </Text>
              </Card.Content>
            </Card>
          </View>
        ) : (
          /* Formulario de selección */
          <View style={styles.formulario}>
            <Button
              mode="text"
              icon="arrow-left"
              onPress={() => {
                setTipoUsuario(null);
                setSelectedId('');
              }}
              style={styles.botonVolver}
              labelStyle={{ color: '#4CAF50' }}
            >
              Cambiar tipo de usuario
            </Button>

            <Surface style={styles.seleccionCard} elevation={2}>
              <View style={styles.iconContainer}>
                <Icon 
                  name={tipoUsuario === 'almacen' ? 'warehouse' : 'truck-fast'} 
                  size={50} 
                  color={tipoUsuario === 'almacen' ? '#4CAF50' : '#2196F3'} 
                />
              </View>

              <Text variant="titleLarge" style={styles.seleccionTitulo}>
                Selecciona {tipoUsuario === 'almacen' ? 'tu Almacén' : 'tu Usuario'}
              </Text>

              {loadingData ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.loadingText}>Cargando opciones...</Text>
                </View>
              ) : listaActual.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="alert-circle-outline" size={48} color="#FF9800" />
                  <Text style={styles.emptyText}>
                    No hay {tipoUsuario === 'almacen' ? 'almacenes' : 'transportistas'} disponibles
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
                        label={`-- Selecciona ${tipoUsuario === 'almacen' ? 'un almacén' : 'un transportista'} --`} 
                        value="" 
                      />
                      {listaActual.map((item) => (
                        <Picker.Item
                          key={item.id}
                          label={tipoUsuario === 'almacen' 
                            ? item.nombre 
                            : `${item.nombre} (${item.email})`
                          }
                          value={item.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>

                  {selectedId && (
                    <View style={styles.seleccionadoInfo}>
                      <Icon name="check-circle" size={24} color="#4CAF50" />
                      <Text variant="bodyLarge" style={styles.seleccionadoTexto}>
                        {tipoUsuario === 'almacen' 
                          ? almacenes.find(a => a.id.toString() === selectedId)?.nombre
                          : transportistas.find(t => t.id.toString() === selectedId)?.nombre
                        }
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
                    buttonColor={tipoUsuario === 'almacen' ? '#4CAF50' : '#2196F3'}
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </>
              )}
            </Surface>
          </View>
        )}

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
  tipoSeleccion: {
    marginTop: 20,
  },
  pregunta: {
    textAlign: 'center',
    color: '#2E7D32',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  opcionCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  opcionContent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  opcionTitulo: {
    marginTop: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  opcionDescripcion: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  formulario: {
    marginTop: 20,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    marginBottom: 15,
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
    color: '#2E7D32',
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
    borderColor: '#4CAF50',
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
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  seleccionadoTexto: {
    marginLeft: 10,
    color: '#2E7D32',
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

