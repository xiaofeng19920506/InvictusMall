import { User } from "@/models/User";
import styles from "./AccountInformation.module.scss";

interface AccountInformationProps {
  user: User | null;
}

export default function AccountInformation({ user }: AccountInformationProps) {
  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Account Information
      </h2>
      <div className={styles.grid}>
        <div className={styles.field}>
          <p className={styles.label}>Account Status</p>
          <p className={styles.value}>
            {user.isActive ? (
              <span className={styles.status + ' ' + styles.active}>✓ Active</span>
            ) : (
              <span className={styles.status + ' ' + styles.inactive}>✗ Inactive</span>
            )}
          </p>
        </div>
        <div className={styles.field}>
          <p className={styles.label}>Email Verification</p>
          <p className={styles.value}>
            {user.emailVerified ? (
              <span className={styles.status + ' ' + styles.verified}>✓ Verified</span>
            ) : (
              <span className={styles.status + ' ' + styles.notVerified}>⚠ Not Verified</span>
            )}
          </p>
        </div>
        <div className={styles.field}>
          <p className={styles.label}>Member Since</p>
          <p className={styles.value}>
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"}
          </p>
        </div>
        <div className={styles.field}>
          <p className={styles.label}>Last Login</p>
          <p className={styles.value}>
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString()
              : "Never"}
          </p>
        </div>
      </div>
    </div>
  );
}

