import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL del backend - detecta automáticamente si es web o móvil
// IMPORTANTE: Asegúrate de que esta IP sea la de tu PC en la misma red WiFi que tu celular
// Tu PC tiene estas IPs: 10.90.49.140, 192.168.56.1, 100.125.212.89
// Usa la que corresponda a tu red WiFi local (probablemente 10.90.49.140)
export const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000/api'  // Para web
  : 'http://10.90.49.140:3000/api'; // IP de tu PC en red local

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor de respuesta para manejar errores de red
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Tiempo de espera agotado. Verifica tu conexión.';
    } else if (error.message === 'Network Error') {
      error.message = `No se pudo conectar al servidor.\n\nVerifica que:\n1. El backend esté corriendo\n2. Tu celular esté en la misma red WiFi que tu PC\n3. La IP en api.js sea correcta (actual: ${API_URL.replace('/api', '')})`;
    }
    return Promise.reject(error);
  }
);

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  loginAlmacen: async (almacen_id) => {
    const response = await api.post('/public/login-almacen', { almacen_id });
    return response.data;
  },

  loginTransportista: async (transportista_id) => {
    const response = await api.post('/public/login-transportista', { transportista_id });
    return response.data;
  },

  getAlmacenesLogin: async () => {
    const response = await api.get('/public/almacenes-login');
    return response.data;
  },

  getTransportistas: async () => {
    const response = await api.get('/public/transportistas-login');
    return response.data;
  },
  
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Servicios públicos
export const publicService = {
  getAlmacenes: async () => {
    const response = await api.get('/public/almacenes');
    return response.data;
  },
};

// Servicios de transportista
export const transportistaService = {
  getById: async (id) => {
    const response = await api.get(`/transportistas/${id}`);
    return response.data;
  },

  getEnviosAsignados: async (transportistaId) => {
    const response = await api.get(`/transportistas/${transportistaId}/envios`);
    return response.data;
  },

  cambiarDisponibilidad: async (transportistaId, disponible) => {
    const response = await api.put(`/transportistas/${transportistaId}/disponibilidad`, { disponible });
    return response.data;
  },
};

// Servicios de envío
export const envioService = {
  getAll: async (almacen_id) => {
    const response = await api.get('/envios', {
      params: { almacen_id }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/envios/${id}`);
    return response.data;
  },

  getByCode: async (codigo) => {
    const response = await api.get(`/envios/codigo/${codigo}`);
    return response.data;
  },

  updateEstado: async (id, estado_nombre) => {
    const response = await api.put(`/envios/${id}/estado`, { estado_nombre });
    return response.data;
  },

  getSeguimiento: async (id) => {
    const response = await api.get(`/envios/${id}/seguimiento`);
    return response.data;
  },

  simularMovimiento: async (id) => {
    const response = await api.post(`/envios/${id}/simular-movimiento`);
    return response.data;
  },

  getEstados: async () => {
    const response = await api.get('/envios/estados');
    return response.data;
  },

  iniciarEnvio: async (id) => {
    const response = await api.post(`/envios/${id}/iniciar`);
    return response.data;
  },

  marcarEntregado: async (id) => {
    const response = await api.post(`/envios/${id}/entregado`);
    return response.data;
  },

  aceptarAsignacion: async (id) => {
    const response = await api.post(`/envios/${id}/aceptar`);
    return response.data;
  },

  rechazarAsignacion: async (id, motivo) => {
    const response = await api.post(`/envios/${id}/rechazar`, { motivo });
    return response.data;
  },

  getByTransportista: async (transportistaId) => {
    const response = await api.get(`/envios/transportista/${transportistaId}`);
    return response.data;
  },
};

export default api;

