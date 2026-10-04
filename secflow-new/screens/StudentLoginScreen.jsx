import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { departments } from '../constants/constants';

export default function StudentLoginScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { login } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!studentId) {
      showAlert('Error', 'Please enter your Student ID');
      return;
    }
    if (!department || department === 'Select your department') {
      showAlert('Error', 'Please select your department');
      return;
    }
    if (!password) {
      showAlert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(studentId, password, department);
      await login(response);
      router.replace('/student');
    } catch (err) {
      showAlert('Error', err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleActivateAccount = () => {
    router.push('/signup');
  };

  const handleHelp = () => {
    showAlert('Help Desk', 'Contact help desk for assistance.');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.formTitle}>Welcome Back</Text>
      <Text style={styles.formSubtitle}>Sign in to access your academic hub.</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Student ID</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 2024-00123"
          placeholderTextColor="#aaa"
          value={studentId}
          onChangeText={setStudentId}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Department</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={department}
            onValueChange={(itemValue) => setDepartment(itemValue)}
            style={styles.picker}
            dropdownIconColor="#666"
          >
            <Picker.Item label="Select your department" value="" />
            {departments.map((dept) => (
              <Picker.Item key={dept} label={dept} value={dept} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="··········"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordLink}>
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <Text style={styles.loginButtonText}>Logging in...</Text>
        ) : (
          <Text style={styles.loginButtonText}>Login →</Text>
        )}
      </TouchableOpacity>

      <View style={styles.activateContainer}>
        <Text style={styles.plainText}>New student? </Text>
        <TouchableOpacity onPress={handleActivateAccount}>
          <Text style={styles.linkTextBold}>Activate account</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.helpLink} onPress={handleHelp}>
        <Text style={styles.linkText}>Need help logging in?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#0f172a',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#1A429A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  plainText: {
    fontSize: 14,
    color: '#475569',
  },
  helpLink: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#1A429A',
  },
  linkTextBold: {
    fontSize: 14,
    color: '#1A429A',
    fontWeight: '600',
  },
});