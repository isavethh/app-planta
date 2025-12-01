const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Plantalogistica',
  user: 'postgres',
  password: '1234'
});

async function generarNotasRetroactivas() {
  try {
    console.log('🔄 Buscando envíos sin nota de venta...\n');
    
    // Buscar envíos aceptados sin nota de venta
    const enviosSinNota = await pool.query(`
      SELECT e.* 
      FROM envios e
      LEFT JOIN notas_venta nv ON e.id = nv.envio_id
      WHERE e.estado IN ('aceptado', 'en_transito', 'entregado')
      AND nv.id IS NULL
      ORDER BY e.id
    `);
    
    console.log(`📦 Encontrados ${enviosSinNota.rows.length} envíos sin nota de venta\n`);
    
    for (const envio of enviosSinNota.rows) {
      console.log(`Generando nota para envío ${envio.codigo}...`);
      
      // Obtener productos del envío
      const productos = await pool.query(`
        SELECT 
          producto_nombre,
          cantidad,
          precio_unitario,
          peso_unitario,
          total_peso
        FROM envio_productos
        WHERE envio_id = $1
      `, [envio.id]);
      
      // Obtener almacen destino
      const almacen = await pool.query(`
        SELECT nombre, direccion_completa as direccion 
        FROM almacenes 
        WHERE id = $1
      `, [envio.almacen_destino_id]);
      
      // Calcular totales
      let totalCantidad = 0;
      let totalPrecio = 0;
      
      productos.rows.forEach(prod => {
        totalCantidad += parseInt(prod.cantidad) || 0;
        totalPrecio += parseFloat(prod.precio_unitario) * parseInt(prod.cantidad) || 0;
      });
      
      // Generar número de nota
      const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const numeroNota = `NV-${fecha}-${envio.codigo}`;
      
      // Insertar nota de venta
      await pool.query(`
        INSERT INTO notas_venta (
          numero_nota, 
          envio_id, 
          fecha_emision, 
          almacen_nombre, 
          almacen_direccion,
          total_cantidad, 
          total_precio,
          observaciones,
          created_at,
          updated_at
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        numeroNota,
        envio.id,
        almacen.rows[0]?.nombre || 'N/A',
        almacen.rows[0]?.direccion || 'N/A',
        totalCantidad,
        totalPrecio,
        `Nota generada retroactivamente para envío ${envio.estado}`
      ]);
      
      console.log(`✅ Nota ${numeroNota} creada exitosamente\n`);
    }
    
    console.log('🎉 Proceso completado!');
    
    // Mostrar resumen final
    const totalNotas = await pool.query('SELECT COUNT(*) FROM notas_venta');
    console.log(`\n📊 Total de notas de venta: ${totalNotas.rows[0].count}`);
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    pool.end();
  }
}

generarNotasRetroactivas();
