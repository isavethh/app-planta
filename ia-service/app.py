from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import os
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import Counter

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'Plantalogistica'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}

def get_db_connection():
    """Obtener conexión a la base de datos"""
    return psycopg2.connect(**DB_CONFIG)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check del servicio"""
    return jsonify({
        'status': 'ok',
        'service': 'IA Planta Logística',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/ia/prediccion-demanda', methods=['GET'])
def prediccion_demanda():
    """
    Predice la demanda de productos basándose en histórico
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obtener histórico de productos de los últimos 90 días
        cursor.execute("""
            SELECT 
                ep.producto_nombre,
                COUNT(*) as frecuencia,
                SUM(ep.cantidad) as cantidad_total,
                AVG(ep.cantidad) as promedio_cantidad,
                DATE_TRUNC('week', e.created_at) as semana
            FROM envio_productos ep
            INNER JOIN envios e ON ep.envio_id = e.id
            WHERE e.created_at >= NOW() - INTERVAL '90 days'
            GROUP BY ep.producto_nombre, DATE_TRUNC('week', e.created_at)
            ORDER BY semana DESC, cantidad_total DESC
        """)
        
        resultados = cursor.fetchall()
        
        # Procesar datos
        productos_dict = {}
        for row in resultados:
            producto = row[0]
            if producto not in productos_dict:
                productos_dict[producto] = {
                    'nombre': producto,
                    'frecuencia_total': 0,
                    'cantidad_total': 0,
                    'tendencia': []
                }
            
            productos_dict[producto]['frecuencia_total'] += row[1]
            productos_dict[producto]['cantidad_total'] += row[2]
            productos_dict[producto]['tendencia'].append(row[2])
        
        # Calcular predicciones
        predicciones = []
        for producto, datos in productos_dict.items():
            # Calcular tendencia simple (últimas 4 semanas)
            tendencia_reciente = datos['tendencia'][:4] if len(datos['tendencia']) >= 4 else datos['tendencia']
            promedio_semanal = sum(tendencia_reciente) / len(tendencia_reciente) if tendencia_reciente else 0
            
            # Determinar si está creciendo o decreciendo
            if len(tendencia_reciente) >= 2:
                cambio = tendencia_reciente[0] - tendencia_reciente[-1]
                porcentaje_cambio = (cambio / tendencia_reciente[-1] * 100) if tendencia_reciente[-1] > 0 else 0
            else:
                porcentaje_cambio = 0
            
            predicciones.append({
                'producto': producto,
                'demanda_semanal_estimada': round(promedio_semanal, 2),
                'demanda_mensual_estimada': round(promedio_semanal * 4, 2),
                'frecuencia_pedidos': datos['frecuencia_total'],
                'tendencia': 'creciente' if porcentaje_cambio > 5 else 'decreciente' if porcentaje_cambio < -5 else 'estable',
                'cambio_porcentual': round(porcentaje_cambio, 2),
                'prioridad': 'alta' if promedio_semanal > 50 else 'media' if promedio_semanal > 20 else 'baja'
            })
        
        # Ordenar por demanda
        predicciones.sort(key=lambda x: x['demanda_semanal_estimada'], reverse=True)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'predicciones': predicciones[:20],  # Top 20
            'fecha_analisis': datetime.now().isoformat(),
            'periodo_analizado': '90 días'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ia/transportista-optimo', methods=['POST'])
