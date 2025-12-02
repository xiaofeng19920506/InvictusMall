import { Store } from '@/services/api';
import StoreCard from './StoreCard';
import styles from './StoreGrid.module.scss';

interface StoreGridProps {
  stores: Store[];
  loading?: boolean;
}

export default function StoreGrid({ stores, loading = false }: StoreGridProps) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={styles.skeletonCard}>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonContent}>
              <div className={`${styles.skeletonLine} ${styles['w-3-4']}`}></div>
              <div className={`${styles.skeletonLine} ${styles['w-1-2']}`}></div>
              <div className={`${styles.skeletonLine} ${styles['w-1-2']} ${styles.last}`}></div>
              <div className={styles.skeletonGrid}>
                <div className={styles.skeletonGridLine}></div>
                <div className={styles.skeletonGridLine}></div>
                <div className={styles.skeletonGridLine}></div>
                <div className={styles.skeletonGridLine}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏪</div>
        <h3 className={styles.emptyTitle}>No stores found</h3>
        <p className={styles.emptyMessage}>Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {stores.map((store) => (
        <StoreCard
          key={store.id}
          store={store}
        />
      ))}
    </div>
  );
}
