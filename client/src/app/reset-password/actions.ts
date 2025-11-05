'use server';

interface ResetPasswordResult {
  success: boolean;
  message?: string;
}

export async function resetPasswordAction(
  token: string | null | undefined,
  password: string
): Promise<ResetPasswordResult> {
  if (!token) {
    return {
      success: false,
      message: 'Invalid or missing reset token',
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: 'Password must be at least 6 characters long',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}/api/auth/reset-password`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to reset password',
      };
    }

    return {
      success: true,
      message: data.message || 'Password reset successful',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
    };
  }
}

