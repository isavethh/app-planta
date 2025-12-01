const pool = require('../config/database');

// Obtener estadísticas generales del almacén
const getEstadisticasAlmacen = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📊 Obteniendo estadísticas para almacén:', id);

    // Total de envíos
    const totalEnvios = await pool.query(`
      SELECT COUNT(*)::integer as total
      FROM envios
      WHERE almacen_destino_id = $1
    `, [id]);

    // Total de notas de venta
    const totalNotas = await pool.query(`
      SELECT COUNT(*)::integer as total
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      WHERE e.almacen_destino_id = $1
    `, [id]);

    // Suma total de compras - usando COALESCE para manejar NULL
    const totalCompras = await pool.query(`
      SELECT COALESCE(SUM(CAST(nv.total_precio AS NUMERIC)), 0) as total
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      WHERE e.almacen_destino_id = $1
    `, [id]);

    // Envíos por estado
    const enviosPorEstado = await pool.query(`
      SELECT estado, COUNT(*) as cantidad
      FROM envios
      WHERE almacen_destino_id = $1
      GROUP BY estado
      ORDER BY cantidad DESC
    `, [id]);

    // Compras por mes (últimos 6 meses)
    const comprasPorMes = await pool.query(`
      SELECT 
        TO_CHAR(nv.created_at, 'YYYY-MM') as mes,
        TO_CHAR(nv.created_at, 'Month YYYY') as mes_nombre,
        COUNT(*)::integer as cantidad_notas,
        COALESCE(SUM(CAST(nv.total_precio AS NUMERIC)), 0) as total_compras
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      WHERE e.almacen_destino_id = $1
        AND nv.created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(nv.created_at, 'YYYY-MM'), TO_CHAR(nv.created_at, 'Month YYYY')
      ORDER BY mes DESC
    `, [id]);

    // Compras por día (últimos 30 días)
    const comprasPorDia = await pool.query(`
      SELECT 
        DATE(nv.created_at) as fecha,
        TO_CHAR(nv.created_at, 'DD/MM/YYYY') as fecha_formato,
        COUNT(*)::integer as cantidad_notas,
        COALESCE(SUM(CAST(nv.total_precio AS NUMERIC)), 0) as total_compras
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      WHERE e.almacen_destino_id = $1
        AND nv.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(nv.created_at), TO_CHAR(nv.created_at, 'DD/MM/YYYY')
      ORDER BY fecha DESC
    `, [id]);

    // Top productos más comprados
    const topProductos = await pool.query(`
      SELECT 
        ep.producto_nombre,
        SUM(ep.cantidad)::integer as total_cantidad,
        COALESCE(SUM(CAST(ep.total_precio AS NUMERIC)), 0) as total_valor
      FROM envio_productos ep
      INNER JOIN envios e ON ep.envio_id = e.id
      WHERE e.almacen_destino_id = $1
      GROUP BY ep.producto_nombre
      ORDER BY total_cantidad DESC
      LIMIT 10
    `, [id]);

    console.log('✅ Estadísticas obtenidas correctamente');

    res.json({
      success: true,
      data: {
        resumen: {
          total_envios: parseInt(totalEnvios.rows[0]?.total || 0),
          total_notas: parseInt(totalNotas.rows[0]?.total || 0),
          total_compras: parseFloat(totalCompras.rows[0]?.total || 0)
        },
        envios_por_estado: enviosPorEstado.rows || [],
        compras_por_mes: comprasPorMes.rows || [],
        compras_por_dia: comprasPorDia.rows || [],
        top_productos: topProductos.rows || []
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas del almacén',
      message: error.message
    });
  }
};

module.exports = {
  getEstadisticasAlmacen
};
