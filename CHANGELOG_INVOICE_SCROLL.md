# Changelog: Invoice Preview Scrolling Fix

## Problem
On smaller screens (mobile portrait), the Invoice Preview page was "stuck" horizontally. Users could scroll, but the left side of the invoice was clipped and inaccessible.
This is a known behavior of Flexbox (`justify-center` or `items-center`) when the child element overflows the parent container—it centers the overflow, pushing the start of the content off-screen to the left.

## Solution
**Smart Centering Strategy**:
- **Removed `items-center`**: Stopped forcing the flex container to center its children vertically/horizontally in a way that clips.
- **Added `mx-auto`**: Applied auto-margins to the Invoice Page itself. This achieves the same visual centering on large screens (where space exists) but safely aligns to the start (left) on small screens, allowing full horizontal scrolling.

## Technical Details
- **File**: `components/InvoicePreview.tsx`
- **Change**: `flex-col items-center` -> `flex-col`, Child: `mx-auto`.
