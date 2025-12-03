import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL del backend - CONECTADO A NODE.JS (puerto 3001)
// Node.js consulta PostgreSQL (BD: Plantalogistica)
// IMPORTANTE: Asegúrate de que Node.js esté corriendo en puerto 3001
export const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:3001/api'  // Para web
  : 'http://192.168.0.129:3001/api'; // ✅ IP CORRECTA DE TU PC EN NUEVO WIFI

console.log('🌐 [API] URL configurada:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
  async (config) => {
    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ [API] Error en request:', error.message);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [API] Respuesta OK: ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ [API] Timeout - El servidor no respondió a tiempo');
    } else if (error.code === 'ERR_NETWORK') {
      console.error('❌ [API] Error de red - No se puede conectar al servidor');
    } else {
      console.error('❌ [API] Error:', error.message);
    }
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
    try {
      console.log(`🚚 [API] Obteniendo envíos para transportista ID: ${transportistaId}`);
      const response = await api.get(`/envios/transportista/${transportistaId}`);
      console.log(`✅ [API] Envíos obtenidos:`, response.data?.data?.length || 0);
      // La API devuelve {success: true, data: [...]}
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error(`❌ [API] Error obteniendo envíos del transportista:`, error.message);
      // Devolver array vacío en lugar de lanzar error
      return [];
    }
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

// Servicios de almacén
export const almacenService = {
  // Obtener estadísticas del almacén
  getEstadisticas: async (almacenId) => {
    console.log(`📊 [API] Obteniendo estadísticas del almacén: ${almacenId}`);
    const response = await api.get(`/almacen-app/${almacenId}/estadisticas`);
    console.log(`✅ [API] Estadísticas recibidas`);
    return response.data?.data || null;
  },
  
  // Obtener envíos asignados a un almacén
  getEnviosAlmacen: async (almacenId) => {
    console.log(`📦 [API] Obteniendo envíos del almacén: ${almacenId}`);
    const response = await api.get(`/almacen-app/${almacenId}/envios`);
    console.log(`✅ [API] Envíos recibidos:`, response.data?.data?.length || 0);
    return response.data?.data || [];
  },

  // Obtener notas de venta de un almacén
  getNotasVentaAlmacen: async (almacenId) => {
    console.log(`📄 [API] Obteniendo notas de venta del almacén: ${almacenId}`);
    const response = await api.get(`/almacen-app/${almacenId}/notas-venta`);
    console.log(`✅ [API] Notas de venta recibidas:`, response.data?.data?.length || 0);
    return response.data?.data || [];
  },

  // Obtener detalles de una nota de venta específica
  getNotaVentaDetalle: async (notaVentaId) => {
    console.log(`📄 [API] Obteniendo detalles de nota de venta: ${notaVentaId}`);
    const response = await api.get(`/almacen-app/nota-venta/${notaVentaId}`);
    return response.data?.data || null;
  },
};

// Servicios de Rutas Multi-Entrega
export const rutasMultiService = {
  // Listar todas las rutas
  listarRutas: async (params = {}) => {
    console.log('🛣️ [API] Listando rutas multi-entrega');
    const response = await api.get('/rutas-entrega', { params });
    return response.data;
  },

  // Listar rutas de un transportista específico
  listarPorTransportista: async (transportistaId) => {
    console.log(`🛣️ [API] Listando rutas del transportista: ${transportistaId}`);
    const response = await api.get(`/rutas-entrega/transportista/${transportistaId}`);
    return response.data;
  },

  // Obtener detalle de una ruta
  obtenerRuta: async (rutaId) => {
    console.log(`🛣️ [API] Obteniendo ruta: ${rutaId}`);
    const response = await api.get(`/rutas-entrega/${rutaId}`);
    return response.data;
  },

  // Aceptar ruta multi-entrega
  aceptarRuta: async (rutaId, transportistaData = {}) => {
    console.log(`🛣️ [API] Aceptando ruta: ${rutaId}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/aceptar`, transportistaData);
    return response.data;
  },

  // Rechazar ruta multi-entrega
  rechazarRuta: async (rutaId, motivo) => {
    console.log(`🛣️ [API] Rechazando ruta: ${rutaId}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/rechazar`, { motivo });
    return response.data;
  },

  // Obtener resumen de una ruta (para PDF)
  obtenerResumen: async (rutaId) => {
    console.log(`🛣️ [API] Obteniendo resumen de ruta: ${rutaId}`);
    const response = await api.get(`/rutas-entrega/${rutaId}/resumen`);
    return response.data;
  },

  // Iniciar una ruta
  iniciarRuta: async (rutaId, ubicacion = {}) => {
    console.log(`🛣️ [API] Iniciando ruta: ${rutaId}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/iniciar`, ubicacion);
    return response.data;
  },

  // Registrar llegada a una parada
  registrarLlegada: async (rutaId, paradaId, ubicacion = {}) => {
    console.log(`🛣️ [API] Registrando llegada a parada: ${paradaId}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/paradas/${paradaId}/llegada`, ubicacion);
    return response.data;
  },

  // Completar entrega en una parada
  completarEntrega: async (rutaId, paradaId, datosEntrega) => {
    console.log(`🛣️ [API] Completando entrega en parada: ${paradaId}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/paradas/${paradaId}/entregar`, datosEntrega);
    return response.data;
  },

  // Guardar checklist (salida o entrega)
  guardarChecklist: async (rutaId, checklistData) => {
    console.log(`🛣️ [API] Guardando checklist tipo: ${checklistData.tipo}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/checklists`, checklistData);
    return response.data;
  },

  // Subir evidencia (foto)
  subirEvidencia: async (rutaId, paradaId, evidencia) => {
    console.log(`🛣️ [API] Subiendo evidencia para parada: ${paradaId}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/paradas/${paradaId}/evidencias`, evidencia);
    return response.data;
  },

  // Obtener template de checklist
  obtenerChecklistTemplate: async (tipo = 'salida') => {
    console.log(`🛣️ [API] Obteniendo template de checklist: ${tipo}`);
    const response = await api.get(`/rutas-entrega/checklists/template/${tipo}`);
    return response.data;
  },

  // Actualizar ubicación en tiempo real
  actualizarUbicacion: async (rutaId, ubicacion) => {
    const response = await api.post(`/rutas-entrega/${rutaId}/ubicacion`, ubicacion);
    return response.data;
  },
};

// Servicios de Incidentes
export const incidenteService = {
  // Reportar un incidente
  reportar: async (incidenteData) => {
    console.log('⚠️ [API] Reportando incidente');
    const response = await api.post('/incidentes', incidenteData);
    return response.data;
  },

  // Listar incidentes
  listar: async (params = {}) => {
    console.log('⚠️ [API] Listando incidentes');
    const response = await api.get('/incidentes', { params });
    return response.data;
  },

  // Obtener detalle de incidente
  obtener: async (incidenteId) => {
    console.log(`⚠️ [API] Obteniendo incidente: ${incidenteId}`);
    const response = await api.get(`/incidentes/${incidenteId}`);
    return response.data;
  },
};

export default api;

