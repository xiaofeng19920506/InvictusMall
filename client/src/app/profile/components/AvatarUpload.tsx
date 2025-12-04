import Image from "next/image";
import { getAvatarUrl } from "@/utils/imageUtils";
import { uploadAvatarAction } from "../actions";
import styles from "./AvatarUpload.module.scss";

interface AvatarUploadProps {
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

export default function AvatarUpload({
  currentAvatar,
  firstName,
  lastName,
  email,
}: AvatarUploadProps) {
  const avatarUrl = getAvatarUrl(currentAvatar);
  const initials = buildInitials(firstName, lastName, email);

  return (
    <div className={styles.container}>
      <div className={styles.avatarWrapper}>
        <div className={styles.avatar}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${firstName ?? "User"} ${lastName ?? ""}`.trim()}
              fill
              sizes="128px"
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {initials}
            </div>
          )}
        </div>
      </div>

      <form
        action={uploadAvatarAction}
        className={styles.form}
      >
        <label
          htmlFor="avatar"
          className={styles.fileLabel}
        >
          <span className={styles.fileInputWrapper}>
            Choose Image
          </span>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            required
            className={styles.fileInput}
          />
        </label>
        <button
          type="submit"
          className={styles.uploadButton}
        >
          Upload Avatar
        </button>
      </form>

      <p className={styles.helpText}>
        Supported formats: JPG, PNG. Maximum size 5MB.
      </p>
    </div>
  );
}
