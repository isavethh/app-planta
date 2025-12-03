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
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SignatureScreen from 'react-native-signature-canvas';
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
  const signatureRef = useRef(null);
  
  const [checklistData, setChecklistData] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [firma, setFirma] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const [todosVerificados, setTodosVerificados] = useState(false);

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

  const handleFirmaOK = (signature) => {
    setFirma(signature);
    setMostrarFirma(false);
  };

  const handleFirmaClear = () => {
    signatureRef.current?.clearSignature();
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

      // Iniciar ruta
      const iniciarResponse = await rutasMultiService.iniciarRuta(rutaId, {
        latitud: null, // TODO: obtener ubicación real
        longitud: null,
      });

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

      {/* Modal de firma */}
      {mostrarFirma && (
        <View style={styles.firmaOverlay}>
          <View style={styles.firmaContainer}>
            <View style={styles.firmaHeader}>
              <Text style={styles.firmaTitle}>Firma Digital</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setMostrarFirma(false)}
              />
            </View>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleFirmaOK}
              onEmpty={() => Alert.alert('Firma vacía', 'Por favor dibuja tu firma')}
              descriptionText="Firma aquí"
              clearText="Limpiar"
              confirmText="Confirmar"
              webStyle={`.m-signature-pad { box-shadow: none; border: 1px solid #e0e0e0; }
                        .m-signature-pad--body { border: none; }
                        .m-signature-pad--footer { display: flex; justify-content: space-around; }`}
              style={styles.signatureCanvas}
            />
          </View>
        </View>
      )}

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
          <Card.Title title="✍️ Firma del Transportista" />
          <Card.Content>
            {firma ? (
              <View style={styles.firmaPreview}>
                <View style={styles.firmaImageContainer}>
                  <Text style={styles.firmaPlaceholder}>Firma registrada ✓</Text>
                </View>
                <Button
                  mode="outlined"
                  icon="eraser"
                  onPress={handleLimpiarFirma}
                  style={styles.limpiarFirmaBtn}
                  textColor="#F44336"
                >
                  Borrar y volver a firmar
                </Button>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="draw"
                onPress={() => setMostrarFirma(true)}
                style={styles.firmarBtn}
              >
                Toque para firmar
              </Button>
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
    height: 100,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  firmaPlaceholder: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  limpiarFirmaBtn: {
    borderColor: '#F44336',
  },
  firmarBtn: {
    paddingVertical: 20,
    borderStyle: 'dashed',
    borderWidth: 2,
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
  firmaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    padding: 20,
  },
  firmaContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  firmaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#4CAF50',
  },
  firmaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  signatureCanvas: {
    height: 300,
  },
});
