import type { ReactNode } from "react";
import { Package } from "lucide-react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  action,
}) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.iconWrapper}>
        {icon || <Package size={48} />}
      </div>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};

export default EmptyState;

