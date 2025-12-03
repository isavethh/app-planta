const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Plantalogistica',
  user: 'postgres',
  password: '1234'
});

async function crearTablasRutas() {
  try {
    console.log('🚛 Creando tablas para sistema de rutas multi-entrega...\n');
    
    // 1. Tabla rutas_entrega
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rutas_entrega (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        transportista_id INTEGER NOT NULL,
        vehiculo_id INTEGER NOT NULL,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        estado VARCHAR(50) DEFAULT 'pendiente',
        hora_salida TIMESTAMP,
        hora_fin TIMESTAMP,
        km_recorridos DECIMAL(10,2) DEFAULT 0,
        total_envios INTEGER DEFAULT 0,
        total_peso DECIMAL(10,2) DEFAULT 0,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla creada: rutas_entrega');
    
    // 2. Tabla ruta_paradas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ruta_paradas (
        id SERIAL PRIMARY KEY,
        ruta_entrega_id INTEGER REFERENCES rutas_entrega(id) ON DELETE CASCADE,
        envio_id INTEGER NOT NULL,
        orden INTEGER NOT NULL,
        estado VARCHAR(50) DEFAULT 'pendiente',
        hora_llegada TIMESTAMP,
        hora_entrega TIMESTAMP,
        latitud DECIMAL(10,7),
        longitud DECIMAL(10,7),
        distancia_km DECIMAL(10,2),
        nombre_receptor VARCHAR(200),
        cargo_receptor VARCHAR(100),
        dni_receptor VARCHAR(50),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla creada: ruta_paradas');
    
    // 3. Tabla checklists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id SERIAL PRIMARY KEY,
        ruta_parada_id INTEGER REFERENCES ruta_paradas(id) ON DELETE CASCADE,
        ruta_entrega_id INTEGER REFERENCES rutas_entrega(id) ON DELETE CASCADE,
        envio_id INTEGER,
        tipo VARCHAR(50) NOT NULL,
        datos JSONB DEFAULT '{}',
        firma_base64 TEXT,
        completado BOOLEAN DEFAULT FALSE,
        completado_at TIMESTAMP,
        completado_por VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla creada: checklists');
    
    // 4. Tabla evidencias_entrega
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evidencias_entrega (
        id SERIAL PRIMARY KEY,
        ruta_parada_id INTEGER REFERENCES ruta_paradas(id) ON DELETE CASCADE,
        checklist_id INTEGER REFERENCES checklists(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        nombre VARCHAR(200),
        url TEXT,
        base64 TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla creada: evidencias_entrega');
    
    // 5. Índices para optimización
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rutas_entrega_transportista ON rutas_entrega(transportista_id);
      CREATE INDEX IF NOT EXISTS idx_rutas_entrega_fecha ON rutas_entrega(fecha);
      CREATE INDEX IF NOT EXISTS idx_rutas_entrega_estado ON rutas_entrega(estado);
      CREATE INDEX IF NOT EXISTS idx_ruta_paradas_ruta ON ruta_paradas(ruta_entrega_id);
      CREATE INDEX IF NOT EXISTS idx_ruta_paradas_envio ON ruta_paradas(envio_id);
      CREATE INDEX IF NOT EXISTS idx_ruta_paradas_estado ON ruta_paradas(estado);
      CREATE INDEX IF NOT EXISTS idx_checklists_ruta_parada ON checklists(ruta_parada_id);
      CREATE INDEX IF NOT EXISTS idx_checklists_tipo ON checklists(tipo);
      CREATE INDEX IF NOT EXISTS idx_evidencias_parada ON evidencias_entrega(ruta_parada_id);
    `);
    console.log('✅ Índices creados');
    
    // 6. Agregar columna ruta_entrega_id a envios si no existe
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'envios' AND column_name = 'ruta_entrega_id'
        ) THEN
          ALTER TABLE envios ADD COLUMN ruta_entrega_id INTEGER;
        END IF;
      END $$;
    `);
    console.log('✅ Columna ruta_entrega_id agregada a envios');
    
    console.log('\n🎉 ¡Todas las tablas creadas exitosamente!');
    console.log('\n📊 Resumen de tablas:');
    console.log('   - rutas_entrega: Rutas multi-entrega del transportista');
    console.log('   - ruta_paradas: Cada parada/destino de la ruta');
    console.log('   - checklists: Verificaciones de salida y entrega');
    console.log('   - evidencias_entrega: Fotos y documentos');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

crearTablasRutas();
