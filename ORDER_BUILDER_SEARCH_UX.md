# Order Builder Search UX Flow - Complete Implementation

**Date**: February 7, 2026  
**Status**: ✅ IMPLEMENTED

---

## 🎯 User Experience Flow

### Catalog Tab - Search Behavior

#### 1️⃣ **Initial State** (Search box not focused)
```
┌─────────────────────────────────────┐
│ 🔍 Search parts or SKU...    📷    │
└─────────────────────────────────────┘
│ All Models  │ All Origins │ A-Z    │
└─────────────────────────────────────┘

[Item Cards Grid - Visible]
┌────────────┐ ┌────────────┐
│ Brake Pad  │ │ Oil Filter │
│ BP-102     │ │ OF-45      │
│ Rs. 500    │ │ Rs. 350    │
└────────────┘ └────────────┘
```

**What Happens:**
- ✅ Filters (Model, Origin, Sort) are visible
- ✅ Item cards grid is visible
- ✅ No dropdown

---

#### 2️⃣ **User Clicks Search Box**
```
┌─────────────────────────────────────┐
│ 🔍 [cursor]                    📷   │
└─────────────────────────────────────┘

(Filters hidden on mobile)

[Item Cards Grid - Still Visible]
┌────────────┐ ┌────────────┐
│ Brake Pad  │ │ Oil Filter │
│ (smaller)  │ │ (smaller)  │
└────────────┘ └────────────┘
```

**What Happens:**
- ✅ Search box gains focus
- ✅ Filters hide on mobile (`isSearchFocused ? 'hidden md:flex' : 'flex'`)
- ✅ Item cards remain visible but condensed (smaller icons)
- ❌ No dropdown yet (waiting for user to type)

---

#### 3️⃣ **User Types in Search Box** (e.g., "brake")
```
┌─────────────────────────────────────┐
│ 🔍 brake                      ✕📷  │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│ • Brake Pad (Toyota)      Rs. 500   │
│   BP-102 • COROLLA • China          │
├─────────────────────────────────────┤
│ • Brake Disc (Honda)      Rs. 1200  │
│   BD-08 • CIVIC • Japan             │
├─────────────────────────────────────┤
│ • Brake Fluid 500ml       Rs. 150   │
│   BF-01 • UNIVERSAL • China         │
└─────────────────────────────────────┘

[Item Cards Grid - HIDDEN]
```

**What Happens:**
- ✅ Dropdown appears (z-index: 70)
- ✅ Shows up to 20 matching items
- ✅ Each item shows: **Name + "SKU • Model • Origin"**
- ✅ Item cards grid is COMPLETELY HIDDEN
- ✅ Searches across: name, SKU, vehicle_model
- ✅ Filters out out-of-stock items

---

#### 4️⃣ **User Hovers Over Dropdown Item**
```
┌─────────────────────────────────────┐
│ • Brake Pad (Toyota)      Rs. 500   │ ← bg-slate-50
│   BP-102 • COROLLA • China          │
├─────────────────────────────────────┤
│ • Brake Disc (Honda)      Rs. 1200  │
│   BD-08 • CIVIC • Japan             │
└─────────────────────────────────────┘
```

**What Happens:**
- ✅ Hover state: `hover:bg-slate-50`
- ✅ Cursor changes to pointer

---

#### 5️⃣ **Item Already in Cart** (shows differently)
```
┌─────────────────────────────────────┐
│ • • Brake Pad (Toyota)    Added     │ ← bg-indigo-50/50
│   BP-102 • COROLLA • China  Rs. 500 │ ← text-indigo-900
├─────────────────────────────────────┤
│ • Brake Disc (Honda)      Rs. 1200  │
│   BD-08 • CIVIC • Japan             │
└─────────────────────────────────────┘
```

**What Happens:**
- ✅ Indigo dot indicator appears
- ✅ Background: `bg-indigo-50/50`
- ✅ Text color: `text-indigo-900` (darker)
- ✅ Price color: `text-indigo-700`
- ✅ "Added" badge shows

---

