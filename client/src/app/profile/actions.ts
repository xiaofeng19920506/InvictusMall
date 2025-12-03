'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type {
  CreateShippingAddressRequest,
  UpdateShippingAddressRequest,
  ShippingAddress,
} from '@/services/shippingAddress';
import type { AuthResponse } from '@/services/auth';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE_URL = rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
  ? rawApiUrl
  : `http://${rawApiUrl}`;

interface FetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

const PROFILE_PATH = '/profile';
const PROFILE_PASSWORD_TAB = 'password';
const PROFILE_PROFILE_TAB = 'profile';

async function buildCookieHeader(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  if (allCookies.length === 0) {
    return undefined;
  }

  const serialized = allCookies
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  return serialized.length > 0 ? serialized : undefined;
}

async function authFetch<T = unknown>(
  endpoint: string,
  init: RequestInit = {}
): Promise<FetchResult<T>> {
  const cookieHeader = await buildCookieHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (init.headers) {
    if (init.headers instanceof Headers) {
      for (const [key, value] of init.headers.entries()) {
        headers[key] = value;
      }
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, init.headers as Record<string, string>);
    }
  }

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    const payload = isJson ? await response.json() : undefined;
    const message =
      isJson && payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : response.statusText;

    if (!response.ok) {
      return { ok: false, status: response.status, error: message };
    }

    return { ok: true, status: response.status, data: payload as T };
  } catch (error) {
    console.error('authFetch error:', error);
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}

function redirectToTab(
  tab: 'profile' | 'password' | 'addresses',
  status: 'success' | 'error',
  message?: string
) {
  const params = new URLSearchParams({ tab, status });
  if (message) {
    params.set('message', message.slice(0, 200));
  }
  redirect(`${PROFILE_PATH}?${params.toString()}`);
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const currentPassword = formData.get('currentPassword')?.toString().trim() || '';
  const newPassword = formData.get('newPassword')?.toString().trim() || '';
  const confirmPassword = formData.get('confirmPassword')?.toString().trim() || '';

  if (!currentPassword) {
    redirectToTab(PROFILE_PASSWORD_TAB, 'error', 'Current password is required.');
  }

  if (!newPassword) {
    redirectToTab(PROFILE_PASSWORD_TAB, 'error', 'New password is required.');
  }

  if (newPassword.length < 6) {
    redirectToTab(PROFILE_PASSWORD_TAB, 'error', 'Password must be at least 6 characters long.');
  }

  if (!confirmPassword) {
    redirectToTab(PROFILE_PASSWORD_TAB, 'error', 'Please confirm your new password.');
  }

  if (confirmPassword !== newPassword) {
    redirectToTab(PROFILE_PASSWORD_TAB, 'error', 'Passwords do not match.');
  }

  const result = await authFetch<{ success: boolean; message?: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  if (!result.ok || !result.data?.success) {
    redirectToTab(
      PROFILE_PASSWORD_TAB,
      'error',
      result.data?.message || result.error || 'Failed to change password.'
    );
  }

  revalidatePath(PROFILE_PATH);
  const successMessage =
    (result.data && result.data.message) || 'Password changed successfully.';
  redirectToTab(PROFILE_PASSWORD_TAB, 'success', successMessage);
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const firstName = formData.get('firstName')?.toString().trim() ?? '';
  const lastName = formData.get('lastName')?.toString().trim() ?? '';
  const phoneNumber = formData.get('phoneNumber')?.toString().trim() ?? '';

  if (!firstName || !lastName) {
    redirectToTab(
      PROFILE_PROFILE_TAB,
      'error',
      'First name and last name are required.'
    );
  }

  const result = await authFetch<AuthResponse>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({
      firstName,
      lastName,
      phoneNumber: phoneNumber || undefined,
    }),
  });

  if (!result.ok || !result.data?.success) {
    redirectToTab(
      PROFILE_PROFILE_TAB,
      'error',
      result.data?.message || result.error || 'Failed to update profile.'
    );
  }

  revalidatePath(PROFILE_PATH);
  redirectToTab(
    PROFILE_PROFILE_TAB,
    'success',
    result.data?.message || 'Profile updated successfully.'
  );
}


