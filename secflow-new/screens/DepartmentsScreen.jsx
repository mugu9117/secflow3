import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';

const DEPARTMENTS = [
  { name: 'Computer Science & Engineering', code: 'CSE', staffCount: 12 },
  { name: 'Electronics & Communication Engineering', code: 'ECE', staffCount: 10 },
  { name: 'Electrical & Electronics Engineering', code: 'EEE', staffCount: 8 },
  { name: 'Mechanical Engineering', code: 'MECH', staffCount: 15 },
  { name: 'Civil Engineering', code: 'CIVIL', staffCount: 9 },
];

const DepartmentsScreen = () => {
  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <Header title="Departments" showBack={true} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: '#666666' }]}>
          5 Departments • Total Staff: 54
        </Text>
        
        {DEPARTMENTS.map((dept, index) => (
          <View key={index} style={styles.deptCard}>
            <View style={[styles.deptIcon, { backgroundColor: '#1A429A20' }]}>
              <Ionicons name="business" size={24} color="#1A429A" />
            </View>
            <View style={styles.deptInfo}>
              <Text style={[styles.deptName, { color: '#000000' }]}>{dept.name}</Text>
              <Text style={[styles.deptCode, { color: '#666666' }]}>
                {dept.code} • {dept.staffCount} Staff Members
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  deptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  deptIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deptCode: {
    fontSize: 13,
  },
});

export default DepartmentsScreen;