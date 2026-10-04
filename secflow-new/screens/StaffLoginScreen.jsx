import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

export default function StaffLoginScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { login } = useAuth();
  const [role, setRole] = useState('staff');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!staffId || !password) {
      showAlert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(staffId, password);
      
      // Validate: Staff login should only allow staff/hod/admin roles
      if (response.role === 'student') {
        showAlert('Access Denied', 'Students must use the student login page.');
        setLoading(false);
        return;
      }
      
      await login(response);
      
      if (response.role === 'admin') {
        router.replace('/admin');
      } else if (response.role === 'hod') {
        router.replace('/hod');
      } else {
        router.replace('/staff');
      }
    } catch (err) {
      showAlert('Error', err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { key: 'staff', label: 'Staff' },
    { key: 'hod', label: 'HOD' },
    { key: 'admin', label: 'Admin' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Blue Gradient Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image source={require('../assets/images/sec_logo.png')} style={styles.logoImage} />
            <Text style={styles.logoTitle}>SEC Flow</Text>
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>Staff and Faculty Portal</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.card}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Staff Login</Text>
              <Text style={styles.formSubtitle}>Select your role and enter credentials.</Text>
            </View>

            <View style={styles.form}>
              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Role</Text>
                <View style={styles.rolePicker}>
                  {roles.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.roleBtn, role === r.key && styles.roleBtnActive]}
                      onPress={() => setRole(r.key)}
                    >
                      <Text style={[styles.roleText, role === r.key && styles.roleTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Staff ID */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Staff ID</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="badge" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. AZ-10029"
                    placeholderTextColor="#9CA3AF"
                    value={staffId}
                    onChangeText={setStaffId}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.label}>Password</Text>
                  {role !== 'admin' && (
                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                      <Text style={styles.forgotLink}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me */}
              <TouchableOpacity 
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <MaterialIcons name="check" size={14} color="white" />}
                </View>
                <Text style={styles.rememberText}>Keep me logged in for 30 days</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Signing in...' : 'Sign Into Portal'}
                </Text>
                {!loading && <MaterialIcons name="arrow-forward" size={18} color="white" />}
              </TouchableOpacity>

              {/* Help Link */}
              <View style={styles.helpSection}>
                <Text style={styles.helpText}>Having trouble signing in? </Text>
                <TouchableOpacity>
                  <Text style={styles.helpLink}>Contact IT Support</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 SEC Flow Institutional Portal. All rights reserved.</Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerLink}>Terms of Service</Text>
            <Text style={styles.footerLink}>Help Desk</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#1A429A',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  logoTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  headerContent: {
    marginBottom: 10,
  },
  welcomeText: {
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#1A429A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111418',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A429A',
  },
  rolePicker: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleBtnActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  roleTextActive: {
    color: '#1A429A',
    fontWeight: '600',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1A429A',
    borderColor: '#1A429A',
  },
  rememberText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  loginButton: {
    backgroundColor: '#1A429A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    shadowColor: '#1A429A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  helpSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(209,213,219,0.3)',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
  },
  helpLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A429A',
  },
  footer: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
});