#### 6️⃣ **User Clicks an Item in Dropdown**
```
[Quantity Modal Opens]
┌──────────────────────────┐
│   Add Brake Pad          │
│                          │
│   Quantity: [  5  ]      │
│   Price: Rs. 500         │
│   Total: Rs. 2500        │
│                          │
│  [Cancel]  [Add to Cart] │
└──────────────────────────┘
```

**What Happens:**
- ✅ `setSelectedItem(item)`
- ✅ Search box clears: `setItemFilter('')`
- ✅ Dropdown closes: `setIsSearchFocused(false)`
- ✅ Quantity modal opens
- ✅ Item cards reappear (no longer hidden)

---

#### 7️⃣ **User Clears Search Box**
```
┌─────────────────────────────────────┐
│ 🔍 Search parts or SKU...    📷    │
└─────────────────────────────────────┘
│ All Models  │ All Origins │ A-Z    │
└─────────────────────────────────────┘

[Item Cards Grid - Visible Again]
```

**What Happens:**
- ✅ Dropdown disappears
- ✅ Filters reappear
- ✅ Item cards grid returns to normal state

---

### Cart Tab - Search Behavior (Mobile Only)

#### 1️⃣ **Cart Tab Search Box** (identical dropdown)
```
┌─────────────────────────────────────┐
│ ORDER SUMMARY         [+ Add Items] │
│                                     │
│ 🔍 Quick add item...                │ ← md:hidden
└─────────────────────────────────────┘
```

#### 2️⃣ **User Focuses Cart Search**
```
┌─────────────────────────────────────┐
│ 🔍 [cursor]                         │
└─────────────────────────────────────┘
     ↓
(Auto-triggers by setting itemFilter = ' ')
```

#### 3️⃣ **User Types** → **Identical Dropdown Appears**
```
┌─────────────────────────────────────┐
│ • Brake Pad (Toyota)      Rs. 500   │
│   BP-102 • COROLLA • China          │
├─────────────────────────────────────┤
│ • Oil Filter (Honda)      Rs. 350   │
│   OF-45 • CIVIC • China             │
└─────────────────────────────────────┘
```

**Same Features as Catalog Dropdown:**
- ✅ Format: Name + "SKU • Model • Origin"
- ✅ Shows up to 20 items
- ✅ Same styling, hover effects
- ✅ Click to add item

---

## 🔧 Technical Implementation

### State Management

```tsx
const [itemFilter, setItemFilter] = useState('');
const [isSearchFocused, setIsSearchFocused] = useState(false);
```

### Catalog Search Box (Lines 350-416)

```tsx
<input 
    placeholder="Search parts or SKU..." 
    value={itemFilter}
    onFocus={() => setIsSearchFocused(true)}
    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
    onChange={e => setItemFilter(e.target.value)}
/>
```

### Catalog Dropdown (Lines 367-408)

```tsx
{isSearchFocused && itemFilter.trim().length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-[70] max-h-60 overflow-y-auto divide-y divide-slate-50">
        {filteredItems.slice(0, 20).map(item => (
            <div onClick={() => {
                setSelectedItem(item);
                setItemFilter('');
                setIsSearchFocused(false);
            }}>
                <p>{item.item_display_name}</p>
                <p>{item.item_number} • {item.vehicle_model} • {item.source_brand}</p>
                <p>{formatCurrency(item.unit_value)}</p>
            </div>
        ))}
    </div>
)}
```

### Item Cards List (Lines 455-518)

```tsx
{/* Item List - Hide when search dropdown is active */}
{!(isSearchFocused && itemFilter.trim().length > 0) && (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1.5">
        {filteredItems.map(item => (
            <div>... item cards ...</div>
        ))}
    </div>
)}
```

**Key Logic:**
- ✅ Item cards **HIDDEN** when: `isSearchFocused && itemFilter.trim().length > 0`
- ✅ Dropdown **SHOWN** when: `isSearchFocused && itemFilter.trim().length > 0`
- ✅ They never appear together!

---

## 🎨 Styling Comparison

