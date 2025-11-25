import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { productApi } from "../../services/api";
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
} from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import { getImageUrl } from "../../shared/utils/imageUtils";
import styles from "./ProductModal.module.css";

export interface ProductModalProps {
  product: Product | null;
  storeId: string;
  onClose: () => void;
  onSave: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({
  product,
  storeId,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useNotification();
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState<CreateProductRequest>({
    storeId: storeId,
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    imageUrl: product?.imageUrl ?? "",
    stockQuantity: product?.stockQuantity ?? 0,
    category: product?.category ?? "",
    isActive: product?.isActive ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(
    product?.imageUrl || ""
  );

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Update image preview when formData.imageUrl changes
  useEffect(() => {
    if (formData.imageUrl) {
      setImagePreview(formData.imageUrl);
    }
  }, [formData.imageUrl]);

  const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showError(
        t("productModal.actions.invalidImageType") ||
          "Please select an image file."
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showError(
        t("productModal.actions.imageTooLarge") ||
          "Image file size must be less than 15MB."
      );
      return;
    }

    setUploadingImage(true);
    try {
      const productId = product?.id;
      const response = await productApi.uploadProductImage(file, productId);
      if (response.success && response.data?.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: response.data.imageUrl,
        }));
        setImagePreview(response.data.imageUrl);
        showSuccess(
          t("productModal.actions.uploadSuccess") ||
            "Image uploaded successfully."
        );
      } else {
        throw new Error("Upload response did not include an image URL.");
      }
    } catch (error: any) {
      console.error("Error uploading product image:", error);
      showError(
        error.message ||
          t("productModal.actions.uploadFail") ||
          "Failed to upload image. Please try again."
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing && product) {
        const updateData: UpdateProductRequest = {
          name: formData.name,
          description: formData.description || undefined,
          price: formData.price,
          imageUrl: formData.imageUrl || undefined,
          stockQuantity: formData.stockQuantity,
          category: formData.category || undefined,
          isActive: formData.isActive,
        };
        const response = await productApi.updateProduct(product.id, updateData);
        if (response.success) {
          showSuccess(t("productModal.actions.updateSuccess"));
          onSave();
        }
      } else {
        const createData: CreateProductRequest = {
          ...formData,
          storeId: storeId,
        };
        const response = await productApi.createProduct(createData);
        if (response.success) {
          showSuccess(t("productModal.actions.createSuccess"));
          onSave();
        }
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      showError(
        error.response?.data?.message || t("productModal.actions.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  const titleId = isEditing
    ? "product-modal-title-edit"
    : "product-modal-title-create";

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {isEditing
              ? t("productModal.editTitle")
              : t("productModal.createTitle")}
          </h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label={t("productModal.actions.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              {t("productModal.fields.nameRequired")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              {t("productModal.fields.description")}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="price" className={styles.label}>
                {t("productModal.fields.priceRequired")}
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="stockQuantity" className={styles.label}>
                {t("productModal.fields.stockQuantity")}
              </label>
              <input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              {t("productModal.fields.category")}
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="">
                {t("productModal.fields.categoryPlaceholder") ||
                  "-- Select category --"}
              </option>
              <option value="service">
                {t("productModal.fields.categoryOptions.service")}
              </option>
              <option value="product">
                {t("productModal.fields.categoryOptions.product")}
              </option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="imageFile" className={styles.label}>
              {t("productModal.fields.image")}
            </label>
            <div className={styles.imageUploadSection}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploadingImage}
                className={styles.fileInput}
                id="imageFile"
              />
              <label htmlFor="imageFile" className={styles.fileInputLabel}>
                {uploadingImage
                  ? t("productModal.actions.uploading") || "Uploading..."
                  : t("productModal.actions.uploadImage") || "Upload Image"}
              </label>
              {uploadingImage && (
                <span className={styles.uploadingText}>
                  {t("productModal.actions.uploading") || "Uploading..."}
                </span>
              )}
            </div>
            {(imagePreview || formData.imageUrl) && (
              <img
                src={getImageUrl(imagePreview || formData.imageUrl)}
                alt="Product preview"
                className={styles.imagePreview}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <span>{t("productModal.fields.active")}</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={saving}
            >
              {t("productModal.actions.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || uploadingImage}
            >
              {saving
                ? t("productModal.actions.saving")
                : isEditing
                ? t("productModal.actions.update")
                : t("productModal.actions.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
