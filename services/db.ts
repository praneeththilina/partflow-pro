import { Customer, Item, Order, OrderLine, CompanySettings, SyncStats, User } from '../types';
import { sheetsService } from './sheets';
import { jsonToCsv, downloadCsv } from '../utils/csv';
import SEED_DATA from '../src/config/seed-data.json';
import APP_SETTINGS from '../src/config/app-settings.json';
import USER_CONFIG from '../src/config/users.json';

// Keys for LocalStorage
const STORAGE_KEYS = {
  CUSTOMERS: 'fieldaudit_customers',
  ITEMS: 'fieldaudit_items',
  ORDERS: 'fieldaudit_orders',
  SETTINGS: 'fieldaudit_settings',
  INIT: 'fieldaudit_initialized',
  LAST_SYNC: 'fieldaudit_last_sync',
  USER: 'fieldaudit_current_user'
};

// Seed Data
const SEED_CUSTOMERS: Customer[] = SEED_DATA.customers as Customer[];
const SEED_ITEMS: Item[] = SEED_DATA.items as Item[];
const SEED_SETTINGS: CompanySettings = APP_SETTINGS;

// Database Service Implementation
class LocalDB {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.INIT)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(SEED_ITEMS));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(SEED_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INIT, 'true');
    }
  }

  // --- Customers ---
  getCustomers(): Customer[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
  }

  saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.customer_id === customer.customer_id);
    
    // Mark as pending whenever saved/updated locally
    const customerToSave = { ...customer, sync_status: 'pending' as const, updated_at: new Date().toISOString() };

    if (index >= 0) {
      customers[index] = customerToSave;
    } else {
      customers.push(customerToSave);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  // --- Items ---
  getItems(): Item[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS) || '[]');
  }

  saveItem(item: Item): void {
    const items = this.getItems();
    const index = items.findIndex(i => i.item_id === item.item_id);
    
    const itemToSave = { ...item, sync_status: 'pending' as const, updated_at: new Date().toISOString() };

    if (index >= 0) {
      items[index] = itemToSave;
    } else {
      items.push(itemToSave);
    }
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  }

  deleteItem(itemId: string): void {
    const items = this.getItems();
    const index = items.findIndex(i => i.item_id === itemId);
    if (index >= 0) {
      // Soft delete by setting status to inactive
      items[index].status = 'inactive';
      items[index].sync_status = 'pending'; // Sync this change
      items[index].updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    }
  }

  // Critical: Used during order confirmation
  updateStock(itemId: string, qtyDelta: number): void {
    const items = this.getItems();
    const index = items.findIndex(i => i.item_id === itemId);
    if (index >= 0) {
      // qtyDelta is negative for sales
      items[index].current_stock_qty += qtyDelta;
      items[index].sync_status = 'pending';
      items[index].updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    }
  }

  // --- Orders ---
  getOrders(): Order[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  }

  saveOrder(order: Order): void {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.order_id === order.order_id);
    
    const orderToSave = { ...order, sync_status: 'pending' as const, updated_at: new Date().toISOString() };

    if (index >= 0) {
      orders[index] = orderToSave;
    } else {
      orders.push(orderToSave);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  deleteOrder(orderId: string): void {
      const orders = this.getOrders();
      const index = orders.findIndex(o => o.order_id === orderId);
      
      if (index >= 0) {
          const order = orders[index];
          
          // Restore Stock if order was confirmed
          if (order.order_status === 'confirmed') {
              order.lines.forEach(line => {
                  this.updateStock(line.item_id, line.quantity); // Positive qty to add back
              });
          }

          // Hard delete from local storage for now (or could use soft delete if we had a status for it)
          orders.splice(index, 1);
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
  }

  // --- Settings ---
  getSettings(): CompanySettings {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
  }

  saveSettings(settings: CompanySettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- Sync Stats ---
  getSyncStats(): SyncStats {
    const customers = this.getCustomers();
    const items = this.getItems();
    const orders = this.getOrders();
    const last_sync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || undefined;

    return {
      pendingCustomers: customers.filter(c => c.sync_status === 'pending').length,
      pendingItems: items.filter(i => i.sync_status === 'pending').length,
      pendingOrders: orders.filter(o => o.sync_status === 'pending').length,
      last_sync
    };
  }

  // --- Analytics ---
  getDashboardStats() {
    const orders = this.getOrders();
    const items = this.getItems();
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const dailySales = orders
        .filter(o => o.order_date === today)
        .reduce((sum, o) => sum + o.net_total, 0);

    const monthlySales = orders
        .filter(o => o.order_date >= firstOfMonth)
        .reduce((sum, o) => sum + o.net_total, 0);

    const criticalItems = items.filter(i => i.current_stock_qty <= i.low_stock_threshold);

    return {
        dailySales,
        monthlySales,
        criticalItems: criticalItems.length,
        totalOrders: orders.length
    };
  }

  // --- Auth ---
  getCurrentUser(): User | null {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  }

  login(username: string, password?: string): User | null {
    const found = USER_CONFIG.users.find(u => u.username === username);
    if (!found) return null;
    
    // In a real enterprise app, this would be a hash comparison on the server
    if (password && found.password !== password) return null;

    const user: User = {
        id: 0,
        username: found.username,
        role: found.role as 'admin' | 'rep',
        full_name: found.rep_name
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  }

  logout() {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // --- Real Sync Action ---
  async performSync(onLog?: (msg: string) => void, mode: 'upsert' | 'overwrite' = 'upsert'): Promise<void> {
    const settings = this.getSettings();
    if (!settings.google_sheet_id) {
        throw new Error("Google Sheet ID not configured. Please enter it in the Sync Dashboard.");
    }

    // 1. BACKUP CURRENT DATA TO CSV
    if (onLog) onLog("Creating local backup (CSV)...");
    const currentItems = this.getItems();
    const csvData = jsonToCsv(currentItems);
    downloadCsv(csvData, `inventory_backup_${new Date().toISOString().split('T')[0]}.csv`);

    // 2. Gather Data (If overwrite, we send ALL, otherwise just pending)
    const customers = this.getCustomers();
    const pendingCustomers = mode === 'overwrite' ? customers : customers.filter(c => c.sync_status === 'pending');
    
    const orders = this.getOrders();
    // Orders are usually never overwritten, always upserted or appended
    const pendingOrders = orders.filter(o => o.sync_status === 'pending');

    const items = this.getItems();
    const pendingItems = mode === 'overwrite' ? items : items.filter(i => i.sync_status === 'pending');

    // 3. Call Google Sheets Service
    const result = await sheetsService.syncData(
        settings.google_sheet_id,
        pendingCustomers,
        pendingOrders,
        pendingItems,
        mode
    );

    // Pass logs to UI if callback provided
    if (onLog && result.logs) {
        result.logs.forEach(onLog);
    }

    if (!result.success) {
        throw new Error(result.message || "Sync failed");
    }

    // 4. Update Local Status on Success (Push)
    if (pendingCustomers.length > 0) {
        const updatedCustomers = customers.map(c => 
            c.sync_status === 'pending' ? { ...c, sync_status: 'synced' as const } : c
        );
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
    }

    if (pendingOrders.length > 0) {
        const updatedOrders = orders.map(o => 
            o.sync_status === 'pending' ? { ...o, sync_status: 'synced' as const } : o
        );
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
    }

    // 5. FULLY REPLACE INVENTORY FROM PULL
    if (result.pulledItems) {
        if (onLog) onLog(`Replacing local inventory with ${result.pulledItems.length} items from cloud.`);
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(result.pulledItems));
    }

    // 6. Update Last Sync Time
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }
}

export const db = new LocalDB();