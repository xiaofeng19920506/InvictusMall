import EditProfileClient from "./EditProfileClient";
import ProfileForm from "./ProfileForm";
import styles from "./EditProfile.module.scss";

interface EditProfileProps {
  initialUser: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    avatar?: string;
  } | null;
}

export default function EditProfile({ initialUser }: EditProfileProps) {
  if (!initialUser) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Edit Profile</h2>
        <p className={styles.errorMessage}>
          We couldn&apos;t load your profile details. Please reload the page and
          try again.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title} style={{ marginBottom: "1.5rem" }}>
        Edit Profile
      </h2>

      {/* Avatar Upload - Client Component */}
      <EditProfileClient
        currentAvatar={initialUser.avatar}
        firstName={initialUser.firstName}
        lastName={initialUser.lastName}
        email={initialUser.email}
      />

      {/* Profile Form - Server Component */}
      <ProfileForm initialUser={initialUser} />
    </div>
  );
}
