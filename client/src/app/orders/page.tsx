import OrdersPageClient from './components/OrdersContent';
import { fetchOrdersServer, Order } from '@/lib/server-api';
import { cookies } from 'next/headers';

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  
  // Build cookie header string properly
  const cookieHeader = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
  
  let initialOrders: Order[] = [];
  const status = params.status || 'all';

  try {
    const response = await fetchOrdersServer(cookieHeader || undefined, {
      status: status !== 'all' ? status : undefined,
      limit: 50,
    });
    if (response.success) {
      initialOrders = response.data || [];
    }
  } catch (error) {
    // Log the full error for debugging
    console.error('Failed to fetch orders on server:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      cookieHeader: cookieHeader ? 'Present' : 'Missing',
    });
    // Continue with empty orders array - the client component will handle the error state
    initialOrders = [];
  }

  return (
    <OrdersPageClient 
      initialOrders={initialOrders}
      initialStatus={status}
    />
  );
}
