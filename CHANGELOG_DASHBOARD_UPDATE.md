# Changelog: Dashboard Improvements

## Visual Intelligence
**Problem**: The dashboard was just a grid of static numbers.
**Solution**: Added a **Weekly Sales Trend Chart** (Area Chart).
- **Why**: Helps the sales rep instantly visualize if they are having a good or bad week compared to previous days.
- **Tech**: Uses `recharts` for smooth, responsive rendering.

## Operational Clarity
**Problem**: The "Recent Transactions" list showed "Sync Status" (technical detail) instead of payment status.
**Solution**: Switched to showing **Payment Status** (Paid/Unpaid).
- **Why**: Sales reps need to know who owes money more than they need to know if the data is synced (which is handled by the cloud icon anyway).
- **Visuals**: Green badge for Paid, Red for Unpaid.

## Technical Details
- **File**: `components/Dashboard.tsx`
- **Logic**: Calculated 7-day rolling sales total from local DB orders.
