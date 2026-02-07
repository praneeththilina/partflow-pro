# Changelog: Order Builder Search UX Update

## Problem
On mobile screens, the catalog search dropdown was redundant because the main inventory list below the search box already filters items in real-time. The dropdown obscured the view and created a cluttered experience.

## Solution
We optimized the search behavior based on screen size:

### Mobile (< 768px)
- **Dropdown**: Completely hidden.
- **Inventory List**: Always visible. Filtering happens in-place within the main list as the user types.
- **Experience**: Seamless "filter list" interaction without popups.

### Desktop (>= 768px)
- **Dropdown**: Appears when searching (standard autocomplete behavior).
- **Inventory List**: Hidden when searching to focus attention on the dropdown results (matching previous design preference).

## Technical Implementation
- **File**: `components/OrderBuilder.tsx`
- **Logic**:
  - Dropdown container: Added `hidden md:block` class.
  - Inventory List container: Added conditional class `${(isSearchFocused && itemFilter.trim().length > 0) ? 'md:hidden' : ''}`.
  - Removed the JavaScript conditional rendering wrapper `{condition && (...)}` around the item list to allow CSS-based control.

## Verification
- Build passed.
- Logic ensures list is visible on mobile even when `isSearchFocused` is true.

## Update: Consistent Item Detail View
**Problem**: The item list was "compacting" itself (hiding SKU, Model, Origin) when the search box was focused. This prevented users from verifying they were selecting the correct part during a search.

**Solution**:
- Removed conditional rendering that hid details when `isSearchFocused` was true.
- Standardized font sizes and icon sizes to be consistent regardless of search state.
- Users now see full item details (SKU, Model, Origin) at all times, making selection safer.
