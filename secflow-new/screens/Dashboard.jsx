import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      switch (user.role) {
        case 'student':
          router.replace('/student');
          break;
        case 'staff':
          router.replace('/staff');
          break;
        case 'hod':
          router.replace('/hod');
          break;
        case 'admin':
          router.replace('/admin');
          break;
        default:
          router.replace('/');
      }
    } else if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  return <Loading text="Loading..." />;
};

export default Dashboard;
