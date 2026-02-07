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
- **Secondary**: SKU, Model, and **Origin (Country)** are now displayed on the second line for complete context.
- **Stock Actions**: Replaced large buttons with small status indicators (dots/text) to save height.

### 3. Result
- **Capacity**: Can now display 5+ items in the visible area above the keyboard.
- **Experience**: "Type-and-see" filtering is much smoother.

## Update: Skeleton Loading (Perceived Performance)
**Problem**: When opening the inventory list, users would briefly see a blank white screen or a layout shift as data loaded from the database.
**Solution**:
- **Skeleton UI**: Added animated gray placeholders that mimic the exact shape of the inventory cards.
- **Implementation**: Displayed for 400ms on mount to provide immediate visual feedback that "content is coming", making the app feel faster and more native.

## Update: Compact Header for Small Screens
**Problem**: The search bar and action buttons took up nearly 25% of the screen on mobile, pushing content down.
**Solution**:
- **Single Row Layout**: Combined Search, Filter Toggle, and Add Button into one row.
- **Collapsible Filters**: Advanced filters (Model, Origin) are now hidden by default on mobile, expandable via the Filter icon.
- **Micro-Styling**: Reduced padding and font sizes for header elements to maximize data visibility.
