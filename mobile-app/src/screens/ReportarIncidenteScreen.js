import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, TextInput, Button, RadioButton, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_URL = 'http://10.26.14.34:3001/api';

const TIPOS_INCIDENTE = [
  { value: 'producto_danado', label: 'Producto dañado', icon: 'package-variant-closed-remove' },
  { value: 'cantidad_incorrecta', label: 'Cantidad incorrecta', icon: 'counter' },
  { value: 'producto_faltante', label: 'Producto faltante', icon: 'package-variant-minus' },
  { value: 'producto_equivocado', label: 'Producto equivocado', icon: 'swap-horizontal' },
  { value: 'empaque_malo', label: 'Empaque en mal estado', icon: 'package-variant' },
  { value: 'otro', label: 'Otro problema', icon: 'help-circle' },
];

export default function ReportarIncidenteScreen({ route, navigation }) {
  const { envioId, envioCode } = route.params;
  
  const [tipoIncidente, setTipoIncidente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const solicitarPermisos = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar fotos de evidencia.');
      return false;
    }
    return true;
  };

  const tomarFoto = async () => {
    const tienePermiso = await solicitarPermisos();
    if (!tienePermiso) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setFoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarDeGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setFoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const enviarReporte = async () => {
    if (!tipoIncidente) {
      Alert.alert('Error', 'Por favor selecciona el tipo de incidente');
      return;
    }

    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor describe el problema');
      return;
    }

    setLoading(true);

    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('envio_id', envioId);
      formData.append('tipo_incidente', tipoIncidente);
      formData.append('descripcion', descripcion);
      
      if (foto) {
        const filename = foto.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('foto', {
          uri: foto,
          name: filename,
          type,
        });
      }

      const response = await axios.post(`${API_URL}/incidentes`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        Alert.alert(
          '✅ Reporte Enviado',
          'Tu incidente ha sido registrado. Nos pondremos en contacto contigo pronto.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(response.data.error || 'Error al enviar');
      }
    } catch (error) {
      console.error('Error al enviar reporte:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Icon name="alert-circle" size={40} color="#F44336" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Reportar Incidente</Text>
              <Text style={styles.headerSubtitle}>Envío: {envioCode}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Tipo de Incidente */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>¿Qué problema encontraste?</Text>
          <RadioButton.Group onValueChange={setTipoIncidente} value={tipoIncidente}>
            {TIPOS_INCIDENTE.map((tipo) => (
              <TouchableOpacity
                key={tipo.value}
                style={[
                  styles.radioItem,
                  tipoIncidente === tipo.value && styles.radioItemSelected
                ]}
                onPress={() => setTipoIncidente(tipo.value)}
              >
                <Icon 
                  name={tipo.icon} 
                  size={24} 
                  color={tipoIncidente === tipo.value ? '#F44336' : '#666'} 
                />
                <Text style={[
                  styles.radioLabel,
                  tipoIncidente === tipo.value && styles.radioLabelSelected
                ]}>
                  {tipo.label}
                </Text>
                <RadioButton value={tipo.value} color="#F44336" />
              </TouchableOpacity>
            ))}
          </RadioButton.Group>
        </Card.Content>
      </Card>

      {/* Descripción */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Describe el problema</Text>
          <TextInput
            mode="outlined"
            placeholder="Cuéntanos qué pasó con tu pedido..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            style={styles.textInput}
            outlineColor="#ddd"
            activeOutlineColor="#F44336"
          />
        </Card.Content>
      </Card>

      {/* Foto de Evidencia */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>¿Tienes una foto como evidencia?</Text>
          <Text style={styles.sectionSubtitle}>Una foto nos ayuda a resolver el problema más rápido</Text>
          
          {foto ? (
            <View style={styles.fotoContainer}>
              <Image source={{ uri: foto }} style={styles.fotoPreview} />
              <View style={styles.fotoActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => setFoto(null)}
                  icon="close"
                  textColor="#F44336"
                  style={styles.fotoButton}
                >
                  Quitar
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={tomarFoto}
                  icon="camera"
                  style={styles.fotoButton}
                >
                  Cambiar
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.fotoPlaceholder}>
              <View style={styles.fotoButtonsRow}>
                <TouchableOpacity style={styles.fotoOptionButton} onPress={tomarFoto}>
                  <Icon name="camera" size={40} color="#4CAF50" />
                  <Text style={styles.fotoOptionText}>Tomar Foto</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.fotoOptionButton} onPress={seleccionarDeGaleria}>
                  <Icon name="image" size={40} color="#2196F3" />
                  <Text style={styles.fotoOptionText}>Galería</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fotoOptional}>(Opcional pero recomendado)</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Botón Enviar */}
      <View style={styles.submitContainer}>
        <Button
          mode="contained"
          onPress={enviarReporte}
          loading={loading}
          disabled={loading || !tipoIncidente || !descripcion.trim()}
          icon="send"
          style={styles.submitButton}
          buttonColor="#F44336"
          contentStyle={styles.submitButtonContent}
        >
          {loading ? 'Enviando...' : 'Enviar Reporte'}
        </Button>
        
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          textColor="#666"
        >
          Cancelar
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 12,
    backgroundColor: '#FFEBEE',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#C62828',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  card: {
    margin: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    marginTop: -8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
  },
  radioItemSelected: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  radioLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
  },
  radioLabelSelected: {
    color: '#C62828',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'white',
  },
  fotoContainer: {
    alignItems: 'center',
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  fotoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  fotoButton: {
    flex: 1,
  },
  fotoPlaceholder: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  fotoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
  },
  fotoOptionButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    width: 120,
  },
  fotoOptionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fotoOptional: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  submitContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
});
