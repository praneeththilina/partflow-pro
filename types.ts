export type SyncStatus = 'synced' | 'pending' | 'conflict';
export type OrderStatus = 'draft' | 'confirmed' | 'invoiced';
export type EntityStatus = 'active' | 'inactive';

export interface BaseEntity {
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'rep';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Customer extends BaseEntity {
  customer_id: string;
  shop_name: string;
  address: string;
  phone: string;
  city_ref: string;
  discount_rate: number; // 0.0 to 1.0
  status: EntityStatus;
}

export interface Item extends BaseEntity {
  item_id: string;
  item_display_name: string; // "Brake Pad (Toyota Corolla)"
  item_name: string; // Internal/Generic name
  item_number: string; // SKU
  vehicle_model: string;
  source_brand: string; // e.g. "China", "Japan", "Denso"
  category: string; // e.g. "Engine", "Brakes", "Suspension"
  unit_value: number;
  current_stock_qty: number;
  low_stock_threshold: number;
  status: EntityStatus; // 'active' or 'discontinued'
}

export interface OrderLine {
  line_id: string;
  order_id: string;
  item_id: string;
  item_name: string; // Snapshot
  quantity: number;
  unit_value: number; // Snapshot
  line_total: number;
}

export interface Order extends BaseEntity {
  order_id: string;
  customer_id: string;
  rep_id?: string; // Track which rep made the sale
  order_date: string;
  discount_rate: number;
  gross_total: number;
  discount_value: number;
  net_total: number;
  order_status: OrderStatus;
  lines: OrderLine[];
}

export interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  rep_name: string;
  invoice_prefix: string;
  footer_note: string;
  google_sheet_id?: string;
}

export interface SyncStats {
  pendingCustomers: number;
  pendingItems: number;
  pendingOrders: number;
  last_sync?: string;
}
