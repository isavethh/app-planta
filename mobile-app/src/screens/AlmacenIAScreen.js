import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';

const API_URL = 'http://10.26.14.34:3001/api';

// Datos de demostración cuando el servicio IA no está disponible
const DEMO_INSIGHTS = {
  top_productos: [
    { producto: 'Lechuga Fresca', cantidad_vendida: 150, ingresos: 450.00 },
    { producto: 'Tomate Orgánico', cantidad_vendida: 120, ingresos: 360.00 },
    { producto: 'Zanahoria', cantidad_vendida: 95, ingresos: 285.00 },
    { producto: 'Pepino', cantidad_vendida: 80, ingresos: 240.00 },
    { producto: 'Espinaca', cantidad_vendida: 65, ingresos: 195.00 },
  ],
  mejor_dia_semana: 'Miércoles',
  tendencia_7dias: {
    ventas_actuales: 45,
    ventas_anteriores: 38,
    cambio_porcentual: 18.4
  },
  recomendacion: '📈 Tus compras muestran una tendencia positiva. Considera aumentar el inventario de Lechuga y Tomate para la próxima semana.'
};

export default function AlmacenIAScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [iaDisponible, setIaDisponible] = useState(true);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    cargarDatosIA();
  }, []);

  const cargarDatosIA = async () => {
    try {
      setLoading(true);
      
      // Usar almacen_id del usuario
      const almacenId = userInfo?.almacen_id || userInfo?.almacenId || 2;
      console.log('🔍 Cargando IA para almacén:', almacenId);
      
      try {
        const insightsResponse = await axios.get(`${API_URL}/ia/insights-almacen/${almacenId}`, { timeout: 8000 });
        console.log('📊 Respuesta insights:', JSON.stringify(insightsResponse.data, null, 2));
        
        if (insightsResponse.data.success && insightsResponse.data.insights) {
          const insights = insightsResponse.data.insights;
          if (insights.top_productos && insights.top_productos.length > 0) {
            setInsights(insights);
            setIaDisponible(true);
          } else {
            console.log('⚠️ Insights vacíos, usando demo');
            setInsights(DEMO_INSIGHTS);
            setIaDisponible(false);
          }
        } else {
          throw new Error('No success en respuesta');
        }
      } catch (insightError) {
        console.log('⚠️ Error en servicio IA:', insightError.message);
        setInsights(DEMO_INSIGHTS);
        setIaDisponible(false);
      }
      
    } catch (error) {
      console.error('❌ Error general:', error);
      setInsights(DEMO_INSIGHTS);
      setIaDisponible(false);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatosIA();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Analizando datos con IA...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Icon name="brain" size={40} color="#4CAF50" />
        <Text style={styles.headerTitle}>Inteligencia Artificial</Text>
        <Text style={styles.headerSubtitle}>Análisis de tu Almacén</Text>
      </View>

      {/* Banner de modo demo */}
      {!iaDisponible && (
        <View style={styles.demoBanner}>
          <Icon name="information" size={20} color="#fff" />
          <Text style={styles.demoBannerText}>
            Modo Demo - Inicia el servicio IA para datos reales
          </Text>
        </View>
      )}

      {/* Recomendación Principal */}
      {insights?.recomendacion && (
        <Card style={styles.recomendacionCard}>
          <Card.Content>
            <View style={styles.recomendacionHeader}>
              <Icon name="lightbulb-on" size={24} color="#FF9800" />
              <Text style={styles.recomendacionTitle}>Recomendación del Día</Text>
            </View>
            <Text style={styles.recomendacionText}>{insights.recomendacion}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Top Productos Comprados */}
      {insights?.top_productos && insights.top_productos.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="trophy" size={24} color="#FFD700" />
              <Text style={styles.cardTitle}>Top Productos Comprados</Text>
            </View>
            <Text style={styles.subtitleText}>Últimos 30 días</Text>
            {insights.top_productos.map((producto, index) => (
              <View key={index} style={styles.productoRow}>
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNumero}>#{index + 1}</Text>
                  <View style={styles.productoDetails}>
                    <Text style={styles.productoNombre}>{producto.producto}</Text>
                    <Text style={styles.productoSubtitle}>
                      {producto.cantidad_vendida} unidades compradas
                    </Text>
                  </View>
                </View>
                <Text style={styles.productoIngreso}>
                  Bs. {typeof producto.ingresos === 'number' ? producto.ingresos.toFixed(2) : producto.ingresos}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Mejor Día */}
      {insights?.mejor_dia_semana && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="calendar-star" size={24} color="#2196F3" />
              <Text style={styles.cardTitle}>Mejor Día de Compras</Text>
            </View>
            <View style={styles.mejorDiaContainer}>
              <Text style={styles.mejorDiaText}>{insights.mejor_dia_semana}</Text>
              <Text style={styles.mejorDiaSubtitle}>
                Este día recibes más envíos de la planta
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Tendencia */}
      {insights?.tendencia_7dias && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>Tendencia Semanal</Text>
            </View>
            <View style={styles.tendenciaContainer}>
              <View style={styles.tendenciaItem}>
                <Text style={styles.tendenciaNumero}>{insights.tendencia_7dias.ventas_actuales}</Text>
                <Text style={styles.tendenciaLabel}>Envíos esta semana</Text>
              </View>
              <View style={styles.tendenciaDivider} />
              <View style={styles.tendenciaItem}>
                <Text style={styles.tendenciaNumero}>{insights.tendencia_7dias.ventas_anteriores}</Text>
                <Text style={styles.tendenciaLabel}>Semana anterior</Text>
              </View>
              <View style={styles.tendenciaDivider} />
              <View style={styles.tendenciaItem}>
                <Text style={[
                  styles.tendenciaPorcentaje,
                  insights.tendencia_7dias.cambio_porcentual >= 0 ? styles.positivo : styles.negativo
                ]}>
                  {insights.tendencia_7dias.cambio_porcentual >= 0 ? '+' : ''}{insights.tendencia_7dias.cambio_porcentual}%
                </Text>
                <Text style={styles.tendenciaLabel}>Cambio</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Icon name="robot" size={16} color="#999" />
        <Text style={styles.footerText}>
          Análisis basado en tus datos reales
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 10,
    gap: 8,
  },
  demoBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  recomendacionCard: {
    margin: 12,
    backgroundColor: '#FFF3E0',
    elevation: 4,
  },
  recomendacionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recomendacionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginLeft: 8,
  },
  recomendacionText: {
    fontSize: 15,
    color: '#5D4037',
    lineHeight: 22,
  },
  card: {
    margin: 12,
    marginTop: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  subtitleText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    marginTop: -8,
  },
  productoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productoNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    width: 30,
  },
  productoDetails: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  productoSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productoIngreso: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  mejorDiaContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  mejorDiaText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  mejorDiaSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  tendenciaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  tendenciaItem: {
    alignItems: 'center',
    flex: 1,
  },
  tendenciaDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  tendenciaNumero: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  tendenciaPorcentaje: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  positivo: {
    color: '#4CAF50',
  },
  negativo: {
    color: '#F44336',
  },
  tendenciaLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
