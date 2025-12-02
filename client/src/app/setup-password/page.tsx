import { Suspense } from 'react';
import SetupPasswordForm from './SetupPasswordForm';
import styles from './page.module.scss';

interface SetupPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetupPasswordPage({ searchParams }: SetupPasswordPageProps) {
  const params = await searchParams;
  const token = params.token;

  return (
    <Suspense
      fallback={
        <div className={styles.pageContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading...</p>
          </div>
        </div>
      }
    >
      <SetupPasswordForm token={token} />
    </Suspense>
  );
}
