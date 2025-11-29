import { useState } from 'react';
import apiService from '../../../services/api';
import authService from '../../../services/auth';
import { useNotification } from '../../../contexts/NotificationContext';
import type { Product } from '../../../types';

interface UseProductCreationOptions {
  onProductCreated?: (product: Product, operationType?: 'in' | 'out' | null) => void;
}

export const useProductCreation = (options?: UseProductCreationOptions) => {
  const { showSuccess, showError } = useNotification();
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleCreate = async (operationType?: 'in' | 'out' | null) => {
    if (!name.trim() || !price.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showError('Please enter a valid price');
      return;
    }

    setIsCreating(true);

    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !currentUser.storeId) {
        showError('Unable to get store information. Please try logging in again.');
        return;
      }

      const productData = {
        storeId: currentUser.storeId,
        name: name.trim(),
        description: '',
        price: priceNum,
        barcode: barcode,
        stockQuantity: 0,
        category: '',
        isActive: true,
      };

      const response = await apiService.createProduct(productData);

      if (response.success && response.data) {
        showSuccess('Product created successfully!');
        const newProduct = response.data;
        
        if (options?.onProductCreated) {
          options.onProductCreated(newProduct, operationType);
        }

        closeModal();
        return newProduct;
      } else {
        showError(response.message || 'Failed to create product');
        return null;
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      showError(error.message || 'Failed to create product');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const openModal = (productBarcode: string, productName?: string, productPrice?: string) => {
    setBarcode(productBarcode);
    setName(productName || '');
    setPrice(productPrice || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setName('');
    setPrice('');
    setBarcode('');
  };

  return {
    isCreating,
    showModal,
    barcode,
    name,
    price,
    setName,
    setPrice,
    handleCreate,
    openModal,
    closeModal,
  };
};

