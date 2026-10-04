import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { departments } from '../constants/constants';
import { adminService } from '../services/api';

const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

export default function AdminDashboard() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user, logout } = useAuth();
  
  console.log('AdminDashboard user:', user);
  console.log('AdminDashboard token:', user?.token);
  
  const [fullName, setFullName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [year, setYear] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generalInfo, setGeneralInfo] = useState('');
  const [role, setRole] = useState('staff');
  const [gender, setGender] = useState('male');
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClearData = async () => {
    showAlert(
      'Clear All Data',
      'Are you sure you want to delete all complete data from the database? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await adminService.clearAllData();
              showAlert('Success', 'All data has been cleared successfully.');
            } catch (err) {
              showAlert('Error', err?.message || 'Failed to clear data');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleRegisterStaff = async () => {
    if (!fullName || !staffId || !department || !password || !email || !phone) {
      showAlert('Error', 'Please fill all required fields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showAlert('Error', 'Please enter a valid email address.');
      return;
    }
    if (role === 'staff' && !year) {
      showAlert('Error', 'Please select a year for staff.');
      return;
    }

    setLoading(true);

    try {
      const data = {
        staff_id: staffId,
        name: fullName,
        gender: gender,
        department: department,
        email: email.trim(),
        phone: phone.trim(),
        password: password,
        general_info: generalInfo,
        ...(role === 'staff' ? { year } : {}),
      };

      console.log('Sending data to create staff:', data);

      if (role === 'hod') {
        await adminService.createHod(data);
      } else {
        await adminService.createStaff(data);
      }

      showAlert('Success', `${role === 'hod' ? 'HOD' : 'Staff'} created successfully!`);
       
      // Reset form
      setFullName('');
      setStaffId('');
      setDepartment('');
      setPassword('');
      setEmail('');
      setPhone('');
      setYear('');
      setGender('male');
      setGeneralInfo('');
    } catch (err) {
      console.error('Create staff error:', err);
      showAlert('Error', err?.message || 'Failed to create staff');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setStaffId('');
    setDepartment('');
    setPassword('');
    setEmail('');
    setPhone('');
    setYear('');
    setGender('male');
    setGeneralInfo('');
    setRole('staff');
  };

  return (
    <View style={styles.container}>
      {/* Top Header - Blue Gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.logoImage} />
          <Text style={styles.logoText}>SEC Flow</Text>
        </View>
        <Text style={styles.headerSubtitle}>Add a HOD and Staff member</Text>
      </View>

      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.form}>
            {/* 1. Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Dr. Julian Pierce"
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
                <MaterialIcons name="account-balance" size={20} color="#6B7280" style={styles.inputIcon} />
                <Text style={[styles.input, !department && styles.placeholder]}>
                  {department || 'Select Department'}
                </Text>
                <MaterialIcons name="expand-more" size={20} color="#6B7280" />
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

            {/* 3. Staff ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Staff ID</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="badge" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="AS-2024-001"
                  placeholderTextColor="#9CA3AF"
                  value={staffId}
                  onChangeText={setStaffId}
                />
              </View>
            </View>

            {/* 4. Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
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
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="staff@university.edu"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* 6. Phone No. */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone No.</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="call" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., +91 98765 43210"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* 7. General Info */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>General Info</Text>
              <View style={styles.textareaContainer}>
                <MaterialIcons name="description" size={20} color="#6B7280" style={styles.textareaIcon} />
                <TextInput
                  style={styles.textarea}
                  placeholder="Brief biography, research focus, or administrative responsibilities..."
                  placeholderTextColor="#9CA3AF"
                  value={generalInfo}
                  onChangeText={setGeneralInfo}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Gender Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>Gender</Text>
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[styles.roleOption, gender === 'male' && styles.roleOptionActive]}
                  onPress={() => setGender('male')}
                >
                  <View style={[styles.radioOuter, gender === 'male' && styles.radioOuterActive]}>
                    {gender === 'male' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.roleText, gender === 'male' && styles.roleTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, gender === 'female' && styles.roleOptionActive]}
                  onPress={() => setGender('female')}
                >
                  <View style={[styles.radioOuter, gender === 'female' && styles.radioOuterActive]}>
                    {gender === 'female' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.roleText, gender === 'female' && styles.roleTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>Access Level</Text>
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'staff' && styles.roleOptionActive]}
                  onPress={() => setRole('staff')}                >
                  <View style={[styles.radioOuter, role === 'staff' && styles.radioOuterActive]}>
                    {role === 'staff' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.roleText, role === 'staff' && styles.roleTextActive]}>Academic Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'hod' && styles.roleOptionActive]}
                  onPress={() => { setRole('hod'); setYear(''); }}                >
                  <View style={[styles.radioOuter, role === 'hod' && styles.radioOuterActive]}>
                    {role === 'hod' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.roleText, role === 'hod' && styles.roleTextActive]}>Head of Department (HOD)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Year - Academic Staff only (dynamic dropdown) */}
            {role === 'staff' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Year</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={year}
                    onValueChange={(v) => setYear(v)}
                    dropdownIconColor="#6B7280"
                  >
                    <Picker.Item label="Select Year" value="" />
                    {YEARS.map((y) => (
                      <Picker.Item key={y} label={y} value={y} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
                onPress={handleRegisterStaff}
                disabled={loading}
              >
                <MaterialIcons name="person-add" size={18} color="white" />
                <Text style={styles.submitButtonText}>
                  {loading ? 'Creating...' : 'Register Staff'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation - Horizontal */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={handleClearData}>
          <MaterialIcons name="delete-forever" size={22} color="#DC2626" />
          <Text style={styles.bottomNavTextDanger}>Clear Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomNavItem} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color="#6B7280" />
          <Text style={styles.bottomNavText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F8',
  },
  header: {
    backgroundColor: '#1A429A',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  form: {
    padding: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111418',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  inputIcon: {
    marginRight: 12,
  },
  pickerWrapper: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111418',
    padding: 0,
  },
  placeholder: {
    color: '#9CA3AF',
  },
  textareaContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 120,
  },
  textareaIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  textarea: {
    flex: 1,
    fontSize: 14,
    color: '#111418',
    textAlignVertical: 'top',
  },
  pickerDropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 250,
    overflow: 'hidden',
    zIndex: 10,
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
    backgroundColor: '#156BC1',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#111418',
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
  modalScroll: {
    maxHeight: 500,
    paddingHorizontal: 8,
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
    color: '#111418',
  },
  modalScroll: {
    maxHeight: 500,
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
    color: '#111418',
  },
  modalItemTextActive: {
    color: '#1A429A',
    fontWeight: '600',
  },
  roleSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111418',
    marginBottom: 16,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 24,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#156BC1',
    backgroundColor: '#156BC1',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  roleTextActive: {
    color: '#156BC1',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#156BC1',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EEF6FF',
  },
  infoCardSecondary: {
    backgroundColor: '#F3F4F6',
  },
  infoCardText: {
    flex: 1,
    fontSize: 12,
    color: '#004787',
    lineHeight: 18,
  },
  infoCardTextSecondary: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  bottomNavText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  bottomNavTextDanger: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
    marginTop: 4,
  },
});