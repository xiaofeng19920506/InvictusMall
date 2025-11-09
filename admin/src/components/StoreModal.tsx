import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi } from "../services/api";
import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
  Location,
} from "../types/store";
import { getImageUrl } from "../utils/imageUtils";
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
  const { t } = useTranslation();
  const titleId = isEditing
    ? "store-modal-title-edit"
    : "store-modal-title-create";

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
      window.alert(t("storeModal.actions.invalidImageType"));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      window.alert(t("storeModal.actions.imageTooLarge"));
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
        window.alert(t("storeModal.actions.uploadSuccess"));
      } else {
        throw new Error("Upload response did not include an image URL.");
      }
    } catch (error) {
      console.error("Error uploading store image:", error);
      window.alert(t("storeModal.actions.uploadFail"));
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
      window.alert(t("storeModal.actions.locationMissing"));
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
      window.alert(t("storeModal.actions.saveError"));
    } finally {
      setSaving(false);
    }
  };

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

            {isEditing && (
              <div className="form-group">
                <label className="form-label">
                  {t("storeModal.fields.categories")}
                </label>
                <div className={styles.categoryControls}>
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
                    placeholder={t("storeModal.fields.categoryPlaceholder")}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddCategory}
                  >
                    {t("storeModal.fields.addCategory")}
                  </button>
                </div>
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
            )}

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
