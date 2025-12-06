import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { X, Trash2 } from "lucide-react";
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

  // Initialize imageUrls from product, fallback to imageUrl for backward compatibility
  const initialImageUrls = product?.imageUrls || (product?.imageUrl ? [product.imageUrl] : []);

  const [formData, setFormData] = useState<CreateProductRequest>({
    storeId: storeId,
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    imageUrl: product?.imageUrl ?? "",
    imageUrls: initialImageUrls,
    stockQuantity: product?.stockQuantity ?? 0,
    category: product?.category ?? "",
    barcode: product?.barcode ?? "",
    serialNumber: product?.serialNumber ?? "",
    isActive: product?.isActive ?? true,
    isFinalSale: product?.isFinalSale ?? true, // Default to true (final sale)
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Sync imageUrls with formData
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: imageUrls,
      imageUrl: imageUrls.length > 0 ? imageUrls[0] : "", // Keep for backward compatibility
    }));
  }, [imageUrls]);

  const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
  const MAX_IMAGES = 10;

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

    if (imageUrls.length >= MAX_IMAGES) {
      showError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    setUploadingImage(true);
    try {
      const productId = product?.id;
      const response = await productApi.uploadProductImage(file, productId);
      if (response.success && response.data?.imageUrl) {
        const newImageUrl = response.data.imageUrl;
        setImageUrls((prev) => [...prev, newImageUrl]);
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

  const handleMultipleImagesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);
    
    // Validate all files
    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        showError(`Invalid image file: ${file.name}`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        showError(`Image file too large: ${file.name}`);
        return;
      }
    }

    if (imageUrls.length + fileArray.length > MAX_IMAGES) {
      showError(`Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - imageUrls.length} more.`);
      return;
    }

    setUploadingImages(true);
    try {
      const productId = product?.id;
      const response = await productApi.uploadProductImages(fileArray, productId);
      if (response.success && response.data?.imageUrls) {
        setImageUrls((prev) => [...prev, ...response.data.imageUrls]);
        showSuccess(
          `${response.data.imageUrls.length} image(s) uploaded successfully.`
        );
      } else {
        throw new Error("Upload response did not include image URLs.");
      }
    } catch (error: any) {
      console.error("Error uploading product images:", error);
      showError(
        error.message ||
          "Failed to upload images. Please try again."
      );
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
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
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          stockQuantity: formData.stockQuantity,
          category: formData.category || undefined,
          barcode: formData.barcode || undefined,
          serialNumber: formData.serialNumber || undefined,
          isActive: formData.isActive,
          isFinalSale: formData.isFinalSale,
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
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                name="isFinalSale"
                type="checkbox"
                checked={formData.isFinalSale ?? true}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <span>
                {t("productModal.fields.finalSale") || "Final Sale (No Returns)"}
              </span>
            </label>
            <p className={styles.helpText}>
              {t("productModal.fields.finalSaleHelp") || 
                "If checked, this product cannot be returned. Uncheck to allow returns."}
            </p>
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
              disabled={saving || uploadingImage || uploadingImages}
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
