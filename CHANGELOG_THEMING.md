# Changelog: Theming and Dashboard Polish

## 🎨 Theming Engine
**New Feature**: Users can now customize the app's primary brand color.
- **Choices**: Indigo (Default), Ocean Blue, Royal Violet, Emerald, Rose, Amber.
- **Persistence**: Selected theme is saved locally and persists across sessions.
- **Implementation**: Created a `ThemeContext` and a `themeColors` mapping that swaps Tailwind classes dynamically for background, text, borders, and rings.

## 📊 Dashboard Improvements
**Layout Update**:
- Moved **Quick Actions** to the top (above charts) for faster access to critical tasks (New Sale, Stock Check).
- **Styling**: Updated "Today's Sales" card and "New Sale" button to respect the selected theme color.

**Visual Polish**:
- Added subtle gradients and hover effects to cards.
- Improved "Recent Transactions" list to show **Payment Status** (Paid/Unpaid) instead of technical sync status.

## Technical Details
- **Files Created**: `context/ThemeContext.tsx`, `utils/theme.ts`.
- **Files Modified**: `App.tsx` (Provider), `components/Settings.tsx` (Picker), `components/Dashboard.tsx` (Consumer).
