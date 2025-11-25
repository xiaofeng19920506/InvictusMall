'use server';

import { cookies } from 'next/headers';
import type { CheckoutPayload, CheckoutSessionResult } from './types';

interface FetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE_URL =
  rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
    ? rawApiUrl
    : `http://${rawApiUrl}`;

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
  if (!cookieHeader) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required.',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : (init.headers as Record<string, string>) || {}),
    Cookie: cookieHeader,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : undefined;

    if (!response.ok) {
      const message =
        (payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          payload.message) ||
        response.statusText;
      return {
        ok: false,
        status: response.status,
        data: payload as T,
        error: typeof message === 'string' ? message : 'Request failed.',
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload as T,
    };
  } catch (error) {
    console.error('authFetch error:', error);
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}

async function guestFetch<T = unknown>(
  endpoint: string,
  init: RequestInit = {}
): Promise<FetchResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : (init.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : undefined;

    if (!response.ok) {
      const message =
        (payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          payload.message) ||
        response.statusText;
      return {
        ok: false,
        status: response.status,
        data: payload as T,
        error: typeof message === 'string' ? message : 'Request failed.',
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload as T,
    };
  } catch (error) {
    console.error('guestFetch error:', error);
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}

export async function createStripeCheckoutSessionAction(
  payload: CheckoutPayload
): Promise<CheckoutSessionResult> {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return {
      success: false,
      message: 'Your cart is empty.',
    };
  }

  const hasValidItems = payload.items.some(
    (item) => typeof item.quantity === 'number' && item.quantity > 0 && item.price > 0
  );

  if (!hasValidItems) {
    return {
      success: false,
      message: 'All items in your cart have invalid quantities.',
    };
  }

  const result = await authFetch<CheckoutSessionResult>(
    '/api/payments/checkout-session',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );

  if (!result.ok || !result.data) {
    return {
      success: false,
      message:
        (result.data && 'message' in result.data ? result.data.message : undefined) ||
        result.error ||
        'Failed to start checkout. Please try again.',
    };
  }

  return result.data;
}


