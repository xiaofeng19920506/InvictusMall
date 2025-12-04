import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';
import styles from './page.module.scss';

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Invictus Mall
          </h1>
          <p className={styles.description}>
            Reset your password to continue shopping
          </p>
        </div>
        <Suspense fallback={
          <div className={styles.loadingCard}>
            <div className={styles.loadingContent}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Loading...</p>
            </div>
          </div>
        }>
          <ResetPasswordForm token={token} />
        </Suspense>
      </div>
    </div>
  );
}
