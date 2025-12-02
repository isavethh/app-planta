const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    database: 'Plantalogistica',
    user: 'postgres',
    password: '140105'
});

async function main() {
    await client.connect();
    
    try {
        // Crear envío de prueba con estado 'aceptado'
        const codigo = 'ENV-20251202-PRUEBA' + Date.now().toString().slice(-4);
        
        const result = await client.query(`
            INSERT INTO envios (codigo, almacen_destino_id, estado, created_at, updated_at)
            VALUES ($1, 1, 'aceptado', NOW(), NOW())
            RETURNING id, codigo, estado
        `, [codigo]);
        
        console.log('✅ Envío creado:', result.rows[0]);
        
        // Crear asignación al transportista
        await client.query(`
            INSERT INTO envio_asignaciones (envio_id, transportista_id, vehiculo_id, fecha_asignacion)
            VALUES ($1, 8, 1, NOW())
        `, [result.rows[0].id]);
        
        console.log('✅ Asignación creada para transportista ID 8');
        console.log('\n📱 Ahora el transportista puede aceptar e iniciar este envío desde la app móvil');
        console.log('🌐 Ve a http://localhost:7000/rutas para ver el mapa en tiempo real');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

main();
