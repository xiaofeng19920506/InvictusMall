"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ProfileToast.module.scss";

interface ProfileToastProps {
  status?: "success" | "error";
  message?: string;
  clearHref?: string;
  durationMs?: number;
}

export default function ProfileToast({
  status,
  message,
  clearHref,
  durationMs = 4000,
}: ProfileToastProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string | undefined>();
  const [currentStatus, setCurrentStatus] = useState<
    "success" | "error" | undefined
  >();

  const isValidMessage = useMemo(
    () => Boolean(status && message && message.trim().length > 0),
    [status, message]
  );

  useEffect(() => {
    if (!isValidMessage) {
      return;
    }

    setCurrentMessage(message?.trim());
    setCurrentStatus(status);
    setIsVisible(true);
    setHasShown(true);

    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, durationMs);

    return () => clearTimeout(timeout);
  }, [durationMs, isValidMessage, message, status]);

  useEffect(() => {
    if (!hasShown || isVisible || !clearHref) {
      return;
    }
    router.replace(clearHref, { scroll: false });
    setHasShown(false);
  }, [clearHref, hasShown, isVisible, router]);

  if (!isVisible || !currentMessage) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div
        className={`${styles.toast} ${
          currentStatus === "success" ? styles.success : styles.error
        }`}
      >
        <div className={styles.content}>
          <span aria-hidden className={styles.icon}>
            {currentStatus === "success" ? "✓" : "⚠"}
          </span>
          <div className={styles.textContent}>
            <p className={styles.title}>
              {currentStatus === "success" ? "Success" : "Something went wrong"}
            </p>
            <p className={styles.message}>{currentMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className={styles.closeButton}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
