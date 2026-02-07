# Changelog: Order History UX Improvements

## Date-Based Grouping
**Problem**: The order history was a flat, endless list, making it hard to find orders from "Yesterday" or "Last Week".
**Solution**:
- **Chronological Grouping**: Orders are now grouped by date (e.g., "Monday, July 12").
- **Sticky Headers**: Date headers stick to the top while scrolling, providing context.
- **Count Badges**: Each date header shows the number of orders for that day.

## Card Redesign
**Problem**: Information density was poor, with key details like status and amount blending in.
**Solution**:
- **Clear Hierarchy**: Customer Name is bold and primary. Order ID is secondary.
- **Status Pills**: Delivery and Payment statuses are now visual badges.
- **Action Bar**: Buttons (Delivery, Edit, Invoice, Share, Delete) are neatly arranged at the bottom of the card.

## Mobile UX
- **Delivery Modal**: Converted to a bottom sheet layout for better mobile ergonomics.
- **Search Bar**: Sticky positioning ensures it's always accessible.

## Theming
- Applied global theme colors to all elements (badges, buttons, highlights).
