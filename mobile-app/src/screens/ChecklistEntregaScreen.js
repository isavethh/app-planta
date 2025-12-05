import React, { useState, useContext, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Checkbox,
  TextInput,
  Surface,
  ActivityIndicator,
  IconButton,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { rutasMultiService } from '../services/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

// Template de checklist de entrega
const CHECKLIST_ITEMS = [
  { id: 'productos_completos', label: 'Productos completos según guía' },
  { id: 'embalaje_intacto', label: 'Embalaje intacto sin daños' },
  { id: 'cantidad_verificada', label: 'Cantidad verificada con receptor' },
  { id: 'documentos_entregados', label: 'Documentos entregados' },
  { id: 'receptor_conforme', label: 'Receptor conforme con entrega' },
];

export default function ChecklistEntregaScreen({ route, navigation }) {
  const { rutaId, paradaId, paradaNombre, envioId } = route.params || {};
  const { userInfo } = useContext(AuthContext);
  
  const [checklistData, setChecklistData] = useState(() => {
    const initial = {};
    CHECKLIST_ITEMS.forEach(item => { initial[item.id] = false; });
    return initial;
  });
  
  // Datos del receptor
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [cargoReceptor, setCargoReceptor] = useState('');
  const [dniReceptor, setDniReceptor] = useState('');
  
  const [observaciones, setObservaciones] = useState('');
  const [firma, setFirma] = useState(null);
  const [fechaHoraFirma, setFechaHoraFirma] = useState('');
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarFirma, setMostrarFirma] = useState(false);

  // Nombre del transportista
  const nombreTransportista = userInfo?.name || userInfo?.nombre || 'Transportista';

  const toggleItem = (itemId) => {
    setChecklistData(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Firma digital automática con texto de compromiso
  const handleFirmarCompromiso = () => {
    if (!nombreReceptor.trim()) {
      Alert.alert('⚠️ Nombre Requerido', 'Primero ingresa el nombre del receptor');
      setMostrarFirma(false);
      return;
    }

    const fechaHora = new Date().toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const textoFirma = `Yo, ${nombreReceptor}, confirmo haber recibido la mercadería en conformidad. Entregado por ${nombreTransportista}. Firmado el ${fechaHora}`;
    setFirma(textoFirma);
    setFechaHoraFirma(fechaHora);
    setMostrarFirma(false);
  };

  const handleLimpiarFirma = () => {
    setFirma(null);
    setFechaHoraFirma('');
  };

  const tomarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar fotos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const foto = result.assets[0];
        setFotos(prev => [...prev, {
          uri: foto.uri,
          base64: foto.base64,
        }]);
      }
    } catch (error) {
      console.error('[ChecklistEntrega] Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const eliminarFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const validarYGuardar = () => {
    // Validar checklist
    const itemsMarcados = Object.values(checklistData).filter(v => v).length;
    if (itemsMarcados < CHECKLIST_ITEMS.length) {
      Alert.alert(
        '⚠️ Checklist Incompleto',
        'Debes verificar todos los items del checklist.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // Validar datos del receptor
    if (!nombreReceptor.trim()) {
      Alert.alert('⚠️ Datos Incompletos', 'Ingresa el nombre del receptor');
      return;
    }

    // Validar firma
    if (!firma) {
      Alert.alert('⚠️ Firma Requerida', 'El receptor debe firmar la entrega');
      return;
    }

    Alert.alert(
      '📦 Confirmar Entrega',
      `¿Confirmar entrega a ${nombreReceptor}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: guardarEntrega },
      ]
    );
  };

  const guardarEntrega = async () => {
    try {
      setLoading(true);

      // Preparar datos del checklist
      const checklistDatos = {
        ...checklistData,
        observaciones,
        verificado_por: userInfo?.name || 'Transportista',
        fecha_hora: new Date().toISOString(),
      };

      // Guardar checklist de entrega
      console.log('[ChecklistEntrega] Guardando checklist...');
      await rutasMultiService.guardarChecklist(rutaId, {
        tipo: 'entrega',
        parada_id: paradaId,
        datos: checklistDatos,
        firma_base64: firma,
      });

      // Subir fotos como evidencia
      if (fotos.length > 0) {
        console.log(`[ChecklistEntrega] Subiendo ${fotos.length} fotos...`);
        for (const foto of fotos) {
          try {
            await rutasMultiService.subirEvidencia(rutaId, paradaId, {
              tipo: 'foto_entrega',
              imagen_base64: foto.base64,
            });
          } catch (fotoError) {
            console.warn('[ChecklistEntrega] Error al subir foto:', fotoError);
          }
        }
      }

      // Completar la entrega
      console.log('[ChecklistEntrega] Completando entrega...');
      const response = await rutasMultiService.completarEntrega(paradaId, {
        nombre_receptor: nombreReceptor,
        cargo_receptor: cargoReceptor,
        dni_receptor: dniReceptor,
        firma_base64: firma,
        observaciones,
      });

      if (response.success) {
        Alert.alert(
          '✅ Entrega Completada',
          `Entrega registrada correctamente.\n\nReceptor: ${nombreReceptor}`,
          [
            {
              text: 'Continuar',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error(response.message || 'Error al completar entrega');
      }
    } catch (error) {
      console.error('[ChecklistEntrega] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo completar la entrega');
    } finally {
      setLoading(false);
    }
  };

  const itemsMarcados = Object.values(checklistData).filter(v => v).length;
  const porcentaje = Math.round((itemsMarcados / CHECKLIST_ITEMS.length) * 100);

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
            <Text style={styles.headerTitle}>Checklist de Entrega</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{paradaNombre}</Text>
          </View>
          
          <View style={styles.headerBadge}>
            <Text style={styles.porcentajeText}>{porcentaje}%</Text>
          </View>
        </View>
      </Surface>

      {/* Modal de firma del receptor */}
      <Portal>
        <Modal
          visible={mostrarFirma}
          onDismiss={() => setMostrarFirma(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.firmaModalContent}>
            <View style={styles.firmaModalHeader}>
              <Icon name="file-sign" size={40} color="#4CAF50" />
              <Text style={styles.firmaModalTitle}>Firma de Recepción</Text>
            </View>
            
            <View style={styles.compromisoBox}>
              <Text style={styles.compromisoTexto}>
                "Yo, <Text style={styles.nombreDestacado}>{nombreReceptor || '[Nombre del Receptor]'}</Text>, confirmo haber recibido la mercadería en conformidad"
              </Text>
            </View>

            <Text style={styles.transportistaInfo}>
              Entregado por: <Text style={styles.nombreDestacado}>{nombreTransportista}</Text>
            </Text>
            
            <Text style={styles.firmaInfo}>
              Al presionar "Firmar", el receptor confirma la recepción conforme de la mercadería.
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
                disabled={!nombreReceptor.trim()}
              >
                Firmar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instrucciones para el transportista */}
        <Card style={[styles.card, { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#2196F3' }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="information" size={24} color="#2196F3" />
              <Text style={{ marginLeft: 10, flex: 1, color: '#1565C0', fontWeight: '500' }}>
                Entregue el dispositivo al receptor del almacén para que complete y firme este formulario.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Verificación de productos */}
        <Card style={styles.card}>
          <Card.Title 
            title="📋 Verificación de Productos" 
            subtitle="El receptor debe confirmar cada punto"
          />
          <Card.Content>
            {CHECKLIST_ITEMS.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItem}
                onPress={() => toggleItem(item.id)}
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
            ))}
          </Card.Content>
        </Card>

        {/* Datos del receptor */}
        <Card style={styles.card}>
          <Card.Title 
            title="👤 Datos del Receptor" 
            subtitle="Persona que recibe la mercadería"
          />
          <Card.Content>
            <TextInput
              mode="outlined"
              label="Nombre completo *"
              value={nombreReceptor}
              onChangeText={setNombreReceptor}
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            
            <TextInput
              mode="outlined"
              label="Cargo (opcional)"
              value={cargoReceptor}
              onChangeText={setCargoReceptor}
              style={styles.input}
              left={<TextInput.Icon icon="briefcase" />}
              placeholder="Ej: Encargado de almacén"
            />
            
            <TextInput
              mode="outlined"
              label="CI/DNI (opcional)"
              value={dniReceptor}
              onChangeText={setDniReceptor}
              style={styles.input}
              left={<TextInput.Icon icon="card-account-details" />}
              keyboardType="numeric"
            />
          </Card.Content>
        </Card>

        {/* Evidencia fotográfica */}
        <Card style={styles.card}>
          <Card.Title 
            title="📷 Evidencia Fotográfica" 
            subtitle={`${fotos.length} foto(s) tomada(s)`}
          />
          <Card.Content>
            <View style={styles.fotosContainer}>
              {fotos.map((foto, index) => (
                <View key={index} style={styles.fotoWrapper}>
                  <Image source={{ uri: foto.uri }} style={styles.fotoPreview} />
                  <IconButton
                    icon="close-circle"
                    size={24}
                    iconColor="#F44336"
                    style={styles.eliminarFotoBtn}
                    onPress={() => eliminarFoto(index)}
                  />
                </View>
              ))}
              
              <TouchableOpacity style={styles.agregarFotoBtn} onPress={tomarFoto}>
                <Icon name="camera-plus" size={32} color="#666" />
                <Text style={styles.agregarFotoText}>Agregar foto</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Observaciones */}
        <Card style={styles.card}>
          <Card.Title title="📝 Observaciones" />
          <Card.Content>
            <TextInput
              mode="outlined"
              placeholder="Notas adicionales sobre la entrega..."
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={3}
            />
          </Card.Content>
        </Card>

        {/* Firma del receptor */}
        <Card style={styles.card}>
          <Card.Title title="✍️ Firma del Receptor *" />
          <Card.Content>
            {firma ? (
              <View style={styles.firmaCompletada}>
                <Icon name="check-decagram" size={40} color="#4CAF50" />
                <Text style={styles.firmaCompletadaTexto}>Firma digital registrada</Text>
                <Text style={styles.firmaCompletadaNombre}>{nombreReceptor}</Text>
                <Text style={styles.firmaFecha}>{fechaHoraFirma}</Text>
                <Button
                  mode="outlined"
                  icon="refresh"
                  onPress={handleLimpiarFirma}
                  textColor="#F44336"
                  style={{ marginTop: 10 }}
                >
                  Volver a firmar
                </Button>
              </View>
            ) : (
              <View style={styles.firmaContainer}>
                <Text style={styles.firmaInstruccion}>
                  El receptor debe confirmar la recepción de la mercadería
                </Text>
                <Button
                  mode="contained"
                  icon="file-sign"
                  onPress={() => setMostrarFirma(true)}
                  style={styles.firmarBtn}
                  buttonColor="#4CAF50"
                >
                  Tocar para Firmar
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Botón completar */}
        <Button
          mode="contained"
          icon="check-circle"
          onPress={validarYGuardar}
          style={styles.completarBtn}
          contentStyle={styles.completarBtnContent}
          labelStyle={styles.completarBtnLabel}
          loading={loading}
          disabled={loading}
        >
          Completar Entrega
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
  card: {
    marginBottom: 15,
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
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  fotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fotoWrapper: {
    position: 'relative',
  },
  fotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  eliminarFotoBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    margin: 0,
  },
  agregarFotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agregarFotoText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  firmaPreview: {
    alignItems: 'center',
  },
  firmaImageContainer: {
    width: '100%',
    height: 80,
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
  firmarBtn: {
    marginTop: 10,
    borderRadius: 8,
  },
  firmaContainer: {
    alignItems: 'center',
    padding: 10,
  },
  firmaInstruccion: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  firmaCompletada: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  firmaCompletadaTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  firmaCompletadaNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  firmaFecha: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  // Estilos del Modal de Firma
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
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  compromisoTexto: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  nombreDestacado: {
    fontWeight: 'bold',
    color: '#4CAF50',
    fontStyle: 'normal',
  },
  transportistaInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  firmaInfo: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  firmaModalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelarBtn: {
    flex: 1,
    borderColor: '#ccc',
  },
  confirmarFirmaBtn: {
    flex: 1,
  },
  completarBtn: {
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  completarBtnContent: {
    paddingVertical: 10,
  },
  completarBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
