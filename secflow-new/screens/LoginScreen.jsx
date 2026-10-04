import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { departments as deptList } from '../constants/constants';

export default function LoginScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { login } = useAuth();
  const [loginType, setLoginType] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const handleLogin = async () => {
    const identifier = studentId;
    
    if (!identifier || !password) {
      showAlert('Error', 'Please fill all fields');
      return;
    }

    if (loginType === 'student' && !department) {
      showAlert('Error', 'Please select your department');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(identifier, password, loginType === 'student' ? department : undefined);
      console.log('Login response:', response);
      await login(response);
      
      // Navigate directly based on role
      console.log('Navigation - role:', response.role);
      if (response.role === 'admin') {
        router.replace('/admin');
      } else if (response.role === 'hod') {
        router.replace('/hod');
      } else if (response.role === 'staff') {
        router.replace('/staff');
      } else {
        router.replace('/student');
      }
    } catch (err) {
      console.log('Login error:', err);
      const errorMsg = err.message || '';
      if (errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('timeout')) {
        showAlert(
          'Connection Error', 
          `Cannot connect to server at http://10.20.132.64:5000\n\nPlease ensure:\n1. Backend is running\n2. Correct IP address\n\nError: ${errorMsg}`
        );
      } else {
        showAlert('Error', err?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
        {/* Blue Gradient Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image source={require('../assets/images/sec_logo.png')} style={styles.logoImage} />
            <Text style={styles.logoTitle}>SEC Flow</Text>
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome Back </Text>
            <Text style={styles.subtitleText}>Sign in to access your academic hub.</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* White Card */}
          <View style={styles.card}>
            {/* Segmented Picker */}
            <View style={styles.segmentedPicker}>
              <TouchableOpacity 
                style={[styles.segmentBtn, loginType === 'student' && styles.segmentBtnActive]} 
                onPress={() => setLoginType('student')}
              >
                <Text style={[styles.segmentText, loginType === 'student' && styles.segmentTextActive]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, loginType === 'staff' && styles.segmentBtnActive]} 
                onPress={() => router.push('/staff-login')}
              >
                <Text style={[styles.segmentText, loginType === 'staff' && styles.segmentTextActive]}>Staff</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {/* Student ID */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Student ID</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="badge" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="e.g., 2024-00123"
                    placeholderTextColor="#9CA3AF"
                    value={studentId}
                    onChangeText={setStudentId}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Department - Only show for student */}
              {loginType === 'student' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Department</Text>
                  <TouchableOpacity 
                    style={styles.inputContainer}
                    onPress={() => setShowDeptPicker(true)}
                  >
                    <MaterialIcons name="account-tree" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <Text style={[styles.input, !department && styles.placeholder]}>
                      {department || 'Select your department'}
                    </Text>
                    <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Department Popup Modal */}
              {showDeptPicker && (
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Department</Text>
                      <TouchableOpacity onPress={() => setShowDeptPicker(false)}>
                        <MaterialIcons name="close" size={24} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll} nestedScrollEnabled={true}>
                      {deptList.map((dept) => (
                        <TouchableOpacity
                          key={dept}
                          style={[
                            styles.modalItem,
                            department === dept && styles.modalItemActive
                          ]}
                          onPress={() => {
                            setDepartment(dept);
                            setShowDeptPicker(false);
                          }}
                        >
                          <Text style={[
                            styles.modalItemText,
                            department === dept && styles.modalItemTextActive
                          ]}>{dept}</Text>
                          {department === dept && (
                            <MaterialIcons name="check" size={20} color="#1A429A" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
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
                      name={showPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={handleLogin} 
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Logging in...' : 'Login'}
                </Text>
                {!loading && <MaterialIcons name="arrow-forward" size={20} color="white" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Links */}
          <View style={styles.bottomLinks}>
            <Text style={styles.bottomText}>New student? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.linkText}>Activate account</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.helpButton}>
            <MaterialIcons name="support-agent" size={18} color="#6B7280" />
            <Text style={styles.helpText}>Need help logging in?</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 SEC Flow Institutional Portal</Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>Privacy</Text>
              <Text style={styles.footerLink}>Terms</Text>
              <Text style={styles.footerLink}>Help</Text>
            </View>
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
  logoContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
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
  segmentedPicker: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#1A429A',
    fontWeight: '700',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
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
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
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
  placeholder: {
    color: '#9CA3AF',
  },
  pickerDropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 250,
    overflow: 'hidden',
    zIndex: 1000,
  },
  pickerScroll: {
    maxHeight: 250,
  },
  pickerContent: {
    paddingBottom: 10,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemActive: {
    backgroundColor: '#1A429A',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#111827',
  },
  pickerItemTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalScroll: {
    maxHeight: 500,
    paddingHorizontal: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalItemActive: {
    backgroundColor: '#1A429A10',
  },
  modalItemText: {
    fontSize: 15,
    color: '#111827',
  },
  modalItemTextActive: {
    color: '#1A429A',
    fontWeight: '600',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A429A',
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
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  bottomText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A429A',
  },
  helpButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
  },
  helpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});