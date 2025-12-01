import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { AuthContext } from '../context/AuthContext';
import { almacenService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const screenWidth = Dimensions.get('window').width;

export default function AlmacenEstadisticasScreen() {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      console.log('📊 [Estadísticas] Cargando para almacén:', userInfo?.id);
      setLoading(true);
      const data = await almacenService.getEstadisticas(userInfo.id);
      console.log('✅ [Estadísticas] Datos cargados:', data);
      setEstadisticas(data);
    } catch (error) {
      console.error('❌ [Estadísticas] Error al cargar:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarEstadisticas();
    setRefreshing(false);
  };

  const formatearMoneda = (valor) => {
    return `Bs. ${parseFloat(valor || 0).toFixed(2)}`;
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 2,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e0e0e0',
      strokeWidth: 1
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600'
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!estadisticas) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="chart-box-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No hay datos disponibles</Text>
      </View>
    );
  }

  // Preparar datos para gráfico de compras por día
  const comprasDiarias = estadisticas.compras_por_dia?.slice(0, 7).reverse() || [];
  const dataComprasDia = {
    labels: comprasDiarias.map(d => d.fecha_formato.split('/')[0] + '/' + d.fecha_formato.split('/')[1]),
    datasets: [{
      data: comprasDiarias.map(d => parseFloat(d.total_compras) || 0),
      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
      strokeWidth: 3
    }]
  };

  // Preparar datos para gráfico de estados
  const estadosData = estadisticas.envios_por_estado || [];
  const pieDataEstados = estadosData.map((item, index) => ({
    name: item.estado.toUpperCase(),
    population: parseInt(item.cantidad),
    color: ['#4CAF50', '#FFC107', '#2196F3', '#F44336'][index % 4],
    legendFontColor: '#333',
    legendFontSize: 12
  }));

  // Preparar datos para gráfico de compras mensuales
  const comprasMensuales = estadisticas.compras_por_mes?.slice(0, 6).reverse() || [];
  const dataComprasMes = {
    labels: comprasMensuales.map(m => m.mes.split('-')[1]),
    datasets: [{
      data: comprasMensuales.map(m => parseFloat(m.total_compras) || 0)
    }]
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
      }
    >
      {/* Tarjetas de Resumen */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Icon name="package-variant" size={32} color="#4CAF50" />
            <Text style={styles.summaryValue}>{estadisticas.resumen.total_envios}</Text>
            <Text style={styles.summaryLabel}>Envíos Totales</Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Icon name="receipt" size={32} color="#2196F3" />
            <Text style={styles.summaryValue}>{estadisticas.resumen.total_notas}</Text>
            <Text style={styles.summaryLabel}>Notas de Venta</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, styles.summaryCardWide]}>
          <Card.Content style={styles.summaryContent}>
            <Icon name="cash-multiple" size={32} color="#FFC107" />
            <Text style={[styles.summaryValue, { fontSize: 20 }]}>
              {formatearMoneda(estadisticas.resumen.total_compras)}
            </Text>
            <Text style={styles.summaryLabel}>Total Compras</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Gráfico de Compras por Día */}
      {comprasDiarias.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Icon name="chart-line" size={24} color="#4CAF50" />
              <Text style={styles.chartTitle}>Compras de los Últimos 7 Días</Text>
            </View>
            <LineChart
              data={dataComprasDia}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisLabel="Bs. "
              yAxisSuffix=""
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={true}
            />
          </Card.Content>
        </Card>
      )}

      {/* Gráfico de Estados de Envíos */}
      {pieDataEstados.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Icon name="chart-donut" size={24} color="#4CAF50" />
              <Text style={styles.chartTitle}>Distribución por Estado</Text>
            </View>
            <PieChart
              data={pieDataEstados}
              width={screenWidth - 60}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
          </Card.Content>
        </Card>
      )}

      {/* Gráfico de Compras Mensuales */}
      {comprasMensuales.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Icon name="chart-bar" size={24} color="#4CAF50" />
              <Text style={styles.chartTitle}>Compras Mensuales</Text>
            </View>
            <BarChart
              data={dataComprasMes}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel="Bs. "
              yAxisSuffix=""
              showValuesOnTopOfBars={true}
              fromZero={true}
            />
          </Card.Content>
        </Card>
      )}

      {/* Top Productos */}
      {estadisticas.top_productos?.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Icon name="star" size={24} color="#FFC107" />
              <Text style={styles.chartTitle}>Top 10 Productos Más Comprados</Text>
            </View>
            {estadisticas.top_productos.map((producto, index) => (
              <View key={index} style={styles.productoItem}>
                <View style={styles.productoRank}>
                  <Text style={styles.productoRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNombre}>{producto.producto_nombre}</Text>
                  <Text style={styles.productoCantidad}>
                    {producto.total_cantidad} unidades
                  </Text>
                </View>
                <Text style={styles.productoValor}>
                  {formatearMoneda(producto.total_valor)}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <View style={{ height: 30 }} />
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    marginBottom: 12,
    elevation: 3,
  },
  summaryCardWide: {
    width: '100%',
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
    margin: 10,
    marginBottom: 15,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productoRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productoRankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  productoCantidad: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productoValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
