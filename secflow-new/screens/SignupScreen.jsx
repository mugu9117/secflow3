import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../services/api';
import { departments } from '../constants/constants';

const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

export default function SignupScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('male');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !department || !regNumber || !rollNumber || !email || !phone || !password) {
      showAlert('Error', 'Please fill all fields');
      return;
    }
    if (!agreedToTerms) {
      showAlert('Error', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      await authService.signup({
        roll_no: rollNumber,
        name: fullName,
        gender: gender,
        department: department,
        email: email,
        phone: phone,
        reg_no: regNumber,
        academic_year: academicYear,
        password: password,
      });
      showAlert('Success', 'Account created! Please login.', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (err) {
      showAlert('Error', err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {/* Blue Gradient Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerPlaceholder} />
            <View style={styles.headerCenter}>
              <Image source={require('../assets/images/sec_logo.png')} style={styles.logoImage} />
              <Text style={styles.logoTitle}>SEC Flow</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitleText}>Set up your institutional profile</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Signup Form Card */}
          <View style={styles.formCard}>
            <View style={styles.form}>
              {/* 1. Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* 2. Department */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Department</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDeptPicker(true)}
              >
                <MaterialIcons name="account-tree" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <Text style={[styles.input, !department && styles.placeholder]}>
                  {department || 'Select Department'}
                </Text>
                <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

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
                    {departments.map((dept) => (
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

            {/* Gender Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderOption, gender === 'male' && styles.genderOptionActive]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, gender === 'female' && styles.genderOptionActive]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Academic Year */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Academic Year</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowYearPicker(!showYearPicker)}
              >
                <MaterialIcons name="event-note" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <Text style={[styles.input, !academicYear && styles.placeholder]}>
                  {academicYear || 'Select Year'}
                </Text>
                <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showYearPicker && (
                <View style={styles.pickerDropdown}>
                  {YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.pickerItem, academicYear === year && styles.pickerItemActive]}
                      onPress={() => {
                        setAcademicYear(year);
                        setShowYearPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, academicYear === year && styles.pickerItemTextActive]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 4. Registration No */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Registration No.</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="badge" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. REG12345"
                  placeholderTextColor="#9CA3AF"
                  value={regNumber}
                  onChangeText={setRegNumber}
                />
              </View>
            </View>

            {/* 5. Roll Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Roll Number</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="numbers" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. CS042"
                  placeholderTextColor="#9CA3AF"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                />
              </View>
            </View>

            {/* 6. Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="student@university.edu"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* 7. Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone No.</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="call" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., +1 234 567 890"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* 8. Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a strong password"
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

            {/* Terms Checkbox */}
            <TouchableOpacity 
              style={styles.termsRow}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                {agreedToTerms && <MaterialIcons name="check" size={14} color="white" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.linkText}>Terms of Service</Text> and acknowledge the <Text style={styles.linkText}>Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={styles.signupButton} 
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.signupButtonText}>
                {loading ? 'Signing up...' : 'Sign Up'}
              </Text>
              {!loading && <MaterialIcons name="arrow-forward" size={20} color="white" />}
            </TouchableOpacity>
          </View>
        </View>
        </View>

        {/* Footer */}
        <View style={styles.pageFooter}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerCopyright}>© 2024 SEC Flow Institutional Portal. All rights reserved.</Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerLink}>Terms of Service</Text>
            <Text style={styles.footerLink}>Support</Text>
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
    paddingBottom: 40,
  },
  backBtn: {
    padding: 8,
  },
  backText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerPlaceholder: {
    width: 40,
  },
  header: {
    backgroundColor: '#1A429A',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
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
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#1A429A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
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
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
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
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 10,
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
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  genderOptionActive: {
    backgroundColor: '#1A429A',
    borderColor: '#1A429A',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  genderTextActive: {
    color: 'white',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#1A429A',
    borderColor: '#1A429A',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  linkText: {
    color: '#1A429A',
    fontWeight: '600',
  },
  signupButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A429A',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#1A429A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  pageFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A429A',
  },
  footerCopyright: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  footerLink: {
    fontSize: 12,
    color: '#6B7280',
  },
});