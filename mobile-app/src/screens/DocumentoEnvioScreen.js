import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Appbar, FAB } from 'react-native-paper';
import { WebView } from 'react-native-webview';

export default function DocumentoEnvioScreen({ route, navigation }) {
  const { documentURL, codigo } = route.params;
  const [loading, setLoading] = useState(true);

  // Cache-busting: agregar timestamp para forzar recarga
  const urlConCacheBusting = `${documentURL}${documentURL.includes('?') ? '&' : '?'}v=${Date.now()}`;

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#4CAF50' }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFF" />
        <Appbar.Content title={`Documento ${codigo || ''}`} titleStyle={{ color: '#FFF', fontWeight: 'bold' }} />
      </Appbar.Header>

      <WebView
        source={{ uri: urlConCacheBusting }}
        style={styles.webview}
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
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFF',
  },
});
