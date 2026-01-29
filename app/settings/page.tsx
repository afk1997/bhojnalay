'use client';

import { useState, useEffect } from 'react';
import { Rates, DEFAULT_RATES } from '@/lib/types';
import { getRates, saveRates } from '@/lib/supabase';

export default function SettingsPage() {
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getRates().then(setRates);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const success = await saveRates(rates);
    setSaving(false);

    if (success) {
      setMessage('Rates saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error saving rates. Please try again.');
    }
  };

  const RateInput = ({
    label,
    value,
    onChange,
    color,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    color: string;
  }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <label className={`block text-lg font-semibold ${color} mb-3`}>
        {label}
      </label>
      <div className="flex items-center">
        <span className="text-2xl text-gray-400 mr-2">₹</span>
        <input
          type="number"
          min="0"
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="0"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Settings
      </h1>
      <p className="text-center text-gray-500 mb-6">
        Configure rates for chargeable guests
      </p>

      <div className="space-y-4 mb-6">
        <RateInput
          label="Navkarshi Rate"
          value={rates.navkarshi}
          onChange={(v) => setRates({ ...rates, navkarshi: v })}
          color="text-orange-600"
        />
        <RateInput
          label="Lunch Rate"
          value={rates.lunch}
          onChange={(v) => setRates({ ...rates, lunch: v })}
          color="text-green-600"
        />
        <RateInput
          label="Chovihar Rate"
          value={rates.chovihar}
          onChange={(v) => setRates({ ...rates, chovihar: v })}
          color="text-blue-600"
        />
      </div>

      {/* Preview */}
      <div className="bg-gray-100 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Rate Preview
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Navkarshi</span>
            <span className="font-semibold">₹{rates.navkarshi}/plate</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Lunch</span>
            <span className="font-semibold">₹{rates.lunch}/plate</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Chovihar</span>
            <span className="font-semibold">₹{rates.chovihar}/plate</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between">
            <span className="text-gray-600">Full Day (1 guest)</span>
            <span className="font-bold text-orange-600">
              ₹{rates.navkarshi + rates.lunch + rates.chovihar}
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-orange-600 text-white rounded-xl font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Rates'}
      </button>

      {/* Message */}
      {message && (
        <div
          className={`mt-4 p-3 rounded-lg text-center ${
            message.includes('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Rates apply only to <strong>Guests</strong> (chargeable).
          Staff and Free Sevaks are not charged.
        </p>
      </div>
    </div>
  );
}
