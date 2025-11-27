const pool = require('./database');
const QRCode = require('qrcode');

const crearEnviosPrueba = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Creando envíos de prueba...');
    
    await client.query('BEGIN');

    // Obtener IDs necesarios
    const almacenResult = await client.query('SELECT id FROM almacenes WHERE codigo = $1 LIMIT 1', ['ALM-001']);
    const transportistaResult = await client.query('SELECT id FROM transportistas LIMIT 1');
    const vehiculoResult = await client.query('SELECT id FROM vehiculos WHERE placa = $1 LIMIT 1', ['ABC-123']);
    const direccionResult = await client.query('SELECT id FROM direcciones LIMIT 1');
    const productoResults = await client.query('SELECT id, nombre FROM productos LIMIT 3');

    if (almacenResult.rows.length === 0 || transportistaResult.rows.length === 0) {
      console.error('No se encontraron almacenes o transportistas');
      return;
    }

    const almacen_id = almacenResult.rows[0].id;
    const transportista_id = transportistaResult.rows[0].id;
    const vehiculo_id = vehiculoResult.rows[0]?.id;
    const direccion_id = direccionResult.rows[0]?.id;

    // Crear 3 envíos de prueba
    for (let i = 1; i <= 3; i++) {
      const codigo = `ENV-2024-${String(i).padStart(4, '0')}`;
      
      // Crear envío
      const envioResult = await client.query(`
        INSERT INTO envios (
          codigo, 
          almacen_destino_id,
          direccion_destino_id,
          estado,
          fecha_creacion,
          fecha_estimada_entrega,
          hora_estimada,
          total_cantidad,
          total_peso,
          total_precio,
          observaciones
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 day', '14:00:00', 100, 50.5, 250.00, $5)
        RETURNING *
      `, [
        codigo,
        almacen_id,
        direccion_id,
        'asignado',
        `Envío de prueba número ${i}`
      ]);

      const envio = envioResult.rows[0];
      console.log(`✅ Envío creado: ${codigo} (ID: ${envio.id})`);

      // Agregar productos al envío
      for (const producto of productoResults.rows) {
        await client.query(`
          INSERT INTO detalle_envios (
            envio_id,
            producto_id,
            cantidad,
            peso_por_unidad,
            precio_por_unidad,
            subtotal,
            peso_total
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          envio.id,
          producto.id,
          10 + i * 5, // Cantidad variable
          0.5,
          5.00,
          (10 + i * 5) * 5.00,
          (10 + i * 5) * 0.5
        ]);
      }

      // Crear asignación a transportista
      await client.query(`
        INSERT INTO asignaciones_envio (
          envio_id,
          transportista_id,
          vehiculo_id,
          fecha_asignacion
        )
        VALUES ($1, $2, $3, NOW())
      `, [envio.id, transportista_id, vehiculo_id]);

      console.log(`   📦 Productos agregados`);
      console.log(`   🚚 Asignado a transportista ID: ${transportista_id}`);
    }

    await client.query('COMMIT');
    console.log('✅ Envíos de prueba creados correctamente');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear envíos de prueba:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  crearEnviosPrueba()
    .then(() => {
      console.log('Proceso completado');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = crearEnviosPrueba;

