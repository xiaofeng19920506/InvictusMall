import React, { useEffect, useState, useCallback } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { X, MessageSquare, Star, Trash2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi, categoryApi, staffApi, productApi, productReviewApi, type Category, type Staff, type ProductReview, type Product } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
  Location,
} from "../../shared/types/store";
import { getImageUrl, getPlaceholderImage, handleImageError } from "../../shared/utils/imageUtils";
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

  // Update formData when store prop changes (e.g., when store data is loaded asynchronously)
  useEffect(() => {
    if (store) {
      setFormData(prev => ({
        ...prev,
        name: store.name ?? prev.name,
        description: store.description ?? prev.description,
        establishedYear: store.establishedYear ?? prev.establishedYear,
        location: store.location?.[0] ? { ...store.location[0] } : prev.location,
        category: store.category ?? prev.category,
        rating: store.rating ?? prev.rating,
        reviewCount: store.reviewCount ?? prev.reviewCount,
        productsCount: store.productsCount ?? prev.productsCount,
        discount: store.discount ?? prev.discount,
        isVerified: store.isVerified ?? prev.isVerified,
        isActive: store.isActive ?? prev.isActive,
        imageUrl: store.imageUrl ?? prev.imageUrl,
        imagePreview: store.imageUrl ?? prev.imagePreview,
        ownerId: store.owner?.id ?? prev.ownerId,
      }));
    }
  }, [store?.id, store?.owner?.id]);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [availableOwners, setAvailableOwners] = useState<Staff[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const isAdmin = user?.role === "admin";

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
          
          // If editing a store with an owner, immediately set the ownerId after loading owners
          if (isEditing && store?.owner?.id && owners.length > 0) {
            const currentOwnerId = store.owner.id;
            // Check if current owner exists in the list (should always be true after our logic above)
            const ownerExists = owners.some(owner => owner.id === currentOwnerId);
            if (ownerExists) {
              // Set ownerId immediately after owners are loaded
              setFormData(prev => {
                if (prev.ownerId !== currentOwnerId) {
                  console.log("Auto-selecting store owner immediately after loading:", {
                    currentOwnerId,
                    previousOwnerId: prev.ownerId,
                    storeOwner: store.owner
                  });
                  return {
                    ...prev,
                    ownerId: currentOwnerId
                  };
                }
                return prev;
              });
            }
          }
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
  // This is a backup to ensure ownerId is set even if it wasn't set in the fetchOwners callback
  useEffect(() => {
    if (isEditing && store?.owner?.id && availableOwners.length > 0 && !loadingOwners) {
      const currentOwnerId = store.owner.id;
      
      // Always set the ownerId to match the current store owner
      // This ensures the dropdown shows the selected value even if it was reset
      setFormData(prev => {
        if (prev.ownerId !== currentOwnerId) {
          console.log("Auto-selecting store owner (backup useEffect):", {
            currentOwnerId,
            previousOwnerId: prev.ownerId,
            storeOwner: store.owner,
            availableOwnersCount: availableOwners.length
          });
          return {
            ...prev,
            ownerId: currentOwnerId
          };
        }
        return prev;
      });
    }
  }, [isEditing, store?.owner?.id, availableOwners.length, loadingOwners]);

  // Fetch products when store is loaded
  const fetchStoreProducts = useCallback(async () => {
    if (!store?.id) {
      console.log("StoreModal: No store ID, skipping product fetch");
      return;
    }
    console.log("StoreModal: Fetching products for store:", store.id);
    try {
      const response = await productApi.getProductsByStore(store.id, undefined, 100, 0);
      console.log("StoreModal: Products response:", response);
      if (response.success && response.data) {
        console.log(`StoreModal: Found ${response.data.length} products`);
        setProducts(response.data);
      } else {
        console.warn("StoreModal: Failed to fetch products:", response);
        setProducts([]);
      }
    } catch (error) {
      console.error("StoreModal: Error fetching store products:", error);
      setProducts([]);
    }
  }, [store?.id]);

  useEffect(() => {
    console.log("StoreModal: Component mounted/updated", {
      isEditing,
      storeId: store?.id,
      storeName: store?.name
    });
    
    if (isEditing && store?.id) {
      console.log("StoreModal: Store loaded, fetching products...", store);
      fetchStoreProducts();
    } else {
      console.log("StoreModal: Not editing or no store, clearing products and reviews");
      setProducts([]);
      setReviews([]);
    }
  }, [isEditing, store?.id, fetchStoreProducts]);

  // Fetch reviews function - use ref to get latest products
  const productsRef = React.useRef<Product[]>([]);
  React.useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const fetchStoreReviews = useCallback(async () => {
    const currentProducts = productsRef.current;
    const currentStoreId = store?.id;
    
    if (!currentStoreId) {
      console.log("StoreModal: No store ID, skipping review fetch");
      setReviews([]);
      return;
    }

    if (currentProducts.length === 0) {
      console.log("StoreModal: No products found, cannot fetch reviews");
      setReviews([]);
      return;
    }

    console.log(`StoreModal: Fetching reviews for ${currentProducts.length} products`, currentProducts.map(p => ({ id: p.id, name: p.name })));
    
    setReviewsLoading(true);
    const allReviews: ProductReview[] = [];
    
    try {
      for (let i = 0; i < currentProducts.length; i++) {
        const product = currentProducts[i];
        
        // Check if store ID changed during fetch (prevent race condition)
        if (store?.id !== currentStoreId) {
          console.log("StoreModal: Store ID changed during fetch, aborting");
          return;
        }
        
        try {
          // Add delay between requests to avoid rate limiting (except for the first request)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          const response = await productReviewApi.getProductReviews(product.id, {
            limit: 50,
            sortBy: 'newest',
          });
          
          // Validate response structure
          if (response && response.success && Array.isArray(response.data)) {
            const productReviews = response.data.map((review: ProductReview) => ({
              ...review,
              productName: product.name,
            }));
            
            if (productReviews.length > 0) {
              allReviews.push(...productReviews);
            }
          }
        } catch (err: any) {
          // If rate limited, wait longer before continuing to next product
          if (err.response?.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          // Continue to next product even if error occurred
        }
      }
      
      // Only update reviews if store ID hasn't changed
      if (store?.id === currentStoreId) {
        // Sort by newest first
        allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReviews(allReviews);
      }
    } catch (err) {
      console.error("StoreModal: Error fetching store reviews:", err);
      // Only clear reviews if store ID hasn't changed
      if (store?.id === currentStoreId) {
        setReviews([]);
      }
    } finally {
      if (store?.id === currentStoreId) {
        setReviewsLoading(false);
      }
    }
  }, [store?.id]);

  // Use ref to track if we're currently fetching to prevent duplicate calls
  const isFetchingRef = React.useRef(false);

  // Fetch reviews when showReviews is toggled and products are available
  useEffect(() => {
    console.log("StoreModal: Reviews useEffect triggered", {
      showReviews,
      productsLength: products.length,
      reviewsLoading,
      storeId: store?.id,
      isFetching: isFetchingRef.current,
    });
    
    // Only fetch if:
    // 1. showReviews is true
    // 2. products are available
    // 3. not currently fetching
    // 4. not already loading
    if (showReviews && products.length > 0 && !isFetchingRef.current && !reviewsLoading) {
      console.log("StoreModal: Show reviews is true, fetching reviews...");
      isFetchingRef.current = true;
      fetchStoreReviews().finally(() => {
        isFetchingRef.current = false;
      });
    } else if (showReviews && products.length === 0) {
      console.log("StoreModal: Show reviews but no products, waiting for products...");
    } else if (!showReviews) {
      console.log("StoreModal: Reviews hidden, not fetching");
      // Reset fetching flag when hiding reviews
      isFetchingRef.current = false;
    }
  }, [showReviews, products.length, store?.id]); // Removed fetchStoreReviews and reviewsLoading from dependencies

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
          // Rating and reviewCount are auto-calculated from reviews, don't send them
          productsCount: formData.productsCount,
          discount: formData.discount || undefined,
          isVerified: formData.isVerified,
          isActive: formData.isActive,
        };
        
        // Always include ownerId if user can edit owner
        // This ensures the owner relationship is preserved and updated correctly on the backend
        if (canEditOwner) {
          // Use formData.ownerId if set, otherwise preserve the current owner
          updateData.ownerId = formData.ownerId || store?.owner?.id || undefined;
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
          // Rating and reviewCount are auto-calculated from reviews
          // rating: 0,
          // reviewCount: 0,
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
                    {t("storeModal.fields.rating")} <span className="text-muted">({t("storeModal.fields.ratingDisabled")})</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={formData.rating || 0}
                      disabled
                      className="form-input"
                      style={{ opacity: 0.6, cursor: 'not-allowed', flex: 1 }}
                      title={t("storeModal.fields.ratingDisabled")}
                    />
                    <div style={{ fontSize: '18px', color: '#fbbf24' }}>
                      {'⭐'.repeat(Math.floor(formData.rating || 0))}
                      {formData.rating % 1 >= 0.5 && '⭐'}
                      {'☆'.repeat(5 - Math.ceil(formData.rating || 0))}
                    </div>
                  </div>
                  <small className="text-muted">
                    {t("storeModal.fields.ratingNote") || "Rating is calculated from product reviews"}
                  </small>
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
                {formData.imagePreview ? (
                  <>
                    <div className={styles.imagePreview}>
                      <img
                        src={getImageUrl(formData.imagePreview) || getPlaceholderImage()}
                        alt={t("storeModal.fields.storeImage")}
                        onError={handleImageError}
                      />
                    </div>
                    {uploadingImage && (
                      <p className={styles.imageStatus}>
                        {t("storeModal.fields.uploading")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className={styles.imagePreview}>
                    <img
                      src={getPlaceholderImage()}
                      alt={t("storeModal.fields.storeImage")}
                      onError={handleImageError}
                    />
                  </div>
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
                    {t("storeModal.fields.reviewCount") || "Review Count"} <span className="text-muted">({t("storeModal.fields.reviewCountDisabled") || "Auto-calculated"})</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      value={formData.reviewCount || 0}
                      disabled
                      className="form-input"
                      style={{ opacity: 0.6, cursor: 'not-allowed', flex: 1 }}
                      title={t("storeModal.fields.reviewCountDisabled") || "Review count is calculated from product reviews"}
                    />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      {formData.reviewCount === 0 ? 'No reviews yet' : `${formData.reviewCount} review${formData.reviewCount !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <small className="text-muted">
                    {t("storeModal.fields.reviewCountNote") || "Review count is calculated from all product reviews"}
                  </small>
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
              <>
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

                {/* Reviews Section */}
                <div className={styles.sectionDivider} style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h4 className={styles.sectionTitle} style={{ fontSize: '18px', fontWeight: '600', color: '#333', margin: 0 }}>
                        {t("storeModal.fields.reviews") || "Product Reviews"}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#666' }}>
                        <span>Rating: <strong>{formData.rating.toFixed(1)}</strong></span>
                        <span>Reviews: <strong>{formData.reviewCount}</strong></span>
                        <span>Products: <strong>{products.length}</strong></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          console.log("StoreModal: Debug button clicked", {
                            showReviews,
                            productsCount: products.length,
                            reviewsCount: reviews.length,
                            storeId: store?.id,
                            reviewsLoading,
                            products: products.map(p => ({ id: p.id, name: p.name }))
                          });
                        }}
                        className="btn btn-sm"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        title="Debug info"
                      >
                        Debug
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          console.log("StoreModal: Toggle reviews button clicked", {
                            currentShowReviews: showReviews,
                            productsCount: products.length,
                            productsRefCount: productsRef.current.length,
                            reviewsCount: reviews.length,
                            storeId: store?.id,
                            reviewsLoading,
                            products: products.map(p => ({ id: p.id, name: p.name }))
                          });
                          
                          // Simply toggle the state - useEffect will handle fetching
                          setShowReviews(!showReviews);
                        }}
                        className="btn btn-sm btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        disabled={products.length === 0 || reviewsLoading}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {showReviews ? 'Hide Reviews' : 'Show Reviews'}
                        {products.length > 0 && ` (${products.length} products)`}
                        {reviews.length > 0 && ` - ${reviews.length} reviews`}
                      </button>
                    </div>
                  </div>

                  {showReviews && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '16px' }}>
                      {reviewsLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <div className="loading" />
                          <p style={{ marginTop: '8px', color: '#666' }}>Loading reviews...</p>
                        </div>
                      ) : products.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                          <p>No products found for this store</p>
                          <p style={{ fontSize: '12px', marginTop: '4px', color: '#999' }}>
                            Products: {products.length} | Store ID: {store?.id}
                          </p>
                        </div>
                      ) : reviews.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                          <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ opacity: 0.5 }} />
                          <p>No reviews yet</p>
                          <p style={{ fontSize: '12px', marginTop: '4px', color: '#999' }}>
                            Checked {products.length} products
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {reviews.map((review) => (
                            <div key={review.id} style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <strong style={{ fontSize: '14px' }}>{review.userName || 'Anonymous'}</strong>
                                    {review.isVerifiedPurchase && (
                                      <span style={{ fontSize: '12px', color: '#10b981', backgroundColor: '#d1fae5', padding: '2px 6px', borderRadius: '4px' }}>
                                        ✓ Verified
                                      </span>
                                    )}
                                  </div>
                                  {review.productName && (
                                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                      Product: {review.productName}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '12px', color: '#999' }}>
                                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= (review.rating || 0)
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {review.title && (
                                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                                  {review.title}
                                </h5>
                              )}
                              {review.comment && (
                                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', marginBottom: '8px' }}>
                                  {review.comment}
                                </p>
                              )}
                              {review.images && review.images.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                  {review.images.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={getImageUrl(img) || getPlaceholderImage()}
                                      alt={`Review image ${idx + 1}`}
                                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e5e5' }}
                                      onError={handleImageError}
                                    />
                                  ))}
                                </div>
                              )}
                              {/* Reply Section */}
                              {review.reply && (
                                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f9ff', borderLeft: '3px solid #3b82f6', borderRadius: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <MessageSquare size={16} color="#3b82f6" />
                                    <span style={{ fontWeight: '600', color: '#1e40af', fontSize: '14px' }}>
                                      Store Reply
                                      {review.replyByName && ` by ${review.replyByName}`}
                                    </span>
                                    {review.replyAt && (
                                      <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>
                                        {new Date(review.replyAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
                                    {review.reply}
                                  </div>
                                </div>
                              )}
                              {/* Reply Input */}
                              {isAdmin && !review.reply && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e5e5e5' }}>
                                  {replyingTo === review.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write a reply..."
                                        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', resize: 'vertical' }}
                                        rows={3}
                                      />
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button
                                          onClick={async () => {
                                            if (!replyText.trim()) {
                                              showError("Reply cannot be empty");
                                              return;
                                            }
                                            setReplying(true);
                                            try {
                                              const response = await productReviewApi.replyToReview(review.id, replyText.trim());
                                              if (response.success) {
                                                showSuccess("Reply sent successfully");
                                                setReplyingTo(null);
                                                setReplyText("");
                                                // Refresh reviews
                                                if (store?.id) {
                                                  const response = await productApi.getProductsByStore(store.id, undefined, 100, 0);
                                                  if (response.success && response.data) {
                                                    setProducts(response.data);
                                                    const allReviews: ProductReview[] = [];
                                                    for (const product of response.data) {
                                                      try {
                                                        const reviewResponse = await productReviewApi.getProductReviews(product.id, {
                                                          limit: 50,
                                                          sortBy: 'newest',
                                                        });
                                                        if (reviewResponse.success && reviewResponse.data) {
                                                          const productReviews = reviewResponse.data.map((r: ProductReview) => ({
                                                            ...r,
                                                            productName: product.name,
                                                          }));
                                                          allReviews.push(...productReviews);
                                                        }
                                                      } catch (err) {
                                                        // Continue to next product
                                                      }
                                                    }
                                                    allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                                    setReviews(allReviews);
                                                  }
                                                }
                                              } else {
                                                showError("Failed to send reply");
                                              }
                                            } catch (error: any) {
                                              showError(error.response?.data?.message || "Failed to send reply");
                                            } finally {
                                              setReplying(false);
                                            }
                                          }}
                                          disabled={replying || !replyText.trim()}
                                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                        >
                                          <Send size={16} />
                                          Send Reply
                                        </button>
                                        <button
                                          onClick={() => {
                                            setReplyingTo(null);
                                            setReplyText("");
                                          }}
                                          disabled={replying}
                                          style={{ padding: '6px 12px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setReplyingTo(review.id)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                    >
                                      <MessageSquare size={16} />
                                      Reply
                                    </button>
                                  )}
                                </div>
                              )}
                              {/* Delete Button */}
                              {isAdmin && (
                                <div style={{ marginTop: '8px' }}>
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm("Are you sure you want to delete this review?")) {
                                        return;
                                      }
                                      try {
                                        const response = await productReviewApi.deleteReview(review.id);
                                        if (response.success) {
                                          showSuccess("Review deleted successfully");
                                          // Refresh reviews
                                          if (store?.id) {
                                            const response = await productApi.getProductsByStore(store.id, undefined, 100, 0);
                                            if (response.success && response.data) {
                                              setProducts(response.data);
                                              const allReviews: ProductReview[] = [];
                                              for (const product of response.data) {
                                                try {
                                                  const reviewResponse = await productReviewApi.getProductReviews(product.id, {
                                                    limit: 50,
                                                    sortBy: 'newest',
                                                  });
                                                  if (reviewResponse.success && reviewResponse.data) {
                                                    const productReviews = reviewResponse.data.map((r: ProductReview) => ({
                                                      ...r,
                                                      productName: product.name,
                                                    }));
                                                    allReviews.push(...productReviews);
                                                  }
                                                } catch (err) {
                                                  // Continue to next product
                                                }
                                              }
                                              allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                              setReviews(allReviews);
                                            }
                                          }
                                        } else {
                                          showError("Failed to delete review");
                                        }
                                      } catch (error: any) {
                                        showError(error.message || "Failed to delete review");
                                      }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                  >
                                    <Trash2 size={16} />
                                    Delete Review
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
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
