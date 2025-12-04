import OrderDetailContent from '../components/OrderDetailContent';
import { fetchOrderByIdServer, Order } from '@/lib/server-api';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  
  // Build cookie header string properly
  const cookieHeader = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
  
  let initialOrder: Order | null = null;

  try {
    const response = await fetchOrderByIdServer(id, cookieHeader || undefined);
    if (response.success && response.data) {
      initialOrder = response.data;
    } else {
      console.error('Order fetch failed:', response);
      notFound();
    }
  } catch (error: any) {
    console.error('Failed to fetch order on server:', error);
    // If it's an authentication error, redirect to login
    if (error?.message?.includes('Authentication')) {
      throw error; // Let Next.js handle redirect
    }
    notFound();
  }

  if (!initialOrder) {
    notFound();
  }

  return (
    <OrderDetailContent initialOrder={initialOrder} />
  );
}
