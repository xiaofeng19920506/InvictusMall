"use client";

import { useState } from "react";
import { apiService } from "@/services/api";
import { getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
import styles from "./ReviewModal.module.scss";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage?: string;
  orderId: string;
  onSuccess?: () => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  productImage,
  orderId,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiService.createReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        orderId,
      });

      if (result.success) {
        onSuccess?.();
        onClose();
        // Reset form
        setRating(0);
        setTitle("");
        setComment("");
        setError(null);
      } else {
        // Check if it's an update (200) vs create (201)
        const isUpdate = result.message?.includes("updated") || result.message?.includes("already");
        if (isUpdate && result.success) {
          // Review was updated successfully
          onSuccess?.();
          onClose();
          setRating(0);
          setTitle("");
          setComment("");
          setError(null);
        } else {
          setError(result.message || "Failed to submit review");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting your review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setError(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Write a Review</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.productInfo}>
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              className={styles.productImage}
              onError={handleImageError}
            />
          ) : (
            <div className={styles.productImagePlaceholder}>
              <span>No Image</span>
            </div>
          )}
          <div className={styles.productDetails}>
            <h3 className={styles.productName}>{productName}</h3>
            <p className={styles.orderInfo}>Order #{orderId}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.ratingSection}>
            <label className={styles.label}>
              Rating <span className={styles.required}>*</span>
            </label>
            <div className={styles.starRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.star} ${
                    star <= (hoveredRating || rating) ? styles.filled : ""
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={isSubmitting}
                  aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                >
                  ⭐
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className={styles.ratingText}>
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Review Title (Optional)
            </label>
            <input
              id="title"
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your review a title"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="comment" className={styles.label}>
              Your Review (Optional)
            </label>
            <textarea
              id="comment"
              className={styles.textarea}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={6}
              maxLength={1000}
              disabled={isSubmitting}
            />
            <p className={styles.charCount}>
              {comment.length}/1000 characters
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

