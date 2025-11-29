import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi, categoryApi, staffApi, type Category, type Staff } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
  Location,
} from "../../shared/types/store";
import { getImageUrl } from "../../shared/utils/imageUtils";
import styles from "./StoreModal.module.css";

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
  selectedCategory: string;
  rating: number;
  reviewCount: number;
  productsCount: number;
  discount: string;
  isVerified: boolean;
  isActive: boolean;
  imageUrl: string;
  imagePreview: string;
  ownerId: string;
}

const StoreModal: React.FC<StoreModalProps> = ({ store, onClose, onSave }) => {
  const { t } = useTranslation();
  const { showError, showSuccess, showWarning } = useNotification();
  const { user } = useAuth();
  const isEditing = Boolean(store);
  const titleId = isEditing
    ? "store-modal-title-edit"
    : "store-modal-title-create";
  
  // Only admins can create stores
  const canCreateStore = user?.role === "admin";
  
  // Check if user can edit owner (admin or the owner themselves)
  const canEditOwner = user && (
    user.role === "admin" || 
    (user.role === "owner" && store?.owner?.id === user.id)
  );

  const [formData, setFormData] = useState<StoreFormState>(() => ({
    name: store?.name ?? "",
    description: store?.description ?? "",
    establishedYear: store?.establishedYear ?? new Date().getFullYear(),
    location: store?.location?.[0]
      ? { ...store.location[0] }
      : createEmptyLocation(),
    category: store?.category ?? [],
    selectedCategory: "",
    rating: store?.rating ?? 0,
    reviewCount: store?.reviewCount ?? 0,
    productsCount: store?.productsCount ?? 0,
    discount: store?.discount ?? "",
    isVerified: store?.isVerified ?? false,
    isActive: store?.isActive ?? true,
    imageUrl: store?.imageUrl ?? "",
    imagePreview: store?.imageUrl ?? "",
    ownerId: store?.owner?.id ?? "",
  }));

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [availableOwners, setAvailableOwners] = useState<Staff[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await categoryApi.getAllCategories({
          includeInactive: false,
        });
        console.log("Categories API response:", response);
        
        if (response.success && response.data) {
          const categories = response.data as Category[];
          
          // Check if categories array has items
          if (categories.length === 0) {
            console.warn("No categories found. Make sure to run: npm run seed-categories in the server directory");
            setAvailableCategories([]);
            return;
          }
          
          // Flatten all categories (including children) into a single list
          const flattenCategories = (categoriesList: Category[]): Category[] => {
            const result: Category[] = [];
            for (const cat of categoriesList) {
              result.push(cat);
              // Only flatten if children exist and is an array
              if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
                result.push(...flattenCategories(cat.children));
              }
            }
            return result;
          };
          
          // Check if categories are already flat (no children property) or in tree structure
          const hasNestedStructure = categories.some(cat => cat.children && Array.isArray(cat.children));
          
          const flatList = hasNestedStructure 
            ? flattenCategories(categories)
            : categories; // Already flat
          
          console.log("Available categories:", flatList);
          setAvailableCategories(flatList);
        } else {
          console.warn("Invalid categories response:", response);
          setAvailableCategories([]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        showError("Failed to load categories. Please check the console for details.");
        setAvailableCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [showError]);

  // Fetch available owners (staff with owner role) when creating or editing a store
  useEffect(() => {
    const fetchOwners = async () => {
      setLoadingOwners(true);
      try {
        // Pass forStoreCreation=true to get all available owners and admins for store creation
        // For editing, only pass it if user can edit the owner
        const response = await staffApi.getAllStaff({ 
          forStoreCreation: !isEditing || (isEditing && canEditOwner)
        });
        if (response.success && response.data) {
          // Filter to show staff with 'owner' or 'admin' role
          const owners = response.data.filter(
            (staff) => (staff.role === "owner" || staff.role === "admin") && staff.isActive
          );
          
          // If editing a store with an owner, ensure the current owner is in the list
          if (isEditing && store?.owner) {
            const currentOwnerId = store.owner.id;
            const ownerExists = owners.some(owner => owner.id === currentOwnerId);
            
            // If current owner is not in the available list, add it
            if (!ownerExists) {
              const currentOwner: Staff = {
                id: store.owner.id,
                email: store.owner.email,
                firstName: store.owner.firstName,
                lastName: store.owner.lastName,
                phoneNumber: store.owner.phoneNumber || "",
                role: store.owner.role as 'admin' | 'owner' | 'manager' | 'employee',
                isActive: true,
                emailVerified: true,
                createdAt: "",
                updatedAt: "",
              };
              owners.unshift(currentOwner); // Add current owner at the beginning
            }
          }
          
          setAvailableOwners(owners);
          console.log("Available owners/admins loaded:", owners.length);
        }
      } catch (error) {
        console.error("Error fetching owners:", error);
        showError("Failed to load owners. Please try again.");
      } finally {
        setLoadingOwners(false);
      }
    };

    fetchOwners();
  }, [showError, isEditing, canEditOwner, store]);

  // Ensure owner is selected when editing a store with an owner
  // This runs after availableOwners is loaded to ensure the owner dropdown shows the current owner
  useEffect(() => {
    if (isEditing && store?.owner && availableOwners.length > 0 && !loadingOwners) {
      const currentOwnerId = store.owner.id;
      
      // If ownerId is not set or different from current owner, set it
      if (formData.ownerId !== currentOwnerId) {
        setFormData(prev => ({
          ...prev,
          ownerId: currentOwnerId
        }));
        console.log("Auto-selected store owner:", currentOwnerId);
      }
    }
  }, [isEditing, store?.owner?.id, availableOwners.length, loadingOwners]);

  const updateLocationField = (field: keyof Location, value: string) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  const handleCategorySelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value && !formData.category.includes(value)) {
      setFormData((prev) => ({
        ...prev,
        category: [...prev.category, value],
        selectedCategory: "",
      }));
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
      showError(t("storeModal.actions.invalidImageType"));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showError(t("storeModal.actions.imageTooLarge"));
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
        showSuccess(t("storeModal.actions.uploadSuccess"));
      } else {
        throw new Error("Upload response did not include an image URL.");
      }
    } catch (error) {
      console.error("Error uploading store image:", error);
      showError(t("storeModal.actions.uploadFail"));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Only admins can create stores
    if (!isEditing && user?.role !== 'admin') {
      showError("Only administrators can create stores");
      return;
    }

    const { location } = formData;
    if (
      !location.streetAddress.trim() ||
      !location.city.trim() ||
      !location.stateProvince.trim() ||
      !location.zipCode.trim() ||
      !location.country.trim()
    ) {
      showWarning(t("storeModal.actions.locationMissing"));
      return;
    }

    // Validate owner is required when creating a new store
    if (!isEditing && !formData.ownerId) {
      showWarning(t("storeModal.actions.ownerRequired") || "Store owner is required");
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
      ownerId: formData.ownerId || user?.id || '',
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
        
        // Only include ownerId if user can edit owner and it's different from current
        if (canEditOwner && formData.ownerId !== store.owner?.id) {
          updateData.ownerId = formData.ownerId || undefined;
        }
        
        await storeApi.updateStore(store.id, updateData);
      } else {
        if (!formData.ownerId) {
          showError(t("storeModal.actions.ownerRequired") || "Store owner is required");
          return;
        }

        const createData: CreateStoreRequest = {
          ...baseData,
          imageUrl: "/images/default-store.png",
          category: formData.category,
          rating: 0,
          reviewCount: 0,
          productsCount: 0,
          discount: undefined,
          isVerified: false,
          isActive: true,
          ownerId: formData.ownerId,
        };
        await storeApi.createStore(createData);
      }

      onSave();
    } catch (error) {
      console.error("Error saving store:", error);
      showError(t("storeModal.actions.saveError"));
    } finally {
      setSaving(false);
    }
  };

  // Prevent non-admins from creating stores
  if (!isEditing && !canCreateStore) {
    return null;
  }

  return (
    <div className={styles.backdropContainer}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h3 id={titleId} className={styles.title}>
            {isEditing
              ? t("storeModal.editTitle")
              : t("storeModal.createTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("storeModal.actions.close")}
            className={styles.closeButton}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`${styles.content} custom-scrollbar`}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={isEditing ? styles.gridTwo : styles.gridSingle}>
              <div className="form-group">
                <label className="form-label">
                  {t("storeModal.fields.name")}
                </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.rating")}
                  </label>
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
              <label className="form-label">
                {t("storeModal.fields.description")}
              </label>
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

            {(!isEditing || canEditOwner) && (
              <div className="form-group">
                <label className="form-label">
                  {t("storeModal.fields.owner")}
                  {!isEditing && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  value={formData.ownerId}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      ownerId: event.target.value,
                    }))
                  }
                  className="form-input form-select"
                  disabled={loadingOwners}
                  required={!isEditing}
                >
                  <option value="">
                    {loadingOwners
                      ? t("storeModal.fields.loadingOwners")
                      : t("storeModal.fields.selectOwner")}
                  </option>
                  {availableOwners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.firstName} {owner.lastName} ({owner.email})
                    </option>
                  ))}
                </select>
                {availableOwners.length === 0 && !loadingOwners && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t("storeModal.fields.noOwnersAvailable")}
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {t("storeModal.fields.categories")}
              </label>
              <select
                value={formData.selectedCategory}
                onChange={handleCategorySelectChange}
                className="form-input"
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : availableCategories.length === 0
                    ? "No categories available (run: npm run seed-categories)"
                    : t("storeModal.fields.categoryPlaceholder") || "-- Select category --"}
                </option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {availableCategories.length === 0 && !loadingCategories && (
                <p className="text-sm text-gray-500 mt-1">
                  No categories found. Please run <code className="bg-gray-100 px-1 rounded">npm run seed-categories</code> in the server directory.
                </p>
              )}
              {formData.category.length > 0 && (
                <div className={styles.categoryList}>
                  {formData.category.map((category) => (
                    <span key={category} className={styles.categoryChip}>
                      {category}
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(category)}
                        className={styles.categoryRemove}
                        aria-label={t("storeModal.actions.removeCategory", {
                          category,
                        })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="form-group">
                <label className="form-label">
                  {t("storeModal.fields.storeImage")}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="form-input"
                  disabled={uploadingImage}
                />
                {formData.imagePreview && (
                  <>
                    <div className={styles.imagePreview}>
                      <img
                        src={getImageUrl(formData.imagePreview)}
                        alt={t("storeModal.fields.storeImage")}
                      />
                    </div>
                    {uploadingImage && (
                      <p className={styles.imageStatus}>
                        {t("storeModal.fields.uploading")}
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className={styles.infoBanner}>
                <h4 className={styles.infoBannerTitle}>
                  {t("storeModal.fields.imageHintTitle")}
                </h4>
                <p>{t("storeModal.fields.imageHintDescription")}</p>
              </div>
            )}

            <div className={styles.sectionDivider}>
              <h4 className={styles.sectionTitle}>
                {t("storeModal.fields.locationTitle")}
              </h4>
              <div className={styles.gridTwo}>
                <div className={`form-group ${styles.fullWidth}`}>
                  <label className="form-label">
                    {t("storeModal.fields.street")}
                  </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.apt")}
                  </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.city")}
                  </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.state")}
                  </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.zip")}
                  </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.country")}
                  </label>
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
              <div className={styles.gridTwo}>
                <div className="form-group">
                  <label className="form-label">
                    {t("storeModal.fields.reviewCount")}
                  </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.productsCount")}
                  </label>
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

            <div className={styles.gridTwo}>
              <div className="form-group">
                <label className="form-label">
                  {t("storeModal.fields.establishedYear")}
                </label>
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
                  <label className="form-label">
                    {t("storeModal.fields.discount")}
                  </label>
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
                    placeholder={t("storeModal.fields.discountPlaceholder")}
                  />
                </div>
              )}
            </div>

            {isEditing && (
              <div className={styles.toggleGroup}>
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        isVerified: event.target.checked,
                      }))
                    }
                    className={styles.checkbox}
                  />
                  <span>{t("storeModal.fields.verified")}</span>
                </label>
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                    className={styles.checkbox}
                  />
                  <span>{t("storeModal.fields.active")}</span>
                </label>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || uploadingImage}
              >
                {saving
                  ? t("storeModal.actions.saving")
                  : isEditing
                  ? t("storeModal.actions.update")
                  : t("storeModal.actions.create")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={saving || uploadingImage}
              >
                {t("storeModal.actions.cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StoreModal;
