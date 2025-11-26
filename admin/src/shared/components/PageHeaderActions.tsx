import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import styles from "./PageHeaderActions.module.css";

interface PageHeaderActionsProps {
  primaryAction?: {
    icon?: ReactNode;
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
  };
  secondaryActions?: Array<{
    icon?: ReactNode;
    label: string;
    onClick: () => void;
    variant?: "default" | "secondary";
  }>;
  onRefresh?: () => void;
  showRefresh?: boolean;
  className?: string;
}

const PageHeaderActions: React.FC<PageHeaderActionsProps> = ({
  primaryAction,
  secondaryActions = [],
  onRefresh,
  showRefresh = true,
  className = "",
}) => {
  return (
    <div className={`${styles.headerActions} ${className}`}>
      {secondaryActions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={`${styles.secondaryButton} ${action.variant === "secondary" ? styles.secondaryVariant : ""}`}
          aria-label={action.label}
        >
          {action.icon}
          {action.label}
        </button>
      ))}

      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className={`${styles.primaryButton} ${styles[`variant${primaryAction.variant || "primary"}`]}`}
          aria-label={primaryAction.label}
        >
          {primaryAction.icon}
          {primaryAction.label}
        </button>
      )}

      {showRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className={styles.refreshButton}
          aria-label="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      )}
    </div>
  );
};

export default PageHeaderActions;

