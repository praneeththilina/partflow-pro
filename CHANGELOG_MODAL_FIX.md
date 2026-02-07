# Changelog: Inventory Modal Fixes

## Bug Fix: Stale Data Persisting
**Problem**: If a user opened an item for editing, closed the form without saving, and then clicked "Add Item", the form would still contain the previous item's data.
**Solution**: Implemented a `closeAddForm` handler that explicitly resets the `newItem` state to an empty object whenever the modal is closed (via Cancel, X button, or Save).

## UX Improvement: Mobile Bottom Sheet
**Problem**: The "Add/Edit Item" modal was difficult to use on small screens due to layout constraints.
**Solution**:
- **Bottom Sheet Layout**: On mobile, the modal now slides up from the bottom and occupies 90% of the screen height.
- **Fixed Header/Footer**: The title and action buttons (Save/Cancel) are now pinned to the top and bottom of the sheet, ensuring they are always accessible even when the form content scrolls.
- **Z-Index Fix**: Modal layering increased to `z-[60]` to ensure it covers the bottom navigation bar on all mobile screens.
- **Improved Padding**: Optimized input spacing for touch targets.

## Technical Details
- **File**: `components/InventoryList.tsx`
- **Function**: `closeAddForm()`
- **Styles**: Added `fixed inset-0 flex items-end md:items-center` and `h-[90vh]` for mobile specific layout.
