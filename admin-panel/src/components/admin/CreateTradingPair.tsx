'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { apiGet, apiPost, TokenExpiredError, ApiError, handleApiError } from '@/utils/api';

interface Cryptocurrency {
  id: string;
  symbol: string;
  name: string;
  is_active: boolean;
}

interface TradingPairFormData {
  symbol: string;
  base_currency_id: string;
  quote_currency_id: string;
  min_order_size: string;
  max_order_size: string;
  price_precision: number;
  quantity_precision: number;
  maker_fee: string;
  taker_fee: string;
  tick_size: string;
  lot_size: string;
  min_notional: string;
  max_notional: string;
  is_active: boolean;
  trading_enabled: boolean;
  margin_trading_enabled: boolean;
  market_maker_program: boolean;
}

export default function CreateTradingPair() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>([]);
  const [formData, setFormData] = useState<TradingPairFormData>({
    symbol: '',
    base_currency_id: '',
    quote_currency_id: '',
    min_order_size: '0.001',
    max_order_size: '1000000',
    price_precision: 8,
    quantity_precision: 8,
    maker_fee: '0.001',
    taker_fee: '0.001',
    tick_size: '0.00000001',
    lot_size: '0.00000001',
    min_notional: '10',
    max_notional: '1000000',
    is_active: true,
    trading_enabled: true,
    margin_trading_enabled: false,
    market_maker_program: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCryptocurrencies();
  }, []);

  const generateSymbol = useCallback(() => {
    if (formData.base_currency_id && formData.quote_currency_id && Array.isArray(cryptocurrencies) && cryptocurrencies.length > 0) {
      const baseCurrency = cryptocurrencies.find(c => c.id === formData.base_currency_id);
      const quoteCurrency = cryptocurrencies.find(c => c.id === formData.quote_currency_id);
      
      if (baseCurrency && quoteCurrency) {
        const newSymbol = `${baseCurrency.symbol}/${quoteCurrency.symbol}`;
        // Only update if symbol is different to prevent unnecessary re-renders
        if (formData.symbol !== newSymbol) {
          setFormData(prev => ({
            ...prev,
            symbol: newSymbol
          }));
        }
      }
    }
  }, [formData.base_currency_id, formData.quote_currency_id, formData.symbol, cryptocurrencies]);

  useEffect(() => {
    generateSymbol();
  }, [generateSymbol]);

  const fetchCryptocurrencies = useCallback(async () => {
    try {
      const response = await apiGet('/admin/cryptocurrencies');
      const data = await response.json();
      const list = (data?.data?.cryptocurrencies ?? data?.data ?? data?.cryptocurrencies ?? []) as Cryptocurrency[];
      const filtered = Array.isArray(list) ? list : [];
      console.log(`✅ Loaded ${filtered.length} cryptocurrencies`);
      setCryptocurrencies(filtered);
    } catch (error: any) {
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error, router);
      } else {
        console.error('💥 Error fetching cryptocurrencies:', error);
        toast.error('Gagal memuat daftar cryptocurrency');
      }
      setCryptocurrencies([]);
    }
  }, [router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol harus diisi';
    } else if (!/^[A-Z]+\/[A-Z]+$/.test(formData.symbol)) {
      newErrors.symbol = 'Format symbol harus seperti BTC/USDT';
    }

    if (!formData.base_currency_id) {
      newErrors.base_currency_id = 'Base currency harus dipilih';
    }

    if (!formData.quote_currency_id) {
      newErrors.quote_currency_id = 'Quote currency harus dipilih';
    }

    if (formData.base_currency_id === formData.quote_currency_id) {
      newErrors.quote_currency_id = 'Quote currency harus berbeda dari base currency';
    }

    if (!formData.min_order_size || parseFloat(formData.min_order_size) <= 0) {
      newErrors.min_order_size = 'Minimum order size harus lebih dari 0';
    }

    if (!formData.max_order_size || parseFloat(formData.max_order_size) <= 0) {
      newErrors.max_order_size = 'Maximum order size harus lebih dari 0';
    }

    if (parseFloat(formData.min_order_size) >= parseFloat(formData.max_order_size)) {
      newErrors.max_order_size = 'Maximum order size harus lebih besar dari minimum';
    }

    if (formData.price_precision < 0 || formData.price_precision > 18) {
      newErrors.price_precision = 'Price precision harus antara 0-18';
    }

    if (formData.quantity_precision < 0 || formData.quantity_precision > 18) {
      newErrors.quantity_precision = 'Quantity precision harus antara 0-18';
    }

    if (!formData.maker_fee || parseFloat(formData.maker_fee) < 0 || parseFloat(formData.maker_fee) > 1) {
      newErrors.maker_fee = 'Maker fee harus antara 0-1 (0-100%)';
    }

    if (!formData.taker_fee || parseFloat(formData.taker_fee) < 0 || parseFloat(formData.taker_fee) > 1) {
      newErrors.taker_fee = 'Taker fee harus antara 0-1 (0-100%)';
    }

    if (!formData.min_notional || parseFloat(formData.min_notional) <= 0) {
      newErrors.min_notional = 'Minimum notional harus lebih dari 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submission started');
    console.log('📋 Current formData:', formData);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      toast.error('Mohon perbaiki error pada form');
      return;
    }

    console.log('✅ Form validation passed');
    setLoading(true);
    
    try {
      const payload = {
        symbol: formData.symbol,
        base_currency_id: formData.base_currency_id,
        quote_currency_id: formData.quote_currency_id,
        min_order_size: parseFloat(formData.min_order_size),
        max_order_size: parseFloat(formData.max_order_size),
        price_precision: formData.price_precision,
        quantity_precision: formData.quantity_precision,
        maker_fee: parseFloat(formData.maker_fee),
        taker_fee: parseFloat(formData.taker_fee),
        tick_size: parseFloat(formData.tick_size),
        lot_size: parseFloat(formData.lot_size),
        min_notional: parseFloat(formData.min_notional),
        max_notional: parseFloat(formData.max_notional),
        is_active: formData.is_active,
        trading_enabled: formData.trading_enabled,
        margin_trading_enabled: formData.margin_trading_enabled,
        market_maker_program: formData.market_maker_program
      };

      const response = await apiPost('/admin/trading/pairs', payload);
      const result = await response.json();
      
      console.log('🎯 Response from server:', result);

      toast.success('Trading pair berhasil dibuat!');
      router.push('/trading');
    } catch (error: any) {
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error, router);
      } else {
        console.error('Error creating trading pair:', error);
        toast.error('Gagal membuat trading pair');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TradingPairFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Trading Pair</h1>
          <p className="text-gray-600">Buat pasangan trading baru dengan konfigurasi lengkap</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Dasar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol Trading Pair *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.symbol ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="BTC/USDT"
                />
                {errors.symbol && <p className="mt-1 text-sm text-red-600">{errors.symbol}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Currency *
                </label>
                <select
                  value={formData.base_currency_id}
                  onChange={(e) => handleInputChange('base_currency_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.base_currency_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Pilih Base Currency</option>
                  {Array.isArray(cryptocurrencies) ? cryptocurrencies
                    .filter(c => c.is_active)
                    .map(crypto => (
                      <option key={crypto.id} value={crypto.id}>
                        {crypto.symbol} - {crypto.name}
                      </option>
                    )) : []}
                </select>
                {errors.base_currency_id && <p className="mt-1 text-sm text-red-600">{errors.base_currency_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quote Currency *
                </label>
                <select
                  value={formData.quote_currency_id}
                  onChange={(e) => handleInputChange('quote_currency_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.quote_currency_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Pilih Quote Currency</option>
                  {Array.isArray(cryptocurrencies) ? cryptocurrencies
                    .filter(c => c.is_active)
                    .map(crypto => (
                      <option key={crypto.id} value={crypto.id}>
                        {crypto.symbol} - {crypto.name}
                      </option>
                    )) : []}
                </select>
                {errors.quote_currency_id && <p className="mt-1 text-sm text-red-600">{errors.quote_currency_id}</p>}
              </div>
            </div>
          </div>

          {/* Order Configuration */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Konfigurasi Order</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Size *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={formData.min_order_size}
                  onChange={(e) => handleInputChange('min_order_size', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.min_order_size ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.001"
                />
                {errors.min_order_size && <p className="mt-1 text-sm text-red-600">{errors.min_order_size}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Order Size *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={formData.max_order_size}
                  onChange={(e) => handleInputChange('max_order_size', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.max_order_size ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1000000"
                />
                {errors.max_order_size && <p className="mt-1 text-sm text-red-600">{errors.max_order_size}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Notional *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.min_notional}
                  onChange={(e) => handleInputChange('min_notional', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.min_notional ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10"
                />
                {errors.min_notional && <p className="mt-1 text-sm text-red-600">{errors.min_notional}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Notional
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.max_notional}
                  onChange={(e) => handleInputChange('max_notional', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000000"
                />
              </div>
            </div>
          </div>

          {/* Precision Configuration */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Konfigurasi Presisi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Precision *
                </label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={formData.price_precision}
                  onChange={(e) => handleInputChange('price_precision', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price_precision ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.price_precision && <p className="mt-1 text-sm text-red-600">{errors.price_precision}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity Precision *
                </label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={formData.quantity_precision}
                  onChange={(e) => handleInputChange('quantity_precision', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity_precision ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.quantity_precision && <p className="mt-1 text-sm text-red-600">{errors.quantity_precision}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tick Size
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={formData.tick_size}
                  onChange={(e) => handleInputChange('tick_size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00000001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lot Size
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={formData.lot_size}
                  onChange={(e) => handleInputChange('lot_size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00000001"
                />
              </div>
            </div>
          </div>

          {/* Fee Configuration */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Konfigurasi Fee</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maker Fee (%) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={formData.maker_fee}
                  onChange={(e) => handleInputChange('maker_fee', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.maker_fee ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.001"
                />
                {errors.maker_fee && <p className="mt-1 text-sm text-red-600">{errors.maker_fee}</p>}
                <p className="mt-1 text-xs text-gray-500">Fee untuk maker orders (0.001 = 0.1%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taker Fee (%) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={formData.taker_fee}
                  onChange={(e) => handleInputChange('taker_fee', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.taker_fee ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.001"
                />
                {errors.taker_fee && <p className="mt-1 text-sm text-red-600">{errors.taker_fee}</p>}
                <p className="mt-1 text-xs text-gray-500">Fee untuk taker orders (0.001 = 0.1%)</p>
              </div>
            </div>
          </div>

          {/* Status Configuration */}
          <div className="pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Konfigurasi Status</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Aktif
                </label>
                <p className="ml-2 text-xs text-gray-500">Trading pair dapat digunakan</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="trading_enabled"
                  checked={formData.trading_enabled}
                  onChange={(e) => handleInputChange('trading_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="trading_enabled" className="ml-2 block text-sm text-gray-900">
                  Trading Enabled
                </label>
                <p className="ml-2 text-xs text-gray-500">Memungkinkan trading untuk pair ini</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="margin_trading_enabled"
                  checked={formData.margin_trading_enabled}
                  onChange={(e) => handleInputChange('margin_trading_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="margin_trading_enabled" className="ml-2 block text-sm text-gray-900">
                  Margin Trading Enabled
                </label>
                <p className="ml-2 text-xs text-gray-500">Memungkinkan margin trading</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="market_maker_program"
                  checked={formData.market_maker_program}
                  onChange={(e) => handleInputChange('market_maker_program', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="market_maker_program" className="ml-2 block text-sm text-gray-900">
                  Market Maker Program
                </label>
                <p className="ml-2 text-xs text-gray-500">Ikut serta dalam program market maker</p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Membuat...' : 'Buat Trading Pair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}