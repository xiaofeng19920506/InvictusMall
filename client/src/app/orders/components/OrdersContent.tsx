import ProtectedRoute from '@/components/common/ProtectedRoute';
import Header from '@/components/common/Header';
import { Order } from '@/services/order';
import OrdersClient from './OrdersClient';

interface OrdersContentProps {
  initialOrders: Order[];
  initialStatus?: string;
}

export default function OrdersContent({ initialOrders, initialStatus = 'all' }: OrdersContentProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-2">View and track your order history</p>
          </div>

          <OrdersClient initialOrders={initialOrders} initialStatus={initialStatus} />
        </main>
      </div>
    </ProtectedRoute>
  );
}

