import styles from './VerifyEmailContent.module.scss';

interface VerifyEmailContentProps {
  countdown: number;
}

export default function VerifyEmailContent({ countdown }: VerifyEmailContentProps) {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        <div className={styles.icon}>📧</div>
        <h1 className={styles.title}>Verifying Email...</h1>
        <p className={styles.message}>
          Please wait while we verify your email address and redirect you to complete your registration.
        </p>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
        </div>
        <p className={styles.countdownText}>
          Redirecting in <span className={styles.countdownNumber}>{countdown}</span> {countdown === 1 ? 'second' : 'seconds'}...
        </p>
      </div>
    </div>
  );
}
