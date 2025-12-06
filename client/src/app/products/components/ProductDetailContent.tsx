"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { productService, Product } from "@/services/product";
import { useCart } from "@/contexts/CartContext";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import { ChevronLeft, ShoppingCart, Star, Package, Truck, Shield, Store as StoreIcon } from "lucide-react";
import { apiService } from "@/services/api";
import type { Store } from "@/services/api";
import Link from "next/link";
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
    averageRating?: number;
    reviewCount?: number;
  };
  initialStore?: Store;
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={styles.starRating}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className={`${styles.star} ${styles.filled} ${styles[size]}`} fill="currentColor" />
      ))}
      {hasHalfStar && (
        <Star key="half" className={`${styles.star} ${styles.half} ${styles[size]}`} fill="currentColor" />
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className={`${styles.star} ${styles.empty} ${styles[size]}`} />
      ))}
    </div>
  );
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
      averageRating: initialProduct.averageRating,
      reviewCount: initialProduct.reviewCount,
    } : null
  );
  const [store, setStore] = useState<Store | null>(initialStore || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ averageRating: number; totalReviews: number } | null>(null);

  useEffect(() => {
    if (initialProduct) {
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productService.getProductById(productId);
        if (response.success && response.data) {
          setProduct(response.data);
          if (!initialStore && response.data.storeId) {
            const storeResponse = await apiService.getStoreById(response.data.storeId);
            if (storeResponse.success && storeResponse.data) {
              setStore(storeResponse.data);
            }
          }
        }
      } catch (error) {
        // Failed to fetch product
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, initialProduct, initialStore]);

  // Fetch reviews
  useEffect(() => {
    if (!productId) return;

    const fetchReviews = async () => {
      try {
        const response = await apiService.getProductReviews(productId, { limit: 5, sortBy: 'newest' });
        if (response.success && response.data) {
          setReviews(response.data);
          
          // Calculate stats from reviews
          if (response.data.length > 0) {
            const total = response.total || response.data.length;
            const avg = response.data.reduce((sum: number, r: any) => sum + r.rating, 0) / response.data.length;
            setReviewStats({ averageRating: avg, totalReviews: total });
          }
        }
      } catch (error) {
        // Failed to fetch reviews
      }
    };

    fetchReviews();
  }, [productId]);

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
      productImage: images[0],
      price: product.price,
      quantity: 1,
      storeId: product.storeId,
      storeName: store?.name || "Unknown Store",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [product, images, store, addItem]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    handleAddToCart();
    router.push('/cart');
  }, [product, handleAddToCart, router]);

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
            <button onClick={() => router.back()} className={styles.backButton}>
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const averageRating = product.averageRating || reviewStats?.averageRating || 0;
  const reviewCount = product.reviewCount || reviewStats?.totalReviews || 0;
  const isInStock = product.stockQuantity > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <button onClick={() => router.back()} className={styles.breadcrumbLink}>
            <ChevronLeft className={styles.breadcrumbIcon} />
            Back
          </button>
          {store && (
            <>
              <span className={styles.breadcrumbSeparator}>›</span>
              <Link href={`/stores/${store.id}`} className={styles.breadcrumbLink}>
                {store.name}
              </Link>
            </>
          )}
          {product.category && (
            <>
              <span className={styles.breadcrumbSeparator}>›</span>
              <span className={styles.breadcrumbText}>{product.category}</span>
            </>
          )}
        </div>

        {/* Main Product Section - Amazon 3-Column Layout */}
        <div className={styles.productMain}>
          {/* Left Column: Thumbnails + Main Image */}
          <div className={styles.leftColumn}>
            {/* Vertical Thumbnail Strip */}
            {images.length > 1 && (
              <div className={styles.thumbnailColumn}>
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

            {/* Main Image */}
            <div className={styles.mainImageContainer}>
              {images.length > 0 ? (
                <img
                  src={getImageUrl(images[currentImageIndex]) || getPlaceholderImage()}
                  alt={product.name}
                  className={styles.mainImage}
                  onError={handleImageError}
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <span>No Image</span>
                </div>
              )}
            </div>
          </div>

          {/* Center Column: Product Information */}
          <div className={styles.centerColumn}>
            <h1 className={styles.productTitle}>{product.name}</h1>

            {/* Brand/Store Link */}
            {store && (
              <div className={styles.brandLink}>
                <Link href={`/stores/${store.id}`} className={styles.brandLinkText}>
                  Visit the {store.name} Store
                </Link>
              </div>
            )}

            {/* Rating and Reviews */}
            {averageRating > 0 && (
              <div className={styles.ratingSection}>
                <StarRating rating={averageRating} size="md" />
                <a href="#reviews" className={styles.reviewLink}>
                  {averageRating.toFixed(1)} out of 5
                </a>
                <span className={styles.reviewCount}>({reviewCount} {reviewCount === 1 ? 'rating' : 'ratings'})</span>
              </div>
            )}

            {/* Price Section */}
            <div className={styles.priceSection}>
              <span className={styles.price}>${product.price.toFixed(2)}</span>
            </div>

            {/* Stock Status */}
            <div className={styles.stockSection}>
              {isInStock ? (
                <div className={styles.inStock}>
                  <span className={styles.stockText}>In Stock</span>
                  {product.stockQuantity > 0 && (
                    <span className={styles.stockQuantity}>({product.stockQuantity} available)</span>
                  )}
                </div>
              ) : (
                <div className={styles.outOfStock}>
                  <span className={styles.stockText}>Currently out of stock</span>
                </div>
              )}
            </div>

            {/* Shipping Info */}
            <div className={styles.shippingInfo}>
              <div className={styles.shippingItem}>
                <span className={styles.shippingText}>FREE Returns</span>
              </div>
              <div className={styles.shippingItem}>
                <span className={styles.shippingText}>FREE Shipping on orders over $50</span>
              </div>
            </div>

            {/* Product Description */}
            {product.description && (
              <div className={styles.descriptionSection}>
                <h2 className={styles.sectionTitle}>About this item</h2>
                <p className={styles.descriptionText}>{product.description}</p>
              </div>
            )}

            {/* Product Specs */}
            <div className={styles.specsSection}>
              <h2 className={styles.sectionTitle}>Product Information</h2>
              <table className={styles.specsTable}>
                <tbody>
                  {product.category && (
                    <tr>
                      <td className={styles.specLabel}>Category</td>
                      <td className={styles.specValue}>{product.category}</td>
                    </tr>
                  )}
                  <tr>
                    <td className={styles.specLabel}>Stock Quantity</td>
                    <td className={styles.specValue}>{product.stockQuantity}</td>
                  </tr>
                  {store && (
                    <tr>
                      <td className={styles.specLabel}>Store</td>
                      <td className={styles.specValue}>
                        <Link href={`/stores/${store.id}`} className={styles.storeLink}>
                          {store.name}
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Purchase Box */}
          <div className={styles.rightColumn}>
            <div className={styles.purchaseBox}>
              {/* Price */}
              <div className={styles.purchasePrice}>
                ${product.price.toFixed(2)}
              </div>

              {/* Delivery Info */}
              <div className={styles.deliveryInfo}>
                <div className={styles.deliveryText}>
                  FREE delivery for orders over $50
                </div>
              </div>

              {/* Stock Status */}
              <div className={styles.purchaseStock}>
                {isInStock ? (
                  <div className={styles.inStockBadge}>
                    <span className={styles.stockIcon}>✓</span>
                    <span>In Stock</span>
                  </div>
                ) : (
                  <div className={styles.outOfStockBadge}>
                    Temporarily out of stock
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className={styles.quantitySection}>
                <label className={styles.quantityLabel}>Quantity:</label>
                <select className={styles.quantitySelect} defaultValue="1">
                  {[...Array(Math.min(product.stockQuantity || 1, 10))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button
                  onClick={handleAddToCart}
                  disabled={!isInStock}
                  className={`${styles.addToCartButton} ${
                    added ? styles.added : !isInStock ? styles.disabled : ''
                  }`}
                >
                  <ShoppingCart className={styles.buttonIcon} />
                  {added ? "✓ Added to Cart" : !isInStock ? "Out of Stock" : "Add to Cart"}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!isInStock}
                  className={`${styles.buyNowButton} ${!isInStock ? styles.disabled : ''}`}
                >
                  Buy Now
                </button>
              </div>

              {/* Security Badge */}
              <div className={styles.securityBadge}>
                <Shield className={styles.securityIcon} />
                <span>Secure checkout guaranteed</span>
              </div>

              {/* Store Info */}
              {store && (
                <div className={styles.storeInfoBox}>
                  <div className={styles.storeInfoRow}>
                    <span className={styles.storeInfoLabel}>Sold by</span>
                    <Link href={`/stores/${store.id}`} className={styles.storeInfoLink}>
                      {store.name}
                    </Link>
                  </div>
                  <div className={styles.storeInfoRow}>
                    <span className={styles.storeInfoLabel}>Returns</span>
                    <span className={styles.storeInfoText}>FREE refund/replacement within 30 days</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div id="reviews" className={styles.reviewsSection}>
            <h2 className={styles.reviewsTitle}>Customer Reviews</h2>
            <div className={styles.reviewsSummary}>
              <div className={styles.reviewsRating}>
                <StarRating rating={averageRating} size="lg" />
                <div className={styles.reviewsStats}>
                  <span className={styles.reviewsAverage}>{averageRating.toFixed(1)} out of 5</span>
                  <span className={styles.reviewsCount}>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
                </div>
              </div>
            </div>
            <div className={styles.reviewsList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewUser}>
                      {review.userAvatar ? (
                        <img
                          src={getImageUrl(review.userAvatar) || getPlaceholderImage()}
                          alt={review.userName || "User"}
                          className={styles.userAvatar}
                          onError={handleImageError}
                        />
                      ) : (
                        <div className={styles.userAvatarPlaceholder}>
                          {(review.userName || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className={styles.userInfo}>
                        <p className={styles.userName}>{review.userName || "Anonymous"}</p>
                        <p className={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {review.title && <h4 className={styles.reviewTitle}>{review.title}</h4>}
                  {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}
                  {review.reply && (
                    <div className={styles.reviewReply}>
                      <div className={styles.replyHeader}>
                        <span className={styles.replyLabel}>Store Reply</span>
                      </div>
                      <div className={styles.replyText}>{review.reply}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {reviewCount > reviews.length && (
              <div className={styles.viewAllReviews}>
                <Link href={`/products/${productId}#reviews`} className={styles.viewAllLink}>
                  View all {reviewCount} reviews
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
