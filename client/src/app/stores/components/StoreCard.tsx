import { Store } from "@/services/api";
import { getImageUrl, getPlaceholderImage, handleImageError } from "@/utils/imageUtils";
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
          onError={handleImageError}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>
          {store.name}
        </h3>

        <p className={styles.description}>
          {store.description}
        </p>
      </div>
    </Link>
  );
}
