import React, { useState } from 'react';
import { View, StyleSheet, Alert, Share, StatusBar, Platform } from 'react-native';
import { Appbar } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function DocumentoEnvioScreen({ route, navigation }) {
  const { documentURL, codigo } = route.params || {};
  const [loading, setLoading] = useState(true);

  console.log('📄 [DocumentoEnvio] Parámetros recibidos:', { documentURL, codigo });

  // Validar que documentURL existe
  if (!documentURL) {
    console.error('❌ [DocumentoEnvio] documentURL no está definido');
    return null;
  }

  // Cache-busting: agregar timestamp para forzar recarga
  const urlConCacheBusting = `${documentURL}${documentURL.includes('?') ? '&' : '?'}v=${Date.now()}`;

  // Manejar mensajes del WebView (botones del documento)
  const handleWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('📩 Mensaje del WebView:', message);

      switch (message.action) {
        case 'print':
          await handlePrint(message);
          break;
        case 'download':
          await handleDownload(message);
          break;
        case 'close':
          navigation.goBack();
          break;
        case 'ready':
          console.log('✅ Documento listo');
          break;
        default:
          console.log('⚠️ Acción desconocida:', message.action);
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);
    }
  };

  const handlePrint = async (message) => {
    try {
      console.log('🖨️ Generando documento para imprimir...');
      
      const html = await fetchHTMLContent();
      const { uri } = await Print.printToFileAsync({ html });
      
      console.log('✅ PDF generado:', uri);
      await Print.printAsync({ uri });
      
      Alert.alert('✅ Éxito', 'Documento enviado a impresora');
    } catch (error) {
      console.error('❌ Error al imprimir:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo imprimir. ¿Desea compartirlo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Compartir', onPress: () => handleDownload(message) }
        ]
      );
    }
  };

  const handleDownload = async (message) => {
    try {
      console.log('📥 Generando PDF...');
      
      const html = await fetchHTMLContent();
      const { uri } = await Print.printToFileAsync({ html });
      
      console.log('✅ PDF generado:', uri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Documento ${message.codigo || codigo}`,
          UTI: 'com.adobe.pdf',
        });
        Alert.alert('✅ Éxito', 'PDF generado correctamente');
      } else {
        await Share.share({
          title: `Documento ${message.codigo || codigo}`,
          url: uri,
        });
      }
    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      Alert.alert('❌ Error', 'No se pudo generar el PDF');
    }
  };

  const fetchHTMLContent = async () => {
    try {
      const response = await fetch(urlConCacheBusting);
      return await response.text();
    } catch (error) {
      console.error('❌ Error al obtener HTML:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#4CAF50' }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFF" />
        <Appbar.Content title={`Documento ${codigo || ''}`} titleStyle={{ color: '#FFF', fontWeight: 'bold' }} />
      </Appbar.Header>

      <WebView
        source={{ uri: urlConCacheBusting }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        cacheEnabled={false}
        incognito={true}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        bounces={true}
        scrollEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        injectedJavaScript={`
          const meta = document.createElement('meta');
          meta.setAttribute('name', 'viewport');
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
          document.getElementsByTagName('head')[0].appendChild(meta);
          true;
        `}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: STATUSBAR_HEIGHT,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFF',
    width: '100%',
    height: '100%',
  },
});
