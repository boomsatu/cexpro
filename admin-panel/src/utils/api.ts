import { toast } from 'react-hot-toast';

// Base API configuration
const API_BASE_URL = 'http://localhost:3001/api/v1';

// Custom error for token expiry
export class TokenExpiredError extends Error {
  constructor(message: string = 'Token telah kedaluwarsa') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

// Custom error for API responses
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public errors?: any[]) {
    super(message);
    this.name = 'ApiError';
  }
}

// API utility function with token handling
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    throw new TokenExpiredError('Token tidak ditemukan');
  }

  const config: RequestInit = {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle token expiry (401 Unauthorized)
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      
      // Throw custom error
      throw new TokenExpiredError('Sesi Anda telah berakhir. Silakan login kembali.');
    }
    
    // Handle other error responses
    if (!response.ok) {
      let errorMessage = 'Terjadi kesalahan pada server';
      let errorCode = undefined;
      let errorDetails = undefined;
      
      try {
        const errorData = await response.json();
        
        // Handle validation errors with detailed messages
        if (errorData.details && Array.isArray(errorData.details)) {
          errorMessage = errorData.details.map((err: any) => err.msg).join(', ');
          errorDetails = errorData.details;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map((err: any) => err.message).join(', ');
          errorDetails = errorData.errors;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        errorCode = errorData.code;
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || `Error ${response.status}`;
      }
      
      throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
    }
    
    return response;
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof TokenExpiredError || error instanceof ApiError) {
      throw error;
    }
    
    // Handle other network errors
    throw new Error('Terjadi kesalahan jaringan. Silakan coba lagi.');
  }
};

// Wrapper for GET requests
export const apiGet = async (endpoint: string) => {
  return apiCall(endpoint, { method: 'GET' });
};

// Wrapper for POST requests
export const apiPost = async (endpoint: string, data: Record<string, unknown>) => {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Wrapper for PUT requests
export const apiPut = async (endpoint: string, data: Record<string, unknown>) => {
  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Wrapper for DELETE requests
export const apiDelete = async (endpoint: string) => {
  return apiCall(endpoint, { method: 'DELETE' });
};

// Error handler for components
export const handleApiError = (error: Error | TokenExpiredError | ApiError, router?: { push: (path: string) => void }) => {
  if (error instanceof TokenExpiredError) {
    toast.error(error.message);
    
    // Redirect to login if router is provided
    if (router) {
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } else {
      // Fallback: reload page to trigger AuthGuard
      setTimeout(() => {
        window.location.href = '/signin';
      }, 2000);
    }
    return;
  }
  
  if (error instanceof ApiError) {
    // Show detailed error message from API
    toast.error(error.message);
    return;
  }
  
  // Handle other errors
  toast.error(error.message || 'Terjadi kesalahan yang tidak diketahui');
};