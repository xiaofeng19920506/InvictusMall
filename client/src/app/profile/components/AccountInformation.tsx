import { User } from "@/models/User";
import AvatarDisplay from "./AvatarDisplay";
import styles from "./AccountInformation.module.scss";

interface AccountInformationProps {
  user: User | null;
}

export default function AccountInformation({ user }: AccountInformationProps) {
  if (!user) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      customer: "Customer",
      admin: "Administrator",
      store_owner: "Store Owner",
    };
    return roleMap[role] || role;
  };

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Account Information</h2>

      {/* Avatar Section */}
      <AvatarDisplay
        avatar={user.avatar}
        alt={fullName || user.email}
        size="lg"
      />

      {/* Personal Information Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Personal Information</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <p className={styles.label}>Full Name</p>
            <p className={styles.value}>{fullName || "Not set"}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>First Name</p>
            <p className={styles.value}>{user.firstName || "Not set"}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Last Name</p>
            <p className={styles.value}>{user.lastName || "Not set"}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Email Address</p>
            <p className={styles.value}>{user.email}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Phone Number</p>
            <p className={styles.value}>{user.phoneNumber || "Not set"}</p>
          </div>
        </div>
      </div>

      {/* Account Details Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Account Details</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <p className={styles.label}>User ID</p>
            <p className={styles.value}>{user.id}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Role</p>
            <p className={styles.value}>
              <span className={styles.role}>{formatRole(user.role)}</span>
            </p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Account Status</p>
            <p className={styles.value}>
              {user.isActive ? (
                <span className={`${styles.status} ${styles.active}`}>
                  ✓ Active
                </span>
              ) : (
                <span className={`${styles.status} ${styles.inactive}`}>
                  ✗ Inactive
                </span>
              )}
            </p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Email Verification</p>
            <p className={styles.value}>
              {user.emailVerified ? (
                <span className={`${styles.status} ${styles.verified}`}>
                  ✓ Verified
                </span>
              ) : (
                <span className={`${styles.status} ${styles.notVerified}`}>
                  ⚠ Not Verified
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Account Activity Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Account Activity</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <p className={styles.label}>Member Since</p>
            <p className={styles.value}>{formatDate(user.createdAt)}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Last Updated</p>
            <p className={styles.value}>{formatDate(user.updatedAt)}</p>
          </div>
          <div className={styles.field}>
            <p className={styles.label}>Last Login</p>
            <p className={styles.value}>{formatDate(user.lastLoginAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
