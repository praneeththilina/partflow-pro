# Changelog: Order Builder Search & Cart UX

## Independent Search States
**Problem**: Searching for an item in the Catalog tab would erroneously filter the Cart tab when switching views, forcing the user to manually clear the search box to see their added items.
**Solution**:
- **Separated State**: Introduced `catalogSearch` and `cartSearch` states.
- **Result**: Typing in the Catalog filter no longer affects the Cart view, and vice versa. Each tab maintains its own search context.

## Enhanced Search UX
**Problem**: Clearing the search box was tedious (backspacing or selecting text).
**Solution**:
- **Clear Button**: Added an "X" button inside the search input that appears when text is present. Clicking it instantly clears the search and refocuses the input for rapid re-entry.

## Improved Cart Item Visibility
**Problem**: Items in the cart list only showed the name, making it hard to distinguish between similar parts (e.g., "Brake Pad" for Toyota vs Nissan).
**Solution**:
- **Rich Item Details**: The Cart Item card now displays **Vehicle Model** and **Origin/Country** below the item name, matching the Catalog view.

## Technical Details
- **File**: `components/OrderBuilder.tsx`
- **Refactor**: Replaced generic `itemFilter` with context-specific search states.
