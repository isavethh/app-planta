import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { Card, Text, Chip, Searchbar, Button } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { incidenteService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function MisIncidentesScreen({ navigation }) {
  console.log('⚠️ [MisIncidentesScreen] Componente iniciando...');
  
  const authContext = useContext(AuthContext);
  const userInfo = authContext?.userInfo;
  
  const [incidentes, setIncidentes] = useState([]);
  const [incidentesFiltrados, setIncidentesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Protección temprana
  if (!userInfo) {
    console.log('⏳ [MisIncidentesScreen] Esperando userInfo...');
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  useEffect(() => {
    if (userInfo && userInfo.id) {
      cargarIncidentes();
    }
  }, [userInfo]);

  useEffect(() => {
    if (searchQuery) {
      const filtrados = incidentes.filter(incidente => 
        incidente.descripcion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incidente.envio_codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incidente.tipo_incidente?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setIncidentesFiltrados(filtrados);
    } else {
      setIncidentesFiltrados(incidentes);
    }
  }, [searchQuery, incidentes]);

  const cargarIncidentes = async () => {
    try {
      setLoading(true);
      
      // Validar que userInfo existe
      if (!userInfo || !userInfo.id) {
        console.error('❌ [MisIncidentesScreen] userInfo no válido:', userInfo);
        setIncidentes([]);
        setIncidentesFiltrados([]);
        return;
      }
      
      console.log('[MisIncidentesScreen] Cargando incidentes para transportista ID:', userInfo.id);
      
      // Obtener incidentes filtrados por transportista
      const response = await incidenteService.listar({ transportista_id: userInfo.id });
      const data = Array.isArray(response) ? response : (response?.data || []);
      
      console.log('[MisIncidentesScreen] Respuesta recibida:', data.length, 'incidentes');
      
      // Ordenar por fecha más reciente primero
      const incidentesOrdenados = data.sort((a, b) => {
        const fechaA = new Date(a.created_at || a.fecha_reporte || 0);
        const fechaB = new Date(b.created_at || b.fecha_reporte || 0);
        return fechaB - fechaA;
      });
      
      setIncidentes(incidentesOrdenados);
      setIncidentesFiltrados(incidentesOrdenados);
    } catch (error) {
      console.error('❌ [MisIncidentesScreen] Error al cargar incidentes:', error);
      console.error('❌ [MisIncidentesScreen] Error.message:', error?.message);
      console.error('❌ [MisIncidentesScreen] Error.stack:', error?.stack);
      setIncidentes([]);
      setIncidentesFiltrados([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarIncidentes();
  };

  const getTipoIcon = (tipo) => {
    const iconos = {
      'producto_danado': 'package-variant-closed-remove',
      'cantidad_incorrecta': 'counter',
      'producto_faltante': 'package-variant-minus',
      'producto_equivocado': 'swap-horizontal',
      'empaque_malo': 'package-variant',
      'otro': 'help-circle',
    };
    return iconos[tipo] || 'alert-circle';
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      'producto_danado': 'Producto Dañado',
      'cantidad_incorrecta': 'Cantidad Incorrecta',
      'producto_faltante': 'Producto Faltante',
      'producto_equivocado': 'Producto Equivocado',
      'empaque_malo': 'Empaque en Mal Estado',
      'otro': 'Otro Problema',
    };
    return labels[tipo] || tipo;
  };

  const getEstadoColor = (estado) => {
    if (estado === 'resuelto') return '#4CAF50';
    if (estado === 'en_revision') return '#FF9800';
    if (estado === 'pendiente') return '#F44336';
    return '#9E9E9E';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'pendiente': 'Pendiente',
      'en_revision': 'En Revisión',
      'resuelto': 'Resuelto',
      'cerrado': 'Cerrado',
    };
    return labels[estado] || estado;
  };

  const renderIncidente = ({ item }) => {
    // Validación de item
    if (!item || !item.id) {
      console.warn('[MisIncidentesScreen] Item inválido:', item);
      return null;
    }
    
    const fechaReporte = item.created_at || item.fecha_reporte;
    const fechaFormateada = fechaReporte 
      ? new Date(fechaReporte).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Fecha no disponible';
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Icon 
                name={getTipoIcon(item.tipo_incidente)} 
                size={24} 
                color="#F44336" 
              />
              <View style={styles.headerText}>
                <Text variant="titleMedium" style={styles.tipo}>
                  {getTipoLabel(item.tipo_incidente)}
                </Text>
                {item.envio_codigo && (
                  <Text variant="bodySmall" style={styles.envioCodigo}>
                    Envío: {item.envio_codigo}
                  </Text>
                )}
              </View>
            </View>
            <Chip 
              style={[styles.estadoChip, { backgroundColor: getEstadoColor(item.estado) }]}
              textStyle={{ color: 'white', fontSize: 11 }}
            >
              {getEstadoLabel(item.estado)}
            </Chip>
          </View>

          {item.descripcion && (
            <Text style={styles.descripcion} numberOfLines={3}>
              {item.descripcion}
            </Text>
          )}

          {item.foto_url && (
            <View style={styles.fotoContainer}>
              <Image 
                source={{ uri: item.foto_url }} 
                style={styles.foto}
                resizeMode="cover"
              />
            </View>
          )}

          <View style={styles.infoRow}>
            <Icon name="calendar-clock" size={18} color="#666" />
            <Text style={styles.infoText}>
              Reportado: {fechaFormateada}
            </Text>
          </View>

          {item.almacen_nombre && (
            <View style={styles.infoRow}>
              <Icon name="store" size={18} color="#666" />
              <Text style={styles.infoText}>{item.almacen_nombre}</Text>
            </View>
          )}

          {item.respuesta && (
            <View style={styles.respuestaContainer}>
              <Text variant="labelMedium" style={styles.respuestaLabel}>
                Respuesta:
              </Text>
              <Text style={styles.respuestaText}>{item.respuesta}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Buscar incidentes..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <Text>Cargando incidentes...</Text>
          </View>
        ) : incidentesFiltrados.length === 0 ? (
          <View style={styles.centerContainer}>
            <Icon name="shield-alert-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron resultados' : 'No has reportado incidentes aún'}
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('MisEnvios')}
              style={styles.button}
              icon="plus"
            >
              Reportar Incidente
            </Button>
          </View>
        ) : (
          <FlatList
            data={incidentesFiltrados}
            renderItem={renderIncidente}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  searchbar: {
    margin: 10,
    elevation: 2,
  },
  listContent: {
    padding: 10,
  },
  card: {
    marginBottom: 10,
    borderRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  tipo: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  envioCodigo: {
    color: '#666',
    marginTop: 2,
  },
  estadoChip: {
    height: 28,
    marginLeft: 8,
  },
  descripcion: {
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
  fotoContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  foto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
    flex: 1,
  },
  respuestaContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  respuestaLabel: {
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  respuestaText: {
    color: '#333',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    marginBottom: 20,
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
  },
});

