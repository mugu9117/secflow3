import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { userService, staffService } from '../services/api';

const SettingsScreen = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user, logout, updateUser } = useAuth();
  // Profile is always light theme
  const colors = {
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#1A429A',
    border: '#E5E7EB',
  };
  const [studentInfo, setStudentInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', email: '', phone: '', regNo: '', academicYear: '' });
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isStaffOrHod = user?.role === 'staff' || user?.role === 'hod';
  const canEdit = user?.role === 'student' || isStaffOrHod;
  const YEAR_OPTIONS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

  useEffect(() => {
    loadStudentInfo();
  }, []);

  const loadStudentInfo = async () => {
    try {
      if (user?.role === 'staff' || user?.role === 'hod') {
        const info = await staffService.getMyInfo();
        setStudentInfo(info);
      } else {
        const info = await userService.getStudentInfo();
        setStudentInfo(info);
      }
    } catch (err) {
      console.log('Error loading student info:', err);
    }
  };

  const startEdit = () => {
    setForm({
      name: studentInfo?.name || user?.name || '',
      department: studentInfo?.department || user?.department || '',
      email: studentInfo?.email || '',
      phone: studentInfo?.phone || '',
      regNo: studentInfo?.reg_no || '',
      academicYear: studentInfo?.academic_year || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {    if (!form.name.trim()) {
      showAlert('Error', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      if (isStaffOrHod) {
        const res = await staffService.updateMyProfile({
          name: form.name.trim(),
          department: form.department.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        });
        await updateUser({ name: res.staff.name, department: res.staff.department });
        setStudentInfo(res.staff);
      } else {
        const res = await userService.updateMyProfile({
          name: form.name.trim(),
          department: form.department.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          reg_no: form.regNo.trim(),
          academic_year: form.academicYear,
        });
        await updateUser({ name: res.student.name, department: res.student.department });
        setStudentInfo(res.student);
      }
      setEditing(false);
      showAlert('Success', 'Profile updated successfully.');
    } catch (err) {
      showAlert('Error', err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwForm.current) {
      showAlert('Error', 'Please enter your current password.');
      return;
    }
    if (pwForm.next.length < 6) {
      showAlert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      showAlert('Error', 'New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      const res = await staffService.changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      showAlert('Success', res.message || 'Password changed successfully.', [
        {
          text: 'OK',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]);
    } catch (err) {
      showAlert('Error', err?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return '#EF4444';
      case 'hod':
        return '#10B981';
      case 'staff':
        return '#1A429A';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileCard}>
          <View style={styles.profileContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {(studentInfo?.name || user?.name)?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: colors.text }]}>{studentInfo?.name || user?.name}</Text>
              <Text style={[styles.rollNo, { color: colors.textSecondary }]}>
                {studentInfo?.roll_no || studentInfo?.staff_id || user?.staff_id || user?.roll_no || (isStaffOrHod ? user?.department || '' : 'Student')}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user?.role) }]}>
                <Text style={styles.roleText}>
                  {user?.role?.toUpperCase() || 'STUDENT'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Profile Information
        </Text>

        {canEdit && !editing && (
          <TouchableOpacity style={[styles.editBtn, { borderColor: colors.primary }]} onPress={startEdit}>
            <Ionicons name="pencil" size={16} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <Card>
          {!editing ? (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.name || user?.name}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{isStaffOrHod ? 'Staff ID' : 'Roll No'}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.roll_no || studentInfo?.staff_id || user?.staff_id || '-'}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Department</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.department || user?.department}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.email || '-'}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.phone || '-'}</Text>
              </View>
              {!isStaffOrHod && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Course</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.course || '-'}</Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Academic Year</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.academic_year || '-'}</Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="Enter full name"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{isStaffOrHod ? 'Staff ID' : 'Roll No'}</Text>
                <View style={styles.lockRow}>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{studentInfo?.staff_id || studentInfo?.roll_no || user?.staff_id || '-'}</Text>
                  <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Role</Text>
                <View style={styles.lockRow}>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{(user?.role || '').toUpperCase()}</Text>
                  <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                </View>
              </View>
              <Text style={[styles.lockNote, { color: colors.textSecondary }]}>
                {isStaffOrHod ? 'Staff ID and role cannot be changed' : 'Roll number and role cannot be changed'}
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Department</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={form.department}
                onChangeText={(t) => setForm({ ...form, department: t })}
                placeholder="Enter department"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={form.email}
                onChangeText={(t) => setForm({ ...form, email: t })}
                placeholder="Enter email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Phone</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
              {!isStaffOrHod && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Registration No.</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                    value={form.regNo}
                    onChangeText={(t) => setForm({ ...form, regNo: t })}
                    placeholder="Enter registration number"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Academic Year</Text>
                  <TouchableOpacity
                    style={[styles.fieldInput, styles.yearBox]}
                    onPress={() => setShowYearPicker(true)}
                  >
                    <Text style={[{ fontSize: 14 }, form.academicYear ? { color: colors.text } : { color: colors.textSecondary }]}>
                      {form.academicYear || 'Select academic year'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}
              <View style={styles.editBtnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setEditing(false)}
                  disabled={saving}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Card>

        {isStaffOrHod && editing && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Change Password
            </Text>
            <Card>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Current Password</Text>
              <View style={[styles.pwInputWrap, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.pwInput, { color: colors.text }]}
                  value={pwForm.current}
                  onChangeText={(t) => setPwForm({ ...pwForm, current: t })}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>New Password</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={pwForm.next}
                onChangeText={(t) => setPwForm({ ...pwForm, next: t })}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={pwForm.confirm}
                onChangeText={(t) => setPwForm({ ...pwForm, confirm: t })}
                placeholder="Repeat new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 20 }, pwSaving && styles.saveBtnDisabled]}
                onPress={handlePasswordChange}
                disabled={pwSaving}
              >
                <Text style={styles.saveBtnText}>{pwSaving ? 'Updating...' : 'Update Password'}</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          App Info
        </Text>

        <Card>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>SECFlow</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>
        </Card>

        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showYearPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Academic Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {YEAR_OPTIONS.map((y) => (
              <TouchableOpacity
                key={y}
                style={[styles.modalItem, form.academicYear === y && styles.modalItemActive]}
                onPress={() => {
                  setForm({ ...form, academicYear: y });
                  setShowYearPicker(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  form.academicYear === y && styles.modalItemTextActive
                ]}>{y}</Text>
                {form.academicYear === y && (
                  <Ionicons name="checkmark" size={20} color="#1A429A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000000' },
  headerLogo: { width: 36, height: 36, borderRadius: 8 },
  placeholder: { width: 40 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    padding: 20,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rollNo: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  pwInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  pwInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    paddingHorizontal: 0,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  yearBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    overflow: 'hidden',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemActive: {
    backgroundColor: '#EFF4FF',
  },
  modalItemText: {
    fontSize: 15,
    color: '#111827',
  },
  modalItemTextActive: {
    color: '#1A429A',
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeText: {
    marginLeft: 12,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  themeSubtitle: {
    fontSize: 12,
  },
  logoutContainer: {
    marginTop: 32,
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
