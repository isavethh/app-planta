const pool = require('./src/config/database');

async function main() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Crear envío de prueba con estado 'asignado' (SIN ruta_entrega_id)
        const codigo = 'ENV-PRUEBA-' + Date.now().toString().slice(-6);
        
        const result = await client.query(`
            INSERT INTO envios (codigo, almacen_destino_id, estado, total_cantidad, total_peso, created_at, updated_at)
            VALUES ($1, 2, 'asignado', 3, 5.5, NOW(), NOW())
            RETURNING id, codigo, estado
        `, [codigo]);
        
        console.log('📦 Envío creado:', result.rows[0]);
        
        // Crear asignación al transportista 1
        await client.query(`
            INSERT INTO envio_asignaciones (envio_id, transportista_id, vehiculo_id, fecha_asignacion)
            VALUES ($1, 1, 1, NOW())
        `, [result.rows[0].id]);
        
        await client.query('COMMIT');
        
        console.log('✅ Asignación creada para transportista ID 1');
        console.log('\n📱 Ahora el transportista puede ver este envío en la app móvil');
        console.log('   - Código:', result.rows[0].codigo);
        console.log('   - Estado: asignado');
        console.log('\n👉 Recarga la app (presiona R) para ver el nuevo envío');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

main();
