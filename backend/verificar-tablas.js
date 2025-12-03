const pool = require('./src/config/database');

async function verificar() {
    try {
        // Verificar tablas de rutas
        const tablas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%ruta%'
        `);
        
        console.log('\n📋 Tablas de rutas encontradas:');
        tablas.rows.forEach(t => console.log('  ✅', t.table_name));
        
        if (tablas.rows.length === 0) {
            console.log('  ❌ No se encontraron tablas de rutas');
            console.log('\n⚠️ Ejecuta primero: node crear-tablas-rutas.js');
            process.exit(1);
        }
        
        // Verificar estructura de rutas_entrega
        const columnas = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'rutas_entrega'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Columnas de rutas_entrega:');
        columnas.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? '(NOT NULL)' : ''}`));
        
        // Verificar estructura de ruta_paradas
        const columnas2 = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'ruta_paradas'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Columnas de ruta_paradas:');
        columnas2.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
        
        // Verificar relación con users (transportistas)
        const transportistas = await pool.query(`
            SELECT id, name, tipo, email 
            FROM users 
            WHERE tipo = 'transportista' OR role = 'transportista'
            LIMIT 5
        `);
        
        console.log('\n👤 Transportistas disponibles:');
        transportistas.rows.forEach(t => console.log(`  - ID ${t.id}: ${t.name} (${t.tipo || 'sin tipo'})`));
        
        // Verificar vehículos
        const vehiculos = await pool.query(`
            SELECT id, placa, disponible 
            FROM vehiculos 
            WHERE disponible = true
            LIMIT 5
        `);
        
        console.log('\n🚛 Vehículos disponibles:');
        vehiculos.rows.forEach(v => console.log(`  - ID ${v.id}: ${v.placa}`));
        
        // Verificar envíos pendientes
        const envios = await pool.query(`
            SELECT id, codigo, estado, ruta_entrega_id
            FROM envios 
            WHERE estado IN ('pendiente', 'asignado')
            AND ruta_entrega_id IS NULL
            LIMIT 5
        `);
        
        console.log('\n📦 Envíos disponibles para asignar:');
        envios.rows.forEach(e => console.log(`  - ID ${e.id}: ${e.codigo} (${e.estado})`));
        
        if (envios.rows.length === 0) {
            console.log('  ⚠️ No hay envíos pendientes sin ruta asignada');
        }
        
        console.log('\n✅ Verificación completada\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        pool.end();
    }
}

verificar();
