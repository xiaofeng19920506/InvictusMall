import VerifyEmailHandler from './VerifyEmailHandler';

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;

  return <VerifyEmailHandler token={token} />;
}
