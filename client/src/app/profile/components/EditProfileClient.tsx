"use client";

import AvatarPreview from "./AvatarPreview";
import styles from "./EditProfile.module.scss";

interface EditProfileClientProps {
  currentAvatar?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default function EditProfileClient({
  currentAvatar,
  firstName,
  lastName,
  email,
}: EditProfileClientProps) {
  return (
    <div className={styles.avatarSection}>
      <AvatarPreview
        currentAvatar={currentAvatar}
        firstName={firstName}
        lastName={lastName}
        email={email}
      />
    </div>
  );
}
