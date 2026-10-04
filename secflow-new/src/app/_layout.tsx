import { Stack } from 'expo-router';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { AlertProvider } from '../../context/AlertContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AlertProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="verify-qr" />
          <Stack.Screen name="messages/index" />
          <Stack.Screen name="messages/chat" />
          <Stack.Screen name="verify-otp" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="staff-login" />
          <Stack.Screen name="student-login" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="request-detail" />
          <Stack.Screen name="departments" />
          <Stack.Screen name="download-success" />
          <Stack.Screen name="create-staff" />
          <Stack.Screen name="create-hod" />
          <Stack.Screen name="student/index" />
          <Stack.Screen name="student/leave" />
          <Stack.Screen name="student/bonafide" />
          <Stack.Screen name="student/gatepass" />
          <Stack.Screen name="student/status" />
          <Stack.Screen name="student/notifications" />
          <Stack.Screen name="student/leave-certificate" />
          <Stack.Screen name="student/bonafide-certificate" />
          <Stack.Screen name="student/gatepass-certificate" />
          <Stack.Screen name="staff/index" />
          <Stack.Screen name="hod/index" />
          <Stack.Screen name="admin/index" />
        </Stack>
        </AlertProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
