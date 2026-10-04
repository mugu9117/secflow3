import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function Header({ title }) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.backButton} />
        <View style={styles.titleContainer}>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.logo} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.backButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1A429A',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
