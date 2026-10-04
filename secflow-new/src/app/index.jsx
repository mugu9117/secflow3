import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import LoginScreen from '../../screens/LoginScreen';
import Loading from '../../components/Loading';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === 'admin') router.replace('/admin');
    else if (user.role === 'hod') router.replace('/hod');
    else if (user.role === 'staff') router.replace('/staff');
    else router.replace('/student');
  }, [user, loading, router]);

  if (loading || user) return <Loading text="Loading..." />;
  return <LoginScreen />;
}
