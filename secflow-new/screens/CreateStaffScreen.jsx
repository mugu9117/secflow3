import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Button from '../components/Button';
import Input from '../components/Input';
import Header from '../components/Header';
import { adminService } from '../services/api';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const CreateStaffScreen = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [roll_no, setRollNo] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [department, setDepartment] = useState('CSE');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!roll_no || !name || !password) {
      setError('Please fill all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await adminService.createStaff({
        roll_no,
        name,
        gender,
        department,
        password,
      });
      showAlert('Success', 'Staff member created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <Header title="Create Staff" showBack={true} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: '#000000' }]}>Staff Details</Text>
          
          <Input
            label="Staff ID / Roll No"
            value={roll_no}
            onChangeText={setRollNo}
            placeholder="Enter staff ID"
          />

          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter staff name"
          />

          <Text style={[styles.label, { color: '#000000' }]}>Gender</Text>
          <View style={[styles.pickerContainer, { backgroundColor: '#F0F0F0', borderColor: '#E5E5E5' }]}>
            <Picker
              selectedValue={gender}
              onValueChange={setGender}
              style={{ color: '#000000' }}
            >
              {GENDERS.map((g) => (
                <Picker.Item key={g.value} label={g.label} value={g.value} />
              ))}
            </Picker>
          </View>

          <Text style={[styles.label, { color: '#000000' }]}>Department</Text>
          <View style={[styles.pickerContainer, { backgroundColor: '#F0F0F0', borderColor: '#E5E5E5' }]}>
            <Picker
              selectedValue={department}
              onValueChange={setDepartment}
              style={{ color: '#000000' }}
            >
              {DEPARTMENTS.map((d) => (
                <Picker.Item key={d} label={d} value={d} />
              ))}
            </Picker>
          </View>

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Set initial password"
            secureTextEntry
          />

          {error ? (
            <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          ) : null}

          <Button 
            title="Create Staff" 
            onPress={handleCreate}
            loading={loading}
          />
        </View>
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
  card: {
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginVertical: 8,
    textAlign: 'center',
  },
});

export default CreateStaffScreen;