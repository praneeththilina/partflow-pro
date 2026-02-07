# Changelog: Quantity Modal & Order Builder UX

## Mobile Keyboard Fix
**Problem**: When tapping to add an item, the "Quantity Modal" appeared in the center of the screen. On mobile, the keyboard would pop up and cover the input field, forcing the user to scroll blindly.
**Solution**:
- **Top Alignment**: On mobile screens, the modal now anchors to the top (`pt-24`), keeping the input field and +/- buttons clearly visible above the keyboard.

## Enhanced Item Context
**Problem**: The modal only showed the Item Name. Users couldn't verify if they picked the "Toyota" or "Nissan" variant without closing the modal.
**Solution**:
- **Added Details**: The modal now displays the **Vehicle Model** and **Origin (Country)** in distinct badges below the item name.

## Technical Details
- **File**: `components/OrderBuilder.tsx`
- **Classes**: `items-start`, `pt-24` (mobile), `md:items-center` (desktop).