| Element | Catalog Dropdown | Cart Dropdown | Match? |
|---------|------------------|---------------|--------|
| Container | `absolute top-full left-0 right-0 mt-1` | Same | ✅ |
| Background | `bg-white` | Same | ✅ |
| Border | `border border-slate-200` | Same | ✅ |
| Shadow | `shadow-xl` | Same | ✅ |
| Border Radius | `rounded-xl` | Same | ✅ |
| Z-index | `z-[70]` | Same | ✅ |
| Max Height | `max-h-60` | Same | ✅ |
| Scroll | `overflow-y-auto` | Same | ✅ |
| Dividers | `divide-y divide-slate-50` | Same | ✅ |

### Item Row Styling

| Element | Catalog Dropdown | Cart Dropdown | Match? |
|---------|------------------|---------------|--------|
| Padding | `p-3` | Same | ✅ |
| Layout | `flex justify-between items-center` | Same | ✅ |
| Hover | `hover:bg-slate-50` | Same | ✅ |
| Active | `active:bg-slate-100` | Same | ✅ |
| In Cart BG | `bg-indigo-50/50` | Same | ✅ |
| Name Font | `text-xs font-bold` | Same | ✅ |
| Details Font | `text-[10px] text-slate-400 font-mono` | Same | ✅ |
| Price Font | `text-xs font-black` | Same | ✅ |
| Badge Font | `text-[8px] font-black uppercase` | Same | ✅ |

---

## 📊 Search Logic

### What Gets Searched?

```tsx
items.filter(item => {
    const isOutOfStock = settings.stock_tracking_enabled 
        ? item.current_stock_qty <= 0 
        : item.is_out_of_stock;
    
    if (isOutOfStock) return false; // Hide out-of-stock
    
    const search = itemFilter.trim().toLowerCase();
    
    return item.item_display_name.toLowerCase().includes(search) ||
           item.item_number.toLowerCase().includes(search) ||
           item.vehicle_model.toLowerCase().includes(search);
})
```

**Searchable Fields:**
1. ✅ `item_display_name` (e.g., "Brake Pad (Toyota Corolla)")
2. ✅ `item_number` (SKU, e.g., "BP-102")
3. ✅ `vehicle_model` (e.g., "COROLLA")

**Excluded:**
- ❌ Out-of-stock items
- ❌ Inactive items (filtered by `filteredItems`)

---

## ✅ UX Improvements Achieved

### Before This Update:
❌ Typing in catalog search filtered item cards (confusing)  
❌ No quick-add dropdown in catalog  
❌ Had to scroll through filtered cards to find item  
❌ Inconsistent UX between catalog and cart tabs  

### After This Update:
✅ Dropdown appears immediately when typing  
✅ Item cards hide when dropdown is active (clean UI)  
✅ Quick item selection from dropdown  
✅ Consistent UX across all search boxes  
✅ "SKU • Model • Origin" format everywhere  
✅ Visual feedback for items in cart  
✅ Fast, keyboard-friendly workflow  

---

## 🧪 Testing Checklist

### Catalog Tab
- [ ] Click search box → filters hide on mobile
- [ ] Type text → dropdown appears
- [ ] Dropdown shows "SKU • Model • Origin" format
- [ ] Item cards are HIDDEN when dropdown is active
- [ ] Hover item → background changes
- [ ] Click item → quantity modal opens
- [ ] Clear search → item cards reappear
- [ ] Items in cart show indigo background + "Added" badge
- [ ] Out-of-stock items don't appear in dropdown

### Cart Tab (Mobile)
- [ ] Search box visible on mobile only
- [ ] Type text → identical dropdown appears
- [ ] Same styling as catalog dropdown
- [ ] Click item → quantity modal opens

### Edge Cases
- [ ] Search with no results → "No items found" message
- [ ] Search with special characters → works correctly
- [ ] Blur search box → dropdown closes after 200ms delay
- [ ] Tab key navigation → dropdown stays open

---

## 📈 Performance Notes

- **Max items shown**: 20 (prevents lag with large catalogs)
- **Debounce**: None needed (fast enough)
- **Re-renders**: Optimized with `useMemo` on filteredItems
- **Dropdown delay**: 200ms on blur (allows click to register)

---

**Implementation Complete** ✅  
**Build Status**: SUCCESS ✅  
**TypeScript Errors**: NONE ✅  
**UX Flow**: FULLY DOCUMENTED ✅
