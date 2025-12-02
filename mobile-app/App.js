import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme, Text } from 'react-native-paper';
import { LogBox, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar manejo global de errores
LogBox.ignoreAllLogs(false); // Mostrar TODOS los logs
console.log('🚀 App iniciando - logs habilitados');

// Capturar errores no manejados
const originalConsoleError = console.error;
console.error = (...args) => {
  console.log('💥 ERROR CAPTURADO:', ...args);
  originalConsoleError(...args);
};

// Importar pantallas
import LoginScreen from './src/screens/LoginScreen';
import EnviosScreen from './src/screens/EnviosScreen';
import EnvioDetalleScreen from './src/screens/EnvioDetalleScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import QRViewScreen from './src/screens/QRViewScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import MapaEnvioScreen from './src/screens/MapaEnvioScreen';
import DocumentoEnvioScreen from './src/screens/DocumentoEnvioScreen';
import AlmacenEnviosScreen from './src/screens/AlmacenEnviosScreen';
import AlmacenNotasVentaScreen from './src/screens/AlmacenNotasVentaScreen';
import AlmacenEstadisticasScreen from './src/screens/AlmacenEstadisticasScreen';
import AlmacenIAScreen from './src/screens/AlmacenIAScreen';
import ReportarIncidenteScreen from './src/screens/ReportarIncidenteScreen';

// Contexto de autenticación
import { AuthContext } from './src/context/AuthContext';

// Error Boundary
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4CAF50',
    secondary: '#8BC34A',
    accent: '#66BB6A',
  },
};

// Tabs del transportista
function TransportistaTabs() {
  console.log('📱 [TransportistaTabs] Renderizando...');
  
  try {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'MisEnvios') {
              iconName = 'truck-delivery';
            } else if (route.name === 'Historial') {
              iconName = 'history';
            } else if (route.name === 'Perfil') {
              iconName = 'account';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'gray',
        })}
      >
      <Tab.Screen 
        name="MisEnvios" 
        component={EnviosScreen} 
        options={{ title: 'Mis Envíos', headerShown: false }}
      />
      <Tab.Screen 
        name="Historial" 
        component={HistorialScreen}
        options={{ title: 'Historial' }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen}
        options={{ title: 'Mi Perfil' }}
      />
    </Tab.Navigator>
    );
  } catch (error) {
    console.error('💥 [TransportistaTabs] ERROR CRÍTICO:', error);
    console.error('💥 [TransportistaTabs] Stack:', error.stack);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 20, color: 'red', marginBottom: 10 }}>Error al cargar tabs</Text>
        <Text style={{ color: '#666' }}>{error.message}</Text>
      </View>
    );
  }
}

