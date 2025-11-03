'use client';

import { useState, useEffect } from 'react';

interface Address {
  id: string;
  label: string;
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressManagerProps {
  addresses?: Address[];
  onSave?: (address: Omit<Address, 'id'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
}

export default function AddressManager({ 
  addresses: initialAddresses = [],
  onSave,
  onDelete,
  onSetDefault 
}: AddressManagerProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    streetAddress: '',
    aptNumber: '',
    city: '',
    stateProvince: '',
    zipCode: '',
    country: 'USA',
    isDefault: false
  });

  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;

    try {
      await onSave({
        label: formData.label,
        streetAddress: formData.streetAddress,
        aptNumber: formData.aptNumber || undefined,
        city: formData.city,
        stateProvince: formData.stateProvince,
        zipCode: formData.zipCode,
        country: formData.country,
        isDefault: formData.isDefault
      });
      resetForm();
    } catch (error) {
      console.error('Failed to save address:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      streetAddress: '',
      aptNumber: '',
      city: '',
      stateProvince: '',
      zipCode: '',
      country: 'USA',
      isDefault: false
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!onDelete || !confirm('Are you sure you want to delete this address?')) return;
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!onSetDefault) return;
    try {
      await onSetDefault(id);
    } catch (error) {
      console.error('Failed to set default address:', error);
    }
  };

  const startEdit = (address: Address) => {
    setFormData({
      label: address.label,
      streetAddress: address.streetAddress,
      aptNumber: address.aptNumber || '',
      city: address.city,
      stateProvince: address.stateProvince,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault
    });
    setEditingId(address.id);
    setIsAdding(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Addresses</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
        >
          + Add Address
        </button>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-4">
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
              Label (e.g., Home, Work)
            </label>
            <input
              type="text"
              id="label"
              name="label"
              value={formData.label}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Home"
            />
          </div>

          <div>
            <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="aptNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Apt/Suite (optional)
            </label>
            <input
              type="text"
              id="aptNumber"
              name="aptNumber"
              value={formData.aptNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="stateProvince" className="block text-sm font-medium text-gray-700 mb-1">
                State/Province
              </label>
              <input
                type="text"
                id="stateProvince"
                name="stateProvince"
                value={formData.stateProvince}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="USA">United States</option>
                <option value="Canada">Canada</option>
                <option value="Mexico">Mexico</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={formData.isDefault}
              onChange={handleChange}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
              Set as default address
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors"
            >
              {editingId ? 'Update Address' : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address List */}
      <div className="space-y-4">
        {addresses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No addresses saved yet.</p>
            <p className="text-sm mt-2">Add your first address to get started.</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className="border border-gray-200 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{address.label}</h3>
                  {address.isDefault && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  {address.streetAddress}
                  {address.aptNumber && `, Apt ${address.aptNumber}`}
                </p>
                <p className="text-sm text-gray-700">
                  {address.city}, {address.stateProvince} {address.zipCode}
                </p>
                <p className="text-sm text-gray-700">{address.country}</p>
              </div>
              <div className="flex gap-2 ml-4">
                {!address.isDefault && onSetDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Set Default
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

