"use client";

import styles from "../../app/stores/components/StoreGrid.module.scss";

export default function StoreGridSkeleton() {
  const skeletonItems = Array.from({ length: 8 }, (_, index) => (
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
  ));

  return <div className={styles.grid}>{skeletonItems}</div>;
}

