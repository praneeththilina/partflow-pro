# Changelog: Order Builder Features

## New Feature: Hide Out-of-Stock Items
**Problem**: The inventory list can become cluttered with out-of-stock items, making it harder to find available products during a sale.

**Solution**:
- Added a "Toggle Visibility" button (Eye icon) next to the barcode scanner button.
- **Default State**: Show all items (including out-of-stock).
- **Toggle Action**: Clicking the eye hides all out-of-stock items from the list.
- **Visual Feedback**: The button turns rose-colored with a crossed-eye icon when hiding items, indicating an active filter.

## Technical Details
- **File**: `components/OrderBuilder.tsx`
- **State**: `showOutOfStock` (boolean).
- **Logic**: Updated `filteredItems` to exclude items where `isOutOfStock` is true if `showOutOfStock` is false.
