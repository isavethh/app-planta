const express = require('express');
const router = express.Router();
const notaVentaController = require('../controllers/notaVentaController');

// Generar nota de venta HTML
router.get('/:id/html', notaVentaController.generarNotaVentaHTML);

// Generar nota de venta desde Laravel (webhook)
router.post('/generar', async (req, res) => {
  try {
    const { envio_id } = req.body;
    
    if (!envio_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'envio_id es requerido' 
      });
    }

    const resultado = await notaVentaController.generarNotaVenta(envio_id);
    
    res.json({
      success: true,
      numero_nota: resultado.nota.numero_nota,
      nota_id: resultado.nota.id,
      envio_codigo: resultado.envio.codigo
    });
  } catch (error) {
    console.error('❌ Error en POST /notas-venta/generar:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
