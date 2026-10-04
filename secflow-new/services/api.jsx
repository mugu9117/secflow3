import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve the backend URL for every runtime:
// 1. EXPO_PUBLIC_API_URL env var (EAS / local .env) wins when set.
// 2. The LAN IP Expo dev server reports (works for physical devices).
// 3. Emulator loopback aliases, then localhost as a last resort.
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri || '';
  const lanIp = hostUri.split(':')[0];
  if (lanIp) {
    return `http://${lanIp}:5000`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://127.0.0.1:5000';
}

const API_BASE_URL = resolveBaseUrl();
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const clearAuthToken = () => {
  authToken = null;
};

api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const authService = {
  login: async (roll_no, password, department) => {
    try {
      const response = await api.post('/login/', {
        roll_no,
        password,
        ...(department ? { department } : {}),
      });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Connection failed';
      throw new Error(msg);
    }
  },
  signup: async (data) => {
    try {
      const response = await api.post('/signup/', data);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Connection failed';
      throw new Error(msg);
    }
  },
};

// ==================== USER ====================

export const userService = {
  getStudentInfo: async () => {
    try {
      const response = await api.get('/student/info/');
      return response.data;
    } catch (error) {
      return {
        name: 'Student',
        department: 'Computer Science',
      };
    }
  },
  updateMyProfile: async (data) => {
    try {
      const response = await api.put('/student/profile/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  },
};

// ==================== STAFF PROFILE ====================

export const staffService = {
  getMyInfo: async () => {
    try {
      const response = await api.get('/staff/info/');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load profile');
    }
  },
  updateMyProfile: async (data) => {
    try {
      const response = await api.put('/staff/profile/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  },
  changePassword: async (current_password, new_password) => {
    try {
      const response = await api.put('/staff/password/', { current_password, new_password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  },
};

// ==================== MESSAGES ====================

export const messageService = {
  getDirectory: async () => {
    try {
      const response = await api.get('/messages/directory/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  getConversations: async () => {
    try {
      const response = await api.get('/messages/conversations/');
      return response.data;
    } catch (error) {
      return { me: null, conversations: [] };
    }
  },
  getThread: async (type, id) => {
    try {
      const response = await api.get(`/messages/with/${type}/${id}/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load messages');
    }
  },
  send: async (type, id, body) => {
    try {
      const response = await api.post('/messages/send/', {
        receiver_type: type,
        receiver_id: id,
        body,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  },
  clearChat: async (type, id) => {
    try {
      const response = await api.delete(`/messages/with/${type}/${id}/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to clear chat');
    }
  },
  editMessage: async (id, body) => {
    try {
      const response = await api.put(`/messages/${id}/`, { body });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to edit message');
    }
  },
  deleteMessage: async (id, mode = 'me') => {
    try {
      const response = await api.delete(`/messages/${id}/?mode=${mode}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete message');
    }
  },
};

// ==================== LEAVE SERVICE ====================

export const leaveService = {
  // Student: Create leave request
  createLeave: async (data) => {
    try {
      const response = await api.post('/leave/create/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create leave request');
    }
  },
  
  // Student: Get my leave requests
  getMyLeaves: async () => {
    try {
      const response = await api.get('/leave/my/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // Staff: Get pending requests
  getStaffPendingLeaves: async () => {
    try {
      const response = await api.get('/leave/staff-pending/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // HOD: Get staff-approved requests
  getStaffApprovedLeaves: async () => {
    try {
      const response = await api.get('/leave/staff-approved/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // Staff: Approve request
  staffApproveLeave: async (id, remark = '') => {
    try {
      const response = await api.post(`/leave/${id}/staff-approve/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve');
    }
  },
  
  // Staff: Reject request
  staffRejectLeave: async (id, remark = '') => {
    try {
      const response = await api.post(`/leave/${id}/staff-reject/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject');
    }
  },
  
  // HOD: Final approval
  hodApproveLeave: async (id, remark = '') => {
    try {
      const response = await api.post(`/leave/${id}/hod-approve/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve');
    }
  },
  
  // HOD: Final rejection
  hodRejectLeave: async (id, remark = '') => {
    try {
      const response = await api.post(`/leave/${id}/hod-reject/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject');
    }
  },
};

// ==================== BONAFIDE SERVICE ====================

export const bonafideService = {
  // Student: Create bonafide request
  createBonafide: async (data) => {
    try {
      const response = await api.post('/bonafide/create/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create bonafide request');
    }
  },
  
  // Student: Get my bonafide requests
  getMyBonafides: async () => {
    try {
      const response = await api.get('/bonafide/my/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // Staff: Get pending requests
  getStaffPendingBonafides: async () => {
    try {
      const response = await api.get('/bonafide/staff-pending/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // HOD: Get staff-approved requests
  getStaffApprovedBonafides: async () => {
    try {
      const response = await api.get('/bonafide/staff-approved/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // Staff: Approve
  staffApproveBonafide: async (id, remark = '') => {
    try {
      const response = await api.post(`/bonafide/${id}/staff-approve/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve');
    }
  },
  
  // Staff: Reject
  staffRejectBonafide: async (id, remark = '') => {
    try {
      const response = await api.post(`/bonafide/${id}/staff-reject/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject');
    }
  },
  
  // HOD: Final approval
  hodApproveBonafide: async (id, remark = '') => {
    try {
      const response = await api.post(`/bonafide/${id}/hod-approve/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve');
    }
  },
  
  // HOD: Final rejection
  hodRejectBonafide: async (id, remark = '') => {
    try {
      const response = await api.post(`/bonafide/${id}/hod-reject/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject');
    }
  },
};

// ==================== GATEPASS SERVICE ====================

export const gatepassService = {
  // Student: Create gatepass request
  createGatepass: async (data) => {
    try {
      const response = await api.post('/gatepass/create/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create gatepass request');
    }
  },
  
  // Student: Get my gatepass requests
  getMyGatepasses: async () => {
    try {
      const response = await api.get('/gatepass/my/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // Staff: Get pending requests
  getStaffPendingGatepasses: async () => {
    try {
      const response = await api.get('/gatepass/staff-pending/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // HOD: Get staff-approved requests
  getStaffApprovedGatepasses: async () => {
    try {
      const response = await api.get('/gatepass/staff-approved/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  
  // Staff: Approve
  staffApproveGatepass: async (id, remark = '') => {
    try {
      const response = await api.post(`/gatepass/${id}/staff-approve/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve');
    }
  },
  
  // Staff: Reject
  staffRejectGatepass: async (id, remark = '') => {
    try {
      const response = await api.post(`/gatepass/${id}/staff-reject/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject');
    }
  },
  
  // HOD: Final approval
  hodApproveGatepass: async (id, remark = '') => {
    try {
      const response = await api.post(`/gatepass/${id}/hod-approve/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve');
    }
  },
  
  // HOD: Final rejection
  hodRejectGatepass: async (id, remark = '') => {
    try {
      const response = await api.post(`/gatepass/${id}/hod-reject/`, { remark });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject');
    }
  },

  // Staff/HOD: Verify a scanned gatepass QR payload.
  // Returns { valid, gatepass?, reason? } — 200 even when invalid.
  verifyQr: async (payload) => {
    try {
      const response = await api.post('/gatepass/verify-qr/', { payload });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Verification failed');
    }
  },
};

// ==================== ADMIN SERVICE ====================

export const adminService = {
  createStaff: async (data) => {
    try {
      const response = await api.post('/admin/create-staff/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create staff');
    }
  },
  createHod: async (data) => {
    try {
      const response = await api.post('/admin/create-hod/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create HOD');
    }
  },
  getAllStudents: async () => {
    try {
      const response = await api.get('/admin/students/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  getAllStaff: async () => {
    try {
      const response = await api.get('/admin/staff/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
  clearAllData: async () => {
    try {
      const response = await api.post('/admin/clear-all-data/');
      return response.data;
    } catch (error) {
      throw new Error('Failed to clear data');
    }
  },
};

// ==================== PASSWORD RESET (OTP) ====================

export const passwordResetService = {
  requestOtp: async (roll_no) => {
    try {
      const response = await api.post('/password-reset/request/', { roll_no });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send OTP');
    }
  },
  verifyOtp: async (roll_no, otp) => {
    try {
      const response = await api.post('/password-reset/verify/', { roll_no, otp });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'OTP verification failed');
    }
  },
  confirmReset: async (reset_token, new_password) => {
    try {
      const response = await api.post('/password-reset/confirm/', { reset_token, new_password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  },
};

// Legacy service for backward compatibility
export const requestService = {
  createRequest: async (data) => {
    try {
      const response = await api.post('/request/create/', data);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create request');
    }
  },
  getMyRequests: async () => {
    try {
      const response = await api.get('/request/my/');
      return response.data;
    } catch (error) {
      return [];
    }
  },
};

export default api;