"use client";

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
            ☆
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => {
        const starValue = i + 1;
        const filled = rating >= starValue;
        const halfFilled = rating >= starValue - 0.5 && rating < starValue;
        
        return (
          <span
            key={i}
            className={`${size} ${
              filled || halfFilled ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            {filled ? "⭐" : halfFilled ? "⭐" : "☆"}
          </span>
        );
      })}
    </div>
  );
}