export async function uploadAvatarAction(formData: FormData): Promise<void> {
  const file = formData.get('avatar');

  if (!(file instanceof File) || file.size === 0) {
    redirectToTab(
      PROFILE_PROFILE_TAB,
      'error',
      'Please select an image to upload.'
    );
  }

  const cookieHeader = await buildCookieHeader();
  const body = new FormData();
  if (file instanceof File) {
    body.append('avatar', file, file.name);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
      method: 'POST',
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      body,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    redirectToTab(
      PROFILE_PROFILE_TAB,
      'error',
      'Failed to upload avatar. Please try again.'
    );
  }

  let payload: AuthResponse | undefined;
  try {
    payload = (await response!.json()) as AuthResponse;
  } catch {
    // Ignore JSON parse errors; handled below
  }

  if (!response!.ok || !payload?.success) {
    const message =
      payload?.message ||
      `Failed to upload avatar (status ${response!.status}).`;
    redirectToTab(PROFILE_PROFILE_TAB, 'error', message);
  }

  revalidatePath(PROFILE_PATH);
  redirectToTab(
    PROFILE_PROFILE_TAB,
    'success',
    payload?.message || 'Avatar updated successfully.'
  );
}

type AddressActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

function normalizeAddressPayload(
  address: Omit<CreateShippingAddressRequest, 'isDefault'> & { isDefault?: boolean }
): CreateShippingAddressRequest {
  return {
    label: address.label?.trim() || undefined,
    fullName: address.fullName.trim(),
    phoneNumber: address.phoneNumber.trim(),
    streetAddress: address.streetAddress.trim(),
    aptNumber: address.aptNumber?.trim() || undefined,
    city: address.city.trim(),
    stateProvince: address.stateProvince.trim(),
    zipCode: address.zipCode.trim(),
    country: address.country.trim(),
    isDefault: address.isDefault,
  };
}

export async function createAddressAction(
  address: Omit<CreateShippingAddressRequest, 'isDefault'> & { isDefault?: boolean }
): Promise<AddressActionResult<ShippingAddress[]>> {
  const payload = normalizeAddressPayload(address);
  const result = await authFetch<{
    success: boolean;
    message?: string;
    data?: ShippingAddress[];
  }>('/api/shipping-addresses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!result.ok || !result.data?.success) {
    return {
      success: false,
      message: result.data?.message || result.error || 'Failed to save address.',
    };
  }

  revalidatePath(PROFILE_PATH);
  return {
    success: true,
    message: result.data.message || 'Address saved successfully.',
    data: result.data.data,
  };
}

export async function updateAddressAction(
  id: string,
  address: UpdateShippingAddressRequest
): Promise<AddressActionResult<ShippingAddress[]>> {
  const result = await authFetch<{
    success: boolean;
    message?: string;
    data?: ShippingAddress[];
  }>(
    `/api/shipping-addresses/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(address),
    }
  );

  if (!result.ok || !result.data?.success) {
    return {
      success: false,
      message: result.data?.message || result.error || 'Failed to update address.',
    };
  }

  revalidatePath(PROFILE_PATH);
  return {
    success: true,
    message: result.data.message || 'Address updated successfully.',
    data: result.data.data,
  };
}

export async function deleteAddressAction(
  id: string
): Promise<AddressActionResult<ShippingAddress[]>> {
  const result = await authFetch<{
    success: boolean;
    message?: string;
    data?: ShippingAddress[];
  }>(
    `/api/shipping-addresses/${id}`,
    {
      method: 'DELETE',
    }
  );

  if (!result.ok || !result.data?.success) {
    return {
      success: false,
      message: result.data?.message || result.error || 'Failed to delete address.',
    };
  }

  revalidatePath(PROFILE_PATH);
  return {
    success: true,
    message: result.data.message || 'Address deleted successfully.',
    data: result.data.data,
  };
}

export async function setDefaultAddressAction(
  id: string
): Promise<AddressActionResult<ShippingAddress[]>> {
  const result = await authFetch<{
    success: boolean;
    message?: string;
    data?: ShippingAddress[];
  }>(
    `/api/shipping-addresses/${id}/set-default`,
    {
      method: 'POST',
    }
  );

  if (!result.ok || !result.data?.success) {
    return {
      success: false,
      message: result.data?.message || result.error || 'Failed to set default address.',
    };
  }

  revalidatePath(PROFILE_PATH);
  return {
    success: true,
    message: result.data.message || 'Default address updated.',
    data: result.data.data,
  };
}

