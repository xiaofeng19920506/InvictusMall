// Server Component - No client-side interactivity needed
import { Store } from "@/services/api";
import { getImageUrl, getPlaceholderImage } from "@/utils/imageUtils";
import Link from "next/link";
import styles from "./StoreCard.module.scss";

interface StoreCardProps {
  store: Store;
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link
      href={`/stores/${store.id}`}
      className={styles.storeCard}
    >
      <div className={styles.imageContainer}>
        <img
          src={getImageUrl(store.imageUrl) || getPlaceholderImage()}
          alt={store.name}
          className={styles.storeImage}
          loading="lazy"
        />
      </div>

      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>
            {store.name}
          </h3>
          <span className={`${styles.verifiedBadge} ${
            store.isVerified ? styles.verified : styles.unverified
          }`}>
            {store.isVerified ? '✓ Verified' : 'Unverified'}
          </span>
        </div>

        <div className={styles.categoryRow}>
          {store.category.map((cat, index) => (
            <span key={index} className={styles.category}>
              {cat}
            </span>
          ))}
        </div>

        <p className={styles.description}>
          {store.description}
        </p>
      </div>
    </Link>
  );
}
