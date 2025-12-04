<<<<<<< HEAD
import { Store } from "@/services/api";
import { getImageUrl } from "@/utils/imageUtils";
import Link from "next/link";
=======
// Server Component - No client-side interactivity needed
import { Store } from "@/services/api";
import { getImageUrl, getPlaceholderImage } from "@/utils/imageUtils";
import Link from "next/link";
import styles from "./StoreCard.module.scss";
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009

interface StoreCardProps {
  store: Store;
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link
      href={`/stores/${store.id}`}
<<<<<<< HEAD
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-orange-500 relative overflow-hidden group block"
    >
      <div className="relative h-48 overflow-hidden">
=======
      className={styles.storeCard}
    >
      <div className={styles.imageContainer}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
        <img
          src={getImageUrl(store.imageUrl) || getPlaceholderImage()}
          alt={store.name}
          className={styles.storeImage}
          loading="lazy"
        />
      </div>

<<<<<<< HEAD
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {store.name}
        </h3>

        <p className="text-gray-600 text-sm line-clamp-2">
=======
      <div className={styles.content}>
        <h3 className={styles.title}>
          {store.name}
        </h3>

        <p className={styles.description}>
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
          {store.description}
        </p>
      </div>
    </Link>
  );
}
