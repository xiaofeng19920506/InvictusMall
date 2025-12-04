import React, { useEffect, useState } from "react";
import { X, Star, Trash2, Filter, RefreshCw, MessageSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { storeApi } from "../../services/api/storeApi";
import type { StoreReview, StoreReviewStats } from "../../services/api/storeApi";
import { useNotification } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmModal from "../../shared/components/ConfirmModal";
import Pagination from "../../shared/components/Pagination";
import styles from "./StoreReviewsModal.module.css";

interface StoreReviewsModalProps {
  storeId: string;
  storeName: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewDeleted?: () => void;
  isStoreOwner?: boolean; // Optional: if user is store owner
}

const StoreReviewsModal: React.FC<StoreReviewsModalProps> = ({
  storeId,
  storeName,
  isOpen,
  onClose,
  onReviewDeleted,
  isStoreOwner = false,
}) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useNotification();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [stats, setStats] = useState<StoreReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalReviews, setTotalReviews] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'helpful' | 'rating'>('newest');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    reviewId: string | null;
    reviewTitle: string;
  }>({
    isOpen: false,
    reviewId: null,
    reviewTitle: '',
  });

  useEffect(() => {
    if (isOpen && storeId) {
      fetchReviews();
      fetchStats();
    }
  }, [isOpen, storeId, currentPage, itemsPerPage, selectedRating, sortBy]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await storeApi.getStoreReviews(storeId, {
        limit: itemsPerPage,
        offset,
        rating: selectedRating,
        sortBy,
      });

      if (response.success) {
        setReviews(response.data);
        setTotalReviews(response.count || 0);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      showError(t("stores.reviews.fetchError") || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await storeApi.getStoreReviewStats(storeId);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching review stats:", error);
    }
  };

  const handleDeleteReview = async (reviewId: string, reviewTitle: string) => {
    setConfirmModal({
      isOpen: true,
      reviewId,
      reviewTitle: reviewTitle || t("stores.reviews.review"),
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.reviewId) return;

    try {
      await storeApi.deleteStoreReview(confirmModal.reviewId);
      showSuccess(t("stores.reviews.deleteSuccess") || "Review deleted successfully");
      setConfirmModal({ isOpen: false, reviewId: null, reviewTitle: '' });
      fetchReviews();
      fetchStats();
      if (onReviewDeleted) {
        onReviewDeleted();
      }
    } catch (error: any) {
      console.error("Error deleting review:", error);
      const errorMessage = error.response?.data?.message;
      if (errorMessage?.includes("Only administrators")) {
        showError(t("stores.reviews.deleteForbidden"));
      } else {
        showError(t("stores.reviews.deleteError") || "Failed to delete review");
      }
      setConfirmModal({ isOpen: false, reviewId: null, reviewTitle: '' });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalReviews / itemsPerPage);

  const renderStars = (rating: number) => {
    return (
      <div className={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {t("stores.reviews.title", { storeName }) || `Reviews for ${storeName}`}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={styles.content}>
          {/* Stats Section */}
          {stats && (
            <div className={styles.statsSection}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  {stats.averageRating.toFixed(1)}
                </div>
                <div className={styles.statLabel}>
                  {renderStars(Math.round(stats.averageRating))}
                </div>
                <div className={styles.statSubtext}>
                  {stats.totalReviews} {t("stores.reviews.totalReviews") || "reviews"}
                </div>
              </div>
              <div className={styles.ratingDistribution}>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className={styles.ratingBar}>
                    <span className={styles.ratingLabel}>{rating} {t("stores.reviews.star") || "star"}</span>
                    <div className={styles.barContainer}>
                      <div
                        className={styles.bar}
                        style={{
                          width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className={styles.ratingCount}>
                      {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <Filter className={styles.filterIcon} />
              <select
                value={selectedRating || ""}
                onChange={(e) => {
                  setSelectedRating(e.target.value ? parseInt(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="">{t("stores.reviews.allRatings") || "All Ratings"}</option>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} {t("stores.reviews.stars") || "Stars"}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="newest">{t("stores.reviews.sortNewest") || "Newest First"}</option>
                <option value="oldest">{t("stores.reviews.sortOldest") || "Oldest First"}</option>
                <option value="rating">{t("stores.reviews.sortRating") || "Highest Rating"}</option>
                <option value="helpful">{t("stores.reviews.sortHelpful") || "Most Helpful"}</option>
              </select>
            </div>
            <button
              onClick={fetchReviews}
              className={styles.refreshButton}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Reviews List */}
          {loading ? (
            <div className={styles.loading}>
              <div className="loading" />
              <span>{t("stores.reviews.loading") || "Loading reviews..."}</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className={styles.emptyState}>
              {t("stores.reviews.empty") || "No reviews found"}
            </div>
          ) : (
            <>
              <div className={styles.reviewsList}>
                {reviews.map((review) => (
                  <div key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewUser}>
                        {review.userAvatar ? (
                          <img
                            src={review.userAvatar}
                            alt={review.userName || "User"}
                            className={styles.userAvatar}
                          />
                        ) : (
                          <div className={styles.userAvatarPlaceholder}>
                            {(review.userName || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className={styles.userName}>
                            {review.userName || t("stores.reviews.anonymous") || "Anonymous"}
                          </div>
                          <div className={styles.reviewMeta}>
                            {new Date(review.createdAt).toLocaleDateString()}
                            {review.isVerifiedPurchase && (
                              <span className={styles.verifiedBadge}>
                                {t("stores.reviews.verifiedPurchase") || "Verified Purchase"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={styles.reviewActions}>
                        <div className={styles.ratingDisplay}>
                          {renderStars(review.rating)}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteReview(review.id, review.title || "")}
                            className={styles.deleteButton}
                            title={t("stores.reviews.delete") || "Delete Review"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {review.title && (
                      <div className={styles.reviewTitle}>{review.title}</div>
                    )}
                    {review.comment && (
                      <div className={styles.reviewComment}>{review.comment}</div>
                    )}
                    {review.helpfulCount > 0 && (
                      <div className={styles.helpfulCount}>
                        {review.helpfulCount} {t("stores.reviews.helpful") || "people found this helpful"}
                      </div>
                    )}
                    {/* Reply Section */}
                    {review.reply && (
                      <div className={styles.replySection}>
                        <div className={styles.replyHeader}>
                          <MessageSquare className={styles.replyIcon} />
                          <span className={styles.replyLabel}>
                            {t("stores.reviews.reply") || "Store Reply"}
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
                    {canReply && !review.reply && (
                      <div className={styles.replyInputSection}>
                        {replyingTo === review.id ? (
                          <div className={styles.replyForm}>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={t("stores.reviews.replyPlaceholder") || "Write a reply..."}
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
                                {t("stores.reviews.sendReply") || "Send Reply"}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                }}
                                className={styles.replyCancelButton}
                                disabled={replying}
                              >
                                {t("common.cancel") || "Cancel"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingTo(review.id)}
                            className={styles.replyButton}
                          >
                            <MessageSquare className="w-4 h-4" />
                            {t("stores.reviews.replyToReview") || "Reply"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalReviews}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={t("stores.reviews.confirmDelete") || "Delete Review"}
        message={t("stores.reviews.confirmDeleteMessage", { title: confirmModal.reviewTitle }) || `Are you sure you want to delete this review?`}
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, reviewId: null, reviewTitle: '' })}
        confirmText={t("common.confirm") || "Confirm"}
        cancelText={t("common.cancel") || "Cancel"}
      />
    </>
  );
};

export default StoreReviewsModal;

