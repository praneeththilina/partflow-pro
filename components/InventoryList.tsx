import React, { useState, useEffect } from 'react';
import { Item } from '../types';
import { db } from '../services/db';
import { generateUUID } from '../utils/uuid';

export const InventoryList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState<Partial<Item>>({});

  useEffect(() => {
    setItems(db.getItems());
  }, []);

  const categories = ['All', 'Low Stock', ...Array.from(new Set(items.map(i => i.category || 'Uncategorized')))];

  const handleSaveItem = () => {
    if (!newItem.item_display_name || !newItem.item_number || !newItem.unit_value) {
        alert("Name, SKU, and Price are required");
        return;
    }

    const item: Item = editingItem ? {
        ...editingItem,
        item_display_name: newItem.item_display_name || editingItem.item_display_name,
        item_name: newItem.item_name || editingItem.item_name,
        item_number: newItem.item_number || editingItem.item_number,
        vehicle_model: newItem.vehicle_model || editingItem.vehicle_model,
        source_brand: newItem.source_brand || editingItem.source_brand,
        category: newItem.category || editingItem.category || 'Uncategorized',
        unit_value: newItem.unit_value ?? editingItem.unit_value,
        current_stock_qty: newItem.current_stock_qty ?? editingItem.current_stock_qty,
        low_stock_threshold: newItem.low_stock_threshold ?? editingItem.low_stock_threshold ?? 10,
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
    } : {
      item_id: generateUUID(),
      item_display_name: newItem.item_display_name || '',
      item_name: newItem.item_name || newItem.item_display_name || '',
      item_number: newItem.item_number || '',
      vehicle_model: newItem.vehicle_model || '',
      source_brand: newItem.source_brand || '',
      category: newItem.category || 'Uncategorized',
      unit_value: newItem.unit_value || 0,
      current_stock_qty: newItem.current_stock_qty || 0,
      low_stock_threshold: newItem.low_stock_threshold || 10,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    };

    db.saveItem(item);
    setItems(db.getItems());
    setShowAddForm(false);
    setEditingItem(null);
    setNewItem({});
  };

  const startEdit = (item: Item) => {
      setEditingItem(item);
      setNewItem(item);
      setShowAddForm(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_display_name.toLowerCase().includes(filter.toLowerCase()) ||
        item.item_number.toLowerCase().includes(filter.toLowerCase()) ||
        item.vehicle_model.toLowerCase().includes(filter.toLowerCase()) ||
        (item.source_brand && item.source_brand.toLowerCase().includes(filter.toLowerCase()));
    
    let matchesCategory = true;
    if (categoryFilter === 'Low Stock') {
        matchesCategory = item.current_stock_qty <= item.low_stock_threshold;
    } else if (categoryFilter !== 'All') {
        matchesCategory = item.category === categoryFilter;
    }
    
    return matchesSearch && matchesCategory;
  });


  return (
    <div className="space-y-4 pb-20 md:pb-0">
      
      {/* Header & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10 space-y-3">
         <div className="flex gap-2">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input 
                    type="text"
                    placeholder="Search items, brands, or vehicles..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-colors"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                title="Add New Item"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            </button>
         </div>
         <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                        categoryFilter === cat 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {cat}
                </button>
            ))}
         </div>
         <div className="flex justify-between items-center text-xs text-slate-500 px-1">
            <span>Showing {filteredItems.length} products</span>
            <span>Live Stock</span>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Edit Item' : 'New Spare Part'}</h3>
                    <button onClick={() => { setShowAddForm(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
                        <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.item_display_name || ''} onChange={e => setNewItem({...newItem, item_display_name: e.target.value})} placeholder="e.g. Brake Pad (Toyota Corolla)" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SKU / Item Number *</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.item_number || ''} onChange={e => setNewItem({...newItem, item_number: e.target.value})} placeholder="e.g. BP-102" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Name</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.item_name || ''} onChange={e => setNewItem({...newItem, item_name: e.target.value})} placeholder="e.g. Brake Pad" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Model</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.vehicle_model || ''} onChange={e => setNewItem({...newItem, vehicle_model: e.target.value})} placeholder="e.g. Corolla 2018" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Source Brand / Country</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.source_brand || ''} onChange={e => setNewItem({...newItem, source_brand: e.target.value})} placeholder="e.g. China" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.category || ''} onChange={e => setNewItem({...newItem, category: e.target.value})} placeholder="e.g. Engine" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Threshold</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.low_stock_threshold || ''} onChange={e => setNewItem({...newItem, low_stock_threshold: parseInt(e.target.value)})} placeholder="10" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Value (Price) *</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.unit_value || ''} onChange={e => setNewItem({...newItem, unit_value: parseFloat(e.target.value)})} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Stock</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.current_stock_qty || ''} onChange={e => setNewItem({...newItem, current_stock_qty: parseInt(e.target.value)})} placeholder="0" />
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button onClick={handleSaveItem} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 shadow-sm">{editingItem ? 'Update Item' : 'Add to Inventory'}</button>
                    <button onClick={() => { setShowAddForm(false); setEditingItem(null); }} className="flex-1 bg-white text-slate-700 border border-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                </div>
            </div>
        </div>
      )}
      
      {/* Mobile Card View (default on small) / Desktop Table (default on large) */}
      <div className="hidden md:block bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Origin</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {filteredItems.map(item => (
                        <tr key={item.item_id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => startEdit(item)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    {item.sync_status === 'pending' && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" title="Pending Sync"></span>}
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{item.item_display_name}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.item_number}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                <div className="font-medium">{item.vehicle_model}</div>
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {item.source_brand}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                                ${item.unit_value.toFixed(2)}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {item.current_stock_qty <= item.low_stock_threshold && (
                                        <span className="text-[10px] font-black text-rose-500 uppercase">Low</span>
                                    )}
                                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-black rounded-lg border ${
                                        item.current_stock_qty > item.low_stock_threshold ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                        item.current_stock_qty > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                    }`}>
                                        {item.current_stock_qty}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Mobile Stacked List */}
      <div className="md:hidden space-y-3">
        {filteredItems.map(item => (
            <div key={item.item_id} onClick={() => startEdit(item)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center active:bg-slate-50">
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                        {item.sync_status === 'pending' && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>}
                        <h4 className="text-sm font-bold text-slate-900 truncate">{item.item_display_name}</h4>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mb-1">{item.item_number}</p>
                    <div className="flex items-center text-xs text-slate-500 space-x-2">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{item.source_brand}</span>
                        <span>{item.vehicle_model}</span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end space-y-1">
                    <span className="text-sm font-black text-indigo-700 block">Rs.{item.unit_value.toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                        {item.current_stock_qty <= item.low_stock_threshold && (
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                        )}
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${
                            item.current_stock_qty > item.low_stock_threshold ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            item.current_stock_qty > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                            {item.current_stock_qty}
                        </span>
                    </div>
                </div>

            </div>
        ))}
      </div>
    </div>
  );
};