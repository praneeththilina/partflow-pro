# FieldAudit Sales - Development Roadmap (Phase 2)

Based on the initial `todo.txt` architecture and the current V1 implementation, the following tasks are prioritized to move the app from a standalone prototype to a connected field tool.

## 1. Google Sheets Integration (Critical)
*The current app uses a mock sync service. Real data persistence requires Sheets API connection.*

- [ ] **API Setup**: Configure Google Cloud Console project with Sheets API enabled.
- [ ] **Authentication**: Implement `Google Identity Services` for client-side OAuth 2.0.
- [ ] **Sheet Structure**: Create a master template Sheet with tabs: `Customers`, `Inventory`, `Orders`, `OrderLines`.
- [ ] **Sync Engine**: 
    - Replace `db.performSync()` mock with actual API calls.
    - Implement "Push" logic: Append new rows for Orders/Customers.
    - Implement "Pull" logic: Fetch Inventory updates from headquarters.

## 2. Order History & Management
*Currently, the app focuses on creating orders. Users need to view past work.*

- [ ] **Order List View**: Update `App.tsx` and `OrderBuilder.tsx` to toggle between a "List of Past Orders" and "New Order Form".
- [ ] **Status Indicators**: Visual tags for `Draft`, `Confirmed`, and `Synced` in the list view.
- [ ] **Reprint Functionality**: Ability to open the `InvoicePreview` for any past confirmed order.

## 3. Inventory Management (In-App)
*Users can sell items, but currently cannot restock them in the app.*

- [ ] **Stock Adjustment Action**: Add an "Adjust Stock" button in `InventoryList.tsx`.
- [ ] **Adjustment Logging**: Create a `StockAdjustment` entity to track `item_id`, `delta`, `reason` (e.g., "Restock", "Damage"), and `timestamp`.
- [ ] **Sync Adjustments**: Push these adjustments to a separate tab in Google Sheets for audit trails.

## 4. Settings Module
*Company details are currently hardcoded in `services/db.ts`.*

- [ ] **Settings UI**: Create a form to edit `Company Name`, `Address`, `Phone`, and `Invoice Prefix`.
- [ ] **Logo Upload**: Allow storing a Base64 string of a simple logo for the invoice header.

## 5. Reliability & Storage Upgrade
*LocalStorage is sufficient for prototypes but has size limits and can be cleared easily.*

- [ ] **IndexedDB Migration**: Refactor `services/db.ts` to use `idb` or `Dexie.js`. This allows storing thousands of orders/items reliably.
- [ ] **Data Backup**: Add a "Export to JSON" button in the Settings tab for manual local backups.

## 6. Conflict Resolution UI
*What happens if HQ changes a price while the rep is offline?*

- [ ] **Conflict Detection**: Compare `updated_at` timestamps during sync.
- [ ] **Resolution Modal**: If a conflict exists, show "Local Version" vs "Server Version" and allow the user to pick one.
