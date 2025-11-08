"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

  const tone =
    currentStatus === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : "bg-rose-50 text-rose-900 border-rose-200";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <div
        className={`w-80 border shadow-lg rounded-lg px-4 py-3 ${tone} transition-opacity`}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-1 text-lg">
            {currentStatus === "success" ? "✓" : "⚠"}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {currentStatus === "success" ? "Success" : "Something went wrong"}
            </p>
            <p className="text-sm mt-1 leading-snug">{currentMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="ml-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
