import { changePasswordAction } from "../actions";
import styles from "./ChangePasswordForm.module.scss";

interface ChangePasswordFormProps {
  status?: "success" | "error";
  message?: string;
}

export default function ChangePasswordForm({
  status,
  message,
}: ChangePasswordFormProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Change Password</h2>

      <p className={styles.description}>
        Enter your current password and choose a new one that's at least 6
        characters long.
      </p>

      <form action={changePasswordAction} className={styles.form}>
        <div className={styles.formField}>
          <label
            htmlFor="currentPassword"
            className={styles.formLabel}
          >
            Current Password
          </label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            required
            className={styles.formInput}
            placeholder="Enter your current password"
          />
        </div>

        <div className={styles.formField}>
          <label
            htmlFor="newPassword"
            className={styles.formLabel}
          >
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            required
            minLength={6}
            className={styles.formInput}
            placeholder="Enter your new password (min 6 characters)"
          />
        </div>

        <div className={styles.formField}>
          <label
            htmlFor="confirmPassword"
            className={styles.formLabel}
          >
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            required
            minLength={6}
            className={styles.formInput}
            placeholder="Confirm your new password"
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
        >
          Change Password
        </button>
      </form>
    </div>
  );
}
