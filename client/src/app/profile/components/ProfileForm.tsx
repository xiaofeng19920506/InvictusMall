import { updateProfileAction } from "../actions";
import styles from "./ProfileForm.module.scss";

interface ProfileFormProps {
  initialUser: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
  } | null;
}

export default function ProfileForm({ initialUser }: ProfileFormProps) {
  if (!initialUser) {
    return null;
  }

  return (
    <form action={updateProfileAction} className={styles.form}>
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label htmlFor="firstName" className={styles.formLabel}>
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            defaultValue={initialUser.firstName}
            required
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="lastName" className={styles.formLabel}>
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            defaultValue={initialUser.lastName}
            required
            className={styles.formInput}
          />
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor="email" className={styles.formLabel}>
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          defaultValue={initialUser.email}
          disabled
          className={styles.formInput}
        />
        <p className={styles.helpText}>Email cannot be changed.</p>
      </div>

      <div className={styles.formField}>
        <label htmlFor="phoneNumber" className={styles.formLabel}>
          Phone Number
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          defaultValue={initialUser.phoneNumber}
          placeholder="Enter your phone number"
          className={styles.formInput}
        />
      </div>

      <button type="submit" className={styles.submitButton}>
        Save Changes
      </button>
    </form>
  );
}

