# Changelog: Mobile Landscape Modal Fix

## Problem
When using the app in landscape mode on a mobile phone (e.g., to type with two hands), the vertical screen space is severely limited (< 400px).
Modals like "Add Customer" would render vertically centered, pushing the "Save/Cancel" buttons off-screen and making them inaccessible because the modal container itself wasn't scrollable.

## Solution
**Scrollable Modal Architecture**:
- **Constrained Height**: Enforced `max-h-[90vh]` on the modal container to ensure it never exceeds the viewport height.
- **Scrollable Body**: The content area (inputs) is now wrapped in a scrollable view (`overflow-y-auto`), allowing users to reach all fields even in tight spaces.
- **Fixed Actions**: The Header (Title) and Footer (Save Buttons) are pinned (`shrink-0`), so they remain visible while the content scrolls.

## Technical Details
- **File**: `components/CustomerList.tsx`
- **Classes**: `flex flex-col`, `overflow-hidden`, `overflow-y-auto` added to the modal structure.
