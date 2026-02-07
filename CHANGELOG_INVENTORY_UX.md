# Changelog: Inventory UI/UX Improvements

## Visual Stock Management
**Problem**: Users had to read small numbers to know if stock was low.
**Solution**:
- **Visual Progress Bars**: Desktop view now shows a colored bar indicating stock level relative to the safe threshold.
  - Green: Healthy
  - Amber: Low Stock (below threshold)
  - Red: Out of Stock
- **Mobile Stacked Cards**: Replaced the basic list with clean, touch-friendly cards that clearly separate item details, pricing, and stock status.

## Header & Filter Optimization
**Problem**: The filter controls (Search, Model, Origin, Sort) cluttered the screen, especially on mobile.
**Solution**:
- **Collapsible Filters (Mobile)**: Filters are now tucked behind a "Filters" toggle button, keeping the main view clean while keeping powerful search accessible.
- **Inline Search (Desktop)**: Optimized spacing and alignment for a professional dashboard look.

## Theming Integration
- Applied the global **Theme Engine** to the Inventory screen. Search inputs, buttons, and badges now respect the user's chosen brand color (e.g., Indigo, Rose, Emerald).

## Technical Cleanup
- Refactored `InventoryList.tsx` to remove duplicate code blocks and improve maintainability.
