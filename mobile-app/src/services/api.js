import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL del backend (Laravel) - Servidor en producción
export const API_URL = Platform.OS === 'web' 
  ? 'http://orgtrack2.dasalas.shop/api'  // Para web
  : 'http://orgtrack2.dasalas.shop/api'; // ✅ Servidor Laravel en producción

console.log('🌐 [API] URL configurada:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos (aumentado para dar más tiempo a respuestas lentas)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Configuración adicional para conexiones de red
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Aceptar respuestas 2xx, 3xx y 4xx
  },
  // Configuración para React Native
  adapter: undefined, // Usar el adapter por defecto de React Native
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
let lastNetworkErrorTime = 0;
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [API] Respuesta OK: ${response.config.url}`);
    return response;
  },
  (error) => {
    const now = Date.now();
    // Solo loguear errores de red una vez cada 5 segundos para no saturar
    if (error.code === 'ECONNABORTED') {
      if (now - lastNetworkErrorTime > 5000) {
        console.error('❌ [API] Timeout - El servidor no respondió en 3 segundos');
        lastNetworkErrorTime = now;
      }
    } else if (error.code === 'ERR_NETWORK') {
      if (now - lastNetworkErrorTime > 5000) {
        console.error('❌ [API] Error de red - No se puede conectar al servidor');
        console.error(`   URL: ${API_URL}`);
        console.error(`   Verifica: 1) Laravel corriendo en 0.0.0.0:8001`);
        console.error(`             2) IP correcta en api.js (actual: ${API_URL})`);
        console.error(`             3) Misma red WiFi`);
        console.error(`             4) Firewall puerto 8001 abierto`);
        lastNetworkErrorTime = now;
      }
    } else if (error.response) {
      // Error de respuesta del servidor (4xx, 5xx)
      const status = error.response.status;
      const message = error.response.data?.error || error.response.data?.message || error.message;
      
      if (status === 500) {
        console.error(`❌ [API] Error 500 del servidor: ${message}`);
        console.error(`   URL: ${error.config?.url}`);
        console.error(`   Método: ${error.config?.method?.toUpperCase()}`);
      } else {
        console.error(`❌ [API] Error ${status}: ${message}`);
      }
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
    const response = await api.get(`/transportistas/${id}`);
    return response.data;
  },

  getEnviosAsignados: async (transportistaId) => {
    // Ruta correcta en Laravel: /api/transportista/{id}/envios
    const response = await api.get(`/transportista/${transportistaId}/envios`);
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
    console.log(`📦 [API] Marcando envío ${id} como entregado...`);
    try {
      const response = await api.post(`/envios/${id}/entregado`, {}, {
        timeout: 30000, // 30 segundos específico para esta operación
      });
      console.log(`✅ [API] Envío ${id} marcado como entregado exitosamente`);
      return response.data;
    } catch (error) {
      console.error(`❌ [API] Error marcando envío ${id} como entregado:`, error.message);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout: El servidor no respondió a tiempo. Verifica tu conexión.');
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network request failed')) {
        throw new Error('Error de red: No se puede conectar al servidor. Verifica que Laravel esté corriendo en 0.0.0.0:8001');
      }
      throw error;
    }
  },

  getByTransportista: async (transportistaId) => {
    const url = `${API_URL}/transportista/${transportistaId}/envios`;
    console.log(`🚚 [API] Obteniendo envíos para transportista ID: ${transportistaId}`);
    console.log(`🌐 [API] URL completa: ${url}`);
    
    // Intentar múltiples veces con diferentes métodos
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 [API] Intento ${attempt}/${maxRetries}`);
      
      try {
        // Método 1: Usar axios directamente (más confiable en React Native)
        const response = await api.get(`/transportista/${transportistaId}/envios`, {
          timeout: 15000, // 15 segundos
          validateStatus: (status) => status < 500, // Aceptar 4xx pero no 5xx
        });
        
        console.log(`📥 [API] Status: ${response.status}`);
        
        if (response.status === 200 && response.data) {
          const data = response.data;
          console.log(`✅ [API] Envíos obtenidos:`, data?.data?.length || 0);
          return data?.data || data || [];
        } else if (response.status === 404) {
          console.log(`⚠️ [API] Transportista no encontrado o sin envíos`);
          return [];
        } else {
          console.warn(`⚠️ [API] Status ${response.status}, reintentando...`);
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
        
      } catch (error) {
        lastError = error;
        console.error(`❌ [API] Intento ${attempt} falló:`, error.message);
        
        if (error.code === 'ECONNABORTED') {
          console.error(`⏱️ [API] Timeout - El servidor no respondió a tiempo`);
        } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network request failed')) {
          console.error(`🌐 [API] Error de red - Verificando conectividad...`);
          
          // Intentar ping primero
          try {
            const pingResponse = await api.get('/ping', { timeout: 5000 });
            if (pingResponse.status === 200) {
              console.log(`✅ [API] Ping exitoso, reintentando endpoint...`);
              continue; // Reintentar
            }
          } catch (pingError) {
            console.error(`❌ [API] Ping también falló - Problema de conectividad`);
            console.error(`   URL base: ${API_URL}`);
            console.error(`   Verifica:`);
            console.error(`   1. Mismo WiFi en móvil y PC`);
            console.error(`   2. Firewall puerto 8001 abierto`);
            console.error(`   3. Laravel corriendo: php artisan serve --host=0.0.0.0 --port=8001`);
            
            // Si es el último intento, devolver vacío
            if (attempt === maxRetries) {
              return [];
            }
          }
        }
        
        // Esperar antes de reintentar (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ [API] Esperando ${delay}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    console.error(`❌ [API] Todos los intentos fallaron`);
    if (lastError) {
      console.error(`   Último error:`, lastError.message);
    }
    return [];
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

  reportarIncidente: async (envioId, datos) => {
    console.log(`🚨 [API] Reportando incidente para envío ${envioId}...`);
    try {
      const response = await api.post(`/envios/${envioId}/incidentes`, datos, {
        timeout: 30000,
      });
      console.log(`✅ [API] Incidente reportado exitosamente`);
      return response.data;
    } catch (error) {
      console.error(`❌ [API] Error reportando incidente:`, error.message);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout: El servidor no respondió a tiempo. Verifica tu conexión.');
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network request failed')) {
        throw new Error('Error de red: No se puede conectar al servidor.');
      }
      throw error;
    }
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

  // Obtener notas de entrega de un almacén
  getNotasVentaAlmacen: async (almacenId) => {
    console.log(`📄 [API] Obteniendo notas de entrega del almacén: ${almacenId}`);
    const response = await api.get(`/almacen-app/${almacenId}/notas-venta`);
    console.log(`✅ [API] Notas de entrega recibidas:`, response.data?.data?.length || 0);
    return response.data?.data || [];
  },

  // Obtener detalles de una nota de entrega específica
  getNotaVentaDetalle: async (notaVentaId) => {
    console.log(`📄 [API] Obteniendo detalles de nota de entrega: ${notaVentaId}`);
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
  iniciarRuta: async (rutaId) => {
    console.log(`🛣️ [API] Iniciando ruta: ${rutaId}`);
    // Enviar objeto vacío explícitamente para evitar problemas de JSON
    const body = {};
    console.log(`🛣️ [API] Body a enviar:`, JSON.stringify(body));
    const response = await api.post(`/rutas-entrega/${rutaId}/iniciar`, body);
    return response.data;
  },

  // Registrar llegada a una parada
  registrarLlegada: async (paradaId, ubicacion = {}) => {
    console.log(`🛣️ [API] Registrando llegada a parada: ${paradaId}`);
    const response = await api.post(`/rutas-entrega/paradas/${paradaId}/llegada`, ubicacion);
    return response.data;
  },

  // Completar entrega en una parada
  completarEntrega: async (paradaId, datosEntrega) => {
    console.log(`🛣️ [API] Completando entrega en parada: ${paradaId}`);
    const response = await api.post(`/rutas-entrega/paradas/${paradaId}/entregar`, datosEntrega);
    return response.data;
  },

  // Guardar checklist (salida o entrega)
  guardarChecklist: async (rutaId, checklistData) => {
    console.log(`🛣️ [API] Guardando checklist tipo: ${checklistData.tipo}`);
    
    // Si no hay rutaId pero hay envio_id, es un envío normal
    if (!rutaId && checklistData.envio_id) {
      const response = await api.post(`/rutas-entrega/checklists`, checklistData);
      return response.data;
    }
    
    // Si hay rutaId, es una ruta múltiple
    if (rutaId) {
      const response = await api.post(`/rutas-entrega/${rutaId}/checklists`, checklistData);
      return response.data;
    }
    
    // Fallback: intentar sin rutaId
    const response = await api.post(`/rutas-entrega/checklists`, checklistData);
    return response.data;
  },

  // Subir evidencia (foto)
  subirEvidencia: async (rutaId, paradaId, evidencia) => {
    console.log(`🛣️ [API] Subiendo evidencia para parada: ${paradaId}`);
    const response = await api.post(`/rutas-entrega/${rutaId}/paradas/${paradaId}/evidencias`, evidencia);
    return response.data;
  },

  // Guardar evidencia en base64 (para envíos normales o rutas múltiples)
  guardarEvidenciaBase64: async (evidenciaData) => {
    console.log(`🛣️ [API] Guardando evidencia base64`);
    const response = await api.post(`/rutas-entrega/evidencias/base64`, evidenciaData);
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
