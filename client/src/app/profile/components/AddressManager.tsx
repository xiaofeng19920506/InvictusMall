'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShippingAddress } from '@/services/shippingAddress';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import { geoapifyAddressService, AddressSuggestion } from '@/services/geoapifyAddressService';

interface AddressManagerProps {
  addresses?: ShippingAddress[];
  onSave?: (address: Omit<ShippingAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate?: (id: string, address: Partial<Omit<ShippingAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function AddressManager({
  addresses: initialAddresses = [],
  onSave,
  onUpdate,
  onDelete,
  onSetDefault,
  loading = false
}: AddressManagerProps) {
  const [addresses, setAddresses] = useState<ShippingAddress[]>(initialAddresses);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<ShippingAddress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    fullName: '',
    phoneNumber: '',
    streetAddress: '',
    aptNumber: '',
    city: '',
    stateProvince: '',
    zipCode: '',
    country: 'USA',
    isDefault: false
  });
  
  // Address validation and autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Address autocomplete handler
  const handleStreetAddressChange = useCallback(async (value: string) => {
    setFormData(prev => ({ ...prev, streetAddress: value }));
    setValidationError('');
    setValidationMessage('');

    // Clear previous timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    // Only show autocomplete if we have a meaningful input (at least 5 characters)
    if (value.length < 5) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce autocomplete requests
    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        // For autocomplete, use just the street address value
        // Geoapify will provide better suggestions with just the street input
        const query = value.trim();
        const countryCode = formData.country === 'USA' ? 'US' : formData.country;
        const suggestions = await geoapifyAddressService.autocomplete(query, countryCode);
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }, 300);
  }, [formData.city, formData.stateProvince, formData.zipCode, formData.country]);

  // Select address from suggestions
  const selectAddressSuggestion = (suggestion: AddressSuggestion) => {
    setFormData(prev => ({
      ...prev,
      streetAddress: `${suggestion.streetNumber} ${suggestion.street}`.trim(),
      city: suggestion.city,
      stateProvince: suggestion.stateCode,
      zipCode: suggestion.postalCode,
      country: suggestion.country || prev.country,
    }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setValidationMessage('Address selected from suggestions');
    setValidationError('');
  };

  // Validate address before submit
  const validateAddressBeforeSubmit = useCallback(async () => {
    // Check required fields first
    if (!formData.streetAddress || !formData.city || !formData.stateProvince || !formData.zipCode) {
      setValidationError('Please fill in all required address fields.');
      return false;
    }

    setIsValidating(true);
    setValidationError('');
    setValidationMessage('');

    try {
      const result = await geoapifyAddressService.validateAddress({
        streetAddress: formData.streetAddress,
        aptNumber: formData.aptNumber,
        city: formData.city,
        stateProvince: formData.stateProvince,
        zipCode: formData.zipCode,
        country: formData.country,
      });

      // Check if validation service returned an error or was skipped
      if (!result.valid) {
        // If validation was skipped (e.g., no API key), block submission
        // This ensures we don't save addresses without validation
        if ((result as any).skipped) {
          setValidationError(result.message || 'Address validation is required but not available. Please configure the validation service.');
          return false; // Block submission when validation service is unavailable
        }
        
        // Address validation failed - block submission
        setValidationError(result.message || 'Address validation failed. Please check the address details.');
        return false;
      }

      // Validation passed
      setValidationMessage(result.message || 'Address validated successfully');
      
      // Auto-fill normalized address if available
      if (result.normalizedAddress) {
        setFormData(prev => ({
          ...prev,
          streetAddress: `${result.normalizedAddress!.streetNumber} ${result.normalizedAddress!.street}`.trim() || prev.streetAddress,
          city: result.normalizedAddress!.city || prev.city,
          stateProvince: result.normalizedAddress!.stateCode || prev.stateProvince,
          zipCode: result.normalizedAddress!.postalCode || prev.zipCode,
        }));
      }
      
      return true;
    } catch (error: any) {
      console.error('Validation error:', error);
      // If validation service throws an error, block submission
      // This ensures we don't save addresses when validation cannot be performed
      setValidationError('Address validation service encountered an error. Please check your connection and try again.');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle street address with autocomplete
    if (name === 'streetAddress') {
      handleStreetAddressChange(value);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear validation messages when user edits
    if (name === 'city' || name === 'stateProvince' || name === 'zipCode') {
      setValidationError('');
      setValidationMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationError('');
    setValidationMessage('');
    
    // Validate address before submitting
    const isValid = await validateAddressBeforeSubmit();
    
    // Strict validation: Block submission if address is invalid
    // This ensures only validated addresses are saved to the database
    if (!isValid) {
      // Validation failed - do not submit
      // The validationError should already be set by validateAddressBeforeSubmit
      if (!validationError) {
        // Fallback error message if validationError wasn't set
        setValidationError('Address validation failed. Please check your address details.');
      }
      return;
    }
    
    // Validation passed - proceed with submission
    try {
      if (editingId && onUpdate) {
        await onUpdate(editingId, {
          label: formData.label || undefined,
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          streetAddress: formData.streetAddress,
          aptNumber: formData.aptNumber || undefined,
          city: formData.city,
          stateProvince: formData.stateProvince,
          zipCode: formData.zipCode,
          country: formData.country,
          isDefault: formData.isDefault
        });
      } else if (onSave) {
        await onSave({
          label: formData.label || undefined,
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          streetAddress: formData.streetAddress,
          aptNumber: formData.aptNumber || undefined,
          city: formData.city,
          stateProvince: formData.stateProvince,
          zipCode: formData.zipCode,
          country: formData.country,
          isDefault: formData.isDefault
        });
      }
      resetForm();
    } catch (error: any) {
      console.error('Failed to save address:', error);
      
      // Handle server-side validation errors
      const errorMessage = error?.message || 'Failed to save address. Please check the address details and try again.';
      
      // Check if it's a validation error from the server
      if (errorMessage.toLowerCase().includes('validation') || 
          errorMessage.toLowerCase().includes('address') ||
          errorMessage.toLowerCase().includes('not valid') ||
          errorMessage.toLowerCase().includes('could not be verified')) {
        // Display validation error in the form
        setValidationError(errorMessage);
        // Scroll to the error message
        setTimeout(() => {
          const errorElement = document.querySelector('.bg-yellow-50, .bg-red-50');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      } else {
        // For other errors, show a more generic message
        setValidationError(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      fullName: '',
      phoneNumber: '',
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
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setValidationMessage('');
    setValidationError('');
    setIsValidating(false);
    // Clear any pending autocomplete timeouts
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
  };

  const handleDeleteClick = (address: ShippingAddress) => {
    setAddressToDelete(address);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete || !addressToDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(addressToDelete.id);
      setDeleteModalOpen(false);
      setAddressToDelete(null);
    } catch (error) {
      console.error('Failed to delete address:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteModalOpen(false);
      setAddressToDelete(null);
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

  const startEdit = (address: ShippingAddress) => {
    setFormData({
      label: address.label ? address.label : '',
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
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
          className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
        >
          + Add Address
        </button>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-4">
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
              Label (optional)
            </label>
            <input
              type="text"
              id="label"
              name="label"
              value={formData.label}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Home, Work, Office"
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              minLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="1234567890"
            />
          </div>

          <div className="relative">
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
              placeholder="Start typing to see suggestions..."
              autoComplete="off"
            />
            {/* Address Suggestions Dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
              >
                {addressSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectAddressSuggestion(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {suggestion.streetNumber} {suggestion.street}
                    </div>
                    <div className="text-xs text-gray-500">
                      {suggestion.city}, {suggestion.stateCode} {suggestion.postalCode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Validation Messages */}
          {validationMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
              ✓ {validationMessage}
            </div>
          )}
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium">
              ⚠ {validationError}
              <p className="text-xs mt-1 text-red-600 font-normal">
                Please correct the address before saving.
              </p>
            </div>
          )}
          {isValidating && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md text-sm">
              🔄 Validating address...
            </div>
          )}

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
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700 cursor-pointer">
              Set as default address
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isValidating}
              className={`flex-1 py-2 px-4 rounded-md transition-colors cursor-pointer ${
                validationError
                  ? 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isValidating 
                ? 'Validating...' 
                : validationError
                  ? 'Address Invalid - Fix and Retry'
                  : editingId 
                    ? 'Update Address' 
                    : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isValidating}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <p>Loading addresses...</p>
          </div>
        ) : addresses.length === 0 ? (
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
                  {address.label && typeof address.label === 'string' && address.label.trim().length > 0 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                      {address.label}
                    </span>
                  )}
                  <h3 className="font-semibold text-gray-900">{address.fullName}</h3>
                  {address.isDefault ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                      Default
                    </span>
                  ) : <></>}
                </div>
                <p className="text-sm text-gray-600 mb-1">{address.phoneNumber}</p>
                <p className="text-sm text-gray-700">
                  {address.streetAddress}
                  {address.aptNumber && `, Apt ${address.aptNumber}`}
                </p>
                <p className="text-sm text-gray-700">
                  {address.city}, {address.stateProvince} {address.zipCode}
                </p>
                <p className="text-sm text-gray-700">{address.country}</p>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => startEdit(address)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors cursor-pointer text-sm"
                >
                  Edit
                </button>
                {!address.isDefault && onSetDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors cursor-pointer text-sm"
                  >
                    Set Default
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => handleDeleteClick(address)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors cursor-pointer text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Address"
        message={
          addressToDelete
            ? `Are you sure you want to delete this address? This action cannot be undone.\n\n${addressToDelete.label && typeof addressToDelete.label === 'string' && addressToDelete.label.trim().length > 0 ? `${addressToDelete.label} - ` : ''}${addressToDelete.fullName}\n${addressToDelete.streetAddress}${addressToDelete.aptNumber ? `, Apt ${addressToDelete.aptNumber}` : ''}\n${addressToDelete.city}, ${addressToDelete.stateProvince} ${addressToDelete.zipCode}`
            : 'Are you sure you want to delete this address?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}

