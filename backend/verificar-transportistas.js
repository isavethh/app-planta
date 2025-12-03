const pool = require('./src/config/database');

async function verificarTransportistas() {
    try {
        // Ver usuarios transportistas
        const users = await pool.query(`
            SELECT id, name, email, role, tipo 
            FROM users 
            WHERE role = 'transportista' OR tipo = 'transportista'
            LIMIT 5
        `);
        console.log('Usuarios Transportistas:');
        console.log(JSON.stringify(users.rows, null, 2));

        // Ver asignaciones
        const asignaciones = await pool.query(`
            SELECT ea.*, u.name as transportista_nombre
            FROM envio_asignaciones ea
            JOIN users u ON ea.transportista_id = u.id
            LIMIT 3
        `);
        console.log('\nAsignaciones:');
        console.log(JSON.stringify(asignaciones.rows.map(a => ({
            envio_id: a.envio_id,
            transportista_id: a.transportista_id,
            transportista_nombre: a.transportista_nombre
        })), null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

verificarTransportistas();
