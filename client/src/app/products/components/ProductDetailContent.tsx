"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import type { Store } from "@/services/api";
import styles from "./ProductDetailContent.module.scss";

interface ProductDetailContentProps {
  productId: string;
  initialProduct?: {
    id: string;
    storeId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    imageUrls?: string[];
    stockQuantity: number;
    category?: string;
    isActive: boolean;
  };
  initialStore?: Store;
}

export default function ProductDetailContent({ 
  productId, 
  initialProduct,
  initialStore 
}: ProductDetailContentProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(
    initialProduct ? {
      id: initialProduct.id,
      storeId: initialProduct.storeId,
      name: initialProduct.name,
      description: initialProduct.description,
      price: initialProduct.price,
      imageUrl: initialProduct.imageUrl,
      imageUrls: initialProduct.imageUrls,
      stockQuantity: initialProduct.stockQuantity,
      category: initialProduct.category,
      isActive: initialProduct.isActive,
    } : null
  );
  const [store, setStore] = useState<Store | null>(initialStore || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    // Only fetch if we don't have initial product data
    if (initialProduct) {
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productService.getProductById(productId);
        if (response.success && response.data) {
          setProduct(response.data);
          // Also fetch store if not provided
          if (!initialStore && response.data.storeId) {
            const { apiService } = await import("@/services/api");
            const storeResponse = await apiService.getStoreById(response.data.storeId);
            if (storeResponse.success && storeResponse.data) {
              setStore(storeResponse.data);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, initialProduct, initialStore]);

  // Memoize image URLs to avoid recalculation
  const productImage = useMemo(() => {
    if (!product) return undefined;
    return (product.imageUrls && product.imageUrls.length > 0) 
      ? product.imageUrls[0] 
      : product.imageUrl;
  }, [product]);

  const images = useMemo(() => {
    if (!product) return [];
    return product.imageUrls && product.imageUrls.length > 0 
      ? product.imageUrls 
      : (product.imageUrl ? [product.imageUrl] : []);
  }, [product]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: productImage,
      price: product.price,
      quantity: 1,
      storeId: product.storeId,
      storeName: store?.name || "Unknown Store",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [product, productImage, store, addItem]);

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>Product not found.</p>
            <button
              onClick={() => router.back()}
              className={styles.backButton}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <button
          onClick={() => router.back()}
          className={styles.backLink}
        >
          <ChevronLeft className={styles.backIcon} />
          Back
        </button>

        <div className={styles.productCard}>
          <div className={styles.productGrid}>
            {/* Image Gallery */}
            <div className={styles.imageSection}>
              {images.length > 0 ? (
                <>
                  <div className={styles.imageContainer}>
                    <img
                      src={getImageUrl(images[currentImageIndex]) || getPlaceholderImage()}
                      alt={product.name}
                      className={styles.productImage}
                      onError={handleImageError}
                    />
                    
                    {/* Navigation arrows (only show if more than 1 image) */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className={`${styles.navButton} ${styles.prev}`}
                          aria-label="Previous image"
                        >
                          <ChevronLeft className={styles.navIcon} />
                        </button>
                        <button
                          onClick={nextImage}
                          className={`${styles.navButton} ${styles.next}`}
                          aria-label="Next image"
                        >
                          <ChevronRight className={styles.navIcon} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail navigation */}
                  {images.length > 1 && (
                    <div className={styles.thumbnails}>
                      {images.map((imageUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                        >
                          <img
                            src={getImageUrl(imageUrl) || getPlaceholderImage()}
                            alt={`${product.name} thumbnail ${index + 1}`}
                            className={styles.thumbnailImage}
                            onError={handleImageError}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Image counter */}
                  {images.length > 1 && (
                    <div className={styles.imageCounter}>
                      Image {currentImageIndex + 1} of {images.length}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.imagePlaceholder}>
                  <span>No Image</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className={styles.infoSection}>
              <h1 className={styles.title}>{product.name}</h1>
              
              {product.description && (
                <div className={styles.descriptionSection}>
                  <h2 className={styles.descriptionTitle}>Description</h2>
                  <p className={styles.descriptionText}>{product.description}</p>
                </div>
              )}

              <div className={styles.priceSection}>
                <div className={styles.price}>
                  ${product.price.toFixed(2)}
                </div>
                {product.stockQuantity !== undefined && (
                  <div className={styles.stock}>
                    Stock: {product.stockQuantity > 0 ? `${product.stockQuantity} available` : "Out of stock"}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity === 0}
                  className={`${styles.addToCartButton} ${
                    added
                      ? styles.added
                      : product.stockQuantity === 0
                      ? styles.disabled
                      : ''
                  }`}
                >
                  <ShoppingCart className={styles.cartIcon} />
                  {added ? "✓ Added to Cart" : product.stockQuantity === 0 ? "Out of Stock" : "Add to Cart"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

