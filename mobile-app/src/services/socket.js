import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// URL del servidor WebSocket con namespace /tracking
// El servidor Node.js corre en puerto 3001
const SOCKET_URL = Platform.OS === 'web' 
  ? 'http://localhost:3001/tracking'
  : 'http://192.168.0.129:3001/tracking';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxAttempts = 3;
  }

  // Conectar al servidor
  connect() {
    try {
      if (this.socket?.connected) {
        console.log('🔌 [Socket] Ya conectado');
        return this.socket;
      }

      if (this.isConnecting) {
        console.log('🔌 [Socket] Conexión en progreso...');
        return this.socket;
      }

      // Limitar intentos para no saturar
      if (this.connectionAttempts >= this.maxAttempts) {
        console.log('⚠️ [Socket] Máximo de intentos alcanzado, usando modo offline');
        return null;
      }

      this.isConnecting = true;
      this.connectionAttempts++;
      console.log('🔌 [Socket] Conectando a:', SOCKET_URL);
      
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: false, // No conectar automáticamente
        reconnection: true,
        reconnectionAttempts: 10, // Más intentos
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 20000, // 20 segundos para dar más tiempo
        forceNew: false, // No forzar nueva conexión
        upgrade: true,
        rememberUpgrade: true,
      });
      
      // Conectar manualmente después de configurar
      this.socket.connect();

      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.connectionAttempts = 0; // Resetear contador en conexión exitosa
        console.log('✅ [Socket] Conectado al servidor de tracking:', this.socket.id);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;
        console.log('❌ [Socket] Desconectado:', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.isConnecting = false;
        // Solo loguear warning, no error para evitar el popup rojo
        // El servidor Node.js puede no estar corriendo, no es crítico
        if (error.message === 'timeout' || error.message?.includes('timeout')) {
          console.warn('⚠️ [Socket] Timeout de conexión - El servidor Node.js puede no estar corriendo');
          console.warn('   💡 Para habilitar websockets, ejecuta: cd applanta/backend && npm start');
        } else {
          console.warn('⚠️ [Socket] Error de conexión (continuando sin socket):', error.message);
        }
      });

      this.socket.on('error', (error) => {
        // Silenciar errores de socket para evitar crashes
        console.warn('⚠️ [Socket] Error general:', error?.message || 'unknown');
      });

      return this.socket;
    } catch (error) {
      this.isConnecting = false;
      console.warn('⚠️ [Socket] Error al crear conexión:', error?.message || 'unknown');
      return null;
    }
  }

  // Desconectar
  disconnect() {
    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al desconectar:', error?.message || 'unknown');
    }
  }

  // Unirse a seguimiento de un envío
  joinEnvio(envioId) {
    try {
      if (this.socket && this.socket.connected) {
        this.socket.emit('join-envio', envioId);
        this.socket.emit('join', `envio-${envioId}`);
        console.log('📦 [Socket] Unido a envío:', envioId);
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al unirse a envío:', error);
    }
  }

  // Dejar de seguir un envío
  leaveEnvio(envioId) {
    try {
      if (this.socket && this.socket.connected) {
        this.socket.emit('leave-envio', envioId);
        console.log('📦 [Socket] Dejó envío:', envioId);
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al dejar envío:', error);
    }
  }

  // Enviar actualización de posición (desde la app) - SINCRONIZADO CON LARAVEL
  enviarPosicion(envioId, posicion, progreso) {
    try {
      if (this.socket && this.socket.connected && posicion) {
        this.socket.emit('posicion-update', {
          envioId,
          posicion: {
            latitude: posicion.latitude || 0,
            longitude: posicion.longitude || 0
          },
          progreso: progreso || 0
        });
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al enviar posición:', error);
    }
  }

  // Iniciar simulación y notificar a todos los clientes (incluido Laravel)
  iniciarSimulacion(envioId, rutaPuntos) {
    try {
      if (this.socket && this.socket.connected && rutaPuntos) {
        console.log(`🚚 [Socket] Iniciando simulación envío ${envioId} con ${rutaPuntos.length} puntos`);
        this.socket.emit('iniciar-simulacion', {
          envioId,
          rutaPuntos: rutaPuntos.map(p => ({
            latitude: p.latitude || 0,
            longitude: p.longitude || 0
          }))
        });
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al iniciar simulación:', error);
    }
  }

  // Notificar que el envío se completó
  completarEnvio(envioId) {
    try {
      if (this.socket && this.socket.connected) {
        console.log(`✅ [Socket] Envío ${envioId} completado`);
        this.socket.emit('envio-completado', { envioId });
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al completar envío:', error);
    }
  }

  // Escuchar actualizaciones de posición
  onPosicionActualizada(callback) {
    try {
      if (this.socket) {
        this.socket.off('posicion-actualizada'); // Evitar duplicados
        this.socket.on('posicion-actualizada', callback);
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al registrar listener:', error);
    }
  }

  // Escuchar cuando se inicia una simulación
  onSimulacionIniciada(callback) {
    try {
      if (this.socket) {
        this.socket.off('simulacion-iniciada'); // Evitar duplicados
        this.socket.on('simulacion-iniciada', callback);
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al registrar listener:', error);
    }
  }

  // Escuchar cuando un envío se completa
  onEnvioCompletado(callback) {
    try {
      if (this.socket) {
        this.socket.off('envio-completado'); // Evitar duplicados
        this.socket.on('envio-completado', callback);
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al registrar listener:', error);
    }
  }

  // Remover listener
  off(event) {
    try {
      if (this.socket) {
        this.socket.off(event);
      }
    } catch (error) {
      console.warn('⚠️ [Socket] Error al remover listener:', error);
    }
  }

  // Verificar si está conectado
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Exportar instancia única (singleton)
export const socketService = new SocketService();
export default socketService;
