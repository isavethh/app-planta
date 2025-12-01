import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';

const API_URL = 'http://10.26.14.34:3001/api';

export default function AlmacenIAScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [predicciones, setPredicciones] = useState([]);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    cargarDatosIA();
  }, []);

  const cargarDatosIA = async () => {
    try {
      setLoading(true);
      
      // Cargar insights del almacén
      const insightsResponse = await axios.get(`${API_URL}/ia/insights-almacen/${userInfo.id}`);
      if (insightsResponse.data.success) {
        setInsights(insightsResponse.data.insights);
      }

      // Cargar predicciones de demanda
      const prediccionResponse = await axios.get(`${API_URL}/ia/prediccion-demanda`);
      if (prediccionResponse.data.success) {
        setPredicciones(prediccionResponse.data.predicciones.slice(0, 5)); // Top 5
      }
      
    } catch (error) {
      console.error('❌ Error al cargar datos de IA:', error);
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
        <Text style={styles.headerSubtitle}>Insights y Predicciones</Text>
      </View>

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

      {/* Top Productos */}
      {insights?.top_productos && insights.top_productos.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="trophy" size={24} color="#FFD700" />
              <Text style={styles.cardTitle}>Productos Estrella</Text>
            </View>
            {insights.top_productos.map((producto, index) => (
              <View key={index} style={styles.productoRow}>
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNumero}>#{index + 1}</Text>
                  <View style={styles.productoDetails}>
                    <Text style={styles.productoNombre}>{producto.producto}</Text>
                    <Text style={styles.productoSubtitle}>
                      {producto.cantidad_vendida} unidades vendidas
                    </Text>
                  </View>
                </View>
                <Text style={styles.productoIngreso}>
                  Bs. {producto.ingresos.toFixed(2)}
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
              <Text style={styles.cardTitle}>Mejor Día para Ventas</Text>
            </View>
            <View style={styles.mejorDiaContainer}>
              <Text style={styles.mejorDiaText}>{insights.mejor_dia_semana}</Text>
              <Text style={styles.mejorDiaSubtitle}>
                Este día tiene mayor actividad de envíos
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Predicción de Demanda */}
      {predicciones.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Icon name="chart-line" size={24} color="#9C27B0" />
              <Text style={styles.cardTitle}>Predicción de Demanda</Text>
            </View>
            <Text style={styles.subtitleText}>Próxima semana - estimado</Text>
            {predicciones.map((pred, index) => (
              <View key={index} style={styles.prediccionRow}>
                <View style={styles.prediccionInfo}>
                  <Text style={styles.prediccionNombre}>{pred.producto}</Text>
                  <View style={styles.prediccionChips}>
                    <Chip
                      mode="flat"
                      style={[
                        styles.tendenciaChip,
                        pred.tendencia === 'creciente'
                          ? styles.chipCreciente
                          : pred.tendencia === 'decreciente'
                          ? styles.chipDecreciente
                          : styles.chipEstable,
                      ]}
                      textStyle={styles.chipText}
                    >
                      {pred.tendencia === 'creciente' ? '↗' : pred.tendencia === 'decreciente' ? '↘' : '→'}{' '}
                      {pred.tendencia}
                    </Chip>
                    <Chip
                      mode="flat"
                      style={[
                        styles.prioridadChip,
                        pred.prioridad === 'alta'
                          ? styles.chipAlta
                          : pred.prioridad === 'media'
                          ? styles.chipMedia
                          : styles.chipBaja,
                      ]}
                      textStyle={styles.chipText}
                    >
                      {pred.prioridad}
                    </Chip>
                  </View>
                </View>
                <Text style={styles.prediccionDemanda}>
                  {Math.round(pred.demanda_semanal_estimada)} uds/sem
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Icon name="robot" size={16} color="#999" />
        <Text style={styles.footerText}>
          Powered by IA • Actualizado hace instantes
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
    marginBottom: 16,
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
  prediccionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prediccionInfo: {
    flex: 1,
  },
  prediccionNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  prediccionChips: {
    flexDirection: 'row',
    gap: 8,
  },
  tendenciaChip: {
    height: 24,
  },
  prioridadChip: {
    height: 24,
  },
  chipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  chipCreciente: {
    backgroundColor: '#C8E6C9',
  },
  chipDecreciente: {
    backgroundColor: '#FFCDD2',
  },
  chipEstable: {
    backgroundColor: '#E0E0E0',
  },
  chipAlta: {
    backgroundColor: '#FF5252',
  },
  chipMedia: {
    backgroundColor: '#FFC107',
  },
  chipBaja: {
    backgroundColor: '#9E9E9E',
  },
  prediccionDemanda: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
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
