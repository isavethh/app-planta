import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Button, ActivityIndicator, Surface } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { envioService } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setLoading(true);

    try {
      // Parsear datos del QR
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        // Si no es JSON, asumir que es un código directo
        qrData = { codigo: data, type: 'ENVIO' };
      }

      console.log('QR Escaneado:', qrData);

      if (qrData.type === 'ENVIO' || qrData.envio_id) {
        // Si tenemos el ID del envío, usarlo directamente
        const envioId = qrData.envio_id || qrData.id;
        
        if (envioId) {
          // Navegar directamente a la vista de QR con detalle
          setLoading(false);
          navigation.replace('QRView', { envioId: envioId });
        } else if (qrData.codigo) {
          // Si solo tenemos el código, buscar el envío
          const envio = await envioService.getByCode(qrData.codigo);
          setLoading(false);
          navigation.replace('QRView', { envioId: envio.id });
        } else {
          throw new Error('QR no contiene información válida');
        }
      } else {
        setLoading(false);
        Alert.alert(
          'QR No Reconocido',
          'Este código QR no corresponde a un envío válido',
          [
            {
              text: 'Escanear Otro',
              onPress: () => {
                setScanned(false);
              }
            },
            {
              text: 'Cancelar',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error al procesar QR:', error);
      setLoading(false);
      Alert.alert(
        'Error',
        `No se pudo encontrar el envío: ${error.message || 'Error desconocido'}`,
        [
          {
            text: 'Escanear Otro',
            onPress: () => {
              setScanned(false);
            }
          },
          {
            text: 'Cancelar',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Icon name="camera-off" size={64} color="#999" />
        <Text style={styles.text}>No se otorgó permiso para usar la cámara</Text>
        <Button 
          mode="contained" 
          onPress={requestPermission}
          style={styles.button}
        >
          Conceder permiso
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Volver
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <Surface style={styles.instructionCard}>
              <Icon name="qrcode-scan" size={32} color="#2196F3" />
              <Text style={styles.instructionText}>
                {loading ? 'Procesando...' : 'Apunta al código QR del envío'}
              </Text>
              {loading && <ActivityIndicator size="small" color="#2196F3" />}
            </Surface>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              textColor="#fff"
            >
              Cancelar
            </Button>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  button: {
    marginTop: 20,
    minWidth: 200,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scanArea: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2196F3',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#2196F3',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 20,
    borderColor: '#fff',
  },
});


