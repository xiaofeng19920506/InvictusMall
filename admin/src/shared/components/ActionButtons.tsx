import type { LucideIcon } from "lucide-react";
import styles from "./ActionButtons.module.css";

export interface ActionButton {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success" | "warning" | "info";
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  customClassName?: string;
}

interface ActionButtonsProps {
  actions: ActionButton[];
  className?: string;
  size?: "sm" | "md" | "lg";
  layout?: "inline" | "flex";
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  actions,
  className = "",
  size = "md",
  layout = "inline",
}) => {
  const visibleActions = actions.filter((action) => !action.hidden);

  if (visibleActions.length === 0) {
    return null;
  }

  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
  const layoutClass = styles[`layout${layout.charAt(0).toUpperCase() + layout.slice(1)}`];

  return (
    <div className={`${styles.actions} ${layoutClass} ${className}`}>
      {visibleActions.map((action, index) => {
        const Icon = action.icon;
        const variantClass = action.variant
          ? styles[`variant${action.variant.charAt(0).toUpperCase() + action.variant.slice(1)}`]
          : "";
        const actionSizeClass = action.size
          ? styles[`size${action.size.charAt(0).toUpperCase() + action.size.slice(1)}`]
          : sizeClass;

        return (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={`${styles.actionButton} ${variantClass} ${actionSizeClass} ${action.customClassName || ""}`.trim()}
            aria-label={action.label}
            title={action.label}
          >
            {action.loading ? (
              <div className={styles.spinner}></div>
            ) : (
              <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ActionButtons;

