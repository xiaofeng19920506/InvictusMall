import styles from "./LoadingSpinner.module.scss";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  size = "md", 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const containerClass = fullScreen 
    ? styles.fullScreenContainer 
    : styles.container;

  return (
    <div className={containerClass}>
      <div className={`${styles.spinner} ${styles[size]}`}></div>
    </div>
  );
}