def recomendar_transportista():
    """
    Recomienda el transportista óptimo para un envío basándose en:
    - Desempeño histórico
    - Tasa de entregas exitosas
    - Tiempo promedio de entrega
    - Disponibilidad
    """
    try:
        data = request.json
        almacen_id = data.get('almacen_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obtener estadísticas de transportistas
        cursor.execute("""
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(ea.id) as total_envios,
                SUM(CASE WHEN e.estado = 'entregado' THEN 1 ELSE 0 END) as entregas_exitosas,
                SUM(CASE WHEN e.estado = 'cancelado' THEN 1 ELSE 0 END) as envios_cancelados,
                AVG(EXTRACT(EPOCH FROM (e.updated_at - e.created_at))/3600) as horas_promedio
            FROM users u
            LEFT JOIN envio_asignaciones ea ON u.id = ea.transportista_id
            LEFT JOIN envios e ON ea.envio_id = e.id
            WHERE u.tipo = 'transportista'
            GROUP BY u.id, u.name, u.email
            HAVING COUNT(ea.id) > 0
            ORDER BY 
                (SUM(CASE WHEN e.estado = 'entregado' THEN 1 ELSE 0 END)::float / COUNT(ea.id)) DESC,
                COUNT(ea.id) DESC
        """)
        
        transportistas = cursor.fetchall()
        
        recomendaciones = []
        for row in transportistas:
            total_envios = row[3]
            entregas_exitosas = row[4]
            envios_cancelados = row[5]
            horas_promedio = row[6] or 0
            
            # Calcular tasa de éxito
            tasa_exito = (entregas_exitosas / total_envios * 100) if total_envios > 0 else 0
            
            # Calcular score (0-100)
            score = (
                tasa_exito * 0.5 +  # 50% peso a tasa de éxito
                min((total_envios / 10) * 20, 20) +  # 20% peso a experiencia (máx 10 envíos = 20 puntos)
                max(30 - (horas_promedio / 24 * 10), 0)  # 30% peso a rapidez
            )
            
            recomendaciones.append({
                'transportista_id': row[0],
                'nombre': row[1],
                'email': row[2],
                'score': round(score, 2),
                'estadisticas': {
                    'total_envios': total_envios,
                    'entregas_exitosas': entregas_exitosas,
                    'tasa_exito': round(tasa_exito, 2),
                    'tiempo_promedio_horas': round(horas_promedio, 2),
                    'envios_cancelados': envios_cancelados
                },
                'recomendacion': 'excelente' if score >= 80 else 'bueno' if score >= 60 else 'regular'
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'recomendaciones': recomendaciones,
            'mejor_opcion': recomendaciones[0] if recomendaciones else None
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ia/detectar-anomalias', methods=['GET'])
def detectar_anomalias():
    """
    Detecta envíos con comportamiento anómalo:
    - Precios inusuales
    - Tiempos de entrega excesivos
    - Patrones sospechosos
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obtener estadísticas generales
        cursor.execute("""
            SELECT 
                AVG(total_precio) as precio_promedio,
                STDDEV(total_precio) as precio_stddev,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as horas_promedio,
                STDDEV(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as horas_stddev
            FROM envios
            WHERE estado IN ('entregado', 'en_transito')
        """)
        
        stats = cursor.fetchone()
        precio_promedio = stats[0] or 0
        precio_stddev = stats[1] or 0
        horas_promedio = stats[2] or 0
        horas_stddev = stats[3] or 0
        
        # Detectar envíos anómalos (más de 2 desviaciones estándar)
        cursor.execute("""
            SELECT 
                e.id,
                e.codigo,
                e.estado,
                e.total_precio,
                e.created_at,
                e.updated_at,
                a.nombre as almacen_nombre,
                u.name as transportista_nombre,
                EXTRACT(EPOCH FROM (e.updated_at - e.created_at))/3600 as horas_transcurridas
            FROM envios e
            LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
            LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
            LEFT JOIN users u ON ea.transportista_id = u.id
            WHERE 
                e.total_precio > %s + (2 * %s)
                OR e.total_precio < %s - (2 * %s)
                OR (EXTRACT(EPOCH FROM (e.updated_at - e.created_at))/3600) > %s + (2 * %s)
            ORDER BY e.created_at DESC
            LIMIT 50
        """, (precio_promedio, precio_stddev, precio_promedio, precio_stddev, 
              horas_promedio, horas_stddev))
        
        anomalias = []
        for row in cursor.fetchall():
            tipo_anomalia = []
            
            # Verificar precio anómalo
            if row[3] > precio_promedio + (2 * precio_stddev):
                tipo_anomalia.append('precio_alto')
            elif row[3] < precio_promedio - (2 * precio_stddev):
                tipo_anomalia.append('precio_bajo')
            
            # Verificar tiempo anómalo
            if row[8] > horas_promedio + (2 * horas_stddev):
                tipo_anomalia.append('tiempo_excesivo')
            
            anomalias.append({
                'envio_id': row[0],
                'codigo': row[1],
                'estado': row[2],
                'precio': float(row[3]) if row[3] else 0,
                'almacen': row[6],
                'transportista': row[7],
                'horas_transcurridas': round(row[8], 2),
                'tipo_anomalia': tipo_anomalia,
                'severidad': 'alta' if len(tipo_anomalia) > 1 else 'media',
                'fecha_deteccion': datetime.now().isoformat()
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'anomalias': anomalias,
            'total_anomalias': len(anomalias),
            'estadisticas_base': {
                'precio_promedio': round(precio_promedio, 2),
                'tiempo_promedio_horas': round(horas_promedio, 2)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ia/insights-almacen/<int:almacen_id>', methods=['GET'])
def insights_almacen(almacen_id):
    """
    Genera insights inteligentes para un almacén específico
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Productos más vendidos
        cursor.execute("""
            SELECT 
                ep.producto_nombre,
                SUM(ep.cantidad) as total_vendido,
                COUNT(DISTINCT e.id) as num_envios,
                SUM(ep.total_precio) as ingresos_totales
            FROM envio_productos ep
            INNER JOIN envios e ON ep.envio_id = e.id
            WHERE e.almacen_destino_id = %s
                AND e.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY ep.producto_nombre
            ORDER BY total_vendido DESC
            LIMIT 5
        """, (almacen_id,))
        
        top_productos = [
            {
                'producto': row[0],
                'cantidad_vendida': row[1],
                'numero_envios': row[2],
                'ingresos': float(row[3]) if row[3] else 0
            }
            for row in cursor.fetchall()
        ]
        
        # Mejor día de la semana
        cursor.execute("""
            SELECT 
                TO_CHAR(created_at, 'Day') as dia_semana,
                COUNT(*) as num_envios
            FROM envios
            WHERE almacen_destino_id = %s
                AND created_at >= NOW() - INTERVAL '60 days'
            GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
            ORDER BY num_envios DESC
            LIMIT 1
        """, (almacen_id,))
        
        mejor_dia = cursor.fetchone()
        
        # Tendencia últimos 7 días
        cursor.execute("""
            SELECT 
                DATE(created_at) as fecha,
                COUNT(*) as num_envios,
                SUM(total_precio) as ventas_dia
            FROM envios
            WHERE almacen_destino_id = %s
                AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY fecha DESC
        """, (almacen_id,))
        
        tendencia = [
            {
                'fecha': row[0].isoformat(),
                'envios': row[1],
                'ventas': float(row[2]) if row[2] else 0
            }
            for row in cursor.fetchall()
        ]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'insights': {
                'top_productos': top_productos,
                'mejor_dia_semana': mejor_dia[0].strip() if mejor_dia else 'N/A',
                'tendencia_7_dias': tendencia,
                'recomendacion': generar_recomendacion(top_productos, tendencia)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def generar_recomendacion(top_productos, tendencia):
    """Genera una recomendación inteligente basada en los datos"""
    if not tendencia:
        return "Necesitas más datos históricos para generar recomendaciones."
    
    # Calcular tendencia
    ventas_recientes = [t['ventas'] for t in tendencia[:3]]
    ventas_antiguas = [t['ventas'] for t in tendencia[3:]]
    
    if ventas_antiguas and ventas_recientes:
        promedio_reciente = sum(ventas_recientes) / len(ventas_recientes)
        promedio_antiguo = sum(ventas_antiguas) / len(ventas_antiguas)
        
        if promedio_reciente > promedio_antiguo * 1.2:
            return "📈 Tus ventas están creciendo! Considera aumentar el inventario de tus productos más vendidos."
        elif promedio_reciente < promedio_antiguo * 0.8:
            return "📉 Tus ventas están bajando. Revisa tu estrategia de precios y promociones."
    
    if top_productos:
        producto_estrella = top_productos[0]['producto']
        return f"⭐ '{producto_estrella}' es tu producto estrella. Asegúrate de mantenerlo siempre en stock."
    
    return "✅ Mantén un buen registro de tus operaciones para obtener mejores insights."

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    print(f"🤖 Servicio de IA iniciando en puerto {port}...")
    print(f"📊 Conectado a base de datos: {DB_CONFIG['database']}")
    app.run(host='0.0.0.0', port=port, debug=True)
