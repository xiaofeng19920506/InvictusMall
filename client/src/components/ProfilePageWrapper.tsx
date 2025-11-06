'use client';

import { ReactNode } from 'react';
import ProtectedRoute from './ProtectedRoute';

interface ProfilePageWrapperProps {
  children: ReactNode;
}

export default function ProfilePageWrapper({ children }: ProfilePageWrapperProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

