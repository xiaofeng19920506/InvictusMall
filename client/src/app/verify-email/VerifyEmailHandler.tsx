'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VerifyEmailContent from './VerifyEmailContent';

interface VerifyEmailHandlerProps {
  token?: string | null;
}

export default function VerifyEmailHandler({ token }: VerifyEmailHandlerProps) {
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

  useEffect(() => {
    let currentCountdown = 3;

    // Countdown interval
    const countdownInterval = setInterval(() => {
      currentCountdown = Math.max(0, currentCountdown - 1);
      setCountdown(currentCountdown);

      if (currentCountdown === 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // Redirect timer
    const redirectTimer = setTimeout(() => {
      if (token) {
        // Redirect to password setup page with the token
        router.push(`/setup-password?token=${token}`);
      } else {
        // No token, redirect to home
        router.push('/');
      }
    }, 3000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [token, router]);

  return <VerifyEmailContent countdown={countdown} />;
}

