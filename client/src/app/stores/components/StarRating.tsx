"use client";

<<<<<<< HEAD
interface StarRatingProps {
  rating: number;
  size?: string;
}

export default function StarRating({ rating, size = "text-lg" }: StarRatingProps) {
  // If no rating or rating is 0, show all empty stars
  if (!rating || rating === 0) {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`${size} text-gray-300`}>
=======
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
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            ☆
          </span>
        ))}
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="flex">
=======
    <div className={styles.container}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
      {[...Array(5)].map((_, i) => {
        const starValue = i + 1;
        const filled = rating >= starValue;
        const halfFilled = rating >= starValue - 0.5 && rating < starValue;
        
        return (
          <span
            key={i}
<<<<<<< HEAD
            className={`${size} ${
              filled || halfFilled ? "text-yellow-400" : "text-gray-300"
=======
            className={`${styles.star} ${styles[size]} ${
              filled || halfFilled ? styles.filled : styles.empty
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
            }`}
          >
            {filled ? "⭐" : halfFilled ? "⭐" : "☆"}
          </span>
        );
      })}
    </div>
  );
}

