'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type {
  CreateShippingAddressRequest,
  UpdateShippingAddressRequest,
  ShippingAddress,
} from '@/services/shippingAddress';

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

function redirectWithStatus(status: 'success' | 'error', message?: string) {
  const params = new URLSearchParams({ tab: PROFILE_PASSWORD_TAB, status });
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
    redirectWithStatus('error', 'Current password is required.');
  }

  if (!newPassword) {
    redirectWithStatus('error', 'New password is required.');
  }

  if (newPassword.length < 6) {
    redirectWithStatus('error', 'Password must be at least 6 characters long.');
  }

  if (!confirmPassword) {
    redirectWithStatus('error', 'Please confirm your new password.');
  }

  if (confirmPassword !== newPassword) {
    redirectWithStatus('error', 'Passwords do not match.');
  }

  const result = await authFetch<{ success: boolean; message?: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  if (!result.ok || !result.data?.success) {
    redirectWithStatus('error', result.data?.message || result.error || 'Failed to change password.');
  }

  revalidatePath(PROFILE_PATH);
  const successMessage =
    (result.data && result.data.message) || 'Password changed successfully.';
  redirectWithStatus('success', successMessage);
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

