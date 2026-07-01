export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_PASSWORD: string;
}

export interface Order {
  id: string;
  created_at: string;
  status: string;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal: string | null;
  amount_total: number;
  client_ref: string | null;
  tracking_code: string | null;
  error_log: string | null;
}
