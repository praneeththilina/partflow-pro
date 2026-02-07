# Changelog: Global Theming System

## 🎨 Global Theming Implementation
**Goal**: Allow users to personalize the app ("UX and UI with theming") and ensure the theme is consistent across all screens.

**Solution**:
- **Theme Context**: Created a central state manager for the app's color theme.
- **Dynamic Styling**: Replaced hardcoded `indigo` classes with dynamic theme classes across:
  - **Layout**: Navigation bar, Logo, Bottom Tab Bar, Mobile Menu.
  - **Dashboard**: Stats cards, Charts, Action buttons, Lists.
  - **Order Builder**: Search inputs, Add buttons, Cart highlights, Modals.
  - **Customer List (Shops)**: Action buttons, Add Form, Search Bar focus.
  - **Inventory List (Stock)**: Search inputs, Filter tags, Add Item modal, Action buttons.
  - **Sync Dashboard**: Status cards, Action buttons, Configuration panel.
  - **Settings**: Section headers, Toggles, Input focus states.

## 📱 Dashboard UX Update
- **Reordering**: Moved "Quick Actions" to the top of the Dashboard. This prioritizes the most frequent tasks (New Sale, Stock Check) over the analytics charts.

## Technical Details
- **Files Modified**: `Layout.tsx`, `Dashboard.tsx`, `OrderBuilder.tsx`, `Settings.tsx`, `App.tsx`.
- **New Context**: `context/ThemeContext.tsx`
- **Theme Utility**: `utils/theme.ts` maps 6 color schemes (Indigo, Blue, Violet, Emerald, Rose, Amber) to Tailwind classes.