// Tabs del almacén
function AlmacenTabs() {
  console.log('📱 [AlmacenTabs] Renderizando...');
  
  try {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Envios') {
              iconName = 'package-variant';
            } else if (route.name === 'NotasVenta') {
              iconName = 'receipt';
            } else if (route.name === 'Estadisticas') {
              iconName = 'chart-box';
            } else if (route.name === 'IA') {
              iconName = 'brain';
            } else if (route.name === 'Perfil') {
              iconName = 'account';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'gray',
        })}
      >
      <Tab.Screen 
        name="Envios" 
        component={AlmacenEnviosScreen} 
        options={{ title: 'Envíos', headerShown: true, headerTitle: '📦 Mis Envíos' }}
      />
      <Tab.Screen 
        name="NotasVenta" 
        component={AlmacenNotasVentaScreen}
        options={{ title: 'Notas', headerShown: true, headerTitle: '📄 Notas de Venta' }}
      />
      <Tab.Screen 
        name="Estadisticas" 
        component={AlmacenEstadisticasScreen}
        options={{ title: 'Estadísticas', headerShown: true, headerTitle: '📊 Estadísticas' }}
      />
      <Tab.Screen 
        name="IA" 
        component={AlmacenIAScreen}
        options={{ title: 'IA', headerShown: true, headerTitle: '🧠 Inteligencia Artificial' }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
    );
  } catch (error) {
    console.error('💥 [AlmacenTabs] ERROR CRÍTICO:', error);
    console.error('💥 [AlmacenTabs] Stack:', error.stack);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 20, color: 'red', marginBottom: 10 }}>Error al cargar tabs</Text>
        <Text style={{ color: '#666' }}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  // Restaurar sesión si existe
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        console.log('🔄 [App] Verificando sesión guardada...');
        const token = await AsyncStorage.getItem('userToken');
        const userInfoString = await AsyncStorage.getItem('userInfo');
        
        if (token && userInfoString) {
          const user = JSON.parse(userInfoString);
          console.log('✅ [App] Sesión encontrada - Restaurando...', { userId: user.id, tipo: user.tipo });
          setUserToken(token);
          setUserInfo(user);
        } else {
          console.log('ℹ️ [App] No hay sesión guardada');
        }
      } catch (e) {
        console.error('❌ [App] Error al verificar sesión:', e);
        // Si hay error, limpiar todo
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (token, user) => {
        try {
          console.log('🔐 [App] signIn iniciando...', { token: token?.substring(0, 20), user });
          
          // Validación robusta
          if (!user || typeof user !== 'object') {
            console.error('❌ [App] signIn: user no es un objeto válido', user);
            throw new Error('Datos de usuario inválidos');
          }
          
          if (!user.id) {
            console.error('❌ [App] signIn: user.id faltante', user);
            throw new Error('ID de usuario requerido');
          }
          
          // Asegurar que tipo esté definido
          if (!user.tipo && !user.rol_nombre) {
            console.error('❌ [App] signIn: tipo/rol_nombre faltante', user);
            throw new Error('Tipo de usuario requerido');
          }
          
          // Normalizar datos
          const userNormalized = {
            ...user,
            id: user.id,
            nombre: user.nombre || user.name || 'Usuario',
            name: user.name || user.nombre || 'Usuario',
            email: user.email || 'sin@email.com',
            tipo: user.tipo || user.rol_nombre,
            rol_nombre: user.rol_nombre || user.tipo
          };
          
          console.log('✅ [App] signIn: Datos normalizados', userNormalized);
          console.log('✅ [App] signIn: Guardando sesión', { userId: userNormalized.id, tipo: userNormalized.tipo });
          
          // Guardar en AsyncStorage PRIMERO
          await AsyncStorage.setItem('userToken', token || 'dummy_token');
          await AsyncStorage.setItem('userInfo', JSON.stringify(userNormalized));
          console.log('💾 [App] Datos guardados en AsyncStorage');
          
          // Actualizar estados juntos en un solo batch
          console.log('🔄 [App] Actualizando estados...');
          setUserToken(token || 'dummy_token');
          setUserInfo(userNormalized);
          
          // Dar tiempo para que React procese los cambios de estado
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('✅ [App] signIn completado exitosamente');
          console.log('✅ [App] Estado actualizado - Token:', (token || 'dummy_token').substring(0, 20));
          console.log('✅ [App] Estado actualizado - UserInfo:', { id: userNormalized.id, tipo: userNormalized.tipo });
          
          // Verificación final
          const tokenCheck = await AsyncStorage.getItem('userToken');
          const userCheck = await AsyncStorage.getItem('userInfo');
          console.log('✅ [App] Verificación AsyncStorage - Token:', tokenCheck ? 'OK' : 'FALTA');
          console.log('✅ [App] Verificación AsyncStorage - UserInfo:', userCheck ? 'OK' : 'FALTA');
        } catch (e) {
          console.error('❌ [App] Error al guardar sesión:', e);
          console.error('❌ [App] Error.message:', e?.message);
          console.error('❌ [App] Error.stack:', e?.stack);
          throw e;
        }
      },
      signOut: async () => {
        try {
          console.log('🚪 [App] signOut: Cerrando sesión...');
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userInfo');
          setUserToken(null);
          setUserInfo(null);
          console.log('✅ [App] signOut: Sesión cerrada');
        } catch (e) {
          console.error('❌ [App] Error al cerrar sesión:', e);
          console.error('❌ [App] Error.message:', e.message);
        }
      },
      userInfo,
      userToken,
    }),
    [userToken, userInfo]
  );

  if (isLoading) {
    return null; // Aquí podrías poner un splash screen
  }

  // Validación adicional para evitar crashes
  console.log('🎯 [App] Renderizando - Token:', userToken ? 'SÍ' : 'NO', 'UserInfo:', userInfo ? 'SÍ' : 'NO');
  
  // Si estamos en transición (hay token pero no userInfo todavía), mostrar loading
  if (userToken && !userInfo) {
    console.log('⏳ [App] En transición - esperando userInfo...');
    return null; // Mostrar nada mientras se sincroniza
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={authContext}>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <Stack.Navigator>
            {userToken == null || !userInfo ? (
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{ headerShown: false }}
              />
            ) : (
              <>
                {/* Renderizar tabs según el tipo de usuario */}
                <Stack.Screen 
                  name="Main" 
                  component={
                    userInfo?.tipo === 'almacen' || userInfo?.rol_nombre === 'almacen'
                      ? AlmacenTabs 
                      : TransportistaTabs
                  }
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="EnvioDetalle" 
                  component={EnvioDetalleScreen}
                  options={{ title: 'Detalle del Envío' }}
                />
                <Stack.Screen 
                  name="QRScanner" 
                  component={QRScannerScreen}
                  options={{ 
                    title: 'Escanear QR',
                    headerShown: false
                  }}
                />
                {/* QRView ya no se usa - QR integrado en EnvioDetalle */}
                <Stack.Screen 
                  name="Tracking" 
                  component={TrackingScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="MapaEnvio" 
                  component={MapaEnvioScreen}
                  options={{ 
                    title: 'Ubicación del Envío',
                    headerShown: true
                  }}
                />
                <Stack.Screen 
                  name="DocumentoEnvio" 
                  component={DocumentoEnvioScreen}
                  options={{ 
                    headerShown: false
                  }}
                />
                <Stack.Screen 
                  name="ReportarIncidente" 
                  component={ReportarIncidenteScreen}
                  options={{ 
                    title: 'Reportar Incidente',
                    headerShown: true,
                    headerStyle: { backgroundColor: '#F44336' },
                    headerTintColor: '#fff'
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
}

