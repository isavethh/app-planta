import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Checkbox,
  TextInput,
  Divider,
  Surface,
  ActivityIndicator,
  IconButton,
  Modal,
  Portal,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../context/AuthContext';
import { rutasMultiService } from '../services/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

// Template de checklist de salida
const CHECKLIST_ITEMS = [
  { id: 'documentos_carga', label: 'Documentos de carga completos', categoria: 'documentos' },
  { id: 'guias_remision', label: 'Guías de remisión disponibles', categoria: 'documentos' },
  { id: 'carga_verificada', label: 'Carga verificada y contada', categoria: 'carga' },
  { id: 'carga_asegurada', label: 'Carga asegurada correctamente', categoria: 'carga' },
  { id: 'embalaje_correcto', label: 'Embalaje en buen estado', categoria: 'carga' },
  { id: 'combustible_ok', label: 'Combustible suficiente', categoria: 'vehiculo' },
  { id: 'llantas_ok', label: 'Llantas en buen estado', categoria: 'vehiculo' },
  { id: 'luces_ok', label: 'Luces funcionando', categoria: 'vehiculo' },
  { id: 'frenos_ok', label: 'Frenos funcionando', categoria: 'vehiculo' },
  { id: 'documentos_vehiculo', label: 'Documentos del vehículo', categoria: 'vehiculo' },
  { id: 'licencia_conductor', label: 'Licencia de conducir vigente', categoria: 'conductor' },
  { id: 'epp_completo', label: 'EPP completo (si aplica)', categoria: 'conductor' },
];

