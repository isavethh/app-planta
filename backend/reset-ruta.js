const pool = require('./src/config/database');

async function reset() {
  try {
    // Resetear la ruta 8 a 'aceptada'
    await pool.query(`UPDATE rutas_entrega SET estado = 'aceptada', hora_salida = NULL WHERE id = 8`);
    
    // Eliminar checklists de la ruta 8
    await pool.query(`DELETE FROM checklists WHERE ruta_entrega_id = 8`);
    
    // Resetear las paradas
    await pool.query(`UPDATE ruta_paradas SET estado = 'pendiente', hora_llegada = NULL WHERE ruta_entrega_id = 8`);
    
    console.log('✅ Ruta 8 reseteada correctamente');
    
    const r = await pool.query('SELECT id, estado FROM rutas_entrega WHERE id = 8');
    console.log('Nuevo estado:', r.rows[0]);
    
    pool.end();
  } catch (e) {
    console.error('Error:', e);
    pool.end();
  }
}

reset();
