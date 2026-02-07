# Changelog: Reports Navigation Update

## New Feature: Visit Shop Profile from Reports
**Problem**: When reviewing an unsettled invoice or customer ledger in the Reports tab, users had to manually navigate to the Customers tab and search for the shop to settle the debt or view details.

**Solution**:
- Added a **"Visit Profile"** button in the Customer Details view of the Reports section.
- **Deep Linking**: Clicking the button instantly switches the tab to "Customers" and opens the specific Shop Profile, allowing immediate access to "Settle Balance", "Edit Details", or "Order History".

## Technical Details
- **File**: `components/Reports.tsx`, `App.tsx`
- **Implementation**: Passed `onOpenProfile` callback from the main App router to the Reports component.
