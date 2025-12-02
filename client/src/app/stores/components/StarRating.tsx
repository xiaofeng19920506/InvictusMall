"use client";

import styles from "./StarRating.module.scss";

interface StarRatingProps {
  rating: number;
  size?: "small" | "base" | "large" | "xl";
}

export default function StarRating({ rating, size = "large" }: StarRatingProps) {
  // If no rating or rating is 0, show all empty stars
  if (!rating || rating === 0) {
    return (
      <div className={styles.container}>
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`${styles.star} ${styles.empty} ${styles[size]}`}>
            ☆
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {[...Array(5)].map((_, i) => {
        const starValue = i + 1;
        const filled = rating >= starValue;
        const halfFilled = rating >= starValue - 0.5 && rating < starValue;
        
        return (
          <span
            key={i}
            className={`${styles.star} ${styles[size]} ${
              filled || halfFilled ? styles.filled : styles.empty
            }`}
          >
            {filled ? "⭐" : halfFilled ? "⭐" : "☆"}
          </span>
        );
      })}
    </div>
  );
}

