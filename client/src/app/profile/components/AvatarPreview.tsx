"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/imageUtils";
import { uploadAvatarAction } from "../actions";
import { useRouter } from "next/navigation";
import styles from "./AvatarPreview.module.scss";

interface AvatarPreviewProps {
  currentAvatar?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
}

function buildInitials(
  firstName?: string,
  lastName?: string,
  email?: string
): string {
  const initials = (firstName?.charAt(0) ?? "") + (lastName?.charAt(0) ?? "");
  if (initials.trim()) {
    return initials.toUpperCase();
  }
  return email?.charAt(0).toUpperCase() ?? "U";
}

export default function AvatarPreview({
  currentAvatar,
  firstName,
  lastName,
  email,
}: AvatarPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const initials = buildInitials(firstName, lastName, email);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Create preview URL immediately for better UX
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsUploading(true);

    try {
      // Upload avatar to server immediately
      const formData = new FormData();
      formData.append("avatar", file, file.name);
      await uploadAvatarAction(formData);
      
      // Note: uploadAvatarAction will redirect on success, so we won't reach here
      // If we do reach here, it means no redirect happened (unlikely but handle it)
      router.refresh();
    } catch (error: any) {
      // Next.js redirects throw errors with digest starting with "NEXT_REDIRECT"
      // We should treat these as success, not errors
      if (error?.digest && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
        // This is a redirect from the server action, which means success
        // The redirect will handle showing the success message
        // We just need to clear the preview URL since the page will refresh
        setPreviewUrl(null);
        return;
      }
      
      // Actual error occurred
      console.error("Failed to upload avatar:", error);
      // Revert preview on error
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || (currentAvatar ? getAvatarUrl(currentAvatar) : null);

  return (
    <div className={styles.container}>
      <div className={styles.avatarWrapper}>
        <div className={styles.avatar}>
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={`${firstName ?? "User"} ${lastName ?? ""}`.trim()}
              fill
              sizes="128px"
              className={styles.avatarImage}
              onError={() => {
                setPreviewUrl(null);
              }}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <label htmlFor="avatar" className={styles.fileLabel}>
          <span className={styles.fileInputWrapper}>
            {isUploading ? "Uploading..." : "Choose Image"}
          </span>
          <input
            ref={fileInputRef}
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
        {previewUrl && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className={styles.removeButton}
          >
            Remove
          </button>
        )}
      </div>

      <p className={styles.helpText}>
        Supported formats: JPG, PNG. Maximum size 5MB.
      </p>
    </div>
  );
}

