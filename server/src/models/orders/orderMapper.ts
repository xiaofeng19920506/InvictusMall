import { Order } from './types';

export function mapRowToOrder(row: any): Order {
  const items = row.items && Array.isArray(row.items) && row.items.length > 0 && row.items[0].id
    ? row.items
    : [];

  return {
    id: row.id,
    userId: row.user_id,
    storeId: row.store_id,
    storeName: row.store_name,
    items: items.map((item: any) => ({
      id: item.id,
      orderId: row.id,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage || undefined,
      quantity: item.quantity,
      price: parseFloat(item.price),
      subtotal: parseFloat(item.subtotal),
      reservationDate: item.reservationDate || undefined,
      reservationTime: item.reservationTime || undefined,
      reservationNotes: item.reservationNotes || undefined,
      isReservation: item.isReservation || false
    })),
    totalAmount: parseFloat(row.total_amount),
    totalRefunded: row.total_refunded ? parseFloat(String(row.total_refunded)) : 0,
    status: row.status,
    shippingAddress: {
      streetAddress: row.shipping_street_address,
      aptNumber: row.shipping_apt_number || undefined,
      city: row.shipping_city,
      stateProvince: row.shipping_state_province,
      zipCode: row.shipping_zip_code,
      country: row.shipping_country
    },
    paymentMethod: row.payment_method,
    orderDate: row.order_date,
    shippedDate: row.shipped_date || undefined,
    deliveredDate: row.delivered_date || undefined,
    trackingNumber: row.tracking_number || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stripeSessionId: row.stripe_session_id || null,
    paymentIntentId: row.payment_intent_id || null,
    guestEmail: row.guest_email || null,
    guestFullName: row.guest_full_name || null,
    guestPhoneNumber: row.guest_phone_number || null
  };
}

