const pool = require('./database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando creación de base de datos...');
    
    await client.query('BEGIN');

    // ============================================
    // TABLAS BASE - SIN DEPENDENCIAS
    // ============================================

    // Tabla de roles de usuario
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla roles creada');

    // Tabla de usuarios (1FN, 2FN, 3FN - datos atómicos, sin dependencias parciales ni transitivas)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        telefono VARCHAR(20),
        rol_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla usuarios creada');

    // Tabla planta (información de la planta principal - siempre será una)
    await client.query(`
      CREATE TABLE IF NOT EXISTS planta (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        direccion VARCHAR(500) NOT NULL,
        ciudad VARCHAR(100) NOT NULL,
        departamento VARCHAR(100) NOT NULL,
        pais VARCHAR(100) NOT NULL,
        latitud DECIMAL(10, 8) NOT NULL,
        longitud DECIMAL(11, 8) NOT NULL,
        telefono VARCHAR(20),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla planta creada');

    // Tabla de direcciones (para puntos de entrega)
    await client.query(`
      CREATE TABLE IF NOT EXISTS direcciones (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        direccion_completa VARCHAR(500) NOT NULL,
        ciudad VARCHAR(100) NOT NULL,
        departamento VARCHAR(100) NOT NULL,
        pais VARCHAR(100) DEFAULT 'Bolivia',
        latitud DECIMAL(10, 8),
        longitud DECIMAL(11, 8),
        referencia TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla direcciones creada');

    // Tabla de almacenes (asociados a usuarios con rol almacén)
    await client.query(`
      CREATE TABLE IF NOT EXISTS almacenes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        direccion_id INTEGER REFERENCES direcciones(id) ON DELETE SET NULL,
        encargado_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        capacidad_maxima DECIMAL(10, 2),
        capacidad_actual DECIMAL(10, 2) DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla almacenes creada');

    // Tabla de categorías de productos (hardcodeado: Verduras y Frutas)
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla categorias creada');

    // Tabla de productos (hardcodeado: 3 por categoría)
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
        descripcion TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla productos creada');

    // Tabla de tipos de empaque
    await client.query(`
      CREATE TABLE IF NOT EXISTS tipos_empaque (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla tipos_empaque creada');

    // Tabla de unidades de medida
    await client.query(`
      CREATE TABLE IF NOT EXISTS unidades_medida (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        abreviatura VARCHAR(10) NOT NULL,
        tipo VARCHAR(50),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla unidades_medida creada');

    // Tabla de tipos de vehículo
    await client.query(`
      CREATE TABLE IF NOT EXISTS tipos_vehiculo (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        capacidad_kg DECIMAL(10, 2),
        capacidad_m3 DECIMAL(10, 2),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla tipos_vehiculo creada');

    // Tabla de vehículos
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehiculos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) UNIQUE NOT NULL,
        marca VARCHAR(100),
        modelo VARCHAR(100),
        anio INTEGER,
        tipo_vehiculo_id INTEGER REFERENCES tipos_vehiculo(id) ON DELETE SET NULL,
        color VARCHAR(50),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla vehiculos creada');

    // Tabla de transportistas (asociados a usuarios con rol transportista)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transportistas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
        licencia VARCHAR(50),
        tipo_licencia VARCHAR(20),
        fecha_vencimiento_licencia DATE,
        vehiculo_asignado_id INTEGER REFERENCES vehiculos(id) ON DELETE SET NULL,
        disponible BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla transportistas creada');

    // Estados de envío
    await client.query(`
      CREATE TABLE IF NOT EXISTS estados_envio (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        color VARCHAR(20),
        orden INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla estados_envio creada');

    // Tabla principal de envíos
    await client.query(`
      CREATE TABLE IF NOT EXISTS envios (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        qr_code TEXT,
        direccion_destino_id INTEGER REFERENCES direcciones(id) ON DELETE SET NULL,
        almacen_destino_id INTEGER REFERENCES almacenes(id) ON DELETE SET NULL,
        estado VARCHAR(50) DEFAULT 'pendiente',
        estado_id INTEGER REFERENCES estados_envio(id) ON DELETE SET NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_programada DATE,
        fecha_estimada_entrega DATE,
        hora_estimada_llegada TIME,
        hora_estimada TIME,
        fecha_entrega TIMESTAMP,
        fecha_inicio_transito TIMESTAMP,
        total_cantidad DECIMAL(10, 2) DEFAULT 0,
        total_peso DECIMAL(10, 3) DEFAULT 0,
        total_precio DECIMAL(12, 2) DEFAULT 0,
        notas TEXT,
        observaciones TEXT,
        created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla envios creada');

    // Detalle de envíos (productos en cada envío - 1FN: datos atómicos por producto)
    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_envios (
        id SERIAL PRIMARY KEY,
        envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
        cantidad DECIMAL(10, 2) NOT NULL,
        peso_por_unidad DECIMAL(10, 3),
        precio_por_unidad DECIMAL(10, 2),
        subtotal DECIMAL(12, 2),
        peso_total DECIMAL(10, 3),
        tipo_empaque_id INTEGER REFERENCES tipos_empaque(id) ON DELETE SET NULL,
        unidad_medida_id INTEGER REFERENCES unidades_medida(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla detalle_envios creada');

    // Asignaciones de envío (vehículo, transportista, tipo empaque)
    await client.query(`
      CREATE TABLE IF NOT EXISTS asignaciones_envio (
        id SERIAL PRIMARY KEY,
        envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE,
        transportista_id INTEGER REFERENCES transportistas(id) ON DELETE SET NULL,
        vehiculo_id INTEGER REFERENCES vehiculos(id) ON DELETE SET NULL,
        tipo_vehiculo_id INTEGER REFERENCES tipos_vehiculo(id) ON DELETE SET NULL,
        fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla asignaciones_envio creada');

    // Seguimiento de envío en tiempo real
    await client.query(`
      CREATE TABLE IF NOT EXISTS seguimiento_envio (
        id SERIAL PRIMARY KEY,
        envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE,
        latitud DECIMAL(10, 8) NOT NULL,
        longitud DECIMAL(11, 8) NOT NULL,
        velocidad DECIMAL(5, 2),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla seguimiento_envio creada');

    // Inventario de almacén
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventario_almacen (
        id SERIAL PRIMARY KEY,
        almacen_id INTEGER REFERENCES almacenes(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
        envio_id INTEGER REFERENCES envios(id) ON DELETE SET NULL,
        cantidad DECIMAL(10, 2) NOT NULL,
        peso_total DECIMAL(10, 3),
        fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(50) DEFAULT 'disponible',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla inventario_almacen creada');

    // Checklist de condiciones del envío
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklist_condiciones (
        id SERIAL PRIMARY KEY,
        envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE,
        almacen_id INTEGER REFERENCES almacenes(id) ON DELETE SET NULL,
        revisado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        estado_general VARCHAR(50),
        productos_completos BOOLEAN,
        empaque_intacto BOOLEAN,
        temperatura_adecuada BOOLEAN,
        sin_danos_visibles BOOLEAN,
        documentacion_completa BOOLEAN,
        observaciones TEXT,
        fecha_revision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla checklist_condiciones creada');

    // ============================================
    // INSERTAR DATOS INICIALES
    // ============================================

    // Roles
    await client.query(`
      INSERT INTO roles (nombre, descripcion) VALUES
      ('admin', 'Administrador del sistema'),
      ('almacen', 'Encargado de almacén'),
      ('transportista', 'Conductor/Transportista')
      ON CONFLICT (nombre) DO NOTHING
    `);
    console.log('Roles insertados');

    // Planta principal (Santa Cruz, Bolivia)
    await client.query(`
      INSERT INTO planta (nombre, direccion, ciudad, departamento, pais, latitud, longitud, telefono, email)
      VALUES (
        '${process.env.PLANTA_NOMBRE || 'Planta Central Applanta'}',
        '${process.env.PLANTA_DIRECCION || 'Av. Cristo Redentor #1500, Zona Norte'}',
        '${process.env.PLANTA_CIUDAD || 'Santa Cruz de la Sierra'}',
        '${process.env.PLANTA_DEPARTAMENTO || 'Santa Cruz'}',
        '${process.env.PLANTA_PAIS || 'Bolivia'}',
        ${process.env.PLANTA_LATITUD || -17.7833},
        ${process.env.PLANTA_LONGITUD || -63.1821},
        '+591 3 3456789',
        'planta@applanta.com'
      )
      ON CONFLICT DO NOTHING
    `);
    console.log('Planta insertada');

    // Categorías hardcodeadas
    await client.query(`
      INSERT INTO categorias (nombre, descripcion) VALUES
      ('Verduras', 'Productos vegetales frescos'),
      ('Frutas', 'Frutas frescas de temporada')
      ON CONFLICT (nombre) DO NOTHING
    `);
    console.log('Categorías insertadas');

    // Productos hardcodeados (3 por categoría)
    await client.query(`
      INSERT INTO productos (nombre, codigo, categoria_id, descripcion) VALUES
      ('Tomate', 'VER-001', (SELECT id FROM categorias WHERE nombre = 'Verduras'), 'Tomate fresco'),
      ('Lechuga', 'VER-002', (SELECT id FROM categorias WHERE nombre = 'Verduras'), 'Lechuga fresca'),
      ('Zanahoria', 'VER-003', (SELECT id FROM categorias WHERE nombre = 'Verduras'), 'Zanahoria fresca'),
      ('Manzana', 'FRU-001', (SELECT id FROM categorias WHERE nombre = 'Frutas'), 'Manzana roja'),
      ('Naranja', 'FRU-002', (SELECT id FROM categorias WHERE nombre = 'Frutas'), 'Naranja dulce'),
      ('Plátano', 'FRU-003', (SELECT id FROM categorias WHERE nombre = 'Frutas'), 'Plátano maduro')
      ON CONFLICT (codigo) DO NOTHING
    `);
    console.log('Productos insertados');

    // Tipos de empaque
    await client.query(`
      INSERT INTO tipos_empaque (nombre, descripcion) VALUES
      ('Caja de cartón', 'Caja de cartón corrugado'),
      ('Bolsa plástica', 'Bolsa de polietileno'),
      ('Canasta', 'Canasta de plástico reutilizable'),
      ('Saco', 'Saco de yute o polipropileno'),
      ('Bandeja', 'Bandeja de poliestireno')
      ON CONFLICT DO NOTHING
    `);
    console.log('Tipos de empaque insertados');

    // Unidades de medida
    await client.query(`
      INSERT INTO unidades_medida (nombre, abreviatura, tipo) VALUES
      ('Kilogramo', 'kg', 'peso'),
      ('Gramo', 'g', 'peso'),
      ('Libra', 'lb', 'peso'),
      ('Unidad', 'und', 'cantidad'),
      ('Docena', 'doc', 'cantidad'),
      ('Caja', 'cja', 'cantidad')
      ON CONFLICT DO NOTHING
    `);
    console.log('Unidades de medida insertadas');

    // Tipos de vehículo
    await client.query(`
      INSERT INTO tipos_vehiculo (nombre, descripcion, capacidad_kg, capacidad_m3) VALUES
      ('Motocicleta', 'Moto para entregas pequeñas', 50, 0.5),
      ('Camioneta', 'Camioneta pickup', 1000, 3),
      ('Furgoneta', 'Furgoneta cerrada', 2000, 8),
      ('Camión pequeño', 'Camión de 3.5 toneladas', 3500, 15),
      ('Camión grande', 'Camión de 10 toneladas', 10000, 40)
      ON CONFLICT DO NOTHING
    `);
    console.log('Tipos de vehículo insertados');

    // Estados de envío
    await client.query(`
      INSERT INTO estados_envio (nombre, descripcion, color, orden) VALUES
      ('pendiente', 'Envío creado, pendiente de asignación', '#ffc107', 1),
      ('asignado', 'Envío asignado a transportista', '#17a2b8', 2),
      ('en_transito', 'Envío en camino', '#007bff', 3),
      ('entregado', 'Envío entregado exitosamente', '#28a745', 4),
      ('cancelado', 'Envío cancelado', '#dc3545', 5)
      ON CONFLICT (nombre) DO NOTHING
    `);
    console.log('Estados de envío insertados');

    // Usuarios de prueba
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await client.query(`
      INSERT INTO usuarios (email, password, nombre, apellido, telefono, rol_id) VALUES
      ('admin@applanta.com', $1, 'Admin', 'Sistema', '+591 70000001', (SELECT id FROM roles WHERE nombre = 'admin')),
      ('almacen@applanta.com', $1, 'Juan', 'Pérez', '+591 70000002', (SELECT id FROM roles WHERE nombre = 'almacen')),
      ('transportista@applanta.com', $1, 'Carlos', 'García', '+591 70000003', (SELECT id FROM roles WHERE nombre = 'transportista'))
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);
    console.log('Usuarios insertados');

    // Direcciones de ejemplo en Santa Cruz
    await client.query(`
      INSERT INTO direcciones (nombre, direccion_completa, ciudad, departamento, latitud, longitud, referencia) VALUES
      ('Mercado Los Pozos', 'Av. Grigotá esq. 3er Anillo, Zona Los Pozos', 'Santa Cruz de la Sierra', 'Santa Cruz', -17.7892, -63.1751, 'Frente al mercado principal'),
      ('Supermercado Hipermaxi Norte', 'Av. Banzer Km 4, Zona Norte', 'Santa Cruz de la Sierra', 'Santa Cruz', -17.7456, -63.1823, 'Centro comercial Las Brisas'),
      ('Almacén Central', 'Calle Sucre #345, Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', -17.7833, -63.1821, 'A dos cuadras de la plaza'),
      ('Distribuidora Sur', 'Av. Santos Dumont #890, Zona Sur', 'Santa Cruz de la Sierra', 'Santa Cruz', -17.8123, -63.1654, 'Diagonal al parque urbano'),
      ('Centro de Acopio Este', 'Av. Virgen de Cotoca #1200, Zona Este', 'Santa Cruz de la Sierra', 'Santa Cruz', -17.7789, -63.1456, 'Cerca del 4to anillo')
      ON CONFLICT DO NOTHING
    `);
    console.log('Direcciones insertadas');

    // Almacén de ejemplo
    await client.query(`
      INSERT INTO almacenes (nombre, codigo, direccion_id, encargado_id, capacidad_maxima) VALUES
      ('Almacén Principal', 'ALM-001', (SELECT id FROM direcciones WHERE nombre = 'Almacén Central' LIMIT 1), (SELECT id FROM usuarios WHERE email = 'almacen@applanta.com' LIMIT 1), 5000)
      ON CONFLICT (codigo) DO NOTHING
    `);
    console.log('Almacén insertado');

    // Vehículos de ejemplo
    await client.query(`
      INSERT INTO vehiculos (placa, marca, modelo, anio, tipo_vehiculo_id, color) VALUES
      ('ABC-123', 'Toyota', 'Hilux', 2022, (SELECT id FROM tipos_vehiculo WHERE nombre = 'Camioneta' LIMIT 1), 'Blanco'),
      ('DEF-456', 'Hyundai', 'H100', 2021, (SELECT id FROM tipos_vehiculo WHERE nombre = 'Furgoneta' LIMIT 1), 'Azul'),
      ('GHI-789', 'Isuzu', 'NPR', 2020, (SELECT id FROM tipos_vehiculo WHERE nombre = 'Camión pequeño' LIMIT 1), 'Rojo')
      ON CONFLICT (placa) DO NOTHING
    `);
    console.log('Vehículos insertados');

    // Transportista de ejemplo
    await client.query(`
      INSERT INTO transportistas (usuario_id, licencia, tipo_licencia, fecha_vencimiento_licencia, vehiculo_asignado_id, disponible) VALUES
      ((SELECT id FROM usuarios WHERE email = 'transportista@applanta.com' LIMIT 1), 'LIC-12345', 'B', '2026-12-31', (SELECT id FROM vehiculos WHERE placa = 'ABC-123' LIMIT 1), true)
      ON CONFLICT DO NOTHING
    `);
    console.log('Transportista insertado');

    await client.query('COMMIT');
    console.log('Base de datos inicializada correctamente');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Inicialización completada');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = initDatabase;
