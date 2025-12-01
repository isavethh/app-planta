import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL del backend - CONECTADO A NODE.JS (puerto 3000)
// Node.js consulta PostgreSQL (BD: Plantalogistica)
// IMPORTANTE: Asegúrate de que Node.js esté corriendo en puerto 3000
export const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000/api'  // Para web
  : 'http://192.168.0.129:3001/api'; // ✅ IP CORRECTA DE TU PC EN WIFI

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const response = await api.get(`/transportista/${id}`);
    return response.data;
  },

  getEnviosAsignados: async (transportistaId) => {
    const response = await api.get(`/transportista/${transportistaId}/envios`);
    return response.data;
  },

  cambiarDisponibilidad: async (transportistaId, disponible) => {
    const response = await api.put(`/transportista/${transportistaId}/disponibilidad`, { disponible });
    return response.data;
  },
};

// Servicios de envío
export const envioService = {
  getAll: async (almacen_id) => {
    const response = await api.get('/envios', {
      params: { almacen_id }
    });
    // La API devuelve directamente el array
    return Array.isArray(response.data) ? response.data : (response.data.data || response.data);
  },

  getById: async (id) => {
    console.log(`🌐 [API] Obteniendo envío ID: ${id}`);
    const response = await api.get(`/envios/${id}`);
    console.log('🌐 [API] Respuesta recibida:', JSON.stringify(response.data, null, 2));
    console.log('🌐 [API] Estado del envío:', {
      estado: response.data?.estado,
      estado_nombre: response.data?.estado_nombre,
      keys: Object.keys(response.data || {}).filter(k => k.includes('estado'))
    });
    return response.data;
  },

  getByCode: async (codigo) => {
    const response = await api.get(`/envios/qr/${codigo}`);
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

  aceptarEnvio: async (id) => {
    const response = await api.post(`/envios/${id}/aceptar`);
    return response.data;
  },

  rechazarEnvio: async (id, motivo = 'Sin motivo especificado') => {
    const response = await api.post(`/envios/${id}/rechazar`, { motivo });
    return response.data;
  },

  marcarEntregado: async (id) => {
    const response = await api.post(`/envios/${id}/entregar`);
    return response.data;
  },

  getByTransportista: async (transportistaId) => {
    const response = await api.get(`/envios/transportista/${transportistaId}`);
    // La API devuelve {success: true, data: [...]}
    return response.data.data || response.data;
  },

  // Alias para compatibilidad con EnviosScreen
  aceptarAsignacion: async (id, transportistaData) => {
    const response = await api.post(`/envios/${id}/aceptar`, {
      transportista_nombre: transportistaData?.nombre || 'Transportista',
      transportista_email: transportistaData?.email || 'sin@email.com'
    });
    return response.data;
  },

  rechazarAsignacion: async (id, motivo) => {
    const response = await api.post(`/envios/${id}/rechazar`, { motivo });
    return response.data;
  },
};

export default api;

