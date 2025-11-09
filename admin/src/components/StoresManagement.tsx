import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit, Trash2, Search, Star, RefreshCw, CheckCircle } from "lucide-react";
import { storeApi } from "../services/api";
import type { Store } from "../types/store";
import { useRealTimeStores } from "../hooks/useRealTimeStores";
import { useAuth } from "../contexts/AuthContext";
import { getImageUrl } from "../utils/imageUtils";
import StoreModal from "./StoreModal";

const StoresManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const { user } = useAuth();

  // Use real-time stores hook with 10-second refresh interval
  const { stores, loading, refetch, lastUpdated } = useRealTimeStores(10000);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const handleDeleteStore = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this store?")) {
      try {
        await storeApi.deleteStore(id);
        // Refetch data to get real-time updates
        refetch();
      } catch (error) {
        console.error("Error deleting store:", error);
        alert("Failed to delete store");
      }
    }
  };

  const handleVerifyStore = async (id: string) => {
    if (window.confirm("Are you sure you want to verify this store?")) {
      try {
        await storeApi.verifyStore(id);
        // Refetch data to get real-time updates
        refetch();
      } catch (error: any) {
        console.error("Error verifying store:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to verify store";
        if (errorMessage.includes("Only administrators")) {
          alert("Only administrators can verify stores");
        } else {
          alert(errorMessage);
        }
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

  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || store.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(stores.flatMap((store) => store.category))
  );

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
          <h2 className="text-2xl font-bold text-gray-900">
            Stores Management
          </h2>
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
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
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
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
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
                        src={getImageUrl(store.imageUrl)}
                        alt={store.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {store.name}
                        </div>
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
                      <span className="text-gray-500">
                        ({store.reviewCount})
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        store.isVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {store.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td>
                    <span className="text-gray-900">
                      {store.productsCount.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {isAdmin && !store.isVerified && (
                        <button
                          onClick={() => handleVerifyStore(store.id)}
                          className="btn btn-success btn-sm"
                          title="Verify Store"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditStore(store)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Store"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Store"
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

      {/* Store Modal - Rendered via Portal */}
      {showModal &&
        createPortal(
          <StoreModal
            store={editingStore}
            onClose={() => {
              setShowModal(false);
              setEditingStore(null);
            }}
            onSave={() => {
              refetch();
              setShowModal(false);
              setEditingStore(null);
            }}
          />,
          document.body
        )}
    </div>
  );
};

export default StoresManagement;
