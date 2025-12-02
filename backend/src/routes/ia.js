const express = require('express');
const router = express.Router();
const axios = require('axios');

const IA_SERVICE_URL = process.env.IA_SERVICE_URL || 'http://127.0.0.1:5000';

// Proxy para predicción de demanda
router.get('/prediccion-demanda', async (req, res) => {
  try {
    console.log('🤖 Consultando predicción de demanda...');
    const response = await axios.get(`${IA_SERVICE_URL}/api/ia/prediccion-demanda`);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error al consultar IA:', error.message);
    res.status(500).json({
      success: false,
      error: 'Servicio de IA no disponible',
      message: error.message
    });
  }
});

// Proxy para transportista óptimo
router.post('/transportista-optimo', async (req, res) => {
  try {
    console.log('🤖 Consultando transportista óptimo...');
    const response = await axios.post(`${IA_SERVICE_URL}/api/ia/transportista-optimo`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error al consultar IA:', error.message);
    res.status(500).json({
      success: false,
      error: 'Servicio de IA no disponible',
      message: error.message
    });
  }
});

// Proxy para detección de anomalías
router.get('/detectar-anomalias', async (req, res) => {
  try {
    console.log('🤖 Detectando anomalías...');
    const response = await axios.get(`${IA_SERVICE_URL}/api/ia/detectar-anomalias`);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error al consultar IA:', error.message);
    res.status(500).json({
      success: false,
      error: 'Servicio de IA no disponible',
      message: error.message
    });
  }
});

// Proxy para insights de almacén
router.get('/insights-almacen/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🤖 Generando insights para almacén:', id);
    const response = await axios.get(`${IA_SERVICE_URL}/api/ia/insights-almacen/${id}`);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error al consultar IA:', error.message);
    res.status(500).json({
      success: false,
      error: 'Servicio de IA no disponible',
      message: error.message
    });
  }
});

module.exports = router;