export default function ChecklistSalidaScreen({ route, navigation }) {
  const { rutaId, rutaCodigo } = route.params || {};
  const { userInfo } = useContext(AuthContext);
  
  const [checklistData, setChecklistData] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [firma, setFirma] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const [todosVerificados, setTodosVerificados] = useState(false);

  // Obtener nombre completo del transportista
  const nombreTransportista = userInfo?.name || userInfo?.nombre || 'Transportista';

  // Inicializar checklist
  useEffect(() => {
    const initialData = {};
    CHECKLIST_ITEMS.forEach(item => {
      initialData[item.id] = false;
    });
    setChecklistData(initialData);
  }, []);

  // Verificar si todos están marcados
  useEffect(() => {
    const itemsMarcados = Object.values(checklistData).filter(v => v === true).length;
    setTodosVerificados(itemsMarcados === CHECKLIST_ITEMS.length);
  }, [checklistData]);

  const toggleItem = (itemId) => {
    setChecklistData(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Firma digital automática con texto de compromiso
  const handleFirmarCompromiso = () => {
    const fechaHora = new Date().toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const textoFirma = `Yo, ${nombreTransportista}, me comprometo a llevar esta carga con responsabilidad. Firmado digitalmente el ${fechaHora}`;
    setFirma(textoFirma);
    setMostrarFirma(false);
  };

  const handleLimpiarFirma = () => {
    setFirma(null);
  };

  const validarYGuardar = async () => {
    // Validar que todos los items estén verificados
    if (!todosVerificados) {
      Alert.alert(
        '⚠️ Checklist Incompleto',
        'Debes verificar todos los items antes de continuar.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // Validar firma
    if (!firma) {
      Alert.alert(
        '⚠️ Firma Requerida',
        'Debes firmar el checklist antes de iniciar la ruta.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    Alert.alert(
      '🚚 Confirmar Inicio de Ruta',
      '¿Confirmas que todo está correcto y deseas iniciar la ruta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar Ruta',
          onPress: guardarChecklistEIniciar,
        },
      ]
    );
  };

  const guardarChecklistEIniciar = async () => {
    try {
      setLoading(true);

      // Preparar datos del checklist
      const datos = {
        ...checklistData,
        observaciones,
        verificado_por: userInfo?.name || 'Transportista',
        fecha_hora: new Date().toISOString(),
      };

      // Guardar checklist
      console.log('[ChecklistSalida] Guardando checklist...');
      const checklistResponse = await rutasMultiService.guardarChecklist(rutaId, {
        tipo: 'salida',
        datos,
        firma_base64: firma,
      });

      if (!checklistResponse.success) {
        throw new Error(checklistResponse.message || 'Error al guardar checklist');
      }

      console.log('[ChecklistSalida] Checklist guardado, iniciando ruta...');

      // Iniciar ruta (sin enviar datos ya que el checklist ya fue guardado)
      const iniciarResponse = await rutasMultiService.iniciarRuta(rutaId);

      if (!iniciarResponse.success) {
        throw new Error(iniciarResponse.message || 'Error al iniciar ruta');
      }

      Alert.alert(
        '✅ Ruta Iniciada',
        'El checklist fue registrado y la ruta ha comenzado. ¡Buen viaje!',
        [
          {
            text: 'Continuar',
            onPress: () => navigation.replace('RutaMultiEntrega', { rutaId }),
          },
        ]
      );
    } catch (error) {
      console.error('[ChecklistSalida] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el checklist');
    } finally {
      setLoading(false);
    }
  };

  const renderChecklistItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.checklistItem}
      onPress={() => toggleItem(item.id)}
      activeOpacity={0.7}
    >
      <Checkbox
        status={checklistData[item.id] ? 'checked' : 'unchecked'}
        onPress={() => toggleItem(item.id)}
        color="#4CAF50"
      />
      <Text style={[
        styles.checklistLabel,
        checklistData[item.id] && styles.checklistLabelChecked
      ]}>
        {item.label}
      </Text>
      {checklistData[item.id] && (
        <Icon name="check-circle" size={20} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  const itemsMarcados = Object.values(checklistData).filter(v => v === true).length;
  const porcentaje = Math.round((itemsMarcados / CHECKLIST_ITEMS.length) * 100);

  // Agrupar items por categoría
  const categorias = [
    { key: 'documentos', label: '📄 Documentación', icon: 'file-document' },
    { key: 'carga', label: '📦 Carga', icon: 'package-variant' },
    { key: 'vehiculo', label: '🚛 Vehículo', icon: 'truck' },
    { key: 'conductor', label: '👤 Conductor', icon: 'account' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      
      {/* Header */}
      <Surface style={styles.header} elevation={4}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Checklist de Salida</Text>
            <Text style={styles.headerSubtitle}>{rutaCodigo}</Text>
          </View>
          
          <View style={styles.headerBadge}>
            <Text style={styles.porcentajeText}>{porcentaje}%</Text>
          </View>
        </View>
      </Surface>

      {/* Modal de firma digital */}
      <Portal>
        <Modal
          visible={mostrarFirma}
          onDismiss={() => setMostrarFirma(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.firmaModalContent}>
            <View style={styles.firmaModalHeader}>
              <Icon name="file-sign" size={40} color="#4CAF50" />
              <Text style={styles.firmaModalTitle}>Firma Digital de Compromiso</Text>
            </View>
            
            <View style={styles.compromisoBox}>
              <Text style={styles.compromisoTexto}>
                "Yo, <Text style={styles.nombreDestacado}>{nombreTransportista}</Text>, me comprometo a llevar esta carga con responsabilidad"
              </Text>
            </View>
            
            <Text style={styles.firmaInfo}>
              Al presionar "Firmar", aceptas este compromiso y se registrará tu firma digital con fecha y hora.
            </Text>
            
            <View style={styles.firmaModalBotones}>
              <Button
                mode="outlined"
                onPress={() => setMostrarFirma(false)}
                style={styles.cancelarBtn}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                icon="check-circle"
                onPress={handleFirmarCompromiso}
                style={styles.confirmarFirmaBtn}
                buttonColor="#4CAF50"
              >
                Firmar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instrucciones */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Icon name="information" size={24} color="#2196F3" />
              <Text style={styles.infoText}>
                Verifica cada punto antes de salir de la planta. Todos los items son obligatorios.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Progreso */}
        <View style={styles.progresoContainer}>
          <View style={styles.progresoBar}>
            <View style={[styles.progresoFill, { width: `${porcentaje}%` }]} />
          </View>
          <Text style={styles.progresoText}>
            {itemsMarcados} de {CHECKLIST_ITEMS.length} verificados
          </Text>
        </View>

        {/* Categorías de checklist */}
        {categorias.map(cat => (
          <Card key={cat.key} style={styles.categoriaCard}>
            <Card.Title
              title={cat.label}
              left={(props) => <Icon name={cat.icon} size={24} color="#4CAF50" />}
            />
            <Card.Content>
              {CHECKLIST_ITEMS
                .filter(item => item.categoria === cat.key)
                .map(item => renderChecklistItem(item))}
            </Card.Content>
          </Card>
        ))}

        {/* Observaciones */}
        <Card style={styles.observacionesCard}>
          <Card.Title title="📝 Observaciones (opcional)" />
          <Card.Content>
            <TextInput
              mode="outlined"
              placeholder="Escribe cualquier observación adicional..."
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={3}
              style={styles.observacionesInput}
            />
          </Card.Content>
        </Card>

        {/* Firma */}
        <Card style={styles.firmaCard}>
          <Card.Title title="✍️ Firma Digital del Transportista" />
          <Card.Content>
            {firma ? (
              <View style={styles.firmaPreview}>
                <View style={styles.firmaImageContainer}>
                  <Icon name="check-decagram" size={32} color="#4CAF50" style={{marginBottom: 8}} />
                  <Text style={styles.firmaTextoRegistrado}>{firma}</Text>
                </View>
                <Button
                  mode="outlined"
                  icon="eraser"
                  onPress={handleLimpiarFirma}
                  style={styles.limpiarFirmaBtn}
                  textColor="#F44336"
                >
                  Borrar firma
                </Button>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.firmarBtnContainer}
                onPress={() => setMostrarFirma(true)}
                activeOpacity={0.7}
              >
                <Icon name="file-sign" size={40} color="#4CAF50" />
                <Text style={styles.firmarBtnText}>Toque para firmar</Text>
                <Text style={styles.firmarBtnSubtext}>
                  Se registrará su compromiso de responsabilidad
                </Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        {/* Botón guardar */}
        <Button
          mode="contained"
          icon="truck-check"
          onPress={validarYGuardar}
          style={styles.guardarBtn}
          contentStyle={styles.guardarBtnContent}
          labelStyle={styles.guardarBtnLabel}
          loading={loading}
          disabled={loading || !todosVerificados || !firma}
        >
          {todosVerificados && firma
            ? 'Confirmar e Iniciar Ruta'
            : !todosVerificados
              ? 'Completa todos los items'
              : 'Agrega tu firma'}
        </Button>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: STATUSBAR_HEIGHT,
    paddingBottom: 15,
    paddingHorizontal: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  headerBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  porcentajeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scrollContent: {
    padding: 15,
  },
  infoCard: {
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1976D2',
  },
  progresoContainer: {
    marginBottom: 15,
  },
  progresoBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progresoFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progresoText: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 13,
    color: '#666',
  },
  categoriaCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 5,
  },
  checklistLabelChecked: {
    color: '#4CAF50',
  },
  observacionesCard: {
    marginBottom: 15,
    borderRadius: 12,
  },
  observacionesInput: {
    backgroundColor: '#fff',
  },
  firmaCard: {
    marginBottom: 20,
    borderRadius: 12,
  },
  firmaPreview: {
    alignItems: 'center',
  },
  firmaImageContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  firmaTextoRegistrado: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  firmaPlaceholder: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  limpiarFirmaBtn: {
    borderColor: '#F44336',
  },
  firmarBtnContainer: {
    paddingVertical: 25,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
  },
  firmarBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  firmarBtnSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  guardarBtn: {
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  guardarBtnContent: {
    paddingVertical: 10,
  },
  guardarBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos del modal de firma
  modalContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  firmaModalContent: {
    padding: 20,
  },
  firmaModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  firmaModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  compromisoBox: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginBottom: 15,
  },
  compromisoTexto: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nombreDestacado: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  firmaInfo: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  firmaModalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelarBtn: {
    flex: 1,
    marginRight: 10,
  },
  confirmarFirmaBtn: {
    flex: 1,
    marginLeft: 10,
  },
});
