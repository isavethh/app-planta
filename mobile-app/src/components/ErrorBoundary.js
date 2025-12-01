import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 ERROR BOUNDARY CAPTURÓ UN ERROR:');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>💥 Algo salió mal</Text>
          <Text style={styles.subtitle}>La aplicación encontró un error</Text>
          
          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            
            <Text style={styles.errorTitle}>Mensaje:</Text>
            <Text style={styles.errorText}>{this.state.error?.message}</Text>
            
            <Text style={styles.errorTitle}>Stack:</Text>
            <Text style={styles.errorStack}>{this.state.error?.stack}</Text>
            
            {this.state.errorInfo && (
              <>
                <Text style={styles.errorTitle}>Component Stack:</Text>
                <Text style={styles.errorStack}>{this.state.errorInfo.componentStack}</Text>
              </>
            )}
          </ScrollView>
          
          <Button 
            mode="contained" 
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={styles.button}
          >
            Intentar de nuevo
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    marginTop: 10,
  },
});

export default ErrorBoundary;
