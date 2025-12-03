const pool = require('./src/config/database');

async function test() {
    try {
        // Transportistas
        const t = await pool.query("SELECT id, name, tipo, disponible FROM users WHERE tipo = 'transportista'");
        console.log('\nTransportistas:');
        t.rows.forEach(r => console.log(`  ID ${r.id}: ${r.name} - disponible: ${r.disponible}`));
        
        // Vehículos
        const v = await pool.query("SELECT id, placa, disponible FROM vehiculos");
        console.log('\nVehículos:');
        v.rows.forEach(r => console.log(`  ID ${r.id}: ${r.placa} - disponible: ${r.disponible}`));
        
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}
test();
