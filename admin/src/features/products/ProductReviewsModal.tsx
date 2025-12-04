import React, { useEffect, useState } from "react";
import { X, Star, Trash2, MessageSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { productReviewApi } from "../../services/api";
import type { ProductReview } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import { getImageUrl } from "../../shared/utils/imageUtils";
import styles from "./ProductReviewsModal.module.css";

export interface ProductReviewsModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ProductReviewsModal: React.FC<ProductReviewsModalProps> = ({
  productId,
  productName,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useNotification();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    averageRating: number;
    totalReviews: number;
  } | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      fetchReviews();
      fetchStats();
    }
  }, [isOpen, productId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await productReviewApi.getProductReviews(productId, {
        limit: 50,
        sortBy: 'newest',
      });
      if (response.success && response.data) {
        setReviews(response.data);
      } else {
        showError("Failed to load reviews");
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      showError(error.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await productReviewApi.getReviewStats(productId);
      if (response.success && response.data) {
        setStats({
          averageRating: response.data.averageRating,
          totalReviews: response.data.totalReviews,
        });
      }
    } catch (error: any) {
      console.error("Error fetching review stats:", error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const response = await productReviewApi.deleteReview(reviewId);
      if (response.success) {
        showSuccess("Review deleted successfully");
        fetchReviews();
        fetchStats();
      } else {
        showError("Failed to delete review");
      }
    } catch (error: any) {
      console.error("Error deleting review:", error);
      showError(error.message || "Failed to delete review");
    }
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      showError("Reply cannot be empty");
      return;
    }

    setReplying(true);
    try {
      const response = await productReviewApi.replyToReview(reviewId, replyText.trim());
      if (response.success) {
        showSuccess("Reply sent successfully");
        setReplyingTo(null);
        setReplyText("");
        fetchReviews();
      } else {
        showError("Failed to send reply");
      }
    } catch (error: any) {
      console.error("Error replying to review:", error);
      showError(error.response?.data?.message || "Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${styles.star} ${
              star <= rating ? styles.filled : styles.empty
            }`}
            size={16}
            fill={star <= rating ? "currentColor" : "none"}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Product Reviews</h2>
            <p className={styles.productName}>{productName}</p>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {stats && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Average Rating:</span>
              <div className={styles.statValue}>
                {renderStars(Math.round(stats.averageRating))}
                <span className={styles.ratingNumber}>
                  {stats.averageRating.toFixed(1)} / 5.0
                </span>
              </div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Reviews:</span>
              <span className={styles.statValue}>{stats.totalReviews}</span>
            </div>
          </div>
        )}

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className="loading" />
              <span>Loading reviews...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No reviews yet</p>
            </div>
          ) : (
            <div className={styles.reviewsList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewUser}>
                      {review.userAvatar ? (
                        <img
                          src={getImageUrl(review.userAvatar) || '/images/default-avatar.png'}
                          alt={review.userName || "User"}
                          className={styles.userAvatar}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/default-avatar.png';
                          }}
                        />
                      ) : (
                        <div className={styles.userAvatarPlaceholder}>
                          {(review.userName || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className={styles.userInfo}>
                        <p className={styles.userName}>
                          {review.userName || "Anonymous"}
                          {review.isVerifiedPurchase && (
                            <span className={styles.verifiedBadge}>
                              ✓ Verified Purchase
                            </span>
                          )}
                        </p>
                        <p className={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className={styles.reviewActions}>
                      {renderStars(review.rating)}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className={`btn btn-sm btn-icon btn-danger ${styles.deleteButton}`}
                          title="Delete review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {review.title && (
                    <h4 className={styles.reviewTitle}>{review.title}</h4>
                  )}
                  {review.comment && (
                    <p className={styles.reviewComment}>{review.comment}</p>
                  )}
                  {review.images && review.images.length > 0 && (
                    <div className={styles.reviewImages}>
                      {review.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={getImageUrl(img) || '/images/default-product.png'}
                          alt={`Review image ${idx + 1}`}
                          className={styles.reviewImage}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/default-product.png';
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {/* Reply Section */}
                  {review.reply && (
                    <div className={styles.replySection}>
                      <div className={styles.replyHeader}>
                        <MessageSquare className={styles.replyIcon} />
                        <span className={styles.replyLabel}>
                          Store Reply
                          {review.replyByName && ` by ${review.replyByName}`}
                        </span>
                        {review.replyAt && (
                          <span className={styles.replyDate}>
                            {new Date(review.replyAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className={styles.replyText}>{review.reply}</div>
                    </div>
                  )}
                  {/* Reply Input */}
                  {isAdmin && !review.reply && (
                    <div className={styles.replyInputSection}>
                      {replyingTo === review.id ? (
                        <div className={styles.replyForm}>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className={styles.replyTextarea}
                            rows={3}
                          />
                          <div className={styles.replyActions}>
                            <button
                              onClick={() => handleReply(review.id)}
                              className={styles.replySubmitButton}
                              disabled={replying || !replyText.trim()}
                            >
                              <Send className="w-4 h-4" />
                              Send Reply
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                              className={styles.replyCancelButton}
                              disabled={replying}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(review.id)}
                          className={styles.replyButton}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Reply
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReviewsModal;

