import { Customer, Item, Order, OrderLine } from '../types';
import { API_CONFIG } from '../config';

interface SheetsSyncResult {
  success: boolean;
  message?: string;
  pulledItems?: Item[];
  pulledCustomers?: Customer[];
  pulledOrders?: Order[];
  logs?: string[];
}

const BACKEND_URL = API_CONFIG.BACKEND_URL;
const BACKEND_KEY = API_CONFIG.BACKEND_KEY;

class SheetsService {
  private currentLogs: string[] = [];

  private addLog(msg: string) {
      console.log(`[BackendSync] ${msg}`);
      this.currentLogs.push(msg);
  }

  async syncData(
    spreadsheetId: string, 
    customers: Customer[], 
    orders: Order[],
    items: Item[] = [],
    mode: 'upsert' | 'overwrite' = 'upsert'
  ): Promise<SheetsSyncResult> {
    this.currentLogs = [];
    try {
      this.addLog(`Connecting to local Python backend (${mode} mode)...`);
      
      const response = await fetch(`${BACKEND_URL}/sync`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': BACKEND_KEY
          },
          body: JSON.stringify({
              spreadsheetId,
              customers,
              orders,
              items,
              mode
          })
      });

      const data = await response.json();
      
      if (!response.ok) {
          throw new Error(data.message || "Backend request failed");
      }

      this.addLog("Backend sync successful.");
      this.addLog(`Fetched ${data.pulledItems?.length || 0} items from cloud.`);
      this.addLog(`Fetched ${data.pulledCustomers?.length || 0} customers from cloud.`);
      this.addLog(`Fetched ${data.pulledOrders?.length || 0} orders from cloud.`);

      if (data.debug) {
          this.addLog(`Cloud Schema Check: Customers(${data.debug.customer_header_len} cols), Orders(${data.debug.order_header_len} cols)`);
      }

      return { 
          success: true, 
          pulledItems: data.pulledItems, 
          pulledCustomers: data.pulledCustomers,
          pulledOrders: data.pulledOrders,
          logs: this.currentLogs 
      };
    } catch (err: any) {
      this.addLog(`Backend Error: ${err.message}`);
      return { 
          success: false, 
          message: err.message, 
          logs: this.currentLogs 
      };
    }
  }
}

export const sheetsService = new SheetsService();
