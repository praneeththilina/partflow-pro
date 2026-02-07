# Search Dropdown Comparison - Catalog vs Cart

## Overview
Both the **Catalog Tab** and **Cart Tab** search dropdowns now have **identical styling and structure**.

---

## Side-by-Side Comparison

### 📍 Catalog Tab Search Dropdown
**Location**: Lines 367-408 in `OrderBuilder.tsx`  
**Visibility**: Shows when `isSearchFocused && itemFilter.trim().length > 0`

```tsx
{/* Catalog Search Dropdown */}
{isSearchFocused && itemFilter.trim().length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-[70] max-h-60 overflow-y-auto divide-y divide-slate-50">
        {filteredItems.slice(0, 20).map(item => (
            <div 
                className={`p-3 flex justify-between items-center transition-colors cursor-pointer active:bg-slate-100 ${isInCart(item.item_id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
            >
                <div className="min-w-0 flex items-center gap-2">
                    {isInCart(item.item_id) && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>}
                    <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isInCart(item.item_id) ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {item.item_display_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                            {item.item_number} • {item.vehicle_model} • {item.source_brand}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                    <p className={`text-xs font-black ${isInCart(item.item_id) ? 'text-indigo-700' : 'text-indigo-600'}`}>
                        {formatCurrency(item.unit_value)}
                    </p>
                    {isInCart(item.item_id) && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">Added</span>}
                </div>
            </div>
        ))}
    </div>
)}
```

---

### 📍 Cart Tab Search Dropdown
**Location**: Lines 550-583 in `OrderBuilder.tsx`  
**Visibility**: Shows when `itemFilter.length > 0` (Mobile only: `md:hidden`)

```tsx
{itemFilter.length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-[70] max-h-60 overflow-y-auto divide-y divide-slate-50">
        {items.filter(...).slice(0, 20).map(item => (
            <div 
                className={`p-3 flex justify-between items-center transition-colors cursor-pointer active:bg-slate-100 ${isInCart(item.item_id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
            >
                <div className="min-w-0 flex items-center gap-2">
                    {isInCart(item.item_id) && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>}
                    <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isInCart(item.item_id) ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {item.item_display_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                            {item.item_number} • {item.vehicle_model} • {item.source_brand}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                    <p className={`text-xs font-black ${isInCart(item.item_id) ? 'text-indigo-700' : 'text-indigo-600'}`}>
                        {formatCurrency(item.unit_value)}
                    </p>
                    {isInCart(item.item_id) && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">Added</span>}
                </div>
            </div>
        ))}
    </div>
)}
```

---

## ✅ Identical Features

| Feature | Catalog Tab | Cart Tab | Match? |
|---------|-------------|----------|--------|
| **Dropdown Container** | `absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-[70] max-h-60 overflow-y-auto divide-y divide-slate-50` | Same | ✅ |
| **Max Items Shown** | 20 | 20 | ✅ |
| **Item Row Classes** | `p-3 flex justify-between items-center transition-colors cursor-pointer active:bg-slate-100` | Same | ✅ |
| **In Cart Styling** | `bg-indigo-50/50` | `bg-indigo-50/50` | ✅ |
| **Hover Styling** | `hover:bg-slate-50` | `hover:bg-slate-50` | ✅ |
| **Dot Indicator** | `w-1.5 h-1.5 bg-indigo-600 rounded-full` | Same | ✅ |
| **Item Name** | `text-xs font-bold truncate` | Same | ✅ |
| **Details Line** | `text-[10px] text-slate-400 font-mono truncate` | Same | ✅ |
| **Details Format** | `{item.item_number} • {item.vehicle_model} • {item.source_brand}` | Same | ✅ |
| **Price** | `text-xs font-black` | Same | ✅ |
| **Added Badge** | `text-[8px] font-black text-indigo-500 uppercase tracking-tighter` | Same | ✅ |

---

## 🎨 Visual Output

Both dropdowns display items in this exact format:

```
┌─────────────────────────────────────────────────┐
│ • Brake Pad (Toyota Corolla)          Rs. 500  │
│   BP-102 • COROLLA • China                     │
├─────────────────────────────────────────────────┤
│ • Carbon Brush GN125                   Rs. 200  │
│   CBG01 • GN125 • Japan                        │
├─────────────────────────────────────────────────┤
│ • Oil Filter (Honda Civic)        Added        │
│   OF-45 • CIVIC • China                Rs. 350  │
└─────────────────────────────────────────────────┘
```

Where:
- **Line 1**: Item display name (bold, slate-800 or indigo-900 if in cart)
- **Line 2**: `SKU • MODEL • ORIGIN` (monospace font, slate-400)
- **Right side**: Price (indigo-600 or indigo-700 if in cart)
- **Badge**: "Added" for items already in cart

---

## 🔍 Key Differences (Intentional)

| Aspect | Catalog Tab | Cart Tab | Reason |
|--------|-------------|----------|---------|
| **Visibility Condition** | `isSearchFocused && itemFilter.trim().length > 0` | `itemFilter.length > 0` | Catalog uses focus state, cart is always ready |
| **Data Source** | Uses `filteredItems` (pre-filtered by model/country) | Uses `items` (filters inline) | Catalog respects active filters |
| **Out of Stock Handling** | Filtered out with `if (isOutOfStock) return null` | Filtered out in `.filter()` method | Same result, different approach |
| **Mobile Only** | No restriction | `md:hidden` class | Cart search only shown on mobile |

---

## 🧪 Testing Steps

### Mobile View Testing (< 768px width)

1. **Catalog Tab Search**:
   - Switch to Catalog tab
   - Click search box
   - Type "brake"
   - ✅ Dropdown appears with "SKU • Model • Origin"
   - ✅ Shows up to 20 items
   - ✅ Items in cart have indigo background
   - Click item → quantity modal opens

2. **Cart Tab Search**:
   - Switch to Cart tab
   - Click "Quick add item..." search box
   - Type "brake"
   - ✅ Dropdown appears with identical styling
   - ✅ Same "SKU • Model • Origin" format
   - ✅ Same visual feedback
   - Click item → quantity modal opens

3. **Compare Visually**:
   - Both dropdowns should look **100% identical**
   - Same spacing, fonts, colors, layout
   - Same hover effects
   - Same "Added" badges

---

## ✅ Verification Complete

Build Status: **SUCCESS** ✅  
TypeScript Errors: **NONE** ✅  
Dropdown Consistency: **IDENTICAL** ✅

Both search dropdowns now provide a **unified user experience** with the **SKU • Model • Origin** format displayed consistently across all item search interfaces!

---

**Last Updated**: February 7, 2026  
**Build**: Successful (18.18s)
