import { getImageUrl, getPlaceholderImage } from "@/utils/imageUtils";
import Image from "next/image";
import styles from "./AvatarDisplay.module.scss";

interface AvatarDisplayProps {
  avatar?: string;
  alt: string;
  size?: "sm" | "md" | "lg";
}

export default function AvatarDisplay({
  avatar,
  alt,
  size = "lg",
}: AvatarDisplayProps) {
  if (!avatar) {
    return null;
  }

  const avatarUrl = getImageUrl(avatar) || getPlaceholderImage();

  return (
    <div className={styles.avatarSection}>
      <div className={`${styles.avatar} ${styles[size]}`}>
        <Image
          src={avatarUrl}
          alt={alt}
          fill
          sizes={size === "sm" ? "64px" : size === "md" ? "96px" : "128px"}
          className={styles.avatarImage}
        />
      </div>
    </div>
  );
}
