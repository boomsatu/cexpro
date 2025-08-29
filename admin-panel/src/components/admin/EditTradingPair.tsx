'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPut, ApiError, TokenExpiredError, handleApiError } from '@/utils/api';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface TradingPair {
  _id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  minTradeAmount: number;
  maxTradeAmount: number;
  priceDecimalPlaces: number;
  quantityDecimalPlaces: number;
  makerFee: number;
  takerFee: number;
  isActive: boolean;
}

interface Cryptocurrency {
  id: string;
  symbol: string;
  name: string;
  is_active: boolean;
}

interface EditTradingPairProps {
  tradingPairId: string;
}

const EditTradingPair: React.FC<EditTradingPairProps> = ({ tradingPairId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const [formData, setFormData] = useState({
    baseAsset: '',
    quoteAsset: '',
    minTradeAmount: '',
    maxTradeAmount: '',
    priceDecimalPlaces: '8',
    quantityDecimalPlaces: '8',
    makerFee: '0.1',
    takerFee: '0.1',
    isActive: true
  });

  useEffect(() => {
    fetchCryptocurrencies();
    fetchTradingPair();
  }, [tradingPairId]);

  const fetchCryptocurrencies = async () => {
    try {
      const response = await apiGet('/admin/cryptocurrencies');
      const data = await response.json();
      const list: Cryptocurrency[] = data?.data?.cryptocurrencies || [];
      setCryptocurrencies(Array.isArray(list) ? list.filter((c) => c.is_active) : []);
    } catch (error: any) {
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error, router);
        return;
      }
      console.error('Error fetching cryptocurrencies:', error);
      toast.error('Gagal mengambil data cryptocurrency');
      setCryptocurrencies([]);
    }
  };

  const fetchTradingPair = async () => {
    try {
      setInitialLoading(true);
      setErrorMessage(null);

      if (!tradingPairId) {
        setErrorMessage('ID trading pair tidak valid');
        toast.error('ID trading pair tidak valid');
        return;
      }

      console.log('📋 Fetching trading pair with ID:', tradingPairId);
      const response = await apiGet(`/admin/trading/pairs/${tradingPairId}`);
      const responseData = await response.json();

      console.log('📊 API Response structure:', JSON.stringify(responseData, null, 2));

      if (responseData?.success && responseData?.data) {
        const pair = responseData.data;
        console.log('✅ Trading pair data found:', pair);
        setFormData({
          baseAsset: pair.base_currency_id,
          quoteAsset: pair.quote_currency_id,
          minTradeAmount: pair.min_order_size?.toString() || '',
          maxTradeAmount: pair.max_order_size?.toString() || '',
          priceDecimalPlaces: pair.price_precision?.toString() || '8',
          quantityDecimalPlaces: pair.quantity_precision?.toString() || '8',
          makerFee: (parseFloat(pair.maker_fee || 0) * 100).toString(),
          takerFee: (parseFloat(pair.taker_fee || 0) * 100).toString(),
          isActive: !!pair.is_active
        });
      } else {
        const msg = responseData?.error || responseData?.message || 'Trading pair tidak ditemukan';
        console.error('❌ API Error:', responseData);
        setErrorMessage(msg);
        toast.error(msg);
        setTimeout(() => router.push('/trading'), 3000);
      }
    } catch (error: any) {
      console.error('💥 Network/Server Error:', error);
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error, router);
      } else {
        toast.error('Trading pair tidak ditemukan atau tidak tersedia');
        setTimeout(() => router.push('/trading'), 3000);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.baseAsset) {
      newErrors.baseAsset = 'Base asset harus dipilih';
    }

    if (!formData.quoteAsset) {
      newErrors.quoteAsset = 'Quote asset harus dipilih';
    }

    if (formData.baseAsset === formData.quoteAsset) {
      newErrors.baseAsset = 'Base asset dan quote asset tidak boleh sama';
      newErrors.quoteAsset = 'Base asset dan quote asset tidak boleh sama';
    }

    if (!formData.minTradeAmount || parseFloat(formData.minTradeAmount) <= 0) {
      newErrors.minTradeAmount = 'Minimum trade amount harus lebih dari 0';
    }

    if (!formData.maxTradeAmount || parseFloat(formData.maxTradeAmount) <= 0) {
      newErrors.maxTradeAmount = 'Maximum trade amount harus lebih dari 0';
    }

    if (parseFloat(formData.minTradeAmount) >= parseFloat(formData.maxTradeAmount)) {
      newErrors.minTradeAmount = 'Minimum trade amount harus lebih kecil dari maximum';
      newErrors.maxTradeAmount = 'Maximum trade amount harus lebih besar dari minimum';
    }

    if (!formData.priceDecimalPlaces || parseInt(formData.priceDecimalPlaces) < 0 || parseInt(formData.priceDecimalPlaces) > 18) {
      newErrors.priceDecimalPlaces = 'Price decimal places harus antara 0-18';
    }

    if (!formData.quantityDecimalPlaces || parseInt(formData.quantityDecimalPlaces) < 0 || parseInt(formData.quantityDecimalPlaces) > 18) {
      newErrors.quantityDecimalPlaces = 'Quantity decimal places harus antara 0-18';
    }

    if (!formData.makerFee || parseFloat(formData.makerFee) < 0 || parseFloat(formData.makerFee) > 100) {
      newErrors.makerFee = 'Maker fee harus antara 0-100%';
    }

    if (!formData.takerFee || parseFloat(formData.takerFee) < 0 || parseFloat(formData.takerFee) > 100) {
      newErrors.takerFee = 'Taker fee harus antara 0-100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki error pada form');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        base_currency_id: formData.baseAsset,
        quote_currency_id: formData.quoteAsset,
        min_order_size: parseFloat(formData.minTradeAmount),
        max_order_size: formData.maxTradeAmount ? parseFloat(formData.maxTradeAmount) : null,
        price_precision: parseInt(formData.priceDecimalPlaces),
        quantity_precision: parseInt(formData.quantityDecimalPlaces),
        maker_fee: (parseFloat(formData.makerFee) / 100).toString(),
        taker_fee: (parseFloat(formData.takerFee) / 100).toString(),
        is_active: formData.isActive
      };

      const response = await apiPut(`/admin/trading/pairs/${tradingPairId}`, payload);
      const responseData = await response.json();
 
      if (response.ok && (responseData?.success !== false)) {
        toast.success(responseData?.message || 'Trading pair berhasil diperbarui!');
        router.push('/trading');
      } else {
        toast.error(responseData?.message || 'Gagal memperbarui trading pair');
      }
    } catch (error: any) {
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error, router);
      } else {
        console.error('Error updating trading pair:', error);
        toast.error('Gagal memperbarui trading pair');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/signin')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Login Ulang
            </button>
            <button
              onClick={() => router.push('/trading')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/trading')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Kembali ke Trading Management
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Trading Pair</h1>
        <p className="text-gray-600 mt-2">Perbarui konfigurasi trading pair</p>
      </div>

      {/* Form */}
      <div className="bg-white shadow-lg rounded-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trading Pair Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Asset *
              </label>
              <select
                value={formData.baseAsset}
                onChange={(e) => handleInputChange('baseAsset', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.baseAsset ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Pilih Base Asset</option>
                {Array.isArray(cryptocurrencies) && cryptocurrencies.map((crypto) => (
                  <option key={crypto.id} value={crypto.id}>
                    {crypto.symbol} - {crypto.name}
                  </option>
                ))}
              </select>
              {errors.baseAsset && (
                <p className="text-red-500 text-sm mt-1">{errors.baseAsset}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quote Asset *
              </label>
              <select
                value={formData.quoteAsset}
                onChange={(e) => handleInputChange('quoteAsset', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quoteAsset ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Pilih Quote Asset</option>
                {Array.isArray(cryptocurrencies) && cryptocurrencies.map((crypto) => (
                  <option key={crypto.id} value={crypto.id}>
                    {crypto.symbol} - {crypto.name}
                  </option>
                ))}
              </select>
              {errors.quoteAsset && (
                <p className="text-red-500 text-sm mt-1">{errors.quoteAsset}</p>
              )}
            </div>
          </div>

          {/* Trading Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Trade Amount *
              </label>
              <input
                type="number"
                step="0.00000001"
                value={formData.minTradeAmount}
                onChange={(e) => handleInputChange('minTradeAmount', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.minTradeAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00000001"
                required
              />
              {errors.minTradeAmount && (
                <p className="text-red-500 text-sm mt-1">{errors.minTradeAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Trade Amount *
              </label>
              <input
                type="number"
                step="0.00000001"
                value={formData.maxTradeAmount}
                onChange={(e) => handleInputChange('maxTradeAmount', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxTradeAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1000000"
                required
              />
              {errors.maxTradeAmount && (
                <p className="text-red-500 text-sm mt-1">{errors.maxTradeAmount}</p>
              )}
            </div>
          </div>

          {/* Decimal Places */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Decimal Places *
              </label>
              <input
                type="number"
                min="0"
                max="18"
                value={formData.priceDecimalPlaces}
                onChange={(e) => handleInputChange('priceDecimalPlaces', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.priceDecimalPlaces ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.priceDecimalPlaces && (
                <p className="text-red-500 text-sm mt-1">{errors.priceDecimalPlaces}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Decimal Places *
              </label>
              <input
                type="number"
                min="0"
                max="18"
                value={formData.quantityDecimalPlaces}
                onChange={(e) => handleInputChange('quantityDecimalPlaces', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantityDecimalPlaces ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.quantityDecimalPlaces && (
                <p className="text-red-500 text-sm mt-1">{errors.quantityDecimalPlaces}</p>
              )}
            </div>
          </div>

          {/* Trading Fees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maker Fee (%) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={formData.makerFee}
                onChange={(e) => handleInputChange('makerFee', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.makerFee ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.1"
                required
              />
              {errors.makerFee && (
                <p className="text-red-500 text-sm mt-1">{errors.makerFee}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taker Fee (%) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={formData.takerFee}
                onChange={(e) => handleInputChange('takerFee', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.takerFee ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.1"
                required
              />
              {errors.takerFee && (
                <p className="text-red-500 text-sm mt-1">{errors.takerFee}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Aktifkan trading pair
              </span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push('/trading')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memperbarui...' : 'Perbarui Trading Pair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTradingPair;