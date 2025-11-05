'use server';

interface SetupPasswordResult {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export async function setupPasswordAction(
  token: string | null | undefined,
  password: string
): Promise<SetupPasswordResult> {
  if (!token) {
    return {
      success: false,
      message: 'Invalid or missing verification token',
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: 'Password must be at least 6 characters long',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${baseUrl}/api/auth/setup-password`;

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
        message: data.message || 'Failed to setup password',
      };
    }

    return {
      success: true,
      message: data.message || 'Password setup successful! Your account is now active.',
      user: data.user,
    };
  } catch (error) {
    console.error('Password setup error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
    };
  }
}

