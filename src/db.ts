import type { Order } from './types';

type NewOrder = Omit<Order, 'tracking_code' | 'error_log'>;

export async function saveOrder(db: D1Database, order: NewOrder): Promise<void> {
  await db.prepare(`
    INSERT INTO orders (
      id, created_at, status, customer_email, customer_name, customer_phone,
      address_line1, address_line2, address_city, address_state, address_postal,
      amount_total, client_ref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    order.id, order.created_at, order.status,
    order.customer_email, order.customer_name, order.customer_phone,
    order.address_line1, order.address_line2, order.address_city,
    order.address_state, order.address_postal,
    order.amount_total, order.client_ref,
  ).run();
}

export async function updateTracking(db: D1Database, id: string, trackingCode: string): Promise<void> {
  await db.prepare(`UPDATE orders SET tracking_code = ?, status = 'complete' WHERE id = ?`)
    .bind(trackingCode, id)
    .run();
}

export async function listOrders(db: D1Database): Promise<Order[]> {
  const { results } = await db.prepare(
    `SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`,
  ).all<Order>();
  return results;
}
