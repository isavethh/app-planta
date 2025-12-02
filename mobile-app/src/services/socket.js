import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// URL del servidor WebSocket con namespace /tracking
const SOCKET_URL = Platform.OS === 'web' 
  ? 'http://localhost:3001/tracking'
  : 'http://10.26.14.34:3001/tracking';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Conectar al servidor
  connect() {
    if (this.socket?.connected) {
      console.log('🔌 [Socket] Ya conectado');
      return this.socket;
    }

    console.log('🔌 [Socket] Conectando a:', SOCKET_URL);
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ [Socket] Conectado al servidor de tracking:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [Socket] Desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ [Socket] Error de conexión:', error.message);
    });

    return this.socket;
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Unirse a seguimiento de un envío
  joinEnvio(envioId) {
    if (this.socket) {
      this.socket.emit('join-envio', envioId);
      this.socket.emit('join', `envio-${envioId}`);
      console.log('📦 [Socket] Unido a envío:', envioId);
    }
  }

  // Dejar de seguir un envío
  leaveEnvio(envioId) {
    if (this.socket) {
      this.socket.emit('leave-envio', envioId);
      console.log('📦 [Socket] Dejó envío:', envioId);
    }
  }

  // Enviar actualización de posición (desde la app) - SINCRONIZADO CON LARAVEL
  enviarPosicion(envioId, posicion, progreso) {
    if (this.socket) {
      console.log(`📍 [Socket] Enviando posición envío ${envioId}: ${progreso * 100}%`);
      this.socket.emit('posicion-update', {
        envioId,
        posicion: {
          latitude: posicion.latitude,
          longitude: posicion.longitude
        },
        progreso
      });
    }
  }

  // Iniciar simulación y notificar a todos los clientes (incluido Laravel)
  iniciarSimulacion(envioId, rutaPuntos) {
    if (this.socket) {
      console.log(`🚚 [Socket] Iniciando simulación envío ${envioId} con ${rutaPuntos.length} puntos`);
      this.socket.emit('iniciar-simulacion', {
        envioId,
        rutaPuntos
      });
    }
  }

  // Notificar que el envío se completó
  completarEnvio(envioId) {
    if (this.socket) {
      console.log(`✅ [Socket] Envío ${envioId} completado`);
      this.socket.emit('envio-completado', { envioId });
    }
  }

  // Escuchar actualizaciones de posición
  onPosicionActualizada(callback) {
    if (this.socket) {
      this.socket.on('posicion-actualizada', callback);
    }
  }

  // Escuchar cuando se inicia una simulación
  onSimulacionIniciada(callback) {
    if (this.socket) {
      this.socket.on('simulacion-iniciada', callback);
    }
  }

  // Escuchar cuando un envío se completa
  onEnvioCompletado(callback) {
    if (this.socket) {
      this.socket.on('envio-completado', callback);
    }
  }

  // Remover listener
  off(event) {
    if (this.socket) {
      this.socket.off(event);
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
