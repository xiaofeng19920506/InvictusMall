import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { storeApi } from "../services/api";
import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
  Location,
} from "../types/store";
import { getImageUrl } from "../utils/imageUtils";

export interface StoreModalProps {
  store: Store | null;
  onClose: () => void;
  onSave: () => void;
}

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB

const createEmptyLocation = (): Location => ({
  streetAddress: "",
  aptNumber: "",
  city: "",
  stateProvince: "",
  zipCode: "",
  country: "USA",
});

interface StoreFormState {
  name: string;
  description: string;
  establishedYear: number;
  location: Location;
  category: string[];
  categoryInput: string;
  rating: number;
  reviewCount: number;
  productsCount: number;
  discount: string;
  isVerified: boolean;
  isActive: boolean;
  imageUrl: string;
  imagePreview: string;
}

const StoreModal: React.FC<StoreModalProps> = ({ store, onClose, onSave }) => {
  const isEditing = Boolean(store);

  const [formData, setFormData] = useState<StoreFormState>(() => ({
    name: store?.name ?? "",
    description: store?.description ?? "",
    establishedYear: store?.establishedYear ?? new Date().getFullYear(),
    location: store?.location?.[0]
      ? { ...store.location[0] }
      : createEmptyLocation(),
    category: store?.category ?? [],
    categoryInput: "",
    rating: store?.rating ?? 0,
    reviewCount: store?.reviewCount ?? 0,
    productsCount: store?.productsCount ?? 0,
    discount: store?.discount ?? "",
    isVerified: store?.isVerified ?? false,
    isActive: store?.isActive ?? true,
    imageUrl: store?.imageUrl ?? "",
    imagePreview: store?.imageUrl ?? "",
  }));

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const updateLocationField = (field: keyof Location, value: string) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  const handleAddCategory = () => {
    const value = formData.categoryInput.trim();
    if (!value) {
      return;
    }
    if (formData.category.includes(value)) {
      setFormData((prev) => ({ ...prev, categoryInput: "" }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      category: [...prev.category, value],
      categoryInput: "",
    }));
  };

  const handleCategoryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddCategory();
    }
  };

  const handleRemoveCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      category: prev.category.filter((item) => item !== category),
    }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !store) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image file size must be less than 15MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const response = await storeApi.uploadStoreImage(file, store.id);
      if (response.success && response.data?.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: response.data.imageUrl,
          imagePreview: response.data.imageUrl,
        }));
        alert("Image uploaded successfully.");
      } else {
        throw new Error("Upload response did not include an image URL.");
      }
    } catch (error) {
      console.error("Error uploading store image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { location } = formData;
    if (
      !location.streetAddress.trim() ||
      !location.city.trim() ||
      !location.stateProvince.trim() ||
      !location.zipCode.trim() ||
      !location.country.trim()
    ) {
      alert("Please fill in all required location fields.");
      return;
    }

    const sanitizedLocation: Location = {
      streetAddress: location.streetAddress.trim(),
      aptNumber: location.aptNumber?.trim() || undefined,
      city: location.city.trim(),
      stateProvince: location.stateProvince.trim(),
      zipCode: location.zipCode.trim(),
      country: location.country.trim(),
    };

    const baseData: CreateStoreRequest = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      establishedYear: formData.establishedYear,
      location: [sanitizedLocation],
    };

    setSaving(true);
    try {
      if (isEditing && store) {
        const updateData: UpdateStoreRequest = {
          ...baseData,
          imageUrl: formData.imageUrl || undefined,
          category: formData.category,
          rating: formData.rating,
          reviewCount: formData.reviewCount,
          productsCount: formData.productsCount,
          discount: formData.discount || undefined,
          isVerified: formData.isVerified,
          isActive: formData.isActive,
        };
        await storeApi.updateStore(store.id, updateData);
      } else {
        const createData: CreateStoreRequest = {
          ...baseData,
          imageUrl: "/images/default-store.png",
          category: [],
          rating: 0,
          reviewCount: 0,
          productsCount: 0,
          discount: undefined,
          isVerified: false,
          isActive: true,
        };
        await storeApi.createStore(createData);
      }

      onSave();
    } catch (error) {
      console.error("Error saving store:", error);
      alert("Failed to save store. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-8">
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative flex h-full max-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
          <h3 className="text-2xl font-semibold text-gray-900">
            {isEditing ? "Edit Store" : "Add New Store"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className={`grid gap-4 ${
                isEditing ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              <div className="form-group">
                <label className="form-label">Store Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="form-input"
                  required
                />
              </div>

              {isEditing && (
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        rating: parseFloat(event.target.value || "0"),
                      }))
                    }
                    className="form-input"
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="form-input form-textarea"
                required
              />
            </div>

            {isEditing && (
              <div className="form-group">
                <label className="form-label">Categories</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.categoryInput}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        categoryInput: event.target.value,
                      }))
                    }
                    onKeyDown={handleCategoryKeyDown}
                    className="form-input"
                    placeholder="Add category and press Enter"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddCategory}
                  >
                    Add
                  </button>
                </div>
                {formData.category.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.category.map((category) => (
                      <span
                        key={category}
                        className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(category)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isEditing ? (
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
                      className="h-48 w-full max-w-md rounded-lg border border-gray-300 object-cover"
                    />
                    {uploadingImage && (
                      <p className="mt-2 text-sm text-gray-500">
                        Uploading image...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-blue-700">
                <h4 className="mb-1 font-medium text-blue-800">
                  Store images can be added later
                </h4>
                <p className="text-sm">
                  Create the store first, then edit it to upload photos and
                  other details.
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="mb-4 font-semibold">Location</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="form-group md:col-span-2">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    value={formData.location.streetAddress}
                    onChange={(event) =>
                      updateLocationField("streetAddress", event.target.value)
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
                    onChange={(event) =>
                      updateLocationField("aptNumber", event.target.value)
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    value={formData.location.city}
                    onChange={(event) =>
                      updateLocationField("city", event.target.value)
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
                    onChange={(event) =>
                      updateLocationField("stateProvince", event.target.value)
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
                    onChange={(event) =>
                      updateLocationField("zipCode", event.target.value)
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
                    onChange={(event) =>
                      updateLocationField("country", event.target.value)
                    }
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Review Count</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reviewCount}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        reviewCount: parseInt(event.target.value || "0", 10),
                      }))
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Products Count</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.productsCount}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        productsCount: parseInt(event.target.value || "0", 10),
                      }))
                    }
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label className="form-label">Established Year</label>
                <input
                  type="number"
                  value={formData.establishedYear}
                  onChange={(event) =>
                    setFormData((prev) => {
                      const year = parseInt(event.target.value, 10);
                      return {
                        ...prev,
                        establishedYear: Number.isNaN(year)
                          ? prev.establishedYear
                          : year,
                      };
                    })
                  }
                  className="form-input"
                  required
                />
              </div>

              {isEditing && (
                <div className="form-group">
                  <label className="form-label">Discount</label>
                  <input
                    type="text"
                    value={formData.discount}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount: event.target.value,
                      }))
                    }
                    className="form-input"
                    placeholder="e.g., 20% OFF"
                  />
                </div>
              )}
            </div>

            {isEditing && (
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        isVerified: event.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Verified Store</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Active Store</span>
                </label>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || uploadingImage}
              >
                {saving
                  ? "Saving..."
                  : isEditing
                  ? "Update Store"
                  : "Create Store"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={saving || uploadingImage}
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

export default StoreModal;
