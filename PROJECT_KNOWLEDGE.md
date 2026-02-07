# PartFlow Pro - Project Knowledge Base

**Last Updated**: February 7, 2026  
**Project Type**: Enterprise Spare Parts Distribution Management System  
**Tech Stack**: React + TypeScript + Dexie.js + Flask + Google Sheets API  
**Platform**: Web (PWA) + Android (Capacitor)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Core Features](#core-features)
4. [File Structure](#file-structure)
5. [Database Schema](#database-schema)
6. [Data Flow](#data-flow)
7. [Key Components](#key-components)
8. [Backend API](#backend-api)
9. [Deployment](#deployment)
10. [Configuration](#configuration)
11. [Recent Development](#recent-development)
12. [Roadmap & Gaps](#roadmap--gaps)
13. [Development Workflow](#development-workflow)

---

## Project Overview

### Purpose
PartFlow Pro transforms smartphones into powerful POS terminals for field sales representatives in the vehicle spare parts industry. It provides offline-first inventory management, customer relationship tracking, and cloud synchronization with headquarters.

### Target Users
- **Primary**: Field Sales Representatives (mobile-first)
- **Secondary**: Admin/HQ staff (data management)

### Key Value Propositions
1. **Work Offline**: All operations function without internet connection
2. **Instant Invoicing**: Generate professional PDF invoices on-site
3. **Real-time Inventory**: Track stock levels with low-stock alerts
4. **Credit Management**: Monitor customer outstanding balances
5. **Cloud Sync**: Bidirectional data sync with Google Sheets
6. **Mobile-Native**: Full Android support with hardware back button integration

---

## Technical Architecture

### Frontend Stack

```
React 19.2.4 (UI Framework)
├── TypeScript 5.8.2 (Type Safety)
├── Vite 6.2.0 (Build Tool)
├── Dexie 4.3.0 (IndexedDB Wrapper)
├── Capacitor 8.0.2 (Mobile Platform)
├── jsPDF 4.0.0 (PDF Generation)
├── Lucide React 0.563.0 (Icons)
└── Tailwind CSS (Styling - implied)
```

### Backend Stack

```
Flask (Python Web Framework)
├── Google Sheets API v4 (Cloud Database)
├── SQLite (User Authentication)
├── Flask-CORS (Cross-Origin Support)
└── Vercel (Serverless Deployment)
```

### Data Storage Strategy

| Layer | Technology | Purpose | Persistence |
|-------|-----------|---------|-------------|
| **Client Cache** | JavaScript Objects | Instant reads | Session-based |
| **Client DB** | Dexie.js (IndexedDB) | Offline storage | Permanent |
| **Session** | LocalStorage | Auth state | Browser-scoped |
| **Cloud** | Google Sheets | HQ master data | Permanent |
| **Backend DB** | SQLite (/tmp) | User credentials | Ephemeral (Vercel) |

---

## Core Features

### ✅ Sales & Billing
- **POS-Style Order Builder**: Real-time item search with SKU scanning
- **Smart Pricing Engine**:
  - Gross Total calculation
  - Primary discount (customer-level)
  - Secondary discount (order-level)
  - Net Total computation
- **Payment Management**:
  - Types: Cash, Cheque, Bank Transfer, Credit
  - Partial payment support
  - Payment history tracking
  - Auto-calculated payment status (Paid/Partial/Unpaid)
- **Professional Invoices**:
  - PDF generation with company branding
  - "PAID IN FULL" stamp for completed orders
  - Detailed line item breakdown
  - Payment summary section

**Location**: `components/OrderBuilder.tsx`, `components/InvoicePreview.tsx`

### ✅ Advanced Inventory Control
- **Smart SKU Generation**:
  - Acrostic algorithm: "Carbon Brush GN125" → `CBG01`
  - Auto-incrementing suffixes for duplicates
  - Toggleable in Settings
- **Duplicate Protection**: Prevents same Part+Model+Country combination
- **Flexible Tracking Modes**:
  - **Enabled**: Exact quantity tracking with low-stock alerts
  - **Disabled**: Manual "In Stock/Out of Stock" flagging
- **Vehicle-Centric Filters**:
  - Vehicle Model (e.g., "GN125", "Corolla")
  - Country of Origin (e.g., "China", "Japan")
  - Category (e.g., "Engine", "Brakes")
- **Stock Adjustments**:
  - Types: Restock, Damage, Correction, Return
  - Logged separately from sales
  - Synced to cloud for audit trails

**Location**: `components/InventoryList.tsx`, `utils/skuGenerator.ts`

### ✅ Customer (Shop) Management
- **Shop Profiles**:
  - Contact details (Name, Address, Phone, City)
  - Credit terms (30/60/90 days)
  - Discount rates (Primary + Secondary)
  - Outstanding balance tracker
- **Transaction History**: View all orders per shop
- **Quick Actions**: 
  - Tap to create new bill
  - View shop profile
  - Edit shop details
- **Credit Visibility**: Total due amount shown in shop list

**Location**: `components/CustomerList.tsx`, `components/ShopProfile.tsx`

### ✅ Delivery Tracking
- **Statuses**: 
  - Pending → Shipped → Out for Delivery → Delivered
  - Failed / Cancelled (with stock restoration)
- **Smart Stock Logic**:
  - Moving to Failed/Cancelled: Restores stock
  - Moving back to active: Re-deducts stock
- **Outstanding Balance Logic**: 
  - Excludes Failed/Cancelled orders
  - Auto-recalculates on status change
- **Delivery Notes**: Optional field for driver instructions

**Location**: `services/db.ts` (lines 314-343)

### ✅ Business Intelligence
- **Dashboard**:
  - Today's sales total
  - Month-to-date sales
  - Critical stock alerts count
  - Total orders count
- **Reports Suite**:
  - Sales Journal (with date filtering)
  - Inventory Health (Out of Stock vs Available)
  - Category Analytics
  - Payment Status breakdown
- **PDF Export**: All reports exportable as PDF

**Location**: `components/Dashboard.tsx`, `components/Reports.tsx`

### ✅ Cloud Synchronization
- **Sync Modes**:
  - **Upsert**: Push only pending changes (default)
  - **Overwrite**: Full data replacement
- **Sync Flow**:
  1. Auto-backup inventory to CSV
  2. Push pending customers/orders to Sheets
  3. Pull latest inventory/customers from HQ
  4. Update local sync status
- **Conflict Detection**: Tracks sync_status (synced/pending/conflict)
- **Last Sync Timestamp**: Stored in localStorage

**Location**: `services/sheets.ts`, `api/index.py`

### ✅ Authentication & Security
- **User Roles**: Admin, Rep
- **Auth Flow**:
  - Login with username/password
  - Token stored in localStorage
  - Session persistence across reloads
- **API Security**: X-API-KEY header for backend calls
- **Password Management**: Change password in Settings

**Location**: `context/AuthContext.tsx`, `components/Login.tsx`

### ✅ Mobile UX
- **Android Compilation**: Full Capacitor integration
- **Hardware Back Button**:
  - Navigates through history stack
  - Exit confirmation at root level
- **Navigation Stack**: Tracks user journey for back button
- **Exit Modal**: Safety confirmation before closing app
- **PWA Support**: Installable on web with offline caching

**Location**: `App.tsx` (lines 51-80), `capacitor.config.ts`

---

## File Structure

```
D:\AA AKILA NODE\
├── 📱 Core App Files
│   ├── App.tsx                      # Main app (navigation, state management)
│   ├── index.tsx                    # React entry point
│   ├── index.html                   # HTML template
│   ├── types.ts                     # TypeScript type definitions
│   └── config.ts                    # Backend API configuration
│
├── 🧩 Components (13 files)
│   ├── Layout.tsx                   # App shell with bottom navigation
│   ├── Dashboard.tsx                # Sales analytics & KPIs
│   ├── CustomerList.tsx             # Shop directory & search
│   ├── ShopProfile.tsx              # Individual shop detail view
│   ├── InventoryList.tsx            # Stock management & search
│   ├── OrderBuilder.tsx             # POS-style order creation (48KB - largest)
│   ├── OrderHistory.tsx             # Past orders list
│   ├── InvoicePreview.tsx           # PDF invoice generator
│   ├── Reports.tsx                  # Business intelligence suite
│   ├── SyncDashboard.tsx            # Cloud sync interface
│   ├── Settings.tsx                 # App configuration
│   ├── Login.tsx                    # Authentication screen
│   ├── Register.tsx                 # User registration
│   └── ui/
│       └── Modal.tsx                # Reusable modal component
│
├── 🔧 Services (3 files)
│   ├── db.ts                        # Dexie DB + cache layer (641 lines)
│   ├── sheets.ts                    # Google Sheets sync service
│   └── pdf.ts                       # PDF generation utilities
│
├── 🛠️ Utilities (4 files)
│   ├── csv.ts                       # JSON to CSV converter
│   ├── currency.ts                  # Currency formatting
│   ├── skuGenerator.ts              # Auto-SKU algorithm
│   └── uuid.ts                      # UUID generation
│
├── 🌐 Context (2 files)
│   ├── AuthContext.tsx              # Authentication state
│   └── ToastContext.tsx             # Notification system
│
├── 🐍 Backend API (Vercel Deployment)
│   ├── api/
│   │   ├── index.py                 # Main Flask app (Vercel entry point)
│   │   ├── database.py              # SQLite user management
│   │   └── requirements.txt         # Python dependencies
│   │
│   └── backend/                     # Local dev server
│       ├── main.py                  # Flask app (local version)
│       ├── database.py              # Same as api/database.py
│       └── partflow.db              # SQLite database file
│
├── 📱 Mobile (Android)
│   ├── android/                     # Capacitor Android project
│   └── capacitor.config.ts          # Capacitor configuration
│
├── 📦 Configuration
│   ├── package.json                 # NPM dependencies
│   ├── tsconfig.json                # TypeScript config
│   ├── vite.config.ts               # Vite build config
│   ├── vercel.json                  # Vercel deployment config
│   ├── .env.local                   # Environment variables (gitignored)
│   └── src/config/
│       ├── seed-data.json           # Initial customers & items
│       ├── app-settings.json        # Default company settings
│       └── users.json               # Seed users (admin/rep)
│
├── 📄 Documentation
│   ├── README.md                    # User-facing documentation
│   ├── User_Manual.html             # HTML manual
│   ├── followup_tasks.md            # Phase 2 roadmap
│   └── guide.txt                    # Setup notes
│
└── 🗂️ Assets
    ├── assets/                      # Images, icons
    ├── public/                      # Static files
    └── dist/                        # Vite build output
```

---

## Database Schema

### Dexie.js Tables (IndexedDB)

#### **customers** (Primary Key: `customer_id`)
```typescript
{
  customer_id: string;              // UUID
  shop_name: string;
  address: string;
  phone: string;
  city_ref: string;
  discount_rate: number;            // 0.0 to 1.0 (e.g., 0.05 = 5%)
  secondary_discount_rate?: number; // Optional additional discount
  outstanding_balance: number;      // Calculated from unpaid orders
  credit_period: number;            // Days (30, 60, 90)
  status: 'active' | 'inactive';
  created_at: string;               // ISO timestamp
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}
```

#### **items** (Primary Key: `item_id`)
```typescript
{
  item_id: string;                  // UUID
  item_display_name: string;        // "Brake Pad (Toyota Corolla)"
  item_name: string;                // Generic name
  item_number: string;              // SKU (e.g., "BPT01")
  vehicle_model: string;            // "GN125", "Corolla"
  source_brand: string;             // "China", "Japan", "Denso"
  category: string;                 // "Engine", "Brakes", "Suspension"
  unit_value: number;               // Price per unit
  current_stock_qty: number;        // Quantity available
  low_stock_threshold: number;      // Alert level
  is_out_of_stock: boolean;         // Manual flag
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}
```

#### **orders** (Primary Key: `order_id`)
```typescript
{
  order_id: string;                 // UUID
  customer_id: string;              // FK to customers
  rep_id?: string;                  // FK to users
  order_date: string;               // YYYY-MM-DD
  discount_rate: number;            // Snapshot of customer discount
  gross_total: number;              // Sum of line_total
  discount_value: number;           // Calculated discount amount
  secondary_discount_rate?: number; // Order-level discount
  secondary_discount_value?: number;
  net_total: number;                // Final amount after discounts
  credit_period?: number;           // Snapshot of credit terms
  
  // Payment Tracking
  paid_amount: number;              // Sum of payments
  balance_due: number;              // net_total - paid_amount
  payment_status: 'paid' | 'partial' | 'unpaid';
  payments: Payment[];              // Array of payment records
  
  // Delivery Tracking
  delivery_status: 'pending' | 'shipped' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';
  delivery_notes?: string;
  
  order_status: 'draft' | 'confirmed' | 'invoiced';
  lines: OrderLine[];               // Array of order line items
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}
```

#### **Payment** (Embedded in Order)
```typescript
{
  payment_id: string;               // UUID
  order_id: string;                 // FK to orders
  amount: number;
  payment_date: string;             // ISO timestamp
  payment_type: 'cash' | 'cheque' | 'bank_transfer' | 'credit';
  reference_number?: string;        // Cheque # or Transaction ID
  notes?: string;
}
```

#### **OrderLine** (Embedded in Order)
```typescript
{
  line_id: string;                  // UUID
  order_id: string;                 // FK to orders
  item_id: string;                  // FK to items
  item_name: string;                // Snapshot (for historical accuracy)
  quantity: number;
  unit_value: number;               // Snapshot (price at order time)
  line_total: number;               // quantity * unit_value
}
```

#### **stockAdjustments** (Primary Key: `adjustment_id`)
```typescript
{
  adjustment_id: string;            // UUID
  item_id: string;                  // FK to items
  adjustment_type: 'restock' | 'damage' | 'correction' | 'return';
  quantity: number;                 // Always positive (direction from type)
  reason: string;                   // User-entered note
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}
```

#### **settings** (Primary Key: `id` - always 'main')
```typescript
{
  id: 'main';                       // Singleton
  company_name: string;
  address: string;
  phone: string;
  rep_name: string;
  invoice_prefix: string;           // e.g., "INV-"
  footer_note: string;
  currency_symbol: string;          // "$", "Rs.", "€"
  auto_sku_enabled: boolean;
  stock_tracking_enabled: boolean;
  category_enabled: boolean;
  google_sheet_id?: string;         // For cloud sync
}
```

#### **users** (Primary Key: `id`)
```typescript
{
  id: string;                       // "user-1", "user-2"
  username: string;
  password: string;                 // Plain text (local only!)
  role: 'admin' | 'rep';
  full_name: string;
}
```

### IndexedDB Indexes

```javascript
// Optimized for common queries
customers: 'customer_id, shop_name, sync_status'
items: 'item_id, item_number, item_display_name, sync_status, status'
orders: 'order_id, customer_id, order_date, sync_status, payment_status, delivery_status'
stockAdjustments: 'adjustment_id, item_id, sync_status'
settings: 'id'
users: 'id, username'
```

---

## Data Flow

### Order Creation Flow
```
1. User selects customer from CustomerList
2. OrderBuilder loads with customer context
3. User searches & adds items (real-time stock check)
4. System calculates:
   - Gross Total = Σ(line_total)
   - Primary Discount = gross * customer.discount_rate
   - Secondary Discount = (gross - primary) * order.secondary_discount_rate
   - Net Total = gross - primary - secondary
5. User adds payments (optional)
6. User confirms order:
   a. Order saved to db.orders (cache + Dexie)
   b. Stock deducted: item.current_stock_qty -= quantity
   c. Customer balance updated: recalcCustomerBalance()
   d. sync_status = 'pending'
7. InvoicePreview shown with PDF generation
8. PDF can be saved/shared
```

### Sync Flow (Push & Pull)
```
CLIENT                          BACKEND (Vercel)                GOOGLE SHEETS
  |                                   |                                |
  | 1. Click "Sync Now"               |                                |
  |---------------------------------->|                                |
  |                                   |                                |
  | 2. Auto-backup to CSV             |                                |
  |   (inventory_backup_YYYY-MM-DD)   |                                |
  |                                   |                                |
  | 3. POST /api/sync                 |                                |
  |   Headers: X-API-KEY              |                                |
  |   Body: {                         |                                |
  |     sheet_id: "...",              |                                |
  |     customers: [...],             | 4. Authenticate with           |
  |     orders: [...],                |    Service Account             |
  |     items: [...],                 |----------------------------->  |
  |     mode: "upsert"                |                                |
  |   }                               |                                |
  |                                   | 5. Push customers to           |
  |                                   |    "Customers" sheet           |
  |                                   |    (append new rows)           |
  |                                   |----------------------------->  |
  |                                   |                                |
  |                                   | 6. Push orders to              |
  |                                   |    "Orders" sheet              |
  |                                   |----------------------------->  |
  |                                   |                                |
  |                                   | 7. Pull items from             |
  |                                   |    "Items" sheet               |
  |                                   |    (full replacement)          |
  |                                   |<------------------------------ |
  |                                   |                                |
  |                                   | 8. Return result:              |
  |                                   |    {                           |
  |                                   |      success: true,            |
  |                                   |      pulledItems: [...],       |
  |                                   |      logs: [...]               |
  |                                   |    }                           |
  | 9. Update local data:             |<-------------------------------|
  |    - Mark synced items as         |                                |
  |      sync_status = 'synced'       |                                |
  |    - Replace items with pulled    |                                |
  |    - Auto-generate missing SKUs   |                                |
  |<----------------------------------|                                |
  |                                   |                                |
  | 10. Show "Sync Complete" toast    |                                |
```

### Authentication Flow
```
1. User enters username/password
2. Login component calls db.login()
3. db.login() searches users table in Dexie
4. If found + password matches:
   - Creates User object (without password)
   - Saves to localStorage as 'partflow_auth'
   - AuthContext updates isAuthenticated = true
5. App.tsx re-renders → shows main app
6. On page reload:
   - AuthProvider reads localStorage
   - Auto-restores session
```

---

## Key Components

### App.tsx (Main Orchestrator)
**Lines**: 275  
**Responsibility**: Root component, navigation, state management

**Key State**:
- `activeTab`: Current view ('home', 'customers', 'inventory', etc.)
- `historyStack`: Navigation history for back button
- `draftOrder`: Unsaved order state (survives tab changes)
- `selectedCustomer`: Customer context for order creation
- `activeOrder`: Order for invoice preview
- `editingOrder`: Order being modified

**Navigation Logic**:
- `navigateTo(tab)`: Pushes to history stack
- `handleBack()`: Pops from stack or shows exit modal
- Hardware back button listener (Capacitor)

**Lifecycle**:
1. Initialize Dexie DB
2. Check authentication
3. Render login or main app
4. Handle navigation & modals

---

### services/db.ts (Data Layer)
**Lines**: 641  
**Responsibility**: Database operations, sync, analytics

**Architecture**:
```
LocalDB Class
├── db: PartFlowDB (Dexie instance)
├── cache: Object (in-memory for instant reads)
├── initialized: boolean
└── Methods:
    ├── initialize()          # Boot sequence
    ├── migrateOrSeed()       # LocalStorage → Dexie migration
    ├── refreshCache()        # Load Dexie → Memory
    ├── CRUD operations       # customers, items, orders
    ├── performSync()         # Cloud sync orchestration
    └── getDashboardStats()   # Analytics queries
```

**Critical Methods**:
- `saveOrder()`: Auto-calculates payment_status, updates customer balance
- `updateDeliveryStatus()`: Smart stock restoration for failed/cancelled
- `recalcCustomerBalance()`: Sums unpaid orders (excluding failed/cancelled)
- `updateStock()`: Modifies item quantity, marks pending
- `performSync()`: Backup → Push → Pull → Update statuses

**Cache Strategy**:
- All reads from memory (instant)
- Writes update cache first (optimistic)
- Then persist to Dexie (async)
- Cache refreshed on init and after sync

---

### components/OrderBuilder.tsx (POS Core)
**Lines**: 48KB (largest component)  
**Responsibility**: Order creation & editing

**Features**:
- **Dual Search Interfaces**:
  - **Catalog Tab Search**: Quick-add dropdown with SKU • Model • Origin display
  - **Cart Tab Search**: Mobile-only quick-add with same dropdown format
  - Both dropdowns match styling and show item details consistently
- Real-time item search (fuzzy match on name/SKU/model)
- **Search Dropdown** (Updated Feb 7, 2026):
  - Shows up to 20 matching items
  - Format: Item Name + "SKU • Model • Origin" (e.g., "BP-102 • COROLLA • China")
  - Visual feedback for items already in cart
  - Auto-hides out-of-stock items
  - Click to select and add item
- Item card shows: Name, SKU, Model, Origin, Price, Stock
- Add to cart with quantity selector
- Dual discount inputs (Primary + Secondary %)
- Payment entry with type selector
- Running totals display:
  - Gross Total
  - Discount (Primary)
  - Secondary Discount
  - Net Payable
  - Paid Amount
  - Balance Due
- Stock validation on add
- Draft state preservation
- Edit mode (loads existing order)

**State Management**:
- `lines`: Array of OrderLine
- `payments`: Array of Payment
- `itemFilter`: Search input (shared by both dropdowns)
- `isSearchFocused`: Controls catalog dropdown visibility
- `selectedCustomer`: Context from parent
- `editingOrder`: If modifying existing
- `mobileTab`: Toggle between 'catalog' and 'cart' views

---

### components/InvoicePreview.tsx (PDF Generator)
**Lines**: 19KB  
**Responsibility**: Professional invoice PDF generation

**Layout**:
```
┌─────────────────────────────────────┐
│ COMPANY HEADER                      │
│ (Name, Address, Phone)              │
├─────────────────────────────────────┤
│ INVOICE # | DATE | STATUS BADGE     │
├─────────────────────────────────────┤
│ BILL TO:                            │
│ (Shop Name, Address, Phone)         │
├─────────────────────────────────────┤
│ ITEMS TABLE                         │
│ | # | Item | Qty | Price | Total | │
│ |---|------|-----|-------|-------|  │
│ | 1 | ...  | ... | ...   | ...   |  │
├─────────────────────────────────────┤
│ TOTALS:                             │
│ Gross Total:      Rs. 10,000        │
│ Discount (5%):    Rs. 500           │
│ Net Total:        Rs. 9,500         │
│                                     │
│ Paid:             Rs. 9,500         │
│ Balance Due:      Rs. 0             │
│ [PAID IN FULL stamp if balance=0]  │
├─────────────────────────────────────┤
│ PAYMENT HISTORY                     │
│ | Date | Type | Amount | Ref |     │
├─────────────────────────────────────┤
│ DELIVERY STATUS                     │
│ [Colored badge with current status] │
├─────────────────────────────────────┤
│ FOOTER NOTE                         │
│ (Company tagline/terms)             │
└─────────────────────────────────────┘
```

**Features**:
- jsPDF + autotable for table layout
- Conditional "PAID IN FULL" stamp
- Delivery status badges
- Payment history breakdown
- Save as PDF / Share via Capacitor

---

### components/SyncDashboard.tsx (Cloud Sync UI)
**Lines**: 13KB  
**Responsibility**: Google Sheets integration interface

**Features**:
- Sheet ID configuration input
- Sync mode selector (Upsert vs Overwrite)
- Pending changes counter (customers/items/orders)
- Real-time sync logs display
- Progress indicator
- Last sync timestamp
- Auto-backup trigger

**Sync Process UI**:
1. Show pending counts
2. Confirm mode selection
3. Display log stream:
   - "Creating local backup..."
   - "Pushing 3 customers..."
   - "Pushing 5 orders..."
   - "Pulling 150 items from cloud..."
   - "Sync Complete ✓"
4. Update last sync time
5. Refresh stats

---

### components/Dashboard.tsx (Analytics Home)
**Lines**: 15KB  
**Responsibility**: Sales KPIs & quick actions

**Widgets**:
1. **Daily Sales Card**: Today's revenue (excludes failed/cancelled)
2. **Monthly Sales Card**: MTD revenue
3. **Critical Stock Alert**: Count of low-stock items
4. **Total Orders**: Lifetime order count
5. **Recent Orders List**: Last 5 orders with view action
6. **Quick Actions**:
   - New Order
   - Manage Inventory
   - View Reports
   - Sync Data

**Data Source**: `db.getDashboardStats()` (cache-based, instant)

---

## Backend API

### Endpoints (api/index.py)

#### **POST /api/sync**
**Auth**: X-API-KEY header  
**Purpose**: Bidirectional data sync with Google Sheets

**Request**:
```json
{
  "sheet_id": "1ABC...XYZ",
  "customers": [...],        // Pending customers (if mode = upsert)
  "orders": [...],           // Pending orders
  "items": [...],            // Pending items (if mode = upsert)
  "mode": "upsert"           // or "overwrite"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "pulledItems": [...],      // Latest inventory from Sheets
  "pulledCustomers": [...],  // Latest customers from Sheets
  "pulledOrders": [...],     // Historical orders (if exists)
  "logs": [
    "Pushing 3 customers to cloud...",
    "Pushing 5 orders to cloud...",
    "Pulling 150 items from cloud..."
  ]
}
```

**Sheet Structure Expected**:
- **Customers** sheet: customer_id, shop_name, address, phone, city_ref, discount_rate, secondary_discount_rate, outstanding_balance, credit_period, status, created_at, updated_at
- **Orders** sheet: order_id, customer_id, order_date, gross_total, discount_value, net_total, paid_amount, balance_due, payment_status, delivery_status, order_status, created_at
- **Items** sheet: item_id, item_display_name, item_name, item_number, vehicle_model, source_brand, category, unit_value, current_stock_qty, low_stock_threshold, status, created_at

**Error Handling**:
```json
{
  "success": false,
  "message": "Sheet not found or permission denied",
  "error": "HttpError 404"
}
```

---

#### **POST /api/auth/login** (Placeholder)
**Status**: Not fully implemented (auth happens client-side)  
**Purpose**: Future server-side authentication

---

### Google Sheets Authentication

**Service Account Setup**:
1. Create GCP project
2. Enable Sheets API
3. Create Service Account
4. Generate JSON key
5. Share target Sheet with service account email

**Deployment Method (Vercel)**:
```bash
# Convert JSON key to Base64
cat service-account.json | base64 > sa.b64

# Add to Vercel environment variables
GOOGLE_SERVICE_ACCOUNT_B64="<paste sa.b64 content>"
```

**Code Reference**: `api/index.py` lines 44-96 (get_google_config function)

---

## Deployment

### Frontend (Web)

**Development**:
```bash
npm run dev          # Vite dev server on http://localhost:3000
```

**Production Build**:
```bash
npm run build        # Output: dist/
```

**Deployment Options**:
- **Vercel**: `vercel deploy` (static site)
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Push `dist/` to gh-pages branch
- **Self-hosted**: Serve `dist/` with any web server

---

### Mobile (Android)

**Build Process**:
```bash
npm run sync         # Runs: vite build && npx cap sync
npx cap open android # Opens Android Studio
```

**Android Studio**:
1. Build → Build Bundle(s) / APK(s)
2. Generate Signed APK
3. Distribute via Play Store or direct APK

**Capacitor Config**: `capacitor.config.ts`
- App ID: `com.partflow.pro`
- App Name: `PartFlow Pro`
- Web Dir: `dist`

**Native Features Used**:
- `@capacitor/app`: Back button, exit app
- `@capacitor/share`: Share PDFs
- `@capacitor/filesystem`: Save PDFs locally

---

### Backend (Vercel Serverless)

**Deployment**:
```bash
vercel deploy        # Auto-deploys api/index.py
```

**Configuration**: `vercel.json`
```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "api/index.py" },
    { "source": "/(.*)", "destination": "api/index.py" }
  ]
}
```

**Environment Variables** (Vercel Dashboard):
- `GOOGLE_SERVICE_ACCOUNT_B64`: Base64-encoded service account JSON
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Raw JSON (fallback, not recommended)

**Logs**: `vercel logs` or Vercel Dashboard → Deployments

**Current URL**: `https://partflow-pro-akila.vercel.app`

---

## Configuration

### Environment Variables

**`.env.local`** (Frontend - NOT in git):
```bash
GEMINI_API_KEY=<your_api_key>  # For future AI features
```

**`config.ts`** (Frontend - Backend URL):
```typescript
export const API_CONFIG = {
  BACKEND_URL: 'https://partflow-pro-akila.vercel.app',
  BACKEND_KEY: 'partflow_secret_token_2026_v2'
};
```

---

### Seed Data

**`src/config/seed-data.json`**:
- Initial customers (5-10 shops)
- Initial items (50-100 spare parts)
- Loaded on first app boot

**`src/config/app-settings.json`**:
```json
{
  "company_name": "PartFlow Pro Distributors",
  "address": "123 Main St, City",
  "phone": "+1-555-0100",
  "rep_name": "Field Rep",
  "invoice_prefix": "INV-",
  "footer_note": "Thank you for your business!",
  "currency_symbol": "Rs."
}
```

**`src/config/users.json`**:
```json
{
  "users": [
    {
      "username": "admin",
      "password": "admin123",
      "role": "admin",
      "rep_name": "System Admin"
    },
    {
      "username": "rep1",
      "password": "rep123",
      "role": "rep",
      "rep_name": "Field Rep 1"
    }
  ]
}
```

---

### Settings (User-Configurable)

**Location**: Settings component → stored in Dexie `settings` table

**Options**:
- **Company Details**: Name, Address, Phone
- **Invoice Settings**: Prefix, Footer Note
- **Currency**: Symbol (Rs., $, €, etc.)
- **Auto-SKU**: Enable/Disable automatic SKU generation
- **Stock Tracking**: Enable/Disable quantity management
- **Category System**: Show/Hide category field
- **Google Sheet ID**: For cloud sync

**Access**: Settings tab (gear icon in bottom nav)

---

## Recent Development

### Git Commit History (Last 10)

```
98c3552 - ux(order): include item details (SKU, Model, Origin) in search results dropdown
eadc597 - ux(order): include item details (SKU, Model, Origin) in search results dropdown
2bacc6a - ux(order): enhance item card compactness with smaller padding
f89062f - feat(ui): complete 'enterprise' ui overhaul with colored status indicators
8198c92 - ux(order): inline item details (SKU, Model, Origin) on one line
4a4364b - ux(cart): implement click-outside closing for search dropdown
0acfc83 - ux(inventory): refine item add modal inputs for compactness
19d299d - ux(mobile): fix edit modal z-index overlap with nav
e61e5d3 - ux(shops): enhance shop action menu with large cancel button
809189d - ux(shops): remove outstanding balance 'Due' tag from shop list items
```

### Development Focus (Jan-Feb 2026)
- **UX Polish**: Enterprise-grade UI refinements
- **Mobile Optimization**: Touch-friendly, compact layouts
- **Visual Hierarchy**: Colored status badges, gradient cards
- **Performance**: Click-outside handlers, z-index fixes
- **Typography**: Smaller fonts, tighter padding for mobile
- **Search Consistency**: Unified dropdown format across all search boxes (Feb 7, 2026)

### Latest Update (Feb 7, 2026)
**Feature**: Catalog Search Dropdown Enhancement
- Added dropdown to catalog tab's search box
- Matches cart tab's search dropdown format
- Displays: Item Name + "SKU • Model • Origin" (e.g., "BP-102 • COROLLA • China")
- Shows up to 20 matching items
- Visual feedback for items already in cart
- Auto-filters as user types
- See: `CHANGELOG_SEARCH_UPDATE.md` for details

---

## Roadmap & Gaps

### ✅ Completed (Phase 1)
- [x] Offline-first architecture (Dexie.js)
- [x] Order creation & editing
- [x] Payment tracking (partial payments)
- [x] Delivery status tracking
- [x] Professional PDF invoices
- [x] Stock management with adjustments
- [x] Customer credit tracking
- [x] Dashboard analytics
- [x] Reports suite
- [x] Google Sheets sync (bidirectional)
- [x] Android mobile app (Capacitor)
- [x] User authentication
- [x] Settings module
- [x] Auto-SKU generation
- [x] Hardware back button support

---

### ⚠️ Known Issues
1. **Deleted File**: `todo.txt` not committed (git shows as unstaged)
2. **SQLite Ephemeral**: Vercel /tmp resets on cold starts (users lost)
3. **No Conflict Resolution UI**: Sync conflicts not user-facing
4. **Password Storage**: Plain text in Dexie (local only, but should hash)
5. **No Logo Upload**: Company logo not supported in invoices

---

### 🚧 Phase 2 Roadmap (from `followup_tasks.md`)

#### **High Priority**
- [ ] **Conflict Resolution UI**: 
  - Show "Local vs Server" comparison modal
  - Allow user to pick winning version
  - Implement 3-way merge for complex conflicts
- [ ] **Logo Upload**: 
  - Base64 image storage in settings
  - Display in invoice header
- [ ] **Enhanced Auth**:
  - Move user DB to persistent storage (external DB or Sheets)
  - Implement password hashing (bcrypt)
  - Add "Forgot Password" flow
- [ ] **Bulk Operations**:
  - Import items from CSV
  - Export orders to Excel
  - Bulk price updates

#### **Medium Priority**
- [ ] **Order History Enhancements**:
  - Filter by customer, date range, payment status
  - Sort by date, amount, status
  - Bulk print invoices
- [ ] **Inventory Enhancements**:
  - Barcode scanning (Capacitor plugin)
  - Bulk stock adjustments
  - Transfer between warehouses
  - Stock valuation report
- [ ] **Customer Enhancements**:
  - Credit limit enforcement
  - Aging report (30/60/90 days)
  - Customer statement PDF
  - Loyalty points system

#### **Low Priority**
- [ ] **Reporting Enhancements**:
  - Top selling items
  - Sales by rep (multi-user)
  - Profit margin analysis
  - Graphical charts (Chart.js)
- [ ] **Settings Enhancements**:
  - Multi-currency support
  - Tax configuration (GST, VAT)
  - Email invoice (SMTP config)
  - WhatsApp share integration

#### **Future Vision**
- [ ] **Multi-User Sync**: 
  - Real-time collaboration (Firebase/Supabase)
  - Role-based permissions
  - Activity audit log
- [ ] **AI Features**:
  - Demand forecasting
  - Smart reorder suggestions
  - Price optimization
  - Natural language search
- [ ] **Hardware Integration**:
  - Thermal printer support
  - Cash drawer interface
  - NFC payment terminals

---

## Development Workflow

### Local Development Setup

**Prerequisites**:
- Node.js 18+
- Python 3.9+ (for backend)
- Android Studio (for mobile build)

**Installation**:
```bash
# Clone repository
git clone <repo_url>
cd "D:\AA AKILA NODE"

# Install dependencies
npm install
cd api && pip install -r requirements.txt && cd ..

# Create environment file
echo "GEMINI_API_KEY=your_key_here" > .env.local
```

**Run Development Servers**:
```bash
# Terminal 1: Frontend
npm run dev                    # http://localhost:3000

# Terminal 2: Backend (optional, if testing sync locally)
cd backend && python main.py   # http://localhost:5000
```

**Testing**:
- Open browser to `http://localhost:3000`
- Login: `admin` / `admin123` or `rep1` / `rep123`
- Test order creation, inventory, sync, etc.

---

### Git Workflow

**Branches**:
- `main`: Production-ready code

**Commit Convention**:
```
type(scope): brief description

Examples:
feat(ui): add delivery status badges to invoice
fix(sync): resolve duplicate customer push
ux(order): reduce padding on item cards
refactor(db): extract cache refresh logic
```

**Types**: `feat`, `fix`, `ux`, `refactor`, `docs`, `test`, `chore`

---

### Build & Deploy Workflow

**Frontend Production**:
```bash
npm run build              # Creates dist/
# Upload dist/ to hosting provider
```

**Mobile Release**:
```bash
npm run sync               # vite build && cap sync
npx cap open android       # Open in Android Studio
# Build → Generate Signed APK
```

**Backend Deploy**:
```bash
vercel deploy              # Auto-deploys api/
# Set env vars in Vercel dashboard
```

---

### Code Style Guidelines

**TypeScript**:
- Use functional components with hooks
- Type all props and state
- Prefer `const` over `let`
- Use `async/await` over `.then()`

**React**:
- One component per file
- Props destructuring in function signature
- Keep components under 500 lines (extract if larger)
- Use Context for global state, props for local

**CSS**:
- Tailwind utility classes preferred
- Inline styles for dynamic values only
- Mobile-first responsive design

**Database**:
- Always update cache before Dexie
- Use transactions for multi-table writes
- Mark entities `sync_status = 'pending'` on change
- Snapshot pricing in OrderLines (never join Items)

---

### Debugging Tips

**Frontend**:
```javascript
// Check IndexedDB in Chrome DevTools
// Application → Storage → IndexedDB → PartFlowDB

// Check localStorage
localStorage.getItem('partflow_auth')
localStorage.getItem('fieldaudit_last_sync')

// Access DB from console
import { db } from './services/db'
await db.getOrders()
```

**Backend**:
```bash
# Vercel logs
vercel logs

# Local backend logs
cd backend && python main.py  # Watch console
```

**Common Issues**:
- **"Sync failed"**: Check Sheet ID, service account permissions
- **"Database error"**: Clear IndexedDB, reload page
- **"Not authenticated"**: Clear localStorage, re-login
- **"Stock error"**: Check stock_tracking_enabled in settings

---

## Performance Metrics

**Initial Load Time**: ~2s (includes Dexie init)  
**Order Creation**: <500ms (cache + async persist)  
**Invoice Generation**: <1s (jsPDF rendering)  
**Sync Operation**: 5-30s (depends on data volume)  
**Database Size**: ~5MB for 1000 orders + 200 items

**Optimization Strategies**:
1. In-memory cache for reads (0ms)
2. Optimistic UI updates
3. Lazy-load components (React.lazy)
4. IndexedDB indexes on common queries
5. Debounce search inputs
6. Virtual scrolling for long lists (future)

---

## Security Considerations

### Current Implementation
- **Client-Side Auth**: Simple username/password (localStorage)
- **API Key**: Static key in config.ts (visible in source)
- **Password Storage**: Plain text in IndexedDB (local only)
- **CORS**: Enabled for all origins (backend)

### Recommended Improvements
1. **Hashing**: Use bcrypt for password storage
2. **JWT Tokens**: Replace static API key
3. **HTTPS Only**: Enforce secure connections
4. **Rate Limiting**: Add to backend endpoints
5. **Input Validation**: Sanitize all user inputs
6. **CSP Headers**: Content Security Policy
7. **Audit Logs**: Track all data modifications

---

## Support & Documentation

**User Manual**: `User_Manual.html`  
**README**: `README.md` (setup instructions)  
**Roadmap**: `followup_tasks.md`  
**Knowledge Base**: This document

**Contact**: Not specified in codebase

---

## Appendix

### Key Algorithms

#### **Auto-SKU Generation** (`utils/skuGenerator.ts`)
```typescript
// Input: "Carbon Brush GN125"
// Output: "CBG01"

1. Extract capital letters + first letter of lowercase words
   "Carbon Brush GN125" → "CBGN" (first 3 chars → "CBG")

2. Append auto-incrementing number
   Check existing SKUs: CBG00, CBG01 exist
   Next available: CBG02

3. Handle conflicts with recursive increment
```

#### **Dual Discount Calculation** (`components/OrderBuilder.tsx`)
```typescript
grossTotal = Σ(line.quantity * line.unit_value)
primaryDiscount = grossTotal * order.discount_rate
afterPrimary = grossTotal - primaryDiscount

secondaryDiscount = afterPrimary * order.secondary_discount_rate
netTotal = afterPrimary - secondaryDiscount

// Example:
// Gross: Rs. 10,000
// Primary (5%): Rs. 500 → Subtotal: Rs. 9,500
// Secondary (2%): Rs. 190 → Net: Rs. 9,310
```

#### **Outstanding Balance Calculation** (`services/db.ts:345-366`)
```typescript
// Sum balance_due for all non-draft orders
// Exclude failed/cancelled deliveries
const orders = this.cache.orders.filter(o => 
  o.customer_id === customerId && 
  o.order_status !== 'draft' &&
  o.delivery_status !== 'failed' &&
  o.delivery_status !== 'cancelled'
);
const totalDue = orders.reduce((sum, o) => sum + (o.balance_due || 0), 0);
customer.outstanding_balance = totalDue;
```

---

### TypeScript Types Reference

**See**: `types.ts` for full definitions

**Key Enums**:
```typescript
SyncStatus: 'synced' | 'pending' | 'conflict'
OrderStatus: 'draft' | 'confirmed' | 'invoiced'
EntityStatus: 'active' | 'inactive'
PaymentType: 'cash' | 'cheque' | 'bank_transfer' | 'credit'
PaymentStatus: 'paid' | 'partial' | 'unpaid'
DeliveryStatus: 'pending' | 'shipped' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled'
```

---

### Dependencies Breakdown

**Production Dependencies** (18 total):
```json
{
  "@capacitor/*": "Mobile platform integration",
  "dexie": "IndexedDB ORM",
  "html2canvas": "Canvas-based screenshots",
  "html5-qrcode": "QR/barcode scanning",
  "jspdf": "PDF generation",
  "jspdf-autotable": "PDF table layouts",
  "lucide-react": "Icon library",
  "react": "UI framework",
  "uuid": "UUID generation"
}
```

**Dev Dependencies** (5 total):
```json
{
  "@capacitor/assets": "Icon/splash generation",
  "@vitejs/plugin-react": "Vite React support",
  "typescript": "Type checking",
  "vite": "Build tool",
  "vite-plugin-pwa": "PWA manifest"
}
```

---

**End of Knowledge Base**  
*This document is auto-generated and should be updated with major changes.*
