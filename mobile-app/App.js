import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { LogBox } from 'react-native';
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
}

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  // NO restaurar sesión automáticamente - siempre mostrar login
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Limpiar sesión anterior
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        setUserToken(null);
        setUserInfo(null);
      } catch (e) {
        console.error('Error:', e);
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
          if (!user || !user.id) {
            console.error('❌ [App] signIn: userInfo inválido', user);
            throw new Error('Datos de usuario inválidos');
          }
          console.log('✅ [App] signIn: Guardando sesión', { userId: user.id, tipo: user.tipo });
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('userInfo', JSON.stringify(user));
          setUserToken(token);
          setUserInfo(user);
          console.log('✅ [App] signIn completado exitosamente');
        } catch (e) {
          console.error('❌ [App] Error al guardar sesión:', e);
          console.error('❌ [App] Error.message:', e.message);
          console.error('❌ [App] Error.stack:', e.stack);
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

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={authContext}>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <Stack.Navigator>
            {userToken == null ? (
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{ headerShown: false }}
              />
            ) : (
              <>
                <Stack.Screen 
                  name="Main" 
                  component={TransportistaTabs}
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
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
}

