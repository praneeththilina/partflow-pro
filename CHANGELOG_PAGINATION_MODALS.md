# Changelog: Performance and UX Polish

## 🚀 Order History Pagination
**Problem**: The Order History page was loading all historical orders at once, causing slow rendering and lag on devices with many records.
**Solution**:
- **Virtual Pagination**: The list now loads the first 20 recent orders by default.
- **Load More**: A "Load More" button allows fetching older records as needed.
- **Smart Search**: Searching still scans the entire database but resets the view to show relevant results instantly.

## 🎨 Unified Modal Experience
**Problem**: Critical actions like "Delete Item" or "Cancel Order" used the browser's native, unstyled `confirm()` dialog, which felt disjointed from the app UI.
**Solution**:
- **Custom Modals**: Replaced all native confirmation popups with the app's themed `Modal` component.
- **Consistency**: Now, deleting a customer, discarding an order, or removing stock all use the same consistent, touch-friendly UI pattern.

## Technical Details
- **Files Modified**: `components/OrderHistory.tsx`, `App.tsx`, `components/CustomerList.tsx`
- **State**: Added `visibleCount` for pagination and `confirmConfig` for modal management.
