"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import styles from "./ProductDetailContent.module.scss";

interface ProductDetailContentProps {
  productId: string;
}

export default function ProductDetailContent({ productId }: ProductDetailContentProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productService.getProductById(productId);
        if (response.success && response.data) {
          setProduct(response.data);
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
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: (product.imageUrls && product.imageUrls.length > 0) 
        ? product.imageUrls[0] 
        : product.imageUrl,
      price: product.price,
      quantity: 1,
      storeId: product.storeId,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

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

  // Get all images - prefer imageUrls, fallback to imageUrl
  const images = product.imageUrls && product.imageUrls.length > 0 
    ? product.imageUrls 
    : (product.imageUrl ? [product.imageUrl] : []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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

