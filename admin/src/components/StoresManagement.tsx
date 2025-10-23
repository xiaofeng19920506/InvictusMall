import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Eye,
  Star,
  X,
  RefreshCw
} from 'lucide-react';
import { storeApi } from '../services/api';
import type { Store } from '../types/store';
import { useRealTimeStores } from '../hooks/useRealTimeStores';

const StoresManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  // Use real-time stores hook with 10-second refresh interval
  const { stores, loading, error, refetch, lastUpdated } = useRealTimeStores(10000);

  const handleDeleteStore = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      try {
        await storeApi.deleteStore(id);
        // Refetch data to get real-time updates
        refetch();
      } catch (error) {
        console.error('Error deleting store:', error);
        alert('Failed to delete store');
      }
    }
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setShowModal(true);
  };

  const handleAddStore = () => {
    setEditingStore(null);
    setShowModal(true);
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || store.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(stores.flatMap(store => store.category)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading"></div>
        <span className="ml-2">Loading stores...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stores Management</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              🔄 Last updated: {lastUpdated.toLocaleTimeString()}
              <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refetch} 
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={handleAddStore} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Store
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-input form-select"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Stores ({filteredStores.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Category</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img
                        src={store.imageUrl}
                        alt={store.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{store.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {store.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {store.category.slice(0, 2).map((cat, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {cat}
                        </span>
                      ))}
                      {store.category.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{store.category.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{store.rating}</span>
                      <span className="text-gray-500">({store.reviewCount})</span>
                    </div>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      store.isVerified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {store.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td>
                    <span className="text-gray-900">{store.productsCount.toLocaleString()}</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditStore(store)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No stores found</div>
          </div>
        )}
      </div>

      {/* Store Modal */}
      {showModal && (
        <StoreModal
          store={editingStore}
          onClose={() => {
            setShowModal(false);
            setEditingStore(null);
          }}
          onSave={(store) => {
            // Refetch data to get real-time updates
            refetch();
            setShowModal(false);
            setEditingStore(null);
          }}
        />
      )}
    </div>
  );
};

// Store Modal Component
interface StoreModalProps {
  store: Store | null;
  onClose: () => void;
  onSave: (store: Store) => void;
}

const StoreModal: React.FC<StoreModalProps> = ({ store, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: store?.name || '',
    description: store?.description || '',
    category: store?.category || [],
    rating: store?.rating || 0,
    reviewCount: store?.reviewCount || 0,
    imageUrl: store?.imageUrl || '',
    isVerified: store?.isVerified || false,
    productsCount: store?.productsCount || 0,
    establishedYear: store?.establishedYear || new Date().getFullYear(),
    discount: store?.discount || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const storeData = {
        ...formData,
        location: store?.location || [{
          streetAddress: '123 Main St',
          city: 'New York',
          stateProvince: 'NY',
          zipCode: '10001',
          country: 'USA'
        }],
      };

      if (store) {
        // Update existing store
        const response = await storeApi.updateStore(store.id, storeData);
        onSave(response.data);
      } else {
        // Create new store
        const response = await storeApi.createStore(storeData);
        onSave(response.data);
      }
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Failed to save store');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">
            {store ? 'Edit Store' : 'Add New Store'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input form-textarea"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Review Count</label>
              <input
                type="number"
                value={formData.reviewCount}
                onChange={(e) => setFormData({ ...formData, reviewCount: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Products Count</label>
              <input
                type="number"
                value={formData.productsCount}
                onChange={(e) => setFormData({ ...formData, productsCount: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Established Year</label>
              <input
                type="number"
                value={formData.establishedYear}
                onChange={(e) => setFormData({ ...formData, establishedYear: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discount</label>
              <input
                type="text"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="form-input"
                placeholder="e.g., 20% OFF"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isVerified}
                onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                className="rounded"
              />
              <span className="form-label mb-0">Verified Store</span>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="btn btn-primary">
              {store ? 'Update Store' : 'Create Store'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoresManagement;
