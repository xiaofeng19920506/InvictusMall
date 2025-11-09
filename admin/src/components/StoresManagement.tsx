import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Eye,
  Star,
  X,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { storeApi } from "../services/api";
import type { Store } from "../types/store";
import { useRealTimeStores } from "../hooks/useRealTimeStores";
import { useAuth } from "../contexts/AuthContext";
import { getImageUrl } from "../utils/imageUtils";

const StoresManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const { user } = useAuth();

  // Use real-time stores hook with 10-second refresh interval
  const { stores, loading, error, refetch, lastUpdated } =
    useRealTimeStores(10000);

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
            onSave={(store) => {
              // Refetch data to get real-time updates
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

// Store Modal Component
interface StoreModalProps {
  store: Store | null;
  onClose: () => void;
  onSave: (store: Store) => void;
}

const StoreModal: React.FC<StoreModalProps> = ({ store, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: store?.name || "",
    description: store?.description || "",
    category: store?.category || [],
    categoryInput: "",
    rating: store?.rating || 0,
    reviewCount: store?.reviewCount || 0,
    imageUrl: store?.imageUrl || "",
    imageFile: null as File | null,
    imagePreview: store?.imageUrl || "",
    isVerified: store?.isVerified || false,
    productsCount: store?.productsCount || 0,
    establishedYear: store?.establishedYear || new Date().getFullYear(),
    discount: store?.discount || "",
    location: store?.location?.[0] || {
      streetAddress: "",
      aptNumber: "",
      city: "",
      stateProvince: "",
      zipCode: "",
      country: "USA",
    },
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        imageFile: file,
        imagePreview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (formData.category.length === 0) {
      alert("Please add at least one category");
      return;
    }

    if (
      !formData.location.streetAddress ||
      !formData.location.city ||
      !formData.location.stateProvince ||
      !formData.location.zipCode ||
      !formData.location.country
    ) {
      alert("Please fill in all required location fields");
      return;
    }

    // Validate image
    if (!formData.imageUrl && !formData.imageFile) {
      alert("Please upload a store image");
      return;
    }

    try {
      let imageUrl = formData.imageUrl;

      // Upload image if a new file was selected
      if (formData.imageFile) {
        setUploadingImage(true);
        try {
          const uploadResponse = await storeApi.uploadStoreImage(
            formData.imageFile
          );
          if (uploadResponse.success && uploadResponse.data?.imageUrl) {
            imageUrl = uploadResponse.data.imageUrl;
          } else {
            throw new Error("Failed to upload image");
          }
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          alert("Failed to upload image. Please try again.");
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const storeData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        rating: formData.rating,
        reviewCount: formData.reviewCount,
        imageUrl: imageUrl,
        isVerified: formData.isVerified,
        productsCount: formData.productsCount,
        establishedYear: formData.establishedYear,
        discount: formData.discount || undefined,
        location: [formData.location],
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
      console.error("Error saving store:", error);
      alert("Failed to save store");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          width: "100%",
          maxWidth: "48rem",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
          }}
        >
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            {store ? "Edit Store" : "Add New Store"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#4b5563";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9ca3af";
            }}
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div style={{ padding: "1.5rem" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Store Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rating: parseFloat(e.target.value),
                    })
                  }
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="form-input form-textarea"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categories</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={formData.categoryInput}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryInput: e.target.value })
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        formData.categoryInput.trim() &&
                        !formData.category.includes(
                          formData.categoryInput.trim()
                        )
                      ) {
                        setFormData({
                          ...formData,
                          category: [
                            ...formData.category,
                            formData.categoryInput.trim(),
                          ],
                          categoryInput: "",
                        });
                      }
                    }
                  }}
                  className="form-input"
                  placeholder="Add category and press Enter"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.category.map((cat, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          category: formData.category.filter(
                            (_, i) => i !== index
                          ),
                        });
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Store Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="form-input"
                disabled={uploadingImage}
              />
              {formData.imagePreview && (
                <div className="mt-4">
                  <img
                    src={getImageUrl(formData.imagePreview)}
                    alt="Store preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
                  />
                  {uploadingImage && (
                    <p className="text-sm text-gray-500 mt-2">
                      Uploading image...
                    </p>
                  )}
                </div>
              )}
              {!formData.imagePreview && !formData.imageFile && (
                <p className="text-sm text-gray-500 mt-2">
                  No image selected. Please upload an image file.
                </p>
              )}
            </div>

            {/* Location Fields */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-4">Location</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    value={formData.location.streetAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          streetAddress: e.target.value,
                        },
                      })
                    }
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apt/Unit Number</label>
                  <input
                    type="text"
                    value={formData.location.aptNumber || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          aptNumber: e.target.value,
                        },
                      })
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    value={formData.location.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          city: e.target.value,
                        },
                      })
                    }
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State/Province</label>
                  <input
                    type="text"
                    value={formData.location.stateProvince}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          stateProvince: e.target.value,
                        },
                      })
                    }
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.location.zipCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          zipCode: e.target.value,
                        },
                      })
                    }
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    value={formData.location.country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          country: e.target.value,
                        },
                      })
                    }
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Review Count</label>
                <input
                  type="number"
                  value={formData.reviewCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reviewCount: parseInt(e.target.value),
                    })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Products Count</label>
                <input
                  type="number"
                  value={formData.productsCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productsCount: parseInt(e.target.value),
                    })
                  }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      establishedYear: parseInt(e.target.value),
                    })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Discount</label>
                <input
                  type="text"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({ ...formData, discount: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, isVerified: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="form-label mb-0">Verified Store</span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="btn btn-primary">
                {store ? "Update Store" : "Create Store"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StoresManagement;
