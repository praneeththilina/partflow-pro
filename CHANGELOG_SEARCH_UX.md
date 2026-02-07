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
