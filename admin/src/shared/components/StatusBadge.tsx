import React from "react";
import styles from "./StatusBadge.module.css";

export type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "default"
  | "pending"
  | "active"
  | "inactive"
  | "verified"
  | "unverified"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "pending_payment";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = "default",
  className = "",
  size = "md",
}) => {
  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
  
  return (
    <span
      className={`${styles.statusBadge} ${styles[variant]} ${sizeClass} ${className}`.trim()}
    >
      {label}
    </span>
  );
};

export default StatusBadge;

