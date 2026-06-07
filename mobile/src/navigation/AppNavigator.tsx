import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/tokens';

// Navigation will be set up after installing:
// npm install @react-navigation/native @react-navigation/stack
// react-native-screens react-native-safe-area-context

// Placeholder — replace with full navigator after deps installed
export const AppNavigator = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WorkSphere</Text>
      <Text style={styles.subtitle}>Mobile App Foundation Ready</Text>
      <Text style={styles.note}>Run install-deps.bat then implement navigation</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.muted,
    marginBottom: 16,
  },
  note: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
