'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';

interface ProfilePageWrapperProps {
  children: ReactNode;
}

export default function ProfilePageWrapper({ children }: ProfilePageWrapperProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

