import React from 'react';
import { useRouter } from 'next/navigation';

interface TokenExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void;
}

const TokenExpiredModal: React.FC<TokenExpiredModalProps> = ({ isOpen, onClose, onLogin }) => {
  const router = useRouter();

  const handleLoginRedirect = () => {
    if (onLogin) {
      onLogin();
    } else {
      onClose();
      router.push('/signin');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
          <div>
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            {/* Content */}
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Sesi Telah Berakhir
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Token autentikasi Anda telah kedaluwarsa. Untuk melanjutkan menggunakan admin panel, 
                  silakan login kembali dengan kredensial Anda.
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="mt-5 sm:mt-6 space-y-3">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors"
              onClick={handleLoginRedirect}
            >
              Login Kembali
            </button>
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors"
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { TokenExpiredModal };
export default TokenExpiredModal;