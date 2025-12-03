import Link from "next/link";
import styles from "./ProfileToast.module.scss";

interface ProfileToastProps {
  status?: "success" | "error";
  message?: string;
  clearHref?: string;
}

export default function ProfileToast({
  status,
  message,
  clearHref,
}: ProfileToastProps) {
  if (!status || !message || message.trim().length === 0) {
    return null;
  }

  const trimmedMessage = message.trim();

  return (
    <div className={styles.container}>
      <div
        className={`${styles.toast} ${
          status === "success" ? styles.success : styles.error
        }`}
      >
        <div className={styles.content}>
          <span aria-hidden className={styles.icon}>
            {status === "success" ? "✓" : "⚠"}
          </span>
          <div className={styles.textContent}>
            <p className={styles.title}>
              {status === "success" ? "Success" : "Something went wrong"}
            </p>
            <p className={styles.message}>{trimmedMessage}</p>
          </div>
          {clearHref && (
            <Link
              href={clearHref}
              className={styles.closeButton}
              aria-label="Dismiss notification"
              scroll={false}
            >
              ×
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
