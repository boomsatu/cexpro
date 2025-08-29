import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { TokenExpiredError } from '../utils/api';

export const useTokenHandler = () => {
  const [isTokenExpiredModalOpen, setIsTokenExpiredModalOpen] = useState(false);
  const router = useRouter();

  const handleTokenExpiry = useCallback(() => {
    // Clear token and user data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    // Show modal
    setIsTokenExpiredModalOpen(true);
    
    // Show toast notification
    toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
  }, []);

  const handleApiError = useCallback((error: Error | TokenExpiredError) => {
    if (error instanceof TokenExpiredError) {
      handleTokenExpiry();
      return true; // Indicates token expiry was handled
    }
    
    // Handle other errors
    toast.error(error.message || 'Terjadi kesalahan yang tidak diketahui');
    return false; // Indicates other error
  }, [handleTokenExpiry]);

  const closeTokenExpiredModal = useCallback(() => {
    setIsTokenExpiredModalOpen(false);
  }, []);

  const redirectToLogin = useCallback(() => {
    setIsTokenExpiredModalOpen(false);
    router.push('/signin');
  }, [router]);

  return {
    isTokenExpiredModalOpen,
    handleTokenExpiry,
    handleApiError,
    closeTokenExpiredModal,
    redirectToLogin,
  };
};