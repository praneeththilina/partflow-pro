# Changelog: Compact Mobile Inventory UI

## Problem
On mobile devices, when the search keyboard is active, it covers ~50% of the screen. The previous inventory cards were too tall, allowing only 1-2 items to be visible while typing, which made searching difficult.

## Solution
We redesigned the mobile inventory list to be **ultra-compact**:

### 1. High Density Layout
- **Reduced Padding**: Shrank card padding from `p-4` (16px) to `p-2.5` (10px).
- **Removed Margins**: Switched from spaced cards (`space-y-3`) to a continuous list (`divide-y`), saving vertical space.
- **Inline Details**: Combined SKU, Model, and Price into tighter rows.

### 2. Simplified Information
- **Prioritized**: Item Name and Price are primary.
- **Secondary**: SKU and Model are small tags.
- **Stock Actions**: Replaced large buttons with small status indicators (dots/text) to save height.

### 3. Result
- **Capacity**: Can now display 5+ items in the visible area above the keyboard.
- **Experience**: "Type-and-see" filtering is much smoother.

## Technical Details
- **File**: `components/InventoryList.tsx`
- **Structure**: `div.divide-y` container replacing `div.space-y-3`.
