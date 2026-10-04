import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function Loading({ text = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1A429A" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
