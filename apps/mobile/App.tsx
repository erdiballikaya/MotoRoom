import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import MotoRoomApp from './src/MotoRoomApp';

type RootErrorBoundaryState = {
  hasError: boolean;
};

class RootErrorBoundary extends Component<{ children: ReactNode }, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.shell}>
        <View style={styles.card}>
          <Text style={styles.title}>MotoRoom acil durum ekranı</Text>
          <Text style={styles.body}>Uygulama açılırken beklenmeyen bir hata oluştu. Tekrar deneyebilirsin.</Text>
          <Pressable onPress={this.handleRetry} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Tekrar dene</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

export default function App() {
  return (
    <RootErrorBoundary>
      <MotoRoomApp />
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#f6efe3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24
  },
  title: {
    color: '#22160e',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12
  },
  body: {
    color: '#5f5247',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22160e',
    borderRadius: 16,
    minHeight: 52
  },
  buttonPressed: {
    opacity: 0.86
  },
  buttonText: {
    color: '#f6efe3',
    fontSize: 15,
    fontWeight: '700'
  }
});
