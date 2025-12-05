const pool = require('./src/config/database');

async function checkEnvios() {
    try {
        // Ver los envíos específicos de la imagen
        const envios = await pool.query(`
            SELECT e.id, e.codigo, e.estado, e.ruta_entrega_id, ae.transportista_id 
            FROM envios e 
            LEFT JOIN envio_asignaciones ae ON e.id = ae.envio_id 
            WHERE e.codigo IN ('ENV-20251202-A2C2FE', 'ENV-20251202-742862')
        `);
        
        console.log('\n📦 Envíos de la imagen:');
        console.table(envios.rows);

        // Ver qué transportista es eduardo
        const eduardo = await pool.query(`SELECT id, name FROM users WHERE name ILIKE '%eduardo%'`);
        console.log('\n👤 Usuario Eduardo:');
        console.table(eduardo.rows);

        // Ver ruta 6
        const ruta6 = await pool.query(`SELECT id, codigo, estado, transportista_id FROM rutas_entrega WHERE id = 6`);
        console.log('\n🛣️ Ruta 6:');
        console.table(ruta6.rows);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkEnvios();
