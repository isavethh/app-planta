const pool = require('./src/config/database');

async function listarTablas() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('Tablas en la base de datos:');
        result.rows.forEach(row => console.log('  -', row.table_name));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

listarTablas();
