// Server Component - Pure presentational component
import { Store } from '@/services/api';
import StoreCard from './StoreCard';
import EmptyState from '@/components/shared/EmptyState';
import styles from './StoreGrid.module.scss';

interface StoreGridProps {
  stores: Store[];
}

export default function StoreGrid({ stores }: StoreGridProps) {
  if (stores.length === 0) {
    return (
      <EmptyState
        icon="🏪"
        title="No stores found"
        message="Try adjusting your search or filters"
      />
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
